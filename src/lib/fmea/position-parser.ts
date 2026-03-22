/**
 * @file position-parser.ts
 * @description 위치기반 Import 파서 — 5시트 JSON/Excel → PositionAtomicData 직접 반환
 *
 * UUID = 셀 위치. FK = 크로스시트 행번호 직접 참조.
 * flatData/chains 중간계층 없이 DB Atomic 테이블 1:1 매핑.
 *
 * 시트 구조 (m102-position-based.json 기준):
 *   L1: C1(구분), C2(제품기능), C3(요구사항), C4(고장영향)
 *   L2: A1(공정번호), A2(공정명), A3(공정기능), A4(제품특성), SC, A5(고장형태), A6(검출관리)
 *   L3: processNo, m4, B1(작업요소), B2(요소기능), B3(공정특성), SC, B4(고장원인), B5(예방관리)
 *   FC: FE_scope, FE, processNo, FM, m4, WE, FC, PC, DC, S, O, D, AP, L1_origRow, L2_origRow, L3_origRow
 *
 * @created 2026-03-22
 */

import { positionUUID, type SheetCode } from './position-uuid';
import { CrossSheetResolver } from './cross-sheet-resolver';
import { normalizeScope } from '@/lib/fmea/scope-constants';
import type {
  PositionAtomicData,
  PosL1Structure,
  PosL1Function,
  PosL2Structure,
  PosL2Function,
  PosL3Structure,
  PosL3Function,
  PosProcessProductChar,
  PosFailureEffect,
  PosFailureMode,
  PosFailureCause,
  PosFailureLink,
  PosRiskAnalysis,
} from '@/types/position-import';

// ─── JSON 입력 타입 ───

interface SheetRow {
  excelRow: number;
  posId: string;
  cells: Record<string, string>;
  fk?: Record<string, string>;
}

interface SheetData {
  sheetName: string;
  headers: string[];
  rows: SheetRow[];
}

interface PositionBasedJSON {
  sourceId?: string;
  targetId?: string;
  sheets: Record<string, SheetData>;
}

// ─── Import AutoFix 유틸 ───

interface AutoFixLog { code: string; message: string; row?: number }

// C1 scope 정규화 — normalizeScope from @/lib/fmea/scope-constants (상단 import)

/** 4M 자동정규화 */
function normalizeM4(raw: string): string {
  const u = raw.toUpperCase().trim();
  if (u === 'MN' || u === 'MAN' || u.includes('사람') || u.includes('작업자')) return 'MN';
  if (u === 'MC' || u === 'MACHINE' || u.includes('설비') || u.includes('기계')) return 'MC';
  if (u === 'EN' || u === 'ENVIRONMENT' || u.includes('환경')) return 'EN';
  if (u === 'IM' || u === 'MATERIAL' || u.includes('재료') || u.includes('자재')) return 'IM';
  return u || 'MN';
}

/** 공정번호 자동정규화 — 선행0 유지, 숫자만 추출 */
function normalizeProcessNo(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // 숫자만 포함된 경우 그대로 반환 (선행0 유지)
  if (/^\d+$/.test(trimmed)) return trimmed;
  // 숫자 추출
  const nums = trimmed.match(/\d+/);
  return nums ? nums[0] : trimmed;
}

/** 빈값/대시 판별 — "-", "—", "~", "." 등을 빈값으로 취급 */
function isEmptyValue(v: string): boolean {
  return !v || /^[-–—~·.]+$/.test(v.trim());
}

/** AP 자동정규화 — H/M/L만 허용 */
function normalizeAP(raw: string): string {
  const u = raw.toUpperCase().trim();
  if (u === 'H' || u === 'HIGH') return 'H';
  if (u === 'M' || u === 'MEDIUM' || u === 'MED') return 'M';
  if (u === 'L' || u === 'LOW') return 'L';
  return u;
}

// ─── UUID 컬럼 상수 (시트별 논리 컬럼 번호) ───

/** L1: C4 = 고장영향 = 4번째 컬럼 */
const L1_FE_COL = 4;
/** L1: C2 = 제품기능 = 2번째 컬럼 */
const L1_FUNC_COL = 2;
/** L2: A5 = 고장형태 = 6번째 컬럼 (A1=1,A2=2,A3=3,A4=4,SC=5,A5=6) */
const L2_FM_COL = 6;
/** L2: A3+A4 = 공정기능 = 4번째 컬럼 */
const L2_FUNC_COL = 4;
/** L2: A4 = 제품특성 = 5번째 컬럼 (ProductChar) */
const L2_PC_COL = 5;
/** L3: B4 = 고장원인 = 7번째 컬럼 (pno=1,m4=2,B1=3,B2=4,B3=5,SC=6,B4=7) */
const L3_FC_COL = 7;
/** L3: B2 = 요소기능 = 5번째 컬럼 */
const L3_FUNC_COL = 5;

// ─── 메인 파서 ───

/**
 * 위치기반 JSON → PositionAtomicData 변환
 * @param json m102-position-based.json 형식
 * @returns DB Atomic 테이블 1:1 매핑 데이터
 */
