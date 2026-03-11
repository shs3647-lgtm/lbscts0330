/**
 * @file AllViewRightPanel.tsx
 * @description 전체보기 탭 우측 패널 (구조/5AP/6AP 전환)
 */

'use client';

import React, { useMemo } from 'react';
import { WorksheetState } from '../constants';
import APTableInline from './APTableInline';

interface AllViewRightPanelProps {
  state: WorksheetState;
  showAPInAll: boolean;
  setShowAPInAll: (show: boolean) => void;
  apStageInAll: 5 | 6;
  setApStageInAll: (stage: 5 | 6) => void;
  collapsedIds: Set<string>;
  toggleCollapse: (id: string) => void;
}

// 버튼 스타일
const btnStyle = (active: boolean) => ({
  padding: '2px 6px',
  fontSize: '9px',
  background: active ? '#fff' : 'rgba(255,255,255,0.3)',
  color: active ? '#455a64' : '#fff',
  border: 'none',
  borderRadius: '2px',
  cursor: 'pointer' as const,
  fontWeight: active ? 700 : 400
});

export default function AllViewRightPanel({
  state,
  showAPInAll,
  setShowAPInAll,
  apStageInAll,
  setApStageInAll,
  collapsedIds,
  toggleCollapse
}: AllViewRightPanelProps) {
  // 구조 데이터 계산
  const processedData = useMemo(() => {
    const data: Array<{
      procId: string;
      procNo: string;
      procName: string;
      workElements: Array<{ id: string; m4: string; name: string }>;
    }> = [];

    state.l2.forEach(proc => {
      if (proc.name.includes('클릭')) return;
      data.push({
        procId: proc.id,
        procNo: proc.no,
        procName: proc.name,
        workElements: proc.l3.filter(we => !we.name.includes('클릭')).map(we => ({
          id: we.id,
          m4: we.m4 || '',
          name: we.name
        }))
      });
    });

    return data;
  }, [state.l2]);

  return (
    <>
      {/* 헤더 */}
      <div 
        className="shrink-0 flex justify-between items-center"
        style={{ background: '#455a64', color: 'white', padding: '6px 10px', fontSize: '11px', fontWeight: 700 }}
      >
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

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-auto" style={{ background: '#eceff1' }}>
        {showAPInAll ? (
          <APTableInline onClose={() => setShowAPInAll(false)} stage={apStageInAll} />
        ) : (
          <div className="p-2 space-y-1.5">
            {processedData.map(proc => (
              <div key={proc.procId} className="bg-white rounded shadow-sm overflow-hidden">
                {/* 공정 헤더 */}
                <div
                  onClick={() => toggleCollapse(proc.procId)}
                  className="flex items-center gap-2 py-1.5 px-2 cursor-pointer"
                  style={{ background: '#546e7a', color: 'white', fontSize: '10px', fontWeight: 600 }}
                >
                  <span>{collapsedIds.has(proc.procId) ? '▶' : '▼'}</span>
                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px]">{proc.procNo}</span>
                  <span>{proc.procName}</span>
                  <span className="ml-auto text-[9px] opacity-70">{proc.workElements.length}개</span>
                </div>
                
                {/* 작업요소 목록 */}
                {!collapsedIds.has(proc.procId) && proc.workElements.length > 0 && (
                  <div className="p-1.5 space-y-0.5" style={{ background: '#f5f5f5' }}>
                    {proc.workElements.map(we => (
                      <div 
                        key={we.id} 
                        className="flex items-center gap-1.5 py-1 px-2 bg-white rounded text-[9px]"
                      >
                        <span 
                          className="w-6 text-center rounded text-[8px] font-bold"
                          style={{ 
                            background: we.m4 === 'MN' ? '#e3f2fd' : we.m4 === 'MC' ? '#ffebee' : '#f3e5f5',
                            color: we.m4 === 'MN' ? '#1565c0' : we.m4 === 'MC' ? '#c62828' : '#7b1fa2'
                          }}
                        >
                          {we.m4 || '-'}
                        </span>
                        <span className="text-gray-700">{we.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {processedData.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-xs">
                구조분석 데이터가 없습니다
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

