/**
 * @file constants.ts
 * @description CP Import 페이지 상수 정의
 * @updated 2026-01-13 - 검출장치 공정현황 뒤쪽 배치 + 글씨체 선명화
 * 
 * ★ 컬럼 순서 (변경): 공정현황 → 검출장치 → 관리항목 → 관리방법 → 대응계획
 */

import { PreviewOption, PreviewColumn } from './types';

// ===== 그룹 시트 옵션 (5개) =====
export const GROUP_SHEET_OPTIONS: PreviewOption[] = [
  { value: 'processInfo', label: '공정현황', sheetName: '공정현황', group: 'processInfo' },
  { value: 'detector', label: '검출장치', sheetName: '검출장치', group: 'detector' },
  { value: 'controlItem', label: '관리항목', sheetName: '관리항목', group: 'controlItem' },
  { value: 'controlMethod', label: '관리방법', sheetName: '관리방법', group: 'controlMethod' },
  { value: 'reactionPlan', label: '대응계획', sheetName: '대응계획', group: 'reactionPlan' },
];

// ===== 개별 항목 시트 옵션 (13개) =====
export const INDIVIDUAL_SHEET_OPTIONS: PreviewOption[] = [
  { value: 'processName', label: '공정명', sheetName: '공정명', group: 'processInfo' },
  { value: 'processDesc', label: '공정설명', sheetName: '공정설명', group: 'processInfo' },
  { value: 'equipment', label: '설비/금형/지그', sheetName: '설비/금형/지그', group: 'processInfo' },
  { value: 'ep', label: 'EP', sheetName: 'EP', group: 'detector' },
  { value: 'autoDetector', label: '자동검사', sheetName: '자동검사장치', group: 'detector' },
  { value: 'productChar', label: '제품특성', sheetName: '제품특성', group: 'controlItem' },
  { value: 'processChar', label: '공정특성', sheetName: '공정특성', group: 'controlItem' },
  { value: 'spec', label: '스펙/공차', sheetName: '스펙/공차', group: 'controlItem' },
  { value: 'evalMethod', label: '평가방법', sheetName: '평가방법', group: 'controlMethod' },
  { value: 'sampleSize', label: '샘플크기', sheetName: '샘플크기', group: 'controlMethod' },
  { value: 'frequency', label: '주기', sheetName: '주기', group: 'controlMethod' },
  { value: 'controlMethod', label: '관리방법', sheetName: '관리방법', group: 'controlMethod' },
  { value: 'reactionPlanItem', label: '대응계획(개별)', sheetName: '대응계획', group: 'reactionPlan' },
];

// ===== 전체 시트 옵션 (그룹 + 개별) =====
export const SHEET_OPTIONS: PreviewOption[] = [
  ...GROUP_SHEET_OPTIONS,
  ...INDIVIDUAL_SHEET_OPTIONS,
];

// 미리보기 옵션 (전체 컬럼)
export const PREVIEW_OPTIONS: PreviewOption[] = [
  { value: 'processNo', label: '공정번호', sheetName: '공정현황' },
  { value: 'processName', label: '공정명', sheetName: '공정현황' },
  { value: 'level', label: '레벨', sheetName: '공정현황' },
  { value: 'processDesc', label: '공정설명', sheetName: '공정현황' },
  { value: 'equipment', label: '설비/금형/지그', sheetName: '공정현황' },
  { value: 'ep', label: 'EP', sheetName: '검출장치' },
  { value: 'autoDetector', label: '자동검사', sheetName: '검출장치' },
  { value: 'productChar', label: '제품특성', sheetName: '관리항목' },
  { value: 'processChar', label: '공정특성', sheetName: '관리항목' },
  { value: 'specialChar', label: '특별특성', sheetName: '관리항목' },
  { value: 'spec', label: '스펙/공차', sheetName: '관리항목' },
  { value: 'evalMethod', label: '평가방법', sheetName: '관리방법' },
  { value: 'sampleSize', label: '샘플크기', sheetName: '관리방법' },
  { value: 'frequency', label: '주기', sheetName: '관리방법' },
  { value: 'controlMethod', label: '관리방법', sheetName: '관리방법' },
  { value: 'owner1', label: '책임1', sheetName: '관리방법' },
  { value: 'owner2', label: '책임2', sheetName: '관리방법' },
  { value: 'reactionPlan', label: '대응계획', sheetName: '대응계획' },
];

