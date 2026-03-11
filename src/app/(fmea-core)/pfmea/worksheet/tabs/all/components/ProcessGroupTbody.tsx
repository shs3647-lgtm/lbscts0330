/**
 * @file ProcessGroupTbody.tsx
 * @description 공정별 지연 로딩 — IntersectionObserver로 뷰포트 공정만 렌더링
 *
 * HTML5 <table> 안에 다중 <tbody>는 유효한 마크업.
 * 각 공정이 하나의 <tbody>로 분리되어 독립 로딩.
 *
 * @created 2026-03-01
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FMGroupRows } from './FMGroupRows';
import type { FMGroupHandlers } from './FMGroupRows';
import type { ProcessedFMGroup } from '../processFailureLinks';
import type { ColumnDef } from '../allTabConstants';
import type { WorksheetState } from '../../../constants';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ProcessGroupTbodyProps {
  processNo: string;
  fmGroups: ProcessedFMGroup[];
  estimatedHeight: number;
  fmOptCountKeys: Map<string, string>;
  columns: ColumnDef[];
  state: WorksheetState | undefined;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>> | undefined;
  setDirty: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  handlers: FMGroupHandlers;
  loadedFmeaRevisionDate: string;
  isCompact: boolean;
  highlightMissingO: boolean;
  highlightMissingD: boolean;
  colCount: number;
  // 셀 렌더러 (순환 import 방지용)
  RiskOptCellRenderer: React.ComponentType<any> // eslint-disable-line @typescript-eslint/no-explicit-any -- 순환 import 방지;
  FailureCellRenderer: React.ComponentType<any> // eslint-disable-line @typescript-eslint/no-explicit-any -- 순환 import 방지;
  FunctionCellRenderer: React.ComponentType<any> // eslint-disable-line @typescript-eslint/no-explicit-any -- 순환 import 방지;
  StructureCellRenderer: React.ComponentType<any> // eslint-disable-line @typescript-eslint/no-explicit-any -- 순환 import 방지;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ProcessGroupTbody
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ProcessGroupTbody = React.memo(function ProcessGroupTbody({
  processNo, fmGroups, estimatedHeight, fmOptCountKeys,
  columns, state, setState, setDirty,
  handlers, loadedFmeaRevisionDate, isCompact,
  highlightMissingO, highlightMissingD, colCount,
  RiskOptCellRenderer, FailureCellRenderer,
  FunctionCellRenderer, StructureCellRenderer,
}: ProcessGroupTbodyProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sentinelRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || isVisible) return; // 한번 보이면 항상 유지
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // 한번 보이면 관찰 해제
        }
      },
      { rootMargin: '300px 0px' }, // 뷰포트 300px 앞서 프리로드
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible]);

  // 아직 뷰포트에 들어오지 않음 → placeholder
  if (!isVisible) {
    return (
      <tbody ref={sentinelRef} data-process={processNo} data-placeholder="true">
        <tr>
          <td
            colSpan={colCount}
            style={{
              height: estimatedHeight,
              padding: 0,
              border: 'none',
              background: 'transparent',
            }}
          />
        </tr>
      </tbody>
    );
  }

  // 뷰포트에 진입 → 실제 렌더링
  return (
    <tbody ref={sentinelRef} data-process={processNo}>
      {fmGroups.map((fg, fmIdx) => (
        <FMGroupRows
          key={fg.fmId}
          fmGroup={fg}
          fmIdx={fmIdx}
          columns={columns}
          optCountKey={fmOptCountKeys.get(fg.fmId) || '1'}
          state={state}
          setState={setState}
          setDirty={setDirty}
          handlers={handlers}
          loadedFmeaRevisionDate={loadedFmeaRevisionDate}
          isCompact={isCompact}
          highlightMissingO={highlightMissingO}
          highlightMissingD={highlightMissingD}
          RiskOptCellRenderer={RiskOptCellRenderer}
          FailureCellRenderer={FailureCellRenderer}
          FunctionCellRenderer={FunctionCellRenderer}
          StructureCellRenderer={StructureCellRenderer}
        />
      ))}
    </tbody>
  );
});
