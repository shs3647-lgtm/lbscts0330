/**
 * @file page.tsx
 * @description Control Plan 리스트 페이지 - 서버사이드 페이지네이션 + 배치삭제 + 컴팩트
 * @version 4.0.0
 * @updated 2026-03-15 가상화 → 서버사이드 페이지네이션 전환
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import CPTopNav from '@/components/layout/CPTopNav';
import { FixedLayout } from '@/components/layout';
import { TypeBadge, extractTypeFromId, ListActionBar, PaginationBar, useListSelection } from '@/components/list';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import CPStepBadge, { CP_STEPS, getStepName } from './CPStepBadge';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { toast } from '@/hooks/useToast';
import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';
import { useAuth } from '@/hooks/useAuth';

const CONFIG = {
  moduleName: 'CP',
  modulePrefix: 'cp',
  themeColor: '#00587a',
  registerUrl: '/control-plan/register',
  worksheetUrl: '/control-plan/worksheet',
  apiEndpoint: '/api/control-plan',
};

const PAGE_SIZE = 50;

const COLUMN_WIDTHS = ['35px', '70px', '80px', '35px', '70px', '120px', '60px', '55px', '50px', '75px', '75px', '75px', '40px', '60px', '60px', '35px', '50px'];

interface CPProject {
  id: string;
  cpInfo?: {
    subject?: string;
    cpStartDate?: string;
    cpRevisionDate?: string;
    customerName?: string;
    processResponsibility?: string;
    cpResponsibleName?: string;
    confidentialityLevel?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  parentCpId?: string;
  parentApqpNo?: string;
  parentFmeaId?: string;
  linkedPfdNo?: string;
  step?: number;
  revisionNo?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// ★ 단계 확정 모달
function StepConfirmModal({
  isOpen, cpId, currentStep, onConfirm, onClose
}: {
  isOpen: boolean; cpId: string; currentStep: number;
  onConfirm: (cpId: string, step: number) => void; onClose: () => void;
}) {
  const [selectedStep, setSelectedStep] = useState(currentStep);
  const { pos: stepPos, size: stepSize, onDragStart: stepDragStart, onResizeStart: stepResizeStart } = useFloatingWindow({ isOpen, width: 320, height: 320 });

  useEffect(() => { setSelectedStep(currentStep); }, [currentStep, isOpen]);
  if (!isOpen) return null;

  return (
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: stepPos.x, top: stepPos.y, width: stepSize.w, height: stepSize.h }}>
      <div className="bg-[#00587a] text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move" onMouseDown={stepDragStart}>
        <h3 className="text-sm font-bold">CP 단계 확정(Step Confirm)</h3>
        <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <p className="text-xs text-gray-600 mb-3">CP ID: <span className="font-semibold">{cpId}</span></p>
        <div className="space-y-2 mb-4">
          {CP_STEPS.filter(s => s.step >= 2 && s.step <= 5).map(s => (
            <label key={s.step} className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${selectedStep === s.step ? 'bg-blue-50 border-blue-400' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="step" checked={selectedStep === s.step} onChange={() => setSelectedStep(s.step)} className="w-4 h-4" />
              <CPStepBadge step={s.step} showName={true} />
              {selectedStep === s.step && s.step > currentStep && <span className="text-[9px] text-green-600 ml-auto">확정(Confirm)</span>}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300" onClick={onClose}>취소(Cancel)</button>
          <button className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => { onConfirm(cpId, selectedStep); onClose(); }}>확정(Confirm)</button>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={stepResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

function formatId(id: string, index: number): string {
  if (id) return id.toUpperCase();
  const year = new Date().getFullYear().toString().slice(-2);
  return `CP${year}-P${(index + 1).toString().padStart(3, '0')}`;
}

// ★ React.memo Row 컴포넌트
interface CPListRowProps {
  project: CPProject;
  globalIndex: number;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onOpenRegister: (id: string) => void;
  onStepClick: (cpId: string, step: number) => void;
  renderEmptyFn: (id: string) => React.ReactNode;
}

const CPListRow = React.memo(function CPListRow({
  project: p, globalIndex, isSelected, onToggle, onOpenRegister, onStepClick, renderEmptyFn,
}: CPListRowProps) {
  return (
    <tr className={`hover:bg-blue-50 cursor-pointer transition-colors ${globalIndex % 2 === 0 ? 'bg-blue-50/50' : 'bg-white'} ${isSelected ? 'bg-blue-100' : ''}`}
      style={{ height: 28 }} onClick={() => onToggle(p.id)}>
      <td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" checked={isSelected} onChange={() => onToggle(p.id)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5" /></td>
      <td className="px-1 py-0.5 text-center align-middle font-bold text-blue-700 whitespace-nowrap">{globalIndex + 1}</td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px] text-gray-700">
        {(p.updatedAt || p.cpInfo?.updatedAt || p.createdAt || p.cpInfo?.createdAt || '').slice(0, 10) || '-'}
      </td>
      <td className="px-1 py-0.5 text-center align-middle font-semibold text-blue-600 whitespace-nowrap"><a href={`${CONFIG.registerUrl}?id=${p.id.toLowerCase()}`} className="hover:underline text-[9px]">{formatId(p.id, globalIndex)}</a></td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap"><TypeBadge typeCode={extractTypeFromId(p.id, CONFIG.modulePrefix)} /></td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">
        {p.cpInfo?.confidentialityLevel ? (
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${p.cpInfo.confidentialityLevel === 'Prototype' ? 'bg-indigo-400' :
            p.cpInfo.confidentialityLevel === 'Pre-Launch' ? 'bg-orange-400' :
              p.cpInfo.confidentialityLevel === 'Production' ? 'bg-green-500' :
                p.cpInfo.confidentialityLevel === 'Safe Launch' ? 'bg-teal-500' : 'bg-gray-400'
            }`}>
            {p.cpInfo.confidentialityLevel === 'Prototype' ? 'Proto' :
              p.cpInfo.confidentialityLevel === 'Pre-Launch' ? 'Pre-L' :
                p.cpInfo.confidentialityLevel === 'Production' ? 'Prod' :
                  p.cpInfo.confidentialityLevel === 'Safe Launch' ? 'Safe-L' : p.cpInfo.confidentialityLevel}
          </span>
        ) : <span className="text-gray-300">-</span>}
      </td>
      <td className="px-1 py-0.5 text-left align-middle whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{(() => { const name = p.cpInfo?.subject; if (!name || name === p.id) return renderEmptyFn(p.id); return <a href={`${CONFIG.worksheetUrl}?cpNo=${p.id.toLowerCase()}`} className="text-blue-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()} title={name}>{name}</a>; })()}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.cpInfo?.customerName || renderEmptyFn(p.id)}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.cpInfo?.processResponsibility || renderEmptyFn(p.id)}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.cpInfo?.cpResponsibleName || renderEmptyFn(p.id)}</td>
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
        {p.linkedPfdNo ? (
          <a href={`/pfd/register?id=${p.linkedPfdNo.toLowerCase()}`} className="text-violet-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()}>
            <span className="flex items-center justify-center gap-0.5">
              <span className="px-1 py-0 rounded text-[8px] font-bold text-white bg-violet-500">PFD</span>
              <span className="text-[8px]">{p.linkedPfdNo}</span>
            </span>
          </a>
        ) : renderEmptyFn(p.id)}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        {(() => {
          const step = p.step || 1;
          if (step >= 5) return <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1 rounded">완료(Done)</span>;
          if (step >= 2) return <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1 rounded">진행(Progress)</span>;
          return <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1 rounded">지연(Delayed)</span>;
        })()}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">{p.cpInfo?.cpStartDate || renderEmptyFn(p.id)}</td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">{p.cpInfo?.cpRevisionDate || renderEmptyFn(p.id)}</td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.revisionNo || 'Rev.00'}</td>
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
        <CPStepBadge step={p.step} isApproved={p.status === 'approved'} onClick={() => onStepClick(p.id, p.step || 1)} />
      </td>
    </tr>
  );
});

export default function CPListPage() {
  const [projects, setProjects] = useState<CPProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { selectedRows, toggleRow, toggleAllRows, clearSelection, isAllSelected } = useListSelection();
  const { confirmDialog, ConfirmDialogUI } = useConfirmDialog();
  const { isAdmin } = useAuth();
  const [trashMode, setTrashMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stepModal, setStepModal] = useState<{ isOpen: boolean; cpId: string; currentStep: number }>({
    isOpen: false, cpId: '', currentStep: 1
  });

  // ★ 검색 디바운스 (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // 검색 변경 시 1페이지로
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // ★ 휴지통 모드 전환 시 1페이지로 리셋
  useEffect(() => {
    setPage(1);
    clearSelection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashMode]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
        sortField,
        sortOrder,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (trashMode && isAdmin) params.set('includeDeleted', 'true');

      const res = await fetch(`${CONFIG.apiEndpoint}?${params.toString()}`);
      const result = await res.json();

      if (result?.success && result?.data) {
        const projectList: CPProject[] = result.data.map((cp: any) => ({
          id: cp.cpNo,
          cpInfo: {
            subject: cp.subject,
            cpStartDate: cp.cpStartDate,
            cpRevisionDate: cp.cpRevisionDate,
            customerName: cp.customerName,
            processResponsibility: cp.processResponsibility,
            cpResponsibleName: cp.cpResponsibleName,
            confidentialityLevel: cp.confidentialityLevel,
          },
          parentCpId: cp.parentCpId,
          parentApqpNo: cp.parentApqpNo,
          parentFmeaId: cp.fmeaId,
          linkedPfdNo: cp.linkedPfdNo,
          step: cp.step || 1,
          revisionNo: cp.revisionNo || 'Rev.00',
          status: cp.status || 'draft',
          createdAt: cp.createdAt || '',
          updatedAt: cp.updatedAt || '',
          deletedAt: cp.deletedAt || null,
        }));

        // ★ ProjectLinkage에서 연동 정보 병합
        try {
          const linkageRes = await fetch('/api/project-linkage');
          const linkageData = await linkageRes.json();
          if (linkageData.success && linkageData.data?.length > 0) {
            const linkageMap = new Map<string, { pfmeaId?: string; pfdNo?: string; apqpNo?: string }>();
            for (const link of linkageData.data) {
              if (link.cpNo) {
                const cpNoLower = link.cpNo.toLowerCase();
                const existing = linkageMap.get(cpNoLower);
                linkageMap.set(cpNoLower, {
                  pfmeaId: link.pfmeaId || existing?.pfmeaId,
                  pfdNo: link.pfdNo || existing?.pfdNo,
                  apqpNo: link.apqpNo || existing?.apqpNo,
                });
              }
            }
            for (let i = 0; i < projectList.length; i++) {
              const linkage = linkageMap.get(projectList[i].id?.toLowerCase() || '');
              if (linkage) {
                projectList[i] = {
                  ...projectList[i],
                  parentFmeaId: linkage.pfmeaId || projectList[i].parentFmeaId,
                  linkedPfdNo: linkage.pfdNo || projectList[i].linkedPfdNo,
                  parentApqpNo: linkage.apqpNo || projectList[i].parentApqpNo,
                };
              }
            }
          }
        } catch (linkErr) {
          console.error('[CP List] ProjectLinkage 조회 실패:', linkErr);
        }

        // ★ 휴지통 모드: 삭제된 항목만 / 일반 모드: 활성 항목만
        let filteredList = projectList;
        if (trashMode && isAdmin) {
          filteredList = projectList.filter(p => p.deletedAt != null);
        } else {
          filteredList = projectList.filter(p => p.deletedAt == null);
        }

        setProjects(filteredList);

        // ★ 페이지네이션 메타 업데이트
        if (result.pagination) {
          setTotalCount(result.pagination.totalCount);
          setTotalPages(result.pagination.totalPages);
        }
      } else {
        setProjects([]);
        setTotalCount(0);
        setTotalPages(0);
      }
    } catch {
      setProjects([]);
      setTotalCount(0);
      setTotalPages(0);
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
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1); // 정렬 변경 시 1페이지로
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    clearSelection();
  }, [clearSelection]);

  // ★ 배치 삭제 (휴지통 모드: 영구삭제, 일반 모드: Soft Delete)
  const handleDelete = async () => {
    if (selectedRows.size === 0) { toast.warn('삭제할 항목을 선택해주세요.'); return; }
    const deleteCount = selectedRows.size;
    const ids = Array.from(selectedRows);

    // ★ 휴지통 모드: 영구삭제
    if (trashMode && isAdmin) {
      const ok = await confirmDialog({ title: '⚠️ 영구삭제 확인(Confirm Permanent Delete)', message: `선택한 ${deleteCount}개 CP를 영구삭제하시겠습니까?(Permanently delete ${deleteCount} CPs?)\n\n⚠️ 복원 불가능합니다!(This action cannot be undone!)`, variant: 'danger', confirmText: '영구삭제(Permanent Delete)', cancelText: '취소(Cancel)' });
      if (!ok) return;

      let successCount = 0;
      const BATCH = 5;
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const results = await Promise.all(batch.map(async (cpNo) => {
          try {
            const res = await fetch(`${CONFIG.apiEndpoint}?cpNo=${encodeURIComponent(cpNo.toLowerCase())}`, { method: 'DELETE' });
            if (res.ok) {
              await fetch('/api/control-plan/worksheet', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpNo: cpNo.toLowerCase() }),
              }).catch(e => console.error(`[CP 워크시트 삭제] ${cpNo}:`, e));
            }
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
    const ok = await confirmDialog({ title: '삭제 확인(Delete Confirm)', message: `선택한 ${deleteCount}개 CP를 삭제하시겠습니까?(Delete ${deleteCount} CPs?)\n\n♻️ 휴지통에서 복원 가능합니다.(Can be restored from trash.)`, variant: 'danger', confirmText: '삭제(Delete)', cancelText: '취소(Cancel)' });
    if (!ok) return;

    let successCount = 0;
    let failCount = 0;
    const BATCH = 5;

    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async (cpNo) => {
        try {
          const res = await fetch(CONFIG.apiEndpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'softDelete', cpNo: cpNo.toLowerCase() }),
          });
          const data = await res.json();
          return { id: cpNo, success: data.success };
        } catch (e) {
          console.error(`[CP 삭제] ${cpNo} 오류:`, e);
          return { id: cpNo, success: false };
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
    for (const cpNo of ids) {
      try {
        const res = await fetch(CONFIG.apiEndpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore', cpNo: cpNo.toLowerCase() }),
        });
        const data = await res.json();
        if (data.success) successCount++;
      } catch (e) {
        console.error(`[CP 복원] ${cpNo} 오류:`, e);
      }
    }

    await loadData();
    clearSelection();
    if (successCount === ids.length) { toast.success(`${successCount}개 항목 복원 완료(${successCount} items restored)`); }
    else { toast.warn(`${successCount}/${ids.length}개 복원 완료(${successCount}/${ids.length} restored)`); }
  };

  const handleEdit = useCallback(() => {
    if (selectedRows.size !== 1) { toast.warn('수정은 한 번에 하나만 가능합니다.'); return; }
    window.location.href = `${CONFIG.registerUrl}?id=${Array.from(selectedRows)[0].toLowerCase()}`;
  }, [selectedRows]);

  const handleOpenRegister = useCallback((id: string) => {
    window.location.href = `${CONFIG.registerUrl}?id=${id.toLowerCase()}`;
  }, []);

  const handleToggleRow = useCallback((id: string) => { toggleRow(id); }, [toggleRow]);

  const handleStepClick = useCallback((cpId: string, step: number) => {
    setStepModal({ isOpen: true, cpId, currentStep: step });
  }, []);

  const handleStepConfirm = async (cpId: string, step: number) => {
    try {
      const res = await fetch(`${CONFIG.apiEndpoint}/step`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpNo: cpId, step }) });
      if (res.ok) { loadData(); toast.success(`${cpId}의 단계가 ${step}단계(${getStepName(step)})로 확정되었습니다.`); }
      else { toast.error('단계 확정 실패'); }
    } catch (e) { console.error('단계 확정 오류:', e); toast.error('단계 확정 중 오류 발생'); }
  };

  const renderEmpty = useCallback((id: string) => (
    <span className="text-orange-400 text-[9px] cursor-pointer hover:text-orange-600 hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenRegister(id); }}>미입력(Empty)</span>
  ), [handleOpenRegister]);

  return (
    <FixedLayout topNav={<CPTopNav selectedCpId="" />} topNavHeight={48} showSidebar={true} contentPadding="p-0">
      <div className="font-[Malgun_Gothic] px-2 pt-1">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-sm">📋</span>
          <h1 className="text-xs font-bold text-gray-800">Control Plan 리스트</h1>
          <span className="text-[10px] text-gray-500 ml-1">{isLoading ? '로딩 중...(Loading)' : `총 ${totalCount}건`}</span>
        </div>

        <div className="flex items-start gap-1 mb-1">
          <div className="flex-1">
            <ListActionBar searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="🔍 CP명, 고객사로 검색..." onRefresh={loadData} onSave={handleSave} saveStatus={saveStatus} onEdit={handleEdit} editDisabled={selectedRows.size !== 1} onDelete={handleDelete} deleteDisabled={selectedRows.size === 0} deleteCount={selectedRows.size} registerUrl={CONFIG.registerUrl} themeColor={CONFIG.themeColor} />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button onClick={() => { setTrashMode(prev => !prev); clearSelection(); }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${trashMode ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                {trashMode ? '📋 리스트(List)' : '🗑️ 휴지통(Trash)'}
              </button>
              {trashMode && (
                <button onClick={handleRestore} disabled={selectedRows.size === 0}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedRows.size > 0 ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'}`}>
                  ♻️ 복원(Restore) ({selectedRows.size})
                </button>
              )}
            </div>
          )}
          <DeleteHelpBadge />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .cp-list-table { border-collapse: separate; border-spacing: 0; }
          .cp-list-table thead th { border-bottom: 2px solid #9ca3af; border-right: 1px solid rgba(255,255,255,0.3); background: #00587a; }
          .cp-list-table thead th:last-child { border-right: none; }
          .cp-list-table tbody td { border-bottom: 1px solid #9ca3af; border-right: 1px solid #d1d5db; }
          .cp-list-table tbody td:last-child { border-right: none; }
        `}} />
        <div className="rounded-lg overflow-x-auto border border-gray-400 bg-white" style={{ maxHeight: 'calc(100vh - 190px)', overflow: 'auto' }}>
          <table className="w-full cp-list-table text-[10px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#00587a] text-white" style={{ height: '28px' }}>
                <th className="px-1 py-1 text-center align-middle w-8">
                  <input type="checkbox" checked={isAllSelected(projects.map(p => p.id))} onChange={() => toggleAllRows(projects.map(p => p.id))} className="w-3.5 h-3.5" />
                </th>
                {[
                  { label: 'No', field: '' },
                  { label: '작성일(Date)', field: 'createdAt' },
                  { label: 'CP ID', field: 'cpNo' },
                  { label: 'TYPE', field: '' },
                  { label: 'CP 종류(Category)', field: 'confidentialityLevel' },
                  { label: 'CP명(Name)', field: 'subject' },
                  { label: '고객사(Customer)', field: 'customerName' },
                  { label: '공정책임(Resp.)', field: 'processResponsibility' },
                  { label: '담당자(Owner)', field: 'cpResponsibleName' },
                  { label: '상위 APQP(Parent)', field: '' },
                  { label: '상위 FMEA(Parent)', field: '' },
                  { label: '연동 PFD(Linked)', field: '' },
                  { label: '현황(Status)', field: '' },
                  { label: '시작일(Start)', field: '' },
                  { label: '목표완료일(Target)', field: '' },
                  { label: 'Rev', field: '' },
                  { label: '단계(Step)', field: '' },
                ].map((col, i) => (
                  <th key={i}
                    className={`px-1 py-1 text-center align-middle font-semibold whitespace-nowrap text-[11px] ${col.field ? 'cursor-pointer hover:bg-teal-700' : ''}`}
                    style={{ width: COLUMN_WIDTHS[i] }}
                    onClick={() => col.field && handleSort(col.field)}>
                    {col.label}
                    {col.field && sortField === col.field && <span className="ml-0.5">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, index) => {
                const globalIndex = (page - 1) * PAGE_SIZE + index;
                return (
                  <CPListRow key={p.id} project={p} globalIndex={globalIndex}
                    isSelected={selectedRows.has(p.id)} onToggle={handleToggleRow}
                    onOpenRegister={handleOpenRegister} onStepClick={handleStepClick}
                    renderEmptyFn={renderEmpty} />
                );
              })}
              {projects.length === 0 && <tr style={{ height: '28px' }} className="bg-blue-50/50"><td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" /></td>{Array.from({ length: 16 }).map((_, i) => <td key={i} className="px-2 py-1 text-center align-middle text-gray-300">-</td>)}</tr>}
            </tbody>
          </table>
        </div>

        <PaginationBar page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={handlePageChange} moduleName={CONFIG.moduleName} version="v4.0" />
      </div>

      <StepConfirmModal isOpen={stepModal.isOpen} cpId={stepModal.cpId} currentStep={stepModal.currentStep}
        onConfirm={handleStepConfirm} onClose={() => setStepModal({ ...stepModal, isOpen: false })} />
      <ConfirmDialogUI />
    </FixedLayout>
  );
}
