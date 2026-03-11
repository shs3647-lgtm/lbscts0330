/**
 * @file route.ts
 * @description CP 단계 업데이트 API
 * @version 1.0.0
 * @created 2026-01-24
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

/**
 * PUT /api/control-plan/step
 * CP 단계 확정
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { cpNo, step } = body;

    if (!cpNo) {
      return NextResponse.json({ success: false, message: 'cpNo is required' }, { status: 400 });
    }

    if (step === undefined || step < 1 || step > 5) {
      return NextResponse.json({ success: false, message: 'Invalid step (1-5)' }, { status: 400 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, message: 'DB not configured' }, { status: 500 });
    }

    // ControlPlan 테이블 업데이트
    const updated = await prisma.controlPlan.update({
      where: { cpNo },
      data: { step },
    });


    return NextResponse.json({
      success: true,
      message: `${cpNo} 단계가 ${step}로 업데이트되었습니다.`,
      data: updated,
    });
  } catch (error: any) {
    console.error('CP 단계 업데이트 실패:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'CP 단계 업데이트 실패',
    }, { status: 500 });
  }
}
