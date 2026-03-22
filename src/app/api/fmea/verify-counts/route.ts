/**
 * @file verify-counts/route.ts
 * DB 엔티티 카운트 검증 API — 프로젝트 스키마 기준
 *
 * GET /api/fmea/verify-counts?fmeaId=xxx
 * Returns: { success: true, counts: { A1: 21, A2: 21, ... C4: 20 } }
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrisma, getPrismaForSchema } from '@/lib/prisma';
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

    // ★★★ 2026-03-22: 프로젝트 스키마 우선, 데이터 없으면 public 폴백
    const schema = getProjectSchemaName(fmeaId);
    let prisma: any;
    let schemaUsed = 'project';
    try {
      await ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema });
      const projectPrisma = getPrismaForSchema(schema);
      // 프로젝트 스키마에 데이터 있는지 빠르게 확인
      const testCount = projectPrisma ? await projectPrisma.l2Structure.count({ where: { fmeaId } }).catch(() => 0) : 0;
      if (testCount > 0) {
        prisma = projectPrisma;
      } else {
        prisma = getPrisma();
        schemaUsed = 'public';
      }
    } catch {
      prisma = getPrisma();
      schemaUsed = 'public';
    }

    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Failed to get Prisma client' },
        { status: 500 },
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

    // --- A6: RiskAnalysis with non-empty detectionControl ---
    const a6 = await prisma.riskAnalysis.count({
      where: {
        fmeaId,
        AND: [
          { detectionControl: { not: null } },
          { detectionControl: { not: '' } },
        ],
      },
    });

    // --- B1: L3Structure count ---
    const b1 = await prisma.l3Structure.count({ where: { fmeaId } });

    // --- B2: L3Function with non-empty functionName ---
    const b2 = await prisma.l3Function.count({
      where: {
        fmeaId,
        AND: [
          { functionName: { not: '' } },
        ],
      },
    });

    // --- B3: L3Function with non-empty processChar ---
    const b3 = await prisma.l3Function.count({
      where: {
        fmeaId,
        AND: [
          { processChar: { not: '' } },
        ],
      },
    });

    // --- B4: FailureCause count ---
    const b4 = await prisma.failureCause.count({ where: { fmeaId } });

    // --- B5: RiskAnalysis with non-empty preventionControl ---
    const b5 = await prisma.riskAnalysis.count({
      where: {
        fmeaId,
        AND: [
          { preventionControl: { not: null } },
          { preventionControl: { not: '' } },
        ],
      },
    });

    // --- C1: distinct categories from L1Function ---
    const distinctCategories = await prisma.l1Function.findMany({
      where: { fmeaId },
      select: { category: true },
      distinct: ['category'],
    });
    const c1 = distinctCategories.length;

    // --- C2: L1Function count ---
    const c2 = await prisma.l1Function.count({ where: { fmeaId } });

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

    return NextResponse.json({ success: true, fmeaId, schema: schemaUsed, counts });
  } catch (error) {
    console.error('[verify-counts] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}
