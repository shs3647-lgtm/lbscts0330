/**
 * @file schema.ts
 * @description FMEA 원자성 관계형 DB 스키마 (Atomic Relational Schema)
 * 
 * 설계 원칙:
 * 1. 모든 데이터는 원자적 단위(Atomic Unit)로 분리
 * 2. 상위-하위 관계는 외래키(FK)로 명시적 연결
 * 3. 자동변환 금지 - 사용자 입력값 그대로 저장
 * 4. 셀합치기(rowSpan)는 표시용이며 데이터 원자성에 영향 없음
 * 
 * 약어 정의 (참조: terminology.ts):
 * - 4M: Man(MN,사람) / Machine(MC,설비) / In-Material(IM,부자재) / Environment(EN,환경)
 * - 구분: Your Plant(자사) / Ship to Plant(고객사) / User(사용자) ※EU 사용금지
 * - FE: Failure Effect (고장영향)
 * - FM: Failure Mode (고장형태)
 * - FC: Failure Cause (고장원인)
 * - S: Severity (심각도, 1-10)
 * - O: Occurrence (발생도, 1-10)
 * - D: Detection (검출도, 1-10)
 * - PC: Prevention Control (예방관리)
 * - DC: Detection Control (검출관리)
 * - AP: Action Priority (조치우선순위, H/M/L)
 * - RPN: Risk Priority Number (위험우선순위, S×O×D)
 * - SC: Special Characteristic (특별특성, CC/SC/HC 등)
 */

// ============ 기본 원자 단위 ============
export interface AtomicRecord {
  id: string;           // 고유 ID (PK)
  createdAt?: string;   // 생성일
  updatedAt?: string;   // 수정일
}

// ============ 구조분석 (2단계) - Structure Tables ============

/**
 * 1L 완제품 공정 (최상위)
 * - 상위: 없음 (루트)
 * - 하위: L2Structure (메인공정)
 */
export interface L1Structure extends AtomicRecord {
  fmeaId: string;       // FK: FMEA 프로젝트 ID
  name: string;         // 완제품 공정명
  // 확정 상태
  confirmed?: boolean;
}

/**
 * 2L 메인공정
 * - 상위: L1Structure (완제품 공정) - FK: l1Id
 * - 하위: L3Structure (작업요소)
 */
export interface L2Structure extends AtomicRecord {
  fmeaId: string;       // FK: FMEA 프로젝트 ID
  l1Id: string;         // FK: L1Structure.id (상위 완제품 공정)
  no: string;           // 공정 번호
  name: string;         // 공정명
  order: number;        // 순서
}

/**
 * 3L 작업요소
 * - 상위: L2Structure (메인공정) - FK: l2Id
 * - 하위: 없음
 */
export interface L3Structure extends AtomicRecord {
  fmeaId: string;       // FK: FMEA 프로젝트 ID
  l1Id: string;         // FK: L1Structure.id (연결용)
  l2Id: string;         // FK: L2Structure.id (상위 메인공정)
  m4: 'MN' | 'MC' | 'IM' | 'EN' | '';  // 4M 분류
  name: string;         // 작업요소명
  order: number;        // 순서
}

// ============ 기능분석 (3단계) - Function Tables ============

/**
 * 1L 완제품 기능 (구분 → 기능 → 요구사항 통합)
 * - 상위: L1Structure (완제품 공정) - FK: l1StructId
 * - 하위: 없음 (원자적 단위로 분리)
 */
export interface L1Function extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l1StructId: string;     // FK: L1Structure.id (상위 구조분석)
  category: 'Your Plant' | 'Ship to Plant' | 'User';  // 구분
  functionName: string;   // 기능명
  requirement: string;    // 요구사항 (원자 단위)
}

/**
 * 2L 메인공정 기능 (기능 → 제품특성 통합)
 * - 상위: L2Structure (메인공정) - FK: l2StructId
 * - 하위: 없음 (원자적 단위로 분리)
 */
export interface L2Function extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l2StructId: string;     // FK: L2Structure.id (상위 구조분석 - 메인공정)
  functionName: string;   // 기능명
  productChar: string;    // 제품특성 (원자 단위)
  specialChar?: string;   // 특별특성
}

/**
 * 3L 작업요소 기능 (기능 → 공정특성 통합)
 * - 상위: L3Structure (작업요소) - FK: l3StructId
 * - 하위: 없음 (원자적 단위로 분리)
 */
export interface L3Function extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l3StructId: string;     // FK: L3Structure.id (상위 구조분석 - 작업요소)
  l2StructId: string;     // FK: L2Structure.id (연결용 - 메인공정)
  functionName: string;   // 기능명
  processChar: string;    // 공정특성 (원자 단위)
  specialChar?: string;   // 특별특성
}

