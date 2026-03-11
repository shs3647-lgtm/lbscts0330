// @ts-nocheck
/**
 * @file syncPfmeaCP.ts
 * @description DFMEA ↔ Control Plan 쌍방향 동기화 로직
 *
 * 연동 필드 (CP_PFMEA_데이터연계성.md 기준):
 * - 공정번호/공정명: DFMEA L2.no/name ↔ CP processNo/processName
 * - 공정설명: DFMEA L3 작업요소(4M+작업요소) ↔ CP processDesc
 * - 작업요소 기능: DFMEA L3.functions ↔ CP workElement
 * - 제품특성: DFMEA L2.functions.productChars ↔ CP productChar
 * - 공정특성: DFMEA L3.functions.processChars ↔ CP processChar
 * - 특별특성: DFMEA specialChar ↔ CP specialChar
 * - 관리방법: DFMEA prevention/detection ↔ CP controlMethod
 */

import { WorksheetState } from '../../constants';
import { CPRow, createEmptyCPRow } from '../../types/controlPlan';

// 동기화 결과
export interface SyncResult {
  success: boolean;
  cpRowsUpdated: number;
  pfmeaRowsUpdated: number;
  newCpRows: number;
  message: string;
}

/**
 * PFMEA → CP 동기화 (PFMEA 기준으로 CP 생성/업데이트)
 */
export function syncPfmeaToCP(state: WorksheetState): { cpRows: CPRow[]; result: SyncResult } {
  const cpRows: CPRow[] = [];
  const riskData = state.riskData || {};
  
  let rowIndex = 0;
  let newRows = 0;
  let updatedRows = 0;
  
  // 기존 CP 행들 (ID 기준 맵)
  const existingCpRows = new Map<string, CPRow>();
  ((state as any).cpRows || []).forEach((row: CPRow) => {
    if (row.pfmeaProcessId && row.pfmeaWorkElemId) {
      existingCpRows.set(`${row.pfmeaProcessId}-${row.pfmeaWorkElemId}`, row);
    }
  });

  // L2 공정 순회
  (state.l2 || []).forEach((proc: any) => {
    if (!proc.name || proc.name.includes('클릭')) return;

    const processNo = proc.no || '';
    const processName = proc.name;

    // L3 작업요소 순회
    (proc.l3 || []).forEach((we: any) => {
      if (!we.name || we.name.includes('클릭') || we.name.includes('추가')) return;

      const m4 = we.m4 || we.fourM || '';
      const workElementName = we.name;

      // ✅ 공정설명 = 4M + 작업요소 (CP_PFMEA_데이터연계성.md 기준)
      const processDesc = m4 ? `[${m4}] ${workElementName}` : workElementName;

      // ✅ 작업요소 기능 = L3.functions에서 추출
      const workElementFunc = (we.functions || [])
        .map((f: any) => f.name)
        .filter((n: string) => n && !n.includes('클릭'))
        .join(', ');

      // 기존 CP 행 찾기
      const existingKey = `${proc.id}-${we.id}`;
      const existing = existingCpRows.get(existingKey);

      // CP 행 생성/업데이트
      const cpRow: CPRow = existing ? { ...existing } : createEmptyCPRow(processNo, processName);

      // DFMEA 데이터로 업데이트
      cpRow.pfmeaProcessId = proc.id;
      cpRow.pfmeaWorkElemId = we.id;
      cpRow.processNo = processNo;
      cpRow.processName = processName;
      cpRow.processType = m4 === 'MC' ? '메인' : m4 === 'MN' ? '작업' : '';
      cpRow.processDesc = processDesc;           // ✅ 4M + 작업요소
      cpRow.workElement = workElementFunc;       // ✅ 작업요소 기능
      
      // 제품특성/공정특성 (L3 functions에서)
      const weFunc = (we.functions || [])[0];
      if (weFunc) {
        cpRow.processChar = weFunc.processChars?.[0]?.name || '';
      }
      
      // L2 제품특성
      const procFunc = (proc.functions || [])[0];
      if (procFunc) {
        cpRow.productChar = procFunc.productChars?.[0]?.name || '';
      }
      
      // 특별특성 (riskData에서)
      cpRow.specialChar = String(riskData[`specialChar-${rowIndex}`] || '');
      
      // 관리방법 (예방관리 + 검출관리)
      const prevention = String(riskData[`prevention-${rowIndex}`] || '');
      const detection = String(riskData[`detection-${rowIndex}`] || '');
      cpRow.controlMethod = [prevention, detection].filter(Boolean).join(' / ') || '작업일지';
      
      // EP 여부 (예방관리에 Poka-Yoke, Fool Proof 포함 시)
      cpRow.ep = prevention.includes('Poka') || prevention.includes('Fool') || prevention.includes('Error');
      
      // 동기화 상태 업데이트
      if (existing) {
        cpRow.syncStatus = 'synced';
        updatedRows++;
      } else {
        cpRow.syncStatus = 'new';
        newRows++;
      }
      cpRow.lastSyncAt = new Date().toISOString();
      
      cpRows.push(cpRow);
      rowIndex++;
    });
  });
  
  return {
    cpRows,
    result: {
      success: true,
      cpRowsUpdated: updatedRows,
      pfmeaRowsUpdated: 0,
      newCpRows: newRows,
      message: `PFMEA → CP 동기화 완료: 신규 ${newRows}건, 업데이트 ${updatedRows}건`
    }
  };
}

