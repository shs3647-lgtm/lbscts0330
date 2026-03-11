/**
 * @file components/PreviewTabs.tsx
 * @description PFD 미리보기 탭 컴포넌트 - 필터 기능 포함
 * @updated 2026-01-24 - 필터 드롭다운 추가
 */

import React from 'react';

type PreviewTab = 'full' | 'group' | 'individual';

// 그룹 필터 옵션 (PFD 시트 구조)
const GROUP_FILTER_OPTIONS = [
  { value: '', label: '전체보기(All)' },
  { value: 'processInfo', label: '공정정보(Process Info)' },
  { value: 'characteristic', label: '특성정보(Characteristic)' },
];

// 개별 컬럼 필터 옵션
const COLUMN_FILTER_OPTIONS = [
  { value: '', label: '전체보기(All)' },
  { value: 'processNo', label: '공정번호(P-No)' },
  { value: 'processName', label: '공정명(Process Name)' },
  { value: 'processDesc', label: '공정설명(Process Desc)' },
  { value: 'workElement', label: '작업요소(Work Element)' },
  { value: 'equipment', label: '설비/금형/지그(Equipment)' },
  { value: 'productSpecialChar', label: '제품특별특성(Product SC)' },
  { value: 'productChar', label: '제품특성(Product Char)' },
  { value: 'processSpecialChar', label: '공정특별특성(Process SC)' },
  { value: 'processChar', label: '공정특성(Process Char)' },
];

export interface PreviewTabsProps {
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  stats: { full: number; group: number; item: number };
  // 필터 props
  groupFilter?: string;
  onGroupFilterChange?: (value: string) => void;
  columnFilter?: string;
  onColumnFilterChange?: (value: string) => void;
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
  groupFilter = '',
  onGroupFilterChange,
  columnFilter = '',
  onColumnFilterChange,
}: PreviewTabsProps) {
  return (
    <div className="flex items-center gap-1 mt-2 mb-1 flex-shrink-0">
      <span className="text-xs text-gray-600 font-semibold mr-2">📋 미리보기:</span>
      
      {/* 전체 Import 탭 */}
      <button 
        onClick={() => onTabChange('full')} 
        className={`px-3 py-1 text-[11px] font-bold rounded-t border border-b-0 ${
          activeTab === 'full' 
            ? 'bg-teal-500 text-white border-teal-500' 
            : 'bg-gray-100 text-gray-600 border-gray-300'
        }`}
      >
        전체 Import(Full) ({stats.full}건)
      </button>
      
      {/* 그룹 시트 탭 + 필터 */}
      <button 
        onClick={() => onTabChange('group')} 
        className={`px-3 py-1 text-[11px] font-bold rounded-t border border-b-0 ${
          activeTab === 'group' 
            ? 'bg-blue-500 text-white border-blue-500' 
            : 'bg-gray-100 text-gray-600 border-gray-300'
        }`}
      >
        그룹 시트(Group) ({stats.group}건)
      </button>
      {activeTab === 'group' && onGroupFilterChange && (
        <select 
          value={groupFilter} 
          onChange={(e) => onGroupFilterChange(e.target.value)}
          className="ml-1 px-2 py-0.5 text-[11px] border border-blue-300 rounded bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {GROUP_FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      
      {/* 개별 항목 탭 + 필터 */}
      <button 
        onClick={() => onTabChange('individual')} 
        className={`px-3 py-1 text-[11px] font-bold rounded-t border border-b-0 ${
          activeTab === 'individual' 
            ? 'bg-orange-500 text-white border-orange-500' 
            : 'bg-gray-100 text-gray-600 border-gray-300'
        }`}
      >
        개별 항목(Item) ({stats.item}건)
      </button>
      {activeTab === 'individual' && onColumnFilterChange && (
        <select 
          value={columnFilter} 
          onChange={(e) => onColumnFilterChange(e.target.value)}
          className="ml-1 px-2 py-0.5 text-[11px] border border-orange-300 rounded bg-orange-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
        >
          {COLUMN_FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
