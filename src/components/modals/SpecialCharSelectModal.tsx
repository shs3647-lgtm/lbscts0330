/**
 * @file SpecialCharSelectModal.tsx
 * @description 특별특성 선택 전용 모달 - LBS 전용
 * 
 * @version 2.0.0 - 인라인 스타일 제거, Tailwind CSS 적용
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

/** ★ 등록 마스터(localStorage)에서 LBS 기호 데이터를 읽어 SpecialCharItem[] 형태로 변환 */
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
    // LBS 데이터만 필터 + 빈 기호 제외
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
    // 해당없음 항목 추가
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

/** 공통 스타일 */
const tw = {
  overlay: 'fixed inset-0 z-[10000] bg-black/40',
  modal: 'fixed bg-white rounded-lg w-[300px] max-w-[300px] min-w-[300px] max-h-[calc(100vh-120px)] flex flex-col shadow-xl overflow-hidden cursor-move',
  header: 'bg-gradient-to-r from-orange-500 to-orange-600 py-1.5 px-3 text-white',
  select: 'py-1.5 px-2 border border-gray-300 rounded-md text-xs min-w-[100px]',
  input: 'flex-1 py-1.5 px-2 border border-gray-300 rounded-md text-xs',
  content: 'flex-1 overflow-auto p-2',
  footer: 'py-2 px-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center',
  cancelBtn: 'py-2 px-5 bg-gray-500 text-white border-none rounded-md text-xs cursor-pointer hover:bg-gray-600',
  grid: 'grid grid-cols-2 gap-2',
};

export default function SpecialCharSelectModal({
  isOpen, onClose, onSelect, currentValue, productCharName, customerName,
}: SpecialCharSelectModalProps) {
  const [search, setSearch] = useState('');

  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 130, right: 360 }, modalWidth: 300, modalHeight: 350, isOpen });

  // ★ 등록 마스터에서 기호 데이터 로드 (모달 열릴 때마다 갱신) — LBS 전용
  const [symbolData, setSymbolData] = useState<SpecialCharItem[]>(DEFAULT_SPECIAL_CHAR_DATA);
  useEffect(() => {
    if (!isOpen) return;
    const data = loadRegisteredSymbols();
    setSymbolData(data);
  }, [isOpen]);

  const filteredData = useMemo(() => {
    if (!search) return symbolData;
    const q = search.toLowerCase();
    return symbolData.filter(d =>
      d.symbol.toLowerCase().includes(q) ||
      d.meaning.toLowerCase().includes(q)
    );
  }, [symbolData, search]);

  if (!isOpen) return null;

  const handleSelect = (item: SpecialCharItem) => {
    onSelect(item.symbol, item);
    onClose();
  };

  const modalContent = (
    <div className={tw.overlay} onClick={onClose}>
      <div
        className={tw.modal}
        style={{ top: `${modalPosition.top}px`, right: `${modalPosition.right}px` }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 (주황색 + 빨간 닫기) - 드래그 가능 */}
        <div
          className={`${tw.header} cursor-move select-none`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-yellow-300 text-[11px] font-bold">선택입력 :</span>
              <span>🏷️</span>
              <h3 className="m-0 text-[11px] font-bold" title="Select Special Characteristic">특별특성 선택<span className="text-[8px] font-normal opacity-70 ml-0.5">(SC)</span></h3>
            </div>
            <button onClick={onClose} title="Close" className="bg-red-500 hover:bg-red-600 border-none text-white px-2 py-0.5 rounded text-[10px] cursor-pointer font-bold">닫기<span className="text-[7px] opacity-70 ml-0.5">(Close)</span></button>
          </div>
        </div>

        {/* 상위항목 표시 */}
        <div className="py-2 px-3 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-red-700">★ 상위항목:</span>
          {productCharName && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-600 font-bold">제품특성:</span>
              <span className="py-0.5 px-2 text-[10px] font-bold bg-green-600 text-white rounded max-w-[180px] truncate">{productCharName}</span>
            </div>
          )}
        </div>

        {/* 하위항목 라벨 */}
        <div className="py-1 px-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <span className="text-[10px] font-bold text-green-700">▼ 하위항목: 특별특성</span>
        </div>

        {/* 필터 영역 — LBS 전용 (고객사 필터 제거) */}
        <div className="py-1.5 px-3 bg-gray-50 border-b border-gray-200 flex gap-2 items-center">
          <span className="text-[10px] text-teal-700 font-bold">LBS</span>
          <input
            type="text"
            placeholder="기호 또는 의미 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={tw.input}
          />
        </div>

        {/* 현재 선택 표시 */}
        {currentValue && (
          <div className="py-2 px-4 bg-orange-100 border-b border-orange-200 text-xs flex items-center gap-2">
            <span className="text-orange-700">현재 선택:</span>
            <span className="font-bold">{currentValue}</span>
            <button
              onClick={() => { onSelect('', { id: '', customer: '', symbol: '', notation: '', meaning: '', color: '' }); onClose(); }}
              className="ml-auto bg-orange-200 border-none py-1 px-3 rounded text-[11px] cursor-pointer text-orange-800 hover:bg-orange-300"
            >
              선택 해제<span className="text-[8px] opacity-70 ml-0.5">(Unsel.)</span>
            </button>
          </div>
        )}

        {/* 콘텐츠 영역 — 컴팩트 LBS 전용 */}
        <div className="flex-1 overflow-auto p-2">
          <div className="flex flex-col gap-1.5">
            {filteredData.map(item => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`flex items-center gap-2 py-2 px-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${currentValue === item.symbol ? 'border-2 border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-400'}`}
              >
                <div
                  className="w-8 h-8 rounded-md text-white flex items-center justify-center text-base font-bold shrink-0"
                  style={{ background: item.color }}
                >
                  {item.icon || item.symbol.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold text-gray-800 flex items-center gap-1.5">
                    <span>{item.symbol}</span>
                    <span className={`text-[9px] py-0.5 px-1.5 rounded ${item.notation === 'SC' ? 'bg-red-100 text-red-700' : item.notation === 'CC' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.notation}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 truncate">
                    {item.meaning}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div className={tw.footer}>
          <div className="text-[10px] text-gray-600">
            ◇: 공정관리 | ★: 핵심특성
          </div>
          <button onClick={onClose} title="Close" className={tw.cancelBtn}>
            닫기<span className="text-[8px] opacity-70 ml-0.5">(Close)</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

export { SPECIAL_CHAR_DATA };
export type { SpecialCharItem };
