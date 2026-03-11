/**
 * @file CPTabMenu.tsx
 * @description Control Plan 워크시트 탭 메뉴 (PFMEA TabMenu 패턴)
 * - ALL, 공정현황, 관리항목, 관리방법, 대응계획 탭
 * - 수동/자동 모드 토글
 * - 반응형 Tailwind CSS 적용
 * 
 * @version 1.1.0
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// CP 탭 정의
export const CP_TABS = [
  { id: 'all', label: 'ALL', shortLabel: 'ALL', color: '#1a237e' },
  { id: 'process', label: '공정현황', shortLabel: '공정', color: '#1565c0' },
  { id: 'control', label: '관리항목', shortLabel: '관리', color: '#2e7d32' },
  { id: 'method', label: '관리방법', shortLabel: '방법', color: '#f57c00' },
  { id: 'action', label: '대응계획', shortLabel: '대응', color: '#7b1fa2' },
];

interface CPTabMenuProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  cpNo?: string;
  fmeaId?: string;
  itemCount: number;
  dirty: boolean;
}

export default function CPTabMenu({
  activeTab,
  onTabChange,
  cpNo,
  fmeaId,
  itemCount,
  dirty,
}: CPTabMenuProps) {
  const router = useRouter();
  
  return (
    <div 
      className="fixed top-16 left-[53px] right-0 h-9 z-[98] px-0 sm:px-1 flex items-center justify-between overflow-hidden border-b-[2px] border-[#004d40]"
      style={{ background: 'linear-gradient(to right, #004d40, #00695c, #004d40)' }}
    >
      {/* 좌측: 탭 버튼들 */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide flex-1">
        
        {/* CP 탭 */}
        <div className="flex gap-0.5 sm:gap-1">
          {CP_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5
                  text-[10px] sm:text-[11px] lg:text-xs
                  rounded transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer
                  ${isActive 
                    ? 'bg-teal-800 border border-yellow-400 text-yellow-400 font-bold shadow-lg' 
                    : 'bg-transparent border border-transparent text-white font-medium hover:bg-white/15 hover:text-yellow-400'
                  }
                `}
                title={tab.label}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* 구분선 */}
        <div className="hidden sm:block w-px h-5 bg-white/30 mx-1 lg:mx-2 shrink-0" />
        
        {/* 빠른 필터 버튼 (중간 화면 이상) */}
        <div className="hidden md:flex gap-1 shrink-0">
          <button
            className="px-2 py-1 text-[10px] sm:text-xs rounded whitespace-nowrap border border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            CC만
          </button>
          <button
            className="px-2 py-1 text-[10px] sm:text-xs rounded whitespace-nowrap border border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            SC만
          </button>
          <button
            className="px-2 py-1 text-[10px] sm:text-xs rounded whitespace-nowrap border border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            전체
          </button>
        </div>

        {/* 구분선 */}
        <div className="hidden lg:block w-px h-5 bg-white/30 mx-1 lg:mx-2 shrink-0" />
        
        {/* 확정 버튼 */}
        <div className="flex gap-1 shrink-0">
          <button
            className="px-2 py-1 text-[10px] sm:text-xs rounded whitespace-nowrap border bg-yellow-500 text-black border-yellow-400 hover:bg-yellow-400 cursor-pointer"
          >
            확정
          </button>
          
          {/* 승인 버튼 */}
          <button
            onClick={() => router.push('/control-plan/revision')}
            className="px-2 py-1 text-[10px] sm:text-xs rounded whitespace-nowrap border bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-400 cursor-pointer font-bold flex items-center gap-1"
          >
            📋 승인
          </button>
        </div>
      </div>

      {/* 우측: 상태 정보 */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {cpNo && (
          <span className="text-[10px] text-white/80 hidden lg:inline font-semibold">
            📋 {cpNo}
          </span>
        )}
        {fmeaId && (
          <span className="text-[10px] text-blue-300 hidden xl:inline">
            🔗 {fmeaId}
          </span>
        )}
        <span className="text-[10px] text-white/70">
          {itemCount}개
        </span>
        {dirty && (
          <span className="text-[10px] text-orange-400 font-bold">●</span>
        )}
      </div>
    </div>
  );
}

