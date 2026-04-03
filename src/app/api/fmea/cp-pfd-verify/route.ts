/**
 * @file cp-pfd-verify/route.ts
 * @description FMEA ↔ CP ↔ PFD 통합 FK 정합성 검증 API
 *
 * GET /api/fmea/cp-pfd-verify?fmeaId=xxx
 *   → FMEA→CP→PFD FK 전수 검증 (읽기전용)
 *
 * POST /api/fmea/cp-pfd-verify
 *   Body: { fmeaId }
 *   → sync-cp-pfd 실행 + FK 검증
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrisma, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { safeErrorMessage, isValidFmeaId } from '@/lib/security';

interface FkCheckResult {
  name: string;
  total: number;
  nonNull: number;
  orphans: number;
  status: 'ok' | 'warn' | 'error';
}

async function verifyCpPfdFk(fmeaPrisma: any, publicPrisma: any, fmeaId: string) {
  // 1. FMEA 기본 엔티티 수 조회 (프로젝트 스키마)
  const [l2Count, l3Count, fmCount, flCount, raCount, pcCount] = await Promise.all([
    fmeaPrisma.l2Structure.count({ where: { fmeaId } }),
    fmeaPrisma.l3Structure.count({ where: { fmeaId } }),
    fmeaPrisma.failureMode.count({ where: { fmeaId } }),
    fmeaPrisma.failureLink.count({ where: { fmeaId } }),
    fmeaPrisma.riskAnalysis.count({ where: { fmeaId } }),
    fmeaPrisma.processProductChar.count({ where: { fmeaId } }),
  ]);

  // CP/PFD 결정론적 조회: FmeaRegistration → TripletGroup → findFirst(최후 폴백)
  const reg = await publicPrisma.fmeaRegistration.findUnique({
    where: { fmeaId },
    select: { linkedCpNo: true, linkedPfdNo: true },
  }).catch(() => null);

  let targetCpNo = reg?.linkedCpNo || null;
  let targetPfdNo = reg?.linkedPfdNo || null;

  if (!targetCpNo || !targetPfdNo) {
    const tg = await publicPrisma.tripletGroup.findFirst({
      where: { pfmeaId: fmeaId },
      select: { cpId: true, pfdId: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null);
    if (!targetCpNo && tg?.cpId) {
      targetCpNo = tg.cpId;
      console.warn(`[cp-pfd-verify] fmeaId=${fmeaId}: TripletGroup 경유 cpId=${tg.cpId}`);
    }
    if (!targetPfdNo && tg?.pfdId) {
      targetPfdNo = tg.pfdId;
      console.warn(`[cp-pfd-verify] fmeaId=${fmeaId}: TripletGroup 경유 pfdId=${tg.pfdId}`);
    }
  }

  let cp = targetCpNo
    ? await publicPrisma.controlPlan.findFirst({ where: { cpNo: targetCpNo } })
    : null;
  if (!cp) {
    console.warn(`[cp-pfd-verify] fmeaId=${fmeaId}: cpNo=${targetCpNo} 미발견, findFirst 폴백 (비결정론 위험)`);
    cp = await publicPrisma.controlPlan.findFirst({
      where: { OR: [{ fmeaId }, { linkedPfmeaNo: fmeaId }] },
      orderBy: { createdAt: 'desc' },
    });
  }

  let pfd = targetPfdNo
    ? await publicPrisma.pfdRegistration.findFirst({ where: { pfdNo: targetPfdNo } })
    : null;
  if (!pfd) {
    console.warn(`[cp-pfd-verify] fmeaId=${fmeaId}: pfdNo=${targetPfdNo} 미발견, findFirst 폴백 (비결정론 위험)`);
    pfd = await publicPrisma.pfdRegistration.findFirst({
      where: { OR: [{ fmeaId }, { linkedPfmeaNo: fmeaId }] },
      orderBy: { createdAt: 'desc' },
    });
  }

  const cpItems = cp
    ? await publicPrisma.controlPlanItem.findMany({ where: { cpId: cp.id } })
    : [];

  const pfdItems = pfd
    ? await publicPrisma.pfdItem.findMany({ where: { pfdId: pfd.id, isDeleted: false } })
    : [];

  // 4. FK 검증
  const fkChecks: FkCheckResult[] = [];

  // 4.1 CP FK 검증
  if (cpItems.length > 0) {
    // CP.productCharId → ProcessProductChar (FMEA 프로젝트 스키마)
    const cpPcIds = cpItems.filter((i: any) => i.productCharId).map((i: any) => i.productCharId);
    let cpPcOrphans = 0;
    if (cpPcIds.length > 0) {
      const existingPcs = await fmeaPrisma.processProductChar.findMany({
        where: { id: { in: cpPcIds } },
        select: { id: true },
      });
      const existingSet = new Set(existingPcs.map((p: any) => p.id));
      cpPcOrphans = cpPcIds.filter((id: string) => !existingSet.has(id)).length;
    }
    fkChecks.push({
      name: 'CP.productCharId→ProcessProductChar',
      total: cpItems.length,
      nonNull: cpPcIds.length,
      orphans: cpPcOrphans,
      status: cpPcOrphans > 0 ? 'error' : cpPcIds.length > 0 ? 'ok' : 'warn',
    });

    // CP.linkId → FailureLink (FMEA 프로젝트 스키마)
    const cpLinkIds = cpItems.filter((i: any) => i.linkId).map((i: any) => i.linkId);
    let cpLinkOrphans = 0;
    if (cpLinkIds.length > 0) {
      const existingLinks = await fmeaPrisma.failureLink.findMany({
        where: { id: { in: cpLinkIds } },
        select: { id: true },
      });
      const existingSet = new Set(existingLinks.map((l: any) => l.id));
      cpLinkOrphans = cpLinkIds.filter((id: string) => !existingSet.has(id)).length;
    }
    fkChecks.push({
      name: 'CP.linkId→FailureLink',
      total: cpItems.length,
      nonNull: cpLinkIds.length,
      orphans: cpLinkOrphans,
      status: cpLinkOrphans > 0 ? 'error' : cpLinkIds.length > 0 ? 'ok' : 'warn',
    });

    // CP.processCharId → L3Function (FMEA 프로젝트 스키마)
    const cpPcfIds = cpItems.filter((i: any) => i.processCharId).map((i: any) => i.processCharId);
    let cpPcfOrphans = 0;
    if (cpPcfIds.length > 0) {
      const existingL3f = await fmeaPrisma.l3Function.findMany({
        where: { id: { in: cpPcfIds } },
        select: { id: true },
      });
      const existingSet = new Set(existingL3f.map((f: any) => f.id));
      cpPcfOrphans = cpPcfIds.filter((id: string) => !existingSet.has(id)).length;
    }
    fkChecks.push({
      name: 'CP.processCharId→L3Function',
      total: cpItems.length,
      nonNull: cpPcfIds.length,
      orphans: cpPcfOrphans,
      status: cpPcfOrphans > 0 ? 'error' : cpPcfIds.length > 0 ? 'ok' : 'warn',
    });

    // CP.pfmeaProcessId → L2Structure (FMEA 프로젝트 스키마)
    const cpL2Ids = cpItems.filter((i: any) => i.pfmeaProcessId).map((i: any) => i.pfmeaProcessId);
    let cpL2Orphans = 0;
    if (cpL2Ids.length > 0) {
      const existingL2 = await fmeaPrisma.l2Structure.findMany({
        where: { id: { in: cpL2Ids } },
        select: { id: true },
      });
      const existingSet = new Set(existingL2.map((s: any) => s.id));
      cpL2Orphans = cpL2Ids.filter((id: string) => !existingSet.has(id)).length;
    }
    fkChecks.push({
      name: 'CP.pfmeaProcessId→L2Structure',
      total: cpItems.length,
      nonNull: cpL2Ids.length,
      orphans: cpL2Orphans,
      status: cpL2Orphans > 0 ? 'error' : cpL2Ids.length > 0 ? 'ok' : 'warn',
    });
  }

  // 4.2 PFD FK 검증
  if (pfdItems.length > 0) {
    // PFD.fmeaL2Id → L2Structure (FMEA 프로젝트 스키마)
    const pfdL2Ids = pfdItems.filter((i: any) => i.fmeaL2Id).map((i: any) => i.fmeaL2Id);
    let pfdL2Orphans = 0;
    if (pfdL2Ids.length > 0) {
      const existingL2 = await fmeaPrisma.l2Structure.findMany({
        where: { id: { in: pfdL2Ids } },
        select: { id: true },
      });
      const existingSet = new Set(existingL2.map((s: any) => s.id));
      pfdL2Orphans = pfdL2Ids.filter((id: string) => !existingSet.has(id)).length;
    }
    fkChecks.push({
      name: 'PFD.fmeaL2Id→L2Structure',
      total: pfdItems.length,
      nonNull: pfdL2Ids.length,
      orphans: pfdL2Orphans,
      status: pfdL2Orphans > 0 ? 'error' : pfdL2Ids.length > 0 ? 'ok' : 'warn',
    });

    // PFD.fmeaL3Id → L3Structure (FMEA 프로젝트 스키마)
    const pfdL3Ids = pfdItems.filter((i: any) => i.fmeaL3Id).map((i: any) => i.fmeaL3Id);
    let pfdL3Orphans = 0;
    if (pfdL3Ids.length > 0) {
      const existingL3 = await fmeaPrisma.l3Structure.findMany({
        where: { id: { in: pfdL3Ids } },
        select: { id: true },
      });
      const existingSet = new Set(existingL3.map((s: any) => s.id));
      pfdL3Orphans = pfdL3Ids.filter((id: string) => !existingSet.has(id)).length;
    }
    fkChecks.push({
      name: 'PFD.fmeaL3Id→L3Structure',
      total: pfdItems.length,
      nonNull: pfdL3Ids.length,
      orphans: pfdL3Orphans,
      status: pfdL3Orphans > 0 ? 'error' : pfdL3Ids.length > 0 ? 'ok' : 'warn',
    });

    // PFD.productCharId → ProcessProductChar (FMEA 프로젝트 스키마)
    const pfdPcIds = pfdItems.filter((i: any) => i.productCharId).map((i: any) => i.productCharId);
    let pfdPcOrphans = 0;
    if (pfdPcIds.length > 0) {
      const existingPcs = await fmeaPrisma.processProductChar.findMany({
        where: { id: { in: pfdPcIds } },
        select: { id: true },
      });
      const existingSet = new Set(existingPcs.map((p: any) => p.id));
      pfdPcOrphans = pfdPcIds.filter((id: string) => !existingSet.has(id)).length;
    }
    fkChecks.push({
      name: 'PFD.productCharId→ProcessProductChar',
      total: pfdItems.length,
      nonNull: pfdPcIds.length,
      orphans: pfdPcOrphans,
      status: pfdPcOrphans > 0 ? 'error' : 'ok',
    });
  }

  // 5. 요약
  const totalOrphans = fkChecks.reduce((sum, c) => sum + c.orphans, 0);
  const hasError = fkChecks.some(c => c.status === 'error');
  const hasWarn = fkChecks.some(c => c.status === 'warn');

  return {
    fmeaId,
    fmea: { l2: l2Count, l3: l3Count, fm: fmCount, fl: flCount, ra: raCount, pc: pcCount },
    cp: {
      cpNo: cp?.cpNo || null,
      cpId: cp?.id || null,
      itemCount: cpItems.length,
      fkFilled: {
        productCharId: cpItems.filter((i: any) => i.productCharId).length,
        linkId: cpItems.filter((i: any) => i.linkId).length,
        processCharId: cpItems.filter((i: any) => i.processCharId).length,
        pfmeaProcessId: cpItems.filter((i: any) => i.pfmeaProcessId).length,
      },
    },
    pfd: {
      pfdNo: pfd?.pfdNo || null,
      pfdId: pfd?.id || null,
      itemCount: pfdItems.length,
      fkFilled: {
        fmeaL2Id: pfdItems.filter((i: any) => i.fmeaL2Id).length,
        fmeaL3Id: pfdItems.filter((i: any) => i.fmeaL3Id).length,
        productCharId: pfdItems.filter((i: any) => i.productCharId).length,
      },
    },
    fkChecks,
    totalOrphans,
    allGreen: !hasError && !hasWarn && cpItems.length > 0 && pfdItems.length > 0,
    status: hasError ? 'error' : hasWarn ? 'warn' : (cpItems.length === 0 || pfdItems.length === 0) ? 'no_data' : 'ok',
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fmeaId = searchParams.get('fmeaId');

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId is required' }, { status: 400 });
    }

    const publicPrisma = getPrisma();
    if (!publicPrisma) {
      return NextResponse.json({ success: false, error: 'DB connection failed' }, { status: 500 });
    }

    // FMEA Atomic DB는 프로젝트 스키마에 있음
    const baseUrl = getBaseDatabaseUrl();
    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const fmeaPrisma = getPrismaForSchema(schema) || publicPrisma;

    const result = await verifyCpPfdFk(fmeaPrisma, publicPrisma, fmeaId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error('[cp-pfd-verify GET]', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fmeaId } = await request.json();

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId is required' }, { status: 400 });
    }

    const publicPrisma = getPrisma();
    if (!publicPrisma) {
      return NextResponse.json({ success: false, error: 'DB connection failed' }, { status: 500 });
    }

    const baseUrl = getBaseDatabaseUrl();
    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const fmeaPrisma = getPrismaForSchema(schema) || publicPrisma;

    // Step 1: sync-cp-pfd 실행
    const syncUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/fmea/sync-cp-pfd`;
    let syncResult: any = null;

    try {
      const syncResp = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId, mode: 'CREATE' }),
      });
      syncResult = await syncResp.json();
    } catch (syncError) {
      console.error('[cp-pfd-verify] sync-cp-pfd failed:', syncError);
    }

    // Step 2: 검증
    const verifyResult = await verifyCpPfdFk(fmeaPrisma, publicPrisma, fmeaId);

    return NextResponse.json({
      success: true,
      sync: syncResult,
      verify: verifyResult,
    });
  } catch (error: unknown) {
    console.error('[cp-pfd-verify POST]', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
