// CODEFREEZE
/**
 * @file page.tsx
 * @description DB 뷰어 페이지 - FMEA 전체 테이블 현황
 * @created 2026-01-13
 * @updated 2026-01-13 실제 Prisma 스키마 기반 전체 테이블 표시
 */

'use client';

import { useState, useEffect } from 'react';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface TableData {
  schema: string;
  table: string;
  columns: string[];
  data: Record<string, unknown>[];
}

interface TableSummary {
  table: string;
  label: string;
  category: string;
  columns: number;
  rows: number;
  missingCount?: number; // 누락 건수
  status: 'loading' | 'success' | 'error';
}

// 실제 Prisma 스키마 기반 테이블 정의
// hasFmeaId: true = FMEA ID별로 필터링 가능한 테이블
// hasApqpNo: true = APQP ID별로 필터링 가능한 테이블
// hasCpNo: true = CP ID별로 필터링 가능한 테이블
const MODULE_TABLES: Record<string, { label: string; value: string; description: string; hasFmeaId?: boolean; hasApqpNo?: boolean; hasCpNo?: boolean }[]> = {
  '공통DB': [
    { label: '고객사', value: 'customers', description: '고객사 정보 (전체 공유)' },
    { label: '사용자', value: 'users', description: '사용자 정보 (전체 공유)' },
    { label: 'PFMEA 심각도 기준', value: 'pfmea_severity_criteria', description: 'PFMEA 심각도 평가기준 (1-10)' },
    { label: 'PFMEA 발생도 기준', value: 'pfmea_occurrence_criteria', description: 'PFMEA 발생도 평가기준 (1-10)' },
    { label: 'PFMEA 검출도 기준', value: 'pfmea_detection_criteria', description: 'PFMEA 검출도 평가기준 (1-10)' },
    { label: 'DFMEA 심각도 기준', value: 'dfmea_severity_criteria', description: 'DFMEA 심각도 평가기준 (1-10)' },
    { label: 'DFMEA 발생도 기준', value: 'dfmea_occurrence_criteria', description: 'DFMEA 발생도 평가기준 (1-10)' },
    { label: 'DFMEA 검출도 기준', value: 'dfmea_detection_criteria', description: 'DFMEA 검출도 평가기준 (1-10)' },
  ],
  'FMEA': [
    { label: 'FMEA 프로젝트', value: 'fmea_projects', description: 'FMEA 프로젝트 기본정보' },
    { label: 'FMEA 등록정보', value: 'fmea_registrations', description: 'FMEA 등록화면 데이터', hasFmeaId: true },
    { label: 'CFT 멤버', value: 'fmea_cft_members', description: 'CFT 팀 구성원', hasFmeaId: true },
    { label: '워크시트 데이터', value: 'fmea_worksheet_data', description: '워크시트 JSON 데이터', hasFmeaId: true },
    { label: '확정 상태', value: 'fmea_confirmed_states', description: '단계별 확정 상태', hasFmeaId: true },
    { label: '개정 이력', value: 'fmea_revision_history', description: '개정관리 이력', hasFmeaId: true },
    { label: '회의록', value: 'fmea_meeting_minutes', description: '개정관리 회의록', hasFmeaId: true },
    { label: '레거시 데이터', value: 'fmea_legacy_data', description: '레거시 호환 데이터', hasFmeaId: true },
  ],
  'APQP': [
    { label: 'APQP 프로젝트', value: 'apqp_projects', description: 'APQP 프로젝트 기본정보 (레거시)' },
    { label: 'APQP 등록정보', value: 'apqp_registrations', description: 'APQP 등록화면 데이터', hasApqpNo: true },
    { label: 'APQP CFT 멤버', value: 'apqp_cft_members', description: 'APQP CFT 팀 구성원', hasApqpNo: true },
    { label: 'APQP 개정 이력', value: 'apqp_revisions', description: 'APQP 개정 이력', hasApqpNo: true },
    { label: 'APQP 단계(Phase)', value: 'apqp_phases', description: 'APQP 5단계 정보', hasApqpNo: true },
    { label: 'APQP 활동(Activity)', value: 'apqp_activities', description: 'APQP 단계별 활동 항목', hasApqpNo: true },
    { label: 'APQP 산출물', value: 'apqp_deliverables', description: 'APQP 산출물', hasApqpNo: true },
    { label: 'APQP 일정', value: 'apqp_schedules', description: 'APQP 마일스톤/일정', hasApqpNo: true },
  ],
  '구조분석': [
    { label: 'L1 구조 (완제품)', value: 'l1_structures', description: '완제품 공정명', hasFmeaId: true },
    { label: 'L2 구조 (공정)', value: 'l2_structures', description: '메인공정', hasFmeaId: true },
    { label: 'L3 구조 (작업요소)', value: 'l3_structures', description: '작업요소', hasFmeaId: true },
  ],
  '기능분석': [
    { label: 'L1 기능 (완제품)', value: 'l1_functions', description: '완제품 기능/요구사항', hasFmeaId: true },
    { label: 'L2 기능 (공정)', value: 'l2_functions', description: '공정 기능/제품특성', hasFmeaId: true },
    { label: 'L3 기능 (작업요소)', value: 'l3_functions', description: '작업요소 기능/공정특성', hasFmeaId: true },
  ],
  '고장분석': [
    { label: '고장영향 (FE)', value: 'failure_effects', description: 'L1 고장영향', hasFmeaId: true },
    { label: '고장형태 (FM)', value: 'failure_modes', description: 'L2 고장형태', hasFmeaId: true },
    { label: '고장원인 (FC)', value: 'failure_causes', description: 'L3 고장원인', hasFmeaId: true },
    { label: '고장연결', value: 'failure_links', description: 'FE-FM-FC 연결', hasFmeaId: true },
    { label: '고장분석 통합', value: 'failure_analyses', description: '고장분석 통합 데이터', hasFmeaId: true },
  ],
  '리스크/최적화': [
    { label: '리스크분석', value: 'risk_analyses', description: 'S/O/D/AP 분석', hasFmeaId: true },
    { label: '최적화', value: 'optimizations', description: '개선 조치', hasFmeaId: true },
  ],
  'CP': [
    // CP 프로젝트별 데이터
    { label: 'CP 등록정보', value: 'cp_registrations', description: 'CP 프로젝트 등록 (cpNo별)', hasCpNo: true },
    { label: 'CP CFT 멤버', value: 'cp_cft_members', description: 'CP CFT 팀 구성원 (cpNo별)', hasCpNo: true },
    { label: 'CP 개정이력', value: 'cp_revisions', description: 'CP 개정관리 이력 (cpNo별)', hasCpNo: true },
    { label: 'CP 공정현황', value: 'cp_processes', description: 'CP 공정현황 (cpNo별)', hasCpNo: true },
    { label: 'CP 검출장치', value: 'cp_detectors', description: 'CP 검출장치 (cpNo별)', hasCpNo: true },
    { label: 'CP 관리항목', value: 'cp_control_items', description: 'CP 관리항목 (cpNo별)', hasCpNo: true },
    { label: 'CP 관리방법', value: 'cp_control_methods', description: 'CP 관리방법 (cpNo별)', hasCpNo: true },
    { label: 'CP 대응계획', value: 'cp_reaction_plans', description: 'CP 대응계획 (cpNo별)', hasCpNo: true },
    // CP 마스터 데이터
    { label: 'CP 공정현황 마스터', value: 'cp_master_processes', description: 'CP 공정현황 기초정보' },
    { label: 'CP 검출장치 마스터', value: 'cp_master_detectors', description: 'CP 검출장치 기초정보' },
    { label: 'CP 관리항목 마스터', value: 'cp_master_control_items', description: 'CP 관리항목 기초정보' },
    { label: 'CP 관리방법 마스터', value: 'cp_master_control_methods', description: 'CP 관리방법 기초정보' },
    { label: 'CP 대응계획 마스터', value: 'cp_master_reaction_plans', description: 'CP 대응계획 기초정보' },
    // ★ CP 기초정보 통합 테이블 (Import 데이터 저장 - 489건 등)
    { label: 'CP 마스터 통합항목', value: 'cp_master_flat_items', description: 'CP 기초정보 Import 데이터 (전체 항목)', hasCpNo: true },
    // 기존 레거시 테이블
    { label: 'Control Plan (레거시)', value: 'control_plans', description: 'CP 헤더 (하위호환)', hasFmeaId: true },
    { label: 'CP 항목 (레거시)', value: 'control_plan_items', description: 'CP 상세 항목 (하위호환)' },
    { label: '동기화 로그', value: 'sync_logs', description: 'FMEA-CP 동기화' },
  ],
  'PFD': [
    { label: 'PFD 등록정보', value: 'pfd_registrations', description: 'PFD 프로젝트 등록 헤더', hasFmeaId: true },
    { label: 'PFD 항목', value: 'pfd_items', description: 'PFD 공정/특성 항목', hasFmeaId: true },
    { label: '문서 연결', value: 'document_links', description: 'FMEA-CP-PFD 문서 연동' },
  ],
  '마스터': [
    { label: '프로젝트 기초정보', value: 'bizinfo_projects', description: '프로젝트 기초정보' },
    { label: 'PFMEA 마스터 데이터셋', value: 'pfmea_master_datasets', description: '마스터 데이터셋' },
    { label: 'PFMEA 마스터 항목', value: 'pfmea_master_flat_items', description: '마스터 플랫 항목' },
    { label: '습득교훈', value: 'lessons_learned', description: 'Lessons Learned' },
  ],
};