export function parsePositionBasedJSON(json: PositionBasedJSON): PositionAtomicData {
  const fmeaId = json.targetId || json.sourceId || '';
  const l1Sheet = json.sheets['L1'];
  const l2Sheet = json.sheets['L2'];
  const l3Sheet = json.sheets['L3'];
  const fcSheet = json.sheets['FC'];

  if (!l1Sheet || !l2Sheet || !l3Sheet || !fcSheet) {
    throw new Error(`Missing required sheets: L1=${!!l1Sheet} L2=${!!l2Sheet} L3=${!!l3Sheet} FC=${!!fcSheet}`);
  }

  const resolver = new CrossSheetResolver();
  const l1StructId = 'L1-STRUCT';

  // ═══════════════════════════════════════════
  // Sheet 1: L1 (C1-C4) → L1Function + FailureEffect
  // ═══════════════════════════════════════════

  const l1Functions: PosL1Function[] = [];
  const failureEffects: PosFailureEffect[] = [];
  // ★ C1+C2+C3 조합으로 중복제거 — 같은 C2라도 다른 C3 = 다른 L1Function (요구사항 누락 방지)
  const seenC2C3: Map<string, string> = new Map(); // C1|C2|C3 → L1Function id

  const autoFixes: AutoFixLog[] = [];

  for (const row of l1Sheet.rows) {
    const rn = row.excelRow;
    const rawC1 = row.cells['C1']?.trim() || '';
    const c1 = normalizeScope(rawC1); // ★ AutoFix: scope 정규화
    if (c1 !== rawC1 && rawC1) autoFixes.push({ code: 'L1_SCOPE', message: `R${rn}: "${rawC1}"→"${c1}"`, row: rn });
    const c2 = row.cells['C2']?.trim() || '';
    const c3 = row.cells['C3']?.trim() || '';
    const c4 = row.cells['C4']?.trim() || '';

    // ★ AutoFix: C2(제품기능) 빈값/대시 → 스킵 (YOUR PLANT/SHIP TO PLANT 등 빈 placeholder)
    if (isEmptyValue(c2)) {
      autoFixes.push({ code: 'L1_SKIP_EMPTY', message: `R${rn}: C1="${c1}" C2="${c2||''}" → L1Function 스킵`, row: rn });
      continue;
    }

    // L1Function: 같은 C1+C2+C3 조합의 첫 행만 생성 (C3=요구사항 보존)
    const funcKey = `${c1}|${c2}|${c3}`;
    let l1FuncId: string;
    if (!seenC2C3.has(funcKey)) {
      l1FuncId = positionUUID('L1', rn, L1_FUNC_COL);
      seenC2C3.set(funcKey, l1FuncId);
      l1Functions.push({
        id: l1FuncId,
        fmeaId,
        l1StructId,
        category: c1,
        functionName: c2,
        requirement: c3,
      });
    } else {
      l1FuncId = seenC2C3.get(funcKey)!;
    }

    // FailureEffect: 행마다 독립 (C4가 비어있으면 스킵)
    if (c4) {
      const feId = positionUUID('L1', rn, L1_FE_COL);
      failureEffects.push({
        id: feId,
        fmeaId,
        l1FuncId,
        category: c1,
        effect: c4,
        severity: 0, // FC시트에서 채움
      });
      resolver.registerFE(rn, feId, c4, c1);
    }
  }

  // ═══════════════════════════════════════════
  // Sheet 2: L2 (A1-A6) → L2Structure + L2Function + ProductChar + FailureMode
  // ═══════════════════════════════════════════

  const l2Structures: PosL2Structure[] = [];
  const l2Functions: PosL2Function[] = [];
  const processProductChars: PosProcessProductChar[] = [];
  const failureModes: PosFailureMode[] = [];

  const seenPno: Map<string, string> = new Map(); // 공정번호 → L2Structure id
  let l2Order = 0;
  let pcOrderIndex = 0;

  for (const row of l2Sheet.rows) {
    const rn = row.excelRow;
    const a1 = normalizeProcessNo(row.cells['A1']?.trim() || ''); // ★ AutoFix
    const a2 = row.cells['A2']?.trim() || '';
    const a3 = row.cells['A3']?.trim() || '';
    const a4 = row.cells['A4']?.trim() || '';
    const sc = row.cells['SC']?.trim() || '';
    const a5 = row.cells['A5']?.trim() || '';

    if (!a1) continue;

    // L2Structure: 공정번호별 1개
    let l2Id: string;
    if (!seenPno.has(a1)) {
      l2Id = positionUUID('L2', rn);
      seenPno.set(a1, l2Id);
      l2Structures.push({
        id: l2Id,
        fmeaId,
        l1Id: l1StructId,
        no: a1,
        name: a2,
        order: l2Order++,
      });
    } else {
      l2Id = seenPno.get(a1)!;
    }

    // L2Function: 행마다 독립
    const l2FuncId = positionUUID('L2', rn, L2_FUNC_COL);
    l2Functions.push({
      id: l2FuncId,
      fmeaId,
      l2StructId: l2Id,
      functionName: a3,
      productChar: a4,
      specialChar: sc || undefined,
    });

    // ProcessProductChar: 행마다 독립
    if (a4) {
      const pcId = positionUUID('L2', rn, L2_PC_COL);
      processProductChars.push({
        id: pcId,
        fmeaId,
        l2StructId: l2Id,
        name: a4,
        specialChar: sc || undefined,
        orderIndex: pcOrderIndex++,
      });

      // FailureMode: A5가 있으면 생성
      if (a5) {
        const fmId = positionUUID('L2', rn, L2_FM_COL);
        failureModes.push({
          id: fmId,
          fmeaId,
          l2FuncId,
          l2StructId: l2Id,
          productCharId: pcId,
          mode: a5,
        });
        resolver.registerFM(rn, fmId, a5, a1);
      }
    }
  }

  // ═══════════════════════════════════════════
  // Sheet 3: L3 (B1-B5) → L3Structure + L3Function + FailureCause
  // ═══════════════════════════════════════════

  const l3Structures: PosL3Structure[] = [];
  const l3Functions: PosL3Function[] = [];
  const failureCauses: PosFailureCause[] = [];
  let l3Order = 0;
  const l3RowNoB4 = new Map<number, { l3FuncId: string; l3Id: string; l2Id: string; pno: string; m4: string; b1: string }>();

  for (const row of l3Sheet.rows) {
    const rn = row.excelRow;
    const pno = normalizeProcessNo(row.cells['processNo']?.trim() || ''); // ★ AutoFix
    const m4 = normalizeM4(row.cells['m4']?.trim() || ''); // ★ AutoFix
    const b1 = row.cells['B1']?.trim() || '';
    const b2 = row.cells['B2']?.trim() || '';
    const b3 = row.cells['B3']?.trim() || '';
    const sc = row.cells['SC']?.trim() || '';
    const b4 = row.cells['B4']?.trim() || '';

    if (!pno) continue;

    // L3Structure: 행마다 독립
    const l2Id = seenPno.get(pno) || '';
    const l3Id = positionUUID('L3', rn);
    l3Structures.push({
      id: l3Id,
      fmeaId,
      l1Id: l1StructId,
      l2Id,
      m4: m4 || undefined,
      name: b1,
      order: l3Order++,
    });

    // L3Function: 행마다 독립
    const l3FuncId = positionUUID('L3', rn, L3_FUNC_COL);
    l3Functions.push({
      id: l3FuncId,
      fmeaId,
      l3StructId: l3Id,
      l2StructId: l2Id,
      functionName: b2,
      processChar: b3,
      specialChar: sc || undefined,
    });

    // FailureCause: B4가 있으면 생성 (없으면 FC 시트에서 보완)
    if (b4) {
      const fcId = positionUUID('L3', rn, L3_FC_COL);
      failureCauses.push({
        id: fcId,
        fmeaId,
        l3FuncId,
        l3StructId: l3Id,
        l2StructId: l2Id,
        cause: b4,
      });
      resolver.registerFC(rn, fcId, b4, pno, m4, b1);
    }
    // B4 없는 행을 FC 시트 보완용으로 등록 (cause는 FC 시트 파싱 후 채움)
    if (!b4) {
      l3RowNoB4.set(rn, { l3FuncId, l3Id, l2Id, pno, m4, b1 });
    }
  }


  // ═══════════════════════════════════════════
  // Sheet 4: FC (고장사슬) → FailureLink + RiskAnalysis
  // ═══════════════════════════════════════════

  const failureLinks: PosFailureLink[] = [];
  const riskAnalyses: PosRiskAnalysis[] = [];

  // FE severity 업데이트용 Map
  const feSeverityMap = new Map<string, number>();

  // ★ JSON 파서 FC carry-forward (parsePositionBasedJSON 경로)
  let prevJsonFEscope = '', prevJsonFE = '', prevJsonPno = '', prevJsonFM = '';
  let jsonCarryCount = 0;

  for (const row of fcSheet.rows) {
    const rn = row.excelRow;
    const c = row.cells;

    // AutoFix: 빈 셀 carry-forward
    if (!c['FE_scope'] && prevJsonFEscope) { c['FE_scope'] = prevJsonFEscope; jsonCarryCount++; }
    if (!c['FE'] && prevJsonFE)            { c['FE'] = prevJsonFE;            jsonCarryCount++; }
    if (!c['processNo'] && prevJsonPno)    { c['processNo'] = prevJsonPno;    jsonCarryCount++; }
    if (!c['FM'] && prevJsonFM)            { c['FM'] = prevJsonFM;            jsonCarryCount++; }
    if (c['FE_scope']) prevJsonFEscope = c['FE_scope'];
    if (c['FE'])       prevJsonFE      = c['FE'];
    if (c['processNo'])prevJsonPno     = c['processNo'];
    if (c['FM'])       prevJsonFM      = c['FM'];

    const l1Row = parseInt(c['L1_origRow'] || '', 10) || 0;
    const l2Row = parseInt(c['L2_origRow'] || '', 10) || 0;
    const l3Row = parseInt(c['L3_origRow'] || '', 10) || 0;

    const fcPno = normalizeProcessNo(c['processNo'] || ''); // ★ AutoFix
    const fcM4 = normalizeM4(c['m4'] || ''); // ★ AutoFix
    const fcScope = normalizeScope(c['FE_scope'] || ''); // ★ AutoFix

    const { feId, fmId, fcId } = resolver.resolve({
      l1Row,
      l2Row,
      l3Row,
      feText: c['FE'] || '',
      fmText: c['FM'] || '',
      fcText: c['FC'] || '',
      feScope: fcScope, // ★ scope 전달 (텍스트 폴백 매칭용)
      processNo: fcPno,
      m4: fcM4,
      workElement: c['WE'] || '',
    });

    const severity = parseInt(c['S'] || '0', 10) || 0;
    const occurrence = parseInt(c['O'] || '0', 10) || 0;
    const detection = parseInt(c['D'] || '0', 10) || 0;
    const ap = normalizeAP(c['AP']?.trim() || ''); // ★ AutoFix

    // FailureLink
    const flId = positionUUID('FC', rn);
    failureLinks.push({
      id: flId,
      fmeaId,
      fmId,
      feId,
      fcId,
      fmText: c['FM'] || undefined,
      feText: c['FE'] || undefined,
      fcText: c['FC'] || undefined,
      feScope: fcScope || undefined,
      fmProcess: fcPno || undefined,
      fcWorkElem: c['WE'] || undefined,
      fcM4: c['m4'] || undefined,
    });

    // RiskAnalysis
    riskAnalyses.push({
      id: `${flId}-RA`,
      fmeaId,
      linkId: flId,
      severity,
      occurrence,
      detection,
      ap,
      preventionControl: c['PC'] || undefined,
      detectionControl: c['DC'] || undefined,
    });

    // FE severity 추적 (최대값)
    if (feId && severity > (feSeverityMap.get(feId) || 0)) {
      feSeverityMap.set(feId, severity);
    }
  }

  // FE severity 업데이트
  for (const fe of failureEffects) {
    fe.severity = feSeverityMap.get(fe.id) || 0;
  }

  // ─── 통계 (엑셀 원본 항목별 정확한 카운트) ───

  // 엑셀 원본 항목별 카운트 (빈값/대시 제외)
  const countNonEmpty = (rows: SheetRow[], key: string) =>
    rows.filter(r => r.cells[key]?.trim() && !isEmptyValue(r.cells[key].trim())).length;

  const stats: Record<string, number> = {
    // 엑셀 원본 행수 (전체)
    excelL1Rows: l1Sheet.rows.length,
    excelL2Rows: l2Sheet.rows.length,
    excelL3Rows: l3Sheet.rows.length,
    excelFCRows: fcSheet.rows.length,
    // 엑셀 원본 항목별 카운트 (빈값/대시 제외)
    excelC1: countNonEmpty(l1Sheet.rows, 'C1'),
    excelC2: countNonEmpty(l1Sheet.rows, 'C2'),
    excelC3: countNonEmpty(l1Sheet.rows, 'C3'),
    excelC4: countNonEmpty(l1Sheet.rows, 'C4'),
    excelA1: countNonEmpty(l2Sheet.rows, 'A1'),
    excelA2: countNonEmpty(l2Sheet.rows, 'A2'),
    excelA3: countNonEmpty(l2Sheet.rows, 'A3'),
    excelA4: countNonEmpty(l2Sheet.rows, 'A4'),
    excelA5: countNonEmpty(l2Sheet.rows, 'A5'),
    excelA6: countNonEmpty(l2Sheet.rows, 'A6'),
    excelB1: countNonEmpty(l3Sheet.rows, 'B1'),
    excelB2: countNonEmpty(l3Sheet.rows, 'B2'),
    excelB3: countNonEmpty(l3Sheet.rows, 'B3'),
    excelB4: countNonEmpty(l3Sheet.rows, 'B4'),
    excelB5: countNonEmpty(l3Sheet.rows, 'B5'),
    // 파싱 결과 (DB 저장 대상)
    l1Functions: l1Functions.length,
    l2Structures: l2Structures.length,
    l3Structures: l3Structures.length,
    l2Functions: l2Functions.length,
    l3Functions: l3Functions.length,
    processProductChars: processProductChars.length,
    failureEffects: failureEffects.length,
    failureModes: failureModes.length,
    failureCauses: failureCauses.length,
    failureLinks: failureLinks.length,
    riskAnalyses: riskAnalyses.length,
    brokenFE: failureLinks.filter(fl => !fl.feId).length,
    brokenFM: failureLinks.filter(fl => !fl.fmId).length,
    brokenFC: failureLinks.filter(fl => !fl.fcId).length,
    autoFixes: autoFixes.length,
  };

  // ★ Import 파싱 결과 로그 (항목별 엑셀 원본 vs 파싱 결과)
  console.log(`[position-parser] ═══ 엑셀 원본 vs 파싱 결과 ═══`);
  console.log(`  L1: 엑셀 ${stats.excelL1Rows}행 (C1=${stats.excelC1}, C2=${stats.excelC2}, C3=${stats.excelC3}, C4=${stats.excelC4})`);
  console.log(`     → L1Func=${stats.l1Functions}, FE=${stats.failureEffects}`);
  console.log(`  L2: 엑셀 ${stats.excelL2Rows}행 (A1=${stats.excelA1}, A3=${stats.excelA3}, A4=${stats.excelA4}, A5=${stats.excelA5}, A6=${stats.excelA6})`);
  console.log(`     → L2Struct=${stats.l2Structures}, FM=${stats.failureModes}`);
  console.log(`  L3: 엑셀 ${stats.excelL3Rows}행 (B1=${stats.excelB1}, B2=${stats.excelB2}, B3=${stats.excelB3}, B4=${stats.excelB4}, B5=${stats.excelB5})`);
  console.log(`     → L3Struct=${stats.l3Structures}, FC=${stats.failureCauses}`);
  console.log(`  FC: 엑셀 ${stats.excelFCRows}행 → FL=${stats.failureLinks}, RA=${stats.riskAnalyses}`);
  if (stats.brokenFE > 0 || stats.brokenFM > 0 || stats.brokenFC > 0) {
    console.warn(`  ⚠️ 깨진 FK: FE=${stats.brokenFE} FM=${stats.brokenFM} FC=${stats.brokenFC}`);
  }
  if (jsonCarryCount > 0) {
    console.log(`  AutoFix FC carry-forward: ${jsonCarryCount}건 (FE/FM/공정번호 병합셀 자동복원)`);
    autoFixes.push({ code: 'FC_CARRY_FORWARD', message: `FC 병합셀 자동복원 ${jsonCarryCount}건` });
  }
  if (autoFixes.length > 0) {
    console.log(`  AutoFix ${autoFixes.length}건:`, autoFixes.map(f => `[${f.code}] ${f.message}`).join(', '));
  }

  return {
    fmeaId,
    l1Structure: { id: l1StructId, fmeaId, name: '' },
    l1Functions,
    l2Structures,
    l2Functions,
    l3Structures,
    l3Functions,
    processProductChars,
    failureEffects,
    failureModes,
    failureCauses,
    failureLinks,
    riskAnalyses,
    stats,
  };
}

