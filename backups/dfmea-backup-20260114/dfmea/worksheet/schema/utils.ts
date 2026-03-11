/**
 * @file schema/utils.ts
 * @description FMEA 스키마 유틸리티 함수
 */

import { 
  FMEAWorksheetDB, 
  L1Structure, 
  L2Structure, 
  L3Structure,
  L1Function,
  L2Function,
  L3Function,
  FailureEffect,
  FailureMode,
  FailureCause,
  FailureLink,
  RiskAnalysis,
  Optimization,
  FlattenedRow
} from './types';

/**
 * 고유 ID 생성
 */
export const uid = () => 'id_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);

/**
 * 빈 DB 생성
 */
export const createEmptyDB = (fmeaId: string): FMEAWorksheetDB => ({
  fmeaId,
  fmeaName: '',
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
  confirmedSteps: [],
});

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

/**
 * 단계 확정 처리
 */
export function confirmStep(
  db: FMEAWorksheetDB,
  step: number,
  confirm: boolean
): FMEAWorksheetDB {
  const result = { ...db };
  
  if (confirm) {
    if (!result.confirmedSteps.includes(step)) {
      result.confirmedSteps = [...result.confirmedSteps, step].sort();
    }
  } else {
    result.confirmedSteps = result.confirmedSteps.filter(s => s !== step);
  }
  
  console.log(`[단계확정] ${step}단계 → ${confirm ? '확정' : '해제'}`);
  return result;
}
