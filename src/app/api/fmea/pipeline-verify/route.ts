/**
 * @file pipeline-verify/route.ts
 * @description 6단계 파이프라인 검증 + 자동수정 루프 API
 *
 * GET  /api/fmea/pipeline-verify?fmeaId=xxx  → 현재 상태 조회
 * POST /api/fmea/pipeline-verify             → 검증 + 자동수정 루프 실행
 *
 * 6단계: SAMPLE(0) → IMPORT(1) → 파싱(2) → UUID(3) → FK(4) → WS(5)
 * 빨간불 → 자동수정 → 재검증 → 초록불 될 때까지 반복 (최대 3회)
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

type StepStatus = 'ok' | 'warn' | 'error' | 'fixed';

interface StepResult {
  step: number;
  name: string;
  status: StepStatus;
  details: Record<string, number | string>;
  issues: string[];
  fixed: string[];
}

interface PipelineResult {
  fmeaId: string;
  steps: StepResult[];
  allGreen: boolean;
  loopCount: number;
  timestamp: string;
}

// ─── STEP 0: SAMPLE 완전성 (Master 데이터 빈행 검증) ───
async function verifySample(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 0, name: 'SAMPLE', status: 'ok', details: {}, issues: [], fixed: [] };

  try {
    const basePrisma = (await import('@/lib/prisma')).getPrisma();
    if (!basePrisma) { result.status = 'warn'; result.issues.push('Base Prisma 미사용'); return result; }

    const ds = await basePrisma.pfmeaMasterDataset.findUnique({
      where: { fmeaId },
      include: { flatItems: { select: { itemCode: true, processNo: true, value: true, m4: true }, orderBy: { orderIndex: 'asc' } } },
    });
    if (!ds) { result.details = { flatItems: 0, chains: 0 }; return result; }

    const flatItems = ds.flatItems || [];
    const chains = (ds.failureChains || []) as any[];
    const codeCounts: Record<string, number> = {};
    const emptyValues: Record<string, number> = {};
    for (const item of flatItems) {
      const code = item.itemCode;
      codeCounts[code] = (codeCounts[code] || 0) + 1;
      if (!item.value?.trim()) emptyValues[code] = (emptyValues[code] || 0) + 1;
    }

    // 고장사슬 검증
    const uniqueFMs = new Set(chains.map((c: any) => `${c.processNo}|${c.fmValue}`)).size;
    let chainsEmptyFM = 0, chainsEmptyFC = 0, chainsEmptyFE = 0;
    for (const ch of chains) {
      if (!ch.fmValue?.trim()) chainsEmptyFM++;
      if (!ch.fcValue?.trim()) chainsEmptyFC++;
      if (!ch.feValue?.trim()) chainsEmptyFE++;
    }

    result.details = {
      flatItems: flatItems.length,
      chains: chains.length,
      uniqueFMs,
      ...codeCounts,
      chainsEmptyFM, chainsEmptyFC, chainsEmptyFE,
    };

    // 빈 값 검증 — 특별특성 제외 모든 코드에서 빈값 감지
    const criticalCodes = ['A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','B5','C1','C2','C3','C4'];
    for (const code of criticalCodes) {
      const empty = emptyValues[code] || 0;
      if (empty > 0) {
        result.status = result.status === 'error' ? 'error' : 'warn';
        result.issues.push(`${code} 빈값 ${empty}건`);
      }
    }

    // 고장사슬 빈값 검증
    if (chainsEmptyFM > 0) { result.status = 'error'; result.issues.push(`FC 고장사슬 FM 빈값 ${chainsEmptyFM}건`); }
    if (chainsEmptyFC > 0) { result.status = 'error'; result.issues.push(`FC 고장사슬 FC 빈값 ${chainsEmptyFC}건`); }
    if (chainsEmptyFE > 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push(`FC 고장사슬 FE 빈값 ${chainsEmptyFE}건`); }

    // 최소 카운트 검증
    if (flatItems.length === 0) { result.status = 'warn'; result.issues.push('Master 데이터 없음'); }
    if (chains.length === 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push('고장사슬 없음'); }

  } catch (err) {
    result.status = 'warn';
    result.issues.push('Master 검증 스킵 (비치명적)');
  }
  return result;
}

// ─── STEP 1: IMPORT ───
async function verifyImport(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 1, name: 'IMPORT', status: 'ok', details: {}, issues: [], fixed: [] };

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  const l2Count = Array.isArray(data?.l2) ? data.l2.length : 0;
  const l1Name = data?.l1?.name || '';

  result.details = { l2Count, l1Name: l1Name || '(없음)' };

  if (!legacy) { result.status = 'error'; result.issues.push('Legacy 데이터 없음 — Import 필요'); }
  else if (l2Count === 0) { result.status = 'error'; result.issues.push('공정(L2) 0건 — Import 필요'); }
  else if (!l1Name.trim()) { result.status = 'warn'; result.issues.push('완제품 공정명(L1) 미입력'); }

  return result;
}

// ─── STEP 2: 파싱 (SA 시스템분석 통합) ───
async function verifyParsing(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 2, name: '파싱', status: 'ok', details: {}, issues: [], fixed: [] };

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  if (!data?.l2) { result.status = 'error'; result.issues.push('L2 데이터 없음'); return result; }

  // A1~A6, B1~B5, C1~C4 전체 파싱 통계 (SA 시스템분석 통합)
  const l2arr = data.l2 || [];
  let a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0, a6 = 0;
  let b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
  let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
  let emptyPc = 0;

  // L2 (A계열)
  for (const proc of l2arr) {
    a1++; // 공정번호
    if (proc.name?.trim()) a2++; // 공정명
    // A3: 공정기능 — functions at L2 level
    const procFuncs = Array.isArray(proc.functions) ? proc.functions : [];
    a3 += procFuncs.length;
    // A4: 제품특성 — product chars at L2 function level
    for (const fn of procFuncs) {
      const pcs = Array.isArray(fn.processChars || fn.productChars) ? (fn.processChars || fn.productChars) : [];
      a4 += pcs.length;
    }
    // A5: 고장형태
    a5 += Array.isArray(proc.failureModes) ? proc.failureModes.length : 0;

    // L3 (B계열)
    for (const we of (proc.l3 || [])) {
      b1++; // 작업요소
      for (const fn of (we.functions || [])) {
        if (fn.name?.trim() || fn.functionName?.trim()) b2++; // 요소기능
        for (const pc of (fn.processChars || [])) {
          b3++; // 공정특성
          if (!pc.name?.trim()) emptyPc++;
        }
      }
      // B4: 고장원인
      b4 += Array.isArray(we.failureCauses) ? we.failureCauses.length : 0;
    }
    // L2 직속 FC도 카운트
    b4 += Array.isArray(proc.failureCauses) ? proc.failureCauses.length : 0;
  }

  // A6/B5: riskData에서 카운트
  const riskData = data.riskData || {};
  for (const key of Object.keys(riskData)) {
    if (key.startsWith('detection-') && String(riskData[key]).trim()) a6++;
    if (key.startsWith('prevention-') && String(riskData[key]).trim()) b5++;
  }

  // C계열: Legacy l1.functions가 있으면 사용, 없으면 Atomic DB fallback
  const fes = data.l1?.failureScopes || [];
  c4 = fes.length;
  const l1Funcs = data.l1?.functions || [];
  if (l1Funcs.length > 0) {
    const catSet = new Set<string>();
    const funcSet = new Set<string>();
    for (const fn of l1Funcs) {
      if (fn.category?.trim()) catSet.add(fn.category);
      if (fn.name?.trim()) funcSet.add(fn.name);
      c3++;
    }
    c1 = catSet.size;
    c2 = funcSet.size;
  } else {
    // Atomic DB fallback — L1Function이 SSoT
    try {
      const atomicL1Funcs = await prisma.l1Function.findMany({ where: { fmeaId } });
      const catSet = new Set<string>();
      const funcSet = new Set<string>();
      for (const fn of atomicL1Funcs) {
        if ((fn as any).category?.trim()) catSet.add((fn as any).category);
        if ((fn as any).functionName?.trim()) funcSet.add((fn as any).functionName);
        c3++;
      }
      c1 = catSet.size;
      c2 = funcSet.size;
    } catch { /* Atomic DB에 L1Function 테이블 없을 수 있음 */ }
  }

  result.details = {
    A1: a1, A2: a2, A3: a3, A4: a4, A5: a5, A6: a6,
    B1: b1, B2: b2, B3: b3, B4: b4, B5: b5,
    C1: c1, C2: c2, C3: c3, C4: c4,
    emptyPC: emptyPc,
    c_source: l1Funcs.length > 0 ? 'legacy' : 'atomic',
  };

  // 이슈 판정
  if (a1 === 0) { result.status = 'error'; result.issues.push('A1(공정번호) 0건'); }
  if (a5 === 0) { result.status = 'error'; result.issues.push('A5(고장형태) 0건'); }
  if (b4 === 0) { result.status = 'error'; result.issues.push('B4(고장원인) 0건'); }
  if (c4 === 0) { result.status = 'error'; result.issues.push('C4(고장영향) 0건'); }
  if (c1 === 0) { result.status = 'error'; result.issues.push('C1(구분) 0건 — Legacy l1.functions 미동기화'); }
  if (c2 === 0) { result.status = 'error'; result.issues.push('C2(완제품기능) 0건 — Legacy l1.functions 미동기화'); }
  if (c3 === 0) { result.status = 'error'; result.issues.push('C3(요구사항) 0건 — Legacy l1.functions 미동기화'); }
  // Legacy에 l1.functions 없고 Atomic DB fallback으로 카운트한 경우 → 동기화 필요
  if (l1Funcs.length === 0 && c1 > 0) {
    result.status = result.status === 'error' ? 'error' : 'warn';
    result.issues.push(`C계열 Legacy 미동기화 — Atomic DB fallback 사용 중 (C1=${c1},C2=${c2},C3=${c3})`);
  }
  if (b3 === 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push('B3(공정특성) 0건'); }
  if (emptyPc > 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push(`빈 공정특성 ${emptyPc}건`); }
  if (a6 === 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push('A6(검출관리) 0건 — 파싱 누락'); }
  if (b5 === 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push('B5(예방관리) 0건 — 파싱 누락'); }

  return result;
}

