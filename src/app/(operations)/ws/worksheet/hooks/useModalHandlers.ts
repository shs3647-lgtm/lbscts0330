/**
 * @file hooks/useModalHandlers.ts
 * @description PFD 워크시트 모달 상태 및 핸들러 훅 (CP 수평전개)
 * @line-count ~280줄
 */

import { useState, useCallback } from 'react';
import { PfdItem, ContextMenuType } from '../types';
import { createEmptyItem } from '../utils';
import { PFD_COLUMNS } from '../pfdConstants';

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
  items: PfdItem[];
  pfdNo: string;
  setState: React.Dispatch<React.SetStateAction<any>>;
  handleCellChange: (itemId: string, key: string, value: any) => void;
  handleInsertRowAbove: (rowIdx: number, type: ContextMenuType) => void;
  handleInsertRowBelow: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
}

// ============ 메인 훅 ============
export function useModalHandlers({
  items,
  pfdNo,
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

  // ============ 모든 모달 닫기 ============
  const closeAllModals = useCallback(() => {
    setProcessModal({ visible: false, rowIdx: -1, isEmptyRow: false });
    setProcessDescModal({ visible: false, rowIdx: -1, processNo: '', processName: '' });
    setEquipmentModal({ visible: false, rowIdx: -1, processNo: '', processName: '' });
    setStandardModal({ visible: false, rowIdx: -1, columnKey: '', columnName: '', processNo: '', processName: '' });
    setAutoModal(prev => ({ ...prev, visible: false }));
  }, []);

  // ============ 셀 클릭 핸들러 (통합 모드) ============
  const handleAutoModeClick = useCallback((rowIdx: number, type: ContextMenuType, colKey?: string) => {
    // ★ 2026-01-24: 새 모달 열기 전에 기존 모달 모두 닫기
    closeAllModals();

    const item = items[rowIdx];

    // ★ 2026-01-24: colKey로 명시적 분기 (type보다 colKey 우선)
    // 설비/금형/JIG 셀 클릭 (colKey='workElement' 또는 type='work')
    if (colKey === 'workElement' || type === 'work') {
      if (item && item.processNo && item.processName) {
        setEquipmentModal({
          visible: true,
          rowIdx,
          processNo: item.processNo,
          processName: item.processName,
        });
      } else {
        alert('공정번호와 공정명을 먼저 입력해주세요.');
      }
      return; // ★ 명시적 return으로 다른 모달 열리지 않도록
    }

    // 공정명 셀 클릭 시 ProcessFlowInputModal 열기
    if (type === 'process' && colKey === 'processName') {
      const isEmptyRow = !item?.processName || item.processName.startsWith('_');
      setProcessModal({ visible: true, rowIdx, isEmptyRow });
      return;
    }

    // 공정설명 셀 클릭 시 ProcessDescInputModal 열기
    if (type === 'process' && colKey === 'processDesc') {
      if (item && item.processNo && item.processName) {
        setProcessDescModal({
          visible: true,
          rowIdx,
          processNo: item.processNo,
          processName: item.processName,
        });
      } else {
        alert('공정번호와 공정명을 먼저 입력해주세요.');
      }
      return;
    }

    // 제품특성, 공정특성 등 텍스트 컬럼 (char 또는 general)
    if (type === 'char' || type === 'general') {
      const skipColumns = ['processLevel', 'specialChar', 'sampleFreq', 'owner1', 'owner2', 'detectorEp', 'detectorAuto', 'charNo', 'rowNo', 'workElement'];
      if (colKey && !skipColumns.includes(colKey)) {
        const colDef = PFD_COLUMNS.find(c => c.key === colKey);
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
      return;
    }

    // 기타
    setAutoModal({ visible: true, rowIdx, type, position: 'below' });
  }, [items, closeAllModals]);

  // ============ 설비 모달 핸들러 (다중 선택 지원) ============
  const handleEquipmentSave = useCallback((selectedEquips: any | any[]) => {
    const targetRowIdx = equipmentModal.rowIdx;
    if (targetRowIdx < 0 || targetRowIdx >= items.length) return;

    // 단일 선택인 경우 기존 로직
    if (!Array.isArray(selectedEquips)) {
      const itemId = items[targetRowIdx].id;
      handleCellChange(itemId, 'workElement', selectedEquips.name);
      setEquipmentModal(prev => ({ ...prev, visible: false }));
      return;
    }

    // 다중 선택인 경우 (배열)
    if (selectedEquips.length > 0) {
      setState((prev: any) => {
        const newItems = [...prev.items];
        const currentItem = newItems[targetRowIdx];

        if (!currentItem) return prev;

        // ★ 첫 번째 설비: 현재 행 업데이트
        newItems[targetRowIdx] = {
          ...currentItem,
          workElement: selectedEquips[0].name,
        };

        // ★ 나머지 설비: 새 행 추가 (상위 컬럼 복사 → rowSpan 병합됨)
        const newRows: any[] = [];
        for (let i = 1; i < selectedEquips.length; i++) {
          const newItem = createEmptyItem(prev.pfdNo || '', currentItem.processNo || '', currentItem.processName || '');
          // 상위 컬럼 복사 (rowSpan 병합을 위해)
          newItem.processLevel = currentItem.processLevel || '';
          newItem.processDesc = currentItem.processDesc || '';
          // 설비 새 값 설정
          newItem.workElement = selectedEquips[i].name;
          newRows.push(newItem);
        }

        // ★ 현재 행 바로 아래에 삽입
        if (newRows.length > 0) {
          newItems.splice(targetRowIdx + 1, 0, ...newRows);
        }

        // sortOrder 재정렬
        newItems.forEach((item, idx) => item.sortOrder = idx);

        return { ...prev, items: newItems, dirty: true };
      });

      setEquipmentModal(prev => ({ ...prev, visible: false }));
    }
  }, [equipmentModal.rowIdx, items, handleCellChange, setState]);

  // ============ 범용 입력 모달 핸들러 (다중 선택 지원) ============
  const handleStandardModalSave = useCallback((values: string | string[]) => {
    const targetRowIdx = standardModal.rowIdx;
    const colKey = standardModal.columnKey;
    if (targetRowIdx < 0 || targetRowIdx >= items.length || !colKey) return;

    // 단일 값인 경우 기존 로직
    if (typeof values === 'string') {
      const itemId = items[targetRowIdx].id;
      handleCellChange(itemId, colKey, values);
      setStandardModal(prev => ({ ...prev, visible: false }));
      return;
    }

    // 다중 값인 경우 (배열)
    if (Array.isArray(values) && values.length > 0) {
      setState((prev: any) => {
        const newItems = [...prev.items];
        const currentItem = newItems[targetRowIdx];

        if (!currentItem) return prev;

        // ★ 첫 번째 값: 현재 행 업데이트
        newItems[targetRowIdx] = {
          ...currentItem,
          [colKey]: values[0],
        };

        // ★ 나머지 값: 새 행 추가 (상위 컬럼 모두 복사 → rowSpan 병합됨)
        const newRows: any[] = [];
        for (let i = 1; i < values.length; i++) {
          const newItem = createEmptyItem(prev.pfdNo || '', currentItem.processNo || '', currentItem.processName || '');
          // 상위 컬럼 복사 (rowSpan 병합을 위해)
          newItem.processLevel = currentItem.processLevel || '';
          newItem.processDesc = currentItem.processDesc || '';
          newItem.workElement = currentItem.workElement || '';  // 설비금형
          
          
          
          // 현재 컬럼과 상위 특성 컬럼 복사
          if (colKey === 'processChar') {
            // 공정특성 추가 시: 제품특성 복사
            newItem.productChar = currentItem.productChar || '';
          }
          // 해당 컬럼에 새 값 설정
          (newItem as any)[colKey] = values[i];
          newRows.push(newItem);
        }

        // ★ 현재 행 바로 아래에 삽입
        if (newRows.length > 0) {
          newItems.splice(targetRowIdx + 1, 0, ...newRows);
        }

        // sortOrder 재정렬
        newItems.forEach((item, idx) => item.sortOrder = idx);

        return { ...prev, items: newItems, dirty: true };
      });

      setStandardModal(prev => ({ ...prev, visible: false }));
    }
  }, [standardModal.rowIdx, standardModal.columnKey, items, handleCellChange, setState]);

  // ============ 공정명 모달 핸들러 (A, B열만 입력) ============
  const handleProcessSave = useCallback((selectedProcesses: any[]) => {
    if (selectedProcesses.length === 0) return;

    const targetRowIdx = processModal.rowIdx;

    // ★ 공정번호 숫자 오름차순 정렬 (10, 20, 30, 100, 110 순서)
    const sortedProcesses = [...selectedProcesses].sort((a, b) => {
      const numA = parseInt(String(a.no).replace(/\D/g, '')) || 0;
      const numB = parseInt(String(b.no).replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    setState((prev: any) => {
      const newItems = [...prev.items];

      sortedProcesses.forEach((process, idx) => {
        // A열(공정번호), B열(공정명)만 사용
        const processNo = process.no;
        const processName = process.name;

        if (idx === 0 && targetRowIdx >= 0 && targetRowIdx < newItems.length) {
          // ★ 첫 번째 공정: 현재 행의 A, B열만 업데이트
          newItems[targetRowIdx] = {
            ...newItems[targetRowIdx],
            processNo,
            processName,
          };
        } else {
          // ★ 나머지 공정: 새 행 추가 (A, B열만)
          const newItem = createEmptyItem(prev.pfdNo || '', processNo, processName);
          newItems.push(newItem);
        }
      });

      newItems.forEach((item, idx) => item.sortOrder = idx);

      return { ...prev, items: newItems, dirty: true };
    });

    setProcessModal({ visible: false, rowIdx: -1, isEmptyRow: false });
  }, [processModal.rowIdx, setState]);

  // ============ 공정설명 모달 핸들러 (다중 선택 지원 - 셀 병합 로직) ============
  const handleProcessDescSave = useCallback((selectedDescs: any[]) => {
    if (selectedDescs.length === 0) return;

    const targetRowIdx = processDescModal.rowIdx;

    setState((prev: any) => {
      const newItems = [...prev.items];
      const currentItem = newItems[targetRowIdx];

      if (!currentItem) return prev;

      // ★ 첫 번째 공정설명: 현재 행의 D열(공정설명)만 업데이트
      newItems[targetRowIdx] = {
        ...currentItem,
        processDesc: selectedDescs[0].name,
      };

      // ★ 나머지 공정설명: 현재 행 바로 아래에 삽입 (병합을 위해)
      // A, B열(공정번호, 공정명)은 동일하게 유지 → rowSpan 병합됨
      // C열(레벨)은 현재 행 값 복사
      // D열(공정설명)만 새 값
      const newRows: any[] = [];
      for (let i = 1; i < selectedDescs.length; i++) {
        const newItem = createEmptyItem(prev.pfdNo || '', currentItem.processNo || '', currentItem.processName || '');
        newItem.processLevel = currentItem.processLevel || '';
        newItem.processDesc = selectedDescs[i].name;
        newRows.push(newItem);
      }

      // ★ 현재 행 바로 아래에 삽입 (splice 사용)
      if (newRows.length > 0) {
        newItems.splice(targetRowIdx + 1, 0, ...newRows);
      }

      // sortOrder 재정렬
      newItems.forEach((item, idx) => item.sortOrder = idx);

      return { ...prev, items: newItems, dirty: true };
    });

    setProcessDescModal({ visible: false, rowIdx: -1, processNo: '', processName: '' });
  }, [processDescModal.rowIdx, setState]);

  // ============ 공정설명 연속 입력 핸들러 (기초정보 업데이트만, 행 추가 안함) ============
  const handleProcessDescContinuousAdd = useCallback((desc: any, addNewRow: boolean) => {
    const targetRowIdx = processDescModal.rowIdx;
    const currentProcessNo = processDescModal.processNo;

    if (targetRowIdx >= 0 && targetRowIdx < items.length) {
      // ★ 현재 행 + 같은 공정번호를 가진 모든 행의 공정설명 업데이트 (대체)
      setState((prev: any) => ({
        ...prev,
        items: prev.items.map((item: PfdItem, idx: number) => {
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
          items: prev.items.map((item: PfdItem, idx: number) => {
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
    closeAllModals,

    // 닫기 핸들러
    closeProcessModal,
    closeProcessDescModal,
    closeEquipmentModal,
    closeStandardModal,
    closeAutoModal,
  };
}
