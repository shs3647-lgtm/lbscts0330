/**
 * @file SpecialCharSelectModal.tsx
 * @description 특별특성 선택 전용 모달 - 컴팩트 그리드 디자인
 *   포드 등 특별특성이 많은 고객사 대응 — 표시(Internal)만 노출
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDraggableModal } from './useDraggableModal';

interface SpecialCharItem {
  id: string;
  customer: string;
  symbol: string;
  notation: string;
  meaning: string;
  icon?: string;
  color: string;
}

/** 기본 특별특성 데이터 — LBS 전용 */
const DEFAULT_SPECIAL_CHAR_DATA: SpecialCharItem[] = [
  { id: 'LBS_DIA', customer: 'LBS', symbol: '◇', notation: 'SC', meaning: '공정관리 특별특성 (Process Control)', icon: '◇', color: '#00838f' },
  { id: 'LBS_STAR', customer: 'LBS', symbol: '★', notation: 'CC', meaning: '제품/공정 핵심 특별특성 (Critical)', icon: '★', color: '#e65100' },
  { id: 'COMMON_NONE', customer: 'LBS', symbol: '-', notation: '-', meaning: '해당없음', icon: '', color: '#9e9e9e' },
];

/** ★ 등록 마스터(localStorage)에서 기호 데이터를 읽어 SpecialCharItem[] 형태로 변환 */
function loadRegisteredSymbols(): SpecialCharItem[] {
  if (typeof window === 'undefined') return DEFAULT_SPECIAL_CHAR_DATA;
  const saved = localStorage.getItem('pfmea_special_char_master');
  if (!saved) return DEFAULT_SPECIAL_CHAR_DATA;
  try {
    const masterData = JSON.parse(saved) as Array<{
      id: string; customer: string; customerSymbol: string;
      internalSymbol: string; meaning: string; icon?: string; color: string;
    }>;
    if (masterData.length === 0) return DEFAULT_SPECIAL_CHAR_DATA;
    const items: SpecialCharItem[] = masterData
      .filter(m => {
        const cust = (m.customer || '').trim().toUpperCase();
        return cust === 'LBS' && (m.customerSymbol?.trim() || m.internalSymbol?.trim());
      })
      .map(m => ({
        id: m.id,
        customer: m.customer || 'LBS',
        symbol: (m.customerSymbol && m.customerSymbol.trim()) ? m.customerSymbol : m.internalSymbol,
        notation: m.internalSymbol || 'SC',
        meaning: m.meaning || '',
        icon: m.icon || '●',
        color: m.color || '#9e9e9e',
      }));
    items.push({ id: 'COMMON_NONE', customer: 'LBS', symbol: '-', notation: '-', meaning: '해당없음', icon: '', color: '#9e9e9e' });
    return items.length > 1 ? items : DEFAULT_SPECIAL_CHAR_DATA;
  } catch {
    return DEFAULT_SPECIAL_CHAR_DATA;
  }
}

// 하위 호환용 export (다른 파일에서 참조 시)
const SPECIAL_CHAR_DATA = DEFAULT_SPECIAL_CHAR_DATA;

interface SpecialCharSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string, item: SpecialCharItem) => void;
  currentValue?: string;
  productCharName?: string;
  /** ★ FMEA 등록 시 지정된 고객명 — 자사 + 해당 고객사 기호만 표시 */
  customerName?: string;
}

/** 표시별 색상 매핑 */
const NOTATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SC: { bg: '#e8f5e9', text: '#2e7d32', border: '#4caf50' },
  CC: { bg: '#fff3e0', text: '#e65100', border: '#ff9800' },
  'F/F': { bg: '#e3f2fd', text: '#1565c0', border: '#42a5f5' },
  '-': { bg: '#f5f5f5', text: '#757575', border: '#bdbdbd' },
};

function getNotationStyle(notation: string, isSelected: boolean) {
  const c = NOTATION_COLORS[notation] || { bg: '#f3e5f5', text: '#7b1fa2', border: '#ab47bc' };
  if (isSelected) {
    return { background: c.border, color: '#fff', border: `2px solid ${c.text}` };
  }
  return { background: c.bg, color: c.text, border: `1px solid ${c.border}` };
}

