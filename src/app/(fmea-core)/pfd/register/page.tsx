/**
 * @file page.tsx
 * @description PFD 등록 페이지 (모듈화 완료 - 500줄 이하)
 * @version 13.0.0
 * @updated 2026-01-27
 */

'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useLocale, T } from '@/lib/locale';
// ✅ xlsx/xlsx-js-style: dynamic import
const BizInfoSelectModal = dynamic(
  () => import('@/components/modals/BizInfoSelectModal').then(mod => ({ default: mod.BizInfoSelectModal })),
  { ssr: false }
);
// ✅ xlsx/xlsx-js-style: dynamic import
const UserSelectModal = dynamic(
  () => import('@/components/modals/UserSelectModal').then(mod => ({ default: mod.UserSelectModal })),
  { ssr: false }
);
// ApqpSelectModal 삭제됨 (APQP 모듈 제거)
import { DatePickerModal } from '@/components/DatePickerModal';
import { CFTAccessLogTable } from '@/components/tables/CFTAccessLogTable';
import { CFTRegistrationTable, CFTMember, createInitialCFTMembers, ensureRequiredRoles } from '@/components/tables/CFTRegistrationTable';
import { BizInfoProject } from '@/types/bizinfo';
import { UserInfo } from '@/types/user';
import { CFTAccessLog } from '@/types/project-cft';
import PFDTopNav from '@/components/layout/PFDTopNav';
import { FixedLayout } from '@/components/layout';
import { PFDInfo, INITIAL_PFD, PFDType, PFDSelectType, PfdItem, FmeaItem, CpItem, LinkedCpItem } from '../types/pfdRegister';
import { generatePFDId, generateLinkedPfdNo, generateLinkedCpNo, isValidPfdNo } from '../utils/pfdIdUtils';
import { LinkageModal } from '@/components/linkage/LinkageModal';
import { LinkedDocItem, TargetModule, getNextLinkGroupNo } from '@/components/linkage/types';
import { PfdSelectModal } from './components/PfdSelectModal';
import { FmeaSelectModal } from './components/FmeaSelectModal';
import { CpSelectModal } from './components/CpSelectModal';
import PfdBasicInfoTable from './components/PfdBasicInfoTable';
import CreateDocumentModal from '@/components/modals/CreateDocumentModal'; // ★ 새로 만들기 모달

