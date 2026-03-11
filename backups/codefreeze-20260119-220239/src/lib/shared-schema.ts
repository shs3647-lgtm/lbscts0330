/**
 * @file shared-schema.ts
 * @description 공유 원자성 관계형 DB 스키마
 * 
 * 모든 모듈(DFMEA, PFMEA, CP, PFD, WS, PM)에서 공유하는 데이터 구조
 * - 특별특성 (Special Characteristic)
 * - FMEA 결과 (Failure Analysis Results)
 * - 공정 마스터 (Process Master)
 * 
 * 설계 원칙:
 * 1. 원자성 (Atomicity) - 모든 데이터는 개별 레코드
 * 2. FK 참조 - 상위-하위 관계는 명시적 외래키
 * 3. 공유 가능 - 여러 모듈에서 동일 데이터 참조
 */

// ============ 기본 인터페이스 ============

export interface AtomicRecord {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export const uid = () => 'id_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);

// ============ 프로젝트 (최상위) ============

/**
 * APQP 프로젝트 (최상위 컨테이너)
 * - 모든 FMEA, CP, PFD, WS, PM이 여기에 속함
 */
export interface APQPProject extends AtomicRecord {
  name: string;
  productName: string;
  customerName: string;
  status: 'planning' | 'development' | 'production' | 'closed';
  startDate?: string;
  targetDate?: string;
}

// ============ 공정 마스터 (Process Master) - 공유 ============

/**
 * 공정 마스터 - 모든 모듈에서 공유
 * PFMEA, CP, PFD, WS, PM에서 동일 공정 참조
 */
export interface ProcessMaster extends AtomicRecord {
  apqpId: string;           // FK: APQPProject.id
  no: string;               // 공정 번호
  name: string;             // 공정명
  order: number;            // 순서
  description?: string;     // 설명
}

/**
 * 작업요소 마스터 - 공정 하위
 */
export interface WorkElementMaster extends AtomicRecord {
  apqpId: string;           // FK: APQPProject.id
  processId: string;        // FK: ProcessMaster.id
  m4: 'MN' | 'MC' | 'IM' | 'EN' | '';  // 4M 분류
  name: string;             // 작업요소명
  order: number;            // 순서
}

// ============ 특별특성 (Special Characteristic) - 공유 ============

/**
 * 특별특성 마스터
 * - DFMEA, PFMEA, CP, PFD, WS, PM 모두에서 참조
 * - 한 번 정의하면 전체 시스템에서 동일하게 사용
 */
export interface SpecialCharacteristic extends AtomicRecord {
  apqpId: string;           // FK: APQPProject.id
  
  // 분류
  type: 'CC' | 'SC' | 'HIC' | 'SIC' | '';  // CC: Critical, SC: Significant, HIC: High Impact, SIC: Safety Impact
  symbol: string;           // 특성 기호 (예: ◇, ◆, ○, ●)
  
  // 특성 정보
  name: string;             // 특성명
  specification?: string;   // 규격/스펙
  tolerance?: string;       // 공차
  
  // 원천 정보
  sourceType: 'DFMEA' | 'PFMEA' | 'Customer' | 'Internal' | 'Regulation';
  sourceId?: string;        // FK: 원천 FMEA의 ID (있는 경우)
  
  // 연결 정보
  processId?: string;       // FK: ProcessMaster.id (PFMEA인 경우)
  workElementId?: string;   // FK: WorkElementMaster.id
  
  // 상태
  status: 'draft' | 'approved' | 'active' | 'obsolete';
}

/**
 * 특별특성 적용 기록 (어느 모듈에서 사용 중인지 추적)
 */
export interface SpecialCharUsage extends AtomicRecord {
  specialCharId: string;    // FK: SpecialCharacteristic.id
  moduleType: 'DFMEA' | 'PFMEA' | 'CP' | 'PFD' | 'WS' | 'PM';
  moduleItemId: string;     // FK: 해당 모듈의 항목 ID
  apqpId: string;           // FK: APQPProject.id
}

// ============ FMEA 결과 (공유) ============

/**
 * FMEA 분석 결과 - 공유
 * - CP에서 예방/검출 조치 참조
 * - PFD에서 공정 흐름 참조
 * - WS에서 작업 표준 참조
 * - PM에서 예방정비 참조
 */
export interface FMEAResult extends AtomicRecord {
  apqpId: string;           // FK: APQPProject.id
  fmeaType: 'DFMEA' | 'PFMEA';
  fmeaId: string;           // FK: DFMEA 또는 PFMEA의 ID
  
  // 공정 정보
  processId: string;        // FK: ProcessMaster.id
  workElementId?: string;   // FK: WorkElementMaster.id
  
  // 고장분석 결과 (요약)
  failureMode: string;      // 고장형태
  failureEffect: string;    // 고장영향
  failureCause: string;     // 고장원인
  