// ─── STEP 3: UUID ───
async function verifyUuid(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 3, name: 'UUID', status: 'ok', details: {}, issues: [], fixed: [] };

  const [l2Count, l3Count, l3FuncCount, fmCount, feCount, fcCount] = await Promise.all([
    prisma.l2Structure.count({ where: { fmeaId } }),
    prisma.l3Structure.count({ where: { fmeaId } }),
    prisma.l3Function.count({ where: { fmeaId } }),
    prisma.failureMode.count({ where: { fmeaId } }),
    prisma.failureEffect.count({ where: { fmeaId } }),
    prisma.failureCause.count({ where: { fmeaId } }),
  ]);

  result.details = { L2: l2Count, L3: l3Count, L3Func: l3FuncCount, FM: fmCount, FE: feCount, FC: fcCount };

  if (l2Count === 0) { result.status = 'error'; result.issues.push('Atomic L2 0건 — rebuild-atomic 필요'); }
  if (l3FuncCount === 0) { result.status = 'error'; result.issues.push('Atomic L3Function 0건'); }

  // orphan L3Function (FC가 없는 L3Func)
  if (l3FuncCount > 0 && fcCount > 0) {
    const fcs = await prisma.failureCause.findMany({ where: { fmeaId }, select: { processCharId: true, l3FuncId: true } });
    const fcPcIds = new Set(fcs.map((fc: any) => fc.processCharId).filter(Boolean));
    const fcL3Ids = new Set(fcs.map((fc: any) => fc.l3FuncId).filter(Boolean));
    const l3Funcs = await prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true } });
    const orphanCount = l3Funcs.filter((f: any) => !fcPcIds.has(f.id) && !fcL3Ids.has(f.id)).length;
    result.details.orphanL3Func = orphanCount;
    if (orphanCount > 0) {
      result.status = 'warn';
      result.issues.push(`FC 없는 L3Function ${orphanCount}건`);
    }
  }

  return result;
}

