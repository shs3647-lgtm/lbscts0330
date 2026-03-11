/**
 * @file FailureCauseSelectModal.tsx
 * @description 고장원인(FC) 선택 모달 - BaseSelectModal 기반 표준화
 * @version 3.0.0 - 공통 모듈화
 * @updated 2026-01-03
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import BaseSelectModal, { BaseItem } from './BaseSelectModal';
import { useLocale } from '@/lib/locale';

// ============ 기본 데이터 ============
const DEFAULT_CAUSES: BaseItem[] = [
  { id: 'FC_MN_1', value: '작업자 실수', category: '기본', group: 'MN' },
  { id: 'FC_MN_2', value: '교육 미흡', category: '기본', group: 'MN' },
  { id: 'FC_MN_3', value: '숙련도 부족', category: '기본', group: 'MN' },
  { id: 'FC_MC_1', value: '설비 마모', category: '기본', group: 'MC' },
  { id: 'FC_MC_2', value: '설비 고장', category: '기본', group: 'MC' },
  { id: 'FC_MC_3', value: '정비 미흡', category: '기본', group: 'MC' },
  { id: 'FC_IM_1', value: '원자재 불량', category: '기본', group: 'IM' },
  { id: 'FC_IM_2', value: '부자재 불량', category: '기본', group: 'IM' },
  { id: 'FC_EN_1', value: '온도 부적합', category: '기본', group: 'EN' },
  { id: 'FC_EN_2', value: '습도 부적합', category: '기본', group: 'EN' },
  { id: 'FC_EN_3', value: '이물 혼입', category: '기본', group: 'EN' },
];

// 4M 분류: MN(Man) / MC(Machine) / IM(In-Material) / EN(Environment)
const GROUP_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  MN: { bg: '#ffebee', text: '#d32f2f', label: '사람' },
  MC: { bg: '#e3f2fd', text: '#1565c0', label: '설비' },
  IM: { bg: '#e8f5e9', text: '#2e7d32', label: '자재' },
  EN: { bg: '#fff3e0', text: '#f57c00', label: '환경' },
};

// ============ 타입 ============
interface FailureCause {
  id: string;
  name: string;
  occurrence?: number;
}

interface FailureCauseSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (causes: FailureCause[]) => void;
  parentName: string;
  parentId: string;
  currentCauses: FailureCause[];
  processName?: string;
  workElementName?: string;
  functionName?: string;
}

// ============ 컴포넌트 ============
export default function FailureCauseSelectModal({
  isOpen,
  onClose,
  onSave,
  parentName,
  processName,
  workElementName,
  functionName,
  currentCauses,
}: FailureCauseSelectModalProps) {
  const { t } = useLocale();
  const [items, setItems] = useState<BaseItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState('All');

  // 초기화
  useEffect(() => {
    if (!isOpen) return;
    
    let allItems = [...DEFAULT_CAUSES];
    
    // 현재 항목 추가 (맨 위에)
    currentCauses.forEach((c) => {
      if (!allItems.find(i => i.value === c.name)) {
        allItems = [{ id: c.id, value: c.name, category: '추가', group: 'MN' }, ...allItems];
      }
    });
    
    setItems(allItems);
    
    // 선택 상태 설정
    const selected = new Set<string>();
    currentCauses.forEach(c => {
      const found = allItems.find(i => i.value === c.name);
      if (found) selected.add(found.id);
    });
    setSelectedIds(selected);
  }, [isOpen, currentCauses]);

  // 필터된 아이템
  const filteredItems = useMemo(() => {
    if (groupFilter === 'All') return items;
    return items.filter(i => i.group === groupFilter);
  }, [items, groupFilter]);

  // 적용 핸들러
  const handleApply = (selectedItems: BaseItem[]) => {
    const causes: FailureCause[] = selectedItems.map(i => {
      const existing = currentCauses.find(c => c.name === i.value);
      return existing || { id: i.id, name: i.value };
    });
    onSave(causes);
  };

  // 전체 삭제 핸들러
  const handleDeleteAll = () => {
    onSave([]);
  };

  // 상위항목 렌더링
  const renderParentInfo = () => (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-red-700 shrink-0">★ {t('상위항목')}:</span>
        {processName && (
          <span className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded">{processName}</span>
        )}
        {workElementName && (
          <span className="px-2 py-1 text-[10px] font-bold bg-green-600 text-white rounded">{workElementName}</span>
        )}
        {functionName && (
          <span className="px-2 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded">{functionName}</span>
        )}
      </div>
      {/* 4M 필터 */}
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[9px] text-gray-600">4M:</span>
        <button
          onClick={() => setGroupFilter('All')}
          className={`px-2 py-0.5 text-[9px] font-bold rounded ${
            groupFilter === 'All' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          {t('전체')}
        </button>
        {Object.entries(GROUP_COLORS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setGroupFilter(key)}
            className={`px-2 py-0.5 text-[9px] font-bold rounded ${
              groupFilter === key ? 'text-white' : 'hover:opacity-80'
            }`}
            style={{ 
              background: groupFilter === key ? val.text : val.bg, 
              color: groupFilter === key ? 'white' : val.text 
            }}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );

  // 4M 배지 렌더링
  const renderExtraColumns = (item: BaseItem) => {
    const groupColor = GROUP_COLORS[item.group || 'MN'] || GROUP_COLORS['MN'];
    return (
      <span 
        className="text-[8px] font-bold px-1 py-0.5 rounded shrink-0" 
        style={{ background: groupColor.bg, color: groupColor.text }}
      >
        {item.group}
      </span>
    );
  };

  return (
    <BaseSelectModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={handleApply}
      items={filteredItems}
      setItems={setItems}
      selectedIds={selectedIds}
      setSelectedIds={setSelectedIds}
      theme="indigo"
      icon="🔧"
      title={t('고장원인(FC) 선택')}
      searchPlaceholder={`🔍 ${t('고장원인')} ${t('검색')}...`}
      addPlaceholder={`${t('새 항목 입력...')}`}
      subTitle={`${t('하위항목')}: ${t('고장원인(FC)')}`}
      onDeleteAll={handleDeleteAll}
      renderParentInfo={renderParentInfo}
      renderExtraColumns={renderExtraColumns}
      currentValues={currentCauses.map(c => c.name)}
    />
  );
}
