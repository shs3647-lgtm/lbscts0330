/**
 * @file diagnostics/route.ts
 * @description FMEA 데이터(원자성/레거시/확정) DB 존재 여부 및 카운트 진단 API
 *
 * GET /api/fmea/diagnostics?fmeaId=xxx
 *
 * - UI 변경 없이 서버에서 상태를 검증하기 위한 용도
 * - FULL_SYSTEM 환경에서 Playwright/API 테스트와 함께 사용
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema, getPrisma } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

function computeLegacyCompletenessScore(legacy: any): number {
  if (!legacy) return 0;
  let score = 0;
  const l1Name = String(legacy?.l1?.name || '').trim();
  if (l1Name) score += 50;

  const l2 = Array.isArray(legacy?.l2) ? legacy.l2 : [];
  const meaningfulProcs = l2.filter((p: any) => String(p?.name || p?.no || '').trim());
  score += meaningfulProcs.length * 20;

  const l3Count = l2.reduce((acc: number, p: any) => acc + (Array.isArray(p?.l3) ? p.l3.length : 0), 0);
  score += l3Count * 5;

  const fmCount = l2.reduce((acc: number, p: any) => acc + (Array.isArray(p?.failureModes) ? p.failureModes.length : 0), 0);
  const fcCount = l2.reduce((acc: number, p: any) => acc + (Array.isArray(p?.failureCauses) ? p.failureCauses.length : 0), 0);
  score += (fmCount + fcCount) * 2;

  const feCount = Array.isArray(legacy?.l1?.failureScopes) ? legacy.l1.failureScopes.length : 0;
  score += feCount * 2;

  return score;
}

export async function GET(request: NextRequest) {
  try {
    // ✅ FMEA ID는 항상 대문자로 정규화 (DB 일관성 보장)
    const fmeaId = request.nextUrl.searchParams.get('fmeaId')?.toUpperCase();
    if (!fmeaId) {
      return NextResponse.json({ ok: false, error: 'fmeaId parameter is required' }, { status: 400 });
    }

    // 프로젝트별 DB(스키마) 규칙 적용
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ ok: false, error: 'Prisma not configured' }, { status: 200 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ ok: false, error: 'Prisma not configured' }, { status: 200 });

    const [
      legacyRec,
      confirmedRec,
      l1Cnt,
      l2Cnt,
      l3Cnt,
      l1FuncCnt,
      l2FuncCnt,
      l3FuncCnt,
      feCnt,
      fmCnt,
      fcCnt,
      linkCnt,
      riskCnt,
      optCnt,
    ] = await Promise.all([
      prisma.fmeaLegacyData.findUnique({ where: { fmeaId } }).catch(() => null),
      prisma.fmeaConfirmedState.findUnique({ where: { fmeaId } }).catch(() => null),
      prisma.l1Structure.count({ where: { fmeaId } }),
      prisma.l2Structure.count({ where: { fmeaId } }),
      prisma.l3Structure.count({ where: { fmeaId } }),
      prisma.l1Function.count({ where: { fmeaId } }),
      prisma.l2Function.count({ where: { fmeaId } }),
      prisma.l3Function.count({ where: { fmeaId } }),
      prisma.failureEffect.count({ where: { fmeaId } }),
      prisma.failureMode.count({ where: { fmeaId } }),
      prisma.failureCause.count({ where: { fmeaId } }),
      prisma.failureLink.count({ where: { fmeaId } }),
      prisma.riskAnalysis.count({ where: { fmeaId } }),
      prisma.optimization.count({ where: { fmeaId } }),
    ]);

    const legacyScore = computeLegacyCompletenessScore(legacyRec?.data);

    return NextResponse.json({
      ok: true,
      fmeaId,
      schema,
      legacy: {
        exists: Boolean(legacyRec?.data),
        version: legacyRec?.version || null,
        score: legacyScore,
        updatedAt: legacyRec?.updatedAt ? legacyRec.updatedAt.toISOString?.() ?? String(legacyRec.updatedAt) : null,
      },
      confirmed: {
        exists: Boolean(confirmedRec),
        structureConfirmed: confirmedRec?.structureConfirmed ?? null,
        l1FunctionConfirmed: confirmedRec?.l1FunctionConfirmed ?? null,
        l2FunctionConfirmed: confirmedRec?.l2FunctionConfirmed ?? null,
        l3FunctionConfirmed: confirmedRec?.l3FunctionConfirmed ?? null,
        failureL1Confirmed: confirmedRec?.failureL1Confirmed ?? null,
        failureL2Confirmed: confirmedRec?.failureL2Confirmed ?? null,
        failureL3Confirmed: confirmedRec?.failureL3Confirmed ?? null,
        failureLinkConfirmed: confirmedRec?.failureLinkConfirmed ?? null,
      },
      atomicCounts: {
        l1Structure: l1Cnt,
        l2Structures: l2Cnt,
        l3Structures: l3Cnt,
        l1Functions: l1FuncCnt,
        l2Functions: l2FuncCnt,
        l3Functions: l3FuncCnt,
        failureEffects: feCnt,
        failureModes: fmCnt,
        failureCauses: fcCnt,
        failureLinks: linkCnt,
        riskAnalyses: riskCnt,
        optimizations: optCnt,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}


