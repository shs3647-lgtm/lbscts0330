/**
 * @file ProcessFlowInputModal.tsx
 * @description CP 공정명 입력 모달 - PFMEA ProcessSelectModal 벤치마킹
 * @version 1.0.0
 * @updated 2026-01-14
 */

// CODEFREEZE: DB Only 정책 적용 완료 (2026-02-16) - localStorage pfmea_master_data 폴백 제거
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDraggableModal } from '@/components/modals/useDraggableModal';

interface ProcessItem {
  id: string;
  no: string;
  name: string;
}

interface ProcessFlowInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedProcesses: ProcessItem[]) => void;
  onDelete?: (processIds: string[]) => void;
  existingProcessNames?: string[];
  // 연속입력 모드: 저장 시 워크시트에 즉시 반영 + 새 행 추가
  onContinuousAdd?: (process: ProcessItem, addNewRow: boolean) => void;
  // 현재 행 인덱스 (자동 입력 모드용)
  currentRowIdx?: number;
  // 빈 행 여부 (사전 선택 비활성화)
  isEmptyRow?: boolean;
  // ★ CP 번호 (기초정보 API 호출용)
  cpNo?: string;
}

// DB에서 마스터 공정 로드 (우선순위 1: CP 기초정보, 2: FMEA 마스터)
const loadMasterProcessesFromDB = async (cpNo?: string): Promise<ProcessItem[]> => {
  try {
    // ★ 1단계: CP 기초정보에서 로드 (cp_master_flat_items)
    if (cpNo) {
      try {
        const cpRes = await fetch(`/api/control-plan/${cpNo}/basic-info`);
        if (cpRes.ok) {
          const cpData = await cpRes.json();
          if (cpData.success && cpData.processes && cpData.processes.length > 0) {
            return cpData.processes;
          }
        }
      } catch (e) {
        // 기초정보 API 호출 실패, FMEA 마스터로 폴백
      }
    }

    // ★ 2단계: FMEA 마스터에서 로드 (폴백)
    const res = await fetch('/api/fmea/master-processes');

    if (!res.ok) {
      console.error('❌ [CP 모달] 마스터 API 응답 실패:', res.status, res.statusText);
      const errorText = await res.text();
      console.error('❌ [CP 모달] 에러 내용:', errorText);
      return [];
    }

    const data = await res.json();

    if (data.success && data.processes && data.processes.length > 0) {
      return data.processes;
    }
  } catch (e: any) {
    console.error('❌ [CP 모달] 마스터 공정 로드 실패:', e);
    console.error('❌ [CP 모달] 에러 상세:', e.message, e.stack);
  }
  return [];
};

// ★★★ 2026-02-16: localStorage 폴백 함수 제거 (DB Only 정책) ★★★
// loadProcessesFromBasicInfo 삭제됨