// ============ 고장분석 (4단계) - Failure Tables ============

/**
 * 1L 고장영향 (Failure Effect - FE)
 * - 상위: L1Function (요구사항) - FK: l1FuncId
 * - 연결: FailureLink를 통해 FM과 연결
 */
export interface FailureEffect extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l1FuncId: string;       // FK: L1Function.id (상위 기능분석 - 요구사항)
  category: 'Your Plant' | 'Ship to Plant' | 'User';  // 구분
  effect: string;         // 고장영향 내용
  severity: number;       // 심각도 (1-10)
}

/**
 * 2L 고장형태 (Failure Mode - FM) - 중심축
 * - 상위: L2Function (제품특성) - FK: l2FuncId
 * - 연결: FailureLink를 통해 FE, FC와 연결
 */
export interface FailureMode extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l2FuncId: string;       // FK: L2Function.id (상위 기능분석 - 제품특성)
  l2StructId: string;     // FK: L2Structure.id (메인공정 - 역전개용)
  mode: string;           // 고장형태 내용
  specialChar?: boolean;  // 특별특성 여부
}

/**
 * 3L 고장원인 (Failure Cause - FC)
 * - 상위: L3Function (공정특성) - FK: l3FuncId
 * - 연결: FailureLink를 통해 FM과 연결
 */
export interface FailureCause extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l3FuncId: string;       // FK: L3Function.id (상위 기능분석 - 공정특성)
  l3StructId: string;     // FK: L3Structure.id (작업요소 - 역전개용)
  l2StructId: string;     // FK: L2Structure.id (메인공정 - 연결용)
  cause: string;          // 고장원인 내용
  occurrence?: number;    // 발생도 (1-10)
}

// ============ 고장연결 (Failure Link) - 관계 테이블 ============

/**
 * 고장연결 (FM을 중심으로 FE, FC 연결)
 * - FM 1 : N FE (고장형태 하나에 여러 고장영향)
 * - FM 1 : N FC (고장형태 하나에 여러 고장원인)
 */
export interface FailureLink extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  
  // 고장형태 (중심축)
  fmId: string;           // FK: FailureMode.id
  
  // 고장영향 (1:N 관계에서 개별 연결)
  feId: string;           // FK: FailureEffect.id
  
  // 고장원인 (1:N 관계에서 개별 연결)
  fcId: string;           // FK: FailureCause.id
  
  // 캐시된 데이터 (조회 성능 최적화)
  cache?: {
    fmText: string;
    fmProcess: string;
    feText: string;
    feCategory: string;
    feSeverity: number;
    fcText: string;
    fcWorkElem: string;
    fcProcess: string;
  };
}

// ============ 리스크분석/최적화 (5-6단계) ============

/**
 * 리스크 분석 결과 (AP 값)
 */
export interface RiskAnalysis extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  linkId: string;         // FK: FailureLink.id
  
  // SOD 값
  severity: number;       // 심각도 (1-10)
  occurrence: number;     // 발생도 (1-10)  
  detection: number;      // 검출도 (1-10)
  
  // AP 결과
  ap: 'H' | 'M' | 'L';    // Action Priority
  
  // 현재 예방/검출 조치
  preventionControl?: string;
  detectionControl?: string;
}

/**
 * 최적화 결과 (6단계)
 */
export interface Optimization extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  riskId: string;         // FK: RiskAnalysis.id
  
  // 개선 조치
  recommendedAction: string;
  responsible: string;
  targetDate: string;
  
  // 개선 후 SOD
  newSeverity?: number;
  newOccurrence?: number;
  newDetection?: number;
  newAP?: 'H' | 'M' | 'L';
  
  // 완료 상태
  status: 'planned' | 'in_progress' | 'completed';
  completedDate?: string;
}

// ============ 워크시트 전체 상태 (통합) ============

/**
 * FMEA 워크시트 DB (원자성 기반)
 */
export interface FMEAWorksheetDB {
  fmeaId: string;
  savedAt: string;
  
  // 구조분석 (2단계) - 원자 테이블
  l1Structure: L1Structure | null;
  l2Structures: L2Structure[];
  l3Structures: L3Structure[];
  
  // 기능분석 (3단계) - 원자 테이블
  l1Functions: L1Function[];
  l2Functions: L2Function[];
  l3Functions: L3Function[];
  
  // 고장분석 (4단계) - 원자 테이블
  failureEffects: FailureEffect[];
  failureModes: FailureMode[];
  failureCauses: FailureCause[];
  
  // 고장연결 (관계 테이블)
  failureLinks: FailureLink[];
  
  // 리스크분석/최적화 (5-6단계)
  riskAnalyses: RiskAnalysis[];
  optimizations: Optimization[];
  
