/**
 * @file ProcessSelectModal.tsx
 * @description 공정 선택 모달 - 표준화된 컴팩트 테이블 형태
 * @version 2.0.0 - 표준화
 * @updated 2025-12-29
 */

// CODEFREEZE: DB Only 정책 적용 완료 (2026-02-16) - localStorage pfmea_master_data 폴백 제거
'use client';

import { createPortal } from 'react-dom';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDraggableModal } from '@/components/modals/useDraggableModal';
import { MODAL_COMPACT, MODAL_CONTAINER, ACTION_ICONS } from '@/styles/modal-compact';
import { deleteL2Structure } from './hooks/useAtomicView';
import { saveNow } from './hooks/useSaveEvent';
import { toast } from '@/hooks/useToast';

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
  onDelete?: (processIds: string[]) => void | Promise<void>;
  existingProcessNames?: string[];
  existingProcessesInfo?: ProcessWithL3Info[];
  existingProcesses?: ProcessItem[];
  productLineName?: string;
  fmeaId?: string;
  onContinuousAdd?: (process: ProcessItem, addNewRow: boolean) => void;
  // ★ 2026-03-27: atomicDB 직접 수정용
  atomicDB?: any;
  setAtomicDB?: (db: any) => void;
}

// DB에서 마스터 FMEA 공정 로드 (4단계 fallback 체인 — API 레벨에서 처리)
const loadMasterProcessesFromDB = async (fmeaId?: string): Promise<{
  processes: ProcessItem[];
  sourceFmeaId?: string;
  datasetName?: string;
}> => {
  try {
    const url = fmeaId
      ? `/api/fmea/master-processes?fmeaId=${encodeURIComponent(fmeaId)}`
      : '/api/fmea/master-processes';
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return {
        processes: data.processes || [],
        sourceFmeaId: data.sourceFmeaId,
        datasetName: data.datasetName,
      };
    }
  } catch (e) {
    console.error('마스터 공정 로드 실패:', e);
  }
  return { processes: [] };
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
  fmeaId,
  onContinuousAdd,
  existingProcesses = [],
  atomicDB,
  setAtomicDB,
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
  const [sourceFmeaId, setSourceFmeaId] = useState<string | undefined>();

  // ★ 공정명 수정 추적 (processNo → 수정된 이름)
  const [modifiedProcesses, setModifiedProcesses] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);

  // ✅ 연속입력 모드 상태
  const [continuousMode, setContinuousMode] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const { position: modalPosition, handleMouseDown } =
    // ★★★ 2026-02-05: WorkElementSelectModal과 위치/크기 통일 ★★★
    useDraggableModal({ initialPosition: { top: 40, right: 360 }, modalWidth: 400, modalHeight: 700, isOpen });

  // ★★★ 2026-02-07: 데이터 로딩은 모달 열릴 때만 (isOpen만 의존) ★★★
  // existingProcessNames 변경 시 재로딩하면 삭제가 무효화되므로 제거
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setDataSource('');

    const loadData = async () => {
      try {
        // ★★★ 4단계 Fallback 체인 — API 레벨에서 처리 (master-processes route) ★★★
        const result = await loadMasterProcessesFromDB(fmeaId);
        let loaded = result.processes;

        if (loaded.length > 0) {
          // sourceFmeaId가 현재 fmeaId와 다르면 → 마스터에서 가져온 것임을 표시
          const src = result.sourceFmeaId && result.sourceFmeaId !== fmeaId
            ? `Master BD (${result.sourceFmeaId})`
            : 'Master FMEA (DB)';
          setDataSource(src);
          setSourceFmeaId(result.sourceFmeaId);
        } else {
          setDataSource('없음 - 직접 입력 필요');
          setSourceFmeaId(undefined);
        }

        // 워크시트 수정 이름 오버레이
        const wsNoMap = new Map(existingProcesses.map(p => [p.no, p]));
        loaded = loaded.map(p => {
          const wsProc = wsNoMap.get(p.no);
          return (wsProc && wsProc.name !== p.name) ? { ...p, name: wsProc.name } : p;
        });

        // 워크시트에만 있는 공정 추가 (수동 입력된 공정)
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

  // 정렬 없음 — DB/로드 순서 그대로 (공정번호 재정렬 시 화면과 적용 순서가 달라져 혼동 방지)
  const filteredProcesses = useMemo(() => {
    if (!search.trim()) return processes;
    const q = search.toLowerCase();
    return processes.filter(p =>
      p.no.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
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

  // ★★★ 2026-02-16: 삭제 = 워크시트에서만 삭제 (마스터 DB 유지) ★★★
  const clearAndSave = async () => {
    if (selectedIds.size === 0) {
      if (!window.confirm('워크시트의 모든 공정을 삭제하시겠습니까?')) return;
      if (!atomicDB || !setAtomicDB) {
        toast.error('구조 DB(Atomic)가 준비되지 않아 공정을 비울 수 없습니다. 잠시 후 다시 시도하거나 새로고침해 주세요.');
        return;
      }
      onSave([]);
      return;
    }

    // 선택된 항목 중 워크시트에 있는 것만 삭제
    const selectedToDelete = processes.filter(p => selectedIds.has(p.id));
    const worksheetTargets = selectedToDelete.filter(p =>
      existingProcessNames.includes(p.name) || existingProcesses.some(ep => ep.no === p.no)
    );
    if (worksheetTargets.length === 0) {
      alert('워크시트에 등록된 공정만 삭제할 수 있습니다.');
      return;
    }
    if (!window.confirm(`선택된 ${worksheetTargets.length}개 공정을 삭제하시겠습니까?`)) return;

    if (!atomicDB || !setAtomicDB) {
      toast.error('구조 DB(Atomic)가 준비되지 않아 삭제를 반영할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    // ★ atomicDB 직접 수정 + 즉시 저장
    if (atomicDB && setAtomicDB) {
      const deleteNos = new Set(worksheetTargets.map(p => p.no));
      const deleteL2Ids = (atomicDB.l2Structures || [])
        .filter((l2: any) => deleteNos.has(l2.no))
        .map((l2: any) => l2.id);
      let newDB = atomicDB;
      for (const id of deleteL2Ids) {
        newDB = deleteL2Structure(newDB, id);
      }
      setAtomicDB(newDB);
      await saveNow(newDB);
    }

    // state 동기화는 onDelete로
    if (onDelete) onDelete(worksheetTargets.map(p => p.no));

    setSelectedIds(new Set());
    // 모달 목록에서도 제거
    const deletedNos = new Set(worksheetTargets.map(p => p.no));
    setProcesses(prev => prev.filter(p => !deletedNos.has(p.no)));
  };

  // ★★★ 2026-02-07: 적용 = 선택된 새 공정만 추가 (기존 공정 건드리지 않음) ★★★
  const handleSave = () => {
    // 화면( filteredProcesses ) 순서 = 적용 순서 — 별도 공정번호 정렬 없음
    const selected = filteredProcesses.filter(p => selectedIds.has(p.id));

    if (selected.length === 0) {
      alert('추가할 공정을 선택해주세요.\n(Please select processes to add.)');
      return;
    }

    if (!atomicDB || !setAtomicDB) {
      toast.error('구조 DB(Atomic)가 준비되지 않아 공정을 적용할 수 없습니다. 잠시 후 다시 시도하거나 새로고침해 주세요.');
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
        body: JSON.stringify({ updates, fmeaId }),
      });
      const data = await res.json();

      if (data.success) {
        // 워크시트에도 반영 (수정된 공정만 onSave로 전달)
        const modifiedItems = processes.filter(p => modifiedProcesses.has(p.no));
        if (modifiedItems.length > 0) {
          if (!atomicDB || !setAtomicDB) {
            toast.error('구조 DB(Atomic)가 준비되지 않아 워크시트에 공정명을 반영할 수 없습니다.');
          } else {
            onSave(modifiedItems);
          }
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

  // ★★★ 2026-03-27: ID 기반 매칭만 사용 (이름/번호 매칭 제거) ★★★
  const existingProcessIds = new Set(existingProcesses.map(p => p.id));
  const isInWorksheet = (proc: ProcessItem) => existingProcessIds.has(proc.id);

  // ★★★ 2026-02-07: X 버튼 = 워크시트에서 해당 공정 삭제 (onDelete 콜백 사용) ★★★
  const handleDeleteSingle = (proc: ProcessItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // ★★★ 2026-03-27: ID 기반 매칭만 사용 ★★★
    // 워크시트에 없는 공정이면 무시
    if (!existingProcessIds.has(proc.id)) return;

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

  // ★ 미적용 항목을 이 FMEA 데이터셋에서 삭제
  const handleDeleteFromDataset = async (proc: ProcessItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`"${proc.no} ${proc.name}" 을(를) 목록에서 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch('/api/fmea/master-processes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processNos: [proc.no], fmeaId }),
      });
      const data = await res.json();
      if (data.success) {
        setProcesses(prev => prev.filter(p => p.no !== proc.no));
      }
    } catch (err) {
      console.error('데이터셋 삭제 오류:', err);
    }
  };

  // 신규 공정 추가 → DB 저장 → 워크시트 저장
  const handleAddNew = () => {
    if (!newName.trim()) return;

    const trimmedName = newName.trim();
    const trimmedNo = newNo.trim();
    
    if (processes.some(p => p.name === trimmedName)) {
      alert(`"${trimmedName}" 공정이 이미 목록에 있습니다.`);
      return;
    }

    // 공정번호 자동 생성
    const maxNo = processes.reduce((max, p) => Math.max(max, parseInt(p.no.replace(/\D/g, '') || '0', 10)), 0);
    const procNo = trimmedNo || String(maxNo + 10 || 10);

    setNewNo('');
    setNewName('');

    // DB에 저장 후 ID 받아서 사용
    fetch('/api/fmea/master-processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processNo: procNo, processName: trimmedName, fmeaId }),
    })
      .then(res => res.json())
      .then(data => {
        const dbId = data.id || `proc_new_${Date.now()}`;
        const newProc: ProcessItem = { id: dbId, no: procNo, name: trimmedName };
        
        setProcesses(prev => [newProc, ...prev]);
        
        // 워크시트에 저장
        onSave([...existingProcesses, newProc]);
        
        if (continuousMode && onContinuousAdd) {
          onContinuousAdd(newProc, true);
          setAddedCount(prev => prev + 1);
        }
      })
      .catch(e => console.error('[ProcessSelectModal] DB 저장 오류:', e));
  };

  if (!isOpen) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* 2026-01-19: 배경을 클릭 통과하도록 변경 - 다른 항목 클릭 시 자동 전환 */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
      />
      <div
        className="fixed bg-white rounded-lg shadow-2xl w-[400px] max-w-[400px] min-w-[400px] flex flex-col overflow-hidden max-h-[calc(100vh-40px)] cursor-move z-[9999] pointer-events-auto"
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
            <span className={`text-[9px] px-2 py-0.5 rounded ${dataSource.includes('Master') || dataSource.includes('BD') ? 'bg-blue-100 text-blue-700' : dataSource.includes('실패') ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
              {loading ? '⏳ 로딩중...' : `📂 ${dataSource} (${processes.length}개)`}
            </span>
            {!loading && sourceFmeaId && sourceFmeaId !== fmeaId && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300" title={`Master BD 출처: ${sourceFmeaId}`}>
                ← {sourceFmeaId}
              </span>
            )}
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
          {/* 버튼 영역 제거 — 각 섹션(적용됨/미적용)에 개별 버튼 배치 */}
        </div>

        {/* 컴팩트 테이블 - 고정 높이 */}
        <div className="overflow-auto p-2 flex-1 min-h-[400px]">
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
          ) : (() => {
            const inWorksheet = filteredProcesses.filter(p => isInWorksheet(p));
            const notInWorksheet = filteredProcesses.filter(p => !isInWorksheet(p));

            const renderRow = (proc: ProcessItem) => {
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
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected
                      ? isCurrent ? 'bg-green-500 border-green-500' : 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                      }`}>
                      {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded min-w-[28px] text-center">
                      {proc.no}
                    </span>
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
                    {/* 미적용 항목에만 X 삭제 (이 FMEA 데이터셋에서 삭제) */}
                    {!isCurrent && (
                      <button
                        onClick={(e) => handleDeleteFromDataset(proc, e)}
                        className="text-red-400 hover:text-red-600 text-xs shrink-0"
                        title="목록에서 삭제"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
            };

            return (
              <div>
                {/* 워크시트에 있는 공정 */}
                {inWorksheet.length > 0 && (
                  <div className="mb-2">
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-green-50 px-2 py-1 rounded mb-1">
                      <span className="text-[10px] font-bold text-green-700">✅ 적용됨 ({inWorksheet.length}개)</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { const ids = new Set(selectedIds); inWorksheet.forEach(p => ids.add(p.id)); setSelectedIds(ids); }} className="text-[11px] px-2.5 py-1 font-bold bg-blue-500 text-white rounded hover:bg-blue-600">전체</button>
                        <button onClick={() => { const ids = new Set(selectedIds); inWorksheet.forEach(p => ids.delete(p.id)); setSelectedIds(ids); }} className="text-[11px] px-2.5 py-1 font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">해제</button>
                        <button onClick={clearAndSave} className="text-[11px] px-2.5 py-1 font-bold bg-red-500 text-white rounded hover:bg-red-600">삭제</button>
                      </div>
                    </div>
                    <div className={`overflow-y-auto ${notInWorksheet.length > 0 ? 'max-h-[180px]' : 'max-h-[400px]'}`}>
                      <div className="grid grid-cols-2 gap-1">
                        {inWorksheet.map(renderRow)}
                      </div>
                    </div>
                  </div>
                )}
                {/* 워크시트에 없는 공정 */}
                {notInWorksheet.length > 0 && (
                  <div>
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-100 px-2 py-1 rounded mb-1">
                      <span className="text-[10px] font-bold text-gray-500">미적용 ({notInWorksheet.length}개)</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { const ids = new Set(selectedIds); notInWorksheet.forEach(p => ids.add(p.id)); setSelectedIds(ids); }} className="text-[11px] px-2.5 py-1 font-bold bg-blue-500 text-white rounded hover:bg-blue-600">전체</button>
                        <button onClick={() => { const ids = new Set(selectedIds); notInWorksheet.forEach(p => ids.delete(p.id)); setSelectedIds(ids); }} className="text-[11px] px-2.5 py-1 font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">해제</button>
                        <button onClick={handleSave} className="text-[11px] px-2.5 py-1 font-bold bg-green-600 text-white rounded hover:bg-green-700">적용</button>
                      </div>
                    </div>
                    <div className={`overflow-y-auto ${inWorksheet.length > 0 ? 'max-h-[220px]' : 'max-h-[400px]'}`}>
                      <div className="grid grid-cols-2 gap-1">
                        {notInWorksheet.map(renderRow)}
                      </div>
                    </div>
                  </div>
                )}
                {inWorksheet.length === 0 && notInWorksheet.length === 0 && (
                  <div className="grid grid-cols-2 gap-1">
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-100 bg-gray-50/50">
                        <div className="w-4 h-4 rounded border border-gray-200 bg-white shrink-0" />
                        <span className="text-[10px] font-bold text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded min-w-[28px] text-center">--</span>
                        <span className="flex-1 text-xs text-gray-300">-</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
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
