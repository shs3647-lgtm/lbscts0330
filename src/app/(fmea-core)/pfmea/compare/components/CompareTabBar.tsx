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
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-100 px-2 py-1 text-[10px]">
      <span className="mr-1 font-semibold text-slate-600">탭 동기화:</span>
      {COMPARE_SYNC_TAB_IDS.map((id) => {
        const on = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              on ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'
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
