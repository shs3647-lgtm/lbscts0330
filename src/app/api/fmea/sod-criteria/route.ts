/**
 * @file GET /api/fmea/sod-criteria?type=P|D
 * @description FMEA SOD 기준표 통합 조회 API — PFMEA/DFMEA 공용
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const fmeaType = (request.nextUrl.searchParams.get('type') || 'P').toUpperCase();

  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB not available' }, { status: 500 });
    }

    let severity, occurrence, detection;

    if (fmeaType === 'D') {
      [severity, occurrence, detection] = await Promise.all([
        prisma.dfmeaSeverityCriteria.findMany({ where: { isActive: true }, orderBy: { rating: 'asc' } }),
        prisma.dfmeaOccurrenceCriteria.findMany({ where: { isActive: true }, orderBy: { rating: 'asc' } }),
        prisma.dfmeaDetectionCriteria.findMany({ where: { isActive: true }, orderBy: { rating: 'asc' } }),
      ]);
    } else {
      [severity, occurrence, detection] = await Promise.all([
        prisma.pfmeaSeverityCriteria.findMany({ where: { isActive: true }, orderBy: { rating: 'asc' } }),
        prisma.pfmeaOccurrenceCriteria.findMany({ where: { isActive: true }, orderBy: { rating: 'asc' } }),
        prisma.pfmeaDetectionCriteria.findMany({ where: { isActive: true }, orderBy: { rating: 'asc' } }),
      ]);
    }

    return NextResponse.json({
      success: true,
      fmeaType,
      severity,
      occurrence,
      detection,
      stats: { severity: severity.length, occurrence: occurrence.length, detection: detection.length },
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error(`[SOD Criteria] type=${fmeaType} 오류:`, error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