  // 확정 상태
  confirmed: {
    structure: boolean;   // 구조분석 확정
    l1Function: boolean;  // 1L 기능분석 확정
    l2Function: boolean;  // 2L 기능분석 확정
    l3Function: boolean;  // 3L 기능분석 확정
    l1Failure: boolean;   // 1L 고장영향 확정
    l2Failure: boolean;   // 2L 고장형태 확정
    l3Failure: boolean;   // 3L 고장원인 확정
    failureLink: boolean; // 고장연결 확정
    risk: boolean;        // 리스크분석 확정
    optimization: boolean;// 최적화 확정
  };
}

// ============ 유틸리티 함수 ============

export const uid = () => 'id_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);

export const createEmptyDB = (fmeaId: string): FMEAWorksheetDB => ({
  fmeaId,
  savedAt: new Date().toISOString(),
  l1Structure: null,
  l2Structures: [],
  l3Structures: [],
  l1Functions: [],
  l2Functions: [],
  l3Functions: [],
  failureEffects: [],
  failureModes: [],
  failureCauses: [],
  failureLinks: [],
  riskAnalyses: [],
  optimizations: [],
  confirmed: {
    structure: false,
    l1Function: false,
    l2Function: false,
    l3Function: false,
    l1Failure: false,
    l2Failure: false,
    l3Failure: false,
    failureLink: false,
    risk: false,
    optimization: false,
  },
});

// ============ FK 관계 조회 함수 (저장된 관계 기반 표시) ============

/**
 * 고장연결 결과를 FK 관계를 따라 조회하여 전체 데이터 반환
 * - 자동 변환 없음! 사용자가 입력한 데이터 그대로 표시
 * - 각 단계에서 저장된 FK 관계를 따라 상위/하위 데이터 연결
 */
export function getLinkedDataByFK(db: FMEAWorksheetDB): {
  rows: Array<{
    // 구조분석 (2단계) - 저장된 데이터
    l1StructName: string;
    l2StructNo: string;
    l2StructName: string;
    l3StructM4: string;
    l3StructName: string;
    // 기능분석 (3단계) - 저장된 데이터 (FK로 조회)
    l1Category: string;
    l1FuncName: string;
    l1Requirement: string;
    l2FuncName: string;
    l2ProductChar: string;
    l3FuncName: string;
    l3ProcessChar: string;
    // 고장분석 (4단계) - 저장된 데이터 (FK로 조회)
    feCategory: string;
    feText: string;
    feSeverity: number;
    fmText: string;
    fcText: string;
    fcOccurrence: number;
    // 셀합치기용 정보
    fmId: string;
    fmRowSpan: number;
    l2RowSpan: number;
  }>;
} {
  const links = db.failureLinks;
  if (links.length === 0) {
    console.log('[FK조회] 연결된 고장 없음');
    return { rows: [] };
  }
  
  console.log('[FK조회] 시작 - 총 연결 수:', links.length);
  
  // FM별 그룹핑
  const fmGroups = new Map<string, FailureLink[]>();
  links.forEach(link => {
    const group = fmGroups.get(link.fmId) || [];
    group.push(link);
    fmGroups.set(link.fmId, group);
  });
  
  const rows: any[] = [];
  
  // L2(공정)별로 그룹핑
  const l2Groups = new Map<string, { fmId: string; links: FailureLink[] }[]>();
  
  fmGroups.forEach((fmLinks, fmId) => {
    const fm = db.failureModes.find(m => m.id === fmId);
    const l2StructId = fm?.l2StructId || '';
    
    if (!l2Groups.has(l2StructId)) {
      l2Groups.set(l2StructId, []);
    }
    l2Groups.get(l2StructId)!.push({ fmId, links: fmLinks });
  });
  
  // 행 생성 (FK 기반 조회)
  l2Groups.forEach((fmList, l2StructId) => {
    const l2Struct = db.l2Structures.find(s => s.id === l2StructId);
    let l2RowCount = 0;
    
    // L2 내 FM별 행 수 계산
    fmList.forEach(({ links }) => {
      const feCount = links.filter(l => l.feId).length;
      const fcCount = links.filter(l => l.fcId).length;
      l2RowCount += Math.max(feCount, fcCount, 1);
    });
    
    let l2RowIdx = 0;
    fmList.forEach(({ fmId, links }, fmIdx) => {
      const fm = db.failureModes.find(m => m.id === fmId);
      
      // FK로 L2Function 조회
      const l2Func = fm?.l2FuncId ? db.l2Functions.find(f => f.id === fm.l2FuncId) : null;
      
      // FE/FC 분리
      const feLinks = links.filter(l => l.feId && l.feId !== '');
      const fcLinks = links.filter(l => l.fcId && l.fcId !== '');
      const maxRows = Math.max(feLinks.length, fcLinks.length, 1);
      
      for (let i = 0; i < maxRows; i++) {
        const feLink = feLinks[i];
        const fcLink = fcLinks[i];
        
        // FK로 FailureEffect 조회
        const fe = feLink?.feId ? db.failureEffects.find(e => e.id === feLink.feId) : null;
        // FK로 L1Function 조회
        const l1Func = fe?.l1FuncId ? db.l1Functions.find(f => f.id === fe.l1FuncId) : null;
        
        // FK로 FailureCause 조회
        const fc = fcLink?.fcId ? db.failureCauses.find(c => c.id === fcLink.fcId) : null;
        // FK로 L3Structure 조회
        const l3Struct = fc?.l3StructId ? db.l3Structures.find(s => s.id === fc.l3StructId) : null;
        // FK로 L3Function 조회
        const l3Func = fc?.l3FuncId ? db.l3Functions.find(f => f.id === fc.l3FuncId) : null;
        
        rows.push({
          // 구조분석 - DB에서 조회한 값 그대로
          l1StructName: db.l1Structure?.name || '',
          l2StructNo: l2Struct?.no || '',
          l2StructName: l2Struct?.name || (feLink?.cache?.fmProcess || fcLink?.cache?.fcProcess || ''),
          l3StructM4: l3Struct?.m4 || '',
          l3StructName: l3Struct?.name || (fcLink?.cache?.fcWorkElem || ''),
          
          // 기능분석 - FK로 조회한 값 그대로 (없으면 빈값)
          l1Category: l1Func?.category || fe?.category || '',
          l1FuncName: l1Func?.functionName || '',
          l1Requirement: l1Func?.requirement || '',
          l2FuncName: l2Func?.functionName || '',
          l2ProductChar: l2Func?.productChar || '',
          l3FuncName: l3Func?.functionName || '',
          l3ProcessChar: l3Func?.processChar || '',
          
          // 고장분석 - DB에서 조회한 값 그대로
          feCategory: fe?.category || (feLink?.cache?.feCategory || ''),
          feText: fe?.effect || (feLink?.cache?.feText || ''),
          feSeverity: fe?.severity || (feLink?.cache?.feSeverity || 0),
          fmText: fm?.mode || (feLink?.cache?.fmText || fcLink?.cache?.fmText || ''),
          fcText: fc?.cause || (fcLink?.cache?.fcText || ''),
          fcOccurrence: fc?.occurrence || 0,
          
          // 셀합치기용
          fmId: fmId,
          fmRowSpan: i === 0 ? maxRows : 0,
          l2RowSpan: l2RowIdx === 0 && i === 0 ? l2RowCount : 0,
        });
        
        l2RowIdx++;
      }
    });
  });
  
  console.log('[FK조회] 완료 - 총 행 수:', rows.length);
  return { rows };
}

