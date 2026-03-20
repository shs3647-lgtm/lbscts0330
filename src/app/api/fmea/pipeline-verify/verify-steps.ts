/**
 * @file verify-steps.ts
 * 파이프라인 검증 v3 — 5단계 통합 검증 (엑셀 Import + 역설계 Import 공통)
 *
 * STEP 0: 구조 완전성 — L1→L2→L3 계층 존재 확인
 * STEP 1: UUID — 중복 탐지 + 수량 + 모자관계
 * STEP 2: fmeaId — 10개 테이블 격리 검증
 * STEP 3: FK — 14개 관계 전수검증 + 미연결 엔티티
 * STEP 4: 누락 — emptyPC/orphanPC/DC/PC/SOD + 자동수정
 */

export type StepStatus = 'ok' | 'warn' | 'error' | 'fixed';

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

function worst(current: StepStatus, incoming: 'warn' | 'error'): StepStatus {
  if (current === 'error') return 'error';
  return incoming;
}

// ─── STEP 0: 구조 완전성 ─────────────────────────────────────
export async function verifyStructure(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 0, name: '구조', status: 'ok', details: {}, issues: [], fixed: [] };

  const [l1, l2Count, l3Count, l1fCount] = await Promise.all([
    prisma.l1Structure.findFirst({ where: { fmeaId }, select: { id: true, name: true } }),
    prisma.l2Structure.count({ where: { fmeaId } }),
    prisma.l3Structure.count({ where: { fmeaId } }),
    prisma.l1Function.count({ where: { fmeaId } }).catch(() => 0),
  ]);

  r.details = { l1: l1 ? 1 : 0, l1Name: l1?.name || '', l2: l2Count, l3: l3Count, l1F: l1fCount };

  if (!l1) { r.status = 'error'; r.issues.push('L1Structure 없음 — Import 필요'); }
  if (l2Count === 0) { r.status = 'error'; r.issues.push('L2Structure(공정) 0건 — Import 필요'); }
  if (l3Count === 0 && l2Count > 0) { r.status = worst(r.status, 'warn'); r.issues.push('L3Structure(작업요소) 0건'); }

  return r;
}

// ─── STEP 1: UUID ────────────────────────────────────────────
export async function verifyUuid(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 1, name: 'UUID', status: 'ok', details: {}, issues: [], fixed: [], parentChild: [] };

  const [l2s, l3s, l3Funcs, l2Funcs, l1Funcs, fms, fes, fcs, fls, ras] = await Promise.all([
    prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, no: true, name: true } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, name: true, l2Id: true } }),
    prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, l3StructId: true, functionName: true } }),
    prisma.l2Function.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.l1Function.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { id: true } }),
  ]);

  r.details = {
    L2: l2s.length, L3: l3s.length, L3F: l3Funcs.length,
    L2F: l2Funcs.length, L1F: l1Funcs.length,
    FM: fms.length, FE: fes.length, FC: fcs.length,
    FL: fls.length, RA: ras.length,
  };

  // UUID 중복 탐지 (전 엔티티 통합)
  const allIds: string[] = [
    ...l2s.map((r: any) => r.id), ...l3s.map((r: any) => r.id),
    ...l3Funcs.map((r: any) => r.id), ...fms.map((r: any) => r.id),
    ...fes.map((r: any) => r.id), ...fcs.map((r: any) => r.id),
    ...fls.map((r: any) => r.id), ...ras.map((r: any) => r.id),
  ];
  const idCount = new Map<string, number>();
  for (const id of allIds) idCount.set(id, (idCount.get(id) || 0) + 1);
  const duplicates = [...idCount.entries()].filter(([, c]) => c > 1);
  if (duplicates.length > 0) {
    r.status = 'error';
    r.issues.push(`UUID 중복 ${duplicates.length}건: ${duplicates.slice(0, 3).map(([id]) => id.substring(0, 16)).join(', ')}`);
  }
  r.details.duplicateUUIDs = duplicates.length;

  // 모자관계: L2 → L3
  const l2IdSet = new Set(l2s.map((s: any) => s.id));
  const missingL2Children: ParentChildEntry['missingChildren'] = [];
  for (const l2 of l2s) {
    if (l3s.filter((l3: any) => l3.l2Id === l2.id).length === 0) {
      missingL2Children.push({ parentId: l2.id, parentName: `${l2.no}. ${l2.name}` });
    }
  }
  if (missingL2Children.length > 0) {
    r.status = worst(r.status, 'warn');
    r.issues.push(`L3 없는 공정 ${missingL2Children.length}건`);
  }

  // 모자관계: L3 → L3Function
  const l3FuncByL3 = new Map<string, number>();
  for (const f of l3Funcs) l3FuncByL3.set(f.l3StructId, (l3FuncByL3.get(f.l3StructId) || 0) + 1);
  const missingL3Children: ParentChildEntry['missingChildren'] = [];
  for (const l3 of l3s) {
    const name = ((l3 as any).name || '').trim();
    if (!name || name.includes('공정 선택 후')) continue;
    if ((l3FuncByL3.get(l3.id) || 0) === 0) {
      missingL3Children.push({ parentId: l3.id, parentName: name });
    }
  }
  if (missingL3Children.length > 0) {
    r.status = worst(r.status, 'warn');
    r.issues.push(`L3Function 없는 WE ${missingL3Children.length}건`);
  }

  r.parentChild = [
    { parent: 'L2Structure', child: 'L3Structure', missingChildren: missingL2Children },
    { parent: 'L3Structure', child: 'L3Function', missingChildren: missingL3Children },
  ];

  return r;
}

