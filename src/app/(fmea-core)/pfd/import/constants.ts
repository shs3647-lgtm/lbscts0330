/**
 * @file constants.ts
 * @description PFD Import 페이지 상수 정의 - CP와 동일한 UI 구조
 * @created 2026-01-24
 * 
 * PFD 컬럼 (9개):
 * - 공정정보 (5개): 공정번호, 공정명, 공정설명, 작업요소, 설비/금형/지그
 * - 특성정보 (4개): 제품특별특성, 제품특성, 공정특별특성, 공정특성
 */

import { PreviewOption, PreviewColumn } from './types';
import { PFD_ITEM_CODES } from '@/lib/pfd/constants/pfd-column-ids';

// ===== 그룹 시트 옵션 (2개) =====
export const GROUP_SHEET_OPTIONS: PreviewOption[] = [
  { value: 'processInfo', label: '공정정보', sheetName: '공정정보', group: 'processInfo' },
  { value: 'characteristic', label: '특성정보', sheetName: '특성정보', group: 'characteristic' },
];

// ===== 개별 항목 시트 옵션 (8개) =====
export const INDIVIDUAL_SHEET_OPTIONS: PreviewOption[] = [
  { value: 'processName', label: '공정명', sheetName: '공정명', group: 'processInfo' },
  { value: 'processDesc', label: '공정설명', sheetName: '공정설명', group: 'processInfo' },
  { value: 'workElement', label: '작업요소', sheetName: '작업요소', group: 'processInfo' },
  { value: 'equipment', label: '설비/금형/지그', sheetName: '설비/금형/지그', group: 'processInfo' },
  { value: 'productSpecialChar', label: '제품특별특성', sheetName: '제품특별특성', group: 'characteristic' },
  { value: 'productChar', label: '제품특성', sheetName: '제품특성', group: 'characteristic' },
  { value: 'processSpecialChar', label: '공정특별특성', sheetName: '공정특별특성', group: 'characteristic' },
  { value: 'processChar', label: '공정특성', sheetName: '공정특성', group: 'characteristic' },
];

// ===== 전체 시트 옵션 (그룹 + 개별) =====
export const SHEET_OPTIONS: PreviewOption[] = [
  ...GROUP_SHEET_OPTIONS,
  ...INDIVIDUAL_SHEET_OPTIONS,
];

// 미리보기 옵션 (전체 컬럼)
export const PREVIEW_OPTIONS: PreviewOption[] = [
  { value: 'processNo', label: '공정번호', sheetName: '공정정보' },
  { value: 'processName', label: '공정명', sheetName: '공정정보' },
  { value: 'processDesc', label: '공정설명', sheetName: '공정정보' },
  { value: 'workElement', label: '작업요소', sheetName: '공정정보' },
  { value: 'equipment', label: '설비/금형/지그', sheetName: '공정정보' },
  { value: 'productSpecialChar', label: '제품특별특성', sheetName: '특성정보' },
  { value: 'productChar', label: '제품특성', sheetName: '특성정보' },
  { value: 'processSpecialChar', label: '공정특별특성', sheetName: '특성정보' },
  { value: 'processChar', label: '공정특성', sheetName: '특성정보' },
];

// ★ 미리보기 테이블 컬럼 정의 (퍼센트 기반 - 브라우저 너비 적응)
// 관리컬럼 7% (체크박스1% + No2% + 작업4%) + 데이터컬럼 93%
export const PREVIEW_COLUMNS: PreviewColumn[] = [
  // 공정정보 (5컬럼) - 합계: 55%
  { key: 'processNo', label: '공정번호(P-No)', width: 'w-[6%]', group: 'processInfo' },
  { key: 'processName', label: '공정명(Process Name)', width: 'w-[10%]', group: 'processInfo' },
  { key: 'processDesc', label: '공정설명(Process Desc)', width: 'w-[20%]', group: 'processInfo' },
  { key: 'workElement', label: '작업요소(Work Element)', width: 'w-[10%]', group: 'processInfo' },
  { key: 'equipment', label: '설비/금형/지그(Equipment)', width: 'w-[9%]', group: 'processInfo' },
  // 특성정보 (4컬럼) - 합계: 38%
  { key: 'productSpecialChar', label: '제품특별특성(Product SC)', width: 'w-[8%]', group: 'characteristic' },
  { key: 'productChar', label: '제품특성(Product Char)', width: 'w-[10%]', group: 'characteristic' },
  { key: 'processSpecialChar', label: '공정특별특성(Process SC)', width: 'w-[8%]', group: 'characteristic' },
  { key: 'processChar', label: '공정특성(Process Char)', width: 'w-[12%]', group: 'characteristic' },
];

// 그룹별 색상
export const GROUP_COLORS: Record<string, { bg: string; text: string; header: string }> = {
  processInfo: { bg: 'bg-teal-50', text: 'text-teal-700', header: 'bg-teal-600' },
  characteristic: { bg: 'bg-blue-50', text: 'text-blue-700', header: 'bg-blue-600' },
};

