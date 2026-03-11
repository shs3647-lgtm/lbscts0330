// CODEFREEZE
/**
 * @file page.tsx
 * @description PFD 워크시트 메인 페이지 (모듈화 완료)
 * @version 2.0.0 - 2026-02-01 모듈화 리팩토링
 * @line-count ~400줄
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

// 레이아웃 컴포넌트
import PFDTopNav from '@/components/layout/PFDTopNav';
import { SidebarRouter } from '@/components/layout/SidebarRouter';

// PFD 워크시트 컴포넌트
import PfdTopMenuBar from './components/PfdTopMenuBar';
import { PfdTabMenu } from './components/PfdTabMenu';
import { PfdContextMenu } from './components/PfdContextMenu';
import { AutoInputModal } from './components/AutoInputModal';
import { PfdTableHeader } from './components/PfdTableHeader';
import { PfdTableBody } from './components/PfdTableBody';
import PfdEquipmentModal from './components/PfdEquipmentModal';
import PfdPartsModal from './components/PfdPartsModal';

// 훅
import {
  useProcessRowSpan, useDescRowSpan, useWorkRowSpan, useEquipmentRowSpan, useCharRowSpan,
  useContextMenu, useWorksheetHandlers, useColumnResize,
  useUndoRedo, usePfdData, usePfdActions, usePfdSyncHandlers,  // ★ 추가
} from './hooks';


// 타입 및 상수
import { PfdState, SaveStatus, PfdItem, AutoModalState } from './types';
import { PFD_COLUMNS, getPFDColumns, HEIGHTS, calculateGroupSpans, calculateTotalWidth } from './pfdConstants';
import { saveChangeMarkers, getChangeHistory, formatChangeHistory } from '@/lib/change-history';
import { createEmptyItem } from './utils';

// ============ 메인 컴포넌트 ============
function PfdWorksheetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pfdNoParam = searchParams.get('pfdNo') || '';
  const fmeaIdParam = searchParams.get('fmeaId') || '';
  const cpNoParam = searchParams.get('cpNo') || '';
  const syncMode = searchParams.get('sync') === 'true';

  // ★ 데이터 로드 훅
  const {
    state,
    setState,
    loading,
    pfdList,
    changeMarkers,
    setChangeMarkers,
  } = usePfdData({ pfdNoParam, fmeaIdParam, cpNoParam, syncMode });

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

  // Undo/Redo 래퍼
  const handleUndo = useCallback(() => {
    const result = undoAction();
    if (result === null) {
      alert('취소할 작업이 없습니다.');
    } else {
      setState(prev => ({ ...prev, items: result, dirty: true }));
    }
  }, [undoAction, setState]);

  const handleRedo = useCallback(() => {
    const result = redoAction();
    if (result === null) {
      alert('다시 실행할 작업이 없습니다.');
    } else {
      setState(prev => ({ ...prev, items: result, dirty: true }));
    }
  }, [redoAction, setState]);

  // ★ 저장 상태
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // ★ 모달 상태 (설비/부품)
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);

  // ★ 입력 모드 및 확장병합 설정
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

  // 변경 이력 모달
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Floating window hook
  const { pos: histPos, size: histSize, onDragStart: histDragStart, onResizeStart: histResizeStart } = useFloatingWindow({ isOpen: showHistoryModal, width: 600, height: 500 });

  // ★ 부품명 표시 모드: A=숨김(기본), B=표시(DFMEA연동)
  const showPartName = state.partNameMode === 'B';
  const activeColumns = useMemo(() => getPFDColumns(showPartName), [showPartName]);

  // 계산된 값
  const groupSpans = useMemo(() => calculateGroupSpans(activeColumns), [activeColumns]);
  const totalWidth = useMemo(() => calculateTotalWidth(activeColumns), [activeColumns]);

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

  // ★ 비즈니스 액션 훅
  const {
    filteredItems,
    productScCount,
    processScCount,
    handleConfirm,
    handleApprove,
    handleExport,
    handleImport,
    handleSyncCP,
    handleSyncFMEA,
    activeTab,
    setActiveTab,
  } = usePfdActions({ state, setState, handleSave, setSaveStatus, saveToHistory });

  // ★ 연동 핸들러 훅 (양방향 동기화)
  const {
    syncStatus,
    handleCpToPfd,
    handleFmeaToPfd,
    clearChangeMarkers: syncClearMarkers,
  } = usePfdSyncHandlers({
    pfdNo: state.pfdNo,
    fmeaId: state.fmeaId || '',
    cpNo: state.cpNo || '',
    items: state.items,
    partName: '',
    customer: '',
    setState,
    onSave: handleSave,
  });

  // rowSpan 계산 훅 (필터링된 아이템 기준)
  const processRowSpan = useProcessRowSpan(filteredItems);
  const descRowSpan = useDescRowSpan(filteredItems);
  const workRowSpan = useWorkRowSpan(filteredItems);
  const equipmentRowSpan = useEquipmentRowSpan(filteredItems);
  const charRowSpan = useCharRowSpan(filteredItems);


  // ★ 자동 입력 모달 상태
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
  const handleAddEmptyRow = useCallback((newItem: PfdItem) => {
    setState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      dirty: true,
    }));
  }, [setState]);

  // ============ 렌더링 ============
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      <PFDTopNav pfdNo={state.pfdNo} rowCount={state.items.length} linkedFmeaId={state.fmeaId} linkedCpNo={state.cpNo} />
      <SidebarRouter />

      <div style={{ marginLeft: 53 }}>
      <PfdTopMenuBar
        pfdList={pfdList}
        selectedPfdId={state.pfdNo}
        fmeaId={state.fmeaId}
        cpNo={state.cpNo}
        dirty={state.dirty}
        isSaving={saveStatus === 'saving'}
        itemCount={state.items.length}
        syncStatus={syncStatus}  // ★ 동기화 상태
        onPfdChange={(id) => {
          if (id === '__NEW__') {
            setState(prev => ({ ...prev, pfdNo: '', items: [], dirty: false }));
            router.push('/pfd/worksheet');
          } else {
            setState(prev => ({ ...prev, pfdNo: id, dirty: false }));
            router.push(`/pfd/worksheet?pfdNo=${id}`);
          }
        }}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
        onAddRow={handleAddRow}
        onSyncCP={handleSyncCP}
        onSyncFMEA={handleSyncFMEA}
        onCpToPfd={handleCpToPfd}      // ★ 역방향 연동: CP → PFD
        onFmeaToPfd={handleFmeaToPfd}  // ★ 역방향 연동: FMEA → PFD
        hasChangeMarkers={Object.keys(changeMarkers).length > 0}
        onShowHistory={() => setShowHistoryModal(true)}
        onManageEquipment={() => setShowEquipmentModal(true)}
        onManageParts={() => setShowPartsModal(true)}
        onClearMarkers={() => {
          if (confirm('변경 표시를 모두 초기화하시겠습니까?\n(변경 이력은 유지됩니다)')) {
            setChangeMarkers({});
            if (state.pfdNo) {
              saveChangeMarkers('pfd', state.pfdNo, {});
            }
          }
        }}
      />


      <PfdTabMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        itemCount={state.items.length}
        productScCount={productScCount}
        processScCount={processScCount}
        dirty={state.dirty}
        status={(state as any).status}
        onConfirm={handleConfirm}
        onApprove={handleApprove}
        inputMode={inputMode}
        onInputModeChange={setInputMode}
        extensionMerge={extensionMerge}
        onExtensionMergeToggle={toggleExtensionMerge}
      />

      {/* 메인 레이아웃 */}
      <div className="fixed top-[104px] left-[53px] right-0 bottom-0 flex flex-row overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          <div
            id="pfd-worksheet-scroll-container"
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
              <PfdTableHeader
                columns={activeColumns}
                columnWidths={columnWidths}
                getColumnWidth={getColumnWidth}
                startResize={startResize}
                resetColumnWidth={resetColumnWidth}
                extensionMerge={extensionMerge}
              />
              <PfdTableBody
                columns={activeColumns}
                items={filteredItems}
                pfdNo={state.pfdNo}
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
        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      <PfdContextMenu
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

      {/* 자동 입력 모달 */}
      <AutoInputModal
        modal={autoModal}
        onClose={closeAutoModal}
        onPositionChange={(pos) => setAutoModal(prev => ({ ...prev, position: pos }))}
        onInsert={handleAutoModalInsert}
      />

      {/* 변경 이력 모달 */}
      {showHistoryModal && (
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
          style={{ left: histPos.x, top: histPos.y, width: histSize.w, height: histSize.h }}>
          <div className="flex items-center justify-between px-4 py-3 bg-amber-500 text-white rounded-t-lg cursor-move" onMouseDown={histDragStart}>
            <h3 className="text-sm font-bold">📜 변경 이력</h3>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="text-white hover:text-amber-200 text-lg font-bold"
            >
              ✕
            </button>
          </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {state.pfdNo ? (
                <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded border">
                  {formatChangeHistory(getChangeHistory('pfd', state.pfdNo))}
                </pre>
              ) : (
                <p className="text-gray-500 text-sm">PFD가 저장되지 않았습니다.</p>
              )}

              {Object.keys(changeMarkers).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-amber-600 mb-2">🔶 현재 표시된 변경 ({Object.keys(changeMarkers).length}건)</h4>
                  <div className="text-xs bg-amber-50 p-2 rounded border border-amber-200 max-h-40 overflow-y-auto">
                    {Object.entries(changeMarkers).map(([itemId, fields]) => (
                      <div key={itemId} className="mb-1">
                        <span className="font-semibold">{itemId}:</span>{' '}
                        {Object.keys(fields).join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                닫기
              </button>
            </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={histResizeStart} title="크기 조절">
            <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
              <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}

      {/* 설비/부품 관리 모달 */}
      <PfdEquipmentModal
        isOpen={showEquipmentModal}
        onClose={() => setShowEquipmentModal(false)}
        pfdData={state}
        setPfdData={setState}
      />
      <PfdPartsModal
        isOpen={showPartsModal}
        onClose={() => setShowPartsModal(false)}
        pfdData={state}
        setPfdData={setState}
      />
      </div>
    </>
  );
}

// Suspense wrapper
export default function PfdWorksheetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">로딩 중...</div>}>
      <PfdWorksheetContent />
    </Suspense>
  );
}
