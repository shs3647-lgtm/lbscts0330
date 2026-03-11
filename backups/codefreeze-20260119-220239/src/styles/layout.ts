/**
 * @file layout.ts
 * @description 레이아웃 표준화 상수
 * 
 * ⚠️ 코드프리즈: 2026-01-10
 * 
 * 5개 영역:
 * 1. 사이드바 (48px)
 * 2. 메뉴영역 (제목바 + 메인메뉴 + 탭메뉴)
 * 3. 워크시트 영역 (flex-1)
 * 4. 트리뷰/입력모달/5AP/6AP 영역 (500px) - 통일
 * 5. Status 영역 (우측 상단: 4단계/5단계/6단계 결과)
 */

// ============ 크기 상수 ============
export const LAYOUT = {
  // 사이드바
  sidebar: {
    width: 48,        // px
    class: 'w-12',    // tailwind
  },
  
  // 구분선 (2px 흰색) - 영역 구분용
  divider: {
    width: 2,         // px
    class: 'w-[2px] bg-white',
  },
  
  // 트리뷰/입력모달/5AP/6AP 영역 (350px 통일)
  rightPanel: {
    width: 350,       // px (통일)
    class: 'w-[350px]',
  },
  
  // 우측 상태바 영역 (4단계/5단계/6단계)
  statusBar: {
    width: 280,       // px
    class: 'w-[280px]',
  },
  
  // 메뉴 영역 각 행 높이
  menuRow: {
    titleBar: 40,     // 제목바 (4단계 결과)
    mainMenu: 36,     // 메인메뉴 (5단계 결과)
    tabMenu: 36,      // 탭메뉴 (6단계 결과)
    total: 112,       // 합계
  },
  
  // 콘텐츠 시작 위치
  contentStart: {
    left: 50,         // 사이드바(48) + 구분선(2)
    top: 100,         // 메뉴영역 합계
  },
} as const;

// ============ 구분선 스타일 (2px 흰색 통일) ============
export const DIVIDER = {
  // 세로 구분선 (2px 흰색) - 영역 구분용
  vertical: 'w-[2px] bg-white h-full shrink-0',
  
  // 가로 구분선 (2px 흰색) - 영역 구분용
  horizontal: 'h-[2px] bg-white w-full shrink-0',
  
  // 세로 구분선 (사이드바용)
  sidebar: 'w-[2px] h-full bg-white',
  
  // 워크시트 제목-데이터 구분선 (2px 네이비)
  headerData: 'h-[2px] bg-[#1a237e] w-full shrink-0',
  
  // 테이블 헤더 하단 구분선 (2px 네이비)
  tableHeader: 'border-b-2 border-[#1a237e]',
} as const;

// ============ 영역별 컨테이너 스타일 ============
export const AREA = {
  // 1. 사이드바
  sidebar: 'fixed left-0 top-0 w-12 h-screen z-50 bg-[#1a237e]',
  
  // 2. 메뉴영역 (고정, 우측 350px는 Status용)
  menuArea: 'fixed top-0 left-[53px] right-0 z-40',
  
  // 2-1. 제목바 (4단계 결과)
  titleBar: 'h-10 flex items-stretch bg-[#1565c0]',
  titleBarLeft: 'flex-1 flex items-center px-4',
  titleBarRight: 'w-[350px] shrink-0 flex items-center justify-center bg-[#0d47a1] border-l border-white/20',
  
  // 2-2. 메인메뉴 (5단계 결과)
  mainMenu: 'h-9 flex items-stretch bg-[#1976d2]',
  mainMenuLeft: 'flex-1 flex items-center gap-2 px-3',
  mainMenuRight: 'w-[350px] shrink-0 flex items-center justify-center bg-[#1565c0] border-l border-white/20',
  
  // 2-3. 탭메뉴 (6단계 결과)
  tabMenu: 'h-9 flex items-stretch bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900',
  tabMenuLeft: 'flex-1 flex items-center',
  tabMenuRight: 'w-[350px] shrink-0 flex items-center justify-center bg-indigo-800 border-l border-yellow-400',
  
  // 3. 워크시트 영역
  worksheet: 'flex-1 overflow-auto bg-white',
  
  // 4. 트리뷰 영역 (350px 통일)
  treeView: 'w-[350px] shrink-0 flex flex-col bg-[#f0f4f8] border-l-[3px] border-white',
  
  // 5. Status 영역 (우측 상단에 통합됨)
  status4: 'text-white text-xs font-bold',  // 4단계: S×O×D
  status5: 'text-white text-xs font-bold',  // 5단계: AP H/M/L
  status6: 'text-yellow-400 text-xs font-bold', // 6단계: AP H/M/L
} as const;

// ============ 콘텐츠 래퍼 ============
export const CONTENT = {
  // 전체 콘텐츠 래퍼 (사이드바 + 구분선 이후)
  wrapper: 'ml-[53px] mt-[112px] flex h-[calc(100vh-112px)]',
  
  // 워크시트 + 트리뷰 컨테이너
  main: 'flex flex-1 overflow-hidden',
} as const;

// ============ 공통 스타일 ============
export const COMMON = {
  // 위쪽 정렬
  alignTop: 'items-start',
  
  // 바둑판 정렬 (패딩 없이)
  grid: 'p-0 m-0',
  
  // 스크롤 가능
  scrollable: 'overflow-auto',
  
  // 상단 고정
  stickyTop: 'sticky top-0 z-10',
} as const;

// ============ 직접 접근용 상수 ============
export const RIGHT_PANEL_WIDTH = '350px';  // 우측 패널 (트리뷰/입력모달/5AP/6AP 통일)
export const SIDEBAR_WIDTH = '48px';       // 사이드바
export const DIVIDER_WIDTH = '2px';        // 구분선

