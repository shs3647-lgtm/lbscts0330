/**
 * @file TabFullComponents.tsx
 * @description 탭별 전체 컴포넌트 (헤더 sticky + 바디)
 */

import React from 'react';
import { COLORS } from '../constants';
import { 
  StructureColgroup, StructureHeader, StructureRow,
  RiskHeader, RiskRow,
  OptHeader, OptRow,
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

// 구조분석 탭
export function StructureTabFull(props: any) {
  const { rows, l1Spans, l2Spans, state, setState, setDirty, handleInputBlur, handleInputKeyDown, handleSelect, setIsProcessModalOpen, setIsWorkElementModalOpen, setTargetL2Id } = props;
  return (
    <>
      <StructureColgroup />
      <thead style={stickyTheadStyle}>
        <StructureHeader onProcessModalOpen={() => setIsProcessModalOpen(true)} />
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr className="h-7 bg-white">
            <td colSpan={4} className="text-center p-5 text-[#999] text-xs">
              데이터가 없습니다. 공정을 선택해주세요.
            </td>
          </tr>
        ) : rows.map((row: any, idx: number) => {
          const zebraBg = idx % 2 === 1 ? '#bbdefb' : '#e3f2fd';
          return (
            <tr key={`structure-${idx}-${row.l3Id}`} className={`h-6 ${zebraBg}`}>
              <StructureRow row={row} idx={idx} state={state} setState={setState} rows={rows} l1Spans={l1Spans} l2Spans={l2Spans} setDirty={setDirty} handleInputBlur={handleInputBlur} handleInputKeyDown={handleInputKeyDown} handleSelect={handleSelect} setIsProcessModalOpen={setIsProcessModalOpen} setIsWorkElementModalOpen={setIsWorkElementModalOpen} setTargetL2Id={setTargetL2Id} zebraBg={zebraBg} />
            </tr>
          );
        })}
      </tbody>
    </>
  );
}

// 기능분석 탭
export function FunctionTabFull(props: any) {
  return <FunctionTab {...props} />;
}

// 고장분석 탭 (L1, L2, L3)
export function FailureTabFull(props: any) {
  return <FailureTabNew {...props} />;
}

// 리스크분석 탭
export function RiskTabFull(props: any) {
  const { rows, onAPClick } = props;
  
  return (
    <>
      <thead style={stickyTheadStyle}><RiskHeader onAPClick={onAPClick} /></thead>
      <tbody>
        {rows.map((row: any, idx: number) => (
          <tr key={`risk-${idx}-${row.l3Id}`} className="h-6">
            <RiskRow />
          </tr>
        ))}
      </tbody>
    </>
  );
}

// 최적화 탭
export function OptTabFull(props: any) {
  const { rows } = props;
  return (
    <>
      <thead style={stickyTheadStyle}><OptHeader /></thead>
      <tbody>
        {rows.map((row: any, idx: number) => (
          <tr key={`opt-${idx}-${row.l3Id}`} className="h-6">
            <OptRow row={row} />
          </tr>
        ))}
      </tbody>
    </>
  );
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

