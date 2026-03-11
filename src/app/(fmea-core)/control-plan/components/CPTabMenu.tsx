/**
 * @file CPTabMenu.tsx
 * @description Control Plan 탭 메뉴 - PFMEA TabMenu와 동일한 구조
 */

'use client';

import React from 'react';

interface CPTabMenuProps {
  state: {
    tab: 'worksheet' | 'summary' | 'history';
    rows?: any[];
  };
  setState: React.Dispatch<React.SetStateAction<any>>;
  onAddRow: () => void;
}

// CP 탭 정의
const CP_TABS = [
  { id: 'worksheet', label: 'CP 작성', icon: '✏️' },
  { id: 'summary', label: '요약(Summary)', icon: '📊' },
  { id: 'history', label: '이력(History)', icon: '📜' },
];

export default function CPTabMenu({ state, setState, onAddRow }: CPTabMenuProps) {
  return (
    <div className="flex-shrink-0 h-9 pl-2 pr-0 flex items-center justify-between">
      {/* 좌측: 탭 버튼들 */}
      <div className="flex items-center gap-2">
        {/* CP 탭 */}
        <div className="flex gap-1">
          {CP_TABS.map(tab => {
            const isActive = state.tab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setState((prev: any) => ({ ...prev, tab: tab.id }))}
                style={{
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#004d6e' : 'transparent',
                  border: isActive ? '1px solid #ffd600' : '1px solid transparent',
                  borderRadius: '4px',
                  color: isActive ? '#ffd600' : '#fff',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  textShadow: isActive ? '0 0 8px rgba(255,214,0,0.5)' : 'none',
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                    e.currentTarget.style.color = '#ffd600';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
              >
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </div>

        {/* 구분선 */}
        <div className="w-px h-5 bg-white/30 mx-2" />

        {/* 행 추가 버튼 */}
        <button
          onClick={onAddRow}
          className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-all flex items-center gap-1"
        >
          ➕ 행 추가(Add Row)
        </button>

        {/* 행 삭제 버튼 */}
        <button
          onClick={() => alert('삭제할 행을 선택하세요.')}
          className="px-3 py-1 bg-red-600/80 text-white text-xs font-semibold rounded hover:bg-red-700 transition-all flex items-center gap-1"
        >
          ➖ 행 삭제(Delete Row)
        </button>
      </div>

      {/* 우측: CP 항목 통계 (280px) */}
      <div className="w-[280px] h-9 flex items-stretch bg-gradient-to-r from-blue-800 to-blue-700 border-l-[2px] border-white shrink-0">
        <div className="w-[80px] h-9 flex items-center justify-center border-r border-white/30 shrink-0">
          <span className="text-yellow-400 text-xs font-bold whitespace-nowrap">항목수(Count):</span>
        </div>
        <div className="w-[66px] h-9 flex items-center justify-center border-r border-white/30 shrink-0">
          <span className="text-white text-xs font-bold whitespace-nowrap">{state.rows?.length || 0}</span>
        </div>
        <div className="w-[66px] h-9 flex items-center justify-center border-r border-white/30 shrink-0">
          <span className="text-green-400 text-xs font-bold whitespace-nowrap">EP:0</span>
        </div>
        <div className="w-[68px] h-9 flex items-center justify-center shrink-0">
          <span className="text-cyan-400 text-xs font-bold whitespace-nowrap">자동:0</span>
        </div>
      </div>
    </div>
  );
}



