// FMEA ID 필터링이 필요한 카테고리
const FMEA_FILTERED_CATEGORIES = ['FMEA', '구조분석', '기능분석', '고장분석', '리스크/최적화', 'CP'];

// 모듈 탭 정의
const MODULES = [
  { key: '전체', label: '📊 전체 (52개)', color: 'bg-gray-700' },
  { key: '공통DB', label: '🌐 공통DB', color: 'bg-cyan-600' },
  { key: 'FMEA', label: '📋 FMEA', color: 'bg-blue-600' },
  { key: 'APQP', label: '📆 APQP', color: 'bg-green-600' },
  { key: '구조분석', label: '🏗️ 구조분석', color: 'bg-indigo-600' },
  { key: '기능분석', label: '⚙️ 기능분석', color: 'bg-purple-600' },
  { key: '고장분석', label: '⚠️ 고장분석', color: 'bg-red-600' },
  { key: '리스크/최적화', label: '📊 리스크/최적화', color: 'bg-orange-600' },
  { key: 'CP', label: '📝 CP', color: 'bg-teal-600' },
  { key: 'PFD', label: '🔀 PFD', color: 'bg-emerald-600' },
  { key: '마스터', label: '🔧 마스터', color: 'bg-slate-600' },
];

// 카테고리별 색상
const CATEGORY_COLORS: Record<string, string> = {
  '공통DB': 'bg-cyan-100 text-cyan-800',
  'FMEA': 'bg-blue-100 text-blue-800',
  'APQP': 'bg-green-100 text-green-800',
  '구조분석': 'bg-indigo-100 text-indigo-800',
  '기능분석': 'bg-purple-100 text-purple-800',
  '고장분석': 'bg-red-100 text-red-800',
  '리스크/최적화': 'bg-orange-100 text-orange-800',
  'CP': 'bg-teal-100 text-teal-800',
  'PFD': 'bg-emerald-100 text-emerald-800',
  '마스터': 'bg-slate-100 text-slate-800',
};

