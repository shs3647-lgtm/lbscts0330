/**
 * @file verify-counts/route.ts
 * DB 엔티티 카운트 검증 API — 프로젝트 스키마 기준
 *
 * GET /api/fmea/verify-counts?fmeaId=xxx
 * Returns: { success: true, counts: { A1: 21, A2: 21, ... C4: 20 } }
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
    // Atomic DB는 프로젝트 스키마에만 존재. 없으면 "Import 먼저" 안내.
    const schemaName = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema: schemaName });
    const prisma = getPrismaForSchema(schemaName);

    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Import 먼저 실행해주세요 (프로젝트 스키마 없음)', schema: schemaName },
        { status: 404 },
      );
    }

    // --- A1, A2: L2Structure count ---
    const l2Count = await prisma.l2Structure.count({ where: { fmeaId } });

    // --- A3: L2Function count ---
    const a3 = await prisma.l2Function.count({ where: { fmeaId } });

    // --- A4: ProcessProductChar count (table may not exist) ---
    let a4 = 0;
    try {
      a4 = await prisma.processProductChar.count({ where: { fmeaId } });
    } catch {
      // table doesn't exist in this schema — return 0
      a4 = 0;
    }

    // --- A5: FailureMode count ---
    const a5 = await prisma.failureMode.count({ where: { fmeaId } });

    // --- A6 & B5: L3 커버리지 기반 카운트 (L2 폴백 포함) ---
    // flat data 의미론: L2에 DC/PC가 있으면 해당 L2 하위 모든 L3가 A6/B5 커버리지
    const [allRAs, allFLs] = await Promise.all([
      prisma.riskAnalysis.findMany({
        where: { fmeaId },
        select: { linkId: true, detectionControl: true, preventionControl: true },
      }),
      prisma.failureLink.findMany({
        where: { fmeaId },
        select: { id: true, l2StructId: true },
      }),
    ]);
    const flToL2 = new Map(allFLs.map(fl => [fl.id, fl.l2StructId]));
    const l2WithDC = new Set<string>();
    const l2WithPC = new Set<string>();
    for (const ra of allRAs) {
      const l2Id = flToL2.get(ra.linkId || '');
      if (l2Id && ra.detectionControl?.trim()) l2WithDC.add(l2Id);
      if (l2Id && ra.preventionControl?.trim()) l2WithPC.add(l2Id);
    }

    const allL3s = await prisma.l3Structure.findMany({
      where: { fmeaId },
      select: { id: true, l2Id: true },
    });
    const a6 = allL3s.filter(l3 => l2WithDC.has(l3.l2Id || '')).length;

    // --- B1: L3Structure count ---
    const b1 = allL3s.length;

    // --- B2: L3Function with non-empty functionName ---
    const b2 = await prisma.l3Function.count({
      where: {
        fmeaId,
        AND: [
          { functionName: { not: '' } },
        ],
      },
    });

    // --- B3: L3Function 전체 (IM 자재 등 processChar 빈값도 카운트)
    const b3 = await prisma.l3Function.count({
      where: { fmeaId },
    });

    // --- B4: FailureCause count ---
    const b4 = await prisma.failureCause.count({ where: { fmeaId } });

    // --- B5: L3 커버리지 기반 (L2에 PC 있으면 하위 L3 모두 커버)
    const b5 = allL3s.filter(l3 => l2WithPC.has(l3.l2Id || '')).length;

    // --- C1 & C2: distinct categories / distinct product functions from L1Function ---
    const allL1Funcs = await prisma.l1Function.findMany({
      where: { fmeaId },
      select: { category: true, functionName: true },
    });
    const c1 = new Set(allL1Funcs.map(f => f.category)).size;
    const c2 = new Set(allL1Funcs.map(f => `${f.category}|${f.functionName}`)).size;

    // --- C3: L1Function with non-empty requirement ---
    const c3 = await prisma.l1Function.count({
      where: {
        fmeaId,
        AND: [
          { requirement: { not: '' } },
        ],
      },
    });

    // --- C4: FailureEffect count ---
    const c4 = await prisma.failureEffect.count({ where: { fmeaId } });

    const counts = {
      A1: l2Count,
      A2: l2Count,
      A3: a3,
      A4: a4,
      A5: a5,
      A6: a6,
      B1: b1,
      B2: b2,
      B3: b3,
      B4: b4,
      B5: b5,
      C1: c1,
      C2: c2,
      C3: c3,
      C4: c4,
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
