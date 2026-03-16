/**
 * @file excel-parser-single-sheet.ts
 * @description PFMEA 단일시트 파서 — "fmea result" 형식 (STEP A / STEP B)
 * @created 2026-02-22
 *
 * ★ STEP A: 구조+기능+고장 분석 (C3 요구사항, A4 제품특성, B3 공정특성 포함)
 * ★ STEP B: 위험분석 포함 (B5 예방관리, A6 검출관리, SOD/AP 포함)
 *
 * 기존 multi-sheet parser와 동일한 ParseResult 반환
 * → 다운스트림 코드 변경 없이 단일시트 엑셀 지원
 *
 * 헤더 기반 동적 컬럼 감지:
 * - 각 열 헤더 키워드로 itemCode 자동 매핑
 * - "4M", "작업요소", "구분" 등 중복 키워드는 출현 순서로 구분
 * - STEP A/B 형식 차이 자동 감지 (A4/B3 분리 vs 합병)
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


import type ExcelJS from 'exceljs';
import type { ParseResult, ProcessRelation, ProductRelation, ParseStatistics, ItemCodeStat, ProcessItemStat } from './excel-parser';
import type { MasterFailureChain } from './types/masterFailureChain';
import { cellValueToString } from './excel-parser-utils';
import { getMergedCellValue, getMergeSpan } from '@/lib/excel-data-range';
import { m4SortValue } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import { scanRawFingerprint, verifyParsing } from './excel-parser-verification';

// ─── Column Role Types ──────────────────────────────────────────

/** 컬럼 역할 */
type ColumnRole =
  | 'L1_NAME' | 'PROC_NO_NAME'
  | 'STRUCT_4M' | 'FUNC_4M' | 'FAIL_4M'
  | 'B1' | 'B2' | 'B3' | 'B4' | 'B5'
  | 'C1' | 'C2' | 'C3' | 'C4'
  | 'A3' | 'A4' | 'A5' | 'A6'
  | 'SC_A4' | 'SC_B3'
  | 'FE_SCOPE'
  | 'SEVERITY' | 'OCCURRENCE' | 'DETECTION' | 'AP';

interface ColumnMapping {
  col: number;       // 1-based ExcelJS column
  role: ColumnRole;
}

// ─── Constants ──────────────────────────────────────────────────

const MAX_HEADER_SCAN = 15;
const MAX_COL_SCAN = 40;
const MAX_ROWS = 500;
const MAX_EMPTY_ROWS = 10;

/**
 * 고유 키워드 매칭 규칙 (중복 불가, 우선순위 높은 순)
 *
 * 주의: "공정 기능/제품특성" (STEP B) = A3만 (A4 미분리)
 *       "작업요소기능/공정특성" (STEP B) = B2만 (B3 미분리)
 */
/**
 * ★ 공백 제거 정규화 — 엑셀 헤더의 내부 공백 변형 대응
 * "작업요소 기능" → "작업요소기능", "공정 특성" → "공정특성"
 */
const noSp = (s: string) => s.replace(/\s/g, '');

const UNIQUE_RULES: { check: (h: string) => boolean; role: ColumnRole }[] = [
  // 최고 우선순위: 절대 중복 불가
  { check: h => h.includes('완제품명'), role: 'L1_NAME' },
  { check: h => h.includes('요구사항'), role: 'C3' },
  { check: h => (h.includes('심각도') || h.startsWith('s(') || h.startsWith('severity')), role: 'SEVERITY' },
  { check: h => (h.includes('발생도') || h.startsWith('o(') || h.startsWith('occurrence')), role: 'OCCURRENCE' },
  { check: h => h.includes('검출도') && !h.includes('검출관리'), role: 'DETECTION' },
  { check: h => h === 'ap' || h.includes('조치우선순위') || h.includes('action priority'), role: 'AP' },
  // 예방/검출 관리
  { check: h => noSp(h).includes('예방관리'), role: 'B5' },
  { check: h => noSp(h).includes('검출관리') && !noSp(h).includes('검출도'), role: 'A6' },
  // 고장 항목
  { check: h => noSp(h).includes('고장영향'), role: 'C4' },
  { check: h => noSp(h).includes('고장형태') || noSp(h).includes('고장모드'), role: 'A5' },
  { check: h => noSp(h).includes('고장원인'), role: 'B4' },
  // L1 기능
  { check: h => noSp(h).includes('완제품기능') || (noSp(h).includes('제품기능') && !h.includes('특성')), role: 'C2' },
  // 특별특성 (A4/B3용) — "특별특성(A4)", "특별특성(B3)" 등
  { check: h => h.includes('특별특성') && h.includes('a4'), role: 'SC_A4' },
  { check: h => h.includes('특별특성') && h.includes('b3'), role: 'SC_B3' },
  // 제품특성 (단독) — "공정 기능/제품특성" 복합헤더 제외
  { check: h => { const n = noSp(h); return n.includes('제품특성') && !n.includes('공정기능') && !n.includes('특별'); }, role: 'A4' },
  // 공정특성 (단독) — "작업요소기능/공정특성" 복합헤더 제외
  { check: h => { const n = noSp(h); return n.includes('공정특성') && !n.includes('요소기능') && !n.includes('작업요소기능') && !n.includes('특별'); }, role: 'B3' },
  // 작업요소기능 / 요소기능 → B2
  { check: h => { const n = noSp(h); return n.includes('작업요소기능') || n.includes('요소기능'); }, role: 'B2' },
  // 공정기능 → A3
  { check: h => { const n = noSp(h); return n.includes('공정기능') || n.includes('메인공정기능'); }, role: 'A3' },
];