  // SOD 값
  severity: number;
  occurrence: number;
  detection: number;
  ap: 'H' | 'M' | 'L';      // Action Priority
  
  // 조치
  preventionControl: string;   // 예방 조치
  detectionControl: string;    // 검출 조치
  
  // 특별특성 연결
  specialCharId?: string;   // FK: SpecialCharacteristic.id
  
  // 상태
  status: 'analyzed' | 'action_required' | 'action_completed' | 'verified';
}

// ============ Control Plan (CP) - 원자성 DB ============

/**
 * Control Plan 헤더
 */
export interface ControlPlan extends AtomicRecord {
  apqpId: string;           // FK: APQPProject.id
  name: string;
  revision: string;
  status: 'draft' | 'approved' | 'active' | 'obsolete';
}

/**
 * Control Plan 항목 (원자 단위)
 * - FMEA 결과에서 예방/검출 조치 참조
 * - 특별특성 참조
 */
export interface ControlPlanItem extends AtomicRecord {
  cpId: string;             // FK: ControlPlan.id
  apqpId: string;           // FK: APQPProject.id
  
  // 공정 정보 (FK 참조)
  processId: string;        // FK: ProcessMaster.id
  workElementId?: string;   // FK: WorkElementMaster.id
  
  // FMEA 결과 참조
  fmeaResultId?: string;    // FK: FMEAResult.id
  
  // 제품/공정 특성
  productChar: string;      // 제품 특성
  processChar: string;      // 공정 특성
  
  // 특별특성 (FK 참조)
  specialCharId?: string;   // FK: SpecialCharacteristic.id
  
  // 스펙/공차
  specification: string;
  tolerance: string;
  
  // 측정 시스템
  measurementMethod: string;
  sampleSize: string;
  sampleFrequency: string;
  
  // 관리 방법
  controlMethod: string;
  reactionPlan: string;
}

// ============ Process Flow Diagram (PFD) - 원자성 DB ============

/**
 * PFD 헤더
 */
export interface ProcessFlowDiagram extends AtomicRecord {
  apqpId: string;           // FK: APQPProject.id
  name: string;
  revision: string;
  status: 'draft' | 'approved' | 'active' | 'obsolete';
}

/**
 * PFD 항목 (원자 단위)
 */
export interface PFDItem extends AtomicRecord {
  pfdId: string;            // FK: ProcessFlowDiagram.id
  apqpId: string;           // FK: APQPProject.id
  
  // 공정 정보 (FK 참조)
  processId: string;        // FK: ProcessMaster.id
  
  // 흐름 정보
  stepNo: number;
  stepType: 'operation' | 'inspection' | 'transport' | 'storage' | 'delay';
  symbol: string;           // 흐름도 기호
  
  // 내용
  description: string;
  inputOutput?: string;
  
  // FMEA 결과 참조
  fmeaResultId?: string;    // FK: FMEAResult.id
  
  // 특별특성 (FK 참조)
  specialCharId?: string;   // FK: SpecialCharacteristic.id
}

// ============ Work Standard (WS) - 원자성 DB ============

/**
 * Work Standard 헤더
 */
export interface WorkStandard extends AtomicRecord {
  apqpId: string;           // FK: APQPProject.id
  processId: string;        // FK: ProcessMaster.id
  name: string;
  revision: string;
  status: 'draft' | 'approved' | 'active' | 'obsolete';
}

/**
 * Work Standard 항목 (원자 단위)
 */
export interface WorkStandardItem extends AtomicRecord {
  wsId: string;             // FK: WorkStandard.id
  apqpId: string;           // FK: APQPProject.id
  
  // 작업요소 (FK 참조)
  workElementId: string;    // FK: WorkElementMaster.id
  
  // 작업 내용
  stepNo: number;
  taskDescription: string;
  keyPoint?: string;        // 핵심 포인트
  safetyNote?: string;      // 안전 주의사항
  
  // 품질 관련
  qualityCheck?: string;
  
  // FMEA 결과 참조
  fmeaResultId?: string;    // FK: FMEAResult.id
  
  // 특별특성 (FK 참조)
  specialCharId?: string;   // FK: SpecialCharacteristic.id
  
  // 첨부
  imageUrl?: string;
}

// ============ Preventive Maintenance (PM) - 원자성 DB ============

/**
 * PM 헤더
 */
export interface PreventiveMaintenance extends AtomicRecord {
  apqpId: string;           // FK: APQPProject.id
  equipmentId: string;      // 설비 ID
  equipmentName: string;
  revision: string;
  status: 'draft' | 'approved' | 'active' | 'obsolete';
}

/**
 * PM 항목 (원자 단위)
 */
export interface PMItem extends AtomicRecord {
  pmId: string;             // FK: PreventiveMaintenance.id
  apqpId: string;           // FK: APQPProject.id
  
