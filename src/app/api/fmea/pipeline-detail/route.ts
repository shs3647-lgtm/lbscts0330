/**
 * @file pipeline-detail/route.ts
 * @description 파이프라인 검증 상세 데이터 API
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

// STEP 1: Import — Legacy 데이터 구조 상세
async function getStep1Detail(prisma: any, fmeaId: string) {
  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const d = legacy?.data as any;
  if (!d) return { exists: false, processes: [] };

  const processes = (d.l2 || []).map((p: any) => ({
    processNo: p.processNo || p.no || '',
    name: p.name || '',
    funcCount: (p.functions || []).length,
    l3Count: (p.l3 || []).length,
    fmCount: (p.failureModes || []).length,
    fcCount: (p.failureCauses || []).length,
  }));

  return {
    exists: true,
    l1Name: d.l1?.name || '',
    l1FuncCount: (d.l1?.functions || []).length,
    feCount: (d.l1?.failureScopes || []).length,
    processCount: processes.length,
    processes,
  };
}

// STEP 2: 파싱 — 실제 파싱 데이터 공정별 상세 + 교차검증 매트릭스
async function getStep2Detail(prisma: any, fmeaId: string) {
  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const d = legacy?.data as any;
  if (!d?.l2) return { processes: [], l1Functions: [], failureEffects: [], crossCheckMatrix: [] };

  const processes = (d.l2 || []).map((p: any) => {
    const funcs = p.functions || [];
    const l3s = p.l3 || [];
    const pcList: { name: string; id: string }[] = [];
    for (const fn of funcs) {
      for (const pc of (fn.processChars || fn.productChars || [])) {
        pcList.push({ name: pc.name || '', id: pc.id || '' });
      }
    }
    const b1List: { name: string; m4: string; funcCount: number; pcCount: number; fcCount: number }[] = [];
    for (const we of l3s) {
      let weFuncCount = 0, wePcCount = 0;
      for (const fn of (we.functions || [])) {
        weFuncCount++;
        wePcCount += (fn.processChars || []).length;
      }
      b1List.push({
        name: we.name || '',
        m4: we.m4 || '',
        funcCount: weFuncCount,
        pcCount: wePcCount,
        fcCount: (we.failureCauses || []).length,
      });
    }
    return {
      processNo: p.processNo || p.no || '',
      name: p.name || '',
      a3: funcs.map((f: any) => f.name || f.functionName || '').filter(Boolean),
      a4: pcList,
      a5: (p.failureModes || []).map((fm: any) => ({ name: fm.name || fm.mode || '', id: fm.id || '' })),
      b1: b1List,
    };
  });

  const l1Funcs = (d.l1?.functions || []).map((fn: any) => ({
    category: fn.category || '',
    name: fn.name || '',
    requirement: fn.requirement || '',
  }));

  const fes = (d.l1?.failureScopes || d.failureEffects || []).map((fe: any) => ({
    name: fe.name || '',
    scope: fe.scope || '',
    severity: fe.severity || 0,
  }));

  // 교차검증 매트릭스: Atomic vs Legacy 수량 비교 (A1~C4)
  const crossCheckMatrix = await buildCrossCheckMatrix(prisma, fmeaId, d);

  return { processes, l1Functions: l1Funcs, failureEffects: fes, crossCheckMatrix };
}

async function buildCrossCheckMatrix(prisma: any, fmeaId: string, legacyData: any) {
  const l2arr = legacyData.l2 || [];
  const leg: Record<string, number> = { A1: 0, A2: 0, A3: 0, A4: 0, A5: 0, B1: 0, B2: 0, B3: 0, B4: 0, C1: 0, C2: 0, C3: 0, C4: 0 };
  for (const proc of l2arr) {
    leg.A1++;
    if (proc.name?.trim()) leg.A2++;
    leg.A3 += (proc.functions || []).length;
    for (const fn of (proc.functions || [])) { leg.A4 += (fn.processChars || fn.productChars || []).length; }
    leg.A5 += (proc.failureModes || []).length;
    for (const we of (proc.l3 || [])) {
      leg.B1++;
      for (const fn of (we.functions || [])) { if (fn.name?.trim() || fn.functionName?.trim()) leg.B2++; leg.B3 += (fn.processChars || []).length; }
      leg.B4 += (we.failureCauses || []).length;
    }
    leg.B4 += (proc.failureCauses || []).length;
  }
  leg.C4 = (legacyData.failureEffects || legacyData.l1?.failureScopes || []).length;
  const l1Funcs = legacyData.l1?.functions || [];
  const cats = new Set<string>(), fns = new Set<string>();
  for (const fn of l1Funcs) { if (fn.category?.trim()) cats.add(fn.category); if (fn.name?.trim()) fns.add(fn.name); }
  leg.C1 = cats.size; leg.C2 = fns.size; leg.C3 = l1Funcs.length;

  const atm: Record<string, number> = {};
  atm.A1 = await prisma.l2Structure.count({ where: { fmeaId } });
  atm.A2 = await prisma.l2Structure.count({ where: { fmeaId, name: { not: '' } } });
  atm.A3 = await prisma.l2Function.count({ where: { fmeaId } });
  atm.A4 = await prisma.l2Function.count({ where: { fmeaId, productChar: { not: '' } } });
  atm.A5 = await prisma.failureMode.count({ where: { fmeaId } });
  atm.B1 = await prisma.l3Structure.count({ where: { fmeaId } });
  const l3fs = await prisma.l3Function.findMany({ where: { fmeaId }, select: { functionName: true, processChar: true } });
  atm.B2 = new Set(l3fs.map((f: any) => f.functionName).filter((n: string) => n?.trim())).size;
  atm.B3 = l3fs.filter((f: any) => f.processChar?.trim()).length;
  atm.B4 = await prisma.failureCause.count({ where: { fmeaId } });
  const aL1 = await prisma.l1Function.findMany({ where: { fmeaId } }).catch(() => []);
  const ac = new Set<string>(), af = new Set<string>();
  for (const fn of aL1) { if ((fn as any).category?.trim()) ac.add((fn as any).category); if ((fn as any).functionName?.trim()) af.add((fn as any).functionName); }
  atm.C1 = ac.size; atm.C2 = af.size; atm.C3 = aL1.length;
  atm.C4 = await prisma.failureEffect.count({ where: { fmeaId } });

  const labels: Record<string, string> = {
    A1: '공정번호', A2: '공정명', A3: '공정기능', A4: '제품특성', A5: '고장형태',
    B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인',
    C1: '구분', C2: '완제품기능', C3: '요구사항', C4: '고장영향',
  };

  return Object.keys(labels).map(code => ({
    code,
    label: labels[code],
    atomicCount: atm[code] ?? 0,
    legacyCount: leg[code] ?? 0,
    match: (atm[code] ?? 0) === (leg[code] ?? 0),
    diff: Math.abs((atm[code] ?? 0) - (leg[code] ?? 0)),
  }));
}

// STEP 3: UUID — 실제 Atomic DB 엔티티 목록
async function getStep3Detail(prisma: any, fmeaId: string) {
  // 각 쿼리를 개별 try-catch로 보호 (테이블 없으면 빈 배열)
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

// STEP 5: WS — 워크시트 구조 검증 상세 + Atomic↔Legacy 동기화 비교
async function getStep5Detail(prisma: any, fmeaId: string) {
  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const d = legacy?.data as any;
  if (!d?.l2) return { processes: [], syncSummary: [] };

  const processes = (d.l2 || []).map((p: any) => {
    const procFcs = p.failureCauses || [];
    const fcPcIds = new Set(procFcs.map((fc: any) => fc.processCharId).filter(Boolean));
    for (const we of (p.l3 || [])) {
      for (const fc of (we.failureCauses || [])) { if (fc.processCharId) fcPcIds.add(fc.processCharId); }
    }
    const pcItems: { id: string; name: string; hasFC: boolean; inAtomic: boolean }[] = [];

    for (const we of (p.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          pcItems.push({
            id: (pc.id || '').substring(0, 8),
            name: pc.name || '(빈값)',
            hasFC: fcPcIds.has(pc.id),
            inAtomic: true,
          });
        }
      }
    }

    return {
      processNo: p.processNo || p.no || '',
      name: p.name || '',
      fmCount: (p.failureModes || []).length,
      fcCount: procFcs.length,
      l3Count: (p.l3 || []).length,
      processChars: pcItems,
      linkCount: (p.failureLinks || []).length,
    };
  });

  // Atomic↔Legacy 동기화 요약
  const safeCount = async (model: string) => {
    try { return await (prisma as any)[model].count({ where: { fmeaId } }); } catch { return -1; }
  };
  const legCounts = {
    FM: d.l2.reduce((s: number, p: any) => s + (p.failureModes || []).length, 0),
    FC: d.l2.reduce((s: number, p: any) => {
      let c = (p.failureCauses || []).length;
      for (const we of (p.l3 || [])) c += (we.failureCauses || []).length;
      return s + c;
    }, 0),
    FE: (d.failureEffects || d.l1?.failureScopes || []).length,
    FL: (d.failureLinks || []).length,
  };
  const syncSummary = [
    { entity: 'FM', atomic: await safeCount('failureMode'), legacy: legCounts.FM },
    { entity: 'FC', atomic: await safeCount('failureCause'), legacy: legCounts.FC },
    { entity: 'FE', atomic: await safeCount('failureEffect'), legacy: legCounts.FE },
    { entity: 'FL', atomic: await safeCount('failureLink'), legacy: legCounts.FL },
    { entity: 'L3F', atomic: await safeCount('l3Function'), legacy: processes.reduce((s: number, p: any) => s + (p.processChars?.length || 0), 0) },
  ].map(s => ({ ...s, match: s.atomic === s.legacy }));

  return { processes, syncSummary };
}
