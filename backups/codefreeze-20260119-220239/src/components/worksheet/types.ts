/**
 * FMEA 워크시트 타입 정의
 */

// 탭 타입
export type WorksheetTab = 'structure' | 'function' | 'failure' | 'linkage' | 'risk' | 'optimize';

// 레벨 타입
export type WorksheetLevel = '1' | '2' | '3' | 'all';

// 4M 타입
export type M4Type = 'MN' | 'MC' | 'IM' | 'EN';

// 구분 타입
export type ScopeType = 'Your Plant' | 'Ship to Plant' | 'User';

// L3 작업요소
export interface L3WorkElement {
  id: string;
  m4: M4Type;
  name: string;
  function?: string;
  requirement?: string;
  // 고장원인
  causes?: FailureCause[];
}

// L2 메인공정
export interface L2Process {
  id: string;
  no: string;
  name: string;
  function?: string;
  requirement?: string;
  l3: L3WorkElement[];
  // 고장분석 데이터
  failures?: FailureData[];
}

// L1 완제품공정
export interface L1Product {
  id: string;
  name: string;
  function?: string;
}

// 고장 데이터
export interface FailureData {
  id: string;
  scope: ScopeType;
  fe: string;           // 고장영향
  fm: string;           // 고장형태
  severity: number;     // 심각도 (1-10)
  fmSC: boolean;        // 특별특성
}

// 고장원인
export interface FailureCause {
  id: string;
  fc: string;           // 고장원인
  occurrence: number;   // 발생도 (1-10)
  detection: number;    // 검출도 (1-10)
  prevention: string;   // 현 예방관리
  detectionMethod: string; // 현 검출관리
  ap: 'H' | 'M' | 'L';  // Action Priority
}

// 전체 워크시트 데이터
export interface FMEAWorksheetData {
  id: string;
  projectId: string;
  l1: L1Product;
  l2: L2Process[];
  createdAt: string;
  updatedAt: string;
}

// 탭 정보
export const TAB_INFO: Record<WorksheetTab, { label: string; icon: string }> = {
  structure: { label: '구조분석', icon: '🏗️' },
  function: { label: '기능분석', icon: '⚙️' },
  failure: { label: '고장분석', icon: '⚠️' },
  linkage: { label: '고장연결', icon: '🔗' },
  risk: { label: '리스크분석', icon: '📊' },
  optimize: { label: '최적화', icon: '✨' },
};

// 4M 정보
export const M4_INFO: Record<M4Type, { label: string; color: string; bgColor: string }> = {
  MN: { label: 'Man', color: '#1f4f86', bgColor: '#eef7ff' },
  MC: { label: 'Machine', color: '#8a4f00', bgColor: '#fff3e6' },
  IM: { label: 'Material', color: '#1b6b2a', bgColor: '#f0fff2' },
  EN: { label: 'Environment', color: '#7a1a88', bgColor: '#fef0ff' },
};

// 구분 정보
export const SCOPE_INFO: Record<ScopeType, { label: string; color: string }> = {
  'Your Plant': { label: '자사공정', color: '#1565c0' },
  'Ship to Plant': { label: '고객사', color: '#f57c00' },
  'User': { label: '최종사용자', color: '#2e7d32' },
};















