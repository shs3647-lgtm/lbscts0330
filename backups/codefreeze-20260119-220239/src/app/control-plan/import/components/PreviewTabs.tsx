/**
 * @file components/PreviewTabs.tsx
 * @description 미리보기 탭 컴포넌트
 * @updated 2026-01-14
 */

import React from 'react';

type PreviewTab = 'full' | 'group' | 'individual';

export interface PreviewTabsProps {
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  stats: { full: number; group: number; item: number };
}

/**
 * 미리보기 탭 컴포넌트
 * - 전체/그룹/개별 탭 버튼 UI
 * - 활성 탭 표시
 */
export default function PreviewTabs({ activeTab, onTabChange, stats }: PreviewTabsProps) {
  return (
    <div className="flex items-center gap-1 mt-2 mb-1 flex-shrink-0">
      <span className="text-xs text-gray-600 font-semibold mr-2">📋 미리보기:</span>
      <button 
        onClick={() => onTabChange('full')} 
        className={`px-3 py-1 text-[11px] font-bold rounded-t border border-b-0 ${
          activeTab === 'full' 
            ? 'bg-teal-500 text-white border-teal-500' 
            : 'bg-gray-100 text-gray-600 border-gray-300'
        }`}
      >
        전체 Import ({stats.full}건)
      </button>
      <button 
        onClick={() => onTabChange('group')} 
        className={`px-3 py-1 text-[11px] font-bold rounded-t border border-b-0 ${
          activeTab === 'group' 
            ? 'bg-blue-500 text-white border-blue-500' 
            : 'bg-gray-100 text-gray-600 border-gray-300'
        }`}
      >
        그룹 시트 ({stats.group}건)
      </button>
      <button 
        onClick={() => onTabChange('individual')} 
        className={`px-3 py-1 text-[11px] font-bold rounded-t border border-b-0 ${
          activeTab === 'individual' 
            ? 'bg-orange-500 text-white border-orange-500' 
            : 'bg-gray-100 text-gray-600 border-gray-300'
        }`}
      >
        개별 항목 ({stats.item}건)
      </button>
    </div>
  );
}

