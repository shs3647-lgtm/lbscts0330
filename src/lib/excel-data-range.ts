/**
 * @file excel-data-range.ts
 * @description Excel 시트 내 데이터 범위 자동 감지 + 셀 병합 해석
 * @created 2026-02-17
 *
 * 공용 모듈: PFMEA / DFMEA / CP 파서에서 import하여 사용
 *
 * 처리하는 예외 패턴:
 * 1. 1열 빈 칸 → 키 컬럼 자동 감지 (2열, 3열도 가능)
 * 2. 비고/메모 열 → 데이터 범위 밖 무시
 * 3. 헤더가 1행이 아닌 경우 (최대 20행까지 스캔)
 * 4. (필수)/(선택) 안내행 건너뛰기
 * 5. 셀 병합 → 마스터 셀 값 전파
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


/* eslint-disable @typescript-eslint/no-explicit-any */

import type ExcelJS from 'exceljs';
import { cellValueToString } from '@/app/(fmea-core)/pfmea/import/excel-parser-utils';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 시트 내 데이터 범위 감지 결과 */
export interface DataRange {
  headerRow: number;      // 헤더 행 번호 (1-based)
  dataStartRow: number;   // 데이터 시작 행 (1-based)
  keyCol: number;         // 키 컬럼 번호 (1-based, 공정번호/초점요소번호/구분)
  valueStartCol: number;  // 값 시작 컬럼 (1-based)
  valueEndCol: number;    // 값 끝 컬럼 (1-based, 비고 제외)
  has4MCol: boolean;      // 4M 컬럼 존재 여부
  m4Col: number;          // 4M 컬럼 번호 (0=없음)
}

// ─── 상수 ────────────────────────────────────────────────────────

/** 헤더 행 감지 키워드 (소문자) */
const HEADER_KEYWORDS = [
  '번호', 'no', '공정', '구분', '초점', '작업', '요소',
  'l2-', 'l3-', 'l1-',
];

/** 4M 컬럼 감지 키워드 (소문자) */
const M4_KEYWORDS = ['4m', 'm4', '분류'];

/** 건너뛸 안내행 값 */
const SKIP_ROW_VALUES = ['(필수)', '(선택)', '필수', '선택'];

/** 스캔 한도 */
const MAX_SCAN_ROWS = 20;   // 헤더 찾기 최대 행
const MAX_SCAN_COLS = 30;   // 값 범위 최대 열

// ─── 데이터 범위 감지 ──────────────────────────────────────────

/**
 * 시트 내 데이터 범위 자동 감지
 *
 * @param sheet - ExcelJS Worksheet
 * @returns DataRange (헤더 행, 데이터 시작 행, 키/값 컬럼 범위)
 */
export function detectDataRange(sheet: ExcelJS.Worksheet): DataRange {
  let headerRow = 1;
  let keyCol = 1;
  let valueStartCol = 2;
  let valueEndCol = 2;
  let has4MCol = false;
  let m4Col = 0;
  let foundHeader = false;

  // ── Step 1: 헤더 행 찾기 (최대 20행 스캔) ──
  // ★★★ 2026-02-17: 우선순위 기반 키 컬럼 감지 ★★★
  // "공정", "구분", "초점" = 실제 키 컬럼 (우선)
  // "번호", "no" = 순번(NO) 열일 수 있음 (폴백)
  const HIGH_PRIORITY_KW = ['공정', '구분', '초점'];

  for (let r = 1; r <= Math.min(MAX_SCAN_ROWS, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const cellCount = Math.min(row.cellCount || 10, MAX_SCAN_COLS);

    let fallbackCol = 0;       // 저우선순위 매칭 (NO/번호)
    let fallbackRow = 0;
    let bestCol = 0;           // 고우선순위 매칭 (공정/구분/초점)

    for (let c = 1; c <= cellCount; c++) {
      const val = cellValueToString(row.getCell(c).value).toLowerCase();
      if (!val) continue;

      // 고우선순위: 공정번호, 구분, 초점요소 등
      if (HIGH_PRIORITY_KW.some(kw => val.includes(kw))) {
        bestCol = c;
        break; // 확정
      }

      // 저우선순위: NO, 번호 (순번 열일 수 있음)
      if (!fallbackCol && HEADER_KEYWORDS.some(kw => val.includes(kw))) {
        fallbackCol = c;
        fallbackRow = r;
      }
    }

    const selectedCol = bestCol || fallbackCol;
    if (selectedCol) {
      headerRow = bestCol ? r : fallbackRow || r;
      keyCol = selectedCol;
      valueStartCol = selectedCol + 1;
      foundHeader = true;

      // 키 컬럼 이후에서 4M 컬럼 확인
      for (let mc = selectedCol + 1; mc <= Math.min(selectedCol + 3, cellCount); mc++) {
        const mval = cellValueToString(row.getCell(mc).value).toLowerCase();
        if (M4_KEYWORDS.some(kw => mval.includes(kw))) {
          has4MCol = true;
          m4Col = mc;
          valueStartCol = mc + 1;
          break;
        }
      }
      break;
    }
  }

  // 헤더를 못 찾은 경우: 기본값 (1행 헤더, 1열 키, 2열 값)
  if (!foundHeader) {
    // 1행의 1열이 비어있으면 2열부터 검사
    const firstRowFirstCell = cellValueToString(sheet.getRow(1).getCell(1).value).trim();
    if (!firstRowFirstCell) {
      const secondCell = cellValueToString(sheet.getRow(1).getCell(2).value).trim();
      if (secondCell) {
        keyCol = 2;
        valueStartCol = 3;
      }
    }
  }

  // ── Step 2: 데이터 시작 행 찾기 ──
  let dataStartRow = headerRow + 1;
  for (let r = headerRow + 1; r <= Math.min(headerRow + 5, sheet.rowCount); r++) {
    const val = cellValueToString(sheet.getRow(r).getCell(keyCol).value).trim();

    // (필수)/(선택) 안내행 건너뛰기
    if (SKIP_ROW_VALUES.some(sv => val.includes(sv))) {
      dataStartRow = r + 1;
      continue;
    }

    // 숫자로 시작하면 데이터 행 (공정번호: 0, 10, 20, 30...)
    if (val && /^\d+$/.test(val)) {
      dataStartRow = r;
      break;
    }

    // 한글/영문 구분값 (C1: YP, SP, USER, 법규, 기본 등)
    if (val && !HEADER_KEYWORDS.some(kw => val.toLowerCase().includes(kw))) {
      dataStartRow = r;
      break;
    }
  }

  // ── Step 3: 값 끝 컬럼 찾기 (비고/메모 제외) ──
  // 헤더 행 + 첫 데이터 행을 함께 검사: 연속 빈 열 2개이면 끝
  let consecutiveEmpty = 0;
  valueEndCol = valueStartCol;

  for (let c = valueStartCol; c <= MAX_SCAN_COLS; c++) {
    const headerVal = cellValueToString(sheet.getRow(headerRow).getCell(c).value).trim();
    const dataVal = sheet.rowCount >= dataStartRow
      ? cellValueToString(sheet.getRow(dataStartRow).getCell(c).value).trim()
      : '';

    if (!headerVal && !dataVal) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 2) break;
    } else {
      consecutiveEmpty = 0;
      valueEndCol = c;
    }
  }

  // 보정: valueEndCol < valueStartCol → 최소한 1열은 읽기
  if (valueEndCol < valueStartCol) {
    valueEndCol = valueStartCol;
  }

  return {
    headerRow,
    dataStartRow,
    keyCol,
    valueStartCol,
    valueEndCol,
    has4MCol,
    m4Col,
  };
}