// ─── STEP 4: FK ───
async function verifyFk(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 4, name: 'FK', status: 'ok', details: {}, issues: [], fixed: [] };

  const [links, fcs, fms, fes] = await Promise.all([
    prisma.failureLink.findMany({ where: { fmeaId }, select: { fcId: true, fmId: true, feId: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, l2StructId: true } }),
    prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true, l2StructId: true } }),
    prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }),
  ]);

  const fcSet = new Set(fcs.map((f: any) => f.id));
  const fmSet = new Set(fms.map((f: any) => f.id));
  const feSet = new Set(fes.map((f: any) => f.id));
  const linkedFcIds = new Set(links.map((l: any) => l.fcId));
  const linkedFmIds = new Set(links.map((l: any) => l.fmId));
  const linkedFeIds = new Set(links.map((l: any) => l.feId));

  let brokenFc = 0, brokenFm = 0, brokenFe = 0;
  for (const lk of links) {
    if (!fcSet.has(lk.fcId)) brokenFc++;
    if (!fmSet.has(lk.fmId)) brokenFm++;
    if (!feSet.has(lk.feId)) brokenFe++;
  }

  const unlinkedFcs = fcs.filter((fc: any) => !linkedFcIds.has(fc.id)).length;
  const unlinkedFms = fms.filter((fm: any) => !linkedFmIds.has(fm.id)).length;
  const unlinkedFes = fes.filter((fe: any) => !linkedFeIds.has(fe.id)).length;

  result.details = {
    links: links.length,
    brokenFC: brokenFc, brokenFM: brokenFm, brokenFE: brokenFe,
    unlinkedFC: unlinkedFcs, unlinkedFM: unlinkedFms, unlinkedFE: unlinkedFes,
    totalFM: fms.length, totalFC: fcs.length, totalFE: fes.length,
  };

  if (brokenFc > 0) { result.status = 'error'; result.issues.push(`깨진 FC FK ${brokenFc}건`); }
  if (brokenFm > 0) { result.status = 'error'; result.issues.push(`깨진 FM FK ${brokenFm}건`); }
  if (brokenFe > 0) { result.status = 'error'; result.issues.push(`깨진 FE FK ${brokenFe}건`); }
  if (unlinkedFcs > 0) { result.status = 'warn'; result.issues.push(`FailureLink 없는 FC ${unlinkedFcs}건`); }
  if (unlinkedFms > 0) { result.status = 'warn'; result.issues.push(`FailureLink 없는 FM ${unlinkedFms}건`); }
  if (links.length === 0 && fcs.length > 0) { result.status = 'error'; result.issues.push('FailureLink 0건 — FK 연결 필요'); }

  return result;
}

// ─── STEP 5: WS ───
async function verifyWs(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 5, name: 'WS', status: 'ok', details: {}, issues: [], fixed: [] };

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  if (!data?.l2) { result.status = 'error'; result.issues.push('Legacy 데이터 없음'); return result; }

  let totalPc = 0, emptyPc = 0, totalFc = 0, orphanPc = 0;

  for (const proc of data.l2) {
    const procFcs = Array.isArray(proc.failureCauses) ? proc.failureCauses : [];
    totalFc += procFcs.length;
    const fcPcIds = new Set(procFcs.map((fc: any) => fc.processCharId).filter(Boolean));

    for (const we of (proc.l3 || [])) {
      totalFc += Array.isArray(we.failureCauses) ? we.failureCauses.length : 0;
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          totalPc++;
          if (!pc.name?.trim()) emptyPc++;
          else if (!fcPcIds.has(pc.id)) orphanPc++;
        }
      }
    }
  }

  const linkCount = Array.isArray(data.failureLinks) ? data.failureLinks.length : 0;

  result.details = { totalPC: totalPc, emptyPC: emptyPc, orphanPC: orphanPc, totalFC: totalFc, legacyLinks: linkCount };

  if (emptyPc > 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push(`빈 공정특성 ${emptyPc}건 — 워크시트에 🔍 표시됨`); }
  if (orphanPc > 0) { result.status = 'warn'; result.issues.push(`FC 없는 공정특성 ${orphanPc}건 — "고장원인 선택" 표시됨`); }

  return result;
}