// ═══════════════════════════════════════════
// ExcelJS Workbook → PositionBasedJSON 변환
// (브라우저/서버 공용 — ExcelJS 의존)
// ═══════════════════════════════════════════

/** 5시트 위치기반 포맷 감지 (시트명 기반) */
export function isPositionBasedFormat(sheetNames: string[]): boolean {
  const upper = sheetNames.map(n => n.toUpperCase());
  const hasL1 = upper.some(n => n.startsWith('L1'));
  const hasL2 = upper.some(n => n.startsWith('L2'));
  const hasL3 = upper.some(n => n.startsWith('L3'));
  const hasFC = upper.some(n => n.startsWith('FC') || n.startsWith('FL') || n.includes('고장사슬') || n.includes('FAILURE'));
  return hasL1 && hasL2 && hasL3 && hasFC;
}

/** 시트명 매칭 헬퍼 */
function findSheetByPrefix(sheetNames: string[], prefix: string): string | undefined {
  return sheetNames.find(n => n.toUpperCase().startsWith(prefix.toUpperCase()));
}

/** ExcelJS Row → 셀 문자열 추출 */
function excelCellStr(row: any, col: number): string {
  const cell = row.getCell(col);
  if (!cell || cell.value == null) return '';
  if (typeof cell.value === 'object' && 'richText' in cell.value) {
    return (cell.value.richText || []).map((r: any) => r.text || '').join('').trim();
  }
  // 숫자/날짜도 문자열로 변환
  return String(cell.value).trim();
}

