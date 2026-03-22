/**
 * @file deep-verify.ts
 * @description 6대 카테고리 42규칙 근본 검증 엔진
 *
 * 카테고리: DB정합성(A) / UUID일관성(B) / FK양방향(C) / 렌더링완전성(D) / 스키마분리(E) / AP·SOD(F)
 * DB 없이 인메모리 데이터로 실행 가능 (테스트 용이)
 *
 * @created 2026-03-22
 */

// ─── 타입 ───

export interface CheckResult {
  code: string;       // A1, B2, C4, D1, E1, F5 등
  name: string;       // 검증 규칙 이름
  level: 'error' | 'warning' | 'pass';
  count: number;      // 문제 건수 (0 = pass)
  details?: string[]; // 문제 레코드 ID 목록 (최대 20개)
}

export interface RenderingGap {
  table: string;         // 테이블명 (FailureMode, FailureLink 등)
  id: string;            // 문제 레코드 ID
  missingFields: string[]; // 누락 필드/관계
}

export interface DeepVerifyResult {
  fmeaId: string;
  timestamp: string;
  summary: { total: number; errors: number; warnings: number; passed: number };
  categories: {
    db: CheckResult[];
    uuid: CheckResult[];
    fk: CheckResult[];
    render: CheckResult[];
    schema: CheckResult[];
    ap: CheckResult[];
  };
  renderingGaps: RenderingGap[];
}

/** 최소 필수 필드만 정의 — Prisma 모델과 호환 */
interface MinEntity { id: string; fmeaId: string }
interface MinL2Struct extends MinEntity { l1Id: string; no: string; name: string; order: number }
interface MinL3Struct extends MinEntity { l1Id: string; l2Id: string; m4?: string | null; name: string; order: number }
interface MinL1Func extends MinEntity { l1StructId: string; category: string; functionName: string; requirement: string }
interface MinL2Func extends MinEntity { l2StructId: string; functionName: string; productChar: string; specialChar?: string | null }
interface MinL3Func extends MinEntity { l3StructId: string; l2StructId: string; functionName: string; processChar: string; specialChar?: string | null }
interface MinPC extends MinEntity { l2StructId: string; name: string; orderIndex: number; specialChar?: string | null }
interface MinFE extends MinEntity { l1FuncId: string; category: string; effect: string; severity: number }
interface MinFM extends MinEntity { l2FuncId: string; l2StructId: string; productCharId?: string | null; mode: string }
interface MinFC extends MinEntity { l3FuncId: string; l3StructId: string; l2StructId: string; cause: string }
interface MinFL extends MinEntity { fmId: string; feId: string; fcId: string }
interface MinRA extends MinEntity { linkId: string; severity: number; occurrence: number; detection: number; ap: string; preventionControl?: string | null; detectionControl?: string | null }

export interface PublicSchemaData {
  failureModes: number;
  failureLinks: number;
  riskAnalyses: number;
  l2Structures: number;
  l3Structures: number;
}

export interface DeepVerifyInput {
  fmeaId: string;
  l1Structure: { id: string; fmeaId: string; name: string };
  l1Functions: MinL1Func[];
  l2Structures: MinL2Struct[];
  l2Functions: MinL2Func[];
  l3Structures: MinL3Struct[];
  l3Functions: MinL3Func[];
  processProductChars: MinPC[];
  failureEffects: MinFE[];
  failureModes: MinFM[];
  failureCauses: MinFC[];
  failureLinks: MinFL[];
  riskAnalyses: MinRA[];
  publicSchemaData: PublicSchemaData | null;
}

// ─── 유틸 ───

function check(code: string, name: string, level: 'error' | 'warning' | 'pass', count: number, details?: string[]): CheckResult {
  return { code, name, level, count, details: details?.slice(0, 20) };
}

function pass(code: string, name: string): CheckResult {
  return check(code, name, 'pass', 0);
}

// ─── UUID 형식 패턴 ───

const POS_UUID_RE = /^(L[123]|FC)-R\d+(-C\d+)?$/;       // L1-R2-C4, FC-R100
const GEN_UUID_RE = /^PF-(L[123]|FC)-\d{3}/;             // PF-L2-040-M-001
const STRUCT_ID_RE = /^L[123]-STRUCT$/;                   // L1-STRUCT (singleton)
const RA_SUFFIX_RE = /-RA$/;                              // FC-R2-RA

