/**
 * @file ProcessDescInputModal.tsx
 * @description CP 공정설명 입력 모달 - ProcessFlowInputModal 벤치마킹
 * @version 1.0.0
 * @updated 2026-01-14
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDraggableModal } from '@/components/modals/useDraggableModal';

interface ProcessDescItem {
  id: string;
  name: string;
  processNo: string;
  processName: string;
}

interface ProcessDescInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedDesc: ProcessDescItem) => void;
  processNo?: string;
  processName?: string;
  existingDesc?: string;
  // 연속입력 모드: 저장 시 워크시트에 즉시 반영 + 새 행 추가
  onContinuousAdd?: (desc: ProcessDescItem, addNewRow: boolean) => void;
  // 현재 행 인덱스 (자동 입력 모드용)
  currentRowIdx?: number;
}

// FMEA에서 작업요소(공정설명) 로드
const loadWorkElementsFromFmea = async (processNo: string, processName: string): Promise<ProcessDescItem[]> => {
  if (typeof window === 'undefined') return [];

  try {
    console.log(`🔄 [CP 공정설명] 데이터 로드 시도: processNo=${processNo}, processName=${processName}`);
    
    // 1. CP 마스터 데이터 (Import된 데이터)
    const cpMasterData = localStorage.getItem('cp_master_data');
    if (cpMasterData) {
      const flatData = JSON.parse(cpMasterData);
      const descSet = new Map<string, ProcessDescItem>();
      
      flatData.forEach((item: any, idx: number) => {
        // 현재 공정번호와 일치하는 항목 중 공정설명(A4) 추출
        const isMatch = String(item.processNo).trim() === String(processNo).trim();
        const isDesc = item.itemCode === 'A4' || item.code === 'A4';
        
        if (isMatch && isDesc && item.value && item.value.trim()) {
          const descValue = item.value.trim();
          if (!descSet.has(descValue)) {
            descSet.set(descValue, {
              id: `cp_desc_${idx}_${Date.now()}`,
              name: descValue,
              processNo,
              processName
            });
          }
        }
      });
      
      if (descSet.size > 0) {
        console.log(`✅ [CP 공정설명] CP 마스터에서 ${descSet.size}개 로드 성공`);
        return Array.from(descSet.values());
      }
    }

    // 2. PFMEA 마스터 데이터 폴백
    const pfmeaMasterData = localStorage.getItem('pfmea_master_data');
    if (pfmeaMasterData) {
      const flatData = JSON.parse(pfmeaMasterData);
      const descSet = new Map<string, ProcessDescItem>();
      
      flatData.forEach((item: any, idx: number) => {
        const isMatch = String(item.processNo).trim() === String(processNo).trim();
        const isDesc = item.itemCode === 'A4' || item.code === 'A4';
        
        if (isMatch && isDesc && item.value && item.value.trim()) {
          const descValue = item.value.trim();
          if (!descSet.has(descValue)) {
            descSet.set(descValue, {
              id: `fmea_desc_${idx}_${Date.now()}`,
              name: descValue,
              processNo,
              processName
            });
          }
        }
      });
      
      if (descSet.size > 0) {
        console.log(`✅ [CP 공정설명] PFMEA 마스터에서 ${descSet.size}개 로드 성공`);
        return Array.from(descSet.values());
      }
    }

    // 데이터가 전혀 없을 경우 빈 목록 반환 (하드코딩 샘플 제거)
    console.warn('⚠️ [CP 공정설명] 일치하는 데이터를 찾을 수 없습니다.');
    return [];
  } catch (e) {
    console.error('❌ [CP 공정설명] 로드 실패:', e);
    return [];
  }
};

export default function ProcessDescInputModal({ 
  isOpen, 
  onClose, 
  onSave,
  processNo = '',
  processName = '',
  existingDesc = '',
  onContinuousAdd,
  currentRowIdx,
}: ProcessDescInputModalProps) {
  const [descriptions, setDescriptions] = useState<ProcessDescItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newName, setNewName] = useState('');

  const [loading, setLoading] = useState(false);
  
  // ✅ 연속입력 모드 상태
  const [continuousMode, setContinuousMode] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  
  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 200, right: 350 }, modalWidth: 350, modalHeight: 200, isOpen });


  useEffect(() => {
    if (isOpen && processNo && processName) {
      setLoading(true);
      
      // FMEA에서 작업요소 로드
      const loadData = async () => {
        console.log('🔄 CP 공정설명 데이터 로드 시작...', processNo, processName);
        
        const loaded = await loadWorkElementsFromFmea(processNo, processName);
        
        console.log('📋 로드된 공정설명:', loaded.map(d => d.name).join(', '));
        setDescriptions(loaded);
        
        // 기존 공정설명과 일치하는 항목 선택
        if (existingDesc) {
          const matched = loaded.find(d => d.name === existingDesc);
          if (matched) {
            setSelectedId(matched.id);
          }
        }
        
        setLoading(false);
      };
      
      loadData();
      setSearch('');
      setEditingId(null);
      setContinuousMode(false);
      setAddedCount(0);
    }
  }, [isOpen, processNo, processName, existingDesc]);

  const filteredDescriptions = useMemo(() => {
    if (!search.trim()) return descriptions;
    
    const q = search.toLowerCase();
    return descriptions.filter(d => d.name.toLowerCase().includes(q));
  }, [descriptions, search]);
  
  const toggleSelect = useCallback((id: string) => {
    if (editingId) return;
    setSelectedId(id);
  }, [editingId]);

  const handleSave = () => {
    if (!selectedId) return;
    
    const selected = descriptions.find(d => d.id === selectedId);
    if (selected) {
      onSave(selected);
      // ✅ 2026-01-16: 적용 후 모달 유지 (닫기 버튼으로만 닫음)
    }
  };

  // 더블클릭 수정
  const handleDoubleClick = (desc: ProcessDescItem) => {
    setEditingId(desc.id);
    setEditValue(desc.name);
  };

  const handleEditSave = () => {
    if (editingId && editValue.trim()) {
      setDescriptions(prev => prev.map(d => 
        d.id === editingId ? { ...d, name: editValue.trim() } : d
      ));
    }
    setEditingId(null);
  };

  // 신규 공정설명 추가
  const handleAddNew = () => {
    if (!newName.trim() || !processNo || !processName) return;
    
    // 중복 확인
    if (descriptions.some(d => d.name === newName.trim())) return;
    
    const newDesc: ProcessDescItem = {
      id: `desc_new_${Date.now()}`,
      name: newName.trim(),
      processNo,
      processName,
    };
    
    setDescriptions(prev => [newDesc, ...prev]);
    setSelectedId(newDesc.id);
    
    // ✅ 연속입력 모드: 워크시트에 즉시 반영 + 새 행 추가
    if (continuousMode && onContinuousAdd) {
      onContinuousAdd(newDesc, true);
      setAddedCount(prev => prev + 1);
      console.log(`[연속입력] "${newDesc.name}" 추가 완료 (총 ${addedCount + 1}개)`);
    }
    
    setNewName('');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/40"
      // ✅ 2026-01-16: 배경 클릭으로 닫히지 않음 (닫기 버튼으로만 닫음)
    >
      <div 
        className="fixed bg-white rounded-lg shadow-2xl w-[350px] max-w-[350px] min-w-[350px] flex flex-col overflow-hidden max-h-[calc(100vh-120px)] cursor-move"
        style={{ 
          top: `${modalPosition.top}px`, 
          right: `${modalPosition.right}px` 
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* 헤더 - 드래그 가능 */}
        <div 
          className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📝</span>
            <h2 className="text-xs font-bold">공정설명 선택</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded">닫기</button>
        </div>

        {/* 공정 정보 표시 */}
        {processNo && processName && (
          <div className="px-3 py-1 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-700">공정:</span>
            <span className="text-[9px] text-gray-600">{processNo}</span>
            <span className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded">{processName}</span>
          </div>
        )}

        {/* 데이터 소스 + 연속입력 토글 */}
        <div className="px-3 py-1 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-green-700">공정설명</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              {loading ? '로딩중...' : `📂 ${descriptions.length}개`}
            </span>
            {/* ✅ 연속입력 토글 */}
            {onContinuousAdd && (
              <button
                onClick={() => {
                  setContinuousMode(!continuousMode);
                  if (!continuousMode) setAddedCount(0);
                }}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                  continuousMode 
                    ? 'bg-purple-600 text-white ring-2 ring-purple-300' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={continuousMode ? '연속입력 모드 ON: 저장 시 워크시트에 즉시 반영 + 새 행 추가' : '연속입력 모드 OFF'}
              >
                🔄 연속입력 {continuousMode ? 'ON' : 'OFF'}
                {continuousMode && addedCount > 0 && <span className="ml-1 px-1 bg-white/30 rounded">{addedCount}</span>}
              </button>
            )}
          </div>
        </div>

        {/* 신규 공정설명 추가 */}
        <div className={`px-3 py-1.5 border-b flex items-center gap-1 ${continuousMode ? 'bg-purple-50' : 'bg-green-50'}`}>
          <span className={`text-[10px] font-bold shrink-0 ${continuousMode ? 'text-purple-700' : 'text-green-700'}`}>+</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddNew(); } }}
            placeholder={continuousMode ? "입력 후 Enter → 즉시 반영 + 새 행 추가" : "공정설명 입력..."}
            className={`flex-1 px-2 py-0.5 text-[10px] border rounded focus:outline-none focus:ring-1 ${
              continuousMode ? 'focus:ring-purple-500 border-purple-300' : 'focus:ring-green-500'
            }`}
            autoFocus={continuousMode}
          />
          <button
            onClick={handleAddNew}
            disabled={!newName.trim()}
            className={`px-2 py-0.5 text-[10px] font-bold text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${
              continuousMode ? 'bg-purple-600' : 'bg-green-600'
            }`}
          >
            저장
          </button>
        </div>

        {/* 검색 + 버튼 */}
        <div className="px-2 py-1.5 border-b bg-gray-50">
          {/* 첫 줄: 검색 */}
          <div className="mb-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 공정설명 검색..."
              className="w-full px-2 py-0.5 text-[9px] border rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          {/* 두 번째 줄: 버튼들 */}
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="px-4 py-1.5 text-[13px] font-bold bg-green-600 text-white rounded hover:bg-green-700">적용</button>
            <button onClick={onClose} className="px-4 py-1.5 text-[13px] font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">취소</button>
          </div>
        </div>

        {/* 컴팩트 테이블 - 고정 높이 */}
        <div className="overflow-auto p-2 h-80 min-h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">공정설명 데이터 로딩중...</p>
              </div>
            </div>
          ) : descriptions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg mb-2">📭</p>
                <p className="text-xs text-gray-500 mb-2">등록된 공정설명이 없습니다</p>
                <p className="text-[10px] text-gray-400">위 입력창에서 직접 추가해주세요</p>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-1">
            {filteredDescriptions.map(desc => {
                const isSelected = selectedId === desc.id;
                const isEditing = editingId === desc.id;
                
                return (
                  <div
                    key={desc.id}
                    onClick={() => toggleSelect(desc.id)}
                    onDoubleClick={() => handleDoubleClick(desc)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-400' 
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                    }`}
                  >
                    {/* 라디오 버튼 */}
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {isSelected && <span className="w-2 h-2 bg-white rounded-full"></span>}
                    </div>

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
                          isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'
                        }`}>
                          {desc.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 - 선택 수 표시만 */}
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-center">
          <span className="text-xs font-bold text-blue-600">
            {selectedId ? '✓ 1개 선택' : '선택 안됨'}
          </span>
        </div>
      </div>
    </div>
  );
}