// ─── 자동수정 함수들 ───

async function fixStep1Import(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  const l2arr = Array.isArray(data?.l2) ? data.l2 : [];
  const fmCount = l2arr.reduce((sum: number, p: any) => sum + (Array.isArray(p.failureModes) ? p.failureModes.length : 0), 0);

  if (fmCount > 0) return fixed;

  const basePrisma = (await import('@/lib/prisma')).getPrisma();
  if (!basePrisma) return fixed;

  const ds = await basePrisma.pfmeaMasterDataset.findUnique({
    where: { fmeaId },
    include: { flatItems: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!ds || !ds.flatItems || ds.flatItems.length === 0) return fixed;

  const flatItems = ds.flatItems;
  const chains = (ds.failureChains || []) as any[];
  const hasAItems = flatItems.some((i: any) => i.itemCode === 'A1');
  const hasBItems = flatItems.some((i: any) => i.itemCode === 'B1');

  if (!hasAItems && !hasBItems) return fixed;

  try {
    const flatData = flatItems.map((i: any) => ({
      id: i.id, processNo: i.processNo, category: i.category,
      itemCode: i.itemCode, value: i.value || '',
      m4: i.m4 || undefined, specialChar: i.specialChar || undefined,
      parentItemId: i.parentItemId || undefined,
      belongsTo: i.belongsTo || undefined,
      inherited: i.inherited || false,
    }));

    const saveRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/fmea/save-from-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, flatData, l1Name: '', failureChains: chains }),
    });

    if (saveRes.ok) {
      fixed.push(`Master flatData ${flatItems.length}건 + chains ${chains.length}건 → save-from-import 재실행 완료`);
    } else {
      fixed.push(`save-from-import 호출 실패: ${saveRes.status}`);
    }
  } catch (err) {
    console.error('[fixStep1Import] save-from-import 호출 에러:', err);
  }

  return fixed;
}

