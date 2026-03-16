/**
 * @file FailureEffectSelectModal.tsx
 * @description 고장영향(FE) 선택 모달 - BaseSelectModal 기반 표준화
 * @version 3.0.0 - 공통 모듈화
 * @updated 2026-01-03
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import BaseSelectModal, { BaseItem } from './BaseSelectModal';
import { useLocale } from '@/lib/locale';

// ============ 기본 데이터 ============
const DEFAULT_EFFECTS: BaseItem[] = [
  { id: 'FE_YP_1', value: '생산 지연', category: '기본', group: 'YP' },
  { id: 'FE_YP_2', value: '재작업/폐기', category: '기본', group: 'YP' },
  { id: 'FE_YP_3', value: '공정 정지', category: '기본', group: 'YP' },
  { id: 'FE_SP_1', value: '조립 불가', category: '기본', group: 'SP' },
  { id: 'FE_SP_2', value: '라인 정지', category: '기본', group: 'SP' },
  { id: 'FE_SP_3', value: '외관 불량', category: '기본', group: 'SP' },
  { id: 'FE_U_1', value: '차량 정지 (안전)', category: '기본', group: 'USER' },
  { id: 'FE_U_2', value: '기능 작동 불능', category: '기본', group: 'USER' },
  { id: 'FE_U_3', value: '성능 저하', category: '기본', group: 'USER' },
  { id: 'FE_U_4', value: '소음/진동 발생', category: '기본', group: 'USER' },
];

// 그룹 색상 (YP: 파란색, SP: 주황색, User: 보라색)
const GROUP_COLORS: Record<string, { bg: string; text: string }> = {
  'YP': { bg: '#bbdefb', text: '#1565c0' },
  'SP': { bg: '#ffe0b2', text: '#e65100' },
  'USER': { bg: '#e1bee7', text: '#7b1fa2' },
};

// ============ 타입 ============
interface FailureEffect {
  id: string;
  effect: string;
  severity?: number;
}

interface FailureEffectSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (effects: FailureEffect[]) => void;
  parentType: string;
  parentReqName: string;
  parentReqId: string;
  parentFuncName?: string;
  currentEffects: FailureEffect[];
  productName?: string;
}

// ============ 컴포넌트 ============
export default function FailureEffectSelectModal({
  isOpen,
  onClose,
  onSave,
  parentType,
  parentReqName,
  parentFuncName,
  currentEffects,
  productName,
}: FailureEffectSelectModalProps) {
  const { t } = useLocale();
  const [items, setItems] = useState<BaseItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState('All');

  // 초기화
  useEffect(() => {
    if (!isOpen) return;
    
    let allItems = [...DEFAULT_EFFECTS];
    
    // 현재 항목 추가 (맨 위에)
    currentEffects.forEach((e) => {
      if (!allItems.find(i => i.value === e.effect)) {
        allItems = [{ id: e.id, value: e.effect, category: '추가', group: parentType }, ...allItems];
      }
    });
    
    setItems(allItems);
    
    // 기본 필터 설정
    if (parentType) setGroupFilter(parentType);
    
    // 선택 상태 설정
    const selected = new Set<string>();
    currentEffects.forEach(e => {
      const found = allItems.find(i => i.value === e.effect);
      if (found) selected.add(found.id);
    });
    setSelectedIds(selected);
  }, [isOpen, currentEffects, parentType]);

  // 필터된 아이템
  const filteredItems = useMemo(() => {
    if (groupFilter === 'All') return items;
    return items.filter(i => i.group === groupFilter);
  }, [items, groupFilter]);

  // 적용 핸들러
  const handleApply = (selectedItems: BaseItem[]) => {
    const effects: FailureEffect[] = selectedItems.map(i => {
      const existing = currentEffects.find(e => e.effect === i.value);
      return existing || { id: i.id, effect: i.value };
    });
    onSave(effects);
  };

  // 전체 삭제 핸들러
  const handleDeleteAll = () => {
    onSave([]);
  };

  // 상위항목 렌더링
  const renderParentInfo = () => (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] font-bold text-red-700 shrink-0">★ {t('상위항목')}:</span>
        {productName && (
          <span className="px-1.5 py-0 text-[9px] font-bold bg-blue-600 text-white rounded">{productName}</span>
        )}
        {parentFuncName && (
          <span className="px-1.5 py-0 text-[9px] font-bold bg-green-600 text-white rounded">{parentFuncName}</span>
        )}
        {parentReqName && (
          <span className="px-1.5 py-0 text-[9px] font-bold bg-orange-500 text-white rounded leading-5">{parentReqName}</span>
        )}
      </div>
      {/* 그룹 필터 */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-gray-600">{t('필터')}:</span>
        {['All', 'YP', 'SP', 'USER'].map(g => (
          <button
            key={g}
            onClick={() => setGroupFilter(g)}
            className={`px-1.5 py-0 text-[9px] font-bold rounded leading-5 ${
              groupFilter === g ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {g === 'All' ? t('전체') : g}
          </button>
        ))}
      </div>
    </div>
  );

  // 그룹 배지 렌더링
  const renderExtraColumns = (item: BaseItem) => {
    const groupColor = GROUP_COLORS[item.group || 'YP'] || GROUP_COLORS['YP'];
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
      theme="red"
      icon="💥"
      title={t('고장영향(FE) 선택')}
      searchPlaceholder={`🔍 ${t('고장영향')} ${t('검색')}...`}
      addPlaceholder={`${t('새 항목 입력...')}`}
      subTitle={`${t('하위항목')}: ${t('고장영향(FE)')}`}
      onDeleteAll={handleDeleteAll}
      renderParentInfo={renderParentInfo}
      renderExtraColumns={renderExtraColumns}
      currentValues={currentEffects.map(e => e.effect)}
    />
  );
}
