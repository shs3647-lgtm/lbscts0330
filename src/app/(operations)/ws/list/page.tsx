/**
 * @file page.tsx
 * @description WS (작업표준서) 리스트 페이지 - PFD 리스트와 동등 수준
 * @version 2.0.0
 * @updated 2026-02-10
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import WSTopNav from '@/components/layout/WSTopNav';
import { FixedLayout } from '@/components/layout';
import { StepBadge, TypeBadge, extractTypeFromId, ListActionBar, ListStatusBar, useListSelection } from '@/components/list';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { toast } from '@/hooks/useToast';
import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';

const CONFIG = {
  moduleName: 'WS',
  modulePrefix: 'ws',
  themeColor: '#5A6C7D',
  headerBgColor: '#5A6C7D',
  registerUrl: '/ws/register',
  worksheetUrl: '/ws/worksheet',
  apiEndpoint: '/api/ws',
};

const COLUMN_WIDTHS = [
  '35px', '70px', '85px', '35px', '50px', '130px', '60px', '60px',
  '55px', '50px', '75px', '80px', '80px', '40px', '60px', '60px', '35px', '45px',
];

interface WSProject {
  id: string;
  wsNo: string;
  subject?: string;
  customerName?: string;
  processResponsibility?: string;
  wsResponsibleName?: string;
  wsStartDate?: string;
  wsRevisionDate?: string;
  parentFmeaId?: string;
  linkedCpNo?: string;
  linkedCpNos?: string[];
  parentApqpNo?: string;
  step?: number;
  revisionNo?: string;
  confidentialityLevel?: string;
  processName?: string;
  createdAt?: string;
  updatedAt?: string;
}

function formatId(id: string, index: number): string {
  if (id) return id.toLowerCase();
  const year = new Date().getFullYear().toString().slice(-2);
  return `${CONFIG.modulePrefix}${year}-p${(index + 1).toString().padStart(3, '0')}`;
}

export default function WSListPage() {
  const [projects, setProjects] = useState<WSProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { selectedRows, toggleRow, toggleAllRows, clearSelection, isAllSelected } = useListSelection();
  const { confirmDialog, ConfirmDialogUI } = useConfirmDialog();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(CONFIG.apiEndpoint);
      const result = await response.json();
      let projectList: WSProject[] = [];
      if (result.success && result.data) {
        projectList = result.data.map((p: Record<string, unknown>) => ({
          id: (p.wsNo as string) || (p.id as string),
          wsNo: (p.wsNo as string) || (p.id as string),
          subject: p.subject as string,
          customerName: p.customerName as string,
          processResponsibility: (p.processResponsibility as string) || '',
          wsResponsibleName: (p.wsResponsibleName as string) || (p.manager as string) || '',
          wsStartDate: p.wsStartDate as string,
          wsRevisionDate: p.wsRevisionDate as string,
          parentFmeaId: (p.parentFmeaId as string) || '',
          linkedCpNo: (p.linkedCpNo as string) || (p.cpNo as string) || '',
          linkedCpNos: p.linkedCpNos
            ? (typeof p.linkedCpNos === 'string' ? JSON.parse(p.linkedCpNos as string) : p.linkedCpNos as string[])
            : (p.cpNo ? [p.cpNo as string] : []),
          parentApqpNo: (p.parentApqpNo as string) || '',
          step: (p.step as number) || 1,
          revisionNo: (p.revision as string) || '1.0',
          confidentialityLevel: (p.confidentialityLevel as string) || '',
          processName: (p.processName as string) || '',
          createdAt: (p.createdAt as string) || '',
          updatedAt: (p.updatedAt as string) || '',
        }));
      }

      // ProjectLinkage에서 연동 정보 병합
      try {
        const linkageRes = await fetch('/api/project-linkage');
        const linkageData = await linkageRes.json();
        if (linkageData.success && linkageData.data?.length > 0) {
          const linkageMap = new Map<string, { pfmeaId?: string; cpNo?: string; cpNos?: string[]; apqpNo?: string }>();
          for (const link of linkageData.data) {
            if (link.wsNo) {
              const wsNoLower = link.wsNo.toLowerCase();
              const existing = linkageMap.get(wsNoLower);
              const existingCpNos = existing?.cpNos || [];
              const newCpNos = link.cpNo && !existingCpNos.includes(link.cpNo)
                ? [...existingCpNos, link.cpNo] : existingCpNos;
              linkageMap.set(wsNoLower, {
                pfmeaId: link.pfmeaId || existing?.pfmeaId,
                cpNo: link.cpNo || existing?.cpNo,
                cpNos: newCpNos,
                apqpNo: link.apqpNo || existing?.apqpNo,
              });
            }
          }
          projectList = projectList.map(p => {
            const wsNoLower = p.wsNo?.toLowerCase() || '';
            const linkage = linkageMap.get(wsNoLower);
            const mergedCpNos = [
              ...(p.linkedCpNos || []),
              ...(linkage?.cpNos || []),
            ].filter((v, i, a) => a.indexOf(v) === i);
            return {
              ...p,
              parentFmeaId: linkage?.pfmeaId || p.parentFmeaId,
              linkedCpNo: linkage?.cpNo || p.linkedCpNo,
              linkedCpNos: mergedCpNos.length > 0 ? mergedCpNos : p.linkedCpNos,
              parentApqpNo: linkage?.apqpNo || p.parentApqpNo,
            };
          });
        }
      } catch { /* ignore */ }

      setProjects(projectList);
    } catch { setProjects([]); }
    finally { setIsLoading(false); }
  }, []);

  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    loadData().then(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); });
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return projects
      .filter(p =>
        !q ||
        p.wsNo?.toLowerCase().includes(q) ||
        p.subject?.toLowerCase().includes(q) ||
        p.customerName?.toLowerCase().includes(q) ||
        p.processResponsibility?.toLowerCase().includes(q) ||
        p.wsResponsibleName?.toLowerCase().includes(q) ||
        p.processName?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let aVal = '', bVal = '';
        if (sortField === 'createdAt') {
          aVal = a.updatedAt || a.createdAt || '';
          bVal = b.updatedAt || b.createdAt || '';
        } else {
          aVal = (a as unknown as Record<string, unknown>)[sortField] as string || '';
          bVal = (b as unknown as Record<string, unknown>)[sortField] as string || '';
        }
        const compare = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? compare : -compare;
      });
  }, [projects, searchQuery, sortField, sortOrder]);

  const handleDelete = async () => {
    if (selectedRows.size === 0) { toast.warn('삭제할 항목을 선택해주세요.'); return; }
    const deleteCount = selectedRows.size;
    const ok = await confirmDialog({
      title: '삭제 확인',
      message: `선택한 ${deleteCount}개 항목을 삭제하시겠습니까?\n\n⚠️ DB에서 영구 삭제됩니다.`,
      variant: 'danger', confirmText: '삭제', cancelText: '취소',
    });
    if (!ok) return;

    let successCount = 0, failCount = 0;
    const deletePromises = Array.from(selectedRows).map(async (selectedId) => {
      try {
        const project = projects.find(p => p.id === selectedId);
        const wsNo = project?.wsNo || selectedId;
        const res = await fetch(`${CONFIG.apiEndpoint}?wsNo=${wsNo}`, { method: 'DELETE' });
        if (!res.ok) {
          const retry = await fetch(`${CONFIG.apiEndpoint}?wsNo=${wsNo.toLowerCase()}`, { method: 'DELETE' });
          if (!retry.ok) throw new Error('삭제 실패');
        }
        successCount++;
      } catch { failCount++; }
    });
    await Promise.all(deletePromises);
    await loadData();
    clearSelection();
    if (failCount > 0) toast.error(`삭제 완료: ${successCount}개 성공, ${failCount}개 실패`);
    else toast.success(`${successCount}개 항목 삭제 완료`);
  };

  const handleEdit = () => {
    if (selectedRows.size !== 1) { toast.warn('수정은 한 번에 하나만 가능합니다.'); return; }
    const selectedId = Array.from(selectedRows)[0];
    const project = projects.find(p => p.id === selectedId);
    window.location.href = `${CONFIG.registerUrl}?id=${(project?.wsNo || selectedId).toLowerCase()}`;
  };

  const handleOpenRegister = (id: string) => { window.location.href = `${CONFIG.registerUrl}?id=${id}`; };

  const renderEmpty = (id: string) => (
    <span className="text-orange-400 text-[9px] cursor-pointer hover:text-orange-600 hover:underline"
      onClick={(e) => { e.stopPropagation(); handleOpenRegister(id); }}>미입력</span>
  );

  const COLUMNS = [
    { label: 'No', field: '' },
    { label: '작성일', field: 'createdAt' },
    { label: 'WS ID', field: 'wsNo' },
    { label: 'TYPE', field: '' },
    { label: 'WS 종류', field: 'confidentialityLevel' },
    { label: 'WS명', field: 'subject' },
    { label: '고객사', field: 'customerName' },
    { label: '공정명', field: 'processName' },
    { label: '공정책임', field: 'processResponsibility' },
    { label: '담당자', field: 'wsResponsibleName' },
    { label: '상위 APQP', field: 'parentApqpNo' },
    { label: '상위 PFMEA', field: 'parentFmeaId' },
    { label: '연동 CP', field: 'linkedCpNo' },
    { label: '현황', field: '' },
    { label: '시작일', field: 'wsStartDate' },
    { label: '목표완료일', field: 'wsRevisionDate' },
    { label: 'Rev', field: 'revisionNo' },
    { label: '단계', field: 'step' },
  ];

  return (
    <FixedLayout topNav={<WSTopNav />} topNavHeight={48} showSidebar={true} contentPadding="px-3 py-3">
      <div className="font-[Malgun_Gothic]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📋</span>
          <h1 className="text-base font-bold text-gray-800">{CONFIG.moduleName} 리스트</h1>
          {isLoading
            ? <span className="text-xs text-blue-500 ml-2">로딩 중...</span>
            : <span className="text-xs text-gray-500 ml-2">총 {filteredProjects.length}건</span>
          }
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <ListActionBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="WS명, 고객사, 공정명으로 검색..."
              onRefresh={loadData}
              onSave={handleSave}
              saveStatus={saveStatus}
              onEdit={handleEdit}
              editDisabled={selectedRows.size !== 1}
              onDelete={handleDelete}
              deleteDisabled={selectedRows.size === 0}
              deleteCount={selectedRows.size}
              registerUrl={CONFIG.registerUrl}
              themeColor={CONFIG.themeColor}
            />
          </div>
          <DeleteHelpBadge />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .ws-list-table { border-collapse: separate; border-spacing: 0; }
          .ws-list-table thead th { border-bottom: 2px solid #9ca3af; border-right: 1px solid rgba(255,255,255,0.3); background: #5A6C7D; }
          .ws-list-table thead th:last-child { border-right: none; }
          .ws-list-table tbody td { border-bottom: 1px solid #9ca3af; border-right: 1px solid #d1d5db; }
          .ws-list-table tbody td:last-child { border-right: none; }
        `}} />
        <div className="rounded-lg overflow-x-auto border border-gray-400 bg-white">
          <table className="w-full ws-list-table text-[10px]">
            <thead>
              <tr className={`bg-[${CONFIG.headerBgColor}] text-white`} style={{ height: '28px', backgroundColor: CONFIG.headerBgColor }}>
                <th className="px-1 py-1 text-center align-middle w-8">
                  <input type="checkbox"
                    checked={isAllSelected(filteredProjects.map(p => p.id))}
                    onChange={() => toggleAllRows(filteredProjects.map(p => p.id))}
                    className="w-3.5 h-3.5" />
                </th>
                {COLUMNS.map((col, i) => (
                  <th key={i}
                    className={`px-1 py-1 text-center align-middle font-semibold whitespace-nowrap text-[11px] ${col.field ? 'cursor-pointer hover:brightness-125' : ''}`}
                    style={{ width: COLUMN_WIDTHS[i] }}
                    onClick={() => col.field && handleSort(col.field)}>
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
                <tr key={p.id}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'} ${selectedRows.has(p.id) ? 'bg-blue-100' : ''}`}
                  style={{ height: '28px' }}
                  onClick={() => toggleRow(p.id)}>
                  {/* 체크박스 */}
                  <td className="px-1 py-0.5 text-center align-middle">
                    <input type="checkbox" checked={selectedRows.has(p.id)} onChange={() => toggleRow(p.id)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5" />
                  </td>
                  {/* No */}
                  <td className="px-1 py-0.5 text-center align-middle font-bold text-[#5A6C7D] whitespace-nowrap">{index + 1}</td>
                  {/* 작성일 */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px] text-gray-700">
                    {(p.updatedAt || p.createdAt || '').slice(0, 10) || '-'}
                  </td>
                  {/* WS ID */}
                  <td className="px-1 py-0.5 text-center align-middle font-semibold text-blue-700 whitespace-nowrap">
                    <a href={`${CONFIG.registerUrl}?id=${p.wsNo?.toLowerCase()}`} className="hover:underline text-[9px]" onClick={e => e.stopPropagation()}>
                      {formatId(p.wsNo, index)}
                    </a>
                  </td>
                  {/* TYPE */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
                    <TypeBadge typeCode={extractTypeFromId(p.wsNo, CONFIG.modulePrefix)} />
                  </td>
                  {/* WS 종류 */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">
                    {p.confidentialityLevel ? (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${
                        p.confidentialityLevel === 'Prototype' ? 'bg-indigo-400' :
                        p.confidentialityLevel === 'Pre-Launch' ? 'bg-orange-400' :
                        p.confidentialityLevel === 'Production' ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        {p.confidentialityLevel === 'Prototype' ? 'Proto' :
                         p.confidentialityLevel === 'Pre-Launch' ? 'Pre-L' :
                         p.confidentialityLevel === 'Production' ? 'Prod' : p.confidentialityLevel}
                      </span>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  {/* WS명 */}
                  <td className="px-1 py-0.5 text-left align-middle whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                    {p.subject ? (
                      <a href={`${CONFIG.worksheetUrl}?wsNo=${p.wsNo?.toLowerCase()}`}
                        className="text-blue-700 hover:underline text-[9px] font-semibold"
                        onClick={e => e.stopPropagation()} title={p.subject}>{p.subject}</a>
                    ) : renderEmpty(p.id)}
                  </td>
                  {/* 고객사 */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.customerName || renderEmpty(p.id)}</td>
                  {/* 공정명 */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.processName || renderEmpty(p.id)}</td>
                  {/* 공정책임 */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.processResponsibility || renderEmpty(p.id)}</td>
                  {/* 담당자 */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.wsResponsibleName || renderEmpty(p.id)}</td>
                  {/* 상위 APQP */}
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
                  {/* 상위 PFMEA */}
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
                  {/* 연동 CP */}
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
                    ) : renderEmpty(p.id)}
                  </td>
                  {/* 현황 */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
                    {(() => {
                      const step = p.step || 1;
                      if (step >= 7) return <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1 rounded">완료</span>;
                      if (step >= 3) return <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1 rounded">진행</span>;
                      return <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1 rounded">지연</span>;
                    })()}
                  </td>
                  {/* 시작일 */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">{p.wsStartDate || renderEmpty(p.id)}</td>
                  {/* 목표완료일 */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">{p.wsRevisionDate || renderEmpty(p.id)}</td>
                  {/* Rev */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.revisionNo || '1.0'}</td>
                  {/* 단계 */}
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
                    <StepBadge step={p.step} maxSteps={7} />
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr style={{ height: '28px' }} className="bg-slate-50/50">
                  <td className="px-1 py-0.5 text-center align-middle">
                    <input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" />
                  </td>
                  {Array.from({ length: COLUMNS.length }).map((_, i) => (
                    <td key={i} className="px-2 py-1 text-center align-middle text-gray-300">-</td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ListStatusBar filteredCount={filteredProjects.length} totalCount={projects.length} moduleName={CONFIG.moduleName} version="v2.0" />
      </div>
      <ConfirmDialogUI />
    </FixedLayout>
  );
}
