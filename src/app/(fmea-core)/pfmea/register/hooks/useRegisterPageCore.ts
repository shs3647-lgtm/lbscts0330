/**
 * @file hooks/useRegisterPageCore.ts
 * @description PFMEA 등록 페이지 - 상태 선언 + useEffect (데이터 로드, 접속 로그, 라이프사이클)
 * @module pfmea/register
 * @created 2026-02-10 page.tsx 분리 리팩토링
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createInitialCFTMembers, CFTMember, ensureRequiredRoles } from '@/components/tables/CFTRegistrationTable';
import { CFTAccessLog } from '@/types/project-cft';
import { FmeaItem } from '@/components/modals/FmeaSelectModal';
import { LinkedDocItem } from '@/components/linkage/types';
import { FMEAInfo, FMEAType, FMEASelectType, INITIAL_FMEA, SaveStatus } from '../types';
import { syncToLocalStorage } from '../utils';
import { toast } from '@/hooks/useToast';

export function useRegisterPageCore() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id')?.toLowerCase() || null;
  const revParam = searchParams.get('rev') || null;
  const modeParam = searchParams.get('mode') || null;
  const isEditMode = !!editId;
  const isRevisionMode = !!revParam || modeParam === 'revision';

  // =====================================================
  // 상태 선언
  // =====================================================
  const [fmeaInfo, setFmeaInfo] = useState<FMEAInfo>(INITIAL_FMEA);
  const [cftMembers, setCftMembers] = useState<CFTMember[]>(createInitialCFTMembers());
  const [fmeaId, setFmeaId] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [accessLogs, setAccessLogs] = useState<CFTAccessLog[]>([]);
  // ★ 개정 모드: 저장 후 기초정보 확인 화면 표시
  const [showMasterReview, setShowMasterReview] = useState(false);

  // 모달 상태
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalTarget, setUserModalTarget] = useState<'responsible' | 'design' | 'cft'>('cft');
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [startDateModalOpen, setStartDateModalOpen] = useState(false);
  const [revisionDateModalOpen, setRevisionDateModalOpen] = useState(false);

  // FMEA/APQP 선택
  const [fmeaSelectModalOpen, setFmeaSelectModalOpen] = useState(false);
  const [fmeaSelectType, setFmeaSelectType] = useState<FMEASelectType>('ALL');
  const [availableFmeas, setAvailableFmeas] = useState<FmeaItem[]>([]);
  const [selectedBaseFmea, setSelectedBaseFmea] = useState<string | null>(null);
  const [masterDataCount, setMasterDataCount] = useState<number | null>(null);
  // FMEA명 선택/중복 방지
  const [fmeaNameModalOpen, setFmeaNameModalOpen] = useState(false);
  const [fmeaNameList, setFmeaNameList] = useState<{ id: string, name: string, type: string }[]>([]);
  const [fmeaNameSearch, setFmeaNameSearch] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // 변경 이력 추적
  const [originalData, setOriginalData] = useState<FMEAInfo | null>(null);

  // ★ 성능 개선: 프로젝트 목록 캐시 (page.tsx 중복 API 호출 제거)
  const [cachedProjects, setCachedProjects] = useState<Record<string, unknown>[]>([]);

  // ★ APQP 연동
  const [apqpModalOpen, setApqpModalOpen] = useState(false);
  const [apqpList, setApqpList] = useState<{ id: string; name: string }[]>([]);
  const [selectedParentApqp, setSelectedParentApqp] = useState<string | null>(null);

  // 연동 모달
  const [linkageModalOpen, setLinkageModalOpen] = useState(false);
  const [linkedPfdList, setLinkedPfdList] = useState<LinkedDocItem[]>([]);
  const [linkedCpList, setLinkedCpList] = useState<LinkedDocItem[]>([]);

  // 새로 만들기 모달
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [registerHelpSearch, setRegisterHelpSearch] = useState<string | null>(null);

  // ★ Triplet 상태 (M/F/P 계층 연동)
  interface TripletInfo {
    id: string;
    typeCode: string;
    cpId: string | null;
    pfdId: string | null;
    syncStatus: string;
    parentTripletId: string | null;
    children: Array<{ id: string; typeCode: string; subject: string; pfmeaId: string }>;
  }
  const [tripletInfo, setTripletInfo] = useState<TripletInfo | null>(null);

  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // =====================================================
  // 접속 로그 관련
  // =====================================================
  const loadAccessLogs = useCallback(async () => {
    const targetId = fmeaId || editId;
    if (!targetId) return;
    try {
      const res = await fetch(`/api/auth/access-log?projectId=${targetId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) setAccessLogs(data.logs);
      }
    } catch (e) { console.error('[접속로그 로드] 오류:', e); }
  }, [fmeaId, editId]);

  const recordAccessLog = useCallback(async (action: string, itemType: string, description: string, projectId?: string) => {
    try {
      await fetch('/api/auth/access-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'unknown',
          userName: user?.name || 'Unknown',
          projectId: projectId || fmeaId || editId,
          module: 'PFMEA',
          action, itemType, description,
        }),
      });
      loadAccessLogs();
    } catch (e) { console.error('[접속로그 기록] 오류:', e); }
  }, [user, fmeaId, editId, loadAccessLogs]);

  // 초기 로드 후 1초 지연하여 접속 로그 로드
  useEffect(() => {
    const timer = setTimeout(() => loadAccessLogs(), 1000);
    return () => clearTimeout(timer);
  }, [loadAccessLogs]);

  // 화면 진입 시 접속 로그 기록
  const accessLoggedRef = useRef(false);
  const dataLoadedRef = useRef(false);
  useEffect(() => {
    if (!user || accessLoggedRef.current) return;
    accessLoggedRef.current = true;
    const targetId = fmeaId || editId || 'new';
    const logTimeout = setTimeout(() => {
      fetch('/api/auth/access-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, userName: user.name, projectId: targetId,
          module: 'PFMEA', action: '조회', itemType: '등록화면',
          description: `${user.name}님이 PFMEA 등록화면에 접속 (${targetId})`,
        }),
      }).then(() => loadAccessLogs()).catch((e) => { console.error('[화면진입 접속로그] 오류:', e); });
    }, 500);
    return () => clearTimeout(logTimeout);
  }, [user, fmeaId, editId, loadAccessLogs]);

  // =====================================================
  // 페이지 이탈 시 로그아웃 시간 업데이트 + 자동 저장
  // =====================================================
  useEffect(() => {
    if (!user) return;
    const targetId = fmeaId || editId || 'new';

    const updateLogout = () => {
      const blob = new Blob([JSON.stringify({
        userId: user.id, projectId: targetId, module: 'PFMEA', _method: 'PUT',
      })], { type: 'application/json' });
      navigator.sendBeacon('/api/auth/access-log', blob);
    };

    const autoSave = () => {
      if (!targetId || targetId === 'new') return;
      try {
        syncToLocalStorage(targetId, fmeaInfo, cftMembers, selectedBaseFmea || null);
      } catch (e) { console.error('[자동저장] 오류:', e); }

      // ★★★ 2026-03-01: DB에도 자동저장 (sendBeacon) ★★★
      // 페이지 이탈/닫기 시 프로젝트 등록정보가 DB에 저장되도록 보장
      // → 워크시트 진입 시 "프로젝트 등록되지 않았습니다" 에러 방지
      if (fmeaInfo.subject?.trim()) {
        try {
          const payload = {
            fmeaId: targetId.toLowerCase(),
            fmeaType: fmeaInfo.fmeaType || 'P',
            project: { projectName: fmeaInfo.subject || '' },
            fmeaInfo: {
              subject: fmeaInfo.subject || '',
              companyName: fmeaInfo.companyName || '',
              customerName: fmeaInfo.customerName || '',
              customerIndustry: fmeaInfo.customerIndustry || '',
              modelYear: fmeaInfo.modelYear || '',
              fmeaType: fmeaInfo.fmeaType || 'P',
              engineeringLocation: fmeaInfo.engineeringLocation || '',
              designResponsibility: fmeaInfo.designResponsibility || '',
              fmeaResponsibleName: fmeaInfo.fmeaResponsibleName || '',
              partName: fmeaInfo.partName || '',
              partNo: fmeaInfo.partNo || '',
            },
          };
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon('/api/fmea/projects', blob);
        } catch (dbErr) {
          console.error('[자동저장] DB 저장 sendBeacon 실패:', dbErr);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') { updateLogout(); autoSave(); }
    };
    const handleBeforeUnload = () => { updateLogout(); autoSave(); };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fmeaId, editId, fmeaInfo, cftMembers, selectedBaseFmea]);

  // editId 변경 시 dataLoadedRef reset
  useEffect(() => { dataLoadedRef.current = false; }, [editId]);

  // =====================================================
  // 데이터 로드
  // =====================================================
  useEffect(() => {
    if (dataLoadedRef.current) return;

    const loadData = async () => {
      // ★ 성능 개선: 프로젝트 데이터 처리 공통 함수 (redirect 루프 제거)
      const loadProjectData = async (project: any) => {
        const projectId = project.id.toLowerCase();
        const projectType = (project.fmeaType || 'P') as FMEAType;
        const loadedInfo: FMEAInfo = {
          companyName: project.fmeaInfo?.companyName || '',
          engineeringLocation: project.fmeaInfo?.engineeringLocation || '',
          customerName: project.project?.customer || project.fmeaInfo?.customerName || '',
          customerIndustry: (project.fmeaInfo?.customerIndustry || '') as import('../types').CustomerIndustry,
          modelYear: project.fmeaInfo?.modelYear || '',
          subject: project.fmeaInfo?.subject || project.project?.projectName || '',
          fmeaStartDate: project.fmeaInfo?.fmeaStartDate || '',
          fmeaRevisionDate: project.fmeaInfo?.fmeaRevisionDate || '',
          fmeaProjectName: project.project?.projectName || '',
          fmeaId: project.id,
          fmeaType: projectType,
          designResponsibility: project.fmeaInfo?.designResponsibility || '',
          confidentialityLevel: project.fmeaInfo?.confidentialityLevel || '',
          fmeaResponsibleName: project.fmeaInfo?.fmeaResponsibleName || '',
          linkedCpNo: project.fmeaInfo?.linkedCpNo || '',
          linkedPfdNo: project.fmeaInfo?.linkedPfdNo || '',
          linkedDfmeaNo: project.fmeaInfo?.linkedDfmeaNo || '',
          partName: project.fmeaInfo?.partName || '',
          partNo: project.fmeaInfo?.partNo || '',
          createdAt: project.createdAt?.slice(0, 10) || project.fmeaInfo?.createdAt || new Date().toISOString().slice(0, 10),
          updatedAt: project.updatedAt?.slice(0, 10) || project.fmeaInfo?.updatedAt || '',
        };
        setFmeaId(projectId);
        setFmeaInfo(loadedInfo);
        setOriginalData(loadedInfo);
        localStorage.setItem('pfmea-last-viewed', projectId);
        // ★ 병렬 API 호출: users + linked-docs 동시 실행 (순차→병렬 최적화)
        const needsUserLookup = project.cftMembers?.length > 0;
        const ensured = needsUserLookup ? ensureRequiredRoles(project.cftMembers) : null;
        let leader = ensured?.find(m => m.role === 'Leader') ?? null;

        if (ensured && leader) {
          if (loadedInfo.fmeaResponsibleName && !leader.name) {
            leader.name = loadedInfo.fmeaResponsibleName;
          } else if (!loadedInfo.fmeaResponsibleName && leader.name) {
            loadedInfo.fmeaResponsibleName = leader.name;
            setFmeaInfo(loadedInfo);
          }
        }

        const shouldFetchUsers = leader && leader.name && (!leader.department || !leader.position);

        // 병렬 실행: 사용자 조회 + 연동 문서 조회
        const [usersResult, ldResult] = await Promise.all([
          shouldFetchUsers
            ? fetch('/api/users').then(r => r.json()).catch(() => null)
            : Promise.resolve(null),
          fetch(`/api/fmea/linked-docs?fmeaId=${encodeURIComponent(projectId)}`)
            .then(r => r.json()).catch(() => null),
        ]);

        // 사용자 정보 반영
        if (usersResult?.success && usersResult.users?.length > 0 && leader) {
          const matched = usersResult.users.find((u: { name: string }) => u.name === leader!.name);
          if (matched) {
            if (!leader.department) leader.department = matched.department || '';
            if (!leader.position) leader.position = matched.position || '';
            if (!leader.phone) leader.phone = matched.phone || '';
            if (!leader.email) leader.email = matched.email || '';
            if (!leader.task) leader.task = matched.remark || '';
          }
        }
        if (ensured) setCftMembers(ensured);

        if (projectType === 'M') {
          setSelectedBaseFmea(projectId);
        } else if (project.parentFmeaId) {
          setSelectedBaseFmea(project.parentFmeaId.toLowerCase());
        }
        // 연동 문서 반영
        if (ldResult?.success) {
          if (ldResult.cps?.length > 0) {
            setLinkedCpList(ldResult.cps.map((c: { id: string }, i: number) => ({
              id: c.id, module: 'cp' as const, docType: projectType as 'M' | 'F' | 'P',
              linkGroupNo: i + 1, isAutoGenerated: true, status: 'linked' as const,
            })));
          } else if (loadedInfo.linkedCpNo) {
            setLinkedCpList([{ id: loadedInfo.linkedCpNo, module: 'cp', docType: projectType as 'M' | 'F' | 'P', linkGroupNo: 1, isAutoGenerated: true, status: 'linked' }]);
          }
          if (ldResult.pfds?.length > 0) {
            setLinkedPfdList(ldResult.pfds.map((p: { id: string }, i: number) => ({
              id: p.id, module: 'pfd' as const, docType: projectType as 'M' | 'F' | 'P',
              linkGroupNo: i + 1, isAutoGenerated: true, status: 'linked' as const,
            })));
          } else if (loadedInfo.linkedPfdNo) {
            setLinkedPfdList([{ id: loadedInfo.linkedPfdNo, module: 'pfd', docType: projectType as 'M' | 'F' | 'P', linkGroupNo: 1, isAutoGenerated: true, status: 'linked' }]);
          }
        } else {
          // 폴백: 기존 단일값 사용
          if (loadedInfo.linkedPfdNo) {
            setLinkedPfdList([{ id: loadedInfo.linkedPfdNo, module: 'pfd', docType: projectType as 'M' | 'F' | 'P', linkGroupNo: 1, isAutoGenerated: true, status: 'linked' }]);
          }
          if (loadedInfo.linkedCpNo) {
            setLinkedCpList([{ id: loadedInfo.linkedCpNo, module: 'cp', docType: projectType as 'M' | 'F' | 'P', linkGroupNo: 1, isAutoGenerated: true, status: 'linked' }]);
          }
        }
      };

      if (!isEditMode && !editId) {
        dataLoadedRef.current = true;
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'new') {
          localStorage.removeItem('pfmea-last-viewed');
          localStorage.removeItem('pfmea-last-edited');
          setFmeaInfo(INITIAL_FMEA); setCftMembers(createInitialCFTMembers());
          setFmeaId(''); setSelectedBaseFmea(null);
          return;
        }

        // localStorage의 last-viewed ID가 DB에 실제 존재하는지 먼저 검증
        const lastViewedId = localStorage.getItem('pfmea-last-viewed');
        let apiSuccess = false;
        try {
          // ★ DB 직접 조회 (레거시 제거 → 페이지네이션 API 사용)
          const res = await fetch('/api/fmea/projects?type=P&page=1&size=200&sortField=createdAt&sortOrder=desc');
          const data = await res.json();
          if (data.dbError) {
            // DB 연결 실패 — 에러 표시만 하고 폼 초기화 안 함
            console.error('[프로젝트 목록] DB 연결 실패:', data.error);
            toast.error('DB 연결 실패. 잠시 후 다시 시도해주세요.');
            return;
          }
          apiSuccess = true;
          const projectList = data.data || [];
          // ★ 프로젝트 목록 캐시 (page.tsx BD현황에서 재사용)
          if (data.success && projectList.length > 0) setCachedProjects(projectList);
          if (data.success && projectList.length > 0) {
            // ★ 성능 개선: redirect+재마운트 대신 직접 로드 (API 호출 1회 절약)
            let targetId = projectList[0].id.toLowerCase();
            if (lastViewedId) {
              const exists = projectList.some((p: any) => p.id?.toLowerCase() === lastViewedId.toLowerCase());
              if (exists) {
                targetId = lastViewedId.toLowerCase();
              } else {
                localStorage.removeItem('pfmea-last-viewed');
                localStorage.removeItem('pfmea-last-edited');
              }
            }
            const targetProject = projectList.find((p: any) => p.id?.toLowerCase() === targetId);
            if (targetProject) {
              await loadProjectData(targetProject);
              router.replace(`/pfmea/register?id=${targetId}`);
              return;
            }
          }
        } catch (e) {
          console.error('[프로젝트 목록 로드] 네트워크 오류:', e);
          toast.error('서버 연결 실패. 네트워크 상태를 확인해주세요.');
          return; // API 실패 시 폼 초기화 안 함 — 사용자 데이터 보호
        }

        // API 성공했지만 DB에 프로젝트 없음 → localStorage 정리 + 초기 폼
        if (apiSuccess) {
          localStorage.removeItem('pfmea-last-viewed');
          localStorage.removeItem('pfmea-last-edited');
          setFmeaInfo(INITIAL_FMEA); setCftMembers(createInitialCFTMembers());
          setFmeaId(''); setSelectedBaseFmea(null);
        }
        return;
      }

      dataLoadedRef.current = true;
      const targetId = editId;
      if (!targetId) return;

      let project: any = null;
      try {
        // ★ DB 직접 조회 (레거시 제거 → 페이지네이션 API 사용)
        const res = await fetch(`/api/fmea/projects?type=P&page=1&size=200&sortField=createdAt&sortOrder=desc`);
        const data = await res.json();
        const projectList = data.data || [];
        if (data.success && projectList.length > 0) {
          project = projectList.find((p: any) => p.id?.toLowerCase() === targetId.toLowerCase());
          setCachedProjects(projectList); // ★ 캐시
        }
      } catch (e) { console.error('[프로젝트 로드] 오류:', e); toast.error('프로젝트 데이터를 불러오는데 실패했습니다.'); }

      if (!project) {
        localStorage.removeItem('pfmea-last-edited');
        localStorage.removeItem('pfmea-last-viewed');
        const localProjects = localStorage.getItem('pfmea-projects');
        if (localProjects) {
          try {
            const projects = JSON.parse(localProjects);
            const filtered = projects.filter((p: any) => p.id?.toLowerCase() !== targetId.toLowerCase());
            localStorage.setItem('pfmea-projects', JSON.stringify(filtered));
          } catch (e) { console.error('[localStorage 파싱] 오류:', e); }
        }
        setFmeaInfo(INITIAL_FMEA); setCftMembers(createInitialCFTMembers());
        setFmeaId(''); setSelectedBaseFmea(null);
        return;
      }

      if (project) {
        await loadProjectData(project);
        if (!isEditMode) router.replace(`/pfmea/register?id=${project.id.toLowerCase()}`);
      }
    };
    loadData();
     
  }, [isEditMode, editId, user, router]);

  // =====================================================
  // 기타 이펙트
  // =====================================================

  // 자동 저장 (localStorage - 1초 debounce)
  useEffect(() => {
    if (!(fmeaInfo.subject || fmeaId)) return;
    const timer = setTimeout(() => {
      const tempData = { fmeaInfo, cftMembers, fmeaId, selectedBaseFmea, savedAt: new Date().toISOString() };
      localStorage.setItem('pfmea-temp-data', JSON.stringify(tempData));
    }, 1000);
    return () => clearTimeout(timer);
  }, [fmeaInfo, cftMembers, fmeaId, selectedBaseFmea]);

  // 신규 모드 임시 데이터 초기화
  useEffect(() => {
    if (!isEditMode && !editId) {
      localStorage.removeItem('pfmea-temp-data');
    }
  }, [isEditMode, editId]);

  // 편집 모드에서 fmeaId 비어있으면 editId 사용
  useEffect(() => {
    if (isEditMode && editId && !fmeaId) {
      setFmeaId(editId);
    }
  }, [isEditMode, editId, fmeaId]);

  // ★ 페이지 로드 시 FMEA명 목록 자동 로드 (중복 검증용)
  // useRef 가드 제거: React Strict Mode에서 ref가 cleanup 후에도 true로 남아 재마운트 시 로드 실패
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        // ★ DB 직접 조회 (레거시 제거 → 페이지네이션 API 사용)
        const res = await fetch('/api/fmea/projects?type=P&page=1&size=200&sortField=createdAt&sortOrder=desc');
        const data = await res.json();
        const projectList = data.data || [];
        if (!cancelled && data.success && projectList.length > 0) {
          setFmeaNameList(projectList.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: ((p.fmeaInfo as Record<string, unknown>)?.subject as string) ||
                  ((p.project as Record<string, unknown>)?.productName as string) || '제목 없음',
            type: (p.fmeaType as string) || 'P',
          })));
        }
      } catch (e) { console.error('[FMEA명 목록 초기 로드] 오류:', e); }
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // ★ Triplet 정보 로드 (편집 모드에서 tripletGroupId 조회)
  useEffect(() => {
    const targetId = fmeaId || editId;
    if (!targetId) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        // ★ DB 직접 조회 (레거시 제거 → 페이지네이션 API 사용)
        const projRes = await fetch(`/api/fmea/projects?type=P&page=1&size=200&sortField=createdAt&sortOrder=desc`);
        const projData = await projRes.json();
        const projList = projData?.data || [];
        const project = projList.find((p: any) => p.id?.toLowerCase() === targetId?.toLowerCase());
        const tgId = project?.tripletGroupId;
        if (!tgId) return;

        const tgRes = await fetch(`/api/triplet/${tgId}/header`);
        if (!tgRes.ok) return;
        const tgData = await tgRes.json();
        if (!cancelled && tgData.success && tgData.triplet) {
          const t = tgData.triplet;
          setTripletInfo({
            id: t.id,
            typeCode: t.typeCode,
            cpId: t.cp?.id || null,
            pfdId: t.pfd?.id || null,
            syncStatus: t.syncStatus,
            parentTripletId: t.parent?.id || null,
            children: t.children || [],
          });
        }
      } catch (e) { console.error('[Triplet 정보 로드] 오류:', e); }
    }, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [fmeaId, editId]);

  // 마스터 선택 시 기초정보 항목 수 조회
  useEffect(() => {
    if (selectedBaseFmea?.includes('-m')) {
      fetch('/api/pfmea/master?includeItems=false')
        .then(res => res.json())
        .then(data => { setMasterDataCount(data?.active?.itemCount ?? null); })
        .catch(() => setMasterDataCount(null));
    } else {
      setMasterDataCount(null);
    }
  }, [selectedBaseFmea]);

  return {
    // Auth & routing
    user, router, editId, revParam, isEditMode, isRevisionMode,
    // Core state
    fmeaInfo, setFmeaInfo, fmeaId, setFmeaId,
    cftMembers, setCftMembers, saveStatus, setSaveStatus,
    accessLogs, setAccessLogs,
    showMasterReview, setShowMasterReview,
    // Modal state
    bizInfoModalOpen, setBizInfoModalOpen,
    userModalOpen, setUserModalOpen, userModalTarget, setUserModalTarget,
    selectedMemberIndex, setSelectedMemberIndex,
    roleSearchTerm, setRoleSearchTerm,
    startDateModalOpen, setStartDateModalOpen,
    revisionDateModalOpen, setRevisionDateModalOpen,
    fmeaSelectModalOpen, setFmeaSelectModalOpen,
    fmeaSelectType, setFmeaSelectType,
    availableFmeas, setAvailableFmeas,
    selectedBaseFmea, setSelectedBaseFmea,
    masterDataCount, setMasterDataCount,
    // APQP
    apqpModalOpen, setApqpModalOpen, apqpList, setApqpList,
    selectedParentApqp, setSelectedParentApqp,
    // FMEA name
    fmeaNameModalOpen, setFmeaNameModalOpen,
    fmeaNameList, setFmeaNameList,
    fmeaNameSearch, setFmeaNameSearch,
    duplicateWarning, setDuplicateWarning,
    // Change tracking
    originalData, setOriginalData,
    // ★ 성능: 프로젝트 목록 캐시 (BD 현황 중복 호출 제거)
    cachedProjects,
    // Linkage
    linkageModalOpen, setLinkageModalOpen,
    linkedPfdList, setLinkedPfdList,
    linkedCpList, setLinkedCpList,
    // Create modal
    isCreateModalOpen, setIsCreateModalOpen,
    registerHelpSearch, setRegisterHelpSearch,
    // Triplet
    tripletInfo, setTripletInfo,
    // Refs
    excelFileInputRef,
    // Functions
    loadAccessLogs, recordAccessLog,
  };
}
