/**
 * @file TopMenuBar.tsx
 * @description 워크시트 상단 메뉴바 (반응형)
 * - FMEA 선택, 저장, Import/Export, 특별특성 등
 * - 화면 크기에 따라 자동 조정
 *
 * @version 3.1.0 - 연동/이동 버튼 디자인 통일 (보라색 테두리)
 * 
 * ★★★ 코드프리즈 L2 - 2026-02-04 ★★★
 * - left-[53px] 필수 유지 (사이드바 48px + 구분선 5px)
 * - top-8 필수 유지 (CommonTopNav 아래)
 * - CP연동/PFD연동/4판연동/CP이동/PFD이동 버튼 스타일 HARDCODED
 * ⚠️ 버그 수정만 허용 - 레이아웃 충돌 위험
 */

'use client';

import React from 'react';
import ReactDOM from 'react-dom';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale';
import { WorksheetState } from '../constants';

interface TopMenuBarProps {
  fmeaList: any[];
  currentFmea: any;
  selectedFmeaId: string | null;
  cpNo?: string | null;
  dirty: boolean;
  isSaving: boolean;
  lastSaved: string;
  currentTab: string;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  importMessage: { type: 'success' | 'error'; text: string } | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  state: WorksheetState;
  onFmeaChange: (id: string) => void;
  onSave: () => void;
  onNavigateToList: () => void;
  onExport: () => void;
  onImportClick: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onOpenSpecialChar: () => void;
  onOpenSOD: () => void;
  onOpen5AP: () => void;
  onOpen6AP: () => void;
  onOpenRPN?: () => void;
  showRPN?: boolean;         // RPN 컬럼 토글 상태
  onOpenPDF?: () => void;    // PDF 뷰어 패널
  onOpenTree?: () => void;   // 트리뷰 패널
  activePanelId?: string;    // 현재 활성 패널 ID
  onCpStructureSync?: () => void;
  onCpDataSync?: () => void;
  onCreateCp?: () => void;    // ★ FMEA → CP 생성
  onCreatePfd?: () => void;   // ★ FMEA → PFD 생성
  linkedPfdNo?: string | null; // ★ 연동된 PFD 번호
  onConfirm?: () => void;     // ★ 확정 → 개정관리 현황
  onOpenBackup?: () => void;  // ★ 백업 관리 패널
  inputMode?: 'auto' | 'manual';
  onInputModeChange?: React.Dispatch<React.SetStateAction<'auto' | 'manual'>>;
  // ★★★ 2026-02-05: 수동/자동 토글 삭제 - StructureHeader에서 관리 ★★★
  isAdmin?: boolean;                  // ★ 관리자 여부 (위저드 표시 제어)
  onQuickCpSync?: () => void;         // ★ 일반사용자: 원클릭 CP 연동+이동
}

/** 공통 버튼 스타일 - 100% 줌 컴팩트 최적화 (2026-03-08) */
const menuBtn = `
  px-0.5 py-0.5 rounded transition-all
  bg-transparent border border-transparent text-white
  text-[9px] font-medium
  hover:bg-white/15 hover:text-yellow-400 whitespace-nowrap
`;

