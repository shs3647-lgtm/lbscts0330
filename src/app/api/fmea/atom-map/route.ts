/**
 * ImportAtomMap CRUD API + 셀 단위 PATCH
 * GET    /api/fmea/atom-map?fmeaId=xxx  — 해당 fmeaId의 atom map 전체 조회
 * POST   /api/fmea/atom-map             — 기존 삭제 후 bulk 생성 (트랜잭션)
 * PATCH  /api/fmea/atom-map             — 셀 단위 UPDATE (DELETE 없이 1건씩 UPDATE)
 * DELETE /api/fmea/atom-map?fmeaId=xxx  — 해당 fmeaId의 atom map 전체 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getPrisma } from '@/lib/prisma';
import { getPrismaForSchema } from '@/lib/prisma';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import type { AtomMapPatchRequest, AtomMapPatchResponse } from '@/types/atom-map';
import { validateChange, coerceValue, isSODChange, calcAP } from '@/lib/fmea/atom-map-whitelist';

export const runtime = 'nodejs';

// ─── GET ────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');
    if (!fmeaId) {
      return NextResponse.json(
        { success: false, error: 'fmeaId is required' },
        { status: 400 },
      );
    }
    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fmeaId format' },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: true, atoms: [], stats: { total: 0, byType: {} } });
    }

    const atoms = await prisma.importAtomMap.findMany({
      where: { fmeaId },
      orderBy: { sortOrder: 'asc' },
    });

    // elementType 별 카운트 집계
    const byType: Record<string, number> = {};
    for (const atom of atoms) {
      byType[atom.elementType] = (byType[atom.elementType] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      atoms,
      stats: { total: atoms.length, byType },
    });
  } catch (error) {
    console.error('[atom-map] GET error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}

// ─── POST ───────────────────────────────────────────────
interface AtomMapEntry {
  elementId: string;
  elementType: string;
  name?: string;
  parentElementId?: string | null;
  grandParentId?: string | null;
  excelRow?: number | null;
  excelCol?: number | null;
  excelSheet?: string | null;
  rowSpan?: number;
  colSpan?: number;
  mergeGroupId?: string | null;
  sortOrder?: number;
  variableName?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, atoms } = body as { fmeaId?: string; atoms?: AtomMapEntry[] };

    if (!fmeaId) {
      return NextResponse.json(
        { success: false, error: 'fmeaId is required' },
        { status: 400 },
      );
    }
    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fmeaId format' },
        { status: 400 },
      );
    }
    if (!Array.isArray(atoms) || atoms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'atoms array is required and must not be empty' },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 },
      );
    }

    const rows = atoms.map((a, idx) => ({
      fmeaId,
      elementId: a.elementId,
      elementType: a.elementType,
      name: a.name ?? '',
      parentElementId: a.parentElementId ?? null,
      grandParentId: a.grandParentId ?? null,
      excelRow: a.excelRow ?? null,
      excelCol: a.excelCol ?? null,
      excelSheet: a.excelSheet ?? null,
      rowSpan: a.rowSpan ?? 1,
      colSpan: a.colSpan ?? 1,
      mergeGroupId: a.mergeGroupId ?? null,
      sortOrder: a.sortOrder ?? idx,
      variableName: a.variableName ?? null,
      metadata: a.metadata
        ? (a.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    }));

    const result = await prisma.$transaction(async (tx) => {
      await tx.importAtomMap.deleteMany({ where: { fmeaId } });
      const created = await tx.importAtomMap.createMany({ data: rows });
      return created.count;
    });

    return NextResponse.json({ success: true, count: result });
  } catch (error) {
    console.error('[atom-map] POST error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}

// ─── PATCH (셀 단위 UPDATE) ──────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const body: AtomMapPatchRequest = await request.json();
    const { fmeaId, changes } = body;

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }
    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({ success: false, error: 'changes array required' }, { status: 400 });
    }
    if (changes.length > 100) {
      return NextResponse.json({ success: false, error: 'Max 100 changes per request' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();
    const schema = getProjectSchemaName(normalizedId);
    const baseDatabaseUrl = process.env.DATABASE_URL || '';

    await ensureProjectSchemaReady({ baseDatabaseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Failed to get Prisma client' }, { status: 500 });
    }

    // 화이트리스트 검증
    const validChanges: Array<{ change: typeof changes[0]; def: NonNullable<ReturnType<typeof validateChange>> }> = [];
    const errors: string[] = [];

    for (const ch of changes) {
      if (!ch.id || !ch.table || !ch.field) {
        errors.push(`Invalid change: missing id/table/field`);
        continue;
      }
      const def = validateChange(ch);
      if (!def) {
        errors.push(`Blocked: ${ch.table}.${ch.field} not editable`);
        continue;
      }
      validChanges.push({ change: ch, def });
    }

    if (validChanges.length === 0) {
      return NextResponse.json({
        success: false, saved: 0, failed: errors.length, errors, apRecalculated: 0,
      } satisfies AtomMapPatchResponse, { status: 400 });
    }

    // $transaction: UPDATE only (DELETE 없음)
    let saved = 0;
    let apRecalculated = 0;
    const sodChangedRAIds = new Set<string>();

    await prisma.$transaction(async (tx: any) => {
      for (const { change, def } of validChanges) {
        const model = tx[def.prismaModel];
        if (!model) {
          errors.push(`Model not found: ${def.prismaModel}`);
          continue;
        }

        const existing = await model.findUnique({ where: { id: change.id } });
        if (!existing) {
          errors.push(`Not found: ${def.prismaModel}#${change.id}`);
          continue;
        }

        const coerced = coerceValue(change.value, def.type);
        await model.update({
          where: { id: change.id },
          data: { [change.field]: coerced },
        });
        saved++;

        if (isSODChange(change)) {
          sodChangedRAIds.add(change.id);
        }
      }

      // AP 자동재계산 (S/O/D 변경 시)
      for (const raId of sodChangedRAIds) {
        const ra = await tx.riskAnalysis.findUnique({ where: { id: raId } });
        if (!ra) continue;

        const newAP = calcAP(ra.severity, ra.occurrence, ra.detection);
        if (newAP !== ra.ap) {
          await tx.riskAnalysis.update({
            where: { id: raId },
            data: { ap: newAP },
          });
          apRecalculated++;
        }
      }
    });
    const response: AtomMapPatchResponse = {
      success: true, saved, failed: errors.length, errors, apRecalculated,
    };
    return NextResponse.json(response);

  } catch (err) {
    console.error('[atom-map] PATCH error:', err);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(err) },
      { status: 500 },
    );
  }
}

// ─── DELETE ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');
    if (!fmeaId) {
      return NextResponse.json(
        { success: false, error: 'fmeaId is required' },
        { status: 400 },
      );
    }
    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fmeaId format' },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 },
      );
    }

    const { count } = await prisma.importAtomMap.deleteMany({ where: { fmeaId } });

    return NextResponse.json({ success: true, deleted: count });
  } catch (error) {
    console.error('[atom-map] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}
