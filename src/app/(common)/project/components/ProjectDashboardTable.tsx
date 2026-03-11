/**
 * @file ProjectDashboardTableHTML.tsx
 * @description 프로젝트 대시보드 테이블 — HTML table + Tailwind (Handsontable 대체)
 * - 읽기전용 대시보드 테이블
 * - 컬럼 정렬 (클릭 → ASC/DESC)
 * - 4개 커스텀 셀 렌더러 (progress, status, compliance, delayed)
 * - 행 클릭 이벤트 (프로젝트/Gantt 네비게이션)
 * @created 2026-02-20
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ProjectDashboardData,
  DASHBOARD_COLUMNS,
  getProgressColor,
  getStatusColor,
  getComplianceColor,
  getDelayedTasksColor,
  ModuleStatus
} from '@/types/project-dashboard';
import { SAMPLE_PROJECTS } from '@/core/project-dashboard-data';
import { calculateScheduleMetrics } from '@/utils/gantt-data-reader';
import { formatDateDisplay } from '@/utils/date-formatter';

// ─── Props (기존과 동일) ───

interface ProjectDashboardTableProps {
  onProjectClick?: (projectId: string) => void;
  onModuleClick?: (projectId: string, moduleType: 'PFD' | 'FMEA' | 'CP' | 'WS' | 'PM') => void;
  onGanttClick?: (projectId: string) => void;
}

// ─── 정렬 타입 ───

type SortKey = keyof ProjectDashboardData;
type SortDir = 'asc' | 'desc';

// ─── 셀 렌더러 컴포넌트 ───

function ProgressCell({ value }: { value: number | string | null | undefined }) {
  if (value === null || value === undefined) return <span />;
  const progress = typeof value === 'number' ? value : parseInt(String(value), 10);
  const colors = getProgressColor(progress);
  return (
    <span
      className="inline-block w-full text-center font-semibold text-xs rounded px-1"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {progress}%
    </span>
  );
}

function StatusCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span />;
  const colors = getStatusColor(value as ModuleStatus);
  const bg = colors?.bg || '#F3F4F6';
  const text = colors?.text || '#374151';
  return (
    <span
      className="inline-block w-full text-center font-semibold text-xs rounded px-1"
      style={{ backgroundColor: bg, color: text }}
    >
      {value}
    </span>
  );
}

function ComplianceCell({ value }: { value: number | string | null | undefined }) {
  if (value === null || value === undefined) return <span />;
  const compliance = typeof value === 'number' ? value : parseInt(String(value), 10);
  const colors = getComplianceColor(compliance);
  let icon = '';
  if (compliance >= 90) icon = ' ✅';
  else if (compliance >= 70) icon = ' ⚠️';
  else icon = ' ❌';
  return (
    <span
      className="inline-block w-full text-center font-semibold text-xs rounded px-1"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {compliance}%{icon}
    </span>
  );
}

function DelayedCell({ value }: { value: number | string | null | undefined }) {
  if (value === null || value === undefined) return <span />;
  const delayed = typeof value === 'number' ? value : parseInt(String(value), 10);
  const colors = getDelayedTasksColor(delayed);
  return (
    <span
      className="inline-block w-full text-center font-semibold text-xs rounded px-1"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {delayed}
    </span>
  );
}

// ─── 컬럼 폭 퍼센트 변환 ───

const TOTAL_WIDTH = DASHBOARD_COLUMNS.reduce((sum, col) => sum + col.width, 0);
const COL_PERCENTS = DASHBOARD_COLUMNS.map(col => `${((col.width / TOTAL_WIDTH) * 100).toFixed(1)}%`);

// ─── 스타일 상수 ───

const TH_CLASS = 'bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0] border border-[#d1d5db] px-2 py-1.5 text-[11px] font-semibold text-gray-700 text-center whitespace-nowrap cursor-pointer hover:bg-[#e2e8f0] select-none';
const TD_CLASS = 'border border-[#e5e7eb] px-2 py-1 text-xs text-center align-middle';

// ─── 메인 컴포넌트 ───

export default function ProjectDashboardTable({
  onProjectClick,
  onModuleClick,
  onGanttClick,
}: ProjectDashboardTableProps) {
  const [data, setData] = useState<ProjectDashboardData[]>(SAMPLE_PROJECTS);
  const [sortKey, setSortKey] = useState<SortKey>('projectId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    fetchDocuments();
  }, []);

  // ─── 데이터 로드 (기존 로직 그대로) ───

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) return;
      const docs = await response.json();

      if (docs && docs.length > 0) {
        const groupedByOp: Record<string, any> = {};
        docs.forEach((doc: any) => {
          const opId = doc.operationId;
          if (!groupedByOp[opId]) {
            groupedByOp[opId] = {
              id: opId,
              partName: doc.operation?.part?.partName || 'Unknown Part',
              processName: doc.operation?.process?.processName || 'Unknown Process',
              partNo: doc.operation?.part?.partNo || '',
              docs: []
            };
          }
          groupedByOp[opId].docs.push(doc);
        });

        const mappedProjects: ProjectDashboardData[] = Object.values(groupedByOp).map((group: any, index) => {
          const fmeaDoc = group.docs.find((d: any) => d.docType === 'FMEA');
          const cpDoc = group.docs.find((d: any) => d.docType === 'CP');
          const wsDoc = group.docs.find((d: any) => d.docType === 'WS');
          const pmDoc = group.docs.find((d: any) => d.docType === 'PM');
          const pfdDoc = group.docs.find((d: any) => d.docType === 'PFD');

          const getDocStatus = (doc: any) => doc ? (doc.status === 'approved' ? '완료' : (doc.status === 'draft' ? '작성중' : '검토중')) : '-';
          const approvedCount = [fmeaDoc, cpDoc, wsDoc, pmDoc, pfdDoc].filter(d => d?.status === 'approved').length;
          const progress = Math.round((approvedCount / 5) * 100);

          let status: ModuleStatus = 'Open';
          if (progress === 100) status = 'Complete';
          else if (progress > 0) status = 'Progress';

          const projectId = `PRJ-2025-${String(group.id).padStart(3, '0')}`;
          const scheduleMetrics = calculateScheduleMetrics(projectId);

          return {
            id: index + 1,
            projectId,
            createdAt: fmeaDoc?.createdAt ? formatDateDisplay(new Date(fmeaDoc.createdAt)) : '25/01/01',
            projectName: `${group.partName} - ${group.processName}`,
            customer: group.partNo,
            factory: '본사',
            modelYear: '2025',
            program: group.processName,
            startDate: fmeaDoc?.createdAt ? formatDateDisplay(new Date(fmeaDoc.createdAt)) : '25/01/01',
            endDate: '25/12/31',
            duration: 365,
            progress,
            pfdStatus: getDocStatus(pfdDoc) as ModuleStatus,
            fmeaStatus: getDocStatus(fmeaDoc) as ModuleStatus,
            cpStatus: getDocStatus(cpDoc) as ModuleStatus,
            wsStatus: getDocStatus(wsDoc) as ModuleStatus,
            pmStatus: getDocStatus(pmDoc) as ModuleStatus,
            overallStatus: status,
            scheduleCompliance: scheduleMetrics.scheduleCompliance,
            delayedTasks: scheduleMetrics.delayedTasks,
            upcomingMilestones: scheduleMetrics.upcomingMilestones,
          };
        });

        if (mappedProjects.length > 0) setData(mappedProjects);
      }
    } catch {
      // API 없음 — 샘플 데이터 유지
    }
  };

  // ─── 정렬 ───

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return arr;
  }, [data, sortKey, sortDir]);

  // ─── 셀 렌더링 ───

  const renderCell = (col: typeof DASHBOARD_COLUMNS[number], row: ProjectDashboardData) => {
    const value = row[col.data as keyof ProjectDashboardData];
    switch (col.renderer) {
      case 'progress': return <ProgressCell value={value as number} />;
      case 'status': return <StatusCell value={value as string} />;
      case 'compliance': return <ComplianceCell value={value as number} />;
      case 'delayed': return <DelayedCell value={value as number} />;
      default: return <span className="text-xs">{value != null ? String(value) : ''}</span>;
    }
  };

  // ─── 클릭 핸들러 ───

  const handleCellClick = (row: ProjectDashboardData, colData: string) => {
    if (colData === 'projectId' && onProjectClick) {
      onProjectClick(row.projectId);
    } else if ((colData === 'scheduleCompliance' || colData === 'delayedTasks') && onGanttClick) {
      onGanttClick(row.projectId);
    } else if (colData === 'pfdStatus' && onModuleClick) {
      onModuleClick(row.projectId, 'PFD');
    } else if (colData === 'fmeaStatus' && onModuleClick) {
      onModuleClick(row.projectId, 'FMEA');
    } else if (colData === 'cpStatus' && onModuleClick) {
      onModuleClick(row.projectId, 'CP');
    } else if (colData === 'wsStatus' && onModuleClick) {
      onModuleClick(row.projectId, 'WS');
    } else if (colData === 'pmStatus' && onModuleClick) {
      onModuleClick(row.projectId, 'PM');
    }
  };

  const isClickable = (colData: string) =>
    ['projectId', 'scheduleCompliance', 'delayedTasks', 'pfdStatus', 'fmeaStatus', 'cpStatus', 'wsStatus', 'pmStatus'].includes(colData);

  // ─── JSX ───

  return (
    <div
      data-testid="project-dashboard-table"
      style={{
        width: '100%',
        height: 'calc(100vh - 180px)',
        minHeight: '500px',
        background: 'white',
        position: 'relative',
      }}
      className="overflow-auto"
    >
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          {COL_PERCENTS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>

        <thead className="sticky top-0 z-10">
          <tr>
            {DASHBOARD_COLUMNS.map((col, i) => (
              <th
                key={col.data}
                className={TH_CLASS}
                onClick={() => handleSort(col.data as SortKey)}
              >
                {col.header}{sortArrow(col.data as SortKey)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sorted.map((row, rowIdx) => (
            <tr
              key={row.projectId || rowIdx}
              className="h-10 hover:bg-blue-50 transition-colors"
              style={{ background: rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb' }}
            >
              {DASHBOARD_COLUMNS.map((col) => (
                <td
                  key={col.data}
                  className={`${TD_CLASS}${isClickable(col.data) ? ' cursor-pointer hover:underline' : ''}`}
                  onClick={() => handleCellClick(row, col.data)}
                >
                  {renderCell(col, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
