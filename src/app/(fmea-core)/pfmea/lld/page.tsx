/**
 * @file page.tsx
 * @description LLD(필터코드) 통합 관리 페이지 — SRP 리팩토링 + 테이블 가상화
 * @version 3.0.0 — SRP 분리 (constants + LLDTableRow + useLLDData + useLLDImportExport)
 */

'use client';

import React, { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { FixedLayout, PFMEATopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';

import { CLASSIFICATION_OPTIONS, CLASSIFICATION_LABELS, CLASSIFICATION_COLORS } from './types';
import { COLUMNS, COL_COUNT, ROW_HEIGHT } from './constants';
import LLDTableRow from './components/LLDTableRow';
import LLDHelpModal from './components/LLDHelpModal';
import { useLLDData } from './hooks/useLLDData';
import { useLLDImportExport } from './hooks/useLLDImportExport';

export default function LLDPage() {
  const { t } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const {
    data, setData, isLoading,
    searchTerm, setSearchTerm,
    filterClassification, setFilterClassification,
    stats, filteredData,
    handleSort, sortArrow,
    handleCellChange, handleAddRow, handleDeleteRow,
    handleSave, handleDeploy,
  } = useLLDData();

  const {
    fileInputRef,
    handleExport, handleDownloadTemplate,
    handleImport, handleFileChange,
  } = useLLDImportExport({ data, setData });

  // ── 가상화 ──
  const virtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <FixedLayout topNav={<PFMEATopNav />} showSidebar={true} bgColor="#f5f5f5" contentPadding="p-2">
      <div className="flex flex-col h-full font-['Malgun_Gothic',sans-serif]">
        {/* 메뉴바 */}
        <div className="flex-shrink-0 sticky top-0 z-30 bg-white border-b border-slate-300 shadow-sm px-1 py-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            {/* 분류 필터 */}
            <button className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${filterClassification === 'all' ? 'bg-[#00587a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              onClick={() => setFilterClassification('all')}>{t('전체')}({stats.total})</button>
            {CLASSIFICATION_OPTIONS.map(c => (
              <button key={c} className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${filterClassification === c ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                style={filterClassification === c ? { backgroundColor: CLASSIFICATION_COLORS[c] } : {}} onClick={() => setFilterClassification(c)}>
                {CLASSIFICATION_LABELS[c]}({stats.byClassification[c] || 0})
              </button>
            ))}
            <span className="text-slate-300 text-[10px]">|</span>
            <span className="text-[11px] text-green-600 font-bold">✓{stats.completed}</span>
            <span className="text-[11px] text-orange-600 font-bold">◎{stats.inProgress}</span>
            <span className="text-[11px] text-red-600 font-bold">✕{stats.pending}</span>
            <span className="text-slate-300 text-[10px]">|</span>

            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <Input placeholder={`${t('검색')}...`} className="pl-5 w-28 h-6 text-[11px] border-slate-300 rounded" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <span className="text-slate-300 text-[10px]">|</span>

            {/* 액션 버튼 */}
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#22c55e] text-white hover:bg-[#16a34a]" onClick={handleImport}>↑Import</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#f97316] text-white hover:bg-[#ea580c]" onClick={handleExport}>↓Export</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#64748b] text-white hover:bg-[#475569]" onClick={handleDownloadTemplate}>📋양식</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#a855f7] text-white hover:bg-[#9333ea]" onClick={handleDeploy}>⇄H.P.</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#3b82f6] text-white hover:bg-[#2563eb]" onClick={handleAddRow}>+Add Row</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0d47a1] text-white hover:bg-[#1565c0]" onClick={handleSave}>⊞Save</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#00587a] text-white hover:bg-[#004060]" onClick={() => setIsHelpOpen(true)}>?Help</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-400 text-white hover:bg-slate-500"
              onClick={() => { try { window.close(); } catch { /* fallback */ } setTimeout(() => history.back(), 100); }}>✕Close</button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* 가상화 테이블 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-white border border-slate-300 shadow-sm">
          <table className="w-full text-[10px] border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-20 bg-[#00587a] text-white">
              <tr>
                {COLUMNS.map((col, i) => (
                  <th key={i} className={`px-0.5 py-1 border-b border-r border-white/20 font-bold text-center leading-tight ${col.key ? 'cursor-pointer hover:bg-[#004060] select-none' : ''}`}
                    style={col.w ? { width: col.w } : {}} onClick={() => col.key && handleSort(col.key)}>
                    <div className="text-[9px] leading-[11px]" style={{ whiteSpace: 'pre-line' }}>{col.ko}</div>
                    {col.key && <span className="text-[7px] opacity-60">{sortArrow(col.key)}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={COL_COUNT} className="text-center py-8 text-gray-400">{t('로딩 중...')}</td></tr>}
              {!isLoading && filteredData.length === 0 && <tr><td colSpan={COL_COUNT} className="text-center py-8 text-gray-400">등록된 LLD(필터코드) 데이터가 없습니다. [행추가] 또는 [Import]로 등록하세요.</td></tr>}
              {!isLoading && filteredData.length > 0 && paddingTop > 0 && <tr><td colSpan={COL_COUNT} style={{ height: paddingTop, padding: 0, border: 'none' }} /></tr>}
              {!isLoading && virtualItems.map(vRow => (
                <LLDTableRow key={filteredData[vRow.index].id} row={filteredData[vRow.index]} index={vRow.index} onCellChange={handleCellChange} onDeleteRow={handleDeleteRow} />
              ))}
              {!isLoading && filteredData.length > 0 && paddingBottom > 0 && <tr><td colSpan={COL_COUNT} style={{ height: paddingBottom, padding: 0, border: 'none' }} /></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <LLDHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </FixedLayout>
  );
}
