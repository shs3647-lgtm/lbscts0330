/**
 * @file apply/route.ts
 * @description LLD 적용결과 업데이트 API — LLDFilterCode 테이블 기반
 * FMEA 워크시트에서 LLD 자동선택 시 호출
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

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

    const updated = await prisma.lLDFilterCode.update({
      where: { lldNo },
      data: {
        fmeaId: fmeaId || null,
        appliedDate: appliedDate || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${lldNo} 적용결과 업데이트 완료`,
      data: updated,
    });
  } catch (error) {
    console.error('[LLD Apply] 오류:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
