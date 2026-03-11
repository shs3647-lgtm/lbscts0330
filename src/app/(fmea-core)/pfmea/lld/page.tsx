/**
 * @file page.tsx
 * @description LLD(필터코드) 통합 관리 페이지 — 테이블 가상화 적용
 * @version 2.0.0 — @tanstack/react-virtual (6,000건+ 대응)
 */

'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Trash2 } from 'lucide-react';
import { downloadStyledExcel } from '@/lib/excel-utils';
import * as XLSX from 'xlsx';
import { FixedLayout, PFMEATopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';

import {
  LLDRow, LLDStats, CLASSIFICATION_OPTIONS, CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS, APPLY_TO_OPTIONS, APPLY_TO_LABELS, TARGET_OPTIONS,
  STATUS_OPTIONS, STATUS_COLORS, createEmptyLLDRow, type Classification,
} from './types';

const EXCEL_HEADERS = ['LLD_No','구분','적용','공정번호','공정명','제품명','고장형태','고장원인','O값','D값','개선대책','차종','대상','4M','발생장소','완료일자','상태','적용FMEA','적용일자'];
const EXCEL_COL_WIDTHS = [12,10,8,10,15,15,25,25,6,6,30,10,8,6,12,12,6,15,12];
const ROW_HEIGHT = 30;
const COL_COUNT = 16;
const COLUMNS = [
  { ko: 'LLD No', w: '5.5%', key: 'lldNo' }, { ko: '구분', w: '4.5%', key: 'classification' },
  { ko: '적용', w: '4%', key: 'applyTo' }, { ko: '공정번호', w: '4%', key: 'processNo' },
  { ko: '공정명', w: '6%', key: 'processName' }, { ko: '제품명', w: '3.5%', key: 'productName' },
  { ko: '고장형태', w: '10%', key: 'failureMode' }, { ko: '고장원인', w: '10%', key: 'cause' },
  { ko: 'O', w: '2.2%', key: 'occurrence' }, { ko: 'D', w: '2.2%', key: 'detection' },
  { ko: '개선대책', w: '', key: 'improvement' }, { ko: '차종', w: '3%', key: 'vehicle' },
  { ko: '대상', w: '3%', key: 'target' }, { ko: '상태', w: '2.5%', key: 'status' },
  { ko: 'FMEA', w: '5%', key: 'fmeaId' }, { ko: '', w: '1.5%', key: '' },
];

const getStatusBadgeStyle = (status: 'G' | 'Y' | 'R') => {
  const c = STATUS_COLORS[status];
  return { backgroundColor: c.background, color: c.color, border: 'none', fontWeight: 600 };
};

// ── 메모이제이션된 행 컴포넌트 ──
const LLDTableRow = React.memo(function LLDTableRow({
  row, index, onCellChange, onDeleteRow,
}: {
  row: LLDRow; index: number;
  onCellChange: (id: string, field: keyof LLDRow, value: string | number | null) => void;
  onDeleteRow: (id: string) => void;
}) {
  return (
    <tr className={index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50/60 hover:bg-blue-50'} style={{ height: ROW_HEIGHT }}>
      <td className="px-1 py-0 border-b border-r border-slate-200 text-center font-bold bg-slate-50 text-[10px] truncate">{row.lldNo}</td>
      <td className="p-0 border-b border-r border-slate-200 text-center">
        <Select value={row.classification} onValueChange={v => onCellChange(row.id, 'classification', v)}>
          <SelectTrigger className="h-5 text-[10px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden">
            <span className="px-1 py-0.5 rounded text-white text-[9px] font-bold" style={{ backgroundColor: CLASSIFICATION_COLORS[row.classification] }}>{CLASSIFICATION_LABELS[row.classification]}</span>
          </SelectTrigger>
          <SelectContent>{CLASSIFICATION_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-[11px]">{CLASSIFICATION_LABELS[o]}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-0 border-b border-r border-slate-200 text-center">
        <Select value={row.applyTo} onValueChange={v => onCellChange(row.id, 'applyTo', v)}>
          <SelectTrigger className="h-5 text-[10px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden"><SelectValue /></SelectTrigger>
          <SelectContent>{APPLY_TO_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-[11px]">{APPLY_TO_LABELS[o]}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-0 border-b border-r border-slate-200">
        <Input value={row.processNo} onChange={e => onCellChange(row.id, 'processNo', e.target.value)}
          className={`h-5 text-[10px] border-0 bg-transparent focus:bg-white p-0 text-center ${!row.processNo ? 'bg-red-50' : ''}`} placeholder="*" />
      </td>
      <td className="p-0 border-b border-r border-slate-200">
        <Input value={row.processName} onChange={e => onCellChange(row.id, 'processName', e.target.value)}
          className={`h-5 text-[10px] border-0 bg-transparent focus:bg-white p-0 text-center ${!row.processName ? 'bg-red-50' : ''}`} placeholder="*" />
      </td>
      <td className="p-0 border-b border-r border-slate-200">
        <Input value={row.productName} onChange={e => onCellChange(row.id, 'productName', e.target.value)}
          className={`h-5 text-[10px] border-0 bg-transparent focus:bg-white p-0 text-center ${!row.productName ? 'bg-red-50' : ''}`} placeholder="*" />
      </td>
      <td className="px-1 py-0 border-b border-r border-slate-200 text-[10px] truncate">{row.failureMode || '\u00A0'}</td>
      <td className="px-1 py-0 border-b border-r border-slate-200 text-[10px] truncate">{row.cause || '\u00A0'}</td>
      <td className="p-0 border-b border-r border-slate-200 text-center align-middle" style={{ backgroundColor: '#eef6fb' }}>
        <input type="number" min={1} max={10} value={row.occurrence ?? ''} onChange={e => onCellChange(row.id, 'occurrence', e.target.value ? parseInt(e.target.value, 10) : null)}
          className="w-full border-0 text-center font-bold outline-none" style={{ fontSize: 13, height: 24, appearance: 'textfield', MozAppearance: 'textfield', background: 'transparent', color: '#1a365d' }} />
      </td>
      <td className="p-0 border-b border-r border-slate-200 text-center align-middle" style={{ backgroundColor: '#fef9ee' }}>
        <input type="number" min={1} max={10} value={row.detection ?? ''} onChange={e => onCellChange(row.id, 'detection', e.target.value ? parseInt(e.target.value, 10) : null)}
          className="w-full border-0 text-center font-bold outline-none" style={{ fontSize: 13, height: 24, appearance: 'textfield', MozAppearance: 'textfield', background: 'transparent', color: '#7c2d12' }} />
      </td>
      <td className="px-1 py-0 border-b border-r border-slate-200 text-[10px] truncate">{row.improvement || '\u00A0'}</td>
      <td className="p-0 border-b border-r border-slate-200">
        <Input value={row.vehicle} onChange={e => onCellChange(row.id, 'vehicle', e.target.value)} className="h-5 text-[10px] border-0 bg-transparent focus:bg-white p-0 text-center" />
      </td>
      <td className="p-0 border-b border-r border-slate-200 text-center">
        <Select value={row.target} onValueChange={v => onCellChange(row.id, 'target', v)}>
          <SelectTrigger className="h-5 text-[10px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden"><SelectValue /></SelectTrigger>
          <SelectContent>{TARGET_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-[11px]">{o}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-0 border-b border-r border-slate-200 text-center">
        <Select value={row.status} onValueChange={v => onCellChange(row.id, 'status', v)}>
          <SelectTrigger className="h-5 text-[10px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden">
            <Badge style={getStatusBadgeStyle(row.status as 'G' | 'Y' | 'R')} className="h-4 text-[9px] px-1">{row.status}</Badge>
          </SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-[11px]">{STATUS_COLORS[o].label}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-0.5 py-0 border-b border-r border-slate-200 text-center text-[9px] font-mono truncate">{row.fmeaId || '-'}</td>
      <td className="p-0 border-b border-slate-200 text-center">
        <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-red-600" onClick={() => onDeleteRow(row.id)}><Trash2 className="w-3 h-3" /></Button>
      </td>
    </tr>
  );
});

// ── 메인 페이지 ──
export default function LLDPage() {
  const { t } = useLocale();
  const [data, setData] = useState<LLDRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('lldNo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/lld');
        const result = await res.json();
        if (result.success && result.items?.length > 0) {
          setData(result.items.map((item: LLDRow) => ({ ...item, occurrence: item.occurrence ?? null, detection: item.detection ?? null })));
        }
      } catch (error) { console.error('[LLD] 로드 오류:', error); }
      finally { setIsLoading(false); }
    })();
  }, []);

  const stats = useMemo<LLDStats>(() => {
    const byClassification: Record<string, number> = {};
    for (const c of CLASSIFICATION_OPTIONS) byClassification[c] = 0;
    for (const row of data) byClassification[row.classification] = (byClassification[row.classification] || 0) + 1;
    return { total: data.length, completed: data.filter(d => d.status === 'G').length, inProgress: data.filter(d => d.status === 'Y').length, pending: data.filter(d => d.status === 'R').length, byClassification };
  }, [data]);

  const handleSort = useCallback((key: string) => {
    setSortKey(prev => { setSortDir(d => prev === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); return key; });
  }, []);

  const filteredData = useMemo(() => {
    const filtered = data.filter(row => {
      if (filterClassification !== 'all' && row.classification !== filterClassification) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const searchable = [row.lldNo, CLASSIFICATION_LABELS[row.classification], row.processNo, row.processName, row.productName, row.failureMode, row.cause, row.improvement, row.vehicle, row.fmeaId].join(' ').toLowerCase();
        if (!searchable.includes(s)) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'ko', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, searchTerm, filterClassification, sortKey, sortDir]);

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

  const handleCellChange = useCallback((id: string, field: keyof LLDRow, value: string | number | null) => {
    setData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  }, []);

  const handleAddRow = useCallback(() => setData(prev => [...prev, createEmptyLLDRow()]), []);
  const handleDeleteRow = useCallback((id: string) => {
    if (confirm('삭제하시겠습니까?')) setData(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleSave = async () => {
    const invalid = data.find(r => !r.processNo || !r.processName || !r.productName);
    if (invalid) { alert(`필수 필드 누락: ${invalid.lldNo} — 공정번호, 공정명, 제품명은 필수입니다.`); return; }
    try {
      const res = await fetch('/api/lld', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: data }) });
      const result = await res.json();
      if (result.success) alert(`저장 완료 (${result.count}건)`);
      else alert('저장 실패: ' + (result.error || '알 수 없는 오류'));
    } catch (error) { console.error('[LLD Save] 오류:', error); alert('저장 중 오류가 발생했습니다.'); }
  };

  const handleExport = () => {
    if (data.length === 0) { alert('내보낼 데이터가 없습니다.'); return; }
    const rows = data.map(row => [row.lldNo, row.classification, row.applyTo === 'prevention' ? '예방관리' : '검출관리', row.processNo, row.processName, row.productName, row.failureMode, row.cause, row.occurrence ?? '', row.detection ?? '', row.improvement, row.vehicle, row.target, row.m4Category, row.location, row.completedDate, row.status, row.fmeaId, row.appliedDate]);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadStyledExcel(EXCEL_HEADERS, rows, EXCEL_COL_WIDTHS, 'LLD(필터코드)', `LLD_Export_${today}.xlsx`);
  };

  const handleImport = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { alert('시트가 없습니다.'); return; }
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      if (json.length === 0) { alert('데이터가 없습니다.'); return; }
      const imported: LLDRow[] = json.map((row, idx) => ({
        ...createEmptyLLDRow(), id: `lld-import-${Date.now()}-${idx}`,
        lldNo: String(row['LLD_No'] || row['lldNo'] || '').trim() || `LLD${new Date().getFullYear().toString().slice(-2)}-${String(idx + 1).padStart(3, '0')}`,
        classification: (CLASSIFICATION_OPTIONS.includes(row['구분'] as Classification) ? row['구분'] : 'CIP') as Classification,
        applyTo: row['적용']?.includes('검출') ? 'detection' as const : 'prevention' as const,
        processNo: String(row['공정번호'] || '').trim(), processName: String(row['공정명'] || '').trim(), productName: String(row['제품명'] || '').trim(),
        failureMode: String(row['고장형태'] || '').trim(), cause: String(row['고장원인'] || '').trim(),
        occurrence: row['O값'] ? parseInt(String(row['O값']), 10) || null : null, detection: row['D값'] ? parseInt(String(row['D값']), 10) || null : null,
        improvement: String(row['개선대책'] || '').trim(), vehicle: String(row['차종'] || '').trim(), target: String(row['대상'] || '제조').trim(),
        m4Category: String(row['4M'] || '').trim(), location: String(row['발생장소'] || '').trim(),
        status: (['G','Y','R'].includes(String(row['상태']||'').trim()) ? String(row['상태']).trim() : 'R') as 'G'|'Y'|'R',
      }));
      setData(prev => { const map = new Map(prev.map(r => [r.lldNo, r])); for (const row of imported) map.set(row.lldNo, row); return Array.from(map.values()); });
      alert(`Import 완료: ${imported.length}건`);
    } catch (error) { console.error('[LLD Import] 오류:', error); alert('엑셀 읽기 오류'); }
    e.target.value = '';
  };

  const handleDeploy = async () => {
    const source = prompt('소스 제품명을 입력하세요 (복사할 LLD의 제품명):');
    if (!source) return;
    const target = prompt('대상 제품명을 입력하세요 (전개할 제품명):');
    if (!target) return;
    try {
      const res = await fetch('/api/lld/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceProductName: source, targetProductName: target }) });
      const result = await res.json();
      if (result.success) { alert(result.message); const r = await fetch('/api/lld'); const rr = await r.json(); if (rr.success) setData(rr.items); }
      else alert('수평전개 실패: ' + (result.error || ''));
    } catch (error) { console.error('[LLD Deploy] 오류:', error); alert('수평전개 중 오류'); }
  };

  const sortArrow = (key: string) => {
    if (sortKey === key) return sortDir === 'asc' ? '▲' : '▼';
    return <span className="opacity-30">▽</span>;
  };

  return (
    <FixedLayout topNav={<PFMEATopNav />} showSidebar={true} bgColor="#f5f5f5" contentPadding="p-2">
      <div className="flex flex-col h-full font-['Malgun_Gothic',sans-serif]">
        {/* 메뉴바 */}
        <div className="flex-shrink-0 sticky top-0 z-30 bg-white border-b border-slate-300 shadow-sm px-1 py-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            <button className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${filterClassification === 'all' ? 'bg-[#00587a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} onClick={() => setFilterClassification('all')}>{t('전체')}({stats.total})</button>
            {CLASSIFICATION_OPTIONS.map(c => (
              <button key={c} className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${filterClassification === c ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                style={filterClassification === c ? { backgroundColor: CLASSIFICATION_COLORS[c] } : {}} onClick={() => setFilterClassification(c)}>{CLASSIFICATION_LABELS[c]}({stats.byClassification[c] || 0})</button>
            ))}
            <span className="text-slate-300 text-[10px]">|</span>
            <span className="text-[11px] text-green-600 font-bold">✓{stats.completed}</span>
            <span className="text-[11px] text-orange-600 font-bold">◎{stats.inProgress}</span>
            <span className="text-[11px] text-red-600 font-bold">✕{stats.pending}</span>
            <span className="text-slate-300 text-[10px]">|</span>
            <div className="relative">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <Input placeholder={`${t('검색')}...`} className="pl-5 w-28 h-6 text-[11px] border-slate-300 rounded" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <span className="text-slate-300 text-[10px]">|</span>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#22c55e] text-white hover:bg-[#16a34a]" onClick={handleImport}>↑Import</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#f97316] text-white hover:bg-[#ea580c]" onClick={handleExport}>↓Export</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#a855f7] text-white hover:bg-[#9333ea]" onClick={handleDeploy}>⇄H.P.</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#3b82f6] text-white hover:bg-[#2563eb]" onClick={handleAddRow}>+Add Row</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0d47a1] text-white hover:bg-[#1565c0]" onClick={handleSave}>⊞Save</button>
            <button className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-400 text-white hover:bg-slate-500" onClick={() => { try { window.close(); } catch { /* fallback */ } setTimeout(() => history.back(), 100); }}>✕Close</button>
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
                    <div className="text-[10px] leading-none">{col.ko}</div>
                    {col.key && <span className="text-[7px]">{sortArrow(col.key)}</span>}
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
    </FixedLayout>
  );
}