/**
 * CP → PFMEA 동기화 (CP에서 수정된 내용을 PFMEA에 반영)
 */
export function syncCPToPfmea(
  state: WorksheetState, 
  cpRows: CPRow[]
): { updatedState: Partial<WorksheetState>; result: SyncResult } {
  const riskData = { ...(state.riskData || {}) };
  let updatedCount = 0;
  
  // CP 행을 PFMEA 인덱스에 매핑
  let rowIndex = 0;
  (state.l2 || []).forEach((proc: any) => {
    if (!proc.name || proc.name.includes('클릭')) return;
    
    (proc.l3 || []).forEach((we: any) => {
      if (!we.name || we.name.includes('클릭') || we.name.includes('추가')) return;
      
      // 해당 CP 행 찾기
      const cpRow = cpRows.find(r => 
        r.pfmeaProcessId === proc.id && r.pfmeaWorkElemId === we.id
      );
      
      if (cpRow && cpRow.syncStatus === 'modified') {
        // 특별특성 동기화
        if (cpRow.specialChar) {
          riskData[`specialChar-${rowIndex}`] = cpRow.specialChar;
        }
        
        // 관리방법 → 예방관리/검출관리 분리
        if (cpRow.controlMethod) {
          const parts = cpRow.controlMethod.split('/').map(s => s.trim());
          if (parts[0]) riskData[`prevention-${rowIndex}`] = parts[0];
          if (parts[1]) riskData[`detection-${rowIndex}`] = parts[1];
        }
        
        updatedCount++;
      }
      
      rowIndex++;
    });
  });
  
  return {
    updatedState: { riskData },
    result: {
      success: true,
      cpRowsUpdated: 0,
      pfmeaRowsUpdated: updatedCount,
      newCpRows: 0,
      message: `CP → PFMEA 동기화 완료: ${updatedCount}건 업데이트`
    }
  };
}

/**
 * 양방향 동기화 (변경된 쪽 → 다른 쪽 반영)
 */
export function syncBidirectional(
  state: WorksheetState,
  cpRows: CPRow[]
): { 
  updatedState: Partial<WorksheetState>; 
  updatedCpRows: CPRow[]; 
  result: SyncResult 
} {
  // 1. PFMEA에서 수정된 항목 → CP 반영
  const { cpRows: syncedFromPfmea, result: pfmeaResult } = syncPfmeaToCP(state);
  
  // 2. CP에서 수정된 항목 → PFMEA 반영
  const modifiedCpRows = cpRows.filter(r => r.syncStatus === 'modified');
  let pfmeaUpdated = 0;
  const riskData = { ...(state.riskData || {}) };
  
  if (modifiedCpRows.length > 0) {
    const cpResult = syncCPToPfmea(state, modifiedCpRows);
    Object.assign(riskData, cpResult.updatedState.riskData);
    pfmeaUpdated = cpResult.result.pfmeaRowsUpdated;
  }
  
  // 3. 모든 행의 동기화 상태를 'synced'로 변경
  const finalCpRows = syncedFromPfmea.map(row => ({
    ...row,
    syncStatus: 'synced' as const,
    lastSyncAt: new Date().toISOString()
  }));
  
  return {
    updatedState: { riskData },
    updatedCpRows: finalCpRows,
    result: {
      success: true,
      cpRowsUpdated: pfmeaResult.cpRowsUpdated + pfmeaResult.newCpRows,
      pfmeaRowsUpdated: pfmeaUpdated,
      newCpRows: pfmeaResult.newCpRows,
      message: `양방향 동기화 완료: CP ${pfmeaResult.newCpRows}건 생성, PFMEA ${pfmeaUpdated}건 업데이트`
    }
  };
}

/**
 * 동기화 상태 확인
 */
export function checkSyncStatus(state: WorksheetState, cpRows: CPRow[]): {
  inSync: boolean;
  pfmeaCount: number;
  cpCount: number;
  diff: number;
} {
  // PFMEA 행 수 계산
  let pfmeaCount = 0;
  (state.l2 || []).forEach((proc: any) => {
    if (!proc.name || proc.name.includes('클릭')) return;
    (proc.l3 || []).forEach((we: any) => {
      if (!we.name || we.name.includes('클릭') || we.name.includes('추가')) return;
      pfmeaCount++;
    });
  });
  
  const cpCount = cpRows.filter(r => r.syncStatus !== 'new' || r.pfmeaProcessId).length;
  const diff = Math.abs(pfmeaCount - cpCount);
  
  return {
    inSync: diff === 0 && cpRows.every(r => r.syncStatus === 'synced'),
    pfmeaCount,
    cpCount,
    diff
  };
}