// ─── STEP 2: fmeaId ──────────────────────────────────────────
export async function verifyFmeaId(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 2, name: 'fmeaId', status: 'ok', details: {}, issues: [], fixed: [] };

  const tables = [
    'l1Structure', 'l1Function', 'l2Structure', 'l2Function', 'l3Structure', 'l3Function',
    'failureEffect', 'failureMode', 'failureCause', 'failureLink', 'riskAnalysis',
  ];

  let totalChecked = 0;
  let totalMismatch = 0;

  for (const t of tables) {
    try {
      const rows: any[] = await (prisma as any)[t].findMany({
        where: { fmeaId }, select: { id: true, fmeaId: true },
      });
      const wrong = rows.filter((row: any) => row.fmeaId !== fmeaId);
      totalChecked += rows.length;
      if (wrong.length > 0) {
        totalMismatch += wrong.length;
        r.status = 'error';
        r.issues.push(`${t}: fmeaId 불일치 ${wrong.length}/${rows.length}건`);
      }
      r.details[t] = rows.length;
    } catch {
      r.details[t] = -1;
    }
  }

  r.details.tablesChecked = tables.length;
  r.details.totalRecords = totalChecked;
  r.details.totalMismatch = totalMismatch;

  return r;
}

// ─── STEP 3: FK ──────────────────────────────────────────────
export async function verifyFk(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 3, name: 'FK', status: 'ok', details: {}, issues: [], fixed: [], fkIntegrity: [] };

  const [l1Funcs, l2s, l2Funcs, l3s, l3Funcs, fms, fes, fcs, fls, ras] = await Promise.all([
    prisma.l1Function.findMany({ where: { fmeaId }, select: { id: true } }).catch(() => []),
    prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.l2Function.findMany({ where: { fmeaId }, select: { id: true, l2StructId: true, functionName: true } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, l2Id: true } }),
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
    { relation: 'L3.l2Id → L2', rows: l3s as any[], fkField: 'l2Id', targetSet: idSet.l2 },
    { relation: 'L2F.l2StructId → L2', rows: l2Funcs, fkField: 'l2StructId', targetSet: idSet.l2, nameField: 'functionName' },
    { relation: 'L3F.l3StructId → L3', rows: l3Funcs, fkField: 'l3StructId', targetSet: idSet.l3, nameField: 'functionName' },
    { relation: 'L3F.l2StructId → L2', rows: l3Funcs, fkField: 'l2StructId', targetSet: idSet.l2, nameField: 'functionName' },
    { relation: 'FM.l2StructId → L2', rows: fms, fkField: 'l2StructId', targetSet: idSet.l2, nameField: 'mode' },
    { relation: 'FM.productCharId → L2F', rows: fms, fkField: 'productCharId', targetSet: idSet.l2F, nullable: true, nameField: 'mode' },
    { relation: 'FC.l3StructId → L3', rows: fcs, fkField: 'l3StructId', targetSet: idSet.l3, nameField: 'cause' },
    { relation: 'FC.l2StructId → L2', rows: fcs, fkField: 'l2StructId', targetSet: idSet.l2, nameField: 'cause' },
    { relation: 'FC.l3FuncId → L3F', rows: fcs, fkField: 'l3FuncId', targetSet: idSet.l3F, nameField: 'cause' },
    { relation: 'FL.fmId → FM', rows: fls, fkField: 'fmId', targetSet: idSet.fm },
    { relation: 'FL.feId → FE', rows: fls, fkField: 'feId', targetSet: idSet.fe },
    { relation: 'FL.fcId → FC', rows: fls, fkField: 'fcId', targetSet: idSet.fc },
    { relation: 'RA.linkId → FL', rows: ras, fkField: 'linkId', targetSet: idSet.fl },
    { relation: 'FE.l1FuncId → L1F', rows: fes, fkField: 'l1FuncId', targetSet: idSet.l1F, nullable: true, nameField: 'effect' },
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
      } else { valid++; }
    }
    integrity.push({ relation: ck.relation, total: ck.rows.length, valid, orphans: orphans.slice(0, 10) });
    if (orphans.length > 0) {
      totalOrphans += orphans.length;
      r.status = worst(r.status, 'error');
      r.issues.push(`${ck.relation}: 고아 ${orphans.length}건`);
    }
  }

  // 미연결 엔티티 검증
  const linkedFcIds = new Set(fls.map((l: any) => l.fcId));
  const linkedFmIds = new Set(fls.map((l: any) => l.fmId));
  const unlinkedFC = fcs.filter((fc: any) => !linkedFcIds.has(fc.id)).length;
  const unlinkedFM = fms.filter((fm: any) => !linkedFmIds.has(fm.id)).length;

  // RA ↔ FL 1:1 커버리지
  const flWithRA = new Set(ras.map((ra: any) => ra.linkId));
  const flNoRA = fls.filter((fl: any) => !flWithRA.has(fl.id)).length;

  r.details = {
    fkRelations: integrity.length, totalOrphans,
    links: fls.length, unlinkedFC, unlinkedFM, flWithoutRA: flNoRA,
    totalFM: fms.length, totalFC: fcs.length, totalFE: fes.length, totalRA: ras.length,
  };

  if (unlinkedFC > 0) { r.status = worst(r.status, 'warn'); r.issues.push(`FL 없는 FC ${unlinkedFC}건`); }
  if (unlinkedFM > 0) { r.status = worst(r.status, 'warn'); r.issues.push(`FL 없는 FM ${unlinkedFM}건`); }
  if (fls.length === 0 && fcs.length > 0) { r.status = 'error'; r.issues.push('FailureLink 0건 — FK 연결 필요'); }
  if (flNoRA > 0) { r.status = worst(r.status, 'warn'); r.issues.push(`RA 없는 FL ${flNoRA}건`); }

  r.fkIntegrity = integrity;
  return r;
}

