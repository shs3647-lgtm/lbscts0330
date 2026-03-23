/**
 * @file raw-quality/route.ts
 * @description Raw Import 품질 판정 API — Forge Step 9a
 *
 * GET /api/fmea/raw-quality?fmeaId=pfm26-m102
 *
 * DB에서 핵심 카운트를 조회하여 raw-complete / raw-partial /
 * raw-ambiguous / raw-invalid 상태를 빠르게 반환한다.
 * 전체 PositionAtomicData 로드 없이 집계 쿼리만 사용하여 비용 최소화.
 *
 * @security isValidFmeaId, safeErrorMessage 필수
 * @version 1.0.0
 * @created 2026-03-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import type { RawStatus } from '@/lib/fmea-core/raw-quality-checker';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');

    // ── 1. 입력 검증 ──
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'fmeaId 파라미터가 필요합니다.' },
        { status: 400 },
      );
    }

    // ── 2. 프로젝트 스키마 Prisma 클라이언트 획득 ──
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 정보가 설정되지 않았습니다.' },
        { status: 500 },
      );
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Prisma 클라이언트 획득 실패' },
        { status: 500 },
      );
    }

    // ── 3. DB 핵심 카운트 조회 (집계 쿼리, 전체 데이터 로드 없음) ──
    const [l2Count, l3Count, flCount, raCount, fcCount, fmCount, feCount] =
      await Promise.all([
        prisma.l2Structure.count({ where: { fmeaId } }),
        prisma.l3Structure.count({ where: { fmeaId } }),
        prisma.failureLink.count({ where: { fmeaId } }),
        prisma.riskAnalysis.count({ where: { fmeaId } }),
        prisma.failureCause.count({ where: { fmeaId } }),
        prisma.failureMode.count({ where: { fmeaId } }),
        prisma.failureEffect.count({ where: { fmeaId } }),
      ]);

    // broken FL: fmId, feId, fcId 중 하나라도 빈 문자열인 것
    const brokenFL = await prisma.failureLink.count({
      where: {
        fmeaId,
        OR: [{ fmId: '' }, { feId: '' }, { fcId: '' }],
      },
    });

    // ── 4. 품질 계산 ──
    const validFL = flCount - brokenFL;
    const fkCoverage = flCount > 0 ? validFL / flCount : 0;

    // ── 5. 상태 판정 (EX-46~49 간이 버전) ──
    let status: RawStatus;

    if (l2Count === 0 || flCount === 0 || fkCoverage < 0.2) {
      status = 'raw-invalid';
    } else if (fkCoverage >= 0.95) {
      status = 'raw-complete';
    } else if (fkCoverage >= 0.5) {
      status = 'raw-partial';
    } else {
      status = 'raw-invalid';
    }

    // ── 6. 응답 ──
    return NextResponse.json({
      success: true,
      fmeaId,
      status,
      counts: {
        l2: l2Count,
        l3: l3Count,
        fl: flCount,
        ra: raCount,
        fc: fcCount,
        fm: fmCount,
        fe: feCount,
      },
      brokenFL,
      validFL,
      fkCoverage,
      canProceedToAtomic: status === 'raw-complete',
    });
  } catch (error) {
    console.error('[raw-quality] GET error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}
