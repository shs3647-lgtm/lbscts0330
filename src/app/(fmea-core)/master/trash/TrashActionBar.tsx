/**
 * @file TrashActionBar.tsx
 * @description 휴지통 액션바 (검색, 모듈필터, 복원/영구삭제 버튼)
 */

'use client';

import { useLocale } from '@/lib/locale';

interface TrashActionBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeTab: string;
  tabs: string[];
  onTabChange: (tab: string) => void;
  selectedCount: number;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onRefresh: () => void;
}

export function TrashActionBar({
  search,
  onSearchChange,
  activeTab,
  tabs,
  onTabChange,
  selectedCount,
  onRestore,
  onPermanentDelete,
  onRefresh,
}: TrashActionBarProps) {
  const { t } = useLocale();
  return (
    <div className="px-4 py-2 border-b bg-white space-y-2">
      {/* 상단: 제목 + 버튼 */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800" title="Data Recovery Management">데이타 복구 관리(Data Recovery)</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          >
            {t('새로고침')}
          </button>
          <button
            onClick={onRestore}
            disabled={selectedCount === 0}
            className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('복원')} ({selectedCount})
          </button>
          <button
            onClick={onPermanentDelete}
            disabled={selectedCount === 0}
            className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('영구삭제')} ({selectedCount})
          </button>
        </div>
      </div>

      {/* 하단: 모듈 탭 + 검색 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === tab
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="검색 (문서번호, 제목, 고객사)"
          className="w-64 px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
    </div>
  );
}
