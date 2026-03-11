/**
 * @file AllTabRightPanel.tsx
 * @description 전체보기 탭 우측 패널 (구조 표시 + AP 테이블 전환)
 */

'use client';

import React from 'react';
import { WorksheetState } from '../constants';
import APTableInline from './APTableInline';

interface AllTabRightPanelProps {
  state: WorksheetState;
  showAPInAll: boolean;
  setShowAPInAll: (show: boolean) => void;
  apStageInAll: 5 | 6;
  setApStageInAll: (stage: 5 | 6) => void;
}

export default function AllTabRightPanel({ 
  state, 
  showAPInAll, 
  setShowAPInAll, 
  apStageInAll, 
  setApStageInAll 
}: AllTabRightPanelProps) {
  const btnStyle = (isActive: boolean) => ({
    padding: '2px 6px',
    fontSize: '9px',
    background: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
    color: isActive ? '#455a64' : '#fff',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    fontWeight: isActive ? 700 : 400
  });

  return (
    <>
      <div className="bg-[#455a64] text-white py-1.5 px-2.5 text-[11px] font-bold shrink-0 flex justify-between items-center">
        <span>📊 {showAPInAll ? `${apStageInAll}AP 기준표` : '전체 구조'}</span>
        <div className="flex gap-1">
          <button onClick={() => setShowAPInAll(false)} style={btnStyle(!showAPInAll)}>
            구조
          </button>
          <button onClick={() => { setShowAPInAll(true); setApStageInAll(5); }} style={btnStyle(showAPInAll && apStageInAll === 5)}>
            5AP
          </button>
          <button onClick={() => { setShowAPInAll(true); setApStageInAll(6); }} style={btnStyle(showAPInAll && apStageInAll === 6)}>
            6AP
          </button>
        </div>
      </div>

      {!showAPInAll ? (
        <div className="flex-1 overflow-auto p-2 bg-[#eceff1]">
          <div className="text-[10px] text-[#666] mb-2">
            <strong>L1:</strong> {state.l1.name} ({state.l1.types?.length || 0}개 구분)
          </div>
          <div className="text-[10px] text-[#666] mb-2">
            <strong>L2:</strong> {state.l2.filter(p => !p.name.includes('클릭')).length}개 공정
          </div>
          <div className="text-[10px] text-[#666]">
            <strong>L3:</strong> {state.l2.reduce((sum, p) => sum + p.l3.filter(w => !w.name.includes('추가')).length, 0)}개 작업요소
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <APTableInline onClose={() => setShowAPInAll(false)} showClose={false} stage={apStageInAll} />
        </div>
      )}
    </>
  );
}

