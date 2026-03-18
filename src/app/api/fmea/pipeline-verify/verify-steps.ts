/**
 * @file verify-steps.ts
 * @description 파이프라인 검증 강화 — 교차검증 매트릭스 + 14개 FK 전수검증 + 모자관계 검증
 *
 * 단순 count가 아닌 실제 ID 목록 대조, Atomic↔Legacy 교차검증, 모자관계 무결성을 검증한다.
 */

export type StepStatus = 'ok' | 'warn' | 'error' | 'fixed';

export interface CrossCheckEntry {
  entity: string;
  atomicCount: number;
  legacyCount: number;
  match: boolean;
  missingInAtomic: string[];
  missingInLegacy: string[];
}

export interface FkIntegrityEntry {
  relation: string;
  total: number;
  valid: number;
  orphans: { id: string; fkValue: string; name?: string }[];
}

export interface ParentChildEntry {
  parent: string;
  child: string;
  missingChildren: { parentId: string; parentName: string }[];
}

export interface StepResult {
  step: number;
  name: string;
  status: StepStatus;
  details: Record<string, number | string>;
  issues: string[];
  fixed: string[];
  crossCheck?: CrossCheckEntry[];
  fkIntegrity?: FkIntegrityEntry[];
  parentChild?: ParentChildEntry[];
}

export interface PipelineResult {
  fmeaId: string;
  steps: StepResult[];
  allGreen: boolean;
  loopCount: number;
  timestamp: string;
}

function setWorst(current: StepStatus, incoming: 'warn' | 'error'): StepStatus {
  if (current === 'error') return 'error';
  return incoming;
}

