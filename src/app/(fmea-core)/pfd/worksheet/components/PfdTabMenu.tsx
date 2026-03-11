/**
 * @file PfdTabMenu.tsx
 * @description PFD 워크시트 탭 메뉴 (CP 구조 수평전개)
 * @version 2.1.0
 * @updated 2026-01-25 - 토글 추가
 */

import React from 'react';
import { useLocale } from '@/lib/locale';

interface ExtensionMergeSettings {
  all: boolean;
  D: boolean;
  E: boolean;
  F: boolean;
  H: boolean;
}

interface PfdTabMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pfdNo?: string;
  fmeaId?: string;
  cpNo?: string;
  itemCount?: number;
  productScCount?: number;  // ✅ 제품SC 필터링 수
  processScCount?: number;  // ✅ 공정SC 필터링 수
  dirty?: boolean;
  status?: 'draft' | 'review' | 'approved' | 'obsolete';
  // ★ 액션 props
  onConfirm?: () => void;
  onApprove?: () => void;
  // ★ 토글 관련 props
  inputMode?: 'manual' | 'auto';
  onInputModeChange?: (mode: 'manual' | 'auto') => void;
  extensionMerge?: ExtensionMergeSettings;
  onExtensionMergeToggle?: (key: 'all' | 'D' | 'E' | 'F' | 'H') => void;
}

/** 한글(영어) 라벨을 2줄로 분리 렌더링 */
function TwoLineLabel({ label }: { label: string }) {
  const match = label.match(/^(.+?)\((.+?)\)$/);
  if (!match) return <>{label}</>;
  return (
    <span className="flex flex-col items-center leading-tight">
      <span>{match[1]}</span>
      <span className="text-[8px] opacity-70">{match[2]}</span>
    </span>
  );
}

