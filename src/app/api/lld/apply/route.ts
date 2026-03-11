/**
 * @file /api/lld/apply/route.ts
 * @description LLD(필터코드) 적용결과 업데이트 API
 * FMEA 워크시트에서 LLD를 선택/적용했을 때 호출
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
        fmeaId: fmeaId || '',
        appliedDate: appliedDate || new Date().toISOString().slice(0, 10),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${lldNo} 적용결과 업데이트 완료`,
      data: updated,
    });
  } catch (error) {
    console.error('[LLD Apply API] 오류:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
