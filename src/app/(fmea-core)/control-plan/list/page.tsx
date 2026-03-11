// CODEFREEZE
/**
 * @file page.tsx
 * @description Control Plan 리스트 페이지 - 모듈화 적용
 * @version 3.1.0
 * @updated 2026-01-24 CP 단계 관리 기능 추가
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CPTopNav from '@/components/layout/CPTopNav';
import { FixedLayout } from '@/components/layout';
import { TypeBadge, extractTypeFromId, ListActionBar, ListStatusBar, useListSelection } from '@/components/list';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import CPStepBadge, { CP_STEPS, getStepName } from './CPStepBadge';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { toast } from '@/hooks/useToast';
import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';

const CONFIG = {
  moduleName: 'CP',
  modulePrefix: 'cp',
  themeColor: '#00587a',
  registerUrl: '/control-plan/register',
  worksheetUrl: '/control-plan/worksheet',
  apiEndpoint: '/api/control-plan',
};

// ★ PFMEA 표준 컬럼: No, 작성일, CP ID, TYPE, CP 종류, CP명, 고객사, 공정책임, 담당자, 상위 APQP, 상위 FMEA, 연동 PFD, 현황, 시작일, 목표완료일, Rev, 단계
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
    confidentialityLevel?: string; // ✅ CP 종류 (Prototype, Pre-Launch, Production)
    createdAt?: string;   // ✅ 최초 작성일
    updatedAt?: string;   // ✅ 수정일
  };
  parentCpId?: string;
  parentApqpNo?: string;
  parentFmeaId?: string;
  linkedPfdNo?: string;
  step?: number;
  revisionNo?: string;
  status?: string;  // draft | approved | obsolete
  createdAt?: string;   // ✅ 최초 작성일
  updatedAt?: string;   // ✅ 수정일
}

// 단계 확정 모달
function StepConfirmModal({
  isOpen,
  cpId,
  currentStep,
  onConfirm,
  onClose
}: {
  isOpen: boolean;
  cpId: string;
  currentStep: number;
  onConfirm: (cpId: string, step: number) => void;
  onClose: () => void;
}) {
  const [selectedStep, setSelectedStep] = useState(currentStep);

  // Floating window hook
  const { pos: stepPos, size: stepSize, onDragStart: stepDragStart, onResizeStart: stepResizeStart } = useFloatingWindow({ isOpen, width: 320, height: 320 });

  useEffect(() => {
    setSelectedStep(currentStep);
  }, [currentStep, isOpen]);

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
            <label
              key={s.step}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${selectedStep === s.step ? 'bg-blue-50 border-blue-400' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <input
                type="radio"
                name="step"
                checked={selectedStep === s.step}
                onChange={() => setSelectedStep(s.step)}
                className="w-4 h-4"
              />
              <CPStepBadge step={s.step} showName={true} />
              {selectedStep === s.step && s.step > currentStep && (
                <span className="text-[9px] text-green-600 ml-auto">확정(Confirm)</span>
              )}
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={onClose}
          >
            취소(Cancel)
          </button>
          <button
            className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => { onConfirm(cpId, selectedStep); onClose(); }}
          >
            확정(Confirm)
          </button>
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

export default function CPListPage() {
  const [projects, setProjects] = useState<CPProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { selectedRows, toggleRow, toggleAllRows, clearSelection, isAllSelected } = useListSelection();
  const { confirmDialog, ConfirmDialogUI } = useConfirmDialog();

  // 단계 확정 모달 상태
  const [stepModal, setStepModal] = useState<{ isOpen: boolean; cpId: string; currentStep: number }>({
    isOpen: false, cpId: '', currentStep: 1
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(CONFIG.apiEndpoint);
      const result = await res.json();
      let projectList: CPProject[] = [];
      if (result?.success && result?.data) {
        projectList = result.data.map((cp: any) => ({
          id: cp.cpNo,
          cpInfo: {
            subject: cp.subject,
            cpStartDate: cp.cpStartDate,
            cpRevisionDate: cp.cpRevisionDate,
            customerName: cp.customerName,
            processResponsibility: cp.processResponsibility,
            cpResponsibleName: cp.cpResponsibleName,
            confidentialityLevel: cp.confidentialityLevel  // ✅ CP 종류 매핑
          },
          parentCpId: cp.parentCpId,
          parentApqpNo: cp.apqpNo,
          parentFmeaId: cp.fmeaId,
          linkedPfdNo: cp.pfdNo,
          step: cp.step || 1,
          revisionNo: cp.revisionNo || 'Rev.00',
          status: cp.status || 'draft',
          createdAt: cp.createdAt || '',
          updatedAt: cp.updatedAt || '',
        }));
      }

      // ★★★ ProjectLinkage에서 연동 정보 병합 ★★★
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
          projectList = projectList.map(p => {
            const linkage = linkageMap.get(p.id?.toLowerCase() || '');
            return {
              ...p,
              parentFmeaId: linkage?.pfmeaId || p.parentFmeaId,
              linkedPfdNo: linkage?.pfdNo || p.linkedPfdNo,
              parentApqpNo: linkage?.apqpNo || p.parentApqpNo,
            };
          });
        }
      } catch (linkErr) {
      }

      setProjects(projectList.sort((a, b) => (b.id || '').localeCompare(a.id || '')));
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

  const filteredProjects = projects
    .filter(p => {
      const q = searchQuery.toLowerCase();
      return p.id?.toLowerCase().includes(q) ||
        p.cpInfo?.subject?.toLowerCase().includes(q) ||
        p.cpInfo?.customerName?.toLowerCase().includes(q) ||
        p.cpInfo?.processResponsibility?.toLowerCase().includes(q) ||
        p.cpInfo?.cpResponsibleName?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let aVal = '', bVal = '';
      if (sortField === 'createdAt') {
        aVal = a.updatedAt || a.cpInfo?.updatedAt || a.createdAt || a.cpInfo?.createdAt || '';
        bVal = b.updatedAt || b.cpInfo?.updatedAt || b.createdAt || b.cpInfo?.createdAt || '';
      } else if (sortField === 'subject') {
        aVal = a.cpInfo?.subject || '';
        bVal = b.cpInfo?.subject || '';
      } else if (sortField === 'customerName') {
        aVal = a.cpInfo?.customerName || '';
        bVal = b.cpInfo?.customerName || '';
      } else if (sortField === 'cpResponsibleName') {
        aVal = a.cpInfo?.cpResponsibleName || '';
        bVal = b.cpInfo?.cpResponsibleName || '';
      } else if (sortField === 'confidentialityLevel') {
        aVal = a.cpInfo?.confidentialityLevel || '';
        bVal = b.cpInfo?.confidentialityLevel || '';
      } else {
        aVal = (a as any)[sortField] || '';
        bVal = (b as any)[sortField] || '';
      }
      const compare = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? compare : -compare;
    });

  const handleDelete = async () => {
    if (selectedRows.size === 0) { toast.warn('삭제할 항목을 선택해주세요.'); return; }
    const deleteCount = selectedRows.size;
    const ok = await confirmDialog({ title: '삭제 확인(Delete Confirm)', message: `선택한 ${deleteCount}개 항목을 삭제하시겠습니까?(Delete ${deleteCount} selected items?)\n\n⚠️ DB에서 영구 삭제됩니다.`, variant: 'danger', confirmText: '삭제(Delete)', cancelText: '취소(Cancel)' });
    if (!ok) return;

    const deletePromises = Array.from(selectedRows).map(async (cpNo) => {
      try {
        const res1 = await fetch(`${CONFIG.apiEndpoint}?cpNo=${cpNo.toLowerCase()}`, { method: 'DELETE' });
        const data1 = await res1.json();
        const res2 = await fetch('/api/control-plan/worksheet', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpNo: cpNo.toLowerCase() }) });
        return { id: cpNo, success: res1.ok };
      } catch (e) { console.error(`[삭제] ${cpNo} 오류:`, e); return { id: cpNo, success: false }; }
    });

    const results = await Promise.all(deletePromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    await loadData();
    clearSelection();
    if (failCount > 0) { toast.error(`${successCount}개 삭제 완료, ${failCount}개 실패`); }
    else { toast.success(`${deleteCount}개 항목 삭제 완료`); }
  };

  const handleEdit = () => {
    if (selectedRows.size !== 1) { toast.warn('수정은 한 번에 하나만 가능합니다.'); return; }
    window.location.href = `${CONFIG.registerUrl}?id=${Array.from(selectedRows)[0].toLowerCase()}`;
  };

  const handleOpenRegister = (id: string) => { window.location.href = `${CONFIG.registerUrl}?id=${id.toLowerCase()}`; };

  const handleStepConfirm = async (cpId: string, step: number) => {
    try {
      const res = await fetch(`${CONFIG.apiEndpoint}/step`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpNo: cpId, step }) });
      if (res.ok) { loadData(); toast.success(`${cpId}의 단계가 ${step}단계(${getStepName(step)})로 확정되었습니다.`); }
      else { toast.error('단계 확정 실패'); }
    } catch (e) { console.error('단계 확정 오류:', e); toast.error('단계 확정 중 오류 발생'); }
  };

  const renderEmpty = (id: string) => (
    <span className="text-orange-400 text-[9px] cursor-pointer hover:text-orange-600 hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenRegister(id); }}>미입력(Empty)</span>
  );

  return (
    <FixedLayout topNav={<CPTopNav selectedCpId="" />} topNavHeight={48} showSidebar={true} contentPadding="p-0">
      <div className="font-[Malgun_Gothic] px-2 pt-1">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-sm">📋</span>
          <h1 className="text-xs font-bold text-gray-800">Control Plan 리스트</h1>
          <span className="text-[10px] text-gray-500 ml-1">{isLoading ? '로딩 중...(Loading)' : `총 ${filteredProjects.length}건`}</span>
        </div>

        <div className="flex items-start gap-1 mb-1">
          <div className="flex-1">
            <ListActionBar searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="🔍 CP명, 고객사로 검색..." onRefresh={loadData} onSave={handleSave} saveStatus={saveStatus} onEdit={handleEdit} editDisabled={selectedRows.size !== 1} onDelete={handleDelete} deleteDisabled={selectedRows.size === 0} deleteCount={selectedRows.size} registerUrl={CONFIG.registerUrl} themeColor={CONFIG.themeColor} />
          </div>
          <DeleteHelpBadge />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .cp-list-table { border-collapse: separate; border-spacing: 0; }
          .cp-list-table thead th { border-bottom: 2px solid #9ca3af; border-right: 1px solid rgba(255,255,255,0.3); background: #00587a; }
          .cp-list-table thead th:last-child { border-right: none; }
          .cp-list-table tbody td { border-bottom: 1px solid #9ca3af; border-right: 1px solid #d1d5db; }
          .cp-list-table tbody td:last-child { border-right: none; }
        `}} />
        <div className="rounded-lg overflow-x-auto border border-gray-400 bg-white">
          <table className="w-full cp-list-table text-[10px]">
            <thead>
              <tr className="bg-[#00587a] text-white" style={{ height: '28px' }}>
                <th className="px-1 py-1 text-center align-middle w-8">
                  <input type="checkbox" checked={isAllSelected(filteredProjects.map(p => p.id))} onChange={() => toggleAllRows(filteredProjects.map(p => p.id))} className="w-3.5 h-3.5" />
                </th>
                {/* ★ PFMEA 표준 컬럼 - 정렬 가능 */}
                {[
                  { label: 'No', field: '' },
                  { label: '작성일(Date)', field: 'createdAt' },
                  { label: 'CP ID', field: 'id' },
                  { label: 'TYPE', field: '' },
                  { label: 'CP 종류(Category)', field: 'confidentialityLevel' },
                  { label: 'CP명(Name)', field: 'subject' },
                  { label: '고객사(Customer)', field: 'customerName' },
                  { label: '공정책임(Resp.)', field: 'processResponsibility' },
                  { label: '담당자(Owner)', field: 'cpResponsibleName' },
                  { label: '상위 APQP(Parent)', field: 'parentApqpNo' },
                  { label: '상위 FMEA(Parent)', field: 'parentFmeaId' },
                  { label: '연동 PFD(Linked)', field: 'linkedPfdNo' },
                  { label: '현황(Status)', field: '' },
                  { label: '시작일(Start)', field: 'cpStartDate' },
                  { label: '목표완료일(Target)', field: 'cpRevisionDate' },
                  { label: 'Rev', field: 'revisionNo' },
                  { label: '단계(Step)', field: 'step' },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`px-1 py-1 text-center align-middle font-semibold whitespace-nowrap text-[11px] ${col.field ? 'cursor-pointer hover:bg-teal-700' : ''}`}
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
              {filteredProjects.map((p, index) => (
                <tr key={p.id} className={`hover:bg-blue-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-blue-50/50' : 'bg-white'} ${selectedRows.has(p.id) ? 'bg-blue-100' : ''}`} style={{ height: '28px' }} onClick={() => toggleRow(p.id)}>
                  <td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" checked={selectedRows.has(p.id)} onChange={() => toggleRow(p.id)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5" /></td>
                  <td className="px-1 py-0.5 text-center align-middle font-bold text-blue-700 whitespace-nowrap">{index + 1}</td>
                  {/* ★ 작성일 - 첫번째 */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px] text-gray-700">
                    {(p.updatedAt || p.cpInfo?.updatedAt || p.createdAt || p.cpInfo?.createdAt || '').slice(0, 10) || '-'}
                  </td>
                  <td className="px-1 py-0.5 text-center align-middle font-semibold text-blue-600 whitespace-nowrap"><a href={`${CONFIG.registerUrl}?id=${p.id.toLowerCase()}`} className="hover:underline text-[9px]">{formatId(p.id, index)}</a></td>
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap"><TypeBadge typeCode={extractTypeFromId(p.id, CONFIG.modulePrefix)} /></td>

                  {/* ★ CP 종류 (confidentialityLevel) */}
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
                  <td className="px-1 py-0.5 text-left align-middle whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{(() => { const name = p.cpInfo?.subject; if (!name || name === p.id) return renderEmpty(p.id); return <a href={`${CONFIG.worksheetUrl}?cpNo=${p.id.toLowerCase()}`} className="text-blue-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()} title={name}>{name}</a>; })()}</td>
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.cpInfo?.customerName || renderEmpty(p.id)}</td>
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.cpInfo?.processResponsibility || renderEmpty(p.id)}</td>
                  {/* 담당자 (공정책임 다음) */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.cpInfo?.cpResponsibleName || renderEmpty(p.id)}</td>
                  {/* ★ 상위 APQP */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
                    {p.parentApqpNo ? (
                      <a href={`/apqp/register?id=${p.parentApqpNo}`} className="text-blue-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()}>
                        <span className="flex items-center justify-center gap-0.5">
                          <span className="px-1 py-0 rounded text-[8px] font-bold text-white bg-blue-500">APQP</span>
                          <span className="text-[8px]">{p.parentApqpNo}</span>
                        </span>
                      </a>
                    ) : renderEmpty(p.id)}
                  </td>
                  {/* ★ 상위 FMEA */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
                    {p.parentFmeaId ? (
                      <a href={`/pfmea/register?id=${p.parentFmeaId.toLowerCase()}`} className="text-yellow-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()}>
                        <span className="flex items-center justify-center gap-0.5">
                          <span className="px-1 py-0 rounded text-[8px] font-bold text-white bg-yellow-500">FMEA</span>
                          <span className="text-[8px]">{p.parentFmeaId}</span>
                        </span>
                      </a>
                    ) : renderEmpty(p.id)}
                  </td>
                  {/* ★ 연동 PFD */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
                    {p.linkedPfdNo ? (
                      <a href={`/pfd/register?id=${p.linkedPfdNo.toLowerCase()}`} className="text-violet-600 hover:underline text-[9px] font-semibold" onClick={e => e.stopPropagation()}>
                        <span className="flex items-center justify-center gap-0.5">
                          <span className="px-1 py-0 rounded text-[8px] font-bold text-white bg-violet-500">PFD</span>
                          <span className="text-[8px]">{p.linkedPfdNo}</span>
                        </span>
                      </a>
                    ) : renderEmpty(p.id)}
                  </td>
                  {/* ★ 현황 (완료/진행/지연) - PFMEA 벤치마킹 */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
                    {(() => {
                      const step = p.step || 1;
                      if (step >= 5) return <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1 rounded">완료(Done)</span>;
                      if (step >= 2) return <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1 rounded">진행(Progress)</span>;
                      return <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1 rounded">지연(Delayed)</span>;
                    })()}
                  </td>
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">{p.cpInfo?.cpStartDate || renderEmpty(p.id)}</td>
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">{p.cpInfo?.cpRevisionDate || renderEmpty(p.id)}</td>
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.revisionNo || 'Rev.00'}</td>
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
                    <CPStepBadge
                      step={p.step}
                      isApproved={p.status === 'approved'}
                      onClick={() => {
                        setStepModal({ isOpen: true, cpId: p.id, currentStep: p.step || 1 });
                      }}
                    />
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && <tr style={{ height: '28px' }} className="bg-blue-50/50"><td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" /></td>{Array.from({ length: 16 }).map((_, i) => <td key={i} className="px-2 py-1 text-center align-middle text-gray-300">-</td>)}</tr>}
            </tbody>
          </table>
        </div>

        <ListStatusBar filteredCount={filteredProjects.length} totalCount={projects.length} moduleName={CONFIG.moduleName} version="v3.1" />
      </div>
      <div className="pb-1" />

      {/* 단계 확정 모달 */}
      <StepConfirmModal
        isOpen={stepModal.isOpen}
        cpId={stepModal.cpId}
        currentStep={stepModal.currentStep}
        onConfirm={handleStepConfirm}
        onClose={() => setStepModal({ ...stepModal, isOpen: false })}
      />
      <ConfirmDialogUI />
    </FixedLayout>
  );
}