// ★ 미리보기 테이블 컬럼 정의 (퍼센트 기반 - 브라우저 너비 적응)
// 관리컬럼 7% (체크박스1% + No2% + 작업4%) + 데이터컬럼 93%
export const PREVIEW_COLUMNS: PreviewColumn[] = [
  // 공정현황 (5컬럼) - 합계: 28% (공정설명 -2%)
  { key: 'processNo', label: '공정번호', width: 'w-[4%]', group: 'processInfo' },
  { key: 'processName', label: '공정명', width: 'w-[4%]', group: 'processInfo' },
  { key: 'level', label: '레벨', width: 'w-[2%]', group: 'processInfo', smallText: true },
  { key: 'processDesc', label: '공정설명', width: 'w-[10%]', group: 'processInfo' },  // 12% → 10% (-20px)
  { key: 'equipment', label: '설비/금형', width: 'w-[8%]', group: 'processInfo' },
  // 검출장치 (2컬럼) - 합계: 6% (EP, 자동검사 +5px씩)
  { key: 'ep', label: 'EP', width: 'w-[45px]', group: 'detector' },  // 40px → 45px (+5px)
  { key: 'autoDetector', label: '자동검사', width: 'w-[45px]', group: 'detector' },  // 40px → 45px (+5px), 한줄 표시
  // 관리항목 (4컬럼) - 합계: 22%
  { key: 'productChar', label: '제품특성', width: 'w-[6%]', group: 'controlItem' },
  { key: 'processChar', label: '공정특성', width: 'w-[6%]', group: 'controlItem' },
  { key: 'specialChar', label: '특별특성', width: 'w-[4%]', group: 'controlItem' },
  { key: 'spec', label: '스펙/공차', width: 'w-[6%]', group: 'controlItem' },
  // 관리방법 (6컬럼) - 합계: 26% (평가방법 추가 -1%)
  { key: 'evalMethod', label: '평가방법', width: 'w-[8%]', group: 'controlMethod' },  // 9% → 8% (-10px)
  { key: 'sampleSize', label: '샘플', width: 'w-[3%]', group: 'controlMethod' },
  { key: 'frequency', label: '주기', width: 'w-[3%]', group: 'controlMethod' },
  { key: 'controlMethod', label: '관리방법', width: 'w-[6%]', group: 'controlMethod' },  // 7% → 6% (-10px)
  { key: 'owner1', label: '책임1', width: 'w-[3%]', group: 'controlMethod' },
  { key: 'owner2', label: '책임2', width: 'w-[3%]', group: 'controlMethod' },
  // 대응계획 (1컬럼) - 합계: 10%
  { key: 'reactionPlan', label: '조치방법', width: 'w-[10%]', group: 'reactionPlan' },
];
// 총 컬럼 너비: 30% + 12% + 22% + 21% + 10% = 95% (+ 관리컬럼 5% = 100%)

// 그룹별 색상
export const GROUP_COLORS: Record<string, { bg: string; text: string; header: string }> = {
  processInfo: { bg: 'bg-teal-50', text: 'text-teal-700', header: 'bg-teal-600' },
  detector: { bg: 'bg-purple-50', text: 'text-purple-700', header: 'bg-purple-600' },
  controlItem: { bg: 'bg-blue-50', text: 'text-blue-700', header: 'bg-blue-600' },
  controlMethod: { bg: 'bg-green-50', text: 'text-green-700', header: 'bg-green-600' },
  reactionPlan: { bg: 'bg-orange-50', text: 'text-orange-700', header: 'bg-orange-500' },
};

// 그룹 헤더 정보 (순서 변경)
export const GROUP_HEADERS = [
  { key: 'processInfo', label: '공정현황', colSpan: 5, color: 'bg-teal-600' },
  { key: 'detector', label: '검출장치', colSpan: 2, color: 'bg-purple-600' },
  { key: 'controlItem', label: '관리항목', colSpan: 4, color: 'bg-blue-600' },
  { key: 'controlMethod', label: '관리방법', colSpan: 6, color: 'bg-green-600' },
  { key: 'reactionPlan', label: '대응계획', colSpan: 1, color: 'bg-orange-500' },
];

// ★ Tailwind 스타일 상수 - 선명한 글씨체 (font-medium, antialiased)
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
