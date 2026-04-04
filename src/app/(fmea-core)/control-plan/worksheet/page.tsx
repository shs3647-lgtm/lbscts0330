/**
 * @file page.tsx
 * @description Control Plan 워크시트 메인 페이지 (모듈화 완료)
 * @version 2.0.0 - 2026-02-01 모듈화 리팩토링
 * @line-count ~400줄
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale';

// 레이아웃 컴포넌트
import CPTopNav from '@/components/layout/CPTopNav';
import { SidebarRouter } from '@/components/layout/SidebarRouter';

// CP 워크시트 컴포넌트
import CPTopMenuBar from './components/CPTopMenuBar';
import CPTabMenu from './components/CPTabMenu';
import { CPContextMenu } from './components/CPContextMenu';
import { AutoInputModal } from './components/AutoInputModal';
import ProcessFlowInputModal from './components/ProcessFlowInputModal';
import ProcessDescInputModal from './components/ProcessDescInputModal';
import EquipmentInputModal from './components/EquipmentInputModal';
import StandardInputModal from './components/StandardInputModal';
// ✅ ExcelJS: dynamic import — EP장치 관리 모달 열 때 로드 (초기 번들 제외)
const EPDeviceManager = dynamic(
  () => import('@/app/(fmea-core)/pfmea/worksheet/tabs/cp/EPDeviceManager'),
  { ssr: false }
);
import EPDeviceSelectModal from './components/EPDeviceSelectModal';
import { CPTableHeader } from './components/CPTableHeader';
import { CPTableBody } from './components/CPTableBody';

// 훅
import {
  useProcessRowSpan, useDescRowSpan, usePartNameRowSpan, useWorkRowSpan, useCharRowSpan,
  useContextMenu, useWorksheetHandlers, useModalHandlers, useColumnResize,
  useUndoRedo, useCPData, useSyncHandlers, useCPActions,
} from './hooks';

// 타입 및 상수
import { CPState, SaveStatus, CPItem } from './types';
import { CP_COLUMNS, getCPColumns, HEIGHTS, calculateGroupSpans, calculateTotalWidth } from './cpConstants';
// ✅ ExcelJS: dynamic import — Export 시점에 로드 (초기 번들 제외)
import { createEmptyItem } from './utils';

// ============ 메인 컴포넌트 ============
function CPWorksheetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();

  const cpNoParam = searchParams.get('cpNo') || '';
  const fmeaIdParam = searchParams.get('fmeaId') || '';
  const syncMode = searchParams.get('sync') === 'true';
  const highlightId = searchParams.get('highlightId') || '';

  // ★ 데이터 로드 훅 (useCPData)
  const {
    state,
    setState,
    loading,
    cpList,
    epDevices,
    setEpDevices,
    syncFromFmea,
  } = useCPData({ cpNoParam, fmeaIdParam, syncMode });

  // ★ Undo/Redo 훅
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

  // Undo/Redo 래퍼 (alert 추가)
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

  // ★ 저장 상태
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [activeTab, setActiveTab] = useState('all');

  // ★ EP검사장치 상태
  const [showEPManager, setShowEPManager] = useState(false);
  const [epSelectModal, setEpSelectModal] = useState<{
    isOpen: boolean;
    rowIdx: number;
    category: 'EP' | '자동검사';
  }>({ isOpen: false, rowIdx: -1, category: 'EP' });
  // selectedEpDevicesByRow 제거됨 → CPItem.epDeviceIds/autoDeviceIds에 직접 저장

  // ★ 부품명 표시 모드: A=숨김(기본), B=표시(DFMEA연동)
  const showPartName = state.partNameMode === 'B';
  const activeColumns = useMemo(() => getCPColumns(showPartName), [showPartName]);

  // 계산된 값
  const groupSpans = useMemo(() => calculateGroupSpans(activeColumns), [activeColumns]);
  const totalWidth = useMemo(() => calculateTotalWidth(activeColumns), [activeColumns]);

  // rowSpan 계산 훅
  const processRowSpan = useProcessRowSpan(state.items);
  const descRowSpan = useDescRowSpan(state.items);
  const partNameRowSpan = usePartNameRowSpan(state.items);
  const workRowSpan = useWorkRowSpan(state.items);
  const charRowSpan = useCharRowSpan(state.items);

  // 컨텍스트 메뉴 훅
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();

  // 컬럼 리사이즈 훅
  const {
    columnWidths,
    resizeState,
    startResize,
    resetColumnWidth,
    getColumnWidth,
  } = useColumnResize();

  // 워크시트 핸들러 훅
  const {
    handleCellChange,
    handleAddRow,
    handleInsertRowAbove,
    handleInsertRowBelow,
    handleDeleteRow,
    handleSave,
  } = useWorksheetHandlers({ state, setState, setSaveStatus, closeContextMenu, saveToHistory });

  // 모달 핸들러 훅
  const {
    autoModal,
    processModal,
    processDescModal,
    equipmentModal,
    standardModal,
    setAutoModal,
    handleAutoModeClick,
    handleEquipmentSave,
    handleStandardModalSave,
    handleProcessSave,
    handleProcessDescSave,
    handleProcessDescContinuousAdd,
    handleProcessContinuousAdd,
    handleEnterKey,
    handleAutoModalInsert,
    closeProcessModal,
    closeProcessDescModal,
    closeEquipmentModal,
    closeStandardModal,
    closeAutoModal,
  } = useModalHandlers({
    items: state.items,
    cpNo: state.cpNo,
    setState,
    handleCellChange,
    handleInsertRowAbove,
    handleInsertRowBelow,
  });

  // ★ 연동 핸들러 훅 (양방향 동기화 지원)
  const {
    syncStatus,
    handleStructureSync,
    handleDataSync,
    handlePfdSync,
    handleFmeaCreate,
    handleFmeaToCp,      // ★ FMEA→CP 역방향 연동
    changeMarkers,       // ★ 변경 마커
    clearChangeMarkers,  // ★ 변경 마커 초기화
  } = useSyncHandlers({
    cpNo: state.cpNo,
    fmeaId: state.fmeaId,
    items: state.items,
    partName: state.partName,
    customer: state.customer,
    setState,
    onSyncFromFmea: syncFromFmea,
    onSave: handleSave,  // ★ 저장 핸들러 전달
  });

  // ★ 비즈니스 액션 훅
  const {
    filterMode,
    setFilterMode,
    filteredItems,
    ccCount,
    scCount,
    handleConfirm,
    handleApprove,
    handleExcelImport,
    isImporting,
    excelFileInputRef,
  } = useCPActions({ state, setState, handleSave, setSaveStatus });

  // EP/자동검사 체크박스 클릭 핸들러
  const handleEPDeviceClick = useCallback((rowIdx: number, category: 'EP' | '자동검사') => {
    setEpSelectModal({ isOpen: true, rowIdx, category });
  }, []);

  // EP검사장치 선택 변경 핸들러 → CPItem에 직접 저장 (DB 영속화)
  const handleEPDeviceSelectionChange = useCallback((deviceIds: string[]) => {
    if (epSelectModal.rowIdx < 0 || epSelectModal.rowIdx >= state.items.length) return;
    const item = state.items[epSelectModal.rowIdx];
    const idsFieldKey = epSelectModal.category === 'EP' ? 'epDeviceIds' : 'autoDeviceIds';
    handleCellChange(item.id, idsFieldKey, deviceIds.join(','));
  }, [epSelectModal, state.items, handleCellChange]);

  // EP/자동검사 체크박스 값 변경 핸들러
  const handleEPCheckboxChange = useCallback((checked: boolean) => {
    if (epSelectModal.rowIdx < 0 || epSelectModal.rowIdx >= state.items.length) return;
    const item = state.items[epSelectModal.rowIdx];
    const boolFieldKey = epSelectModal.category === 'EP' ? 'detectorEp' : 'detectorAuto';
    handleCellChange(item.id, boolFieldKey, checked);
    // 체크 해제 시 device IDs도 클리어
    if (!checked) {
      const idsFieldKey = epSelectModal.category === 'EP' ? 'epDeviceIds' : 'autoDeviceIds';
      handleCellChange(item.id, idsFieldKey, '');
    }
  }, [epSelectModal, state.items, handleCellChange]);

  // 빈 행 추가 핸들러 (CPTableBody용)
  const handleAddEmptyRow = useCallback((newItem: CPItem) => {
    setState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      dirty: true,
    }));
  }, [setState]);

  // ★ 자동 저장 (Dirty 상태일 때 500ms 후 저장) - 데이터 손실 방지
  useEffect(() => {
    if (state.dirty && saveStatus !== 'saving' && state.items.length > 0) {
      const timer = setTimeout(() => {
        handleSave();
      }, 500);  // ★★★ 3000 → 500으로 단축 ★★★
      return () => clearTimeout(timer);
    }
  }, [state.dirty, state.items.length, handleSave, saveStatus]);

  // ★ 페이지 이탈 시 저장 (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.dirty && state.items.length > 0) {
        // 저장 시도
        handleSave();
        // 브라우저 경고 표시
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.dirty, state.items.length, handleSave]);

  // ★ CP↔PFMEA 크로스링크: highlightId로 해당 행 스크롤/하이라이트
  useEffect(() => {
    if (!highlightId || loading || state.items.length === 0) return;
    const idx = state.items.findIndex(item =>
      item.productCharId === highlightId || item.processCharId === highlightId ||
      item.pfmeaProcessId === highlightId || item.pfmeaWorkElemId === highlightId ||
      item.id === highlightId
    );
    if (idx < 0) return;
    setTimeout(() => {
      const row = document.querySelector(`tbody tr:nth-child(${idx + 1})`) as HTMLElement;
      if (!row) return;
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.style.outline = '3px solid #ea580c';
      row.style.outlineOffset = '-1px';
      setTimeout(() => { row.style.outline = ''; row.style.outlineOffset = ''; }, 4000);
    }, 300);
  }, [highlightId, loading, state.items]);

  // ============ 렌더링 ============
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex">
        <SidebarRouter />
        <div className="flex-1 ml-[53px]">
          <div className="h-8 bg-gradient-to-r from-[#1a237e] to-[#283593]" />
          <div className="h-12 bg-white border-b flex items-center px-4 gap-4">
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse" />
            <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="p-4 flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-xs text-gray-500">{t('CP 데이터 로딩 중...')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 숨겨진 Excel 파일 입력 */}
      <input
        type="file"
        ref={excelFileInputRef}
        accept=".xlsx,.xls"
        onChange={handleExcelImport}
        style={{ display: 'none' }}
      />

      {/* Import 중 오버레이 */}
      {isImporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-gray-700">{t('Excel 파일 처리 중...')}</p>
          </div>
        </div>
      )}

      <CPTopNav selectedCpId={state.cpNo} />
      <SidebarRouter />

      <div style={{ marginLeft: 53 }}>
      <CPTopMenuBar
        cpList={cpList}
        selectedCpId={state.cpNo}
        fmeaId={state.fmeaId}
        linkedPfdNo={state.linkedPfdNo || null}
        dirty={state.dirty}
        isSaving={saveStatus === 'saving'}
        itemCount={state.items.length}
        syncStatus={syncStatus}
        onCpChange={(id) => {
          if (id === '__NEW__') {
            setState(prev => ({ ...prev, cpNo: '', items: [], dirty: false }));
            router.push('/control-plan/worksheet');
          } else {
            setState(prev => ({ ...prev, cpNo: id, dirty: false }));
            router.push(`/control-plan/worksheet?cpNo=${id}`);
          }
        }}
        onSave={handleSave}
        onStructureSync={handleStructureSync}
        onDataSync={handleDataSync}
        onPfdSync={handlePfdSync}
        onFmeaCreate={handleFmeaCreate}
        onFmeaToCp={handleFmeaToCp}           // ★ 역방향 연동
        hasChangeMarkers={Object.keys(changeMarkers).length > 0}  // ★ 변경 마커 여부
        onClearMarkers={clearChangeMarkers}   // ★ 변경 마커 초기화
        onExport={async () => { const { exportCPExcel } = await import('./excel-export'); exportCPExcel(state); }}
        onImportClick={() => excelFileInputRef.current?.click()}
        onAddRow={handleAddRow}
        onEPDeviceManager={() => setShowEPManager(true)}
      />


      <CPTabMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cpNo={state.cpNo}
        fmeaId={state.fmeaId}
        itemCount={filteredItems.length}
        ccCount={ccCount}
        scCount={scCount}
        dirty={state.dirty}
        status={(state as any).status}
        filterMode={filterMode}
        onFilterChange={setFilterMode}
        onConfirm={handleConfirm}
        onApprove={handleApprove}
      />

      {/* 메인 레이아웃 */}
      {resizeState.isResizing && (
        <style>{`* { cursor: col-resize !important; user-select: none !important; }`}</style>
      )}

      <div className="fixed top-[104px] left-[53px] right-0 bottom-0 flex flex-row">
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div
            id="cp-worksheet-scroll-container"
            className="bg-white border-t border-gray-300 flex-1"
            style={{
              flex: 1,
              overflowX: 'scroll',
              overflowY: 'auto',
              background: '#fff',
              position: 'relative',
            }}
          >
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', minWidth: '100%', tableLayout: 'fixed' }}>
              <CPTableHeader
                columns={activeColumns}
                columnWidths={columnWidths}
                getColumnWidth={getColumnWidth}
                startResize={startResize}
                resetColumnWidth={resetColumnWidth}
              />
              <CPTableBody
                columns={activeColumns}
                items={state.items}
                cpNo={state.cpNo}
                processRowSpan={processRowSpan}
                descRowSpan={descRowSpan}
                partNameRowSpan={partNameRowSpan}
                workRowSpan={workRowSpan}
                charRowSpan={charRowSpan}
                columnWidths={columnWidths}
                getColumnWidth={getColumnWidth}
                onCellChange={handleCellChange}
                onContextMenu={openContextMenu}
                onAutoModeClick={handleAutoModeClick}
                onEnterKey={handleEnterKey}
                onEPDeviceClick={handleEPDeviceClick}
                onAddEmptyRow={handleAddEmptyRow}
                setState={setState}
                fmeaId={state.fmeaId}
              />
            </table>
          </div>
        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      <CPContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onInsertAbove={handleInsertRowAbove}
        onInsertBelow={handleInsertRowBelow}
        onDelete={handleDeleteRow}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onMergeUp={handleMergeUp}
        onMergeDown={handleMergeDown}
        onUnmerge={handleUnmerge}
        undoCount={undoCount}
        redoCount={redoCount}
      />

      {/* 모달들 */}
      <AutoInputModal
        modal={autoModal}
        onClose={closeAutoModal}
        onPositionChange={(pos) => setAutoModal(prev => ({ ...prev, position: pos }))}
        onInsert={handleAutoModalInsert}
      />

      <ProcessFlowInputModal
        isOpen={processModal.visible}
        onClose={closeProcessModal}
        onSave={handleProcessSave}
        onDelete={(processIds) => {
          setState(prev => {
            const processNamesToDelete = new Set(
              prev.items
                .filter((item: any) => processIds.some(id =>
                  id.includes(item.processName) || item.processName === id
                ))
                .map((item: any) => item.processName)
            );
            const newItems = prev.items.filter((item: any) =>
              !processNamesToDelete.has(item.processName)
            );
            newItems.forEach((item: any, idx: number) => item.sortOrder = idx);
            return { ...prev, items: newItems, dirty: true };
          });
        }}
        onContinuousAdd={handleProcessContinuousAdd}
        existingProcessNames={state.items
          .filter(item => item.processName && !item.processName.startsWith('_'))
          .map(item => item.processName)}
        isEmptyRow={processModal.isEmptyRow}
        cpNo={state.cpNo}
      />

      <ProcessDescInputModal
        isOpen={processDescModal.visible}
        onClose={closeProcessDescModal}
        onSave={handleProcessDescSave}
        onDelete={(descIds) => {
          setState(prev => {
            const descsToDelete = new Set(
              prev.items
                .filter((item: any) => descIds.some(id =>
                  id.includes(item.processDesc) || item.processDesc === id
                ))
                .map((item: any) => item.processDesc)
            );
            const newItems = prev.items.filter((item: any) =>
              !descsToDelete.has(item.processDesc)
            );
            newItems.forEach((item: any, idx: number) => item.sortOrder = idx);
            return { ...prev, items: newItems, dirty: true };
          });
        }}
        onContinuousAdd={handleProcessDescContinuousAdd}
        processNo={processDescModal.processNo}
        processName={processDescModal.processName}
        existingDesc={processDescModal.rowIdx >= 0 && processDescModal.rowIdx < state.items.length
          ? state.items[processDescModal.rowIdx].processDesc
          : ''}
        currentRowIdx={processDescModal.rowIdx}
      />

      <EquipmentInputModal
        isOpen={equipmentModal.visible}
        onClose={closeEquipmentModal}
        onSave={handleEquipmentSave}
        processNo={equipmentModal.processNo}
        processName={equipmentModal.processName}
        existingEquip={equipmentModal.rowIdx >= 0 && equipmentModal.rowIdx < state.items.length
          ? state.items[equipmentModal.rowIdx].workElement
          : ''}
      />

      <StandardInputModal
        isOpen={standardModal.visible}
        onClose={closeStandardModal}
        onSave={handleStandardModalSave}
        columnKey={standardModal.columnKey}
        columnName={standardModal.columnName}
        processNo={standardModal.processNo}
        processName={standardModal.processName}
        existingValue={standardModal.rowIdx >= 0 && standardModal.rowIdx < state.items.length
          ? (state.items[standardModal.rowIdx] as any)[standardModal.columnKey] || ''
          : ''}
      />

      <EPDeviceManager
        isOpen={showEPManager}
        onClose={() => setShowEPManager(false)}
        devices={epDevices}
        setDevices={setEpDevices}
        cpNo={state.cpNo}
        fmeaId={state.fmeaId}
      />

      {epSelectModal.rowIdx >= 0 && epSelectModal.rowIdx < state.items.length && (
        <EPDeviceSelectModal
          isOpen={epSelectModal.isOpen}
          onClose={() => setEpSelectModal(prev => ({ ...prev, isOpen: false }))}
          processNo={state.items[epSelectModal.rowIdx]?.processNo || ''}
          processName={state.items[epSelectModal.rowIdx]?.processName || ''}
          category={epSelectModal.category}
          allDevices={epDevices}
          selectedDeviceIds={(() => {
            const item = state.items[epSelectModal.rowIdx];
            if (!item) return [];
            const idsField = epSelectModal.category === 'EP' ? item.epDeviceIds : item.autoDeviceIds;
            return idsField ? idsField.split(',').filter(Boolean) : [];
          })()}
          onSelectionChange={handleEPDeviceSelectionChange}
          onCheckboxChange={handleEPCheckboxChange}
        />
      )}
      </div>
    </>
  );
}

// Suspense wrapper
export default function ControlPlanWorksheetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">Loading...</div>}>
      <CPWorksheetContent />
    </Suspense>
  );
}