  // 공정/설비 연결 (FK 참조)
  processId?: string;       // FK: ProcessMaster.id
  
  // 점검 항목
  checkPoint: string;       // 점검 포인트
  checkMethod: string;      // 점검 방법
  standard: string;         // 판정 기준
  
  // 주기
  frequency: string;        // 점검 주기 (daily, weekly, monthly 등)
  
  // FMEA 결과 참조 (예방 조치 연계)
  fmeaResultId?: string;    // FK: FMEAResult.id
  
  // 특별특성 (FK 참조)
  specialCharId?: string;   // FK: SpecialCharacteristic.id
}

// ============ 공유 DB 전체 구조 ============

/**
 * 전체 공유 DB 구조
 */
export interface SharedDB {
  // 프로젝트
  apqpProjects: APQPProject[];
  
  // 공정 마스터 (공유)
  processes: ProcessMaster[];
  workElements: WorkElementMaster[];
  
  // 특별특성 (공유)
  specialChars: SpecialCharacteristic[];
  specialCharUsages: SpecialCharUsage[];
  
  // FMEA 결과 (공유)
  fmeaResults: FMEAResult[];
  
  // Control Plan
  controlPlans: ControlPlan[];
  cpItems: ControlPlanItem[];
  
  // PFD
  pfds: ProcessFlowDiagram[];
  pfdItems: PFDItem[];
  
  // Work Standard
  workStandards: WorkStandard[];
  wsItems: WorkStandardItem[];
  
  // PM
  pms: PreventiveMaintenance[];
  pmItems: PMItem[];
}

export const createEmptySharedDB = (): SharedDB => ({
  apqpProjects: [],
  processes: [],
  workElements: [],
  specialChars: [],
  specialCharUsages: [],
  fmeaResults: [],
  controlPlans: [],
  cpItems: [],
  pfds: [],
  pfdItems: [],
  workStandards: [],
  wsItems: [],
  pms: [],
  pmItems: [],
});

// ============ 유틸리티 함수 ============

/**
 * 특별특성 추가
 */
export function addSpecialChar(db: SharedDB, char: Omit<SpecialCharacteristic, 'id' | 'createdAt'>): SharedDB {
  const newChar: SpecialCharacteristic = {
    ...char,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  return { ...db, specialChars: [...db.specialChars, newChar] };
}

/**
 * 특별특성 사용 등록
 */
export function registerSpecialCharUsage(
  db: SharedDB,
  specialCharId: string,
  moduleType: SpecialCharUsage['moduleType'],
  moduleItemId: string,
  apqpId: string
): SharedDB {
  const usage: SpecialCharUsage = {
    id: uid(),
    specialCharId,
    moduleType,
    moduleItemId,
    apqpId,
    createdAt: new Date().toISOString(),
  };
  return { ...db, specialCharUsages: [...db.specialCharUsages, usage] };
}

/**
 * FMEA 결과를 다른 모듈에서 조회
 */
export function getFMEAResultsForProcess(db: SharedDB, processId: string): FMEAResult[] {
  return db.fmeaResults.filter(r => r.processId === processId);
}

/**
 * 특별특성을 모듈별로 조회
 */
export function getSpecialCharsForModule(
  db: SharedDB, 
  moduleType: SpecialCharUsage['moduleType'],
  apqpId: string
): SpecialCharacteristic[] {
  const usages = db.specialCharUsages.filter(u => u.moduleType === moduleType && u.apqpId === apqpId);
  const charIds = new Set(usages.map(u => u.specialCharId));
  return db.specialChars.filter(c => charIds.has(c.id));
}

/**
 * 공정별 관련 데이터 조회 (CP, PFD, WS, PM 통합)
 */
export function getProcessRelatedData(db: SharedDB, processId: string): {
  process: ProcessMaster | undefined;
  workElements: WorkElementMaster[];
  specialChars: SpecialCharacteristic[];
  fmeaResults: FMEAResult[];
  cpItems: ControlPlanItem[];
  pfdItems: PFDItem[];
  wsItems: WorkStandardItem[];
  pmItems: PMItem[];
} {
  const process = db.processes.find(p => p.id === processId);
  const workElements = db.workElements.filter(w => w.processId === processId);
  const specialChars = db.specialChars.filter(c => c.processId === processId);
  const fmeaResults = db.fmeaResults.filter(r => r.processId === processId);
  const cpItems = db.cpItems.filter(i => i.processId === processId);
  const pfdItems = db.pfdItems.filter(i => i.processId === processId);
  const workElementIds = new Set(workElements.map(w => w.id));
  const wsItems = db.wsItems.filter(i => workElementIds.has(i.workElementId));
  const pmItems = db.pmItems.filter(i => i.processId === processId);
  
  return { process, workElements, specialChars, fmeaResults, cpItems, pfdItems, wsItems, pmItems };
}











