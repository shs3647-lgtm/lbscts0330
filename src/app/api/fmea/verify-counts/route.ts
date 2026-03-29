/**
 * @file verify-counts/route.ts
 * DB 엔티티 카운트 검증 API — 이중 스키마 아키텍처
 *
 * GET /api/fmea/verify-counts?fmeaId=xxx
 * Returns: { success: true, counts: { A1: 21, ... }, flatCounts: { A1: 21, ... } }
 *
 * ★ 2026-03-29: 이중 스키마 아키텍처 정확 반영
 *   - Atomic DB (L1/L2/L3, FM/FC/FE 등) → 프로젝트 스키마 (pfmea_{fmeaId})
 *   - Flat Items (pfmea_master_flat_items) → public 스키마
 *
 * ★ DB counts = 프로젝트 스키마 Atomic 엔티티 수
 * ★ flatCounts = public의 pfmea_master_flat_items itemCode별 카운트
 *   → 프론트엔드에서 원본(raw) vs DB(atomic) vs flat(스테이징) 비교 가능
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getPrisma, getPrismaForSchema, getBaseDatabaseUrl } from '@/lib/prisma';
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

    // ═══ 1) 프로젝트 스키마 Prisma (Atomic DB) ═══
    const schemaName = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema: schemaName });
    const projectPrisma = getPrismaForSchema(schemaName);

    // ═══ 2) public Prisma (flat items 스테이징) ═══
    const publicPrisma = getPrisma();

    // ═══ Atomic DB 엔티티 카운트 (프로젝트 스키마) ═══
    const atomicCounts: Record<string, number> = {};

    if (projectPrisma) {
      // A1/A2: L2Structure
      const a1 = await projectPrisma.l2Structure.count({ where: { fmeaId } });
      atomicCounts['A1'] = a1;
      atomicCounts['A2'] = a1;

      // A3: L2Function
      atomicCounts['A3'] = await projectPrisma.l2Function.count({ where: { fmeaId } });

      // A4: ProcessProductChar
      try {
        atomicCounts['A4'] = await projectPrisma.processProductChar.count({ where: { fmeaId } });
      } catch { atomicCounts['A4'] = 0; }

      // A5: FailureMode
      atomicCounts['A5'] = await projectPrisma.failureMode.count({ where: { fmeaId } });

      // A6: RiskAnalysis with detectionControl
      atomicCounts['A6'] = await projectPrisma.riskAnalysis.count({
        where: { fmeaId, AND: [{ detectionControl: { not: null } }, { detectionControl: { not: '' } }] },
      });

      // B1: L3Structure
      atomicCounts['B1'] = await projectPrisma.l3Structure.count({ where: { fmeaId } });

      // B2: L3Function
      atomicCounts['B2'] = await projectPrisma.l3Function.count({ where: { fmeaId } });

      // B3: L3Function with processChar
      const b3Rows = await projectPrisma.l3Function.findMany({
        where: { fmeaId }, select: { processChar: true },
      });
      atomicCounts['B3'] = b3Rows.filter((r: any) => ((r.processChar ?? '') as string).trim() !== '').length;

      // B4: FailureCause
      atomicCounts['B4'] = await projectPrisma.failureCause.count({ where: { fmeaId } });

      // B5: RiskAnalysis with preventionControl
      atomicCounts['B5'] = await projectPrisma.riskAnalysis.count({
        where: { fmeaId, AND: [{ preventionControl: { not: null } }, { preventionControl: { not: '' } }] },
      });

      // C1: L1Function distinct category
      const c1Rows = await projectPrisma.l1Function.findMany({
        where: { fmeaId }, select: { category: true },
      });
      atomicCounts['C1'] = new Set(c1Rows.map((r: any) => (r.category ?? '').trim()).filter(Boolean)).size;

      // C2: L1Function
      atomicCounts['C2'] = await projectPrisma.l1Function.count({ where: { fmeaId } });

      // C3: L1Function with requirement
      atomicCounts['C3'] = await projectPrisma.l1Function.count({
        where: { fmeaId, AND: [{ requirement: { not: '' } }] },
      });

      // C4: FailureEffect
      atomicCounts['C4'] = await projectPrisma.failureEffect.count({ where: { fmeaId } });

      // D1-D5: FailureLink 기반
      const d1Rows = await projectPrisma.failureLink.findMany({ where: { fmeaId }, select: { feId: true } });
      atomicCounts['D1'] = new Set(d1Rows.map((r: any) => r.feId).filter(Boolean)).size;

      const d2Rows = await projectPrisma.failureLink.findMany({ where: { fmeaId }, select: { fmProcess: true } });
      atomicCounts['D2'] = new Set(d2Rows.map((r: any) => (r.fmProcess ?? '').trim()).filter(Boolean)).size;

      const d3Rows = await projectPrisma.failureLink.findMany({ where: { fmeaId }, select: { fmId: true } });
      atomicCounts['D3'] = new Set(d3Rows.map((r: any) => r.fmId).filter(Boolean)).size;

      atomicCounts['D4'] = atomicCounts['B1']; // L3Structure = 작업요소
      atomicCounts['D5'] = atomicCounts['B4']; // FailureCause = 고장원인
    }

    // ═══ Flat Items 카운트 (public 스키마) ═══
    const flatCounts: Record<string, number> = {};

    if (publicPrisma) {
      const dataset = await publicPrisma.pfmeaMasterDataset.findUnique({
        where: { fmeaId },
        select: { id: true, failureChains: true },
      });

      if (dataset) {
        const grouped = await publicPrisma.pfmeaMasterFlatItem.groupBy({
          by: ['itemCode'],
          where: { datasetId: dataset.id },
          _count: { id: true },
        });

        for (const g of grouped) {
          flatCounts[g.itemCode] = g._count.id;
        }

        // D코드: flat items에 없으면 failureChains에서 파생
        const dCodes = ['D1', 'D2', 'D3', 'D4', 'D5'];
        const hasDData = dCodes.some(d => (flatCounts[d] || 0) > 0);
        if (!hasDData) {
          const chains: any[] = (dataset.failureChains as any[]) || [];
          if (chains.length > 0) {
            flatCounts['D1'] = new Set(chains.map(c => (c.feValue || '').trim()).filter(Boolean)).size;
            flatCounts['D2'] = new Set(chains.map(c => c.processNo).filter(Boolean)).size;
            flatCounts['D3'] = new Set(chains.map(c => `${c.processNo}|${c.fmValue}`).filter(Boolean)).size;
            flatCounts['D4'] = new Set(chains.map(c => `${c.processNo}|${c.m4||''}|${c.workElement||''}`).filter(Boolean)).size;
            flatCounts['D5'] = new Set(chains.map(c => `${c.processNo}|${c.m4||''}|${c.workElement||''}|${c.fcValue||''}`).filter(Boolean)).size;
          }
        }
      }
    }

    // ═══ counts = Atomic DB 기준 (프로젝트 스키마 = SSoT) ═══
    // Import된 데이터는 프로젝트 스키마에 저장됨
    // flat items(public)는 스냅샷일 수 있어 낡을 수 있음
    const ALL_CODES = [
      'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
      'B1', 'B2', 'B3', 'B4', 'B5',
      'C1', 'C2', 'C3', 'C4',
      'D1', 'D2', 'D3', 'D4', 'D5',
    ];

    const counts: Record<string, number> = {};
    const totalAtomic = Object.values(atomicCounts).reduce((a, b) => a + b, 0);

    for (const code of ALL_CODES) {
      // Atomic DB(프로젝트 스키마)가 있으면 항상 우선
      counts[code] = totalAtomic > 0
        ? (atomicCounts[code] ?? 0)
        : (flatCounts[code] ?? 0);
    }

    return NextResponse.json({
      success: true,
      fmeaId,
      schema: schemaName,
      counts,
      atomicCounts,
      flatCounts,
      source: totalAtomic > 0 ? 'atomic_db' : 'flat_items',
    });
  } catch (error) {
    console.error('[verify-counts] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}