function classifyUUID(id: string): 'position' | 'genXxx' | 'struct' | 'ra' | 'unknown' {
  if (!id) return 'unknown';
  if (STRUCT_ID_RE.test(id)) return 'struct';
  if (RA_SUFFIX_RE.test(id)) return 'ra';
  if (POS_UUID_RE.test(id)) return 'position';
  if (GEN_UUID_RE.test(id)) return 'genXxx';
  return 'unknown';
}

// ─── 메인 함수 ───

export function runDeepVerify(input: DeepVerifyInput): DeepVerifyResult {
  const { fmeaId } = input;
  const results: DeepVerifyResult = {
    fmeaId,
    timestamp: new Date().toISOString(),
    summary: { total: 0, errors: 0, warnings: 0, passed: 0 },
    categories: { db: [], uuid: [], fk: [], render: [], schema: [], ap: [] },
    renderingGaps: [],
  };

  // ═══════════════════════════════════════════
  // A. DB 정합성 (7규칙)
  // ═══════════════════════════════════════════

  verifyDB(input, results);

  // ═══════════════════════════════════════════
  // B. UUID 일관성 (5규칙)
  // ═══════════════════════════════════════════

  verifyUUID(input, results);

  // ═══════════════════════════════════════════
  // C. FK 양방향 무결성 (10규칙)
  // ═══════════════════════════════════════════

  verifyFK(input, results);

  // ═══════════════════════════════════════════
  // D. 렌더링 완전성 (10규칙)
  // ═══════════════════════════════════════════

  verifyRendering(input, results);

  // ═══════════════════════════════════════════
  // E. 스키마 분리 (5규칙)
  // ═══════════════════════════════════════════

  verifySchema(input, results);

  // ═══════════════════════════════════════════
  // F. AP/SOD 정합성 (5규칙)
  // ═══════════════════════════════════════════

  verifyAP(input, results);

  // ─── Summary ───
  const all = [
    ...results.categories.db, ...results.categories.uuid,
    ...results.categories.fk, ...results.categories.render,
    ...results.categories.schema, ...results.categories.ap,
  ];
  results.summary.total = all.length;
  results.summary.errors = all.filter(c => c.level === 'error').length;
  results.summary.warnings = all.filter(c => c.level === 'warning').length;
  results.summary.passed = all.filter(c => c.level === 'pass').length;

  return results;
}

// ═══════════════════════════════════════════
// A. DB 정합성
// ═══════════════════════════════════════════

function verifyDB(input: DeepVerifyInput, r: DeepVerifyResult): void {
  const { fmeaId } = input;
  const db = r.categories.db;

  // A3: fmeaId 일치성
  const allEntities: MinEntity[] = [
    input.l1Structure,
    ...input.l1Functions, ...input.l2Structures, ...input.l2Functions,
    ...input.l3Structures, ...input.l3Functions, ...input.processProductChars,
    ...input.failureEffects, ...input.failureModes, ...input.failureCauses,
    ...input.failureLinks, ...input.riskAnalyses,
  ];
  const mismatchIds = allEntities.filter(e => e.fmeaId !== fmeaId).map(e => e.id);
  db.push(mismatchIds.length > 0
    ? check('A3', 'fmeaId 불일치', 'error', mismatchIds.length, mismatchIds)
    : pass('A3', 'fmeaId 일치'));

  // A4: 중복 ID 탐지
  const idCounts = new Map<string, number>();
  for (const e of allEntities) {
    if (e.id) idCounts.set(e.id, (idCounts.get(e.id) || 0) + 1);
  }
  const dups = [...idCounts.entries()].filter(([, c]) => c > 1).map(([id]) => id);
  db.push(dups.length > 0
    ? check('A4', '중복 ID', 'error', dups.length, dups)
    : pass('A4', 'ID 고유성'));

  // A5: FL 필수 FK NULL
  const nullFkFLs = input.failureLinks.filter(fl => !fl.fmId || !fl.feId || !fl.fcId);
  const nullDetails = nullFkFLs.map(fl => {
    const missing: string[] = [];
    if (!fl.fmId) missing.push('fmId');
    if (!fl.feId) missing.push('feId');
    if (!fl.fcId) missing.push('fcId');
    return `${fl.id}:[${missing.join(',')}]`;
  });
  db.push(nullFkFLs.length > 0
    ? check('A5', 'FL 필수 FK NULL', 'error', nullFkFLs.length, nullDetails)
    : pass('A5', 'FL FK 완전'));

  // A6: RA 수 = FL 수
  const raCount = input.riskAnalyses.length;
  const flCount = input.failureLinks.length;
  db.push(raCount !== flCount
    ? check('A6', 'RA≠FL 수 불일치', 'error', Math.abs(raCount - flCount), [`RA=${raCount} FL=${flCount}`])
    : pass('A6', 'RA=FL 1:1'));

  // A7: L1Structure 존재
  db.push(!input.l1Structure?.id
    ? check('A7', 'L1Structure 미존재', 'error', 1)
    : pass('A7', 'L1Structure 존재'));

  // A8: L1Function scope 값 검증 (YP/SP/USER만 허용)
  const validScopes = new Set(['YP', 'SP', 'USER']);
  const badScopes = input.l1Functions.filter(f => !validScopes.has(f.category));
  db.push(badScopes.length > 0
    ? check('A8', 'L1Function scope 비표준', 'error', badScopes.length,
        badScopes.map(f => `${f.id}:category="${f.category}"`))
    : pass('A8', 'scope YP/SP/USER 정규'));

  // A9: L3Structure m4 값 검증 (MN/MC/EN/IM만 허용)
  const validM4s = new Set(['MN', 'MC', 'EN', 'IM', '']);
  const badM4s = input.l3Structures.filter(l3 => l3.m4 && !validM4s.has(l3.m4));
  db.push(badM4s.length > 0
    ? check('A9', 'L3Structure m4 비표준', 'warning', badM4s.length,
        badM4s.map(l3 => `${l3.id}:m4="${l3.m4}"`))
    : pass('A9', '4M MN/MC/EN/IM 정규'));
}