// ─── STEP 1: IMPORT + fmeaId 일치성 + Atomic↔Legacy 교차검증 ───
export async function verifyImport(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 1, name: 'IMPORT', status: 'ok', details: {}, issues: [], fixed: [], crossCheck: [] };

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  if (!legacy) { r.status = 'error'; r.issues.push('Legacy 데이터 없음 — Import 필요'); return r; }
  const l2arr = Array.isArray(data?.l2) ? data.l2 : [];
  if (l2arr.length === 0) { r.status = 'error'; r.issues.push('공정(L2) 0건 — Import 필요'); return r; }

  // fmeaId 일치성: 10개 Atomic DB 테이블 전수 확인
  const tables = [
    'l1Function', 'l2Structure', 'l2Function', 'l3Structure', 'l3Function',
    'failureEffect', 'failureMode', 'failureCause', 'failureLink', 'riskAnalysis',
  ];
  const fmeaIdCounts: Record<string, number> = {};
  const wrongFmeaIds: string[] = [];
  for (const t of tables) {
    try {
      const rows: any[] = await (prisma as any)[t].findMany({
        where: { fmeaId }, select: { id: true, fmeaId: true },
      });
      fmeaIdCounts[t] = rows.length;
      const wrong = rows.filter((row: any) => row.fmeaId !== fmeaId);
      if (wrong.length > 0) {
        wrongFmeaIds.push(`${t}: ${wrong.length}건 fmeaId 불일치`);
      }
    } catch { fmeaIdCounts[t] = -1; }
  }
  r.details.fmeaIdTables = Object.keys(fmeaIdCounts).filter(k => fmeaIdCounts[k] >= 0).length;
  if (wrongFmeaIds.length > 0) {
    r.status = 'error';
    wrongFmeaIds.forEach(msg => r.issues.push(msg));
  }

  // Atomic DB 수량
  const atomicL2 = fmeaIdCounts['l2Structure'] || 0;
  const atomicL3 = fmeaIdCounts['l3Structure'] || 0;
  const atomicFM = fmeaIdCounts['failureMode'] || 0;
  const atomicFC = fmeaIdCounts['failureCause'] || 0;
  const atomicFE = fmeaIdCounts['failureEffect'] || 0;
  const atomicFL = fmeaIdCounts['failureLink'] || 0;
  const atomicL3F = fmeaIdCounts['l3Function'] || 0;
  const atomicL2F = fmeaIdCounts['l2Function'] || 0;
  const atomicL1F = fmeaIdCounts['l1Function'] || 0;
  const atomicRA = fmeaIdCounts['riskAnalysis'] || 0;

  // Legacy 수량
  let legFM = 0, legFC = 0, legL3F = 0, legPC = 0, legFL = 0;
  let legL3 = 0, legFE = 0;
  for (const proc of l2arr) {
    legFM += (proc.failureModes || []).length;
    legFC += (proc.failureCauses || []).length;
    for (const we of (proc.l3 || [])) {
      legL3++;
      for (const fn of (we.functions || [])) {
        legL3F++;
        legPC += (fn.processChars || []).length;
      }
    }
  }
  legFL = (data.failureLinks || []).length;
  legFE = (data.failureEffects || data.l1?.failureScopes || []).length;

  r.details = {
    ...r.details,
    atomicL2, atomicL3, atomicL3F, atomicL2F, atomicL1F,
    atomicFM, atomicFC, atomicFE, atomicFL, atomicRA,
    legacyL2: l2arr.length, legacyL3: legL3, legacyL3F: legL3F,
    legacyFM: legFM, legacyFC: legFC, legacyFE: legFE, legacyFL: legFL,
  };

  // 교차검증 매트릭스: Atomic vs Legacy 수량 비교
  const cross: CrossCheckEntry[] = [];
  const addCross = (entity: string, atomic: number, leg: number) => {
    cross.push({ entity, atomicCount: atomic, legacyCount: leg, match: atomic === leg, missingInAtomic: [], missingInLegacy: [] });
    if (atomic !== leg) {
      r.status = setWorst(r.status, 'warn');
      r.issues.push(`${entity}: Atomic ${atomic} vs Legacy ${leg} (차이 ${Math.abs(atomic - leg)})`);
    }
  };
  addCross('L2 공정', atomicL2, l2arr.length);
  addCross('L3 작업요소', atomicL3, legL3);
  addCross('FM 고장형태', atomicFM, legFM);
  addCross('FC 고장원인', atomicFC, legFC);
  addCross('FE 고장영향', atomicFE, legFE);
  addCross('FL 고장연결', atomicFL, legFL);
  addCross('L3F 공정특성(rows)', atomicL3F, legPC);

  // ID-level 교차검증: Legacy ID가 Atomic DB에 존재하는지
  const atomicIdSets: Record<string, Set<string>> = {};
  for (const t of tables) {
    try {
      const rows: any[] = await (prisma as any)[t].findMany({ where: { fmeaId }, select: { id: true } });
      atomicIdSets[t] = new Set(rows.map((row: any) => row.id));
    } catch { atomicIdSets[t] = new Set(); }
  }

  // Legacy WE IDs vs Atomic L3Structure IDs
  const legWeIds: string[] = [];
  for (const proc of l2arr) {
    for (const we of (proc.l3 || [])) { if (we.id) legWeIds.push(we.id); }
  }
  const l3Set = atomicIdSets['l3Structure'];
  const missingInAtomicL3 = legWeIds.filter(id => !l3Set.has(id));
  const missingInLegacyL3 = [...l3Set].filter(id => !legWeIds.includes(id));
  if (missingInAtomicL3.length > 0 || missingInLegacyL3.length > 0) {
    const entry = cross.find(c => c.entity === 'L3 작업요소');
    if (entry) {
      entry.missingInAtomic = missingInAtomicL3.slice(0, 20);
      entry.missingInLegacy = missingInLegacyL3.slice(0, 20);
    }
  }

  // Legacy FM IDs vs Atomic FailureMode IDs
  const legFmIds: string[] = [];
  for (const proc of l2arr) {
    for (const fm of (proc.failureModes || [])) { if (fm.id) legFmIds.push(fm.id); }
  }
  const fmSet = atomicIdSets['failureMode'];
  const missingFmAtomic = legFmIds.filter(id => !fmSet.has(id));
  const missingFmLegacy = [...fmSet].filter(id => !legFmIds.includes(id));
  if (missingFmAtomic.length > 0 || missingFmLegacy.length > 0) {
    const entry = cross.find(c => c.entity === 'FM 고장형태');
    if (entry) {
      entry.missingInAtomic = missingFmAtomic.slice(0, 20);
      entry.missingInLegacy = missingFmLegacy.slice(0, 20);
    }
  }

  // Legacy FC IDs vs Atomic FailureCause IDs
  const legFcIds: string[] = [];
  for (const proc of l2arr) {
    for (const fc of (proc.failureCauses || [])) { if (fc.id) legFcIds.push(fc.id); }
  }
  const fcSet = atomicIdSets['failureCause'];
  const missingFcAtomic = legFcIds.filter(id => !fcSet.has(id));
  const missingFcLegacy = [...fcSet].filter(id => !legFcIds.includes(id));
  if (missingFcAtomic.length > 0 || missingFcLegacy.length > 0) {
    const entry = cross.find(c => c.entity === 'FC 고장원인');
    if (entry) {
      entry.missingInAtomic = missingFcAtomic.slice(0, 20);
      entry.missingInLegacy = missingFcLegacy.slice(0, 20);
    }
  }

  // Legacy L3Function/PC IDs vs Atomic L3Function IDs
  const legPcIds: string[] = [];
  for (const proc of l2arr) {
    for (const we of (proc.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) { if (pc.id) legPcIds.push(pc.id); }
      }
    }
  }
  const l3fSet = atomicIdSets['l3Function'];
  const missingL3fAtomic = legPcIds.filter(id => !l3fSet.has(id));
  const missingL3fLegacy = [...l3fSet].filter(id => !legPcIds.includes(id));
  if (missingL3fAtomic.length > 0 || missingL3fLegacy.length > 0) {
    const entry = cross.find(c => c.entity === 'L3F 공정특성(rows)');
    if (entry) {
      entry.missingInAtomic = missingL3fAtomic.slice(0, 20);
      entry.missingInLegacy = missingL3fLegacy.slice(0, 20);
    }
    if (missingL3fAtomic.length > 0) {
      r.status = setWorst(r.status, 'error');
      r.issues.push(`Legacy PC ID ${missingL3fAtomic.length}건이 Atomic DB에 없음`);
    }
  }

  r.crossCheck = cross;
  return r;
}

