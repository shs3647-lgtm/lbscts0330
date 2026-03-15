/**
 * @file atomicState.ts
 * @description Atomic DB 기반 워크시트 상태 타입
 *
 * Legacy WorksheetState(중첩 구조)를 대체하는 플랫 Atomic 상태.
 * FMEAWorksheetDB + UI 전용 필드로 구성.
 * UUID는 Import 시 1회 확정되며, 이후 절대 재생성하지 않는다.
 *
 * 비유: 공식 장부(FMEAWorksheetDB) + 메모지(WorksheetUIState)
 * 장부는 DB에 저장하고, 메모지는 브라우저에만 존재한다.
 */

import type { FMEAWorksheetDB } from './schema';
import { createEmptyDB } from './schema';

// ============ UI 전용 필드 (DB에 저장하지 않음) ============

/** UI 전용 상태 — 탭, 검색, 선택 등 브라우저에서만 유지 */
export interface WorksheetUIState {
  /** 현재 활성 탭 ID (Current active tab) */
  tab: string;
  /** 검색 키워드 (Search keyword) */
  search: string;
  /** 선택된 구조 항목 (Selected structure item) */
  selected: { type: 'L1' | 'L2' | 'L3'; id: string | null };
  /** 현재 레벨 뷰 (Level view mode) */
  levelView: string;
  /** 보이는 단계 번호 배열 (Visible step numbers) */
  visibleSteps: number[];
  /** 이전 탭 — 검증 뷰에서 분석 탭 복귀용 (Previous tab for navigation) */
  previousTab?: string;
  /** 이전 검증 모드 — 검증 뷰 복귀용 (Previous verification mode) */
  previousVerificationMode?: string;
  /** 스크롤 대상 항목 ID — 검증 뷰 더블클릭 → 해당 항목 이동 (Scroll target item ID) */
  scrollToItemId?: string;
  /** 고장연결 검증 모드 (Failure link verification mode: FE/FM/FC or null) */
  verificationMode?: 'FE' | 'FM' | 'FC' | null;
  /** FMEA 4판 변환 데이터 (FMEA 4th edition rows) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fmea4Rows?: any[];
}

// ============ Atomic 워크시트 상태 ============

/**
 * Atomic 워크시트 상태 = DB 스키마(공식 장부) + UI 상태(메모지)
 *
 * - FMEAWorksheetDB: Atomic DB에서 로드/저장하는 모든 데이터
 * - WorksheetUIState: 탭 선택, 검색어 등 브라우저에서만 유지되는 임시 상태
 * - riskData: 레거시 호환 딕셔너리 (점진적 제거 예정, RiskAnalysis 테이블로 이전)
 */
export interface AtomicWorksheetState extends FMEAWorksheetDB, WorksheetUIState {
  /** riskData 딕셔너리 (레거시 호환 — 점진적 제거 예정, RiskAnalysis 테이블로 대체) */
  riskData?: Record<string, number | string>;
}

// ============ 기본 UI 상태 ============

/** UI 상태 기본값 (Default UI state) */
const DEFAULT_UI_STATE: WorksheetUIState = {
  tab: 'structure',
  search: '',
  selected: { type: 'L2', id: null },
  levelView: 'all',
  visibleSteps: [2, 3, 4, 5, 6],
  previousTab: undefined,
  previousVerificationMode: undefined,
  scrollToItemId: undefined,
  verificationMode: null,
  fmea4Rows: undefined,
};

// ============ 팩토리 함수 ============

/**
 * AtomicWorksheetState 초기값 생성
 *
 * createEmptyDB()로 빈 DB 스키마를 만들고,
 * 기본 UI 상태를 병합하여 완전한 초기 상태를 반환한다.
 *
 * @param fmeaId - FMEA 프로젝트 ID (필수)
 * @returns 빈 Atomic 워크시트 상태
 */
export function createInitialAtomicState(fmeaId: string): AtomicWorksheetState {
  return {
    ...createEmptyDB(fmeaId),
    ...DEFAULT_UI_STATE,
    riskData: undefined,
  };
}