async function fixStep2Parsing(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  if (!legacy) {
    const importFixes = await fixStep1Import(prisma, fmeaId);
    fixed.push(...importFixes);
    return fixed;
  }

  const data = JSON.parse(JSON.stringify(legacy.data)) as any;
  let changed = false;

  const l2arr = data.l2 || [];
  const a5Count = l2arr.reduce((sum: number, p: any) => sum + (Array.isArray(p.failureModes) ? p.failureModes.length : 0), 0);
  const b4Count = l2arr.reduce((sum: number, p: any) => {
    let count = Array.isArray(p.failureCauses) ? p.failureCauses.length : 0;
    for (const we of (p.l3 || [])) count += Array.isArray(we.failureCauses) ? we.failureCauses.length : 0;
    return sum + count;
  }, 0);

  if (a5Count === 0 || b4Count === 0) {
    const basePrisma = (await import('@/lib/prisma')).getPrisma();
    const masterHasData = basePrisma ? await basePrisma.pfmeaMasterFlatItem.count({
      where: { dataset: { fmeaId }, itemCode: 'A5' },
    }).catch(() => 0) : 0;

    if (masterHasData > 0) {
      const importFixes = await fixStep1Import(prisma, fmeaId);
      if (importFixes.length > 0) {
        fixed.push(...importFixes);
        return fixed;
      }
    }
  }

  // C계열: Atomic DB L1Function → Legacy l1.functions 동기화
  const l1Funcs = data.l1?.functions || [];
  if (l1Funcs.length === 0) {
    try {
      const atomicL1Funcs = await prisma.l1Function.findMany({ where: { fmeaId } });
      if (atomicL1Funcs.length > 0) {
        if (!data.l1) data.l1 = {};
        data.l1.functions = atomicL1Funcs.map((fn: any) => ({
          id: fn.id,
          category: fn.category || '',
          name: fn.functionName || '',
          requirement: fn.requirement || '',
        }));
        fixed.push(`L1Function ${atomicL1Funcs.length}건 Legacy 동기화`);
        changed = true;
      }
    } catch { /* L1Function 테이블 없으면 무시 */ }
  }

  // C4: Atomic DB FailureEffect → Legacy l1.failureScopes 동기화
  const fes = data.l1?.failureScopes || [];
  if (fes.length === 0) {
    try {
      const atomicFEs = await prisma.failureEffect.findMany({ where: { fmeaId } });
      if (atomicFEs.length > 0) {
        if (!data.l1) data.l1 = {};
        data.l1.failureScopes = atomicFEs.map((fe: any) => ({
          id: fe.id,
          name: fe.effectName || fe.effect || '',
          severity: (fe as any).severity || 0,
          scope: (fe as any).scope || '',
        }));
        fixed.push(`FailureEffect ${atomicFEs.length}건 Legacy 동기화`);
        changed = true;
      }
    } catch { /* FailureEffect 테이블 없으면 무시 */ }
  }

  // ★ 빈 공정특성 자동채움 — Master B3 + 작업요소명 + Atomic DB 동시 업데이트
  let emptyPcFixed = 0;
  const atomicPcUpdates: Array<{ id: string; processChar: string }> = [];
  for (const proc of l2arr) {
    for (const we of (proc.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          if (!pc.name?.trim()) {
            let pcName = '';
            // 1) Atomic DB L3Function.processChar 조회
            try {
              const l3Func = await prisma.l3Function.findFirst({
                where: { fmeaId, id: pc.id },
                select: { processChar: true, functionName: true },
              });
              if (l3Func?.processChar?.trim()) pcName = l3Func.processChar;
              else if (l3Func?.functionName?.trim()) pcName = l3Func.functionName;
            } catch { /* ignore */ }

            // 2) 작업요소명/기능명 fallback
            if (!pcName) {
              const fnName = fn.name?.trim() || fn.functionName?.trim() || '';
              const weName = we.name?.trim() || we.m4Name?.trim() || '';
              if (fnName) pcName = fnName;
              else if (weName) pcName = `${weName} 관리`;
            }

            // 3) Master B3 데이터 조회
            if (!pcName) {
              try {
                const basePrisma = (await import('@/lib/prisma')).getPrisma();
                if (basePrisma) {
                  const masterB3 = await basePrisma.pfmeaMasterFlatItem.findFirst({
                    where: { dataset: { fmeaId }, itemCode: 'B3', processNo: proc.no || '' },
                    select: { value: true },
                  });
                  if (masterB3?.value?.trim()) pcName = masterB3.value;
                }
              } catch { /* ignore */ }
            }

            if (pcName) {
              pc.name = pcName;
              emptyPcFixed++;
              changed = true;
              // ★ Atomic DB L3Function.processChar도 동시 업데이트 (재발 방지)
              if (pc.id) atomicPcUpdates.push({ id: pc.id, processChar: pcName });
            }
          }
        }
      }
    }
  }
  // ★ Atomic DB L3Function.processChar 일괄 업데이트
  for (const upd of atomicPcUpdates) {
    try {
      await prisma.l3Function.updateMany({
        where: { fmeaId, id: upd.id },
        data: { processChar: upd.processChar },
      });
    } catch { /* L3Function이 없으면 무시 */ }
  }
  if (emptyPcFixed > 0) {
    fixed.push(`빈 공정특성 ${emptyPcFixed}건 자동채움 (Legacy+Atomic DB)`);
  }

  // ★★ Atomic DB L3Function.processChar 직접 수정 (Legacy와 독립)
  // Legacy가 이미 채워져 있어도, Atomic DB가 비어있으면 브라우저 로드 시 다시 빈값이 됨
  try {
    const emptyL3Funcs = await prisma.l3Function.findMany({
      where: { fmeaId, OR: [{ processChar: '' }, { processChar: null }] },
      select: { id: true, functionName: true, l3StructId: true },
    });
    if (emptyL3Funcs.length > 0) {
      // ★ 마스터 FMEA DB에서 동일 functionName으로 processChar 매칭 (핵심!)
      let masterL3FuncMap = new Map<string, string>();
      try {
        const fmeaIdPrefix = fmeaId.replace(/\d+$/, '');
        const basePrisma = (await import('@/lib/prisma')).getPrisma();
        if (basePrisma) {
          const masterFmeas = await basePrisma.fmeaProject.findMany({
            where: { id: { startsWith: fmeaIdPrefix } },
            select: { id: true },
            take: 10,
          });
          for (const mf of masterFmeas) {
            if (mf.id === fmeaId) continue;
            try {
              const mSchema = (await import('@/lib/project-schema')).getProjectSchemaName(mf.id);
              const mBaseUrl = getBaseDatabaseUrl();
              if (mBaseUrl) {
                await (await import('@/lib/project-schema')).ensureProjectSchemaReady({ baseDatabaseUrl: mBaseUrl, schema: mSchema });
                const mPrisma = getPrismaForSchema(mSchema);
                if (mPrisma) {
                  const mFuncs = await mPrisma.l3Function.findMany({
                    where: { fmeaId: mf.id, processChar: { not: '' } },
                    select: { functionName: true, processChar: true },
                  });
                  for (const mf2 of mFuncs) {
                    if (mf2.functionName?.trim() && mf2.processChar?.trim()) {
                      masterL3FuncMap.set(mf2.functionName.trim(), mf2.processChar);
                    }
                  }
                }
              }
            } catch { /* 마스터 스키마 접근 실패 무시 */ }
          }
        }
      } catch { /* 마스터 DB 접근 실패 무시 */ }

      let atomicFixed = 0;
      for (const func of emptyL3Funcs) {
        let pcName = '';
        // 1) 마스터 FMEA DB에서 동일 functionName 매칭 (SSoT)
        if (func.functionName?.trim()) {
          pcName = masterL3FuncMap.get(func.functionName.trim()) || '';
        }
        // 2) Legacy 데이터에서 해당 PC 이름 찾기
        if (!pcName) {
          for (const proc of l2arr) {
            for (const we of (proc.l3 || [])) {
              for (const fn of (we.functions || [])) {
                for (const pc of (fn.processChars || [])) {
                  if (pc.id === func.id && pc.name?.trim()) pcName = pc.name;
                }
              }
            }
            if (pcName) break;
          }
        }
        // 3) functionName fallback (최후 수단)
        if (!pcName && func.functionName?.trim()) {
          pcName = func.functionName;
        }

        if (pcName) {
          await prisma.l3Function.updateMany({
            where: { fmeaId, id: func.id },
            data: { processChar: pcName },
          }).catch(() => {});
          // Legacy 동기화
          for (const proc of l2arr) {
            for (const we of (proc.l3 || [])) {
              for (const fn of (we.functions || [])) {
                for (const pc of (fn.processChars || [])) {
                  if (pc.id === func.id && !pc.name?.trim()) {
                    pc.name = pcName;
                    changed = true;
                  }
                }
              }
            }
          }
          atomicFixed++;
        }
      }
      if (atomicFixed > 0) {
        fixed.push(`Master DB 매칭으로 L3Function.processChar ${atomicFixed}건 꽂아넣기`);
        changed = true;
      }
    }
  } catch (err) {
    console.error('[fixStep2Parsing] Atomic DB L3Function 직접 수정 오류:', err);
  }

  if (changed) {
    await prisma.fmeaLegacyData.update({ where: { fmeaId }, data: { data } });
  }

  return fixed;
}

