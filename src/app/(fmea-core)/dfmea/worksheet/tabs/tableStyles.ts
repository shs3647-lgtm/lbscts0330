/**
 * @file tableStyles.ts
 * @description 워크시트 탭 테이블 공통 스타일 (Tailwind 클래스)
 * @updated 2026-01-25 - 폰트 표준화
 * ★★★ 표준 ★★★
 * - 1행 헤더: 12px, bold
 * - 2-3행 헤더: 11px, bold
 * - 입력셀: 11px, normal
 */

// 테이블 컨테이너
export const tableContainer = 'p-0 overflow-auto h-full';

// 테이블 기본
export const tableBase = 'w-full border-collapse table-fixed';

// ★★★ 1행 헤더 공통 (12px, bold) ★★★
export const headerStep = {
  structure: 'bg-[#1976d2] text-white border border-[#ccc] p-2 text-[12px] font-bold text-center',
  function: 'bg-[#388e3c] text-white border border-[#ccc] p-2 text-[12px] font-bold text-center',
  failure: 'bg-[#f57c00] text-white border border-[#ccc] p-2 text-[12px] font-bold text-center',  // ★ 남색→주황
};

// ★★★ 2-3행 헤더 (11px, bold) ★★★
export const subHeader = {
  structure: 'bg-[#e3f2fd] border border-[#ccc] p-1.5 text-[11px] font-bold text-center',
  function: 'bg-[#c8e6c9] border border-[#ccc] p-1.5 text-[11px] font-bold text-center',
  failure: 'bg-[#ffe0b2] border border-[#ccc] p-1.5 text-[11px] font-bold text-center',  // ★ 남색→주황
};

// 확정/수정 버튼 (10px)
export const btnConfirm = 'bg-green-600 text-white border-none px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer';
export const btnEdit = 'bg-orange-500 text-white border-none px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer';

// 누락 배지 (10px)
export const missingBadge = (count: number) =>
  count > 0
    ? 'bg-orange-500 text-white px-2.5 py-0.5 rounded text-[10px] font-bold'
    : 'bg-green-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold';

// 확정 배지 (10px)
export const confirmedBadge = 'bg-green-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold';

// ★★★ 데이터 셀 공통 (11px, normal) ★★★
export const dataCell = 'border border-[#ccc] p-1 text-[11px] font-normal align-middle';

// 셀 배경 (zebra stripes) - L1=파랑, L2=녹색, L3=주황
export const cellBg = (isOdd: boolean) => isOdd ? 'bg-white' : 'bg-[#e3f2fd]';          // L1 파랑
export const cellBgFunction = (isOdd: boolean) => isOdd ? 'bg-white' : 'bg-[#e8f5e9]';  // L2 녹색
export const cellBgFailure = (isOdd: boolean) => isOdd ? 'bg-white' : 'bg-[#fff3e0]';   // L3 주황

// 빈 데이터 표시
export const emptyData = 'text-center text-gray-500 py-10 px-5 text-[11px]';