export default function TopMenuBar({
  fmeaList, selectedFmeaId, cpNo, dirty, isSaving, syncStatus = 'idle', importMessage, fileInputRef, state,
  onFmeaChange, onSave, onNavigateToList, onExport, onImportFile, onDownloadTemplate, onOpenSpecialChar, onOpenSOD, onOpen5AP, onOpen6AP, onOpenRPN, showRPN, onOpenPDF, onOpenTree,
  activePanelId,
  onCpStructureSync, onCpDataSync, onCreateCp, onCreatePfd, linkedPfdNo, onConfirm, onOpenBackup,
  isAdmin, onQuickCpSync,
}: TopMenuBarProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [showImportMenu, setShowImportMenu] = React.useState(false);
  const [showSyncMenu, setShowSyncMenu] = React.useState(false);
  const [syncMenuPos, setSyncMenuPos] = React.useState({ top: 0, left: 0 });
  const cpSyncBtnRef = React.useRef<HTMLButtonElement>(null);
  const syncMenuRef = React.useRef<HTMLDivElement>(null);
  const isSyncing = syncStatus === 'syncing';

  // ★ CP 연동 드롭다운: 외부 클릭 + ESC 키 + 스크롤 시 닫기
  React.useEffect(() => {
    if (!showSyncMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        syncMenuRef.current && !syncMenuRef.current.contains(e.target as Node) &&
        cpSyncBtnRef.current && !cpSyncBtnRef.current.contains(e.target as Node)
      ) {
        setShowSyncMenu(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSyncMenu(false);
    };
    const handleScroll = () => setShowSyncMenu(false);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showSyncMenu]);

  // CP 연동 버튼 클릭 시 드롭다운 위치 계산 (버튼 아래로 표시)
  const handleCpSyncClick = () => {
    if (cpSyncBtnRef.current) {
      const rect = cpSyncBtnRef.current.getBoundingClientRect();
      setSyncMenuPos({ top: rect.bottom + 2, left: rect.left });
    }
    setShowSyncMenu(prev => !prev);
  };

  return (
    <div
      className="flex items-center gap-0.5 fixed top-9 left-[53px] right-0 h-8 px-1 z-[99] border-t border-b border-white/30 overflow-x-auto scrollbar-hide"
      style={{ background: 'linear-gradient(to right, #1a237e, #283593, #1a237e)' }}
    >
      {/* FMEA명 */}
      <div className="flex items-center gap-0.5 shrink-0">
        <span
          className="hidden sm:inline text-white cursor-pointer hover:underline text-[9px] font-semibold whitespace-nowrap"
          onClick={onNavigateToList}
        >
          PFMEA:
        </span>
        <select
          value={selectedFmeaId || ''}
          onChange={(e) => onFmeaChange(e.target.value)}
          className="px-1 py-0.5 rounded border-0 bg-white/20 text-white min-w-[100px] sm:min-w-[120px] lg:min-w-[140px] text-[9px] sm:text-[10px]"
        >
          {fmeaList.length === 0 ? (
            <option value="" className="text-gray-500">{t('PFMEA 목록 없음')}</option>
          ) : (
            fmeaList.map((fmea: any) => (
              <option key={fmea.id} value={fmea.id} className="text-gray-800">
                {(() => {
                  // ★★★ 2026-02-03: 사용자의 요청에 따라 "완제품명(id)" 형식으로 표시 ★★★
                  const productName = fmea.project?.productName || fmea.fmeaInfo?.subject || fmea.id;
                  return `${productName}(${fmea.id})`;
                })()}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="w-px h-5 bg-white/30 shrink-0" />

      {/* 저장/Import/Export */}
      <div className="flex items-center gap-0.5 shrink-0 relative">
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`px-1 py-0.5 rounded transition-all text-white text-[9px] font-semibold whitespace-nowrap ${isSaving ? 'bg-orange-500' : dirty ? 'bg-green-600' : 'bg-white/15'
            }`}
        >
          {isSaving ? t('저장중') : dirty ? t('저장') : t('Saved')}
        </button>

        {/* Import 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => setShowImportMenu(!showImportMenu)}
            className={menuBtn}
          >
            Import▾
          </button>
          {showImportMenu && (
            <div
              className="absolute top-full left-0 mt-1 bg-white rounded shadow-lg border z-50 min-w-[140px]"
              onMouseLeave={() => setShowImportMenu(false)}
              onClick={() => setShowImportMenu(false)}
            >
              <button
                onClick={() => { fileInputRef.current?.click(); setShowImportMenu(false); }}
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 border-b text-gray-800"
              >
                📂 {t('Excel 가져오기')}
              </button>
              <button
                onClick={() => { onDownloadTemplate(); setShowImportMenu(false); }}
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 text-gray-800"
              >
                📋 {t('템플릿 다운로드')}
              </button>
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onImportFile} className="hidden" />

        <button onClick={onExport} className={menuBtn}>Export</button>

        {importMessage && (
          <span className={`px-2 py-1 rounded text-white text-[10px] font-semibold ${importMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {importMessage.text}
          </span>
        )}
      </div>

      <div className="hidden sm:block w-px h-5 bg-white/30 shrink-0" />

      {/* 특별특성/SOD/5AP/6AP/RPN/PDF/TREE */}
      <div className="hidden sm:flex items-center gap-0.5 shrink-0">
        <button onClick={onOpenSpecialChar} className={menuBtn} title={t('특별특성')}>SC</button>
        <button onClick={onOpenSOD} className={menuBtn}>SOD</button>
        <button onClick={onOpen5AP} className={menuBtn}>5AP</button>
        <button onClick={onOpen6AP} className={menuBtn}>6AP</button>
        <button onClick={onOpenRPN} className={`${menuBtn} ${showRPN ? 'bg-yellow-500/80 text-black font-bold' : 'bg-blue-600/50'}`}>RPN</button>
        <button onClick={onOpenPDF} className={`${menuBtn} ${activePanelId === 'pdf' ? 'bg-yellow-500/80 text-black font-bold' : 'bg-blue-600/50'}`}>PDF</button>
      </div>

      <div className="hidden md:block w-px h-5 bg-white/30 shrink-0" />

      {/* CP연동/PFD연동/CP이동/PFD이동/확정 */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* ★ 관리자: CP 드롭다운 (위저드 표시), 일반사용자: 원클릭 연동+이동 */}
        {isAdmin ? (
          <button
            ref={cpSyncBtnRef}
            onClick={handleCpSyncClick}
            disabled={isSyncing}
            className={`px-1 py-0.5 rounded text-[9px] font-medium transition-all whitespace-nowrap ${
              showSyncMenu
                ? 'bg-blue-600 border border-blue-300 text-white'
                : 'bg-transparent border border-white/30 text-white/70 hover:bg-white/15 hover:text-white'
            }`}
            data-testid="cp-sync-button"
          >
            CP▾
          </button>
        ) : (
          <button
            onClick={() => onQuickCpSync?.()}
            disabled={isSyncing}
            className={`px-1 py-0.5 rounded text-[9px] font-medium transition-all whitespace-nowrap ${
              isSyncing
                ? 'bg-orange-500 border border-orange-300 text-white'
                : 'bg-transparent border border-white/30 text-white/70 hover:bg-white/15 hover:text-white'
            }`}
            data-testid="cp-quick-sync-button"
            title="FMEA→CP 전체 연동 후 CP로 이동"
          >
            {isSyncing ? 'CP⏳' : 'FMEA→CP'}
          </button>
        )}
        <button
          onClick={onCreatePfd}
          disabled={isSyncing}
          className="px-1 py-0.5 rounded bg-transparent border border-white/30 text-white/70 text-[9px] font-medium hover:bg-white/15 hover:text-white transition-all whitespace-nowrap"
          title={t('현재 FMEA 데이터로 PFD 생성')}
        >
          PFD
        </button>

      {/* CP 연동 드롭다운 - Portal로 body에 렌더링 (관리자만 표시) */}
      {isAdmin && showSyncMenu && ReactDOM.createPortal(
        <div
          ref={syncMenuRef}
          className="fixed bg-white rounded shadow-xl border border-teal-400 min-w-[160px]"
          style={{
            top: syncMenuPos.top,
            left: syncMenuPos.left,
            zIndex: 100001
          }}
        >
          <button
            onClick={() => {
              if (onCreateCp) onCreateCp();
              else alert(t('CP 생성 함수가 연결되지 않았습니다.'));
              setShowSyncMenu(false);
            }}
            disabled={isSyncing}
            className="w-full text-left px-3 py-2 text-[11px] hover:bg-green-50 border-b text-gray-800 disabled:opacity-50 font-medium"
          >
            ➕ {t('CP 생성')}
            <span className="text-[9px] text-gray-400 ml-1">{t('FMEA 기반')}</span>
          </button>
          <button
            onClick={() => {
              if (onCpStructureSync) onCpStructureSync();
              else alert(t('CP 구조연동 함수가 연결되지 않았습니다.'));
              setShowSyncMenu(false);
            }}
            disabled={isSyncing}
            className="w-full text-left px-3 py-2 text-[11px] hover:bg-teal-50 border-b text-gray-800 disabled:opacity-50 font-medium"
          >
            🔗 {t('CP 구조연동')}
            <span className="text-[9px] text-gray-400 ml-1">{t('구조→CP')}</span>
          </button>
          <button
            onClick={() => {
              if (onCpDataSync) onCpDataSync();
              else alert(t('데이터 동기화 함수가 연결되지 않았습니다.'));
              setShowSyncMenu(false);
            }}
            disabled={isSyncing}
            className="w-full text-left px-3 py-2 text-[11px] hover:bg-teal-50 text-gray-800 disabled:opacity-50 font-medium"
          >
            🔄 {t('데이터 동기화')}
            <span className="text-[9px] text-gray-400 ml-1">{t('양방향')}</span>
          </button>
        </div>,
        document.body
      )}

      {/* Go to CP / Go to PFD / Confirm */}
        <button
          onClick={() => {
            const cpUrl = cpNo
              ? `/control-plan/worksheet?cpNo=${encodeURIComponent(cpNo)}`
              : '/control-plan/worksheet';
            router.push(cpUrl);
          }}
          className="px-1 py-0.5 rounded bg-transparent border border-white/30 text-white/70 text-[9px] font-medium hover:bg-white/15 hover:text-white transition-all whitespace-nowrap"
          title={cpNo ? `CP 워크시트로 이동 (${cpNo})` : 'CP 워크시트로 이동'}
        >
          →CP
        </button>
        <button
          onClick={() => router.push(linkedPfdNo ? `/pfd/worksheet?pfdNo=${encodeURIComponent(linkedPfdNo)}` : '/pfd/worksheet')}
          className="px-1 py-0.5 rounded bg-transparent border border-white/30 text-white/70 text-[9px] font-medium hover:bg-white/15 hover:text-white transition-all whitespace-nowrap"
          title={linkedPfdNo ? `PFD 워크시트로 이동 (${linkedPfdNo})` : 'PFD 워크시트로 이동'}
        >
          →PFD
        </button>
        <button
          onClick={onConfirm}
          className="px-1 py-0.5 rounded bg-green-700 border border-green-400 text-white text-[9px] font-bold hover:bg-green-600 transition-all whitespace-nowrap"
          title={t('확정 후 개정관리 현황으로 이동')}
        >
          {t('확정')}
        </button>
        <button
          onClick={() => {
            if (selectedFmeaId) {
              window.open(`/pfmea/verify?fmeaId=${encodeURIComponent(selectedFmeaId)}`, '_blank');
            }
          }}
          className="px-1 py-0.5 rounded bg-teal-700 border border-teal-400 text-white text-[9px] font-bold hover:bg-teal-600 transition-all whitespace-nowrap"
          title={t('통계검증 페이지 열기 (새 탭)')}
        >
          {t('검증')}
        </button>
      </div>

      {/* ★★★ 2026-02-05: 수동/자동 토글 삭제 - StructureHeader에서 관리 ★★★ */}

    </div>
  );
}