/**
 * 기능분석 입력 시 상위 구조분석 FK 연결 저장
 */
export function linkFunctionToStructure(
  db: FMEAWorksheetDB,
  level: 1 | 2 | 3,
  functionId: string,
  structureId: string
): FMEAWorksheetDB {
  const result = { ...db };
  
  if (level === 1) {
    const func = result.l1Functions.find(f => f.id === functionId);
    if (func) func.l1StructId = structureId;
  } else if (level === 2) {
    const func = result.l2Functions.find(f => f.id === functionId);
    if (func) func.l2StructId = structureId;
  } else if (level === 3) {
    const func = result.l3Functions.find(f => f.id === functionId);
    if (func) func.l3StructId = structureId;
  }
  
  console.log(`[FK연결] L${level}Function ${functionId} → Structure ${structureId}`);
  return result;
}

/**
 * 고장분석 입력 시 상위 기능분석 FK 연결 저장
 */
export function linkFailureToFunction(
  db: FMEAWorksheetDB,
  type: 'FE' | 'FM' | 'FC',
  failureId: string,
  functionId: string
): FMEAWorksheetDB {
  const result = { ...db };
  
  if (type === 'FE') {
    const fe = result.failureEffects.find(f => f.id === failureId);
    if (fe) fe.l1FuncId = functionId;
  } else if (type === 'FM') {
    const fm = result.failureModes.find(f => f.id === failureId);
    if (fm) fm.l2FuncId = functionId;
  } else if (type === 'FC') {
    const fc = result.failureCauses.find(f => f.id === failureId);
    if (fc) fc.l3FuncId = functionId;
  }
  
  console.log(`[FK연결] ${type} ${failureId} → Function ${functionId}`);
  return result;
}

// ============ 단계별 검증 함수 (Validation) ============

export interface ValidationError {
  level: 'error' | 'warning';
  field: string;
  message: string;
  itemId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  missingCount: number;
  totalCount: number;
}

