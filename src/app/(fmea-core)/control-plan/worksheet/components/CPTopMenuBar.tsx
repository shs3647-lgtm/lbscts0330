/**
 * @file CPTopMenuBar.tsx
 * @description Control Plan 워크시트 상단 메뉴바 (PFMEA TopMenuBar 패턴)
 * - CP 선택, 저장, Import/Export, FMEA 동기화
 * - 반응형 Tailwind CSS 적용
 *
 * @version 1.1.0
 * @updated 2026-01-21 - 템플릿 다운로드 기능 추가
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale';
// ✅ ExcelJS: dynamic import — 템플릿 다운로드 시점에 로드 (초기 번들 제외)

interface CPTopMenuBarProps {
  cpList: any[];
  selectedCpId: string | null;
  fmeaId: string | null;
  linkedPfdNo: string | null;
  dirty: boolean;
  isSaving: boolean;
  itemCount: number;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  onCpChange: (id: string) => void;
  onSave: () => void;
  onStructureSync: () => void;
  onDataSync: () => void;
  onPfdSync?: () => void;  // ★ CP→PFD 연동
  onFmeaCreate?: () => void;  // ★ CP→FMEA 신규 생성
  onFmeaToCp?: () => void;  // ★ FMEA→CP 역방향 연동
  onExport: () => void;
  onImportClick: () => void;
  onAddRow: () => void;
  onEPDeviceManager?: () => void; // EP검사장치 관리 모달
  hasChangeMarkers?: boolean;  // ★ 변경 마커 표시 여부
  onClearMarkers?: () => void;  // ★ 변경 마커 초기화
}


/** 공통 버튼 스타일 - 125% 줌 최적화 (2026-02-02) */
const menuBtn = `
  px-1 sm:px-1.5 lg:px-2 py-0.5 rounded transition-all 
  bg-transparent border border-transparent text-white 
  text-[9px] sm:text-[10px] lg:text-[11px] font-medium 
  hover:bg-white/15 hover:text-yellow-300 whitespace-nowrap
`;