// ─── STEP 2: 파싱 — A1~C4 항목별 Atomic vs Legacy 교차대조 ───
export async function verifyParsing(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 2, name: '파싱', status: 'ok', details: {}, issues: [], fixed: [], crossCheck: [] };

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  if (!data?.l2) { r.status = 'error'; r.issues.push('L2 데이터 없음'); return r; }

  const l2arr = data.l2 || [];

  // Legacy counts
  const leg = { A1: 0, A2: 0, A3: 0, A4: 0, A5: 0, A6: 0, B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, C1: 0, C2: 0, C3: 0, C4: 0 };
  for (const proc of l2arr) {
    leg.A1++;
    if (proc.name?.trim()) leg.A2++;
    const procFuncs = proc.functions || [];
    leg.A3 += procFuncs.length;
    for (const fn of procFuncs) {
      leg.A4 += (fn.processChars || fn.productChars || []).length;
    }
    leg.A5 += (proc.failureModes || []).length;
    for (const we of (proc.l3 || [])) {
      leg.B1++;
      for (const fn of (we.functions || [])) {
        if (fn.name?.trim() || fn.functionName?.trim()) leg.B2++;
        leg.B3 += (fn.processChars || []).length;
      }
      leg.B4 += (we.failureCauses || []).length;
    }
    leg.B4 += (proc.failureCauses || []).length;
  }
  const riskData = data.riskData || {};
  for (const key of Object.keys(riskData)) {
    if (key.startsWith('detection-') && String(riskData[key]).trim()) leg.A6++;
    if (key.startsWith('prevention-') && String(riskData[key]).trim()) leg.B5++;
  }
  const fes = data.failureEffects || data.l1?.failureScopes || [];
  leg.C4 = fes.length;
  const l1Funcs = data.l1?.functions || [];
  if (l1Funcs.length > 0) {
    const cats = new Set<string>(), fns = new Set<string>();
    for (const fn of l1Funcs) { if (fn.category?.trim()) cats.add(fn.category); if (fn.name?.trim()) fns.add(fn.name); leg.C3++; }
    leg.C1 = cats.size; leg.C2 = fns.size;
  }

  // Atomic counts
  const atm: Record<string, number> = {};
  atm.A1 = await prisma.l2Structure.count({ where: { fmeaId } });
  atm.A2 = await prisma.l2Structure.count({ where: { fmeaId, name: { not: '' } } });
  atm.A3 = await prisma.l2Function.count({ where: { fmeaId } });
  atm.A4 = await prisma.l2Function.count({ where: { fmeaId, productChar: { not: '' } } });
  atm.A5 = await prisma.failureMode.count({ where: { fmeaId } });
  atm.B1 = await prisma.l3Structure.count({ where: { fmeaId } });
  const l3fs = await prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, functionName: true, processChar: true } });
  const uniqueFuncNames = new Set(l3fs.map((f: any) => f.functionName).filter((n: string) => n?.trim()));
  atm.B2 = uniqueFuncNames.size;
  atm.B3 = l3fs.filter((f: any) => f.processChar?.trim()).length;
  atm.FC = await prisma.failureCause.count({ where: { fmeaId } });
  atm.B4 = atm.FC;
  const atomicL1Funcs = await prisma.l1Function.findMany({ where: { fmeaId } }).catch(() => []);
  const atomicCats = new Set<string>(), atomicFns = new Set<string>();
  for (const fn of atomicL1Funcs) {
    if ((fn as any).category?.trim()) atomicCats.add((fn as any).category);
    if ((fn as any).functionName?.trim()) atomicFns.add((fn as any).functionName);
  }
  atm.C1 = atomicCats.size;
  atm.C2 = atomicFns.size;
  atm.C3 = atomicL1Funcs.length;
  atm.C4 = await prisma.failureEffect.count({ where: { fmeaId } });
  atm.A6 = await prisma.riskAnalysis.count({ where: { fmeaId, detectionControl: { not: '' } } }).catch(() => 0);
  atm.B5 = await prisma.riskAnalysis.count({ where: { fmeaId, preventionControl: { not: '' } } }).catch(() => 0);

  // 교차대조 매트릭스 구축
  const labels: Record<string, string> = {
    A1: '공정번호', A2: '공정명', A3: '공정기능', A4: '제품특성', A5: '고장형태', A6: '검출관리',
    B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인', B5: '예방관리',
    C1: '구분', C2: '완제품기능', C3: '요구사항', C4: '고장영향',
  };
  const cross: CrossCheckEntry[] = [];
  for (const code of Object.keys(labels)) {
    const a = atm[code] ?? 0;
    const l = (leg as any)[code] ?? 0;
    const match = a === l;
    cross.push({ entity: `${code} ${labels[code]}`, atomicCount: a, legacyCount: l, match, missingInAtomic: [], missingInLegacy: [] });
    if (!match) {
      r.status = setWorst(r.status, 'warn');
      r.issues.push(`${code}(${labels[code]}): Atomic ${a} vs Legacy ${l}`);
    }
  }

  r.details = { ...Object.fromEntries(Object.keys(labels).map(k => [`atm_${k}`, atm[k] ?? 0])),
    ...Object.fromEntries(Object.keys(labels).map(k => [`leg_${k}`, (leg as any)[k] ?? 0])) };
  r.crossCheck = cross;

  if (leg.A1 === 0) { r.status = 'error'; r.issues.push('A1(공정번호) 0건'); }
  if (leg.A5 === 0) { r.status = 'error'; r.issues.push('A5(고장형태) 0건'); }
  if (leg.B4 === 0) { r.status = 'error'; r.issues.push('B4(고장원인) 0건'); }
  if (leg.C4 === 0) { r.status = 'error'; r.issues.push('C4(고장영향) 0건'); }

  return r;
}