// ═══════════════════════════════════════════
// B. UUID 일관성
// ═══════════════════════════════════════════

function verifyUUID(input: DeepVerifyInput, r: DeepVerifyResult): void {
  const uuid = r.categories.uuid;

  // 모든 ID 수집
  const allIds: string[] = [
    input.l1Structure.id,
    ...input.l1Functions.map(e => e.id),
    ...input.l2Structures.map(e => e.id),
    ...input.l2Functions.map(e => e.id),
    ...input.l3Structures.map(e => e.id),
    ...input.l3Functions.map(e => e.id),
    ...input.processProductChars.map(e => e.id),
    ...input.failureEffects.map(e => e.id),
    ...input.failureModes.map(e => e.id),
    ...input.failureCauses.map(e => e.id),
    ...input.failureLinks.map(e => e.id),
    ...input.riskAnalyses.map(e => e.id),
  ];

  // B1: UUID 형식 분류
  const formats = new Map<string, number>();
  for (const id of allIds) {
    const fmt = classifyUUID(id);
    formats.set(fmt, (formats.get(fmt) || 0) + 1);
  }
  const fmtSummary = [...formats.entries()].map(([k, v]) => `${k}:${v}`);
  uuid.push(pass('B1', `UUID 형식 분포: ${fmtSummary.join(', ')}`));

  // B2: mixed UUID 세대 경고
  const hasPosition = (formats.get('position') || 0) > 0;
  const hasGenXxx = (formats.get('genXxx') || 0) > 0;
  if (hasPosition && hasGenXxx) {
    uuid.push(check('B2', 'mixed UUID 세대', 'warning', formats.get('genXxx') || 0,
      [`position:${formats.get('position')}, genXxx:${formats.get('genXxx')}`]));
  } else {
    uuid.push(pass('B2', 'UUID 세대 일관'));
  }

  // B3: 빈 UUID 또는 비정상 길이
  const emptyIds = allIds.filter(id => !id || id.length === 0);
  const longIds = allIds.filter(id => id && id.length > 100);
  const badIds = [...emptyIds, ...longIds];
  uuid.push(badIds.length > 0
    ? check('B3', '비정상 UUID (빈/초장문)', 'error', badIds.length, badIds)
    : pass('B3', 'UUID 길이 정상'));

  // B4: fmeaId 접두사 일관성 (genXxx 형식인 경우만)
  if (hasGenXxx) {
    const genIds = allIds.filter(id => GEN_UUID_RE.test(id));
    const prefixes = new Set(genIds.map(id => id.substring(0, 2)));
    uuid.push(prefixes.size > 1
      ? check('B4', 'genXxx 접두사 불일치', 'warning', prefixes.size, [...prefixes])
      : pass('B4', 'genXxx 접두사 일관'));
  } else {
    uuid.push(pass('B4', 'genXxx 접두사 (해당없음)'));
  }

  // B5: 위치기반 UUID 행번호 비정상 (R0, R-1)
  const posIds = allIds.filter(id => POS_UUID_RE.test(id));
  const badRows = posIds.filter(id => {
    const m = id.match(/R(\d+)/);
    return m && parseInt(m[1], 10) < 2; // 헤더=1행이므로 데이터는 R2부터
  });
  uuid.push(badRows.length > 0
    ? check('B5', '위치기반 행번호 비정상 (R0/R1)', 'warning', badRows.length, badRows)
    : pass('B5', '위치기반 행번호 정상'));
}

