/**
 * @file failureLinkTypes.ts
 * @description 고장연결 탭 전용 타입 정의
 */

/** FE (고장 영향) 항목 */
export interface FEItem { 
  id: string; 
  scope: string; 
  feNo: string; 
  text: string; 
  severity?: number; 
}

/** FM (고장 형태) 항목 */
export interface FMItem { 
  id: string; 
  fmNo: string; 
  processName: string; 
  text: string; 
}

/** FC (고장 원인) 항목 */
export interface FCItem { 
  id: string; 
  fcNo: string; 
  processName: string; 
  m4: string; 
  workElem: string; 
  text: string; 
}

/** 연결 결과 */
export interface LinkResult { 
  fmId: string; 
  feId: string; 
  feNo: string; 
  feScope: string; 
  feText: string; 
  severity: number; 
  fmText: string; 
  fmProcess: string; 
  fcId: string; 
  fcNo: string; 
  fcProcess: string; 
  fcM4: string; 
  fcWorkElem: string; 
  fcText: string; 
}

/** 뷰 모드 */
export type ViewMode = 'diagram' | 'result';

/** 편집 모드 */
export type EditMode = 'edit' | 'confirm';

/** FC 연결 범위 */
export type FcLinkScope = 'current' | 'all';



