/**
 * @file components/PreviewTabs.tsx
 * @description 미리보기 탭 컴포넌트
 * @updated 2026-01-23 - 그룹/개별 필터 드롭다운 추가
 */

import React from 'react';
import { GROUP_SHEET_OPTIONS, PREVIEW_COLUMNS } from '../constants';

type PreviewTab = 'full' | 'group' | 'individual';

export interface PreviewTabsProps {
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  stats: { full: number; group: number; item: number };
  // 그룹 필터 (공정현황, 검출장치, 관리항목, 관리방법, 대응계획)
  groupFilter: string;
  onGroupFilterChange: (filter: string) => void;
  // 개별 컬럼 필터
  columnFilter: string;
  onColumnFilterChange: (filter: string) => void;
}

/**
 * 미리보기 탭 컴포넌트
 * - 전체/그룹/개별 탭 버튼 UI
 * - 그룹/개별 탭 필터 드롭다운
 */
export default function PreviewTabs({ 
  activeTab, 
  onTabChange, 
  stats,
  groupFilter,
  onGroupFilterChange,
  columnFilter,
  onColumnFilterChange,
}: PreviewTabsProps) {
  return (
    <div className="flex items-center gap-1 mt-2 mb-1 flex-shrink-0">
      <span className="text-xs text-gray-600 font-semibold mr-2">📋 미리보기:</span>
      <button 
        onClick={() => onTabChange('full')} 
        className={`px-3 py-1 text-[11px] font-bold rounded-t border border-b-0 ${
          activeTab === 'full' 
            ? 'bg-blue-500 text-white border-blue-500' 
            : 'bg-gray-100 text-gray-600 border-gray-300'
        }`}
      >
        전체 Import(Full) ({stats.full}건)
      </button>
      <button 
        onClick={() => onTabChange('group')} 
        className={`px-3 py-1 text-[11px] font-bold rounded-t border border-b-0 ${
          activeTab === 'group' 
            ? 'bg-blue-500 text-white border-blue-500' 
            : 'bg-gray-100 text-gray-600 border-gray-300'
        }`}
      >
        그룹 시트(Group Sheet) ({stats.group}건)
      </button>
      {/* 그룹 필터 드롭다운 */}
      {activeTab === 'group' && (
        <select
          value={groupFilter}
          onChange={(e) => onGroupFilterChange(e.target.value)}
          className="ml-1 px-2 py-1 text-[11px] border border-blue-400 rounded bg-white"
        >
          <option value="">전체 보기</option>
          {GROUP_SHEET_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      <button 
        onClick={() => onTabChange('individual')} 
        className={`px-3 py-1 text-[11px] font-bold rounded-t border border-b-0 ${
          activeTab === 'individual' 
            ? 'bg-orange-500 text-white border-orange-500' 
            : 'bg-gray-100 text-gray-600 border-gray-300'
        }`}
      >
        개별 항목(Individual) ({stats.item}건)
      </button>
      {/* 개별 컬럼 필터 드롭다운 */}
      {activeTab === 'individual' && (
        <select
          value={columnFilter}
          onChange={(e) => onColumnFilterChange(e.target.value)}
          className="ml-1 px-2 py-1 text-[11px] border border-orange-400 rounded bg-white"
        >
          <option value="">전체 컬럼</option>
          {PREVIEW_COLUMNS.filter(col => col.key !== 'processNo' && col.key !== 'processName').map(col => (
            <option key={col.key} value={col.key}>{col.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

