/**
 * @file page.tsx
 * @description AP 개선관리(CIP) 메인 페이지 — LLD 스타일 + 테이블 가상화
 * @version 7.0.0
 * 성능: @tanstack/react-virtual로 화면에 보이는 행만 렌더링 (6,000건+ 대응)
 */

'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Trash2, Edit2 } from 'lucide-react';
import { FixedLayout, PFMEATopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';

import { APItem } from './types';
import { calculateStats } from './utils';
import APModal from './APModal';
import APSummaryChart from './APSummaryChart';
import APImprovementChart from './APImprovementChart';
import { useAPData } from './hooks/useAPData';
import { useAPImportExport, CIP_TARGETS, type CIPTarget } from './hooks/useAPImportExport';
import APHelpModal from './components/APHelpModal';

const TARGET_COLORS: Record<string, string> = {
  Field: '#8b5cf6', Yield: '#3b82f6', Quality: '#ef4444',
  Cost: '#f97316', Delivery: '#22c55e', Safety: '#ec4899',
};

const STATUS_MAP: Record<string, { label: string; bg: string }> = {
  '대기': { label: '대기', bg: '#9ca3af' },
  '진행중': { label: '진행', bg: '#f97316' },
  '완료': { label: '완료', bg: '#2563eb' },
};

const ROW_HEIGHT = 24;
const COL_COUNT = 16;

const COLUMNS = [
  { ko: '#', w: '2.5%', key: '' },
  { ko: 'CIP No', w: '5%', key: 'cipNo' },
  { ko: 'AP', w: '2.5%', key: 'ap5' },
  { ko: '대상', w: '4%', key: 'target' },
  { ko: '공정번호', w: '4%', key: 'processNo' },
  { ko: '공정명', w: '6%', key: 'processName' },
  { ko: 'S', w: '2%', key: 'severity' },
  { ko: '고장형태(FM)', w: '10%', key: 'failureMode' },
  { ko: '고장원인(FC)', w: '10%', key: 'failureCause' },
  { ko: 'O', w: '2%', key: 'occurrence' },
  { ko: 'D', w: '2%', key: 'detection' },
  { ko: '개선대책', w: '', key: 'improvement' },
  { ko: '담당자', w: '4%', key: 'responsible' },
  { ko: '상태', w: '3%', key: 'status' },
  { ko: '완료', w: '4.5%', key: 'dueDate' },
  { ko: '', w: '2.5%', key: '' },
];

// ── 가상화 행에 전달할 확장 데이터 ──
interface RowData {
  item: APItem;
  index: number;
  cipNo: string;
  target: CIPTarget;
  isManual: boolean;
}

// ── 메모이제이션된 행 컴포넌트 ──
const APRow = React.memo(function APRow({
  row,
  onTargetChange,
  onOpenModal,
  onDeleteRow,
}: {
  row: RowData;
  onTargetChange: (id: string, target: string) => void;
  onOpenModal: (item: APItem) => void;
  onDeleteRow: (id: string) => void;
}) {
  const { item, index, cipNo, target, isManual } = row;
  const statusInfo = STATUS_MAP[item.status] || STATUS_MAP['대기'];

  return (
    <tr
      className={index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50'}
      style={{ height: ROW_HEIGHT }}
    >
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-center font-bold bg-slate-50 text-[8px]">{index + 1}</td>
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-center font-bold text-[7px] font-mono text-[#00587a]">{cipNo}</td>
      <td className="p-0 border-b border-r border-slate-200 text-center">
        <span
          className="inline-block w-4 h-4 rounded-full text-white text-[8px] leading-4 font-bold"
          style={{ backgroundColor: item.ap5 === 'H' ? '#ef4444' : item.ap5 === 'M' ? '#f97316' : '#22c55e' }}
        >{item.ap5}</span>
      </td>
      <td className="p-0 border-b border-r border-slate-200 text-center">
        <Select value={target} onValueChange={v => onTargetChange(item.id, v)}>
          <SelectTrigger className="h-4 text-[7px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden">
            <span className="px-1 rounded text-white text-[7px] font-bold" style={{ backgroundColor: TARGET_COLORS[target] }}>{target}</span>
          </SelectTrigger>
          <SelectContent>
            {CIP_TARGETS.map(tgt => <SelectItem key={tgt} value={tgt} className="text-[9px]">{tgt}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-center text-[8px] truncate">{item.specialChar || '-'}</td>
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-center text-[8px] truncate">{item.processName || '-'}</td>
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-center font-bold text-[9px]">{item.severity || '-'}</td>
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-[8px] truncate">{item.failureMode || '\u00A0'}</td>
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-[8px] truncate">{item.failureCause || '\u00A0'}</td>
      <td className="p-0 border-b border-r border-slate-200 text-center font-bold text-[9px]" style={{ backgroundColor: '#eef6fb', color: '#1a365d' }}>{item.occurrence || '-'}</td>
      <td className="p-0 border-b border-r border-slate-200 text-center font-bold text-[9px]" style={{ backgroundColor: '#fef9ee', color: '#7c2d12' }}>{item.detection || '-'}</td>
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-[8px] truncate">{item.preventionAction || item.detectionAction || '\u00A0'}</td>
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-center text-[8px] truncate">{item.responsible || '-'}</td>
      <td className="p-0 border-b border-r border-slate-200 text-center">
        <Badge style={{ backgroundColor: statusInfo.bg, color: '#fff', border: 'none', fontWeight: 600 }} className="h-3 text-[6px] px-0.5">{statusInfo.label}</Badge>
      </td>
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-center text-[7px] truncate">{item.dueDate || '-'}</td>
      <td className="p-0 border-b border-slate-200 text-center">
        <div className="flex items-center justify-center gap-0">
          <Button variant="ghost" size="sm" className="h-3.5 w-3.5 p-0" onClick={() => onOpenModal(item)}><Edit2 className="w-2.5 h-2.5 text-blue-600" /></Button>
          {isManual && <Button variant="ghost" size="sm" className="h-3.5 w-3.5 p-0" onClick={() => onDeleteRow(item.id)}><Trash2 className="w-2.5 h-2.5 text-red-500" /></Button>}
        </div>
      </td>
    </tr>
  );
});

// ── 메인 페이지 ──
export default function APImprovementPage() {
  const { t } = useLocale();
  const { projects, selectedFmeaId, setSelectedFmeaId, data, loading, updateItem, refresh } = useAPData();

  const [filterAP, setFilterAP] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<APItem | null>(null);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [cipOverlay, setCipOverlay] = useState<Record<string, { cipNo: string; target: CIPTarget }>>({});
  const [manualRows, setManualRows] = useState<APItem[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allData = useMemo(() => [...data, ...manualRows], [data, manualRows]);
  const stats = calculateStats(allData);

  const {
    fileInputRef,
    handleExport, handleDownloadTemplate,
    handleImport, handleFileChange,
    handleSave: handleSaveToDb,
    handleDeleteAll,
  } = useAPImportExport({
    allData, manualRows, setManualRows, cipOverlay, setCipOverlay, selectedFmeaId, refresh,
  });

  // Filter + sort → 가상화할 최종 데이터
  const filteredData = useMemo(() => {
    const filtered = allData.filter(item => {
      if (filterAP !== 'all' && item.ap5 !== filterAP) return false;
      if (filterTarget !== 'all' && (cipOverlay[item.id]?.target || 'Quality') !== filterTarget) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const searchable = [item.failureMode, item.failureCause, item.processName, item.responsible, item.preventionAction, item.detectionAction].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(s)) return false;
      }
      return true;
    });
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'ko', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allData, filterAP, filterTarget, searchTerm, sortKey, sortDir, cipOverlay]);

  // 행 확장 데이터 (cipNo, target 사전 계산 → 렌더 중 함수 호출 제거)
  const rowDataList = useMemo<RowData[]>(() => {
    const yr = new Date().getFullYear().toString().slice(-2);
    return filteredData.map((item, index) => ({
      item,
      index,
      cipNo: cipOverlay[item.id]?.cipNo || `CIP${yr}-${String(index + 1).padStart(3, '0')}`,
      target: cipOverlay[item.id]?.target || 'Quality' as CIPTarget,
      isManual: item.id.startsWith('cip-manual-'),
    }));
  }, [filteredData, cipOverlay]);

  // ── 가상화 ──
  const virtualizer = useVirtualizer({
    count: rowDataList.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? totalHeight - virtualItems[virtualItems.length - 1].end : 0;

  // ── 카운트 (메모이제이션) ──
  const apCounts = useMemo(() => ({
    H: allData.filter(d => d.ap5 === 'H').length,
    M: allData.filter(d => d.ap5 === 'M').length,
    L: allData.filter(d => d.ap5 === 'L').length,
  }), [allData]);

  const statusCounts = useMemo(() => ({
    completed: allData.filter(d => d.status === '완료').length,
    inProgress: allData.filter(d => d.status === '진행중').length,
    pending: allData.filter(d => d.status === '대기').length,
  }), [allData]);

  // ── 핸들러 (useCallback으로 메모이제이션 → APRow 불필요 리렌더 방지) ──
  const handleSort = useCallback((key: string) => {
    setSortKey(prev => { setSortDir(d => prev === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); return key; });
  }, []);

  const handleTargetChange = useCallback((id: string, target: string) => {
    setCipOverlay(prev => ({
      ...prev,
      [id]: { cipNo: prev[id]?.cipNo || '', target: target as CIPTarget },
    }));
  }, []);

  const handleAddRow = useCallback(() => {
    const newId = `cip-manual-${Date.now()}`;
    const yr = new Date().getFullYear().toString().slice(-2);
    const cipNo = `CIP${yr}-M${String(Date.now() % 1000).padStart(3, '0')}`;
    setManualRows(prev => [...prev, {
      id: newId, riskId: newId, fmeaId: selectedFmeaId || '', linkId: '',
      ap5: 'M', ap6: '', specialChar: '', category: '',
      preventiveControl: '', severity: 0, failureMode: '', failureCause: '',
      occurrence: 0, detectionControl: '', detection: 0,
      preventionAction: '', detectionAction: '', responsible: '',
      status: '대기', dueDate: '', processName: '',
    } as APItem]);
    setCipOverlay(prev => ({ ...prev, [newId]: { cipNo, target: 'Quality' as CIPTarget } }));
  }, [selectedFmeaId]);

  const handleDeleteRow = useCallback((id: string) => {
    if (!id.startsWith('cip-manual-')) return;
    if (!confirm('삭제하시겠습니까?')) return;
    setManualRows(prev => prev.filter(r => r.id !== id));
    setCipOverlay(prev => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  const openModal = useCallback((item: APItem) => { setEditingItem(item); setIsModalOpen(true); }, []);

  const handleSave = async (riskId: string, updates: Partial<APItem>) => {
    if (!editingItem) return;
    const ok = await updateItem(riskId, editingItem.fmeaId, updates);
    if (ok) { setIsModalOpen(false); setEditingItem(null); }
  };

  const sortArrow = (key: string) => {
    if (sortKey === key) return sortDir === 'asc' ? '▲' : '▼';
    return <span className="opacity-30">▽</span>;
  };

  const showEmpty = !loading && selectedFmeaId && filteredData.length === 0;
  const showSelect = !loading && !selectedFmeaId;

  return (
    <FixedLayout topNav={<PFMEATopNav />} showSidebar={true} bgColor="#f5f5f5" contentPadding="p-2">
      <div className="flex flex-col h-full font-['Malgun_Gothic',sans-serif]">
        {/* 차트 영역 */}
        <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-2 mb-1">
          <APSummaryChart stats={stats} data={allData} />
          <APImprovementChart data={allData} />
        </div>

        {/* 컴팩트 메뉴바 */}
        <div className="flex-shrink-0 bg-white border-b border-slate-300 shadow-sm px-1 py-0.5 mb-0.5">
          <div className="flex items-center gap-0.5 flex-wrap">
            <Select value={selectedFmeaId} onValueChange={setSelectedFmeaId}>
              <SelectTrigger className="h-5 w-36 text-[8px] border-slate-300 bg-white px-1 [&>svg]:h-2.5 [&>svg]:w-2.5">
                <SelectValue placeholder="프로젝트" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.fmeaId} value={p.fmeaId} className="text-[9px]">{p.productName || p.fmeaId}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-slate-300 text-[8px]">|</span>
            <button className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${filterAP === 'all' ? 'bg-[#00587a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} onClick={() => setFilterAP('all')}>{t('전체')}({allData.length})</button>
            {(['H', 'M', 'L'] as const).map(lv => (
              <button key={lv} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${filterAP === lv ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                style={filterAP === lv ? { backgroundColor: lv === 'H' ? '#ef4444' : lv === 'M' ? '#f97316' : '#22c55e' } : {}}
                onClick={() => setFilterAP(lv)}>{lv}({apCounts[lv]})</button>
            ))}
            <span className="text-slate-300 text-[8px]">|</span>
            <button className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${filterTarget === 'all' ? 'bg-[#00587a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} onClick={() => setFilterTarget('all')}>All</button>
            {CIP_TARGETS.map(tgt => (
              <button key={tgt} className={`px-1 py-0.5 rounded text-[8px] font-bold ${filterTarget === tgt ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                style={filterTarget === tgt ? { backgroundColor: TARGET_COLORS[tgt] } : {}}
                onClick={() => setFilterTarget(tgt)}>{tgt}</button>
            ))}
            <span className="text-slate-300 text-[8px]">|</span>
            <span className="text-[9px] text-blue-600 font-bold">✓{statusCounts.completed}</span>
            <span className="text-[9px] text-orange-600 font-bold">◎{statusCounts.inProgress}</span>
            <span className="text-[9px] text-gray-500 font-bold">✕{statusCounts.pending}</span>
            <span className="text-slate-300 text-[8px]">|</span>
            <div className="relative">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400" />
              <Input placeholder={`${t('검색')}...`} className="pl-5 w-24 h-5 text-[9px] border-slate-300 rounded" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <span className="text-slate-300 text-[8px]">|</span>
            <button className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#22c55e] text-white hover:bg-[#16a34a]" onClick={handleImport}>↑Import</button>
            <button className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f97316] text-white hover:bg-[#ea580c]" onClick={handleExport}>↓Export</button>
            <button className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#64748b] text-white hover:bg-[#475569]" onClick={handleDownloadTemplate}>📋양식</button>
            <button className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#3b82f6] text-white hover:bg-[#2563eb]" onClick={handleAddRow}>+Add</button>
            <button className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0d47a1] text-white hover:bg-[#1565c0]" onClick={handleSaveToDb}>⊞Save</button>
            <button className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#dc2626] text-white hover:bg-[#b91c1c]" onClick={handleDeleteAll}>✕Del</button>
            <button className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0d9488] text-white hover:bg-[#0f766e]" onClick={refresh} disabled={loading}>{loading ? '⟳...' : '⟳Refresh'}</button>
            <button className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#6366f1] text-white hover:bg-[#4f46e5]" onClick={() => setIsHelpOpen(true)}>?Help</button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* 가상화 테이블 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-white border border-slate-300 shadow-sm">
          <table className="w-full text-[9px] border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-20 bg-[#00587a] text-white">
              <tr>
                {COLUMNS.map((col, i) => (
                  <th key={i}
                    className={`px-0.5 py-0.5 border-b border-r border-white/20 font-bold text-center leading-tight ${col.key ? 'cursor-pointer hover:bg-[#004060] select-none' : ''}`}
                    style={col.w ? { width: col.w } : {}}
                    onClick={() => col.key && handleSort(col.key)}>
                    <div className="text-[8px] leading-none">{col.ko}</div>
                    {col.key && <span className="text-[6px]">{sortArrow(col.key)}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={COL_COUNT} className="text-center py-8 text-gray-400">{t('로딩 중...')}</td></tr>}
              {showSelect && <tr><td colSpan={COL_COUNT} className="text-center py-8 text-gray-400">{t('프로젝트를 선택해 주세요.')}</td></tr>}
              {showEmpty && <tr><td colSpan={COL_COUNT} className="text-center py-8 text-gray-400">CIP 개선 대상 항목이 없습니다.</td></tr>}
              {!loading && filteredData.length > 0 && paddingTop > 0 && (
                <tr><td colSpan={COL_COUNT} style={{ height: paddingTop, padding: 0, border: 'none' }} /></tr>
              )}
              {!loading && virtualItems.map(vRow => (
                <APRow
                  key={rowDataList[vRow.index].item.id}
                  row={rowDataList[vRow.index]}
                  onTargetChange={handleTargetChange}
                  onOpenModal={openModal}
                  onDeleteRow={handleDeleteRow}
                />
              ))}
              {!loading && filteredData.length > 0 && paddingBottom > 0 && (
                <tr><td colSpan={COL_COUNT} style={{ height: paddingBottom, padding: 0, border: 'none' }} /></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <APModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        editingItem={editingItem}
        onSave={handleSave}
      />
      <APHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </FixedLayout>
  );
}
