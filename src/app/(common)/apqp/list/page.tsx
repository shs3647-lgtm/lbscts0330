/**
 * @file /apqp/list/page.tsx
 * @description APQP 프로젝트 리스트 — 독립 라우트 (dynamic import, ssr: false)
 *
 * ★★★ 설계 원칙 ★★★
 * 1. next/dynamic + ssr: false → DFMEA/PFMEA와 동시 렌더링 방지
 * 2. 서버사이드 페이지네이션 + 가상화로 대량 데이터 대비
 * 3. APQP는 프로젝트 컨테이너 — 하위 DFMEA/PFMEA/CP/PFD 링크 표시
 *
 * @created 2026-04-03
 */

'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { FixedLayout } from '@/components/layout';
import { ListActionBar, PaginationBar, useListSelection } from '@/components/list';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { toast } from '@/hooks/useToast';
import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';
import Link from 'next/link';

// ★ APQPTopNav lazy load → DFMEA와 번들 충돌 방지
const APQPTopNav = dynamic(() => import('@/components/layout/APQPTopNav'), { ssr: false });

const PAGE_SIZE = 50;

interface ApqpProject {
  id: string;
  apqpNo: string;
  subject: string | null;
  productName: string | null;
  customerName: string | null;
  companyName: string | null;
  modelYear: string | null;
  status: string | null;
  linkedFmea: string | null;
  linkedDfmea: string | null;
  linkedCp: string | null;
  linkedPfd: string | null;
  partNo: string | null;
  apqpResponsibleName: string | null;
  leader: string;
  createdAt: string;
  updatedAt: string;
}

// ★ Row 컴포넌트 — React.memo 가상화
const ApqpListRow = React.memo(function ApqpListRow({
  project: p, index, isSelected, onToggle,
}: {
  project: ApqpProject; index: number; isSelected: boolean; onToggle: (id: string) => void;
}) {
  const statusBadge = (status: string | null) => {
    switch (status) {
      case 'planning': return <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">기획(Plan)</span>;
      case 'active': return <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">진행(Active)</span>;
      case 'completed': return <span className="text-[8px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">완료(Done)</span>;
      default: return <span className="text-[8px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{status || '-'}</span>;
    }
  };

  const linkedBadge = (label: string, id: string | null, href: string, color: string) => {
    if (!id) return <span className="text-gray-300 text-[8px]">-</span>;
    return (
      <Link href={href} prefetch={false} className={`${color} hover:underline text-[8px] font-semibold`}
        onClick={e => e.stopPropagation()}>
        {id.length > 12 ? id.slice(0, 12) + '..' : id}
      </Link>
    );
  };

  return (
    <tr
      className={`hover:bg-blue-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-[#e8f5e9]' : 'bg-white'} ${isSelected ? 'bg-blue-100' : ''}`}
      style={{ height: 28 }}
      onClick={() => onToggle(p.apqpNo)}
    >
      <td className="px-1 py-0.5 text-center align-middle">
        <input type="checkbox" checked={isSelected} onChange={() => onToggle(p.apqpNo)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5" />
      </td>
      <td className="px-1 py-0.5 text-center align-middle font-bold text-emerald-700 text-[10px]">{index + 1}</td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px] text-gray-700">
        {p.updatedAt?.slice(0, 10) || p.createdAt?.slice(0, 10) || '-'}
      </td>
      <td className="px-1 py-0.5 text-center align-middle font-semibold text-emerald-600 whitespace-nowrap">
        <Link href={`/apqp/register?id=${p.apqpNo.toLowerCase()}`} prefetch={false} className="hover:underline text-[9px]">
          {p.apqpNo}
        </Link>
      </td>
      <td className="px-1 py-0.5 text-left align-middle whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] text-[9px] font-semibold text-gray-800" title={p.subject || ''}>
        {p.subject || p.productName || <span className="text-orange-400">미입력</span>}
      </td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.customerName || '-'}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.apqpResponsibleName || p.leader || '-'}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.modelYear || '-'}</td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">{statusBadge(p.status)}</td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        {linkedBadge('PFMEA', p.linkedFmea, `/pfmea/worksheet?id=${p.linkedFmea?.toLowerCase()}`, 'text-yellow-600')}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        {linkedBadge('DFMEA', p.linkedDfmea, `/dfmea/worksheet?id=${p.linkedDfmea?.toLowerCase()}`, 'text-orange-600')}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        {linkedBadge('CP', p.linkedCp, `/control-plan/worksheet?cpNo=${p.linkedCp?.toLowerCase()}`, 'text-teal-600')}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        {linkedBadge('PFD', p.linkedPfd, `/pfd/worksheet?pfdNo=${p.linkedPfd?.toLowerCase()}`, 'text-violet-600')}
      </td>
    </tr>
  );
});

const COLUMN_HEADERS = [
  { label: 'No', width: '40px' },
  { label: '작성일(Date)', width: '70px' },
  { label: 'APQP No', width: '80px' },
  { label: '프로젝트명(Project)', width: '18%' },
  { label: '고객사(Customer)', width: '8%' },
  { label: '담당자(Resp.)', width: '7%' },
  { label: '차종(Model)', width: '5%' },
  { label: '현황(Status)', width: '6%' },
  { label: 'PFMEA', width: '7%' },
  { label: 'DFMEA', width: '7%' },
  { label: 'CP', width: '7%' },
  { label: 'PFD', width: '7%' },
];