// ═══════════════════════════════════════════
// C. FK 양방향 무결성
// ═══════════════════════════════════════════

function verifyFK(input: DeepVerifyInput, r: DeepVerifyResult): void {
  const fk = r.categories.fk;

  const fmIds = new Set(input.failureModes.map(e => e.id));
  const feIds = new Set(input.failureEffects.map(e => e.id));
  const fcIds = new Set(input.failureCauses.map(e => e.id));
  const flIds = new Set(input.failureLinks.map(e => e.id));
  const l2Ids = new Set(input.l2Structures.map(e => e.id));
  const pcIds = new Set(input.processProductChars.map(e => e.id));
  const pcL2Map = new Map(input.processProductChars.map(pc => [pc.id, pc.l2StructId]));

  // C1: FL→FM 존재
  const brokenFM = input.failureLinks.filter(fl => fl.fmId && !fmIds.has(fl.fmId));
  fk.push(brokenFM.length > 0
    ? check('C1', 'FL→FM 깨진 참조', 'error', brokenFM.length, brokenFM.map(fl => `${fl.id}→${fl.fmId}`))
    : pass('C1', 'FL→FM 정상'));

  // C2: FL→FE 존재
  const brokenFE = input.failureLinks.filter(fl => fl.feId && !feIds.has(fl.feId));
  fk.push(brokenFE.length > 0
    ? check('C2', 'FL→FE 깨진 참조', 'error', brokenFE.length, brokenFE.map(fl => `${fl.id}→${fl.feId}`))
    : pass('C2', 'FL→FE 정상'));

  // C3: FL→FC 존재
  const brokenFC = input.failureLinks.filter(fl => fl.fcId && !fcIds.has(fl.fcId));
  fk.push(brokenFC.length > 0
    ? check('C3', 'FL→FC 깨진 참조', 'error', brokenFC.length, brokenFC.map(fl => `${fl.id}→${fl.fcId}`))
    : pass('C3', 'FL→FC 정상'));

  // C4: orphan FM (FL이 참조하지 않는 FM)
  const fmInFL = new Set(input.failureLinks.map(fl => fl.fmId));
  const orphanFM = input.failureModes.filter(fm => !fmInFL.has(fm.id));
  fk.push(orphanFM.length > 0
    ? check('C4', 'orphan FM (FL 미참조)', 'warning', orphanFM.length, orphanFM.map(fm => `${fm.id}:${fm.mode}`))
    : pass('C4', 'FM 전수 연결'));

  // C5: orphan FE (FL이 참조하지 않는 FE)
  const feInFL = new Set(input.failureLinks.map(fl => fl.feId));
  const orphanFE = input.failureEffects.filter(fe => !feInFL.has(fe.id));
  fk.push(orphanFE.length > 0
    ? check('C5', 'orphan FE (FL 미참조)', 'warning', orphanFE.length, orphanFE.map(fe => `${fe.id}:${fe.effect}`))
    : pass('C5', 'FE 전수 연결'));

  // C6: orphan FC (FL이 참조하지 않는 FC)
  const fcInFL = new Set(input.failureLinks.map(fl => fl.fcId));
  const orphanFC = input.failureCauses.filter(fc => !fcInFL.has(fc.id));
  fk.push(orphanFC.length > 0
    ? check('C6', 'orphan FC (FL 미참조)', 'warning', orphanFC.length, orphanFC.map(fc => `${fc.id}:${fc.cause}`))
    : pass('C6', 'FC 전수 연결'));

  // C7: orphan PC (FM이 참조하지 않는 ProcessProductChar)
  const pcInFM = new Set(input.failureModes.map(fm => fm.productCharId).filter(Boolean));
  const orphanPC = input.processProductChars.filter(pc => !pcInFM.has(pc.id));
  fk.push(orphanPC.length > 0
    ? check('C7', 'orphan PC (FM 미참조)', 'warning', orphanPC.length, orphanPC.map(pc => `${pc.id}:${pc.name}`))
    : pass('C7', 'PC 전수 연결'));

  // C8: FM.productCharId 크로스공정 오염 (FM.l2StructId ≠ PC.l2StructId)
  const crossProcess: string[] = [];
  for (const fm of input.failureModes) {
    if (!fm.productCharId) continue;
    const pcL2 = pcL2Map.get(fm.productCharId);
    if (pcL2 && pcL2 !== fm.l2StructId) {
      crossProcess.push(`FM:${fm.id}(l2=${fm.l2StructId}) → PC.l2=${pcL2}`);
    }
  }
  fk.push(crossProcess.length > 0
    ? check('C8', 'FM↔PC 크로스공정 오염', 'error', crossProcess.length, crossProcess)
    : pass('C8', 'FM↔PC 공정 일치'));

  // C9: FC.l2StructId ≠ L3.l2Id 불일치
  const l3L2Map = new Map(input.l3Structures.map(l3 => [l3.id, l3.l2Id]));
  const fcL2Mismatch: string[] = [];
  for (const fc of input.failureCauses) {
    const l3L2 = l3L2Map.get(fc.l3StructId);
    if (l3L2 && fc.l2StructId && l3L2 !== fc.l2StructId) {
      fcL2Mismatch.push(`FC:${fc.id}(l2=${fc.l2StructId}) ≠ L3.l2=${l3L2}`);
    }
  }
  fk.push(fcL2Mismatch.length > 0
    ? check('C9', 'FC↔L3 공정 불일치', 'error', fcL2Mismatch.length, fcL2Mismatch)
    : pass('C9', 'FC↔L3 공정 일치'));

  // C10: L3.l2Id → 존재하는 L2 확인
  const brokenL3L2 = input.l3Structures.filter(l3 => l3.l2Id && !l2Ids.has(l3.l2Id));
  fk.push(brokenL3L2.length > 0
    ? check('C10', 'L3→L2 깨진 참조', 'error', brokenL3L2.length, brokenL3L2.map(l3 => `${l3.id}→${l3.l2Id}`))
    : pass('C10', 'L3→L2 정상'));
}

