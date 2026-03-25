/**
 * @file route.ts
 * @description DFMEA SOD 기준표 API
 * GET /api/dfmea/sod-criteria — DFMEA S/O/D 기준표 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const [severity, occurrence, detection] = await Promise.all([
      prisma.dfmeaSeverityCriteria.findMany({
        where: { isActive: true },
        orderBy: { rating: 'asc' },
      }),
      prisma.dfmeaOccurrenceCriteria.findMany({
        where: { isActive: true },
        orderBy: { rating: 'asc' },
      }),
      prisma.dfmeaDetectionCriteria.findMany({
        where: { isActive: true },
        orderBy: { rating: 'asc' },
      }),
    ]);

    return NextResponse.json({
      severity,
      occurrence,
      detection,
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('[DFMEA SOD Criteria] Error:', error);
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
