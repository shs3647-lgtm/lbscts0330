/**
 * @file StandardInputModal.tsx
 * @description CP 워크시트 범용 입력 모달 - 공정설명 모달과 동일한 형식
 * @updated 2026-01-24
 * 
 * ★ 다중 선택 지원 + 전체/해제/적용 버튼
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDraggableModal } from '@/components/modals/useDraggableModal';

interface InputItem {
  id: string;
  value: string;
  processNo?: string;
  processName?: string;
}

interface StandardInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: string | string[]) => void;  // ★ 다중 선택 지원
  columnKey: string;
  columnName: string;
  processNo?: string;
  processName?: string;
  existingValue?: string;
  existingValues?: string[];  // ★ 다중 기존 값
}

// 컬럼별 아이콘 및 색상 설정
const COLUMN_CONFIG: Record<string, { icon: string; color: string; colorLight: string; bgClass: string }> = {
  productChar: { icon: '📦', color: 'from-amber-600 to-amber-700', colorLight: 'amber', bgClass: 'bg-amber-600' },
  processChar: { icon: '⚙️', color: 'from-yellow-600 to-yellow-700', colorLight: 'yellow', bgClass: 'bg-yellow-600' },
  specTolerance: { icon: '📏', color: 'from-blue-600 to-blue-700', colorLight: 'blue', bgClass: 'bg-blue-600' },
  evalMethod: { icon: '🔍', color: 'from-purple-600 to-purple-700', colorLight: 'purple', bgClass: 'bg-purple-600' },
  sampleSize: { icon: '📊', color: 'from-pink-600 to-pink-700', colorLight: 'pink', bgClass: 'bg-pink-600' },
  controlMethod: { icon: '📋', color: 'from-indigo-600 to-indigo-700', colorLight: 'indigo', bgClass: 'bg-indigo-600' },
  reactionPlan: { icon: '🚨', color: 'from-red-600 to-red-700', colorLight: 'red', bgClass: 'bg-red-600' },
  default: { icon: '✏️', color: 'from-gray-600 to-gray-700', colorLight: 'gray', bgClass: 'bg-gray-600' },
};

// 마스터 데이터에서 해당 컬럼의 값 목록 로드
const loadValuesFromMaster = (columnKey: string, processNo: string): InputItem[] => {
  if (typeof window === 'undefined') return [];

  try {
    const cpMasterData = localStorage.getItem('cp_master_data');
    if (!cpMasterData) return [];

    const flatData = JSON.parse(cpMasterData);
    const valueSet = new Map<string, InputItem>();

    // 컬럼키와 itemCode 매핑
    const KEY_TO_ITEM_CODE: Record<string, string> = {
      productChar: 'B1',
      processChar: 'B2',
      specTolerance: 'B4',
      evalMethod: 'B5',
      sampleSize: 'B6',
      controlMethod: 'B8',
      reactionPlan: 'B10',
    };

    const targetItemCode = KEY_TO_ITEM_CODE[columnKey];
    if (!targetItemCode) return [];

    flatData.forEach((item: any, idx: number) => {
      const isMatch = !processNo || String(item.processNo).trim() === String(processNo).trim();
      const isTarget = item.itemCode === targetItemCode || item.code === targetItemCode;

      if (isMatch && isTarget && item.value && item.value.trim()) {
        const val = item.value.trim();
        if (!valueSet.has(val)) {
          valueSet.set(val, {
            id: `master_${idx}_${Date.now()}_${Math.random()}`,
            value: val,
            processNo: item.processNo,
            processName: item.processName,
          });
        }
      }
    });

    return Array.from(valueSet.values());
  } catch (e) {
    console.error('마스터 데이터 로드 실패:', e);
    return [];
  }
};

export default function StandardInputModal({
  isOpen,
  onClose,
  onSave,
  columnKey,
  columnName,
  processNo = '',
  processName = '',
  existingValue = '',
  existingValues = [],
}: StandardInputModalProps) {
  const [items, setItems] = useState<InputItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState('');

  const config = COLUMN_CONFIG[columnKey] || COLUMN_CONFIG.default;

  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 180, right: 320 }, modalWidth: 380, modalHeight: 400, isOpen });

  // 기존 값 목록 (단일 값도 배열로 처리)
  const existingValueList = useMemo(() => {
    if (existingValues && existingValues.length > 0) return existingValues;
    if (existingValue) return [existingValue];
    return [];
  }, [existingValue, existingValues]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const loadedItems = loadValuesFromMaster(columnKey, processNo);
      setItems(loadedItems);

      if (loadedItems.length > 0) {
        setDataSource(`CP Master (${loadedItems.length}개)`);
      } else {
        setDataSource('없음 - 직접 입력 필요');
      }

      // 기존 값과 일치하는 항목 선택 - 직접 계산
      const currentExisting = existingValues?.length > 0 ? existingValues : (existingValue ? [existingValue] : []);
      const preSelected = new Set<string>();
      loadedItems.forEach(item => {
        if (currentExisting.includes(item.value)) {
          preSelected.add(item.id);
        }
      });
      setSelectedIds(preSelected);
      setInitialSelectedIds(new Set(preSelected));

      setSearch('');
      setNewValue('');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, columnKey, processNo]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.value.toLowerCase().includes(q));
  }, [items, search]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  // ★ 전체 선택
  const selectAll = () => setSelectedIds(new Set(filteredItems.map(i => i.id)));

  // ★ 선택 해제
  const deselectAll = () => setSelectedIds(new Set());

  const handleSave = () => {
    // 새로 선택된 항목만 저장
    const newlySelected = items.filter(i =>
      selectedIds.has(i.id) && !initialSelectedIds.has(i.id)
    );

    if (newlySelected.length === 0 && selectedIds.size > 0) {
      // 기존 선택만 있는 경우 첫 번째 선택 항목 저장
      const selected = items.find(i => selectedIds.has(i.id));
      if (selected) {
        onSave(selected.value);
      }
    } else if (newlySelected.length === 1) {
      // 단일 새 선택
      onSave(newlySelected[0].value);
    } else if (newlySelected.length > 1) {
      // 다중 새 선택 → 배열로 저장 (행 추가)
      onSave(newlySelected.map(i => i.value));
    }
  };

  // 신규 값 추가
  const handleAddNew = () => {
    if (!newValue.trim()) return;
    if (items.some(i => i.value === newValue.trim())) return;

    const newItem: InputItem = {
      id: `new_${Date.now()}`,
      value: newValue.trim(),
      processNo,
      processName,
    };

    setItems(prev => [newItem, ...prev]);
    setSelectedIds(prev => new Set([...prev, newItem.id]));
    setNewValue('');
  };

  // 직접 입력 저장
  const handleDirectSave = () => {
    if (newValue.trim()) {
      const newItem: InputItem = {
        id: `new_direct_${Date.now()}`,
        value: newValue.trim(),
        processNo,
        processName,
      };
      // 목록에 추가 및 선택
      setItems(prev => [newItem, ...prev]);
      setSelectedIds(prev => new Set([...prev, newItem.id]));
      // 워크시트에 즉시 반영
      onSave(newValue.trim());
      // 입력 필드 초기화
      setNewValue('');
    }
  };

  const isCurrentlySelected = (value: string) => existingValueList.includes(value);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40">
      <div
        className="fixed bg-white rounded-lg shadow-2xl w-[380px] flex flex-col overflow-hidden max-h-[calc(100vh-120px)] cursor-move"
        style={{ top: `${modalPosition.top}px`, right: `${modalPosition.right}px` }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 - 드래그 가능 */}
        <div
          className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r ${config.color} text-white cursor-move select-none`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{config.icon}</span>
            <h2 className="text-xs font-bold">{columnName} 선택(Select)</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded">닫기</button>
        </div>

        {/* 공정 정보 */}
        {processNo && (
          <div className="px-3 py-1 border-b bg-gray-50 flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-700">공정:</span>
            <span className="text-[9px] text-gray-600">{processNo}</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold ${config.bgClass} text-white rounded`}>{processName}</span>
          </div>
        )}

        {/* 데이터 소스 */}
        <div className="px-3 py-1 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-green-700">{columnName}</span>
          <span className={`text-[9px] px-2 py-0.5 rounded ${dataSource.includes('Master') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            {loading ? '로딩중...' : `📂 ${dataSource}`}
          </span>
        </div>

        {/* 신규 값 입력 */}
        <div className="px-3 py-1.5 border-b bg-green-50 flex items-center gap-1">
          <span className="text-[10px] font-bold text-green-700 shrink-0">+</span>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDirectSave();
              }
            }}
            placeholder={`${columnName} 직접 입력...`}
            className="flex-1 px-2 py-0.5 text-[10px] border rounded focus:ring-1 focus:ring-green-500 outline-none"
          />
          <button
            onClick={handleDirectSave}
            disabled={!newValue.trim()}
            className="px-2 py-0.5 text-[10px] font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 rounded"
          >
            저장
          </button>
        </div>

        {/* 검색 + 버튼 */}
        <div className="px-2 py-1.5 border-b bg-gray-50">
          <div className="mb-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`🔍 ${columnName} 검색...`}
              className="w-full px-2 py-0.5 text-[9px] border rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          {/* 버튼들 - 전체/해제/적용/삭제 */}
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="px-3 py-1.5 text-[11px] font-bold bg-blue-500 text-white rounded hover:bg-blue-600">전체<span className="text-[8px] opacity-70 ml-0.5">(All)</span></button>
            <button onClick={deselectAll} className="px-3 py-1.5 text-[11px] font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">해제<span className="text-[8px] opacity-70 ml-0.5">(Clr)</span></button>
            <button onClick={handleSave} className="px-3 py-1.5 text-[11px] font-bold bg-green-600 text-white rounded hover:bg-green-700">적용<span className="text-[8px] opacity-70 ml-0.5">(OK)</span></button>
            <button
              onClick={() => {
                // 삭제: 선택된 항목 제거
                setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
                setSelectedIds(new Set());
              }}
              disabled={selectedIds.size === 0}
              className="px-3 py-1.5 text-[11px] font-bold bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              삭제<span className="text-[8px] opacity-70 ml-0.5">(Del)</span>
            </button>
          </div>
        </div>

        {/* 목록 - 2열 그리드 */}
        <div className="overflow-auto p-2 h-80 min-h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">{columnName} 데이터 로딩중...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg mb-2">📭</p>
                <p className="text-xs text-gray-500 mb-2">등록된 {columnName}이 없습니다</p>
                <p className="text-[10px] text-gray-400">위 입력창에서 직접 추가해주세요</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {filteredItems.map(item => {
                const isSelected = selectedIds.has(item.id);
                const isCurrent = isCurrentlySelected(item.value);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-all ${isSelected
                      ? isCurrent
                        ? 'bg-green-50 border-green-400'
                        : 'bg-blue-50 border-blue-400'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                      }`}
                  >
                    {/* 체크박스 */}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected
                      ? isCurrent ? 'bg-green-500 border-green-500' : 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                      }`}>
                      {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
                    </div>

                    {/* 값 */}
                    <span className={`text-xs truncate ${isSelected ? (isCurrent ? 'text-green-800 font-medium' : 'text-blue-800 font-medium') : 'text-gray-700'
                      }`}>
                      {item.value}
                    </span>
                  </div>
                );
              })}
              {/* 빈 행 채우기 */}
              {Array.from({ length: Math.max(0, 12 - filteredItems.length) }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-100 bg-gray-50/50"
                >
                  <div className="w-4 h-4 rounded border border-gray-200 bg-white shrink-0" />
                  <span className="flex-1 text-xs text-gray-300">-</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-500">전체 {selectedIds.size}개</span>
          <span className="text-xs font-bold text-blue-600">✓ 신규 {Array.from(selectedIds).filter(id => !initialSelectedIds.has(id)).length}개 추가</span>
        </div>
      </div>
    </div>
  );
}