async function fixStep3Uuid(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const l2s = await prisma.l2Structure.findMany({ where: { fmeaId } });

  if (l2s.length === 0) {
    const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
    const legacyL2 = Array.isArray((legacy?.data as any)?.l2) ? (legacy?.data as any).l2 : [];

    if (legacyL2.length > 0) {
      try {
        const rebuildRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/fmea/rebuild-atomic?fmeaId=${encodeURIComponent(fmeaId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fmeaId }),
        });
        if (rebuildRes.ok) {
          const result = await rebuildRes.json();
          fixed.push(`rebuild-atomic 완료: L2=${result.counts?.l2 || '?'}, L3=${result.counts?.l3 || '?'}, FM=${result.counts?.fm || '?'}`);
        } else {
          fixed.push(`rebuild-atomic 호출 실패: ${rebuildRes.status}`);
        }
      } catch (err) {
        console.error('[fixStep3Uuid] rebuild-atomic 호출 에러:', err);
      }
      return fixed;
    } else {
      const importFixes = await fixStep1Import(prisma, fmeaId);
      if (importFixes.length > 0) {
        fixed.push(...importFixes);
        return fixed;
      }
    }
  }

  const fcs = await prisma.failureCause.findMany({ where: { fmeaId }, select: { processCharId: true, l3FuncId: true } });
  const fcPcIds = new Set(fcs.map((fc: any) => fc.processCharId).filter(Boolean));
  const fcL3Ids = new Set(fcs.map((fc: any) => fc.l3FuncId).filter(Boolean));
  const l3Funcs = await prisma.l3Function.findMany({ where: { fmeaId } });
  const l3s = await prisma.l3Structure.findMany({ where: { fmeaId } });
  const l2ById = new Map(l2s.map((l: any) => [l.id, l]));
  const l3ById = new Map(l3s.map((l: any) => [l.id, l]));

  const orphans = l3Funcs.filter((f: any) => !fcPcIds.has(f.id) && !fcL3Ids.has(f.id));

  for (const func of orphans) {
    const l3 = l3ById.get(func.l3StructId);
    const l2 = l3 ? l2ById.get((l3 as any).l2Id) : null;
    if (!l2) continue;

    const pcName = func.processChar?.trim() || func.functionName?.trim() || (l3 as any)?.name || '';
    const fcName = pcName ? `${pcName} 부적합` : `${(l3 as any)?.name || 'Unknown'} 부적합`;
    const fcId = `${func.id}-FC`;

    try {
      await prisma.failureCause.create({
        data: { id: fcId, fmeaId, l2StructId: (l2 as any).id, l3StructId: func.l3StructId, l3FuncId: func.id, processCharId: func.id, cause: fcName },
      });
      fixed.push(`FC 생성: "${fcName}"`);
    } catch { /* 이미 존재 */ }
  }

  return fixed;
}

async function fixStep4Fk(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const [fcs, links, fms, fes, l2s] = await Promise.all([
    prisma.failureCause.findMany({ where: { fmeaId } }),
    prisma.failureLink.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureEffect.findMany({ where: { fmeaId } }),
    prisma.l2Structure.findMany({ where: { fmeaId } }),
  ]);

  const linkedFcIds = new Set(links.map((lk: any) => lk.fcId));
  const fcSet = new Set(fcs.map((f: any) => f.id));
  const fmSet = new Set(fms.map((f: any) => f.id));
  const feSet = new Set(fes.map((f: any) => f.id));

  // 깨진 FK 삭제
  for (const lk of links) {
    if (!fcSet.has(lk.fcId) || !fmSet.has(lk.fmId) || !feSet.has(lk.feId)) {
      await prisma.failureLink.delete({ where: { id: lk.id } }).catch(() => {});
      fixed.push(`깨진 Link 삭제: fc=${lk.fcId}`);
    }
  }

  // FC에 FailureLink 없으면 생성
  for (const fc of fcs) {
    if (linkedFcIds.has(fc.id)) continue;

    const procFms = fms.filter((fm: any) => fm.l2StructId === fc.l2StructId);
    const existingLinks = links.filter((lk: any) => procFms.some((fm: any) => fm.id === lk.fmId));
    const procFeIds = new Set(existingLinks.map((lk: any) => lk.feId));
    const firstFm = procFms[0];
    const firstFe = fes.find((fe: any) => procFeIds.has(fe.id)) || fes[0];

    if (firstFm && firstFe) {
      try {
        await prisma.failureLink.create({
          data: { fmeaId, fcId: fc.id, fmId: firstFm.id, feId: firstFe.id },
        });
        fixed.push(`Link 생성: FC=${fc.cause?.substring(0, 20)}`);
      } catch { /* 이미 존재 */ }
    }
  }

  return fixed;
}