// ─── 셀 병합 해석 ──────────────────────────────────────────────

/** 셀 참조 문자열("A1", "BC123") → {row, col} 변환 (1-based) */
function parseCellRef(cellRef: string): { row: number; col: number } {
  const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return { row: 1, col: 1 };
  const colStr = match[1].toUpperCase();
  const row = parseInt(match[2], 10);
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  return { row, col };
}

/**
 * 셀 병합 범위에서 원본(마스터) 값 추출
 *
 * ExcelJS에서 병합 셀의 비-마스터 셀은 null일 수 있음.
 * 해당 셀이 병합 범위에 속하면 마스터 셀(좌상단)의 값을 반환.
 *
 * @param sheet - ExcelJS Worksheet
 * @param row - 행 번호 (1-based)
 * @param col - 열 번호 (1-based)
 * @returns 셀 값 (문자열)
 */
export function getMergedCellValue(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
): string {
  // 직접 값이 있으면 바로 반환
  const directValue = cellValueToString(sheet.getRow(row).getCell(col).value);
  if (directValue) return directValue;

  // 값이 없으면 병합 범위 확인
  const merges: string[] = (sheet.model as any)?.merges || [];
  for (const mergeRange of merges) {
    const parts = mergeRange.split(':');
    if (parts.length !== 2) continue;

    const tl = parseCellRef(parts[0]);
    const br = parseCellRef(parts[1]);

    if (row >= tl.row && row <= br.row && col >= tl.col && col <= br.col) {
      // 마스터 셀(좌상단) 값 반환
      return cellValueToString(sheet.getRow(tl.row).getCell(tl.col).value);
    }
  }

  return '';
}

/**
 * 셀의 병합 범위(rowSpan, colSpan) 및 마스터 여부 반환
 *
 * @param sheet - ExcelJS Worksheet
 * @param row - 행 번호 (1-based)
 * @param col - 열 번호 (1-based)
 * @returns { rowSpan, colSpan, isMaster }
 *   - rowSpan: 병합 행 수 (병합 아니면 1)
 *   - colSpan: 병합 열 수 (병합 아니면 1)
 *   - isMaster: 병합 범위의 좌상단(마스터) 셀인지
 */
export function getMergeSpan(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
): { rowSpan: number; colSpan: number; isMaster: boolean } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merges: string[] = (sheet.model as any)?.merges || [];
  for (const mergeRange of merges) {
    const parts = mergeRange.split(':');
    if (parts.length !== 2) continue;

    const tl = parseCellRef(parts[0]);
    const br = parseCellRef(parts[1]);

    if (row >= tl.row && row <= br.row && col >= tl.col && col <= br.col) {
      return {
        rowSpan: br.row - tl.row + 1,
        colSpan: br.col - tl.col + 1,
        isMaster: row === tl.row && col === tl.col,
      };
    }
  }

  return { rowSpan: 1, colSpan: 1, isMaster: true };
}
