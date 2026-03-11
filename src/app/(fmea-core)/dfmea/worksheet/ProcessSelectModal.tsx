/**
 * @file ProcessSelectModal.tsx
 * @description 공정 선택 모달 - 표준화된 컴팩트 테이블 형태
 * @version 2.0.0 - 표준화
 * @updated 2025-12-29
 */

// CODEFREEZE: DB Only 정책 적용 완료 (2026-02-16) - localStorage dfmea_master_data 폴백 제거
'use client';

import { createPortal } from 'react-dom';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDraggableModal } from '@/components/modals/useDraggableModal';
import { MODAL_COMPACT, MODAL_CONTAINER, ACTION_ICONS } from '@/styles/modal-compact';

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
  /** ★ 워크시트 현재 공정 목록 (no 기준 매칭 + 수정된 이름 반영) */
  existingProcesses?: ProcessItem[];
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
        return data.processes;
      }
    }
  } catch (e) {
    console.error('마스터 공정 로드 실패:', e);
  }
  return [];
};

// ★★★ 2026-02-16: localStorage 폴백 함수 제거 (DB Only 정책) ★★★
// loadProcessesFromBasicInfo, loadCustomProcesses 삭제됨

export default function ProcessSelectModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  existingProcessNames = [],
  existingProcessesInfo = [],
  productLineName = '완제품 제조라인',
  onContinuousAdd,
  existingProcesses = [],
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

  // ★ 공정명 수정 추적 (processNo → 수정된 이름)
  const [modifiedProcesses, setModifiedProcesses] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);

  // ✅ 연속입력 모드 상태
  const [continuousMode, setContinuousMode] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const { position: modalPosition, handleMouseDown } =
    // ★★★ 2026-02-05: WorkElementSelectModal과 위치/크기 통일 ★★★
    useDraggableModal({ initialPosition: { top: 60, right: 360 }, modalWidth: 400, modalHeight: 500, isOpen });

  // ★★★ 2026-02-07: 데이터 로딩은 모달 열릴 때만 (isOpen만 의존) ★★★
  // existingProcessNames 변경 시 재로딩하면 삭제가 무효화되므로 제거
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setDataSource('');

    const loadData = async () => {
      try {
        // ★★★ 2026-02-16: DB Only 정책 - localStorage 폴백 제거 ★★★
        let loaded = await loadMasterProcessesFromDB();

        if (loaded.length > 0) {
          setDataSource('Master FMEA (DB)');
        } else {
          setDataSource('없음 - 직접 입력 필요');
        }

        // 워크시트 수정 이름 오버레이
        const wsNoMap = new Map(existingProcesses.map(p => [p.no, p]));
        loaded = loaded.map(p => {
          const wsProc = wsNoMap.get(p.no);
          return (wsProc && wsProc.name !== p.name) ? { ...p, name: wsProc.name } : p;
        });

        // 워크시트에만 있는 공정 추가
        const loadedNos = new Set(loaded.map(p => p.no));
        existingProcesses.forEach(wp => {
          if (wp.no && wp.name && !loadedNos.has(wp.no)) {
            loaded.push({ id: wp.id, no: wp.no, name: wp.name });
          }
        });

        setProcesses(loaded);
        setSelectedIds(new Set());
      } catch (e) {
        console.error('공정 데이터 로드 실패:', e);
        setDataSource('로드 실패');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    setSearch('');
    setEditingId(null);
    setModifiedProcesses(new Map());
    setContinuousMode(false);
    setAddedCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  // ★★★ 2026-02-16: 삭제 = 워크시트에서만 삭제 (마스터 DB 유지) ★★★
  const clearAndSave = () => {
    // 선택된 항목이 있으면 → 선택된 항목만 워크시트에서 삭제
    if (selectedIds.size > 0) {
      const selectedToDelete = processes.filter(p => selectedIds.has(p.id));
      const selectedNames = selectedToDelete.map(p => p.name);

      // 워크시트에 있는 항목 분류
      const worksheetTargets = selectedToDelete.filter(p =>
        existingProcessNames.includes(p.name) || existingProcesses.some(ep => ep.no === p.no)
      );

      if (worksheetTargets.length === 0) {
        alert('워크시트에 등록된 공정만 삭제할 수 있습니다.\n(Only processes registered in the worksheet can be deleted.)');
        return;
      }

      // 삭제 대상 중 하위 데이터가 있는 것 확인
      const deleteTargetsWithL3 = existingProcessesInfo.filter(p =>
        selectedNames.includes(p.name) && p.l3Count > 0
      );
      const totalL3ToDelete = deleteTargetsWithL3.reduce((sum, p) => sum + p.l3Count, 0);

      const parts: string[] = [];
      parts.push(`선택된 ${worksheetTargets.length}개 공정을 워크시트에서 삭제하시겠습니까?\n(Delete ${worksheetTargets.length} selected processes from worksheet?)`);
      if (totalL3ToDelete > 0) parts.push(`• 하위 작업요소: ${totalL3ToDelete}개도 함께 삭제(${totalL3ToDelete} sub-elements will also be deleted)`);
      parts.push(`※ 마스터 기초정보는 유지됩니다.(Master data will be preserved.)`);

      if (!window.confirm(`⚠️ ${parts.join('\n')}`)) return;

      // 워크시트에서만 삭제 (마스터 DB는 건드리지 않음)
      if (onDelete) {
        const deleteNos = worksheetTargets.map(p => p.no);
        onDelete(deleteNos);
      }

      setSelectedIds(new Set());
      onClose();
      return;
    }

    // 선택된 항목이 없으면 → 전체 삭제
    const totalL3Count = existingProcessesInfo.reduce((sum, p) => sum + p.l3Count, 0);
    const message = `⚠️ 워크시트의 모든 공정을 삭제하시겠습니까?\n(Delete all processes from worksheet?)\n\n` +
      `• 공정(Processes): ${existingProcessNames.length}개\n` +
      `• 하위 작업요소(Sub-elements): ${totalL3Count}개\n` +
      `※ 마스터 기초정보는 유지됩니다.(Master data will be preserved.)`;

    if (!window.confirm(message)) return;
    onSave([]);  // 빈 배열 → StructureTab에서 전체 삭제 처리
    onClose();
  };

  // ★★★ 2026-02-07: 적용 = 선택된 새 공정만 추가 (기존 공정 건드리지 않음) ★★★
  const handleSave = () => {
    const selected = processes.filter(p => selectedIds.has(p.id));

    if (selected.length === 0) {
      alert('추가할 공정을 선택해주세요.\n(Please select processes to add.)');
      return;
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
      const proc = processes.find(p => p.id === editingId);
      if (proc && editValue.trim() !== proc.name) {
        setProcesses(prev => prev.map(p =>
          p.id === editingId ? { ...p, name: editValue.trim() } : p
        ));
        // 수정 추적 (processNo 기준)
        setModifiedProcesses(prev => {
          const next = new Map(prev);
          next.set(proc.no, editValue.trim());
          return next;
        });
      }
    }
    setEditingId(null);
  };

  // ★ 수정된 공정명 DB 저장
  const handleSaveModified = async () => {
    if (modifiedProcesses.size === 0) return;
    setSaving(true);
    try {
      const updates = Array.from(modifiedProcesses.entries()).map(([processNo, name]) => ({
        processNo,
        name,
      }));

      const res = await fetch('/api/fmea/master-processes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();

      if (data.success) {
        // 워크시트에도 반영 (수정된 공정만 onSave로 전달)
        const modifiedItems = processes.filter(p => modifiedProcesses.has(p.no));
        if (modifiedItems.length > 0) {
          onSave(modifiedItems);
        }
        setModifiedProcesses(new Map());
      } else {
        alert(`저장 실패(Save failed): ${data.error || '알 수 없는 오류(Unknown error)'}`);
      }
    } catch (e) {
      console.error('공정명 DB 저장 오류:', e);
      alert('저장 중 오류가 발생했습니다.\n(An error occurred while saving.)');
    } finally {
      setSaving(false);
    }
  };

  // ★★★ 2026-02-07: X 버튼 = 워크시트에서 해당 공정 삭제 (onDelete 콜백 사용) ★★★
  const handleDeleteSingle = (proc: ProcessItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // 워크시트에 없는 공정이면 무시
    const isInWorksheet = existingProcessNames.includes(proc.name) ||
      existingProcesses.some(p => p.no === proc.no);
    if (!isInWorksheet) return;

    const procInfo = existingProcessesInfo.find(p => p.name === proc.name);
    const l3Count = procInfo?.l3Count || 0;

    const message = l3Count > 0
      ? `"${proc.no} ${proc.name}" 공정과 하위 ${l3Count}개 작업요소를 삭제하시겠습니까?\n(Delete process "${proc.no} ${proc.name}" and ${l3Count} sub-elements?)`
      : `"${proc.no} ${proc.name}" 공정을 워크시트에서 삭제하시겠습니까?\n(Delete process "${proc.no} ${proc.name}" from worksheet?)`;

    if (!window.confirm(message)) return;

    // onDelete 콜백으로 삭제 요청 (공정번호 기준)
    if (onDelete) {
      onDelete([proc.no]);
    }
    // 모달 유지
  };

  // ★ 워크시트에 등록된 공정인지 확인 (이름 또는 번호 매칭)
  const isInWorksheet = (proc: ProcessItem) =>
    existingProcessNames.includes(proc.name) || existingProcesses.some(p => p.no === proc.no);

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

    // ★★★ 2026-02-07: 마스터 DB에 즉시 저장 (localStorage 폴백) ★★★
    fetch('/api/fmea/master-processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processNo: procNo, processName: newProc.name }),
    }).then(res => res.json()).then(data => {
      if (!data.success) {
        console.error('DB 저장 실패, localStorage 폴백:', data.error);
      }
    }).catch(e => {
      console.error('DB 저장 오류:', e);
    });

    // ✅ 연속입력 모드: 워크시트에 즉시 반영 + 새 행 추가
    if (continuousMode && onContinuousAdd) {
      onContinuousAdd(newProc, true); // 새 행 추가 요청
      setAddedCount(prev => prev + 1);
    } else {
      // ✅ 2026-02-07: 수동추가 후 워크시트에 즉시 반영 + 모달 닫기 (자동모드 동일)
      const currentSelected = processes.filter(p => selectedIds.has(p.id));
      onSave([...currentSelected, newProc]);
      onClose();
    }

    setNewNo('');
    setNewName('');
  };

  if (!isOpen) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* ✅ 2026-01-19: 배경을 클릭 통과하도록 변경 - 다른 항목 클릭 시 자동 전환 */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
      />
      <div
        className="fixed bg-white rounded-lg shadow-2xl w-[400px] max-w-[400px] min-w-[400px] flex flex-col overflow-hidden max-h-[calc(100vh-80px)] cursor-move z-[9999] pointer-events-auto"
        style={{
          top: `${modalPosition.top}px`,
          right: `${modalPosition.right}px`
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* 헤더 - 드래그 가능 (주황색 + 빨간 닫기) */}
        <div
          className={`flex items-center justify-between ${MODAL_COMPACT.header.padding} bg-gradient-to-r from-orange-500 to-orange-600 text-white cursor-move select-none`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-yellow-300 text-[11px] font-bold">선택입력 :</span>
            <span className="text-sm">🏭</span>
            <h2 className="text-[11px] font-bold">메인공정명 선택(Select Process)</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded font-bold">{ACTION_ICONS.close} 닫기</button>
        </div>

        {/* ===== 상위항목 고정 표시 (컴팩트) ===== */}
        <div className={`${MODAL_COMPACT.parentInfo.padding} border-b bg-gradient-to-r from-red-50 to-orange-50 flex items-center gap-2`}>
          <span className="text-[11px] font-bold text-red-700 shrink-0">★ 상위항목(Parent):</span>
          <span className="text-[9px] text-gray-600 font-bold">완제품공정명(Product Process):</span>
          <span className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded">{productLineName}</span>
        </div>

        {/* ===== 하위항목 라벨 + 데이터 소스 + 연속입력 토글 ===== */}
        <div className="px-3 py-1 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-green-700">▼ 하위항목(Child): 메인공정명(Main Process)</span>
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

        {/* ===== 신규 공정 추가 ===== */}
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

        {/* 검색 + 버튼: [전체][해제][적용][삭제] (컴팩트) */}
        <div className={`${MODAL_COMPACT.searchBar.padding} border-b bg-gray-50`}>
          {/* 첫 줄: 검색 */}
          <div className="mb-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 공정명 또는 번호 검색..."
              className={`w-full px-2 py-0.5 ${MODAL_COMPACT.searchBar.fontSize} border rounded focus:ring-1 focus:ring-blue-500 outline-none`}
            />
          </div>
          {/* 두 번째 줄: 버튼들 (컴팩트: 가로 배치) */}
          <div className="flex items-center gap-1">
            <button onClick={selectAll} className={`${MODAL_COMPACT.button.icon} font-bold bg-blue-500 text-white rounded hover:bg-blue-600`}>{ACTION_ICONS.selectAll} 전체</button>
            <button onClick={deselectAll} className={`${MODAL_COMPACT.button.icon} font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400`}>{ACTION_ICONS.deselectAll} 해제</button>
            <button onClick={handleSave} className={`${MODAL_COMPACT.button.icon} font-bold bg-green-600 text-white rounded hover:bg-green-700`}>{ACTION_ICONS.apply} 적용</button>
            <button
              onClick={handleSaveModified}
              disabled={modifiedProcesses.size === 0 || saving}
              className={`${MODAL_COMPACT.button.icon} font-bold rounded ${modifiedProcesses.size > 0
                ? 'bg-orange-500 text-white hover:bg-orange-600 ring-2 ring-orange-300'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? '⏳' : '💾'} 저장{modifiedProcesses.size > 0 ? `(${modifiedProcesses.size})` : ''}
            </button>
            <button onClick={clearAndSave} className={`${MODAL_COMPACT.button.icon} font-bold bg-red-500 text-white rounded hover:bg-red-600`}>{ACTION_ICONS.delete} 삭제</button>
          </div>
        </div>

        {/* 컴팩트 테이블 - 고정 높이 */}
        <div className="overflow-auto p-2 h-80 min-h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">마스터 공정 데이터 로딩중...(Loading master data...)</p>
              </div>
            </div>
          ) : processes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg mb-2">📭</p>
                <p className="text-xs text-gray-500 mb-2">등록된 공정이 없습니다(No processes registered)</p>
                <p className="text-[10px] text-gray-400">위 입력창에서 직접 추가해주세요(Add manually above)</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {filteredProcesses.map(proc => {
                const isSelected = selectedIds.has(proc.id);
                const isCurrent = isInWorksheet(proc);
                const isEditing = editingId === proc.id;
                const isModified = modifiedProcesses.has(proc.no);

                return (
                  <div
                    key={proc.id}
                    onClick={() => toggleSelect(proc.id)}
                    onDoubleClick={() => handleDoubleClick(proc)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-all ${isModified
                      ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-300'
                      : isSelected
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
    </>,
    document.body
  );
}