/**
 * 헤더 행에서 컬럼 키워드 매칭 → 컬럼 번호 자동감지
 * 하드코딩 컬럼 번호 제거 — 엑셀 레이아웃 변경에 강건
 */
function detectColumns(ws: any, keywordMap: Record<string, string[]>): Record<string, number> {
  const result: Record<string, number> = {};
  // 1~3행에서 헤더 찾기
  for (let headerRow = 1; headerRow <= 3; headerRow++) {
    const row = ws.getRow(headerRow);
    if (!row) continue;
    const totalCols = Math.max(row.cellCount || 20, 500); // ★ 최대 500컬럼까지 스캔
    for (let c = 1; c <= totalCols; c++) {
      const val = excelCellStr(row, c).toUpperCase();
      if (!val) continue;
      for (const [key, keywords] of Object.entries(keywordMap)) {
        if (result[key]) continue; // 이미 찾음
        if (keywords.some(kw => val.includes(kw.toUpperCase()))) {
          result[key] = c;
        }
      }
    }
  }
  return result;
}

/** 헤더 행 번호 감지 (데이터 시작행 = 헤더행 + 1) */
function detectHeaderRow(ws: any, keywordMap: Record<string, string[]>): number {
  for (let r = 1; r <= 3; r++) {
    const row = ws.getRow(r);
    if (!row) continue;
    const totalCols = row.cellCount || 20;
    let matchCount = 0;
    for (let c = 1; c <= Math.min(totalCols + 5, 30); c++) {
      const val = excelCellStr(row, c).toUpperCase();
      for (const keywords of Object.values(keywordMap)) {
        if (keywords.some(kw => val.includes(kw.toUpperCase()))) matchCount++;
      }
    }
    if (matchCount >= 2) return r; // 2개 이상 매칭되면 헤더행
  }
  return 1; // 기본값
}

