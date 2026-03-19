/**
 * @file Part FMEA 검토 요청 API
 * @description POST: DRAFT → REVIEW 상태 전환
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;

    const existing = await prisma.partFmea.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Part FMEA를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: `현재 상태(${existing.status})에서는 검토 요청이 불가합니다. DRAFT 상태에서만 가능합니다.` },
        { status: 400 }
      );
    }

    const updated = await prisma.partFmea.update({
      where: { id },
      data: {
        status: 'REVIEW',
        reviewDate: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[part-fmea/submit-review] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
