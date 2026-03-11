/**
 * @file page.tsx
 * @description PFD 리스트 페이지 - 등록화면 기준 컬럼 동기화
 * @version 3.2.0
 * @updated 2026-01-27 등록화면 필드 기준 재구성 (부품명/항목수 삭제, 상위 APQP 추가)
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import PFDTopNav from '@/components/layout/PFDTopNav';
import { FixedLayout } from '@/components/layout';
import { StepBadge, TypeBadge, extractTypeFromId, ListActionBar, ListStatusBar, useListSelection } from '@/components/list';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { toast } from '@/hooks/useToast';
import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';

const CONFIG = {
  moduleName: 'PFD',
  modulePrefix: 'pfd',
  themeColor: '#1e3a5f',
  registerUrl: '/pfd/register',
  worksheetUrl: '/pfd/worksheet',
  apiEndpoint: '/api/pfd',
};

const ROW_HEIGHT = 28;

// ★ PFMEA 표준 컬럼: No, 작성일, PFD ID, TYPE, PFD 종류, PFD명, 고객사, 공정책임, 담당자, 상위 APQP, 상위 PFMEA, 연동 CP, 현황, 시작일, 목표완료일, Rev, 단계
const COLUMN_WIDTHS = ['35px', '70px', '85px', '35px', '50px', '130px', '60px', '55px', '50px', '75px', '80px', '80px', '40px', '60px', '60px', '35px', '45px'];

interface PFDProject {
  id: string;
  pfdNo: string;
  subject?: string;
  customerName?: string;
  processResponsibility?: string;
  pfdResponsibleName?: string;
  pfdStartDate?: string;
  pfdRevisionDate?: string;
  parentFmeaId?: string;
  linkedCpNo?: string;
  linkedCpNos?: string[];  // ★ API에서 반환하는 연동 CP 배열
  parentApqpNo?: string;
  step?: number;
  revisionNo?: string;
  confidentialityLevel?: string; // ✅ PFD 종류
  createdAt?: string;   // ✅ 최초 작성일
  updatedAt?: string;   // ✅ 수정일
}

function formatId(id: string, index: number): string {
  if (id) return id.toLowerCase();
  const year = new Date().getFullYear().toString().slice(-2);
  return `${CONFIG.modulePrefix}${year}-p${(index + 1).toString().padStart(3, '0')}`;
}

interface PFDListRowProps {
  project: PFDProject;
  index: number;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onOpenRegister: (id: string) => void;
  formatIdFn: (id: string, index: number) => string;
  renderEmptyFn: (id: string) => React.ReactNode;
  config: typeof CONFIG;
  columnWidths: string[];
}

const PFDListRow = React.memo(function PFDListRow({
  project: p,
  index,
  isSelected,
  onToggle,
  onOpenRegister,
  formatIdFn,
  renderEmptyFn,
  config,
}: PFDListRowProps) {
  return (
    <tr
      className={`hover:bg-slate-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'} ${isSelected ? 'bg-blue-100' : ''}`}
      style={{ height: ROW_HEIGHT }}
      onClick={() => onToggle(p.id)}
    >
      <td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" checked={isSelected} onChange={() => onToggle(p.id)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5" /></td>
      <td className="px-1 py-0.5 text-center align-middle font-bold text-[#1e3a5f] whitespace-nowrap">{index + 1}</td>
      {/* ★ 작성일 - 첫번째 */}
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px] text-gray-700">
        {(p.updatedAt || p.createdAt || '').slice(0, 10) || '-'}
      </td>
      <td className="px-1 py-0.5 text-center align-middle font-semibold text-blue-700 whitespace-nowrap"><a href={`${config.registerUrl}?id=${p.pfdNo?.toLowerCase()}`} className="hover:underline text-[9px]">{formatIdFn(p.pfdNo, index)}</a></td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap"><TypeBadge typeCode={extractTypeFromId(p.pfdNo, config.modulePrefix)} /></td>
      {/* ★ PFD 종류 */}
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">
        {p.confidentialityLevel ? (
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${p.confidentialityLevel === 'Prototype' ? 'bg-indigo-400' :
            p.confidentialityLevel === 'Pre-Launch' ? 'bg-orange-400' :
              p.confidentialityLevel === 'Production' ? 'bg-green-500' : 'bg-gray-400'
            }`}>
            {p.confidentialityLevel === 'Prototype' ? 'Proto' :
              p.confidentialityLevel === 'Pre-Launch' ? 'Pre-L' :
                p.confidentialityLevel === 'Production' ? 'Prod' : p.confidentialityLevel}
          </span>
        ) : <span className="text-gray-300">-</span>}
      </td>
      <td className="px-1 py-0.5 text-left align-middle whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{p.subject ? <a href={`${config.worksheetUrl}?pfdNo=${p.pfdNo?.toLowerCase()}`} className="text-blue-700 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()} title={p.subject}>{p.subject}</a> : renderEmptyFn(p.id)}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.customerName || renderEmptyFn(p.id)}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.processResponsibility || renderEmptyFn(p.id)}</td>
      {/* 담당자 (공정책임 다음) */}
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.pfdResponsibleName || renderEmptyFn(p.id)}</td>
      {/* ★ 상위 APQP */}
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
        {p.parentApqpNo ? (
          <a href={`/apqp/register?id=${p.parentApqpNo}`} className="text-blue-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()}>
            <span className="flex items-center justify-center gap-0.5">
              <span className="px-1 py-0 rounded text-[8px] font-bold text-white bg-blue-500">APQP</span>
              <span className="text-[8px]">{p.parentApqpNo}</span>
            </span>
          </a>
        ) : renderEmptyFn(p.id)}
      </td>
      {/* ★ 상위 PFMEA */}
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
        {p.parentFmeaId ? (
          <a href={`/pfmea/register?id=${p.parentFmeaId.toLowerCase()}`} className="text-yellow-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()}>
            <span className="flex items-center justify-center gap-0.5">
              <span className="px-1 py-0 rounded text-[8px] font-bold text-white bg-yellow-500">FMEA</span>
              <span className="text-[8px]">{p.parentFmeaId}</span>
            </span>
          </a>
        ) : renderEmptyFn(p.id)}
      </td>
      {/* ★ 연동 CP */}
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
        {(p.linkedCpNos && p.linkedCpNos.length > 0) ? (
          <a href={`/control-plan/register?id=${p.linkedCpNos[0].toLowerCase()}`} className="text-teal-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()}>
            <span className="flex items-center justify-center gap-0.5">
              <span className="px-1 py-0 rounded text-[8px] font-bold text-white bg-teal-500">CP</span>
              <span className="text-[8px]">{p.linkedCpNos[0]}{p.linkedCpNos.length > 1 ? ` +${p.linkedCpNos.length - 1}` : ''}</span>
            </span>
          </a>
        ) : p.linkedCpNo ? (
          <a href={`/control-plan/register?id=${p.linkedCpNo.toLowerCase()}`} className="text-teal-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()}>
            <span className="flex items-center justify-center gap-0.5">
              <span className="px-1 py-0 rounded text-[8px] font-bold text-white bg-teal-500">CP</span>
              <span className="text-[8px]">{p.linkedCpNo}</span>
            </span>
          </a>
        ) : renderEmptyFn(p.id)}
      </td>
      {/* ★ 현황 (완료/진행/지연) - PFMEA 벤치마킹 */}
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        {(() => {
          const step = p.step || 1;
          if (step >= 7) return <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1 rounded">완료(Done)</span>;
          if (step >= 3) return <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1 rounded">진행(Active)</span>;
          return <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1 rounded">지연(Delay)</span>;
        })()}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">{p.pfdStartDate || renderEmptyFn(p.id)}</td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">{p.pfdRevisionDate || renderEmptyFn(p.id)}</td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.revisionNo || '1.0'}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap"><StepBadge step={p.step} maxSteps={7} /></td>
    </tr>
  );
});

export default function PFDListPage() {
  const [projects, setProjects] = useState<PFDProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { selectedRows, toggleRow, toggleAllRows, clearSelection, isAllSelected } = useListSelection();
  const { confirmDialog, ConfirmDialogUI } = useConfirmDialog();
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(CONFIG.apiEndpoint);
      const result = await response.json();
      let projectList: PFDProject[] = [];
      if (result.success && result.data) {
        projectList = result.data.map((p: any) => ({
          id: p.pfdNo || p.id,
          pfdNo: p.pfdNo || p.id,
          subject: p.subject,
          customerName: p.customerName,
          processResponsibility: p.processResponsibility || p.processOwner,
          pfdResponsibleName: p.pfdResponsibleName || p.createdBy,
          pfdStartDate: p.pfdStartDate,
          pfdRevisionDate: p.pfdRevisionDate,
          parentFmeaId: p.fmeaId || p.parentFmeaId,
          linkedCpNo: p.cpNo || p.linkedCpNo,
          linkedCpNos: p.linkedCpNos || (p.cpNo ? [p.cpNo] : []),  // ★ 배열로 매핑
          parentApqpNo: p.apqpProjectId || p.parentApqpNo,
          step: p.step || 1,
          revisionNo: p.revisionNo || '1.0',
          confidentialityLevel: p.confidentialityLevel || (p.pfdType === 'pre-launch' ? 'Pre-Launch' : 'Production'),
          createdAt: p.createdAt || '',
          updatedAt: p.updatedAt || '',
        }));
        // ★★★ projectList 매핑 로직 추가 완료 ★★★
      }

      // ★★★ ProjectLinkage에서 연동 정보 병합 ★★★
      try {
        const linkageRes = await fetch('/api/project-linkage');
        const linkageData = await linkageRes.json();
        if (linkageData.success && linkageData.data?.length > 0) {
          const linkageMap = new Map<string, { pfmeaId?: string; cpNo?: string; cpNos?: string[]; apqpNo?: string }>();
          for (const link of linkageData.data) {
            if (link.pfdNo) {
              const pfdNoLower = link.pfdNo.toLowerCase();
              const existing = linkageMap.get(pfdNoLower);
              const existingCpNos = existing?.cpNos || [];
              const newCpNos = link.cpNo && !existingCpNos.includes(link.cpNo)
                ? [...existingCpNos, link.cpNo]
                : existingCpNos;
              linkageMap.set(pfdNoLower, {
                pfmeaId: link.pfmeaId || existing?.pfmeaId,
                cpNo: link.cpNo || existing?.cpNo,
                cpNos: newCpNos,
                apqpNo: link.apqpNo || existing?.apqpNo,
              });
            }
          }
          projectList = projectList.map(p => {
            const pfdNoLower = p.pfdNo?.toLowerCase() || '';
            const linkage = linkageMap.get(pfdNoLower);
            // ★ linkedCpNos 병합: 기존 배열 + ProjectLinkage에서 가져온 배열
            const mergedCpNos = [
              ...(p.linkedCpNos || []),
              ...(linkage?.cpNos || []),
            ].filter((v, i, a) => a.indexOf(v) === i);  // 중복 제거
            return {
              ...p,
              parentFmeaId: linkage?.pfmeaId || p.parentFmeaId,
              linkedCpNo: linkage?.cpNo || p.linkedCpNo,
              linkedCpNos: mergedCpNos.length > 0 ? mergedCpNos : p.linkedCpNos,
              parentApqpNo: linkage?.apqpNo || p.parentApqpNo,
            };
          });
        }
      } catch (linkErr) {
        console.error('[PFD List] ProjectLinkage 조회 실패:', linkErr);
      }

      setProjects(projectList);
    } catch { setProjects([]); }
    finally { setIsLoading(false); }
  }, []);

  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    loadData().then(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); });
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  // ★ 정렬 핸들러
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredProjects = useMemo(() => projects
    .filter(p => {
      const q = searchQuery.toLowerCase();
      return p.pfdNo?.toLowerCase().includes(q) ||
        p.subject?.toLowerCase().includes(q) ||
        p.customerName?.toLowerCase().includes(q) ||
        p.processResponsibility?.toLowerCase().includes(q) ||
        p.pfdResponsibleName?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let aVal = '', bVal = '';
      if (sortField === 'createdAt') {
        aVal = a.updatedAt || a.createdAt || '';
        bVal = b.updatedAt || b.createdAt || '';
      } else if (sortField === 'confidentialityLevel') {
        aVal = (a as any).confidentialityLevel || '';
        bVal = (b as any).confidentialityLevel || '';
      } else {
        aVal = (a as any)[sortField] || '';
        bVal = (b as any)[sortField] || '';
      }
      const compare = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? compare : -compare;
    }), [projects, searchQuery, sortField, sortOrder]);

  const handleDelete = async () => {
    if (selectedRows.size === 0) { toast.warn('삭제할 항목을 선택해주세요.'); return; }
    const deleteCount = selectedRows.size;
    const ok = await confirmDialog({ title: '삭제 확인(Delete Confirm)', message: `선택한 ${deleteCount}개 항목을 삭제하시겠습니까?(Delete ${deleteCount} items?)\n\n⚠️ DB에서 영구 삭제됩니다.(Permanently deleted from DB)`, variant: 'danger', confirmText: '삭제(Delete)', cancelText: '취소(Cancel)' });
    if (!ok) return;

    let successCount = 0;
    let failCount = 0;
    const ids = Array.from(selectedRows);

    // ★ 5개씩 배치 삭제 (DB 과부하 방지)
    const BATCH = 5;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async (selectedId) => {
        try {
          const project = projects.find(p => p.id === selectedId);
          const pfdNo = project?.pfdNo || selectedId;
          const res = await fetch(`${CONFIG.apiEndpoint}?pfdNo=${encodeURIComponent(pfdNo)}`, { method: 'DELETE' });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.error(`[PFD 삭제] ${pfdNo} 실패 (${res.status}):`, body);
            // 소문자로 재시도
            const res2 = await fetch(`${CONFIG.apiEndpoint}?pfdNo=${encodeURIComponent(pfdNo.toLowerCase())}`, { method: 'DELETE' });
            if (!res2.ok) {
              const body2 = await res2.json().catch(() => ({}));
              console.error(`[PFD 삭제] ${pfdNo} 재시도 실패 (${res2.status}):`, body2);
              throw new Error(body2.error || '삭제 실패');
            }
          }
          return { id: pfdNo, success: true };
        } catch (e) {
          console.error(`[PFD 삭제] ${selectedId} 오류:`, e);
          return { id: selectedId, success: false };
        }
      }));
      successCount += results.filter(r => r.success).length;
      failCount += results.filter(r => !r.success).length;
    }

    await loadData();
    clearSelection();
    if (failCount > 0) { toast.error(`삭제: ${successCount}개 성공, ${failCount}개 실패 — 콘솔에서 오류 확인`); }
    else { toast.success(`${deleteCount}개 항목 삭제 완료`); }
  };

  const handleEdit = () => {
    if (selectedRows.size !== 1) { toast.warn('수정은 한 번에 하나만 가능합니다.'); return; }
    const selectedId = Array.from(selectedRows)[0];
    const project = projects.find(p => p.id === selectedId);
    if (project && project.pfdNo) { window.location.href = `${CONFIG.registerUrl}?id=${project.pfdNo.toLowerCase()}`; }
    else { window.location.href = `${CONFIG.registerUrl}?id=${selectedId}`; }
  };

  const handleOpenRegister = useCallback((id: string) => { window.location.href = `${CONFIG.registerUrl}?id=${id}`; }, []);

  const handleToggleRow = useCallback((id: string) => { toggleRow(id); }, [toggleRow]);

  const renderEmpty = useCallback((id: string) => (
    <span className="text-orange-400 text-[9px] cursor-pointer hover:text-orange-600 hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenRegister(id); }}>미입력(Empty)</span>
  ), [handleOpenRegister]);

  const rowVirtualizer = useVirtualizer({
    count: filteredProjects.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <FixedLayout topNav={<PFDTopNav />} topNavHeight={48} showSidebar={true} contentPadding="p-0">
      <div className="font-[Malgun_Gothic] px-2 pt-1">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-sm">📋</span>
          <h1 className="text-xs font-bold text-gray-800">{CONFIG.moduleName} 리스트</h1>
          {isLoading ? <span className="text-[10px] text-blue-500 ml-1">로딩 중...(Loading)</span> : <span className="text-[10px] text-gray-500 ml-1">총(Total) {filteredProjects.length}건</span>}
        </div>

        <div className="flex items-start gap-1 mb-1">
          <div className="flex-1">
            <ListActionBar searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="🔍 PFD명, 고객사로 검색..." onRefresh={loadData} onSave={handleSave} saveStatus={saveStatus} onEdit={handleEdit} editDisabled={selectedRows.size !== 1} onDelete={handleDelete} deleteDisabled={selectedRows.size === 0} deleteCount={selectedRows.size} registerUrl={CONFIG.registerUrl} themeColor={CONFIG.themeColor} />
          </div>
          <DeleteHelpBadge />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .pfd-list-table { border-collapse: separate; border-spacing: 0; }
          .pfd-list-table thead th { border-bottom: 2px solid #9ca3af; border-right: 1px solid rgba(255,255,255,0.3); background: #1e3a5f; }
          .pfd-list-table thead th:last-child { border-right: none; }
          .pfd-list-table tbody td { border-bottom: 1px solid #9ca3af; border-right: 1px solid #d1d5db; }
          .pfd-list-table tbody td:last-child { border-right: none; }
        `}} />
        <div ref={scrollRef} className="rounded-lg overflow-x-auto border border-gray-400 bg-white" style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          <table className="w-full pfd-list-table text-[10px]">
            <thead>
              <tr className="bg-[#1e3a5f] text-white" style={{ height: '28px' }}>
                <th className="px-1 py-1 text-center align-middle w-8">
                  <input type="checkbox" checked={isAllSelected(filteredProjects.map(p => p.id))} onChange={() => toggleAllRows(filteredProjects.map(p => p.id))} className="w-3.5 h-3.5" />
                </th>
                {/* ★ PFMEA 표준 컬럼 - 정렬 가능 */}
                {[
                  { label: 'No', field: '' },
                  { label: '작성일(Created)', field: 'createdAt' },
                  { label: 'PFD ID', field: 'pfdNo' },
                  { label: 'TYPE', field: '' },
                  { label: 'PFD 종류(Category)', field: 'confidentialityLevel' },
                  { label: 'PFD명(Name)', field: 'subject' },
                  { label: '고객사(Customer)', field: 'customerName' },
                  { label: '공정책임(Owner)', field: 'processResponsibility' },
                  { label: '담당자(Person)', field: 'pfdResponsibleName' },
                  { label: '상위 APQP(Parent)', field: 'parentApqpNo' },
                  { label: '상위 PFMEA(Parent)', field: 'parentFmeaId' },
                  { label: '연동 CP(Linked)', field: 'linkedCpNo' },
                  { label: '현황(Status)', field: '' },
                  { label: '시작일(Start)', field: 'pfdStartDate' },
                  { label: '목표완료일(Target)', field: 'pfdRevisionDate' },
                  { label: 'Rev', field: 'revisionNo' },
                  { label: '단계(Step)', field: 'step' },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`px-1 py-1 text-center align-middle font-semibold whitespace-nowrap text-[11px] ${col.field ? 'cursor-pointer hover:bg-slate-600' : ''}`}
                    style={{ width: COLUMN_WIDTHS[i] }}
                    onClick={() => col.field && handleSort(col.field)}
                  >
                    {col.label}
                    {col.field && sortField === col.field && (
                      <span className="ml-0.5">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {totalSize > 0 && (
                <tr><td colSpan={18} style={{ height: paddingTop, padding: 0, border: 'none' }} /></tr>
              )}
              {virtualRows.map(vRow => {
                const p = filteredProjects[vRow.index];
                return (
                  <PFDListRow
                    key={p.id}
                    project={p}
                    index={vRow.index}
                    isSelected={selectedRows.has(p.id)}
                    onToggle={handleToggleRow}
                    onOpenRegister={handleOpenRegister}
                    formatIdFn={formatId}
                    renderEmptyFn={renderEmpty}
                    config={CONFIG}
                    columnWidths={COLUMN_WIDTHS}
                  />
                );
              })}
              {totalSize > 0 && (
                <tr><td colSpan={18} style={{ height: paddingBottom, padding: 0, border: 'none' }} /></tr>
              )}
              {filteredProjects.length === 0 && <tr style={{ height: '28px' }} className="bg-slate-50/50"><td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" /></td>{Array.from({ length: 15 }).map((_, i) => <td key={i} className="px-2 py-1 text-center align-middle text-gray-300">-</td>)}</tr>}
            </tbody>
          </table>
        </div>

        <ListStatusBar filteredCount={filteredProjects.length} totalCount={projects.length} moduleName={CONFIG.moduleName} version="v3.2" />
      </div>
      <ConfirmDialogUI />
    </FixedLayout>
  );
}