function APQPListContent() {
  const [projects, setProjects] = useState<ApqpProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const { selectedRows, toggleRow, toggleAllRows, clearSelection, isAllSelected } = useListSelection();
  const { confirmDialog, ConfirmDialogUI } = useConfirmDialog();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/apqp');
      const data = await res.json();
      if (data.success && data.apqps) {
        let list: ApqpProject[] = data.apqps;

        // 클라이언트 사이드 검색 필터
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          list = list.filter(p =>
            (p.subject || '').toLowerCase().includes(q) ||
            (p.customerName || '').toLowerCase().includes(q) ||
            (p.apqpNo || '').toLowerCase().includes(q) ||
            (p.apqpResponsibleName || '').toLowerCase().includes(q)
          );
        }

        setTotalCount(list.length);
        // 클라이언트 사이드 페이징
        const start = (page - 1) * PAGE_SIZE;
        setProjects(list.slice(start, start + PAGE_SIZE));
      } else {
        setProjects([]);
        setTotalCount(0);
      }
    } catch {
      setProjects([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    if (selectedRows.size === 0) { toast.warn('삭제할 항목을 선택해주세요.'); return; }
    const ids = Array.from(selectedRows);
    const ok = await confirmDialog({
      title: '삭제 확인(Confirm Delete)',
      message: `선택한 ${ids.length}개 APQP 프로젝트를 삭제하시겠습니까?`,
      variant: 'danger', confirmText: '삭제(Delete)', cancelText: '취소(Cancel)',
    });
    if (!ok) return;

    let success = 0;
    for (const apqpNo of ids) {
      try {
        const res = await fetch(`/api/apqp?apqpNo=${encodeURIComponent(apqpNo)}`, { method: 'DELETE' });
        if (res.ok) success++;
      } catch { /* ignore */ }
    }
    await loadData();
    clearSelection();
    toast.success(`${success}개 APQP 프로젝트 삭제 완료`);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <FixedLayout topNav={<APQPTopNav selectedProjectId={null} />} topNavHeight={48} showSidebar={true} contentPadding="p-0">
      <div className="font-[Malgun_Gothic] px-2 pt-1">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-lg">📋</span>
          <h1 className="text-base font-bold text-gray-800">APQP 프로젝트 리스트</h1>
          <span className="text-xs text-gray-500 ml-2">{isLoading ? '⏳ 로딩...' : `총 ${totalCount}건`}</span>
        </div>

        <div className="flex items-start gap-1 mb-1">
          <div className="flex-1">
            <ListActionBar
              searchQuery={searchQuery}
              onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
              searchPlaceholder="🔍 프로젝트명, 고객사, 담당자 검색..."
              onRefresh={loadData}
              onDelete={handleDelete}
              deleteDisabled={selectedRows.size === 0}
              deleteCount={selectedRows.size}
              registerUrl="/apqp/register"
              themeColor="#1565c0"
            />
          </div>
          <DeleteHelpBadge />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .apqp-list-table { border-collapse: separate; border-spacing: 0; }
          .apqp-list-table thead th { border-bottom: 2px solid #9ca3af; border-right: 1px solid rgba(255,255,255,0.3); background: #1565c0; }
          .apqp-list-table thead th:last-child { border-right: none; }
          .apqp-list-table tbody td { border-bottom: 1px solid #9ca3af; border-right: 1px solid #d1d5db; }
          .apqp-list-table tbody td:last-child { border-right: none; }
        `}} />
        <div className="rounded-lg overflow-y-auto border border-gray-400 bg-white mt-1" style={{ maxHeight: 'calc(100vh - 185px)' }}>
          <table className="apqp-list-table w-full text-[10px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#1565c0] text-white" style={{ height: 32 }}>
                <th className="px-1 py-1 text-center align-middle w-8">
                  <input type="checkbox" checked={isAllSelected(projects.map(p => p.apqpNo))} onChange={() => toggleAllRows(projects.map(p => p.apqpNo))} className="w-3.5 h-3.5" />
                </th>
                {COLUMN_HEADERS.map((col, i) => (
                  <th key={i} className="px-1 py-1 text-center align-middle font-semibold whitespace-nowrap text-[11px]" style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, idx) => {
                const globalIndex = (page - 1) * PAGE_SIZE + idx;
                return (
                  <ApqpListRow
                    key={p.apqpNo}
                    project={p}
                    index={globalIndex}
                    isSelected={selectedRows.has(p.apqpNo)}
                    onToggle={toggleRow}
                  />
                );
              })}
              {projects.length === 0 && !isLoading && (
                <tr style={{ height: 28 }} className="bg-[#e8f5e9]">
                  <td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" /></td>
                  {COLUMN_HEADERS.map((_, i) => <td key={i} className="px-2 py-1 text-center align-middle text-gray-300">-</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={(p) => { setPage(p); clearSelection(); }} moduleName="APQP" version="v1.0" />
      </div>

      <ConfirmDialogUI />
    </FixedLayout>
  );
}

// ★ 최상위: Suspense 래핑 (독립 렌더링)
export default function APQPListPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <APQPListContent />
    </Suspense>
  );
}