// 프로젝트 유형 정의
const PROJECT_TYPES = [
  { key: 'all', label: '전체', icon: '📊' },
  { key: 'PFMEA', label: 'PFMEA', icon: '🔧', table: 'fmea_projects', idField: 'fmeaId', nameField: 'subject' },
  { key: 'DFMEA', label: 'DFMEA', icon: '📐', table: 'fmea_projects', idField: 'fmeaId', nameField: 'subject' },
  { key: 'APQP', label: 'APQP', icon: '📆', table: 'apqp_registrations', idField: 'apqpNo', nameField: 'subject' },
  { key: 'CP', label: 'CP', icon: '📝', table: 'cp_registrations', idField: 'cpNo', nameField: 'subject' },
  { key: 'PFD', label: 'PFD', icon: '📋', table: 'pfd_projects', idField: 'pfdId', nameField: 'name' },
  { key: 'WS', label: 'WS', icon: '📄', table: 'ws_projects', idField: 'wsId', nameField: 'name' },
  { key: 'PM', label: 'PM', icon: '📁', table: 'pm_projects', idField: 'pmId', nameField: 'name' },
];

interface ProjectItem {
  id: string;
  name: string;
  type: string;
  status?: string;
}

export default function DBViewerPage() {
  // 상태
  const [activeModule, setActiveModule] = useState<string>('전체');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [tableSummaries, setTableSummaries] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // 프로젝트 필터링 (확장)
  const [selectedProjectType, setSelectedProjectType] = useState<string>('all');
  const [projectList, setProjectList] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Floating window hook
  const { pos: projPos, size: projSize, onDragStart: projDragStart, onResizeStart: projResizeStart } = useFloatingWindow({ isOpen: showProjectModal, width: 500, height: 560 });

  // 프로젝트 목록 로드 (유형별)
  const loadProjectList = async (projectType: string) => {
    if (projectType === 'all') {
      setProjectList([]);
      return;
    }

    const typeConfig = PROJECT_TYPES.find(t => t.key === projectType);
    if (!typeConfig || !typeConfig.table) return;

    try {
      const res = await fetch(`/api/admin/db/data?schema=public&table=${typeConfig.table}&limit=100`);
      const result = await res.json();

      if (result.success && result.result?.data) {
        const projects = result.result.data.map((p: Record<string, unknown>) => ({
          id: String(p[typeConfig.idField] || p.id || ''),
          name: String(p[typeConfig.nameField] || p.name || ''),
          type: projectType,
          status: String(p.status || ''),
        })).filter((p: ProjectItem) => p.id);
        setProjectList(projects);
      } else {
        setProjectList([]);
      }
    } catch {
      console.error(`${projectType} 프로젝트 목록 로드 실패`);
      setProjectList([]);
    }
  };

  // 프로젝트 유형 변경 시 목록 로드
  const handleProjectTypeChange = (type: string) => {
    setSelectedProjectType(type);
    setSelectedProjectId('');
    loadProjectList(type);
  };

  // 프로젝트 선택 핸들러
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowProjectModal(false);
    // 현재 선택된 테이블이 있으면 다시 로드
    if (selectedTable) {
      loadTableData(selectedTable, projectId);
    }
  };

  // FMEA ID 필터링이 필요한 카테고리인지 확인
  const needsProjectFilter = FMEA_FILTERED_CATEGORIES.includes(activeModule) || activeModule === 'APQP';

  // 테이블 데이터 로드 (프로젝트 ID 필터링 지원)
  const loadTableData = async (tableName: string, projectId?: string) => {
    if (!tableName) return;

    setLoading(true);
    setError(null);

    try {
      // ✅ 고장연결(failure_links) 테이블은 legacyData에서 텍스트 정보와 함께 로드
      if (tableName === 'failure_links' && projectId) {
        const fmeaId = projectId.toLowerCase();
        const legacyRes = await fetch(`/api/fmea?fmeaId=${fmeaId}`);
        const legacyResult = await legacyRes.json();

        if (legacyResult.success && legacyResult.legacyData?.failureLinks) {
          const links = legacyResult.legacyData.failureLinks;
          // 텍스트 정보가 포함된 컬럼으로 변환
          const columns = ['no', 'fmProcess', 'fmText', 'feScope', 'feText', 'severity', 'fcText', 'fcM4', 'fcWorkElem', 'fmId', 'feId', 'fcId'];
          const data = links.map((link: any, idx: number) => ({
            no: idx + 1,
            fmProcess: link.fmProcess || '-',
            fmText: link.fmText || '-',
            feScope: link.feScope || '-',
            feText: link.feText || '-',
            severity: link.severity || 0,
            fcText: link.fcText || '-',
            fcM4: link.fcM4 || '-',
            fcWorkElem: link.fcWorkElem || '-',
            fmId: link.fmId || '-',
            feId: link.feId || '-',
            fcId: link.fcId || '-',
          }));

          setTableData({
            schema: 'legacyData',
            table: 'failure_links (상세)',
            columns,
            data,
          });
          setLoading(false);
          return;
        }
      }

      const url = `/api/admin/db/data?schema=public&table=${tableName}&limit=100`;

      const res = await fetch(url);
      const result = await res.json();

      if (result.success) {
        // 프로젝트 ID 필터링이 필요하면 클라이언트에서 필터링
        if (projectId && result.result?.data) {

          const filteredData = result.result.data.filter((row: Record<string, unknown>) => {
            // 다양한 ID 필드 검사 (대소문자 구분 없이 비교)
            const rowFmeaId = row.fmeaId || row.fmea_id;
            const rowApqpNo = row.apqpNo || row.apqp_no;
            const rowCpNo = row.cpNo || row.cp_no;
            const rowOtherId = row.pfdId || row.wsId || row.pmId;

            const projectIdLower = String(projectId).trim().toLowerCase();

            // fmeaId 필드가 있는 경우 대소문자 구분 없이 비교
            if (rowFmeaId) {
              const rowFmeaIdLower = String(rowFmeaId).trim().toLowerCase();
              return rowFmeaIdLower === projectIdLower;
            }

            // cpNo 필드가 있는 경우 대소문자 구분 없이 비교
            if (rowCpNo) {
              const rowCpNoLower = String(rowCpNo).trim().toLowerCase();
              return rowCpNoLower === projectIdLower;
            }

            // apqpNo 필드가 있는 경우 대소문자 구분 없이 비교
            if (rowApqpNo) {
              const rowApqpNoLower = String(rowApqpNo).trim().toLowerCase();
              return rowApqpNoLower === projectIdLower;
            }

            // 기타 ID 필드는 대소문자 구분 없이 비교
            if (rowOtherId) {
              const rowOtherIdLower = String(rowOtherId).trim().toLowerCase();
              return rowOtherIdLower === projectIdLower;
            }

            return false;
          });


          setTableData({
            ...result.result,
            data: filteredData
          });
        } else {
          setTableData(result.result);
        }
      } else {
        setError(result.error || '데이터 조회 실패');
        setTableData(null);
      }
    } catch {
      setError('API 호출 실패');
      setTableData(null);
    } finally {
      setLoading(false);
    }
  };

  // 테이블 현황 로드
  const loadSummary = async (module: string) => {
    // 전체 모드일 때는 모든 테이블 로드
    let tables: { label: string; value: string; description: string; category?: string }[] = [];

    if (module === '전체') {
      // 모든 모듈의 테이블을 합침
      Object.entries(MODULE_TABLES).forEach(([cat, tableList]) => {
        tableList.forEach(t => {
          tables.push({ ...t, category: cat });
        });
      });
    } else {
      tables = (MODULE_TABLES[module] || []).map(t => ({ ...t, category: module }));
    }

    if (tables.length === 0) return;

    setSummaryLoading(true);
    setError(null);

    // 초기 상태 설정
    const initialSummaries: TableSummary[] = tables.map(t => ({
      table: t.value,
      label: t.label,
      category: t.category || module,
      columns: 0,
      rows: 0,
      status: 'loading' as const,
    }));
    setTableSummaries(initialSummaries);

    // 테이블 목록과 행 수 조회
    try {
      const countRes = await fetch(`/api/admin/db/tables?schema=public`);
      const countResult = await countRes.json();
      const allDbTables = countResult.tables || [];

      // 각 테이블별로 요약 정보 생성 (컬럼 수/누락 건수는 나중에 개별 로드 시 표시)
      const results: TableSummary[] = tables.map((t) => {
        const tableInfo = allDbTables.find((tb: { table: string; rows: number }) => tb.table === t.value);
        return {
          table: t.value,
          label: t.label,
          category: t.category || module,
          columns: 0, // 나중에 로드
          rows: tableInfo?.rows || 0,
          status: 'success' as const,
        };
      });

      setTableSummaries(results);
    } catch (err: any) {
      console.error('테이블 목록 조회 실패:', err);
      setError('테이블 목록 조회 실패: ' + err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    if (!initialized) {
      loadSummary('전체');
      setInitialized(true);
    }
  }, [initialized]);

  // 모듈 변경 핸들러
  const handleModuleChange = (module: string) => {
    setActiveModule(module);
    setSelectedTable('');
    setTableData(null);
    loadSummary(module);
  };

  // 테이블 선택 핸들러
  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    // 프로젝트 ID 필터링이 필요하면 적용
    const tableInfo = Object.values(MODULE_TABLES).flat().find(t => t.value === tableName);
    const needsFilter = (tableInfo?.hasFmeaId || tableInfo?.hasApqpNo || tableInfo?.hasCpNo) && selectedProjectId;


    if (needsFilter) {
      loadTableData(tableName, selectedProjectId);
    } else {
      loadTableData(tableName);
    }
  };

  // 셀 값 포맷팅
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') {
      try {
        const str = JSON.stringify(value);
        return str.length > 80 ? str.slice(0, 80) + '...' : str;
      } catch {
        return '[Object]';
      }
    }
    const str = String(value);
    return str.length > 40 ? str.slice(0, 40) + '...' : str;
  };

  // 통계 계산
  const totalTables = tableSummaries.length;
  const totalRows = tableSummaries.reduce((sum, t) => sum + t.rows, 0);
  const totalColumns = tableSummaries.reduce((sum, t) => sum + t.columns, 0);
  const tablesWithData = tableSummaries.filter(t => t.rows > 0).length;

  // 전체 테이블 수 계산
  const allTablesCount = Object.values(MODULE_TABLES).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="w-full bg-gray-100 font-[Malgun_Gothic] pt-2">
      {/* 헤더 */}
      <div className="bg-[#00587a] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🗄️</span>
          <h1 className="text-lg font-bold">DB 뷰어</h1>
          <span className="text-xs text-white/70">FMEA 전체 데이터베이스 ({allTablesCount}개 테이블)</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 프로젝트 유형 선택 */}
          <div className="flex items-center gap-1 bg-white/10 rounded px-2 py-1">
            <span className="text-xs text-white/70">유형:</span>
            <select
              value={selectedProjectType}
              onChange={(e) => handleProjectTypeChange(e.target.value)}
              className="px-2 py-1 text-xs rounded bg-white/20 text-white min-w-[80px] border-0"
            >
              {PROJECT_TYPES.map(t => (
                <option key={t.key} value={t.key} className="text-gray-800">
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* 프로젝트 ID 선택 */}
          <div className="flex items-center gap-1 bg-white/10 rounded px-2 py-1">
            <span className="text-xs text-white/70">프로젝트:</span>
            <button
              onClick={() => setShowProjectModal(true)}
              className="px-2 py-1 text-xs rounded bg-white/20 text-white min-w-[150px] text-left hover:bg-white/30"
            >
              {selectedProjectId || '전체 (필터 없음)'}
            </button>
            {selectedProjectId && (
              <button
                onClick={() => { setSelectedProjectId(''); if (selectedTable) loadTableData(selectedTable); }}
                className="text-white/70 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => { loadSummary(activeModule); loadProjectList(selectedProjectType); }}
            disabled={summaryLoading}
            className="px-3 py-1.5 text-xs bg-white text-[#00587a] rounded font-semibold hover:bg-gray-100 disabled:opacity-50"
          >
            {summaryLoading ? '로딩...' : '🔄 새로고침'}
          </button>
        </div>
      </div>

      {/* 모듈 탭 */}
      <div className="bg-white border-b border-gray-300 px-2 py-1 flex items-center gap-1 overflow-x-auto">
        {MODULES.map(mod => (
          <button
            key={mod.key}
            onClick={() => handleModuleChange(mod.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-colors whitespace-nowrap ${activeModule === mod.key
              ? `${mod.color} text-white`
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {mod.label}
          </button>
        ))}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 text-sm mx-4 mt-2 rounded">
          ❌ {error}
        </div>
      )}

      <div className="p-4">
        {/* 통계 요약 카드 */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-blue-500">
            <div className="text-xl font-bold text-blue-600">{totalTables}</div>
            <div className="text-xs text-gray-500">{activeModule} 테이블</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-green-500">
            <div className="text-xl font-bold text-green-600">{tablesWithData}</div>
            <div className="text-xs text-gray-500">데이터 있음</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-purple-500">
            <div className="text-xl font-bold text-purple-600">{totalColumns}</div>
            <div className="text-xs text-gray-500">총 컬럼 수</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-orange-500">
            <div className="text-xl font-bold text-orange-600">{totalRows.toLocaleString()}</div>
            <div className="text-xs text-gray-500">총 데이터</div>
          </div>
        </div>

        <div className="flex gap-4">
          {/* 좌측: 테이블 목록 */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className={`${MODULES.find(m => m.key === activeModule)?.color || 'bg-gray-700'} text-white px-3 py-2 text-sm font-bold`}>
                📋 {activeModule} 테이블 ({totalTables}개)
              </div>
              <div className="max-h-[calc(100vh-320px)] overflow-auto">
                {summaryLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                    <p className="text-xs">로딩 중...</p>
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold border-b">테이블</th>
                        <th className="px-2 py-1.5 text-center font-semibold border-b w-12">컬럼</th>
                        <th className="px-2 py-1.5 text-center font-semibold border-b w-14">누락</th>
                        <th className="px-2 py-1.5 text-center font-semibold border-b w-14">데이터</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableSummaries.map((t, idx) => (
                        <tr
                          key={t.table}
                          onClick={() => handleTableSelect(t.table)}
                          className={`cursor-pointer transition-colors ${selectedTable === t.table
                            ? 'bg-blue-100'
                            : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                        >
                          <td className="px-2 py-2 border-b">
                            <div className="flex flex-col">
                              {activeModule === '전체' && (
                                <span className={`text-[9px] px-1 py-0.5 rounded w-fit mb-0.5 ${CATEGORY_COLORS[t.category] || 'bg-gray-100'}`}>
                                  {t.category}
                                </span>
                              )}
                              <span className="font-semibold text-gray-800 text-[11px]">{t.label}</span>
                              <span className="font-mono text-[9px] text-blue-600">{t.table}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 border-b text-center">
                            {t.status === 'loading' ? '...' : t.status === 'error' ? '-' : t.columns}
                          </td>
                          <td className="px-2 py-2 border-b text-center">
                            {t.status === 'loading' ? '...' : t.status === 'error' ? (
                              <span className="text-red-500">-</span>
                            ) : t.missingCount !== undefined ? (
                              t.missingCount === 0 ? (
                                <span className="text-green-600 font-semibold">0</span>
                              ) : t.missingCount === t.rows * t.columns ? (
                                <span className="text-red-600 font-semibold">{t.missingCount}</span>
                              ) : (
                                <span className="text-orange-600 font-semibold">{t.missingCount}</span>
                              )
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-2 py-2 border-b text-center">
                            {t.status === 'loading' ? '...' : t.status === 'error' ? (
                              <span className="text-red-500">-</span>
                            ) : t.rows > 0 ? (
                              <span className="text-green-600 font-semibold">{t.rows}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* 우측: 테이블 데이터 */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-700 text-white px-3 py-2 text-sm font-bold flex items-center justify-between">
                <span>
                  📊 테이블 데이터
                  {selectedTable && <span className="ml-2 font-mono text-yellow-300">{selectedTable}</span>}
                  {selectedProjectId && (
                    <span className="ml-2 px-2 py-0.5 bg-cyan-500 text-white text-[10px] rounded">
                      🔍 {selectedProjectId}
                    </span>
                  )}
                </span>
                {tableData && (
                  <span className="text-xs text-white/70">
                    {tableData.columns.length}개 컬럼 / {tableData.data.length}건
                    {selectedProjectId && ' (필터됨)'}
                  </span>
                )}
              </div>

              <div className="overflow-auto max-h-[calc(100vh-320px)]">
                {!selectedTable ? (
                  <div className="text-center py-16 text-gray-400">
                    <span className="text-4xl">👈</span>
                    <p className="mt-2 text-sm">좌측에서 테이블을 선택하세요</p>
                  </div>
                ) : loading ? (
                  <div className="text-center py-16 text-gray-500">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                    <p className="text-sm">데이터 로딩 중...</p>
                  </div>
                ) : tableData && tableData.data.length > 0 ? (
                  (() => {
                    // 각 컬럼별 누락 개수 계산
                    const missingCounts = tableData.columns.map(col => {
                      return tableData.data.filter(row => {
                        const value = row[col];
                        return value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');
                      }).length;
                    });

                    return (
                      <table className="w-full border-collapse text-xs">
                        <thead className="sticky top-0 bg-gray-200 z-10">
                          <tr>
                            <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-300 font-bold w-8">#</th>
                            {tableData.columns.map((col, colIdx) => (
                              <th key={col} className="border border-gray-300 px-2 py-1.5 text-center bg-gray-200 font-semibold whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <span>{col}</span>
                                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${missingCounts[colIdx] === 0
                                    ? 'bg-green-100 text-green-700'
                                    : missingCounts[colIdx] === tableData.data.length
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    누락: {missingCounts[colIdx]}
                                  </span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.data.map((row, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-2 py-1 text-center text-gray-500 font-mono">{idx + 1}</td>
                              {tableData.columns.map(col => (
                                <td key={col} className="border border-gray-300 px-2 py-1 whitespace-nowrap" title={String(row[col] || '')}>
                                  {formatValue(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <span className="text-4xl">📭</span>
                    <p className="mt-2 text-sm">데이터가 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="bg-gray-200 border-t border-gray-300 px-4 py-1 text-xs text-gray-600 flex justify-between">
        <span>💡 TIP: 테이블을 클릭하면 데이터를 볼 수 있습니다. | 선택된 프로젝트: {selectedProjectId || '전체'}</span>
        <span>Schema: public | Module: {activeModule} | 전체: {allTablesCount}개 테이블</span>
      </div>

      {/* 프로젝트 선택 모달 */}
      {showProjectModal && (
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
          style={{ left: projPos.x, top: projPos.y, width: projSize.w, height: projSize.h }}>
          <div className="bg-[#00587a] text-white px-4 py-3 flex items-center justify-between rounded-t-lg cursor-move" onMouseDown={projDragStart}>
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h2 className="font-bold">프로젝트 선택</h2>
                <span className="text-xs text-white/70">
                  {PROJECT_TYPES.find(t => t.key === selectedProjectType)?.label || '전체'}
                </span>
              </div>
              <button onClick={() => setShowProjectModal(false)} className="text-white/70 hover:text-white text-xl">✕</button>
            </div>

            {/* 프로젝트 유형 탭 */}
            <div className="bg-gray-100 px-2 py-2 flex flex-wrap gap-1 border-b">
              {PROJECT_TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleProjectTypeChange(t.key)}
                  className={`px-3 py-1 text-xs rounded font-semibold ${selectedProjectType === t.key
                    ? 'bg-[#00587a] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* 프로젝트 목록 */}
            <div className="flex-1 overflow-y-auto">
              {/* 전체 (필터 해제) 옵션 */}
              <div
                onClick={() => handleProjectSelect('')}
                className={`px-4 py-3 border-b cursor-pointer hover:bg-blue-50 ${!selectedProjectId ? 'bg-blue-100' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <div>
                    <div className="font-semibold text-sm">전체 (필터 없음)</div>
                    <div className="text-xs text-gray-500">모든 프로젝트 데이터 표시</div>
                  </div>
                </div>
              </div>

              {selectedProjectType === 'all' ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-2xl">👆</span>
                  <p className="mt-2 text-sm">프로젝트 유형을 선택해주세요</p>
                </div>
              ) : projectList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-2xl">📭</span>
                  <p className="mt-2 text-sm">{selectedProjectType} 프로젝트가 없습니다</p>
                </div>
              ) : (
                projectList.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => handleProjectSelect(p.id)}
                    className={`px-4 py-3 border-b cursor-pointer hover:bg-blue-50 ${selectedProjectId === p.id ? 'bg-blue-100' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm text-blue-600">{p.id}</div>
                        <div className="text-xs text-gray-600">{p.name || '(이름 없음)'}</div>
                      </div>
                      {p.status && (
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-600">
                          {p.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-t flex-shrink-0">
              <span className="text-xs text-gray-500">
                {projectList.length}개 프로젝트
              </span>
              <button
                onClick={() => setShowProjectModal(false)}
                className="px-4 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                닫기
              </button>
            </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={projResizeStart} title="크기 조절">
            <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
              <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
