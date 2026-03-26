/**
 * @file GET /api/pfmea/sod-criteria
 * @description PFMEA SOD 기준표 조회 API (public 스키마)
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export async function GET() {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB not available' }, { status: 500 });
    }

    const [severity, occurrence, detection] = await Promise.all([
      prisma.pfmeaSeverityCriteria.findMany({ where: { isActive: true }, orderBy: { rating: 'asc' } }),
      prisma.pfmeaOccurrenceCriteria.findMany({ where: { isActive: true }, orderBy: { rating: 'asc' } }),
      prisma.pfmeaDetectionCriteria.findMany({ where: { isActive: true }, orderBy: { rating: 'asc' } }),
    ]);

    return NextResponse.json({
      success: true,
      severity,
      occurrence,
      detection,
      stats: { severity: severity.length, occurrence: occurrence.length, detection: detection.length },
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('[PFMEA SOD Criteria] 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