export default function ProcessFlowInputModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  existingProcessNames = [],
  onContinuousAdd,
  currentRowIdx,
  isEmptyRow = false,
  cpNo,  // ★ CP 번호 (기초정보 API 호출용)
}: ProcessFlowInputModalProps) {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<string>>(new Set()); // ★ 초기 선택 ID (기존 공정)
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
    useDraggableModal({ initialPosition: { top: 200, right: 350 }, modalWidth: 350, modalHeight: 200, isOpen });

  // ★ 이전 isOpen 상태를 추적하여 중복 실행 방지
  const prevIsOpenRef = useRef(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // isOpen이 false → true로 변경될 때만 데이터 로드
    if (isOpen && !prevIsOpenRef.current) {
      hasLoadedRef.current = false;
    }
    prevIsOpenRef.current = isOpen;

    if (isOpen && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setLoading(true);
      setDataSource('');

      // DB에서 마스터 공정 로드 (우선순위 1: CP 기초정보, 2: FMEA 마스터), 없으면 localStorage 폴백
      const loadData = async () => {
        // ★ cpNo를 전달하여 기초정보 API 우선 호출
        const loaded = await loadMasterProcessesFromDB(cpNo);
        let dataSourceLabel = '';

        // ★★★ 2026-02-16: DB Only 정책 - localStorage 폴백 제거 ★★★
        if (loaded.length > 0) {
          dataSourceLabel = cpNo ? 'CP 기초정보 (DB)' : 'CP Master (DB)';
          setDataSource(dataSourceLabel);
        } else {
          setDataSource('없음 - 직접 입력 필요');
        }

        setProcesses(loaded);

        // ★ 빈 행에서 클릭한 경우 사전 선택 비활성화
        if (isEmptyRow) {
          setSelectedIds(new Set());
          setInitialSelectedIds(new Set()); // 초기 선택 없음
        } else {
          const preSelected = new Set<string>();
          loaded.forEach(p => {
            if (existingProcessNames.includes(p.name)) {
              preSelected.add(p.id);
            }
          });
          setSelectedIds(preSelected);
          setInitialSelectedIds(new Set(preSelected)); // ★ 초기 선택 저장 (기존 공정)
        }
        setLoading(false);
      };

      loadData();
      setSearch('');
      setEditingId(null);
      // ✅ 연속입력 상태 초기화
      setContinuousMode(false);
      setAddedCount(0);
    }
  }, [isOpen, existingProcessNames, isEmptyRow, cpNo]);

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
      const numA = parseInt(a.no.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.no.replace(/\D/g, '')) || 0;
      return numA - numB;
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

  const handleSave = () => {
    // ★ 새로 선택된 공정만 저장 (기존 공정 제외)
    const newlySelected = processes.filter(p =>
      selectedIds.has(p.id) && !initialSelectedIds.has(p.id)
    );
    // ★ 공정번호 숫자 오름차순 정렬 (10, 20, 30, 100, 110 순서)
    const sortedSelected = [...newlySelected].sort((a, b) => {
      const numA = parseInt(String(a.no).replace(/\D/g, '')) || 0;
      const numB = parseInt(String(b.no).replace(/\D/g, '')) || 0;
      return numA - numB;
    });
    onSave(sortedSelected);
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

    setProcesses(prev => [newProc, ...prev]);
    setSelectedIds(prev => new Set([...prev, newProc.id]));

    // ★★★ 2026-02-16: localStorage 저장 제거 (DB Only 정책) ★★★
    // DB 저장: FMEA 마스터 API 호출
    try {
      fetch('/api/fmea/master-processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processNo: procNo, processName: newProc.name }),
      }).catch(e => console.error('DB 저장 오류:', e));
    } catch (e) {
      console.error('❌ [CP 모달] 저장 오류:', e);
    }

    // ✅ 연속입력 모드: 워크시트에 즉시 반영 + 새 행 추가
    if (continuousMode && onContinuousAdd) {
      onContinuousAdd(newProc, true);
      setAddedCount(prev => prev + 1);
    }

    setNewNo('');
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
            <span className="text-base">🏭</span>
            <h2 className="text-xs font-bold">공정명 선택(Process Name Select)</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded">닫기</button>
        </div>

        {/* 데이터 소스 + 연속입력 토글 */}
        <div className="px-3 py-1 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-green-700">공정명</span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] px-2 py-0.5 rounded ${dataSource.includes('Master') ? 'bg-blue-100 text-blue-700' : dataSource.includes('local') ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
              {loading ? '로딩중...' : `📂 ${dataSource} (${processes.length}개)`}
            </span>
            {/* 연속입력 토글 */}
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

        {/* 신규 공정 추가 */}
        <div className={`px-3 py-1.5 border-b flex items-center gap-1 ${continuousMode ? 'bg-purple-50' : 'bg-green-50'}`}>
          <span className={`text-[10px] font-bold shrink-0 ${continuousMode ? 'text-purple-700' : 'text-green-700'}`}>+</span>
          <input
            type="text"
            value={newNo}
            onChange={(e) => setNewNo(e.target.value)}
            placeholder="No"
            className={`w-12 px-1 py-0.5 text-[10px] border rounded focus:outline-none focus:ring-1 text-center ${continuousMode ? 'focus:ring-purple-500 border-purple-300' : 'focus:ring-green-500'
              }`}
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddNew(); } }}
            placeholder={continuousMode ? "입력 후 Enter → 즉시 반영 + 새 행 추가" : "공정명 입력..."}
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
              placeholder="🔍 공정명 또는 번호 검색..."
              className="w-full px-2 py-0.5 text-[9px] border rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          {/* 두 번째 줄: 버튼들 */}
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="px-3 py-1.5 text-[11px] font-bold bg-blue-500 text-white rounded hover:bg-blue-600">전체<span className="text-[8px] opacity-70 ml-0.5">(All)</span></button>
            <button onClick={deselectAll} className="px-3 py-1.5 text-[11px] font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">해제<span className="text-[8px] opacity-70 ml-0.5">(Clr)</span></button>
            <button onClick={handleSave} className="px-3 py-1.5 text-[11px] font-bold bg-green-600 text-white rounded hover:bg-green-700">적용<span className="text-[8px] opacity-70 ml-0.5">(OK)</span></button>
            {onDelete && (
              <button
                onClick={() => {
                  if (selectedIds.size > 0 && window.confirm(`선택한 ${selectedIds.size}개 공정을 삭제하시겠습니까?`)) {
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
                        <span className={`text-xs truncate block ${isSelected ? (isCurrent ? 'text-green-800 font-medium' : 'text-blue-800 font-medium') : 'text-gray-700'
                          }`}>
                          {proc.name}
                        </span>
                      )}
                    </div>
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

        {/* 푸터 - 새로 선택된 수 표시 */}
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-500">전체 {selectedIds.size}개</span>
          <span className="text-xs font-bold text-blue-600">✓ 신규 {Array.from(selectedIds).filter(id => !initialSelectedIds.has(id)).length}개 추가</span>
        </div>
      </div>
    </div>
  );
}

