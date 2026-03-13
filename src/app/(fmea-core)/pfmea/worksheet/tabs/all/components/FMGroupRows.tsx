/**
 * @file FMGroupRows.tsx
 * @description FM 그룹 1개의 <tr> 행들을 독립 렌더링하는 컴포넌트
 *
 * 성능 최적화 핵심:
 * - expandFMGroupRows useMemo: optCountKey가 바뀔 때만 행확장 재계산
 * - 나머지 FM 그룹은 expandedRows 캐시 유지 (optCountKey 변경 없음)
 * - 셀 렌더링은 기존 CellRenderer 그대로 사용 (각자 React.memo)
 *
 * @created 2026-03-01
 */

'use client';

import React, { useMemo } from 'react';
import { expandFMGroupRows } from '../fmGroupUtils';
import type { ExpandedRow } from '../fmGroupUtils';
import type { ProcessedFMGroup } from '../processFailureLinks';
import type { ColumnDef } from '../allTabConstants';
import { AGGREGATED_OPT_COL_NAMES } from '../multiOptUtils';
import type { WorksheetState } from '../../../constants';
import type { ControlModalState, RiskOptCellRendererProps } from '../riskOptTypes';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** AP 모달 데이터 항목 */
interface APModalDataItem {
  id: string; processName: string; failureMode: string; failureCause: string;
  severity: number; occurrence: number; detection: number; ap: 'H' | 'M' | 'L';
}

/** 셀 렌더러에 전달되는 공통 핸들러 (AllTabEmpty에서 한번만 생성) */
export interface FMGroupHandlers {
  handleSODClick: (category: 'S' | 'O' | 'D', targetType: 'risk' | 'opt' | 'failure', rowIndex: number, currentValue?: number, scope?: string, feId?: string, feText?: string, fmId?: string, fcId?: string) => void;
  setControlModal: React.Dispatch<React.SetStateAction<ControlModalState>>;
  setApModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; stage: 5 | 6; data: APModalDataItem[] }>>;
  handleApImprove: (uniqueKey: string, fmId: string, fcId: string, s: number, o: number, d: number, ap: 'H' | 'M' | 'L', failureMode?: string) => void;
  openLldModal: (rowIndex: number, currentValue?: string, fmId?: string, fcId?: string, fmText?: string, fcText?: string, pcText?: string, dcText?: string) => void;
  openUserModal: (rowIndex: number, currentValue?: string, fmId?: string, fcId?: string) => void;
  openDateModal: (rowIndex: number, field: 'targetDate' | 'completionDate', currentValue?: string, fmId?: string, fcId?: string) => void;
  handleOpenSpecialChar: (riskDataKey: string, currentValue: string) => void;
  handleAddOptRowTracked: (uniqueKey: string) => void;
  handleRemoveOptRow: (uniqueKey: string, rowIdx: number) => void;
  handleNavigateToFailureLink: (fmId: string) => void;
}

