/**
 * @file tableStyles.ts
 * @description 워크시트 탭 테이블 공통 스타일 (Tailwind 클래스)
 * 
 * Function/Failure/Structure 탭에서 공통으로 사용하는 테이블 스타일
 */

// 테이블 컨테이너
export const tableContainer = 'p-0 overflow-auto h-full';

// 테이블 기본
export const tableBase = 'w-full border-collapse table-fixed';

// 헤더 공통 (단계 구분)
export const headerStep = {
  structure: 'bg-[#1976d2] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center',
  function: 'bg-[#388e3c] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center',
  failure: 'bg-[#1a237e] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center',
};

// 서브헤더 (2행 항목 그룹)
export const subHeader = {
  structure: 'bg-[#e3f2fd] border border-[#ccc] p-1.5 text-xs font-semibold text-center',
  function: 'bg-[#c8e6c9] border border-[#ccc] p-1.5 text-xs font-semibold text-center',
  failure: 'bg-[#e8eaf6] border border-[#ccc] p-1.5 text-xs font-semibold text-center',
};

// 확정/수정 버튼
export const btnConfirm = 'bg-green-600 text-white border-none px-2.5 py-0.5 rounded text-xs font-semibold cursor-pointer';
export const btnEdit = 'bg-orange-500 text-white border-none px-2.5 py-0.5 rounded text-xs font-semibold cursor-pointer';

// 누락 배지
export const missingBadge = (count: number) => 
  count > 0 
    ? 'bg-orange-500 text-white px-2.5 py-0.5 rounded text-xs font-semibold'
    : 'bg-green-600 text-white px-2.5 py-0.5 rounded text-xs font-semibold';

// 확정 배지
export const confirmedBadge = 'bg-green-600 text-white px-2.5 py-0.5 rounded text-xs font-semibold';

// 데이터 셀 공통
export const dataCell = 'border border-[#ccc] p-1 text-xs align-middle';

// 셀 배경 (zebra stripes)
export const cellBg = (isOdd: boolean) => isOdd ? 'bg-white' : 'bg-[#e3f2fd]';
export const cellBgFunction = (isOdd: boolean) => isOdd ? 'bg-white' : 'bg-[#e8f5e9]';
export const cellBgFailure = (isOdd: boolean) => isOdd ? 'bg-white' : 'bg-[#e8eaf6]';

// 빈 데이터 표시
export const emptyData = 'text-center text-gray-500 py-10 px-5 text-xs';