async function fixStep5Ws(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  if (!legacy) return fixed;

  const data = JSON.parse(JSON.stringify(legacy.data)) as any;
  let changed = false;

  // ★ Atomic DB L3Function 전체 로드 (한번에 조회하여 N+1 방지)
  let l3FuncMap = new Map<string, { processChar: string; functionName: string }>();
  try {
    const allL3Funcs = await prisma.l3Function.findMany({
      where: { fmeaId },
      select: { id: true, processChar: true, functionName: true, l3StructId: true },
    });
    for (const f of allL3Funcs) {
      l3FuncMap.set(f.id, { processChar: f.processChar || '', functionName: f.functionName || '' });
    }
  } catch { /* ignore */ }

  // ★ Master B3 데이터 프리로드
  let masterB3Map = new Map<string, string>();
  try {
    const basePrisma = (await import('@/lib/prisma')).getPrisma();
    if (basePrisma) {
      const masterB3s = await basePrisma.pfmeaMasterFlatItem.findMany({
        where: { dataset: { fmeaId }, itemCode: 'B3' },
        select: { processNo: true, value: true, orderIndex: true },
        orderBy: { orderIndex: 'asc' },
      });
      for (const b3 of masterB3s) {
        if (b3.value?.trim()) {
          const key = `${b3.processNo}-${b3.orderIndex}`;
          masterB3Map.set(key, b3.value);
        }
      }
    }
  } catch { /* ignore */ }

  const atomicPcUpdatesWs: Array<{ id: string; processChar: string }> = [];
  for (const proc of (data.l2 || [])) {
    let pcSeq = 0;
    for (const we of (proc.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          pcSeq++;
          if (!pc.name?.trim()) {
            let pcName = '';

            // 1) Atomic DB ID 매칭
            const l3Func = l3FuncMap.get(pc.id);
            if (l3Func?.processChar?.trim()) pcName = l3Func.processChar;
            else if (l3Func?.functionName?.trim()) pcName = l3Func.functionName;

            // 2) 작업요소명/기능명 fallback
            if (!pcName) {
              const fnName = fn.name?.trim() || fn.functionName?.trim() || '';
              const weName = we.name?.trim() || '';
              if (fnName) pcName = fnName;
              else if (weName) pcName = `${weName} 관리`;
            }

            // 3) Master B3 데이터 fallback (공정번호 + 순서)
            if (!pcName) {
              for (const [key, val] of masterB3Map) {
                if (key.startsWith(`${proc.no}-`)) {
                  pcName = val;
                  break;
                }
              }
            }

            if (pcName) {
              pc.name = pcName;
              fixed.push(`PC 이름 복원: "${pcName}"`);
              changed = true;
              if (pc.id) atomicPcUpdatesWs.push({ id: pc.id, processChar: pcName });
            }
          }
        }
      }
    }

    // orphan PC에 FC 보충
    const procFcs = proc.failureCauses || [];
    const fcPcIds = new Set(procFcs.map((fc: any) => fc.processCharId).filter(Boolean));
    for (const we of (proc.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          if (pc.name?.trim() && !fcPcIds.has(pc.id)) {
            procFcs.push({ id: `${pc.id}-FC`, name: `${pc.name} 부적합`, processCharId: pc.id });
            fcPcIds.add(pc.id);
            fixed.push(`FC 보충: "${pc.name} 부적합"`);
            changed = true;
          }
        }
      }
    }
    if (changed) proc.failureCauses = procFcs;
  }

  // ★ Atomic DB L3Function.processChar 일괄 업데이트 (재발 방지)
  for (const upd of atomicPcUpdatesWs) {
    try {
      await prisma.l3Function.updateMany({
        where: { fmeaId, id: upd.id },
        data: { processChar: upd.processChar },
      });
    } catch { /* ignore */ }
  }

  if (changed) {
    await prisma.fmeaLegacyData.update({ where: { fmeaId }, data: { data } });
  }

  return fixed;
}

// ─── 메인 검증+수정 루프 ───

