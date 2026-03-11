/**
 * @file process-grouping.ts
 * @description 공정명별 그룹핑 유틸리티 (셀합치기용)
 */

import { FMGroup, ProcessGroup } from './types';

/**
 * FM 그룹을 공정명별로 그룹핑 (셀합치기용)
 * 
 * @param fmGroups FM별로 그룹핑된 데이터
 * @returns 공정명별로 그룹핑된 데이터
 */
export function groupByProcessName(
  fmGroups: Map<string, FMGroup>
): Map<string, ProcessGroup> {
  const processGroups = new Map<string, ProcessGroup>();
  
  Array.from(fmGroups.values()).forEach(group => {
    const procName = group.fmProcess;
    if (!processGroups.has(procName)) {
      processGroups.set(procName, {
        processName: procName,
        fmList: [],
        startIdx: -1,
      });
    }
    processGroups.get(procName)!.fmList.push(group);
  });
  
  return processGroups;
}

/**
 * 공정명별 그룹에서 행 데이터 생성 및 rowSpan 계산
 * 
 * @param processGroups 공정명별 그룹
 * @param calculateRowMerge 행 병합 계산 함수 (각 행마다 호출)
 * @returns 행 데이터 배열
 */
export function generateRowsFromProcessGroups<T>(
  processGroups: Map<string, ProcessGroup>,
  calculateRowMerge: (
    group: FMGroup,
    fmIdx: number,
    rowIdx: number,
    maxRows: number
  ) => T
): T[] {
  const allRows: T[] = [];
  let globalIdx = 0;
  
  processGroups.forEach((pg, procName) => {
    pg.startIdx = globalIdx;
    let processRowCount = 0;
    
    pg.fmList.forEach((group, fmIdx) => {
      const feCount = group.fes.length;
      const fcCount = group.fcs.length;
      const maxRows = Math.max(feCount, fcCount, 1);
      
      for (let i = 0; i < maxRows; i++) {
        const rowData = calculateRowMerge(group, fmIdx, i, maxRows);
        allRows.push(rowData);
        processRowCount++;
        globalIdx++;
      }
    });
    
    // 공정 rowSpan 설정
    if (pg.startIdx >= 0 && allRows[pg.startIdx]) {
      (allRows[pg.startIdx] as any).processRowSpan = processRowCount;
      (allRows[pg.startIdx] as any).showProcess = true;
    }
  });
  
  return allRows;
}









