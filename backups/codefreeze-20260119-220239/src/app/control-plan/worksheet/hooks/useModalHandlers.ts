/**
 * @file hooks/useModalHandlers.ts
 * @description CP 워크시트 모달 상태 및 핸들러 훅
 * @line-count ~280줄
 */

import { useState, useCallback } from 'react';
import { CPItem, ContextMenuType } from '../types';
import { createEmptyItem } from '../utils';
import { CP_COLUMNS } from '../cpConstants';

// ============ 타입 정의 ============
export interface ProcessModalState {
  visible: boolean;
  rowIdx: number;
  isEmptyRow: boolean;
}

export interface ProcessDescModalState {
  visible: boolean;
  rowIdx: number;
  processNo: string;
  processName: string;
}

export interface EquipmentModalState {
  visible: boolean;
  rowIdx: number;
  processNo: string;
  processName: string;
}

export interface StandardModalState {
  visible: boolean;
  rowIdx: number;
  columnKey: string;
  columnName: string;
  processNo: string;
  processName: string;
}

export interface AutoModalState {
  visible: boolean;
  rowIdx: number;
  type: ContextMenuType;
  position: 'above' | 'below';
}

interface UseModalHandlersProps {
  items: CPItem[];
  cpNo: string;
  setState: React.Dispatch<React.SetStateAction<any>>;
  handleCellChange: (itemId: string, key: string, value: any) => void;
  handleInsertRowAbove: (rowIdx: number, type: ContextMenuType) => void;
  handleInsertRowBelow: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
}

