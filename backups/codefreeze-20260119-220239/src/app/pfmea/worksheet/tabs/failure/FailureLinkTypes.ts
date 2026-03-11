// @ts-nocheck
/**
 * @file FailureLinkTypes.ts
 * @description 고장연결 탭 타입 정의
 * @note 기존 FailureLinkTab.tsx에서 분리됨 (2026-01-19)
 */

/** FE (고장영향) 항목 */
export interface FEItem { 
  id: string; 
  scope: string; 
  feNo: string; 
  text: string; 
  severity?: number;
  // ★ 역전개 정보
  functionName?: string;
  requirement?: string; 
}

/** FM (고장형태) 항목 */
export interface FMItem { 
  id: string; 
  fmNo: string; 
  processName: string; 
  text: string;
  // ★ 역전개 정보 (공정기능, 제품특성)
  processFunction?: string;  // 공정기능
  productChar?: string;      // 제품특성
}

/** FC (고장원인) 항목 */
export interface FCItem { 
  id: string; 
  fcNo: string; 
  processName: string; 
  m4: string; 
  workElem: string; 
  text: string;
  // ★ 역전개 정보 (작업요소 기능, 공정특성)
  workFunction?: string;  // 작업요소 기능
  processChar?: string;   // 공정특성
}

/** 연결 결과 (FM-FE-FC 연결) */
export interface LinkResult { 
  fmId: string; 
  feId: string; 
  feNo: string; 
  feScope: string; 
  feText: string; 
  severity: number; 
  // ★ FE 역전개 정보
  feFunctionName?: string;
  feRequirement?: string;
  fmText: string; 
  fmProcess: string; 
  fcId: string; 
  fcNo: string; 
  fcProcess: string; 
  fcM4: string; 
  fcWorkElem: string; 
  fcText: string;
  // ★ FC 역전개 정보
  fcWorkFunction?: string;  // 작업요소 기능
  fcProcessChar?: string;   // 공정특성
}
