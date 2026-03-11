/**
 * @file PmTopMenuBar.tsx
 * @description WS 워크시트 상단 메뉴바 (저장, 연동, 버전관리) - PFD 스타일 (Dark Theme)
 * @version 1.3.0 - 설비/부품 리스트 관리 버튼 추가
 */

import React from 'react';
import { useLocale } from '@/lib/locale';

interface PmTopMenuBarProps {
  pmList: Array<{ id: string; pmNo: string; subject?: string }>;
  selectedPmId: string;
  cpNo?: string;
  dirty: boolean;
  isSaving: boolean;
  itemCount: number;
  onPmChange: (id: string) => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onAddRow: () => void;

  // 연동 및 이동 관련 Props
  onLinkToCP?: () => void;
  onLinkToFMEA?: () => void;
  onSyncToCP?: () => void;
  onSyncToFMEA?: () => void;

  // 관리 모달 버튼 Props
  onManageEquipment?: () => void;
  onManageParts?: () => void;

  hasChangeMarkers?: boolean;
  onShowHistory?: () => void;
  onClearMarkers?: () => void;
}

function PmTopMenuBarInner({
  pmList = [],
  selectedPmId,
  cpNo,
  dirty,
  isSaving,
  itemCount,
  onPmChange,
  onSave,
  onExport,
  onImport,
  onAddRow,
  onLinkToCP,
  onLinkToFMEA,
  onSyncToCP,
  onSyncToFMEA,
  onManageEquipment,
  onManageParts,
  hasChangeMarkers = false,
  onShowHistory,
  onClearMarkers,
}: PmTopMenuBarProps) {
  const { t } = useLocale();

  return (
    <div className="fixed top-[36px] left-[53px] right-0 h-[45px] bg-[#455a64] border-b border-white/10 z-[90] flex items-center px-4 justify-between shadow-sm">
      {/* 좌측: WS 선택 및 정보 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{t('WS 선택')}</span>
          <select
            className="text-xs border border-white/30 bg-white/10 text-white rounded px-2 py-1 min-w-[150px] outline-none focus:border-blue-300 [&>option]:text-black"
            value={selectedPmId}
            onChange={(e) => onPmChange(e.target.value)}
          >
            <option value="">(WS를 선택하세요)</option>
            <option value="__NEW__">+ 새 WS 작성</option>
            {pmList.map((ws) => (
              <option key={ws.id} value={ws.pmNo}>
                {ws.pmNo} {ws.subject ? `- ${ws.subject}` : ''}
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

      {/* 우측: 엑셀/기능 버튼 */}
      <div className="flex items-center gap-2">

        {/* 관리 모달 버튼 */}
        <button onClick={onManageEquipment} className="flex items-center gap-1 px-3 py-1 bg-cyan-600 text-white rounded border border-cyan-400/50 text-xs hover:bg-cyan-500 transition-all font-medium shadow-sm" title="설비/TOOL 관리 열기">
          <span>🔧 {t('설비/TOOL')}</span>
        </button>
        <button onClick={onManageParts} className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded border border-emerald-400/50 text-xs hover:bg-emerald-500 transition-all font-medium shadow-sm" title={t('부품관리')}>
          <span>📦 {t('부품관리')}</span>
        </button>

        <div className="h-4 w-px bg-white/30 mx-1"></div>

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
        <button onClick={onSyncToCP} className="flex items-center gap-1 px-3 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-500 shadow-sm transition-all" title={t('CP 데이터 연동')}>
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

        {/* 변경이력 */}
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

const PmTopMenuBar = React.memo(PmTopMenuBarInner);
export default PmTopMenuBar;
