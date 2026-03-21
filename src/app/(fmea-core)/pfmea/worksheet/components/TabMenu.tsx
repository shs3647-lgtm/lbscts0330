/**
 * @file TabMenu.tsx
 * @description 워크시트 탭 메뉴 (반응형)
 * - 구조분석, 기능분석, 고장분석 등
 * - 화면 크기에 따라 자동 조정
 *
 * @version 2.1.0 - 고장연결검증 드롭다운 추가, 확정 버튼 제거
 */

'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale';
import { WorksheetState, ANALYSIS_TABS } from '../constants';
import StepToggleButtons from './StepToggleButtons';

interface TabMenuProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced?: (updater: React.SetStateAction<WorksheetState>) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: () => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  onOpen5AP?: () => void;
  onOpen6AP?: () => void;
  onAllClick?: () => void;
  fmeaId?: string;
}

export default function TabMenu({ state, setState, setDirty, saveToLocalStorage, saveAtomicDB, onAllClick, fmeaId = '' }: TabMenuProps) {
  const router = useRouter();
  const { t } = useLocale();

  const structureConfirmed = (state as any).structureConfirmed || false;
  const failureLinkConfirmed = (state as any).failureLinkConfirmed || false;
  const riskConfirmed = (state as any).riskConfirmed || false;
  const optConfirmed = (state as any).optConfirmed || false;

  const l1Confirmed = (state as any).l1Confirmed || false;
  const l2Confirmed = (state as any).l2Confirmed || false;
  const l3Confirmed = (state as any).l3Confirmed || false;
  const failureL1Confirmed = (state as any).failureL1Confirmed || false;
  const failureL2Confirmed = (state as any).failureL2Confirmed || false;
  const failureL3Confirmed = (state as any).failureL3Confirmed || false;

  const tabConfirmedMap: Record<string, boolean> = {
    'structure': structureConfirmed,
    'function-l1': l1Confirmed,
    'function-l2': l2Confirmed,
    'function-l3': l3Confirmed,
    'failure-l1': failureL1Confirmed,
    'failure-l2': failureL2Confirmed,
    'failure-l3': failureL3Confirmed,
    'failure-link': failureLinkConfirmed,
    'risk': riskConfirmed,
    'opt': optConfirmed,
  };

  const analysisTabs = ANALYSIS_TABS;

  return (
    <div className="flex-shrink-0 h-9 px-1 sm:px-2 flex items-center justify-between overflow-hidden z-[98]">
      {/* 좌측: 탭 버튼들 - 스크롤 가능 */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide flex-1">
        {/* 기초정보 바로가기 */}
        <button
          onClick={() => {
            router.push(fmeaId ? `/pfmea/import?id=${fmeaId}` : '/pfmea/import');
          }}
          className="px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded border border-white/30 text-white/60 font-bold hover:bg-teal-600/30 hover:text-teal-300 hover:border-teal-400 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          title="기초정보(Import) 화면으로 이동"
        >
          Master<span className="text-[7px] opacity-60 ml-0.5">↗</span>
        </button>

        {/* 분석 탭 — ALL 포함 항상 표시 */}
        <div className="flex gap-0.5 sm:gap-1">
          {analysisTabs.map(tab => {
            const isActive = state.tab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setState(prev => ({ ...prev, tab: tab.id }));
                  try {
                    const normalizedId = fmeaId?.toLowerCase();
                    if (normalizedId) {
                      localStorage.setItem(`pfmea_tab_${normalizedId}`, tab.id);
                    }
                  } catch { /* ignore */ }
                  // ★★★ 2026-03-21 FIX: 탭 전환 시 자동 saveAtomicDB 제거
                  // 탭 전환만으로 DB 덮어쓰기 → Import 정상 데이터(FC=104) 손실 방지
                  // 사용자 편집(dirty) 시에만 saveAtomicDB 호출
                }}
                className={`
                  px-1.5 sm:px-2 py-0.5
                  text-[9px] sm:text-[10px]
                  rounded transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer
                  ${isActive
                    ? 'bg-indigo-700 border border-yellow-400 text-yellow-400 font-bold shadow-lg'
                    : state.tab === 'all'
                      ? 'bg-transparent border border-white/20 text-white/70 font-bold hover:bg-white/15 hover:text-yellow-400'
                      : 'bg-transparent border border-transparent text-white font-bold hover:bg-white/15 hover:text-yellow-400'
                  }
                `}
                title={t(tab.label)}
              >
                {t(tab.label)}
                {tabConfirmedMap[tab.id] && <span className="ml-0.5 text-[8px] text-green-400">✓</span>}
              </button>
            );
          })}
        </div>

        {/* 구분선 */}
        <div className="hidden sm:block w-px h-3.5 bg-white/30 mx-1 lg:mx-2 shrink-0" />

        {/* 단계별 토글 버튼 - 큰 화면에서만 */}
        <div className="hidden md:block">
          <StepToggleButtons state={state} setState={setState} onAllClick={onAllClick} />
        </div>

        {/* 구분선 */}
        <div className="hidden sm:block w-px h-3.5 bg-white/30 mx-1 lg:mx-2 shrink-0" />


      </div>
    </div>
  );
}
