/**
 * @file WsTopMenuBar.tsx
 * @description WS 워크시트 상단 메뉴바 (저장, 연동, 버전관리) - PFD 스타일 (Dark Theme)
 * @version 1.2.0 - CP/FMEA 연동 및 이동 버튼 추가
 */

import React from 'react';
import { useLocale } from '@/lib/locale';

interface WsTopMenuBarProps {
  wsList: Array<{ id: string; wsNo: string; subject?: string }>;
  selectedWsId: string;
  cpNo?: string;
  dirty: boolean;
  isSaving: boolean;
  itemCount: number;
  onWsChange: (id: string) => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onAddRow: () => void;
  // ★ 연동 및 이동 관련 Props 추가
  onLinkToCP?: () => void;
  onLinkToFMEA?: () => void;
  onSyncToCP?: () => void;   // "CP로" (데이터 연동)
  onSyncToFMEA?: () => void; // "FMEA로" (데이터 연동)

  hasChangeMarkers?: boolean;
  onShowHistory?: () => void;
  onClearMarkers?: () => void;
}

function WsTopMenuBarInner({
  wsList = [],
  selectedWsId,
  cpNo,
  dirty,
  isSaving,
  itemCount,
  onWsChange,
  onSave,
  onExport,
  onImport,
  onAddRow,
  onLinkToCP,
  onLinkToFMEA,
  onSyncToCP,
  onSyncToFMEA,
  hasChangeMarkers = false,
  onShowHistory,
  onClearMarkers,
}: WsTopMenuBarProps) {
  const { t } = useLocale();

  return (
    <div className="fixed top-[36px] left-[53px] right-0 h-[45px] bg-[#455a64] border-b border-white/10 z-[90] flex items-center px-4 justify-between shadow-sm">
      {/* 좌측: WS 선택 및 정보 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{t('WS 선택')}</span>
          <select
            className="text-xs border border-white/30 bg-white/10 text-white rounded px-2 py-1 min-w-[150px] outline-none focus:border-blue-300 [&>option]:text-black"
            value={selectedWsId}
            onChange={(e) => onWsChange(e.target.value)}
          >
            <option value="">(WS를 선택하세요)</option>
            <option value="__NEW__">+ 새 WS 작성</option>
            {wsList.map((ws) => (
              <option key={ws.id} value={ws.wsNo}>
                {ws.wsNo} {ws.subject ? `- ${ws.subject}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-white/30"></div>

        <button onClick={onSave} disabled={isSaving} className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all ${dirty
            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md animate-pulse'
            : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}>
          {isSaving ? `💾 ${t('저장중')}...` : dirty ? `💾 ${t('저장')} (${t('수정')})` : `💾 ${t('저장됨')}`}
        </button>
      </div>

      {/* 우측: 엑셀/기능 버튼 (사용자 요청 UI 반영) */}
      <div className="flex items-center gap-2">

        {/* Export / Import */}
        <button onClick={onExport} className="flex items-center gap-1 px-2 py-1 text-white hover:bg-white/10 rounded text-xs transition-colors">
          <span className="text-red-300">📤</span>
          <span>Export</span>
        </button>
        <label className="flex items-center gap-1 px-2 py-1 text-white hover:bg-white/10 rounded text-xs transition-colors cursor-pointer">
          <span className="text-blue-300">📥</span>
          <span>Import</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        </label>

        <div className="h-4 w-px bg-white/30 mx-1"></div>

        {/* CP로 / FMEA로 (데이터 연동) */}
        <button onClick={onSyncToCP} className="flex items-center gap-1 px-3 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-500 shadow-sm transition-all" title="CP 데이터 연동">
          <span>➡ {t('CP로')}</span>
        </button>
        <button onClick={onSyncToFMEA} className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-500 shadow-sm transition-all" title={t('FMEA 데이터 연동')}>
          <span>➡ {t('FMEA로')}</span>
        </button>

        <div className="h-4 w-px bg-white/30 mx-1"></div>

        {/* CP 이동 / FMEA 이동 (페이지 이동) */}
        <button onClick={onLinkToCP} className="flex items-center gap-1 px-3 py-1 bg-teal-700 text-white rounded text-xs hover:bg-teal-600 shadow-sm border border-teal-500 transition-all">
          <span>📋 {t('CP 이동')}</span>
        </button>
        <button onClick={onLinkToFMEA} className="flex items-center gap-1 px-3 py-1 bg-indigo-700 text-white rounded text-xs hover:bg-indigo-600 shadow-sm border border-indigo-500 transition-all">
          <span>📊 {t('FMEA 이동')}</span>
        </button>

        {/* 변경이력 (기존 기능 유지) */}
        {hasChangeMarkers && (
          <>
            <div className="h-4 w-px bg-white/30 mx-1"></div>
            <button onClick={onShowHistory} className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-200 rounded border border-amber-500/30 text-xs font-medium hover:bg-amber-500/30">
              <span>📜 {t('변경이력')}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const WsTopMenuBar = React.memo(WsTopMenuBarInner);
export default WsTopMenuBar;
