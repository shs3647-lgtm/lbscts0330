/**
 * @file page.tsx
 * @description PFMEA 등록 페이지 (리팩토링 버전)
 * @version 11.0.0
 * @updated 2026-02-10 페이지 분리 리팩토링 (1552행 → 700행 이하)
 *
 * 분리된 파일:
 * - types.ts: FMEAInfo, FMEAType, FMEASelectType, INITIAL_FMEA
 * - utils.ts: generateFMEAIdFromDB, syncToLocalStorage
 * - hooks/useRegisterPageCore.ts: 상태 선언 + useEffect
 * - hooks/useRegisterPageHandlers.ts: 모든 핸들러 함수
 * - components/FmeaNameModal.tsx: FMEA명 선택/중복 방지 모달
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v4.0.0-gold L4 — 이 파일을 수정하지 마세요!  ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
// ✅ xlsx/xlsx-js-style: dynamic import — 모달 렌더 시점에 로드 (초기 번들 제외)
const BizInfoSelectModal = dynamic(
  () => import('@/components/modals/BizInfoSelectModal').then(mod => ({ default: mod.BizInfoSelectModal })),
  { ssr: false }
);
const UserSelectModal = dynamic(
  () => import('@/components/modals/UserSelectModal').then(mod => ({ default: mod.UserSelectModal })),
  { ssr: false }
);
import { FmeaSelectModal } from '@/components/modals/FmeaSelectModal';
// ApqpSelectModal 삭제됨 (APQP 모듈 제거)
import { DatePickerModal } from '@/components/DatePickerModal';
import { CFTAccessLogTable } from '@/components/tables/CFTAccessLogTable';
import { CFTRegistrationTable, createInitialCFTMembers } from '@/components/tables/CFTRegistrationTable';
import { BizInfoProject } from '@/types/bizinfo';
import PFMEATopNav from '@/components/layout/PFMEATopNav';
import { FixedLayout } from '@/components/layout';
import { getAIStatus } from '@/lib/ai-recommendation';
import { LinkageModal } from '@/components/linkage/LinkageModal';
import CreateDocumentModal from '@/components/modals/CreateDocumentModal';
import AlertModal from '@/components/modals/AlertModal';
import { FmeaNameModal } from './components/FmeaNameModal';
import { RegisterHelpPanel, type HelpSection } from './components/RegisterHelpPanel';
import { generateFMEAIdFromDB } from './utils';
import { FMEAType } from './types';
import { useRegisterPageCore } from './hooks/useRegisterPageCore';
import { useRegisterPageHandlers } from './hooks/useRegisterPageHandlers';
import { useTemplateGenerator } from '@/app/(fmea-core)/pfmea/import/hooks/useTemplateGenerator';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { BdStatusItem, FMEAProject as ImportFMEAProject } from '@/app/(fmea-core)/pfmea/import/components/ImportPageTypes';

// ★ Heavy import modules → dynamic/lazy loading (컴파일 성능 최적화)
const TemplateGeneratorPanel = dynamic(
  () => import('@/app/(fmea-core)/pfmea/import/components').then(mod => ({ default: mod.TemplateGeneratorPanel })),
  { ssr: false, loading: () => <div className="p-4 text-xs text-gray-400">기초정보 템플릿 로딩 중...</div> }
);
const BdStatusTable = dynamic(
  () => import('@/app/(fmea-core)/pfmea/import/components/BdStatusTable').then(mod => ({ default: mod.BdStatusTable })),
  { ssr: false, loading: () => <div className="p-4 text-xs text-gray-400">BD 현황 로딩 중...</div> }
);

// ★ Heavy utility functions → lazy import helpers
const getMasterApi = () => import('@/app/(fmea-core)/pfmea/import/utils/master-api');
const getExcelTemplate = () => import('@/app/(fmea-core)/pfmea/import/excel-template');
const getMasterDataHandlers = () => import('@/app/(fmea-core)/pfmea/import/hooks/useMasterDataHandlers');



// =====================================================
// 메인 컴포넌트
// =====================================================
function PFMEARegisterPageContent() {
  const core = useRegisterPageCore();
  const handlers = useRegisterPageHandlers(core);

  const {
    user, router, editId, revParam, isEditMode, isRevisionMode,
    fmeaInfo, setFmeaInfo, fmeaId, setFmeaId,
    cftMembers, setCftMembers, saveStatus, accessLogs,
    bizInfoModalOpen, setBizInfoModalOpen,
    userModalOpen, setUserModalOpen, userModalTarget, setUserModalTarget,
    selectedMemberIndex, setSelectedMemberIndex,
    roleSearchTerm, setRoleSearchTerm,
    startDateModalOpen, setStartDateModalOpen,
    revisionDateModalOpen, setRevisionDateModalOpen,
    fmeaSelectModalOpen, setFmeaSelectModalOpen, fmeaSelectType,
    availableFmeas, selectedBaseFmea, setSelectedBaseFmea,
    masterDataCount,
    apqpModalOpen, setApqpModalOpen, apqpList,
    selectedParentApqp,
    fmeaNameModalOpen, setFmeaNameModalOpen, fmeaNameList,
    duplicateWarning,
    linkageModalOpen, setLinkageModalOpen,
    linkedPfdList, linkedCpList,
    isCreateModalOpen, setIsCreateModalOpen,
    cachedProjects,
    showMasterReview, setShowMasterReview,
    tripletInfo,
  } = core;

  const {
    updateField, handlePartNameChange,
    handleAddLinkedDoc, handleRemoveLinkedDoc, handleToggleLinkage,
    openFmeaSelectModal, handleFmeaSelect,
    loadApqpList, handleApqpSelect,
    handleSave, handleNewRegister, handleUserSelect,
    loadFmeaNameList, handleFmeaNameChange,
    cftAlertRoles, setCftAlertRoles,
  } = handlers;


  // AI 상태 & 도움말
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [helpSection, setHelpSection] = useState<HelpSection | null>(null);
  useEffect(() => { setAiStatus(getAIStatus()); }, []);

  // ★ 2026-02-18: 기초정보 템플릿 생성기
  const [flatData, setFlatData] = useState<ImportedFlatData[]>([]);
  const [bdDatasetId, setBdDatasetId] = useState<string | null>(null);
  const [bdIsSaved, setBdIsSaved] = useState(false);
  const [bdIsSaving, setBdIsSaving] = useState(false);
  const [bdDirty, setBdDirty] = useState(false);
  const [bdPreviewCol, setBdPreviewCol] = useState('A2');
  // ★ isAnalysisImporting/isAnalysisComplete → useImportSteps 훅 내부로 이전 (2026-02-21)
  const [bdLoadedFmeaId, setBdLoadedFmeaId] = useState<string | null>(null);
  const [bdLoadedFmeaName, setBdLoadedFmeaName] = useState<string>('');
  const [bdExpandTrigger, setBdExpandTrigger] = useState(0);
  const bdFileInputRef = useRef<HTMLInputElement>(null);
  const templateGen = useTemplateGenerator({ setFlatData, setPreviewColumn: setBdPreviewCol, setDirty: setBdDirty, setIsSaved: setBdIsSaved });

  // ★ 2026-02-20: BD 현황 테이블 데이터
  const [bdStatusList, setBdStatusList] = useState<BdStatusItem[]>([]);
  const [bdFmeaList, setBdFmeaList] = useState<ImportFMEAProject[]>([]);
  // ★ BD 유형 필터 + 선택 모달
  const [bdTypeFilter, setBdTypeFilter] = useState<'ALL' | 'M' | 'F' | 'P'>('ALL');
  const [bdSelectModal, setBdSelectModal] = useState<{ open: boolean; type: 'M' | 'F' | 'P'; candidates: BdStatusItem[] }>({ open: false, type: 'P', candidates: [] });
  const [masterBdCount, setMasterBdCount] = useState(0);
  const [partBdCount, setPartBdCount] = useState(0);

  // ★ Master/Part FMEA BD 카운트 로드
  useEffect(() => {
    fetch('/api/master-fmea/bd-list').then(r => r.json()).then(d => {
      setMasterBdCount((d.masters || []).length);
    }).catch(() => {});
    fetch('/api/part-fmea/bd-list').then(r => r.json()).then(d => {
      setPartBdCount((d.items || []).length);
    }).catch(() => {});
  }, []);

  // ★ 2026-02-20: BD 현황 데이터 로드 (★ 성능 개선: hook 캐시 재사용, 중복 API 제거)
  useEffect(() => {
    if (cachedProjects.length === 0) return; // hook에서 프로젝트 로드 완료 대기
    (async () => {
      try {
        const projects: ImportFMEAProject[] = cachedProjects.map((p: any) => ({
          id: p.id, fmeaNo: p.fmeaNo || p.id, fmeaType: p.fmeaType,
          fmeaInfo: p.fmeaInfo, project: p.project,
          parentFmeaId: p.parentFmeaId || null, parentFmeaType: p.parentFmeaType || null,
          revisionNo: p.revisionNo,
        }));
        setBdFmeaList(projects);
        const { loadAllDatasetSummaries } = await getMasterApi();
        const { buildBdStatusList } = await getMasterDataHandlers();
        const { summaries, deletedFmeaIds } = await loadAllDatasetSummaries();
        const activeProjects = projects.filter(p => !deletedFmeaIds.includes(p.id.toLowerCase()));
        setBdFmeaList(activeProjects);
        setBdStatusList(buildBdStatusList(activeProjects, summaries));
      } catch (e) { console.error('BD 현황 로드 오류:', e); }
    })();
  }, [cachedProjects]);

  // fmeaId 변경 시 기초정보 데이터 로드
  useEffect(() => {
    if (!fmeaId) return;
    getMasterApi().then(({ loadDatasetByFmeaId }) =>
      loadDatasetByFmeaId(fmeaId).then(res => {
        if (res.datasetId) setBdDatasetId(res.datasetId);
        if (res.flatData.length > 0) {
          setFlatData(res.flatData); setBdIsSaved(true);
          setBdLoadedFmeaId(fmeaId);
        }
      })
    ).catch(e => { console.error('[기초정보 로드] 오류:', e); });
  }, [fmeaId]);

  // bdLoadedFmeaId가 현재 fmeaId와 같을 때 fmeaInfo.subject로 이름 갱신
  useEffect(() => {
    if (bdLoadedFmeaId === fmeaId) {
      const name = fmeaInfo.subject || fmeaInfo.partName || '';
      if (name) setBdLoadedFmeaName(name);
    }
  }, [bdLoadedFmeaId, fmeaId, fmeaInfo.subject, fmeaInfo.partName]);

  // M/F/P 버튼 클릭 → BD 목록에서 해당 유형 찾아서 로드
  const handleLoadBdForType = async (type: 'M' | 'F' | 'P') => {
    // BD 테이블 필터도 연동
    setBdTypeFilter(type);

    if (type === 'P') {
      // Part: 현재 FMEA의 BD 직접 로드
      const targetId = fmeaId || null;
      if (!targetId) { alert('Part FMEA가 선택되지 않았습니다.'); return; }
      try {
        const { loadDatasetByFmeaId } = await getMasterApi();
        const res = await loadDatasetByFmeaId(targetId);
        if (res.flatData.length > 0) {
          setFlatData(res.flatData);
          setBdIsSaved(true); setBdDirty(false);
          setBdLoadedFmeaId(targetId);
          setBdLoadedFmeaName(fmeaInfo.subject || fmeaId || '');
          templateGen.setTemplateMode('download');
          setBdExpandTrigger(prev => prev + 1);
        }
      } catch (e) { console.error('[BD 로드] 오류:', e); }
      return;
    }

    // Master: 새 MasterFmea 시스템에서 조회
    if (type === 'M') {
      try {
        const res = await fetch('/api/master-fmea/bd-list');
        const data = await res.json();
        const masters = data.masters || [];
        if (masters.length === 0) {
          alert('Master FMEA가 등록되어 있지 않습니다.\n먼저 Master FMEA를 등록하세요.');
          return;
        }
        if (masters.length === 1) {
          const m = masters[0];
          await loadBdById(m.fmeaId, m.name);
          return;
        }
        // 2개 이상이면 선택 모달 표시
        setBdSelectModal({
          open: true, type: 'M',
          candidates: masters.map((m: any) => ({ fmeaId: m.fmeaId, fmeaName: m.name, fmeaType: 'M' })),
        });
      } catch (e) { console.error('[Master BD 로드] 오류:', e); }
      return;
    }

    // Family: Master와 동일한 방식으로 BD 로드 (모든 공정 통합)
    if (type === 'F') {
      try {
        const res = await fetch('/api/master-fmea/bd-list');
        const data = await res.json();
        const masters = data.masters || [];
        if (masters.length === 0) {
          alert('Master FMEA가 등록되어 있지 않습니다.\n먼저 Master FMEA를 등록하세요.');
          return;
        }
        if (masters.length === 1) {
          await loadBdById(masters[0].fmeaId, masters[0].name);
          return;
        }
        setBdSelectModal({
          open: true, type: 'F',
          candidates: masters.map((m: any) => ({ fmeaId: m.fmeaId, fmeaName: m.name, fmeaType: 'F' })),
        });
      } catch (e) { console.error('[Family BD 로드] 오류:', e); }
      return;
    }

    // Part: 새 PartFmea 시스템에서 조회
    try {
      const res = await fetch('/api/part-fmea/bd-list');
      const data = await res.json();
      const items = data.items || [];
      if (items.length === 0) {
        // 기존 Part BD 로드 (현재 fmeaId 기반)
        const targetId = fmeaId || null;
        if (!targetId) { alert('Part FMEA가 선택되지 않았습니다.'); return; }
        try {
          const { loadDatasetByFmeaId } = await getMasterApi();
          const bdRes = await loadDatasetByFmeaId(targetId);
          if (bdRes.flatData.length > 0) {
            setFlatData(bdRes.flatData);
            setBdIsSaved(true); setBdDirty(false);
            setBdLoadedFmeaId(targetId);
            setBdLoadedFmeaName(fmeaInfo.subject || fmeaId || '');
            templateGen.setTemplateMode('download');
            setBdExpandTrigger(prev => prev + 1);
          }
        } catch (e2) { console.error('[Part BD 폴백 로드] 오류:', e2); }
        return;
      }
      if (items.length === 1) {
        await loadBdById(items[0].sourceFmeaId || items[0].fmeaId, items[0].name);
        return;
      }
      setBdSelectModal({
        open: true, type: 'P',
        candidates: items.map((p: any) => ({ fmeaId: p.sourceFmeaId || p.fmeaId, fmeaName: p.name, fmeaType: 'P' })),
      });
    } catch (e) { console.error('[Part BD 로드] 오류:', e); }
  };

  // BD 선택 모달에서 선택 후 로드
  const loadBdById = async (targetId: string, targetName: string) => {
    try {
      const { loadDatasetByFmeaId } = await getMasterApi();
      const res = await loadDatasetByFmeaId(targetId);
      if (res.flatData.length > 0) {
        setFlatData(res.flatData);
        setBdIsSaved(true); setBdDirty(false);
        setBdLoadedFmeaId(targetId);
        setBdLoadedFmeaName(targetName);
        templateGen.setTemplateMode('download');
        setBdExpandTrigger(prev => prev + 1);
      } else {
        alert('해당 BD에 데이터가 없습니다.');
      }
    } catch { alert('BD 데이터 로드에 실패했습니다.'); }
  };

  const handleBdSave = async () => {
    if (!fmeaId) return;
    setBdIsSaving(true);
    try {
      const { saveMasterDataset } = await getMasterApi();
      const res = await saveMasterDataset({ fmeaId, fmeaType: 'P', datasetId: bdDatasetId, name: 'MASTER', replace: true, flatData });
      if (res.ok) { if (res.datasetId) setBdDatasetId(res.datasetId); setBdIsSaved(true); setBdDirty(false); }
    } catch (e) { console.error('[BD 저장] 오류:', e); } finally { setBdIsSaving(false); }
  };

  // ★ BD 현황 테이블에서 선택 삭제 (soft delete)
  const handleBdDeleteDatasets = async (fmeaIds: string[]) => {
    try {
      const res = await fetch('/api/pfmea/master', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaIds, action: 'softDelete' }),
      });
      const result = await res.json();
      if (!result.success) {
        alert('삭제 실패: ' + (result.error || ''));
        return;
      }
    } catch (e) {
      alert('삭제 요청 실패');
      return;
    }
    // BD 현황 새로고침: 삭제된 FMEA를 프로젝트 목록에서도 제거
    const { loadAllDatasetSummaries } = await getMasterApi();
    const { buildBdStatusList } = await getMasterDataHandlers();
    const { summaries, deletedFmeaIds: allDeletedIds } = await loadAllDatasetSummaries();
    const updatedFmeaList = bdFmeaList.filter(f => !allDeletedIds.includes(f.id.toLowerCase()));
    setBdFmeaList(updatedFmeaList);
    setBdStatusList(buildBdStatusList(updatedFmeaList, summaries));
    // 현재 선택된 FMEA가 삭제 대상이면 초기화
    if (bdLoadedFmeaId && fmeaIds.includes(bdLoadedFmeaId)) {
      setFlatData([]); setBdLoadedFmeaId(''); setBdLoadedFmeaName(''); setBdDatasetId(null);
      setBdIsSaved(false); setBdDirty(false);
    }
  };

  const handleBdFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBdIsSaving(true);
    try {
      const { parseMultiSheetExcel } = await import('@/app/(fmea-core)/pfmea/import/excel-parser');
      const result = await parseMultiSheetExcel(file);
      if (result.success) {
        // ParseResult → ImportedFlatData[] 변환
        const flat: typeof flatData = [];
        result.processes.forEach((p) => {
          flat.push({ id: `${p.processNo}-A1`, processNo: p.processNo, category: 'A', itemCode: 'A1', value: p.processNo, createdAt: new Date() });
          flat.push({ id: `${p.processNo}-A2`, processNo: p.processNo, category: 'A', itemCode: 'A2', value: p.processName, createdAt: new Date() });
          if (p.processTypeCode) {
            flat.push({ id: `${p.processNo}-A0`, processNo: p.processNo, category: 'A', itemCode: 'A0', value: p.processTypeCode, createdAt: new Date() });
          }
          p.processDesc.forEach((v, i) => flat.push({ id: `${p.processNo}-A3-${i}`, processNo: p.processNo, category: 'A', itemCode: 'A3', value: v, createdAt: new Date() }));
          p.productChars.forEach((v, i) => flat.push({ id: `${p.processNo}-A4-${i}`, processNo: p.processNo, category: 'A', itemCode: 'A4', value: v, specialChar: p.productCharsSpecialChar?.[i] || undefined, createdAt: new Date() }));
          p.failureModes.forEach((v, i) => flat.push({ id: `${p.processNo}-A5-${i}`, processNo: p.processNo, category: 'A', itemCode: 'A5', value: v, createdAt: new Date() }));
          p.workElements.forEach((v, i) => flat.push({ id: `${p.processNo}-B1-${i}`, processNo: p.processNo, category: 'B', itemCode: 'B1', value: v, m4: p.workElements4M?.[i] || '', createdAt: new Date() }));
          p.elementFuncs.forEach((v, i) => flat.push({ id: `${p.processNo}-B2-${i}`, processNo: p.processNo, category: 'B', itemCode: 'B2', value: v, m4: p.elementFuncs4M?.[i] || '', belongsTo: p.elementFuncsWE?.[i] || undefined, createdAt: new Date() }));
          p.processChars.forEach((v, i) => flat.push({ id: `${p.processNo}-B3-${i}`, processNo: p.processNo, category: 'B', itemCode: 'B3', value: v, m4: p.processChars4M?.[i] || '', specialChar: p.processCharsSpecialChar?.[i] || undefined, belongsTo: p.processCharsWE?.[i] || undefined, createdAt: new Date() }));
          p.failureCauses.forEach((v, i) => flat.push({ id: `${p.processNo}-B4-${i}`, processNo: p.processNo, category: 'B', itemCode: 'B4', value: v, m4: p.failureCauses4M?.[i] || '', createdAt: new Date() }));
        });
        result.products.forEach((p) => {
          const categoryValue = p.productProcessName || 'YP';
          flat.push({ id: `C1-${p.productProcessName}`, processNo: categoryValue, category: 'C', itemCode: 'C1', value: p.productProcessName, createdAt: new Date() });
          p.productFuncs.forEach((v, i) => flat.push({ id: `C2-${p.productProcessName}-${i}`, processNo: categoryValue, category: 'C', itemCode: 'C2', value: v, createdAt: new Date() }));
          p.requirements.forEach((v, i) => flat.push({ id: `C3-${p.productProcessName}-${i}`, processNo: categoryValue, category: 'C', itemCode: 'C3', value: v, createdAt: new Date() }));
          p.failureEffects.forEach((v, i) => flat.push({ id: `C4-${p.productProcessName}-${i}`, processNo: categoryValue, category: 'C', itemCode: 'C4', value: v, createdAt: new Date() }));
        });
        setFlatData(flat);
        setBdDirty(true);
        setBdIsSaved(false);
        // ★ 파일 Import 후: 수동/자동 모드에서 import한 경우 모드 유지, 기존데이터 모드에서만 download 유지
        if (templateGen.templateMode === 'download') {
          templateGen.setTemplateMode('download');
        }
      } else {
        alert('파일 파싱 실패: ' + (result.errors.join(', ') || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('파일 선택 오류:', err);
      alert('파일 처리 중 오류: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBdIsSaving(false);
      if (bdFileInputRef.current) bdFileInputRef.current.value = '';
    }
  };

  // ★ handleAnalysisImport → useImportSteps 훅 내부로 이전 (2026-02-21)
  // 3단계 확정(SA→FC→FA) 프로세스가 TemplateGeneratorPanel 내부에서 처리됨

  const openHelp = (section: HelpSection) => { setHelpSection(section); };
  const toggleHelp = () => { setHelpSection(prev => prev ? null : 'overview'); };

  const headerCell = "bg-[#00587a] text-white px-1 py-0.5 border border-white font-semibold text-[10px] text-center leading-tight";
  const inputCell = "border border-gray-300 px-1 py-0.5 overflow-hidden";

  return (
    <FixedLayout topNav={<PFMEATopNav selectedFmeaId={fmeaId} linkedCpNo={fmeaInfo.linkedCpNo} linkedPfdNo={fmeaInfo.linkedPfdNo} />} topNavHeight={48} showSidebar={true} contentPadding="pl-[5px] pr-2 py-2">
      <div className="font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isEditMode ? '✏️' : '📝'}</span>
            <h1 className="text-sm font-bold text-gray-800">PFMEA {isEditMode ? '수정(Edit)' : '등록(Register)'}</h1>
            {fmeaId && <span className="text-xs text-gray-500 ml-2">ID: {fmeaId}</span>}
            {isEditMode && !isRevisionMode && <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-bold">수정모드(Edit Mode)</span>}
            {isRevisionMode && <span className="px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded font-bold">개정모드(Revision Mode)</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleNewRegister} className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-semibold">➕ 새로 작성(Create)</button>
            <button onClick={() => {
              if (isEditMode) { alert('현재 편집 모드입니다. 테이블 필드를 직접 수정하세요.'); }
              else if (fmeaId) { router.push(`/pfmea/register?id=${fmeaId}`); }
              else { openFmeaSelectModal('LOAD'); }
            }} className={`px-3 py-1.5 text-white text-xs rounded font-semibold ${isEditMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-amber-500 hover:bg-amber-600'}`}>✏️ 편집(Edit)</button>
            <button onClick={handleSave} disabled={saveStatus === 'saving'} className={`px-4 py-1.5 text-xs font-bold rounded ${saveStatus === 'saving' ? 'bg-gray-300 text-gray-500' : saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {saveStatus === 'saving' ? '⏳ 저장 중...(Saving)' : saveStatus === 'saved' ? '✓ 저장됨(Saved)' : '💾 저장(Save)'}
            </button>
          </div>
        </div>

        {/* 도움말 팝업 */}
        <RegisterHelpPanel isOpen={helpSection !== null} onClose={() => setHelpSection(null)} initialSection={helpSection || undefined} />

        {/* ★ 개정모드 안내 배너 */}
        {isRevisionMode && fmeaId && (
          <div className="mb-3 px-4 py-3 rounded-lg border-2 bg-blue-50 border-blue-300">
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <div className="font-bold text-sm text-blue-700">
                  개정 모드 — {fmeaId}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  기존 FMEA 데이터가 복제되었습니다. 수정 후 저장하세요. 원본은 변경되지 않습니다.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 기획 및 준비 (1단계) */}
        <div className="bg-white rounded border border-gray-300 mb-3">
          <div className="bg-[#e3f2fd] px-3 py-1.5 border-b border-gray-300 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-800" title="Planning and Preparation (Step 1)">기획 및 준비 <span className="text-[10px] font-semibold text-gray-500">(Plan & Prep)</span> 1단계</h2>
            <button onClick={() => openHelp('fields')}
              className="px-1.5 py-0.5 bg-yellow-400 text-[#00587a] text-[9px] font-bold rounded hover:bg-yellow-300 transition-colors"
              title="필드 설명 도움말">
              도움말(Help)
            </button>
          </div>
          <form autoComplete="off" onSubmit={e => e.preventDefault()}>
            <table className="w-full border-collapse text-xs table-fixed">
              <colgroup>
                <col className="w-[9%]" /><col className="w-[16%]" /><col className="w-[9%]" /><col className="w-[16%]" />
                <col className="w-[9%]" /><col className="w-[16%]" /><col className="w-[9%]" /><col className="w-[16%]" />
              </colgroup>
              <tbody>
                {/* 1행: FMEA유형, FMEA명, FMEA ID, 상위FMEA */}
                <tr className="h-9">
                  <td className={headerCell}>FMEA 유형<br /><span className="text-[8px] font-normal opacity-70">(Type)</span></td>
                  <td className={inputCell}>
                    <select value={fmeaInfo.fmeaType} onChange={async (e) => {
                      const newType = e.target.value as FMEAType;
                      updateField('fmeaType', newType);
                      const currentIdType = fmeaId?.match(/pfm\d{2}-([mfp])/i)?.[1]?.toUpperCase() || '';
                      let currentId = fmeaId;
                      if (currentIdType !== newType) {
                        currentId = await generateFMEAIdFromDB(newType);
                        setFmeaId(currentId);
                        router.replace(`/pfmea/register?id=${currentId}`);
                      }
                      if (newType === 'M' && currentId) setSelectedBaseFmea(currentId);
                      else if (newType !== 'M') setSelectedBaseFmea(null);
                    }} className="w-full h-7 px-1 text-xs border border-gray-300 bg-white rounded font-semibold cursor-pointer">
                      <option value="M">M - Master</option>
                      <option value="F">F - Family</option>
                      <option value="P">P - Part</option>
                    </select>
                  </td>
                  <td className={headerCell}>FMEA명<br /><span className="text-[8px] font-normal opacity-70">(Name)</span></td>
                  <td className={`${inputCell} relative`}>
                    <div className="flex items-center gap-0.5 min-w-0">
                      <input type="text" value={fmeaInfo.subject} onChange={e => handleFmeaNameChange(e.target.value)} onFocus={() => loadFmeaNameList()} onPaste={e => { const text = e.clipboardData.getData('text/plain'); if (text) { e.preventDefault(); handleFmeaNameChange(text.replace(/[\r\n]/g, ' ').trim()); } }} className={`flex-1 min-w-0 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none ${duplicateWarning ? 'text-red-600' : ''}`} placeholder="시스템, 서브시스템 및/또는 구성품" />
                      <button onClick={() => { loadFmeaNameList(); setFmeaNameModalOpen(true); }} className="text-blue-500 hover:text-blue-700 shrink-0 text-xs" title="기존 FMEA 목록 보기">🔍</button>
                    </div>
                    {duplicateWarning && <div className="absolute -bottom-3.5 left-0 text-[9px] text-red-600 font-semibold z-10">{duplicateWarning}</div>}
                  </td>
                  <td className={headerCell}>FMEA ID</td>
                  <td className={inputCell}>
                    <div className="flex items-center gap-1">
                      <span className="px-2 text-xs font-semibold text-blue-600 cursor-pointer hover:underline hover:text-blue-700" onClick={() => router.push('/pfmea/list')} title="클릭하여 PFMEA 리스트로 이동">{fmeaId}</span>
                      {revParam && <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">{revParam}</span>}
                    </div>
                  </td>
                  <td className={`${headerCell} bg-yellow-600`}>상위 FMEA<br /><span className="text-[8px] font-normal opacity-70">(Parent)</span></td>
                  <td className={inputCell}>
                    <div className="flex items-center gap-1 px-1 cursor-pointer hover:bg-yellow-50 min-h-[28px] min-w-0 flex-wrap" onClick={() => openFmeaSelectModal('MF')} title="클릭하여 상위 FMEA 선택 (Master/Family)">
                      {selectedBaseFmea ? (<>
                        <span className="px-1 py-0.5 rounded text-[8px] font-bold text-white bg-yellow-500 shrink-0">FMEA</span>
                        <span className="text-[10px] font-semibold text-yellow-600 hover:underline break-all">{selectedBaseFmea}</span>
                      </>) : <span className="text-[10px] text-gray-400">-</span>}
                    </div>
                  </td>
                </tr>
                {/* 2행: 공정책임, FMEA담당자, 시작일자, 연동CP */}
                <tr className="h-9">
                  <td className={headerCell}>공정 책임<br /><span className="text-[8px] font-normal opacity-70">(Responsibility)</span></td>
                  <td className={inputCell}>
                    <div className="flex items-center gap-0.5 min-w-0">
                      <input type="text" name="dept_no_autocomplete" value={fmeaInfo.designResponsibility} onChange={e => updateField('designResponsibility', e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} data-form-type="other" className="flex-1 min-w-0 h-7 px-1 text-xs border-0 bg-transparent focus:outline-none truncate" placeholder="부서(Department)" />
                      <button onClick={() => { setUserModalTarget('design'); setUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700 shrink-0 text-xs">🔍</button>
                    </div>
                  </td>
                  <td className={headerCell}>FMEA 담당자<br /><span className="text-[8px] font-normal opacity-70">(Owner)</span></td>
                  <td className={inputCell}>
                    <div className="flex items-center gap-0.5 min-w-0">
                      <input type="text" name="manager_no_autocomplete" value={fmeaInfo.fmeaResponsibleName} onChange={e => {
                        updateField('fmeaResponsibleName', e.target.value);
                        setCftMembers(prev => prev.map(m => m.role === 'Leader' ? { ...m, name: e.target.value } : m));
                      }} autoComplete="off" autoCorrect="off" spellCheck={false} data-form-type="other" className="flex-1 min-w-0 h-7 px-1 text-xs border-0 bg-transparent focus:outline-none truncate" placeholder="담당자 성명(Name)" />
                      <button onClick={() => { setUserModalTarget('responsible'); setUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700 shrink-0 text-xs">🔍</button>
                    </div>
                  </td>
                  <td className={headerCell}>시작 일자<br /><span className="text-[8px] font-normal opacity-70">(Start Date)</span></td>
                  <td className={inputCell}><input type="text" readOnly value={fmeaInfo.fmeaStartDate} onClick={() => setStartDateModalOpen(true)} className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder="클릭하여 선택" /></td>
                  <td className={`${headerCell} bg-teal-700`}>연동 CP<br /><span className="text-[8px] font-normal opacity-70">(Linked)</span></td>
                  <td className={inputCell}>
                    <div className="flex items-center gap-0.5 px-1 min-h-[28px]">
                      {fmeaInfo.linkedCpNo ? (
                        <div className="flex-1 flex items-center gap-0.5 cursor-pointer hover:opacity-80" onClick={() => router.push(`/control-plan/register?id=${fmeaInfo.linkedCpNo}`)} title="CP 등록화면으로 이동">
                          <span className="px-1 py-0.5 rounded text-[8px] font-bold text-white bg-teal-500">CP</span>
                          <span className="text-[10px] font-semibold text-teal-700 hover:underline">{fmeaInfo.linkedCpNo}</span>
                        </div>
                      ) : (
                        <span className="flex-1 text-[10px] text-gray-400">-</span>
                      )}
                      <button onClick={() => setLinkageModalOpen(true)} className="text-teal-500 hover:text-teal-700 shrink-0 text-xs" title="연동 CP 설정">🔗</button>
                    </div>
                  </td>
                </tr>
                {/* 3행: 고객명, 엔지니어링위치, 목표완료일, 연동PFD */}
                <tr className="h-9">
                  <td className={headerCell}>고객 명<br /><span className="text-[8px] font-normal opacity-70">(Customer)</span></td>
                  <td className={inputCell}>
                    <div className="flex items-center gap-0.5 min-w-0">
                      <input type="text" name="customer_no_autocomplete" value={fmeaInfo.customerName} onChange={e => updateField('customerName', e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} data-form-type="other" className="flex-1 min-w-0 h-7 px-1 text-xs border-0 bg-transparent focus:outline-none truncate" placeholder="고객 명" />
                      <select
                        value={fmeaInfo.customerIndustry || ''}
                        onChange={e => updateField('customerIndustry', e.target.value)}
                        className="h-7 px-0.5 text-[9px] border border-gray-300 rounded bg-white cursor-pointer shrink-0"
                        title="고객사 분류 (SC 기호 필터)"
                      >
                        <option value="">SC분류</option>
                        <option value="자사">자사</option>
                        <option value="LBS">LBS</option>
                        <option value="현대기아">현대/기아</option>
                        <option value="FORD">FORD</option>
                        <option value="BMW">BMW</option>
                      </select>
                      <button onClick={() => setBizInfoModalOpen(true)} className="text-blue-500 hover:text-blue-700 shrink-0 text-xs">🔍</button>
                    </div>
                  </td>
                  <td className={headerCell}>엔지니어링 위치<br /><span className="text-[8px] font-normal opacity-70">(Location)</span></td>
                  <td className={inputCell}><input type="text" value={fmeaInfo.engineeringLocation} onChange={e => updateField('engineeringLocation', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="위치(Location)" /></td>
                  <td className={headerCell}>목표완료일<br /><span className="text-[8px] font-normal opacity-70">(Target Date)</span></td>
                  <td className={inputCell}><input type="text" readOnly value={fmeaInfo.fmeaRevisionDate} onClick={() => setRevisionDateModalOpen(true)} className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder="클릭하여 선택" /></td>
                  <td className={`${headerCell} bg-indigo-700`}>연동 PFD<br /><span className="text-[8px] font-normal opacity-70">(Linked)</span></td>
                  <td className={inputCell}>
                    <div className="flex items-center gap-0.5 px-1 min-h-[28px]">
                      {fmeaInfo.linkedPfdNo ? (
                        <div className="flex-1 flex items-center gap-0.5 cursor-pointer hover:opacity-80" onClick={() => router.push(`/pfd/register?id=${fmeaInfo.linkedPfdNo}`)} title="PFD 등록화면으로 이동">
                          <span className="px-1 py-0.5 rounded text-[8px] font-bold text-white bg-indigo-500">PFD</span>
                          <span className="text-[10px] font-semibold text-indigo-700 hover:underline">{fmeaInfo.linkedPfdNo}</span>
                        </div>
                      ) : (
                        <span className="flex-1 text-[10px] text-gray-400">-</span>
                      )}
                      <button onClick={() => setLinkageModalOpen(true)} className="text-indigo-500 hover:text-indigo-700 shrink-0 text-xs" title="연동 PFD 설정">🔗</button>
                    </div>
                  </td>
                </tr>
                {/* Triplet 상태 행 (Triplet 연동 시만 표시) */}
                {tripletInfo && (
                <tr className="h-8 bg-gradient-to-r from-purple-50 to-blue-50">
                  <td className="px-2 py-1 text-[10px] font-bold text-purple-700 border border-gray-200 bg-purple-100" colSpan={2}>
                    Triplet [{tripletInfo.typeCode.toUpperCase()}] {tripletInfo.id}
                  </td>
                  <td className="px-2 py-1 text-[10px] border border-gray-200" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-600">CP:</span>
                      {tripletInfo.cpId ? (
                        <span className="text-teal-700 font-semibold cursor-pointer hover:underline" onClick={() => router.push(`/control-plan/register?id=${tripletInfo.cpId}`)}>{tripletInfo.cpId}</span>
                      ) : (
                        <span className="text-gray-400 italic">Lazy (미생성)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1 text-[10px] border border-gray-200" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-600">PFD:</span>
                      {tripletInfo.pfdId ? (
                        <span className="text-indigo-700 font-semibold cursor-pointer hover:underline" onClick={() => router.push(`/pfd/register?id=${tripletInfo.pfdId}`)}>{tripletInfo.pfdId}</span>
                      ) : (
                        <span className="text-gray-400 italic">Lazy (미생성)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1 text-[10px] border border-gray-200" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-600">하위:</span>
                      <span className="text-blue-700">{tripletInfo.children.length}개 Part 세트</span>
                      <span className={`px-1 py-0.5 rounded text-[8px] font-bold text-white ${
                        tripletInfo.syncStatus === 'synced' ? 'bg-green-500' :
                        tripletInfo.syncStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>{tripletInfo.syncStatus}</span>
                    </div>
                  </td>
                </tr>
                )}
                {/* 4행: 회사명, 모델연식, 품명 */}
                <tr className="h-9">
                  <td className={headerCell}>회사 명<br /><span className="text-[8px] font-normal opacity-70">(Company)</span></td>
                  <td className={inputCell}>
                    <span className="w-full h-7 px-2 text-xs flex items-center">LBS</span>
                  </td>
                  <td className={headerCell}>모델 연식<br /><span className="text-[8px] font-normal opacity-70">(Model Year)</span></td>
                  <td className={inputCell}><input type="text" value={fmeaInfo.modelYear} onChange={e => updateField('modelYear', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="어플리케이션" /></td>
                  <td className={headerCell}>품명<br /><span className="text-[8px] font-normal opacity-70">(Part Name)</span></td>
                  <td className={inputCell}>
                    <input type="text" value={fmeaInfo.partName} onChange={e => handlePartNameChange(e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="고객사 품명" />
                  </td>
                  <td className={headerCell}>기밀수준<br /><span className="text-[8px] font-normal opacity-70">(Confidential)</span></td>
                  <td className={inputCell}>
                    <select value={fmeaInfo.confidentialityLevel} onChange={e => updateField('confidentialityLevel', e.target.value)} className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none">
                      <option value="">선택(Select)</option><option value="사업용도">사업용도(Business)</option><option value="독점">독점(Proprietary)</option><option value="기밀">기밀(Confidential)</option>
                    </select>
                  </td>
                </tr>
                {/* 5행: 품번, 상호기능팀(넓게) */}
                <tr className="h-9">
                  <td className={headerCell}>품번<br /><span className="text-[8px] font-normal opacity-70">(Part No.)</span></td>
                  <td className={inputCell}><input type="text" value={fmeaInfo.partNo} onChange={e => updateField('partNo', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="품번" /></td>
                  <td className={headerCell}>상호기능팀<br /><span className="text-[8px] font-normal opacity-70">(CFT)</span></td>
                  <td className={inputCell} colSpan={5}>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="flex-1 text-xs text-gray-700 px-2 truncate">{cftMembers.filter(m => m.name?.trim()).map(m => m.name).join(', ') || '-'}</span>
                      <button onClick={() => document.getElementById('cft-section')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-500 hover:text-blue-700 shrink-0 text-[10px] font-semibold px-1" title="CFT 섹션으로 이동">CFT 추가</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
        </div>

        {/* FMEA 기초정보 등록 옵션 */}
        <div className="mt-6 mb-3">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr className="h-8">
                <td className="w-[15%] bg-[#00587a] text-white px-1 py-1.5 border border-gray-400 font-bold text-center whitespace-nowrap">
                  <span className="text-[11px]" title="FMEA Basic Info Registration">FMEA 기초 정보등록(Basic Info)</span>
                  <button onClick={(e) => { e.stopPropagation(); openHelp('mfp'); }} className="ml-1 px-1.5 py-0.5 bg-yellow-400 text-[#00587a] text-[9px] font-bold rounded hover:bg-yellow-300 transition-colors" title="M/F/P 구조 도움말">도움말(Help)</button>
                </td>
                {([
                  { type: 'M' as const, label: 'Master', count: masterBdCount,
                    loaded: 'bg-blue-700 text-white', filtered: 'bg-blue-100 text-blue-800 ring-2 ring-blue-400 ring-inset', idle: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                  { type: 'F' as const, label: 'Family', count: masterBdCount,
                    loaded: 'bg-blue-600 text-white', filtered: 'bg-blue-100 text-blue-800 ring-2 ring-blue-400 ring-inset', idle: 'bg-[#e3f2fd] text-blue-700 hover:bg-blue-200' },
                  { type: 'P' as const, label: 'Part', count: partBdCount || bdStatusList.filter(b => b.fmeaType === 'P').length,
                    loaded: 'bg-green-700 text-white', filtered: 'bg-green-100 text-green-800 ring-2 ring-green-400 ring-inset', idle: 'bg-[#e8f5e9] text-green-700 hover:bg-green-200' },
                ]).map(({ type, label, count, loaded, filtered, idle }) => {
                  const isLoaded = type === 'P'
                    ? bdLoadedFmeaId === fmeaId
                    : bdStatusList.some(b => b.fmeaType === type && b.fmeaId === bdLoadedFmeaId);
                  const isFiltered = bdTypeFilter === type;
                  return (
                    <td key={type}
                      onClick={() => handleLoadBdForType(type)}
                      className={`w-[28%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer font-semibold transition-colors ${
                        isLoaded ? loaded : isFiltered ? filtered : idle
                      }`}
                    >
                      {isLoaded ? `✅ ${label} 기초정보(Basic Data) 로드됨` : `${label} 기초정보(Basic Data) 사용`}
                      {count > 0 && <span className="ml-1 text-[10px] opacity-70">({count})</span>}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ★ 개정 모드: 저장 완료 후 수정/사용 배지 */}
        {showMasterReview && isRevisionMode && fmeaId && (
          <div className="mt-4 px-4 py-3 rounded-lg border-2 border-blue-400 bg-blue-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <span className="text-xs font-bold text-blue-800">개정 저장 완료(Revision Saved)</span>
              {revParam && <span className="px-2 py-0.5 text-[9px] bg-orange-400 text-white rounded-full font-bold">{revParam}</span>}
              <span className="text-[10px] text-gray-600">— 기초정보를 확인하고 다음 단계를 선택하세요</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/pfmea/import?id=${fmeaId}`)}
                className="px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded hover:bg-amber-600 transition-colors"
              >
                ✏️ 수정(Edit) (Import)
              </button>
              <button
                onClick={() => router.push(`/pfmea/worksheet?id=${fmeaId}`)}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors"
              >
                ▶ FMEA 작성화면이동(Go to Worksheet)
              </button>
              <button
                onClick={() => setShowMasterReview(false)}
                className="px-2 py-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
                title="닫기"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* ★ 2026-02-18: 기초정보 템플릿 생성기 */}
        <div className="mt-4">
          <TemplateGeneratorPanel
            onGenerate={templateGen.handleGenerate}
            templateMode={templateGen.templateMode}
            setTemplateMode={templateGen.setTemplateMode}
            manualConfig={templateGen.manualConfig}
            updateManualConfig={templateGen.updateManualConfig}
            workElements={templateGen.workElements}
            multipliers={templateGen.multipliers}
            updateMultiplier={templateGen.updateMultiplier}
            addWorkElement={templateGen.addWorkElement}
            removeWorkElement={templateGen.removeWorkElement}
            updateWorkElement={templateGen.updateWorkElement}
            flatData={flatData}
            onDownloadSample={async () => {
              if (fmeaId) {
                try {
                  const res = await fetch(`/api/fmea/reverse-import/excel?fmeaId=${encodeURIComponent(fmeaId)}`);
                  if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const cd = res.headers.get('content-disposition');
                    const fnMatch = cd?.match(/filename="?([^"]+)"?/);
                    const subject = (fmeaInfo.subject || '').replace(/\s+/g, '_');
                    a.download = fnMatch?.[1] || `PFMEA_Master_${subject || fmeaId}.xlsx`;
                    a.href = url;
                    a.click();
                    URL.revokeObjectURL(url);
                    return;
                  }
                } catch (_e) { /* server-side 실패 시 client-side fallback */ }
              }
              const { downloadDataTemplate, downloadSampleTemplate } = await getExcelTemplate();
              const subject = (fmeaInfo.subject || '').replace(/\s+/g, '_');
              const masterName = subject ? `PFMEA_Master_${subject}` : undefined;
              if (flatData.length > 0) {
                downloadDataTemplate(flatData, masterName);
              } else {
                downloadSampleTemplate(masterName, templateGen.templateMode === 'manual');
              }
            }}
            onDownloadEmpty={async () => {
              const { downloadEmptyTemplate } = await getExcelTemplate();
              downloadEmptyTemplate();
            }}
            onImportFile={() => bdFileInputRef.current?.click()}
            onUpdateItem={(id, value) => {
              setFlatData(prev => prev.map(item => item.id === id ? { ...item, value } : item));
              setBdDirty(true); setBdIsSaved(false);
            }}
            onUpdateM4={(id, m4) => {
              setFlatData(prev => prev.map(item => item.id === id ? { ...item, m4 } : item));
              setBdDirty(true); setBdIsSaved(false);
            }}
            onDeleteItems={(ids) => {
              const idSet = new Set(ids);
              setFlatData(prev => prev.filter(item => !idSet.has(item.id)));
              setBdDirty(true); setBdIsSaved(false);
            }}
            onAddItems={(items) => {
              const newItems = items.map((item, i) => ({
                ...item,
                id: `add-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
              }));
              setFlatData(prev => [...prev, ...newItems]);
              setBdDirty(true); setBdIsSaved(false);
            }}
            onSave={handleBdSave}
            isSaved={bdIsSaved}
            isSaving={bdIsSaving}
            dirty={bdDirty}
            selectedFmeaId={fmeaId}
            l1Name={core.fmeaInfo.subject || ''}
            fmeaInfo={{
              subject: core.fmeaInfo.subject || '',
              companyName: core.fmeaInfo.companyName || '',
              customerName: core.fmeaInfo.customerName || '',
              modelYear: core.fmeaInfo.modelYear || '',
              fmeaType: core.fmeaInfo.fmeaType || 'P',
              engineeringLocation: core.fmeaInfo.engineeringLocation || '',
              designResponsibility: core.fmeaInfo.designResponsibility || '',
              fmeaResponsibleName: core.fmeaInfo.fmeaResponsibleName || '',
              partName: core.fmeaInfo.partName || '',
              partNo: core.fmeaInfo.partNo || '',
            }}
            onWorksheetSaved={() => {
              if (fmeaId) window.location.href = `/pfmea/worksheet?id=${fmeaId}&tab=structure`;
            }}
            bdFmeaId={bdLoadedFmeaId || undefined}
            bdFmeaName={bdLoadedFmeaName || undefined}
            bdStatusList={bdStatusList}
            fmeaList={bdFmeaList}
            expandTrigger={bdExpandTrigger}
          />
          {/* Hidden file input for BD import */}
          <input ref={bdFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBdFileSelect} />
        </div>

        {/* ★ 2026-02-20: BD 현황 테이블 */}
        <BdStatusTable
          bdStatusList={bdStatusList}
          selectedFmeaId={fmeaId}
          typeFilter={bdTypeFilter}
          onTypeFilterChange={setBdTypeFilter}
          setSelectedFmeaId={(id) => {
            // BD 현황 행 클릭 → 해당 FMEA의 기초정보 로드
            const bd = bdStatusList.find(b => b.fmeaId === id);
            loadBdById(id, bd?.fmeaName || id);
            if (bd) {
              getMasterApi().then(({ loadDatasetByFmeaId }) =>
                loadDatasetByFmeaId(id).then(res => {
                  if (res.datasetId) setBdDatasetId(res.datasetId);
                })
              ).catch(e => { console.error('[BD 데이터셋 로드] 오류:', e); });
            }
            templateGen.setTemplateMode('download');
          }}
          onDeleteDatasets={handleBdDeleteDatasets}
        />

        {/* Family CP 관리는 CP 모듈에서 관리 — FMEA 등록 페이지에서 제거 (2026-03-05) */}

        {/* CFT 리스트 */}
        <div id="cft-section" className="mt-6 scroll-mt-20">
          <CFTRegistrationTable title="CFT 리스트" members={cftMembers}
            onMembersChange={(newMembers) => {
              // ✅ CFT Leader 직접 수정 → fmeaResponsibleName 자동 동기화
              const oldLeader = cftMembers.find(m => m.role === 'Leader');
              const newLeader = newMembers.find(m => m.role === 'Leader');
              if (newLeader && oldLeader && newLeader.name !== oldLeader.name) {
                setFmeaInfo(prev => ({ ...prev, fmeaResponsibleName: newLeader.name || prev.fmeaResponsibleName }));
              }
              setCftMembers(newMembers);
            }}
            onUserSearch={(index) => { setSelectedMemberIndex(index); setUserModalTarget('cft'); setRoleSearchTerm(''); setUserModalOpen(true); }}
            onRoleChange={(index, role) => { setSelectedMemberIndex(index); setUserModalTarget('cft'); setRoleSearchTerm(role); setUserModalOpen(true); }}
            onSave={handleSave} onReset={() => { if (confirm('CFT 목록을 초기화하시겠습니까?')) setCftMembers(createInitialCFTMembers()); }}
            onNavigateWorksheet={fmeaId ? () => router.push(`/pfmea/worksheet?id=${fmeaId}`) : undefined}
            saveStatus={saveStatus} minRows={6} extraHeaderContent={
              <button onClick={() => openHelp('cft')} className="px-1.5 py-0.5 bg-yellow-400 text-[#00587a] text-[9px] font-bold rounded hover:bg-yellow-300 transition-colors" title="CFT 구성 도움말">도움말(Help)</button>
            } />
        </div>

        {/* CFT 접속 로그 */}
        <div className="flex items-center gap-2 mt-6 mb-2">
          <span>📊</span><h2 className="text-sm font-bold text-gray-700" title="CFT Access Log">CFT 접속 로그(Access Log)</h2>
        </div>
        <CFTAccessLogTable accessLogs={accessLogs} maxRows={5} />

        {/* 하단 상태바 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>총 {cftMembers.filter(m => m.name).length}명의 CFT 멤버 | 접속 로그 {accessLogs.length}건</span>
          <span>버전: P-FMEA Suite v3.0 | 사용자: {user?.name || 'FMEA Lead'}</span>
        </div>

        {/* 모달들 */}
        <BizInfoSelectModal isOpen={bizInfoModalOpen} onClose={() => setBizInfoModalOpen(false)}
          onSelect={(info: BizInfoProject) => {
            setFmeaInfo(prev => ({ ...prev, customerName: info.customerName || '', modelYear: info.modelYear || '', partName: info.productName || '', partNo: info.partNo || '' }));
            setBizInfoModalOpen(false);
          }} />
        <UserSelectModal isOpen={userModalOpen} onClose={() => { setUserModalOpen(false); setSelectedMemberIndex(null); setRoleSearchTerm(''); }} onSelect={handleUserSelect} initialSearchTerm={roleSearchTerm} />
        <FmeaSelectModal isOpen={fmeaSelectModalOpen} onClose={() => setFmeaSelectModalOpen(false)} onSelect={handleFmeaSelect} fmeas={availableFmeas} selectType={fmeaSelectType} currentFmeaId={fmeaId} onExcelImport={() => window.location.href = `/pfmea/import?id=${fmeaId}&mode=excel&type=${fmeaSelectType}`} />

        {/* BD 선택 모달: Master/Family가 2개 이상일 때 */}
        {bdSelectModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setBdSelectModal(prev => ({ ...prev, open: false }))}>
            <div className="bg-white rounded-lg shadow-xl w-[520px] max-h-[400px] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-[#00587a] text-white px-4 py-2 flex items-center justify-between">
                <span className="font-bold text-sm">
                  {bdSelectModal.type === 'M' ? 'Master' : 'Family'} BD 선택
                </span>
                <button onClick={() => setBdSelectModal(prev => ({ ...prev, open: false }))} className="text-white/80 hover:text-white text-lg font-bold cursor-pointer">&times;</button>
              </div>
              <div className="p-3 text-xs text-gray-600">
                {bdSelectModal.type === 'M' ? 'Master' : 'Family'} BD가 {bdSelectModal.candidates.length}개 있습니다. 사용할 BD를 선택하세요.
              </div>
              <div className="overflow-y-auto max-h-[280px] px-3 pb-3">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 sticky top-0">
                      <th className="border border-gray-300 px-2 py-1 text-left">FMEA명(Name)</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-16">공정(Process)</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-12">FM</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-12">FC</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-16">데이터(Data)</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-14">판정(Result)</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-16">선택(Select)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bdSelectModal.candidates.map(bd => (
                      <tr key={bd.fmeaId} className="hover:bg-blue-50 cursor-pointer" onClick={() => {
                        setBdSelectModal(prev => ({ ...prev, open: false }));
                        loadBdById(bd.fmeaId, bd.fmeaName);
                      }}>
                        <td className="border border-gray-200 px-2 py-1.5">
                          <div className="font-semibold text-gray-800">{bd.fmeaName}</div>
                          <div className="text-[9px] text-gray-400">{bd.fmeaId} | {bd.bdId}</div>
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-center font-bold text-blue-600">{bd.processCount ?? 0}</td>
                        <td className="border border-gray-200 px-2 py-1 text-center font-bold text-indigo-600">{bd.fmCount ?? 0}</td>
                        <td className="border border-gray-200 px-2 py-1 text-center font-bold text-purple-600">{bd.fcCount ?? 0}</td>
                        <td className="border border-gray-200 px-2 py-1 text-center font-bold text-green-600">{bd.dataCount}</td>
                        <td className="border border-gray-200 px-2 py-1 text-center">
                          <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                            (bd.processCount ?? 0) > 0 && (bd.fmCount ?? 0) > 0 && (bd.fcCount ?? 0) > 0
                              ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {(bd.processCount ?? 0) > 0 && (bd.fmCount ?? 0) > 0 && (bd.fcCount ?? 0) > 0 ? '적합(OK)' : '누락(Missing)'}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-center">
                          <button className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] font-bold hover:bg-blue-600 cursor-pointer">
                            선택(Select)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <DatePickerModal isOpen={startDateModalOpen} onClose={() => setStartDateModalOpen(false)} onSelect={date => {
          if (fmeaInfo.fmeaRevisionDate && date >= fmeaInfo.fmeaRevisionDate) return `시작일(${date})이 목표완료일(${fmeaInfo.fmeaRevisionDate})보다 이후이거나 동일합니다.`;
          updateField('fmeaStartDate', date);
        }} currentValue={fmeaInfo.fmeaStartDate} title="시작 일자 선택(Select Start Date)" />
        <DatePickerModal isOpen={revisionDateModalOpen} onClose={() => setRevisionDateModalOpen(false)} onSelect={date => {
          if (fmeaInfo.fmeaStartDate && date <= fmeaInfo.fmeaStartDate) return `목표완료일(${date})이 시작일(${fmeaInfo.fmeaStartDate})보다 이전이거나 동일합니다.`;
          updateField('fmeaRevisionDate', date);
        }} currentValue={fmeaInfo.fmeaRevisionDate} title="목표 완료일 선택(Select Target Date)" />

        {/* FMEA명 선택 모달 */}
        <FmeaNameModal isOpen={fmeaNameModalOpen} onClose={() => setFmeaNameModalOpen(false)}
          fmeaNameList={fmeaNameList} currentFmeaId={fmeaId}
          onApplyName={(name) => {
            updateField('subject', name);
            // ★ FIX: 완제품명(partName) 자동 추출 — 누락 재발 방지
            const derived = name.includes('+') ? name.split('+')[0].trim() : name.trim();
            if (derived && derived !== '품명' && derived !== '품명+PFMEA') {
              handlePartNameChange(derived);
            }
          }}
          onLoadFmea={(id) => { router.push(`/pfmea/register?id=${id}`); window.location.reload(); }} />

        {/* 연동 모달 */}
        <LinkageModal isOpen={linkageModalOpen} onClose={() => setLinkageModalOpen(false)}
          sourceInfo={{ id: fmeaId, module: 'pfm', subject: fmeaInfo.subject, customerName: fmeaInfo.customerName, modelYear: fmeaInfo.modelYear, companyName: fmeaInfo.companyName, docType: fmeaInfo.fmeaType }}
          linkedPfdList={linkedPfdList} linkedCpList={linkedCpList}
          onAddLinkedDoc={handleAddLinkedDoc} onRemoveLinkedDoc={handleRemoveLinkedDoc} onToggleLinkage={handleToggleLinkage}
          showPfdSection={true} showCpSection={true} />

        {/* 새로 만들기 모달 */}
        <CreateDocumentModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} sourceApp="pfmea" />

        {/* CFT 미입력 경고 모달 */}
        <AlertModal isOpen={cftAlertRoles.length > 0} onClose={() => setCftAlertRoles([])} message="사용자 검색으로 CFT를 지정해 주세요" items={cftAlertRoles} />

      </div>
    </FixedLayout>
  );
}

export default function PFMEARegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">로딩 중...(Loading)</div>}>
      <PFMEARegisterPageContent />
    </Suspense>
  );
}