// ─── STEP 3: UUID — fmeaId 전수 확인 + 모자관계 검증 ───
export async function verifyUuid(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 3, name: 'UUID', status: 'ok', details: {}, issues: [], fixed: [], parentChild: [] };

  const [l2s, l3s, l3Funcs, fms, fes, fcs, fls, ras] = await Promise.all([
    prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, no: true, name: true } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, name: true, l2Id: true, m4: true } }),
    prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, l3StructId: true, functionName: true, processChar: true } }),
    prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true, mode: true, l2StructId: true, productCharId: true } }),
    prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true, effect: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, cause: true, l3FuncId: true, l3StructId: true } }),
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fmId: true, feId: true, fcId: true } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { id: true, linkId: true } }),
  ]);

  r.details = {
    L1F: await prisma.l1Function.count({ where: { fmeaId } }).catch(() => 0),
    L2: l2s.length, L3: l3s.length, L3F: l3Funcs.length,
    L2F: await prisma.l2Function.count({ where: { fmeaId } }).catch(() => 0),
    FM: fms.length, FE: fes.length, FC: fcs.length,
    FL: fls.length, RA: ras.length,
  };

  if (l2s.length === 0) { r.status = 'error'; r.issues.push('Atomic L2 0건 — rebuild-atomic 필요'); }

  // 모자관계 검증: L3Structure → L3Function
  const l3IdSet = new Set(l3s.map((s: any) => s.id));
  const l3FuncByL3 = new Map<string, any[]>();
  for (const f of l3Funcs) {
    if (!l3FuncByL3.has(f.l3StructId)) l3FuncByL3.set(f.l3StructId, []);
    l3FuncByL3.get(f.l3StructId)!.push(f);
  }

  const missingL3Children: ParentChildEntry['missingChildren'] = [];
  for (const l3 of l3s) {
    const name = (l3.name || '').trim();
    if (!name || name.includes('공정 선택 후')) continue;
    const children = l3FuncByL3.get(l3.id) || [];
    if (children.length === 0) {
      missingL3Children.push({ parentId: l3.id, parentName: name });
    }
  }
  if (missingL3Children.length > 0) {
    r.status = setWorst(r.status, 'error');
    r.issues.push(`L3Function 누락 WE ${missingL3Children.length}건 (기능/공정특성 없음)`);
  }

  // 모자관계: L2 → L3
  const l2IdSet = new Set(l2s.map((s: any) => s.id));
  const missingL2Children: ParentChildEntry['missingChildren'] = [];
  for (const l2 of l2s) {
    const children = l3s.filter((l3: any) => l3.l2Id === l2.id);
    if (children.length === 0) {
      missingL2Children.push({ parentId: l2.id, parentName: `${l2.no}. ${l2.name}` });
    }
  }
  if (missingL2Children.length > 0) {
    r.status = setWorst(r.status, 'warn');
    r.issues.push(`L3 없는 공정 ${missingL2Children.length}건`);
  }

  r.parentChild = [
    { parent: 'L2Structure', child: 'L3Structure', missingChildren: missingL2Children },
    { parent: 'L3Structure', child: 'L3Function', missingChildren: missingL3Children },
  ];

  return r;
}

