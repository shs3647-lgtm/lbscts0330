/**
 * @file page.tsx
 * @description PFD 리스트 페이지 - 서버사이드 페이지네이션
 * @version 4.0.0
 * @updated 2026-03-15 가상 스크롤 → 서버사이드 페이지네이션 전환
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PFDTopNav from '@/components/layout/PFDTopNav';
import { FixedLayout } from '@/components/layout';
import { StepBadge, TypeBadge, extractTypeFromId, ListActionBar, PaginationBar, useListSelection } from '@/components/list';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { toast } from '@/hooks/useToast';
import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';
import { useAuth } from '@/hooks/useAuth';

const CONFIG = {
  moduleName: 'PFD',
  modulePrefix: 'pfd',
  themeColor: '#1e3a5f',
  registerUrl: '/pfd/register',
  worksheetUrl: '/pfd/worksheet',
  apiEndpoint: '/api/pfd',
};

const PAGE_SIZE = 50;

const COLUMN_WIDTHS = ['35px', '70px', '85px', '35px', '50px', '130px', '60px', '55px', '50px', '80px', '80px', '40px', '60px', '60px', '35px', '45px'];

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
  linkedCpNos?: string[];
  step?: number;
  revisionNo?: string;
  confidentialityLevel?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
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
  globalIndex: number;
}

const PFDListRow = React.memo(function PFDListRow({
  project: p, index, isSelected, onToggle, onOpenRegister, formatIdFn, renderEmptyFn, config, columnWidths, globalIndex,
}: PFDListRowProps) {
  const typeCode = extractTypeFromId(p.pfdNo || '') || 'P';
  return (
    <tr
      key={p.id}
      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-slate-50/30 hover:bg-gray-50'}`}
      style={{ height: '28px' }}
      onClick={() => onToggle(p.id)}
      onDoubleClick={() => onOpenRegister(p.pfdNo?.toLowerCase() || p.id)}
    >
      <td className="px-1 py-0.5 text-center align-middle" style={{ width: columnWidths[0] }}>
        <input type="checkbox" checked={isSelected} onChange={() => onToggle(p.id)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5" />
      </td>
      <td className="px-1 py-0.5 text-center align-middle text-[10px] text-blue-700 font-semibold">{globalIndex + 1}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : ''}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px] text-blue-700 font-semibold cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); onOpenRegister(p.pfdNo?.toLowerCase() || p.id); }}>{formatIdFn(p.pfdNo, index)}</td>
      <td className="px-1 py-0.5 text-center align-middle"><TypeBadge typeCode={typeCode as any} /></td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">
        {p.confidentialityLevel ? (
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${
            p.confidentialityLevel === 'Prototype' ? 'bg-yellow-500' :
            p.confidentialityLevel === 'Pre-Launch' ? 'bg-orange-500' :
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
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.pfdResponsibleName || renderEmptyFn(p.id)}</td>
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
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { isAdmin } = useAuth();
  const [trashMode, setTrashMode] = useState(false);
  const { selectedRows, toggleRow, toggleAllRows, clearSelection, isAllSelected } = useListSelection();
  const { confirmDialog, ConfirmDialogUI } = useConfirmDialog();

  // 검색 디바운스
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // 검색 시 1페이지로 리셋
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ★ 휴지통 모드 전환 시 1페이지로 리셋
  useEffect(() => {
    setPage(1);
    clearSelection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashMode]);

  const loadData = useCallback(async (targetPage?: number) => {
    setIsLoading(true);
    const currentPage = targetPage || page;
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        size: String(PAGE_SIZE),
        sortField,
        sortOrder,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (trashMode && isAdmin) params.set('includeDeleted', 'true');

      const response = await fetch(`${CONFIG.apiEndpoint}?${params}`);
      const result = await response.json();

      if (result.success && result.data) {
        let projectList: PFDProject[] = result.data.map((p: any) => ({
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
          linkedCpNos: p.linkedCpNos || (p.cpNo ? [p.cpNo] : []),
          step: p.step || 1,
          revisionNo: p.revisionNo || '1.0',
          confidentialityLevel: p.confidentialityLevel || (p.pfdType === 'pre-launch' ? 'Pre-Launch' : 'Production'),
          createdAt: p.createdAt || '',
          updatedAt: p.updatedAt || '',
          deletedAt: p.deletedAt || null,
        }));

        // ★ 휴지통 모드: 삭제된 항목만 / 일반 모드: 활성 항목만
        if (trashMode && isAdmin) {
          projectList = projectList.filter(p => p.deletedAt != null);
        } else {
          projectList = projectList.filter(p => p.deletedAt == null);
        }

        setProjects(projectList);

        if (result.pagination) {
          setTotalCount(result.pagination.totalCount);
          setTotalPages(result.pagination.totalPages);
        }
      } else {
        setProjects([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch {
      setProjects([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, sortField, sortOrder, debouncedSearch, trashMode, isAdmin]);

  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    loadData().then(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); });
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSort = (field: string) => {
    if (!field) return;
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    clearSelection();
  }, [clearSelection]);

  const handleDelete = async () => {
    if (selectedRows.size === 0) { toast.warn('삭제할 항목을 선택해주세요.'); return; }
    const deleteCount = selectedRows.size;
    const ids = Array.from(selectedRows);

    // ★ 휴지통 모드: 영구삭제
    if (trashMode && isAdmin) {
      const ok = await confirmDialog({ title: '⚠️ 영구삭제 확인(Confirm Permanent Delete)', message: `선택한 ${deleteCount}개 항목을 영구삭제하시겠습니까?(Permanently delete ${deleteCount} items?)\n\n⚠️ 복원 불가능합니다!(This action cannot be undone!)`, variant: 'danger', confirmText: '영구삭제(Permanent Delete)', cancelText: '취소(Cancel)' });
      if (!ok) return;

      let successCount = 0;
      const BATCH = 5;
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const results = await Promise.all(batch.map(async (selectedId) => {
          try {
            const project = projects.find(p => p.id === selectedId);
            const pfdNo = project?.pfdNo || selectedId;
            const res = await fetch(`${CONFIG.apiEndpoint}?pfdNo=${encodeURIComponent(pfdNo.toLowerCase())}`, { method: 'DELETE' });
            return { success: res.ok };
          } catch { return { success: false }; }
        }));
        successCount += results.filter(r => r.success).length;
      }
      await loadData();
      clearSelection();
      toast.success(`${successCount}개 영구삭제 완료(${successCount} permanently deleted)`);
      return;
    }

    // ★ 일반 모드: Soft Delete (휴지통으로 이동)
    const ok = await confirmDialog({ title: '삭제 확인(Delete Confirm)', message: `선택한 ${deleteCount}개 항목을 삭제하시겠습니까?(Delete ${deleteCount} items?)\n\n♻️ 휴지통에서 복원 가능합니다.(Can be restored from trash.)`, variant: 'danger', confirmText: '삭제(Delete)', cancelText: '취소(Cancel)' });
    if (!ok) return;

    let successCount = 0;
    let failCount = 0;

    const BATCH = 5;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async (selectedId) => {
        try {
          const project = projects.find(p => p.id === selectedId);
          const pfdNo = project?.pfdNo || selectedId;
          const res = await fetch(CONFIG.apiEndpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'softDelete', pfdNo: pfdNo.toLowerCase() }),
          });
          const data = await res.json();
          return { id: pfdNo, success: data.success };
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
    if (failCount > 0) { toast.error(`삭제: ${successCount}개 성공, ${failCount}개 실패`); }
    else { toast.success(`${deleteCount}개 항목 삭제 완료(휴지통으로 이동)`); }
  };

  // ★ 복원 핸들러 (관리자 휴지통 모드 전용)
  const handleRestore = async () => {
    if (selectedRows.size === 0) { toast.warn('복원할 항목을 선택해주세요.(Please select items to restore.)'); return; }
    const ids = Array.from(selectedRows);
    const ok = await confirmDialog({ title: '복원 확인(Confirm Restore)', message: `선택한 ${ids.length}개 항목을 복원하시겠습니까?(Restore ${ids.length} selected items?)`, variant: 'default', confirmText: '복원(Restore)', cancelText: '취소(Cancel)' });
    if (!ok) return;

    let successCount = 0;
    for (const id of ids) {
      try {
        const project = projects.find(p => p.id === id);
        const pfdNo = project?.pfdNo || id;
        const res = await fetch(CONFIG.apiEndpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore', pfdNo: pfdNo.toLowerCase() }),
        });
        const data = await res.json();
        if (data.success) successCount++;
      } catch (e) {
        console.error(`[PFD 복원] ${id} 오류:`, e);
      }
    }

    await loadData();
    clearSelection();
    if (successCount === ids.length) { toast.success(`${successCount}개 항목 복원 완료(${successCount} items restored)`); }
    else { toast.warn(`${successCount}/${ids.length}개 복원 완료(${successCount}/${ids.length} restored)`); }
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

  // 글로벌 인덱스 계산 (페이지 기반)
  const globalIndexBase = (page - 1) * PAGE_SIZE;

  return (
    <FixedLayout topNav={<PFDTopNav />} topNavHeight={48} showSidebar={true} contentPadding="p-0">
      <div className="font-[Malgun_Gothic] px-2 pt-1">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-sm">📋</span>
          <h1 className="text-xs font-bold text-gray-800">{CONFIG.moduleName} 리스트</h1>
          {isLoading ? <span className="text-[10px] text-blue-500 ml-1">로딩 중...(Loading)</span> : <span className="text-[10px] text-gray-500 ml-1">총(Total) {totalCount}건</span>}
        </div>

        <div className="flex items-start gap-1 mb-1">
          <div className="flex-1">
            <ListActionBar searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="🔍 PFD명, 고객사로 검색..." onRefresh={() => loadData()} onSave={handleSave} saveStatus={saveStatus} onEdit={handleEdit} editDisabled={selectedRows.size !== 1} onDelete={handleDelete} deleteDisabled={selectedRows.size === 0} deleteCount={selectedRows.size} registerUrl={CONFIG.registerUrl} themeColor={CONFIG.themeColor} />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button onClick={() => { setTrashMode(prev => !prev); clearSelection(); }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${trashMode ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                {trashMode ? '📋 리스트(List)' : '🗑️ 휴지통(Trash)'}
              </button>
              {trashMode && (
                <button onClick={handleRestore} disabled={selectedRows.size === 0}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold border ${selectedRows.size > 0 ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'}`}>
                  ♻️ 복원(Restore) ({selectedRows.size})
                </button>
              )}
            </div>
          )}
          <DeleteHelpBadge />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .pfd-list-table { border-collapse: separate; border-spacing: 0; }
          .pfd-list-table thead th { border-bottom: 2px solid #9ca3af; border-right: 1px solid rgba(255,255,255,0.3); background: #1e3a5f; }
          .pfd-list-table thead th:last-child { border-right: none; }
          .pfd-list-table tbody td { border-bottom: 1px solid #9ca3af; border-right: 1px solid #d1d5db; }
          .pfd-list-table tbody td:last-child { border-right: none; }
        `}} />
        <div className="rounded-lg overflow-x-auto border border-gray-400 bg-white" style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          <table className="w-full pfd-list-table text-[10px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#1e3a5f] text-white" style={{ height: '28px' }}>
                <th className="px-1 py-1 text-center align-middle w-8">
                  <input type="checkbox" checked={isAllSelected(projects.map(p => p.id))} onChange={() => toggleAllRows(projects.map(p => p.id))} className="w-3.5 h-3.5" />
                </th>
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
              {projects.map((p, index) => (
                <PFDListRow
                  key={p.id}
                  project={p}
                  index={index}
                  isSelected={selectedRows.has(p.id)}
                  onToggle={handleToggleRow}
                  onOpenRegister={handleOpenRegister}
                  formatIdFn={formatId}
                  renderEmptyFn={renderEmpty}
                  config={CONFIG}
                  columnWidths={COLUMN_WIDTHS}
                  globalIndex={globalIndexBase + index}
                />
              ))}
              {projects.length === 0 && !isLoading && (
                <tr style={{ height: '28px' }} className="bg-slate-50/50">
                  <td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" /></td>
                  {Array.from({ length: 16 }).map((_, i) => <td key={i} className="px-2 py-1 text-center align-middle text-gray-300">-</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          moduleName={CONFIG.moduleName}
          version="v4.0"
        />
      </div>
      <ConfirmDialogUI />
    </FixedLayout>
  );
}
