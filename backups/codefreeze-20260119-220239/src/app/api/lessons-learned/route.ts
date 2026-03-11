/**
 * @file route.ts
 * @description 습득교훈 API 라우트
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// GET: 습득교훈 목록 조회
export async function GET() {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패' },
        { status: 500 }
      );
    }

    const items = await prisma.lessonsLearned.findMany({
      orderBy: { lldNo: 'asc' },
    });

    return NextResponse.json({ 
      success: true, 
      items,
      count: items.length 
    });
  } catch (error) {
    console.error('습득교훈 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '조회 실패' },
      { status: 500 }
    );
  }
}

// POST: 습득교훈 저장 (일괄 upsert)
export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패' },
        { status: 500 }
      );
    }

    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 트랜잭션으로 일괄 처리
    const results = await prisma.$transaction(
      items.map((item: {
        lldNo: string;
        vehicle: string;
        target: string;
        failureMode: string;
        location?: string;
        cause: string;
        category: string;
        improvement: string;
        completedDate?: string;  // ★ 완료일자 (LLD 완료된 날짜, 수동)
        fmeaId?: string;         // ★ 적용결과 (FMEA ID, 자동)
        status: string;
        appliedDate?: string;    // ★ 적용일자 (FMEA에 입력된 날짜, 자동)
      }) =>
        prisma.lessonsLearned.upsert({
          where: { lldNo: item.lldNo },
          update: {
            vehicle: item.vehicle,
            target: item.target,
            failureMode: item.failureMode,
            location: item.location || '',
            cause: item.cause,
            category: item.category,
            improvement: item.improvement,
            completedDate: item.completedDate || '',
            fmeaId: item.fmeaId || '',
            status: item.status,
            appliedDate: item.appliedDate || '',
          },
          create: {
            lldNo: item.lldNo,
            vehicle: item.vehicle,
            target: item.target,
            failureMode: item.failureMode,
            location: item.location || '',
            cause: item.cause,
            category: item.category,
            improvement: item.improvement,
            completedDate: item.completedDate || '',
            fmeaId: item.fmeaId || '',
            status: item.status,
            appliedDate: item.appliedDate || '',
          },
        })
      )
    );

    return NextResponse.json({ 
      success: true, 
      count: results.length,
      message: `${results.length}건 저장 완료`
    });
  } catch (error) {
    console.error('습득교훈 저장 오류:', error);
    return NextResponse.json(
      { success: false, error: '저장 실패' },
      { status: 500 }
    );
  }
}

// DELETE: 습득교훈 삭제
export async function DELETE(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패' },
        { status: 500 }
      );
    }

    const { lldNo } = await request.json();

    if (!lldNo) {
      return NextResponse.json(
        { success: false, error: 'LLD 번호가 필요합니다.' },
        { status: 400 }
      );
    }

    await prisma.lessonsLearned.delete({
      where: { lldNo },
    });

    return NextResponse.json({ 
      success: true, 
      message: `${lldNo} 삭제 완료`
    });
  } catch (error) {
    console.error('습득교훈 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: '삭제 실패' },
      { status: 500 }
    );
  }
}

