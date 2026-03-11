'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
// import { FileVersionManager } from '@/packages/utils/file-version-manager';
// 🚧 임시: 간단한 더미 함수 사용
const FileVersionManager = {
  getNextFilename: (prefix: string, ext: string) => `${prefix}_${Date.now()}.${ext}`
};
import {
  DAY_WIDTH,
  ROW_HEIGHT,
  parseDate,
  getDuration,
  formatDateToInput,
  formatDateCompact,
  calculateRollupDates
} from '../utils/ganttDateUtils';
import { generateAPQPData } from '../data/apqpData';
import { SettingsPanel } from './GanttSettingsPanel';
import { exportToExcel, importFromExcel } from '../utils/ganttExcelUtils';

const initialData = generateAPQPData();

// 🎨 APQP 테마 마일스톤 색상 (2가지 색상만 사용 - 단순화)
const MILESTONE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'PROTO': {
    bg: '#c5cae9',      // PILOT2 색상 (Indigo-100)
    border: '#9fa8da',
    text: '#000000'      // 검은색
  },
  'PILOT1': {
    bg: '#9fa8da',      // PPAP 색상 (Indigo-200)
    border: '#7986cb',
    text: '#000000'
  },
  'PILOT2': {
    bg: '#c5cae9',      // PILOT2 색상 (Indigo-100)
    border: '#9fa8da',
    text: '#000000'
  },
  'PPAP': {
    bg: '#9fa8da',      // PPAP 색상 (Indigo-200)
    border: '#7986cb',
    text: '#000000'
  },
  'SOP': {
    bg: '#c5cae9',      // PILOT2 색상 (Indigo-100)
    border: '#9fa8da',
    text: '#000000'
  },
};

// 마일스톤 이름에서 색상 키 추출
const getMilestoneColorKey = (taskName: string): string => {
  if (taskName === 'PROTO') return 'PROTO';
  if (taskName === 'PILOT1') return 'PILOT1';
  if (taskName === 'PILOT2') return 'PILOT2';
  if (taskName.includes('PPAP')) return 'PPAP';
  if (taskName.includes('SOP') || taskName.includes('양산')) return 'SOP';
  return 'PILOT1'; // 기본값
};

export interface GanttChartRef {
  exportExcel: () => void;
  importExcel: () => void;
  saveData: () => void;
  loadData: () => void;
  toggleSettings: () => void;
}

interface GanttChartViewProps {
  visible?: boolean;
  projectId?: string;
  isPreview?: boolean;
}