// ─── Exported Functions ─────────────────────────────────────────

/**
 * 시트가 단일시트 FMEA 형식인지 감지 (STEP B — 고장분석 포함)
 * 한 행에 5개 이상 FMEA 키워드가 있으면 단일시트로 판단
 */
export function isSingleSheetFmea(sheet: ExcelJS.Worksheet): boolean {
  const keywords = ['완제품', '공정', '작업요소', '구분', '고장', '4m', '예방', '검출'];

  for (let r = 1; r <= Math.min(MAX_HEADER_SCAN, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const cellCount = Math.min(row.cellCount || 20, MAX_COL_SCAN);
    const seen = new Set<string>();

    for (let c = 1; c <= cellCount; c++) {
      const val = cellValueToString(row.getCell(c).value).toLowerCase();
      if (!val) continue;
      for (const kw of keywords) {
        if (val.includes(kw) && !seen.has(kw)) {
          seen.add(kw);
        }
      }
    }
    if (seen.size >= 5) return true;
  }
  return false;
}

/**
 * ★★★ 2026-02-25: STEP A 시트 감지 (구조+기능 전용)
 *
 * STEP A는 고장 관련 키워드 없이 구조/기능 데이터만 포함:
 *   A1~A4 (공정번호, 공정명, 공정기능, 제품특성)
 *   B1~B3 (작업요소, 요소기능, 공정특성)
 *   C1~C3 (구분, 제품기능, 요구사항)
 *
 * 고장(고장형태/고장원인/고장영향), 예방, 검출 키워드 없어도 감지 가능.
 * 한 행에 3개 이상 구조/기능 키워드가 있으면 STEP A 시트로 판단.
 */
export function isStepASheet(sheet: ExcelJS.Worksheet): boolean {
  const structKeywords = ['공정', '작업요소', '구분', '4m', '기능', '특성', '요구', '요소'];

  for (let r = 1; r <= Math.min(MAX_HEADER_SCAN, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const cellCount = Math.min(row.cellCount || 20, MAX_COL_SCAN);
    const seen = new Set<string>();

    for (let c = 1; c <= cellCount; c++) {
      const val = cellValueToString(row.getCell(c).value).toLowerCase();
      if (!val) continue;
      for (const kw of structKeywords) {
        if (val.includes(kw) && !seen.has(kw)) {
          seen.add(kw);
        }
      }
    }
    if (seen.size >= 3) return true;
  }
  return false;
}

/**
 * 단일시트 FMEA 파서 메인 함수
 * STEP A / STEP B "fmea result" 형식 → ParseResult
 */
export function parseSingleSheetFmea(sheet: ExcelJS.Worksheet): ParseResult {
  const errors: string[] = [];

  // 1. 헤더 행 + 컬럼 매핑
  const headerInfo = findHeaderRow(sheet);
  if (!headerInfo) {
    return fail('단일시트 FMEA 헤더를 찾을 수 없습니다.');
  }
  const { headerRow, columns } = headerInfo;

  // 매핑 로그
  const itemRoles = columns.filter(c =>
    ['C1', 'C2', 'C3', 'C4', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5'].includes(c.role)
  );
  if (itemRoles.length < 3) {
    errors.push(`⚠️ FMEA 항목 컬럼 ${itemRoles.length}개만 감지 (최소 3개 필요)`);
  }

  // ★ 진단: B2/B3 감지 결과 로그
  const b2Col = columns.find(c => c.role === 'B2');
  const b3Col = columns.find(c => c.role === 'B3');
  const a3Col = columns.find(c => c.role === 'A3');
  if (!b2Col || !b3Col) {
    // 헤더 원문 덤프 (디버깅용)
    const row = sheet.getRow(headerRow);
    const hdrs: string[] = [];
    for (let c = 1; c <= Math.min(row.cellCount || 20, MAX_COL_SCAN); c++) {
      const v = cellValueToString(row.getCell(c).value).trim();
      if (v) hdrs.push(`col${c}="${v}"`);
    }
  }

  // 2. 데이터 시작 행 찾기
  const dataStartRow = findDataStartRow(sheet, headerRow, columns);

  // ★ v2.5.3: 원본 핑거프린트 스캔 (파싱 전 — 독립 스캔)
  const procCol = columns.find(c => c.role === 'PROC_NO_NAME')?.col || 0;
  const a5Col = columns.find(c => c.role === 'A5')?.col || 0;
  const b4Col = columns.find(c => c.role === 'B4')?.col || 0;
  const c4Col = columns.find(c => c.role === 'C4')?.col || 0;
  const rawFingerprint = (procCol > 0 && a5Col > 0 && b4Col > 0)
    ? scanRawFingerprint(sheet, dataStartRow, procCol, a5Col, b4Col, c4Col)
    : undefined;

  // 3. 파싱
  const processMap = new Map<string, ProcessRelation>();
  const productMap = new Map<string, ProductRelation>();
  const seen = new Set<string>();   // 중복 방지 (processNo|field|value|m4)
  const counter = createParseCounter();  // ★ v2.5.1: 파싱 통계 수집

  // 컬럼 역할→열번호 맵 (메타데이터 기록용)
  const roleColMap: Partial<Record<ColumnRole, number>> = {};
  for (const cm of columns) roleColMap[cm.role] = cm.col;

  let consecutiveEmpty = 0;
  let rowCount = 0;
  const maxRow = Math.min(sheet.rowCount, dataStartRow + MAX_ROWS - 1);

  // ── 행별 고장사슬 추출 (FM↔FC↔FE) ──
  // 각 행 = 하나의 고장사슬. 기존 migrateToAtomicDB가 이 데이터로 원자성 DB 구축
  const chains: MasterFailureChain[] = [];
  let chainIdx = 0;

  for (let r = dataStartRow; r <= maxRow; r++) {
    // 각 컬럼에서 값 읽기 (병합 셀 자동 처리)
    const vals: Partial<Record<ColumnRole, string>> = {};
    for (const cm of columns) {
      const raw = getMergedCellValue(sheet, r, cm.col);
      if (raw) vals[cm.role] = raw.trim();
    }

    // 공정번호 추출 (예: "10번-자재입고" → "10")
    const procStr = vals.PROC_NO_NAME || '';
    const procNoMatch = procStr.match(/^(\d+)/);
    const processNo = procNoMatch ? procNoMatch[1] : '';
    const processName = procStr.replace(/^\d+[-번]?\s*/, '').trim();

    // 빈 행 감지
    if (!processNo && !vals.C1 && !vals.A3 && !vals.B2) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= MAX_EMPTY_ROWS) break;
      continue;
    }
    consecutiveEmpty = 0;
    rowCount++;

    // 공통공정 변환
    const normProcNo = (processNo === '0' || processNo === '00') ? '공통' : processNo;

    // 4M 정규화 — ★ func4M/fail4M이 비어있으면 struct4M 상속
    // FMEA 단일시트에서 4M 컬럼이 1개만 있으면 STRUCT_4M만 감지됨
    // B2/B3의 func4M과 B4의 fail4M이 ''가 되어 B1의 m4와 불일치 → 누락 원인
    const struct4M = normalize4M(vals.STRUCT_4M);
    const func4M = normalize4M(vals.FUNC_4M) || struct4M;
    const fail4M = normalize4M(vals.FAIL_4M) || struct4M;

    // ── 고장사슬 추출: 행별 FM↔FC↔FE (원자성 DB용) ──
    // v3.0: Forward-fill 제거 — 병합셀 값은 getMergedCellValue에서 직접 읽음
    const sevRaw = vals.SEVERITY ? parseInt(vals.SEVERITY, 10) : 0;

    // ★ 각 행에 A5(고장형태)+B4(고장원인)가 있으면 = 하나의 고장사슬
    const rowFM = vals.A5 && isValid(vals.A5) ? vals.A5 : undefined;
    const rowFE = vals.C4 && isValid(vals.C4) ? vals.C4 : undefined;
    if (normProcNo && rowFM && vals.B4 && isValid(vals.B4)) {
      const oVal = vals.OCCURRENCE ? parseInt(vals.OCCURRENCE, 10) : undefined;
      const dVal = vals.DETECTION ? parseInt(vals.DETECTION, 10) : undefined;
      const scopeRaw = vals.FE_SCOPE || vals.C1 || '';

      const chainSC = vals.SC_A4 || vals.SC_B3 || undefined;
      chains.push({
        id: `fc-${chainIdx++}`,
        processNo: normProcNo,
        m4: fail4M || struct4M || undefined,
        workElement: vals.B1 ? vals.B1.replace(/^\d+번[-\s]?/, '') : undefined,
        feValue: rowFE || '',
        feScope: scopeRaw ? normalizeC1(scopeRaw) : undefined,
        feSeverity: sevRaw || undefined,
        fmValue: rowFM,
        fcValue: vals.B4,
        pcValue: vals.B5 || undefined,
        dcValue: vals.A6 || undefined,
        severity: sevRaw || undefined,
        occurrence: oVal,
        detection: dVal,
        ap: (vals.AP || undefined) as 'H' | 'M' | 'L' | undefined,
        l2Function: vals.A3 || undefined,
        productChar: vals.A4 || undefined,
        l3Function: vals.B2 || undefined,
        processChar: vals.B3 || undefined,
        specialChar: chainSC,
        excelRow: r,
        parentChainId: `${normProcNo}-FM-${rowFM}`,
        mergeGroupId: `${normProcNo}-row${r}`,
      });
    }

    // ── Process 데이터 (A/B 레벨) ──
    if (normProcNo) {
      if (!processMap.has(normProcNo)) {
        processMap.set(normProcNo, createEmptyProcess(normProcNo, processName));
      }
      const proc = processMap.get(normProcNo)!;
      if (processName && !proc.processName) proc.processName = processName;

      const setMeta = (code: string, arr: string[]) => {
        if (!proc.itemMeta) proc.itemMeta = {};
        const col = roleColMap[code as ColumnRole];
        proc.itemMeta[`${code}-${arr.length}`] = {
          excelRow: r,
          excelCol: col,
          rowSpan: col ? getMergeSpan(sheet, r, col).rowSpan : undefined,
          mergeGroupId: `${normProcNo}-${code}`,
        };
      };

      addIfNew(seen, `${normProcNo}|A3|${vals.A3}`, vals.A3, v => { setMeta('A3', proc.processDesc); proc.processDesc.push(v); }, counter, normProcNo, 'A3');
      addIfNew(seen, `${normProcNo}|A4|${vals.A4}`, vals.A4, v => {
        setMeta('A4', proc.productChars);
        proc.productChars.push(v);
        proc.productCharsSpecialChar.push(vals.SC_A4 || '');
      }, counter, normProcNo, 'A4');
      addIfNew(seen, `${normProcNo}|A5|${vals.A5}`, vals.A5, v => { setMeta('A5', proc.failureModes); proc.failureModes.push(v); }, counter, normProcNo, 'A5');
      addIfNew(seen, `${normProcNo}|A6|${vals.A6}`, vals.A6, v => { setMeta('A6', proc.detectionCtrls); proc.detectionCtrls.push(v); }, counter, normProcNo, 'A6');

      // ★★★ 2026-03-02: B1 "XX번-장비명" → "장비명" 접두사 제거 ★★★
      const b1Clean = vals.B1 ? vals.B1.replace(/^\d+번[-\s]?/, '') : vals.B1;
      addIfNew(seen, `${normProcNo}|B1|${struct4M}|${b1Clean}`, b1Clean, v => {
        setMeta('B1', proc.workElements);
        proc.workElements.push(v);
        proc.workElements4M.push(struct4M);
      }, counter, normProcNo, 'B1');

      addIfNew(seen, `${normProcNo}|B2|${func4M}|${b1Clean}|${vals.B2}`, vals.B2, v => {
        setMeta('B2', proc.elementFuncs);
        proc.elementFuncs.push(v);
        proc.elementFuncs4M.push(func4M);
      }, counter, normProcNo, 'B2');

      addIfNew(seen, `${normProcNo}|B3|${func4M}|${b1Clean}|${vals.B3}`, vals.B3, v => {
        setMeta('B3', proc.processChars);
        proc.processChars.push(v);
        proc.processChars4M.push(func4M);
        proc.processCharsSpecialChar.push(vals.SC_B3 || '');
      }, counter, normProcNo, 'B3');

      addIfNew(seen, `${normProcNo}|B4|${fail4M}|${b1Clean}|${vals.B4}`, vals.B4, v => {
        setMeta('B4', proc.failureCauses);
        proc.failureCauses.push(v);
        proc.failureCauses4M.push(fail4M);
      }, counter, normProcNo, 'B4');

      addIfNew(seen, `${normProcNo}|B5|${fail4M}|${b1Clean}|${vals.B5}`, vals.B5, v => {
        setMeta('B5', proc.preventionCtrls);
        proc.preventionCtrls.push(v);
        proc.preventionCtrls4M.push(fail4M);
      }, counter, normProcNo, 'B5');
    }

    // ── Product 데이터 (C 레벨) ──
    const c1Raw = (vals.C1 || '').trim();
    if (c1Raw && isValid(c1Raw)) {
      const normC1 = normalizeC1(c1Raw);
      if (!productMap.has(normC1)) {
        productMap.set(normC1, { productProcessName: normC1, productFuncs: [], requirements: [], failureEffects: [] });
      }
      const product = productMap.get(normC1)!;

      const setProdMeta = (code: string, arr: string[], parentItemId?: string) => {
        if (!product.itemMeta) product.itemMeta = {};
        const col = roleColMap[code as ColumnRole];
        product.itemMeta[`${code}-${arr.length}`] = {
          excelRow: r,
          excelCol: col,
          rowSpan: col ? getMergeSpan(sheet, r, col).rowSpan : undefined,
          mergeGroupId: `${normC1}-${code}`,
          parentItemId,
        };
      };

      addIfNew(seen, `${normC1}|C2|${vals.C2}`, vals.C2, v => { setProdMeta('C2', product.productFuncs); product.productFuncs.push(v); }, counter, normC1, 'C2');
      addIfNew(seen, `${normC1}|C3|${vals.C3}`, vals.C3, v => {
        // ★ UUID 직접 꽂기: 같은 행의 C2 인덱스를 parentItemId로 기록
        const c2Idx = product.productFuncs.findIndex(f => f === vals.C2);
        const c2ParentId = c2Idx >= 0 ? `C2-${normC1}-${c2Idx}` : undefined;
        setProdMeta('C3', product.requirements, c2ParentId);
        product.requirements.push(v);
      }, counter, normC1, 'C3');
      addIfNew(seen, `${normC1}|C4|${vals.C4}`, vals.C4, v => { setProdMeta('C4', product.failureEffects); product.failureEffects.push(v); }, counter, normC1, 'C4');
    }
  }

  // 3.5 고장사슬 병합 스팬 후처리 (FM/FE 병합 행 수 계산)
  computeChainMergeSpans(chains);

  // 4. B1~B4 4M 정렬 (MN→MC→IM→EN) — v3.0: B5 제거
  for (const proc of processMap.values()) {
    sortPaired(proc.workElements, proc.workElements4M);
    sortPaired(proc.elementFuncs, proc.elementFuncs4M);
    sortPaired(proc.processChars, proc.processChars4M);
    sortPaired(proc.failureCauses, proc.failureCauses4M);
  }

  // 5. 공통공정 필터
  filterEmptyCommon(processMap);

  // 6. 통계 조립 — ★ 공정별 고장형태(A5) 고유 건수가 검증 핵심
  const ITEM_LABELS: Record<string, string> = {
    A3: '공정기능', A4: '제품특성', A5: '고장형태', A6: '검출관리',
    B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인', B5: '예방관리',
    C2: '제품기능', C3: '요구사항', C4: '고장영향',
  };
  const itemStats: ItemCodeStat[] = Object.entries(counter.items).map(([code, stat]) => ({
    itemCode: code,
    label: ITEM_LABELS[code] || code,
    rawCount: stat.raw,
    uniqueCount: stat.unique,
    dupSkipped: stat.raw - stat.unique,
  }));
  // 아이템코드 순서 정렬 (A→B→C)
  itemStats.sort((a, b) => a.itemCode.localeCompare(b.itemCode));

  const processes = Array.from(processMap.values());
  const processStats: ProcessItemStat[] = Object.entries(counter.byProcess).map(([pNo, items]) => ({
    processNo: pNo,
    processName: processes.find(p => p.processNo === pNo)?.processName || '',
    items,
  }));
  processStats.sort((a, b) => {
    const na = parseInt(a.processNo) || 0;
    const nb = parseInt(b.processNo) || 0;
    return na - nb;
  });

  // ★ v2.5.3: 원본 vs 파싱 대조 검증
  const verification = rawFingerprint
    ? verifyParsing(rawFingerprint, chains)
    : undefined;

  const statistics: ParseStatistics = {
    source: 'import',
    totalRows: rowCount,
    itemStats,
    processStats,
    chainCount: chains.length,
    rawFingerprint,
    verification,
  };

  return {
    success: true,
    processes,
    products: Array.from(productMap.values()),
    failureChains: chains,  // ★ 행별 FM↔FC↔FE 고장사슬 (단일시트에서 직접 추출)
    sheetSummary: [{ name: `fmea result (단일시트, 사슬${chains.length}건)`, rowCount }],
    errors,
    statistics,  // ★ v2.5.1: 변환결과 통계
  };
}

// ─── Header Detection ───────────────────────────────────────────

/** 헤더 행 찾기 — 매칭 키워드가 가장 많은 행 */
function findHeaderRow(sheet: ExcelJS.Worksheet): { headerRow: number; columns: ColumnMapping[] } | null {
  let bestRow = 0;
  let bestScore = 0;
  let bestColumns: ColumnMapping[] = [];

  for (let r = 1; r <= Math.min(MAX_HEADER_SCAN, sheet.rowCount); r++) {
    const cols = buildColumnMapping(sheet, r);
    if (cols.length > bestScore) {
      bestScore = cols.length;
      bestRow = r;
      bestColumns = cols;
    }
  }
  return bestScore >= 3 ? { headerRow: bestRow, columns: bestColumns } : null;
}

/** 특정 행의 셀로부터 컬럼 매핑 빌드 */
function buildColumnMapping(sheet: ExcelJS.Worksheet, rowNum: number): ColumnMapping[] {
  const row = sheet.getRow(rowNum);
  const cellCount = Math.min(row.cellCount || 20, MAX_COL_SCAN);
  const result: ColumnMapping[] = [];
  const usedRoles = new Set<ColumnRole>();

  // 중복 키워드 카운터
  let gubunCount = 0;
  let weCount = 0;
  let m4Count = 0;

  for (let c = 1; c <= cellCount; c++) {
    const h = cellValueToString(row.getCell(c).value).toLowerCase().trim();
    if (!h) continue;

    // 1. 고유 키워드 매칭
    let matched = false;
    for (const rule of UNIQUE_RULES) {
      if (rule.check(h) && !usedRoles.has(rule.role)) {
        result.push({ col: c, role: rule.role });
        usedRoles.add(rule.role);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 2. 중복 가능 키워드 — 출현 순서 기반

    // "구분" → 1st=C1, 2nd=FE_SCOPE
    if (h.includes('구분') && !h.includes('공정') && !h.includes('번호')) {
      gubunCount++;
      if (gubunCount === 1 && !usedRoles.has('C1')) {
        result.push({ col: c, role: 'C1' });
        usedRoles.add('C1');
      } else if (gubunCount >= 2 && !usedRoles.has('FE_SCOPE')) {
        result.push({ col: c, role: 'FE_SCOPE' });
        usedRoles.add('FE_SCOPE');
      }
      continue;
    }

    // "4M" → 1st=STRUCT_4M, 2nd=FUNC_4M, 3rd=FAIL_4M
    if (h.includes('4m') || h.includes('m4') || h === '분류') {
      m4Count++;
      const roles: ColumnRole[] = ['STRUCT_4M', 'FUNC_4M', 'FAIL_4M'];
      const nextRole = roles[m4Count - 1];
      if (nextRole && !usedRoles.has(nextRole)) {
        result.push({ col: c, role: nextRole });
        usedRoles.add(nextRole);
      }
      continue;
    }

    // "작업요소" (without 기능) → 1st=B1, rest=reference(무시)
    if (h.includes('작업요소') && !h.includes('기능')) {
      weCount++;
      if (weCount === 1 && !usedRoles.has('B1')) {
        result.push({ col: c, role: 'B1' });
        usedRoles.add('B1');
      }
      continue;
    }

    // "특별특성"/"특별" (A4/B3 구분 없는 경우) → 위치 기반으로 SC_A4 또는 SC_B3
    if ((h.includes('특별특성') || h === '특별' || h === 'sc') && (!usedRoles.has('SC_A4') || !usedRoles.has('SC_B3'))) {
      const nearB3 = result.some(r => r.role === 'B3' && c > r.col && c - r.col <= 3);
      if (nearB3 && !usedRoles.has('SC_B3')) {
        result.push({ col: c, role: 'SC_B3' });
        usedRoles.add('SC_B3');
      } else if (!usedRoles.has('SC_A4')) {
        result.push({ col: c, role: 'SC_A4' });
        usedRoles.add('SC_A4');
      } else if (!usedRoles.has('SC_B3')) {
        result.push({ col: c, role: 'SC_B3' });
        usedRoles.add('SC_B3');
      }
      continue;
    }

    // "공정번호"/"NO+공정명"/"공정" + (no/번호/명) → PROC_NO_NAME
    if (!usedRoles.has('PROC_NO_NAME') &&
      ((h.includes('공정') && (h.includes('no') || h.includes('번호') || h.includes('명')))
        || h.includes('no+'))) {
      result.push({ col: c, role: 'PROC_NO_NAME' });
      usedRoles.add('PROC_NO_NAME');
      continue;
    }
  }

  return result;
}

// ─── Data Row Helpers ───────────────────────────────────────────

/** 데이터 시작 행 찾기 (안내행 건너뛰기) */
function findDataStartRow(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  columns: ColumnMapping[],
): number {
  const keyCol = columns.find(c => c.role === 'PROC_NO_NAME')?.col
    || columns.find(c => c.role === 'C1')?.col
    || columns[0]?.col || 1;

  let startRow = headerRow + 1;
  for (let r = headerRow + 1; r <= Math.min(headerRow + 5, sheet.rowCount); r++) {
    const val = cellValueToString(sheet.getRow(r).getCell(keyCol).value).trim();
    if (val.includes('필수') || val.includes('선택')) {
      startRow = r + 1;
      continue;
    }
    if (val) {
      startRow = r;
      break;
    }
  }
  return startRow;
}

/** C1 구분 정규화 */
function normalizeC1(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('your') || raw === 'YP') return 'YP';
  if (lower.includes('ship') || raw === 'SP') return 'SP';
  if (lower.includes('user') || lower.includes('end')) return 'USER';
  return raw.toUpperCase();
}

/** 4M 정규화 (MD/JG → MC) */
function normalize4M(val: string | undefined): string {
  const upper = (val || '').toUpperCase().trim();
  if (upper === 'MD' || upper === 'JG') return 'MC';
  if (['MN', 'MC', 'IM', 'EN'].includes(upper)) return upper;
  return '';
}

/** 유효한 데이터인지 확인 (placeholder/헤더값 제외) */
function isValid(val: string): boolean {
  const t = val.trim();
  if (!t || t === '-' || t === 'null' || t === 'undefined') return false;
  if (t.includes('(필수)') || t.includes('(선택)')) return false;
  if (/^L[123]-\d/.test(t)) return false;
  // 헤더 키워드 제외 (L1 통합 시트 페이지 구분 헤더 포함)
  if (t === '구분' || t === '4M' || t === 'NO') return false;
  if (t === '기능' || t === '요구사항' || t === '고장영향' || t === '완제품기능' || t === '제품기능') return false;
  return true;
}

/** 파싱 카운터 — 아이템코드별 raw/unique/dup 추적 */
interface ParseCounter {
  /** itemCode별 { raw, unique } */
  items: Record<string, { raw: number; unique: number }>;
  /** 공정별 itemCode별 { raw, unique } */
  byProcess: Record<string, Record<string, { raw: number; unique: number }>>;
  /** 카운트 증가 */
  track(processNo: string, itemCode: string, isDuplicate: boolean): void;
}

function createParseCounter(): ParseCounter {
  const items: Record<string, { raw: number; unique: number }> = {};
  const byProcess: Record<string, Record<string, { raw: number; unique: number }>> = {};

  return {
    items,
    byProcess,
    track(processNo: string, itemCode: string, isDuplicate: boolean) {
      // 전체 통계
      if (!items[itemCode]) items[itemCode] = { raw: 0, unique: 0 };
      items[itemCode].raw++;
      if (!isDuplicate) items[itemCode].unique++;
      // 공정별 통계
      if (processNo) {
        if (!byProcess[processNo]) byProcess[processNo] = {};
        if (!byProcess[processNo][itemCode]) byProcess[processNo][itemCode] = { raw: 0, unique: 0 };
        byProcess[processNo][itemCode].raw++;
        if (!isDuplicate) byProcess[processNo][itemCode].unique++;
      }
    },
  };
}

/** 중복 방지 + 유효성 검사 후 추가 + 카운팅 */
function addIfNew(
  seen: Set<string>,
  key: string,
  value: string | undefined,
  push: (v: string) => void,
  counter?: ParseCounter,
  processNo?: string,
  itemCode?: string,
): void {
  if (!value || !isValid(value)) return;
  const isDup = seen.has(key);
  if (counter && processNo !== undefined && itemCode) {
    counter.track(processNo, itemCode, isDup);
  }
  if (isDup) return;
  seen.add(key);
  push(value);
}

/** 4M 기준 쌍 배열 정렬 */
function sortPaired(values: string[], m4s: string[]): void {
  if (m4s.length === 0 || !m4s.some(m => m)) return;
  const paired = values.map((v, i) => ({ v, m4: m4s[i] || '' }));
  paired.sort((a, b) => m4SortValue(a.m4) - m4SortValue(b.m4));
  values.length = 0;
  m4s.length = 0;
  paired.forEach(p => { values.push(p.v); m4s.push(p.m4); });
}

/** 빈 ProcessRelation 생성 */
function createEmptyProcess(processNo: string, processName: string): ProcessRelation {
  return {
    processNo, processName,
    processDesc: [], productChars: [], productCharsSpecialChar: [], failureModes: [],
    workElements: [], workElements4M: [],
    elementFuncs: [], elementFuncs4M: [], elementFuncsWE: [],
    processChars: [], processChars4M: [], processCharsSpecialChar: [], processCharsWE: [],
    failureCauses: [], failureCauses4M: [], failureCausesWE: [],
    preventionCtrls: [], preventionCtrls4M: [], preventionCtrlsWE: [], detectionCtrls: [],
  };
}

/** 공통공정 필터 (데이터 없으면 제거) */
function filterEmptyCommon(processMap: Map<string, ProcessRelation>): void {
  if (!processMap.has('공통')) return;
  const com = processMap.get('공통')!;
  const ne = (arr: string[]) => arr.some(v => v.trim() !== '');
  const hasData = (com.processName?.trim())
    || ne(com.processDesc) || ne(com.productChars)
    || ne(com.failureModes) || ne(com.workElements);
  if (!hasData) processMap.delete('공통');
}

/** 고장사슬 FM/FE 병합 스팬 계산 (같은 FM/FE를 공유하는 행 수) */
function computeChainMergeSpans(chains: MasterFailureChain[]): void {
  const fmGroups = new Map<string, MasterFailureChain[]>();
  const feGroups = new Map<string, MasterFailureChain[]>();
  for (const c of chains) {
    const fmKey = `${c.processNo}|${c.fmValue}`;
    const feKey = `${c.processNo}|${c.feValue}`;
    if (!fmGroups.has(fmKey)) fmGroups.set(fmKey, []);
    fmGroups.get(fmKey)!.push(c);
    if (!feGroups.has(feKey)) feGroups.set(feKey, []);
    feGroups.get(feKey)!.push(c);
  }
  for (const group of fmGroups.values()) {
    const span = group.length;
    for (const c of group) c.fmMergeSpan = span;
  }
  for (const group of feGroups.values()) {
    const span = group.length;
    for (const c of group) c.feMergeSpan = span;
  }
}

/** 실패 응답 헬퍼 */
function fail(msg: string): ParseResult {
  return {
    success: false,
    processes: [],
    products: [],
    failureChains: [],
    sheetSummary: [{ name: 'fmea result', rowCount: 0 }],
    errors: [msg],
  };
}
