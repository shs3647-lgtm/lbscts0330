/**
 * @file FailureModeSelectModal.tsx
 * @description 고장형태(FM) 선택 모달 - BaseSelectModal 기반 표준화
 * @version 3.0.0 - 공통 모듈화
 * @updated 2026-01-03
 */

'use client';

import React, { useState, useEffect } from 'react';
import BaseSelectModal, { BaseItem, CATEGORY_COLORS } from './BaseSelectModal';

// ============ 기본 데이터 ============
const DEFAULT_MODES: BaseItem[] = [
  { id: 'FM_1', value: '규격 미달', category: '기본' },
  { id: 'FM_2', value: '규격 초과', category: '기본' },
  { id: 'FM_3', value: '변형', category: '기본' },
  { id: 'FM_4', value: '파손', category: '기본' },
  { id: 'FM_5', value: '누락', category: '기본' },
  { id: 'FM_6', value: '오염', category: '기본' },
  { id: 'FM_7', value: '기능 불량', category: '기본' },
  { id: 'FM_8', value: '외관 불량', category: '기본' },
  { id: 'FM_9', value: '균열', category: '기본' },
  { id: 'FM_10', value: '부식', category: '기본' },
  { id: 'FM_11', value: '이탈', category: '기본' },
  { id: 'FM_12', value: '마모', category: '기본' },
];

// ============ 타입 ============
interface FailureMode {
  id: string;
  name: string;
}

interface FailureModeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (modes: FailureMode[]) => void;
  parentType: 'productChar' | 'processChar';
  parentName: string;
  parentId: string;
  currentModes: FailureMode[];
  processName?: string;
  functionName?: string;
  workElement?: string;
  m4Category?: string;
}

// ============ 컴포넌트 ============
export default function FailureModeSelectModal({
  isOpen,
  onClose,
  onSave,
  parentName,
  processName,
  functionName,
  workElement,
  m4Category,
  currentModes,
}: FailureModeSelectModalProps) {
  const [items, setItems] = useState<BaseItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 초기화
  useEffect(() => {
    if (!isOpen) return;
    
    let allItems = [...DEFAULT_MODES];
    
    // 현재 모드 추가
    currentModes.forEach((m) => {
      if (!allItems.find(i => i.value === m.name)) {
        allItems = [{ id: m.id, value: m.name, category: '추가' }, ...allItems];
      }
    });
    
    setItems(allItems);
    
    // 선택 상태 설정
    const selected = new Set<string>();
    currentModes.forEach(m => {
      const found = allItems.find(i => i.value === m.name);
      if (found) selected.add(found.id);
    });
    setSelectedIds(selected);
  }, [isOpen, currentModes]);

  // 적용 핸들러
  const handleApply = (selectedItems: BaseItem[]) => {
    const modes: FailureMode[] = selectedItems.map(i => {
      const existing = currentModes.find(m => m.name === i.value);
      return existing || { id: i.id, name: i.value };
    });
    onSave(modes);
  };

  // 전체 삭제 핸들러
  const handleDeleteAll = () => {
    onSave([]);
  };

  // 상위항목 렌더링
  const renderParentInfo = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-bold text-red-700 shrink-0">★ 상위항목:</span>
      {functionName && (
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-600 font-bold">제품특성:</span>
          <span className="px-2 py-1 text-[10px] font-bold bg-orange-500 text-white rounded max-w-[180px] truncate" title={functionName}>{functionName}</span>
        </div>
      )}
      {processName && (
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-600 font-bold">공정:</span>
          <span className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded">{processName}</span>
        </div>
      )}
    </div>
  );

  // AI 추천 컨텍스트
  const aiContext = {
    processName,
    workElement,
    m4Category,
    productChar: parentName,
  };

  return (
    <BaseSelectModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={handleApply}
      items={items}
      setItems={setItems}
      selectedIds={selectedIds}
      setSelectedIds={setSelectedIds}
      theme="orange"
      icon="⚠️"
      title="고장형태(FM) 선택"
      searchPlaceholder="🔍 고장형태 검색..."
      addPlaceholder="새 고장형태 입력..."
      subTitle="하위항목: 고장형태(FM)"
      onDeleteAll={handleDeleteAll}
      renderParentInfo={renderParentInfo}
      currentValues={currentModes.map(m => m.name)}
      aiRecommendType="mode"
      aiRecommendContext={aiContext}
    />
  );
}
