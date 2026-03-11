/**
 * @file SpecialCharSelectModal.tsx
 * @description 특별특성 선택 전용 모달 - 고객사별 특별특성 기호 선택
 * 
 * @version 2.0.0 - 인라인 스타일 제거, Tailwind CSS 적용
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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

/** 특별특성 마스터 데이터 */
const SPECIAL_CHAR_DATA: SpecialCharItem[] = [
  { id: 'HK_IC', customer: '현대/기아', symbol: 'IC', notation: 'SC', meaning: '중요 (Important Characteristic)', icon: '◆', color: '#e53935' },
  { id: 'HK_CC', customer: '현대/기아', symbol: 'CC', notation: 'SC', meaning: '핵심 (Critical Characteristic)', icon: '★', color: '#d32f2f' },
  { id: 'BMW_F', customer: 'BMW', symbol: 'BM-F', notation: 'SC', meaning: '안전/건강 (Safety/Health)', icon: '▲', color: '#ff9800' },
  { id: 'BMW_C', customer: 'BMW', symbol: 'BM-C', notation: 'SC', meaning: '핵심 (Critical)', icon: '●', color: '#f57c00' },
  { id: 'BMW_S', customer: 'BMW', symbol: 'BM-S', notation: 'SC', meaning: '안전 (Safety)', icon: '◆', color: '#ef6c00' },
  { id: 'BMW_L', customer: 'BMW', symbol: 'BM-L', notation: 'SC', meaning: '법규 (Legal)', icon: '■', color: '#e65100' },
  { id: 'BMW_E', customer: 'BMW', symbol: 'BM-E', notation: 'FF', meaning: '환경 (Environmental)', icon: '○', color: '#4caf50' },
  { id: 'FORD_CC', customer: 'FORD', symbol: 'CC', notation: 'SC', meaning: '핵심 (Critical)', icon: '◆', color: '#1976d2' },
  { id: 'FORD_OS', customer: 'FORD', symbol: 'OS', notation: 'SC', meaning: '작업자안전 (Operator Safety)', icon: '▲', color: '#1565c0' },
  { id: 'FORD_YC', customer: 'FORD', symbol: 'YC', notation: 'SC', meaning: '규제 (Regulatory)', icon: '●', color: '#0d47a1' },
  { id: 'FORD_SC', customer: 'FORD', symbol: 'SC', notation: 'SC', meaning: '품질영향 (Significant)', icon: '■', color: '#2196f3' },
  { id: 'FORD_HI', customer: 'FORD', symbol: 'HI', notation: 'SC', meaning: '유해환경 (Hazardous)', icon: '◇', color: '#42a5f5' },
  { id: 'FORD_YS', customer: 'FORD', symbol: 'YS', notation: 'FF', meaning: '법규 (Legal)', icon: '○', color: '#4caf50' },
  { id: 'GM_D', customer: 'GM', symbol: 'D', notation: 'SC', meaning: '다이아몬드 (Diamond)', icon: '◆', color: '#9c27b0' },
  { id: 'GM_S', customer: 'GM', symbol: 'S', notation: 'SC', meaning: '쉴드 (Shield)', icon: '▼', color: '#7b1fa2' },
  { id: 'COMMON_NONE', customer: '공통', symbol: '-', notation: '-', meaning: '해당없음', icon: '', color: '#9e9e9e' },
];

interface SpecialCharSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string, item: SpecialCharItem) => void;
  currentValue?: string;
  productCharName?: string;
}

  /** 공통 스타일 */
const tw = {
  overlay: 'fixed inset-0 z-[10000] bg-black/40',
  modal: 'fixed bg-white rounded-lg w-[350px] max-w-[350px] min-w-[350px] max-h-[calc(100vh-120px)] flex flex-col shadow-xl overflow-hidden cursor-move',
  header: 'bg-gradient-to-r from-red-600 to-red-700 py-2 px-3 text-white',
  select: 'py-2 px-3 border border-gray-300 rounded-md text-xs min-w-[120px]',
  input: 'flex-1 py-2 px-3 border border-gray-300 rounded-md text-xs',
  content: 'flex-1 overflow-auto p-4',
  footer: 'p-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center',
  cancelBtn: 'py-2 px-5 bg-gray-500 text-white border-none rounded-md text-xs cursor-pointer hover:bg-gray-600',
  grid: 'grid grid-cols-2 gap-2',
};

export default function SpecialCharSelectModal({
  isOpen, onClose, onSelect, currentValue, productCharName,
}: SpecialCharSelectModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('전체');
  const [search, setSearch] = useState('');
  
  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 200, right: 0 }, modalWidth: 350, modalHeight: 200, isOpen });


  const customers = useMemo(() => {
    const unique = [...new Set(SPECIAL_CHAR_DATA.map(d => d.customer))];
    return ['전체', ...unique];
  }, []);

  const filteredData = useMemo(() => {
    let data = SPECIAL_CHAR_DATA;
    if (selectedCustomer !== '전체') {
      data = data.filter(d => d.customer === selectedCustomer);
    }
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(d => 
        d.symbol.toLowerCase().includes(q) ||
        d.meaning.toLowerCase().includes(q) ||
        d.customer.toLowerCase().includes(q)
      );
    }
    return data;
  }, [selectedCustomer, search]);

  const groupedData = useMemo(() => {
    const groups: Record<string, SpecialCharItem[]> = {};
    filteredData.forEach(item => {
      if (!groups[item.customer]) groups[item.customer] = [];
      groups[item.customer].push(item);
    });
    return groups;
  }, [filteredData]);

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
        {/* 헤더 - 드래그 가능 */}
        <div 
          className={`${tw.header} cursor-move select-none`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span>🏷️</span>
              <h3 className="m-0 text-xs font-bold">특별특성 선택</h3>
            </div>
            <button onClick={onClose} className="bg-white/20 border-none text-white px-2 py-0.5 rounded text-[10px] cursor-pointer hover:bg-white/30">닫기</button>
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

        {/* 필터 영역 */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex gap-3 items-center">
          <select
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
            className={tw.select}
          >
            {customers.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
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
              선택 해제
            </button>
          </div>
        )}

        {/* 콘텐츠 영역 */}
        <div className={tw.content}>
          {Object.entries(groupedData).map(([customer, items]) => (
            <div key={customer} className="mb-4">
              <div className="text-xs font-bold text-gray-600 py-1.5 px-3 bg-gray-100 rounded mb-2">
                🏢 {customer}
              </div>
              <div className={tw.grid}>
                {items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      currentValue === item.symbol ? 'border-2 bg-opacity-10' : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-md text-white flex items-center justify-center text-base font-bold shrink-0"
                      style={{ background: item.color }}
                    >
                      {item.icon || item.symbol.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-gray-800 flex items-center gap-1.5">
                        <span>{item.symbol}</span>
                        <span className={`text-[10px] py-0.5 px-1.5 rounded ${item.notation === 'SC' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {item.notation}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 truncate">
                        {item.meaning}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className={tw.footer}>
          <div className="text-[11px] text-gray-600">
            SC: Safety/Critical | FF: Fit/Function
          </div>
          <button onClick={onClose} className={tw.cancelBtn}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

export { SPECIAL_CHAR_DATA };
export type { SpecialCharItem };