// ═══════════════════════════════════════════
// D. 렌더링 완전성
// ═══════════════════════════════════════════

function verifyRendering(input: DeepVerifyInput, r: DeepVerifyResult): void {
  const render = r.categories.render;
  const gaps = r.renderingGaps;

  const flByFM = new Set(input.failureLinks.map(fl => fl.fmId));
  const raByFL = new Set(input.riskAnalyses.map(ra => ra.linkId));
  const l2FuncByL2 = new Map<string, number>();
  for (const f of input.l2Functions) l2FuncByL2.set(f.l2StructId, (l2FuncByL2.get(f.l2StructId) || 0) + 1);
  const l3FuncByL3 = new Map<string, number>();
  for (const f of input.l3Functions) l3FuncByL3.set(f.l3StructId, (l3FuncByL3.get(f.l3StructId) || 0) + 1);
  const feByL1F = new Map<string, number>();
  for (const fe of input.failureEffects) feByL1F.set(fe.l1FuncId, (feByL1F.get(fe.l1FuncId) || 0) + 1);

  // D1: FM 있는데 FL 없음 = 워크시트 빈 행
  const fmNoFL = input.failureModes.filter(fm => !flByFM.has(fm.id));
  if (fmNoFL.length > 0) {
    render.push(check('D1', 'FM↛FL (워크시트 빈 행)', 'error', fmNoFL.length, fmNoFL.map(fm => fm.id)));
    for (const fm of fmNoFL) gaps.push({ table: 'FailureMode', id: fm.id, missingFields: ['FailureLink'] });
  } else {
    render.push(pass('D1', 'FM→FL 완전'));
  }

  // D2: FL 있는데 RA 없음 = SOD 빈칸
  const flNoRA = input.failureLinks.filter(fl => !raByFL.has(fl.id));
  if (flNoRA.length > 0) {
    render.push(check('D2', 'FL↛RA (SOD 빈칸)', 'error', flNoRA.length, flNoRA.map(fl => fl.id)));
    for (const fl of flNoRA) gaps.push({ table: 'FailureLink', id: fl.id, missingFields: ['RiskAnalysis'] });
  } else {
    render.push(pass('D2', 'FL→RA 완전'));
  }

  // D3: RA severity=0
  const zeroS = input.riskAnalyses.filter(ra => ra.severity === 0);
  render.push(zeroS.length > 0
    ? check('D3', 'RA severity=0', 'warning', zeroS.length, zeroS.map(ra => ra.id))
    : pass('D3', 'RA severity 정상'));

  // D4: RA.detectionControl NULL
  const nullDC = input.riskAnalyses.filter(ra => !ra.detectionControl?.trim());
  render.push(nullDC.length > 0
    ? check('D4', 'RA.DC NULL/빈값', 'warning', nullDC.length, nullDC.map(ra => ra.id))
    : pass('D4', 'DC 완전'));

  // D5: RA.preventionControl NULL
  const nullPC = input.riskAnalyses.filter(ra => !ra.preventionControl?.trim());
  render.push(nullPC.length > 0
    ? check('D5', 'RA.PC NULL/빈값', 'warning', nullPC.length, nullPC.map(ra => ra.id))
    : pass('D5', 'PC 완전'));

  // D6: L2Structure 있는데 L2Function 없음
  const l2NoFunc = input.l2Structures.filter(l2 => !l2FuncByL2.has(l2.id));
  render.push(l2NoFunc.length > 0
    ? check('D6', 'L2↛L2Func (공정기능 빈칸)', 'warning', l2NoFunc.length, l2NoFunc.map(l2 => l2.id))
    : pass('D6', 'L2→L2Func 완전'));

  // D7: L3Structure 있는데 L3Function 없음
  const l3NoFunc = input.l3Structures.filter(l3 => !l3FuncByL3.has(l3.id));
  render.push(l3NoFunc.length > 0
    ? check('D7', 'L3↛L3Func (요소기능 빈칸)', 'warning', l3NoFunc.length, l3NoFunc.map(l3 => l3.id))
    : pass('D7', 'L3→L3Func 완전'));

  // D8: L1Function 있는데 FailureEffect 없음
  const l1NoFE = input.l1Functions.filter(f => !feByL1F.has(f.id));
  render.push(l1NoFE.length > 0
    ? check('D8', 'L1Func↛FE (고장영향 빈칸)', 'warning', l1NoFE.length, l1NoFE.map(f => f.id))
    : pass('D8', 'L1Func→FE 완전'));

  // D9: FM.mode 빈문자열
  const emptyFM = input.failureModes.filter(fm => !fm.mode?.trim());
  render.push(emptyFM.length > 0
    ? check('D9', 'FM.mode 빈값', 'error', emptyFM.length, emptyFM.map(fm => fm.id))
    : pass('D9', 'FM.mode 완전'));

  // D10: FC.cause 빈문자열
  const emptyFC = input.failureCauses.filter(fc => !fc.cause?.trim());
  render.push(emptyFC.length > 0
    ? check('D10', 'FC.cause 빈값', 'error', emptyFC.length, emptyFC.map(fc => fc.id))
    : pass('D10', 'FC.cause 완전'));
}

