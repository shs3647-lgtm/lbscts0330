/**
 * @file excel-styles.ts
 * @description PFMEA 기초정보 Excel 공통 스타일 정의
 * @created 2026-02-18
 *
 * 기존 excel-template.ts의 스타일과 동일한 디자인 표준 유지
 */

import type ExcelJS from 'exceljs';

// ─── 색상 상수 ───
export const HEADER_COLOR = '00587A';     // 디자인 표준 네이비
const BORDER_COLOR = '999999';             // 테두리 회색
const SPECIAL_CHAR_BG = 'FEF2F2';         // 특별특성/심각도 배경 (연빨강)
const SPECIAL_CHAR_FONT = '991B1B';       // 특별특성/심각도 글자 (진빨강)
const COMMON_ROW_BG = 'F0FDF4';           // 공통(00) 행 배경 (연초록)

// ─── 테두리 공통 ───
const thinBorder: ExcelJS.Border = { style: 'thin', color: { argb: BORDER_COLOR } };
export const BORDERS: Partial<ExcelJS.Borders> = {
  top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder,
};

// ─── 스타일 적용 함수 ───

/** 헤더 셀 스타일 */
export function applyHeaderStyle(cell: ExcelJS.Cell, color: string = HEADER_COLOR) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = BORDERS;
}

/** 데이터 셀 스타일 (가운데 정렬) */
export function applyDataStyle(cell: ExcelJS.Cell) {
  cell.font = { name: '맑은 고딕', size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = BORDERS;
}

/** 데이터 셀 스타일 (왼쪽 정렬 — 긴 텍스트용) */
export function applyDataLeftStyle(cell: ExcelJS.Cell) {
  cell.font = { name: '맑은 고딕', size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = BORDERS;
}

/** 특별특성/심각도 셀 스타일 */
export function applySpecialCharStyle(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SPECIAL_CHAR_BG } };
  cell.font = { bold: true, color: { argb: SPECIAL_CHAR_FONT }, size: 10, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = BORDERS;
}

/** 공통(00) 행 배경 스타일 */
export function applyCommonRowStyle(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COMMON_ROW_BG } };
  cell.font = { name: '맑은 고딕', size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = BORDERS;
}

// ─── 시트 컬럼 정의 (PRD 확정) ───

export interface SheetColumnDef {
  key: string;
  header: string;
  width: number;
  align: 'center' | 'left';
  special?: boolean; // 특별특성/심각도 컬럼
}

