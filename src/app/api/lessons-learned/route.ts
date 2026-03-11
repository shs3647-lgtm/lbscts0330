/**
 * @file route.ts
 * @description 습득교훈 호환 API — LLDFilterCode 테이블 기반
 * 기존 useAutoLldHandlers.ts 호환을 위해 applyTo → category 매핑 제공
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

const APPLY_TO_CATEGORY: Record<string, string> = {
  prevention: '예방관리',
  detection: '검출관리',
};

// GET: LLDFilterCode → 습득교훈 호환 형식으로 반환
export async function GET() {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패', items: [] },
        { status: 200 }
      );
    }

    const items = await prisma.lLDFilterCode.findMany({
      orderBy: { lldNo: 'asc' },
    });

    // 호환 형식 매핑: applyTo → category, processName → location
    const mapped = items.map(item => ({
      id: item.id,
      lldNo: item.lldNo,
      vehicle: item.vehicle || item.productName || '',
      target: item.target || '제조',
      failureMode: item.failureMode || '',
      cause: item.cause || '',
      category: APPLY_TO_CATEGORY[item.applyTo] || '예방관리',
      improvement: item.improvement || '',
      location: item.location || item.processName || '',
      completedDate: item.completedDate || '',
      fmeaId: item.fmeaId || '',
      status: item.status || 'R',
      appliedDate: item.appliedDate || '',
      // 신규 필드도 포함 (향후 활용)
      classification: item.classification,
      applyTo: item.applyTo,
      processNo: item.processNo,
      processName: item.processName,
      productName: item.productName,
      occurrence: item.occurrence,
      detection: item.detection,
      m4Category: item.m4Category,
    }));

    return NextResponse.json({
      success: true,
      items: mapped,
      count: mapped.length,
    });
  } catch (error) {
    console.error('[LessonsLearned Compat API] GET 오류:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error), items: [] },
      { status: 200 }
    );
  }
}