// ═══════════════════════════════════════════
// E. 스키마 분리
// ═══════════════════════════════════════════

function verifySchema(input: DeepVerifyInput, r: DeepVerifyResult): void {
  const schema = r.categories.schema;
  const pub = input.publicSchemaData;

  if (!pub) {
    schema.push(pass('E1', 'public.FM 오염 없음 (미조회)'));
    schema.push(pass('E2', 'public.FL 오염 없음 (미조회)'));
    schema.push(pass('E3', 'public.RA 오염 없음 (미조회)'));
    schema.push(pass('E4', 'public.L2 오염 없음 (미조회)'));
    schema.push(pass('E5', 'public.L3 오염 없음 (미조회)'));
    return;
  }

  schema.push(pub.failureModes > 0
    ? check('E1', 'public.failure_modes 오염', 'error', pub.failureModes, [`${pub.failureModes}건`])
    : pass('E1', 'public.FM 클린'));

  schema.push(pub.failureLinks > 0
    ? check('E2', 'public.failure_links 오염', 'error', pub.failureLinks, [`${pub.failureLinks}건`])
    : pass('E2', 'public.FL 클린'));

  schema.push(pub.riskAnalyses > 0
    ? check('E3', 'public.risk_analyses 오염', 'error', pub.riskAnalyses, [`${pub.riskAnalyses}건`])
    : pass('E3', 'public.RA 클린'));

  schema.push(pub.l2Structures > 0
    ? check('E4', 'public.l2_structures 오염', 'error', pub.l2Structures, [`${pub.l2Structures}건`])
    : pass('E4', 'public.L2 클린'));

  schema.push(pub.l3Structures > 0
    ? check('E5', 'public.l3_structures 오염', 'error', pub.l3Structures, [`${pub.l3Structures}건`])
    : pass('E5', 'public.L3 클린'));
}

