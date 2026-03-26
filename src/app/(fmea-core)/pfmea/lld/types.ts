/**
 * @file types.ts
 * @description LLD(필터코드) 통합 타입 정의
 */

// 구분 (classification)
export const CLASSIFICATION_OPTIONS = ['RMA', 'ABN', 'ECN', 'FieldIssue', 'CIP', 'DevIssue'] as const;
export type Classification = typeof CLASSIFICATION_OPTIONS[number];

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  RMA: 'RMA',
  ABN: '이상(ABN)',
  CIP: '개선(CIP)',
  ECN: '변경점(ECN)',
  FieldIssue: 'Field Issue',
  DevIssue: '개발Issue',
};

export const CLASSIFICATION_COLORS: Record<Classification, string> = {
  RMA: '#ef4444',      // red
  ABN: '#f97316',      // orange
  CIP: '#22c55e',      // green
  ECN: '#3b82f6',      // blue
  FieldIssue: '#a855f7', // purple
  DevIssue: '#6366f1',   // indigo
};

// 적용 대상
export const APPLY_TO_OPTIONS = ['prevention', 'detection'] as const;
export type ApplyTo = typeof APPLY_TO_OPTIONS[number];

export const APPLY_TO_LABELS: Record<ApplyTo, string> = {
  prevention: '예방관리',
  detection: '검출관리',
};

// 대상
export const TARGET_OPTIONS = ['설계', '부품', '제조'] as const;

// 상태
export const STATUS_OPTIONS = ['G', 'Y', 'R'] as const;
export const STATUS_COLORS = {
  G: { background: '#92D050', color: '#1F2937', label: '완료' },
  Y: { background: '#FFD966', color: '#1F2937', label: '진행중' },
  R: { background: '#FF6B6B', color: '#FFFFFF', label: '미완료' },
} as const;

// LLD 행 데이터
export interface LLDRow {
  id: string;
  lldNo: string;
  classification: Classification;
  applyTo: ApplyTo;
  processNo: string;
  processName: string;
  productName: string;
  failureMode: string;
  cause: string;
  severity: number | null;
  occurrence: number | null;
  detection: number | null;
  improvement: string;
  preventionImprovement: string;
  detectionImprovement: string;
  vehicle: string;
  target: string;
  owner: string;
  m4Category: string;
  location: string;
  completedDate: string;
  status: 'G' | 'Y' | 'R';
  sourceType: string;
  priority: number;
  fmeaId: string;
  appliedDate: string;
  attachmentUrl: string;
  // CIP 개선 결과
  responsible: string;
  targetDate: string;
  evidence: string;
  newSeverity: number | null;
  newOccurrence: number | null;
  newDetection: number | null;
  newAP: string;
}

// 통계
export interface LLDStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  byClassification: Record<string, number>;
}

// 빈 행 생성
export function createEmptyLLDRow(): LLDRow {
  const year = new Date().getFullYear().toString().slice(-2);
  return {
    id: `lld-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    lldNo: `LLD${year}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`,
    classification: 'CIP',
    applyTo: 'prevention',
    processNo: '',
    processName: '',
    productName: '',
    failureMode: '',
    cause: '',
    severity: null,
    occurrence: null,
    detection: null,
    improvement: '',
    preventionImprovement: '',
    detectionImprovement: '',
    vehicle: '',
    target: '제조',
    owner: '',
    m4Category: '',
    location: '',
    completedDate: '',
    status: 'R',
    sourceType: 'manual',
    priority: 0,
    fmeaId: '',
    appliedDate: '',
    attachmentUrl: '',
    responsible: '',
    targetDate: '',
    evidence: '',
    newSeverity: null,
    newOccurrence: null,
    newDetection: null,
    newAP: '',
  };
}
