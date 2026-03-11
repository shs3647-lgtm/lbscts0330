/**
 * @file page.tsx
 * @description PFMEA 리스트 페이지 - 모듈화 적용 + @tanstack/react-virtual 가상화
 * @version 3.2.0
 * @updated 2026-03-08 @tanstack/react-virtual 가상화 적용 (대규모 목록 성능 개선)
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 *
 * ⚠️ 이 파일은 L4 코드프리즈 상태입니다. 절대 수정 금지.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import PFMEATopNav from '@/components/layout/PFMEATopNav';
import { FixedLayout } from '@/components/layout';
import {
  StepBadge,
  TypeBadge,
  extractTypeFromId,
  ListActionBar,
  ListStatusBar,
  useListSelection
} from '@/components/list';
import Link from 'next/link';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useDeleteSelectDialog } from '@/hooks/useDeleteSelectDialog';
import { toast } from '@/hooks/useToast';
import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';

// =====================================================
// 설정
// =====================================================
const CONFIG = {
  moduleName: 'PFMEA',
  modulePrefix: 'pfm',
  themeColor: '#00587a',
  registerUrl: '/pfmea/register',
  worksheetUrl: '/pfmea/worksheet',
  apiEndpoint: '/api/fmea/projects?type=P',
};

const ROW_HEIGHT = 28;

// ★★★ HARDCODED - 컬럼폭 반응형 (코드프리즈 L2: 버그수정만 허용) ★★★
// 체크박스: 2.5%, No: 2.5% (동일 고정)
// 16개 컬럼: No, 작성일, Type, ID, Rev, 단계, 공장, FMEA명, 고객, 담당, DFMEA, PFD, CP, 현황, 시작, 목표
const COLUMN_WIDTHS = [
  '2.5%', '6%', '4%', '8%', '3%', '4%', '5%', '14%', '6%', '5%', '6%', '5%', '5%', '4%', '6%', '7%'  // HARDCODED
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
    engineeringLocation?: string; // ✅ 공장 (엔지니어링 위치)
    createdAt?: string;   // ✅ 최초 작성일
    updatedAt?: string;   // ✅ 수정일
  };
  cftMembers?: Array<{ name: string }>;
  parentFmeaId?: string;
  parentApqpNo?: string;   // 향후 APQP 연동용 (현재 컬럼 숨김)
  linkedDfmeaNo?: string;  // ★ DFMEA 연동
  linkedPfdNo?: string;
  linkedCpNo?: string;
  step?: number;
  revisionNo?: string;
  createdAt?: string;  // ✅ 프로젝트 생성일
  updatedAt?: string;  // ✅ 프로젝트 수정일
}

// =====================================================
// 유틸리티
// =====================================================
function formatId(id: string, index: number): string {
  if (id) return id.toLowerCase();
  const year = new Date().getFullYear().toString().slice(-2);
  return `${CONFIG.modulePrefix}${year}-p${(index + 1).toString().padStart(3, '0')}`;
}

// =====================================================
// PFMEAListRow - 가상화된 행 컴포넌트
// =====================================================
interface PFMEAListRowProps {
  project: FMEAProject;
  index: number;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onOpenRegister: (id: string, section?: string) => void;
  config: typeof CONFIG;
  columnWidths: string[];
}

const PFMEAListRow = React.memo(function PFMEAListRow({
  project: p,
  index,
  isSelected,
  onToggle,
  onOpenRegister,
  config,
  columnWidths,
}: PFMEAListRowProps) {
  const renderEmpty = (id: string, section?: string) => (
    <span
      className="text-orange-400 text-[9px] cursor-pointer hover:text-orange-600 hover:underline"
      onClick={(e) => { e.stopPropagation(); onOpenRegister(id, section); }}
    >미입력(Empty)</span>
  );

  return (
    <tr
      className={`hover:bg-blue-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'} ${isSelected ? 'bg-blue-100' : ''}`}
      style={{ height: `${ROW_HEIGHT}px` }}
      onClick={() => onToggle(p.id)}
    >
      <td className="p-0 text-center align-middle" style={{ width: '2.5%' }}>
        <input type="checkbox" checked={isSelected} onChange={() => onToggle(p.id)} onClick={e => e.stopPropagation()} className="w-3 h-3 cursor-pointer" />
      </td>
      <td className="px-1 py-0.5 text-center align-middle font-bold text-[#00587a] whitespace-nowrap">{index + 1}</td>
      {/* ★ 작성일 - 첫번째 */}
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px] text-gray-700">
        {(p.updatedAt || p.fmeaInfo?.updatedAt || p.createdAt || p.fmeaInfo?.createdAt || '')?.slice(0, 10) || '-'}
      </td>
      {/* ★ Type 배지 (P/F/M) */}
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        <TypeBadge typeCode={(p.fmeaType || extractTypeFromId(p.id, config.modulePrefix)) as 'P' | 'F' | 'M'} size="sm" />
      </td>
      <td className="px-[1px] py-0.5 text-center align-middle font-semibold text-blue-600 whitespace-nowrap">
        <Link href={`${config.registerUrl}?id=${p.id}`} prefetch={false} className="hover:underline text-[9px]">{formatId(p.id, index)}</Link>
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[9px]">
        {(p.revisionNo || '00').replace(/^Rev\.?/i, '')}
      </td>
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        <StepBadge step={p.step} maxSteps={7} />
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
      {/* ★ 연동 DFMEA - 간략 표시 (접두사 제거) */}
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap text-[8px]">
        {p.linkedDfmeaNo ? (
          <Link href={`/dfmea/register?id=${p.linkedDfmeaNo}`} prefetch={false} className="text-orange-600 hover:underline font-semibold" onClick={e => e.stopPropagation()}>
            {p.linkedDfmeaNo.replace(/^dfm/i, '')}
          </Link>
        ) : '-'}
      </td>
      {/* ★ 연동 PFD - 간략 표시 (접두사 제거) */}
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
        {p.linkedPfdNo ? (
          <Link href={`/pfd/register?id=${p.linkedPfdNo.toLowerCase()}`} prefetch={false} className="text-violet-600 hover:underline text-[8px] font-semibold" onClick={e => e.stopPropagation()}>
            {p.linkedPfdNo.replace(/^pfd/i, '')}
          </Link>
        ) : '-'}
      </td>
      {/* ★ 연동 CP - 간략 표시 (접두사 제거) */}
      <td className="px-1 py-0.5 text-center align-middle whitespace-nowrap">
        {p.linkedCpNo ? (
          <Link href={`/control-plan/register?id=${p.linkedCpNo.toLowerCase()}`} prefetch={false} className="text-teal-600 hover:underline text-[8px] font-semibold" onClick={e => e.stopPropagation()}>
            {p.linkedCpNo.replace(/^cp/i, '')}
          </Link>
        ) : '-'}
      </td>
      {/* ★ 현황 (완료/진행/지연) - 목표완료일 기준으로 판단 */}
      <td className="px-0.5 py-0.5 text-center align-middle whitespace-nowrap">
        {(() => {
          const step = p.step || 1;
          const targetDate = p.fmeaInfo?.fmeaRevisionDate;
          const today = new Date().toISOString().slice(0, 10);  // 'YYYY-MM-DD'

          // 완료 (step 7 이상)
          if (step >= 7) return <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1 rounded">완료(Done)</span>;

          // 지연 (목표완료일이 오늘보다 이전이면서 미완료)
          if (targetDate && targetDate < today) {
            return <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1 rounded">지연(Delay)</span>;
          }

          // 진행중 (미완료 + 목표완료일 이전)
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
// 메인 컴포넌트
// =====================================================
export default function PFMEAListPage() {
  const [projects, setProjects] = useState<FMEAProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { selectedRows, toggleRow, toggleAllRows, clearSelection, isAllSelected } = useListSelection();
  const { confirmDialog, ConfirmDialogUI } = useConfirmDialog();
  const { deleteSelectDialog, DeleteSelectDialogUI } = useDeleteSelectDialog();

  const scrollRef = useRef<HTMLDivElement>(null);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(CONFIG.apiEndpoint);
      const result = await response.json();

      let projectList: FMEAProject[] = [];
      if (result.success && result.projects?.length > 0) {
        projectList = result.projects
          .filter((p: any) => p.id?.toLowerCase().startsWith(CONFIG.modulePrefix))
          .map((p: any) => ({
            ...p,
            id: p.id.toLowerCase(),
            // ★ fmeaInfo에서 연동 정보를 프로젝트 레벨로 끌어올림
            linkedDfmeaNo: p.linkedDfmeaNo || p.fmeaInfo?.linkedDfmeaNo || '',
            linkedPfdNo: p.linkedPfdNo || p.fmeaInfo?.linkedPfdNo || '',
            linkedCpNo: p.linkedCpNo || p.fmeaInfo?.linkedCpNo || '',
            fmeaInfo: {
              ...p.fmeaInfo,
              engineeringLocation: p.fmeaInfo?.engineeringLocation || p.engineeringLocation || ''
            }
          }));
      }
      // ★ localStorage 폴백 제거 - DB Only

      // ★★★ ProjectLinkage에서 연동 정보 병합 ★★★
      try {
        const linkageRes = await fetch('/api/project-linkage');
        const linkageData = await linkageRes.json();
        if (linkageData.success && linkageData.data?.length > 0) {
          const linkageMap = new Map<string, { dfmeaNo?: string; pfdNo?: string; cpNo?: string; apqpNo?: string }>();
          // PFMEA ID 기준으로 Map 생성
          for (const link of linkageData.data) {
            if (link.pfmeaId) {
              const existing = linkageMap.get(link.pfmeaId);
              linkageMap.set(link.pfmeaId, {
                dfmeaNo: link.dfmeaId || existing?.dfmeaNo,
                pfdNo: link.pfdNo || existing?.pfdNo,
                cpNo: link.cpNo || existing?.cpNo,
                apqpNo: link.apqpNo || existing?.apqpNo,
              });
            }
          }
          // 프로젝트 목록에 연동 정보 병합
          projectList = projectList.map(p => {
            const linkage = linkageMap.get(p.id.toLowerCase());
            return {
              ...p,
              linkedDfmeaNo: linkage?.dfmeaNo || p.linkedDfmeaNo,
              linkedPfdNo: linkage?.pfdNo || p.linkedPfdNo,
              linkedCpNo: linkage?.cpNo || p.linkedCpNo,
              parentApqpNo: linkage?.apqpNo || p.parentApqpNo,
            };
          });
        }
      } catch (linkErr) {
      }

      setProjects(projectList);
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ★ handleSave 제거 - DB Only 방식으로 저장은 등록 페이지에서 직접 API 호출
  const handleSave = useCallback(() => {
    // DB 저장은 등록 페이지에서 처리 - 리스트에서는 실행하지 않음
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('fmea-projects-updated', handleUpdate);
    return () => window.removeEventListener('fmea-projects-updated', handleUpdate);
  }, [loadData]);

  // ★ 정렬 핸들러
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 필터링 및 정렬
  const filteredProjects = projects
    .filter(p => {
      const q = searchQuery.toLowerCase();
      // 현황 파생값
      const step = p.step || 1;
      const targetDate = p.fmeaInfo?.fmeaRevisionDate;
      const today = new Date().toISOString().slice(0, 10);
      const status = step >= 7 ? '완료' : (targetDate && targetDate < today) ? '지연' : '진행';

      return p.id?.toLowerCase().includes(q) ||
        p.project?.projectName?.toLowerCase().includes(q) ||
        p.fmeaInfo?.subject?.toLowerCase().includes(q) ||
        p.project?.customer?.toLowerCase().includes(q) ||
        p.fmeaInfo?.modelYear?.toLowerCase().includes(q) ||
        p.fmeaInfo?.designResponsibility?.toLowerCase().includes(q) ||
        p.fmeaInfo?.fmeaResponsibleName?.toLowerCase().includes(q) ||
        p.project?.leader?.toLowerCase().includes(q) ||
        // ★ 추가 검색 필드
        (p.fmeaInfo?.engineeringLocation || '').toLowerCase().includes(q) ||  // 공장
        String(p.step || '').includes(q) ||                                     // 단계
        status.includes(q) ||                                                    // 현황
        (p.fmeaInfo?.fmeaStartDate || p.project?.startDate || '').includes(q);  // 시작일
    })
    .sort((a, b) => {
      let aVal = '', bVal = '';
      if (sortField === 'fmeaType') {
        aVal = a.fmeaType || extractTypeFromId(a.id, CONFIG.modulePrefix);
        bVal = b.fmeaType || extractTypeFromId(b.id, CONFIG.modulePrefix);
      } else if (sortField === 'createdAt') {
        aVal = (a as any).updatedAt || a.fmeaInfo?.updatedAt || (a as any).createdAt || a.fmeaInfo?.createdAt || '';
        bVal = (b as any).updatedAt || b.fmeaInfo?.updatedAt || (b as any).createdAt || b.fmeaInfo?.createdAt || '';
      } else if (sortField === 'subject') {
        aVal = a.fmeaInfo?.subject || '';
        bVal = b.fmeaInfo?.subject || '';
      } else if (sortField === 'customerName') {
        aVal = a.project?.customer || '';
        bVal = b.project?.customer || '';
      } else if (sortField === 'designResponsibility') {
        aVal = a.fmeaInfo?.designResponsibility || '';
        bVal = b.fmeaInfo?.designResponsibility || '';
      } else if (sortField === 'fmeaResponsibleName') {
        aVal = a.fmeaInfo?.fmeaResponsibleName || '';
        bVal = b.fmeaInfo?.fmeaResponsibleName || '';
      } else if (sortField === 'engineeringLocation') {
        aVal = a.fmeaInfo?.engineeringLocation || '';
        bVal = b.fmeaInfo?.engineeringLocation || '';
      } else if (sortField === 'fmeaStartDate') {
        aVal = a.fmeaInfo?.fmeaStartDate || a.project?.startDate || '';
        bVal = b.fmeaInfo?.fmeaStartDate || b.project?.startDate || '';
      } else if (sortField === 'fmeaRevisionDate') {
        aVal = a.fmeaInfo?.fmeaRevisionDate || '';
        bVal = b.fmeaInfo?.fmeaRevisionDate || '';
      } else if (sortField === 'step') {
        return sortOrder === 'asc'
          ? (a.step || 0) - (b.step || 0)
          : (b.step || 0) - (a.step || 0);
      } else if (sortField === 'status') {
        // 현황: 완료 > 진행 > 지연 순서
        const todayStr = new Date().toISOString().slice(0, 10);
        const getStatus = (p: FMEAProject) => {
          const s = p.step || 1;
          if (s >= 7) return 3; // 완료
          if (p.fmeaInfo?.fmeaRevisionDate && p.fmeaInfo.fmeaRevisionDate < todayStr) return 1; // 지연
          return 2; // 진행
        };
        return sortOrder === 'asc'
          ? getStatus(a) - getStatus(b)
          : getStatus(b) - getStatus(a);
      } else {
        aVal = (a as any)[sortField] || '';
        bVal = (b as any)[sortField] || '';
      }
      const compare = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? compare : -compare;
    });

  // ★ 가상화
  const virtualizer = useVirtualizer({
    count: filteredProjects.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  // 핸들러
  const handleToggleRow = useCallback((id: string) => toggleRow(id), [toggleRow]);

  const handleDelete = async () => {
    if (selectedRows.size === 0) {
      toast.warn('삭제할 항목을 선택해주세요.(Please select items to delete.)');
      return;
    }
    const deleteCount = selectedRows.size;
    const ids = Array.from(selectedRows).map(id => (id as string).toLowerCase());

    // ★★★ 1단계: 승인 상태 + 연관 모듈 확인 ★★★
    let selectedModules: string[] | undefined;
    try {
      const checkRes = await fetch(`/api/fmea/delete-check?ids=${ids.join(',')}`);
      const checkData = await checkRes.json();

      if (checkData.success && checkData.results) {
        // 승인된 FMEA 자체 삭제 차단
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

        // 연관 모듈이 있으면 → 모듈 선택 다이얼로그
        const allLinked = checkData.results.flatMap((r: any) => r.linkedModules || []);
        if (allLinked.length > 0) {
          const result = await deleteSelectDialog({ fmeaIds: ids, linkedModules: allLinked });
          if (!result) return; // 취소
          selectedModules = result.selectedModules;
        } else {
          // 연관 모듈 없으면 단순 확인
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


    // ✅ DB에서 삭제 (각 프로젝트별로 API 호출)
    const deletePromises = ids.map(async (id) => {
      try {
        // 1. 프로젝트 정보 삭제 (선택된 모듈 전달)
        const res1 = await fetch(CONFIG.apiEndpoint, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fmeaId: id, deleteModules: selectedModules })
        });
        const data1 = await res1.json();

        // 2. 워크시트 데이터 삭제
        const res2 = await fetch('/api/fmea', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fmeaId: id })
        });

        return { id, success: res1.ok };
      } catch (e) {
        console.error(`[삭제] ${id} 오류:`, e);
        return { id, success: false };
      }
    });

    const results = await Promise.all(deletePromises);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // ★★★ DB에서 새로 로드 (핵심!) ★★★
    await loadData();
    clearSelection();

    if (failCount > 0) {
      toast.error(`${successCount}개 삭제 완료, ${failCount}개 실패(${successCount} deleted, ${failCount} failed)`);
    } else {
      const moduleInfo = selectedModules ? ` (${selectedModules.join(', ')})` : '';
      toast.success(`${deleteCount}개 항목 삭제 완료(${deleteCount} items deleted)${moduleInfo}`);
    }
  };

  // ★★★ 개정 핸들러 — 복제 API 호출 → 등록화면 이동
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
      window.location.href = `${CONFIG.registerUrl}?id=${result.newFmeaId}&mode=revision`;
    } catch (err) {
      alert('개정 생성 중 네트워크 오류가 발생했습니다.(Network error during revision creation.)\n잠시 후 다시 시도하세요.(Please try again later.)');
    }
  };

  const handleOpenRegister = useCallback((id: string, section?: string) => {
    const url = section ? `${CONFIG.registerUrl}?id=${id}#${section}-section` : `${CONFIG.registerUrl}?id=${id}`;
    window.location.href = url;
  }, []);

  // selectedProjectId는 현재 선택된 행이 하나일 경우 해당 ID를 사용
  const selectedProjectId = selectedRows.size === 1 ? Array.from(selectedRows)[0] : undefined;

  return (
    <FixedLayout
      topNav={<PFMEATopNav selectedFmeaId={selectedProjectId} />}
      topNavHeight={48}
      showSidebar={true}
      contentPadding="p-0"
    >
      <div className="font-[Malgun_Gothic]" style={{ padding: '16px 16px 16px 5px' }}>
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📋</span>
          <h1 className="text-base font-bold text-gray-800">{CONFIG.moduleName} 리스트(List)</h1>
          {isLoading ? (
            <span className="text-xs text-blue-500 ml-2">⏳ 로딩 중...(Loading...)</span>
          ) : (
            <span className="text-xs text-gray-500 ml-2">총(Total) {filteredProjects.length}건(Items)</span>
          )}
        </div>

        {/* 액션 바 + 삭제 도움말 */}
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
              registerUrl={CONFIG.registerUrl}
              themeColor={CONFIG.themeColor}
            />
          </div>
          <DeleteHelpBadge />
        </div>

        {/* 테이블 - 반응형 */}
        {/* ★ sticky thead + border-collapse 간극 방지용 스타일 */}
        <style dangerouslySetInnerHTML={{ __html: `
          .pfmea-list-table { border-collapse: separate; border-spacing: 0; }
          .pfmea-list-table thead th { border-bottom: 2px solid #9ca3af; border-right: 1px solid rgba(255,255,255,0.3); background: #00587a; }
          .pfmea-list-table thead th:last-child { border-right: none; }
          .pfmea-list-table tbody td { border-bottom: 1px solid #9ca3af; border-right: 1px solid #d1d5db; }
          .pfmea-list-table tbody td:last-child { border-right: none; }
        `}} />
        <div ref={scrollRef} className="rounded-lg overflow-y-auto border border-gray-400 bg-white" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <table className="pfmea-list-table w-full text-[8px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#00587a] text-white" style={{ height: '28px' }}>
                <th className="p-0 text-center align-middle" style={{ width: '2.5%' }}>
                  <input type="checkbox" checked={isAllSelected(filteredProjects.map(p => p.id))} onChange={() => toggleAllRows(filteredProjects.map(p => p.id))} className="w-3 h-3 cursor-pointer" />
                </th>
                {/* ★ PFMEA 표준 컬럼 - 정렬 가능 (16개) */}
                {[
                  { label: 'No', field: '', title: 'Number' },
                  { label: '작성일(Created)', field: 'createdAt', title: 'Created/Modified Date' },
                  { label: 'Type', field: 'fmeaType', title: 'FMEA Type (M/F/P)' },
                  { label: 'ID', field: 'id', title: 'FMEA Identifier' },
                  { label: 'Rev', field: 'revisionNo', title: 'Revision Number' },
                  { label: '단계(Step)', field: 'step', title: 'Current Step (1-7)' },
                  { label: '공장(Plant)', field: 'engineeringLocation', title: 'Engineering Location / Plant' },
                  { label: 'FMEA명(Name)', field: 'subject', title: 'FMEA Name / Subject' },
                  { label: '고객사(Customer)', field: 'customerName', title: 'Customer Name' },
                  { label: '담당자(Resp.)', field: 'fmeaResponsibleName', title: 'FMEA Responsible Person' },
                  { label: 'DFMEA', field: 'linkedDfmeaNo', title: 'Linked Design FMEA' },
                  { label: 'PFD', field: 'linkedPfdNo', title: 'Linked Process Flow Diagram' },
                  { label: 'CP', field: 'linkedCpNo', title: 'Linked Control Plan' },
                  { label: '현황(Status)', field: 'status', title: 'Status (Progress/Delay/Complete)' },
                  { label: '시작일(Start)', field: 'fmeaStartDate', title: 'FMEA Start Date' },
                  { label: '목표완료일(Target)', field: 'fmeaRevisionDate', title: 'Target Completion Date' },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`px-0.5 py-0.5 text-center align-middle font-semibold whitespace-nowrap text-[11px] ${col.field ? 'cursor-pointer hover:bg-teal-700' : ''}`}
                    style={{ width: COLUMN_WIDTHS[i] }}
                    onClick={() => col.field && handleSort(col.field)}
                    title={col.title}
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
                <tr><td colSpan={17} style={{ height: paddingTop, padding: 0, border: 'none' }} /></tr>
              )}
              {virtualRows.map(vRow => {
                const p = filteredProjects[vRow.index];
                return (
                  <PFMEAListRow
                    key={p.id}
                    project={p}
                    index={vRow.index}
                    isSelected={selectedRows.has(p.id)}
                    onToggle={handleToggleRow}
                    onOpenRegister={handleOpenRegister}
                    config={CONFIG}
                    columnWidths={COLUMN_WIDTHS}
                  />
                );
              })}
              {totalSize > 0 && (
                <tr><td colSpan={17} style={{ height: paddingBottom, padding: 0, border: 'none' }} /></tr>
              )}
              {filteredProjects.length === 0 && (
                <tr style={{ height: '28px' }} className="bg-[#e3f2fd]">
                  <td className="px-1 py-0.5 text-center align-middle"><input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" /></td>
                  {Array.from({ length: 16 }).map((_, i) => <td key={i} className="px-2 py-1 text-center align-middle text-gray-300">-</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 상태바 */}
        <ListStatusBar filteredCount={filteredProjects.length} totalCount={projects.length} moduleName={CONFIG.moduleName} version="v3.0" />
      </div>

      <ConfirmDialogUI />
      <DeleteSelectDialogUI />
    </FixedLayout>
  );
}
