/**
 * POST /api/master/upsert — MasterFmeaReference upsert (배열 병합 + SOD + usage)
 */
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VALID_SOURCE = new Set(['m002', 'import', 'manual', 'worksheet', 'lld', 'industry']);

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

function mergeUnique(existing: string[], incoming: string[]): string[] {
  const out = new Set(existing);
  for (const s of incoming) {
    if (s) out.add(s);
  }
  return [...out];
}

function optionalSod(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const m4 = typeof body.m4 === 'string' ? body.m4.trim() : '';
    const weName = typeof body.weName === 'string' ? body.weName.trim() : '';
    const processNo = typeof body.processNo === 'string' ? body.processNo.trim() : '';

    if (!m4 || !weName) {
      return NextResponse.json(
        { ok: false, error: 'm4 and weName are required' },
        { status: 400 }
      );
    }
    if (!isValidFmeaId(m4)) {
      return NextResponse.json({ ok: false, error: 'Invalid m4' }, { status: 400 });
    }
    if (processNo && !isValidFmeaId(processNo)) {
      return NextResponse.json({ ok: false, error: 'Invalid processNo' }, { status: 400 });
    }
    if (weName.length > 512 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(weName)) {
      return NextResponse.json({ ok: false, error: 'Invalid weName' }, { status: 400 });
    }

    const rawSource = typeof body.sourceType === 'string' ? body.sourceType.trim() : 'import';
    if (!VALID_SOURCE.has(rawSource)) {
      return NextResponse.json({ ok: false, error: 'Invalid sourceType' }, { status: 400 });
    }

    const processName = typeof body.processName === 'string' ? body.processName.trim() : '';
    const b2 = asStringArray(body.b2Functions);
    const b3 = asStringArray(body.b3Chars);
    const b4 = asStringArray(body.b4Causes);
    const b5 = asStringArray(body.b5Controls);
    const a6 = asStringArray(body.a6Controls);

    const now = new Date();

    const existing = await getPrisma()!.masterFmeaReference.findUnique({
      where: { m4_weName_processNo: { m4, weName, processNo } },
    });

    const updateSod: {
      severity?: number;
      occurrence?: number;
      detection?: number;
    } = {};
    const s = optionalSod(body.severity);
    const o = optionalSod(body.occurrence);
    const d = optionalSod(body.detection);
    if (s !== undefined) updateSod.severity = s;
    if (o !== undefined) updateSod.occurrence = o;
    if (d !== undefined) updateSod.detection = d;

    if (existing) {
      const saved = await getPrisma()!.masterFmeaReference.update({
        where: { id: existing.id },
        data: {
          processName: processName || existing.processName,
          b2Functions: mergeUnique(existing.b2Functions, b2),
          b3Chars: mergeUnique(existing.b3Chars, b3),
          b4Causes: mergeUnique(existing.b4Causes, b4),
          b5Controls: mergeUnique(existing.b5Controls, b5),
          a6Controls: mergeUnique(existing.a6Controls, a6),
          ...updateSod,
          sourceType: rawSource,
          usageCount: { increment: 1 },
          lastUsedAt: now,
          isActive: true,
        },
      });
      return NextResponse.json({ ok: true, record: saved });
    }

    const created = await getPrisma()!.masterFmeaReference.create({
      data: {
        m4,
        weName,
        processNo,
        processName,
        b2Functions: mergeUnique([], b2),
        b3Chars: mergeUnique([], b3),
        b4Causes: mergeUnique([], b4),
        b5Controls: mergeUnique([], b5),
        a6Controls: mergeUnique([], a6),
        ...(Object.keys(updateSod).length ? updateSod : {}),
        sourceType: rawSource,
        usageCount: 1,
        lastUsedAt: now,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, record: created });
  } catch (error) {
    console.error('[master/upsert]', error);
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
