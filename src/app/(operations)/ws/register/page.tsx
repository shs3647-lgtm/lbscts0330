/**
 * @file page.tsx
 * @description WS 등록 페이지 (PFD 등록과 동등 수준)
 * @version 2.0.0
 * @updated 2026-02-10
 */

'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
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
import { ApqpSelectModal, ApqpItem } from '@/components/modals/ApqpSelectModal';
import { DatePickerModal } from '@/components/DatePickerModal';
import { CFTAccessLogTable } from '@/components/tables/CFTAccessLogTable';
import { CFTRegistrationTable, CFTMember, createInitialCFTMembers, ensureRequiredRoles } from '@/components/tables/CFTRegistrationTable';
import { BizInfoProject } from '@/types/bizinfo';
import { UserInfo } from '@/types/user';
import { CFTAccessLog } from '@/types/project-cft';
import WSTopNav from '@/components/layout/WSTopNav';
import { FixedLayout } from '@/components/layout';
import { PFDInfo, INITIAL_PFD, PFDType, PFDSelectType, PfdItem, FmeaItem } from '../types/pfdRegister';
import { generatePFDId } from '../utils/pfdIdUtils';
import { LinkedDocItem, TargetModule, getNextLinkGroupNo } from '@/components/linkage/types';
import { LinkageModal } from '@/components/linkage/LinkageModal';
import { PfdSelectModal } from './components/PfdSelectModal';
import { FmeaSelectModal } from './components/FmeaSelectModal';
import WsBasicInfoTable from './components/PfdBasicInfoTable';

// WS ID 생성 (PFD ID 형식에서 접두사만 ws로 변경)
function generateWSId(wsType: PFDType = 'P'): string {
  return generatePFDId(wsType).replace(/^pfd/i, 'ws');
}