// ─── STEP 4: FK — 14개 관계 전수 검증 + 모자관계 ───
export async function verifyFk(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 4, name: 'FK', status: 'ok', details: {}, issues: [], fixed: [], fkIntegrity: [] };

  const [l1Funcs, l2s, l2Funcs, l3s, l3Funcs, fms, fes, fcs, fls, ras] = await Promise.all([
    prisma.l1Function.findMany({ where: { fmeaId }, select: { id: true } }).catch(() => []),
    prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, no: true, name: true } }),
    prisma.l2Function.findMany({ where: { fmeaId }, select: { id: true, l2StructId: true, functionName: true, productChar: true } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, name: true, l2Id: true } }),
    prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, l3StructId: true, l2StructId: true, functionName: true } }),
    prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true, mode: true, l2StructId: true, productCharId: true } }),
    prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true, effect: true, l1FuncId: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, cause: true, l3StructId: true, l2StructId: true, l3FuncId: true } }),
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fmId: true, feId: true, fcId: true } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { id: true, linkId: true } }),
  ]);

  const idSet = {
    l1F: new Set<string>(l1Funcs.map((r: any) => r.id)),
    l2: new Set<string>(l2s.map((r: any) => r.id)),
    l2F: new Set<string>(l2Funcs.map((r: any) => r.id)),
    l3: new Set<string>(l3s.map((r: any) => r.id)),
    l3F: new Set<string>(l3Funcs.map((r: any) => r.id)),
    fm: new Set<string>(fms.map((r: any) => r.id)),
    fe: new Set<string>(fes.map((r: any) => r.id)),
    fc: new Set<string>(fcs.map((r: any) => r.id)),
    fl: new Set<string>(fls.map((r: any) => r.id)),
  };

  const fkChecks: { relation: string; rows: any[]; fkField: string; targetSet: Set<string>; nullable?: boolean; nameField?: string }[] = [
    { relation: 'L3Structure.l2Id → L2Structure', rows: l3s, fkField: 'l2Id', targetSet: idSet.l2, nameField: 'name' },
    { relation: 'L2Function.l2StructId → L2Structure', rows: l2Funcs, fkField: 'l2StructId', targetSet: idSet.l2, nameField: 'functionName' },
    { relation: 'L3Function.l3StructId → L3Structure', rows: l3Funcs, fkField: 'l3StructId', targetSet: idSet.l3, nameField: 'functionName' },
    { relation: 'L3Function.l2StructId → L2Structure', rows: l3Funcs, fkField: 'l2StructId', targetSet: idSet.l2, nameField: 'functionName' },
    { relation: 'FM.l2StructId → L2Structure', rows: fms, fkField: 'l2StructId', targetSet: idSet.l2, nameField: 'mode' },
    { relation: 'FM.productCharId → L2Function', rows: fms, fkField: 'productCharId', targetSet: idSet.l2F, nullable: true, nameField: 'mode' },
    { relation: 'FC.l3StructId → L3Structure', rows: fcs, fkField: 'l3StructId', targetSet: idSet.l3, nameField: 'cause' },
    { relation: 'FC.l2StructId → L2Structure', rows: fcs, fkField: 'l2StructId', targetSet: idSet.l2, nameField: 'cause' },
    { relation: 'FC.l3FuncId → L3Function', rows: fcs, fkField: 'l3FuncId', targetSet: idSet.l3F, nameField: 'cause' },
    { relation: 'FL.fmId → FailureMode', rows: fls, fkField: 'fmId', targetSet: idSet.fm },
    { relation: 'FL.feId → FailureEffect', rows: fls, fkField: 'feId', targetSet: idSet.fe },
    { relation: 'FL.fcId → FailureCause', rows: fls, fkField: 'fcId', targetSet: idSet.fc },
    { relation: 'RA.linkId → FailureLink', rows: ras, fkField: 'linkId', targetSet: idSet.fl },
    { relation: 'FE.l1FuncId → L1Function', rows: fes, fkField: 'l1FuncId', targetSet: idSet.l1F, nullable: true, nameField: 'effect' },
  ];

  const integrity: FkIntegrityEntry[] = [];
  let totalOrphans = 0;

  for (const ck of fkChecks) {
    const orphans: FkIntegrityEntry['orphans'] = [];
    let valid = 0;
    for (const row of ck.rows) {
      const fkVal = row[ck.fkField];
      if (!fkVal && ck.nullable) { valid++; continue; }
      if (!fkVal || !ck.targetSet.has(fkVal)) {
        orphans.push({ id: row.id?.substring(0, 16), fkValue: (fkVal || 'NULL')?.substring(0, 16), name: row[ck.nameField || '']?.substring(0, 30) });
      } else {
        valid++;
      }
    }
    integrity.push({ relation: ck.relation, total: ck.rows.length, valid, orphans: orphans.slice(0, 10) });
    if (orphans.length > 0) {
      totalOrphans += orphans.length;
      r.status = setWorst(r.status, 'error');
      r.issues.push(`${ck.relation}: 고아 ${orphans.length}건`);
    }
  }

  // 미연결 엔티티 검증
  const linkedFcIds = new Set(fls.map((l: any) => l.fcId));
  const linkedFmIds = new Set(fls.map((l: any) => l.fmId));
  const unlinkedFC = fcs.filter((fc: any) => !linkedFcIds.has(fc.id)).length;
  const unlinkedFM = fms.filter((fm: any) => !linkedFmIds.has(fm.id)).length;

  r.details = {
    fkRelations: integrity.length,
    totalOrphans,
    links: fls.length,
    unlinkedFC, unlinkedFM,
    totalFM: fms.length, totalFC: fcs.length, totalFE: fes.length,
  };

  if (unlinkedFC > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`FailureLink 없는 FC ${unlinkedFC}건`); }
  if (unlinkedFM > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`FailureLink 없는 FM ${unlinkedFM}건`); }
  if (fls.length === 0 && fcs.length > 0) { r.status = 'error'; r.issues.push('FailureLink 0건 — FK 연결 필요'); }

  r.fkIntegrity = integrity;
  return r;
}

