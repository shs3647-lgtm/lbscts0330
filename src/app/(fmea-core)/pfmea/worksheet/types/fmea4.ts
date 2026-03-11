/**
 * @file fmea4.ts
 * @description FMEA 4판 (전통적 RPN 방식) 타입 정의
 * 
 * 4판 양식 열 구조:
 * NO+공정명 | 공정기능 | 고장형태(FM) | 특별특성 | 고장영향(FE) | 심각도 | 
 * 특별특성 | 고장원인(FC) | 예방관리(PC) | 발생도 | 검출관리(DC) | 검출도 | RPN |
 * 예방관리개선 | 검출관리개선 | 담당자 | 완료일 | 심각도 | 발생도 | 검출도 | RPN | 비고
 */

// FMEA 4판 행 데이터
export interface Fmea4Row {
  id: string;
  
  // 1. 기본 정보
  processNo: string;        // NO
  processName: string;      // 공정명
  processFunction: string;  // 공정 기능
  
  // 2. 고장 분석
  failureMode: string;      // 고장형태 (FM)
  specialChar1: string;     // 특별특성 (FM 옆)
  failureEffect: string;    // 고장영향 (FE)
  severity: number;         // 심각도 (S) 1-10
  specialChar2: string;     // 특별특성 (S 옆)
  failureCause: string;     // 고장원인 (FC)
  
  // 3. 현재 관리
  preventionControl: string;  // 예방관리 (PC)
  occurrence: number;         // 발생도 (O) 1-10
  detectionControl: string;   // 검출관리 (DC)
  detection: number;          // 검출도 (D) 1-10
  rpn: number;                // RPN = S × O × D
  
  // 4. 개선 조치
  preventionImprove: string;  // 예방관리 개선
  detectionImprove: string;   // 검출관리 개선
  responsible: string;        // 담당자
  targetDate: string;         // 완료일 (YYYY-MM-DD)
  
  // 5. 개선 후 평가
  severityAfter: number;      // 개선 후 심각도
  occurrenceAfter: number;    // 개선 후 발생도
  detectionAfter: number;     // 개선 후 검출도
  rpnAfter: number;           // 개선 후 RPN
  
  // 6. 비고
  remarks: string;
}

// FMEA 4판 문서 전체
export interface Fmea4Document {
  id: string;
  version: '4.0';
  
  // 헤더 정보
  header: {
    fmeaNo: string;           // FMEA 번호
    itemName: string;         // 품목명
    modelYear: string;        // 연식/모델
    coreTeam: string;         // 핵심 팀
    preparedBy: string;       // 작성자
    keyDate: string;          // 주요 일자
    revisedDate: string;      // 수정 일자
    customerName: string;     // 고객명
    supplierName: string;     // 공급업체명
  };
  
  // 데이터 행들
  rows: Fmea4Row[];
  
  // 메타데이터
  createdAt: string;
  updatedAt: string;
}

// 빈 4판 행 생성
export function createEmptyFmea4Row(processNo: string = '', processName: string = ''): Fmea4Row {
  return {
    id: `fmea4-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    processNo,
    processName,
    processFunction: '',
    failureMode: '',
    specialChar1: '',
    failureEffect: '',
    severity: 0,
    specialChar2: '',
    failureCause: '',
    preventionControl: '',
    occurrence: 0,
    detectionControl: '',
    detection: 0,
    rpn: 0,
    preventionImprove: '',
    detectionImprove: '',
    responsible: '',
    targetDate: '',
    severityAfter: 0,
    occurrenceAfter: 0,
    detectionAfter: 0,
    rpnAfter: 0,
    remarks: '',
  };
}

// RPN 계산
export function calculateRPN(s: number, o: number, d: number): number {
  return s * o * d;
}

// RPN 등급 (1000점 만점 기준)
export function getRPNLevel(rpn: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (rpn >= 200) return 'HIGH';
  if (rpn >= 100) return 'MEDIUM';
  return 'LOW';
}

// RPN 색상
export const RPN_COLORS = {
  HIGH: { bg: '#fee2e2', text: '#dc2626', border: '#ef4444' },
  MEDIUM: { bg: '#fef3c7', text: '#d97706', border: '#f59e0b' },
  LOW: { bg: '#dcfce7', text: '#16a34a', border: '#22c55e' },
};

// 4판 열 정의 (헤더용)
export const FMEA4_COLUMNS = [
  { key: 'processNo', label: 'NO', width: 40 },
  { key: 'processName', label: '공정명', width: 80 },
  { key: 'processFunction', label: '공정 기능', width: 120 },
  { key: 'failureMode', label: '고장형태(FM)', width: 100 },
  { key: 'specialChar1', label: '특별특성', width: 50 },
  { key: 'failureEffect', label: '고장영향(FE)', width: 120 },
  { key: 'severity', label: '심각도', width: 45 },
  { key: 'specialChar2', label: '특별특성', width: 50 },
  { key: 'failureCause', label: '고장원인(FC)', width: 120 },
  { key: 'preventionControl', label: '예방관리(PC)', width: 100 },
  { key: 'occurrence', label: '발생도', width: 45 },
  { key: 'detectionControl', label: '검출관리(DC)', width: 100 },
  { key: 'detection', label: '검출도', width: 45 },
  { key: 'rpn', label: 'RPN', width: 50 },
  { key: 'preventionImprove', label: '예방관리개선', width: 100 },
  { key: 'detectionImprove', label: '검출관리개선', width: 100 },
  { key: 'responsible', label: '담당자', width: 60 },
  { key: 'targetDate', label: '완료일', width: 80 },
  { key: 'severityAfter', label: '심각도', width: 45 },
  { key: 'occurrenceAfter', label: '발생도', width: 45 },
  { key: 'detectionAfter', label: '검출도', width: 45 },
  { key: 'rpnAfter', label: 'RPN', width: 50 },
  { key: 'remarks', label: '비고', width: 100 },
];

// 4판 헤더 그룹 (2행 헤더용)
export const FMEA4_HEADER_GROUPS = [
  { label: '공정', colspan: 3 },
  { label: '고장분석', colspan: 6 },
  { label: '현재 관리', colspan: 5 },
  { label: '개선 조치', colspan: 4 },
  { label: '개선 후', colspan: 4 },
  { label: '', colspan: 1 },
];