export function PfdTabMenu({
  activeTab,
  onTabChange,
  pfdNo,
  fmeaId,
  cpNo,
  itemCount = 0,
  productScCount = 0,
  processScCount = 0,
  dirty = false,
  status = 'draft',
  onConfirm,
  onApprove,
  inputMode = 'manual',
  onInputModeChange,
  extensionMerge = { all: true, D: true, E: true, F: true, H: true },
  onExtensionMergeToggle,
}: PfdTabMenuProps) {
  const { t } = useLocale();
  const tabs = [
    { id: 'all', label: '전체', en: 'All', count: itemCount },
    { id: 'process', label: '공정현황', en: 'Process Status', count: undefined },
    { id: 'char', label: '관리항목', en: 'Control Items', count: undefined },
    { id: 'productSC', label: '제품SC', en: 'Product SC', count: productScCount },
    { id: 'processSC', label: '공정SC', en: 'Process SC', count: processScCount },
  ];

  return (
    <div
      className="fixed top-[68px] left-[53px] right-0 h-9 z-[98] border-b border-white/30"
      style={{ background: '#1565c0' }}
    >
      <div className="flex items-center h-full px-1 sm:px-2 justify-between">
        <div className="flex items-center">
          {/* 탭 버튼 */}
          <nav className="flex gap-0.5 min-w-fit items-center">
            {tabs.map((tab) => {
              const isScTab = tab.id === 'productSC' || tab.id === 'processSC';
              const showDividerAfter = tab.id === 'char' || tab.id === 'processSC';

              const button = isScTab ? (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`py-0.5 px-2 text-[9px] font-medium transition-all rounded flex items-center gap-1 text-center ${activeTab === tab.id
                    ? 'bg-teal-500 text-white'
                    : 'bg-teal-600 text-white hover:bg-teal-500'
                    }`}
                >
                  <span className="flex flex-col items-center leading-tight">
                    <span>{tab.label}</span>
                    <span className="text-[8px] opacity-70">{tab.en}</span>
                  </span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-1 text-[8px] font-bold bg-white/30 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`py-0.5 px-2 sm:px-3 text-[9px] font-medium transition-all rounded text-center ${activeTab === tab.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <span className="flex flex-col items-center leading-tight">
                    <span>{tab.label}</span>
                    <span className="text-[8px] opacity-70">{tab.en}</span>
                  </span>
                </button>
              );

              return (
                <React.Fragment key={tab.id}>
                  {button}
                  {showDividerAfter && (
                    <div className="w-px h-6 bg-white/50 mx-1" />
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* 확정/승인 버튼 */}
          <div className="flex items-center gap-1 ml-1">
            {/* 상태 배지 */}
            <span className={`px-2 py-0.5 text-center rounded ${status === 'approved' ? 'bg-green-500 text-white' :
              status === 'review' ? 'bg-yellow-500 text-black' :
                'bg-gray-500 text-white'
              }`}>
              <span className="flex flex-col items-center leading-tight text-[9px] font-bold">
                {status === 'approved' ? (<><span>승인됨</span><span className="text-[8px] opacity-80">Approved</span></>) :
                  status === 'review' ? (<><span>검토중</span><span className="text-[8px] opacity-80">Reviewing</span></>) :
                    (<><span>초안</span><span className="text-[8px] opacity-80">Draft</span></>)}
              </span>
            </span>

            {/* 확정 버튼 */}
            <button
              onClick={onConfirm}
              disabled={status === 'approved'}
              className={`px-2 py-0.5 text-[9px] font-bold rounded border-2 transition-all text-center ${status === 'approved'
                ? 'border-gray-400 text-gray-400 cursor-not-allowed opacity-50'
                : status === 'review'
                  ? 'border-green-400 text-green-400 hover:bg-green-400/20'
                  : 'border-yellow-400 text-yellow-400 hover:bg-yellow-400/20'
                }`}
              title={status === 'approved' ? '승인된 PFD는 수정할 수 없습니다' : '현재 데이터를 DB에 확정 저장'}
            >
              <span className="flex flex-col items-center leading-tight">
                <span>{status === 'review' ? '재확정' : '확정'}</span>
                <span className="text-[8px] opacity-70">{status === 'review' ? 'Re-confirm' : 'Confirm'}</span>
              </span>
            </button>

            {/* 승인 버튼 */}
            <button
              onClick={onApprove}
              disabled={status === 'approved' || status === 'draft'}
              className={`px-2 py-0.5 text-[9px] font-bold rounded border-2 transition-all text-center ${status === 'approved'
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
              <span className="flex flex-col items-center leading-tight">
                <span>{status === 'approved' ? '승인됨' : '승인'}</span>
                <span className="text-[8px] opacity-70">{status === 'approved' ? 'Approved' : 'Approve'}</span>
              </span>
            </button>
          </div>
        </div>

        {/* ★★★ 우측: 토글 영역 ★★★ */}
        <div className="flex items-center gap-2">
          {/* 입력 레이블 + 수동/자동 토글 */}
          <span className="text-[9px] text-white/80 font-medium text-center leading-tight">
            <span className="block">입력</span>
            <span className="block text-[8px] opacity-70">Input</span>
          </span>
          <div className="flex rounded overflow-hidden">
            <button
              onClick={() => onInputModeChange?.('manual')}
              className={`px-1.5 py-0.5 text-[9px] font-medium transition-all text-center ${inputMode === 'manual'
                ? 'bg-white text-blue-700'
                : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              title="수동: 우클릭으로 행 추가/삭제"
            >
              <span className="flex flex-col items-center leading-tight">
                <span>수동</span>
                <span className="text-[8px] opacity-70">Manual</span>
              </span>
            </button>
            <button
              onClick={() => onInputModeChange?.('auto')}
              className={`px-1.5 py-0.5 text-[9px] font-medium transition-all text-center ${inputMode === 'auto'
                ? 'bg-green-500 text-white'
                : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              title="자동: 클릭 시 모달 팝업으로 입력"
            >
              <span className="flex flex-col items-center leading-tight">
                <span>자동</span>
                <span className="text-[8px] opacity-70">Auto</span>
              </span>
            </button>
          </div>

          <div className="w-px h-6 bg-white/30" />

          {/* 병합 레이블 + 확장병합 토글 */}
          <span className="text-[9px] text-white/80 font-medium text-center leading-tight">
            <span className="block">병합</span>
            <span className="block text-[8px] opacity-70">Merge</span>
          </span>
          <div className="flex rounded-md overflow-hidden border border-purple-300">
            <button
              onClick={() => onExtensionMergeToggle?.('all')}
              className={`px-2 py-0.5 text-[9px] font-semibold transition-all ${extensionMerge.all
                ? 'bg-purple-500 text-white'
                : 'bg-purple-200 text-purple-700'
                }`}
              title="전체 확장병합 ON/OFF"
            >
              All
            </button>
            {(['D', 'E', 'F', 'H'] as const).map(col => (
              <button
                key={col}
                onClick={() => onExtensionMergeToggle?.(col)}
                className={`px-1.5 py-0.5 text-[9px] font-semibold transition-all border-l border-purple-300 ${extensionMerge[col]
                  ? 'bg-purple-400 text-white'
                  : 'bg-purple-200 text-purple-700'
                  }`}
                title={`${col}열 확장병합 ${extensionMerge[col] ? 'ON' : 'OFF'}`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
