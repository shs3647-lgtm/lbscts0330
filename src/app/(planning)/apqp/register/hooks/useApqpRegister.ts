/**
 * @file useApqpRegister.ts
 * @description APQP 등록 페이지 메인 훅 - 상태, 데이터 로딩, 연동 문서 관리
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { CFTMember, createInitialCFTMembers, ensureRequiredRoles } from '@/components/tables/CFTRegistrationTable';
import { CFTAccessLog } from '@/types/project-cft';
import { UserInfo } from '@/types/user';
import { LinkedDocItem, TargetModule } from '@/components/linkage/types';
import { APQPInfo, INITIAL_APQP } from '../types';
import { generateAPQPId, syncToLocalStorage } from '../utils';
import { toast } from '@/hooks/useToast';

export function useApqpRegister() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id')?.toLowerCase() || null;
  const isEditMode = !!editId;

  // 상태
  const [apqpInfo, setApqpInfo] = useState<APQPInfo>(INITIAL_APQP);
  const [cftMembers, setCftMembers] = useState<CFTMember[]>(createInitialCFTMembers());
  const [apqpId, setApqpId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [accessLogs, setAccessLogs] = useState<CFTAccessLog[]>([]);

  // 모달 상태
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalTarget, setUserModalTarget] = useState<'responsible' | 'design' | 'cft'>('cft');
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);
  const [startDateModalOpen, setStartDateModalOpen] = useState(false);
  const [revisionDateModalOpen, setRevisionDateModalOpen] = useState(false);

  // 하위 FMEA/DFMEA/CP/PFD 선택
  const [linkedFmea, setLinkedFmea] = useState<string | null>(null);
  const [linkedDfmea, setLinkedDfmea] = useState<string | null>(null);
  const [linkedCp, setLinkedCp] = useState<string | null>(null);
  const [linkedPfd, setLinkedPfd] = useState<string | null>(null);
  const [fmeaModalOpen, setFmeaModalOpen] = useState(false);
  const [fmeaSelectTarget, setFmeaSelectTarget] = useState<'P' | 'D'>('P');
  const [cpModalOpen, setCpModalOpen] = useState(false);
  const [pfdModalOpen, setPfdModalOpen] = useState(false);
  const [fmeaList, setFmeaList] = useState<{ id: string; subject: string; type: string }[]>([]);
  const [cpList, setCpList] = useState<{ id: string; subject: string; type: string }[]>([]);
  const [pfdList, setPfdList] = useState<{ id: string; subject: string; type: string }[]>([]);

  // 표준 연동 모달 상태 (v2.0)
  const [linkageModalOpen, setLinkageModalOpen] = useState(false);
  const [linkedFmeaList, setLinkedFmeaList] = useState<LinkedDocItem[]>([]);
  const [linkedCpList, setLinkedCpList] = useState<LinkedDocItem[]>([]);
  const [linkedPfdList, setLinkedPfdList] = useState<LinkedDocItem[]>([]);

  // APQP 편집용 선택 모달
  const [apqpSelectModalOpen, setApqpSelectModalOpen] = useState(false);
  const [availableApqps, setAvailableApqps] = useState<{ id: string; subject: string }[]>([]);

  // 변경 이력 추적
  const [originalData, setOriginalData] = useState<APQPInfo | null>(null);

  // 새로 만들기 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // =====================================================
  // 접속 로그
  // =====================================================
  const loadAccessLogs = useCallback(async () => {
    const targetId = apqpId || editId;
    if (!targetId) return;
    try {
      const res = await fetch(`/api/auth/access-log?projectId=${targetId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) setAccessLogs(data.logs);
      }
    } catch (e) { console.error('[접속로그 로드] 오류:', e); }
  }, [apqpId, editId]);

  const recordAccessLog = useCallback(async (action: string, itemType: string, description: string, projectId?: string) => {
    try {
      await fetch('/api/auth/access-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'unknown',
          userName: user?.name || 'Unknown',
          projectId: projectId || apqpId || editId,
          module: 'APQP',
          action, itemType, description,
        }),
      });
      loadAccessLogs();
    } catch (e) { console.error('[접속로그 기록] 오류:', e); }
  }, [user, apqpId, editId, loadAccessLogs]);

  useEffect(() => { loadAccessLogs(); }, [loadAccessLogs]);

  // 화면 진입 시 접속 로그 기록
  const accessLoggedRef = useRef(false);
  const dataLoadedRef = useRef(false);
  useEffect(() => {
    if (!user || accessLoggedRef.current) return;
    accessLoggedRef.current = true;
    const targetId = apqpId || editId || 'new';
    fetch('/api/auth/access-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id, userName: user.name, projectId: targetId,
        module: 'APQP', action: 'access', itemType: '등록화면',
        description: `${user.name}님이 APQP 등록화면에 접속`,
      }),
    }).then(() => loadAccessLogs()).catch((e) => { console.error('[화면진입 접속로그] 오류:', e); });
  }, [user, apqpId, editId, loadAccessLogs]);

  // =====================================================
  // 자동 저장 (페이지 이탈 시)
  // =====================================================
  useEffect(() => {
    if (!user) return;
    const targetId = apqpId || editId || 'new';
    const autoSave = () => {
      if (!targetId || targetId === 'new') return;
      try { syncToLocalStorage(targetId, apqpInfo, cftMembers, linkedFmea || '', linkedCp || ''); } catch (e) { console.error('[자동저장] 오류:', e); }
    };
    const handleVisibilityChange = () => { if (document.visibilityState === 'hidden') autoSave(); };
    window.addEventListener('beforeunload', autoSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', autoSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, apqpId, editId, apqpInfo, cftMembers, linkedFmea, linkedCp]);

  // editId 변경 시 dataLoadedRef reset
  useEffect(() => { dataLoadedRef.current = false; }, [editId]);

  // =====================================================
  // 데이터 로드
  // =====================================================
  useEffect(() => {
    if (dataLoadedRef.current) return;
    const loadData = async () => {
      if (!isEditMode && !editId) {
        dataLoadedRef.current = true;
        setApqpInfo(INITIAL_APQP);
        setCftMembers(createInitialCFTMembers());
        setApqpId('');
        setLinkedFmea(null); setLinkedDfmea(null); setLinkedCp(null); setLinkedPfd(null);
        return;
      }
      dataLoadedRef.current = true;
      const targetId = editId;
      if (!targetId) return;

      let project: any = null;
      try {
        const res = await fetch(`/api/apqp?apqpNo=${targetId}`);
        const data = await res.json();
        if (data.success && data.apqp) project = data.apqp;
      } catch (e) { console.error('[APQP 데이터 로드] 오류:', e); toast.error('APQP 데이터를 불러오는데 실패했습니다.'); }

      if (!project) {
        localStorage.removeItem('apqp-last-edited');
        const localProjects = localStorage.getItem('apqp-projects');
        if (localProjects) {
          try {
            const projects = JSON.parse(localProjects);
            const filtered = projects.filter((p: any) => p.id?.toLowerCase() !== targetId.toLowerCase());
            localStorage.setItem('apqp-projects', JSON.stringify(filtered));
          } catch (e) { console.error('[localStorage 파싱] 오류:', e); }
        }
        router.replace('/apqp/register');
        return;
      }

      const projectId = (project.apqpNo || project.id).toLowerCase();
      const loadedInfo: APQPInfo = {
        companyName: project.companyName || project.apqpInfo?.companyName || '',
        engineeringLocation: project.engineeringLocation || project.apqpInfo?.engineeringLocation || '',
        customerName: project.customerName || project.apqpInfo?.customerName || '',
        modelYear: project.modelYear || project.apqpInfo?.modelYear || '',
        subject: project.subject || project.apqpInfo?.subject || '',
        apqpStartDate: project.apqpStartDate || project.apqpInfo?.apqpStartDate || '',
        apqpRevisionDate: project.apqpRevisionDate || project.apqpInfo?.apqpRevisionDate || '',
        apqpId: projectId,
        developmentLevel: project.developmentLevel || project.apqpInfo?.developmentLevel || '',
        processResponsibility: project.processResponsibility || project.apqpInfo?.processResponsibility || '',
        confidentialityLevel: project.confidentialityLevel || project.apqpInfo?.confidentialityLevel || '',
        apqpResponsibleName: project.apqpResponsibleName || project.apqpInfo?.apqpResponsibleName || '',
        partNo: project.partNo || project.apqpInfo?.partNo || '',
        partName: project.productName || project.apqpInfo?.partName || '',
      };

      setApqpId(projectId);
      setApqpInfo(loadedInfo);
      setOriginalData(loadedInfo);
      if (project.cftMembers?.length > 0) setCftMembers(ensureRequiredRoles(project.cftMembers));

      setLinkedFmea(project.linkedFmea || null);
      setLinkedDfmea(project.linkedDfmea || null);
      setLinkedCp(project.linkedCp || null);
      setLinkedPfd(project.linkedPfd || null);

      if (project.linkedPfd) {
        setLinkedPfdList([{ id: project.linkedPfd, module: 'pfd', docType: 'P', subject: loadedInfo.subject || '', linkGroupNo: 1, isAutoGenerated: false, status: 'linked' }]);
      }
      if (project.linkedCp) {
        setLinkedCpList([{ id: project.linkedCp, module: 'cp', docType: 'L', subject: loadedInfo.subject || '', linkGroupNo: 1, isAutoGenerated: false, status: 'linked' }]);
      }

      if (!isEditMode) router.replace(`/apqp/register?id=${projectId}`);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editId]);

  // 필드 업데이트
  const updateField = (field: keyof APQPInfo, value: string) => setApqpInfo(prev => ({ ...prev, [field]: value }));

  // 자동 저장 (임시 데이터)
  useEffect(() => {
    if (apqpId && (apqpInfo.subject || isEditMode)) {
      localStorage.setItem('apqp-temp-data', JSON.stringify({ apqpInfo, cftMembers, apqpId, linkedFmea, linkedCp, savedAt: new Date().toISOString() }));
    }
  }, [apqpInfo, cftMembers, apqpId, linkedFmea, linkedCp, isEditMode]);

  // 신규 모드에서 임시 데이터 초기화
  useEffect(() => {
    if (!isEditMode && !editId) localStorage.removeItem('apqp-temp-data');
  }, [isEditMode, editId]);

  // =====================================================
  // FMEA/CP/PFD 목록 로드
  // =====================================================
  const loadFmeaList = async (target: 'P' | 'D') => {
    setFmeaSelectTarget(target);
    try {
      const res = await fetch(`/api/fmea/projects?type=${target}`);
      const data = await res.json();
      if (data.success && data.projects?.length > 0) {
        setFmeaList(data.projects.map((p: any) => ({ id: p.id, subject: p.fmeaInfo?.subject || '제목 없음', type: p.fmeaType?.toLowerCase() || 'p' })));
      } else { setFmeaList([]); }
    } catch (e) { console.error('[FMEA 목록 로드] 오류:', e); setFmeaList([]); toast.error('FMEA 목록을 불러오는데 실패했습니다.'); }
    setFmeaModalOpen(true);
  };

  const loadCpList = async () => {
    try {
      const res = await fetch('/api/control-plan');
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setCpList(data.data.map((p: any) => ({ id: p.cpNo || p.id, subject: p.subject || '제목 없음', type: p.cpType?.toLowerCase() || 'p' })));
      }
    } catch (e) { console.error('[CP 목록 로드] 오류:', e); toast.error('CP 목록을 불러오는데 실패했습니다.'); }
    setCpModalOpen(true);
  };

  const loadPfdList = async () => {
    try {
      const res = await fetch('/api/pfd/list');
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setPfdList(data.data.map((p: any) => ({ id: p.pfdNo || p.id, subject: p.subject || '제목 없음', type: p.pfdType?.toLowerCase() || 'p' })));
      }
    } catch (e) { console.error('[PFD 목록 로드] 오류:', e); toast.error('PFD 목록을 불러오는데 실패했습니다.'); }
    setPfdModalOpen(true);
  };

  // =====================================================
  // 연동 문서 관리
  // =====================================================
  const handleAddLinkedDoc = useCallback(async (targetModule: TargetModule, generatedId?: string) => {
    const year = new Date().getFullYear().toString().slice(-2);
    const devTypeChar = apqpInfo.developmentLevel === 'NEW' ? 'n' :
      apqpInfo.developmentLevel === 'MAJOR' ? 'ma' :
        apqpInfo.developmentLevel === 'MINOR' ? 'mi' : 'p';

    if (targetModule === 'pfd') {
      const nextGroupNo = linkedPfdList.length + 1;
      const newId = generatedId || `pfd${year}-${devTypeChar}${String(nextGroupNo).padStart(3, '0')}-l01`;
      try {
        await fetch('/api/pfd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pfdNo: newId,
            pfdInfo: {
              subject: apqpInfo.subject || `PFD - ${newId}`,
              companyName: apqpInfo.companyName || '',
              customerName: apqpInfo.customerName || '',
              modelYear: apqpInfo.modelYear || '',
              engineeringLocation: apqpInfo.engineeringLocation || '',
            },
            parentApqpNo: apqpId,
            parentFmeaId: linkedFmea || null,
          }),
        });
      } catch (err) { console.error('[PFD 생성] 오류:', err); toast.error('PFD 생성에 실패했습니다.'); }
      setLinkedPfdList(prev => [...prev, { id: newId, module: 'pfd', docType: 'P', subject: apqpInfo.subject, linkGroupNo: nextGroupNo, isAutoGenerated: false, status: 'linked' }]);
      setLinkedPfd(newId);
    } else if (targetModule === 'cp') {
      const nextGroupNo = linkedCpList.length + 1;
      const newId = generatedId || `cp${year}-${devTypeChar}${String(nextGroupNo).padStart(3, '0')}-l01`;
      try {
        await fetch('/api/control-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpNo: newId,
            cpInfo: {
              subject: apqpInfo.subject || `CP - ${newId}`,
              companyName: apqpInfo.companyName || '',
              customerName: apqpInfo.customerName || '',
              modelYear: apqpInfo.modelYear || '',
              engineeringLocation: apqpInfo.engineeringLocation || '',
            },
            parentApqpNo: apqpId,
            parentFmeaId: linkedFmea || null,
          }),
        });
      } catch (err) { console.error('[CP 생성] 오류:', err); toast.error('CP 생성에 실패했습니다.'); }
      setLinkedCpList(prev => [...prev, { id: newId, module: 'cp', docType: 'P', subject: apqpInfo.subject, linkGroupNo: nextGroupNo, isAutoGenerated: false, status: 'linked' }]);
      setLinkedCp(newId);
    }
  }, [apqpId, apqpInfo, linkedPfdList.length, linkedCpList.length, linkedFmea]);

  const handleRemoveLinkedDoc = useCallback((docId: string, targetModule: TargetModule) => {
    if (targetModule === 'pfd') {
      setLinkedPfdList(prev => prev.filter(d => d.id !== docId));
      if (linkedPfd === docId) setLinkedPfd(null);
    } else if (targetModule === 'cp') {
      setLinkedCpList(prev => prev.filter(d => d.id !== docId));
      if (linkedCp === docId) setLinkedCp(null);
    }
  }, [linkedPfd, linkedCp]);

  const handleToggleLinkage = useCallback((docId: string, isLinked: boolean, targetModule: TargetModule) => {
    if (targetModule === 'pfd') {
      setLinkedPfdList(prev => prev.map(d => d.id === docId ? { ...d, status: isLinked ? 'linked' : 'solo' } : d));
    } else if (targetModule === 'cp') {
      setLinkedCpList(prev => prev.map(d => d.id === docId ? { ...d, status: isLinked ? 'linked' : 'solo' } : d));
    }
  }, []);

  // =====================================================
  // 사용자 선택 핸들러
  // =====================================================
  const handleUserSelect = (selectedUser: UserInfo) => {
    if (userModalTarget === 'responsible' || userModalTarget === 'design') {
      setApqpInfo(prev => ({
        ...prev,
        apqpResponsibleName: selectedUser.name,
        processResponsibility: selectedUser.department || '',
        engineeringLocation: (selectedUser as any).factory || prev.engineeringLocation || '',
        companyName: prev.companyName || 'AMPSYSTEM',
      }));
    } else if (selectedMemberIndex !== null) {
      const updated = [...cftMembers];
      updated[selectedMemberIndex] = {
        ...updated[selectedMemberIndex],
        name: selectedUser.name, department: selectedUser.department || '',
        position: selectedUser.position || '', phone: selectedUser.phone || '', email: selectedUser.email || '',
        task: selectedUser.remark || updated[selectedMemberIndex].task || '',
      };
      setCftMembers(updated);
    }
    setUserModalOpen(false);
  };

  // 새로 등록 (모달 오픈)
  const handleNewRegister = () => setIsCreateModalOpen(true);

  // APQP 편집 목록 로드
  const handleEditClick = () => {
    try {
      const stored = localStorage.getItem('apqp-projects');
      if (stored) {
        const projects = JSON.parse(stored).filter((p: any) => p.id !== apqpId);
        setAvailableApqps(projects.map((p: any) => ({ id: p.id, subject: p.apqpInfo?.subject || p.name || '제목 없음' })));
      }
    } catch (e) { console.error('[APQP 목록 로드] 오류:', e); setAvailableApqps([]); }
    setApqpSelectModalOpen(true);
  };

  return {
    // 기본
    user, router, editId, isEditMode, apqpId, setApqpId,
    apqpInfo, setApqpInfo, updateField,
    cftMembers, setCftMembers,
    saveStatus, setSaveStatus,
    accessLogs, originalData, setOriginalData,
    recordAccessLog,
    // 모달 상태
    bizInfoModalOpen, setBizInfoModalOpen,
    userModalOpen, setUserModalOpen, userModalTarget, setUserModalTarget,
    selectedMemberIndex, setSelectedMemberIndex,
    startDateModalOpen, setStartDateModalOpen,
    revisionDateModalOpen, setRevisionDateModalOpen,
    isCreateModalOpen, setIsCreateModalOpen,
    // 연동
    linkedFmea, setLinkedFmea, linkedDfmea, setLinkedDfmea,
    linkedCp, setLinkedCp, linkedPfd, setLinkedPfd,
    fmeaModalOpen, setFmeaModalOpen, fmeaSelectTarget,
    cpModalOpen, setCpModalOpen, pfdModalOpen, setPfdModalOpen,
    fmeaList, cpList, pfdList,
    linkageModalOpen, setLinkageModalOpen,
    linkedFmeaList, linkedCpList, linkedPfdList,
    apqpSelectModalOpen, setApqpSelectModalOpen, availableApqps,
    // 핸들러
    loadFmeaList, loadCpList, loadPfdList,
    handleAddLinkedDoc, handleRemoveLinkedDoc, handleToggleLinkage,
    handleUserSelect, handleNewRegister, handleEditClick,
    generateAPQPId,
  };
}
