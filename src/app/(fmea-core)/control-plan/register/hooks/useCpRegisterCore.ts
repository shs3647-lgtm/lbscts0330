/**
 * @file hooks/useCpRegisterCore.ts
 * @description CP 등록 페이지 - 상태 선언 + useEffect (데이터 로드, 접속 로그, 라이프사이클)
 * @module control-plan/register
 * @created 2026-03-05 page.tsx 분리 리팩토링 (PFMEA 수평전개)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import { createInitialCFTMembers, CFTMember, ensureRequiredRoles } from '@/components/tables/CFTRegistrationTable';
import { CFTAccessLog } from '@/types/project-cft';
import { ApqpItem } from '@/components/modals/ApqpSelectModal';
import { LinkedDocItem, TargetModule } from '@/components/linkage/types';
import { CPInfo, CPType, CPSelectType, INITIAL_CP, CpItem, FmeaItem, SaveStatus } from '../types';
import { syncToLocalStorage } from '../utils';

export function useCpRegisterCore() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id')?.toLowerCase() || null;
  const fromFmeaId = searchParams.get('fmeaId')?.toLowerCase() || null;  // FMEA에서 연동 생성 시
  const isEditMode = !!editId;
  const isFromFmea = !!fromFmeaId;  // FMEA에서 생성된 CP인지

  // =====================================================
  // 상태 선언
  // =====================================================
  const [cpInfo, setCpInfo] = useState<CPInfo>(INITIAL_CP);
  const [cftMembers, setCftMembers] = useState<CFTMember[]>(createInitialCFTMembers());
  const [cpId, setCpId] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [accessLogs, setAccessLogs] = useState<CFTAccessLog[]>([]);

  // 모달 상태
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalTarget, setUserModalTarget] = useState<'responsible' | 'design' | 'cft'>('cft');
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);
  const [startDateModalOpen, setStartDateModalOpen] = useState(false);
  const [revisionDateModalOpen, setRevisionDateModalOpen] = useState(false);

  // CP/FMEA/APQP 선택
  const [cpSelectModalOpen, setCpSelectModalOpen] = useState(false);
  const [cpSelectType, setCpSelectType] = useState<CPSelectType>('ALL');
  const [availableCps, setAvailableCps] = useState<CpItem[]>([]);
  const [selectedBaseCp, setSelectedBaseCp] = useState<string | null>(null);
  const [masterInfoOpen, setMasterInfoOpen] = useState(true); // 기초정보 패널 토글 (기본 열림)
  const [fmeaSelectModalOpen, setFmeaSelectModalOpen] = useState(false);
  const [availableFmeas, setAvailableFmeas] = useState<FmeaItem[]>([]);
  const [selectedParentFmea, setSelectedParentFmea] = useState<string | null>(null);

  // Floating window hooks
  const cpSelFloating = useFloatingWindow({ isOpen: cpSelectModalOpen, width: 600, height: 480 });
  const fmeaSelFloating = useFloatingWindow({ isOpen: fmeaSelectModalOpen, width: 600, height: 480 });

  const [apqpModalOpen, setApqpModalOpen] = useState(false);
  const [apqpList, setApqpList] = useState<ApqpItem[]>([]);
  const [selectedParentApqp, setSelectedParentApqp] = useState<string | null>(null);
  const [fmeaLocked, setFmeaLocked] = useState(false);  // 상위 FMEA 잠금 상태

  // 표준 연동 모달 상태
  const [linkageModalOpen, setLinkageModalOpen] = useState(false);
  const [linkedPfdList, setLinkedPfdList] = useState<LinkedDocItem[]>([]);

  // 이전 버전 호환 (단일 linkedPfdNo -> 리스트로 마이그레이션)
  const linkedPfdNo = linkedPfdList[0]?.id || null;

  // 변경 이력 추적 (편집 모드용)
  const [originalData, setOriginalData] = useState<CPInfo | null>(null);

  // 새로 만들기 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ★ Triplet 상태
  const [tripletInfo, setTripletInfo] = useState<{
    id: string; typeCode: string; pfmeaId: string | null; pfdId: string | null;
    syncStatus: string; children: Array<{ id: string; subject: string }>;
  } | null>(null);

  // =====================================================
  // Refs
  // =====================================================
  const accessLoggedRef = useRef(false);
  const dataLoadedRef = useRef(false);  // 데이터 로드 중복 방지

  // =====================================================
  // 접속 로그 관련
  // =====================================================
  const loadAccessLogs = useCallback(async () => {
    const targetId = cpId || editId;
    if (!targetId) return;
    try {
      const res = await fetch(`/api/auth/access-log?projectId=${targetId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) setAccessLogs(data.logs);
      }
    } catch (e) { console.error('[CP 접속로그 로드] 오류:', e); }
  }, [cpId, editId]);

  const recordAccessLog = useCallback(async (action: string, itemType: string, description: string, projectId?: string) => {
    try {
      await fetch('/api/auth/access-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'unknown',
          userName: user?.name || 'Unknown',
          projectId: projectId || cpId || editId,
          module: 'CP',
          action,
          itemType,
          description,
        }),
      });
      loadAccessLogs();
    } catch (e) { console.error('[CP 접속로그 기록] 오류:', e); }
  }, [user, cpId, editId, loadAccessLogs]);

  // 초기 로드 시 접속 로그 로드
  useEffect(() => { loadAccessLogs(); }, [loadAccessLogs]);

  // 화면 진입 시 접속 로그 기록 (세션당 1회만)
  useEffect(() => {
    if (!user || accessLoggedRef.current) return;

    // 세션당 1회만 기록 (sessionStorage 활용)
    const sessionKey = `cp_access_logged_${cpId || editId || 'new'}`;
    if (sessionStorage.getItem(sessionKey)) {
      accessLoggedRef.current = true;
      return;
    }

    accessLoggedRef.current = true;
    sessionStorage.setItem(sessionKey, 'true');

    const targetId = cpId || editId || 'new';
    fetch('/api/auth/access-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        userName: user.name,
        projectId: targetId,
        module: 'CP',
        action: 'access',
        itemType: '등록화면',
        description: `${user.name}님이 CP 등록화면에 접속`,
      }),
    }).then(() => loadAccessLogs()).catch(() => { /* ignore */ });
  }, [user, cpId, editId, loadAccessLogs]);

  // =====================================================
  // 페이지 이탈 시 자동 저장
  // =====================================================
  useEffect(() => {
    if (!user) return;
    const targetId = cpId || editId || 'new';

    const autoSave = () => {
      if (!targetId || targetId === 'new') return;
      try {
        syncToLocalStorage(targetId, cpInfo, cftMembers, selectedBaseCp || null, selectedParentApqp || null, selectedParentFmea || null);
      } catch (e) { console.error('[CP 자동저장] 오류:', e); }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        autoSave();
      }
    };

    window.addEventListener('beforeunload', autoSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', autoSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, cpId, editId, cpInfo, cftMembers, selectedBaseCp, selectedParentApqp, selectedParentFmea]);

  // editId 변경 시 dataLoadedRef reset (Same Page Navigation 대응)
  useEffect(() => {
    dataLoadedRef.current = false;
  }, [editId]);

  // =====================================================
  // 데이터 로드
  // =====================================================
  useEffect(() => {
    // 이미 로드된 경우 스킵 (무한 루프 방지)
    if (dataLoadedRef.current) return;

    const loadData = async () => {
      // ID가 없으면 마지막 편집 또는 최신 CP 자동 로드
      if (!isEditMode && !editId) {
        dataLoadedRef.current = true;  // 로드 완료 표시

        // 신규 작성 모드: 완전한 빈 폼 (ID만 표시)
        setCpInfo(INITIAL_CP);
        setCftMembers(createInitialCFTMembers());
        setCpId('');
        setSelectedBaseCp(null);
        setSelectedParentFmea(null);
        setSelectedParentApqp(null);
        return;
      }

      dataLoadedRef.current = true;  // 로드 완료 표시

      const targetId = editId;
      if (!targetId) return;

      let project: any = null;

      // 1. API에서 먼저 로드 (DB 우선)
      try {
        const res = await fetch(`/api/control-plan?cpNo=${targetId}`);
        const data = await res.json();
        if (data.success && data.data) {
          project = data.data;
        }
      } catch (e) { console.error('[CP 프로젝트 로드] 오류:', e); }

      // 2. DB에 없으면 -> 삭제된 데이터, localStorage 잔재 정리 후 신규 모드
      if (!project) {
        localStorage.removeItem('cp-last-edited');
        const localProjects = localStorage.getItem('cp-projects');
        if (localProjects) {
          try {
            const projects = JSON.parse(localProjects);
            const filtered = projects.filter((p: any) => p.id?.toLowerCase() !== targetId.toLowerCase());
            localStorage.setItem('cp-projects', JSON.stringify(filtered));
          } catch (e) { console.error('[CP localStorage 파싱] 오류:', e); }
        }
        router.replace('/control-plan/register');
        return;
      }

      // 프로젝트 데이터 적용
      if (project) {
        const projectId = (project.cpNo || project.id).toLowerCase();
        const projectType = (project.cpType || 'P') as CPType;

        const loadedInfo: CPInfo = {
          companyName: project.companyName || project.cpInfo?.companyName || '',
          engineeringLocation: project.engineeringLocation || project.cpInfo?.engineeringLocation || '',
          customerName: project.customerName || project.cpInfo?.customerName || '',
          modelYear: project.modelYear || project.cpInfo?.modelYear || '',
          subject: project.subject || project.cpInfo?.subject || '',
          cpStartDate: project.cpStartDate || project.cpInfo?.cpStartDate || '',
          cpRevisionDate: project.cpRevisionDate || project.cpInfo?.cpRevisionDate || '',
          cpProjectName: project.subject || '',
          cpId: projectId,
          cpType: projectType,
          processResponsibility: project.processResponsibility || project.cpInfo?.processResponsibility || '',
          confidentialityLevel: project.confidentialityLevel || project.cpInfo?.confidentialityLevel || '',
          securityLevel: project.securityLevel || project.cpInfo?.securityLevel || '',
          cpResponsibleName: project.cpResponsibleName || project.cpInfo?.cpResponsibleName || '',
          createdAt: project.createdAt || project.cpInfo?.createdAt || new Date().toISOString().slice(0, 10),
          updatedAt: project.updatedAt || project.cpInfo?.updatedAt || '',
          partName: project.partName || project.cpInfo?.partName || '',
          partNo: project.partNo || project.cpInfo?.partNo || '',
          linkedDfmeaNo: project.linkedDfmeaNo || project.cpInfo?.linkedDfmeaNo || '',
          partNameMode: project.partNameMode || project.cpInfo?.partNameMode || 'A',
        };

        setCpId(projectId);
        setCpInfo(loadedInfo);
        setOriginalData(loadedInfo);

        if (project.cftMembers?.length > 0) setCftMembers(ensureRequiredRoles(project.cftMembers));

        // 상위 CP 설정: Master는 자기 자신
        if (projectType === 'M') {
          setSelectedBaseCp(projectId);
        } else if (project.baseCpId || project.parentCpId) {
          setSelectedBaseCp((project.baseCpId || project.parentCpId).toLowerCase());
        }

        if (project.parentApqpNo) setSelectedParentApqp(project.parentApqpNo);

        const loadedFmeaId = project.parentFmeaId || project.fmeaId || project.fmeaNo;
        if (loadedFmeaId) {
          setSelectedParentFmea(loadedFmeaId.toLowerCase());
          setFmeaLocked(true);  // DB에서 로드된 경우 잠금
        }

        // 연동 PFD 로드 (자동 생성 제거)
        const loadedPfdNo = project.linkedPfdNo || project.pfdNo;
        if (loadedPfdNo) {
          setLinkedPfdList([{
            id: loadedPfdNo.toLowerCase(),
            module: 'pfd' as TargetModule,
            docType: projectType,
            subject: '',
            linkGroupNo: 1,
            isAutoGenerated: false,
            status: 'linked'
          }]);
        }

        // ★ Triplet 정보 로드
        const tgId = project.tripletGroupId;
        if (tgId) {
          fetch(`/api/triplet/${tgId}/header`)
            .then(r => r.ok ? r.json() : null)
            .then(tgData => {
              if (tgData?.success && tgData.triplet) {
                const t = tgData.triplet;
                setTripletInfo({
                  id: t.id, typeCode: t.typeCode,
                  pfmeaId: t.pfmea?.id || null, pfdId: t.pfd?.id || null,
                  syncStatus: t.syncStatus, children: t.children || [],
                });
              }
            }).catch(() => {});
        }

        if (!isEditMode) router.replace(`/control-plan/register?id=${projectId}`);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editId]);

  // FMEA에서 연동 생성 시 설정
  useEffect(() => {
    if (fromFmeaId) {
      setSelectedParentFmea(fromFmeaId);
      setFmeaLocked(true);  // FMEA에서 온 경우 잠금
    }
  }, [fromFmeaId]);

  // 편집 모드에서 cpId가 비어있으면 editId 사용
  useEffect(() => {
    if (isEditMode && editId && !cpId) {
      setCpId(editId);
    }
  }, [isEditMode, editId, cpId]);

  // 자동 저장 (localStorage) - ID가 있을 때만 저장
  useEffect(() => {
    if (cpId && (cpInfo.subject || isEditMode)) {
      const tempData = { cpInfo, cftMembers, cpId, selectedBaseCp, selectedParentApqp, selectedParentFmea, linkedPfdList, savedAt: new Date().toISOString() };
      localStorage.setItem('cp-temp-data', JSON.stringify(tempData));
    }
  }, [cpInfo, cftMembers, cpId, selectedBaseCp, selectedParentApqp, selectedParentFmea, isEditMode, linkedPfdList]);

  // 신규 모드 임시 데이터 초기화
  useEffect(() => {
    if (!isEditMode && !editId) {
      localStorage.removeItem('cp-temp-data');
    }
  }, [isEditMode, editId]);

  return {
    // Auth & routing
    user, router, editId, fromFmeaId, isEditMode, isFromFmea,
    // Core state
    cpInfo, setCpInfo, cpId, setCpId,
    cftMembers, setCftMembers, saveStatus, setSaveStatus,
    accessLogs, setAccessLogs,
    // Modal state
    bizInfoModalOpen, setBizInfoModalOpen,
    userModalOpen, setUserModalOpen, userModalTarget, setUserModalTarget,
    selectedMemberIndex, setSelectedMemberIndex,
    startDateModalOpen, setStartDateModalOpen,
    revisionDateModalOpen, setRevisionDateModalOpen,
    // CP/FMEA/APQP selection
    cpSelectModalOpen, setCpSelectModalOpen,
    cpSelectType, setCpSelectType,
    availableCps, setAvailableCps,
    selectedBaseCp, setSelectedBaseCp,
    masterInfoOpen, setMasterInfoOpen,
    fmeaSelectModalOpen, setFmeaSelectModalOpen,
    availableFmeas, setAvailableFmeas,
    selectedParentFmea, setSelectedParentFmea,
    // Floating windows
    cpSelFloating, fmeaSelFloating,
    // APQP
    apqpModalOpen, setApqpModalOpen,
    apqpList, setApqpList,
    selectedParentApqp, setSelectedParentApqp,
    fmeaLocked, setFmeaLocked,
    // Linkage
    linkageModalOpen, setLinkageModalOpen,
    linkedPfdList, setLinkedPfdList,
    linkedPfdNo,
    // Change tracking
    originalData, setOriginalData,
    // Create modal
    isCreateModalOpen, setIsCreateModalOpen,
    // Triplet
    tripletInfo, setTripletInfo,
    // Functions
    loadAccessLogs, recordAccessLog,
  };
}
