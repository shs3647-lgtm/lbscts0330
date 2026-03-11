/**
 * @file schema.ts
 * @description Control Plan 원자성 관계형 DB 스키마 (Atomic Relational Schema)
 * 
 * 설계 원칙:
 * 1. 모든 데이터는 원자적 단위(Atomic Unit)로 분리
 * 2. 상위-하위 관계는 외래키(FK)로 명시적 연결
 * 3. 자동변환 금지 - 사용자 입력값 그대로 저장
 * 4. 셀합치기(rowSpan)는 표시용이며 데이터 원자성에 영향 없음
 * 
 * 벤치마킹: FMEA 원자성 DB 구조
 * - FMEA: L1Structure, L2Structure, L3Structure
 * - CP: CpAtomicProcess, CpAtomicDetector, CpAtomicControlItem, CpAtomicControlMethod, CpAtomicReactionPlan
 */

// ============ 기본 원자 단위 ============
export interface AtomicRecord {
  id: string;           // 고유 ID (PK) - 하이브리드 포맷: {CP_SEQ}-{TYPE}-{PATH}-{SEQ}
  createdAt?: string;   // 생성일
  updatedAt?: string;   // 수정일
  
  // ★★★ 모자관계 (부모-자식) ★★★
  parentId?: string;    // 부모 ID (계층 추적용)
  
  // ★★★ 병합 그룹 (같은 그룹 = 같은 데이터) ★★★
  mergeGroupId?: string;  // 병합 그룹 ID
  rowSpan?: number;       // 병합된 행 수 (1 = 비병합)
  colSpan?: number;       // 병합된 열 수 (1 = 비병합)
  
  // ★★★ 인덱싱 정보 ★★★
  rowIndex?: number;      // 행 인덱스
  colIndex?: number;      // 열 인덱스
  sortOrder?: number;     // 정렬 순서
}

// ============ 공정 (1단계) ============

/**
 * CP 공정 (최상위)
 * - 상위: 없음 (루트)
 * - 하위: CpAtomicDetector, CpAtomicControlItem, CpAtomicControlMethod, CpAtomicReactionPlan
 */
export interface CpAtomicProcess extends AtomicRecord {
  cpNo: string;         // FK: CP 프로젝트 번호
  processNo: string;    // 공정번호
  processName: string;  // 공정명
  level?: string;       // Main | Sub
  processDesc?: string; // 공정설명
  equipment?: string;   // 설비/금형/지그
  workElement?: string; // 작업요소
}

// ============ 검출장치 (2단계) ============

/**
 * CP 검출장치
 * - 상위: CpAtomicProcess (공정) - FK: processId
 * - 하위: 없음
 */
export interface CpAtomicDetector extends AtomicRecord {
  cpNo: string;         // FK: CP 프로젝트 번호
  processNo: string;    // FK: 공정번호
  processId: string;    // FK: CpAtomicProcess.id
  ep?: string;          // EP
  autoDetector?: string; // 자동검사장치
}

// ============ 관리항목 (3단계) ============

/**
 * CP 관리항목
 * - 상위: CpAtomicProcess (공정) - FK: processId
 * - 하위: 없음
 */
export interface CpAtomicControlItem extends AtomicRecord {
  cpNo: string;         // FK: CP 프로젝트 번호
  processNo: string;    // FK: 공정번호
  processId: string;    // FK: CpAtomicProcess.id
  productChar?: string; // 제품특성
  processChar?: string; // 공정특성
  specialChar?: string; // 특별특성 (CC/SC/IC)
  spec?: string;        // 스펙/공차
}

// ============ 관리방법 (4단계) ============

/**
 * CP 관리방법
 * - 상위: CpAtomicProcess (공정) - FK: processId
 * - 하위: 없음
 */
export interface CpAtomicControlMethod extends AtomicRecord {
  cpNo: string;         // FK: CP 프로젝트 번호
  processNo: string;    // FK: 공정번호
  processId: string;    // FK: CpAtomicProcess.id
  evalMethod?: string;  // 평가방법
  sampleSize?: string;  // 샘플크기
  frequency?: string;   // 주기
  owner1?: string;      // 책임1
  owner2?: string;      // 책임2
}

// ============ 대응계획 (5단계) ============

/**
 * CP 대응계획
 * - 상위: CpAtomicProcess (공정) - FK: processId
 * - 하위: 없음
 */
export interface CpAtomicReactionPlan extends AtomicRecord {
  cpNo: string;         // FK: CP 프로젝트 번호
  processNo: string;    // FK: 공정번호
  processId: string;    // FK: CpAtomicProcess.id
  productChar?: string; // 제품특성
  processChar?: string; // 공정특성
  reactionPlan?: string; // 대응계획
}

// ============ 확정 상태 ============

/**
 * CP 확정 상태 (단계별 확정)
 */
export interface CpConfirmedState {
  cpNo: string;                    // FK: CP 프로젝트 번호
  processConfirmed: boolean;       // 공정현황 확정
  detectorConfirmed: boolean;      // 검출장치 확정
  controlItemConfirmed: boolean;   // 관리항목 확정
  controlMethodConfirmed: boolean; // 관리방법 확정
  reactionPlanConfirmed: boolean;  // 대응계획 확정
  createdAt?: string;
  updatedAt?: string;
}

// ============ 워크시트 전체 상태 (통합) ============

/**
 * CP 워크시트 DB (원자성 기반)
 */
export interface CPWorksheetDB {
  cpNo: string;
  savedAt: string;
  
  // 공정 (1단계) - 원자 테이블
  processes: CpAtomicProcess[];
  
  // 검출장치 (2단계) - 원자 테이블
  detectors: CpAtomicDetector[];
  
  // 관리항목 (3단계) - 원자 테이블
  controlItems: CpAtomicControlItem[];
  
  // 관리방법 (4단계) - 원자 테이블
  controlMethods: CpAtomicControlMethod[];
  
  // 대응계획 (5단계) - 원자 테이블
  reactionPlans: CpAtomicReactionPlan[];
  
  // 확정 상태
  confirmed: CpConfirmedState;
}

// ============ 유틸리티 함수 ============

export const uid = () => 'id_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);

/**
 * 빈 CP 워크시트 DB 생성
 */
export const createEmptyDB = (cpNo: string): CPWorksheetDB => ({
  cpNo,
  savedAt: new Date().toISOString(),
  processes: [],
  detectors: [],
  controlItems: [],
  controlMethods: [],
  reactionPlans: [],
  confirmed: {
    cpNo,
    processConfirmed: false,
    detectorConfirmed: false,
    controlItemConfirmed: false,
    controlMethodConfirmed: false,
    reactionPlanConfirmed: false,
  },
});