// localStorage 동기화
function syncToLocalStorage(id: string, info: PFDInfo, cft: CFTMember[], apqp: string | null, fmea: string | null, cp: string | null) {
  try {
    let projects = JSON.parse(localStorage.getItem('ws-projects') || '[]');
    projects = projects.filter((p: { id?: string }) => p.id?.toLowerCase() !== id.toLowerCase());
    projects.unshift({
      id, name: info.subject || id, wsType: info.pfdType, wsInfo: info,
      cftMembers: cft, parentApqpNo: apqp, parentFmeaId: fmea, linkedCpNo: cp,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem('ws-projects', JSON.stringify(projects));
  } catch (e) { /* ignore */ }
}

function WSRegisterPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id')?.toLowerCase() || null;
  const fromFmeaId = searchParams.get('fmeaId')?.toLowerCase() || null;
  const fromApqpNo = searchParams.get('apqpNo')?.toLowerCase() || searchParams.get('apqpProjectId')?.toLowerCase() || null;
  const isEditMode = !!editId;

  // 상태
  const [wsInfo, setWsInfo] = useState<PFDInfo>(INITIAL_PFD);
  const [cftMembers, setCftMembers] = useState<CFTMember[]>(createInitialCFTMembers());
  const [wsId, setWsId] = useState('');
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
  const [selectedParentApqp, setSelectedParentApqp] = useState<string | null>(null);
  const [selectedBasePfd, setSelectedBasePfd] = useState<string | null>(null);
  const [fmeaSelectModalOpen, setFmeaSelectModalOpen] = useState(false);
  const [availableFmeas, setAvailableFmeas] = useState<FmeaItem[]>([]);
  const [selectedParentFmea, setSelectedParentFmea] = useState<string | null>(null);
  const [fmeaLocked, setFmeaLocked] = useState(false);
  const [apqpModalOpen, setApqpModalOpen] = useState(false);
  const [apqpList, setApqpList] = useState<ApqpItem[]>([]);

  // 연동 CP
  const [linkedCpList, setLinkedCpList] = useState<LinkedDocItem[]>([]);
  const [linkageModalOpen, setLinkageModalOpen] = useState(false);

  // 접속 로그
  const loadAccessLogs = useCallback(async () => {
    const targetId = wsId || editId;
    if (!targetId) return;
    try {
      const res = await fetch(`/api/auth/access-log?projectId=${targetId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) setAccessLogs(data.logs);
      }
    } catch (e) { /* ignore */ }
  }, [wsId, editId]);

  const recordAccessLog = useCallback(async (action: string, itemType: string, description: string, projectId?: string) => {
    try {
      await fetch('/api/auth/access-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'unknown', userName: user?.name || 'Unknown',
          projectId: projectId || wsId || editId, module: 'WS', action, itemType, description,
        }),
      });
      loadAccessLogs();
    } catch { /* ignore */ }
  }, [user, wsId, editId, loadAccessLogs]);

  useEffect(() => { loadAccessLogs(); }, [loadAccessLogs]);

  // 화면 진입 시 접속 로그 (세션당 1회)
  const accessLoggedRef = useRef(false);
  const dataLoadedRef = useRef(false);
  useEffect(() => {
    if (!user || accessLoggedRef.current) return;
    const sessionKey = `ws_access_logged_${wsId || editId || 'new'}`;
    if (sessionStorage.getItem(sessionKey)) { accessLoggedRef.current = true; return; }
    accessLoggedRef.current = true;
    sessionStorage.setItem(sessionKey, 'true');
    fetch('/api/auth/access-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userName: user.name, projectId: wsId || editId || 'new', module: 'WS', action: 'access', itemType: '등록화면', description: `${user.name}님이 WS 등록화면에 접속` }),
    }).then(() => loadAccessLogs()).catch(() => { /* ignore */ });
  }, [user, wsId, editId, loadAccessLogs]);

  // 페이지 이탈 시 자동 저장
  useEffect(() => {
    if (!user) return;
    const targetId = wsId || editId || 'new';
    const autoSave = () => {
      if (!targetId || targetId === 'new') return;
      try { syncToLocalStorage(targetId, wsInfo, cftMembers, selectedParentApqp || null, selectedParentFmea || null, linkedCpList[0]?.id || null); } catch (e) { /* ignore */ }
    };
    const handleVisibilityChange = () => { if (document.visibilityState === 'hidden') autoSave(); };
    window.addEventListener('beforeunload', autoSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { window.removeEventListener('beforeunload', autoSave); document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, [user, wsId, editId, wsInfo, cftMembers, selectedParentApqp, selectedParentFmea, linkedCpList]);

  // editId 변경 시 dataLoadedRef reset
  useEffect(() => { dataLoadedRef.current = false; }, [editId]);

  // 데이터 로드
  useEffect(() => {
    if (dataLoadedRef.current) return;
    const loadData = async () => {
      if (!isEditMode && !editId) {
        dataLoadedRef.current = true;
        setWsInfo(INITIAL_PFD);
        setCftMembers(createInitialCFTMembers());
        setWsId('');
        setSelectedBasePfd(null);
        setSelectedParentFmea(null);
        setSelectedParentApqp(null);
        return;
      }
      dataLoadedRef.current = true;
      const targetId = editId;
      if (!targetId) return;

      let project: Record<string, unknown> | null = null;

      // API에서 로드
      try {
        const res = await fetch(`/api/ws?wsNo=${targetId}`);
        const data = await res.json();
        if (data.success && data.data) {
          project = data.data;
        }
      } catch (e) { /* ignore */ }

      // DB에 없으면 신규 모드
      if (!project) {
        router.replace('/ws/register');
        return;
      }

      if (project) {
        const projectId = ((project.wsNo as string) || (project.id as string)).toLowerCase();
        const projectType = ((project.pfdType as string) || 'P') as PFDType;
        const loadedInfo: PFDInfo = {
          companyName: (project.companyName as string) || '',
          engineeringLocation: (project.engineeringLocation as string) || '',
          customerName: (project.customerName as string) || '',
          modelYear: (project.modelYear as string) || '',
          subject: (project.subject as string) || '',
          pfdStartDate: (project.wsStartDate as string) || '',
          pfdRevisionDate: (project.wsRevisionDate as string) || '',
          pfdId: projectId, pfdType: projectType,
          processResponsibility: (project.processResponsibility as string) || '',
          confidentialityLevel: (project.confidentialityLevel as string) || '',
          securityLevel: (project.securityLevel as string) || '',
          pfdResponsibleName: (project.wsResponsibleName as string) || (project.manager as string) || '',
          linkedCpNo: (project.linkedCpNo as string) || (project.cpNo as string) || '',
          partName: (project.partName as string) || '',
          partNo: (project.partNo as string) || '',
          createdAt: (project.createdAt as string) || new Date().toISOString().slice(0, 10),
          updatedAt: (project.updatedAt as string) || '',
          processName: (project.processName as string) || '',
        };
        setWsId(projectId);
        setWsInfo(loadedInfo);
        setOriginalData(loadedInfo);

        // CFT 멤버 로드
        if (project.cftMembers) {
          try {
            const parsed = typeof project.cftMembers === 'string' ? JSON.parse(project.cftMembers) : project.cftMembers;
            if (Array.isArray(parsed) && parsed.length > 0) setCftMembers(ensureRequiredRoles(parsed));
          } catch (e) { /* ignore */ }
        }

        if (project.parentApqpNo) setSelectedParentApqp(project.parentApqpNo as string);
        const loadedFmeaId = (project.parentFmeaId as string) || (project.fmeaId as string);
        if (loadedFmeaId) { setSelectedParentFmea(loadedFmeaId.toLowerCase()); setFmeaLocked(true); }
        const loadedCpNo = (project.linkedCpNo as string) || (project.cpNo as string);
        if (loadedCpNo) {
          setLinkedCpList([{
            id: loadedCpNo, module: 'cp' as TargetModule, docType: projectType,
            subject: '', linkGroupNo: 1, isAutoGenerated: true, status: 'linked'
          }]);
        }
        if (!isEditMode) router.replace(`/ws/register?id=${projectId}`);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editId]);

  // FMEA 연동 감지
  useEffect(() => {
    if (fromFmeaId) {
      setSelectedParentFmea(fromFmeaId);
      setFmeaLocked(true);
      fetch(`/api/project-linkage?pfmeaId=${fromFmeaId}`).then(res => res.json()).then(data => {
        const linkage = data.data?.[0];
        if (linkage) {
          setWsInfo(prev => ({
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
      }).catch(() => { /* ignore */ });
    }
  }, [fromFmeaId]);

  // APQP 연동 감지
  useEffect(() => {
    if (fromApqpNo) {
      setSelectedParentApqp(fromApqpNo);
      fetch(`/api/project-linkage?apqpNo=${fromApqpNo}`).then(res => res.json()).then(data => {
        const linkage = data.data?.[0];
        if (linkage) {
          setWsInfo(prev => ({
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
      }).catch(() => { /* ignore */ });
    }
  }, [fromApqpNo]);

  // 편집 모드에서 wsId가 비어있으면 editId 사용
  useEffect(() => {
    if (isEditMode && editId && !wsId) setWsId(editId);
  }, [isEditMode, editId, wsId]);

  // 임시 데이터 초기화
  useEffect(() => {
    if (!isEditMode && !editId) {
      localStorage.removeItem('ws-temp-data');
    }
  }, [isEditMode, editId]);

  // 자동 저장 (temp)
  useEffect(() => {
    if (wsId && (wsInfo.subject || isEditMode)) {
      localStorage.setItem('ws-temp-data', JSON.stringify({ wsInfo, cftMembers, wsId, selectedParentApqp, selectedParentFmea, linkedCpList, savedAt: new Date().toISOString() }));
    }
  }, [wsInfo, cftMembers, wsId, selectedParentApqp, selectedParentFmea, linkedCpList, isEditMode]);

  // 필드 업데이트
  const updateField = (field: keyof PFDInfo, value: string) => setWsInfo(prev => ({ ...prev, [field]: value }));

  // 모달 오프너
  const openWsSelectModal = async (type: PFDSelectType) => {
    let projects: { id?: string; pfdType?: string; pfdInfo?: { subject?: string } }[] = [];
    try { const stored = localStorage.getItem('ws-projects'); if (stored) projects = JSON.parse(stored); } catch { /* ignore */ }
    const filtered = type === 'ALL' || type === 'LOAD' ? projects.filter(p => p.id !== wsId) : projects.filter(p => p.pfdType?.toLowerCase() === type.toLowerCase());
    setAvailablePfds(filtered.map(p => ({ id: p.id || '', subject: p.pfdInfo?.subject || '제목 없음', type: p.pfdType?.toLowerCase() || 'p' })));
    setPfdSelectType(type);
    setPfdSelectModalOpen(true);
  };

  const handlePfdSelect = (selectedId: string) => {
    setPfdSelectModalOpen(false);
    if (pfdSelectType === 'LOAD') { router.push(`/ws/register?id=${selectedId.toLowerCase()}`); window.location.reload(); }
    else setSelectedBasePfd(selectedId.toLowerCase());
  };

  const openFmeaSelectModal = async () => {
    let projects: { id?: string; fmeaInfo?: { subject?: string }; project?: { productName?: string }; fmeaType?: string }[] = [];
    try { const res = await fetch('/api/fmea/projects?type=P'); const data = await res.json(); if (data.success && data.projects?.length > 0) projects = data.projects; } catch { /* ignore */ }
    setAvailableFmeas(projects.map(p => ({ id: p.id || '', subject: p.fmeaInfo?.subject || p.project?.productName || '제목 없음', type: p.fmeaType?.toLowerCase() || 'f' })));
    setFmeaSelectModalOpen(true);
  };

  const loadApqpList = async () => {
    try { const res = await fetch('/api/apqp'); const data = await res.json(); if (data.success && data.apqps) setApqpList(data.apqps.map((p: { apqpNo?: string; subject?: string; customerName?: string }) => ({ apqpNo: p.apqpNo || '', subject: p.subject || '', customerName: p.customerName || '' }))); } catch { setApqpList([]); }
  };

  // 저장
  const handleSave = async () => {
    if (!wsId) {
      alert('WS ID가 없습니다. "새로 작성" 버튼을 눌러 ID를 먼저 생성해주세요.');
      return;
    }
    if (!wsInfo.subject?.trim()) { alert('WS명을 입력해주세요.'); return; }
    setSaveStatus('saving');
    try {
      const finalId = wsId.toLowerCase();
      const res = await fetch('/api/ws', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wsNo: finalId,
          wsInfo: {
            pfdType: wsInfo.pfdType,
            subject: wsInfo.subject,
            companyName: wsInfo.companyName,
            customerName: wsInfo.customerName,
            modelYear: wsInfo.modelYear,
            wsStartDate: wsInfo.pfdStartDate,
            wsRevisionDate: wsInfo.pfdRevisionDate,
            processResponsibility: wsInfo.processResponsibility,
            wsResponsibleName: wsInfo.pfdResponsibleName,
            engineeringLocation: wsInfo.engineeringLocation,
            confidentialityLevel: wsInfo.confidentialityLevel,
            securityLevel: wsInfo.securityLevel,
            partName: wsInfo.partName,
            partNo: wsInfo.partNo,
            processName: wsInfo.processName,
          },
          cftMembers: cftMembers.filter(m => m.name?.trim()),
          parentApqpNo: selectedParentApqp,
          parentFmeaId: selectedParentFmea,
          linkedCpNo: linkedCpList[0]?.id || null,
          linkedCpNos: linkedCpList.map(cp => cp.id),
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      syncToLocalStorage(finalId, wsInfo, cftMembers, selectedParentApqp, selectedParentFmea, linkedCpList[0]?.id || null);
      localStorage.setItem('ws-last-edited', finalId);
      setOriginalData({ ...wsInfo });

      // ProjectLinkage 동기화
      try {
        await fetch('/api/project-linkage', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wsNo: finalId, apqpNo: selectedParentApqp || null, pfmeaId: selectedParentFmea || null,
            cpNo: linkedCpList[0]?.id || null, projectName: wsInfo.subject || '', subject: wsInfo.subject || '',
            companyName: wsInfo.companyName || '', customerName: wsInfo.customerName || '',
            responsibleName: wsInfo.pfdResponsibleName || '', modelYear: wsInfo.modelYear || '',
            engineeringLocation: wsInfo.engineeringLocation || '', processResponsibility: wsInfo.processResponsibility || '',
            confidentialityLevel: wsInfo.confidentialityLevel || '', partName: wsInfo.partName || wsInfo.subject || '', partNo: wsInfo.partNo || '',
          }),
        });
      } catch (linkErr) { /* ignore */ }

      await recordAccessLog(isEditMode ? 'update' : 'create', '기초정보', isEditMode ? `WS 수정: ${wsInfo.subject}` : `WS 등록: ${wsInfo.subject}`, finalId);
      setSaveStatus('saved');
      if (!isEditMode) router.replace(`/ws/register?id=${finalId}`);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      alert('저장 실패: ' + msg);
      setSaveStatus('idle');
    }
  };

  // 새로 등록
  const handleNewRegister = () => {
    const newId = generateWSId(wsInfo.pfdType);
    setWsInfo(INITIAL_PFD);
    setCftMembers(createInitialCFTMembers());
    setWsId(newId);
    setSelectedBasePfd(null);
    setSelectedParentFmea(null);
    setSelectedParentApqp(null);
    setLinkedCpList([]);
    setFmeaLocked(false);
    localStorage.removeItem('ws-last-edited');
    localStorage.removeItem('ws-temp-data');
    router.replace(`/ws/register?id=${newId}`);
  };

  // 사용자 선택
  const handleUserSelect = (userInfo: UserInfo) => {
    if (userModalTarget === 'responsible') {
      setWsInfo(prev => ({
        ...prev, pfdResponsibleName: userInfo.name,
        processResponsibility: userInfo.department || '',
        companyName: 'AMPSYSTEM', engineeringLocation: userInfo.factory || '',
      }));
    } else if (userModalTarget === 'design') {
      setWsInfo(prev => ({
        ...prev, processResponsibility: userInfo.department || '',
        pfdResponsibleName: userInfo.name,
        companyName: 'AMPSYSTEM', engineeringLocation: userInfo.factory || '',
      }));
    } else if (selectedMemberIndex !== null) {
      const updated = [...cftMembers];
      updated[selectedMemberIndex] = { ...updated[selectedMemberIndex], name: userInfo.name, department: userInfo.department || '', position: userInfo.position || '', phone: userInfo.phone || '', email: userInfo.email || '' };
      setCftMembers(updated);
    }
    setUserModalOpen(false);
  };

  return (
    <FixedLayout topNav={<WSTopNav selectedDocumentId={wsId || editId} />} topNavHeight={48} showSidebar={true} contentPadding="px-1 py-2">
      <div className="font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isEditMode ? '✏️' : '📝'}</span>
            <h1 className="text-sm font-bold text-gray-800">WS {isEditMode ? '수정' : '등록'}</h1>
            {wsId && <span className="text-xs text-gray-500 ml-2">ID: {wsId}</span>}
            {isEditMode && <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-bold">수정모드</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleNewRegister} className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-semibold">➕ 새로 작성(Create)</button>
            <button onClick={() => openWsSelectModal('LOAD')} className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 font-semibold">편집</button>
            <button onClick={handleSave} disabled={saveStatus === 'saving'} className={`px-4 py-1.5 text-xs font-bold rounded ${saveStatus === 'saving' ? 'bg-gray-300 text-gray-500' : saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-[#5A6C7D] text-white hover:bg-[#4A5C6D]'}`}>
              {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'saved' ? '저장됨' : '저장'}
            </button>
          </div>
        </div>

        {/* 기본정보 테이블 */}
        <WsBasicInfoTable
          pfdInfo={wsInfo} pfdId={wsId} isEditMode={isEditMode} linkedCpList={linkedCpList}
          selectedBasePfd={selectedBasePfd} selectedParentApqp={selectedParentApqp} selectedParentFmea={selectedParentFmea} fmeaLocked={fmeaLocked}
          cftMembers={cftMembers}
          setPfdId={setWsId} updateField={updateField} setSelectedBasePfd={setSelectedBasePfd} setSelectedParentApqp={setSelectedParentApqp} setSelectedParentFmea={setSelectedParentFmea}
          setStartDateModalOpen={setStartDateModalOpen} setRevisionDateModalOpen={setRevisionDateModalOpen} setBizInfoModalOpen={setBizInfoModalOpen}
          setUserModalTarget={setUserModalTarget} setUserModalOpen={setUserModalOpen} loadApqpList={loadApqpList} setApqpModalOpen={setApqpModalOpen}
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

      {/* 모달 */}
      {bizInfoModalOpen && (
        <BizInfoSelectModal
          isOpen={bizInfoModalOpen}
          onClose={() => setBizInfoModalOpen(false)}
          onSelect={(p: BizInfoProject) => {
            setWsInfo(prev => ({
              ...prev,
              customerName: p.customerName || '',
              modelYear: p.modelYear || '',
              partName: p.productName || '',
              partNo: p.partNo || '',
              companyName: prev.companyName || '',
            }));
            setBizInfoModalOpen(false);
          }}
        />
      )}
      {userModalOpen && <UserSelectModal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} onSelect={handleUserSelect} />}
      {startDateModalOpen && <DatePickerModal isOpen={startDateModalOpen} onClose={() => setStartDateModalOpen(false)} onSelect={(d) => { updateField('pfdStartDate', d); setStartDateModalOpen(false); }} title="시작 일자 선택" />}
      {revisionDateModalOpen && <DatePickerModal isOpen={revisionDateModalOpen} onClose={() => setRevisionDateModalOpen(false)} onSelect={(d) => { updateField('pfdRevisionDate', d); setRevisionDateModalOpen(false); }} title="목표 완료일 선택" />}
      {apqpModalOpen && <ApqpSelectModal isOpen={apqpModalOpen} onClose={() => setApqpModalOpen(false)} onSelect={(apqpNo: string) => { setSelectedParentApqp(apqpNo); setApqpModalOpen(false); }} apqps={apqpList} />}
      <PfdSelectModal isOpen={pfdSelectModalOpen} onClose={() => setPfdSelectModalOpen(false)} onSelect={handlePfdSelect} availablePfds={availablePfds} pfdSelectType={pfdSelectType} />
      <FmeaSelectModal isOpen={fmeaSelectModalOpen} onClose={() => setFmeaSelectModalOpen(false)} onSelect={(id) => { setSelectedParentFmea(id); setFmeaSelectModalOpen(false); }} availableFmeas={availableFmeas} />

      {/* 연동 모달 */}
      <LinkageModal
        isOpen={linkageModalOpen}
        onClose={() => setLinkageModalOpen(false)}
        sourceInfo={{ id: wsId, module: 'pfd', subject: wsInfo.subject, customerName: wsInfo.customerName, docType: wsInfo.pfdType }}
        linkedPfdList={[]}
        linkedCpList={linkedCpList}
        onAddLinkedDoc={(targetModule, generatedId) => {
          if (!wsId) { alert('먼저 WS를 저장해주세요.'); return; }
          const nextGroupNo = getNextLinkGroupNo(linkedCpList);
          const year = new Date().getFullYear().toString().slice(-2);
          const newId = generatedId || `cp${year}-${wsInfo.pfdType.toLowerCase()}${String(linkedCpList.length + 1).padStart(3, '0')}-L${String(nextGroupNo).padStart(2, '0')}`;
          setLinkedCpList(prev => [...prev, { id: newId, module: 'cp', docType: wsInfo.pfdType, subject: wsInfo.subject, linkGroupNo: nextGroupNo, isAutoGenerated: false, status: 'linked' }]);
        }}
        onRemoveLinkedDoc={(docId) => { setLinkedCpList(prev => prev.filter(d => d.id !== docId)); }}
        onToggleLinkage={(docId, isLinked) => {
          setLinkedCpList(prev => prev.map(d => d.id === docId ? { ...d, status: isLinked ? 'linked' : 'solo' } : d));
        }}
        showPfdSection={false}
        showCpSection={true}
      />
    </FixedLayout>
  );
}

export default function WSRegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-lg text-gray-600">Loading...</div></div>}>
      <WSRegisterPageContent />
    </Suspense>
  );
}
