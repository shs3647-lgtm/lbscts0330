/**
 * @file page.tsx
 * @description Control Plan 등록 페이지 (모듈화 완료)
 * @line-count ~350줄 (500줄 미만)
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BizInfoSelectModal } from '@/components/modals/BizInfoSelectModal';
import { UserSelectModal } from '@/components/modals/UserSelectModal';
import { CFTAccessLogTable } from '@/components/tables/CFTAccessLogTable';
import { CFTRegistrationTable, CFTMember, createInitialCFTMembers } from '@/components/tables/CFTRegistrationTable';
import { BizInfoProject } from '@/types/bizinfo';
import { UserInfo } from '@/types/user';
import { CFTAccessLog } from '@/types/project-cft';
import CPTopNav from '@/components/layout/CPTopNav';
import { CPInfo, CPType, INITIAL_CP, FmeaSelectItem, CpSelectItem, SaveStatus } from './types';
import { useRegisterHandlers, generateCPId } from './hooks';
import { FmeaSelectModal, CpSelectModal } from './components';

// ============ 메인 컴포넌트 ============
function CPRegisterPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id')?.toLowerCase() || null; // ★ 소문자 정규화
  const fmeaIdFromUrl = searchParams.get('fmeaId')?.toLowerCase() || null; // ★ FMEA 리스트에서 선택한 경우
  const isEditMode = !!editId;

  // 상태 관리
  const [cpInfo, setCpInfo] = useState<CPInfo>(INITIAL_CP);
  const [cpId, setCpId] = useState('');
  const [cftMembers, setCftMembers] = useState<CFTMember[]>(createInitialCFTMembers());
  
  // 모달 상태
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);
  const [userModalTarget, setUserModalTarget] = useState<'responsible' | 'cft'>('cft');
  
  // FMEA 선택 모달 상태 (상위 FMEA)
  const [fmeaSelectModalOpen, setFmeaSelectModalOpen] = useState(false);
  const [fmeaSelectType, setFmeaSelectType] = useState<'M' | 'F' | 'P' | 'ALL'>('ALL');
  const [availableFmeas, setAvailableFmeas] = useState<FmeaSelectItem[]>([]);
  const [selectedParentFmea, setSelectedParentFmea] = useState<string | null>(null);
  
  // CP 선택 모달 상태 (상위 CP / 기초정보 등록용)
  const [cpSelectModalOpen, setCpSelectModalOpen] = useState(false);
  const [cpSelectType, setCpSelectType] = useState<'M' | 'F' | 'P'>('M');
  const [availableCps, setAvailableCps] = useState<CpSelectItem[]>([]);
  const [selectedBaseCp, setSelectedBaseCp] = useState<string | null>(null);
  
  // ★ 상위 APQP 선택 상태 (APQP가 최상위) - 문자열로 관리 (selectedParentFmea, selectedBaseCp와 동일)
  const [selectedParentApqp, setSelectedParentApqp] = useState<string | null>(null);
  const [apqpModalOpen, setApqpModalOpen] = useState(false);
  const [apqpList, setApqpList] = useState<Array<{apqpNo: string; subject: string; customerName?: string}>>([]);
  
  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [cftSaveStatus, setCftSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [showMissingFields, setShowMissingFields] = useState(false);
  const [loading, setLoading] = useState(false);

  // ★ APQP 목록 로드 (상위 APQP 선택용)
  const loadApqpList = async () => {
    try {
      const res = await fetch('/api/apqp');
      const result = await res.json();
      if (result.success && result.apqps) {
        setApqpList(result.apqps.map((p: any) => ({
          apqpNo: p.apqpNo,
          subject: p.subject || p.productName || '',
          customerName: p.customerName || '',
        })));
      }
    } catch (error) {
      console.error('APQP 목록 로드 실패:', error);
    }
  };

  // ★ APQP 모달 열기
  const openApqpModal = () => {
    loadApqpList();
    setApqpModalOpen(true);
  };
  
  // 핸들러 훅
  const {
    handleCpTypeChange,
    updateField,
    openFmeaSelectModal,
    openCpSelectModal,
    handleSave,
  } = useRegisterHandlers({
    cpInfo, setCpInfo,
    cpId, setCpId,
    cftMembers,
    selectedParentApqp: selectedParentApqp || null, selectedParentFmea, selectedBaseCp, // ★ 이미 문자열이므로 그대로 전달
    setSelectedBaseCp,  // ★ 상위 CP 설정 함수 전달
    setSaveStatus, setShowMissingFields,
    setAvailableFmeas, setFmeaSelectModalOpen, setFmeaSelectType,
    setAvailableCps, setCpSelectModalOpen, setCpSelectType,
    isEditMode, // ★ 수정 모드 여부 전달
  });
  
  // 초기화 및 수정 모드 데이터 로드
  useEffect(() => {
    const loadCpData = async () => {
      // URL 파라미터에서 fmeaId 확인 (FMEA 리스트에서 선택한 경우)
      const urlParams = new URLSearchParams(window.location.search);
      const fmeaIdFromUrl = urlParams.get('fmeaId');
      
      if (isEditMode && editId) {
        setLoading(true);
        try {
          // 1. DB에서 먼저 로드 시도 (소문자로 정규화)
          const normalizedEditId = editId.toLowerCase();
          const response = await fetch(`/api/control-plan?cpNo=${normalizedEditId}`);
          const result = await response.json();

          if (result.success && result.data) {
            const cp = result.data;
            setCpId(cp.cpNo);
            const cpType = (cp.cpType || 'P') as 'M' | 'F' | 'P';
            setCpInfo({
              companyName: cp.companyName || '',
              engineeringLocation: cp.engineeringLocation || '',
              customerName: cp.customerName || '',
              modelYear: cp.modelYear || '',
              subject: cp.subject || '',
              cpStartDate: cp.cpStartDate || '',
              cpRevisionDate: cp.cpRevisionDate || '',
              cpProjectName: cp.subject || '',
              cpId: cp.cpNo,
              processResponsibility: cp.processResponsibility || '',
              confidentialityLevel: cp.confidentialityLevel || '',
              cpResponsibleName: cp.cpResponsibleName || '',
              cpType: cpType,
            });
            if (cp.fmeaNo || cp.fmeaId) {
              setSelectedParentFmea(cp.fmeaNo || cp.fmeaId);
            }
            // ★ MASTER CP는 상위 CP가 자신이 되도록 설정
            if (cpType === 'M') {
              setSelectedBaseCp(cp.cpNo);
            } else if (cp.baseCpId || cp.parentCpId) {
              setSelectedBaseCp(cp.baseCpId || cp.parentCpId);
            }
            // ★ parentApqpNo 로드 (문자열로 저장)
            if (cp.parentApqpNo) {
              setSelectedParentApqp(cp.parentApqpNo);
            }
            // CFT 멤버 로드
            if (cp.cftMembers && cp.cftMembers.length > 0) {
              const loadedMembers: CFTMember[] = cp.cftMembers.map((m: any, idx: number) => ({
                id: m.id || (idx + 1).toString(),
                role: m.role || '',
                name: m.name || '',
                department: m.department || '',
                position: m.position || '',
                task: m.task || '',
                email: m.email || '',
                phone: m.phone || '',
                remark: m.remark || '',
              }));
              
              // ★ 단일 역할 중복 제거 (Champion, Leader, PM, Moderator는 각각 첫 번째만 유지)
              const SINGLE_ROLES = ['Champion', 'Leader', 'PM', 'Moderator'];
              for (const role of SINGLE_ROLES) {
                const membersWithRole = loadedMembers.filter(m => m.role === role);
                if (membersWithRole.length > 1) {
                  let firstFound = false;
                  loadedMembers.forEach(m => {
                    if (m.role === role) {
                      if (!firstFound) {
                        firstFound = true;
                      } else {
                        m.role = '';
                        console.warn(`[CP 등록] ⚠️ 중복 ${role} 제거: ${m.name || '(이름 없음)'}`);
                      }
                    }
                  });
                  console.warn(`[CP 등록] ⚠️ ${role} 중복 발견: ${membersWithRole.length}명 → 첫 번째만 유지`);
                }
              }
              
              // 10개 최소 행 유지
              // ★ 10행 보장 로직 제거
              setCftMembers(loadedMembers);
            }
            console.log(`✅ DB에서 CP ${cp.cpNo} 로드 완료 (CFT ${cp.cftMembers?.length || 0}명)`);
          } else {
            // 2. DB에서 못 찾으면 localStorage에서 로드
            const stored = localStorage.getItem('cp-projects');
            if (stored) {
              const projects = JSON.parse(stored);
              const found = projects.find((p: any) => p.id?.toLowerCase() === editId.toLowerCase());
              if (found) {
                setCpId(found.id);
                setCpInfo(found.cpInfo || INITIAL_CP);
                if (found.parentFmeaId) setSelectedParentFmea(found.parentFmeaId);
                if (found.baseCpId) setSelectedBaseCp(found.baseCpId);
                // ★ parentApqpNo 로드 (문자열로 저장)
                if (found.parentApqpNo) {
                  setSelectedParentApqp(found.parentApqpNo);
                }
                if (found.cftMembers) {
                  // ★ localStorage에서 로드할 때도 중복 제거
                  const loadedMembers: CFTMember[] = found.cftMembers.map((m: any, idx: number) => ({
                    id: m.id || (idx + 1).toString(),
                    role: m.role || '',
                    name: m.name || '',
                    department: m.department || '',
                    position: m.position || '',
                    task: m.task || '',
                    email: m.email || '',
                    phone: m.phone || '',
                    remark: m.remark || '',
                  }));
                  
                  // ★ 단일 역할 중복 제거
                  const SINGLE_ROLES = ['Champion', 'Leader', 'PM', 'Moderator'];
                  for (const role of SINGLE_ROLES) {
                    const membersWithRole = loadedMembers.filter(m => m.role === role);
                    if (membersWithRole.length > 1) {
                      let firstFound = false;
                      loadedMembers.forEach(m => {
                        if (m.role === role) {
                          if (!firstFound) {
                            firstFound = true;
                          } else {
                            m.role = '';
                            console.warn(`[CP 등록] ⚠️ 중복 ${role} 제거: ${m.name || '(이름 없음)'}`);
                          }
                        }
                      });
                    }
                  }
                  
                  // ★ 10행 보장 로직 제거
                  setCftMembers(loadedMembers);
                }
                console.log(`✅ localStorage에서 CP ${found.id} 로드 완료`);
              }
            }
          }
        } catch (error) {
          console.error('CP 로드 실패:', error);
          // localStorage 폴백
          const stored = localStorage.getItem('cp-projects');
          if (stored) {
            const projects = JSON.parse(stored);
            const found = projects.find((p: any) => p.id?.toUpperCase() === editId.toUpperCase());
            if (found) {
              setCpId(found.id);
              setCpInfo(found.cpInfo || INITIAL_CP);
              // ★ parentApqpNo 로드 (문자열로 저장)
              if (found.parentApqpNo) {
                setSelectedParentApqp(found.parentApqpNo);
              }
            }
          }
        } finally {
          setLoading(false);
        }
      } else {
        // ★ 신규 등록 모드: DB에서 최신 CP 정보 로드
        let lastCp: any = null;
        
        // 1. DB에서 전체 CP 목록 조회하여 가장 최근 것 로드 (우선순위 1)
        console.log('[CP 등록] DB에서 최신 CP 조회 시도...');
        try {
          const res = await fetch('/api/control-plan');
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data && data.data.length > 0) {
              // 가장 최근 것 선택 (createdAt 기준 내림차순 정렬되어 있다고 가정)
              const latestCpNo = data.data[0].cpNo;
              // 전체 정보를 위해 다시 상세 조회
              const detailRes = await fetch(`/api/control-plan?cpNo=${latestCpNo}`);
              if (detailRes.ok) {
                const detailData = await detailRes.json();
                if (detailData.success && detailData.data) {
                  lastCp = detailData.data;
                  console.log('[CP 등록] ✅ DB에서 최신 CP 로드:', lastCp.cpNo);
                }
              }
            } else {
              console.warn('[CP 등록] ⚠️ DB에 등록된 CP가 없습니다.');
            }
          } else {
            console.error('[CP 등록] ❌ DB 조회 실패:', res.status, res.statusText);
          }
        } catch (error) {
          console.error('[CP 등록] ❌ DB 조회 중 오류:', error);
        }
        
        // 2. localStorage의 마지막 작업 CP ID로 시도 (임시 데이터, 폴백용)
        if (!lastCp) {
          const lastEditedCpId = localStorage.getItem('cp-last-edited');
          if (lastEditedCpId) {
            console.log('[CP 등록] DB에 데이터 없음, localStorage 임시 데이터 확인:', lastEditedCpId);
            try {
              const normalizedId = lastEditedCpId.toLowerCase();
              const response = await fetch(`/api/control-plan?cpNo=${normalizedId}`);
              const result = await response.json();
              
              if (result.success && result.data) {
                lastCp = result.data;
                console.log('[CP 등록] ✅ localStorage 기반 CP 로드 (임시 데이터):', lastCp.cpNo);
              }
            } catch (error) {
              console.warn('[CP 등록] localStorage 기반 로드 실패:', error);
            }
          }
        }
        
        // 3. 마지막 CP 정보가 있으면 로드
        if (lastCp) {
          setCpId(lastCp.cpNo);
          const cpType = (lastCp.cpType || 'P') as 'M' | 'F' | 'P';
          setCpInfo({
            companyName: lastCp.companyName || '',
            engineeringLocation: lastCp.engineeringLocation || '',
            customerName: lastCp.customerName || '',
            modelYear: lastCp.modelYear || '',
            subject: lastCp.subject || '',
            cpStartDate: lastCp.cpStartDate || '',
            cpRevisionDate: lastCp.cpRevisionDate || '',
            cpProjectName: lastCp.subject || '',
            cpId: lastCp.cpNo,
            processResponsibility: lastCp.processResponsibility || '',
            confidentialityLevel: lastCp.confidentialityLevel || '',
            cpResponsibleName: lastCp.cpResponsibleName || '',
            cpType: cpType,
          });
          if (lastCp.fmeaNo || lastCp.fmeaId) {
            setSelectedParentFmea(lastCp.fmeaNo || lastCp.fmeaId);
          }
          // ★ MASTER CP는 상위 CP가 자신이 되도록 설정
          if (cpType === 'M') {
            setSelectedBaseCp(lastCp.cpNo);
          } else if (lastCp.baseCpId || lastCp.parentCpId) {
            setSelectedBaseCp(lastCp.baseCpId || lastCp.parentCpId);
          }
          // ★ parentApqpNo 로드 (문자열로 저장)
          if (lastCp.parentApqpNo) {
            setSelectedParentApqp(lastCp.parentApqpNo);
          }
          
          // ★ CFT 멤버 로드 (필드 매핑 포함)
          if (lastCp.cftMembers && lastCp.cftMembers.length > 0) {
            const mappedMembers: CFTMember[] = lastCp.cftMembers.map((m: any, idx: number) => ({
              id: m.id || (idx + 1).toString(),
              role: m.role || '',
              name: m.name || '',
              department: m.department || '',
              position: m.position || '',
              task: m.task || '',
              email: m.email || '',
              phone: m.phone || '',
              remark: m.remark || m.remarks || '',
            }));
            
            // ★ 단일 역할 중복 제거 (Champion, Leader, PM, Moderator는 각각 첫 번째만 유지)
            const SINGLE_ROLES = ['Champion', 'Leader', 'PM', 'Moderator'];
            for (const role of SINGLE_ROLES) {
              const membersWithRole = mappedMembers.filter(m => m.role === role);
              if (membersWithRole.length > 1) {
                let firstFound = false;
                mappedMembers.forEach(m => {
                  if (m.role === role) {
                    if (!firstFound) {
                      firstFound = true;
                    } else {
                      m.role = '';
                      console.warn(`[CP 등록] ⚠️ 중복 ${role} 제거: ${m.name || '(이름 없음)'}`);
                    }
                  }
                });
                console.warn(`[CP 등록] ⚠️ ${role} 중복 발견: ${membersWithRole.length}명 → 첫 번째만 유지`);
              }
            }
            
            // ★ 10행 보장 로직 제거
            setCftMembers(mappedMembers);
            console.log('[CP 등록] ✅ CFT 멤버 로드:', mappedMembers.length, '행');
          } else {
            // CFT 멤버가 없어도 최소 10개 행 유지
            setCftMembers(createInitialCFTMembers());
            console.log('[CP 등록] ⚠️ CFT 멤버 없음, 초기 멤버로 설정');
          }
          
          // URL을 수정 모드로 업데이트
          router.replace(`/control-plan/register?id=${lastCp.cpNo}`);
          console.log('[CP 등록] ✅ 마지막 CP 정보 자동 로드 완료:', lastCp.cpNo);
          setLoading(false);
          return;
        }
        
        // 4. 정말 아무것도 없으면 초기 상태 유지 (하지만 CFT는 최소 10개 행 표시)
        console.warn('[CP 등록] ⚠️ 로드할 CP가 없습니다. 초기 상태 유지.');
        setLoading(false);
      }
    };

    loadCpData();
  }, [isEditMode, editId, router, searchParams]); // ★ searchParams 추가하여 URL 변경 감지

  // 기초정보 선택 (상위 프로젝트 + 고객 정보 설정)
  const handleBizInfoSelect = (info: BizInfoProject) => {
    // 상위 프로젝트는 APQP 모달에서 선택
    
    setCpInfo(prev => ({
      ...prev,
      // ★ companyName(회사명)은 작성 회사이므로 고객명과 분리 - 수동 입력
      // ★ cpProjectName(CP명)도 수동 입력
      customerName: info.customerName || '',  // 고객명만 설정
      modelYear: info.modelYear || '',        // 모델년도
    }));
    setBizInfoModalOpen(false);
  };

  // 사용자 선택
  const handleUserSelect = (user: UserInfo) => {
    if (userModalTarget === 'responsible') {
      setCpInfo(prev => ({
        ...prev,
        cpResponsibleName: user.name || '',
        processResponsibility: user.department || '',
      }));
    } else if (selectedMemberIndex !== null) {
      const updated = [...cftMembers];
      updated[selectedMemberIndex] = {
        ...updated[selectedMemberIndex],
        name: user.name || '',
        department: user.department || '',
        position: user.position || '',
        phone: user.phone || '',
        email: user.email || '',
      };
      setCftMembers(updated);
    }
    setUserModalOpen(false);
    setSelectedMemberIndex(null);
  };

  // CFT 사용자 검색
  const handleCftUserSearch = (index: number) => {
    setSelectedMemberIndex(index);
    setUserModalTarget('cft');
    setUserModalOpen(true);
  };

  // 새로 등록
  const handleNewRegister = () => {
    if (confirm('새로운 CP를 등록하시겠습니까?\n현재 화면의 내용은 초기화됩니다.')) {
      setCpInfo(INITIAL_CP);
      setCftMembers(createInitialCFTMembers());
      setCpId(generateCPId('P'));
      setSelectedParentApqp(null);
      setSelectedParentFmea(null);
      setSelectedBaseCp(null);
      
      // ★ 마지막 작업 CP 기록 삭제 (새 CP 등록 시작)
      localStorage.removeItem('cp-last-edited');
      
      // ★ URL 초기화 (수정 모드 해제)
      router.replace('/control-plan/register');
    }
  };

  // CFT 저장/초기화
  const handleCftSave = async () => {
    await handleSave();
    setCftSaveStatus('saved');
    setTimeout(() => setCftSaveStatus('idle'), 3000);
  };

  const handleCftReset = () => {
    if (confirm('CFT 목록을 초기화하시겠습니까?')) {
      setCftMembers(createInitialCFTMembers());
    }
  };

  // ★ DB에서 CP 데이터 불러오기 (수동 버튼)
  const handleLoadFromDB = async () => {
    const targetId = editId || cpId;
    
    if (!targetId || targetId.trim() === '') {
      alert('CP ID를 입력하거나 URL에 ID를 포함해주세요.\n\n예: /control-plan/register?id=cp26-m001');
      return;
    }

    setSaveStatus('saving'); // 로딩 상태 표시
    
    try {
      const normalizedId = targetId.toLowerCase().trim();
      console.log('[CP 등록] 🔄 수동 불러오기 시작:', normalizedId);
      
      const response = await fetch(`/api/control-plan?cpNo=${normalizedId}`);
      const result = await response.json();
      
      if (!result.success || !result.data) {
        alert(`CP ID "${normalizedId}"를 찾을 수 없습니다.\n\nDB에 등록된 CP인지 확인해주세요.`);
        setSaveStatus('idle');
        return;
      }
      
      const cp = result.data;
      
      // CP 정보 로드
      setCpId(cp.cpNo);
      const cpType = (cp.cpType || 'P') as 'M' | 'F' | 'P';
      setCpInfo({
        companyName: cp.companyName || '',
        engineeringLocation: cp.engineeringLocation || '',
        customerName: cp.customerName || '',
        modelYear: cp.modelYear || '',
        subject: cp.subject || '',
        cpStartDate: cp.cpStartDate || '',
        cpRevisionDate: cp.cpRevisionDate || '',
        cpProjectName: cp.subject || '',
        cpId: cp.cpNo,
        processResponsibility: cp.processResponsibility || '',
        confidentialityLevel: cp.confidentialityLevel || '',
        cpResponsibleName: cp.cpResponsibleName || '',
        cpType: cpType,
      });
      
      if (cp.fmeaNo || cp.fmeaId) {
        setSelectedParentFmea(cp.fmeaNo || cp.fmeaId);
      }
      
      // ★ MASTER CP는 상위 CP가 자신이 되도록 설정
      if (cpType === 'M') {
        setSelectedBaseCp(cp.cpNo);
      } else if (cp.baseCpId || cp.parentCpId) {
        setSelectedBaseCp(cp.baseCpId || cp.parentCpId);
      }
      
      if (cp.parentApqpNo) {
        setSelectedParentApqp(cp.parentApqpNo);
      }
      
      // CFT 멤버 로드
      if (cp.cftMembers && cp.cftMembers.length > 0) {
        const mappedMembers: CFTMember[] = cp.cftMembers.map((m: any, idx: number) => ({
          id: m.id || (idx + 1).toString(),
          role: m.role || '',
          name: m.name || '',
          department: m.department || '',
          position: m.position || '',
          task: m.task || '',
          email: m.email || '',
          phone: m.phone || '',
          remark: m.remark || '',
        }));
        
        // 단일 역할 중복 제거
        const SINGLE_ROLES = ['Champion', 'Leader', 'PM', 'Moderator'];
        for (const role of SINGLE_ROLES) {
          const membersWithRole = mappedMembers.filter(m => m.role === role);
          if (membersWithRole.length > 1) {
            let firstFound = false;
            mappedMembers.forEach(m => {
              if (m.role === role) {
                if (!firstFound) {
                  firstFound = true;
                } else {
                  m.role = '';
                  console.warn(`[CP 등록] ⚠️ 중복 ${role} 제거: ${m.name || '(이름 없음)'}`);
                }
              }
            });
          }
        }
        
        // ★ 10행 보장 로직 제거
        setCftMembers(mappedMembers);
        console.log(`[CP 등록] ✅ CFT 멤버 로드: ${mappedMembers.length}행`);
      } else {
        setCftMembers(createInitialCFTMembers());
      }
      
      // URL 업데이트
      router.replace(`/control-plan/register?id=${cp.cpNo.toLowerCase()}`);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      alert(`✅ CP 데이터를 성공적으로 불러왔습니다.\n\nCP ID: ${cp.cpNo}\nCP명: ${cp.subject || '(제목 없음)'}\nCFT 멤버: ${cp.cftMembers?.length || 0}명`);
      console.log('[CP 등록] ✅ 수동 불러오기 완료:', cp.cpNo);
      
    } catch (error: any) {
      console.error('[CP 등록] ❌ 수동 불러오기 실패:', error);
      alert(`데이터 불러오기 실패:\n\n${error.message || '알 수 없는 오류가 발생했습니다.'}\n\nCP ID를 확인하고 다시 시도해주세요.`);
      setSaveStatus('idle');
    }
  };

  // 테이블 셀 스타일
  const headerCell = "bg-[#0d9488] text-white px-2 py-1.5 border border-white font-semibold text-xs text-center align-middle";
  const inputCell = "border border-gray-300 px-1 py-0.5";

  // CFT 멤버 이름 목록
  const cftNames = cftMembers.filter(m => m.name).map(m => m.name).join(', ');

  // 샘플 접속 로그
  const accessLogs: CFTAccessLog[] = [
    { id: 1, projectId: cpId, userName: '김철수', loginTime: '2026-01-12 09:00', logoutTime: '2026-01-12 12:30', action: '수정', itemType: 'CP', cellAddress: 'A1:B5', description: 'CP 정보 수정' },
    { id: 2, projectId: cpId, userName: '이영희', loginTime: '2026-01-12 10:15', logoutTime: '2026-01-12 11:45', action: '추가', itemType: 'CFT', cellAddress: 'C3', description: 'CFT 팀원 추가' },
  ];

  if (loading) {
    return <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center"><div className="text-gray-500">로딩 중...</div></div>;
  }

  return (
    <>
      <CPTopNav selectedCpId={cpId} />
      
      <div className="min-h-screen bg-[#f0f0f0] px-0 py-3 pt-9 font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isEditMode ? '✏️' : '📝'}</span>
            <h1 className="text-sm font-bold text-gray-800">Control Plan {isEditMode ? '수정' : '등록'}</h1>
            <span className="text-xs text-gray-500 ml-2">CP No: {cpId}</span>
          </div>
          <div className="flex gap-2">
            {(isEditMode || cpId) && (
              <button 
                onClick={handleLoadFromDB} 
                disabled={saveStatus === 'saving'}
                className={`px-3 py-1.5 border text-xs rounded font-semibold ${
                  saveStatus === 'saving' 
                    ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed' 
                    : 'bg-purple-100 border-purple-400 text-purple-700 hover:bg-purple-200'
                }`}
                title="DB에서 CP 데이터 불러오기"
              >
                {saveStatus === 'saving' ? '⏳ 불러오는 중...' : '🔄 불러오기'}
              </button>
            )}
            {(isEditMode || cpId) && saveStatus === 'saved' && (
              <button 
                onClick={() => router.push(`/control-plan/worksheet?cpNo=${cpId}`)}
                className="px-3 py-1.5 bg-blue-100 border border-blue-400 text-blue-700 text-xs rounded hover:bg-blue-200 font-semibold"
                title="CP 작성화면으로 이동"
              >
                ✏️ 작성화면
              </button>
            )}
            <button onClick={handleNewRegister} className="px-3 py-1.5 bg-green-100 border border-green-400 text-green-700 text-xs rounded hover:bg-green-200 font-semibold">➕ 새로 등록</button>
            <button 
              onClick={handleSave} 
              disabled={saveStatus === 'saving'}
              className={`px-4 py-1.5 text-xs font-bold rounded ${
                saveStatus === 'saving' 
                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed' 
                  : saveStatus === 'saved'
                  ? 'bg-green-500 text-white'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {saveStatus === 'saving' ? '⏳ 저장 중...' : saveStatus === 'saved' ? '✓ 저장됨' : '💾 저장'}
            </button>
          </div>
        </div>

        {/* 기본정보 테이블 */}
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <div className="bg-white rounded border border-gray-300 mb-3">
          <div className="bg-teal-50 px-3 py-1.5 border-b border-gray-300">
            <h2 className="text-xs font-bold text-gray-700">Control Plan 기본정보</h2>
          </div>
          
          <table className="w-full border-collapse text-xs">
            <tbody>
              {/* 1행 */}
              <tr className="bg-teal-50 h-8">
                <td className={`${headerCell} w-[11%] whitespace-nowrap`}>회사 명</td>
                <td className={`${inputCell} w-[14%]`}>
                  <input type="text" value={cpInfo.companyName} onChange={(e) => { updateField('companyName', e.target.value); setShowMissingFields(false); }} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="회사 명" />
                </td>
                <td className={`${headerCell} w-[7%] whitespace-nowrap`}>CP명</td>
                <td className={`${inputCell} w-[18%]`}>
                  <input type="text" value={cpInfo.subject} onChange={(e) => { updateField('subject', e.target.value); setShowMissingFields(false); }} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="품명 또는 제품명" />
                </td>
                <td className={`${headerCell} w-[7%] whitespace-nowrap`}>CP No</td>
                <td className={`${inputCell} w-[10%]`}><span className="px-2 text-xs font-semibold text-teal-600">{cpId}</span></td>
                <td className={`${headerCell} w-[8%] whitespace-nowrap`}>상위 APQP</td>
                <td className={`${inputCell} w-[15%] cursor-pointer hover:bg-green-50`} onClick={openApqpModal}>
                  {selectedParentApqp ? (
                    <div className="flex items-center gap-1 px-2">
                      <span className="px-1 py-0 rounded text-[9px] font-bold text-white bg-green-500">APQP</span>
                      <span className="text-xs font-semibold text-green-600">{selectedParentApqp}</span>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedParentApqp(null); }} className="text-red-500 hover:text-red-700 text-[10px]">✕</button>
                    </div>
                  ) : <span className="px-2 text-xs text-gray-400">- (클릭하여 선택)</span>}
                </td>
              </tr>
              
              {/* 2행 */}
              <tr className="bg-white h-8">
                <td className={`${headerCell} whitespace-nowrap`}>공정 책임</td>
                <td className={`${inputCell}`}>
                  <input type="text" value={cpInfo.processResponsibility} onChange={(e) => updateField('processResponsibility', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="부서" />
                </td>
                <td className={`${headerCell} whitespace-nowrap`}>CP 책임자</td>
                <td className={`${inputCell}`}>
                  <div className="flex items-center gap-1">
                    <input type="text" value={cpInfo.cpResponsibleName} onChange={(e) => updateField('cpResponsibleName', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="책임자 성명" />
                    <button onClick={() => { setUserModalTarget('responsible'); setUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700 px-1">🔍</button>
                  </div>
                </td>
                <td className={`${headerCell} whitespace-nowrap`}>시작 일자</td>
                <td className={`${inputCell}`}><input type="date" value={cpInfo.cpStartDate} onChange={(e) => updateField('cpStartDate', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" /></td>
                <td className={`${headerCell} whitespace-nowrap`}>상위 FMEA</td>
                <td className={`${inputCell} cursor-pointer hover:bg-yellow-50`} onClick={() => openFmeaSelectModal('ALL')}>
                  {selectedParentFmea ? <span className="text-xs font-semibold text-yellow-600 px-2">🔗 {selectedParentFmea}</span> : <span className="px-2 text-xs text-gray-400">- (클릭하여 선택)</span>}
                </td>
              </tr>
              
              {/* 3행 */}
              <tr className="bg-teal-50 h-8">
                <td className={`${headerCell} whitespace-nowrap`}>고객 명</td>
                <td className={`${inputCell}`}>
                  <div className="flex items-center gap-1">
                    <input type="text" value={cpInfo.customerName} onChange={(e) => updateField('customerName', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="고객 명" />
                    <button onClick={() => setBizInfoModalOpen(true)} className="text-blue-500 hover:text-blue-700">🔍</button>
                  </div>
                </td>
                <td className={`${headerCell} whitespace-nowrap`}>개정 일자</td>
                <td className={`${inputCell}`}><input type="date" value={cpInfo.cpRevisionDate} onChange={(e) => updateField('cpRevisionDate', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" /></td>
                <td className={`${headerCell} whitespace-nowrap`}>엔지니어링 위치</td>
                <td className={`${inputCell}`}><input type="text" value={cpInfo.engineeringLocation} onChange={(e) => updateField('engineeringLocation', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="지리적 위치" /></td>
                <td className={`${headerCell} whitespace-nowrap`}>상위 CP</td>
                <td className={`${inputCell} cursor-pointer hover:bg-green-50`} onClick={() => openCpSelectModal('M')}>
                  {selectedBaseCp ? <span className="text-xs font-semibold text-green-600 px-2">🔗 {selectedBaseCp}</span> : <span className="px-2 text-xs text-gray-400">- (클릭하여 선택)</span>}
                </td>
              </tr>
              
              {/* 4행 */}
              <tr className="bg-white h-8">
                <td className={`${headerCell} whitespace-nowrap`}>모델 연식</td>
                <td className={`${inputCell}`}><input type="text" value={cpInfo.modelYear} onChange={(e) => updateField('modelYear', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="어플리케이션" /></td>
                <td className={`${headerCell} whitespace-nowrap`}>CP 유형</td>
                <td className={`${inputCell}`}>
                  <select value={cpInfo.cpType} onChange={(e) => handleCpTypeChange(e.target.value as CPType)} className="w-full h-7 px-2 text-xs border border-gray-300 bg-white text-gray-700 font-semibold rounded focus:outline-none cursor-pointer">
                    <option value="M">M - Master CP</option>
                    <option value="F">F - Family CP</option>
                    <option value="P">P - Part CP</option>
                  </select>
                </td>
                <td className={`${headerCell} whitespace-nowrap`}>CP 종류</td>
                <td className={`${inputCell}`}>
                  <select value={cpInfo.confidentialityLevel} onChange={(e) => updateField('confidentialityLevel', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none text-gray-600">
                    <option value="">선택</option>
                    <option value="Prototype">Prototype</option>
                    <option value="Pre-Launch">Pre-Launch</option>
                    <option value="Production">Production</option>
                    <option value="Safe Launch">Safe Launch</option>
                  </select>
                </td>
                <td className={`${headerCell} whitespace-nowrap`}>상호기능팀</td>
                <td className={`${inputCell}`}>{cftNames ? <span className="text-xs text-gray-700 px-2">{cftNames}</span> : <span className="text-xs text-gray-400 px-2">-</span>}</td>
              </tr>
            </tbody>
          </table>
        </div>
        </form>

        {/* CP 작성 옵션 */}
        <div className="mb-3">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr className="h-8">
                <td className="w-[12%] bg-[#0d9488] text-white px-3 py-1.5 border border-gray-400 font-bold text-center whitespace-nowrap">CP 작성 옵션</td>
                <td onClick={() => openCpSelectModal('M')} className="w-[18%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer hover:bg-purple-200 whitespace-nowrap font-semibold text-purple-700 bg-purple-100">🟣 Master Data 사용</td>
                <td onClick={() => openCpSelectModal('F')} className="w-[25%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer hover:bg-blue-200 whitespace-nowrap font-semibold text-blue-700 bg-[#e3f2fd]">🔵 Family Data 사용</td>
                <td onClick={() => openCpSelectModal('P')} className="w-[30%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer hover:bg-green-200 whitespace-nowrap font-semibold text-green-700 bg-[#e8f5e9]">🟢 Part CP 사용</td>
                <td onClick={() => router.push(`/control-plan/import?id=${cpId}`)} className="w-[15%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer hover:bg-amber-200 whitespace-nowrap font-semibold text-amber-700 bg-amber-100">✏️ 신규 입력</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CFT 리스트 */}
        <div id="cft-section" className="mt-6 scroll-mt-20">
          <CFTRegistrationTable 
            title="CFT 리스트" 
            members={cftMembers} 
            onMembersChange={(newMembers: CFTMember[]) => {
              // ★ 단일 역할 중복 자동 제거 (Champion, Leader, PM, Moderator는 각각 첫 번째만 유지, 나머지는 행 자체 삭제)
              const SINGLE_ROLES = ['Champion', 'Leader', 'PM', 'Moderator'];
              let hasDuplicates = false;
              
              for (const role of SINGLE_ROLES) {
                const membersWithRole = newMembers.filter(m => m.role === role);
                if (membersWithRole.length > 1) {
                  hasDuplicates = true;
                  let firstFound = false;
                  // 중복된 행을 필터링하여 제거 (첫 번째만 유지)
                  const cleanedMembers = newMembers.filter((m) => {
                    if (m.role === role) {
                      if (!firstFound) {
                        firstFound = true;
                        return true; // 첫 번째는 유지
                      } else {
                        console.warn(`[CP 등록] ⚠️ 중복 ${role} 행 삭제: ${m.name || '(이름 없음)'}`);
                        return false; // 나머지는 행 자체 삭제
                      }
                    }
                    return true; // 다른 역할은 유지
                  });
                  setCftMembers(cleanedMembers);
                  return;
                }
              }
              
              // 중복이 없으면 그대로 설정
              setCftMembers(newMembers);
            }} 
            onUserSearch={handleCftUserSearch} 
            onSave={handleCftSave} 
            onReset={handleCftReset} 
            saveStatus={cftSaveStatus} 
            minRows={10} 
          />
        </div>

        {/* CFT 접속 로그 */}
        <div className="flex items-center gap-2 mt-6 mb-2"><span>📊</span><h2 className="text-sm font-bold text-gray-700">CFT 접속 로그</h2></div>
        <CFTAccessLogTable accessLogs={accessLogs} maxRows={5} />

        {/* 하단 상태바 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>총 {cftMembers.filter(m => m.name).length}명의 CFT 멤버</span>
          <span>버전: Control Plan Suite v3.0</span>
        </div>

        {/* 모달 */}
        <BizInfoSelectModal isOpen={bizInfoModalOpen} onClose={() => setBizInfoModalOpen(false)} onSelect={handleBizInfoSelect} />
        <UserSelectModal isOpen={userModalOpen} onClose={() => { setUserModalOpen(false); setSelectedMemberIndex(null); }} onSelect={handleUserSelect} />
        <FmeaSelectModal isOpen={fmeaSelectModalOpen} fmeaSelectType={fmeaSelectType} availableFmeas={availableFmeas} onClose={() => setFmeaSelectModalOpen(false)} onSelect={(id) => { setSelectedParentFmea(id.toLowerCase()); setFmeaSelectModalOpen(false); }} />
        <CpSelectModal isOpen={cpSelectModalOpen} cpSelectType={cpSelectType} availableCps={availableCps} onClose={() => setCpSelectModalOpen(false)} onSelect={(id) => { setSelectedBaseCp(id.toLowerCase()); setCpSelectModalOpen(false); }} />
        
        {/* ★ APQP 선택 모달 */}
        {apqpModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setApqpModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between">
                <h2 className="font-bold">📋 상위 APQP 선택</h2>
                <button onClick={() => setApqpModalOpen(false)} className="text-white/70 hover:text-white text-xl">✕</button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {apqpList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-2xl">📭</span>
                    <p className="mt-2 text-sm">등록된 APQP가 없습니다</p>
                  </div>
                ) : (
                  apqpList.map((apqp, idx) => (
                    <div
                      key={apqp.apqpNo}
                      onClick={() => { 
                        console.log('🔍 [CP 등록] APQP 선택:', apqp);
                        setSelectedParentApqp(apqp.apqpNo); 
                        setApqpModalOpen(false); 
                      }}
                      className={`px-4 py-3 border-b cursor-pointer hover:bg-green-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm text-green-600">{apqp.apqpNo}</div>
                          <div className="text-xs text-gray-600">{apqp.subject || '(이름 없음)'}</div>
                        </div>
                        <span className="text-xs text-gray-500">{apqp.customerName}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-gray-100 px-4 py-2 flex justify-end border-t">
                <button onClick={() => setApqpModalOpen(false)} className="px-4 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">닫기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Suspense wrapper
export default function CPRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">로딩 중...</div>}>
      <CPRegisterPageContent />
    </Suspense>
  );
}
