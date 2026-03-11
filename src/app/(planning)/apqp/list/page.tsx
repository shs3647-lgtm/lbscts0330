/**
 * @file page.tsx
 * @description APQP 리스트 페이지 - 모듈화 적용
 * @version 3.1.0
 * @updated 2026-01-29 DFMEA, PFD 컬럼 추가
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import APQPTopNav from '@/components/layout/APQPTopNav';
import { FixedLayout } from '@/components/layout';
import { useLocale } from '@/lib/locale';
import { StepBadge, ListActionBar, ListStatusBar, useListSelection } from '@/components/list';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { toast } from '@/hooks/useToast';
import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';

const CONFIG = {
  moduleName: 'APQP',
  modulePrefix: 'apqp',
  themeColor: '#004C6D',
  registerUrl: '/apqp/register',
  apiEndpoint: '/api/apqp',
};

// ★ 컬럼 추가: No, 작성일, APQP ID, APQP명, 고객사, 모델연식, 개발책임, 담당자, PFMEA, DFMEA, PFD, CP, 현황, 시작일, 목표완료일, 상태
const COLUMN_WIDTHS = ['35px', '70px', '80px', '120px', '60px', '55px', '55px', '50px', '70px', '70px', '70px', '70px', '40px', '60px', '60px', '50px'];

interface APQPProject {
  id: string;
  apqpNo: string;
  subject?: string;
  customerName?: string;
  productName?: string;
  companyName?: string;
  modelYear?: string;
  processResponsibility?: string;
  apqpStartDate?: string;
  apqpRevisionDate?: string;
  status?: string;
  apqpResponsibleName?: string;
  leader?: string;
  createdAt: string;
  updatedAt?: string;
  // ★ 연동 ID 필드 - PFMEA, DFMEA, PFD, CP
  linkedFmeaId?: string;   // PFMEA
  linkedDfmeaId?: string;  // DFMEA
  linkedPfdNo?: string;    // PFD
  linkedCpNo?: string;     // CP
  developmentLevel?: string; // ✅ 개발 레벨
}

export default function APQPListPage() {
  const { t } = useLocale();
  const [projects, setProjects] = useState<APQPProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
      let projectList: APQPProject[] = [];
      if (result.success && result.apqps) {
        projectList = result.apqps.map((p: any) => ({
          ...p,
          updatedAt: p.updatedAt || '',
        }));
      }

      // ★★★ ProjectLinkage에서 연동 정보 병합 ★★★
      try {
        const linkageRes = await fetch('/api/project-linkage');
        const linkageData = await linkageRes.json();
        if (linkageData.success && linkageData.data?.length > 0) {
          const linkageMap = new Map<string, { pfmeaId?: string; dfmeaId?: string; pfdNo?: string; cpNo?: string }>();
          for (const link of linkageData.data) {
            if (link.apqpNo) {
              const existing = linkageMap.get(link.apqpNo);
              linkageMap.set(link.apqpNo, {
                pfmeaId: link.pfmeaId || existing?.pfmeaId,
                dfmeaId: link.dfmeaId || existing?.dfmeaId,
                pfdNo: link.pfdNo || existing?.pfdNo,
                cpNo: link.cpNo || existing?.cpNo,
              });
            }
          }
          projectList = projectList.map(p => {
            const linkage = linkageMap.get(p.apqpNo);
            return {
              ...p,
              linkedFmeaId: p.linkedFmeaId || linkage?.pfmeaId,
              linkedDfmeaId: p.linkedDfmeaId || linkage?.dfmeaId,
              linkedPfdNo: p.linkedPfdNo || linkage?.pfdNo,
              linkedCpNo: p.linkedCpNo || linkage?.cpNo,
            };
          });
        }
      } catch (linkErr) {
        // ProjectLinkage 조회 실패 (무시)
      }

      // ★★★ 자동 생성 로직 완전 제거 (2026-01-29) ★★★
      // DB에서 가져온 값만 표시, 없으면 빈 값
      projectList = projectList.map(p => ({
        ...p,
        linkedFmeaId: p.linkedFmeaId || (p as any).linkedFmea || null,
        linkedDfmeaId: p.linkedDfmeaId || (p as any).linkedDfmea || null,
        linkedPfdNo: p.linkedPfdNo || (p as any).linkedPfd || null,
        linkedCpNo: p.linkedCpNo || (p as any).linkedCp || null,
        developmentLevel: p.developmentLevel || (p as any).devLevel || null, // ✅ 매핑
      }));

      setProjects(projectList);
    } catch { setProjects([]); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    const handleSaved = () => loadData();
    window.addEventListener('apqp-saved', handleSaved);
    return () => { window.removeEventListener('apqp-saved', handleSaved); };
  }, [loadData]);

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
      if (!p?.apqpNo) return false;
      const q = searchQuery.toLowerCase();
      return p.apqpNo.toLowerCase().includes(q) ||
        p.subject?.toLowerCase().includes(q) ||
        p.customerName?.toLowerCase().includes(q) ||
        p.productName?.toLowerCase().includes(q) ||
        p.companyName?.toLowerCase().includes(q) ||
        p.modelYear?.toLowerCase().includes(q) ||
        p.processResponsibility?.toLowerCase().includes(q) ||
        p.apqpResponsibleName?.toLowerCase().includes(q) ||
        p.leader?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aVal = (a as any)[sortField] || '';
      const bVal = (b as any)[sortField] || '';
      if (sortField === 'developmentLevel') {
        // 필요시 정렬 로직 커스텀
      }
      const compare = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? compare : -compare;
    });

  const handleDelete = async () => {
    if (selectedRows.size === 0) { toast.warn(t('삭제할 항목을 선택해주세요.')); return; }
    const deleteCount = selectedRows.size;
    const ok = await confirmDialog({ title: t('삭제 확인'), message: `${t('선택한')} ${deleteCount}${t('개 항목을 삭제하시겠습니까?')}\n\n⚠️ ${t('DB에서 영구 삭제됩니다.')}`, variant: 'danger', confirmText: t('삭제'), cancelText: t('취소') });
    if (!ok) return;

    const deletePromises = Array.from(selectedRows).map(async (apqpNo) => {
      try {
        const res = await fetch(`${CONFIG.apiEndpoint}?apqpNo=${apqpNo.toLowerCase()}`, { method: 'DELETE' });
        return { id: apqpNo, success: res.ok };
      } catch (e) {
        console.error(`[삭제] ${apqpNo} 오류:`, e);
        return { id: apqpNo, success: false };
      }
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
    if (selectedRows.size !== 1) { toast.warn(t('수정은 한 번에 하나만 가능합니다.')); return; }
    window.location.href = `${CONFIG.registerUrl}?id=${Array.from(selectedRows)[0]}`;
  };

  const renderEmpty = (id: string) => (
    <a
      href={`${CONFIG.registerUrl}?id=${id}`}
      className="text-orange-400 text-[9px] hover:text-orange-600 hover:underline cursor-pointer"
      onClick={e => e.stopPropagation()}
    >
      {t('미입력')}
    </a>
  );

  return (
    <FixedLayout topNav={<APQPTopNav />} showSidebar={true} bgColor="#f0f0f0" contentPadding="p-0">
      <div className="h-full overflow-y-auto px-3 py-3 font-[Malgun_Gothic]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📋</span>
          <h1 className="text-base font-bold text-gray-800">{CONFIG.moduleName} {t('리스트')}</h1>
          <span className="text-xs text-gray-500 ml-2">{t('총')} {filteredProjects.length}{t('건')}</span>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <ListActionBar searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="🔍 프로젝트명, 고객사로 검색..." onRefresh={loadData} onEdit={handleEdit} editDisabled={selectedRows.size !== 1} onDelete={handleDelete} deleteDisabled={selectedRows.size === 0} deleteCount={selectedRows.size} registerUrl={CONFIG.registerUrl} themeColor={CONFIG.themeColor} />
          </div>
          <DeleteHelpBadge />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .apqp-list-table { border-collapse: separate; border-spacing: 0; }
          .apqp-list-table thead th { border-bottom: 2px solid #9ca3af; border-right: 1px solid rgba(255,255,255,0.3); background: #004C6D; }
          .apqp-list-table thead th:last-child { border-right: none; }
          .apqp-list-table tbody td { border-bottom: 1px solid #9ca3af; border-right: 1px solid #d1d5db; }
          .apqp-list-table tbody td:last-child { border-right: none; }
        `}} />
        <div className="rounded-lg overflow-x-auto border border-gray-400 bg-white">
          <table className="w-full apqp-list-table text-[10px]">
            <thead>
              <tr className="bg-[#004C6D] text-white" style={{ height: '28px' }}>
                <th className="px-1 py-1 text-center align-middle w-8">
                  <input type="checkbox" checked={isAllSelected(filteredProjects.map(p => p.apqpNo))} onChange={() => toggleAllRows(filteredProjects.map(p => p.apqpNo))} className="w-3.5 h-3.5" />
                </th>
                {/* ★ 컬럼 - PFMEA, DFMEA, PFD, CP 포함 */}
                {[
                  { label: 'No', field: '' },
                  { label: t('작성일'), field: 'createdAt' },
                  { label: t('개발레벨'), field: 'developmentLevel' },
                  { label: 'APQP ID', field: 'apqpNo' },
                  { label: t('APQP명'), field: 'subject' },
                  { label: t('고객사'), field: 'customerName' },
                  { label: t('모델연식'), field: 'modelYear' },
                  { label: t('개발책임'), field: 'processResponsibility' },
                  { label: t('담당자'), field: 'apqpResponsibleName' },
                  { label: 'PFMEA', field: 'linkedFmeaId' },
                  { label: 'DFMEA', field: 'linkedDfmeaId' },
                  { label: 'PFD', field: 'linkedPfdNo' },
                  { label: 'CP', field: 'linkedCpNo' },
                  { label: t('현황'), field: '' },
                  { label: t('시작일'), field: 'apqpStartDate' },
                  { label: t('목표완료일'), field: 'apqpRevisionDate' },
                  { label: t('상태'), field: 'status' },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`px-1 py-1 text-center align-middle font-semibold whitespace-nowrap text-[11px] ${col.field ? 'cursor-pointer hover:bg-blue-700' : ''}`}
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
              {isLoading ? (
                <tr><td colSpan={16} className="text-center py-8 text-gray-500"><span className="animate-pulse">🔄 {t('데이터 로딩 중...')}</span></td></tr>
              ) : filteredProjects.map((p, index) => (
                <tr key={p.apqpNo} className={`hover:bg-blue-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-[#dbeafe]' : 'bg-white'} ${selectedRows.has(p.apqpNo) ? 'bg-blue-100' : ''}`} style={{ height: '28px' }} onClick={() => toggleRow(p.apqpNo)}>
                  <td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" checked={selectedRows.has(p.apqpNo)} onChange={() => toggleRow(p.apqpNo)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5" /></td>
                  <td className="px-1 py-0.5 text-center align-middle font-bold text-[#2563eb] whitespace-nowrap text-[9px]">{index + 1}</td>
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px] text-gray-700">{(p.updatedAt || p.createdAt || '').split('T')[0] || '-'}</td>
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px] text-gray-700">{p.developmentLevel || '-'}</td>
                  <td className="px-1 py-0.5 text-center align-middle font-semibold text-blue-600 whitespace-nowrap"><a href={`${CONFIG.registerUrl}?id=${p.apqpNo}`} className="hover:underline text-[9px]">{p.apqpNo}</a></td>
                  <td className="px-1 py-0.5 text-left align-middle whitespace-nowrap overflow-hidden text-ellipsis max-w-[130px]">{p.subject ? <a href={`${CONFIG.registerUrl}?id=${p.apqpNo}`} className="text-blue-600 hover:underline text-[9px] font-semibold" title={p.subject}>{p.subject}</a> : renderEmpty(p.apqpNo)}</td>
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.customerName || renderEmpty(p.apqpNo)}</td>
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.modelYear || renderEmpty(p.apqpNo)}</td>
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.processResponsibility || renderEmpty(p.apqpNo)}</td>
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">{p.apqpResponsibleName || p.leader || renderEmpty(p.apqpNo)}</td>
                  {/* ★ PFMEA */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
                    {p.linkedFmeaId ? (
                      <a href={`/pfmea/register?id=${p.linkedFmeaId.toLowerCase()}`} className="text-yellow-600 hover:underline text-[8px] font-semibold" onClick={e => e.stopPropagation()}>
                        <span className="px-1 py-0 rounded font-bold text-white bg-yellow-500">{p.linkedFmeaId}</span>
                      </a>
                    ) : '-'}
                  </td>
                  {/* ★ DFMEA */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
                    {p.linkedDfmeaId ? (
                      <a href={`/dfmea/register?id=${p.linkedDfmeaId.toLowerCase()}`} className="text-purple-600 hover:underline text-[8px] font-semibold" onClick={e => e.stopPropagation()}>
                        <span className="px-1 py-0 rounded font-bold text-white bg-purple-500">{p.linkedDfmeaId}</span>
                      </a>
                    ) : '-'}
                  </td>
                  {/* ★ PFD */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
                    {p.linkedPfdNo ? (
                      <a href={`/pfd/register?id=${p.linkedPfdNo.toLowerCase()}`} className="text-green-600 hover:underline text-[8px] font-semibold" onClick={e => e.stopPropagation()}>
                        <span className="px-1 py-0 rounded font-bold text-white bg-green-500">{p.linkedPfdNo}</span>
                      </a>
                    ) : '-'}
                  </td>
                  {/* ★ CP */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
                    {p.linkedCpNo ? (
                      <a href={`/control-plan/register?id=${p.linkedCpNo.toLowerCase()}`} className="text-teal-600 hover:underline text-[8px] font-semibold" onClick={e => e.stopPropagation()}>
                        <span className="px-1 py-0 rounded font-bold text-white bg-teal-500">{p.linkedCpNo}</span>
                      </a>
                    ) : '-'}
                  </td>
                  {/* ★ 현황 (완료/진행/지연) - PFMEA 벤치마킹 */}
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
                    {(() => {
                      const step = p.status === 'completed' ? 5 : p.status === 'production' ? 4 : p.status === 'validation' ? 3 : p.status === 'development' ? 2 : 1;
                      if (step >= 4) return <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1 rounded">{t('완료')}</span>;
                      if (step >= 2) return <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1 rounded">{t('진행')}</span>;
                      return <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1 rounded">{t('지연')}</span>;
                    })()}
                  </td>
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">{p.apqpStartDate || renderEmpty(p.apqpNo)}</td>
                  <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">{p.apqpRevisionDate || renderEmpty(p.apqpNo)}</td>
                  <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap"><StepBadge step={p.status === 'planning' ? 1 : p.status === 'development' ? 2 : p.status === 'validation' ? 3 : p.status === 'production' ? 4 : 5} maxSteps={5} /></td>
                </tr>
              ))}
              {!isLoading && filteredProjects.length === 0 && <tr style={{ height: '28px' }} className="bg-[#dbeafe]"><td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" /></td>{Array.from({ length: 15 }).map((_, i) => <td key={i} className="px-2 py-1 text-center align-middle text-gray-300">-</td>)}</tr>}
            </tbody>
          </table>
        </div>

        <ListStatusBar filteredCount={filteredProjects.length} totalCount={projects.length} moduleName={CONFIG.moduleName} version="v3.1" />
      </div>
      <ConfirmDialogUI />
    </FixedLayout>
  );
}

