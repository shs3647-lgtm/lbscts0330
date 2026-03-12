/**
 * @file PfdTopMenuBar.tsx
 * @description PFD 워크시트 상단 메뉴바 (CP TopMenuBar 기반)
 * - PFD 선택, 저장, Import/Export, FMEA/CP 연동
 * - 수동/자동 토글, 확장병합 토글 추가
 * - 반응형 Tailwind CSS 적용
 *
 * @version 2.2.0
 * @updated 2026-01-25 - 연동 방향 변경 (현재앱 → 대상앱)
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface ExtensionMergeSettings {
  all: boolean;
  D: boolean;
  E: boolean;
  F: boolean;
  H: boolean;
}

interface PfdTopMenuBarProps {
  pfdList: any[];
  selectedPfdId: string | null;
  fmeaId: string | null;
  cpNo: string | null;
  dirty: boolean;
  isSaving: boolean;
  itemCount: number;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  onPfdChange: (id: string) => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onAddRow: () => void;
  // ★ 정방향 연동 props
  onSyncCP?: () => void;
  onSyncFMEA?: () => void;
  // ★ 역방향 연동 props (CP와 동일 구조)
  onCpToPfd?: () => void;
  onFmeaToPfd?: () => void;
  // ★ 토글 관련 props
  inputMode?: 'manual' | 'auto';
  onInputModeChange?: (mode: 'manual' | 'auto') => void;
  extensionMerge?: ExtensionMergeSettings;
  onExtensionMergeToggle?: (key: 'all' | 'D' | 'E' | 'F' | 'H') => void;
  // ★ 변경 이력 관련 props
  hasChangeMarkers?: boolean;
  onShowHistory?: () => void;
  onClearMarkers?: () => void;
  // ★ 관리 모달 버튼 Props
  onManageEquipment?: () => void;
  onManageParts?: () => void;
}


/** 공통 버튼 스타일 - 반응형 */
const menuBtn = `
  px-1.5 sm:px-2 lg:px-3 py-1 rounded transition-all 
  bg-transparent border border-transparent text-white 
  text-[11px] font-medium 
  hover:bg-white/15 hover:text-yellow-300 whitespace-nowrap
`;

