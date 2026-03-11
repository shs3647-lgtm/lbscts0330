/**
 * @file rowDataBuilder.ts
 * @description 전체보기 탭 행 데이터 생성 유틸리티
 */

import { WorksheetState } from '../../../constants';
import { groupFailureLinksWithFunctionData, groupByProcessName, calculateLastRowMerge } from '../../../utils';

/** 행 데이터 타입 */
export interface AllTabRowData {
  processName: string;
  fmText: string;
  showFm: boolean;
  fmRowSpan: number;
  showProcess: boolean;
  processRowSpan: number;
  fe: { 
    no: string; 
    scope: string; 
    text: string; 
    severity: number; 
    funcData: { typeName: string; funcName: string; reqName: string } | null 
  } | null;
  feRowSpan: number;
  showFe: boolean;
  fc: { 
    no: string; 
    process: string; 
    m4: string; 
    workElem: string; 
    text: string; 
    funcData: { processName: string; workElemName: string; m4: string; funcName: string; processCharName: string } | null 
  } | null;
  fcRowSpan: number;
  showFc: boolean;
  l2FuncData: { processName: string; funcName: string; productCharName: string } | null;
  maxFeSeverity: number;
  allFeSeverities: number[];
  allFeTexts: string[];
}

/** AP 카운트 타입 */
export interface APCounts {
  H: number;
  M: number;
  L: number;
}

/** 빌드 결과 타입 */
export interface RowBuildResult {
  allRows: AllTabRowData[];
  totalFM: number;
  totalFE: number;
  totalFC: number;
  apCounts5: APCounts;
  apCounts6: APCounts;
}

/**
 * 고장연결 데이터에서 행 데이터 빌드
 */
export function buildRowData(failureLinks: any[], state: WorksheetState): RowBuildResult {
  // FM별 그룹핑 + 기능분석 데이터 조회
  const fmGroups = groupFailureLinksWithFunctionData(failureLinks, state);
  
  // 공정명별 그룹핑
  const processGroups = groupByProcessName(fmGroups);
  
  const allRows: AllTabRowData[] = [];
  let globalIdx = 0;
  
  processGroups.forEach((pg, procName) => {
    pg.startIdx = globalIdx;
    let processRowCount = 0;
    
    pg.fmList.forEach((group, fmIdx) => {
      const feCount = group.fes.length;
      const fcCount = group.fcs.length;
      const maxRows = Math.max(feCount, fcCount, 1);
      
      // FM에 연결된 모든 FE의 심각도 및 텍스트 목록 계산
      const allFeSeverities = group.fes.map((fe: any) => fe.severity || 0);
      const allFeTexts = group.fes.map((fe: any) => fe.text || '');
      const maxFeSeverity = allFeSeverities.length > 0 ? Math.max(...allFeSeverities) : 0;
      
      for (let i = 0; i < maxRows; i++) {
        const mergeConfig = calculateLastRowMerge(feCount, fcCount, i, maxRows);
        
        let fe = null;
        if (mergeConfig.showFe && i < feCount) {
          fe = group.fes[i];
        }
        
        let fc = null;
        if (mergeConfig.showFc && i < fcCount) {
          fc = group.fcs[i];
        }
        
        allRows.push({
          processName: procName,
          fmText: group.fmText,
          showFm: i === 0,
          fmRowSpan: maxRows,
          showProcess: fmIdx === 0 && i === 0,
          processRowSpan: 0,
          fe: fe,
          feRowSpan: mergeConfig.feRowSpan,
          showFe: mergeConfig.showFe,
          fc: fc,
          fcRowSpan: mergeConfig.fcRowSpan,
          showFc: mergeConfig.showFc,
          l2FuncData: group.l2FuncData || null,
          maxFeSeverity,
          allFeSeverities,
          allFeTexts,
        });
        
        processRowCount++;
        globalIdx++;
      }
    });
    
    // 공정 rowSpan 설정
    if (pg.startIdx >= 0 && allRows[pg.startIdx]) {
      allRows[pg.startIdx].processRowSpan = processRowCount;
    }
  });
  
  const totalFM = fmGroups.size;
  const totalFE = Array.from(fmGroups.values()).reduce((s, g) => s + g.fes.length, 0);
  const totalFC = Array.from(fmGroups.values()).reduce((s, g) => s + g.fcs.length, 0);
  
  // AP 분석 결과 계산
  const apCounts5: APCounts = { H: 0, M: 0, L: 0 };
  const apCounts6: APCounts = { H: 0, M: 0, L: 0 };
  
  allRows.forEach(row => {
    const maxSeverity = row.maxFeSeverity || 0;
    if (maxSeverity >= 8) apCounts5.H++;
    else if (maxSeverity >= 5) apCounts5.M++;
    else if (maxSeverity >= 1) apCounts5.L++;
  });
  
  return {
    allRows,
    totalFM,
    totalFE,
    totalFC,
    apCounts5,
    apCounts6
  };
}

/**
 * Scope 약어 변환
 */
export function getScopeAbbr(scope: string): string {
  if (scope === 'Your Plant') return 'YOUR PLANT';
  if (scope === 'Ship to Plant') return 'SHIP TO PLANT';
  if (scope === 'User') return 'USER';
  return '';
}

/**
 * 구조분석 4M 찾기
 */
export function getStructureM4(
  row: AllTabRowData, 
  state: WorksheetState
): string {
  if (!row.fc?.workElem) return '';
  
  const l2Data = state.l2 as any[];
  if (!l2Data) return '';
  
  const process = l2Data.find((p: any) => 
    p.name === row.processName || `${p.no}. ${p.name}` === row.processName
  );
  if (!process) return '';
  
  const workElem = process.l3?.find((w: any) => w.name === row.fc?.workElem);
  return workElem?.m4 || '';
}



