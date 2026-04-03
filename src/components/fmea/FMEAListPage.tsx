/**
 * @file FMEAListPage.tsx
 * @description PFMEA/DFMEA 공용 리스트 페이지 컴포넌트
 * 
 * ★★★ 2026-04-03: PFMEA/DFMEA list/page.tsx 코드 공용화 ★★★
 * CONFIG + TopNav만 다르고 나머지 로직은 100% 동일했음.
 * 이 컴포넌트가 SSoT, PFMEA/DFMEA page.tsx는 re-export만.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FixedLayout } from '@/components/layout';
import {
  StepBadge,
  TypeBadge,
  extractTypeFromId,
  ListActionBar,
  PaginationBar,
  useListSelection
} from '@/components/list';
import Link from 'next/link';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useDeleteSelectDialog } from '@/hooks/useDeleteSelectDialog';
import { toast } from '@/hooks/useToast';
import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';
import { useAuth } from '@/hooks/useAuth';

// =====================================================
// 공용 설정 타입
// =====================================================
export interface FMEAListConfig {
  moduleName: string;       // 'PFMEA' | 'DFMEA'
  modulePrefix: string;     // 'pfm' | 'dfm'
  themeColor: string;       // '#00587a' | '#d97706'
  registerUrl: string;      // '/pfmea/register' | '/dfmea/register'
  worksheetUrl: string;     // '/pfmea/worksheet' | '/dfmea/worksheet'
  apiEndpoint: string;      // '/api/fmea/projects?type=P' | '...?type=D'
}

const PAGE_SIZE = 50;
const ROW_HEIGHT = 28;

const COLUMN_WIDTHS = [
  '2.5%', '6%', '4%', '8%', '3%', '4%', '5%', '16%', '7%', '5%', '5%', '5%', '5%', '6%', '7%'
];

// =====================================================
// 타입
// =====================================================
interface FMEAProject {
  id: string;
  fmeaType?: string;
  project: {
    projectName: string;
    customer: string;
    productName: string;
    department: string;
    leader: string;
    startDate: string;
  };
  fmeaInfo?: {
    subject?: string;
    fmeaStartDate?: string;
    fmeaRevisionDate?: string;
    modelYear?: string;
    designResponsibility?: string;
    fmeaResponsibleName?: string;
    engineeringLocation?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  cftMembers?: Array<{ name: string }>;
  parentFmeaId?: string;
  linkedPfdNo?: string;
  linkedCpNo?: string;
  step?: number;
  revisionNo?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// =====================================================
// 유틸리티
// =====================================================
function formatId(id: string, _index: number, modulePrefix: string): string {
  if (id) return id.toLowerCase();
  const year = new Date().getFullYear().toString().slice(-2);
  return `${modulePrefix}${year}-p${(_index + 1).toString().padStart(3, '0')}`;
}

// =====================================================
// FMEAListRow - 행 컴포넌트 (공용)
// =====================================================
interface FMEAListRowProps {
  project: FMEAProject;
  index: number;
  isSelected: boolean;
  isDeleted?: boolean;
  onToggle: (id: string) => void;
  onOpenRegister: (id: string, section?: string) => void;
  config: FMEAListConfig;
  columnWidths: string[];
}

const FMEAListRow = React.memo(function FMEAListRow({
  project: p, index, isSelected, isDeleted, onToggle, onOpenRegister, config, columnWidths,
}: FMEAListRowProps) {
  const renderEmpty = (id: string, section?: string) => (
    <span
      className="text-orange-400 text-[9px] cursor-pointer hover:text-orange-600 hover:underline"
      onClick={(e) => { e.stopPropagation(); onOpenRegister(id, section); }}
    >미입력(Empty)</span>
  );

  return (
    <tr
      className={`hover:bg-blue-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'} ${isSelected ? 'bg-blue-100' : ''} ${isDeleted ? 'opacity-50' : ''}`}
      style={{ height: `${ROW_HEIGHT}px` }}
      onClick={() => onToggle(p.id)}
      onDoubleClick={() => { window.location.href = `${config.worksheetUrl}?id=${p.id}`; }}
    >
      <td className="p-0 text-center align-middle" style={{ width: '2.5%' }}>
        <input type="checkbox" checked={isSelected} onChange={() => onToggle(p.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 cursor-pointer" />
      </td>
      <td className="px-1 py-0.5 text-center align-middle font-bold text-[#00587a] whitespace-nowrap">{index + 1}</td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px] text-gray-700">
        {(p.updatedAt || p.fmeaInfo?.updatedAt || p.createdAt || p.fmeaInfo?.createdAt || '')?.slice(0, 10) || '-'}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        <TypeBadge typeCode={(p.fmeaType || extractTypeFromId(p.id, config.modulePrefix)) as 'P' | 'F' | 'M' | 'D'} size="sm" />
      </td>
      <td className="px-[1px] py-0.5 text-center align-middle font-semibold text-blue-600 whitespace-nowrap">
        <Link href={`${config.registerUrl}?id=${p.id}`} prefetch={false} className="hover:underline text-[9px]">{formatId(p.id, index, config.modulePrefix)}</Link>
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">
        {(p.revisionNo || '00').replace(/^Rev\.?/i, '')}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        <StepBadge step={p.step} maxSteps={6} />
      </td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">
        {p.fmeaInfo?.engineeringLocation || renderEmpty(p.id)}
      </td>
      <td className="px-1 py-0.5 text-left align-middle whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
        {(() => {
          const name = p.fmeaInfo?.subject || p.project?.productName;
          if (!name || name === p.id) return renderEmpty(p.id);
          return <Link href={`${config.worksheetUrl}?id=${p.id}`} prefetch={false} className="text-blue-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()} title={name}>{name}</Link>;
        })()}
      </td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]" title={p.project?.customer || ''}>
        {p.project?.customer || renderEmpty(p.id)}
      </td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">
        {(p.fmeaInfo?.fmeaResponsibleName || p.project?.leader || '').split(/[\/,]/).map(s => s.trim()).filter(Boolean)[0] || renderEmpty(p.id)}
      </td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
        {p.linkedPfdNo ? (
          <Link href={`/pfd/register?id=${p.linkedPfdNo.toLowerCase()}`} prefetch={false} className="text-violet-600 hover:underline text-[8px] font-semibold" onClick={e => e.stopPropagation()}>
            {p.linkedPfdNo.replace(/^pfd/i, '')}
          </Link>
        ) : '-'}
      </td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
        {p.linkedCpNo ? (
          <Link href={`/control-plan/register?id=${p.linkedCpNo.toLowerCase()}`} prefetch={false} className="text-teal-600 hover:underline text-[8px] font-semibold" onClick={e => e.stopPropagation()}>
            {p.linkedCpNo.replace(/^cp/i, '')}
          </Link>
        ) : '-'}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        {(() => {
          const step = p.step || 1;
          const targetDate = p.fmeaInfo?.fmeaRevisionDate;
          const today = new Date().toISOString().slice(0, 10);
          if (step >= 6) return <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1 rounded">완료(Done)</span>;
          if (targetDate && targetDate < today) {
            return <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1 rounded">지연(Delay)</span>;
          }
          return <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1 rounded">진행(Active)</span>;
        })()}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">
        {p.fmeaInfo?.fmeaStartDate || p.project?.startDate || renderEmpty(p.id)}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">
        {p.fmeaInfo?.fmeaRevisionDate || renderEmpty(p.id)}
      </td>
    </tr>
  );
});

// =====================================================
// 메인 페이지 컴포넌트 (공용)
// =====================================================
interface FMEAListPageProps {
  config: FMEAListConfig;
  TopNav: React.ComponentType<{ selectedFmeaId?: string }>;
}

export default function FMEAListPage({ config, TopNav }: FMEAListPageProps) {
  const [projects, setProjects] = useState<FMEAProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { isAdmin } = useAuth();
  const [trashMode, setTrashMode] = useState(false);
  const [archiveMode, setArchiveMode] = useState(false);

  const { selectedRows, toggleRow, toggleAllRows, clearSelection, isAllSelected } = useListSelection();
  const { confirmDialog, ConfirmDialogUI } = useConfirmDialog();
  const { deleteSelectDialog, DeleteSelectDialogUI } = useDeleteSelectDialog();

  const tableClass = `${config.modulePrefix}-list-table`;

  // 검색 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const includeDeletedParam = trashMode && isAdmin ? '&includeDeleted=true' : '';
      const archiveParam = archiveMode ? '&isArchive=true' : '';
      const url = `${config.apiEndpoint}${includeDeletedParam}${archiveParam}&page=${page}&size=${PAGE_SIZE}&sortField=${sortField}&sortOrder=${sortOrder}&search=${encodeURIComponent(debouncedSearch)}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.data) {
        let projectList: FMEAProject[] = result.data.map((p: any) => ({
          ...p,
          id: (p.id || '').toLowerCase(),
          deletedAt: p.deletedAt || null,
          linkedPfdNo: p.linkedPfdNo || p.fmeaInfo?.linkedPfdNo || '',
          linkedCpNo: p.linkedCpNo || p.fmeaInfo?.linkedCpNo || '',
          fmeaInfo: {
            ...p.fmeaInfo,
            engineeringLocation: p.fmeaInfo?.engineeringLocation || p.engineeringLocation || '',
          },
        }));

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
  }, [config.apiEndpoint, page, sortField, sortOrder, debouncedSearch, trashMode, archiveMode, isAdmin]);

  const handleSave = useCallback(() => {}, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('fmea-projects-updated', handleUpdate);
    return () => window.removeEventListener('fmea-projects-updated', handleUpdate);
  }, [loadData]);

  useEffect(() => {
    setPage(1);
    clearSelection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashMode, archiveMode]);

  const handleSort = (field: string) => {
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

  const handleToggleRow = useCallback((id: string) => toggleRow(id), [toggleRow]);

  const handleDelete = async () => {
    if (selectedRows.size === 0) {
      toast.warn('삭제할 항목을 선택해주세요.(Please select items to delete.)');
      return;
    }
    const deleteCount = selectedRows.size;
    const ids = Array.from(selectedRows).map(id => (id as string).toLowerCase());

    if (trashMode && isAdmin) {
      const ok = await confirmDialog({
        title: '⚠️ 영구삭제 확인(Confirm Permanent Delete)',
        message: `선택한 ${deleteCount}개 항목을 영구삭제하시겠습니까?(Permanently delete ${deleteCount} items?)\n\n⚠️ 복원 불가능합니다!(This action cannot be undone!)`,
        variant: 'danger',
        confirmText: '영구삭제(Permanent Delete)',
        cancelText: '취소(Cancel)',
      });
      if (!ok) return;

      const deletePromises = ids.map(async (id) => {
        try {
          const res = await fetch(config.apiEndpoint, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fmeaId: id, permanentDelete: true })
          });
          return { id, success: res.ok };
        } catch (e) {
          console.error(`[영구삭제] ${id} 오류:`, e);
          return { id, success: false };
        }
      });

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.success).length;
      await loadData();
      clearSelection();
      toast.success(`${successCount}개 항목 영구삭제 완료(${successCount} items permanently deleted)`);
      return;
    }

    let selectedModules: string[] | undefined;
    try {
      const checkRes = await fetch(`/api/fmea/delete-check?ids=${ids.join(',')}`);
      const checkData = await checkRes.json();

      if (checkData.success && checkData.results) {
        const blocked = checkData.results.filter((r: any) => !r.canDelete);
        if (blocked.length > 0) {
          const reasons = blocked.map((b: any) => `• ${b.fmeaId}: ${b.reason}`).join('\n');
          await confirmDialog({
            title: '삭제 불가(Cannot Delete)',
            message: `승인된 연관 문서가 있어 삭제할 수 없습니다(Cannot delete due to approved linked documents):\n\n${reasons}`,
            variant: 'danger',
            confirmText: '확인(OK)',
            cancelText: '닫기(Close)',
          });
          return;
        }

        const allLinked = checkData.results.flatMap((r: any) => r.linkedModules || []);
        if (allLinked.length > 0) {
          const result = await deleteSelectDialog({ fmeaIds: ids, linkedModules: allLinked });
          if (!result) return;
          selectedModules = result.selectedModules;
        } else {
          const ok = await confirmDialog({
            title: '삭제 확인(Confirm Delete)',
            message: `선택한 ${deleteCount}개 항목을 삭제하시겠습니까?(Delete ${deleteCount} selected items?)`,
            variant: 'danger',
            confirmText: '삭제(Delete)',
            cancelText: '취소(Cancel)',
          });
          if (!ok) return;
        }
      }
    } catch (e) {
      const ok = await confirmDialog({
        title: '삭제 확인(Confirm Delete)',
        message: `선택한 ${deleteCount}개 항목을 삭제하시겠습니까?(Delete ${deleteCount} selected items?)\n\n⚠️ DB에서 삭제됩니다.(Will be deleted from DB.)`,
        variant: 'danger',
        confirmText: '삭제(Delete)',
        cancelText: '취소(Cancel)',
      });
      if (!ok) return;
    }

    const deletePromises = ids.map(async (id) => {
      try {
        const res1 = await fetch(config.apiEndpoint, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fmeaId: id, deleteModules: selectedModules })
        });
        if (!res1.ok) {
          const err = await res1.json().catch(() => ({}));
          console.error(`[삭제] ${id} 프로젝트 삭제 실패:`, err.error || res1.statusText);
          return { id, success: false };
        }
        const res2 = await fetch('/api/fmea', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fmeaId: id })
        });
        if (!res2.ok) {
          console.error(`[삭제] ${id} 워크시트 삭제 실패:`, res2.statusText);
        }
        return { id, success: true };
      } catch (e) {
        console.error(`[삭제] ${id} 오류:`, e);
        return { id, success: false };
      }
    });

    const results = await Promise.all(deletePromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    const remainingOnPage = projects.length - successCount;
    if (remainingOnPage <= 0 && page > 1) {
      setPage(page - 1);
    } else {
      await loadData();
    }
    clearSelection();

    if (failCount > 0) {
      toast.error(`${successCount}개 삭제 완료, ${failCount}개 실패(${successCount} deleted, ${failCount} failed)`);
    } else {
      const moduleInfo = selectedModules ? ` (${selectedModules.join(', ')})` : '';
      toast.success(`${deleteCount}개 항목 삭제 완료(${deleteCount} items deleted)${moduleInfo}`);
    }
  };

  const handleRestore = async () => {
    if (selectedRows.size === 0) {
      toast.warn('복원할 항목을 선택해주세요.(Please select items to restore.)');
      return;
    }
    const ids = Array.from(selectedRows).map(id => (id as string).toLowerCase());
    const ok = await confirmDialog({
      title: '복원 확인(Confirm Restore)',
      message: `선택한 ${ids.length}개 항목을 복원하시겠습니까?(Restore ${ids.length} selected items?)`,
      variant: 'default',
      confirmText: '복원(Restore)',
      cancelText: '취소(Cancel)',
    });
    if (!ok) return;

    let successCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch('/api/fmea/projects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore', fmeaId: id }),
        });
        const data = await res.json();
        if (data.success) successCount++;
      } catch (e) {
        console.error(`[복원] ${id} 오류:`, e);
      }
    }

    await loadData();
    clearSelection();
    if (successCount === ids.length) {
      toast.success(`${successCount}개 항목 복원 완료(${successCount} items restored)`);
    } else {
      toast.warn(`${successCount}/${ids.length}개 복원 완료(${successCount}/${ids.length} restored)`);
    }
  };

  const handleRevision = async () => {
    if (selectedRows.size !== 1) return alert('개정은 한 번에 하나만 가능합니다.(Only one item can be revised at a time.)');
    const selectedId = Array.from(selectedRows)[0];
    if (!confirm(`선택한 FMEA를 개정하시겠습니까?(Revise selected FMEA?)\n\n원본(Source): ${selectedId}\n→ 기존 데이터를 복제하여 새 개정판을 생성합니다.(A new revision will be created by cloning existing data.)`)) return;
    try {
      const res = await fetch('/api/fmea/revision-clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceFmeaId: selectedId }),
      });
      const result = await res.json();
      if (!result.success) { alert('개정 생성 실패(Revision creation failed):\n' + (result.error || '알 수 없는 오류(Unknown error)')); return; }
      toast.success(`${result.revisionNo} 개정 생성 완료(Revision created)`);
      window.location.href = `${config.registerUrl}?id=${result.newFmeaId}&mode=revision`;
    } catch (err) {
      alert('개정 생성 중 네트워크 오류가 발생했습니다.(Network error during revision creation.)\n잠시 후 다시 시도하세요.(Please try again later.)');
    }
  };

  const handleOpenRegister = useCallback((id: string, section?: string) => {
    const url = section ? `${config.registerUrl}?id=${id}#${section}-section` : `${config.registerUrl}?id=${id}`;
    window.location.href = url;
  }, [config.registerUrl]);

  const selectedProjectId = selectedRows.size === 1 ? Array.from(selectedRows)[0] : undefined;

  const COLUMN_HEADERS = [
    { ko: 'No', en: '', field: '', title: 'Number' },
    { ko: '작성일', en: 'Created', field: 'createdAt', title: 'Created/Modified Date' },
    { ko: 'Type', en: '', field: 'fmeaType', title: 'FMEA Type' },
    { ko: 'ID', en: '', field: 'fmeaId', title: 'FMEA Identifier' },
    { ko: 'Rev', en: '', field: 'revisionNo', title: 'Revision Number' },
    { ko: '단계', en: 'Step', field: 'step', title: '1등록 2구조 3고장 4위험 5최적화 6완료' },
    { ko: '공장', en: 'Plant', field: 'engineeringLocation', title: 'Engineering Location / Plant' },
    { ko: 'FMEA명', en: 'Name', field: 'subject', title: 'FMEA Name / Subject' },
    { ko: '고객사', en: 'Customer', field: 'customerName', title: 'Customer Name' },
    { ko: '담당자', en: 'Resp.', field: 'fmeaResponsibleName', title: 'FMEA Responsible Person' },
    { ko: 'PFD', en: '', field: '', title: 'Linked Process Flow Diagram' },
    { ko: 'CP', en: '', field: '', title: 'Linked Control Plan' },
    { ko: '현황', en: 'Status', field: '', title: 'Status (Progress/Delay/Complete)' },
    { ko: '시작일', en: 'Start', field: 'fmeaStartDate', title: 'FMEA Start Date' },
    { ko: '목표완료일', en: 'Target', field: 'fmeaRevisionDate', title: 'Target Completion Date' },
  ];

  return (
    <FixedLayout
      topNav={<TopNav selectedFmeaId={selectedProjectId} />}
      topNavHeight={48}
      showSidebar={true}
      contentPadding="p-0"
    >
      <div className="font-[Malgun_Gothic]" style={{ padding: '4px 16px 4px 5px' }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="text-lg">📋</span>
            <h1 className="text-base font-bold text-gray-800">{config.moduleName} 리스트(List)</h1>
            {isLoading ? (
              <span className="text-xs text-blue-500 ml-2">⏳ 로딩 중...(Loading...)</span>
            ) : (
              <span className="text-xs text-gray-500 ml-2">총(Total) {totalCount}건(Items)</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setArchiveMode(prev => !prev);
                if (trashMode) setTrashMode(false);
                clearSelection();
              }}
              className={`px-3 py-1 rounded text-[11px] font-bold border transition-colors ${archiveMode ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'}`}
              title={archiveMode ? '최신 활성 목록으로 돌아가기(Back to active list)' : '구본보관함(초과된 과거 버전문서) 보기(View archived old versions)'}
            >
              {archiveMode ? '📋 활성 FMEA 보기' : '📦 구본보관함(Archive)'}
            </button>

            {isAdmin && (
              <div className="flex items-center gap-1 border-l pl-2 border-gray-300">
                <button
                  onClick={() => { 
                    setTrashMode(prev => !prev); 
                    if (archiveMode) setArchiveMode(false);
                    clearSelection(); 
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${trashMode ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}
                  title={trashMode ? '일반 목록으로 돌아가기(Back to list)' : '삭제된 항목 보기(View deleted items)'}
                >
                  {trashMode ? '📋 활성 FMEA 보기' : '🗑️ 휴지통(Trash)'}
                </button>
                {trashMode && (
                  <button
                    onClick={handleRestore}
                    disabled={selectedRows.size === 0}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${selectedRows.size > 0 ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                    title="선택 항목 복원(Restore selected items)"
                  >
                    ♻️ 복원(Restore) {selectedRows.size > 0 ? `(${selectedRows.size})` : ''}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 액션 바 */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <ListActionBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="🔍 프로젝트명, FMEA명, 고객사, 담당자, 공장, 단계, 현황, 시작일 검색...(Search)"
              onRefresh={loadData}
              onSave={handleSave}
              saveStatus={saveStatus}
              onRevision={handleRevision}
              revisionDisabled={selectedRows.size !== 1}
              onDelete={handleDelete}
              deleteDisabled={selectedRows.size === 0}
              deleteCount={selectedRows.size}
              registerUrl={config.registerUrl}
              themeColor={config.themeColor}
            />
          </div>
          <DeleteHelpBadge />
        </div>

        {/* 테이블 */}
        <style dangerouslySetInnerHTML={{ __html: `
          .${tableClass} { border-collapse: separate; border-spacing: 0; }
          .${tableClass} thead th { border-bottom: 2px solid #9ca3af; border-right: 1px solid rgba(255,255,255,0.3); background: #00587a; }
          .${tableClass} thead th:last-child { border-right: none; }
          .${tableClass} tbody td { border-bottom: 1px solid #9ca3af; border-right: 1px solid #d1d5db; }
          .${tableClass} tbody td:last-child { border-right: none; }
        `}} />
        <div className="rounded-lg overflow-y-auto border border-gray-400 bg-white mt-1" style={{ maxHeight: 'calc(100vh - 185px)' }}>
          <table className={`${tableClass} w-full text-[8px]`}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#00587a] text-white" style={{ height: '32px' }}>
                <th className="p-0 text-center align-middle" style={{ width: '2.5%' }}>
                  <input type="checkbox" checked={isAllSelected(projects.map(p => p.id))} onChange={() => toggleAllRows(projects.map(p => p.id))} className="w-4 h-4 cursor-pointer" />
                </th>
                {COLUMN_HEADERS.map((col, i) => (
                  <th
                    key={i}
                    className={`px-0.5 py-0 text-center align-middle font-semibold whitespace-nowrap ${col.field ? 'cursor-pointer hover:bg-teal-700' : ''}`}
                    style={{ width: COLUMN_WIDTHS[i] }}
                    onClick={() => col.field && handleSort(col.field)}
                    title={col.title}
                  >
                    <div className="leading-tight">
                      <div className="text-[10px]">
                        {col.ko}
                        {col.field && sortField === col.field && (
                          <span className="ml-0.5">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                      {col.en && <div className="text-[7px] font-normal opacity-60">({col.en})</div>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, idx) => {
                const globalIndex = (page - 1) * PAGE_SIZE + idx;
                return (
                  <FMEAListRow
                    key={p.id}
                    project={p}
                    index={globalIndex}
                    isSelected={selectedRows.has(p.id)}
                    isDeleted={p.deletedAt != null}
                    onToggle={handleToggleRow}
                    onOpenRegister={handleOpenRegister}
                    config={config}
                    columnWidths={COLUMN_WIDTHS}
                  />
                );
              })}
              {projects.length === 0 && (
                <tr style={{ height: '28px' }} className="bg-[#e3f2fd]">
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
          moduleName={config.moduleName}
          version="v4.0"
        />
      </div>

      <ConfirmDialogUI />
      <DeleteSelectDialogUI />
    </FixedLayout>
  );
}
