/**
 * GET /api/master/stats — MasterFmeaReference 집계
 */
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ACTIVE = { isActive: true } as const;

const DEFAULT_BY_SOURCE_KEYS = ['m066', 'import', 'manual', 'worksheet', 'lld', 'industry'] as const;

export async function GET() {
  try {
    const [
      total,
      withB4,
      withB5,
      withA6,
      withSOD,
      byM4Groups,
      bySourceGroups,
    ] = await Promise.all([
      getPrisma()!.masterFmeaReference.count({ where: ACTIVE }),
      getPrisma()!.masterFmeaReference.count({
        where: { ...ACTIVE, b4Causes: { isEmpty: false } },
      }),
      getPrisma()!.masterFmeaReference.count({
        where: { ...ACTIVE, b5Controls: { isEmpty: false } },
      }),
      getPrisma()!.masterFmeaReference.count({
        where: { ...ACTIVE, a6Controls: { isEmpty: false } },
      }),
      getPrisma()!.masterFmeaReference.count({
        where: {
          ...ACTIVE,
          severity: { not: null },
          occurrence: { not: null },
          detection: { not: null },
        },
      }),
      getPrisma()!.masterFmeaReference.groupBy({
        by: ['m4'],
        where: ACTIVE,
        _count: true,
      }),
      getPrisma()!.masterFmeaReference.groupBy({
        by: ['sourceType'],
        where: ACTIVE,
        _count: true,
      }),
    ]);

    const byM4: Record<string, number> = {};
    for (const g of byM4Groups) {
      byM4[g.m4] = g._count;
    }

    const bySource: Record<string, number> = {};
    for (const k of DEFAULT_BY_SOURCE_KEYS) {
      bySource[k] = 0;
    }
    for (const g of bySourceGroups) {
      bySource[g.sourceType] = g._count;
    }

    return NextResponse.json(
      {
        total,
        withB4,
        withB5,
        withA6,
        withSOD,
        byM4,
        bySource,
      },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    );
  } catch (error) {
    console.error('[master/stats]', error);
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
