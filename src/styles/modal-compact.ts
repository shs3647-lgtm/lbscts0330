/**
 * @file modal-compact.ts
 * @description 모달 컴팩트 스타일 공통 모듈
 * @version 1.0.0
 * @created 2026-01-23
 * 
 * 모든 모달에 적용되는 컴팩트 스타일 정의
 * - 상하 패딩 최소화
 * - 화면 공간 효율화
 * - DFMEA/PFMEA 공통 적용
 */

// ============================================================
// 타입 정의
// ============================================================
export interface ModalSectionStyle {
  padding: string;
  minHeight?: string;
  fontSize?: string;
  gap?: string;
}

export interface ModalStyles {
  header: ModalSectionStyle;
  searchBar: ModalSectionStyle;
  addSection: ModalSectionStyle;
  parentInfo: ModalSectionStyle;
  listItem: ModalSectionStyle;
  footer: ModalSectionStyle;
  button: {
    small: string;
    medium: string;
    icon: string;
  };
}

// ============================================================
// 컴팩트 스타일 상수
// ============================================================

/** 모달 컴팩트 스타일 */
export const MODAL_COMPACT: ModalStyles = {
  // 헤더: 타이틀 + 닫기 버튼
  header: {
    padding: 'px-3 py-1.5',     // 상하 패딩 통일 (py-1.5)
    fontSize: 'text-[11px]',
    gap: 'gap-2',
  },
  
  // 검색바 + 액션 버튼 영역
  searchBar: {
    padding: 'px-3 py-1',       // 상하 패딩 1px
    minHeight: 'min-h-[28px]',
    fontSize: 'text-[11px]',
    gap: 'gap-1',
  },
  
  // 새 항목 추가 영역
  addSection: {
    padding: 'px-3 py-1',
    minHeight: 'min-h-[28px]',
    fontSize: 'text-[11px]',
    gap: 'gap-1.5',
  },
  
  // 상위항목 정보 표시 영역
  parentInfo: {
    padding: 'px-3 py-1',
    fontSize: 'text-[10px]',
    gap: 'gap-1',
  },
  
  // 리스트 아이템
  listItem: {
    padding: 'px-3 py-1',       // 아이템 상하 패딩 최소화
    minHeight: 'min-h-[24px]',
    fontSize: 'text-[11px]',
    gap: 'gap-2',
  },
  
  // 푸터 (선택 개수 표시)
  footer: {
    padding: 'px-3 py-1',
    fontSize: 'text-[10px]',
    gap: 'gap-1',
  },
  
  // 버튼 스타일
  button: {
    small: 'px-1.5 py-0.5 text-[9px]',     // 작은 버튼 (닫기, 삭제 등)
    medium: 'px-2 py-1 text-[10px]',       // 중간 버튼 (저장, 적용)
    icon: 'p-1 text-[10px]',               // 아이콘 버튼 (전체, 해제, 적용, 삭제)
  },
};

// ============================================================
// CSS 클래스 조합 유틸리티
// ============================================================

/** 헤더 클래스 조합 */
export const getHeaderClass = (variant: 'blue' | 'gray' | 'green' = 'blue'): string => {
  const baseClasses = `flex items-center justify-between ${MODAL_COMPACT.header.padding} cursor-move select-none`;
  
  const variantClasses = {
    blue: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white',
    gray: 'bg-gradient-to-r from-gray-600 to-gray-700 text-white',
    green: 'bg-gradient-to-r from-green-600 to-green-700 text-white',
  };
  
  return `${baseClasses} ${variantClasses[variant]}`;
};

/** 검색바 컨테이너 클래스 */
export const getSearchBarClass = (): string => {
  return `flex items-center ${MODAL_COMPACT.searchBar.padding} ${MODAL_COMPACT.searchBar.gap} bg-gray-50 border-b`;
};

/** 액션 버튼 그룹 클래스 (전체/해제/적용/삭제) */
export const getActionButtonGroupClass = (): string => {
  return `flex items-center ${MODAL_COMPACT.searchBar.gap} shrink-0`;
};

/** 아이콘 버튼 클래스 (전체, 해제, 적용, 삭제) */
export const getIconButtonClass = (variant: 'default' | 'primary' | 'danger' = 'default'): string => {
  const baseClasses = `${MODAL_COMPACT.button.icon} rounded transition-colors`;
  
  const variantClasses = {
    default: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    primary: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
    danger: 'bg-red-100 hover:bg-red-200 text-red-700',
  };
  
  return `${baseClasses} ${variantClasses[variant]}`;
};

/** 입력 필드 클래스 (검색, 새 항목 입력) */
export const getInputClass = (size: 'small' | 'medium' = 'medium'): string => {
  const sizeClasses = {
    small: 'px-2 py-0.5 text-[10px]',
    medium: 'px-2 py-1 text-[11px]',
  };
  
  return `flex-1 ${sizeClasses[size]} border rounded focus:outline-none focus:ring-1 focus:ring-blue-300`;
};