/**
 * ExcelJS Workbook → PositionBasedJSON 변환
 * ★ 헤더 키워드 자동감지 — 컬럼 번호 하드코딩 제거
 */
export function parsePositionBasedWorkbook(wb: any, targetId?: string): PositionAtomicData {
  const sheetNames = wb.worksheets.map((ws: any) => ws.name);

  const l1Name = findSheetByPrefix(sheetNames, 'L1');
  const l2Name = findSheetByPrefix(sheetNames, 'L2');
  const l3Name = findSheetByPrefix(sheetNames, 'L3');
  const fcName = findSheetByPrefix(sheetNames, 'FC') || findSheetByPrefix(sheetNames, 'FL');

  if (!l1Name || !l2Name || !l3Name || !fcName) {
    throw new Error(`Missing sheets: L1=${l1Name} L2=${l2Name} L3=${l3Name} FC=${fcName}`);
  }

  // ─── L1 시트 — 헤더 자동감지 ───
  const l1WS = wb.getWorksheet(l1Name);
  const l1ColMap = detectColumns(l1WS, {
    C1: ['C1', '구분', 'SCOPE', 'CATEGORY'],
    C2: ['C2', '제품기능', '제품 기능', 'FUNCTION'],
    C3: ['C3', '요구사항', '요구 사항', 'REQUIREMENT'],
    C4: ['C4', '고장영향', '고장 영향', 'FAILURE EFFECT'],
  });
  const l1Header = detectHeaderRow(l1WS, { C1: ['C1', '구분'], C2: ['C2', '제품기능'] });
  console.log(`[position-parser] L1 columns: ${JSON.stringify(l1ColMap)}, headerRow: ${l1Header}`);

  const l1Rows: SheetRow[] = [];
  l1WS.eachRow((row: any, rn: number) => {
    if (rn <= l1Header) return;
    l1Rows.push({
      excelRow: rn, posId: `L1-R${rn}`,
      cells: {
        C1: excelCellStr(row, l1ColMap.C1 || 1),
        C2: excelCellStr(row, l1ColMap.C2 || 2),
        C3: excelCellStr(row, l1ColMap.C3 || 3),
        C4: excelCellStr(row, l1ColMap.C4 || 4),
      },
    });
  });

  // ─── L2 시트 — 헤더 자동감지 ───
  const l2WS = wb.getWorksheet(l2Name);
  const l2ColMap = detectColumns(l2WS, {
    A1: ['A1', '공정번호', '공정 번호', 'PROCESS NO'],
    A2: ['A2', '공정명', '공정 명', 'PROCESS NAME'],
    A3: ['A3', '공정기능', '공정 기능'],
    A4: ['A4', '제품특성', '제품 특성', 'PRODUCT CHAR'],
    SC: ['SC', '특별특성', '특별 특성', 'SPECIAL'],
    A5: ['A5', '고장형태', '고장 형태', 'FAILURE MODE'],
    A6: ['A6', '검출관리', '검출 관리', 'DETECTION'],
  });
  const l2Header = detectHeaderRow(l2WS, { A1: ['A1', '공정번호'], A5: ['A5', '고장형태'] });
  console.log(`[position-parser] L2 columns: ${JSON.stringify(l2ColMap)}, headerRow: ${l2Header}`);

  const l2Rows: SheetRow[] = [];
  l2WS.eachRow((row: any, rn: number) => {
    if (rn <= l2Header) return;
    l2Rows.push({
      excelRow: rn, posId: `L2-R${rn}`,
      cells: {
        A1: excelCellStr(row, l2ColMap.A1 || 1),
        A2: excelCellStr(row, l2ColMap.A2 || 2),
        A3: excelCellStr(row, l2ColMap.A3 || 3),
        A4: excelCellStr(row, l2ColMap.A4 || 4),
        SC: excelCellStr(row, l2ColMap.SC || 5),
        A5: excelCellStr(row, l2ColMap.A5 || 6),
        A6: excelCellStr(row, l2ColMap.A6 || 7),
      },
    });
  });

  // ─── L3 시트 — 헤더 자동감지 ───
  const l3WS = wb.getWorksheet(l3Name);
  const l3ColMap = detectColumns(l3WS, {
    processNo: ['공정번호', '공정 번호', 'PROCESS NO'],
    m4: ['4M', 'M4', '분류'],
    B1: ['B1', '작업요소', '작업 요소', 'WORK ELEMENT'],
    B2: ['B2', '요소기능', '요소 기능'],
    B3: ['B3', '공정특성', '공정 특성', 'PROCESS CHAR'],
    SC: ['SC', '특별특성', '특별 특성', 'SPECIAL'],
    B4: ['B4', '고장원인', '고장 원인', 'FAILURE CAUSE'],
    B5: ['B5', '예방관리', '예방 관리', 'PREVENTION'],
  });
  const l3Header = detectHeaderRow(l3WS, { B1: ['B1', '작업요소'], B4: ['B4', '고장원인'] });
  console.log(`[position-parser] L3 columns: ${JSON.stringify(l3ColMap)}, headerRow: ${l3Header}`);
  // ★ B4 감지 실패 시 경고
  if (!l3ColMap.B4) {
    console.warn('[position-parser] ⚠️ L3 시트 B4(고장원인) 컬럼 감지 실패 — fallback col 7 사용. 헤더 확인 필요');
  }

  const l3Rows: SheetRow[] = [];
  l3WS.eachRow((row: any, rn: number) => {
    if (rn <= l3Header) return;
    l3Rows.push({
      excelRow: rn, posId: `L3-R${rn}`,
      cells: {
        processNo: excelCellStr(row, l3ColMap.processNo || 1),
        m4: excelCellStr(row, l3ColMap.m4 || 2),
        B1: excelCellStr(row, l3ColMap.B1 || 3),
        B2: excelCellStr(row, l3ColMap.B2 || 4),
        B3: excelCellStr(row, l3ColMap.B3 || 5),
        SC: excelCellStr(row, l3ColMap.SC || 6),
        B4: excelCellStr(row, l3ColMap.B4 || 7),
        B5: excelCellStr(row, l3ColMap.B5 || 8),
      },
    });
  });

  // ─── FC 시트 — 헤더 자동감지 ───
  const fcWS = wb.getWorksheet(fcName);
  const fcColMap = detectColumns(fcWS, {
    FE_scope: ['FE구분', 'FE 구분', 'SCOPE', 'FE_SCOPE'],
    FE: ['FE(고장', 'FE(', '고장영향', 'FAILURE EFFECT'],  // ★ 'FE' 단독 제거 — FE구분 오매칭 방지
    processNo: ['공정번호', '공정 번호', 'PROCESS NO', 'L2-1.공정번호'],
    FM: ['FM(', 'FM(고장', '고장형태', 'FAILURE MODE'],  // ★ 'FM' 단독 제거
    m4: ['4M', 'M4'],
    WE: ['WE', '작업요소', 'WORK ELEMENT'],
    FC: ['FC', '고장원인', 'FAILURE CAUSE'],
    PC: ['PC', '예방관리', 'PREVENTION'],
    DC: ['DC', '검출관리', 'DETECTION'],
    S: ['S', '심각도', 'SEVERITY'],
    O: ['O', '발생도', 'OCCURRENCE'],
    D: ['D', '검출도'],
    AP: ['AP', 'ACTION PRIORITY', '우선순위'],
    L1_origRow: ['L1원본행', 'L1행', 'L1 ROW', 'L1_ORIG'],
    L2_origRow: ['L2원본행', 'L2행', 'L2 ROW', 'L2_ORIG'],
    L3_origRow: ['L3원본행', 'L3행', 'L3 ROW', 'L3_ORIG'],
  });
  const fcHeader = detectHeaderRow(fcWS, { FM: ['FM', '고장형태'], FC: ['FC', '고장원인'] });
  console.log(`[position-parser] FC columns: ${JSON.stringify(fcColMap)}, headerRow: ${fcHeader}`);

  // ★ FC 시트 AutoFix carry-forward: 병합셀로 인해 FM/FE/processNo가 빈 경우 이전 행 값 유지
  let prevFEscope = '', prevFE = '', prevPno = '', prevFM = '';
  const fcCarryFixCount = { feScope: 0, feText: 0, pno: 0, fm: 0 };
  const fcRows: SheetRow[] = [];
  fcWS.eachRow((row: any, rn: number) => {
    if (rn <= fcHeader) return;
    const rawFEscope = excelCellStr(row, fcColMap.FE_scope || 1);
    const rawFEtext  = excelCellStr(row, fcColMap.FE || 2);
    const rawPno     = excelCellStr(row, fcColMap.processNo || 3);
    const rawFM      = excelCellStr(row, fcColMap.FM || 4);

    // AutoFix carry-forward 적용 + 카운트
    const feScope = rawFEscope || (prevFEscope ? (fcCarryFixCount.feScope++, prevFEscope) : '');
    const feText  = rawFEtext  || (prevFE      ? (fcCarryFixCount.feText++,  prevFE)      : '');
    const pno     = rawPno     || (prevPno     ? (fcCarryFixCount.pno++,     prevPno)     : '');
    const fm      = rawFM      || (prevFM      ? (fcCarryFixCount.fm++,      prevFM)      : '');

    if (feScope) prevFEscope = feScope;
    if (feText)  prevFE      = feText;
    if (pno)     prevPno     = pno;
    if (fm)      prevFM      = fm;
    fcRows.push({
      excelRow: rn, posId: `FC-R${rn}`,
      cells: {
        FE_scope: feScope,
        FE: feText,
        processNo: pno,
        FM: fm,
        m4: excelCellStr(row, fcColMap.m4 || 5),
        WE: excelCellStr(row, fcColMap.WE || 6),
        FC: excelCellStr(row, fcColMap.FC || 7),
        PC: excelCellStr(row, fcColMap.PC || 8),
        DC: excelCellStr(row, fcColMap.DC || 9),
        // ★ S 없는 Excel 대응: S 감지 실패 시 '' (심각도는 FE에서 별도 설정)
        S: fcColMap.S ? excelCellStr(row, fcColMap.S) : '',
        O: excelCellStr(row, fcColMap.O || 10),
        D: excelCellStr(row, fcColMap.D || 11),
        AP: excelCellStr(row, fcColMap.AP || 12),
        L1_origRow: fcColMap.L1_origRow ? excelCellStr(row, fcColMap.L1_origRow) : '',
        L2_origRow: fcColMap.L2_origRow ? excelCellStr(row, fcColMap.L2_origRow) : '',
        L3_origRow: fcColMap.L3_origRow ? excelCellStr(row, fcColMap.L3_origRow) : '',
      },
    });
  });

  console.log(`[position-parser] Rows: L1=${l1Rows.length} L2=${l2Rows.length} L3=${l3Rows.length} FC=${fcRows.length}`);
  // ★ AutoFix carry-forward 결과 보고
  const totalCarry = fcCarryFixCount.feScope + fcCarryFixCount.feText + fcCarryFixCount.pno + fcCarryFixCount.fm;
  if (totalCarry > 0) {
    console.log(`[position-parser] ✅ AutoFix FC carry-forward ${totalCarry}건:`,
      `FE_scope=${fcCarryFixCount.feScope}`,
      `FE=${fcCarryFixCount.feText}`,
      `공정번호=${fcCarryFixCount.pno}`,
      `FM=${fcCarryFixCount.fm}`);
  }
  // ★ B4 감지 진단: 빈 B4 행 출력
  const emptyB4Rows = l3Rows.filter(r => !r.cells.B4?.trim());
  if (emptyB4Rows.length > 0) {
    console.warn(`[position-parser] ⚠️ L3 시트 B4 빈값 ${emptyB4Rows.length}건:`, emptyB4Rows.map(r => `R${r.excelRow}(${r.cells.processNo}/${r.cells.m4}/${(r.cells.B1||'').substring(0,15)})`).join(', '));
    console.warn(`[position-parser] B4 컬럼 감지: col=${l3ColMap.B4 || 7}(fallback). 실제 B4 헤더 확인 필요`);
  }

  const json: PositionBasedJSON = {
    targetId: targetId || '',
    sheets: {
      L1: { sheetName: l1Name, headers: [], rows: l1Rows },
      L2: { sheetName: l2Name, headers: [], rows: l2Rows },
      L3: { sheetName: l3Name, headers: [], rows: l3Rows },
      FC: { sheetName: fcName, headers: [], rows: fcRows },
    },
  };

  return parsePositionBasedJSON(json);
}