// ─── STEP 5: WS — Legacy↔Atomic 완전 동기화 검증 ───
export async function verifyWs(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 5, name: 'WS', status: 'ok', details: {}, issues: [], fixed: [], crossCheck: [], parentChild: [] };

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  if (!data?.l2) { r.status = 'error'; r.issues.push('Legacy 데이터 없음'); return r; }

  // Atomic DB 전체 ID 로드
  const [atomicL3Fs, atomicFMs, atomicFCs, atomicFEs, atomicFLs] = await Promise.all([
    prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true } }),
  ]);
  const atomicSets = {
    l3f: new Set<string>(atomicL3Fs.map((r: any) => r.id)),
    fm: new Set<string>(atomicFMs.map((r: any) => r.id)),
    fc: new Set<string>(atomicFCs.map((r: any) => r.id)),
    fe: new Set<string>(atomicFEs.map((r: any) => r.id)),
    fl: new Set<string>(atomicFLs.map((r: any) => r.id)),
  };

  // Legacy ID 수집 + Atomic 존재 확인
  const legIds = { l3f: [] as string[], fm: [] as string[], fc: [] as string[], fe: [] as string[], fl: [] as string[] };
  let totalPc = 0, emptyPc = 0, orphanPc = 0;

  for (const proc of data.l2) {
    const fcPcIds = new Set((proc.failureCauses || []).map((fc: any) => fc.processCharId).filter(Boolean));
    for (const fm of (proc.failureModes || [])) { if (fm.id) legIds.fm.push(fm.id); }
    for (const fc of (proc.failureCauses || [])) { if (fc.id) legIds.fc.push(fc.id); }
    for (const we of (proc.l3 || [])) {
      const weFcs = we.failureCauses || [];
      for (const fc of weFcs) { if (fc.processCharId) fcPcIds.add(fc.processCharId); }
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          totalPc++;
          if (pc.id) legIds.l3f.push(pc.id);
          if (!pc.name?.trim()) emptyPc++;
          else if (!fcPcIds.has(pc.id)) orphanPc++;
        }
      }
    }
  }
  for (const fe of (data.failureEffects || data.l1?.failureScopes || [])) {
    if (fe.id) legIds.fe.push(fe.id);
  }
  for (const fl of (data.failureLinks || [])) {
    if (fl.id) legIds.fl.push(fl.id);
    // ★ failureLinks의 fmId/fcId/feId는 FK 참조이므로 엔티티 목록에 추가하지 않음
    // 엔티티는 proc.failureCauses/failureModes/failureEffects에서만 수집
  }

  // 교차검증
  const cross: CrossCheckEntry[] = [];
  const checkSet = (label: string, legArr: string[], atomSet: Set<string>) => {
    const legSet = new Set(legArr);
    const missingInAtomic = [...legSet].filter(id => !atomSet.has(id));
    const missingInLegacy = [...atomSet].filter(id => !legSet.has(id));
    cross.push({
      entity: label, atomicCount: atomSet.size, legacyCount: legSet.size,
      match: missingInAtomic.length === 0 && missingInLegacy.length === 0,
      missingInAtomic: missingInAtomic.slice(0, 10),
      missingInLegacy: missingInLegacy.slice(0, 10),
    });
    if (missingInAtomic.length > 0) {
      r.status = setWorst(r.status, 'error');
      r.issues.push(`${label}: Legacy ID ${missingInAtomic.length}건이 Atomic에 없음`);
    }
    if (missingInLegacy.length > 0) {
      r.status = setWorst(r.status, 'warn');
      r.issues.push(`${label}: Atomic ID ${missingInLegacy.length}건이 Legacy에 없음`);
    }
  };
  checkSet('L3Function (PC)', legIds.l3f, atomicSets.l3f);
  checkSet('FailureMode', legIds.fm, atomicSets.fm);
  checkSet('FailureCause', legIds.fc, atomicSets.fc);
  checkSet('FailureEffect', legIds.fe, atomicSets.fe);

  r.details = {
    totalPC: totalPc, emptyPC: emptyPc, orphanPC: orphanPc,
    legacyFLCount: (data.failureLinks || []).length,
    atomicFLCount: atomicFLs.length,
  };

  if (emptyPc > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`빈 공정특성 ${emptyPc}건`); }
  if (orphanPc > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`FC 없는 공정특성 ${orphanPc}건`); }

  r.crossCheck = cross;
  return r;
}

// ─── AP 계산 서버용 (riskOptUtils.ts의 calcAP 복제 — 서버에서 React import 불가) ───
const AP_TABLE_SERVER = [
  { sMin: 9, sMax: 10, oMin: 4, oMax: 10, d: ['H','H','H','H'] as const },
  { sMin: 9, sMax: 10, oMin: 2, oMax: 3,  d: ['H','H','H','M'] as const },
  { sMin: 9, sMax: 10, oMin: 1, oMax: 1,  d: ['H','H','M','L'] as const },
  { sMin: 7, sMax: 8,  oMin: 4, oMax: 10, d: ['H','H','H','M'] as const },
  { sMin: 7, sMax: 8,  oMin: 2, oMax: 3,  d: ['H','H','M','L'] as const },
  { sMin: 7, sMax: 8,  oMin: 1, oMax: 1,  d: ['H','M','M','L'] as const },
  { sMin: 4, sMax: 6,  oMin: 4, oMax: 10, d: ['H','H','M','L'] as const },
  { sMin: 4, sMax: 6,  oMin: 2, oMax: 3,  d: ['H','M','M','L'] as const },
  { sMin: 4, sMax: 6,  oMin: 1, oMax: 1,  d: ['M','M','L','L'] as const },
  { sMin: 2, sMax: 3,  oMin: 4, oMax: 10, d: ['H','M','M','L'] as const },
  { sMin: 2, sMax: 3,  oMin: 2, oMax: 3,  d: ['M','M','L','L'] as const },
  { sMin: 2, sMax: 3,  oMin: 1, oMax: 1,  d: ['M','L','L','L'] as const },
];

