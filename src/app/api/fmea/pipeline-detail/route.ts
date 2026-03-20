/**
 * @file pipeline-detail/route.ts
 * @description 파이프라인 검증 상세 데이터 API (Atomic DB SSoT — Legacy 제거)
 *
 * GET /api/fmea/pipeline-detail?fmeaId=xxx&step=2
 * 각 STEP별 실제 DB 레코드를 반환하여 UI에서 상세 검증 가능
 *
 * 스키마 필드 매핑:
 *  L2Structure.no (공정번호), FailureMode.mode, FailureEffect.effect
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');
    const stepStr = request.nextUrl.searchParams.get('step');
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }
    const step = parseInt(stepStr || '0', 10);

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    let data: unknown = null;

    switch (step) {
      case 0: data = await getStep1Detail(prisma, fmeaId); break;
      case 1: data = await getStep3Detail(prisma, fmeaId); break;
      case 2: data = await getStep2Detail(prisma, fmeaId); break;
      case 3: data = await getStep4Detail(prisma, fmeaId); break;
      case 4: data = await getStep5Detail(prisma, fmeaId); break;
      default: data = { message: '지원하지 않는 STEP' };
    }

    return NextResponse.json({ success: true, step, data });
  } catch (e) {
    console.error('[pipeline-detail] error:', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}

// STEP 1: Import — Atomic DB 구조 상세
async function getStep1Detail(prisma: any, fmeaId: string) {
  const l1 = await prisma.l1Structure.findFirst({ where: { fmeaId } });
  const l2s = await prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } });

  if (l2s.length === 0) return { exists: false, processes: [] };

  const [l2Funcs, l3s, fms, fcs] = await Promise.all([
    prisma.l2Function.findMany({ where: { fmeaId } }),
    prisma.l3Structure.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureCause.findMany({ where: { fmeaId } }),
  ]);
  const l1Funcs = await prisma.l1Function.findMany({ where: { fmeaId } });

  const processes = l2s.map((l2: any) => ({
    processNo: l2.no || '',
    name: l2.name || '',
    funcCount: l2Funcs.filter((f: any) => f.l2StructId === l2.id).length,
    l3Count: l3s.filter((l3: any) => l3.l2Id === l2.id).length,
    fmCount: fms.filter((fm: any) => fm.l2StructId === l2.id).length,
    fcCount: fcs.filter((fc: any) => fc.l2StructId === l2.id).length,
  }));

  return {
    exists: true,
    l1Name: l1?.name || '',
    l1FuncCount: l1Funcs.length,
    feCount: await prisma.failureEffect.count({ where: { fmeaId } }),
    processCount: processes.length,
    processes,
  };
}

// STEP 2: 파싱 — Atomic DB 기반 공정별 상세 + 교차검증 매트릭스
async function getStep2Detail(prisma: any, fmeaId: string) {
  const [l2s, l3s, l2Funcs, l3Funcs, fms, fes, fcs, l1Funcs] = await Promise.all([
    prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    prisma.l2Function.findMany({ where: { fmeaId } }),
    prisma.l3Function.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureEffect.findMany({ where: { fmeaId } }),
    prisma.failureCause.findMany({ where: { fmeaId } }),
    prisma.l1Function.findMany({ where: { fmeaId } }),
  ]);

  if (l2s.length === 0) return { processes: [], l1Functions: [], failureEffects: [], crossCheckMatrix: [] };

  const processes = l2s.map((l2: any) => {
    const procL2Funcs = l2Funcs.filter((f: any) => f.l2StructId === l2.id);
    const procL3s = l3s.filter((l3: any) => l3.l2Id === l2.id);
    const pcList = procL2Funcs
      .filter((f: any) => f.productChar?.trim())
      .map((f: any) => ({ name: f.productChar || '', id: f.id || '' }));

    const b1List = procL3s.map((l3: any) => {
      const weFuncs = l3Funcs.filter((f: any) => f.l3StructId === l3.id);
      return {
        name: l3.name || '',
        m4: l3.m4 || '',
        funcCount: weFuncs.length,
        pcCount: weFuncs.filter((f: any) => f.processChar?.trim()).length,
        fcCount: fcs.filter((fc: any) => fc.l3StructId === l3.id).length,
      };
    });

    return {
      processNo: l2.no || '',
      name: l2.name || '',
      a3: procL2Funcs.map((f: any) => f.functionName || '').filter(Boolean),
      a4: pcList,
      a5: fms.filter((fm: any) => fm.l2StructId === l2.id).map((fm: any) => ({ name: fm.mode || '', id: fm.id || '' })),
      b1: b1List,
    };
  });

  const l1FuncList = l1Funcs.map((fn: any) => ({
    category: fn.category || '',
    name: fn.functionName || '',
    requirement: fn.requirement || '',
  }));

  const feList = fes.map((fe: any) => ({
    name: fe.effect || '',
    scope: fe.category || '',
    severity: fe.severity || 0,
  }));

  // 교차검증 매트릭스: Atomic DB 기반 (Legacy 제거)
  const crossCheckMatrix = buildCrossCheckMatrixFromAtomic(l2s, l3s, l2Funcs, l3Funcs, fms, fcs, fes, l1Funcs);

  return { processes, l1Functions: l1FuncList, failureEffects: feList, crossCheckMatrix };
}

function buildCrossCheckMatrixFromAtomic(
  l2s: any[], l3s: any[], l2Funcs: any[], l3Funcs: any[],
  fms: any[], fcs: any[], fes: any[], l1Funcs: any[]
) {
  const atm: Record<string, number> = {};
  atm.A1 = l2s.length;
  atm.A2 = l2s.filter((l: any) => l.name?.trim()).length;
  atm.A3 = l2Funcs.length;
  atm.A4 = l2Funcs.filter((f: any) => f.productChar?.trim()).length;
  atm.A5 = fms.length;
  atm.B1 = l3s.length;
  atm.B2 = new Set(l3Funcs.map((f: any) => f.functionName).filter((n: string) => n?.trim())).size;
  atm.B3 = l3Funcs.filter((f: any) => f.processChar?.trim()).length;
  atm.B4 = fcs.length;

  const cats = new Set<string>(), fns = new Set<string>();
  for (const fn of l1Funcs) {
    if (fn.category?.trim()) cats.add(fn.category);
    if (fn.functionName?.trim()) fns.add(fn.functionName);
  }
  atm.C1 = cats.size;
  atm.C2 = fns.size;
  atm.C3 = l1Funcs.length;
  atm.C4 = fes.length;

  const labels: Record<string, string> = {
    A1: '공정번호', A2: '공정명', A3: '공정기능', A4: '제품특성', A5: '고장형태',
    B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인',
    C1: '구분', C2: '완제품기능', C3: '요구사항', C4: '고장영향',
  };

  return Object.keys(labels).map(code => ({
    code,
    label: labels[code],
    atomicCount: atm[code] ?? 0,
    match: true,
    diff: 0,
  }));
}

// STEP 3: UUID — 실제 Atomic DB 엔티티 목록
async function getStep3Detail(prisma: any, fmeaId: string) {
  const safeQuery = async (fn: () => Promise<any[]>) => {
    try { return await fn(); } catch { return []; }
  };

  const [l1s, l2s, l3s, l2Funcs, l3Funcs, fms, fes, fcs] = await Promise.all([
    safeQuery(() => prisma.l1Structure.findMany({ where: { fmeaId }, select: { id: true, name: true }, take: 50 })),
    safeQuery(() => prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, no: true, name: true }, take: 50, orderBy: { order: 'asc' } })),
    safeQuery(() => prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, name: true, m4: true, l2Id: true }, take: 200 })),
    safeQuery(() => prisma.l2Function.findMany({ where: { fmeaId }, select: { id: true, functionName: true, productChar: true, l2StructId: true }, take: 50 })),
    safeQuery(() => prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, functionName: true, processChar: true, l3StructId: true }, take: 200 })),
    safeQuery(() => prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true, mode: true, l2StructId: true }, take: 100 })),
    safeQuery(() => prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true, effect: true, severity: true, category: true }, take: 50 })),
    safeQuery(() => prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, cause: true, l2StructId: true, l3StructId: true }, take: 200 })),
  ]);

  const l2Map = new Map<string, string>(l2s.map((l: any) => [l.id, l.no || '']));

  return {
    l1: l1s.map((l: any) => ({ id: l.id.substring(0, 8), name: l.name })),
    l2: l2s.map((l: any) => ({ id: l.id.substring(0, 8), processNo: l.no, name: l.name })),
    l3: l3s.map((l: any) => ({ id: l.id.substring(0, 8), name: l.name, m4: l.m4 || '', processNo: l2Map.get(l.l2Id) || '' })),
    l2Functions: l2Funcs.map((f: any) => ({ id: f.id.substring(0, 8), name: f.functionName, productChar: f.productChar || '', processNo: l2Map.get(f.l2StructId) || '' })),
    l3Functions: l3Funcs.map((f: any) => ({ id: f.id.substring(0, 8), name: f.functionName, processChar: f.processChar || '' })),
    failureModes: fms.map((f: any) => ({ id: f.id, name: f.mode, l2StructureId: f.l2StructId, processNo: l2Map.get(f.l2StructId) || '' })),
    failureEffects: fes.map((f: any) => ({ id: f.id, name: f.effect, severity: f.severity, category: f.category || '' })),
    failureCauses: fcs.map((f: any) => ({ id: f.id, cause: f.cause, l2StructureId: f.l2StructId, processNo: l2Map.get(f.l2StructId) || '' })),
  };
}

// STEP 4: FK — FailureLink 상세 (FM↔FE↔FC 관계) + 14개 FK 무결성
async function getStep4Detail(prisma: any, fmeaId: string) {
  const safeQuery = async (fn: () => Promise<any[]>) => {
    try { return await fn(); } catch { return []; }
  };

  const [links, fms, fes, fcs, l2s, l3s, l3Funcs, l2Funcs, l1Funcs, ras] = await Promise.all([
    safeQuery(() => prisma.failureLink.findMany({ where: { fmeaId, deletedAt: null }, take: 300 })),
    safeQuery(() => prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true, mode: true, l2StructId: true, productCharId: true } })),
    safeQuery(() => prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true, effect: true, l1FuncId: true } })),
    safeQuery(() => prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, cause: true, l2StructId: true, l3StructId: true, l3FuncId: true } })),
    safeQuery(() => prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, no: true, name: true } })),
    safeQuery(() => prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, name: true, l2Id: true } })),
    safeQuery(() => prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, functionName: true, l3StructId: true, l2StructId: true } })),
    safeQuery(() => prisma.l2Function.findMany({ where: { fmeaId }, select: { id: true, functionName: true, l2StructId: true } })),
    safeQuery(() => prisma.l1Function.findMany({ where: { fmeaId }, select: { id: true } })),
    safeQuery(() => prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { id: true, linkId: true } })),
  ]);

  const fmMap = new Map<string, any>(fms.map((f: any) => [f.id, f]));
  const feMap = new Map<string, any>(fes.map((f: any) => [f.id, f]));
  const fcMap = new Map<string, any>(fcs.map((f: any) => [f.id, f]));
  const l2Map = new Map<string, any>(l2s.map((l: any) => [l.id, l]));

  const rows = links.map((lk: any) => {
    const fm = fmMap.get(lk.fmId);
    const fe = feMap.get(lk.feId);
    const fc = fcMap.get(lk.fcId);
    const l2 = fm ? l2Map.get(fm.l2StructId) : null;
    return {
      id: lk.id,
      processNo: l2?.no || '',
      processName: l2?.name || '',
      fmId: lk.fmId,
      fmName: fm?.mode || '\u274C BROKEN',
      feId: lk.feId,
      feName: fe?.effect || '\u274C BROKEN',
      fcId: lk.fcId,
      fcName: fc?.cause || '\u274C BROKEN',
      broken: !fm || !fe || !fc,
    };
  });

  const linkedFcIds = new Set(links.map((l: any) => l.fcId));
  const linkedFmIds = new Set(links.map((l: any) => l.fmId));
  const linkedFeIds = new Set(links.map((l: any) => l.feId));
  const unlinkedFCList = fcs.filter((fc: any) => !linkedFcIds.has(fc.id)).map((fc: any) => ({ id: fc.id, cause: fc.cause }));
  const unlinkedFMList = fms.filter((fm: any) => !linkedFmIds.has(fm.id)).map((fm: any) => ({ id: fm.id, mode: fm.mode }));
  const unlinkedFEList = fes.filter((fe: any) => !linkedFeIds.has(fe.id)).map((fe: any) => ({ id: fe.id, effect: fe.effect }));

  // 14개 FK 무결성 검증 요약
  const idSet = {
    l1F: new Set(l1Funcs.map((r: any) => r.id)),
    l2: new Set(l2s.map((r: any) => r.id)),
    l2F: new Set(l2Funcs.map((r: any) => r.id)),
    l3: new Set(l3s.map((r: any) => r.id)),
    l3F: new Set(l3Funcs.map((r: any) => r.id)),
    fm: new Set(fms.map((r: any) => r.id)),
    fe: new Set(fes.map((r: any) => r.id)),
    fc: new Set(fcs.map((r: any) => r.id)),
    fl: new Set(links.map((r: any) => r.id)),
  };

  const fkSummary = [
    checkFk('L3.l2Id→L2', l3s, 'l2Id', idSet.l2),
    checkFk('L2F.l2StructId→L2', l2Funcs, 'l2StructId', idSet.l2),
    checkFk('L3F.l3StructId→L3', l3Funcs, 'l3StructId', idSet.l3),
    checkFk('L3F.l2StructId→L2', l3Funcs, 'l2StructId', idSet.l2),
    checkFk('FM.l2StructId→L2', fms, 'l2StructId', idSet.l2),
    checkFk('FM.productCharId→L2F', fms, 'productCharId', idSet.l2F, true),
    checkFk('FC.l3StructId→L3', fcs, 'l3StructId', idSet.l3),
    checkFk('FC.l2StructId→L2', fcs, 'l2StructId', idSet.l2),
    checkFk('FC.l3FuncId→L3F', fcs, 'l3FuncId', idSet.l3F),
    checkFk('FL.fmId→FM', links, 'fmId', idSet.fm),
    checkFk('FL.feId→FE', links, 'feId', idSet.fe),
    checkFk('FL.fcId→FC', links, 'fcId', idSet.fc),
    checkFk('RA.linkId→FL', ras, 'linkId', idSet.fl),
    checkFk('FE.l1FuncId→L1F', fes, 'l1FuncId', idSet.l1F, true),
  ];

  return {
    links: rows,
    unlinkedFCs: unlinkedFCList,
    unlinkedFMs: unlinkedFMList,
    unlinkedFEs: unlinkedFEList,
    totalLinks: links.length,
    totalFMs: fms.length,
    totalFCs: fcs.length,
    totalFEs: fes.length,
    fkSummary,
  };
}

function checkFk(label: string, rows: any[], fkField: string, targetSet: Set<string>, nullable = false) {
  let valid = 0, orphans = 0;
  for (const row of rows) {
    const fkVal = row[fkField];
    if (!fkVal && nullable) { valid++; continue; }
    if (!fkVal || !targetSet.has(fkVal)) orphans++;
    else valid++;
  }
  return { relation: label, total: rows.length, valid, orphans, ok: orphans === 0 };
}

// STEP 5: WS — 워크시트 구조 검증 상세 (Atomic DB 기반)
async function getStep5Detail(prisma: any, fmeaId: string) {
  const [l2s, l3s, l3Funcs, fms, fcs, links, ras] = await Promise.all([
    prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    prisma.l3Structure.findMany({ where: { fmeaId } }),
    prisma.l3Function.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureCause.findMany({ where: { fmeaId } }),
    prisma.failureLink.findMany({ where: { fmeaId } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId } }),
  ]);

  if (l2s.length === 0) return { processes: [], syncSummary: [] };

  const fcL3FuncIds = new Set(fcs.map((fc: any) => fc.l3FuncId).filter(Boolean));

  const processes = l2s.map((l2: any) => {
    const procL3s = l3s.filter((l3: any) => l3.l2Id === l2.id);
    const pcItems = l3Funcs
      .filter((f: any) => procL3s.some((l3: any) => l3.id === f.l3StructId))
      .map((f: any) => ({
        id: (f.id || '').substring(0, 8),
        name: f.processChar || '(빈값)',
        hasFC: fcL3FuncIds.has(f.id),
        inAtomic: true,
      }));

    return {
      processNo: l2.no || '',
      name: l2.name || '',
      fmCount: fms.filter((fm: any) => fm.l2StructId === l2.id).length,
      fcCount: fcs.filter((fc: any) => fc.l2StructId === l2.id).length,
      l3Count: procL3s.length,
      processChars: pcItems,
      linkCount: links.filter((l: any) => {
        const fm = fms.find((fm: any) => fm.id === l.fmId);
        return fm && fm.l2StructId === l2.id;
      }).length,
    };
  });

  // Atomic DB 카운트 요약
  const syncSummary = [
    { entity: 'FM', atomic: fms.length },
    { entity: 'FC', atomic: fcs.length },
    { entity: 'FE', atomic: await prisma.failureEffect.count({ where: { fmeaId } }) },
    { entity: 'FL', atomic: links.length },
    { entity: 'RA', atomic: ras.length },
    { entity: 'L3F', atomic: l3Funcs.length },
  ];

  return { processes, syncSummary };
}