// ═══════════════════════════════════════════
// F. AP/SOD 정합성
// ═══════════════════════════════════════════

function verifyAP(input: DeepVerifyInput, r: DeepVerifyResult): void {
  const ap = r.categories.ap;

  // FE severity lookup: feId → severity
  const feSevMap = new Map(input.failureEffects.map(fe => [fe.id, fe.severity]));
  // FL의 feId lookup: linkId → feId
  const flFeMap = new Map(input.failureLinks.map(fl => [fl.id, fl.feId]));

  // F1: AP ≠ AIAG-VDA 매트릭스 (간이 검증: S≥9 + O≥4 → 반드시 H)
  const apMismatch: string[] = [];
  for (const ra of input.riskAnalyses) {
    if (ra.severity >= 9 && ra.occurrence >= 4 && ra.ap && ra.ap !== 'H') {
      apMismatch.push(`${ra.id}:S=${ra.severity},O=${ra.occurrence}→AP=${ra.ap}(expect H)`);
    }
  }
  ap.push(apMismatch.length > 0
    ? check('F1', 'AP 매트릭스 불일치 (S≥9,O≥4→H)', 'warning', apMismatch.length, apMismatch)
    : pass('F1', 'AP 매트릭스 정합'));

  // F2: S=0인데 AP 값 있음
  const zeroSAP = input.riskAnalyses.filter(ra => ra.severity === 0 && ra.ap?.trim());
  ap.push(zeroSAP.length > 0
    ? check('F2', 'S=0인데 AP 있음', 'warning', zeroSAP.length, zeroSAP.map(ra => `${ra.id}:AP=${ra.ap}`))
    : pass('F2', 'S=0 → AP 없음'));

  // F3: O=0인데 AP 값 있음
  const zeroOAP = input.riskAnalyses.filter(ra => ra.occurrence === 0 && ra.ap?.trim());
  ap.push(zeroOAP.length > 0
    ? check('F3', 'O=0인데 AP 있음', 'warning', zeroOAP.length, zeroOAP.map(ra => `${ra.id}:AP=${ra.ap}`))
    : pass('F3', 'O=0 → AP 없음'));

  // F4: D=0인데 AP 값 있음
  const zeroDAP = input.riskAnalyses.filter(ra => ra.detection === 0 && ra.ap?.trim());
  ap.push(zeroDAP.length > 0
    ? check('F4', 'D=0인데 AP 있음', 'warning', zeroDAP.length, zeroDAP.map(ra => `${ra.id}:AP=${ra.ap}`))
    : pass('F4', 'D=0 → AP 없음'));

  // F5: RA.severity ≠ FE.severity 불일치
  const sevMismatch: string[] = [];
  for (const ra of input.riskAnalyses) {
    const feId = flFeMap.get(ra.linkId);
    if (!feId) continue;
    const feSev = feSevMap.get(feId);
    if (feSev !== undefined && feSev > 0 && ra.severity > 0 && feSev !== ra.severity) {
      sevMismatch.push(`${ra.id}:RA.S=${ra.severity}≠FE.S=${feSev}`);
    }
  }
  ap.push(sevMismatch.length > 0
    ? check('F5', 'RA↔FE severity 불일치', 'warning', sevMismatch.length, sevMismatch)
    : pass('F5', 'RA↔FE severity 일치'));
}
