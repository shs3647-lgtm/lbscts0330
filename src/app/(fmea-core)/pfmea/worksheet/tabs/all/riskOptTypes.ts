/**
 * @file riskOptTypes.ts
 * @description RiskOptCellRenderer 공용 타입 및 상수 정의
 * @created 2026-02-10 RiskOptCellRenderer 1441행 분리
 */

import type { WorksheetState } from '../../constants';

// =====================================================
// 타입 인터페이스
// =====================================================

/** 컬럼 정의 */
export interface RiskOptColumnDef {
  id: number;
  baseId?: number;
  step: string;
  group: string;
  name: string;
  width: number;
  cellColor: string;
  cellAltColor: string;
  align: 'left' | 'center' | 'right';
  isRPN?: boolean;
}

/** 컨트롤 모달 타입 */
export type ControlModalType = 'prevention' | 'detection' | 'specialChar' | 'prevention-opt' | 'detection-opt';

export interface ControlModalState {
  isOpen: boolean;
  type: ControlModalType;
  originalType?: ControlModalType;
  rowIndex: number;
  fmId?: string;
  fcId?: string;
  fcText?: string;
  fmText?: string;
  processNo?: string;
  processName?: string;
  m4?: string;
}

/** 셀 렌더러 Props */
export interface RiskOptCellRendererProps {
  col: RiskOptColumnDef;
  colIdx: number;
  globalRowIdx: number;
  fcRowSpan: number;
  rowInFM: number;
  prevFcRowSpan: number;
  fmId?: string;
  fcId?: string;
  fcText?: string;
  fmText?: string;
  fcM4?: string;
  fcProcessChar?: string;
  fcProcessCharSC?: string;
  fmProductChar?: string;
  fmProductCharSC?: string;
  processNo?: string;
  processName?: string;
  state?: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
  setControlModal?: React.Dispatch<React.SetStateAction<ControlModalState>>;
  handleSODClick: (category: 'S' | 'O' | 'D', targetType: 'risk' | 'opt', rowIndex: number, currentValue?: number, scope?: string, feId?: string, feText?: string, fmId?: string, fcId?: string) => void;
  setApModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; stage: 5 | 6; data: Array<{ id: string; processName: string; failureMode: string; failureCause: string; severity: number; occurrence: number; detection: number; ap: 'H' | 'M' | 'L' }> }>>;
  onApImprove?: (uniqueKey: string, fmId: string, fcId: string, s: number, o: number, d: number, ap: 'H' | 'M' | 'L', failureMode?: string) => void;
  openLldModal?: (rowIndex: number, currentValue?: string, fmId?: string, fcId?: string, fmText?: string, fcText?: string, pcText?: string, dcText?: string) => void;
  openUserModal?: (rowIndex: number, currentValue?: string, fmId?: string, fcId?: string) => void;
  openDateModal?: (rowIndex: number, field: 'targetDate' | 'completionDate', currentValue?: string, fmId?: string, fcId?: string) => void;
  onOpenSpecialChar?: (riskDataKey: string, currentValue: string) => void;
  fmeaRevisionDate?: string;
  isCompact?: boolean;
  // ★ 다중행 개선안 지원 (2026-03-01)
  optIdx?: number;        // 0-based 개선행 인덱스 (기본 0)
  optCount?: number;      // 총 개선행 수 (기본 1)
  baseFcRowSpan?: number; // 원본 fcRowSpan (조정 전, 다중행 셀 rowSpan용)
  onAddOptRow?: (uniqueKey: string) => void;
  onRemoveOptRow?: (uniqueKey: string, optIdx: number) => void;
  groupFirstIds?: number[];
}

// =====================================================
// 상수 매핑
// =====================================================

/** 컬럼 ID → 필드 매핑 (col.name 의존 제거 — PFMEA/DFMEA 공통) */
export const FIELD_MAP_BY_ID: Record<number, string> = {
  22: 'lesson',       // LLD / 습득교훈
  28: 'result',       // 개선결과근거 / 보고서 이름
  25: 'person',       // 책임자성명 / 책임자
  35: 'note',         // 비고
  26: 'targetDate',   // 목표완료일자 / 목표 완료일
  29: 'completeDate', // 완료일자 / 완료일
};

/** 상태 옵션 (한글) */
export const STATUS_OPTIONS = ['완료', '진행중', '지연', '대기'] as const;

/** 한글 → 영문 코드 (DB 저장용) */
export const STATUS_CODE_MAP: Record<string, string> = {
  '완료': 'completed', '진행중': 'progressing', '지연': 'delay', '대기': 'open',
};

/** 영문 코드 → 한글 (DB 로드용) */
export const STATUS_LABEL_MAP: Record<string, string> = {
  'completed': '완료', 'progressing': '진행중', 'delay': '지연', 'open': '대기',
};

/** 컬럼 ID → 예방/검출관리 모달 타입 매핑 (col.name 의존 제거) */
export const CONTROL_TYPES_BY_ID: Record<number, ControlModalType> = {
  16: 'prevention',      // 예방관리(PC)
  23: 'prevention-opt',  // 예방관리개선
  18: 'detection',       // 검출관리(DC)
  24: 'detection-opt',   // 검출관리개선
};

/** 컬럼 ID → 재평가 SOD 카테고리 매핑 (col.name 의존 제거) */
export const RE_EVAL_MAP_BY_ID: Record<number, 'S' | 'O' | 'D'> = {
  30: 'S',  // 심각도(S) 재평가
  31: 'O',  // 발생도(O) 재평가
  32: 'D',  // 검출도(D) 재평가
};

/** 상태별 색상 */
export const STATUS_COLORS: Record<string, string> = {
  '완료': '#4caf50', '진행중': '#2196f3', '지연': '#ff9800', '대기': '#9e9e9e',
};
