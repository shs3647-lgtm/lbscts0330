/**
 * @file page.tsx
 * @description DFMEA AP 개선관리 메인 페이지 — 테이블 가상화 적용
 * @version 6.0.0
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
import { Search, RefreshCw, Download, Edit2 } from 'lucide-react';
import { FixedLayout, DFMEATopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';

import { APItem } from './types';
import { getStatusBadgeClass, calculateStats, filterAPData } from './utils';
import APModal from './APModal';
import APSummaryChart from './APSummaryChart';
import APImprovementChart from './APImprovementChart';
import { useAPData } from './hooks/useAPData';

const ROW_HEIGHT = 28;
const COL_COUNT = 16;
const HEADERS = ['No', 'AP(전)', 'AP(후)', '특성', '공정', 'S', 'Failure Mode', 'Cause', 'O', 'D', 'Prevention', 'Detection', '담당자', '상태', '완료예정', '작업'];

// ── 메모이제이션된 행 컴포넌트 ──
const APRow = React.memo(function APRow({
  item,
  index,
  onOpenModal,
}: {
  item: APItem;
  index: number;
  onOpenModal: (item: APItem) => void;
}) {
  return (
    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} style={{ height: ROW_HEIGHT }}>
      <td className="p-1 border-b border-r border-slate-200 text-center font-bold bg-slate-100">{index + 1}</td>
      <td className="p-1 border-b border-r border-slate-200 text-center">
        <span className={`inline-block w-5 h-5 rounded-full text-white text-[10px] leading-5 font-bold ${item.ap5 === 'H' ? 'bg-red-500' : item.ap5 === 'M' ? 'bg-orange-500' : 'bg-green-500'}`}>{item.ap5}</span>
      </td>
      <td className="p-1 border-b border-r border-slate-200 text-center">
        {item.ap6 ? (
          <span className={`inline-block w-5 h-5 rounded-full text-white text-[10px] leading-5 font-bold ${item.ap6 === 'H' ? 'bg-red-500' : item.ap6 === 'M' ? 'bg-orange-500' : 'bg-green-500'}`}>{item.ap6}</span>
        ) : <span className="text-gray-300">-</span>}
      </td>
      <td className="p-1 border-b border-r border-slate-200 text-center">{item.specialChar || '-'}</td>
      <td className="p-1 border-b border-r border-slate-200 text-center text-[10px]">{item.processName || '-'}</td>
      <td className="p-1 border-b border-r border-slate-200 text-center">{item.severity}</td>
      <td className="p-1 border-b border-r border-slate-200 max-w-[120px] truncate">{item.failureMode}</td>
      <td className="p-1 border-b border-r border-slate-200 max-w-[120px] truncate">{item.failureCause}</td>
      <td className="p-1 border-b border-r border-slate-200 text-center">{item.occurrence}</td>
      <td className="p-1 border-b border-r border-slate-200 text-center">{item.detection}</td>
      <td className="p-1 border-b border-r border-slate-200 max-w-[100px] truncate">{item.preventionAction || item.preventiveControl || '-'}</td>
      <td className="p-1 border-b border-r border-slate-200 max-w-[100px] truncate">{item.detectionAction || item.detectionControl || '-'}</td>
      <td className="p-1 border-b border-r border-slate-200 text-center">{item.responsible || '-'}</td>
      <td className="p-1 border-b border-r border-slate-200 text-center">
        <Badge className={`${getStatusBadgeClass(item.status)} text-[9px] h-4`}>{item.status}</Badge>
      </td>
      <td className="p-1 border-b border-r border-slate-200 text-center">{item.dueDate || '-'}</td>
      <td className="p-1 border-b border-slate-200 text-center">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onOpenModal(item)}>
          <Edit2 className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
});

export default function APImprovementPage() {
  const { t } = useLocale();
  const { projects, selectedFmeaId, setSelectedFmeaId, data, loading, updateItem, refresh } = useAPData();

  const [filterAP, setFilterAP] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<APItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredData = filterAPData(data, 'all', filterAP, searchTerm);
  const stats = calculateStats(data);

  // ── 가상화 ──
  const virtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? totalHeight - virtualItems[virtualItems.length - 1].end : 0;

  const openModal = useCallback((item: APItem) => { setEditingItem(item); setIsModalOpen(true); }, []);

  const handleSave = async (riskId: string, updates: Partial<APItem>) => {
    if (!editingItem) return;
    const ok = await updateItem(riskId, editingItem.fmeaId, updates);
    if (ok) { setIsModalOpen(false); setEditingItem(null); }
  };

  const showEmpty = !loading && selectedFmeaId && filteredData.length === 0;
  const showSelect = !loading && !selectedFmeaId;

  return (
    <FixedLayout topNav={<DFMEATopNav />} showSidebar={true} bgColor="#f5f5f5" contentPadding="p-2">
      <div className="flex flex-col h-full font-['Malgun_Gothic',sans-serif]">
        {/* 헤더 */}
        <div className="flex-shrink-0 space-y-2 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-base font-bold text-[#00587a]">{t('AP 개선관리(AP Improvement)')}</h1>
              <div className="flex items-center gap-4 bg-white/50 px-3 py-1 rounded-full border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600">{t('FMEA 구분')}:</span>
                  <Select defaultValue="DFMEA">
                    <SelectTrigger className="w-24 h-7 text-[10px] bg-white border-gray-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DFMEA" className="text-[10px]">DFMEA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600">{t('프로젝트')}:</span>
                  <Select value={selectedFmeaId} onValueChange={setSelectedFmeaId}>
                    <SelectTrigger className="w-52 h-7 text-[10px] bg-white border-gray-300"><SelectValue placeholder={t('프로젝트 선택')} /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.fmeaId} value={p.fmeaId} className="text-[10px]">{p.productName || p.fmeaId}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <span className="text-[11px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded">
              Action Priority {t('기반 개선조치 현황')} {loading && `(${t('로딩 중...')})`}
            </span>
          </div>

          {/* 차트 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <APSummaryChart stats={stats} data={data} />
            <APImprovementChart data={data} />
          </div>

          {/* 액션 바 */}
          <div className="bg-white p-2 rounded-lg border border-slate-300 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input placeholder="검색..." className="pl-9 w-56 h-8 text-[11px] border-slate-300" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Select value={filterAP} onValueChange={setFilterAP}>
                  <SelectTrigger className="w-24 h-8 text-[11px] border-slate-300"><SelectValue placeholder="AP" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[11px]">{t('전체')} AP</SelectItem>
                    <SelectItem value="H" className="text-[11px]">High</SelectItem>
                    <SelectItem value="M" className="text-[11px]">Medium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-[#3b82f6] hover:bg-[#2563eb] h-8 text-[11px] px-3 text-white font-bold rounded" onClick={refresh} disabled={loading}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> {t('새로고침')}
                </Button>
                <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c] h-8 text-[11px] px-3 text-white font-bold rounded">
                  <Download className="h-3.5 w-3.5 mr-1" /> Export
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 가상화 테이블 */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto bg-white rounded-lg border border-slate-300 shadow-sm">
          <table className="w-full text-[11px] border-collapse">
            <thead className="sticky top-0 z-20 bg-[#00587a] text-white">
              <tr>
                {HEADERS.map((h, i) => <th key={i} className="p-1 border-b border-r border-white/20 font-bold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={COL_COUNT} className="text-center py-8 text-gray-400 text-sm">{t('데이터 로딩 중...')}</td></tr>}
              {showSelect && <tr><td colSpan={COL_COUNT} className="text-center py-8 text-gray-400 text-sm">{t('프로젝트를 선택해 주세요.')}</td></tr>}
              {showEmpty && <tr><td colSpan={COL_COUNT} className="text-center py-8 text-gray-400 text-sm">AP H/M 개선 대상 항목이 없습니다.</td></tr>}
              {!loading && filteredData.length > 0 && paddingTop > 0 && (
                <tr><td colSpan={COL_COUNT} style={{ height: paddingTop, padding: 0, border: 'none' }} /></tr>
              )}
              {!loading && virtualItems.map(vRow => (
                <APRow
                  key={filteredData[vRow.index].id}
                  item={filteredData[vRow.index]}
                  index={vRow.index}
                  onOpenModal={openModal}
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
    </FixedLayout>
  );
}
