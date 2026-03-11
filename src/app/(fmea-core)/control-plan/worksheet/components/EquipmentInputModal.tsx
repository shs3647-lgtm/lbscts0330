/**
 * @file EquipmentInputModal.tsx
 * @description CP 설비/금형/JIG 입력 모달 - 공정설명 모달과 동일한 형식
 * @updated 2026-01-24
 * 
 * ★ 다중 선택 지원 + 전체/해제/적용 버튼
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDraggableModal } from '@/components/modals/useDraggableModal';

interface EquipmentItem {
  id: string;
  name: string;
  processNo: string;
  processName: string;
}

interface EquipmentInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedEquips: EquipmentItem | EquipmentItem[]) => void;  // ★ 다중 선택 지원
  processNo?: string;
  processName?: string;
  existingEquip?: string;
  existingEquips?: string[];  // ★ 다중 기존 설비
  onContinuousAdd?: (equip: EquipmentItem, addNewRow: boolean) => void;
}

// 마스터 데이터에서 설비 로드
const loadEquipmentsFromMaster = async (processNo: string, processName: string): Promise<EquipmentItem[]> => {
  if (typeof window === 'undefined') return [];

  try {
    const cpMasterData = localStorage.getItem('cp_master_data');
    if (cpMasterData) {
      const flatData = JSON.parse(cpMasterData);
      const equipSet = new Map<string, EquipmentItem>();

      flatData.forEach((item: any, idx: number) => {
        const isMatch = String(item.processNo).trim() === String(processNo).trim();
        const isEquip = item.itemCode === 'A5' || item.code === 'A5';

        if (isMatch && isEquip && item.value && item.value.trim()) {
          const value = item.value.trim();
          if (!equipSet.has(value)) {
            equipSet.set(value, {
              id: `cp_equip_${idx}_${Date.now()}_${Math.random()}`,
              name: value,
              processNo,
              processName
            });
          }
        }
      });

      if (equipSet.size > 0) return Array.from(equipSet.values());
    }
    return [];
  } catch (e) {
    console.error('설비 로드 실패:', e);
    return [];
  }
};

export default function EquipmentInputModal({
  isOpen,
  onClose,
  onSave,
  processNo = '',
  processName = '',
  existingEquip = '',
  existingEquips = [],
  onContinuousAdd,
}: EquipmentInputModalProps) {
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState('');
  const [continuousMode, setContinuousMode] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 200, right: 350 }, modalWidth: 350, modalHeight: 400, isOpen });

  // 기존 설비 목록
  const existingEquipList = useMemo(() => {
    if (existingEquips && existingEquips.length > 0) return existingEquips;
    if (existingEquip) return [existingEquip];
    return [];
  }, [existingEquip, existingEquips]);

  useEffect(() => {
    if (isOpen && processNo) {
      setLoading(true);
      const loadData = async () => {
        const loaded = await loadEquipmentsFromMaster(processNo, processName);
        setEquipments(loaded);

        if (loaded.length > 0) {
          setDataSource(`CP Master (${loaded.length}개)`);
        } else {
          setDataSource('없음 - 직접 입력 필요');
        }

        // 기존 설비와 일치하는 항목 선택 - 직접 계산
        const currentExisting = existingEquips?.length > 0 ? existingEquips : (existingEquip ? [existingEquip] : []);
        const preSelected = new Set<string>();
        loaded.forEach(e => {
          if (currentExisting.includes(e.name)) {
            preSelected.add(e.id);
          }
        });
        setSelectedIds(preSelected);
        setInitialSelectedIds(new Set(preSelected));

        setLoading(false);
      };
      loadData();
      setSearch('');
      setNewName('');
      setContinuousMode(false);
      setAddedCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, processNo, processName]);

  const filteredEquips = useMemo(() => {
    if (!search.trim()) return equipments;
    const q = search.toLowerCase();
    return equipments.filter(e => e.name.toLowerCase().includes(q));
  }, [equipments, search]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  // ★ 전체 선택
  const selectAll = () => setSelectedIds(new Set(filteredEquips.map(e => e.id)));

  // ★ 선택 해제
  const deselectAll = () => setSelectedIds(new Set());

  const handleSave = () => {
    // 새로 선택된 항목만 저장
    const newlySelected = equipments.filter(e =>
      selectedIds.has(e.id) && !initialSelectedIds.has(e.id)
    );

    if (newlySelected.length === 0 && selectedIds.size > 0) {
      // 기존 선택만 있는 경우 첫 번째 선택 항목 저장
      const selected = equipments.find(e => selectedIds.has(e.id));
      if (selected) {
        onSave(selected);
      }
    } else if (newlySelected.length === 1) {
      // 단일 새 선택
      onSave(newlySelected[0]);
    } else if (newlySelected.length > 1) {
      // 다중 새 선택 → 배열로 저장 (행 추가)
      onSave(newlySelected);
    }
  };

  const handleAddNew = () => {
    if (!newName.trim() || !processNo) return;
    if (equipments.some(e => e.name === newName.trim())) return;

    const newEquip: EquipmentItem = {
      id: `equip_new_${Date.now()}`,
      name: newName.trim(),
      processNo,
      processName,
    };

    setEquipments(prev => [newEquip, ...prev]);
    setSelectedIds(prev => new Set([...prev, newEquip.id]));

    if (continuousMode && onContinuousAdd) {
      onContinuousAdd(newEquip, true);
      setAddedCount(prev => prev + 1);
    }
    setNewName('');
  };

  // 직접 입력 저장
  const handleDirectSave = () => {
    if (newName.trim()) {
      const newEquip: EquipmentItem = {
        id: `equip_direct_${Date.now()}`,
        name: newName.trim(),
        processNo,
        processName,
      };
      // 목록에 추가 및 선택
      setEquipments(prev => [newEquip, ...prev]);
      setSelectedIds(prev => new Set([...prev, newEquip.id]));
      // 워크시트에 즉시 반영
      onSave(newEquip);
      // 입력 필드 초기화
      setNewName('');
    }
  };

  const isCurrentlySelected = (name: string) => existingEquipList.includes(name);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40">
      <div
        className="fixed bg-white rounded-lg shadow-2xl w-[350px] flex flex-col overflow-hidden max-h-[calc(100vh-120px)] cursor-move"
        style={{ top: `${modalPosition.top}px`, right: `${modalPosition.right}px` }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 - 드래그 가능 */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white select-none cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🔧</span>
            <h2 className="text-xs font-bold">설비/금형/JIG 선택(Equipment Select)</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded">닫기</button>
        </div>

        {/* 공정 정보 */}
        <div className="px-3 py-1 border-b bg-blue-50 flex items-center gap-2">
          <span className="text-[10px] font-bold text-blue-700">공정:</span>
          <span className="text-[9px] text-gray-600">{processNo}</span>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded">{processName}</span>
        </div>

        {/* 데이터 소스 + 연속입력 토글 */}
        <div className="px-3 py-1 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-green-700">설비/금형</span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] px-2 py-0.5 rounded ${dataSource.includes('Master') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {loading ? '로딩중...' : `📂 ${dataSource}`}
            </span>
            {onContinuousAdd && (
              <button
                onClick={() => {
                  setContinuousMode(!continuousMode);
                  if (!continuousMode) setAddedCount(0);
                }}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${continuousMode
                  ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                title={continuousMode ? '연속입력 모드 ON' : '연속입력 모드 OFF'}
              >
                🔄 연속입력 {continuousMode ? 'ON' : 'OFF'}
                {continuousMode && addedCount > 0 && <span className="ml-1 px-1 bg-white/30 rounded">{addedCount}</span>}
              </button>
            )}
          </div>
        </div>

        {/* 신규 설비 추가 */}
        <div className={`px-3 py-1.5 border-b flex items-center gap-1 ${continuousMode ? 'bg-purple-50' : 'bg-green-50'}`}>
          <span className={`text-[10px] font-bold shrink-0 ${continuousMode ? 'text-purple-700' : 'text-blue-700'}`}>+</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDirectSave();
              }
            }}
            placeholder={continuousMode ? "입력 후 Enter → 즉시 반영" : "설비/금형/JIG 입력..."}
            className={`flex-1 px-2 py-0.5 text-[10px] border rounded focus:outline-none focus:ring-1 ${continuousMode ? 'focus:ring-purple-500 border-purple-300' : 'focus:ring-blue-500'
              }`}
          />
          <button
            onClick={handleDirectSave}
            disabled={!newName.trim()}
            className={`px-2 py-0.5 text-[10px] font-bold text-white rounded hover:opacity-90 disabled:opacity-50 ${continuousMode ? 'bg-purple-600' : 'bg-blue-600'
              }`}
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
              placeholder="🔍 설비 검색..."
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
                setEquipments(prev => prev.filter(e => !selectedIds.has(e.id)));
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
                <p className="text-xs text-gray-500">설비 데이터 로딩중...</p>
              </div>
            </div>
          ) : equipments.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg mb-2">📭</p>
                <p className="text-xs text-gray-500 mb-2">등록된 설비가 없습니다</p>
                <p className="text-[10px] text-gray-400">위 입력창에서 직접 추가해주세요</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {filteredEquips.map(equip => {
                const isSelected = selectedIds.has(equip.id);
                const isCurrent = isCurrentlySelected(equip.name);

                return (
                  <div
                    key={equip.id}
                    onClick={() => toggleSelect(equip.id)}
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

                    {/* 이름 */}
                    <span className={`text-xs truncate ${isSelected ? (isCurrent ? 'text-green-800 font-medium' : 'text-blue-800 font-medium') : 'text-gray-700'
                      }`}>
                      {equip.name}
                    </span>
                  </div>
                );
              })}
              {/* 빈 행 채우기 */}
              {Array.from({ length: Math.max(0, 12 - filteredEquips.length) }).map((_, idx) => (
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