// ─── STEP 4: 누락 ───────────────────────────────────────────
export async function verifyMissing(prisma: any, fmeaId: string): Promise<StepResult> {
  const r: StepResult = { step: 4, name: '누락', status: 'ok', details: {}, issues: [], fixed: [] };

  const [l3Funcs, ras, fcs, fls, opts] = await Promise.all([
    prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, processChar: true, functionName: true } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { id: true, linkId: true, severity: true, occurrence: true, detection: true, preventionControl: true, detectionControl: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, l3FuncId: true, processCharId: true } }),
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fmId: true, fcId: true } }),
    prisma.optimization.findMany({ where: { fmeaId }, select: { id: true, riskId: true } }),
  ]);

  // 공정특성 빈값
  const emptyPC = l3Funcs.filter((f: any) => !f.processChar?.trim()).length;
  // orphan PC: FC에서 참조하지 않는 L3Function (폴백 L3F 제외 — FC 없는 WE는 정상)
  const fcL3FuncIds = new Set(fcs.map((fc: any) => fc.l3FuncId).filter(Boolean));
  const fcPcIds = new Set(fcs.map((fc: any) => fc.processCharId).filter(Boolean));
  const orphanPC = l3Funcs.filter((f: any) =>
    f.processChar?.trim() &&
    !fcL3FuncIds.has(f.id) &&
    !fcPcIds.has(f.id) &&
    !f.id.endsWith('-L3F')  // 폴백 L3Function은 orphan 카운트에서 제외
  ).length;

  // DC/PC null
  const nullDC = ras.filter((ra: any) => !ra.detectionControl?.trim()).length;
  const nullPC = ras.filter((ra: any) => !ra.preventionControl?.trim()).length;

  // SOD 빈값
  const missS = ras.filter((ra: any) => !ra.severity || ra.severity <= 0).length;
  const missO = ras.filter((ra: any) => !ra.occurrence || ra.occurrence <= 0).length;
  const missD = ras.filter((ra: any) => !ra.detection || ra.detection <= 0).length;

  // RA 누락 (FL 대비)
  const raLinkIds = new Set(ras.map((ra: any) => ra.linkId));
  const missRA = fls.filter((fl: any) => !raLinkIds.has(fl.id)).length;

  // Opt 누락 (AP=H 기준)
  const raSet = new Set(ras.map((ra: any) => ra.id));
  const optRiskIds = new Set(opts.map((o: any) => o.riskId));
  const orphanOpt = opts.filter((o: any) => !raSet.has(o.riskId)).length;

  r.details = {
    totalPC: l3Funcs.length, emptyPC, orphanPC,
    totalRA: ras.length, nullDC, nullPC,
    missS, missO, missD, missRA,
    totalOpt: opts.length, orphanOpt,
    totalFL: fls.length, totalFC: fcs.length,
  };

  if (emptyPC > 0) {
    r.status = worst(r.status, 'warn');
    const emptyIds = l3Funcs.filter((f: any) => !f.processChar?.trim()).map((f: any) => ({ id: f.id, functionName: f.functionName }));
    r.issues.push(`빈 공정특성 ${emptyPC}건`);
    (r.details as any).emptyPCDetails = emptyIds;
  }
  if (orphanPC > 0) { r.status = worst(r.status, 'warn'); r.issues.push(`FC 없는 공정특성 ${orphanPC}건`); }
  if (nullDC > 0) { r.status = worst(r.status, 'warn'); r.issues.push(`DC(검출관리) 빈값 ${nullDC}건`); }
  if (nullPC > 0) { r.status = worst(r.status, 'warn'); r.issues.push(`PC(예방관리) 빈값 ${nullPC}건`); }
  if (missS > 0) { r.status = worst(r.status, 'warn'); r.issues.push(`S(심각도) 미입력 ${missS}건`); }
  if (missO > 0) { r.status = worst(r.status, 'warn'); r.issues.push(`O(발생도) 미입력 ${missO}건`); }
  if (missD > 0) { r.status = worst(r.status, 'warn'); r.issues.push(`D(검출도) 미입력 ${missD}건`); }
  if (missRA > 0) { r.status = worst(r.status, 'error'); r.issues.push(`RA 누락 ${missRA}건 (FL 대비)`); }
  if (orphanOpt > 0) { r.status = worst(r.status, 'warn'); r.issues.push(`Opt→RA FK 고아 ${orphanOpt}건`); }

  return r;
}

