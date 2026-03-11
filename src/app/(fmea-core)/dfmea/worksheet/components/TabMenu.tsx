/**
 * @file TabMenu.tsx
 * @description 워크시트 탭 메뉴 (반응형)
 * - 구조분석, 기능분석, 고장분석 등
 * - 화면 크기에 따라 자동 조정
 *
 * @version 2.1.0 - 고장연결검증 드롭다운 추가, 확정 버튼 제거
 */

'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale';
import { useAuth } from '@/hooks/useAuth';
import { WorksheetState, ANALYSIS_TABS } from '../constants';
import StepToggleButtons from './StepToggleButtons';

const VERIFY_ITEMS: { value: 'FE' | 'FM' | 'FC'; label: string; color: string }[] = [
  { value: 'FE', label: '1L 고장영향(Failure Effect)', color: '#1976d2' },
  { value: 'FM', label: '2L 고장형태(Failure Mode)', color: '#388e3c' },
  { value: 'FC', label: '3L 고장원인(Failure Cause)', color: '#f57c00' },
];

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
  /** 파이프라인 검증 토글 */
  showVerification?: boolean;
  onToggleVerification?: () => void;
  /** FC 사슬 검증 토글 */
  showFcVerification?: boolean;
  onToggleFcVerification?: () => void;
}

export default function TabMenu({ state, setState, setDirty, saveToLocalStorage, saveAtomicDB, onAllClick, fmeaId = '', showVerification, onToggleVerification, showFcVerification, onToggleFcVerification }: TabMenuProps) {
  const router = useRouter();
  const { t } = useLocale();
  const { isAdmin } = useAuth();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const verifyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (verifyRef.current && !verifyRef.current.contains(e.target as Node)) setVerifyOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    <div className="flex-shrink-0 h-8 px-1 sm:px-2 flex items-center justify-between overflow-hidden">
      {/* 좌측: 탭 버튼들 - 스크롤 가능 */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide flex-1">
        {/* 기초정보 바로가기 */}
        <button
          onClick={() => {
            router.push(fmeaId ? `/dfmea/import?id=${fmeaId}` : '/dfmea/import');
          }}
          className="px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded border border-white/30 text-white/60 font-bold hover:bg-teal-600/30 hover:text-teal-300 hover:border-teal-400 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          title="기초정보(Master Data / Import) 화면으로 이동"
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
                  // ★ 탭 전환을 먼저 실행 (UI 즉시 반영)
                  setState(prev => ({ ...prev, tab: tab.id }));
                  try {
                    const normalizedId = fmeaId?.toLowerCase();
                    if (normalizedId) {
                      localStorage.setItem(`dfmea_tab_${normalizedId}`, tab.id);
                    }
                  } catch { /* ignore */ }
                  // ★ DB 저장은 탭 전환 후 비동기로 (UI 블로킹 방지)
                  setTimeout(() => {
                    if (saveAtomicDB) {
                      saveAtomicDB();
                    }
                  }, 0);
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

        {/* ★ 파이프라인 검증 토글 (admin 전용) */}
        {isAdmin && onToggleVerification && (
          <button
            onClick={onToggleVerification}
            className={`px-2 py-0.5 text-[10px] rounded border cursor-pointer transition-all whitespace-nowrap shrink-0 font-bold ${showVerification
                ? 'bg-teal-600 border-teal-400 text-white shadow-lg'
                : 'border-gray-400 text-gray-300 hover:bg-teal-600/30 hover:text-teal-300'
              }`}
            title="고장연결 파이프라인 검증 (Import chain ↔ FailureLink 매칭)"
          >
            검증
          </button>
        )}

        {/* ★ FC 사슬 검증 토글 (admin 전용) */}
        {isAdmin && onToggleFcVerification && (
          <button
            onClick={onToggleFcVerification}
            className={`px-2 py-0.5 text-[10px] rounded border cursor-pointer transition-all whitespace-nowrap shrink-0 font-bold ${showFcVerification
                ? 'bg-orange-600 border-orange-400 text-white shadow-lg'
                : 'border-gray-400 text-gray-300 hover:bg-orange-600/30 hover:text-orange-300'
              }`}
            title="FC 고장사슬 검증 (Import 원본 행수 기준)"
          >
            FC검증
          </button>
        )}

        {/* ★ 고장연결검증 드롭다운 — 숨김 처리 (v2.1) */}
        <div ref={verifyRef} className="relative shrink-0" style={{ display: 'none' }}>
          <button
            onClick={() => setVerifyOpen(!verifyOpen)}
            className={`
              px-2 sm:px-3 py-1 sm:py-1.5
              text-[10px] sm:text-[11px] lg:text-xs
              rounded whitespace-nowrap cursor-pointer transition-all duration-200 font-bold border-2
              ${state.tab === 'all' && state.verificationMode
                ? 'border-yellow-400 text-yellow-400 bg-indigo-700 shadow-lg'
                : 'border-cyan-400 text-cyan-300 hover:bg-cyan-600/30'
              }
            `}
            title="고장연결검증 — FE/FM/FC 역전개 검증"
          >
            <span className="hidden sm:inline">고장연결검증</span>
            <span className="sm:hidden">검증</span>
            <span className="ml-0.5 text-[8px]">▼</span>
          </button>
          {verifyOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border-2 border-blue-400 rounded-lg shadow-xl z-[200] min-w-[180px]">
              {state.verificationMode && (
                <button
                  onClick={() => {
                    setState(prev => ({ ...prev, tab: 'all', verificationMode: null }));
                    if (onAllClick) onAllClick();
                    setVerifyOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-100 border-b border-gray-200 text-gray-600 font-semibold"
                >
                  전체보기 (검증 해제)
                </button>
              )}
              {VERIFY_ITEMS.map(item => (
                <button
                  key={item.value}
                  onClick={() => {
                    if (saveToLocalStorage) saveToLocalStorage();
                    if (saveAtomicDB) saveAtomicDB();
                    setState(prev => ({ ...prev, tab: 'all', verificationMode: item.value }));
                    if (onAllClick) onAllClick();
                    setVerifyOpen(false);
                    try {
                      const nid = fmeaId?.toLowerCase();
                      if (nid) localStorage.setItem(`dfmea_tab_${nid}`, 'all');
                    } catch { /* ignore */ }
                  }}
                  style={state.verificationMode === item.value ? { background: '#e3f2fd', borderLeft: `4px solid ${item.color}` } : { borderLeft: '4px solid transparent' }}
                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 flex items-center gap-2"
                >
                  <span style={{ color: item.color, fontWeight: 700 }}>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
