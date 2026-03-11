/**
 * @file StandardInputModal.tsx
 * @description CP 워크시트 범용 입력 모달 - 공정명 모달 스타일로 표준화
 * @updated 2026-01-15
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface InputItem {
  id: string;
  value: string;
  processNo?: string;
  processName?: string;
}

interface StandardInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  columnKey: string;
  columnName: string;
  processNo?: string;
  processName?: string;
  existingValue?: string;
  // 마스터 데이터에서 가져온 기존 값 목록 (선택사항)
  masterDataKey?: string;
}

// 컬럼별 아이콘 및 색상 설정
const COLUMN_CONFIG: Record<string, { icon: string; color: string; colorLight: string }> = {
  productChar: { icon: '📦', color: 'from-amber-600 to-amber-700', colorLight: 'amber' },
  processChar: { icon: '⚙️', color: 'from-yellow-600 to-yellow-700', colorLight: 'yellow' },
  specTolerance: { icon: '📏', color: 'from-blue-600 to-blue-700', colorLight: 'blue' },
  evalMethod: { icon: '🔍', color: 'from-purple-600 to-purple-700', colorLight: 'purple' },
  sampleSize: { icon: '📊', color: 'from-pink-600 to-pink-700', colorLight: 'pink' },
  controlMethod: { icon: '📋', color: 'from-indigo-600 to-indigo-700', colorLight: 'indigo' },
  reactionPlan: { icon: '🚨', color: 'from-red-600 to-red-700', colorLight: 'red' },
  default: { icon: '✏️', color: 'from-gray-600 to-gray-700', colorLight: 'gray' },
};

// 마스터 데이터에서 해당 컬럼의 값 목록 로드
const loadValuesFromMaster = (columnKey: string, processNo: string): InputItem[] => {
  if (typeof window === 'undefined') return [];

  try {
    const cpMasterData = localStorage.getItem('cp_master_data');
    if (!cpMasterData) return [];

    const flatData = JSON.parse(cpMasterData);
    const valueSet = new Map<string, InputItem>();

    // 컬럼키와 itemCode 매핑
    const KEY_TO_ITEM_CODE: Record<string, string> = {
      productChar: 'B1',
      processChar: 'B2',
      specTolerance: 'B4',
      evalMethod: 'B5',
      sampleSize: 'B6',
      controlMethod: 'B8',
      reactionPlan: 'B10',
    };

    const targetItemCode = KEY_TO_ITEM_CODE[columnKey];
    if (!targetItemCode) return [];

    flatData.forEach((item: any, idx: number) => {
      // 현재 공정번호와 일치하고 해당 itemCode인 항목 추출
      const isMatch = !processNo || String(item.processNo).trim() === String(processNo).trim();
      const isTarget = item.itemCode === targetItemCode || item.code === targetItemCode;

      if (isMatch && isTarget && item.value && item.value.trim()) {
        const val = item.value.trim();
        if (!valueSet.has(val)) {
          valueSet.set(val, {
            id: `master_${idx}_${Date.now()}`,
            value: val,
            processNo: item.processNo,
            processName: item.processName,
          });
        }
      }
    });

    return Array.from(valueSet.values());
  } catch (e) {
    console.error('마스터 데이터 로드 실패:', e);
    return [];
  }
};

export default function StandardInputModal({
  isOpen,
  onClose,
  onSave,
  columnKey,
  columnName,
  processNo = '',
  processName = '',
  existingValue = '',
}: StandardInputModalProps) {
  const [items, setItems] = useState<InputItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);

  const config = COLUMN_CONFIG[columnKey] || COLUMN_CONFIG.default;

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const loadedItems = loadValuesFromMaster(columnKey, processNo);
      setItems(loadedItems);

      // 기존 값이 있으면 선택 상태로
      if (existingValue) {
        const matched = loadedItems.find(i => i.value === existingValue);
        if (matched) {
          setSelectedId(matched.id);
        }
      }

      setSearch('');
      setNewValue('');
      setLoading(false);
    }
  }, [isOpen, columnKey, processNo, existingValue]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.value.toLowerCase().includes(q));
  }, [items, search]);

  const handleSave = () => {
    if (selectedId) {
      const selected = items.find(i => i.id === selectedId);
      if (selected) {
        onSave(selected.value);
        // ✅ 2026-01-16: 적용 후 모달 유지 (닫기 버튼으로만 닫음)
      }
    }
  };

  const handleAddNew = () => {
    if (!newValue.trim()) return;
    if (items.some(i => i.value === newValue.trim())) return;

    const newItem: InputItem = {
      id: `new_${Date.now()}`,
      value: newValue.trim(),
      processNo,
      processName,
    };

    setItems(prev => [newItem, ...prev]);
    setSelectedId(newItem.id);
    setNewValue('');
  };

  const handleDirectSave = () => {
    if (newValue.trim()) {
      onSave(newValue.trim());
      // ✅ 2026-01-16: 적용 후 모달 유지 (닫기 버튼으로만 닫음)
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40">
      {/* ✅ 2026-01-16: 배경 클릭으로 닫히지 않음 (닫기 버튼으로만 닫음) */}
      <div
        className="fixed bg-white rounded-lg shadow-2xl w-[380px] flex flex-col overflow-hidden max-h-[calc(100vh-120px)]"
        style={{ top: '180px', right: '320px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r ${config.color} text-white select-none`}>
          <div className="flex items-center gap-2">
            <span className="text-base">{config.icon}</span>
            <h2 className="text-xs font-bold">{columnName} 선택/입력</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded">닫기</button>
        </div>

        {/* 공정 정보 */}
        {processNo && (
          <div className={`px-3 py-1 border-b bg-${config.colorLight}-50 flex items-center gap-2`}>
            <span className="text-[10px] font-bold text-gray-700">공정:</span>
            <span className="text-[9px] text-gray-600">{processNo}</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold bg-${config.colorLight}-600 text-white rounded`}>{processName}</span>
          </div>
        )}

        {/* 신규 입력 */}
        <div className="px-3 py-1.5 border-b bg-green-50 flex items-center gap-1">
          <span className="text-[10px] font-bold text-green-700">+</span>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDirectSave();
              }
            }}
            placeholder={`${columnName} 직접 입력...`}
            className="flex-1 px-2 py-0.5 text-[10px] border rounded focus:ring-1 focus:ring-green-500 outline-none"
          />
          <button
            onClick={handleDirectSave}
            disabled={!newValue.trim()}
            className="px-2 py-0.5 text-[10px] font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 rounded"
          >
            저장
          </button>
        </div>

        {/* 검색 및 버튼 */}
        <div className="px-2 py-1.5 border-b bg-gray-50 flex flex-col gap-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 기존 값 검색..."
            className="w-full px-2 py-0.5 text-[9px] border rounded outline-none"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSave}
              disabled={!selectedId}
              className={`flex-1 py-1.5 text-[12px] font-bold bg-${config.colorLight}-600 hover:bg-${config.colorLight}-700 disabled:bg-gray-300 text-white rounded`}
            >
              선택 적용
            </button>
            <button onClick={onClose} className="flex-1 py-1.5 text-[12px] font-bold bg-gray-300 hover:bg-gray-400 text-gray-700 rounded">
              취소
            </button>
          </div>
        </div>

        {/* 목록 */}
        <div className="overflow-auto p-2 h-64 min-h-[260px]">
          {loading ? (
            <div className="text-center py-10 text-[10px] text-gray-500">데이터 로딩중...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10 text-[10px] text-gray-400">
              기존 데이터가 없습니다.<br />위에서 직접 입력해주세요.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-colors ${
                    selectedId === item.id
                      ? `bg-${config.colorLight}-50 border-${config.colorLight}-400`
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full border ${
                      selectedId === item.id
                        ? `bg-${config.colorLight}-500 border-${config.colorLight}-500`
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  <span className="text-[11px] text-gray-700 flex-1">{item.value}</span>
                  {item.processNo && (
                    <span className="text-[8px] text-gray-400">[{item.processNo}]</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