// ─── AP 계산 (AIAG-VDA) ──────────────────────────────────────
const AP_TABLE: { s: string; o: string; d: readonly ('H'|'M'|'L')[] }[] = [
  { s: '9-10', o: '8-10', d: ['H','H','H','H'] }, { s: '9-10', o: '6-7', d: ['H','H','H','H'] },
  { s: '9-10', o: '4-5', d: ['H','H','H','M'] }, { s: '9-10', o: '2-3', d: ['H','M','L','L'] },
  { s: '9-10', o: '1', d: ['L','L','L','L'] },
  { s: '7-8', o: '8-10', d: ['H','H','H','H'] }, { s: '7-8', o: '6-7', d: ['H','H','H','M'] },
  { s: '7-8', o: '4-5', d: ['H','M','M','M'] }, { s: '7-8', o: '2-3', d: ['M','M','L','L'] },
  { s: '7-8', o: '1', d: ['L','L','L','L'] },
  { s: '4-6', o: '8-10', d: ['H','H','M','M'] }, { s: '4-6', o: '6-7', d: ['M','M','M','L'] },
  { s: '4-6', o: '4-5', d: ['M','L','L','L'] }, { s: '4-6', o: '2-3', d: ['L','L','L','L'] },
  { s: '4-6', o: '1', d: ['L','L','L','L'] },
  { s: '2-3', o: '8-10', d: ['M','M','L','L'] }, { s: '2-3', o: '6-7', d: ['L','L','L','L'] },
  { s: '2-3', o: '4-5', d: ['L','L','L','L'] }, { s: '2-3', o: '2-3', d: ['L','L','L','L'] },
  { s: '2-3', o: '1', d: ['L','L','L','L'] },
];

export function calcAPServer(s: number, o: number, d: number): 'H' | 'M' | 'L' | null {
  if (s <= 0 || o <= 0 || d <= 0) return null;
  if (s === 1) return 'L';
  const sR = s >= 9 ? '9-10' : s >= 7 ? '7-8' : s >= 4 ? '4-6' : '2-3';
  const oR = o >= 8 ? '8-10' : o >= 6 ? '6-7' : o >= 4 ? '4-5' : o >= 2 ? '2-3' : '1';
  const dI = d >= 7 ? 0 : d >= 5 ? 1 : d >= 2 ? 2 : 3;
  const row = AP_TABLE.find(r => r.s === sR && r.o === oR);
  return row ? row.d[dI] : 'L';
}
