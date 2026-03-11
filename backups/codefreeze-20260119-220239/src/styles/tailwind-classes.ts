/**
 * @file tailwind-classes.ts
 * @description 공통 Tailwind CSS 클래스 정의
 * 인라인 스타일 제거 및 일관된 스타일링을 위한 공용 클래스
 * 
 * @version 1.0.0
 */

/** 테이블 스타일 */
export const table = {
  // 테두리
  border: 'border border-[#b0bec5]',
  borderGray: 'border border-gray-300',
  
  // 헤더
  thead: 'sticky top-0 z-20 bg-white',
  mainHeader: 'p-1.5 h-7 font-black text-xs text-center text-white',
  subHeader: 'p-1 h-6 font-bold text-xs text-center',
  colHeader: 'p-0.5 h-5 font-semibold text-xs text-center whitespace-nowrap',
  
  // 셀
  cell: 'px-1 py-0.5 text-xs',
  cellSm: 'px-0.5 py-0.5 text-[8px]',
  cellCenter: 'text-center',
  
  // Zebra
  zebraOdd: 'bg-white',
  zebraEven: 'bg-gray-100',
  
  // 빈 상태
  empty: 'text-center p-10 text-gray-500 text-xs',
};

/** 단계별 색상 */
export const step = {
  // 구조분석 (2단계) - 파란색
  structure: {
    main: 'bg-[#1565c0] text-white',
    header: 'bg-blue-100',
    cell: 'bg-blue-50',
    accent: 'bg-[#1976d2]',
  },
  
  // 기능분석 (3단계) - 녹색
  function: {
    main: 'bg-[#1b5e20] text-white',
    header: 'bg-green-200',
    cell: 'bg-green-50',
    accent: 'bg-[#2e7d32]',
  },
  
  // 고장분석 (4단계) - 주황색/네이비
  failure: {
    main: 'bg-[#f57c00] text-white',
    header: 'bg-orange-200',
    cell: 'bg-orange-50',
    navy: 'bg-[#1a237e] text-white',
    navyLight: 'bg-indigo-100',
  },
  
  // 리스크분석 (5단계) - 보라색
  risk: {
    main: 'bg-[#6a1b9a] text-white',
    prevention: { header: 'bg-green-200', cell: 'bg-green-50' },
    detection: { header: 'bg-blue-100', cell: 'bg-blue-50' },
    evaluation: { header: 'bg-pink-200', cell: 'bg-pink-50' },
  },
  
  // 최적화 (6단계) - 청록색
  optimization: {
    main: 'bg-[#00695c] text-white',
    header: 'bg-teal-100',
    cell: 'bg-teal-50',
  },
  
  // 문서화 (7단계) - 회색
  documentation: {
    main: 'bg-[#37474f] text-white',
    header: 'bg-gray-200',
    cell: 'bg-gray-50',
  },
};

/** 버튼 스타일 */
export const button = {
  base: 'px-3 py-1.5 rounded text-xs font-semibold transition-colors',
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  success: 'bg-green-600 text-white hover:bg-green-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  warning: 'bg-orange-500 text-white hover:bg-orange-600',
  ghost: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  small: 'px-2 py-1 text-[10px]',
};

/** 입력 필드 스타일 */
export const input = {
  base: 'w-full border-none bg-transparent text-xs outline-none px-1',
  focus: 'focus:bg-blue-50',
  placeholder: 'placeholder:text-gray-400',
};

/** 모달 스타일 */
export const modal = {
  overlay: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
  container: 'bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden',
  header: 'px-4 py-3 border-b border-gray-200 flex items-center justify-between',
  title: 'text-lg font-bold',
  body: 'p-4 overflow-auto',
  footer: 'px-4 py-3 border-t border-gray-200 flex justify-end gap-2',
};

/** 트리 패널 스타일 */
export const tree = {
  container: 'flex flex-col h-full',
  header: 'shrink-0 text-white px-3 py-2 text-xs font-bold',
  content: 'flex-1 overflow-auto p-2',
  footer: 'shrink-0 py-1.5 px-2.5 border-t border-gray-300 bg-gray-200 text-[10px] text-gray-600',
  item: 'flex items-center gap-1.5 p-1 rounded',
  branch: 'mb-1.5 ml-2 border-l-2 pl-2',
};

/** 배지 스타일 */
export const badge = {
  base: 'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold',
  high: 'bg-red-100 text-red-800',
  medium: 'bg-orange-100 text-orange-800',
  low: 'bg-green-100 text-green-800',
  info: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
};

/** 레이아웃 스타일 */
export const layout = {
  flex: 'flex',
  flexCol: 'flex flex-col',
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  gap1: 'gap-1',
  gap2: 'gap-2',
  gap4: 'gap-4',
};

/** 텍스트 스타일 */
export const text = {
  xs: 'text-xs',
  sm: 'text-sm',
  xxs: 'text-[10px]',
  xxxs: 'text-[8px]',
  bold: 'font-bold',
  semibold: 'font-semibold',
  center: 'text-center',
  muted: 'text-gray-500',
};