export default function CPTopMenuBar({
  cpList,
  selectedCpId,
  fmeaId,
  linkedPfdNo,
  dirty,
  isSaving,
  itemCount,
  syncStatus = 'idle',
  onCpChange,
  onSave,
  onStructureSync,
  onDataSync,
  onPfdSync,  // ★ CP→PFD 연동
  onFmeaCreate,  // ★ CP→FMEA 신규 생성
  onFmeaToCp,  // ★ FMEA→CP 역방향 연동
  onExport,
  onImportClick,
  onAddRow,
  onEPDeviceManager,
  hasChangeMarkers,  // ★ 변경 마커 표시 여부
  onClearMarkers,  // ★ 변경 마커 초기화
}: CPTopMenuBarProps) {

  const router = useRouter();
  const { t } = useLocale();
  const [showImportMenu, setShowImportMenu] = React.useState(false);
  const [showSyncMenu, setShowSyncMenu] = React.useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = React.useState(false);
  const isSyncing = syncStatus === 'syncing';

  // 템플릿 다운로드 핸들러
  const handleDownloadEmptyTemplate = async () => {
    try {
      const { downloadCPEmptyTemplate } = await import('@/app/(fmea-core)/control-plan/import/excel-template');
      await downloadCPEmptyTemplate();
      setShowTemplateMenu(false);
      setShowImportMenu(false);
    } catch (error) {
      console.error('템플릿 다운로드 실패:', error);
      alert(t('템플릿 다운로드에 실패했습니다.'));
    }
  };

  const handleDownloadSampleTemplate = async () => {
    try {
      const { downloadCPSampleTemplate } = await import('@/app/(fmea-core)/control-plan/import/excel-template');
      await downloadCPSampleTemplate();
      setShowTemplateMenu(false);
      setShowImportMenu(false);
    } catch (error) {
      console.error('샘플 템플릿 다운로드 실패:', error);
      alert(t('샘플 템플릿 다운로드에 실패했습니다.'));
    }
  };

  return (
    <div
      className="flex items-center gap-1 sm:gap-2 fixed top-9 left-[53px] right-0 h-8 px-0 sm:px-1 z-[99] border-t border-b border-white/30 overflow-x-auto scrollbar-hide"
      style={{ background: '#1976d2' }}
    >
      {/* CP명 */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          className="hidden sm:inline text-white cursor-pointer hover:underline text-[11px] font-semibold whitespace-nowrap"
          onClick={() => router.push('/control-plan/list')}
        >
          📋 <span className="hidden lg:inline">CP</span>명(Name)
        </span>
        <select
          value={selectedCpId || '__NEW__'}
          onChange={(e) => onCpChange(e.target.value)}
          className="px-1 sm:px-2 py-1 rounded border-0 bg-white/20 text-white min-w-[100px] sm:min-w-[140px] lg:min-w-[160px] text-[11px]"
        >
          <option value="__NEW__" className="text-gray-800 font-bold">{t('새로 작성(Create)')}</option>
          {cpList.map((cp: any) => (
            <option key={cp.id} value={cp.id} className="text-gray-800">
              {cp.cpNo || cp.id}
            </option>
          ))}
        </select>
      </div>

      <div className="w-px h-5 bg-white/30 shrink-0" />

      {/* 저장/Import/Export */}
      <div className="flex items-center gap-1 shrink-0 relative">
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`px-2 sm:px-3 py-1 rounded transition-all text-white text-[10px] sm:text-[11px] lg:text-xs font-semibold whitespace-nowrap ${dirty ? 'bg-green-600' : 'bg-white/15'
            }`}
        >
          {dirty ? '💾' : '✅'}
          <span className="hidden sm:inline">{dirty ? t('저장(Save)') : t('저장됨(Saved)')}</span>
        </button>

        {/* Import 버튼 - 클릭 시 바로 파일 선택 */}
        <button
          onClick={() => {
            onImportClick();
          }}
          className={`${menuBtn} bg-green-600/50`}
        >
          📥<span className="hidden lg:inline">Import</span>
        </button>

        <button onClick={onExport} className={menuBtn}>
          📤<span className="hidden lg:inline">Export</span>
        </button>
      </div>

      <div className="hidden sm:block w-px h-5 bg-white/30 shrink-0" />

      {/* EP검사장치 */}
      <div className="flex items-center gap-1 shrink-0">
        {onEPDeviceManager && (
          <button
            onClick={onEPDeviceManager}
            className={`${menuBtn} bg-purple-600/50`}
          >
            🛡️<span className="hidden lg:inline">{t('EP검사장치(EP Device)')}</span>
          </button>
        )}
      </div>

      <div className="hidden sm:block w-px h-5 bg-white/30 shrink-0" />

      {/* 연동 + 이동 (4버튼) — PFD 메뉴바와 동일 패턴 */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <button
          onClick={() => {
            if (onPfdSync) {
              onPfdSync();
            } else {
              console.error('❌ [PFD 연동] onPfdSync가 undefined입니다!');
              alert(t('PFD 연동 기능이 연결되지 않았습니다.'));
            }
          }}
          className="px-1.5 py-0.5 rounded bg-orange-600 text-white text-[10px] font-medium hover:bg-orange-500 transition-all whitespace-nowrap"
          title="CP ↔ PFD Data Sync"
        >
          PFD연동(Sync)
        </button>
        {onFmeaCreate && (
          <button
            onClick={() => onFmeaCreate()}
            className="px-1.5 py-0.5 rounded bg-indigo-700 text-white text-[10px] font-medium hover:bg-indigo-600 transition-all whitespace-nowrap"
            title="CP ↔ FMEA Data Sync"
          >
            FMEA연동(Sync)
          </button>
        )}
        <button
          onClick={() => router.push(linkedPfdNo ? `/pfd/worksheet?pfdNo=${encodeURIComponent(linkedPfdNo)}` : '/pfd/worksheet')}
          className="px-1.5 py-0.5 rounded bg-orange-600/70 text-white text-[10px] font-medium hover:bg-orange-500 transition-all whitespace-nowrap"
          title="Go to PFD Worksheet"
        >
          PFD이동(Go)
        </button>
        <button
          onClick={() => router.push(fmeaId ? `/pfmea/worksheet?id=${encodeURIComponent(fmeaId)}` : '/pfmea/worksheet')}
          className="px-1.5 py-0.5 rounded bg-indigo-700/70 text-white text-[10px] font-medium hover:bg-indigo-600 transition-all whitespace-nowrap"
          title="Go to FMEA Worksheet"
        >
          FMEA이동(Go)
        </button>
      </div>

      {/* 우측 여백 */}
      <div className="ml-auto shrink-0" />
    </div>
  );
}

