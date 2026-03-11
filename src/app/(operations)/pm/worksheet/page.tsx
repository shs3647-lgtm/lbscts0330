/**
 * @file page.tsx
 * @description WS 워크시트 메인 페이지
 * @version 1.1.0 - 2026-02-01: 탭 컴포넌트 분리 및 최적화
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale';

// 레이아웃 컴포넌트
import WSTopNav from '@/components/layout/WSTopNav';
import { SidebarRouter } from '@/components/layout/SidebarRouter';

// WS 워크시트 컴포넌트
import PmTopMenuBar from './components/PmTopMenuBar';
import { PmTabMenu } from './components/PmTabMenu';
import PmContextMenu from './components/PmContextMenu';
import { AutoInputModal } from './components/AutoInputModal';
import { PmTableHeader } from './components/PmTableHeader';
import { PmTableBody } from './components/PmTableBody';

// (NEW) WS 전용 탭 컴포넌트
import PmMainTab from './components/PmMainTab';
import PmEquipmentTab from './components/PmEquipmentTab';
import PmWorkStandardTab from './components/PmWorkStandardTab';
import PmEquipmentModal from './components/PmEquipmentModal';
import PmPartsModal from './components/PmPartsModal';

// 훅
import {
  useProcessRowSpan, useDescRowSpan, useWorkRowSpan, useEquipmentRowSpan, useCharRowSpan,
  useContextMenu, useWorksheetHandlers, useColumnResize,
  useUndoRedo, usePmData, usePfdActions,
} from './hooks';

// 타입 및 상수
import { PmState, SaveStatus, PmItem, AutoModalState } from './types';
import { PM_COLUMNS, HEIGHTS, calculateGroupSpans, calculateTotalWidth } from './pmConstants';
import { saveChangeMarkers, getChangeHistory, formatChangeHistory } from '@/lib/change-history';
import { createEmptyItem } from './utils';

// PM Main 타입
import { PMMainDocument, createEmptyPMMainDocument } from '@/types/pm-main';

// ============ 메인 컴포넌트 ============
function PmWorksheetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();

  const pmNoParam = searchParams.get('pmNo') || '';
  const cpNoParam = searchParams.get('cpNo') || '';
  const syncMode = searchParams.get('sync') === 'true';

  // ★ 현재 활성 탭 (첫 화면: pm-worksheet)
  const [activeTab, setActiveTab] = useState('pm-worksheet');

  // ★ 상태 (초안/확정/승인)
  const [status, setStatus] = useState<'draft' | 'review' | 'approved'>('draft');

  // ==========================================
  // [1] PM Main Document 상태 관리 (LocalStorage)
  // ==========================================
  const [document, setDocument] = useState<PMMainDocument>(createEmptyPMMainDocument);
  const [isMainSaving, setIsMainSaving] = useState(false);

  // 로컬 로드
  useEffect(() => {
    const saved = localStorage.getItem('pm-main-current');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 기존 데이터와 새 구조 병합 (누락된 필드 방지)
        const defaultDoc = createEmptyPMMainDocument();
        setDocument({
          ...defaultDoc,
          ...parsed,
          // 객체 타입 필드는 깊은 병합 필요할 수 있음 (여기서는 단순 1단계 병합 처리)
          approval: { ...defaultDoc.approval, ...(parsed.approval || {}) },
          safetyEquipment: { ...defaultDoc.safetyEquipment, ...(parsed.safetyEquipment || {}) },
        });
      } catch (e) {
        console.error('WS 데이터 로드 실패:', e);
      }
    }
  }, []);

  // 자동 저장 (0.5초 디바운스)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('pm-main-current', JSON.stringify(document));
    }, 500);
    return () => clearTimeout(timer);
  }, [document]);

  // 수동 저장 핸들러
  const handleMainSave = useCallback(() => {
    setIsMainSaving(true);
    try {
      setDocument(prev => ({
        ...prev,
        updatedAt: new Date().toISOString()
      }));
      // localStorage 저장은 useEffect가 처리함
      setTimeout(() => setIsMainSaving(false), 500);
    } catch (e) {
      setIsMainSaving(false);
    }
  }, []);

  // ==========================================
  // [2] WS Worksheet 상태 관리 (usePmData)
  // ==========================================
  const {
    state,
    setState,
    loading,
    pmList,
    changeMarkers,
    setChangeMarkers,
  } = usePmData({ pmNoParam, cpNoParam, syncMode });

  // Undo/Redo 훅
  const {
    saveToHistory,
    handleUndo: undoAction,
    handleRedo: redoAction,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    handleMergeUp,
    handleMergeDown,
    handleUnmerge,
  } = useUndoRedo({
    items: state.items,
    setItems: (updater) => setState(prev => ({ ...prev, items: updater(prev.items) })),
    setDirty: (dirty) => setState(prev => ({ ...prev, dirty })),
  });

  const handleUndo = useCallback(() => {
    const result = undoAction();
    if (result === null) {
      alert(t('취소할 작업이 없습니다.'));
    } else {
      setState(prev => ({ ...prev, items: result, dirty: true }));
    }
  }, [undoAction, setState]);

  const handleRedo = useCallback(() => {
    const result = redoAction();
    if (result === null) {
      alert(t('다시 실행할 작업이 없습니다.'));
    } else {
      setState(prev => ({ ...prev, items: result, dirty: true }));
    }
  }, [redoAction, setState]);

  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // 입력 모드 및 확장병합 설정
  const [inputMode, setInputMode] = useState<'manual' | 'auto'>('manual');
  const [extensionMerge, setExtensionMerge] = useState({
    all: true, D: true, E: true, F: true, H: true,
  });

  const toggleExtensionMerge = (key: 'all' | 'D' | 'E' | 'F' | 'H') => {
    if (key === 'all') {
      const newValue = !extensionMerge.all;
      setExtensionMerge({ all: newValue, D: newValue, E: newValue, F: newValue, H: newValue });
    } else {
      setExtensionMerge(prev => {
        const newState = { ...prev, [key]: !prev[key] };
        newState.all = newState.D && newState.E && newState.F && newState.H;
        return newState;
      });
    }
  };

  // 컨텍스트 메뉴 훅
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();

  // 컬럼 리사이즈 훅
  const { columnWidths, startResize, resetColumnWidth, getColumnWidth } = useColumnResize();

  // 워크시트 핸들러 훅
  const {
    handleCellChange,
    handleAddRow,
    handleInsertRowAbove,
    handleInsertRowBelow,
    handleDeleteRow,
    handleSave,
  } = useWorksheetHandlers({ state, setState, setSaveStatus, closeContextMenu, saveToHistory, extensionMerge });

  // 비즈니스 액션 훅
  const {
    filteredItems,
    handleConfirm: pfdConfirm,
    handleApprove: pfdApprove,
    handleExport,
    handleImport,
    handleSyncCP,
  } = usePfdActions({ state, setState, handleSave, setSaveStatus, saveToHistory });

  // 확정/승인 핸들러
  const handleConfirm = useCallback(() => {
    if (status === 'approved') return;
    if (confirm(t('현재 WS를 확정하시겠습니까?'))) {
      handleSave(); // 워크시트 저장
      handleMainSave(); // 메인 정보 저장
      setStatus('review');
      alert(t('WS가 확정되었습니다.'));
    }
  }, [status, handleSave, handleMainSave, t]);

  const handleApprove = useCallback(() => {
    if (status !== 'review') return;
    if (confirm(t('현재 WS를 최종 승인하시겠습니까?'))) {
      setStatus('approved');
      alert(t('WS가 승인되었습니다.'));
    }
  }, [status, t]);

  // rowSpan 계산 훅
  const processRowSpan = useProcessRowSpan(filteredItems);
  const descRowSpan = useDescRowSpan(filteredItems);
  const workRowSpan = useWorkRowSpan(filteredItems);
  const equipmentRowSpan = useEquipmentRowSpan(filteredItems);
  const charRowSpan = useCharRowSpan(filteredItems);

  // 자동 입력 모달 상태
  const [autoModal, setAutoModal] = useState<AutoModalState>({
    visible: false,
    rowIdx: -1,
    type: 'general',
    position: 'below',
  });

  const handleAutoModeClick = useCallback((rowIdx: number, type: any, colKey?: string) => {
    setAutoModal({ visible: true, rowIdx, type, position: 'below' });
  }, []);

  const handleAutoModalInsert = useCallback(() => {
    const { rowIdx, type, position } = autoModal;
    if (position === 'above') {
      handleInsertRowAbove(rowIdx, type);
    } else {
      handleInsertRowBelow(rowIdx, type);
    }
    setAutoModal(prev => ({ ...prev, visible: false }));
  }, [autoModal, handleInsertRowAbove, handleInsertRowBelow]);

  const closeAutoModal = useCallback(() => {
    setAutoModal(prev => ({ ...prev, visible: false }));
  }, []);

  // 빈 행 추가 핸들러
  const handleAddEmptyRow = useCallback((newItem: PmItem) => {
    setState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      dirty: true,
    }));
  }, [setState]);

  // ============ [추가] PmTopMenuBar 핸들러 ============
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);

  const handleManageEquipment = () => setShowEquipmentModal(true);
  const handleManageParts = () => setShowPartsModal(true);

  const handleLinkToCP = () => {
    if (state.cpNo) {
      window.open(`/cp/worksheet?cpNo=${state.cpNo}`, '_blank');
    } else {
      alert(t('연동된 CP 정보가 없습니다.'));
    }
  };

  const handleLinkToFMEA = () => {
    // FMEA ID는 state에 있다고 가정 (없으면 undefined)
    const fmeaId = (state as any).fmeaId;
    if (fmeaId) {
      window.open(`/pfmea/worksheet?id=${fmeaId}`, '_blank');
    } else {
      alert(t('연동된 FMEA 정보가 없습니다.'));
    }
  };

  const handleSyncToCP = () => {
    // 기존 handleSyncCP (가져오기) 또는 보내기 로직
    // 일단은 기능 준비중 처리
    alert(t('기능 준비 중입니다.'));
  };

  const handleSyncToFMEA = () => {
    alert(t('기능 준비 중입니다.'));
  };

  // ============ 렌더링 ============
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <div className="text-gray-500">{t('로딩 중...')}</div>
      </div>
    );
  }

  // document에 공정 정보가 없을 때 PFD/WS에서 가져오도록 동기화 (선택적)
  // useEffect(() => {
  //   if (state.partName && !document.productName) {
  //     setDocument(prev => ({ ...prev, productName: state.partName }));
  //   }
  // }, [state.partName, document.productName]);

  return (
    <>
      <WSTopNav />
      <SidebarRouter />

      <div style={{ marginLeft: 53 }}>
      <PmTopMenuBar
        pmList={pmList}
        selectedPmId={state.pmNo}
        cpNo={state.cpNo}
        dirty={state.dirty}
        isSaving={saveStatus === 'saving' || isMainSaving}
        itemCount={state.items.length}
        onPmChange={(id) => {
          if (id === '__NEW__') {
            setState(prev => ({ ...prev, pmNo: '', items: [], dirty: false }));
            router.push('/pm/worksheet');
          } else {
            setState(prev => ({ ...prev, pmNo: id, dirty: false }));
            router.push(`/pm/worksheet?pmNo=${id}`);
          }
        }}
        onSave={() => {
          handleSave(); // 워크시트 저장
          handleMainSave(); // 메인 정보 저장
        }}
        onExport={handleExport}
        onImport={handleImport}
        onAddRow={handleAddRow}
        onSyncToCP={handleSyncToCP}
        onSyncToFMEA={handleSyncToFMEA}
        onLinkToCP={handleLinkToCP}
        onLinkToFMEA={handleLinkToFMEA}
        onManageEquipment={handleManageEquipment}
        onManageParts={handleManageParts}
        hasChangeMarkers={Object.keys(changeMarkers).length > 0}
        onShowHistory={() => { }}
        onClearMarkers={() => setChangeMarkers({})}
      />

      <PmTabMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pmNo={state.pmNo}
        cpNo={state.cpNo}
        itemCount={state.items.length}
        dirty={state.dirty}
        status={status}
        onConfirm={handleConfirm}
        onApprove={handleApprove}
        inputMode={inputMode}
        onInputModeChange={setInputMode}
        extensionMerge={extensionMerge}
        onExtensionMergeToggle={toggleExtensionMerge}
      />

      {/* 메인 레이아웃 - 탭별 컨텐츠 */}
      <div className="fixed top-[113px] left-[53px] right-0 bottom-0 flex flex-row overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">

          {/* ========== [Tab 1] PM Main ========== */}
          {activeTab === 'pm-main' && (
            <PmMainTab
              document={document}
              setDocument={setDocument}
              onSave={handleMainSave}
              isSaving={isMainSaving}
            />
          )}

          {/* ========== [Tab 2] PM Work Sheet (Active) ========== */}
          {activeTab === 'pm-worksheet' && (
            <div
              id="pm-worksheet-scroll-container"
              className="bg-white border-t border-gray-300 flex-1"
              style={{
                flex: 1,
                overflowX: 'scroll',
                overflowY: 'auto',
                background: '#fff',
                position: 'relative',
              }}
            >
              <table className="border-separate" style={{ borderSpacing: 0, width: 'max-content', minWidth: '100%', tableLayout: 'fixed' }}>
                <PmTableHeader
                  columnWidths={columnWidths}
                  getColumnWidth={getColumnWidth}
                  startResize={startResize}
                  resetColumnWidth={resetColumnWidth}
                  extensionMerge={extensionMerge}
                />
                <PmTableBody
                  items={filteredItems}
                  pfdNo={state.pmNo}
                  processRowSpan={processRowSpan}
                  descRowSpan={descRowSpan}
                  workRowSpan={workRowSpan}
                  equipmentRowSpan={equipmentRowSpan}
                  charRowSpan={charRowSpan}
                  columnWidths={columnWidths}
                  getColumnWidth={getColumnWidth}
                  onCellChange={handleCellChange}
                  onContextMenu={openContextMenu}
                  onAutoModeClick={handleAutoModeClick}
                  inputMode={inputMode}
                  changeMarkers={changeMarkers}
                  onAddEmptyRow={handleAddEmptyRow}
                  setState={setState}
                />
              </table>
            </div>
          )}

          {/* ========== [Tab 3] 설비/TOOL ========== */}
          {activeTab === 'equipment' && (
            <PmEquipmentTab
              document={document}
              setDocument={setDocument}
            />
          )}

          {/* ========== [Tab 4] 작업표준 ========== */}
          {activeTab === 'work-standard' && (
            <PmWorkStandardTab
              document={document}
              setDocument={setDocument}
            />
          )}

        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      < PmContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onInsertAbove={(idx) => handleInsertRowAbove(idx, 'process')
        }
        onInsertBelow={(idx) => handleInsertRowBelow(idx, 'process')}
        onDelete={handleDeleteRow}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onMergeUp={handleMergeUp}
        onMergeDown={handleMergeDown}
        onUnmerge={handleUnmerge}
        undoCount={undoCount}
        redoCount={redoCount}
      />

      {/* 자동 입력 모달 */}
      < AutoInputModal
        modal={autoModal}
        onClose={closeAutoModal}
        onPositionChange={(pos) => setAutoModal(prev => ({ ...prev, position: pos }))}
        onInsert={handleAutoModalInsert}
      />

      {/* 설비/부품 관리 모달 */}
      < PmEquipmentModal
        isOpen={showEquipmentModal}
        onClose={() => setShowEquipmentModal(false)}
        wsData={document}
        setWsData={setDocument}
      />
      <PmPartsModal
        isOpen={showPartsModal}
        onClose={() => setShowPartsModal(false)}
        wsData={document}
        setWsData={setDocument}
      />
      </div>
    </>
  );
}

// Suspense wrapper
export default function PmWorksheetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">Loading...</div>}>
      <PmWorksheetContent />
    </Suspense>
  );
}
