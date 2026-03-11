/**
 * WorksheetTabs - 탭 메뉴 및 레벨 선택 컴포넌트
 */

'use client';

import React from 'react';
import { WorksheetTab, WorksheetLevel, TAB_INFO } from './types';

interface WorksheetTabsProps {
  activeTab: WorksheetTab;
  activeLevel: WorksheetLevel;
  onTabChange: (tab: WorksheetTab) => void;
  onLevelChange: (level: WorksheetLevel) => void;
}

export const WorksheetTabs: React.FC<WorksheetTabsProps> = ({
  activeTab,
  activeLevel,
  onTabChange,
  onLevelChange,
}) => {
  const tabs: WorksheetTab[] = ['structure', 'function', 'failure', 'linkage', 'risk', 'optimize'];
  const levels: WorksheetLevel[] = ['1', '2', '3', 'all'];

  return (
    <div className="bg-white border-b-2 border-[#2b78c5] sticky top-0 z-20">
      {/* 탭 메뉴 */}
      <div className="flex gap-1 px-3 pt-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-2 rounded-t-md text-xs font-bold border border-b-0 transition-colors ${
              activeTab === tab
                ? 'bg-white text-[#1f63aa] border-[#aac3e2]'
                : 'bg-[#dbe8f7] text-gray-600 border-[#aac3e2] hover:bg-[#c5d9f0]'
            }`}
          >
            {TAB_INFO[tab].icon} {TAB_INFO[tab].label}
          </button>
        ))}
        <button
          className="px-4 py-2 rounded-t-md text-xs font-bold border border-b-0 bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7] hover:bg-[#c8e6c9] ml-auto"
        >
          📊 전체보기
        </button>
      </div>

      {/* 레벨 선택 */}
      <div className="flex gap-2 px-3 py-2 bg-white">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => onLevelChange(level)}
            className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
              activeLevel === level
                ? 'bg-[#ffe65a] text-gray-800 border-[#d0b100]'
                : 'bg-white text-[#4b5f78] border-[#cfd7e5] hover:bg-gray-50'
            }`}
          >
            {level === 'all' ? 'All Level' : `${level} Level`}
          </button>
        ))}
        
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold">양방향 작성:</span>
          <span>좌측 워크시트 ⇄ 우측 트리</span>
        </div>
      </div>
    </div>
  );
};

export default WorksheetTabs;















