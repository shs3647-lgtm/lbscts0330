/**
 * @file categories.ts
 * @description 카테고리 설정 + UI 텍스트
 *
 * 새 카테고리 추가 시 3곳 모두 등록:
 * 1. CATEGORY_COLORS - 배지 색상
 * 2. CATEGORY_ICONS  - 트리 아이콘
 * 3. (선택) UI_TEXT   - 다국어 지원 시
 */

// =====================================================
// 카테고리별 배지 색상
// =====================================================

export const CATEGORY_COLORS: Record<string, string> = {
  // FMEA 기본
  'FMEA 유형 정의': 'bg-blue-100 text-blue-700',
  'FMEA Type Definition': 'bg-blue-100 text-blue-700',
  'FMEA 등록': 'bg-green-100 text-green-700',
  '기초정보 Import': 'bg-sky-100 text-sky-700',
  // 워크시트 탭별
  '워크시트': 'bg-pink-100 text-pink-700',
  '구조분석': 'bg-amber-100 text-amber-700',
  '기능분석': 'bg-teal-100 text-teal-700',
  '고장분석': 'bg-red-100 text-red-700',
  '고장연결': 'bg-rose-100 text-rose-700',
  '리스크분석': 'bg-orange-100 text-orange-700',
  '최적화': 'bg-emerald-100 text-emerald-700',
  '전체보기': 'bg-indigo-100 text-indigo-700',
  '편집 기능': 'bg-slate-100 text-slate-700',
  // 관리/모듈
  '리스트 관리': 'bg-cyan-100 text-cyan-700',
  '개정관리': 'bg-lime-100 text-lime-700',
  '데이터 관리': 'bg-gray-200 text-gray-700',
  'Control Plan': 'bg-yellow-100 text-yellow-700',
  'PFD': 'bg-sky-100 text-sky-700',
  'APQP': 'bg-fuchsia-100 text-fuchsia-700',
  // 우측 패널 / 모달
  '우측 패널': 'bg-indigo-50 text-indigo-600',
  '모달': 'bg-rose-50 text-rose-600',
  // My Job / 결재 / 대시보드
  'My Job': 'bg-blue-50 text-blue-600',
  '결재': 'bg-amber-50 text-amber-600',
  '대시보드': 'bg-teal-50 text-teal-600',
  'Top RPN': 'bg-red-100 text-red-800',
  // AP 개선 / 습득교훈
  'AP 개선': 'bg-emerald-50 text-emerald-600',
  '습득교훈': 'bg-cyan-50 text-cyan-600',
  // 기초정보 관리
  '기초정보 관리': 'bg-green-50 text-green-600',
  // DFMEA / 관리자 / WS / PM
  'DFMEA': 'bg-sky-200 text-sky-800',
  '관리자': 'bg-red-50 text-red-600',
  'WS': 'bg-orange-50 text-orange-600',
  'PM': 'bg-lime-50 text-lime-600',
  // 용어집
  '용어집': 'bg-gray-100 text-gray-700',
};

// =====================================================
// 카테고리별 아이콘
// =====================================================

export const CATEGORY_ICONS: Record<string, string> = {
  // FMEA 기본
  'FMEA 유형 정의': '📂',
  'FMEA Type Definition': '📂',
  'FMEA 등록': '📝',
  '기초정보 Import': '📥',
  // 워크시트 탭별
  '워크시트': '📊',
  '구조분석': '🏗️',
  '기능분석': '⚙️',
  '고장분석': '⚠️',
  '고장연결': '🔗',
  '리스크분석': '📐',
  '최적화': '🎯',
  '전체보기': '📋',
  '편집 기능': '✏️',
  // 관리/모듈
  '리스트 관리': '📑',
  '개정관리': '🔄',
  '데이터 관리': '💾',
  'Control Plan': '📋',
  'PFD': '🔀',
  'APQP': '📈',
  // 우측 패널 / 모달
  '우측 패널': '📐',
  '모달': '🔲',
  // My Job / 결재 / 대시보드
  'My Job': '💼',
  '결재': '📑',
  '대시보드': '📊',
  'Top RPN': '📈',
  // AP 개선 / 습득교훈
  'AP 개선': '🎯',
  '습득교훈': '📖',
  // 기초정보 관리
  '기초정보 관리': '🗃️',
  // DFMEA / 관리자 / WS / PM
  'DFMEA': '🔬',
  '관리자': '🔧',
  'WS': '📋',
  'PM': '🔩',
  // 용어집
  '용어집': '📖',
};

// =====================================================
// UI 텍스트 (다국어)
// =====================================================

export const UI_TEXT = {
  ko: {
    searchPlaceholder: '매뉴얼 검색... (예: 마스터, 워크시트, 저장)',
    all: '전체',
    currentPage: '현재 화면',
    noResults: '검색 결과가 없습니다.',
    tryOther: '다른 키워드로 검색해 보세요.',
    totalItems: '총',
    items: '개 항목',
    escToClose: 'ESC로 닫기 | 검색어 입력 후 자동 필터링',
  },
  en: {
    searchPlaceholder: 'Search manual... (e.g., master, worksheet, save)',
    all: 'All',
    currentPage: 'Current Page',
    noResults: 'No results found.',
    tryOther: 'Try different keywords.',
    totalItems: 'Total',
    items: 'items',
    escToClose: 'Press ESC to close | Auto-filter on typing',
  },
};
