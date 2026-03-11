/**
 * @file index.ts
 * @description 레이아웃 컴포넌트 배럴 파일
 * @author AI Assistant
 * @created 2025-12-25
 * @version 1.0.0
 * 
 * 모든 레이아웃 컴포넌트를 한 곳에서 export합니다.
 */

// L1: 헤더 (로고, 시스템명, 현재 모듈, 알림/설정/프로필)
export { Header } from './Header';

// 사이드바 (아이콘 중심, 호버 시 확장)
export { Sidebar } from './Sidebar';

// L2: 탑 네비게이션 (워크시트/등록/리스트/CFT/개정)
export { TopNav } from './TopNav';

// L3: 액션바 (저장/열기/검색)
export { ActionBar } from './ActionBar';

// L4: 정보바 (고객/프로젝트/품명/품번/날짜)
export { InfoBar } from './InfoBar';

// L5: 단계바 (FMEA 7단계 + 레벨 선택)
export { StepBar } from './StepBar';

// L7: 상태바 (상태/모듈/단계/레벨/사용자)
export { StatusBar } from './StatusBar';

// 공통 TopNav (반응형)
export { default as CommonTopNav } from './CommonTopNav';
export type { TopNavMenuItem, TopNavStatItem, CommonTopNavProps } from './CommonTopNav';

// 모듈별 TopNav (CommonTopNav 기반)
export { default as PFMEATopNav } from './PFMEATopNav';
export { default as CPTopNav } from './CPTopNav';
export { default as PFDTopNav } from './PFDTopNav';
export { default as APQPTopNav } from './APQPTopNav';