export default function PfdTopMenuBar({
  pfdList,
  selectedPfdId,
  fmeaId,
  cpNo,
  dirty,
  isSaving,
  itemCount,
  syncStatus = 'idle',
  onPfdChange,
  onSave,
  onExport,
  onImport,
  onAddRow,
  onSyncCP,
  onSyncFMEA,
  onCpToPfd,      // ★ 역방향 연동
  onFmeaToPfd,    // ★ 역방향 연동
  inputMode = 'manual',
  onInputModeChange,
  extensionMerge = { all: true, D: true, E: true, F: true, H: true },
  onExtensionMergeToggle,
  hasChangeMarkers = false,
  onShowHistory,
  onClearMarkers,
  onManageEquipment,
  onManageParts,
}: PfdTopMenuBarProps) {

  const router = useRouter();
  const isSyncing = syncStatus === 'syncing';

  return (
    <div
      className="flex items-center gap-1 sm:gap-2 fixed top-9 left-[53px] right-0 h-8 px-0 sm:px-1 z-[99] border-t border-b border-white/30 overflow-x-auto scrollbar-hide"
      style={{ background: '#1976d2' }}
    >
      {/* PFD명 */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          className="hidden sm:inline text-white cursor-pointer hover:underline text-[11px] font-semibold whitespace-nowrap"
          onClick={() => router.push('/pfd/list')}
        >
          📋 <span className="hidden lg:inline">PFD</span>명
        </span>
        <select
          value={selectedPfdId || '__NEW__'}
          onChange={(e) => onPfdChange(e.target.value)}
          className="px-1 sm:px-2 py-1 rounded border-0 bg-white/20 text-white min-w-[100px] sm:min-w-[140px] lg:min-w-[160px] text-[11px]"
        >
          <option value="__NEW__" className="text-gray-800 font-bold">📄 새로 작성(Create)</option>
          {pfdList.map((pfd: any) => (
            <option key={pfd.id} value={pfd.id} className="text-gray-800">
              {pfd.pfdNo || pfd.id}
            </option>
          ))}
        </select>
      </div>

      <div className="w-px h-5 bg-white/30 shrink-0" />

      {/* 저장/Export/Import */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`px-2 sm:px-3 py-1 rounded transition-all text-white text-[11px] font-semibold whitespace-nowrap ${dirty ? 'bg-orange-500' : 'bg-white/15'
            }`}
          title={dirty ? '로컬에 임시 저장됨 (확정 버튼으로 DB 저장)' : 'DB에 저장됨'}
        >
          {dirty ? '📝' : '✅'}
          <span className="hidden sm:inline">{dirty ? 'Draft' : '저장됨(Saved)'}</span>
        </button>

        <button onClick={onExport} className={menuBtn}>
          📤<span className="hidden lg:inline">Export</span>
        </button>
        <button onClick={onImport} className={menuBtn}>
          📥<span className="hidden lg:inline">Import</span>
        </button>
      </div>

      <div className="hidden sm:block w-px h-5 bg-white/30 shrink-0" />

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onManageEquipment} className="flex items-center gap-1 px-2 py-1 bg-cyan-600 text-white rounded border border-cyan-400/50 text-[10px] hover:bg-cyan-500 transition-all font-medium whitespace-nowrap" title="Equipment/TOOL Management">
          <span>🔧 설비/TOOL(Equipment)</span>
        </button>
        <button onClick={onManageParts} className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded border border-emerald-400/50 text-[10px] hover:bg-emerald-500 transition-all font-medium whitespace-nowrap" title="Parts List Management">
          <span>📦 부품관리(Parts)</span>
        </button>
      </div>

      <div className="hidden sm:block w-px h-5 bg-white/30 shrink-0" />

      {/* 연동 + 이동 (4버튼) */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <button
          onClick={onSyncCP}
          className="px-1.5 py-0.5 rounded bg-teal-600 text-white text-[10px] font-medium hover:bg-teal-500 transition-all whitespace-nowrap"
          title="PFD ↔ CP Data Sync"
        >
          CP연동(Sync)
        </button>
        <button
          onClick={onSyncFMEA}
          className="px-1.5 py-0.5 rounded bg-indigo-700 text-white text-[10px] font-medium hover:bg-indigo-600 transition-all whitespace-nowrap"
          title="PFD ↔ FMEA Data Sync"
        >
          FMEA연동(Sync)
        </button>
        {onCpToPfd && (
          <button
            onClick={onCpToPfd}
            disabled={isSyncing || !cpNo}
            className="px-1.5 py-0.5 rounded bg-teal-800 text-white text-[10px] font-medium hover:bg-teal-700 transition-all whitespace-nowrap disabled:opacity-40"
            title="CP → PFD 역방향 연동 (CP 데이터를 PFD로 가져오기)"
          >
            CP→PFD
          </button>
        )}
        {onFmeaToPfd && (
          <button
            onClick={onFmeaToPfd}
            disabled={isSyncing || !fmeaId}
            className="px-1.5 py-0.5 rounded bg-indigo-900 text-white text-[10px] font-medium hover:bg-indigo-800 transition-all whitespace-nowrap disabled:opacity-40"
            title="FMEA → PFD 역방향 연동 (FMEA 데이터를 PFD로 가져오기)"
          >
            FMEA→PFD
          </button>
        )}
        <button
          onClick={() => router.push(cpNo ? `/control-plan/worksheet?cpNo=${encodeURIComponent(cpNo)}` : '/control-plan/worksheet')}
          className="px-1.5 py-0.5 rounded bg-teal-600/70 text-white text-[10px] font-medium hover:bg-teal-500 transition-all whitespace-nowrap"
          title="Go to CP Worksheet"
        >
          CP이동(Go)
        </button>
        <button
          onClick={() => router.push(fmeaId ? `/pfmea/worksheet?id=${encodeURIComponent(fmeaId)}` : '/pfmea/worksheet')}
          className="px-1.5 py-0.5 rounded bg-indigo-700/70 text-white text-[10px] font-medium hover:bg-indigo-600 transition-all whitespace-nowrap"
          title="Go to FMEA Worksheet"
        >
          FMEA이동(Go)
        </button>
      </div>

      {/* ★ 변경 이력 관련 버튼 */}
      {hasChangeMarkers && (
        <>
          <div className="hidden md:block w-px h-5 bg-white/30 shrink-0" />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onShowHistory}
              className="px-1 py-0.5 rounded bg-amber-500 text-white text-[10px] font-medium hover:bg-amber-400 transition-all whitespace-nowrap animate-pulse"
              title="Change History from Sync"
            >
              📜 변경이력(History)
            </button>
            <button
              onClick={onClearMarkers}
              className="px-1 py-0.5 rounded bg-green-600 text-white text-[10px] font-medium hover:bg-green-500 transition-all whitespace-nowrap"
              title="변경 표시 초기화 (승인)"
            >
              ✓ 승인(Approved)
            </button>
          </div>
        </>
      )}

    </div>
  );
}
