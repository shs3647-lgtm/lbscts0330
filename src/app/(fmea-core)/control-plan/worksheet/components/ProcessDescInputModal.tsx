/**
 * @file ProcessDescInputModal.tsx
 * @description CP 공정설명 입력 모달 - ProcessFlowInputModal 표준화
 * @version 2.0.0
 * @updated 2026-01-24
 */

// CODEFREEZE: DB Only 정책 적용 완료 (2026-02-16) - localStorage pfmea_master_data 폴백 제거
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  onSave: (selectedDescs: ProcessDescItem[]) => void;  // ★ 다중 선택 지원
  onDelete?: (descIds: string[]) => void;  // ★ 삭제 기능 추가
  processNo?: string;
  processName?: string;
  existingDesc?: string;
  existingDescs?: string[];  // ★ 다중 기존 공정설명
  // 연속입력 모드: 저장 시 워크시트에 즉시 반영 + 새 행 추가
  onContinuousAdd?: (desc: ProcessDescItem, addNewRow: boolean) => void;
  // 현재 행 인덱스 (자동 입력 모드용)
  currentRowIdx?: number;
  // 빈 행 여부 (사전 선택 비활성화)
  isEmptyRow?: boolean;
}

// FMEA에서 작업요소(공정설명) 로드
const loadWorkElementsFromFmea = async (processNo: string, processName: string): Promise<ProcessDescItem[]> => {
  if (typeof window === 'undefined') return [];

  try {
    // ★ 0. URL에서 현재 CP ID 추출
    const urlParams = new URLSearchParams(window.location.search);
    const cpNo = urlParams.get('cpNo') || '';

    // ★ 1. DB API에서 현재 CP 데이터 조회 (Import된 데이터)
    if (cpNo) {
      try {
        const res = await fetch(`/api/control-plan/${cpNo}/items`);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const descSet = new Map<string, ProcessDescItem>();

            data.items.forEach((item: any, idx: number) => {
              const isMatch = String(item.processNo).trim() === String(processNo).trim();
              const hasDesc = item.processDesc && item.processDesc.trim();

              if (isMatch && hasDesc) {
                const descValue = item.processDesc.trim();
                if (!descSet.has(descValue)) {
                  descSet.set(descValue, {
                    id: `db_desc_${idx}_${Date.now()}`,
                    name: descValue,
                    processNo,
                    processName
                  });
                }
              }
            });

            if (descSet.size > 0) {
              return Array.from(descSet.values());
            }
          }
        }
      } catch (e) {
        // DB 조회 실패, localStorage 폴백
      }
    }

    // ★★★ 2026-02-16: localStorage 폴백 제거 (DB Only 정책) ★★★
    // CP/PFMEA 마스터 데이터 localStorage 읽기 삭제됨 - DB API에서만 로드

    // 데이터가 전혀 없을 경우 빈 목록 반환
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
  onDelete,
  processNo = '',
  processName = '',
  existingDesc = '',
  existingDescs = [],
  onContinuousAdd,
  currentRowIdx,
  isEmptyRow = false,
}: ProcessDescInputModalProps) {
  const [descriptions, setDescriptions] = useState<ProcessDescItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());  // ★ 다중 선택
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<string>>(new Set());  // ★ 초기 선택 ID
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newName, setNewName] = useState('');

  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');

  // ✅ 연속입력 모드 상태
  const [continuousMode, setContinuousMode] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 200, right: 350 }, modalWidth: 350, modalHeight: 200, isOpen });

  // ★ 이전 isOpen 상태를 추적하여 중복 실행 방지
  const prevIsOpenRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // 기존 공정설명 목록 (단일 또는 다중)
  const existingDescList = useMemo(() => {
    if (existingDescs.length > 0) return existingDescs;
    if (existingDesc) return [existingDesc];
    return [];
  }, [existingDesc, existingDescs]);

  useEffect(() => {
    // isOpen이 false → true로 변경될 때만 데이터 로드
    if (isOpen && !prevIsOpenRef.current) {
      hasLoadedRef.current = false;
    }
    prevIsOpenRef.current = isOpen;

    if (isOpen && processNo && processName && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setLoading(true);
      setDataSource('');

      // FMEA에서 작업요소 로드
      const loadData = async () => {
        const loaded = await loadWorkElementsFromFmea(processNo, processName);

        // ★★★ 2026-02-16: DB Only 정책 - 데이터 소스 표시 ★★★
        if (loaded.length > 0) {
          setDataSource('CP Master (DB)');
        } else {
          setDataSource('없음 - 직접 입력 필요');
        }

        setDescriptions(loaded);

        // ★ 빈 행에서 클릭한 경우 사전 선택 비활성화
        if (isEmptyRow) {
          setSelectedIds(new Set());
          setInitialSelectedIds(new Set());
        } else {
          // 기존 공정설명과 일치하는 항목 선택
          const preSelected = new Set<string>();
          loaded.forEach(d => {
            if (existingDescList.includes(d.name)) {
              preSelected.add(d.id);
            }
          });
          setSelectedIds(preSelected);
          setInitialSelectedIds(new Set(preSelected));
        }

        setLoading(false);
      };

      loadData();
      setSearch('');
      setEditingId(null);
      setContinuousMode(false);
      setAddedCount(0);
    }
  }, [isOpen, processNo, processName, existingDescList, isEmptyRow]);

  const filteredDescriptions = useMemo(() => {
    if (!search.trim()) return descriptions;

    const q = search.toLowerCase();
    return descriptions.filter(d => d.name.toLowerCase().includes(q));
  }, [descriptions, search]);

  const toggleSelect = useCallback((id: string) => {
    if (editingId) return;
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, [editingId]);

  // ★ 전체 선택
  const selectAll = () => setSelectedIds(new Set(filteredDescriptions.map(d => d.id)));

  // ★ 선택 해제
  const deselectAll = () => setSelectedIds(new Set());

  const handleSave = () => {
    // ★ 새로 선택된 공정설명만 저장 (기존 공정설명 제외)
    const newlySelected = descriptions.filter(d =>
      selectedIds.has(d.id) && !initialSelectedIds.has(d.id)
    );
    // ★ 공정번호 숫자 오름차순 정렬 (10, 20, 30, 100, 110 순서)
    const sortedSelected = [...newlySelected].sort((a, b) => {
      const numA = parseInt(String(a.processNo || '0').replace(/\D/g, '')) || 0;
      const numB = parseInt(String(b.processNo || '0').replace(/\D/g, '')) || 0;
      return numA - numB;
    });
    onSave(sortedSelected);
    // ✅ 적용 후 모달 유지 (닫기 버튼으로만 닫음)
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

  const isCurrentlySelected = (name: string) => existingDescList.includes(name);

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
    setSelectedIds(prev => new Set([...prev, newDesc.id]));

    // ✅ 연속입력 모드: 워크시트에 즉시 반영 + 새 행 추가
    if (continuousMode && onContinuousAdd) {
      onContinuousAdd(newDesc, true);
      setAddedCount(prev => prev + 1);
    }

    setNewName('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40"
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
            <h2 className="text-xs font-bold">공정설명 선택(Process Desc. Select)</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded">닫기</button>
        </div>

        {/* 데이터 소스 + 연속입력 토글 */}
        <div className="px-3 py-1 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-green-700">공정설명</span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] px-2 py-0.5 rounded ${dataSource.includes('Master') ? 'bg-blue-100 text-blue-700' : dataSource.includes('local') ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
              {loading ? '로딩중...' : `📂 ${dataSource} (${descriptions.length}개)`}
            </span>
            {/* ✅ 연속입력 토글 */}
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
            className={`flex-1 px-2 py-0.5 text-[10px] border rounded focus:outline-none focus:ring-1 ${continuousMode ? 'focus:ring-purple-500 border-purple-300' : 'focus:ring-green-500'
              }`}
            autoFocus={continuousMode}
          />
          <button
            onClick={handleAddNew}
            disabled={!newName.trim()}
            className={`px-2 py-0.5 text-[10px] font-bold text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${continuousMode ? 'bg-purple-600' : 'bg-green-600'
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
          {/* 두 번째 줄: 버튼들 (공정명 모달과 동일) */}
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="px-3 py-1.5 text-[11px] font-bold bg-blue-500 text-white rounded hover:bg-blue-600">전체<span className="text-[8px] opacity-70 ml-0.5">(All)</span></button>
            <button onClick={deselectAll} className="px-3 py-1.5 text-[11px] font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">해제<span className="text-[8px] opacity-70 ml-0.5">(Clr)</span></button>
            <button onClick={handleSave} className="px-3 py-1.5 text-[11px] font-bold bg-green-600 text-white rounded hover:bg-green-700">적용<span className="text-[8px] opacity-70 ml-0.5">(OK)</span></button>
            {onDelete && (
              <button
                onClick={() => {
                  if (selectedIds.size > 0 && window.confirm(`선택한 ${selectedIds.size}개 공정설명을 삭제하시겠습니까?`)) {
                    onDelete(Array.from(selectedIds));
                    setSelectedIds(new Set());
                  }
                }}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 text-[11px] font-bold bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                삭제<span className="text-[8px] opacity-70 ml-0.5">(Del)</span>
              </button>
            )}
          </div>
        </div>

        {/* 컴팩트 테이블 - 고정 높이, 2열 그리드 (공정명 모달과 동일) */}
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
            <div className="grid grid-cols-2 gap-1">
              {filteredDescriptions.map(desc => {
                const isSelected = selectedIds.has(desc.id);
                const isCurrent = isCurrentlySelected(desc.name);
                const isEditing = editingId === desc.id;

                return (
                  <div
                    key={desc.id}
                    onClick={() => toggleSelect(desc.id)}
                    onDoubleClick={() => handleDoubleClick(desc)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-all ${isSelected
                        ? isCurrent
                          ? 'bg-green-50 border-green-400'
                          : 'bg-blue-50 border-blue-400'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                      }`}
                  >
                    {/* 체크박스 (공정명 모달과 동일) */}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected
                        ? isCurrent ? 'bg-green-500 border-green-500' : 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'
                      }`}>
                      {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
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
                        <span className={`text-xs truncate block ${isSelected ? (isCurrent ? 'text-green-800 font-medium' : 'text-blue-800 font-medium') : 'text-gray-700'
                          }`}>
                          {desc.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* 빈 행 채우기 - 최소 12개 행 유지 */}
              {Array.from({ length: Math.max(0, 12 - filteredDescriptions.length) }).map((_, idx) => (
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

        {/* 푸터 - 새로 선택된 수 표시 (공정명 모달과 동일) */}
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-500">전체 {selectedIds.size}개</span>
          <span className="text-xs font-bold text-blue-600">✓ 신규 {Array.from(selectedIds).filter(id => !initialSelectedIds.has(id)).length}개 추가</span>
        </div>
      </div>
    </div>
  );
}
