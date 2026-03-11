/**
 * @file WorkElementSelectModal.tsx
 * @description 작업요소 선택 모달 - 표준화된 형태
 * @version 3.0.0 - 표준화 적용
 * @updated 2025-12-29
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface WorkElement {
  id: string;
  m4: string;
  name: string;
  processNo?: string;
}

interface ProcessItem {
  id: string;
  no: string;
  name: string;
}

interface WorkElementSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedElements: WorkElement[]) => void;
  onDelete?: (deletedNames: string[]) => void;
  processNo?: string;
  processName?: string;
  existingElements?: string[];
  processList?: ProcessItem[];
  onProcessChange?: (processNo: string) => void;
  // ✅ 연속입력 모드: 저장 시 워크시트에 즉시 반영 + 새 행 추가
  onContinuousAdd?: (element: WorkElement, addNewRow: boolean) => void;
}

const M4_OPTIONS = [
  { id: 'MN', label: 'MN', bg: '#e8f5e9', text: '#2e7d32' },
  { id: 'MC', label: 'MC', bg: '#e3f2fd', text: '#1565c0' },
  { id: 'IM', label: 'IM', bg: '#fff3e0', text: '#e65100' },
  { id: 'EN', label: 'EN', bg: '#fce4ec', text: '#c2185b' },
];

// 공정별 작업요소 데이터
const WORK_ELEMENTS_BY_PROCESS: Record<string, WorkElement[]> = {
  'COMMON': [
    { id: 'c1', m4: 'MN', name: '00작업자', processNo: 'COMMON' },
    { id: 'c2', m4: 'MN', name: '00셋업 엔지니어', processNo: 'COMMON' },
    { id: 'c3', m4: 'MN', name: '00검사원', processNo: 'COMMON' },
    { id: 'c4', m4: 'MN', name: '00보전원', processNo: 'COMMON' },
    { id: 'c5', m4: 'MN', name: '00 운반원', processNo: 'COMMON' },
    { id: 'c6', m4: 'EN', name: '00 온도', processNo: 'COMMON' },
    { id: 'c7', m4: 'EN', name: '00 습도', processNo: 'COMMON' },
  ],
  '10': [
    { id: '10-1', m4: 'MC', name: '10자동창고', processNo: '10' },
    { id: '10-2', m4: 'MC', name: '10컨베이어', processNo: '10' },
    { id: '10-3', m4: 'IM', name: '10원자재', processNo: '10' },
  ],
  '11': [
    { id: '11-1', m4: 'MC', name: '11가온실', processNo: '11' },
    { id: '11-2', m4: 'MC', name: '11히터', processNo: '11' },
  ],
  '20': [
    { id: '20-1', m4: 'MC', name: '20MOONEY VISCOMETER', processNo: '20' },
    { id: '20-2', m4: 'MC', name: '20경도계', processNo: '20' },
    { id: '20-3', m4: 'MC', name: '20비중계', processNo: '20' },
  ],
  '30': [
    { id: '30-1', m4: 'MC', name: '30믹서', processNo: '30' },
    { id: '30-2', m4: 'MC', name: '30밴버리', processNo: '30' },
    { id: '30-3', m4: 'IM', name: '30배합제', processNo: '30' },
  ],
  '40': [
    { id: '40-1', m4: 'MC', name: '40압출기', processNo: '40' },
    { id: '40-2', m4: 'MC', name: '40다이', processNo: '40' },
  ],
};

const loadWorkElements = (processNo: string): WorkElement[] => {
  const common = WORK_ELEMENTS_BY_PROCESS['COMMON'] || [];
  const process = WORK_ELEMENTS_BY_PROCESS[processNo] || [];
  return [...common, ...process];
};

export default function WorkElementSelectModal({ 
  isOpen, 
  onClose, 
  onSave,
  onDelete,
  processNo = '',
  processName = '',
  existingElements = [],
  processList = [],
  onProcessChange,
  onContinuousAdd,
}: WorkElementSelectModalProps) {
  const [elements, setElements] = useState<WorkElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterM4, setFilterM4] = useState('all');
  const [currentProcessNo, setCurrentProcessNo] = useState(processNo);
  const [newValue, setNewValue] = useState('');
  const [newM4, setNewM4] = useState('MN');
  
  // ✅ 연속입력 모드 상태
  const [continuousMode, setContinuousMode] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  // 초기화
  useEffect(() => {
    if (isOpen && processNo) {
      setCurrentProcessNo(processNo);
      const loaded = loadWorkElements(processNo);
      setElements(loaded);
      
      const preSelected = new Set<string>();
      loaded.forEach(e => {
        if (existingElements.includes(e.name)) {
          preSelected.add(e.id);
        }
      });
      setSelectedIds(preSelected);
      setSearch('');
      setFilterM4('all');
      setNewValue('');
      // ✅ 연속입력 상태 초기화
      setContinuousMode(false);
      setAddedCount(0);
    }
  }, [isOpen, processNo, existingElements]);

  // 공정 변경
  const handleProcessChange = (newProcNo: string) => {
    setCurrentProcessNo(newProcNo);
    const loaded = loadWorkElements(newProcNo);
    setElements(loaded);
    setSelectedIds(new Set());
    onProcessChange?.(newProcNo);
  };

  // 필터링
  const filteredElements = useMemo(() => {
    let result = elements;
    if (filterM4 !== 'all') {
      result = result.filter(e => e.m4 === filterM4);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q));
    }
    return result;
  }, [elements, filterM4, search]);

  // 선택 토글
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  // 전체 선택/해제
  const selectAll = () => setSelectedIds(new Set(filteredElements.map(e => e.id)));
  const deselectAll = () => setSelectedIds(new Set());

  // 모두 삭제
  const handleDeleteAll = () => {
    if (!confirm(`모든 작업요소를 삭제하시겠습니까?`)) return;
    onSave([]);
    onClose();
  };

  // 적용
  const handleApply = () => {
    const selected = elements.filter(e => selectedIds.has(e.id));
    onSave(selected);
    onClose();
  };

  // 새 항목 저장 (DB)
  const handleAddSave = () => {
    if (!newValue.trim()) return;
    const newElem: WorkElement = {
      id: `new_${Date.now()}`,
      m4: newM4,
      name: newValue.trim(),
      processNo: currentProcessNo,
    };
    setElements(prev => [...prev, newElem]);
    setSelectedIds(prev => new Set([...prev, newElem.id]));
    
    // localStorage에 영구 저장
    try {
      const savedData = localStorage.getItem('pfmea_master_data') || '[]';
      const masterData = JSON.parse(savedData);
      masterData.push({
        id: newElem.id,
        code: 'A5',
        value: newElem.name,
        m4: newElem.m4,
        processNo: currentProcessNo,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('pfmea_master_data', JSON.stringify(masterData));
    } catch (e) {
      console.error('DB 저장 오류:', e);
    }
    
    setNewValue('');
  };

  // 개별 삭제
  const handleDeleteSingle = (elem: WorkElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`"${elem.name}" 삭제?`)) return;
    const newSelectedIds = new Set(selectedIds);
    newSelectedIds.delete(elem.id);
    const selected = elements.filter(el => newSelectedIds.has(el.id));
    onSave(selected);
    onClose();
  };

  const getM4Style = (m4: string) => {
    const opt = M4_OPTIONS.find(o => o.id === m4);
    return opt ? { background: opt.bg, color: opt.text } : {};
  };

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
        {/* ===== 헤더: 제목 ===== */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-2">
            <span>🔧</span>
            <h2 className="text-xs font-bold">작업요소 선택 - (클릭하여 공정 선택)</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded">닫기</button>
        </div>

        {/* ===== 상위항목(공정) 고정 표시 ===== */}
        <div className="px-3 py-2 border-b bg-gradient-to-r from-red-50 to-orange-50 flex items-center gap-2">
          <span className="text-[11px] font-bold text-red-700 shrink-0">★ 상위항목:</span>
          <span className="text-[9px] text-gray-600 font-bold">공정명:</span>
          <span className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded">
            {currentProcessNo} {processName}
          </span>
        </div>

        {/* ===== 4M 필터 + 검색 + 버튼 ===== */}
        <div className="px-3 py-2 border-b bg-gray-50 flex items-center gap-2">
          {/* 4M 필터 */}
          <select
            value={filterM4}
            onChange={(e) => setFilterM4(e.target.value)}
            className="px-2 py-1 text-[10px] border rounded cursor-pointer"
          >
            <option value="all">전체 4M</option>
            {M4_OPTIONS.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>

          {/* 검색 */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 작업요소 검색..."
            className="flex-1 px-2 py-1 text-[10px] border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 버튼 영역 (표준화: 검색 아래, 가로 배치) */}
        <div className="px-3 py-2 border-b bg-white flex items-center gap-2">
          <button onClick={selectAll} className="px-4 py-1.5 text-[13px] font-bold bg-blue-500 text-white rounded hover:bg-blue-600">전체</button>
          <button onClick={deselectAll} className="px-4 py-1.5 text-[13px] font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">해제</button>
          <button onClick={handleApply} className="px-4 py-1.5 text-[13px] font-bold bg-green-600 text-white rounded hover:bg-green-700">적용</button>
          <button onClick={handleDeleteAll} className="px-4 py-1.5 text-[13px] font-bold bg-red-500 text-white rounded hover:bg-red-600">삭제</button>
        </div>

        {/* ===== 하위항목 라벨 ===== */}
        <div className="px-3 py-1 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <span className="text-[10px] font-bold text-green-700">▼ 하위항목: 작업요소</span>
        </div>

        {/* ===== 하위항목 입력 + 저장 ===== */}
        <div className="px-3 py-1.5 border-b bg-green-50 flex items-center gap-1">
          <span className="text-[10px] font-bold text-green-700">+</span>
          <select
            value={newM4}
            onChange={(e) => setNewM4(e.target.value)}
            className="px-1 py-0.5 text-[10px] border rounded"
          >
            {M4_OPTIONS.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddSave(); } }}
            placeholder="작업요소명 입력..."
            className="flex-1 px-2 py-0.5 text-[10px] border rounded focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            onClick={handleAddSave}
            disabled={!newValue.trim()}
            className="px-2 py-0.5 text-[10px] font-bold bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            저장
          </button>
        </div>

        {/* ===== 리스트 (고정 높이) ===== */}
        <div className="overflow-auto p-2 h-70 min-h-[280px]">
          <div className="grid grid-cols-2 gap-1">
            {filteredElements.map(elem => {
              const isSelected = selectedIds.has(elem.id);
              const m4Style = getM4Style(elem.m4);
              
              return (
                <div
                  key={elem.id}
                  onClick={() => toggleSelect(elem.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-400' 
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {/* 체크박스 */}
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                  }`}>
                    {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
                  </div>

                  {/* 4M 배지 */}
                  <span 
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={m4Style}
                  >
                    {elem.m4}
                  </span>

                  {/* 이름 */}
                  <span className={`flex-1 text-[10px] truncate ${
                    isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'
                  }`}>
                    {elem.name}
                  </span>

                  {/* 삭제 X */}
                  {isSelected && (
                    <button
                      onClick={(e) => handleDeleteSingle(elem, e)}
                      className="text-red-400 hover:text-red-600 text-xs shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            {/* 빈 행 채우기 */}
            {Array.from({ length: Math.max(0, 10 - filteredElements.length) }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-100 bg-gray-50/50"
              >
                <div className="w-4 h-4 rounded border border-gray-200 bg-white shrink-0" />
                <span className="text-[9px] text-gray-300">--</span>
                <span className="flex-1 text-[10px] text-gray-300">-</span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 푸터: 선택 개수 표시 ===== */}
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-center">
          <span className="text-xs font-bold text-blue-600">✓ {selectedIds.size}개 선택</span>
        </div>
      </div>
    </div>
  );
}