/**
 * 구조분석 (2단계) 검증
 * - L1Structure: 완제품 공정명 필수
 * - L2Structure: 최소 1개 공정, 공정명 필수
 * - L3Structure: 각 공정에 최소 1개 작업요소, 작업요소명 필수
 */
export function validateStructure(db: FMEAWorksheetDB): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let missingCount = 0;
  let totalCount = 0;
  
  // L1 검증
  totalCount++;
  if (!db.l1Structure || !db.l1Structure.name || db.l1Structure.name.trim() === '') {
    errors.push({ level: 'error', field: 'l1Structure.name', message: '완제품 공정명이 누락되었습니다.' });
    missingCount++;
  }
  
  // L2 검증
  if (db.l2Structures.length === 0) {
    errors.push({ level: 'error', field: 'l2Structures', message: '최소 1개의 메인공정이 필요합니다.' });
    missingCount++;
  } else {
    db.l2Structures.forEach((l2, idx) => {
      totalCount++;
      if (!l2.name || l2.name.trim() === '' || l2.name.includes('클릭') || l2.name.includes('선택')) {
        errors.push({ level: 'error', field: `l2Structures[${idx}].name`, message: `${idx + 1}번 공정명이 누락되었습니다.`, itemId: l2.id });
        missingCount++;
      }
      if (!l2.l1Id) {
        warnings.push({ level: 'warning', field: `l2Structures[${idx}].l1Id`, message: `${idx + 1}번 공정의 상위 FK가 누락되었습니다.`, itemId: l2.id });
      }
    });
  }
  
  // L3 검증
  db.l3Structures.forEach((l3, idx) => {
    totalCount++;
    if (!l3.name || l3.name.trim() === '' || l3.name.includes('클릭') || l3.name.includes('추가')) {
      errors.push({ level: 'error', field: `l3Structures[${idx}].name`, message: `작업요소명이 누락되었습니다.`, itemId: l3.id });
      missingCount++;
    }
    if (!l3.l2Id) {
      warnings.push({ level: 'warning', field: `l3Structures[${idx}].l2Id`, message: `작업요소의 상위 공정 FK가 누락되었습니다.`, itemId: l3.id });
    }
  });
  
  console.log(`[검증-구조분석] 총 ${totalCount}개 중 누락 ${missingCount}개`);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingCount,
    totalCount,
  };
}

/**
 * 기능분석 (3단계) 검증
 * - L1Function: 구분, 기능명, 요구사항 필수, l1StructId FK 필수
 * - L2Function: 기능명, 제품특성 필수, l2StructId FK 필수
 * - L3Function: 기능명, 공정특성 필수, l3StructId FK 필수
 */
export function validateFunction(db: FMEAWorksheetDB): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let missingCount = 0;
  let totalCount = 0;
  
  // L1Function 검증
  db.l1Functions.forEach((f, idx) => {
    totalCount++;
    if (!f.category) {
      errors.push({ level: 'error', field: `l1Functions[${idx}].category`, message: '구분이 누락되었습니다.', itemId: f.id });
      missingCount++;
    }
    if (!f.functionName || f.functionName.trim() === '') {
      errors.push({ level: 'error', field: `l1Functions[${idx}].functionName`, message: '완제품 기능명이 누락되었습니다.', itemId: f.id });
      missingCount++;
    }
    if (!f.requirement || f.requirement.trim() === '') {
      errors.push({ level: 'error', field: `l1Functions[${idx}].requirement`, message: '요구사항이 누락되었습니다.', itemId: f.id });
      missingCount++;
    }
    if (!f.l1StructId) {
      warnings.push({ level: 'warning', field: `l1Functions[${idx}].l1StructId`, message: '상위 구조분석 FK가 누락되었습니다.', itemId: f.id });
    }
  });
  
  // L2Function 검증
  db.l2Functions.forEach((f, idx) => {
    totalCount++;
    if (!f.functionName || f.functionName.trim() === '') {
      errors.push({ level: 'error', field: `l2Functions[${idx}].functionName`, message: '메인공정 기능명이 누락되었습니다.', itemId: f.id });
      missingCount++;
    }
    if (!f.productChar || f.productChar.trim() === '') {
      errors.push({ level: 'error', field: `l2Functions[${idx}].productChar`, message: '제품특성이 누락되었습니다.', itemId: f.id });
      missingCount++;
    }
    if (!f.l2StructId) {
      warnings.push({ level: 'warning', field: `l2Functions[${idx}].l2StructId`, message: '상위 구조분석(공정) FK가 누락되었습니다.', itemId: f.id });
    }
  });
  
  // L3Function 검증
  db.l3Functions.forEach((f, idx) => {
    totalCount++;
    if (!f.functionName || f.functionName.trim() === '') {
      errors.push({ level: 'error', field: `l3Functions[${idx}].functionName`, message: '작업요소 기능명이 누락되었습니다.', itemId: f.id });
      missingCount++;
    }
    if (!f.processChar || f.processChar.trim() === '') {
      errors.push({ level: 'error', field: `l3Functions[${idx}].processChar`, message: '공정특성이 누락되었습니다.', itemId: f.id });
      missingCount++;
    }
    if (!f.l3StructId) {
      warnings.push({ level: 'warning', field: `l3Functions[${idx}].l3StructId`, message: '상위 구조분석(작업요소) FK가 누락되었습니다.', itemId: f.id });
    }
  });
  
  console.log(`[검증-기능분석] 총 ${totalCount}개 중 누락 ${missingCount}개`);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingCount,
    totalCount,
  };
}