// localStorage 동기화
function syncToLocalStorage(id: string, info: PFDInfo, cft: CFTMember[], basePfd: string | null, apqp: string | null, fmea: string | null, cp: string | null) {
  try {
    let projects = JSON.parse(localStorage.getItem('pfd-projects') || '[]');
    projects = projects.filter((p: any) => p.id?.toLowerCase() !== id.toLowerCase());
    projects.unshift({
      id, name: info.subject || id, pfdType: info.pfdType, pfdInfo: info,
      cftMembers: cft, parentPfdId: basePfd, parentApqpNo: apqp, parentFmeaId: fmea, linkedCpNo: cp,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem('pfd-projects', JSON.stringify(projects));
  } catch (e) { console.error('[PFD localStorage 동기화] 오류:', e); }
}

// 메인 컴포넌트
function PFDRegisterPageContent() {
  const { user } = useAuth();
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id')?.toLowerCase() || null;
  const fromFmeaId = searchParams.get('fmeaId')?.toLowerCase() || null;
  const fromCpNo = searchParams.get('cpNo')?.toLowerCase() || null;
  const isEditMode = !!editId;

  // 상태
  const [pfdInfo, setPfdInfo] = useState<PFDInfo>(INITIAL_PFD);
  const [cftMembers, setCftMembers] = useState<CFTMember[]>(createInitialCFTMembers());
  const [pfdId, setPfdId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [accessLogs, setAccessLogs] = useState<CFTAccessLog[]>([]);
  const [originalData, setOriginalData] = useState<PFDInfo | null>(null);

  // 모달 상태
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalTarget, setUserModalTarget] = useState<'responsible' | 'design' | 'cft'>('cft');
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);
  const [startDateModalOpen, setStartDateModalOpen] = useState(false);
  const [revisionDateModalOpen, setRevisionDateModalOpen] = useState(false);

  // 선택 상태
  const [pfdSelectModalOpen, setPfdSelectModalOpen] = useState(false);
  const [pfdSelectType, setPfdSelectType] = useState<PFDSelectType>('ALL');
  const [availablePfds, setAvailablePfds] = useState<PfdItem[]>([]);
  const [selectedBasePfd, setSelectedBasePfd] = useState<string | null>(null);
  const [fmeaSelectModalOpen, setFmeaSelectModalOpen] = useState(false);
  const [availableFmeas, setAvailableFmeas] = useState<FmeaItem[]>([]);
  const [selectedParentFmea, setSelectedParentFmea] = useState<string | null>(null);
  const [fmeaLocked, setFmeaLocked] = useState(false);
  const [cpSelectModalOpen, setCpSelectModalOpen] = useState(false);
  const [availableCps, setAvailableCps] = useState<CpItem[]>([]);
  const [cpLocked, setCpLocked] = useState(false);
  const [selectedParentApqp, setSelectedParentApqp] = useState<string | null>(null);

  // ★ 표준 연동 모달 상태
  const [linkageModalOpen, setLinkageModalOpen] = useState(false);
  const [linkedCpList, setLinkedCpList] = useState<LinkedDocItem[]>([]);

  // ★ 새로 만들기 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 접속 로그
  const loadAccessLogs = useCallback(async () => {
    const targetId = pfdId || editId;
    if (!targetId) return;
    try {
      const res = await fetch(`/api/auth/access-log?projectId=${targetId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) setAccessLogs(data.logs);
      }
    } catch (e) { console.error('[PFD 접속로그 로드] 오류:', e); }
  }, [pfdId, editId]);

  const recordAccessLog = useCallback(async (action: string, itemType: string, description: string, projectId?: string) => {
    try {
      await fetch('/api/auth/access-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'unknown', userName: user?.name || 'Unknown',
          projectId: projectId || pfdId || editId, module: 'PFD', action, itemType, description,
        }),
      });
      loadAccessLogs();
    } catch (e) { console.error('[PFD 접속로그 기록] 오류:', e); }
  }, [user, pfdId, editId, loadAccessLogs]);

  useEffect(() => { loadAccessLogs(); }, [loadAccessLogs]);

  // 화면 진입 시 접속 로그 (세션당 1회)
  const accessLoggedRef = useRef(false);
  const dataLoadedRef = useRef(false);  // ★ 데이터 로드 중복 방지
  useEffect(() => {
    if (!user || accessLoggedRef.current) return;
    const sessionKey = `pfd_access_logged_${pfdId || editId || 'new'}`;
    if (sessionStorage.getItem(sessionKey)) { accessLoggedRef.current = true; return; }
    accessLoggedRef.current = true;
    sessionStorage.setItem(sessionKey, 'true');
    fetch('/api/auth/access-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userName: user.name, projectId: pfdId || editId || 'new', module: 'PFD', action: 'access', itemType: '등록화면', description: `${user.name}님이 PFD 등록화면에 접속` }),
    }).then(() => loadAccessLogs()).catch((e) => { console.error('[PFD 페이지 접속 로그] 오류:', e); });
  }, [user, pfdId, editId, loadAccessLogs]);

  // ★★★ 2026-02-02: 페이지 이탈 시 자동 저장 ★★★
  useEffect(() => {
    if (!user) return;
    const targetId = pfdId || editId || 'new';

    const autoSave = () => {
      if (!targetId || targetId === 'new') return;
      try {
        syncToLocalStorage(targetId, pfdInfo, cftMembers, selectedBasePfd || null, selectedParentApqp || null, selectedParentFmea || null, linkedCpList[0]?.id || null);
      } catch (e) {
      }
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
  }, [user, pfdId, editId, pfdInfo, cftMembers, selectedBasePfd, selectedParentApqp, selectedParentFmea, linkedCpList]);

  // ★ editId 변경 시 dataLoadedRef reset (Same Page Navigation 대응)
  useEffect(() => {
    dataLoadedRef.current = false;
  }, [editId]);

  // 데이터 로드
  useEffect(() => {
    // ★ 이미 로드된 경우 스킵 (무한 루프 방지)
    if (dataLoadedRef.current) return;

    const loadData = async () => {
      // ★★★ ID가 없으면 마지막 편집 또는 최신 PFD 자동 로드 ★★★
      if (!isEditMode && !editId) {
        dataLoadedRef.current = true;  // ★ 로드 완료 표시

        // 1. localStorage 리다이렉트 로직 제거 (신규 작성 시 빈 폼 보장)
        // 2. 최신 글 자동 로드 로직 제거

        // ★★★ 신규 작성 모드: 완전한 빈 폼 (ID만 표시) ★★★
        setPfdInfo(INITIAL_PFD);  // ★ 사용자 정보 자동 채움 제거
        setCftMembers(createInitialCFTMembers());
        setPfdId('');
        setSelectedBasePfd(null);
        setSelectedParentFmea(null);
        setSelectedParentApqp(null);
        return;
      }

      dataLoadedRef.current = true;  // ★ 로드 완료 표시

      const targetId = editId;
      if (!targetId) return;

      let project: any = null;

      // ★ 1. API에서 먼저 로드 (DB 우선)
      try {
        const res = await fetch(`/api/pfd?pfdNo=${targetId}`);
        const data = await res.json();
        if (data.success && data.data) {
          project = data.data;
        }
      } catch (e) {
      }

      // ★ 2. DB에 없으면 → 삭제된 데이터, localStorage 잔재 정리 후 신규 모드
      if (!project) {
        localStorage.removeItem('pfd-last-edited');
        const localProjects = localStorage.getItem('pfd-projects');
        if (localProjects) {
          try {
            const projects = JSON.parse(localProjects);
            const filtered = projects.filter((p: any) => p.id?.toLowerCase() !== targetId.toLowerCase());
            localStorage.setItem('pfd-projects', JSON.stringify(filtered));
          } catch (e) { console.error('[PFD localStorage 파싱] 오류:', e); }
        }
        router.replace('/pfd/register');
        return;
      }

      if (project) {
        const projectId = (project.pfdNo || project.id).toLowerCase();
        const projectType = (project.pfdType || 'P') as PFDType;
        const loadedInfo: PFDInfo = {
          companyName: project.companyName || project.pfdInfo?.companyName || '',  // ★ 사용자 정보 폴백 제거
          engineeringLocation: project.engineeringLocation || project.pfdInfo?.engineeringLocation || '',
          customerName: project.customerName || project.pfdInfo?.customerName || '',
          modelYear: project.modelYear || project.pfdInfo?.modelYear || '',
          subject: project.subject || project.pfdInfo?.subject || '',
          pfdStartDate: project.pfdStartDate || project.pfdInfo?.pfdStartDate || '',
          pfdRevisionDate: project.pfdRevisionDate || project.pfdInfo?.pfdRevisionDate || '',
          pfdId: projectId, pfdType: projectType,
          processResponsibility: project.processResponsibility || project.pfdInfo?.processResponsibility || '',
          confidentialityLevel: project.confidentialityLevel || project.pfdInfo?.confidentialityLevel || '',
          securityLevel: project.securityLevel || project.pfdInfo?.securityLevel || '',  // ★ 기밀수준
          pfdResponsibleName: project.pfdResponsibleName || project.pfdInfo?.pfdResponsibleName || '',  // ★ user?.name 폴백 제거
          linkedCpNo: project.linkedCpNo || project.cpNo || '',
          partName: project.partName || project.pfdInfo?.partName || '',  // ★ 품명 로드
          partNo: project.partNo || project.pfdInfo?.partNo || '',        // ★ 품번 로드
          linkedDfmeaNo: project.linkedDfmeaNo || '',  // ★ 상위 DFMEA 로드
          createdAt: project.createdAt || project.pfdInfo?.createdAt || new Date().toISOString().slice(0, 10),
          updatedAt: project.updatedAt || project.pfdInfo?.updatedAt || '',
        };
        setPfdId(projectId);
        setPfdInfo(loadedInfo);
        setOriginalData(loadedInfo);
        // ★ CFT 멤버 로드 (JSON string 파싱)
        if (project.cftMembers) {
          try {
            const parsed = typeof project.cftMembers === 'string'
              ? JSON.parse(project.cftMembers)
              : project.cftMembers;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCftMembers(parsed);
            }
          } catch (e) {
          }
        }
        if (projectType === 'M') setSelectedBasePfd(projectId);
        else if (project.parentPfdId) setSelectedBasePfd(project.parentPfdId.toLowerCase());
        if (project.parentApqpNo) setSelectedParentApqp(project.parentApqpNo);

        // ★★★ ProjectLinkage 기초정보 자동 병합 제거 (2026-02-01) ★★★
        // 사용자가 등록화면에서 직접 입력하도록 변경

        const loadedFmeaId = project.parentFmeaId || project.fmeaId;
        if (loadedFmeaId) { setSelectedParentFmea(loadedFmeaId.toLowerCase()); setFmeaLocked(true); }
        const loadedCpNo = project.linkedCpNo || project.cpNo;
        if (loadedCpNo) {
          setLinkedCpList([{
            id: loadedCpNo, module: 'cp' as TargetModule, docType: projectType,
            subject: '', linkGroupNo: 1, isAutoGenerated: true, status: 'linked'
          }]);
          setCpLocked(true);
        }
        if (!isEditMode) router.replace(`/pfd/register?id=${projectId}`);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editId]);

  // FMEA/CP 연동 감지 및 정보 로드
  useEffect(() => {
    if (fromFmeaId) {
      setSelectedParentFmea(fromFmeaId);
      setFmeaLocked(true);
      // 통합 DB에서 정보 가져오기
      fetch(`/api/project-linkage?pfmeaId=${fromFmeaId}`).then(res => res.json()).then(data => {
        const linkage = data.data?.[0];
        if (linkage) {
          setPfdInfo(prev => ({
            ...prev,
            customerName: linkage.customerName || prev.customerName,
            modelYear: linkage.modelYear || prev.modelYear,
            companyName: linkage.companyName || prev.companyName,
            subject: linkage.subject || prev.subject,
            partName: linkage.subject?.split('+')[0] || prev.partName,
            partNo: linkage.partNo || prev.partNo,
            engineeringLocation: linkage.engineeringLocation || prev.engineeringLocation,
            processResponsibility: linkage.processResponsibility || prev.processResponsibility,
            pfdResponsibleName: linkage.responsibleName || prev.pfdResponsibleName,
          }));
        }
      });
    }
  }, [fromFmeaId]);

  useEffect(() => {
    if (fromCpNo) {
      setLinkedCpList([{ id: fromCpNo, module: 'cp' as TargetModule, docType: 'P', subject: '', linkGroupNo: 0, isAutoGenerated: false, status: 'pending' }]);
      setCpLocked(true);
      // 통합 DB에서 정보 가져오기
      fetch(`/api/project-linkage?cpNo=${fromCpNo}`).then(res => res.json()).then(data => {
        const linkage = data.data?.[0];
        if (linkage) {
          setPfdInfo(prev => ({
            ...prev,
            customerName: linkage.customerName || prev.customerName,
            modelYear: linkage.modelYear || prev.modelYear,
            companyName: linkage.companyName || prev.companyName,
            subject: linkage.subject || prev.subject,
            partName: linkage.subject?.split('+')[0] || prev.partName,
            partNo: linkage.partNo || prev.partNo,
            engineeringLocation: linkage.engineeringLocation || prev.engineeringLocation,
            processResponsibility: linkage.processResponsibility || prev.processResponsibility,
            pfdResponsibleName: linkage.responsibleName || prev.pfdResponsibleName,
          }));
        }
      });
    }
  }, [fromCpNo]);


  // ★★★ 자동 ID 생성 로직 완전 제거 (2026-01-29) ★★★
  // ID는 오직 모달(CreateDocumentModal)에서만 생성됨
  // 신규 등록 시 빈 폼 표시, "새로 작성" 버튼 클릭 필요

  // ★★★ 편집 모드에서 pfdId가 비어있으면 editId 사용 (2026-01-28) ★★★
  useEffect(() => {
    if (isEditMode && editId && !pfdId) {
      setPfdId(editId);
    }
  }, [isEditMode, editId, pfdId]);

  // ★★★ 자동 생성 및 기초정보 연동 삭제됨 - DB에서 로드한 데이터만 사용 (2026-01-29) ★★★
  // 연동 CP 및 기초정보는 loadData에서 DB 데이터를 로드하여 설정함

  // ★★★ 임시 데이터 초기화 (2026-01-29) ★★★
  // 삭제된 데이터가 localStorage 캐시로 인해 화면에 남는 문제 방지
  useEffect(() => {
    if (!isEditMode && !editId) {
      localStorage.removeItem('pfd-temp-data');
    }
  }, [isEditMode, editId]);

  // 자동 저장 - ★ ID가 있을 때만 저장 (신규 모드에서는 저장 안 함)
  useEffect(() => {
    if (pfdId && (pfdInfo.subject || isEditMode)) {
      localStorage.setItem('pfd-temp-data', JSON.stringify({ pfdInfo, cftMembers, pfdId, selectedBasePfd, selectedParentApqp, selectedParentFmea, linkedCpList, savedAt: new Date().toISOString() }));
    }
  }, [pfdInfo, cftMembers, pfdId, selectedBasePfd, selectedParentApqp, selectedParentFmea, linkedCpList, isEditMode]);

  // 필드 업데이트
  const updateField = (field: keyof PFDInfo, value: string) => setPfdInfo(prev => ({ ...prev, [field]: value }));

  // 모달 오프너
  const openPfdSelectModal = async (type: PFDSelectType) => {
    let projects: any[] = [];
    try { const stored = localStorage.getItem('pfd-projects'); if (stored) projects = JSON.parse(stored); } catch (e) { console.error('[PFD 프로젝트 목록 파싱] 오류:', e); }
    const filtered = type === 'ALL' || type === 'LOAD' ? projects.filter((p: any) => p.id !== pfdId) : projects.filter((p: any) => p.pfdType?.toLowerCase() === type.toLowerCase());
    setAvailablePfds(filtered.map((p: any) => ({ id: p.id, subject: p.pfdInfo?.subject || '제목 없음', type: p.pfdType?.toLowerCase() || 'p' })));
    setPfdSelectType(type);
    setPfdSelectModalOpen(true);
  };

  const handlePfdSelect = (selectedId: string) => {
    setPfdSelectModalOpen(false);
    if (pfdSelectType === 'LOAD') { router.push(`/pfd/register?id=${selectedId.toLowerCase()}`); window.location.reload(); }
    else setSelectedBasePfd(selectedId.toLowerCase());
  };

  const openFmeaSelectModal = async () => {
    let projects: any[] = [];
    try { const res = await fetch('/api/fmea/projects?type=P'); const data = await res.json(); if (data.success && data.projects?.length > 0) projects = data.projects; } catch (e) { console.error('[PFD FMEA 프로젝트 목록 로드] 오류:', e); }
    setAvailableFmeas(projects.map((p: any) => ({ id: p.id, subject: p.fmeaInfo?.subject || p.project?.productName || '제목 없음', type: p.fmeaType?.toLowerCase() || 'f' })));
    setFmeaSelectModalOpen(true);
  };


  // 저장
  const handleSave = async () => {
    // ★★★ ID가 없으면 저장 불가 - 모달로 먼저 생성 필요 ★★★
    if (!pfdId) {
      alert('PFD ID가 없습니다. "새로 작성" 버튼을 눌러 ID를 먼저 생성해주세요.');
      setIsCreateModalOpen(true);
      return;
    }
    if (!pfdInfo.subject?.trim()) { alert('PFD명을 입력해주세요.'); return; }
    setSaveStatus('saving');
    try {
      const finalId = pfdId.toLowerCase();

      const res = await fetch('/api/pfd', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pfdNo: finalId,
          pfdInfo: {
            pfdType: pfdInfo.pfdType,
            subject: pfdInfo.subject,
            companyName: pfdInfo.companyName,
            customerName: pfdInfo.customerName,
            modelYear: pfdInfo.modelYear,
            pfdStartDate: pfdInfo.pfdStartDate,
            pfdRevisionDate: pfdInfo.pfdRevisionDate,
            processResponsibility: pfdInfo.processResponsibility,
            pfdResponsibleName: pfdInfo.pfdResponsibleName,
            engineeringLocation: pfdInfo.engineeringLocation,
            confidentialityLevel: pfdInfo.confidentialityLevel,  // PFD 종류
            securityLevel: pfdInfo.securityLevel,  // ★ 기밀수준 추가
            partName: pfdInfo.partName,
            partNo: pfdInfo.partNo,
          },
          cftMembers: cftMembers.filter(m => m.name?.trim()),
          parentApqpNo: selectedParentApqp,
          parentFmeaId: selectedParentFmea,
          linkedCpNo: linkedCpList[0]?.id || null,
          basePfdId: selectedBasePfd,
          linkedCpNos: linkedCpList.map(cp => cp.id),
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      syncToLocalStorage(finalId, pfdInfo, cftMembers, selectedBasePfd, selectedParentApqp, selectedParentFmea, linkedCpList[0]?.id || null);
      localStorage.setItem('pfd-last-edited', finalId);
      setOriginalData({ ...pfdInfo });

      // ★★★ ProjectLinkage에 기초정보 동기화 (2026-02-01) ★★★
      try {
        await fetch('/api/project-linkage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pfdNo: finalId,
            apqpNo: selectedParentApqp || null,
            pfmeaId: selectedParentFmea || null,
            cpNo: linkedCpList[0]?.id || null,
            projectName: pfdInfo.subject || '',
            subject: pfdInfo.subject || '',
            companyName: pfdInfo.companyName || '',
            customerName: pfdInfo.customerName || '',
            responsibleName: pfdInfo.pfdResponsibleName || '',
            modelYear: pfdInfo.modelYear || '',
            engineeringLocation: pfdInfo.engineeringLocation || '',
            processResponsibility: pfdInfo.processResponsibility || '',
            confidentialityLevel: pfdInfo.confidentialityLevel || '',
            partName: pfdInfo.partName || pfdInfo.subject || '',
            partNo: pfdInfo.partNo || '',
          }),
        });
      } catch (linkErr) {
      }

      await recordAccessLog(isEditMode ? 'update' : 'create', '기초정보', isEditMode ? `PFD 수정: ${pfdInfo.subject}` : `PFD 등록: ${pfdInfo.subject}`, finalId);
      setSaveStatus('saved');
      if (!isEditMode) router.replace(`/pfd/register?id=${finalId}`);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e: any) { alert('저장 실패: ' + (e.message || '알 수 없는 오류')); setSaveStatus('idle'); }
  };

  // 새로 등록 - ★ 모달로 변경
  const handleNewRegister = () => {
    setIsCreateModalOpen(true);
  };

  // 사용자 선택
  const handleUserSelect = (userInfo: UserInfo) => {
    if (userModalTarget === 'responsible') {
      // ★ 담당자 선택 시 회사명=AMPSYSTEM, 엔지니어링 위치=공장
      setPfdInfo(prev => ({
        ...prev,
        pfdResponsibleName: userInfo.name,
        processResponsibility: userInfo.department || '',
        companyName: 'AMPSYSTEM',                    // ★ 회사명 고정
        engineeringLocation: userInfo.factory || ''  // ★ 공장 (예: 부산공장)
      }));
    } else if (userModalTarget === 'design') {
      // ★ 설계 담당자도 동일하게 처리
      setPfdInfo(prev => ({
        ...prev,
        processResponsibility: userInfo.department || '',
        pfdResponsibleName: userInfo.name,
        companyName: 'AMPSYSTEM',                    // ★ 회사명 고정
        engineeringLocation: userInfo.factory || ''  // ★ 공장 (예: 부산공장)
      }));
    } else if (selectedMemberIndex !== null) {
      const updated = [...cftMembers];
      updated[selectedMemberIndex] = { ...updated[selectedMemberIndex], name: userInfo.name, department: userInfo.department || '', position: userInfo.position || '', phone: userInfo.phone || '', email: userInfo.email || '' };
      setCftMembers(updated);
    }
    setUserModalOpen(false);
  };

  return (
    <FixedLayout topNav={<PFDTopNav linkedFmeaId={selectedParentFmea} linkedCpNo={linkedCpList[0]?.id} />} topNavHeight={48} showSidebar={true} contentPadding="px-1 py-2">
      <div className="font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isEditMode ? '✏️' : '📝'}</span>
            <h1 className="text-sm font-bold text-gray-800" title={isEditMode ? 'PFD Edit' : 'PFD Register'}>PFD {isEditMode ? t('수정') : t('등록')}({isEditMode ? 'Edit' : 'Register'})</h1>
            {pfdId && <span className="text-xs text-gray-500 ml-2">ID: {pfdId}</span>}
            {isEditMode && <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-bold"><T>수정모드</T></span>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleNewRegister} className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-semibold">➕ 새로 작성(Create)</button>
            <button onClick={() => openPfdSelectModal('LOAD')} className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 font-semibold">✏️ <T>편집</T></button>
            <button onClick={handleSave} disabled={saveStatus === 'saving'} className={`px-4 py-1.5 text-xs font-bold rounded ${saveStatus === 'saving' ? 'bg-gray-300 text-gray-500' : saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {saveStatus === 'saving' ? `⏳ ${t('저장 중...(Saving)')}` : saveStatus === 'saved' ? `✓ ${t('저장됨(Saved)')}` : `💾 ${t('저장(Save)')}`}
            </button>
          </div>
        </div>

        {/* 기본정보 테이블 (컴포넌트화) */}
        <PfdBasicInfoTable
          pfdInfo={pfdInfo} pfdId={pfdId} isEditMode={isEditMode} linkedCpList={linkedCpList}
          selectedBasePfd={selectedBasePfd} selectedParentFmea={selectedParentFmea} fmeaLocked={fmeaLocked}
          cftMembers={cftMembers}
          setPfdId={setPfdId} updateField={updateField} setSelectedBasePfd={setSelectedBasePfd} setSelectedParentFmea={setSelectedParentFmea}
          setStartDateModalOpen={setStartDateModalOpen} setRevisionDateModalOpen={setRevisionDateModalOpen} setBizInfoModalOpen={setBizInfoModalOpen}
          setUserModalTarget={setUserModalTarget} setUserModalOpen={setUserModalOpen}
          openFmeaSelectModal={openFmeaSelectModal} openCpManageModal={() => setLinkageModalOpen(true)}
        />

        {/* CFT 정보 */}
        <CFTRegistrationTable
          members={cftMembers}
          onMembersChange={setCftMembers}
          onUserSearch={(index: number) => { setUserModalTarget('cft'); setSelectedMemberIndex(index); setUserModalOpen(true); }}
          onSave={handleSave}
          onReset={() => setCftMembers(createInitialCFTMembers())}
        />

        {/* 접속 로그 */}
        <CFTAccessLogTable accessLogs={accessLogs} />
      </div>

      {/* 모달들 */}
      {bizInfoModalOpen && (
        <BizInfoSelectModal
          isOpen={bizInfoModalOpen}
          onClose={() => setBizInfoModalOpen(false)}
          onSelect={(p: BizInfoProject) => {
            // ★ 고객 선택 시 품명/품번도 자동으로 채움 (APQP와 동일)
            setPfdInfo(prev => ({
              ...prev,
              customerName: p.customerName || '',
              modelYear: p.modelYear || '',
              partName: p.productName || '',  // ★ 품명 자동 입력
              partNo: p.partNo || '',                       // ★ 품번 자동 입력
              companyName: prev.companyName || ''            // 기존 회사명 유지
            }));
            setBizInfoModalOpen(false);
          }}
        />
      )}
      {userModalOpen && <UserSelectModal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} onSelect={handleUserSelect} />}
      {startDateModalOpen && <DatePickerModal isOpen={startDateModalOpen} onClose={() => setStartDateModalOpen(false)} onSelect={(d) => { updateField('pfdStartDate', d); setStartDateModalOpen(false); }} title={t('시작 일자 선택')} />}
      {revisionDateModalOpen && <DatePickerModal isOpen={revisionDateModalOpen} onClose={() => setRevisionDateModalOpen(false)} onSelect={(d) => { updateField('pfdRevisionDate', d); setRevisionDateModalOpen(false); }} title={t('목표 완료일 선택')} />}
      <PfdSelectModal isOpen={pfdSelectModalOpen} onClose={() => setPfdSelectModalOpen(false)} onSelect={handlePfdSelect} availablePfds={availablePfds} pfdSelectType={pfdSelectType} />
      <FmeaSelectModal isOpen={fmeaSelectModalOpen} onClose={() => setFmeaSelectModalOpen(false)} onSelect={(id) => { setSelectedParentFmea(id); setFmeaSelectModalOpen(false); const newId = generateLinkedPfdNo(generatePFDId(pfdInfo.pfdType)); setPfdId(newId); router.replace(`/pfd/register?id=${newId}`); }} availableFmeas={availableFmeas} />
      {/* 표준 연동 모달 */}
      <LinkageModal
        isOpen={linkageModalOpen}
        onClose={() => setLinkageModalOpen(false)}
        sourceInfo={{ id: pfdId, module: 'pfd', subject: pfdInfo.subject, customerName: pfdInfo.customerName, docType: pfdInfo.pfdType }}
        linkedPfdList={[]}
        linkedCpList={linkedCpList}
        onAddLinkedDoc={(targetModule, generatedId) => {
          if (!pfdId) { alert('먼저 PFD를 저장해주세요.'); return; }
          const nextGroupNo = getNextLinkGroupNo(linkedCpList);
          const year = new Date().getFullYear().toString().slice(-2);
          const newId = generatedId || `cp${year}-${pfdInfo.pfdType.toLowerCase()}${String(linkedCpList.length + 1).padStart(3, '0')}-L${String(nextGroupNo).padStart(2, '0')}`;
          setLinkedCpList(prev => [...prev, { id: newId, module: 'cp', docType: pfdInfo.pfdType, subject: pfdInfo.subject, linkGroupNo: nextGroupNo, isAutoGenerated: false, status: 'linked' }]);
        }}
        onRemoveLinkedDoc={(docId, targetModule) => { setLinkedCpList(prev => prev.filter(d => d.id !== docId)); }}
        onToggleLinkage={(docId, isLinked, targetModule) => {
          setLinkedCpList(prev => prev.map(d => d.id === docId ? { ...d, status: isLinked ? 'linked' : 'solo' } : d));
        }}
        showPfdSection={false}
        showCpSection={true}
      />

      {/* ★ 새로 만들기 모달 */}
      <CreateDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        sourceApp="pfd"
      />
    </FixedLayout>
  );
}

export default function PFDRegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-lg text-gray-600">Loading...</div></div>}>
      <PFDRegisterPageContent />
    </Suspense>
  );
}
