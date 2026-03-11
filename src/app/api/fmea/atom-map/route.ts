/**
 * ImportAtomMap CRUD API
 * GET    /api/fmea/atom-map?fmeaId=xxx  — 해당 fmeaId의 atom map 전체 조회
 * POST   /api/fmea/atom-map             — 기존 삭제 후 bulk 생성 (트랜잭션)
 * DELETE /api/fmea/atom-map?fmeaId=xxx  — 해당 fmeaId의 atom map 전체 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

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