export default function SpecialCharSelectModal({
  isOpen, onClose, onSelect, currentValue, productCharName,
}: SpecialCharSelectModalProps) {
  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 130, right: 360 }, modalWidth: 240, modalHeight: 280, isOpen });

  const [symbolData, setSymbolData] = useState<SpecialCharItem[]>(DEFAULT_SPECIAL_CHAR_DATA);
  const [recommendedNotation, setRecommendedNotation] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSymbolData(loadRegisteredSymbols());

    // ★ 추천 루프: 제품특성명으로 이전 사용 이력 조회
    if (productCharName) {
      fetch(`/api/special-char/recommend?productChar=${encodeURIComponent(productCharName)}`)
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data?.length > 0) {
            setRecommendedNotation(json.data[0].internalSymbol || null);
          } else {
            setRecommendedNotation(null);
          }
        })
        .catch(() => setRecommendedNotation(null));
    }
  }, [isOpen, productCharName]);

  // 중복 표시(notation) 제거 — 같은 표시는 1개만 표시
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return symbolData.filter(item => {
      if (seen.has(item.notation)) return false;
      seen.add(item.notation);
      return true;
    });
  }, [symbolData]);

  if (!isOpen) return null;

  const handleSelect = (item: SpecialCharItem) => {
    onSelect(item.symbol, item);
    // ★ 사용 기록 업데이트 (개선 루프)
    fetch('/api/special-char/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id !== 'COMMON_NONE' ? item.id : undefined,
        productChar: productCharName || '',
      }),
    }).catch(() => { /* 실패해도 선택은 진행 */ });
    onClose();
  };

  const handleUnselect = () => {
    onSelect('', { id: '', customer: '', symbol: '', notation: '', meaning: '', color: '' });
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[10000] bg-black/30" onClick={onClose}>
      <div
        className="fixed bg-white rounded-lg w-[240px] max-h-[320px] flex flex-col shadow-xl overflow-hidden cursor-move border border-gray-300"
        style={{ top: `${modalPosition.top}px`, right: `${modalPosition.right}px` }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 — 컴팩트 */}
        <div
          className="bg-gradient-to-r from-orange-500 to-orange-600 py-1 px-2 text-white flex justify-between items-center cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <span className="text-[10px] font-bold">특별특성 선택 (SC)</span>
          <button onClick={onClose} className="bg-red-500 hover:bg-red-600 border-none text-white px-1.5 py-0.5 rounded text-[9px] cursor-pointer font-bold">×</button>
        </div>

        {/* 상위항목 — 있을 때만 */}
        {productCharName && (
          <div className="py-0.5 px-2 bg-green-50 border-b border-green-200 flex items-center gap-1">
            <span className="text-[8px] text-gray-500">제품특성:</span>
            <span className="text-[9px] font-bold text-green-700 truncate max-w-[160px]">{productCharName}</span>
          </div>
        )}

        {/* 현재 선택 + 해제 */}
        {currentValue && (
          <div className="py-0.5 px-2 bg-orange-50 border-b border-orange-200 flex justify-between items-center">
            <span className="text-[9px] text-orange-700">현재: <b>{currentValue}</b></span>
            <button onClick={handleUnselect} className="text-[8px] text-orange-600 hover:text-orange-800 cursor-pointer bg-transparent border-none underline">해제</button>
          </div>
        )}

        {/* 그리드 — 표시만 노출, 컴팩트 버튼 */}
        <div className="flex-1 overflow-auto p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {uniqueItems.map(item => {
              const isSelected = currentValue === item.symbol;
              const isRecommended = recommendedNotation === item.notation && item.notation !== '-';
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`flex flex-col items-center justify-center rounded-md cursor-pointer py-2 px-1 transition-all hover:shadow-md hover:scale-105 active:scale-95 relative ${isRecommended ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`}
                  style={getNotationStyle(item.notation, isSelected)}
                  title={`${item.meaning || item.notation}${isRecommended ? ' (추천)' : ''}`}
                >
                  {isRecommended && (
                    <span className="absolute -top-1.5 -right-1.5 text-[6px] bg-purple-600 text-white px-1 py-px rounded-full leading-none font-bold">추천</span>
                  )}
                  <span className="text-sm font-bold leading-none">{item.notation}</span>
                  <span className="text-[7px] opacity-60 mt-0.5 leading-none truncate max-w-full">{item.symbol}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 범례 — 1줄 */}
        <div className="py-0.5 px-2 bg-gray-50 border-t border-gray-200 text-[7px] text-gray-500 text-center">
          SC=Safety | CC=Critical | F/F=Fit/Function
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

export { SPECIAL_CHAR_DATA };
export type { SpecialCharItem };