/**
 * 고장분석 (4단계) 검증
 * - FailureEffect: 고장영향 필수, 심각도 필수, l1FuncId FK 필수
 * - FailureMode: 고장형태 필수, l2FuncId FK 필수
 * - FailureCause: 고장원인 필수, l3FuncId FK 필수
 */
export function validateFailure(db: FMEAWorksheetDB): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let missingCount = 0;
  let totalCount = 0;
  
  // FE 검증
  db.failureEffects.forEach((fe, idx) => {
    totalCount++;
    if (!fe.effect || fe.effect.trim() === '') {
      errors.push({ level: 'error', field: `failureEffects[${idx}].effect`, message: '고장영향이 누락되었습니다.', itemId: fe.id });
      missingCount++;
    }
    if (!fe.severity || fe.severity < 1 || fe.severity > 10) {
      errors.push({ level: 'error', field: `failureEffects[${idx}].severity`, message: '심각도(1-10)가 누락되었습니다.', itemId: fe.id });
      missingCount++;
    }
    if (!fe.l1FuncId) {
      warnings.push({ level: 'warning', field: `failureEffects[${idx}].l1FuncId`, message: '상위 기능분석(요구사항) FK가 누락되었습니다.', itemId: fe.id });
    }
  });
  
  // FM 검증
  db.failureModes.forEach((fm, idx) => {
    totalCount++;
    if (!fm.mode || fm.mode.trim() === '') {
      errors.push({ level: 'error', field: `failureModes[${idx}].mode`, message: '고장형태가 누락되었습니다.', itemId: fm.id });
      missingCount++;
    }
    if (!fm.l2FuncId) {
      warnings.push({ level: 'warning', field: `failureModes[${idx}].l2FuncId`, message: '상위 기능분석(제품특성) FK가 누락되었습니다.', itemId: fm.id });
    }
    if (!fm.l2StructId) {
      warnings.push({ level: 'warning', field: `failureModes[${idx}].l2StructId`, message: '상위 구조분석(공정) FK가 누락되었습니다.', itemId: fm.id });
    }
  });
  
  // FC 검증
  db.failureCauses.forEach((fc, idx) => {
    totalCount++;
    if (!fc.cause || fc.cause.trim() === '') {
      errors.push({ level: 'error', field: `failureCauses[${idx}].cause`, message: '고장원인이 누락되었습니다.', itemId: fc.id });
      missingCount++;
    }
    if (!fc.l3FuncId) {
      warnings.push({ level: 'warning', field: `failureCauses[${idx}].l3FuncId`, message: '상위 기능분석(공정특성) FK가 누락되었습니다.', itemId: fc.id });
    }
    if (!fc.l3StructId) {
      warnings.push({ level: 'warning', field: `failureCauses[${idx}].l3StructId`, message: '상위 구조분석(작업요소) FK가 누락되었습니다.', itemId: fc.id });
    }
  });
  
  console.log(`[검증-고장분석] 총 ${totalCount}개 중 누락 ${missingCount}개`);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingCount,
    totalCount,
  };
}

/**
 * 고장연결 검증
 * - 모든 FM이 최소 1개의 FE와 1개의 FC에 연결되어야 함
 */
export function validateFailureLink(db: FMEAWorksheetDB): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let missingCount = 0;
  let totalCount = db.failureModes.length;
  
  // FM별 연결 확인
  const fmLinked = new Map<string, { feCount: number; fcCount: number }>();
  
  db.failureLinks.forEach(link => {
    if (!fmLinked.has(link.fmId)) {
      fmLinked.set(link.fmId, { feCount: 0, fcCount: 0 });
    }
    const stat = fmLinked.get(link.fmId)!;
    if (link.feId && link.feId !== '') stat.feCount++;
    if (link.fcId && link.fcId !== '') stat.fcCount++;
  });
  
  db.failureModes.forEach((fm, idx) => {
    const stat = fmLinked.get(fm.id);
    if (!stat) {
      errors.push({ level: 'error', field: `failureModes[${idx}]`, message: `고장형태 "${fm.mode}"가 연결되지 않았습니다.`, itemId: fm.id });
      missingCount++;
    } else {
      if (stat.feCount === 0) {
        warnings.push({ level: 'warning', field: `failureModes[${idx}].fe`, message: `고장형태 "${fm.mode}"에 고장영향(FE)이 연결되지 않았습니다.`, itemId: fm.id });
      }
      if (stat.fcCount === 0) {
        warnings.push({ level: 'warning', field: `failureModes[${idx}].fc`, message: `고장형태 "${fm.mode}"에 고장원인(FC)이 연결되지 않았습니다.`, itemId: fm.id });
      }
    }
  });
  
  console.log(`[검증-고장연결] 총 FM ${totalCount}개 중 미연결 ${missingCount}개`);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingCount,
    totalCount,
  };
}