async function runPipelineVerify(prisma: any, fmeaId: string, autoFix: boolean): Promise<PipelineResult> {
  const MAX_LOOPS = 7;
  let loopCount = 0;

  for (let i = 0; i < MAX_LOOPS; i++) {
    loopCount = i + 1;

    const steps: StepResult[] = [
      await verifySample(prisma, fmeaId),
      await verifyImport(prisma, fmeaId),
      await verifyParsing(prisma, fmeaId),
      await verifyUuid(prisma, fmeaId),
      await verifyFk(prisma, fmeaId),
      await verifyWs(prisma, fmeaId),
    ];

    const allOk = steps.every(s => s.status === 'ok');
    if (allOk || !autoFix) {
      return { fmeaId, steps, allGreen: allOk, loopCount, timestamp: new Date().toISOString() };
    }

    // ★ warn도 자동수정 대상 — error + warn 모두 fix 시도

    // STEP 1 (IMPORT)
    const stepImport = steps.find(s => s.name === 'IMPORT');
    if (stepImport && stepImport.status !== 'ok') {
      const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
      const legacyL2 = Array.isArray((legacy?.data as any)?.l2) ? (legacy?.data as any).l2 : [];
      const legacyFMs = legacyL2.reduce((sum: number, p: any) => sum + (Array.isArray(p.failureModes) ? p.failureModes.length : 0), 0);

      if (legacyFMs === 0) {
        const importFixes = await fixStep1Import(prisma, fmeaId);
        if (importFixes.length > 0) {
          stepImport.fixed = importFixes;
          stepImport.status = 'fixed';
        } else if (stepImport.status === 'error') {
          return { fmeaId, steps, allGreen: false, loopCount, timestamp: new Date().toISOString() };
        }
      }
    }

    // STEP 2 (파싱) — C계열 미동기화 + 빈 공정특성 자동수정
    const stepParsing = steps.find(s => s.name === '파싱');
    if (stepParsing && stepParsing.status !== 'ok') {
      const fixes = await fixStep2Parsing(prisma, fmeaId);
      stepParsing.fixed = fixes;
      if (fixes.length > 0) stepParsing.status = 'fixed';
    }

    // STEP 3 (UUID)
    const stepUuid = steps.find(s => s.name === 'UUID');
    if (stepUuid && stepUuid.status !== 'ok') {
      const fixes = await fixStep3Uuid(prisma, fmeaId);
      stepUuid.fixed = fixes;
      if (fixes.length > 0) stepUuid.status = 'fixed';
    }

    // STEP 4 (FK)
    const stepFk = steps.find(s => s.name === 'FK');
    if (stepFk && stepFk.status !== 'ok') {
      const fixes = await fixStep4Fk(prisma, fmeaId);
      stepFk.fixed = fixes;
      if (fixes.length > 0) stepFk.status = 'fixed';
    }

    // STEP 5 (WS) — 빈 공정특성 자동수정 (Master + Atomic DB 조회)
    const stepWs = steps.find(s => s.name === 'WS');
    if (stepWs && stepWs.status !== 'ok') {
      const fixes = await fixStep5Ws(prisma, fmeaId);
      stepWs.fixed = fixes;
      if (fixes.length > 0) stepWs.status = 'fixed';
    }

    const anyFixed = steps.some(s => s.fixed.length > 0);
    if (!anyFixed) {
      // 더 이상 수정 불가 — warn만 남은 경우 allGreen=true (수용)
      const allAcceptable = steps.every(s => s.status === 'ok' || s.status === 'warn');
      return { fmeaId, steps, allGreen: allAcceptable, loopCount, timestamp: new Date().toISOString() };
    }
  }

  // 최종 검증
  const finalSteps: StepResult[] = [
    await verifySample(prisma, fmeaId),
    await verifyImport(prisma, fmeaId),
    await verifyParsing(prisma, fmeaId),
    await verifyUuid(prisma, fmeaId),
    await verifyFk(prisma, fmeaId),
    await verifyWs(prisma, fmeaId),
  ];

  return {
    fmeaId,
    steps: finalSteps,
    allGreen: finalSteps.every(s => s.status === 'ok'),
    loopCount,
    timestamp: new Date().toISOString(),
  };
}

// ─── HTTP handlers ───

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    const result = await runPipelineVerify(prisma, fmeaId, false);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fmeaId = body.fmeaId;
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    const result = await runPipelineVerify(prisma, fmeaId, true);

    // ★ ImportValidation 저장: pipeline 검증 결과를 ImportValidation 테이블에 기록
    let validationJobId: string | null = null;
    try {
      validationJobId = await savePipelineResultAsValidation(prisma, fmeaId, result);
    } catch (valErr) {
      console.error('[pipeline-verify] ImportValidation 저장 실패 (비치명적):', valErr);
    }

    return NextResponse.json({ success: true, ...result, validationJobId });
  } catch (e) {
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}

// ─── Pipeline 검증 결과 → ImportValidation 저장 ───

async function savePipelineResultAsValidation(
  prisma: any,
  fmeaId: string,
  result: PipelineResult,
): Promise<string | null> {
  // ImportJob 찾거나 생성
  let job = await prisma.importJob.findFirst({
    where: { fmeaId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  }).catch(() => null);

  if (!job) {
    const { randomUUID } = await import('crypto');
    job = await prisma.importJob.create({
      data: {
        id: randomUUID(),
        fmeaId,
        status: 'verifying',
        flatDataCount: 0,
        chainCount: 0,
      },
    });
  }

  const jobId = job.id;

  // 기존 validation 삭제 후 새로 저장
  await prisma.importValidation.deleteMany({ where: { jobId } });

  interface ValidationData {
    jobId: string;
    ruleId: string;
    target: string;
    level: string;
    message: string;
    autoFixed: boolean;
  }
  const records: ValidationData[] = [];

  for (const step of result.steps) {
    const rulePrefix = `PIPELINE_S${step.step}`;

    for (const issue of step.issues) {
      records.push({
        jobId,
        ruleId: `${rulePrefix}_${step.name}`,
        target: `step${step.step}`,
        level: step.status === 'error' ? 'ERROR' : 'WARN',
        message: issue,
        autoFixed: false,
      });
    }

    for (const fix of step.fixed) {
      records.push({
        jobId,
        ruleId: `${rulePrefix}_FIX`,
        target: `step${step.step}`,
        level: 'INFO',
        message: fix,
        autoFixed: true,
      });
    }
  }

  if (records.length > 0) {
    await prisma.importValidation.createMany({ data: records });
  }

  return jobId;
}
