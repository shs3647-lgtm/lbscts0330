/**
 * @file worksheet.ts
 * @description 워크시트 표준 스타일
 * @CODEFREEZE 2026-02-16
 *
 * [레벨별 색상 체계] - 구조분석 기준 통일
 * - 1L (완제품공정명): 파란색 (#1976d2)
 * - 2L (메인공정): 녹색 (#388e3c)
 * - 3L (작업요소): 주황색 (#f57c00)
 *
 * 기능분석, 고장분석 모두 동일한 레벨 색상 사용
 */

// ============ 컨테이너 ============
export const container = 'p-0 overflow-auto h-full';
export const table = 'w-full border-collapse table-fixed';

// ============ 셀 구분선 (1px 회색) ============
export const border = 'border border-[#ccc]';

// ============ 제목-데이터 구분선 (2px 네이비) ============
export const headerDataDivider = 'border-b-2 border-[#1a237e]';
export const theadWithDivider = 'sticky top-0 z-20 bg-white border-b-2 border-[#1a237e]';

// ============ 레벨별 표준 색상 (모든 분석에 공통 사용) ============

// 1L 완제품공정명 - 파란색 계열
export const L1 = {
  header: '#1976d2',
  headerLight: '#42a5f5',
  cell: '#e3f2fd',
  cellAlt: '#bbdefb',
  text: '#0d47a1',
  // Tailwind 클래스
  h1: 'bg-[#1976d2] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center',
  h2: 'bg-[#1976d2] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center',
  h3: 'bg-[#e3f2fd] border border-[#ccc] p-1.5 text-xs font-semibold',
  cellClass: 'border border-[#ccc] p-1 text-xs align-middle bg-[#e3f2fd]',
  zebra: (i: number) => i % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-[#bbdefb]',
};

// 2L 메인공정 - 녹색 계열
export const L2 = {
  header: '#388e3c',
  headerLight: '#66bb6a',
  cell: '#e8f5e9',
  cellAlt: '#c8e6c9',
  text: '#1b5e20',
  // Tailwind 클래스
  h1: 'bg-[#388e3c] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center',
  h2: 'bg-[#388e3c] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center',
  h3: 'bg-[#c8e6c9] border border-[#ccc] p-1.5 text-xs font-semibold',
  cellClass: 'border border-[#ccc] p-1 text-xs align-middle bg-[#e8f5e9]',
  zebra: (i: number) => i % 2 === 0 ? 'bg-[#e8f5e9]' : 'bg-[#c8e6c9]',
};

// 3L 작업요소 - 주황색 계열
export const L3 = {
  header: '#f57c00',
  headerLight: '#ff9800',
  cell: '#fff3e0',
  cellAlt: '#ffe0b2',
  text: '#e65100',
  // Tailwind 클래스
  h1: 'bg-[#f57c00] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center',
  h2: 'bg-[#f57c00] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center',
  h3: 'bg-[#ffe0b2] border border-[#ccc] p-1.5 text-xs font-semibold',
  cellClass: 'border border-[#ccc] p-1 text-xs align-middle bg-[#fff3e0]',
  zebra: (i: number) => i % 2 === 0 ? 'bg-[#fff3e0]' : 'bg-[#ffe0b2]',
};

// ============ 하위호환 - 기존 S/F/X 유지 ============

// 1. 구조분석 (파란색) = L1
export const S = {
  h1: L1.h1,
  h2: L1.h2,
  h3: L1.h3,
  cell: L1.cellClass,
  cellBold: 'border border-[#ccc] p-2 text-xs align-middle bg-[#e3f2fd] font-semibold text-center',
  zebra: L1.zebra,
};

// 2. 기능분석 (초록색) = L2
export const F = {
  h1: L2.h1,
  h2: L2.h2,
  h3: L2.h3,
  cell: L2.cellClass,
  cellBold: 'border border-[#ccc] p-2 text-xs align-middle bg-[#e8f5e9] font-semibold',
  zebra: L2.zebra,
};

// 3. 고장분석 (주황색) = L3
export const X = {
  h1: L3.h1,
  h2: L3.h2,
  h3: L3.h3,
  cell: L3.cellClass,
  cellBold: 'border border-[#ccc] p-2 text-xs align-middle bg-[#fff3e0] font-semibold',
  zebra: L3.zebra,
};

// ============ 공통 ============
export const cell = 'border border-[#ccc] p-1 text-xs align-middle';
export const cellCenter = 'border border-[#ccc] p-1 text-xs align-middle text-center';
export const cellP0 = 'border border-[#ccc] p-0 align-middle';

// ============ 버튼/배지 (CRUD 상태 기반) ============
// 🟡 미확정 버튼 (확정 전 상태) - 노란색으로 "아직 미확정" 시각 강조
export const btnConfirm = 'bg-yellow-500 text-white border border-yellow-400 px-2 py-0 rounded text-[10px] font-bold cursor-pointer hover:bg-yellow-600 whitespace-nowrap';

// 🟠 수정 버튼 (확정됨 상태에서 Update 시작) - 주황색
export const btnEdit = 'bg-orange-500 text-white border-none px-2 py-0 rounded text-[10px] font-semibold cursor-pointer hover:bg-orange-600 whitespace-nowrap';

// ⚪ 비활성 버튼
export const btnDisabled = 'bg-gray-400 text-white border-none px-2.5 py-0.5 rounded text-xs font-semibold cursor-not-allowed opacity-70';

// ✅ 확정됨 배지 (Read 상태 - 완료) - 차분한 초록색 (강조 없음)
export const badgeConfirmed = 'bg-green-700 text-white px-2 py-0 rounded text-[10px] font-semibold whitespace-nowrap';

// ✅ 누락 0건 배지 (완료 상태) - 차분한 초록색
export const badgeOk = 'bg-green-700 text-white px-2 py-0 rounded text-[10px] font-semibold whitespace-nowrap';

// 🔴 누락 N건 배지 (입력 필요 - 경고) - 빨간색 (확정 배지와 동일 크기)
export const badgeMissing = 'bg-red-600 text-white px-2 py-0 rounded text-[10px] font-semibold whitespace-nowrap';

// 🟠 개수 배지
export const badgeCount = 'ml-1 bg-orange-500 text-white px-1.5 py-0.5 rounded-lg text-[11px]';

// ============ 구조분석 COUNT 배지 (S1/S2/S3) ============
// 🔴 미입력 (0개) - 적색
export const countZero = 'text-red-500 font-bold';
// 🟢 입력완료 (1개 이상) - 녹색
export const countFilled = 'text-green-600 font-bold';
// 📊 COUNT 컨테이너
export const countContainer = 'flex items-center gap-2 text-xs';
// 📊 COUNT 항목 (라벨 + 숫자)
export const countItem = 'flex items-center gap-0.5';

// ============ 하위 호환 (WS 객체) ============
export const WS = {
  h1Structure: S.h1, h2Structure: S.h2,
  h1Function: F.h1, h2Function: F.h2,
  h1Failure: X.h1, h2Failure: X.h2,
  btnConfirm, btnEdit, btnDisabled,
  badgeOk, badgeConfirmed, badgeMissing, badgeCount,
};
