/**
 * @file EquipmentInputModal.tsx
 * @description CP 설비/금형/JIG 입력 모달 - ProcessFlowInputModal 스타일로 통일
 * @updated 2026-01-15
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
  onSave: (selectedEquip: EquipmentItem) => void;
  processNo?: string;
  processName?: string;
  existingEquip?: string;
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
        // 현재 공정번호와 일치하는 항목 중 설비(A5) 추출
        const isMatch = String(item.processNo).trim() === String(processNo).trim();
        const isEquip = item.itemCode === 'A5' || item.code === 'A5';
        
        if (isMatch && isEquip && item.value && item.value.trim()) {
          const value = item.value.trim();
          if (!equipSet.has(value)) {
            equipSet.set(value, {
              id: `cp_equip_${idx}_${Date.now()}`,
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
  onContinuousAdd,
}: EquipmentInputModalProps) {
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  
  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 200, right: 350 }, modalWidth: 350, modalHeight: 200, isOpen });

  useEffect(() => {
    if (isOpen && processNo) {
      setLoading(true);
      const loadData = async () => {
        const loaded = await loadEquipmentsFromMaster(processNo, processName);
        setEquipments(loaded);
        if (existingEquip) {
          const matched = loaded.find(e => e.name === existingEquip);
          if (matched) setSelectedId(matched.id);
        }
        setLoading(false);
      };
      loadData();
      setSearch('');
      setEditingId(null);
      setContinuousMode(false);
      setAddedCount(0);
    }
  }, [isOpen, processNo, processName, existingEquip]);

  const filteredEquips = useMemo(() => {
    if (!search.trim()) return equipments;
    const q = search.toLowerCase();
    return equipments.filter(e => e.name.toLowerCase().includes(q));
  }, [equipments, search]);

  const handleSave = () => {
    if (!selectedId) return;
    const selected = equipments.find(e => e.id === selectedId);
    if (selected) {
      onSave(selected);
      // ✅ 2026-01-16: 적용 후 모달 유지 (닫기 버튼으로만 닫음)
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
    setSelectedId(newEquip.id);
    if (continuousMode && onContinuousAdd) {
      onContinuousAdd(newEquip, true);
      setAddedCount(prev => prev + 1);
    }
    setNewName('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40">
      {/* ✅ 2026-01-16: 배경 클릭으로 닫히지 않음 (닫기 버튼으로만 닫음) */}
      <div 
        className="fixed bg-white rounded-lg shadow-2xl w-[350px] flex flex-col overflow-hidden max-h-[calc(100vh-120px)]"
        style={{ top: `${modalPosition.top}px`, right: `${modalPosition.right}px` }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white select-none cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🔧</span>
            <h2 className="text-xs font-bold">설비/금형/JIG 선택</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded">닫기</button>
        </div>

        {/* 공정 정보 */}
        <div className="px-3 py-1 border-b bg-teal-50 flex items-center gap-2">
          <span className="text-[10px] font-bold text-teal-700">공정:</span>
          <span className="text-[9px] text-gray-600">{processNo}</span>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-600 text-white rounded">{processName}</span>
        </div>

        {/* 신규 추가 */}
        <div className={`px-3 py-1.5 border-b flex items-center gap-1 ${continuousMode ? 'bg-purple-50' : 'bg-green-50'}`}>
          <span className="text-[10px] font-bold text-teal-700">+</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
            placeholder="설비/금형/JIG 입력..."
            className="flex-1 px-2 py-0.5 text-[10px] border rounded focus:ring-1 focus:ring-teal-500 outline-none"
          />
          <button onClick={handleAddNew} disabled={!newName.trim()} className="px-2 py-0.5 text-[10px] font-bold text-white bg-teal-600 rounded">저장</button>
        </div>

        {/* 검색 및 버튼 */}
        <div className="px-2 py-1.5 border-b bg-gray-50 flex flex-col gap-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 설비 검색..."
            className="w-full px-2 py-0.5 text-[9px] border rounded outline-none"
          />
          <div className="flex gap-2 mt-1">
            <button onClick={handleSave} className="flex-1 py-1.5 text-[12px] font-bold bg-teal-600 text-white rounded">적용</button>
            <button onClick={onClose} className="flex-1 py-1.5 text-[12px] font-bold bg-gray-300 text-gray-700 rounded">취소</button>
          </div>
        </div>

        {/* 목록 */}
        <div className="overflow-auto p-2 h-64 min-h-[260px]">
          {loading ? (
            <div className="text-center py-10 text-[10px] text-gray-500">데이터 로딩중...</div>
          ) : filteredEquips.length === 0 ? (
            <div className="text-center py-10 text-[10px] text-gray-400">등록된 설비가 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredEquips.map(e => (
                <div 
                  key={e.id} 
                  onClick={() => setSelectedId(e.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer ${selectedId === e.id ? 'bg-teal-50 border-teal-400' : 'bg-white border-gray-200'}`}
                >
                  <div className={`w-3 h-3 rounded-full border ${selectedId === e.id ? 'bg-teal-500 border-teal-500' : 'bg-white border-gray-300'}`} />
                  <span className="text-[11px] text-gray-700">{e.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
