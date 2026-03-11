/**
 * @file CPTabMenu.tsx
 * @description Control Plan 워크시트 탭 메뉴 
 * - PFD 디자인 가이드 통일
 * - 확정/승인 기능 + SC/CC 필터링
 * 
 * @version 3.0.0 - 확정/승인 + 필터링 구현
 */

'use client';

import React from 'react';
import { useLocale } from '@/lib/locale';

// CP 탭 정의
export const CP_TABS = [
  { id: 'all', label: 'ALL', icon: '📋' },
  { id: 'process', label: '공정현황(Process Status)', icon: '🏭' },
  { id: 'control', label: '관리항목(Control Item)', icon: '📊' },
  { id: 'method', label: '관리방법(Control Method)', icon: '⚙️' },
  { id: 'action', label: '조치방법(Reaction Plan)', icon: '🔧' },
];

interface CPTabMenuProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  cpNo?: string;
  fmeaId?: string;
  itemCount: number;
  ccCount?: number;
  scCount?: number;
  dirty: boolean;
  status?: 'draft' | 'review' | 'approved' | 'obsolete';
  filterMode?: 'all' | 'cc' | 'sc';
  onFilterChange?: (filter: 'all' | 'cc' | 'sc') => void;
  onConfirm?: () => void;
  onApprove?: () => void;
}

export default function CPTabMenu({
  activeTab,
  onTabChange,
  cpNo,
  fmeaId,
  itemCount,
  ccCount = 0,
  scCount = 0,
  dirty,
  status = 'draft',
  filterMode = 'all',
  onFilterChange,
  onConfirm,
  onApprove,
}: CPTabMenuProps) {
  const { t } = useLocale();
  return (
    <div
      className="fixed top-[68px] left-[53px] right-0 h-9 z-[98] border-b border-white/30"
      style={{ background: '#1565c0' }}
    >
      <div className="flex items-center h-full px-1 sm:px-2 justify-between">
        <div className="flex items-center">
          {/* 탭 버튼 */}
          <nav className="flex gap-0.5 min-w-fit items-center">
            {CP_TABS.map((tab) => {
              const showDividerAfter = tab.id === 'action';

              const button = (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`py-1 px-2 sm:px-3 text-[11px] font-medium transition-all whitespace-nowrap rounded ${activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <span className="hidden sm:inline mr-1">{tab.icon}</span>
                  {t(tab.label)}
                </button>
              );

              return (
                <React.Fragment key={tab.id}>
                  {button}
                  {showDividerAfter && (
                    <div className="w-px h-5 bg-white/50 mx-1" />
                  )}
                </React.Fragment>
              );
            })}

            {/* 필터 탭 (전체, CC, SC) */}
          </nav>

          {/* 구분선 */}
          <div className="w-px h-5 bg-white/50 mx-2" />

          {/* 상태 배지 + 확정/승인 버튼 */}
          <div className="flex items-center gap-1">
            {/* 상태 배지 */}
            <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${status === 'approved' ? 'bg-green-500 text-white' :
              status === 'review' ? 'bg-yellow-500 text-black' :
                'bg-gray-500 text-white'
              }`}>
              {status === 'approved' ? `✅ ${t('승인됨')}` :
                status === 'review' ? `📝 ${t('검토중')}` :
                  `📄 ${t('초안')}`}
            </span>

            {/* 확정 버튼 */}
            <button
              onClick={onConfirm}
              disabled={status === 'approved'}
              className={`px-2 py-0.5 text-[10px] font-bold rounded border-2 transition-all ${status === 'approved'
                ? 'border-gray-400 text-gray-400 cursor-not-allowed opacity-50'
                : status === 'review'
                  ? 'border-green-400 text-green-400 hover:bg-green-400/20'
                  : 'border-yellow-400 text-yellow-400 hover:bg-yellow-400/20'
                }`}
              title={status === 'approved' ? '승인된 CP는 수정할 수 없습니다' : '현재 데이터를 DB에 확정 저장'}
            >
              {status === 'review' ? t('재확정') : t('확정')}
            </button>

            {/* 승인 버튼 */}
            <button
              onClick={onApprove}
              disabled={status === 'approved' || status === 'draft'}
              className={`px-2 py-0.5 text-[10px] font-bold rounded border-2 transition-all ${status === 'approved'
                ? 'border-green-500 bg-green-500 text-white cursor-not-allowed'
                : status === 'review'
                  ? 'border-purple-400 text-purple-400 hover:bg-purple-400/20'
                  : 'border-gray-400 text-gray-400 cursor-not-allowed opacity-50'
                }`}
              title={
                status === 'approved' ? '이미 승인되었습니다' :
                  status === 'draft' ? '먼저 확정을 눌러주세요' :
                    '최종 승인'
              }
            >
              {status === 'approved' ? t('승인됨') : t('승인')}
            </button>
          </div>
        </div>

        {/* 우측: 아이템 카운트 */}
        <div className="text-[10px] text-white/70">
          총 {itemCount}개 항목
        </div>
      </div>
    </div>
  );
}
