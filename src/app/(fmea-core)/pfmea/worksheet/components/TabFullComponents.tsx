/**
 * @file TabFullComponents.tsx
 * @description 탭별 전체 컴포넌트 (헤더 sticky + 바디)
 */

import React from 'react';
import { COLORS } from '../constants';
import { 
  StructureTab, StructureColgroup, StructureHeader, StructureRow,
  RiskHeader, RiskRow,
  RiskTabConfirmable,
  OptHeader, OptRow,
  OptTabConfirmable,
  DocHeader, DocRow,
} from '../tabs';
import { FunctionTab } from '../tabs';
import { FailureTab as FailureTabNew } from '../tabs/failure';

// 공통 sticky thead 스타일 (반드시 background 있어야 스크롤 시 내용 안 비침)
export const stickyTheadStyle: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 20, background: '#fff' };

/**
 * 단계 번호 반환
 */
export function getStepNumber(tab: string): number {
  const map: Record<string, number> = { 
    structure: 2, 
    'function-l1': 3,
    'function-l2': 3,
    'function-l3': 3,
    'failure-l1': 4,
    'failure-l2': 4,
    'failure-l3': 4,
    'failure-link': 4,
    risk: 5, 
    opt: 6, 
    doc: 7, 
    all: 0 
  };
  return map[tab] || 0;
}

// 구조분석 탭 - ✅ StructureTab으로 위임 (확정/수정 로직 포함)
export function StructureTabFull(props: any) {
  // ✅ saveToLocalStorage 포함하여 StructureTab에 전달
  return <StructureTab {...props} />;
}

// 기능분석 탭
export function FunctionTabFull(props: any) {
  return <FunctionTab {...props} />;
}

// 고장분석 탭 (L1, L2, L3)
export function FailureTabFull(props: any) {
  return <FailureTabNew {...props} />;
}

// 리스크분석 탭 - 확정 기능 포함
export function RiskTabFull(props: any) {
  return <RiskTabConfirmable {...props} />;
}

// 최적화 탭 - 확정 기능 포함
export function OptTabFull(props: any) {
  return <OptTabConfirmable {...props} />;
}

// 문서화 탭
export function DocTabFull(props: any) {
  const { rows, state, l1Spans, l2Spans } = props;
  return (
    <>
      <thead style={stickyTheadStyle}><DocHeader /></thead>
      <tbody>
        {rows.map((row: any, idx: number) => (
          <tr key={`doc-${idx}-${row.l3Id}`} className="h-6">
            <DocRow row={row} idx={idx} state={state} rows={rows} l1Spans={l1Spans} l2Spans={l2Spans} />
          </tr>
        ))}
      </tbody>
    </>
  );
}