/**
 * 전체 FMEA 검증 (모든 단계)
 */
export function validateAll(db: FMEAWorksheetDB): {
  structure: ValidationResult;
  function: ValidationResult;
  failure: ValidationResult;
  failureLink: ValidationResult;
  overall: { isValid: boolean; totalErrors: number; totalWarnings: number; totalMissing: number };
} {
  const structure = validateStructure(db);
  const func = validateFunction(db);
  const failure = validateFailure(db);
  const failureLink = validateFailureLink(db);
  
  const totalErrors = structure.errors.length + func.errors.length + failure.errors.length + failureLink.errors.length;
  const totalWarnings = structure.warnings.length + func.warnings.length + failure.warnings.length + failureLink.warnings.length;
  const totalMissing = structure.missingCount + func.missingCount + failure.missingCount + failureLink.missingCount;
  
  console.log(`[전체 검증] 에러: ${totalErrors}, 경고: ${totalWarnings}, 누락: ${totalMissing}`);
  
  return {
    structure,
    function: func,
    failure,
    failureLink,
    overall: {
      isValid: totalErrors === 0,
      totalErrors,
      totalWarnings,
      totalMissing,
    },
  };
}

/**
 * 단계별 확정 시 검증 + DB 업데이트
 * - 검증 실패 시 경고 메시지 반환
 * - 검증 성공 시 confirmed 상태 업데이트
 */
export function confirmStep(
  db: FMEAWorksheetDB,
  step: 'structure' | 'l1Function' | 'l2Function' | 'l3Function' | 'l1Failure' | 'l2Failure' | 'l3Failure' | 'failureLink'
): { success: boolean; db: FMEAWorksheetDB; message: string; validation: ValidationResult } {
  let validation: ValidationResult;
  
  switch (step) {
    case 'structure':
      validation = validateStructure(db);
      break;
    case 'l1Function':
    case 'l2Function':
    case 'l3Function':
      validation = validateFunction(db);
      break;
    case 'l1Failure':
    case 'l2Failure':
    case 'l3Failure':
      validation = validateFailure(db);
      break;
    case 'failureLink':
      validation = validateFailureLink(db);
      break;
    default:
      validation = { isValid: true, errors: [], warnings: [], missingCount: 0, totalCount: 0 };
  }
  
  if (!validation.isValid) {
    const errorMessages = validation.errors.map(e => `⚠️ ${e.message}`).join('\n');
    return {
      success: false,
      db,
      message: `❌ 확정 실패: 누락된 항목이 ${validation.missingCount}건 있습니다.\n\n${errorMessages}`,
      validation,
    };
  }
  
  // 확정 상태 업데이트
  const updatedDB = { ...db };
  updatedDB.confirmed = { ...db.confirmed, [step]: true };
  
  const warningMessages = validation.warnings.length > 0 
    ? `\n\n⚠️ 경고 ${validation.warnings.length}건:\n${validation.warnings.map(w => w.message).join('\n')}`
    : '';
  
  return {
    success: true,
    db: updatedDB,
    message: `✅ ${step} 확정 완료!${warningMessages}`,
    validation,
  };
}

// ============ 평탄화 함수 (DB → 화면 표시용) ============

export interface FlattenedRow {
  // 구조분석 (2단계)
  l1StructId: string;
  l1StructName: string;
  l2StructId: string;
  l2StructNo: string;
  l2StructName: string;
  l3StructId: string;
  l3StructM4: string;
  l3StructName: string;
  
  // 기능분석 (3단계)
  l1FuncId: string;
  l1Category: string;
  l1FuncName: string;
  l1Requirement: string;
  l2FuncId: string;
  l2FuncName: string;
  l2ProductChar: string;
  l2SpecialChar: string;
  l3FuncId: string;
  l3FuncName: string;
  l3ProcessChar: string;
  l3SpecialChar: string;
  
  // 고장분석 (4단계)
  feId: string;
  feCategory: string;
  feText: string;
  feSeverity: number;
  fmId: string;
  fmText: string;
  fmSpecialChar: boolean;
  fcId: string;
  fcText: string;
  fcOccurrence: number;
  
