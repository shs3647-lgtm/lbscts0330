// @ts-nocheck
/**
 * @file ProcessSelectModal.tsx
 * @description 공정 선택 모달 - 표준화된 컴팩트 테이블 형태
 * @version 2.0.0 - 표준화
 * @updated 2025-12-29
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDraggableModal } from '@/components/modals/useDraggableModal';

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
  // ✅ 연속입력 모드: 저장 시 워크시트에 즉시 반영 + 새 행 추가
  onContinuousAdd?: (process: ProcessItem, addNewRow: boolean) => void;
}

// DB에서 마스터 FMEA 공정 로드
const loadMasterProcessesFromDB = async (): Promise<ProcessItem[]> => {
  try {
    // 마스터 FMEA (pfm26-M001) 공정 데이터 조회
    const res = await fetch('/api/fmea/master-processes');
    if (res.ok) {
      const data = await res.json();
      if (data.processes && data.processes.length > 0) {
        console.log('✅ DB에서 마스터 공정 로드:', data.processes.length, '개');
        return data.processes;
      }
    }
  } catch (e) {
    console.error('마스터 공정 로드 실패:', e);
  }
  return [];
};

// 기초정보에서 공정명 로드 (localStorage 폴백)
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
    
    return [];
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
  productLineName = '완제품 제조라인',
  onContinuousAdd,
}: ProcessSelectModalProps) {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newNo, setNewNo] = useState('');
  const [newName, setNewName] = useState('');

  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');
  
  // ✅ 연속입력 모드 상태
  const [continuousMode, setContinuousMode] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  
  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 200, right: 0 }, modalWidth: 350, modalHeight: 200, isOpen });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setDataSource('');
      
      // DB에서 마스터 공정 로드 (우선), 없으면 localStorage 폴백
      const loadData = async () => {
        console.log('🔄 공정 데이터 로드 시작...');
        
        let loaded = await loadMasterProcessesFromDB();
        
        if (loaded.length > 0) {
          setDataSource('Master FMEA (DB)');
          console.log('✅ 마스터 공정 사용:', loaded.length, '개');
        } else {
          // DB에 없으면 localStorage에서 로드
          loaded = loadProcessesFromBasicInfo();
          if (loaded.length > 0) {
            setDataSource('localStorage');
            console.log('⚠️ localStorage 폴백:', loaded.length, '개');
          } else {
            setDataSource('없음 - 직접 입력 필요');
            console.log('❌ 공정 데이터 없음');
          }
        }
        
        console.log('📋 로드된 공정:', loaded.map(p => p.name).join(', '));
        setProcesses(loaded);
        
        const preSelected = new Set<string>();
        loaded.forEach(p => {
          if (existingProcessNames.includes(p.name)) {
            preSelected.add(p.id);
          }
        });
        setSelectedIds(preSelected);
        setLoading(false);
      };
      
      loadData();
      setSearch('');
      setEditingId(null);
      // ✅ 연속입력 상태 초기화
      setContinuousMode(false);
      setAddedCount(0);
    }
  }, [isOpen, existingProcessNames]);

  const filteredProcesses = useMemo(() => {
    let result = processes;
    
    // 검색 필터링
    if (search.trim()) {
      const q = search.toLowerCase();
      result = processes.filter(p => 
        p.no.includes(q) || p.name.toLowerCase().includes(q)
      );
    }
    
    // 공정 번호 기준 숫자 정렬 (10, 20, 30 순서)
    return [...result].sort((a, b) => {
      const numA = parseInt(a.no.replace(/\D/g, '')) || 0; // 숫자만 추출
      const numB = parseInt(b.no.replace(/\D/g, '')) || 0;
      return numA - numB; // 오름차순 정렬
    });
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
    // ✅ 2026-01-16: 삭제 후 모달 유지 (닫기 버튼으로만 닫음)
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
    // ✅ 2026-01-16: 적용 후 모달 유지 (닫기 버튼으로만 닫음)
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
    // ✅ 2026-01-16: 삭제 후 모달 유지 (닫기 버튼으로만 닫음)
  };

  const isCurrentlySelected = (name: string) => existingProcessNames.includes(name);

  // 신규 공정 추가
  const handleAddNew = () => {
    if (!newName.trim()) return;
    
    // 중복 확인 - 이미 존재하면 무시
    if (processes.some(p => p.name === newName.trim())) return;
    
    // 공정번호 자동 생성 (입력 안했으면)
    const procNo = newNo.trim() || String((processes.length + 1) * 10);
    
    const newProc: ProcessItem = {
      id: `proc_new_${Date.now()}`,
      no: procNo,
      name: newName.trim(),
    };
    
    setProcesses(prev => [newProc, ...prev]);  // 최상단에 추가
    setSelectedIds(prev => new Set([...prev, newProc.id]));
    
    // localStorage에도 저장
    try {
      const savedData = localStorage.getItem('pfmea_master_data') || '[]';
      const masterData = JSON.parse(savedData);
      masterData.push({
        id: newProc.id,
        code: 'A2',
        value: newProc.name,
        processNo: procNo,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('pfmea_master_data', JSON.stringify(masterData));
      console.log('✅ 신규 공정 저장:', newProc.name);
    } catch (e) {
      console.error('저장 오류:', e);
    }
    
    // ✅ 연속입력 모드: 워크시트에 즉시 반영 + 새 행 추가
    if (continuousMode && onContinuousAdd) {
      onContinuousAdd(newProc, true); // 새 행 추가 요청
      setAddedCount(prev => prev + 1);
      console.log(`[연속입력] "${newProc.name}" 추가 완료 (총 ${addedCount + 1}개)`);
    } else {
      // ✅ 2026-01-16: 일반 모드에서도 엔터 시 워크시트에 즉시 반영 (모달 유지)
      const currentSelected = processes.filter(p => selectedIds.has(p.id));
      onSave([...currentSelected, newProc]);
      console.log('[ProcessSelectModal] 워크시트 반영:', [...currentSelected, newProc].map(p => p.name));
    }
    
    setNewNo('');
    setNewName('');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ✅ 2026-01-19: 배경을 클릭 통과하도록 변경 - 다른 항목 클릭 시 자동 전환 */}
      <div 
        className="fixed inset-0 z-[9998] pointer-events-none"
      />
      <div 
        className="fixed bg-white rounded-lg shadow-2xl w-[350px] max-w-[350px] min-w-[350px] flex flex-col overflow-hidden max-h-[calc(100vh-120px)] cursor-move z-[9999] pointer-events-auto"
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

        {/* ===== 하위항목 라벨 + 데이터 소스 + 연속입력 토글 ===== */}
        <div className="px-3 py-1 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-green-700">▼ 하위항목: 메인공정명</span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] px-2 py-0.5 rounded ${dataSource.includes('Master') ? 'bg-blue-100 text-blue-700' : dataSource.includes('local') ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
              {loading ? '로딩중...' : `📂 ${dataSource} (${processes.length}개)`}
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

        {/* ===== 신규 공정 추가 ===== */}
        <div className={`px-3 py-1.5 border-b flex items-center gap-1 ${continuousMode ? 'bg-purple-50' : 'bg-green-50'}`}>
          <span className={`text-[10px] font-bold shrink-0 ${continuousMode ? 'text-purple-700' : 'text-green-700'}`}>+</span>
          <input
            type="text"
            value={newNo}
            onChange={(e) => setNewNo(e.target.value)}
            placeholder="No"
            className={`w-12 px-1 py-0.5 text-[10px] border rounded focus:outline-none focus:ring-1 text-center ${
              continuousMode ? 'focus:ring-purple-500 border-purple-300' : 'focus:ring-green-500'
            }`}
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddNew(); } }}
            placeholder={continuousMode ? "입력 후 Enter → 즉시 반영 + 새 행 추가" : "공정명 입력..."}
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

        {/* 검색 + 버튼: [전체][해제][적용][삭제] */}
        <div className="px-2 py-1.5 border-b bg-gray-50">
          {/* 첫 줄: 검색 */}
          <div className="mb-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 공정명 또는 번호 검색..."
              className="w-full px-2 py-0.5 text-[9px] border rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          {/* 두 번째 줄: 버튼들 (표준화: 가로 배치) */}
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="px-4 py-1.5 text-[13px] font-bold bg-blue-500 text-white rounded hover:bg-blue-600">전체</button>
            <button onClick={deselectAll} className="px-4 py-1.5 text-[13px] font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">해제</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-[13px] font-bold bg-green-600 text-white rounded hover:bg-green-700">적용</button>
            <button onClick={clearAndSave} className="px-4 py-1.5 text-[13px] font-bold bg-red-500 text-white rounded hover:bg-red-600">삭제</button>
          </div>
        </div>

        {/* 컴팩트 테이블 - 고정 높이 */}
        <div className="overflow-auto p-2 h-80 min-h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">마스터 공정 데이터 로딩중...</p>
              </div>
            </div>
          ) : processes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg mb-2">📭</p>
                <p className="text-xs text-gray-500 mb-2">등록된 공정이 없습니다</p>
                <p className="text-[10px] text-gray-400">위 입력창에서 직접 추가해주세요</p>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* 푸터 - 선택 수 표시만 */}
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-center">
          <span className="text-xs font-bold text-blue-600">✓ {selectedIds.size}개 선택</span>
        </div>
      </div>
    </>
  );
}
