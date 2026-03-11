/**
 * @file page.tsx
 * @description DFMEA LLD(필터코드) 통합 관리 페이지 — 테이블 가상화 적용
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
import { Plus, Search, Download, Upload, Trash2, Save, GitBranch } from 'lucide-react';
import { downloadStyledExcel } from '@/lib/excel-utils';
import * as XLSX from 'xlsx';
import { FixedLayout, DFMEATopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';

import {
  LLDRow, LLDStats, CLASSIFICATION_OPTIONS, CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS, APPLY_TO_OPTIONS, APPLY_TO_LABELS, TARGET_OPTIONS,
  STATUS_OPTIONS, STATUS_COLORS, createEmptyLLDRow, type Classification,
} from './types';

const EXCEL_HEADERS = ['LLD_No','구분','적용','공정번호','공정명','제품명','고장형태','고장원인','O값','D값','개선대책','차종','대상','4M','발생장소','완료일자','상태','적용FMEA','적용일자'];
const EXCEL_COL_WIDTHS = [12,10,8,10,15,15,25,25,6,6,30,10,8,6,12,12,6,15,12];
const ROW_HEIGHT = 28;
const COL_COUNT = 16;
const TABLE_COLS = [
  { label: '구분', w: 65 }, { label: '적용', w: 55 },
  { label: '공정번호', w: 60 }, { label: '공정명', w: 100 }, { label: '제품명', w: 100 },
  { label: '고장형태', w: 140 }, { label: '고장원인', w: 140 },
  { label: 'O', w: 30 }, { label: 'D', w: 30 }, { label: '개선대책', w: 180 },
  { label: '차종', w: 50 }, { label: '대상', w: 45 }, { label: '상태', w: 35 },
  { label: '적용FMEA', w: 70 }, { label: '-', w: 25 },
];

const getStatusBadgeStyle = (status: 'G' | 'Y' | 'R') => {
  const c = STATUS_COLORS[status];
  return { backgroundColor: c.background, color: c.color, border: 'none', fontWeight: 600 };
};

// ── 메모이제이션된 행 컴포넌트 ──
const LLDTableRow = React.memo(function LLDTableRow({
  row, index, onCellChange, onDeleteRow, t,
}: {
  row: LLDRow; index: number; t: (s: string) => string;
  onCellChange: (id: string, field: keyof LLDRow, value: string | number | null) => void;
  onDeleteRow: (id: string) => void;
}) {
  return (
    <tr className={index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50'} style={{ height: ROW_HEIGHT }}>
      <td className="p-0.5 border-b border-r border-slate-200 text-center font-bold bg-slate-50 text-[9px] truncate">{row.lldNo}</td>
      <td className="p-0.5 border-b border-r border-slate-200 text-center">
        <Select value={row.classification} onValueChange={v => onCellChange(row.id, 'classification', v)}>
          <SelectTrigger className="h-5 text-[9px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden">
            <span className="px-1 py-0.5 rounded text-white text-[8px] font-bold" style={{ backgroundColor: CLASSIFICATION_COLORS[row.classification] }}>{CLASSIFICATION_LABELS[row.classification]}</span>
          </SelectTrigger>
          <SelectContent>{CLASSIFICATION_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-[9px]">{CLASSIFICATION_LABELS[o]}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-0.5 border-b border-r border-slate-200 text-center">
        <Select value={row.applyTo} onValueChange={v => onCellChange(row.id, 'applyTo', v)}>
          <SelectTrigger className="h-5 text-[9px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden"><SelectValue /></SelectTrigger>
          <SelectContent>{APPLY_TO_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-[9px]">{APPLY_TO_LABELS[o]}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-0.5 border-b border-r border-slate-200">
        <Input value={row.processNo} onChange={e => onCellChange(row.id, 'processNo', e.target.value)} className={`h-5 text-[9px] border-0 bg-transparent focus:bg-white p-0 text-center ${!row.processNo ? 'bg-red-50' : ''}`} placeholder={t('필수')} />
      </td>
      <td className="p-0.5 border-b border-r border-slate-200">
        <Input value={row.processName} onChange={e => onCellChange(row.id, 'processName', e.target.value)} className={`h-5 text-[9px] border-0 bg-transparent focus:bg-white p-0 ${!row.processName ? 'bg-red-50' : ''}`} placeholder={t('필수')} />
      </td>
      <td className="p-0.5 border-b border-r border-slate-200">
        <Input value={row.productName} onChange={e => onCellChange(row.id, 'productName', e.target.value)} className={`h-5 text-[9px] border-0 bg-transparent focus:bg-white p-0 ${!row.productName ? 'bg-red-50' : ''}`} placeholder={t('필수')} />
      </td>
      <td className="p-0.5 border-b border-r border-slate-200">
        <Input value={row.failureMode} onChange={e => onCellChange(row.id, 'failureMode', e.target.value)} className="h-5 text-[9px] border-0 bg-transparent focus:bg-white p-0" />
      </td>
      <td className="p-0.5 border-b border-r border-slate-200">
        <Input value={row.cause} onChange={e => onCellChange(row.id, 'cause', e.target.value)} className="h-5 text-[9px] border-0 bg-transparent focus:bg-white p-0" />
      </td>
      <td className="p-0.5 border-b border-r border-slate-200 text-center">
        <Input type="number" min={1} max={10} value={row.occurrence ?? ''} onChange={e => onCellChange(row.id, 'occurrence', e.target.value ? parseInt(e.target.value, 10) : null)}
          className={`h-5 text-[9px] border-0 bg-transparent focus:bg-white p-0 text-center w-full ${row.applyTo === 'prevention' && !row.occurrence ? 'bg-yellow-50' : ''}`} />
      </td>
      <td className="p-0.5 border-b border-r border-slate-200 text-center">
        <Input type="number" min={1} max={10} value={row.detection ?? ''} onChange={e => onCellChange(row.id, 'detection', e.target.value ? parseInt(e.target.value, 10) : null)}
          className={`h-5 text-[9px] border-0 bg-transparent focus:bg-white p-0 text-center w-full ${row.applyTo === 'detection' && !row.detection ? 'bg-yellow-50' : ''}`} />
      </td>
      <td className="p-0.5 border-b border-r border-slate-200">
        <Input value={row.improvement} onChange={e => onCellChange(row.id, 'improvement', e.target.value)} className="h-5 text-[9px] border-0 bg-transparent focus:bg-white p-0" />
      </td>
      <td className="p-0.5 border-b border-r border-slate-200">
        <Input value={row.vehicle} onChange={e => onCellChange(row.id, 'vehicle', e.target.value)} className="h-5 text-[9px] border-0 bg-transparent focus:bg-white p-0 text-center" />
      </td>
      <td className="p-0.5 border-b border-r border-slate-200 text-center">
        <Select value={row.target} onValueChange={v => onCellChange(row.id, 'target', v)}>
          <SelectTrigger className="h-5 text-[9px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden"><SelectValue /></SelectTrigger>
          <SelectContent>{TARGET_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-[9px]">{o}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-0.5 border-b border-r border-slate-200 text-center">
        <Select value={row.status} onValueChange={v => onCellChange(row.id, 'status', v)}>
          <SelectTrigger className="h-5 text-[8px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden">
            <Badge style={getStatusBadgeStyle(row.status as 'G' | 'Y' | 'R')} className="h-4 text-[7px] px-1">{row.status}</Badge>
          </SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-[9px]">{STATUS_COLORS[o].label}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-0.5 border-b border-r border-slate-200 text-center text-[8px] font-mono truncate">{row.fmeaId || '-'}</td>
      <td className="p-0.5 border-b border-slate-200 text-center">
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
  const [filterApplyTo, setFilterApplyTo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
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

  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (![row.processNo, row.processName, row.productName, row.failureMode, row.cause, row.improvement].join(' ').toLowerCase().includes(s)) return false;
      }
      if (filterClassification !== 'all' && row.classification !== filterClassification) return false;
      if (filterApplyTo !== 'all' && row.applyTo !== filterApplyTo) return false;
      if (filterStatus !== 'all' && row.status !== filterStatus) return false;
      return true;
    });
  }, [data, searchTerm, filterClassification, filterApplyTo, filterStatus]);

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
    if (invalid) { alert(`필수 필드 누락: ${invalid.lldNo}`); return; }
    try {
      const res = await fetch('/api/lld', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: data }) });
      const result = await res.json();
      if (result.success) alert(`저장 완료 (${result.count}건)`);
      else alert('저장 실패: ' + (result.error || ''));
    } catch (error) { console.error('[LLD Save]:', error); alert('저장 중 오류'); }
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
    } catch (error) { console.error('[LLD Import]:', error); alert('엑셀 읽기 오류'); }
    e.target.value = '';
  };

  const handleDeploy = async () => {
    const source = prompt('소스 제품명을 입력하세요:');
    if (!source) return;
    const target = prompt('대상 제품명을 입력하세요:');
    if (!target) return;
    try {
      const res = await fetch('/api/lld/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceProductName: source, targetProductName: target }) });
      const result = await res.json();
      if (result.success) { alert(result.message); const r = await fetch('/api/lld'); const rr = await r.json(); if (rr.success) setData(rr.items); }
      else alert('수평전개 실패: ' + (result.error || ''));
    } catch (error) { console.error('[LLD Deploy]:', error); alert('수평전개 중 오류'); }
  };

  return (
    <FixedLayout topNav={<DFMEATopNav />} showSidebar={true} bgColor="#f5f5f5" contentPadding="p-2">
      <div className="flex flex-col h-full font-['Malgun_Gothic',sans-serif]" style={{ zoom: 0.8, width: '125%', transformOrigin: 'top left' }}>
        {/* 메뉴바 */}
        <div className="flex-shrink-0 mb-2">
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm">
            <div className="flex items-center gap-1 mb-2">
              <button className={`px-3 py-1 rounded-md text-[10px] font-bold ${filterClassification === 'all' ? 'bg-[#00587a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} onClick={() => setFilterClassification('all')}>{t('전체')} ({stats.total})</button>
              {CLASSIFICATION_OPTIONS.map(c => (
                <button key={c} className={`px-3 py-1 rounded-md text-[10px] font-bold ${filterClassification === c ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  style={filterClassification === c ? { backgroundColor: CLASSIFICATION_COLORS[c] } : {}} onClick={() => setFilterClassification(c)}>{CLASSIFICATION_LABELS[c]} ({stats.byClassification[c] || 0})</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input placeholder={`${t('공정명')}, ${t('제품명')}, ${t('고장형태')} ${t('검색')}...`} className="pl-8 w-52 h-8 text-[11px] border-slate-300 rounded-md" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Select value={filterApplyTo} onValueChange={setFilterApplyTo}>
                <SelectTrigger className="w-20 h-8 text-[11px] border-slate-300 justify-center [&>svg]:hidden rounded-md font-medium"><SelectValue placeholder={t('적용')} /></SelectTrigger>
                <SelectContent><SelectItem value="all">{t('전체')}</SelectItem>{APPLY_TO_OPTIONS.map(o => <SelectItem key={o} value={o}>{APPLY_TO_LABELS[o]}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-16 h-8 text-[11px] border-slate-300 justify-center [&>svg]:hidden rounded-md font-medium"><SelectValue placeholder={t('상태')} /></SelectTrigger>
                <SelectContent><SelectItem value="all">ALL</SelectItem>{STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{STATUS_COLORS[o].label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-md border border-slate-200">
                <span className="text-[11px] text-green-600 font-bold">{t('완료')}: {stats.completed}</span>
                <span className="text-[11px] text-orange-600 font-bold">{t('진행')}: {stats.inProgress}</span>
                <span className="text-[11px] text-red-600 font-bold">{t('미완')}: {stats.pending}</span>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-[#22c55e] hover:bg-[#16a34a] h-8 text-[11px] px-3 text-white font-bold rounded-md" onClick={handleImport}><Upload className="w-3.5 h-3.5 mr-1" />{t('Import')}</Button>
                <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c] h-8 text-[11px] px-3 text-white font-bold rounded-md" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1" />{t('Export')}</Button>
                <Button size="sm" className="bg-[#a855f7] hover:bg-[#9333ea] h-8 text-[11px] px-3 text-white font-bold rounded-md" onClick={handleDeploy}><GitBranch className="w-3.5 h-3.5 mr-1" />{t('수평전개')}</Button>
                <Button size="sm" className="bg-[#3b82f6] hover:bg-[#2563eb] h-8 text-[11px] px-3 text-white font-bold rounded-md" onClick={handleAddRow}><Plus className="w-3.5 h-3.5 mr-1" />{t('행추가')}</Button>
                <Button size="sm" className="bg-[#0d47a1] hover:bg-[#1565c0] h-8 text-[11px] px-3 text-white font-bold rounded-md" onClick={handleSave}><Save className="w-3.5 h-3.5 mr-1" />{t('저장')}</Button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
          </div>
        </div>

        {/* 가상화 테이블 */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-white rounded-lg border border-slate-300 shadow-sm" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <table className="w-full text-[10px] border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-20 bg-[#00587a] text-white">
              <tr>
                <th className="p-1 border-b border-r border-white/20 font-bold text-center" style={{ width: 75 }}>LLD_No</th>
                {TABLE_COLS.map((col, i) => (
                  <th key={i} className="p-1 border-b border-r border-white/20 font-bold text-center" style={{ width: col.w }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={COL_COUNT} className="text-center py-8 text-gray-400">{t('로딩 중...')}</td></tr>}
              {!isLoading && filteredData.length === 0 && <tr><td colSpan={COL_COUNT} className="text-center py-8 text-gray-400">등록된 LLD 데이터가 없습니다.</td></tr>}
              {!isLoading && filteredData.length > 0 && paddingTop > 0 && <tr><td colSpan={COL_COUNT} style={{ height: paddingTop, padding: 0, border: 'none' }} /></tr>}
              {!isLoading && virtualItems.map(vRow => (
                <LLDTableRow key={filteredData[vRow.index].id} row={filteredData[vRow.index]} index={vRow.index} onCellChange={handleCellChange} onDeleteRow={handleDeleteRow} t={t} />
              ))}
              {!isLoading && filteredData.length > 0 && paddingBottom > 0 && <tr><td colSpan={COL_COUNT} style={{ height: paddingBottom, padding: 0, border: 'none' }} /></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </FixedLayout>
  );
}
