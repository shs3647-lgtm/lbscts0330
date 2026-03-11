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
  step: string;
  group: string;
  name: string;
  width: number;
  cellColor: string;
  cellAltColor: string;
  align: 'left' | 'center' | 'right';
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
}

// =====================================================
// 상수 매핑
// =====================================================

/** 컬럼명 → 필드 매핑 */
export const FIELD_MAP: Record<string, string> = {
  '습득교훈': 'lesson',
  '개선결과근거': 'result',
  '책임자성명': 'person',
  '비고': 'note',
  '목표완료일자': 'targetDate',
  '완료일자': 'completeDate',
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

/** 예방/검출관리 모달 타입 매핑 */
export const CONTROL_TYPES: Record<string, ControlModalType> = {
  '예방관리(PC)': 'prevention',
  '예방관리개선': 'prevention-opt',
  '검출관리(DC)': 'detection',
  '검출관리개선': 'detection-opt',
};

/** 재평가 매핑 — 키는 COLUMNS_BASE step='최적화' 컬럼명과 정확히 일치해야 함 */
export const RE_EVAL_MAP: Record<string, 'S' | 'O' | 'D'> = {
  '심각도': 'S', '발생도': 'O', '검출도': 'D',
};

/** 상태별 색상 */
export const STATUS_COLORS: Record<string, string> = {
  '완료': '#4caf50', '진행중': '#2196f3', '지연': '#ff9800', '대기': '#9e9e9e',
};
