/**
 * @file apply/route.ts
 * @description LLD 적용결과 업데이트 API
 * 
 * ★ FMEA에서 습득교훈 선택 시 호출
 * - fmeaId: FMEA ID (자동 입력)
 * - appliedDate: FMEA에 입력된 날짜 (자동)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// POST: LLD 적용결과 업데이트
export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패' },
        { status: 500 }
      );
    }

    const { lldNo, fmeaId, appliedDate } = await request.json();

    if (!lldNo) {
      return NextResponse.json(
        { success: false, error: 'LLD 번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // LLD 레코드 업데이트
    const updated = await prisma.lessonsLearned.update({
      where: { lldNo },
      data: {
        fmeaId: fmeaId || '',
        appliedDate: appliedDate || '',
      },
    });

    console.log('✅ LLD 적용결과 업데이트:', { lldNo, fmeaId, appliedDate });

    return NextResponse.json({ 
      success: true, 
      message: `${lldNo} 적용결과 업데이트 완료`,
      data: updated
    });
  } catch (error) {
    console.error('LLD 적용결과 업데이트 오류:', error);
    return NextResponse.json(
      { success: false, error: '업데이트 실패' },
      { status: 500 }
    );
  }
}