/** 14시트 컬럼 정의 — DB 아이템코드 기준 */
export const SHEET_COLUMNS: Record<string, SheetColumnDef[]> = {
  'A12': [
    { key: 'processNo', header: '공정번호', width: 12, align: 'center' },
    { key: 'processName', header: '공정명', width: 20, align: 'left' },
  ],
  'A3': [
    { key: 'processNo', header: '공정번호', width: 12, align: 'center' },
    { key: 'processName', header: '공정명', width: 18, align: 'left' },
    { key: 'processFunction', header: '공정기능', width: 40, align: 'left' },
  ],
  'A4': [
    { key: 'processNo', header: '공정번호', width: 12, align: 'center' },
    { key: 'processName', header: '공정명', width: 15, align: 'left' },
    { key: 'mainFunction', header: '메인공정기능', width: 30, align: 'left' },
    { key: 'productChar', header: '제품특성', width: 20, align: 'left' },
    { key: 'specialChar', header: '특별특성', width: 10, align: 'center', special: true },
  ],
  'A5': [
    { key: 'processNo', header: '공정번호', width: 12, align: 'center' },
    { key: 'processName', header: '공정명', width: 15, align: 'left' },
    { key: 'mainFunction', header: '메인공정기능', width: 28, align: 'left' },
    { key: 'productChar', header: '제품특성', width: 18, align: 'left' },
    { key: 'specialChar', header: '특별특성', width: 10, align: 'center', special: true },
    { key: 'failureMode', header: '고장형태', width: 25, align: 'left' },
  ],
  'A6': [
    { key: 'processNo', header: '공정번호', width: 12, align: 'center' },
    { key: 'processName', header: '공정명', width: 15, align: 'left' },
    { key: 'productChar', header: '제품특성', width: 20, align: 'left' },
    { key: 'failureMode', header: '고장형태', width: 25, align: 'left' },
    { key: 'detection', header: '검출관리', width: 30, align: 'left' },
  ],
  'B1': [
    { key: 'processNo', header: '공정번호', width: 12, align: 'center' },
    { key: 'processName', header: '공정명', width: 15, align: 'left' },
    { key: 'm4', header: '4M', width: 8, align: 'center' },
    { key: 'workElement', header: '작업요소', width: 30, align: 'left' },
  ],
  'B2': [
    { key: 'processNo', header: '공정번호', width: 12, align: 'center' },
    { key: 'processName', header: '공정명', width: 15, align: 'left' },
    { key: 'm4', header: '4M', width: 8, align: 'center' },
    { key: 'workElement', header: '작업요소', width: 22, align: 'left' },
    { key: 'elementFunction', header: '요소기능', width: 35, align: 'left' },
  ],
  'B3': [
    { key: 'processNo', header: '공정번호', width: 12, align: 'center' },
    { key: 'processName', header: '공정명', width: 15, align: 'left' },
    { key: 'm4', header: '4M', width: 8, align: 'center' },
    { key: 'workElement', header: '작업요소', width: 20, align: 'left' },
    { key: 'elementFunction', header: '작업요소기능', width: 28, align: 'left' },
    { key: 'processChar', header: '공정특성', width: 20, align: 'left' },
    { key: 'specialChar', header: '특별특성', width: 10, align: 'center', special: true },
  ],
  'B4': [
    { key: 'processNo', header: '공정번호', width: 12, align: 'center' },
    { key: 'processName', header: '공정명', width: 15, align: 'left' },
    { key: 'm4', header: '4M', width: 8, align: 'center' },
    { key: 'workElement', header: '작업요소', width: 22, align: 'left' },
    { key: 'processChar', header: '공정특성', width: 20, align: 'left' },
    { key: 'specialChar', header: '특별특성', width: 10, align: 'center', special: true },
    { key: 'failureCause', header: '고장원인', width: 30, align: 'left' },
  ],
  'B5': [
    { key: 'processNo', header: '공정번호', width: 12, align: 'center' },
    { key: 'processName', header: '공정명', width: 15, align: 'left' },
    { key: 'm4', header: '4M', width: 8, align: 'center' },
    { key: 'processChar', header: '공정특성', width: 22, align: 'left' },
    { key: 'failureCause', header: '고장원인', width: 25, align: 'left' },
    { key: 'prevention', header: '예방관리', width: 35, align: 'left' },
  ],
  'C1': [
    { key: 'category', header: '구분', width: 20, align: 'center' },
  ],
  'C2': [
    { key: 'category', header: '구분', width: 15, align: 'center' },
    { key: 'productFunction', header: '완제품기능', width: 40, align: 'left' },
  ],
  'C3': [
    { key: 'partName', header: '완제품 공정명', width: 20, align: 'left' },
    { key: 'category', header: '구분', width: 12, align: 'center' },
    { key: 'productFunction', header: '완제품기능', width: 30, align: 'left' },
    { key: 'requirement', header: '요구사항', width: 25, align: 'left' },
  ],
  'C4': [
    { key: 'category', header: '구분', width: 12, align: 'center' },
    { key: 'productFunction', header: '완제품기능', width: 25, align: 'left' },
    { key: 'requirement', header: '요구사항', width: 20, align: 'left' },
    { key: 'failureEffect', header: '고장영향', width: 30, align: 'left' },
    { key: 'severity', header: '심각도(S)', width: 10, align: 'center', special: true },
  ],
};

/** 시트 표시명 (엑셀 탭에 표시) */
export const SHEET_DISPLAY_NAMES: Record<string, string> = {
  'A12': 'L2-1,2(A1,2) 공정번호',
  'A3': 'L2-3(A3) 공정기능',
  'A4': 'L2-4(A4) 제품특성',
  'A5': 'L2-5(A5) 고장형태',
  'A6': 'L2-6(A6) 검출관리',
  'B1': 'L3-1(B1) 작업요소',
  'B2': 'L3-2(B2) 요소기능',
  'B3': 'L3-3(B3) 공정특성',
  'B4': 'L3-4(B4) 고장원인',
  'B5': 'L3-5(B5) 예방관리',
  'C1': 'L1-1(C1) 구분',
  'C2': 'L1-2(C2) 완제품기능',
  'C3': 'L1-3(C3) 요구사항',
  'C4': 'L1-4(C4) 고장영향',
};

/** 시트 순서 (엑셀 시트탭 순서) */
export const SHEET_ORDER = ['A12', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4'] as const;
export type SheetCode = typeof SHEET_ORDER[number];

/** 4M 정렬 순서 (고정 — 절대 변경 금지) */
export const M4_SORT_ORDER: Record<string, number> = { MN: 0, MC: 1, IM: 2, EN: 3 };
