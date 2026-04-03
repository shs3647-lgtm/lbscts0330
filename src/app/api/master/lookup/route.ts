/**
 * GET /api/master/lookup — MasterFmeaReference 3단계 매칭 + bulk
 */
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import type { MasterFmeaReference } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ACTIVE = { isActive: true } as const;

function isSafeWeName(s: string): boolean {
  if (!s || s.length > 512) return false;
  return !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s);
}

function pickRepresentative(rows: MasterFmeaReference[]): MasterFmeaReference | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const dB4 = b.b4Causes.length - a.b4Causes.length;
    if (dB4 !== 0) return dB4;
    const dU = b.usageCount - a.usageCount;
    if (dU !== 0) return dU;
    const ta = a.lastUsedAt?.getTime() ?? 0;
    const tb = b.lastUsedAt?.getTime() ?? 0;
    return tb - ta;
  })[0]!;
}

function toMatchPayload(r: MasterFmeaReference) {
  return {
    m4: r.m4,
    weName: r.weName,
    processNo: r.processNo,
    b2Functions: r.b2Functions,
    b3Chars: r.b3Chars,
    b4Causes: r.b4Causes,
    b5Controls: r.b5Controls,
    a6Controls: r.a6Controls,
    severity: r.severity,
    occurrence: r.occurrence,
    detection: r.detection,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bulk = searchParams.get('bulk') === 'true';

    if (bulk) {
      const records = await getPrisma()!.masterFmeaReference.findMany({
        where: ACTIVE,
        orderBy: [{ m4: 'asc' }, { weName: 'asc' }, { processNo: 'asc' }],
      });
      return NextResponse.json(
        { success: true, records },
        { headers: { 'Cache-Control': 'private, max-age=60' } }
      );
    }

    const m4 = (searchParams.get('m4') ?? '').trim();
    const we = (searchParams.get('we') ?? searchParams.get('weName') ?? '').trim();
    const processNo = (searchParams.get('processNo') ?? '').trim();

    if (!m4) {
      return NextResponse.json({ success: false, error: 'm4 is required' }, { status: 400 });
    }
    if (!isValidFmeaId(m4)) {
      return NextResponse.json({ success: false, error: 'Invalid m4' }, { status: 400 });
    }
    if (processNo && !isValidFmeaId(processNo)) {
      return NextResponse.json({ success: false, error: 'Invalid processNo' }, { status: 400 });
    }

    if (we && !isSafeWeName(we)) {
      return NextResponse.json({ success: false, error: 'Invalid we / weName' }, { status: 400 });
    }

    if (processNo && we) {
      const exact = await getPrisma()!.masterFmeaReference.findFirst({
        where: { ...ACTIVE, m4, weName: we, processNo },
      });
      if (exact) {
        return NextResponse.json({
          success: true,
          match: toMatchPayload(exact),
          matchType: 'exact' as const,
        });
      }
    }

    if (we) {
      const crossRows = await getPrisma()!.masterFmeaReference.findMany({
        where: { ...ACTIVE, m4, weName: we },
      });
      const cross = pickRepresentative(crossRows);
      if (cross) {
        return NextResponse.json({
          success: true,
          match: toMatchPayload(cross),
          matchType: 'crossProcess' as const,
        });
      }
    }

    const catRows = await getPrisma()!.masterFmeaReference.findMany({
      where: { ...ACTIVE, m4 },
    });
    const cat = pickRepresentative(catRows);
    if (cat) {
      return NextResponse.json({
        success: true,
        match: toMatchPayload(cat),
        matchType: 'category' as const,
      });
    }

    return NextResponse.json({
      success: true,
      match: null,
      matchType: 'none' as const,
    });
  } catch (error) {
    console.error('[master/lookup]', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