// 그룹 헤더 정보
export const GROUP_HEADERS = [
  { key: 'processInfo', label: '공정정보(Process Info)', colSpan: 5, color: 'bg-teal-600' },
  { key: 'characteristic', label: '특성정보(Characteristic)', colSpan: 4, color: 'bg-blue-600' },
];

// ★ itemCode 표준화 매핑 (PFD용: A1~A5, B1~B4)
export const STANDARDIZE_ITEM_CODE: Record<string, string> = {
  'processNo': PFD_ITEM_CODES.A1,
  'processName': PFD_ITEM_CODES.A2,
  'processDesc': PFD_ITEM_CODES.A3,
  'workElement': PFD_ITEM_CODES.A4,
  'equipment': PFD_ITEM_CODES.A5,
  'productSpecialChar': PFD_ITEM_CODES.B1,
  'productChar': PFD_ITEM_CODES.B2,
  'processSpecialChar': PFD_ITEM_CODES.B3,
  'processChar': PFD_ITEM_CODES.B4,
};

// itemCode 표준화 헬퍼 함수
export const standardizeItemCode = (itemCode: string): string => {
  return STANDARDIZE_ITEM_CODE[itemCode] || itemCode;
};

// 개별 항목 컬럼 매핑
export const ITEM_COLUMN_MAP: Record<string, string> = {
  processName: 'processName',
  processDesc: 'processDesc',
  workElement: 'workElement',
  equipment: 'equipment',
  productSpecialChar: 'productSpecialChar',
  productChar: 'productChar',
  processSpecialChar: 'processSpecialChar',
  processChar: 'processChar',
};

// ★ Tailwind 스타일 상수 - CP와 동일 (선명한 글씨체: font-medium, antialiased)
export const tw = {
  tableWrapper: "border border-gray-400 rounded bg-white overflow-hidden",
  headerCell: "bg-[#0d9488] text-white px-0.5 py-0.5 border border-gray-400 text-[10px] font-medium text-center whitespace-nowrap antialiased",
  headerCellSm: "bg-[#0d9488] text-white px-0.5 py-0.5 border border-gray-400 text-[10px] font-medium text-center whitespace-nowrap antialiased",
  rowHeader: "bg-teal-100 text-[#00587a] px-1 py-0.5 border border-gray-300 text-[10px] font-medium text-center whitespace-nowrap antialiased",
  rowHeaderSm: "bg-teal-50 text-[#00587a] px-1 py-0.5 border border-gray-300 text-[10px] font-normal text-center whitespace-nowrap antialiased",
  cell: "border border-gray-300 px-0.5 py-0.5 text-[10px] text-gray-800 whitespace-pre-wrap break-words font-normal antialiased",
  cellPad: "border border-gray-300 px-0.5 py-0.5 text-[10px] text-center whitespace-pre-wrap break-words font-normal antialiased",
  cellCenter: "border border-gray-300 px-0.5 py-0.5 text-[10px] text-center whitespace-pre-wrap break-words font-normal antialiased",
  btnPrimary: "px-1.5 py-0.5 bg-teal-500 text-white border-none rounded cursor-pointer text-[10px] font-medium whitespace-nowrap antialiased",
  btnBlue: "px-1.5 py-0.5 bg-blue-500 text-white border-none rounded cursor-pointer text-[10px] font-medium whitespace-nowrap antialiased",
  btnGreen: "px-1.5 py-0.5 bg-green-500 text-white border-none rounded cursor-pointer text-[10px] font-medium whitespace-nowrap antialiased",
  btnOrange: "px-1.5 py-0.5 bg-orange-500 text-white border-none rounded cursor-pointer text-[10px] font-medium whitespace-nowrap antialiased",
  btnPurple: "px-1.5 py-0.5 bg-purple-500 text-white border-none rounded cursor-pointer text-[10px] font-medium whitespace-nowrap antialiased",
  btnDanger: "px-1.5 py-0.5 bg-red-500 text-white border-none rounded cursor-pointer text-[10px] font-medium whitespace-nowrap antialiased",
  btnBrowse: "inline-block px-1.5 py-0.5 bg-gray-100 border border-gray-400 rounded cursor-pointer text-[10px] font-normal whitespace-nowrap max-w-[80px] truncate antialiased",
  btnSuccess: "px-1.5 py-0.5 bg-green-500 text-white border-none rounded cursor-pointer text-[10px] font-medium whitespace-nowrap antialiased",
  btnSuccessDisabled: "px-1.5 py-0.5 bg-gray-300 text-white border-none rounded cursor-not-allowed text-[10px] font-medium whitespace-nowrap antialiased",
  select: "w-full px-0.5 py-0 border border-gray-300 rounded text-[10px] bg-white font-normal antialiased",
  input: "w-full px-0.5 py-0 border-0 text-[10px] bg-transparent focus:outline-none font-normal antialiased",
  inputCenter: "w-full px-0.5 py-0 border-0 text-[10px] bg-transparent text-center focus:outline-none font-normal antialiased",
};
