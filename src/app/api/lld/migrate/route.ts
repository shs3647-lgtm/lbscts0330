/**
 * @file /api/lld/migrate/route.ts
 * @description LessonsLearned → LLDFilterCode 마이그레이션 API
 * POST: 기존 습득교훈 데이터를 LLDFilterCode 테이블로 일괄 복사
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    // 1. 기존 LessonsLearned 전체 로드
    const lessons = await prisma.lessonsLearned.findMany();
    if (lessons.length === 0) {
      return NextResponse.json({ success: true, message: '마이그레이션 대상 없음', migrated: 0 });
    }

    // 2. 이미 마이그레이션된 lldNo 확인
    const existingLldNos = new Set(
      (await prisma.lLDFilterCode.findMany({ select: { lldNo: true } })).map(r => r.lldNo)
    );

    // 3. 변환 및 삽입
    let migrated = 0;
    let skipped = 0;

    for (const ll of lessons) {
      if (existingLldNos.has(ll.lldNo)) {
        skipped++;
        continue;
      }

      // category → applyTo + classification 매핑
      const applyTo = ll.category === '검출관리' ? 'detection' : 'prevention';
      // cause에서 M4 카테고리 추출 (MN-, MC-, IM-, EN- 접두사)
      const m4Match = (ll.cause || '').match(/^(MN|MC|IM|EN)-/);
      const m4Category = m4Match ? m4Match[1] : null;

      await prisma.lLDFilterCode.create({
        data: {
          lldNo: ll.lldNo,
          classification: 'FieldIssue',   // 기존 습득교훈 = 현장이슈로 분류
          applyTo,
          processNo: '',                   // 기존 데이터에 공정번호 없음 → 사용자가 추후 보완
          processName: ll.location || '',  // location을 공정명으로 매핑
          productName: ll.vehicle || '',   // vehicle을 제품명으로 매핑
          failureMode: ll.failureMode || '',
          cause: ll.cause || '',
          occurrence: applyTo === 'prevention' ? 5 : null,  // 기본값
          detection: applyTo === 'detection' ? 5 : null,    // 기본값
          improvement: ll.improvement || '',
          vehicle: ll.vehicle || '',
          target: ll.target || '제조',
          m4Category,
          location: ll.location || null,
          completedDate: ll.completedDate || null,
          status: ll.status || 'R',
          sourceType: 'migrated',
          priority: 0,
          fmeaId: ll.fmeaId || null,
          appliedDate: ll.appliedDate || null,
        },
      });
      migrated++;
    }

    return NextResponse.json({
      success: true,
      message: `마이그레이션 완료: ${migrated}건 이전, ${skipped}건 스킵(이미 존재)`,
      migrated,
      skipped,
      total: lessons.length,
    });
  } catch (error) {
    console.error('[LLD Migrate] 오류:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