export interface FMGroupRowsProps {
  fmGroup: ProcessedFMGroup;
  fmIdx: number;
  columns: ColumnDef[];
  optCountKey: string;
  state: WorksheetState | undefined;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>> | undefined;
  setDirty: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  handlers: FMGroupHandlers;
  loadedFmeaRevisionDate: string;
  isCompact: boolean;
  highlightMissingO: boolean;
  highlightMissingD: boolean;
  // 셀 렌더러 컴포넌트 (AllTabEmpty에서 import 후 전달 — 순환 import 방지)
  RiskOptCellRenderer: React.ComponentType<RiskOptCellRendererProps>;
  FailureCellRenderer: React.ComponentType<Record<string, unknown>>;
  FunctionCellRenderer: React.ComponentType<Record<string, unknown>>;
  StructureCellRenderer: React.ComponentType<Record<string, unknown>>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FMGroupRows — FM 그룹 1개의 <tr> 행들
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FMGroupRows = React.memo(function FMGroupRows({
  fmGroup, fmIdx, columns, optCountKey,
  state, setState, setDirty,
  handlers, loadedFmeaRevisionDate, isCompact,
  highlightMissingO, highlightMissingD,
  RiskOptCellRenderer: RiskOpt,
  FailureCellRenderer: FailureCell,
  FunctionCellRenderer: FuncCell,
  StructureCellRenderer: StructCell,
}: FMGroupRowsProps) {

  // ★ 핵심: optCountKey가 바뀔 때만 행확장 재계산
  const rowOptCounts = useMemo(() => {
    return optCountKey.split(',').map(Number);
  }, [optCountKey]);

  const expandedRows = useMemo(() => {
    return expandFMGroupRows(fmGroup, rowOptCounts, fmIdx);
  }, [fmGroup, rowOptCounts, fmIdx]);

  return (
    <>
      {expandedRows.map((er: ExpandedRow) => {
        // ★ fcId 빈값 방어: fcId='' 시 rowInFM 기반 대체키로 데이터 충돌 방지
        const uk = er.row.fcId
          ? `${er.fmGroup.fmId}-${er.row.fcId}`
          : `${er.fmGroup.fmId}-r${er.rowInFM}`;
        const oMissing = highlightMissingO && !Number(state?.riskData?.[`risk-${uk}-O`]);
        const dMissing = highlightMissingD && !Number(state?.riskData?.[`risk-${uk}-D`]);
        const highlightBg = oMissing && dMissing ? '#fff3e0'
          : oMissing ? '#ffebee'
          : dMissing ? '#e0f7fa'
          : undefined;

        return (
          <tr
            key={`fm-${er.fmGroup.fmId}-${er.rowInFM}-opt${er.optIdx}`}
            data-uk={uk}
            data-last-row={er.isLastRowOfFM ? 'true' : undefined}
            style={{ ...er.fmDividerStyle, ...(highlightBg ? { backgroundColor: highlightBg } : {}) }}
          >
            {columns.map((col, colIdx) => {
              // ★ optIdx > 0 (추가 개선행): step 6 다중행 컬럼만 렌더링
              if (er.optIdx > 0) {
                if (col.step !== '최적화') return null;
                if (AGGREGATED_OPT_COL_NAMES.has(col.name)) return null;
                return (
                  <RiskOpt
                    key={colIdx} col={col} colIdx={colIdx} globalRowIdx={0}
                    fcRowSpan={1} rowInFM={er.rowInFM} prevFcRowSpan={1}
                    fmId={er.fmGroup.fmId} fcId={er.row.fcId} fcText={er.row.fcText}
                    fmText={er.fmGroup.fmText} fcM4={er.row.fcM4}
                    fcProcessChar={er.row.fcProcessChar} fcProcessCharSC={er.row.fcProcessCharSC}
                    fmProductChar={er.fmGroup.fmProductChar} fmProductCharSC={er.fmGroup.fmProductCharSC}
                    processNo={er.fmGroup.fmProcessNo} processName={er.fmGroup.fmProcessName}
                    state={state} setState={setState} setDirty={setDirty}
                    setControlModal={handlers.setControlModal}
                    handleSODClick={handlers.handleSODClick}
                    setApModal={handlers.setApModal}
                    onApImprove={handlers.handleApImprove}
                    openLldModal={handlers.openLldModal}
                    openUserModal={handlers.openUserModal}
                    openDateModal={handlers.openDateModal}
                    onOpenSpecialChar={handlers.handleOpenSpecialChar}
                    fmeaRevisionDate={loadedFmeaRevisionDate}
                    isCompact={isCompact}
                    optIdx={er.optIdx} optCount={er.optCount} baseFcRowSpan={er.baseFcRowSpan}
                    onAddOptRow={handlers.handleAddOptRowTracked}
                    onRemoveOptRow={handlers.handleRemoveOptRow}
                  />
                );
              }
              // ★ optIdx === 0: 기존 렌더링 (adjusted rowSpan 자동 적용)
              if (col.step === '고장분석') {
                return (
                  <FailureCell
                    key={colIdx} col={col} colIdx={colIdx}
                    fmGroup={er.fmGroup} fmIdx={er.fmIdx} row={er.row}
                    rowInFM={er.rowInFM} globalRowIdx={0}
                    handleSODClick={handlers.handleSODClick}
                    onNavigateToFailureLink={handlers.handleNavigateToFailureLink}
                    isCompact={isCompact} merged={er.merged}
                  />
                );
              }
              if (col.step === '구조분석') {
                return (
                  <StructCell
                    key={colIdx} col={col} colIdx={colIdx}
                    fmGroup={er.fmGroup} fmIdx={er.fmIdx} row={er.row}
                    rowInFM={er.rowInFM} globalRowIdx={0}
                    l1ProductName={er.fmGroup.l1ProductName}
                    isCompact={isCompact} merged={er.merged}
                  />
                );
              }
              if (col.step === '기능분석') {
                return (
                  <FuncCell
                    key={colIdx} col={col} colIdx={colIdx}
                    fmGroup={er.fmGroup} fmIdx={er.fmIdx} row={er.row}
                    rowInFM={er.rowInFM} globalRowIdx={0}
                    isCompact={isCompact} merged={er.merged}
                  />
                );
              }
              if (col.step === '리스크분석' || col.step === '최적화') {
                if (er.merged.fc) return null;
                return (
                  <RiskOpt
                    key={colIdx} col={col} colIdx={colIdx} globalRowIdx={0}
                    fcRowSpan={er.row.fcRowSpan} rowInFM={er.rowInFM} prevFcRowSpan={1}
                    fmId={er.fmGroup.fmId} fcId={er.row.fcId} fcText={er.row.fcText}
                    fmText={er.fmGroup.fmText} fcM4={er.row.fcM4}
                    fcProcessChar={er.row.fcProcessChar} fcProcessCharSC={er.row.fcProcessCharSC}
                    fmProductChar={er.fmGroup.fmProductChar} fmProductCharSC={er.fmGroup.fmProductCharSC}
                    processNo={er.fmGroup.fmProcessNo} processName={er.fmGroup.fmProcessName}
                    state={state} setState={setState} setDirty={setDirty}
                    setControlModal={handlers.setControlModal}
                    handleSODClick={handlers.handleSODClick}
                    setApModal={handlers.setApModal}
                    onApImprove={handlers.handleApImprove}
                    openLldModal={handlers.openLldModal}
                    openUserModal={handlers.openUserModal}
                    openDateModal={handlers.openDateModal}
                    onOpenSpecialChar={handlers.handleOpenSpecialChar}
                    fmeaRevisionDate={loadedFmeaRevisionDate}
                    isCompact={isCompact}
                    optIdx={0} optCount={er.optCount} baseFcRowSpan={er.baseFcRowSpan}
                    onAddOptRow={handlers.handleAddOptRowTracked}
                    onRemoveOptRow={handlers.handleRemoveOptRow}
                  />
                );
              }
              return null;
            })}
          </tr>
        );
      })}
    </>
  );
});
