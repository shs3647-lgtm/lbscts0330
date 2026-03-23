'use client';

import React from 'react';
import { getTabLabel } from '../../worksheet/constants';
import { COMPARE_SYNC_TAB_IDS, type CompareSyncTabId } from '../constants';

interface CompareTabBarProps {
  activeTab: string;
  onChange: (tab: CompareSyncTabId) => void;
}

export function CompareTabBar({ activeTab, onChange }: CompareTabBarProps) {
  return (
    <div className="flex h-9 min-h-9 shrink-0 flex-wrap items-center gap-1 overflow-x-auto scrollbar-hide border-b-[2px] border-[#1a237e] bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 px-2 text-[10px]">
      <span className="mr-1 shrink-0 font-semibold text-white/80">탭 동기화</span>
      {COMPARE_SYNC_TAB_IDS.map((id) => {
        const on = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            className={`rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
              on
                ? 'border border-yellow-400 bg-indigo-700 text-yellow-400 shadow-lg'
                : 'border border-transparent bg-transparent text-white hover:bg-white/15 hover:text-yellow-400'
            }`}
            onClick={() => onChange(id)}
          >
            {getTabLabel(id)}
          </button>
        );
      })}
    </div>
  );
}