/** 리스트 아이템 클래스 */
export const getListItemClass = (isSelected: boolean = false): string => {
  const baseClasses = `flex items-center ${MODAL_COMPACT.listItem.padding} ${MODAL_COMPACT.listItem.gap} cursor-pointer border-b border-gray-100 transition-colors`;
  
  return isSelected 
    ? `${baseClasses} bg-blue-50 hover:bg-blue-100`
    : `${baseClasses} hover:bg-gray-50`;
};

/** 배지 클래스 (카테고리 표시) */
export const getBadgeClass = (color: string = 'gray'): string => {
  return `px-1.5 py-0.5 text-[9px] font-medium rounded whitespace-nowrap`;
};

/** 상위항목 정보 영역 클래스 */
export const getParentInfoClass = (): string => {
  return `${MODAL_COMPACT.parentInfo.padding} border-b bg-gradient-to-r from-red-50 to-orange-50 border-red-200`;
};

/** 푸터 클래스 */
export const getFooterClass = (): string => {
  return `${MODAL_COMPACT.footer.padding} bg-gray-50 border-t text-center ${MODAL_COMPACT.footer.fontSize} text-gray-600`;
};

/** 추가 영역 클래스 */
export const getAddSectionClass = (): string => {
  return `flex items-center ${MODAL_COMPACT.addSection.padding} ${MODAL_COMPACT.addSection.gap} border-b bg-green-50`;
};

// ============================================================
// 드롭다운 컴팩트 스타일
// ============================================================

export const DROPDOWN_COMPACT = {
  wrapper: 'relative',
  select: 'px-2 py-0.5 text-[10px] border rounded bg-white cursor-pointer appearance-none pr-6',
  arrow: 'absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[8px]',
};

// ============================================================
// 체크박스 컴팩트 스타일
// ============================================================

export const CHECKBOX_COMPACT = {
  wrapper: 'flex items-center gap-1.5',
  input: 'w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-1',
  label: 'text-[11px] cursor-pointer',
};

// ============================================================
// 모달 컨테이너 스타일
// ============================================================

export const MODAL_CONTAINER = {
  // 기본 컨테이너
  base: 'fixed bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden cursor-move pointer-events-auto',
  
  // 크기 변형
  sizes: {
    small: 'w-[280px] max-w-[280px] min-w-[280px] max-h-[calc(100vh-120px)]',
    medium: 'w-[350px] max-w-[350px] min-w-[350px] max-h-[calc(100vh-120px)]',
    large: 'w-[450px] max-w-[450px] min-w-[450px] max-h-[calc(100vh-100px)]',
    wide: 'w-[600px] max-w-[600px] min-w-[600px] max-h-[calc(100vh-100px)]',
  },
  
  // z-index
  zIndex: 'z-[99999]',
  
  // 배경 오버레이 (클릭 통과)
  overlay: 'fixed inset-0 z-[99998] pointer-events-none',
};

/** 모달 컨테이너 클래스 조합 */
export const getModalContainerClass = (size: 'small' | 'medium' | 'large' | 'wide' = 'medium'): string => {
  return `${MODAL_CONTAINER.base} ${MODAL_CONTAINER.sizes[size]} ${MODAL_CONTAINER.zIndex}`;
};

// ============================================================
// 스크롤 영역 스타일
// ============================================================

export const SCROLL_AREA = {
  base: 'overflow-y-auto flex-1',
  thin: 'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100',
};

/** 스크롤 영역 클래스 */
export const getScrollAreaClass = (): string => {
  return `${SCROLL_AREA.base} ${SCROLL_AREA.thin}`;
};

// ============================================================
// 인라인 스타일 객체 (React style prop용)
// ============================================================

export const modalInlineStyles = {
  /** 아이템 텍스트 - 줄바꿈 허용 */
  itemText: {
    wordBreak: 'break-word' as const,
    whiteSpace: 'normal' as const,
  },
  
  /** 배지 - 한 줄 유지 */
  badge: {
    whiteSpace: 'nowrap' as const,
  },
  
  /** 테이블 셀 - 세로 정렬 */
  tableCell: {
    verticalAlign: 'middle' as const,
  },
};

// ============================================================
// 액션 버튼 아이콘 정의
// ============================================================

export const ACTION_ICONS = {
  selectAll: '☑',
  deselectAll: '☐',
  apply: '✓',
  delete: '×',
  add: '+',
  search: '🔍',
  close: '✕',
  save: '💾',
  edit: '✏',
  expand: '▼',
  collapse: '▲',
};

// ============================================================
// 기본 export
// ============================================================

export default MODAL_COMPACT;