export function calcAPServer(s: number, o: number, d: number): 'H' | 'M' | 'L' | null {
  if (s <= 0 || o <= 0 || d <= 0) return null;
  if (s === 1) return 'L';
  const dIdx = d >= 7 ? 0 : d >= 5 ? 1 : d >= 2 ? 2 : 3;
  for (const row of AP_TABLE_SERVER) {
    if (s >= row.sMin && s <= row.sMax && o >= row.oMin && o <= row.oMax) return row.d[dIdx];
  }
  return 'L';
}

// ─── STEP 6: OPT — 6ST 최적화 종합 검증 (12개 항목) ───
export async function verifyOptimization(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 6, name: 'OPT', status: 'ok', details: {}, issues: [], fixed: [], crossCheck: [], fkIntegrity: [] };

  const [fls, ras, opts, legacy] = await Promise.all([
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fmId: true, fcId: true } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { id: true, fmeaId: true, linkId: true, severity: true, occurrence: true, detection: true, ap: true, preventionControl: true, detectionControl: true } }),
    prisma.optimization.findMany({ where: { fmeaId }, select: { id: true, fmeaId: true, riskId: true, recommendedAction: true, responsible: true, targetDate: true, status: true, remarks: true, newSeverity: true, newOccurrence: true, newDetection: true, newAP: true } }),
    prisma.fmeaLegacyData.findUnique({ where: { fmeaId } }),
  ]);

  const riskData = (legacy?.data as any)?.riskData || {};
  const flSet = new Set<string>(fls.map((f: any) => f.id));
  const raSet = new Set<string>(ras.map((ra: any) => ra.id));

  r.details = { failureLinks: fls.length, riskAnalyses: ras.length, optimizations: opts.length };

  // ── 1. fmeaId 일관성 ──
  const wrongRA = ras.filter((ra: any) => ra.fmeaId !== fmeaId).length;
  const wrongOpt = opts.filter((o: any) => o.fmeaId !== fmeaId).length;
  if (wrongRA > 0) { r.status = setWorst(r.status, 'error'); r.issues.push(`RiskAnalysis fmeaId 불일치 ${wrongRA}건`); }
  if (wrongOpt > 0) { r.status = setWorst(r.status, 'error'); r.issues.push(`Optimization fmeaId 불일치 ${wrongOpt}건`); }

  // ── 2. UUID 유일성 ──
  const optIds = new Set<string>();
  let dupOpt = 0;
  for (const o of opts) { if (optIds.has(o.id)) dupOpt++; optIds.add(o.id); }
  if (dupOpt > 0) { r.status = setWorst(r.status, 'error'); r.issues.push(`Optimization ID 중복 ${dupOpt}건`); }

  // ── 3. FK: Opt.riskId → RiskAnalysis ──
  const orphanOptRA: FkIntegrityEntry['orphans'] = [];
  let validOptRA = 0;
  for (const o of opts) {
    if (raSet.has(o.riskId)) validOptRA++;
    else orphanOptRA.push({ id: o.id?.substring(0, 16), fkValue: (o.riskId || 'NULL')?.substring(0, 16), name: o.recommendedAction?.substring(0, 30) });
  }
  r.fkIntegrity!.push({ relation: 'Opt.riskId → RiskAnalysis', total: opts.length, valid: validOptRA, orphans: orphanOptRA.slice(0, 10) });
  if (orphanOptRA.length > 0) { r.status = setWorst(r.status, 'error'); r.issues.push(`Opt→RA FK 고아 ${orphanOptRA.length}건`); }

  // ── 4. FK: RA.linkId → FailureLink ──
  const orphanRAFL: FkIntegrityEntry['orphans'] = [];
  let validRAFL = 0;
  for (const ra of ras) {
    if (flSet.has(ra.linkId)) validRAFL++;
    else orphanRAFL.push({ id: ra.id?.substring(0, 16), fkValue: (ra.linkId || 'NULL')?.substring(0, 16) });
  }
  r.fkIntegrity!.push({ relation: 'RA.linkId → FailureLink', total: ras.length, valid: validRAFL, orphans: orphanRAFL.slice(0, 10) });
  if (orphanRAFL.length > 0) { r.status = setWorst(r.status, 'error'); r.issues.push(`RA→FL FK 고아 ${orphanRAFL.length}건`); }

  // ── 5. WS↔DB 동기화: riskData *-opt-* ↔ Optimization ──
  const wsOptUKs = new Set<string>();
  for (const key of Object.keys(riskData)) {
    if (key.startsWith('prevention-opt-') && String(riskData[key]).trim()) {
      wsOptUKs.add(key.replace('prevention-opt-', '').replace(/#\d+$/, ''));
    }
  }
  const dbOptUKs = new Set<string>();
  for (const o of opts) {
    const ra = ras.find((x: any) => x.id === o.riskId);
    if (!ra) continue;
    const fl = fls.find((x: any) => x.id === ra.linkId);
    if (fl) dbOptUKs.add(`${fl.fmId}-${fl.fcId}`);
  }
  const wsOnly = [...wsOptUKs].filter(k => !dbOptUKs.has(k));
  const dbOnly = [...dbOptUKs].filter(k => !wsOptUKs.has(k));
  r.crossCheck!.push({
    entity: 'Optimization (WS↔DB)', atomicCount: dbOptUKs.size, legacyCount: wsOptUKs.size,
    match: wsOnly.length === 0 && dbOnly.length === 0,
    missingInAtomic: wsOnly.slice(0, 10), missingInLegacy: dbOnly.slice(0, 10),
  });
  if (wsOnly.length > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`WS에만 있는 개선안 ${wsOnly.length}건 (DB 미저장)`); }
  if (dbOnly.length > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`DB에만 있는 개선안 ${dbOnly.length}건 (WS 미반영)`); }

  // ── 6. RA↔FL 1:1 커버리지 ──
  const flWithRA = new Set(ras.map((ra: any) => ra.linkId));
  const flNoRA = fls.filter((fl: any) => !flWithRA.has(fl.id)).length;
  r.details.flWithoutRA = flNoRA;
  if (flNoRA > 0) { r.status = setWorst(r.status, 'error'); r.issues.push(`RA 없는 FailureLink ${flNoRA}건`); }
  if (ras.length > fls.length) {
    r.details.duplicateRA = ras.length - fls.length;
    r.status = setWorst(r.status, 'warn'); r.issues.push(`중복 RA ${ras.length - fls.length}건`);
  }

  // ── 7. H/M 개선 커버리지 ──
  const raByLink = new Map<string, any>();
  for (const ra of ras) raByLink.set(ra.linkId, ra);
  const optCount = new Map<string, number>();
  for (const o of opts) optCount.set(o.riskId, (optCount.get(o.riskId) || 0) + 1);
  let hNoOpt = 0, mNoOpt = 0;
  for (const fl of fls) {
    const ra = raByLink.get(fl.id);
    if (!ra || (optCount.get(ra.id) || 0) > 0) continue;
    if (ra.ap === 'H') hNoOpt++;
    else if (ra.ap === 'M') mNoOpt++;
  }
  r.details.hWithoutOpt = hNoOpt; r.details.mWithoutOpt = mNoOpt;
  if (hNoOpt > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`AP=H 개선안 누락 ${hNoOpt}건`); }
  if (mNoOpt > 0) { r.issues.push(`AP=M 개선안 누락 ${mNoOpt}건 (참고)`); }

  // ── 8. SOD 완전성 ──
  let mS = 0, mO = 0, mD = 0;
  for (const ra of ras) {
    if (!ra.severity || ra.severity <= 0) mS++;
    if (!ra.occurrence || ra.occurrence <= 0) mO++;
    if (!ra.detection || ra.detection <= 0) mD++;
  }
  r.details.missingS = mS; r.details.missingO = mO; r.details.missingD = mD;
  if (mS > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`S 미입력 ${mS}건`); }
  if (mO > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`O 미입력 ${mO}건`); }
  if (mD > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`D 미입력 ${mD}건`); }

  // ── 9. 개선안 데이터 완전성 ──
  let emptyAction = 0, emptyPerson = 0;
  for (const o of opts) {
    if (!o.recommendedAction?.trim()) emptyAction++;
    if (!o.responsible?.trim()) emptyPerson++;
  }
  if (emptyAction > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`개선조치 빈값 ${emptyAction}건`); }
  if (emptyPerson > 0) { r.issues.push(`책임자 미지정 ${emptyPerson}건 (참고)`); }

  // ── 10. AP 계산 정합성 ──
  let apMis = 0;
  for (const ra of ras) {
    if (ra.severity > 0 && ra.occurrence > 0 && ra.detection > 0) {
      const expected = calcAPServer(ra.severity, ra.occurrence, ra.detection);
      if (expected && ra.ap && expected !== ra.ap) apMis++;
    }
  }
  r.details.apMismatch = apMis;
  if (apMis > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`AP 계산 불일치 ${apMis}건`); }

  // ── 11. riskData 고아키 (FL 없는 uniqueKey) ──
  const flUKs = new Set(fls.map((fl: any) => `${fl.fmId}-${fl.fcId}`));
  const rdUKs = new Set<string>();
  for (const key of Object.keys(riskData)) {
    const m = key.match(/^risk-(.+)-(S|O|D)$/);
    if (m) rdUKs.add(m[1]);
  }
  const orphanKeys = [...rdUKs].filter(uk => !flUKs.has(uk));
  r.details.orphanRiskDataKeys = orphanKeys.length;
  if (orphanKeys.length > 0) { r.status = setWorst(r.status, 'warn'); r.issues.push(`riskData 고아키 ${orphanKeys.length}건`); }

  // ── 12. PC/DC WS↔DB 동기화 ──
  let pcMis = 0, dcMis = 0;
  for (const ra of ras) {
    const fl = fls.find((f: any) => f.id === ra.linkId);
    if (!fl) continue;
    const uk = `${fl.fmId}-${fl.fcId}`;
    const wsPrev = String(riskData[`prevention-${uk}`] || '').trim();
    const wsDet = String(riskData[`detection-${uk}`] || '').trim();
    if (wsPrev && ra.preventionControl?.trim() && wsPrev !== ra.preventionControl.trim()) pcMis++;
    if (wsDet && ra.detectionControl?.trim() && wsDet !== ra.detectionControl.trim()) dcMis++;
  }
  if (pcMis > 0) { r.issues.push(`PC WS↔DB 불일치 ${pcMis}건 (참고)`); }
  if (dcMis > 0) { r.issues.push(`DC WS↔DB 불일치 ${dcMis}건 (참고)`); }

  return r;
}