const GanttChartView = forwardRef<GanttChartRef, GanttChartViewProps>(({ visible = true, projectId, isPreview = false }, ref) => {
  const [data, setData] = useState(calculateRollupDates(initialData));
  // 🔥 모든 단계 펼침 상태로 설정 (드래그 테스트용)
  // 🔥 1~4단계 접기, 5단계 펼치기가 디폴트
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    '1': true,   // 1단계 접기
    '2': true,   // 2단계 접기
    '3': true,   // 3단계 접기
    '4': true,   // 4단계 접기
    '5': false,  // 5단계 펼침
  });
  // 🔥 기본 숨김 컬럼: WBS, 기간, 진척율, Team, Name, St만 표시
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, boolean>>({
    id: true,         // No 숨김
    path: true,       // ★ 숨김
    planStart: true,  // P.Start 숨김
    planFinish: true, // P.Finish 숨김
    actStart: true,   // A.Start 숨김
    actFinish: true,  // A.Finish 숨김
  });
  // 🔥 편집 모드: 'plan' = Plan 그래프 드래그, 'actual' = Actual 그래프 드래그, null = 선택 해제
  const [editMode, setEditMode] = useState<'plan' | 'actual' | null>(null);
  // 🔥 타임라인 뷰 모드: 'month' = 월 단위, 'week' = 주 단위, 'day' = 일 단위
  const [timeView, setTimeView] = useState<'month' | 'week' | 'day'>('month');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dragging, setDragging] = useState<{ taskId: string, type: 'start' | 'finish' | 'actFinish' } | null>(null);
  // 🔥 진척율 드래그 상태
  const [progressDragging, setProgressDragging] = useState<{ taskId: string, barElement: HTMLElement | null } | null>(null);
  // 🔥 미리보기 모드에서도 동일한 사이드바 너비 사용
  const [sidebarWidth, setSidebarWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    taskName: 250, // Default width for Task
  });

  const detailRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // 🔥 미리보기 모드에서도 동일한 줌 스케일 사용
  const zoomScale = 0.8;

  // 🔥 타임라인 뷰 모드별 DAY_WIDTH 계산
  const dynamicDayWidth = useMemo(() => {
    switch (timeView) {
      case 'day': return DAY_WIDTH * 22;  // 일 단위: 22배 (30일 = 1개월)
      case 'week': return DAY_WIDTH * 4;  // 주 단위: 4배 (26주 = 6개월)
      default: return DAY_WIDTH * 2;      // 월 단위: 2배 (12개월 = 1년)
    }
  }, [timeView]);

  // 1. 시간 축 계산
  const { minDate, totalDays, allYearsMonths } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    data.forEach((task: any) => {
      const planStart = parseDate(task.planStart);
      const planFinish = parseDate(task.planFinish);
      const actStart = parseDate(task.actStart);
      const actFinish = parseDate(task.actFinish);

      if (planStart) min = Math.min(min, planStart.getTime());
      if (planFinish) max = Math.max(max, planFinish.getTime());
      if (actStart) min = Math.min(min, actStart.getTime());
      if (actFinish) max = Math.max(max, actFinish.getTime());
    });

    if (min === Infinity || max === -Infinity) {
      min = new Date().getTime();
      max = new Date().getTime();
    }

    // 🔥 데이터 시작 월의 1일부터 시작 (빈 공간 제거)
    const startDate = new Date(min);
    startDate.setDate(1);

    // 🔥 종료일은 프로젝트 종료일 + 2개월 (1개월 여유 + 월말 보정)
    const endDate = new Date(max);
    endDate.setMonth(endDate.getMonth() + 2); // 종료일 + 2개월
    endDate.setDate(0); // 이전 달의 마지막 날 = 종료일 + 1개월의 마지막 날

    const yearsMonths = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      yearsMonths.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
        daysInMonth: new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate(),
        monthStart: new Date(current.getFullYear(), current.getMonth(), 1),
      });
      current.setMonth(current.getMonth() + 1);
    }

    const calculatedMaxDate = new Date(yearsMonths[yearsMonths.length - 1].monthStart);
    calculatedMaxDate.setMonth(calculatedMaxDate.getMonth() + 1);
    calculatedMaxDate.setDate(0);

    const finalTotalDays = getDuration(startDate, calculatedMaxDate);

    return { minDate: startDate, maxDate: calculatedMaxDate, totalDays: finalTotalDays, allYearsMonths: yearsMonths };
  }, [data]);

  // 2. 이벤트 핸들러
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (event.currentTarget === detailRef.current && chartRef.current) {
      chartRef.current.scrollTop = event.currentTarget.scrollTop;
    } else if (event.currentTarget === chartRef.current && detailRef.current) {
      detailRef.current.scrollTop = event.currentTarget.scrollTop;
    }
  };

  const toggleCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const updateTask = useCallback((id: string, field: string, value: string) => {
    setData((prevData: any[]) => {
      const updatedData = prevData.map((task: any) => {
        if (task.id === id) {
          let newPlanStart = task.planStart;
          let newPlanFinish = task.planFinish;

          if (field === 'planStart') newPlanStart = value;
          if (field === 'planFinish') newPlanFinish = value;

          const start = parseDate(newPlanStart);
          const finish = parseDate(newPlanFinish);

          if (start && finish && start > finish) {
            if (field === 'planStart') newPlanFinish = newPlanStart;
            else if (field === 'planFinish') newPlanStart = newPlanFinish;
          }

          return {
            ...task,
            planStart: newPlanStart,
            planFinish: newPlanFinish,
            ...(field !== 'planStart' && field !== 'planFinish' && { [field]: value }),
          };
        }
        return task;
      });

      // Rollup Calculation after update
      return calculateRollupDates(updatedData);
    });
  }, []);

  // 3. 드래그 조작 (Plan: start/finish, Actual: actFinish)
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, taskId: string, type: 'start' | 'finish' | 'actFinish') => {
    e.preventDefault();
    e.stopPropagation();

    const task = data.find((t: any) => t.id === taskId);
    if (!task) {
      return;
    }

    // Root(0)와 Phase(1~5) 레벨은 드래그 불가 (자식이 있는 경우)
    const hasChildren = data.some((t: any) => t.parentId === taskId);
    if (hasChildren) {
      return;
    }

    setDragging({ taskId, type });
  };

  const handleDragging = useCallback((e: MouseEvent) => {
    if (!dragging || !chartRef.current) return;

    const chartRect = chartRef.current.getBoundingClientRect();
    const scrollLeft = chartRef.current.scrollLeft;
    const clientX = e.clientX;

    const positionX = clientX - chartRect.left + scrollLeft;
    const offsetDays = Math.round(positionX / (dynamicDayWidth * zoomScale));

    const newDate = new Date(minDate);
    newDate.setDate(minDate.getDate() + offsetDays);
    const newDateStr = formatDateToInput(newDate);

    const task = data.find((t: any) => t.id === dragging.taskId);
    if (!task) return;

    // 🔥 최소 기간: 7일 (Start와 Finish 사이 최소 거리)
    const MIN_DURATION_DAYS = 7;

    // 날짜에 일수 추가하는 헬퍼 함수
    const addDays = (dateStr: string, days: number): string => {
      const date = new Date(dateStr);
      date.setDate(date.getDate() + days);
      return formatDateToInput(date);
    };

    // 🔥 Actual Finish 드래그 처리
    if (dragging.type === 'actFinish') {
      let newActFinish = newDateStr;
      const actStart = parseDate(task.actStart);
      const actFinish = parseDate(newActFinish);

      // actFinish는 actStart + 최소 기간 이후여야 함
      if (actStart && actFinish) {
        const minFinish = new Date(actStart);
        minFinish.setDate(minFinish.getDate() + MIN_DURATION_DAYS);
        if (actFinish < minFinish) {
          newActFinish = formatDateToInput(minFinish);
        }
      }

      setData((prevData: any[]) => {
        const updated = prevData.map((t: any) => t.id === dragging.taskId ? { ...t, actFinish: newActFinish } : t);
        return calculateRollupDates(updated);
      });
      return;
    }

    // Plan 날짜 드래그 처리
    let newStart = task.planStart;
    let newFinish = task.planFinish;

    if (dragging.type === 'start') newStart = newDateStr;
    else if (dragging.type === 'finish') newFinish = newDateStr;

    const start = parseDate(newStart);
    const finish = parseDate(newFinish);

    // 🔥 최소 기간 확보: Start와 Finish 사이 최소 7일
    if (start && finish) {
      const minFinishDate = new Date(start);
      minFinishDate.setDate(minFinishDate.getDate() + MIN_DURATION_DAYS);

      const maxStartDate = new Date(finish);
      maxStartDate.setDate(maxStartDate.getDate() - MIN_DURATION_DAYS);

      if (dragging.type === 'start' && start > maxStartDate) {
        newStart = formatDateToInput(maxStartDate);
      } else if (dragging.type === 'finish' && finish < minFinishDate) {
        newFinish = formatDateToInput(minFinishDate);
      }
    }

    setData((prevData: any[]) => {
      const updated = prevData.map((t: any) => t.id === dragging.taskId ? { ...t, planStart: newStart, planFinish: newFinish } : t);
      return calculateRollupDates(updated);
    });
  }, [dragging, data, minDate, zoomScale]);

  const handleDragEnd = useCallback(() => setDragging(null), []);

  // 🔥 진척율 드래그 핸들러
  const handleProgressDrag = useCallback((e: MouseEvent) => {
    if (!progressDragging || !progressDragging.barElement) return;

    const rect = progressDragging.barElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newProgress = Math.round((clickX / width) * 100);
    const clampedProgress = Math.min(100, Math.max(0, newProgress));

    setData((prevData: any[]) => {
      return prevData.map((task: any) =>
        task.id === progressDragging.taskId
          ? { ...task, progress: clampedProgress }
          : task
      );
    });
  }, [progressDragging]);

  const handleProgressDragEnd = useCallback(() => {
    setProgressDragging(null);
  }, []);

  useEffect(() => {
    if (progressDragging) {
      window.addEventListener('mousemove', handleProgressDrag);
      window.addEventListener('mouseup', handleProgressDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleProgressDrag);
        window.removeEventListener('mouseup', handleProgressDragEnd);
      };
    }
  }, [progressDragging, handleProgressDrag, handleProgressDragEnd]);

  // 4. Resizer (Sidebar & Columns)
  const startResizing = useCallback(() => setIsResizing(true), []);

  const startColumnResizing = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    setResizingColumn(null);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = (e.pageX - (detailRef.current?.getBoundingClientRect().left || 0)) / zoomScale;
      if (newWidth > 100 && newWidth < 1000) setSidebarWidth(newWidth);
    } else if (resizingColumn) {
      setColumnWidths(prev => {
        const currentWidth = prev[resizingColumn] || 250;
        const delta = e.movementX / zoomScale;
        return {
          ...prev,
          [resizingColumn]: Math.max(50, currentWidth + delta)
        };
      });
    }
  }, [isResizing, resizingColumn, zoomScale]);

  useEffect(() => {
    if (isResizing || resizingColumn) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resizingColumn, resize, stopResizing]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleDragging);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragging);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [dragging, handleDragging, handleDragEnd]);

  // 5. 필터링
  const visibleTasks = useMemo(() => {
    const tasks: any[] = [];
    data.forEach((task: any) => {
      let isHidden = false;
      let currentParentId = task.parentId;
      while (currentParentId) {
        if (collapsedGroups[currentParentId]) {
          isHidden = true;
          break;
        }
        const parentTask = data.find((t: any) => t.id === currentParentId);
        currentParentId = parentTask ? parentTask.parentId : null;
      }
      if (!isHidden) tasks.push(task);
    });
    return tasks;
  }, [data, collapsedGroups]);

  // 6. Bar 스타일
  const getBarProps = (task: typeof data[0], isActual = false) => {
    const startProp = isActual ? 'actStart' : 'planStart';
    const finishProp = isActual ? 'actFinish' : 'planFinish';
    // @ts-ignore
    const startDate = parseDate(task[startProp]);
    // @ts-ignore
    const finishDate = parseDate(task[finishProp]);

    if (!startDate || !finishDate || startDate > finishDate) return { width: 0, left: 0, color: 'transparent' };

    const offsetDays = getDuration(minDate, startDate) - 1;
    const widthDays = getDuration(startDate, finishDate);
    const left = offsetDays * dynamicDayWidth * zoomScale;
    const width = widthDays * dynamicDayWidth * zoomScale;

    return { width: `${width}px`, left: `${left}px` };
  };

  // 7. 컬럼 정의 - 반응형 폰트 크기 개선 (11px → 13px~14px)
  const columns = useMemo(() => [
    { key: 'id', name: 'No', width: 'w-12', widthPx: 55, fixed: true, align: 'text-center font-bold text-[13px]' },
    { key: 'taskName', name: 'WBS', width: 'w-64', widthPx: columnWidths['taskName'] || 220, fixed: true, align: 'text-left font-semibold pl-2 text-[13px]', resizable: true },
    // 🔥 중요 컬럼: 클릭하면 적색 동그라미 토글
    { key: 'path', name: '★', width: 'w-8', widthPx: 32, fixed: true, align: 'text-center p-0' },
    { key: 'duration', name: '기간', width: 'w-12', widthPx: 45, align: 'text-center text-[12px]' },
    // 🔥 날짜 컬럼: 폭 증가, 글씨 12px로 개선
    { key: 'planStart', name: 'P.Start', width: 'w-18', widthPx: 70, align: 'text-center text-[12px] px-1', type: 'date' },
    { key: 'planFinish', name: 'P.Finish', width: 'w-18', widthPx: 70, align: 'text-center text-[12px] px-1', type: 'date' },
    { key: 'actStart', name: 'A.Start', width: 'w-18', widthPx: 70, align: 'text-center text-[12px] px-1', type: 'date' },
    { key: 'actFinish', name: 'A.Finish', width: 'w-18', widthPx: 70, align: 'text-center text-[12px] px-1', type: 'date' },
    // 🔥 진척율(%) 컬럼 추가
    { key: 'progress', name: '%', width: 'w-14', widthPx: 55, align: 'text-center text-[11px] font-bold' },
    { key: 'department', name: 'Team', width: 'w-16', widthPx: 60, align: 'text-center text-[11px]' },
    { key: 'owner', name: 'Name', width: 'w-18', widthPx: 70, align: 'text-center text-[12px]' },
    { key: 'state', name: 'St', width: 'w-10', widthPx: 38, align: 'text-center text-[12px] font-semibold' },
  ], [columnWidths]);

  useEffect(() => {
    let initialWidth = 0;
    columns.forEach(col => {
      if (!hiddenColumns[col.key]) initialWidth += (col as any).widthPx;
    });
    setSidebarWidth(initialWidth);
  }, [hiddenColumns, columns]);

  const toggleColumn = (columnKey: string) => {
    setHiddenColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  // 🔥 전체 컬럼 보기/숨기기 토글
  const [allColumnsHidden, setAllColumnsHidden] = useState(false);
  const toggleAllColumns = () => {
    const newState = !allColumnsHidden;
    setAllColumnsHidden(newState);
    const newHidden: Record<string, boolean> = {};
    // id, taskName, path는 항상 표시
    columns.forEach(col => {
      if (!['id', 'taskName', 'path'].includes(col.key)) {
        newHidden[col.key] = newState;
      }
    });
    setHiddenColumns(newHidden);
  };

  // 8. Import/Export/Save/Load
  const handleSaveData = () => {
    const filename = FileVersionManager.getNextFilename('Project_Gantt', 'json');
    const json = JSON.stringify({ tasks: data }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          setData(calculateRollupDates(parsed.tasks));
          alert(`성공적으로 ${parsed.tasks.length}개의 작업을 불러왔습니다.`);
        } else {
          alert('올바르지 않은 프로젝트 파일 형식입니다.');
        }
      } catch {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const newData = await importFromExcel(file);
      if (newData.length > 0) {
        setData(calculateRollupDates(newData));
        alert(`성공적으로 ${newData.length}개의 작업을 불러왔습니다.`);
      } else {
        alert('데이터를 불러오지 못했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('엑셀 파일 처리 중 오류가 발생했습니다.');
    }
    event.target.value = '';
  };

  useImperativeHandle(ref, () => ({
    exportExcel: () => exportToExcel(data),
    importExcel: () => fileInputRef.current?.click(),
    saveData: handleSaveData,
    loadData: () => jsonInputRef.current?.click(),
    toggleSettings: () => setIsSettingsOpen(prev => !prev),
  }));

  if (!visible) return null;

  const quickToggleColumns = [
    { key: 'path', label: '★' },
    { key: 'duration', label: '기간' },
    { key: 'planStart', label: 'P.St' },
    { key: 'planFinish', label: 'P.Fn' },
    { key: 'actStart', label: 'A.St' },
    { key: 'actFinish', label: 'A.Fn' },
    { key: 'department', label: 'Team' },
    { key: 'owner', label: 'Name' },
    { key: 'state', label: 'St' },
  ];

  return (
    <div className="bg-white h-full font-sans flex flex-col relative" style={{ fontSize: '12px' }}>
      <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" ref={fileInputRef} />
      <input type="file" accept=".json" onChange={handleLoadData} className="hidden" ref={jsonInputRef} />

      {/* 🔥 설정 패널 삭제 - 컬럼 보기와 중복 */}

      <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border-b border-gray-200 flex-shrink-0 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold text-gray-600 mr-1 whitespace-nowrap">컬럼:</span>
        {/* 🔥 All 버튼 - 전체 보기/숨기기 토글 */}
        <button onClick={toggleAllColumns}
          className={`px-2 py-1 text-[11px] rounded border transition-colors whitespace-nowrap font-bold ${!allColumnsHidden ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'}`}>
          {allColumnsHidden ? '🔳' : '✅'}
        </button>
        {quickToggleColumns.map(col => (
          <button key={col.key} onClick={() => toggleColumn(col.key)}
            className={`px-2 py-1 text-[11px] rounded border transition-colors whitespace-nowrap font-semibold ${!hiddenColumns[col.key] ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}>
            {col.label}
          </button>
        ))}

        {/* 🔥 뷰 모드 구분선 */}
        <div className="w-px h-4 bg-gray-300 mx-2"></div>

        {/* 🔥 타임라인 뷰 토글 (월/주/일) */}
        <span className="text-[10px] font-bold text-gray-600 mr-1 whitespace-nowrap">보기:</span>
        <button onClick={() => setTimeView('month')}
          className={`px-2 py-1 text-[11px] rounded border transition-colors whitespace-nowrap font-semibold ${timeView === 'month' ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          월
        </button>
        <button onClick={() => setTimeView('week')}
          className={`px-2 py-1 text-[11px] rounded border transition-colors whitespace-nowrap font-semibold ${timeView === 'week' ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          주
        </button>
        <button onClick={() => setTimeView('day')}
          className={`px-2 py-1 text-[11px] rounded border transition-colors whitespace-nowrap font-semibold ${timeView === 'day' ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          일
        </button>

        {/* 🔥 엑셀 구분선 */}
        <div className="w-px h-4 bg-gray-300 mx-2"></div>

        {/* 🔥 엑셀 내보내기/임포트 버튼 */}
        <button onClick={() => exportToExcel(data)}
          className="px-2 py-1 text-[11px] rounded border bg-green-100 text-green-700 border-green-300 hover:bg-green-200 transition-colors whitespace-nowrap font-semibold flex items-center gap-1">
          📥 Export
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 text-[11px] rounded border bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 transition-colors whitespace-nowrap font-semibold flex items-center gap-1">
          📤 Import
        </button>
      </div>

      <div className="flex border-t border-gray-300 overflow-hidden bg-white flex-1 h-full">
        {/* Left Panel: Table */}
        <div className="flex-shrink-0 bg-white z-20 shadow-[2px_0_10px_rgba(0,0,0,0.1)] flex flex-col" style={{ width: `${sidebarWidth * zoomScale}px` }}>
          {/* 🔥 테이블 헤더: 높이 64px (연도+월 헤더와 동일), 글씨 15px로 개선 */}
          <div className="flex bg-[#005a8d] text-white font-bold border-b border-gray-400 flex-shrink-0" style={{ height: `${64 * zoomScale}px`, fontSize: '15px' }}>
            {columns.filter(col => !hiddenColumns[col.key]).map(col => (
              <div key={col.key}
                className={`truncate ${col.align || 'text-left'} flex items-center justify-center h-full border-r border-gray-400/50 last:border-r-0 flex-shrink-0 relative group
                  ${col.key === 'planFinish' && editMode === 'plan' ? 'bg-blue-600 ring-2 ring-blue-300' : ''}
                  ${col.key === 'actFinish' && editMode === 'actual' ? 'bg-orange-500 ring-2 ring-orange-300' : ''}
                  ${(col.key === 'planFinish' || col.key === 'actFinish') ? 'cursor-pointer hover:bg-blue-400 transition-colors' : ''}`}
                style={{ width: `${(col as any).widthPx * zoomScale}px`, backgroundColor: col.key === 'id' ? '#004d7a' : undefined }}
                onClick={() => {
                  // 🔥 토글 기능: 다시 클릭하면 해제
                  if (col.key === 'planFinish') setEditMode(prev => prev === 'plan' ? null : 'plan');
                  if (col.key === 'actFinish') setEditMode(prev => prev === 'actual' ? null : 'actual');
                }}
                title={col.key === 'planFinish' ? '클릭하여 Plan 그래프 편집 모드' : col.key === 'actFinish' ? '클릭하여 Actual 그래프 편집 모드' : ''}>
                {col.key === 'planFinish' ? (
                  <span className={`flex flex-col items-center justify-center leading-tight ${editMode === 'plan' ? 'font-extrabold' : ''}`}>
                    {editMode === 'plan' && <span className="text-[10px]">✏️</span>}
                    <span>Plan</span>
                    <span>Finish</span>
                  </span>
                ) : col.key === 'actFinish' ? (
                  <span className={`flex flex-col items-center justify-center leading-tight ${editMode === 'actual' ? 'font-extrabold' : ''}`}>
                    {editMode === 'actual' && <span className="text-[10px]">✏️</span>}
                    <span>Actual</span>
                    <span>Finish</span>
                  </span>
                ) : col.key === 'planStart' ? (
                  <span className="flex flex-col items-center justify-center leading-tight">
                    <span>Plan</span>
                    <span>Start</span>
                  </span>
                ) : col.key === 'actStart' ? (
                  <span className="flex flex-col items-center justify-center leading-tight">
                    <span>Actual</span>
                    <span>Start</span>
                  </span>
                ) : col.key === 'progress' ? (
                  <span className="flex flex-col items-center justify-center leading-tight">
                    <span>진척</span>
                    <span>(%)</span>
                  </span>
                ) : col.name}
                {/* Column Resizer Handle */}
                {(col as any).resizable && (
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10"
                    onMouseDown={(e) => startColumnResizing(e, col.key)}
                  ></div>
                )}
              </div>
            ))}
          </div>
          <div ref={detailRef} onScroll={handleScroll} className="overflow-y-auto overflow-x-hidden flex-1 no-scrollbar bg-white">
            {visibleTasks.map((task: any, index: number) => {
              const hasChildren = data.some((t: any) => t.parentId === task.id);

              // Stickiness Logic
              const isRoot = task.id === '0';
              const isPhase = task.level === 0 && !isRoot;

              // 🔥 마일스톤 여부 확인 (PROTO, PILOT1, PILOT2, PPAP, SOP)
              const isMilestoneRow = task.type === 'milestone';
              // 🎨 마일스톤별 색상 가져오기
              const milestoneColorKey = isMilestoneRow ? getMilestoneColorKey(task.taskName) : null;
              const milestoneColors = milestoneColorKey ? MILESTONE_COLORS[milestoneColorKey] : null;

              return (
                <div key={task.id}
                  style={{
                    ...(isPhase ? { top: `${ROW_HEIGHT * zoomScale}px` } : {}),
                    height: `${ROW_HEIGHT * zoomScale}px`,
                    ...(milestoneColors ? {
                      background: milestoneColors.bg,
                      borderBottom: `1px solid ${milestoneColors.border}`
                    } : {})
                  }}
                  className={`flex border-b border-gray-300 transition-colors items-center 
                    ${isRoot ? 'bg-[#005a8d] font-bold text-white sticky top-0 z-30 border-b-2 border-b-[#004d7a] text-[13px]' : 'text-[12px] text-black'}
                    ${isMilestoneRow ? 'font-semibold text-black text-[12px]' : ''}
                    ${isPhase ? `font-semibold text-black sticky z-20 border-b border-gray-300 text-[12px] ${index % 2 === 0 ? 'bg-[#b3c4e6]' : 'bg-[#d6e0f5]'}` : (!isRoot && !isMilestoneRow ? (index % 2 === 0 ? 'bg-[#d6e0f5]' : 'bg-[#e8f0ff]') : '')}`}>

                  {columns.filter(col => !hiddenColumns[col.key]).map(col => (
                    <div key={col.key} className={`px-0.5 ${col.align || 'text-left'} flex items-center h-full border-r border-gray-300 last:border-r-0 truncate flex-shrink-0`}
                      style={{ width: `${(col as any).widthPx * zoomScale}px` }}>
                      {col.key === 'taskName' ? (
                        // 🔥 WBS: 클릭으로 접기/펼치기, 마일스톤별 개별 색상 적용
                        <div
                          className={`flex items-center w-full h-full ${hasChildren ? 'cursor-pointer hover:brightness-125' : 'hover:brightness-110'} transition-all`}
                          onClick={() => hasChildren && toggleCollapse(task.id)}
                          style={{
                            paddingLeft: `${Math.max(0, task.level * 10)}px`,
                            ...(milestoneColors ? { background: milestoneColors.bg } : {})
                          }}
                        >
                          {/* 접기/펼치기 인디케이터 (하위 태스크가 있는 경우만) */}
                          {hasChildren && (
                            <span className={`text-[9px] ${isMilestoneRow ? 'text-white' : 'text-blue-500'} mr-0.5 w-3 flex-shrink-0 select-none font-bold`}>
                              {collapsedGroups[task.id] ? '+' : '-'}
                            </span>
                          )}
                          <input type="text" value={task.taskName} onChange={(e) => { e.stopPropagation(); updateTask(task.id, 'taskName', e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-full bg-transparent outline-none focus:bg-yellow-100 focus:text-gray-900 focus:ring-1 focus:ring-blue-500 px-0.5 truncate text-[11px] ${isRoot ? 'text-white font-bold' : 'text-black'}`} title={task.taskName} />
                        </div>
                      ) : ['planStart', 'planFinish', 'actStart', 'actFinish'].includes(col.key) ? (
                        <div className="w-full h-full flex items-center justify-center relative group/date px-0">
                          {/* 🔥 날짜 표시: Root는 흰색, 나머지는 검은색, 글씨 11px */}
                          <div className={`absolute inset-0 flex items-center justify-center bg-transparent group-focus-within/date:hidden pointer-events-none text-[11px] font-medium ${isRoot ? 'text-white' : 'text-black'}`} suppressHydrationWarning>
                            {formatDateCompact(task[col.key as keyof typeof task] as string)}
                          </div>
                          <input
                            type="date"
                            value={task[col.key as keyof typeof task] as string || ''}
                            onChange={(e) => updateTask(task.id, col.key, e.target.value)}
                            onClick={(e) => !hasChildren && e.currentTarget.showPicker && e.currentTarget.showPicker()}
                            readOnly={hasChildren}
                            className={`w-full h-full bg-transparent text-transparent focus:text-black text-center text-[11px] font-mono outline-none p-0 border-none appearance-none z-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden ${hasChildren ? 'cursor-default pointer-events-none' : 'focus:bg-white focus:ring-1 focus:ring-blue-500'}`}
                            suppressHydrationWarning
                          />
                        </div>
                      ) : col.key === 'path' ? (
                        // 🔥 중요항목 컬럼: 클릭하면 적색 동그라미 토글
                        <div
                          className="w-full h-full flex items-center justify-center cursor-pointer"
                          onClick={() => updateTask(task.id, 'path', task.path ? '' : '●')}
                          title={task.path ? '중요 해제' : '중요 표시'}
                        >
                          {task.path ? (
                            <span className="text-[14px] text-red-500 font-bold drop-shadow-sm">●</span>
                          ) : (
                            <span className="text-[10px] text-gray-300 hover:text-gray-500">○</span>
                          )}
                        </div>
                      ) : col.key === 'duration' ? (
                        // 🔥 기간(D) 컬럼: 숫자만 표시 (일 삭제)
                        <div className="w-full h-full flex items-center justify-center bg-slate-700 text-white text-[11px] whitespace-nowrap">
                          {task.planStart && task.planFinish ? (
                            (() => {
                              const start = new Date(task.planStart);
                              const finish = new Date(task.planFinish);
                              const days = Math.ceil((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                              return days;
                            })()
                          ) : '-'}
                        </div>
                      ) : col.key === 'state' ? (
                        // 🔥 상태(St) 컬럼: 배경 없음, 글씨 색상만으로 구분
                        <div
                          className={`w-full h-full flex items-center justify-center font-bold text-[12px] cursor-pointer
                                    ${task.state === 'G' ? 'text-green-600' : ''}
                                    ${task.state === 'Y' ? 'text-yellow-500' : ''}
                                    ${task.state === 'R' ? 'text-red-600' : ''}
                                    ${!task.state ? 'text-gray-300' : ''}`}
                          onClick={() => {
                            const states = ['', 'G', 'Y', 'R'];
                            const currentIndex = states.indexOf(task.state || '');
                            const nextState = states[(currentIndex + 1) % states.length];

                            // 상태 변경 시 진척율 자동 업데이트 (편의성)
                            let newProgress = task.progress;
                            if (nextState === 'G') newProgress = 100;
                            else if (nextState === 'R') newProgress = 20;
                            else if (nextState === 'Y') newProgress = 50;

                            updateTask(task.id, 'state', nextState);
                            updateTask(task.id, 'progress', String(newProgress));
                          }}
                          title="클릭하여 상태 변경 (G/Y/R)"
                        >
                          {task.state || '-'}
                        </div>
                      ) : col.key === 'progress' ? (
                        // 🔥 진척율 컬럼: 배경 그래프 + 입력 필드
                        <div className="w-full h-full relative group/progress">
                          {/* 배경 진척바 */}
                          <div className="absolute top-1 bottom-1 left-1 right-1 bg-gray-100 rounded overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${Number(task.progress) >= 100 ? 'bg-green-500' :
                                Number(task.progress) > 50 ? 'bg-blue-400' : 'bg-orange-400'
                                }`}
                              style={{ width: `${task.progress || 0}%`, opacity: 0.3 }}
                            ></div>
                          </div>
                          {/* 입력 필드 */}
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="10"
                            value={task.progress || 0}
                            onChange={(e) => {
                              let val = parseInt(e.target.value);
                              if (isNaN(val)) val = 0;
                              if (val > 100) val = 100;
                              if (val < 0) val = 0;
                              updateTask(task.id, 'progress', String(val));
                            }}
                            className="w-full h-full bg-transparent relative z-10 text-center text-[11px] font-bold focus:ring-1 focus:ring-blue-500 focus:bg-white/80 outline-none"
                          />
                        </div>
                      ) : (
                        <input type="text" value={String(task[col.key as keyof typeof task] || '')} onChange={(e) => updateTask(task.id, col.key, e.target.value)}
                          className="w-full h-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 px-1 text-[11px] truncate text-center" title={String(task[col.key as keyof typeof task] || '')}
                          suppressHydrationWarning />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Resizer */}
        <div className="w-1 cursor-col-resize bg-gray-300 hover:bg-blue-400 transition-colors z-30 flex items-center justify-center group relative" onMouseDown={startResizing}>
          <div className="h-6 w-0.5 bg-gray-400 group-hover:bg-white rounded-full absolute top-1/2 -translate-y-1/2"></div>
        </div>

        {/* Right Panel: Chart */}
        <div className="flex-grow overflow-hidden flex flex-col bg-white relative border-l border-gray-300">
          <div className="overflow-hidden flex-shrink-0 border-b border-gray-400 bg-gray-50 z-10 relative" ref={(el) => { if (el && chartRef.current) el.scrollLeft = chartRef.current.scrollLeft; }}>
            <div className="relative" style={{ width: `${totalDays * dynamicDayWidth * zoomScale}px` }}>
              {/* 🔥 연도/월 헤더: timeView에 따라 다르게 표시 */}
              <div className="flex bg-[#005a8d] text-white font-bold border-b border-gray-400 items-center" style={{ height: `${32 * zoomScale}px`, fontSize: timeView === 'day' ? '12px' : '14px' }}>
                {timeView === 'day' ? (
                  // 일 뷰: "26년 1월" 형식으로 월별 표시
                  allYearsMonths.map((ym, i) => (
                    <div key={`${ym.year}-${ym.month}-${i}`} className="text-center border-r border-gray-400/50 py-1" style={{ width: `${ym.daysInMonth * dynamicDayWidth * zoomScale}px` }}>
                      {String(ym.year).slice(2)}년 {ym.month}월
                    </div>
                  ))
                ) : (
                  // 월/주 뷰: 연도별 표시
                  allYearsMonths.filter((_, i) => i === 0 || allYearsMonths[i].year !== allYearsMonths[i - 1].year).map(ym => {
                    const yearDays = allYearsMonths.filter(m => m.year === ym.year).reduce((sum, m) => sum + m.daysInMonth, 0);
                    return <div key={`year-${ym.year}`} className="text-center border-r border-gray-400/50 py-1" style={{ width: `${yearDays * dynamicDayWidth * zoomScale}px` }}>{ym.year}</div>;
                  })
                )}
              </div>
              {/* 🔥 월/주/일 헤더: timeView에 따라 다르게 표시 */}
              <div className="flex bg-[#e1f5fe] font-bold text-gray-700 items-center border-b border-gray-300" style={{ height: `${32 * zoomScale}px`, fontSize: timeView === 'day' ? '11px' : (timeView === 'week' ? '10px' : '14px') }}>
                {timeView === 'day' ? (
                  // 일 단위: 각 월 내에서 일(1~31) 표시
                  allYearsMonths.map((ym, i) => (
                    <div key={`${ym.year}-${ym.month}-${i}`} className="flex border-r border-gray-300">
                      {Array.from({ length: ym.daysInMonth }, (_, d) => (
                        <div key={`day-${d}`} className="text-center border-r border-gray-200 flex items-center justify-center" style={{ width: `${dynamicDayWidth * zoomScale}px`, minWidth: `${dynamicDayWidth * zoomScale}px` }}>
                          {d + 1}
                        </div>
                      ))}
                    </div>
                  ))
                ) : timeView === 'week' ? (
                  // 주 단위: 52주를 1w, 2w 형식으로 표시 (7일 단위로 정렬)
                  Array.from({ length: Math.ceil(totalDays / 7) }, (_, weekIdx) => (
                    <div key={`week-${weekIdx}`} className="text-center border-r border-indigo-400 flex items-center justify-center" style={{ width: `${7 * dynamicDayWidth * zoomScale}px` }}>
                      {weekIdx + 1}w
                    </div>
                  ))
                ) : (
                  // 월 단위: 월 숫자 표시
                  allYearsMonths.map((ym, i) => <div key={`${ym.year}-${ym.month}-${i}`} className="text-center border-r border-gray-300 py-1" style={{ width: `${ym.daysInMonth * dynamicDayWidth * zoomScale}px` }}>{ym.month}</div>)
                )}
              </div>
            </div>
          </div>

          <div className="overflow-auto flex-1 relative custom-scrollbar" ref={chartRef} onScroll={(e) => { handleScroll(e); const header = e.currentTarget.previousElementSibling; if (header) header.scrollLeft = e.currentTarget.scrollLeft; }}>
            <div className="relative" style={{ width: `${totalDays * dynamicDayWidth * zoomScale}px`, height: `${visibleTasks.length * ROW_HEIGHT * zoomScale}px`, minHeight: '100%' }}>
              {/* 🔥 세로 구분선 - timeView에 따라 다르게 표시 */}
              <div className="absolute inset-0 pointer-events-none z-20 flex h-full">
                {timeView === 'day' ? (
                  // 일 단위: 일별 구분선
                  Array.from({ length: totalDays }, (_, i) => (
                    <div key={`day-grid-${i}`} style={{ width: `${dynamicDayWidth * zoomScale}px`, borderRight: '1px solid #b0bec5' }} className="h-full"></div>
                  ))
                ) : timeView === 'week' ? (
                  // 주 단위: 주별 구분선 (7일마다)
                  Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => (
                    <div key={`week-grid-${i}`} style={{ width: `${7 * dynamicDayWidth * zoomScale}px`, borderRight: '1px solid #7986cb' }} className="h-full"></div>
                  ))
                ) : (
                  // 월 단위: 월별 구분선
                  allYearsMonths.map((ym, i) => <div key={`grid-${i}`} style={{ width: `${ym.daysInMonth * dynamicDayWidth * zoomScale}px`, borderRight: '1px solid #7986cb' }} className="h-full"></div>)
                )}
              </div>

              {/* 🔥 WBS 화살표 연결 SVG 레이어 */}
              <svg className="absolute inset-0 pointer-events-none z-30" style={{ width: `${totalDays * dynamicDayWidth * zoomScale}px`, height: `${visibleTasks.length * ROW_HEIGHT * zoomScale}px`, overflow: 'visible' }}>
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#78909c" />
                  </marker>
                  <marker id="arrowhead-critical" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#e53935" />
                  </marker>
                  <marker id="arrowhead-milestone" markerWidth="4" markerHeight="3" refX="3" refY="1.5" orient="auto">
                    <polygon points="0 0, 4 1.5, 0 3" fill="#ffd600" />
                  </marker>
                </defs>

                {/* 🔥 마일스톤 간 화살표 연결 (PROTO → P1 → P2 → PPAP → SOP) */}
                {(() => {
                  // type === 'milestone'인 항목들 (0.1 ~ 0.5)
                  const milestones = visibleTasks.filter(t => t.type === 'milestone');
                  const milestoneOrder = ['PROTO', 'P1', 'P2', 'PPAP', 'SOP'];
                  const sortedMilestones = milestoneOrder.map(name =>
                    milestones.find(m => m.taskName === name || (name === 'PPAP' && m.taskName?.includes('PPAP')) || (name === 'SOP' && m.taskName?.includes('SOP')))
                  ).filter(Boolean);

                  return sortedMilestones.map((ms, i) => {
                    if (i >= sortedMilestones.length - 1) return null;
                    const nextMs = sortedMilestones[i + 1];
                    if (!ms || !nextMs) return null;

                    // planFinish 날짜로 위치 계산
                    const fromDate = parseDate(ms.planFinish);
                    const toDate = parseDate(nextMs.planFinish);
                    if (!fromDate || !toDate) return null;

                    const fromIndex = visibleTasks.findIndex(t => t.id === ms.id);
                    const toIndex = visibleTasks.findIndex(t => t.id === nextMs.id);
                    if (fromIndex === -1 || toIndex === -1) return null;

                    // 라벨 박스 우측 끝에서 시작 (라벨 너비 ~45px 고려)
                    const labelWidth = 45; // 마일스톤 라벨 박스 너비
                    const fromX = (getDuration(minDate, fromDate) - 1) * dynamicDayWidth * zoomScale + labelWidth;
                    const fromY = fromIndex * ROW_HEIGHT * zoomScale + (ROW_HEIGHT * zoomScale / 2);
                    const toX = (getDuration(minDate, toDate) - 1) * dynamicDayWidth * zoomScale; // 라벨 좌측 끝에 연결
                    const toY = toIndex * ROW_HEIGHT * zoomScale + (ROW_HEIGHT * zoomScale / 2);

                    // ㄱ자 꺾임 경로 (라벨 우측 끝에서 시작)
                    const elbowX = fromX + 10;

                    return (
                      <path
                        key={`milestone-arrow-${ms.id}-${nextMs.id}`}
                        d={`M ${fromX} ${fromY} L ${elbowX} ${fromY} L ${elbowX} ${toY} L ${toX} ${toY}`}
                        stroke="#ffd600"
                        strokeWidth={2}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        markerEnd="url(#arrowhead-milestone)"
                      />
                    );
                  });
                })()}
              </svg>

              <div className="relative z-10 flex flex-col">
                {visibleTasks.map((task, index) => {
                  const planProps = getBarProps(task, false);
                  const actualProps = getBarProps(task, true);
                  // @ts-ignore
                  const isMilestone = task.type === 'milestone';
                  const isRoot = task.id === '0';
                  const isPhase = task.level === 0 && !isRoot;
                  // 🎨 간트 차트 영역의 마일스톤 색상
                  const chartMilestoneColorKey = isMilestone ? getMilestoneColorKey(task.taskName) : null;
                  const chartMilestoneColors = chartMilestoneColorKey ? MILESTONE_COLORS[chartMilestoneColorKey] : null;

                  return (
                    <div key={task.id} className={`relative border-b border-gray-200 w-full flex items-center transition-colors
                                ${isRoot ? 'bg-[#005a8d] sticky top-0 z-20 border-b-[#004d7a]' : ''}
                                ${isPhase ? `sticky z-20 border-b-gray-300 ${index % 2 === 0 ? 'bg-[#b3c4e6]' : 'bg-[#d6e0f5]'}` : (!isRoot ? (index % 2 === 0 ? 'bg-[#d6e0f5]' : 'bg-[#e8f0ff]') : '')}`}
                      style={{
                        height: `${ROW_HEIGHT * zoomScale}px`,
                        ...(isPhase ? { top: `${ROW_HEIGHT * zoomScale}px` } : {}),
                        ...(chartMilestoneColors ? {
                          background: chartMilestoneColors.bg,
                          borderBottom: `1px solid ${chartMilestoneColors.border}`
                        } : {})
                      }}>

                      {/* 🔥 Phase 행 (1단계, 2단계 등) - 기간 바 + 진척율 표시 */}
                      {isPhase && planProps.width !== 0 && (
                        <div
                          className="absolute top-[2px] rounded-[4px] overflow-hidden shadow-md group/phase transition-all hover:shadow-lg"
                          style={{
                            left: planProps.left,
                            width: planProps.width,
                            height: '20px',
                            zIndex: 1,
                            background: 'linear-gradient(135deg, #3f51b5 0%, #5c6bc0 100%)',
                            border: '1px solid #303f9f',
                          }}
                        >
                          {/* 진척율 게이지 (채워지는 부분) */}
                          <div
                            className="h-full transition-all duration-150"
                            style={{
                              width: `${task.progress || 0}%`,
                              minWidth: task.progress > 0 ? '2px' : '0',
                              background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                            }}
                          ></div>

                          {/* 단계명 + 진척율 텍스트 */}
                          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none overflow-hidden">
                            <span className="text-[10px] font-bold text-white drop-shadow-sm truncate">
                              {task.taskName}
                            </span>
                            <span className="text-[10px] font-bold text-yellow-200 drop-shadow-sm ml-1">
                              {task.progress || 0}%
                            </span>
                          </div>

                          {/* 호버 툴팁 - WBS 정보 포함 */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-3 py-2 bg-gray-900 text-white text-[11px] rounded-lg opacity-0 group-hover/phase:opacity-100 z-50 pointer-events-none whitespace-nowrap shadow-lg">
                            <div className="font-bold text-indigo-300 mb-1">📋 {task.id} - {task.taskName}</div>
                            <div className="text-gray-300">기간: {task.planStart} ~ {task.planFinish}</div>
                            <div className="text-gray-300">진척율: <span className="text-yellow-300 font-bold">{task.progress || 0}%</span></div>
                          </div>
                        </div>
                      )}

                      {/* 🔥 게이지바 스타일 - 드래그로 진척율 조정 가능 */}
                      {!isRoot && !isPhase && !isMilestone && planProps.width !== 0 && (() => {
                        // 🔥 Critical Path 판별
                        const isCriticalPath = task.path === 'C';
                        return (
                          <div
                            className={`absolute top-[2px] rounded-[3px] overflow-hidden shadow-sm group/bar transition-all hover:shadow-md ${progressDragging?.taskId === task.id ? 'ring-2 ring-blue-500' : ''} ${isCriticalPath ? 'ring-1 ring-red-400' : ''}`}
                            style={{
                              left: planProps.left,
                              width: planProps.width,
                              height: '20px',
                              zIndex: isCriticalPath ? 5 : 1,
                              background: isCriticalPath ? '#ffebee' : '#e3f2fd',
                              border: isCriticalPath ? '2px solid #ef5350' : '1px solid #90caf9',
                              cursor: 'ew-resize', // 드래그 커서
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // 🔥 진척율 드래그 시작
                              setProgressDragging({ taskId: task.id, barElement: e.currentTarget });
                              // 즉시 클릭 위치에 진척율 설정
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              const width = rect.width;
                              const newProgress = Math.round((clickX / width) * 100);
                              updateTask(task.id, 'progress', String(Math.min(100, Math.max(0, newProgress))));
                            }}
                            title={`드래그하여 진척율 조정 (현재: ${task.progress || 0}%)`}
                          >
                            {/* 진척율 게이지 (채워지는 부분) */}
                            <div
                              className={`h-full ${progressDragging?.taskId === task.id ? '' : 'transition-all duration-150'}`}
                              style={{
                                width: `${task.progress || 0}%`,
                                minWidth: task.progress > 0 ? '2px' : '0',
                                background: isCriticalPath ? '#e53935' : (
                                  Number(task.progress) >= 100 ? '#4caf50' :
                                    Number(task.progress) >= 80 ? '#8bc34a' :
                                      Number(task.progress) >= 50 ? '#2196f3' :
                                        Number(task.progress) >= 20 ? '#ff9800' : '#f44336'
                                )
                              }}
                            ></div>

                            {/* 진척율 텍스트 (바 위에 표시) */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className={`text-[10px] font-bold ${Number(task.progress) >= 50 ? 'text-white' : 'text-gray-700'} drop-shadow-sm`}>
                                {task.progress || 0}%
                              </span>
                            </div>

                            {/* 호버 툴팁 - WBS 정보 포함 */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-3 py-2 bg-gray-900 text-white text-[11px] rounded-lg opacity-0 group-hover/bar:opacity-100 z-50 pointer-events-none whitespace-nowrap shadow-lg">
                              <div className="font-bold text-blue-300 mb-1">📋 {task.id} - {task.taskName}</div>
                              <div className="text-gray-300">진척율: <span className="text-yellow-300 font-bold">{task.progress || 0}%</span></div>
                              <div className="text-gray-400 text-[9px] mt-1">🖱️ 드래그하여 진척율 조정</div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 🔥 Root Row - 마일스톤 라벨 + 꺾은선 연결 */}
                      {isRoot && (() => {
                        const milestones = data.filter((t: any) => t.parentId === '0' && t.type === 'milestone');
                        const milestoneOrder = ['PROTO', 'PILOT1', 'PILOT2', 'PPAP', 'SOP'];
                        const sortedMs = milestoneOrder.map(name =>
                          milestones.find((m: any) => m.taskName === name || m.taskName?.includes(name) || (name === 'SOP' && m.taskName?.includes('양산')))
                        ).filter(Boolean);

                        // 라벨 렌더링
                        const labels = sortedMs.map((ms: any) => {
                          const msDate = parseDate(ms.planFinish);
                          if (!msDate) return null;
                          const left = (getDuration(minDate, msDate) - 1) * dynamicDayWidth * zoomScale;
                          let label = ms.taskName;
                          if (label === 'PROTO') label = 'Proto';
                          if (label === 'PILOT1') label = 'P1';
                          if (label === 'PILOT2') label = 'P2';
                          if (label?.includes('PPAP')) label = 'PPAP';
                          if (label?.includes('SOP') || label?.includes('양산')) label = 'SOP';

                          return (
                            <div key={ms.id} className="absolute top-0 h-full flex items-center pointer-events-none z-30" style={{ left: `${left}px` }}>
                              <div className="bg-[#1a237e] text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">
                                {label}
                              </div>
                            </div>
                          );
                        });

                        // 🔥 흰색 직선 연결 (같은 행)
                        const connectors = sortedMs.map((ms: any, i: number) => {
                          if (i >= sortedMs.length - 1) return null;
                          const nextMs = sortedMs[i + 1];
                          if (!ms || !nextMs) return null;

                          const fromDate = parseDate(ms.planFinish);
                          const toDate = parseDate(nextMs.planFinish);
                          if (!fromDate || !toDate) return null;

                          const fromX = (getDuration(minDate, fromDate) - 1) * dynamicDayWidth * zoomScale + 30;
                          const toX = (getDuration(minDate, toDate) - 1) * dynamicDayWidth * zoomScale - 5;
                          const y = ROW_HEIGHT * zoomScale * 0.5; // 같은 높이 (직선)

                          return (
                            <svg key={`conn-${ms.id}`} className="absolute inset-0 pointer-events-none z-20" style={{ overflow: 'visible' }}>
                              <line
                                x1={fromX}
                                y1={y}
                                x2={toX}
                                y2={y}
                                stroke="white"
                                strokeWidth={2}
                                strokeLinecap="round"
                              />
                            </svg>
                          );
                        });

                        return [...labels, ...connectors];
                      })()}

                      {/* 마일스톤 라벨 */}
                      {isMilestone && (
                        (() => {
                          const finishDate = parseDate(task.planFinish);
                          if (!finishDate) return null;
                          const left = (getDuration(minDate, finishDate) - 1) * dynamicDayWidth * zoomScale;
                          return (
                            <div className="absolute w-full pointer-events-none z-30 h-full top-0 left-0">
                              <div className="relative w-full h-full flex items-center">
                                <div
                                  className="absolute bg-[#3949ab] text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm"
                                  style={{ left: `${left}px`, top: '50%', transform: 'translateY(-50%)' }}
                                  title={`${task.taskName} (${task.planFinish})`}
                                >
                                  {task.taskName}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none h-full opacity-70 dashed" style={{ left: `${getDuration(minDate, new Date()) * dynamicDayWidth * zoomScale}px` }}>
                <div className="absolute -top-0 -left-3 text-white bg-red-500 text-[8px] font-bold px-1 py-0.5 rounded shadow-md z-50">TODAY</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
});

export default GanttChartView;
