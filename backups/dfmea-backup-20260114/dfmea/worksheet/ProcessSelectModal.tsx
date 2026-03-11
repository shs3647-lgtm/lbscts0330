/**
 * @file ProcessSelectModal.tsx
 * @description 공정 선택 모달 - 표준화된 컴팩트 테이블 형태
 * @version 2.0.0 - 표준화
 * @updated 2025-12-29
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface ProcessItem {
  id: string;
  no: string;
  name: string;
}

interface ProcessWithL3Info {
  name: string;
  l3Count: number;
}

interface ProcessSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedProcesses: ProcessItem[]) => void;
  onDelete?: (processIds: string[]) => void;
  existingProcessNames?: string[];
  existingProcessesInfo?: ProcessWithL3Info[];
  productLineName?: string;  // 완제품공정명 (상위항목)
}

// 기초정보에서 공정명 로드
const loadProcessesFromBasicInfo = (): ProcessItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const savedData = localStorage.getItem('pfmea_master_data');
    if (savedData) {
      const flatData = JSON.parse(savedData);
      const processSet = new Map<string, ProcessItem>();
      
      flatData.forEach((item: any, idx: number) => {
        if (item.code === 'A2' && item.value) {
          const processName = item.value;
          if (!processSet.has(processName)) {
            const no = String((processSet.size + 1) * 10);
            processSet.set(processName, {
              id: `proc_${idx}_${Date.now()}`,
              no,
              name: processName
            });
          }
        }
      });
      
      if (processSet.size > 0) return Array.from(processSet.values());
    }
    
    // 기본 샘플 데이터
    return [
      { id: 'p1', no: '10', name: '자재입고' },
      { id: 'p2', no: '11', name: '가온' },
      { id: 'p3', no: '20', name: '수입검사' },
      { id: 'p4', no: '30', name: '믹싱' },
      { id: 'p5', no: '40', name: '압출' },
      { id: 'p6', no: '50', name: '재단' },
      { id: 'p7', no: '60', name: '비드' },
      { id: 'p8', no: '70', name: '성형' },
      { id: 'p9', no: '80', name: '가류' },
      { id: 'p10', no: '90', name: '검사' },
      { id: 'p11', no: '100', name: '완성검사' },
      { id: 'p12', no: '110', name: '포장' },
    ];
  } catch (e) {
    console.error('Failed to load processes:', e);
    return [];
  }
};

export default function ProcessSelectModal({ 
  isOpen, 
  onClose, 
  onSave,
  onDelete,
  existingProcessNames = [],
  existingProcessesInfo = [],
  productLineName = '완제품 제조라인'
}: ProcessSelectModalProps) {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      const loaded = loadProcessesFromBasicInfo();
      setProcesses(loaded);
      
      const preSelected = new Set<string>();
      loaded.forEach(p => {
        if (existingProcessNames.includes(p.name)) {
          preSelected.add(p.id);
        }
      });
      setSelectedIds(preSelected);
      setSearch('');
      setEditingId(null);
    }
  }, [isOpen, existingProcessNames]);

  const filteredProcesses = useMemo(() => {
    if (!search.trim()) return processes;
    const q = search.toLowerCase();
    return processes.filter(p => 
      p.no.includes(q) || p.name.toLowerCase().includes(q)
    );
  }, [processes, search]);
  
  const toggleSelect = useCallback((id: string) => {
    if (editingId) return;
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, [editingId]);

  const selectAll = () => setSelectedIds(new Set(filteredProcesses.map(p => p.id)));
  const deselectAll = () => setSelectedIds(new Set());
  
  const clearAndSave = () => {
    const totalL3Count = existingProcessesInfo.reduce((sum, p) => sum + p.l3Count, 0);
    const message = `⚠️ 모든 데이터를 삭제하시겠습니까?\n\n` +
      `• 공정: ${existingProcessNames.length}개\n` +
      `• 하위 작업요소: ${totalL3Count}개`;
    
    if (!window.confirm(message)) return;
    onSave([]);
    onClose();
  };

  const handleSave = () => {
    const selected = processes.filter(p => selectedIds.has(p.id));
    const selectedNames = new Set(selected.map(p => p.name));
    
    const removedWithL3 = existingProcessesInfo.filter(p => 
      !selectedNames.has(p.name) && p.l3Count > 0
    );
    
    if (removedWithL3.length > 0) {
      const details = removedWithL3.map(p => `• ${p.name}: ${p.l3Count}개 작업요소`).join('\n');
      if (!window.confirm(`⚠️ 하위 작업요소가 있는 공정이 해제됩니다.\n\n${details}\n\n삭제하시겠습니까?`)) return;
    }
    
    onSave(selected);
    onClose();
  };

  // 더블클릭 수정
  const handleDoubleClick = (proc: ProcessItem) => {
    setEditingId(proc.id);
    setEditValue(proc.name);
  };

  const handleEditSave = () => {
    if (editingId && editValue.trim()) {
      setProcesses(prev => prev.map(p => 
        p.id === editingId ? { ...p, name: editValue.trim() } : p
      ));
    }
    setEditingId(null);
  };

  const handleDeleteSingle = (proc: ProcessItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const procInfo = existingProcessesInfo.find(p => p.name === proc.name);
    const l3Count = procInfo?.l3Count || 0;
    
    const message = l3Count > 0
      ? `"${proc.name}" 공정과 하위 ${l3Count}개 작업요소를 삭제하시겠습니까?`
      : `"${proc.name}" 공정을 삭제하시겠습니까?`;
    
    if (!window.confirm(message)) return;
    
    const newSelectedIds = new Set(selectedIds);
    newSelectedIds.delete(proc.id);
    const selected = processes.filter(p => newSelectedIds.has(p.id));
    onSave(selected);
    onClose();
  };

  const isCurrentlySelected = (name: string) => existingProcessNames.includes(name);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-end bg-black/40 pt-20 pr-5"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-[500px] flex flex-col overflow-hidden max-h-[calc(100vh-120px)]"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-2">
            <span className="text-base">🏭</span>
            <h2 className="text-xs font-bold">메인공정명 선택</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded">닫기</button>
        </div>

        {/* ===== 상위항목 고정 표시 ===== */}
        <div className="px-3 py-2 border-b bg-gradient-to-r from-red-50 to-orange-50 flex items-center gap-2">
          <span className="text-[11px] font-bold text-red-700 shrink-0">★ 상위항목:</span>
          <span className="text-[9px] text-gray-600 font-bold">완제품공정명:</span>
          <span className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded">{productLineName}</span>
        </div>

        {/* ===== 하위항목 라벨 ===== */}
        <div className="px-3 py-1 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <span className="text-[10px] font-bold text-green-700">▼ 하위항목: 메인공정명</span>
        </div>

        {/* 검색 영역 */}
        <div className="px-3 py-2 border-b bg-gray-50">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 공정명 또는 번호 검색..."
            className="w-full px-2 py-1.5 text-[11px] border rounded focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* 버튼 영역 (표준화: 검색 아래, 가로 배치) */}
        <div className="px-3 py-2 border-b bg-white flex items-center gap-2">
          <button onClick={selectAll} className="px-4 py-1.5 text-[13px] font-bold bg-blue-500 text-white rounded hover:bg-blue-600">전체</button>
          <button onClick={deselectAll} className="px-4 py-1.5 text-[13px] font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">해제</button>
          <button onClick={handleSave} className="px-4 py-1.5 text-[13px] font-bold bg-green-600 text-white rounded hover:bg-green-700">적용</button>
          <button onClick={clearAndSave} className="px-4 py-1.5 text-[13px] font-bold bg-red-500 text-white rounded hover:bg-red-600">삭제</button>
        </div>

        {/* 컴팩트 테이블 - 고정 높이 */}
        <div className="overflow-auto p-2 h-80 min-h-[320px]">
          <div className="grid grid-cols-2 gap-1">
            {filteredProcesses.map(proc => {
                const isSelected = selectedIds.has(proc.id);
                const isCurrent = isCurrentlySelected(proc.name);
                const isEditing = editingId === proc.id;
                
                return (
                  <div
                    key={proc.id}
                    onClick={() => toggleSelect(proc.id)}
                    onDoubleClick={() => handleDoubleClick(proc)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-all ${
                      isSelected 
                        ? isCurrent 
                          ? 'bg-green-50 border-green-400' 
                          : 'bg-blue-50 border-blue-400'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                    }`}
                  >
                    {/* 체크박스 */}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected 
                        ? isCurrent ? 'bg-green-500 border-green-500' : 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}>
                      {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
                    </div>

                    {/* 번호 */}
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded min-w-[28px] text-center">
                      {proc.no}
                    </span>

                    {/* 이름 (수정 모드 or 표시 모드) */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleEditSave}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleEditSave(); }
                            if (e.key === 'Escape') { e.stopPropagation(); setEditingId(null); }
                          }}
                          autoFocus
                          className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className={`text-xs truncate block ${
                          isSelected ? (isCurrent ? 'text-green-800 font-medium' : 'text-blue-800 font-medium') : 'text-gray-700'
                        }`}>
                          {proc.name}
                        </span>
                      )}
                    </div>

                    {/* 삭제 버튼 */}
                    {isCurrent && (
                      <button
                        onClick={(e) => handleDeleteSingle(proc, e)}
                        className="text-red-400 hover:text-red-600 text-xs shrink-0"
                        title="삭제"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
              {/* 빈 행 채우기 - 최소 12개 행 유지 */}
              {Array.from({ length: Math.max(0, 12 - filteredProcesses.length) }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-100 bg-gray-50/50"
                >
                  <div className="w-4 h-4 rounded border border-gray-200 bg-white shrink-0" />
                  <span className="text-[10px] font-bold text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded min-w-[28px] text-center">--</span>
                  <span className="flex-1 text-xs text-gray-300">-</span>
                </div>
              ))}
            </div>
        </div>

        {/* 푸터 - 선택 수 표시만 */}
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-center">
          <span className="text-xs font-bold text-blue-600">✓ {selectedIds.size}개 선택</span>
        </div>
      </div>
    </div>
  );
}
