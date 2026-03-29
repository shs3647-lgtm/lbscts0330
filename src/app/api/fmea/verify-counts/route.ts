/**
 * @file verify-counts/route.ts
 * DB 엔티티 카운트 검증 API — 프로젝트 스키마 기준
 *
 * GET /api/fmea/verify-counts?fmeaId=xxx
 * Returns: { success: true, counts: { A1: 21, A2: 21, ... C4: 20 } }
 *
 * ★ 2026-03-29: distinct text → entity count(총 레코드 수)로 변경
 *   flat 데이터의 composite key 기준과 일치시키기 위해
 *   동일 텍스트여도 공정/구조가 다르면 별도 엔티티 → 별도 카운트
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId') || '';

    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fmeaId' },
        { status: 400 },
      );
    }

    // ★★★ 프로젝트 스키마 전용 — public 폴백 없음
    const schemaName = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema: schemaName });
    const prisma = getPrismaForSchema(schemaName);

    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Import 먼저 실행해주세요 (프로젝트 스키마 없음)', schema: schemaName },
        { status: 404 },
      );
    }

    // --- A1, A2: L2Structure 총 레코드 수 ---
    const a1 = await prisma.l2Structure.count({ where: { fmeaId } });

    // --- A3: L2Function 총 레코드 수 ---
    const a3 = await prisma.l2Function.count({ where: { fmeaId } });

    // --- A4: ProcessProductChar 총 레코드 수 ---
    let a4 = 0;
    try {
      a4 = await prisma.processProductChar.count({ where: { fmeaId } });
    } catch {
      a4 = 0;
    }

    // --- A5: FailureMode 총 레코드 수 ---
    const a5 = await prisma.failureMode.count({ where: { fmeaId } });

    // --- A6: RiskAnalysis detectionControl 보유 건수 ---
    const a6 = await prisma.riskAnalysis.count({
      where: {
        fmeaId,
        AND: [
          { detectionControl: { not: null } },
          { detectionControl: { not: '' } },
        ],
      },
    });

    // --- B1: L3Structure 총 레코드 수 ---
    const b1 = await prisma.l3Structure.count({ where: { fmeaId } });

    // --- B2: L3Function 총 레코드 수 ---
    const b2 = await prisma.l3Function.count({ where: { fmeaId } });

    // --- B3: L3Function.processChar 보유 건수 ---
    const b3Rows = await prisma.l3Function.findMany({
      where: { fmeaId },
      select: { processChar: true },
    });
    const b3 = b3Rows.filter((r: any) => ((r.processChar ?? '') as string).trim() !== '').length;

    // --- B4: FailureCause 총 레코드 수 ---
    const b4 = await prisma.failureCause.count({ where: { fmeaId } });

    // --- B5: RiskAnalysis preventionControl 보유 건수 ---
    const b5 = await prisma.riskAnalysis.count({
      where: {
        fmeaId,
        AND: [
          { preventionControl: { not: null } },
          { preventionControl: { not: '' } },
        ],
      },
    });

    // --- C1: L1Function distinct category ---
    const c1Rows = await prisma.l1Function.findMany({
      where: { fmeaId },
      select: { category: true },
    });
    const c1 = new Set(c1Rows.map(r => (r.category ?? '').trim()).filter(Boolean)).size;

    // --- C2: L1Function 총 레코드 수 ---
    const c2 = await prisma.l1Function.count({ where: { fmeaId } });

    // --- C3: L1Function.requirement 보유 건수 ---
    const c3 = await prisma.l1Function.count({
      where: { fmeaId, AND: [{ requirement: { not: '' } }] },
    });

    // --- C4: FailureEffect 총 레코드 수 ---
    const c4 = await prisma.failureEffect.count({ where: { fmeaId } });

    // --- D1: FailureLink distinct feId ---
    const d1Rows = await prisma.failureLink.findMany({ where: { fmeaId }, select: { feId: true } });
    const d1 = new Set(d1Rows.map(r => r.feId).filter(Boolean)).size;

    // --- D2: FailureLink distinct fmProcess ---
    const d2Rows = await prisma.failureLink.findMany({ where: { fmeaId }, select: { fmProcess: true } });
    const d2 = new Set(d2Rows.map(r => (r.fmProcess ?? '').trim()).filter(Boolean)).size;

    // --- D3: FailureLink distinct fmId ---
    const d3Rows = await prisma.failureLink.findMany({ where: { fmeaId }, select: { fmId: true } });
    const d3 = new Set(d3Rows.map(r => r.fmId).filter(Boolean)).size;

    // --- D4: L3Structure 엔티티 수 ---
    const d4 = await prisma.l3Structure.count({ where: { fmeaId } });

    // --- D5: FailureCause 엔티티 수 ---
    const d5 = await prisma.failureCause.count({ where: { fmeaId } });

    const counts = {
      A1: a1, A2: a1, A3: a3, A4: a4, A5: a5, A6: a6,
      B1: b1, B2: b2, B3: b3, B4: b4, B5: b5,
      C1: c1, C2: c2, C3: c3, C4: c4,
      D1: d1, D2: d2, D3: d3, D4: d4, D5: d5,
    };

    return NextResponse.json({ success: true, fmeaId, schema: schemaName, counts });
  } catch (error) {
    console.error('[verify-counts] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}
