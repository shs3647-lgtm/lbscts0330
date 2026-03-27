/**
 * POST /api/fmea/seed-missing-we — m002 Cu Target + TiW Etchant 원본 데이터 추가
 * 1회용 시딩 API. 누락된 2건의 WE에 L3Function + FC + FL + RA 추가.
 *
 * ⚠️ RULE 0.8.1: 반드시 getPrismaForSchema(프로젝트 스키마)를 사용.
 * getPrisma()(public)에 저장하면 다른 프로젝트에 데이터가 노출된다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

const SEED_DATA = [
  {
    l3StructId: 'PF-L3-040-IM-002',
    l2StructId: 'PF-L2-040',
    l3FuncId: 'PF-L3-040-IM-002-C-001',
    functionName: 'Cu Target이 스퍼터링 소재를 공급하여 Cu 박막 형성을 지원한다',
    processChar: 'Target 두께 잔량(Remaining Thickness, mm)',
    causes: [
      { suffix: 'K-001', cause: 'Target 소진', pc: 'Target 잔량 정기 점검 및 교체 기준 설정', dc: 'Target 수명 모니터링 시스템' },
      { suffix: 'K-002', cause: 'Target 두께 잔량(Remaining Thickness, mm) 부적합', pc: 'Target 두께 정기 측정', dc: 'Target 두께 인라인 모니터링' },
    ],
  },
  {
    l3StructId: 'PF-L3-130-IM-001',
    l2StructId: 'PF-L2-130',
    l3FuncId: 'PF-L3-130-IM-001-C-001',
    functionName: 'TiW Etchant가 TiW Seed Layer를 선택적으로 식각하여 단락 방지 구조를 형성한다',
    processChar: 'H₂O₂ 농도(Concentration, %)',
    causes: [
      { suffix: 'K-001', cause: 'H₂O₂ 농도 편차에 의한 Etch Rate 이탈', pc: 'Etchant 농도 정기 분석 및 자동 보충', dc: 'H₂O₂ 농도 실시간 모니터링' },
      { suffix: 'K-002', cause: 'H₂O₂ 농도(Concentration, %) 부적합', pc: 'Etchant 교체 주기 관리', dc: 'Etch Rate 인라인 모니터링' },
    ],
  },
];

export async function POST(req: NextRequest) {
  try {
    const { fmeaId } = await req.json();
    if (!fmeaId) return NextResponse.json({ error: 'fmeaId required' }, { status: 400 });

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ error: 'Prisma null' }, { status: 500 });

    const result = await prisma.$transaction(async (tx: any) => {
      let created = { l3f: 0, fc: 0, fl: 0, ra: 0 };

      // FM/FE 조회
      const fmByL2 = new Map<string, string>();
      const fms = await tx.failureMode.findMany({ where: { fmeaId }, select: { id: true, l2StructId: true } });
      for (const fm of fms) fmByL2.set(fm.l2StructId, fm.id);

      const firstFE = await tx.failureEffect.findFirst({ where: { fmeaId }, select: { id: true } });
      if (!firstFE) throw new Error('FE not found');

      for (const seed of SEED_DATA) {
        // L3Function
        const existing = await tx.l3Function.findFirst({ where: { id: seed.l3FuncId } });
        if (!existing) {
          await tx.l3Function.create({
            data: {
              id: seed.l3FuncId, fmeaId,
              l3StructId: seed.l3StructId, l2StructId: seed.l2StructId,
              functionName: seed.functionName, processChar: seed.processChar,
            },
          });
          created.l3f++;
        }

        const fmId = fmByL2.get(seed.l2StructId);
        if (!fmId) continue;

        for (const fc of seed.causes) {
          const fcId = `${seed.l3FuncId}-${fc.suffix}`;
          const exFC = await tx.failureCause.findFirst({ where: { id: fcId } });
          if (!exFC) {
            await tx.failureCause.create({
              data: {
                id: fcId, fmeaId,
                l3FuncId: seed.l3FuncId, l3StructId: seed.l3StructId, l2StructId: seed.l2StructId,
                processCharId: seed.l3FuncId, cause: fc.cause,
              },
            });
            created.fc++;

            const flId = `${fcId}-FL`;
            await tx.failureLink.create({
              data: { id: flId, fmeaId, fmId, feId: firstFE.id, fcId },
            });
            created.fl++;

            await tx.riskAnalysis.create({
              data: {
                id: `ra-${flId}`, fmeaId, linkId: flId,
                severity: 5, occurrence: 3, detection: 4, ap: 'L',
                preventionControl: fc.pc, detectionControl: fc.dc,
              },
            });
            created.ra++;
          }
        }
      }

      return created;
    });

    // 최종 카운트
    const fc = await prisma.failureCause.count({ where: { fmeaId } });
    const fl = await prisma.failureLink.count({ where: { fmeaId } });
    const ra = await prisma.riskAnalysis.count({ where: { fmeaId } });
    const l3f = await prisma.l3Function.count({ where: { fmeaId } });

    return NextResponse.json({ ok: true, created: result, totals: { fc, fl, ra, l3f } });
  } catch (e) {
    console.error('[seed-missing-we]', e);
    return NextResponse.json({ error: safeErrorMessage(e) }, { status: 500 });
  }
}