  // 셀합치기용 rowSpan 정보
  rowSpans: {
    l1Struct: number;
    l2Struct: number;
    l3Struct: number;
    l1Func: number;
    l2Func: number;
    l3Func: number;
    fm: number;
  };
}

/**
 * DB를 평탄화된 행 배열로 변환 (화면 표시용)
 * 고장연결 데이터를 기준으로 정렬
 */
export function flattenDB(db: FMEAWorksheetDB): FlattenedRow[] {
  const rows: FlattenedRow[] = [];
  const links = db.failureLinks;
  
  if (links.length === 0) return rows;
  
  // FM별 그룹핑하여 정렬
  const fmGroups = new Map<string, FailureLink[]>();
  links.forEach(link => {
    const group = fmGroups.get(link.fmId) || [];
    group.push(link);
    fmGroups.set(link.fmId, group);
  });
  
  // L2(공정)별로 다시 그룹핑
  const l2Groups = new Map<string, Map<string, FailureLink[]>>();
  fmGroups.forEach((fmLinks, fmId) => {
    const fm = db.failureModes.find(m => m.id === fmId);
    if (!fm) return;
    
    const l2Id = fm.l2StructId;
    if (!l2Groups.has(l2Id)) {
      l2Groups.set(l2Id, new Map());
    }
    l2Groups.get(l2Id)!.set(fmId, fmLinks);
  });
  
  // 행 생성
  let globalRowIdx = 0;
  l2Groups.forEach((fmMap, l2StructId) => {
    const l2Struct = db.l2Structures.find(s => s.id === l2StructId);
    const l2RowCount = Array.from(fmMap.values()).reduce((acc, links) => acc + links.length, 0);
    
    let l2RowIdx = 0;
    fmMap.forEach((fmLinks, fmId) => {
      const fm = db.failureModes.find(m => m.id === fmId);
      const l2Func = fm ? db.l2Functions.find(f => f.id === fm.l2FuncId) : null;
      
      fmLinks.forEach((link, linkIdx) => {
        const fe = db.failureEffects.find(e => e.id === link.feId);
        const fc = db.failureCauses.find(c => c.id === link.fcId);
        const l1Func = fe ? db.l1Functions.find(f => f.id === fe.l1FuncId) : null;
        const l3Struct = fc ? db.l3Structures.find(s => s.id === fc.l3StructId) : null;
        const l3Func = fc ? db.l3Functions.find(f => f.id === fc.l3FuncId) : null;
        
        rows.push({
          // 구조분석
          l1StructId: db.l1Structure?.id || '',
          l1StructName: db.l1Structure?.name || '',
          l2StructId: l2Struct?.id || '',
          l2StructNo: l2Struct?.no || '',
          l2StructName: l2Struct?.name || '',
          l3StructId: l3Struct?.id || '',
          l3StructM4: l3Struct?.m4 || '',
          l3StructName: l3Struct?.name || '',
          
          // 기능분석
          l1FuncId: l1Func?.id || '',
          l1Category: l1Func?.category || fe?.category || '',
          l1FuncName: l1Func?.functionName || '',
          l1Requirement: l1Func?.requirement || '',
          l2FuncId: l2Func?.id || '',
          l2FuncName: l2Func?.functionName || '',
          l2ProductChar: l2Func?.productChar || '',
          l2SpecialChar: l2Func?.specialChar || '',
          l3FuncId: l3Func?.id || '',
          l3FuncName: l3Func?.functionName || '',
          l3ProcessChar: l3Func?.processChar || '',
          l3SpecialChar: l3Func?.specialChar || '',
          
          // 고장분석
          feId: fe?.id || '',
          feCategory: fe?.category || '',
          feText: fe?.effect || '',
          feSeverity: fe?.severity || 0,
          fmId: fm?.id || '',
          fmText: fm?.mode || '',
          fmSpecialChar: fm?.specialChar || false,
          fcId: fc?.id || '',
          fcText: fc?.cause || '',
          fcOccurrence: fc?.occurrence || 0,
          
          // rowSpan 계산
          rowSpans: {
            l1Struct: globalRowIdx === 0 ? rows.length + 1 : 0,  // 나중에 재계산
            l2Struct: l2RowIdx === 0 ? l2RowCount : 0,
            l3Struct: 1,
            l1Func: 1,
            l2Func: linkIdx === 0 ? fmLinks.length : 0,
            l3Func: 1,
            fm: linkIdx === 0 ? fmLinks.length : 0,
          }
        });
        
        globalRowIdx++;
        l2RowIdx++;
      });
    });
  });
  
  // L1 rowSpan 재계산
  if (rows.length > 0) {
    rows[0].rowSpans.l1Struct = rows.length;
  }
  
  return rows;
}