// ============ 메인 훅 ============
export function useModalHandlers({
  items,
  cpNo,
  setState,
  handleCellChange,
  handleInsertRowAbove,
  handleInsertRowBelow,
}: UseModalHandlersProps) {
  
  // ============ 모달 상태 ============
  const [autoModal, setAutoModal] = useState<AutoModalState>({
    visible: false,
    rowIdx: -1,
    type: 'process',
    position: 'below',
  });
  
  const [processModal, setProcessModal] = useState<ProcessModalState>({
    visible: false,
    rowIdx: -1,
    isEmptyRow: false,
  });
  
  const [processDescModal, setProcessDescModal] = useState<ProcessDescModalState>({
    visible: false,
    rowIdx: -1,
    processNo: '',
    processName: '',
  });
  
  const [equipmentModal, setEquipmentModal] = useState<EquipmentModalState>({
    visible: false,
    rowIdx: -1,
    processNo: '',
    processName: '',
  });
  
  const [standardModal, setStandardModal] = useState<StandardModalState>({
    visible: false,
    rowIdx: -1,
    columnKey: '',
    columnName: '',
    processNo: '',
    processName: '',
  });
  
  // ============ 셀 클릭 핸들러 (통합 모드) ============
  const handleAutoModeClick = useCallback((rowIdx: number, type: ContextMenuType, colKey?: string) => {
    console.log('🔥 handleAutoModeClick 호출됨:', { rowIdx, type, colKey });
    
    // 공정명 셀 클릭 시 ProcessFlowInputModal 열기
    if (type === 'process' && colKey === 'processName') {
      const item = items[rowIdx];
      const isEmptyRow = !item?.processName || item.processName.startsWith('_');
      setProcessModal({ visible: true, rowIdx, isEmptyRow });
    } 
    // 공정설명 셀 클릭 시 ProcessDescInputModal 열기
    else if (type === 'process' && colKey === 'processDesc') {
      const item = items[rowIdx];
      if (item && item.processNo && item.processName) {
        setProcessDescModal({ 
          visible: true, 
          rowIdx,
          processNo: item.processNo,
          processName: item.processName,
        });
      }
    } 
    // 설비/금형/JIG 셀 클릭 시 EquipmentInputModal 열기
    else if (type === 'work') {
      const item = items[rowIdx];
      if (item && item.processNo && item.processName) {
        setEquipmentModal({ 
          visible: true, 
          rowIdx,
          processNo: item.processNo,
          processName: item.processName,
        });
      }
    }
    // 제품특성, 공정특성 등 텍스트 컬럼
    else if (type === 'char' || type === 'general') {
      const item = items[rowIdx];
      const skipColumns = ['processLevel', 'specialChar', 'sampleFreq', 'owner1', 'owner2', 'detectorEp', 'detectorAuto', 'charNo', 'rowNo'];
      if (colKey && !skipColumns.includes(colKey)) {
        const colDef = CP_COLUMNS.find(c => c.key === colKey);
        const columnName = colDef?.name || colKey;
        
        setStandardModal({
          visible: true,
          rowIdx,
          columnKey: colKey,
          columnName,
          processNo: item?.processNo || '',
          processName: item?.processName || '',
        });
      } else {
        setAutoModal({ visible: true, rowIdx, type, position: 'below' });
      }
    }
    else {
      setAutoModal({ visible: true, rowIdx, type, position: 'below' });
    }
  }, [items]);
  
  // ============ 설비 모달 핸들러 ============
  const handleEquipmentSave = useCallback((selectedEquip: any) => {
    const targetRowIdx = equipmentModal.rowIdx;
    if (targetRowIdx < 0 || targetRowIdx >= items.length) return;
    
    const itemId = items[targetRowIdx].id;
    handleCellChange(itemId, 'workElement', selectedEquip.name);
    setEquipmentModal(prev => ({ ...prev, visible: false }));
  }, [equipmentModal.rowIdx, items, handleCellChange]);
  
  // ============ 범용 입력 모달 핸들러 ============
  const handleStandardModalSave = useCallback((value: string) => {
    const targetRowIdx = standardModal.rowIdx;
    const colKey = standardModal.columnKey;
    if (targetRowIdx < 0 || targetRowIdx >= items.length || !colKey) return;
    
    const itemId = items[targetRowIdx].id;
    handleCellChange(itemId, colKey, value);
    setStandardModal(prev => ({ ...prev, visible: false }));
  }, [standardModal.rowIdx, standardModal.columnKey, items, handleCellChange]);
  
  // ============ 공정명 모달 핸들러 (기초정보 업데이트 = 대체, 행 추가 안함) ============
  const handleProcessSave = useCallback((selectedProcesses: any[]) => {
    if (selectedProcesses.length === 0) return;

    const targetRowIdx = processModal.rowIdx;

    setState((prev: any) => {
      const newItems = [...prev.items];

      selectedProcesses.forEach((process, idx) => {
        // cpData가 있으면 기본 데이터 사용, 없으면 기본값
        const cpData = process.cpData || {};
        const processNo = cpData.processNo || process.no;
        const processName = cpData.processName || process.name;
        const processDesc = cpData.processDesc || '';
        const workElement = cpData.workElement || '';

        if (idx === 0 && targetRowIdx >= 0 && targetRowIdx < newItems.length) {
          // ★ 첫 번째 공정: 현재 행 업데이트 (공정 기본 정보 A~E열만)
          newItems[targetRowIdx] = {
            ...newItems[targetRowIdx],
            processNo,
            processName,
            processDesc: processDesc || newItems[targetRowIdx].processDesc || '',
            workElement: workElement || newItems[targetRowIdx].workElement || '',
          };

          // ★ 같은 공정번호를 가진 다른 행들도 기초정보 업데이트 (대체)
          newItems.forEach((item, i) => {
            if (i !== targetRowIdx && item.processNo === processNo) {
              newItems[i] = {
                ...item,
                processName,
                processDesc: processDesc || item.processDesc || '',
                workElement: workElement || item.workElement || '',
              };
            }
          });
        } else {
          // ★ 나머지 공정: 기존 행 중 같은 공정번호가 있으면 업데이트 (대체)
          // ★ 새 행 추가는 하지 않음 - FMEA→CP 연동 또는 CP에서 직접 행 추가만 허용
          const existingRows = newItems.filter(item => item.processNo === processNo);

          if (existingRows.length > 0) {
            // 기존 행들의 기초정보만 업데이트
            newItems.forEach((item, i) => {
              if (item.processNo === processNo) {
                newItems[i] = {
                  ...item,
                  processName,
                  processDesc: processDesc || item.processDesc || '',
                  workElement: workElement || item.workElement || '',
                };
              }
            });
          }
          // ★ 기존에 없는 공정은 무시 (행 추가 안함)
          // 새 공정 추가는 FMEA→CP 구조 동기화 또는 "행 추가" 기능에서만 가능
        }
      });

      newItems.forEach((item, idx) => item.sortOrder = idx);

      return { ...prev, items: newItems, dirty: true };
    });

    setProcessModal({ visible: false, rowIdx: -1, isEmptyRow: false });
  }, [processModal.rowIdx, setState]);
  
  // ============ 공정설명 모달 핸들러 ============
  const handleProcessDescSave = useCallback((selectedDesc: any) => {
    const targetRowIdx = processDescModal.rowIdx;
    
    if (targetRowIdx >= 0 && targetRowIdx < items.length) {
      setState((prev: any) => ({
        ...prev,
        items: prev.items.map((item: CPItem, idx: number) => {
          if (idx === targetRowIdx) {
            return { ...item, processDesc: selectedDesc.name };
          }
          return item;
        }),
        dirty: true,
      }));
    }
    
    setProcessDescModal({ visible: false, rowIdx: -1, processNo: '', processName: '' });
  }, [processDescModal.rowIdx, items, setState]);
  
  // ============ 공정설명 연속 입력 핸들러 (기초정보 업데이트만, 행 추가 안함) ============
  const handleProcessDescContinuousAdd = useCallback((desc: any, addNewRow: boolean) => {
    const targetRowIdx = processDescModal.rowIdx;
    const currentProcessNo = processDescModal.processNo;

    if (targetRowIdx >= 0 && targetRowIdx < items.length) {
      // ★ 현재 행 + 같은 공정번호를 가진 모든 행의 공정설명 업데이트 (대체)
      setState((prev: any) => ({
        ...prev,
        items: prev.items.map((item: CPItem, idx: number) => {
          if (idx === targetRowIdx) {
            return { ...item, processDesc: desc.name };
          }
          // 같은 공정번호를 가진 다른 행들도 업데이트
          if (currentProcessNo && item.processNo === currentProcessNo) {
            return { ...item, processDesc: desc.name };
          }
          return item;
        }),
        dirty: true,
      }));

      if (addNewRow) {
        // ★ 새 행 추가 대신 다음 빈 공정설명 행으로 이동하거나 모달 닫기
        const nextEmptyIdx = items.findIndex((item, idx) =>
          idx > targetRowIdx && (!item.processDesc || item.processDesc.trim() === '')
        );

        if (nextEmptyIdx >= 0) {
          // 다음 빈 행으로 이동
          setProcessDescModal({
            visible: true,
            rowIdx: nextEmptyIdx,
            processNo: items[nextEmptyIdx]?.processNo || '',
            processName: items[nextEmptyIdx]?.processName || '',
          });
        } else {
          // 빈 행이 없으면 모달 닫기
          setProcessDescModal({ visible: false, rowIdx: -1, processNo: '', processName: '' });
        }
      }
    }
  }, [processDescModal, items, setState]);
  
  // ============ 공정명 연속 입력 핸들러 (기초정보 업데이트만, 행 추가 안함) ============
  const handleProcessContinuousAdd = useCallback((process: any, addNewRow: boolean) => {
    const targetRowIdx = processModal.rowIdx;

    if (targetRowIdx >= 0 && targetRowIdx < items.length) {
      // ★ 현재 행 + 같은 공정번호를 가진 모든 행 업데이트 (기초정보 대체)
      setState((prev: any) => {
        const currentProcessNo = prev.items[targetRowIdx]?.processNo;
        return {
          ...prev,
          items: prev.items.map((item: CPItem, idx: number) => {
            if (idx === targetRowIdx) {
              return { ...item, processNo: process.no, processName: process.name };
            }
            // 같은 공정번호를 가진 다른 행들도 업데이트
            if (currentProcessNo && item.processNo === currentProcessNo) {
              return { ...item, processNo: process.no, processName: process.name };
            }
            return item;
          }),
          dirty: true,
        };
      });

      if (addNewRow) {
        // ★ 새 행 추가 대신 다음 빈 공정명 행으로 이동하거나 모달 닫기
        const nextEmptyIdx = items.findIndex((item, idx) =>
          idx > targetRowIdx && (!item.processName || item.processName.trim() === '')
        );

        if (nextEmptyIdx >= 0) {
          // 다음 빈 행으로 이동
          setProcessModal({ visible: true, rowIdx: nextEmptyIdx, isEmptyRow: true });
        } else {
          // 빈 행이 없으면 모달 닫기
          setProcessModal({ visible: false, rowIdx: -1, isEmptyRow: false });
        }
      }
    }
  }, [processModal.rowIdx, items, setState]);
  
  // ============ 엔터 키 핸들러 (항상 행 추가) ============
  const handleEnterKey = useCallback((rowIdx: number, type: ContextMenuType, colKey?: string) => {
    handleInsertRowBelow(rowIdx, type, colKey);
  }, [handleInsertRowBelow]);
  
  // ============ 자동 모달 행 추가 핸들러 ============
  const handleAutoModalInsert = useCallback(() => {
    const { rowIdx, type, position } = autoModal;
    if (position === 'above') {
      handleInsertRowAbove(rowIdx, type);
    } else {
      handleInsertRowBelow(rowIdx, type);
    }
    setAutoModal(prev => ({ ...prev, visible: false }));
  }, [autoModal, handleInsertRowAbove, handleInsertRowBelow]);
  
  // ============ 모달 닫기 핸들러 ============
  const closeProcessModal = useCallback(() => {
    setProcessModal({ visible: false, rowIdx: -1, isEmptyRow: false });
  }, []);
  
  const closeProcessDescModal = useCallback(() => {
    setProcessDescModal({ visible: false, rowIdx: -1, processNo: '', processName: '' });
  }, []);
  
  const closeEquipmentModal = useCallback(() => {
    setEquipmentModal({ visible: false, rowIdx: -1, processNo: '', processName: '' });
  }, []);
  
  const closeStandardModal = useCallback(() => {
    setStandardModal({ visible: false, rowIdx: -1, columnKey: '', columnName: '', processNo: '', processName: '' });
  }, []);
  
  const closeAutoModal = useCallback(() => {
    setAutoModal(prev => ({ ...prev, visible: false }));
  }, []);
  
  return {
    // 모달 상태
    autoModal,
    processModal,
    processDescModal,
    equipmentModal,
    standardModal,
    
    // 모달 setter (position 변경 등)
    setAutoModal,
    
    // 핸들러
    handleAutoModeClick,
    handleEquipmentSave,
    handleStandardModalSave,
    handleProcessSave,
    handleProcessDescSave,
    handleProcessDescContinuousAdd,
    handleProcessContinuousAdd,
    handleEnterKey,
    handleAutoModalInsert,
    
    // 닫기 핸들러
    closeProcessModal,
    closeProcessDescModal,
    closeEquipmentModal,
    closeStandardModal,
    closeAutoModal,
  };
}
