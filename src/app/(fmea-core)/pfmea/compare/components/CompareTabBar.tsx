'use client';

import { getTabLabel } from '../../worksheet/constants';
import { COMPARE_SYNC_TAB_IDS, type CompareSyncTabId } from '../constants';

interface CompareTabBarProps {
  activeTab: string;
  onChange: (tab: CompareSyncTabId) => void;
  /** true: 부모 flex 안에 버튼만 렌더 (1줄 모드) */
  inline?: boolean;
}

export function CompareTabBar({ activeTab, onChange, inline }: CompareTabBarProps) {
  const buttons = COMPARE_SYNC_TAB_IDS.map((id) => {
    const on = activeTab === id;
    return (
      <button
        key={id}
        type="button"
        className={`shrink-0 whitespace-nowrap rounded px-1 py-px text-[8px] font-bold cursor-pointer ${
          on
            ? 'border border-yellow-400 bg-indigo-700 text-yellow-400'
            : 'border border-transparent text-white/80 hover:bg-white/15 hover:text-yellow-300'
        }`}
        onClick={() => onChange(id)}
      >
        {getTabLabel(id)}
      </button>
    );
  });

  if (inline) return <>{buttons}</>;

  return (
    <div className="flex h-6 shrink-0 items-center gap-0.5 overflow-x-auto scrollbar-hide border-b border-indigo-900 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 px-1">
      {buttons}
    </div>
  );
}