// ═══════════════════════════════════════════
// PositionAtomicData → ImportedFlatData[] 변환
// (미리보기 UI + 통계 테이블 호환용)
// ═══════════════════════════════════════════

export interface ImportedFlatDataCompat {
  id: string;
  processNo: string;
  category: 'A' | 'B' | 'C';
  itemCode: string;
  value: string;
  m4?: string;
  specialChar?: string;
  parentItemId?: string;
  excelRow?: number;
  createdAt: Date;
  rowSpan: number;
}

/**
 * PositionAtomicData → ImportedFlatData[] 변환
 * position-parser 결과를 레거시 flatData 형식으로 변환 → 미리보기/통계 UI 호환
 */
export function atomicToFlatData(data: PositionAtomicData): ImportedFlatDataCompat[] {
  const flat: ImportedFlatDataCompat[] = [];
  const now = new Date();

  // ─── C (L1) ───
  // C1: L1Function.category (고유 scope별 1개)
  const seenC1 = new Set<string>();
  for (const f of data.l1Functions) {
    if (!seenC1.has(f.category)) {
      seenC1.add(f.category);
      flat.push({ id: `C1-${f.category}`, processNo: f.category, category: 'C', itemCode: 'C1', value: f.category, createdAt: now, rowSpan: 1 });
    }
  }

  // C2: L1Function.functionName (고유값별 1개)
  const seenC2 = new Set<string>();
  for (const f of data.l1Functions) {
    const key = `${f.category}|${f.functionName}`;
    if (!seenC2.has(key)) {
      seenC2.add(key);
      flat.push({ id: f.id, processNo: f.category, category: 'C', itemCode: 'C2', value: f.functionName, createdAt: now, rowSpan: 1 });
    }
  }

  // C3: L1Function.requirement (모든 L1Function = 고유 C1+C2+C3 조합)
  for (const f of data.l1Functions) {
    flat.push({ id: `${f.id}-C3`, processNo: f.category, category: 'C', itemCode: 'C3', value: f.requirement, parentItemId: f.id, createdAt: now, rowSpan: 1 });
  }

  // C4: FailureEffect (행마다 독립)
  for (const fe of data.failureEffects) {
    flat.push({ id: fe.id, processNo: fe.category, category: 'C', itemCode: 'C4', value: fe.effect, parentItemId: fe.l1FuncId, createdAt: now, rowSpan: 1 });
  }

  // ─── A (L2) ───
  // A1: L2Structure.no
  for (const s of data.l2Structures) {
    flat.push({ id: s.id, processNo: s.no, category: 'A', itemCode: 'A1', value: s.no, createdAt: now, rowSpan: 1 });
  }

  // A2: L2Structure.name
  for (const s of data.l2Structures) {
    flat.push({ id: `${s.id}-A2`, processNo: s.no, category: 'A', itemCode: 'A2', value: s.name, createdAt: now, rowSpan: 1 });
  }

  // A3: L2Function.functionName
  for (const f of data.l2Functions) {
    const l2 = data.l2Structures.find(s => s.id === f.l2StructId);
    flat.push({ id: f.id, processNo: l2?.no || '', category: 'A', itemCode: 'A3', value: f.functionName, createdAt: now, rowSpan: 1 });
  }

  // A4: ProcessProductChar.name
  for (const pc of data.processProductChars) {
    const l2 = data.l2Structures.find(s => s.id === pc.l2StructId);
    flat.push({ id: pc.id, processNo: l2?.no || '', category: 'A', itemCode: 'A4', value: pc.name, specialChar: pc.specialChar || undefined, createdAt: now, rowSpan: 1 });
  }

  // A5: FailureMode.mode
  for (const fm of data.failureModes) {
    const l2 = data.l2Structures.find(s => s.id === fm.l2StructId);
    flat.push({ id: fm.id, processNo: l2?.no || '', category: 'A', itemCode: 'A5', value: fm.mode, createdAt: now, rowSpan: 1 });
  }

  // A6: RiskAnalysis.detectionControl (FL→RA에서 DC 추출, 공정별 고유)
  const seenA6 = new Set<string>();
  for (const ra of data.riskAnalyses) {
    const fl = data.failureLinks.find(l => l.id === ra.linkId);
    if (!fl || !ra.detectionControl) continue;
    const pno = fl.fmProcess || '';
    const key = `${pno}|${ra.detectionControl}`;
    if (seenA6.has(key)) continue;
    seenA6.add(key);
    flat.push({ id: `${ra.id}-A6`, processNo: pno, category: 'A', itemCode: 'A6', value: ra.detectionControl, createdAt: now, rowSpan: 1 });
  }

  // ─── B (L3) ───
  // B1: L3Structure.name
  for (const s of data.l3Structures) {
    const l2 = data.l2Structures.find(l => l.id === s.l2Id);
    flat.push({ id: s.id, processNo: l2?.no || '', category: 'B', itemCode: 'B1', value: s.name, m4: s.m4 || undefined, createdAt: now, rowSpan: 1 });
  }

  // B2/B3/SC: L3Function 기준 (1 L3Function = 1 B2 = 1 B3, 1:N 구조 정확 반영)
  const l3StructMap = new Map(data.l3Structures.map(s => [s.id, s]));
  for (const f of data.l3Functions) {
    const l3 = l3StructMap.get(f.l3StructId);
    const l2 = l3 ? data.l2Structures.find(d => d.id === l3.l2Id) : undefined;
    const pno = l2?.no || '';
    const m4 = l3?.m4 || undefined;
    const b1Id = f.l3StructId; // B1.id = L3Structure.id (Rule 1.7.5)
    // B2
    flat.push({ id: f.id, processNo: pno, category: 'B', itemCode: 'B2', value: f.functionName, m4, parentItemId: b1Id, createdAt: now, rowSpan: 1 });
    // B3 (공정특성)
    const sc = f.specialChar || undefined;
    flat.push({ id: `${f.id}-B3`, processNo: pno, category: 'B', itemCode: 'B3', value: f.processChar, specialChar: sc, m4, parentItemId: b1Id, createdAt: now, rowSpan: 1 });
    // SC: 특별특성 별도 itemCode
    if (sc) {
      flat.push({ id: `${f.id}-SC`, processNo: pno, category: 'B', itemCode: 'SC' as any, value: sc, m4, createdAt: now, rowSpan: 1 });
    }
  }

  // B4: FailureCause.cause — m4 포함 (L3Structure에서)
  const l3StructByFc = new Map(data.failureCauses.map(fc => [fc.id, l3StructMap.get(fc.l3StructId)]));
  for (const fc of data.failureCauses) {
    const l2 = data.l2Structures.find(s => s.id === fc.l2StructId);
    const l3 = l3StructByFc.get(fc.id);
    // B4.parentItemId = B3.id = "${L3Function.id}-B3" (Rule 1.7.5: B4→B3 FK)
    const b3Id = fc.l3FuncId ? `${fc.l3FuncId}-B3` : undefined;
    flat.push({ id: fc.id, processNo: l2?.no || '', category: 'B', itemCode: 'B4', value: fc.cause, m4: l3?.m4 || undefined, parentItemId: b3Id, createdAt: now, rowSpan: 1 });
  }

  // B5: RiskAnalysis.preventionControl (FL→RA에서 PC 추출, 공정별 고유)
  const seenB5 = new Set<string>();
  for (const ra of data.riskAnalyses) {
    const fl = data.failureLinks.find(l => l.id === ra.linkId);
    if (!fl || !ra.preventionControl) continue;
    const pno = fl.fmProcess || '';
    const key = `${pno}|${ra.preventionControl}`;
    if (seenB5.has(key)) continue;
    seenB5.add(key);
    flat.push({ id: `${ra.id}-B5`, processNo: pno, category: 'B', itemCode: 'B5', value: ra.preventionControl, createdAt: now, rowSpan: 1 });
  }

  return flat;
}
