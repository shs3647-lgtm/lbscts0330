/**
 * @file page.tsx
 * @description DFMEA 등록 페이지 - 표준 CFT 테이블 사용
 * @version 9.0.0
 * @created 2025-12-27
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
import DFMEATopNav from '@/components/layout/DFMEATopNav';
import { getAIStatus } from '@/lib/ai-recommendation';

// =====================================================
// 타입 정의
// =====================================================

/**
 * FMEA 유형 구분
 * - M: Master FMEA (마스터)
 * - F: Family FMEA (패밀리)
 * - P: Part FMEA (부품)
 */
type FMEAType = 'M' | 'F' | 'P';

interface FMEAInfo {
  companyName: string;
  engineeringLocation: string;
  customerName: string;
  modelYear: string;
  subject: string;
  fmeaStartDate: string;
  fmeaRevisionDate: string;
  fmeaProjectName: string;
  fmeaId: string;
  fmeaType: FMEAType;  // FMEA 유형 (M/F/P)
  designResponsibility: string;
  confidentialityLevel: string;
  fmeaResponsibleName: string;
}

// =====================================================
// 초기 데이터
// =====================================================
const INITIAL_FMEA: FMEAInfo = {
  companyName: '',
  engineeringLocation: '',
  customerName: '',
  modelYear: '',
  subject: '',
  fmeaStartDate: '',
  fmeaRevisionDate: '',
  fmeaProjectName: '',
  fmeaId: '',
  fmeaType: 'P',  // 기본값: Part FMEA
  designResponsibility: '',
  confidentialityLevel: '',
  fmeaResponsibleName: '',
};

/**
 * FMEA ID 생성 규칙
 * 형식: dfm{YY}-{t}{NNN}
 * - dfm: DFMEA 약어 (소문자)
 * - YY: 연도 뒤 2자리 (예: 26 = 2026년)
 * - t: 유형 구분자 소문자 (m=Master, f=Family, p=Part)
 * - NNN: 시리얼 번호 3자리 (001, 002, ...)
 * 예시: dfm26-m001 (Master), dfm26-f001 (Family), dfm26-p001 (Part)
 * ★ 2026-01-13: 소문자로 통일 (DB 일관성, PostgreSQL 호환성)
 */
function generateFMEAId(fmeaType: FMEAType = 'P'): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const typeChar = fmeaType.toLowerCase(); // ★ 소문자로 변환
  
  // 기존 프로젝트에서 해당 유형의 최대 ID 찾아서 순차 증가
  try {
    const stored = localStorage.getItem('dfmea-projects');
    if (stored) {
      const projects = JSON.parse(stored);
      // 해당 연도 + 유형의 ID 찾기 (대소문자 무관하게 검색)
      const prefix = `dfm${year}-${typeChar}`;
      const currentTypeIds = projects
        .filter((p: { id: string }) => p.id?.toLowerCase().startsWith(prefix))
        .map((p: { id: string }) => {
          // dfm26-p001 -> 001 추출
          const match = p.id.match(/\d{3}$/);
          return match ? parseInt(match[0]) : 0;
        });
      
      if (currentTypeIds.length > 0) {
        const maxSeq = Math.max(...currentTypeIds);
        return `dfm${year}-${typeChar}${(maxSeq + 1).toString().padStart(3, '0')}`;
      }
    }
  } catch (e) {
    console.error('ID 생성 중 오류:', e);
  }
  
  // ★ 소문자로 반환 (DB 일관성 보장)
  return `dfm${year}-${typeChar}001`;
}

// =====================================================
// 메인 컴포넌트
// =====================================================
function DFMEARegisterPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // ✅ FMEA ID는 항상 대문자로 정규화 (DB, localStorage 일관성 보장)
  const editId = searchParams.get('id')?.toLowerCase() || null; // 수정 모드일 때 ID (소문자 정규화)
  const isEditMode = !!editId;

  const [fmeaInfo, setFmeaInfo] = useState<FMEAInfo>(INITIAL_FMEA);
  const [cftMembers, setCftMembers] = useState<CFTMember[]>(createInitialCFTMembers());
  const [fmeaId, setFmeaId] = useState('');
  
  // 모달 상태
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);
  const [userModalTarget, setUserModalTarget] = useState<'responsible' | 'cft'>('cft');
  
  // FMEA 선택 모달 상태
  const [fmeaSelectModalOpen, setFmeaSelectModalOpen] = useState(false);
  const [fmeaSelectType, setFmeaSelectType] = useState<'M' | 'F' | 'P' | 'ALL'>('M');
  const [availableFmeas, setAvailableFmeas] = useState<Array<{id: string; subject: string; type: string}>>([]);
  const [selectedBaseFmea, setSelectedBaseFmea] = useState<string | null>(null);
  
  // ★ 상위 APQP 선택 상태 (APQP가 최상위)
  // ★ 상위 APQP 선택 상태 (APQP가 최상위) - 문자열로 관리 (CP와 동일)
  const [selectedParentApqp, setSelectedParentApqp] = useState<string | null>(null);
  const [apqpModalOpen, setApqpModalOpen] = useState(false);
  const [apqpList, setApqpList] = useState<Array<{apqpNo: string; subject: string; customerName?: string}>>([]);
  
  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [cftSaveStatus, setCftSaveStatus] = useState<'idle' | 'saved'>('idle');

  // ★ APQP 목록 로드 (상위 프로젝트 선택용)
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
  
  // 미입력 필드 표시 여부 (저장 후에만 표시)
  const [showMissingFields, setShowMissingFields] = useState(false);
  
  // FMEA 선택 모달 열기 (DB에서 로드)
  const openFmeaSelectModal = async (type: 'M' | 'F' | 'P' | 'ALL') => {
    try {
      // DB에서 FMEA 프로젝트 목록 가져오기
      const res = await fetch('/api/fmea/projects');
      if (!res.ok) throw new Error('DB 로드 실패');
      
      const data = await res.json();
      const projects = data.projects || data || [];
      
      // 타입별 필터링 (ALL이면 현재 자신 제외한 모든 FMEA, 아니면 타입별 필터링)
      let filtered: Array<{id: string; subject: string; type: string}>;
      
      if (type === 'ALL') {
        // ★ 상위 FMEA 선택: 마스터 FMEA는 본인도 포함, 나머지는 자신 제외
        const currentFmeaType = fmeaInfo.fmeaType || 'P';
        const isMaster = currentFmeaType === 'M';
        
        filtered = projects
          .filter((p: any) => {
            // 마스터 FMEA는 본인 포함, 나머지는 자신 제외
            if (isMaster) {
              return true; // 마스터는 모든 FMEA 포함 (본인 포함)
            }
            return p.id !== fmeaId; // 나머지는 자신 제외
          })
          .map((p: any) => {
            // 타입 추출
            let fmeaType = 'P';
            if (p.fmeaType) {
              fmeaType = p.fmeaType.toLowerCase();
            } else {
              const match = p.id.match(/dfm\d{2}-([MFP])/i);
              if (match) fmeaType = match[1].toLowerCase();
            }
            return {
              id: p.id,
              subject: p.fmeaInfo?.subject || p.project?.productName || p.name || '제목 없음',
              type: fmeaType
            };
          });
      } else {
        // 타입별 필터링 (fmeaType 필드 우선 사용)
        filtered = projects.filter((p: any) => {
          // fmeaType 필드가 있으면 사용
          if (p.fmeaType) {
            return p.fmeaType.toLowerCase() === type.toLowerCase();
          }
          // 없으면 ID에서 추출
          const match = p.id.match(/dfm\d{2}-([MFP])/i);
          return match && match[1].toLowerCase() === type.toLowerCase();
        }).map((p: any) => ({
          id: p.id,
          subject: p.fmeaInfo?.subject || p.project?.productName || p.name || '제목 없음',
          type: type
        }));
      }
      
      console.log(`[FMEA 선택] 타입: ${type}, 필터링 결과:`, filtered);
      
      // FMEA 리스트가 없으면 자신 ID를 상위 FMEA로 설정
      if (filtered.length === 0) {
        if (type === 'ALL') {
          // 상위 FMEA 선택 시 리스트가 없으면 자신 ID 입력
          setSelectedBaseFmea(fmeaId);
          setShowMissingFields(false);
          console.log('[상위 FMEA] 리스트 없음, 자신 ID로 설정:', fmeaId);
          return;
        } else {
          alert(`등록된 ${type === 'M' ? 'Master' : type === 'F' ? 'Family' : 'Part'} FMEA가 없습니다.`);
          return;
        }
      }
      
      setAvailableFmeas(filtered);
      setFmeaSelectType(type);
      setFmeaSelectModalOpen(true);
    } catch (e) {
      console.error('FMEA 목록 로드 실패:', e);
      // 에러 발생 시에도 자신 ID로 설정
      if (type === 'ALL') {
        setSelectedBaseFmea(fmeaId);
        setShowMissingFields(false);
        console.log('[상위 FMEA] 로드 실패, 자신 ID로 설정:', fmeaId);
      } else {
        alert('FMEA 목록을 불러올 수 없습니다. DB 연결을 확인하세요.');
      }
    }
  };
  
  // FMEA 선택 완료
  const handleFmeaSelect = (selectedId: string) => {
    // ✅ FMEA ID는 항상 소문자로 정규화
    const normalizedId = selectedId.toLowerCase();
    
    // ★ 상위 FMEA 선택 (type === 'ALL')인 경우: 선택만 하고 모달 닫기
    if (fmeaSelectType === 'ALL') {
      console.log('[DFMEA 등록] 상위 FMEA 선택:', normalizedId);
      setSelectedBaseFmea(normalizedId);
      setFmeaSelectModalOpen(false);
      return; // 워크시트로 이동하지 않음
    }
    
    // ★ 기초정보 등록 옵션 (M/F/P)인 경우: 워크시트로 이동
    console.log('[DFMEA 등록] 기초정보 FMEA 선택:', normalizedId);
    setSelectedBaseFmea(normalizedId);
    setFmeaSelectModalOpen(false);
    window.location.href = `/dfmea/worksheet?id=${fmeaId}&baseId=${normalizedId}&mode=inherit`;
  };

  // ✅ 초기화 및 수정 모드 데이터 로드 - DB API 우선, localStorage 폴백
  // ★ 신규 등록 시 마지막 작업 FMEA 자동 로드 추가
  useEffect(() => {
    const loadProjectData = async () => {
      // ★ 수정 모드가 아니면 DB에서 마지막 FMEA 정보 로드
      if (!isEditMode || !editId) {
        let lastProject: any = null;
        
        // 1. DB에서 전체 FMEA 목록 조회하여 가장 최근 것 로드 (우선순위 1)
        console.log('[DFMEA 등록] DB에서 최신 FMEA 조회 시도...');
        try {
          const res = await fetch('/api/fmea/projects');
          if (res.ok) {
            const data = await res.json();
            if (data.projects && data.projects.length > 0) {
              // 가장 최근 것 선택 (createdAt 기준 내림차순 정렬되어 있다고 가정)
              lastProject = data.projects[0];
              console.log('[DFMEA 등록] ✅ DB에서 최신 FMEA 로드:', lastProject.id);
            } else {
              console.warn('[DFMEA 등록] ⚠️ DB에 등록된 FMEA가 없습니다.');
            }
          } else {
            console.error('[DFMEA 등록] ❌ DB 조회 실패:', res.status, res.statusText);
          }
        } catch (error) {
          console.error('[DFMEA 등록] ❌ DB 조회 중 오류:', error);
        }
        
        // 2. localStorage의 마지막 작업 FMEA ID로 시도 (임시 데이터, 폴백용)
        if (!lastProject) {
          const lastEditedId = localStorage.getItem('dfmea-last-edited');
          if (lastEditedId) {
            console.log('[DFMEA 등록] DB에 데이터 없음, localStorage 임시 데이터 확인:', lastEditedId);
            try {
              const normalizedLastId = lastEditedId.toLowerCase();
              const res = await fetch(`/api/fmea/projects?id=${normalizedLastId}`);
              if (res.ok) {
                const data = await res.json();
                const savedProject = data.projects?.find((p: any) => 
                  p.id?.toLowerCase() === normalizedLastId
                );
                if (savedProject) {
                  lastProject = savedProject;
                  console.log('[DFMEA 등록] ✅ localStorage 기반 FMEA 로드 (임시 데이터):', savedProject.id);
                }
              }
            } catch (error) {
              console.warn('[DFMEA 등록] localStorage 기반 로드 실패:', error);
            }
          }
        }
        
        // 4. 마지막 FMEA 정보가 있으면 로드
        if (lastProject) {
          setFmeaId(lastProject.id?.toLowerCase() || lastProject.id);
          if (lastProject.fmeaInfo) {
            setFmeaInfo({
              companyName: lastProject.fmeaInfo.companyName || '',
              engineeringLocation: lastProject.fmeaInfo.engineeringLocation || '',
              customerName: lastProject.fmeaInfo.customerName || '',
              modelYear: lastProject.fmeaInfo.modelYear || '',
              subject: lastProject.fmeaInfo.subject || '',
              fmeaStartDate: lastProject.fmeaInfo.fmeaStartDate || '',
              fmeaRevisionDate: lastProject.fmeaInfo.fmeaRevisionDate || '',
              fmeaProjectName: lastProject.fmeaInfo.fmeaProjectName || '',
              fmeaId: lastProject.id,
              fmeaType: lastProject.fmeaInfo.fmeaType || lastProject.fmeaType || 'P',
              designResponsibility: lastProject.fmeaInfo.designResponsibility || '',
              confidentialityLevel: lastProject.fmeaInfo.confidentialityLevel || '',
              fmeaResponsibleName: lastProject.fmeaInfo.fmeaResponsibleName || '',
            });
          }
          // ★ CFT 멤버 로드 (필드 매핑 포함)
          if (lastProject.cftMembers && lastProject.cftMembers.length > 0) {
            const mappedMembers: CFTMember[] = lastProject.cftMembers.map((m: any, idx: number) => ({
              id: m.id || (idx + 1).toString(),
              role: m.role || '',
              name: m.name || '',
              department: m.department || '',
              position: m.position || '',
              task: m.task || m.responsibility || '',
              email: m.email || '',
              phone: m.phone || '',
              remark: m.remark || m.remarks || '',
            }));
            // ★ 10행 보장 로직 제거
            setCftMembers(mappedMembers);
            console.log('[DFMEA 등록] ✅ CFT 멤버 로드:', mappedMembers.length, '행');
          } else {
            // CFT 멤버가 없어도 최소 10개 행 유지
            setCftMembers(createInitialCFTMembers());
            console.log('[DFMEA 등록] ⚠️ CFT 멤버 없음, 초기 멤버로 설정');
          }
          if (lastProject.parentFmeaId) {
            setSelectedBaseFmea(lastProject.parentFmeaId.toLowerCase());
          }
          if (lastProject.parentApqpNo) {
            setSelectedParentApqp(lastProject.parentApqpNo); // ★ 문자열로 저장
          }
          // URL을 수정 모드로 업데이트
          router.replace(`/dfmea/register?id=${lastProject.id.toLowerCase()}`);
          console.log('[DFMEA 등록] ✅ 마지막 FMEA 정보 자동 로드 완료:', lastProject.id);
          return;
        }
        
        // 5. 정말 아무것도 없으면 초기 상태 유지 (하지만 CFT는 최소 10개 행 표시)
        console.warn('[DFMEA 등록] ⚠️ 로드할 FMEA가 없습니다. 초기 상태 유지.');
        return;
      }
      
      const targetId = editId;
      
      if (targetId) {
        // ========== 수정 모드: DB API에서 데이터 로드 ==========
        console.log('[DFMEA 등록] 수정 모드 - DB에서 로드 시도:', targetId);
        
        try {
          // 1. DB API 호출
          // ★ targetId를 소문자로 변환하여 API에 전달 (서비스 레이어가 소문자로 저장/조회)
          const normalizedTargetId = targetId.toLowerCase();
          const res = await fetch(`/api/fmea/projects?id=${normalizedTargetId}`);
          if (res.ok) {
            const data = await res.json();
            // ★ 소문자로 정규화하여 비교
            const project = data.projects?.find((p: any) => 
              p.id?.toLowerCase() === normalizedTargetId
            );
            
            if (project) {
              console.log('[DFMEA 등록] ✅ DB에서 프로젝트 로드 성공:', {
                검색ID: targetId,
                정규화ID: normalizedTargetId,
                찾은ID: project.id,
                FMEA명: project.fmeaInfo?.subject || project.project?.projectName || '제목 없음',
                CFT멤버수: project.cftMembers?.length || 0,
                등록정보: {
                  회사명: project.fmeaInfo?.companyName || '없음',
                  고객명: project.fmeaInfo?.customerName || '없음',
                  엔지니어링위치: project.fmeaInfo?.engineeringLocation || '없음',
                }
              });
              // ✅ FMEA ID는 소문자로 정규화
              setFmeaId(project.id?.toLowerCase() || project.id);
              
              // DB 데이터를 등록화면 형식으로 변환
              const dbFmeaInfo: FMEAInfo = {
                companyName: project.project?.customer || project.fmeaInfo?.companyName || '',
                engineeringLocation: project.fmeaInfo?.engineeringLocation || '',
                customerName: project.project?.customer || project.fmeaInfo?.customerName || '',
                modelYear: project.fmeaInfo?.modelYear || '',
                subject: project.fmeaInfo?.subject || project.project?.projectName || '',
                fmeaStartDate: project.fmeaInfo?.fmeaStartDate || '',
                fmeaRevisionDate: project.fmeaInfo?.fmeaRevisionDate || '',
                fmeaProjectName: project.project?.projectName || '',
                fmeaId: project.id,
                fmeaType: (project.fmeaType || 'P') as FMEAType,
                designResponsibility: project.fmeaInfo?.designResponsibility || '',
                confidentialityLevel: project.fmeaInfo?.confidentialityLevel || '',
                fmeaResponsibleName: project.fmeaInfo?.fmeaResponsibleName || '',
              };
              setFmeaInfo(dbFmeaInfo);
              
              // ✅ CFT 멤버 로드 (상세 로그 추가)
              if (project.cftMembers && project.cftMembers.length > 0) {
                console.log(`[DFMEA 등록] ✅ CFT 멤버 로드: ${project.cftMembers.length}명`, 
                  project.cftMembers.map((m: any) => ({ 
                    name: m.name, 
                    role: m.role, 
                    department: m.department,
                    position: m.position,
                    task: m.task || m.responsibility,
                    email: m.email,
                    phone: m.phone,
                    remark: m.remark || m.remarks
                  }))
                );
                // ★ CFT 멤버 필드 매핑 (DB 필드 → 화면 필드)
                const mappedMembers: CFTMember[] = project.cftMembers.map((m: any, idx: number) => ({
                  id: m.id || (idx + 1).toString(),
                  role: m.role || '',
                  name: m.name || '',
                  department: m.department || '',
                  position: m.position || '',
                  task: m.task || m.responsibility || '', // task 또는 responsibility
                  email: m.email || '',
                  phone: m.phone || '',
                  remark: m.remark || m.remarks || '', // remark 또는 remarks
                }));
                
            // ★ 단일 역할 중복 제거 (Champion, Leader, PM, Moderator는 각각 첫 번째만 유지, 나머지는 행 자체 삭제)
            const SINGLE_ROLES = ['Champion', 'Leader', 'PM', 'Moderator'];
            for (const role of SINGLE_ROLES) {
              const membersWithRole = mappedMembers.filter(m => m.role === role);
              if (membersWithRole.length > 1) {
                let firstFound = false;
                // 중복된 행을 필터링하여 제거 (첫 번째만 유지)
                const filteredMembers = mappedMembers.filter((m) => {
                  if (m.role === role) {
                    if (!firstFound) {
                      firstFound = true;
                      return true; // 첫 번째는 유지
        } else {
                      console.warn(`[DFMEA 등록] ⚠️ 중복 ${role} 행 삭제: ${m.name || '(이름 없음)'}`);
                      return false; // 나머지는 행 자체 삭제
                    }
                  }
                  return true; // 다른 역할은 유지
                });
                mappedMembers.length = 0;
                mappedMembers.push(...filteredMembers);
                console.warn(`[DFMEA 등록] ⚠️ ${role} 중복 발견: ${membersWithRole.length}명 → 첫 번째만 유지, 나머지 행 삭제`);
              }
            }
                
                // ★ 10행 보장 로직 제거
                setCftMembers(mappedMembers);
                console.log(`[DFMEA 등록] ✅ CFT 멤버 설정 완료: ${mappedMembers.length}행 (실제 멤버 ${project.cftMembers.length}명)`);
    } else {
                console.warn(`[DFMEA 등록] ⚠️ CFT 멤버가 없습니다 (프로젝트: ${project.id})`);
                // DB에 멤버가 없으면 초기 멤버로 설정
                setCftMembers(createInitialCFTMembers());
              }
              
              // ✅ 상위 FMEA 로드 (소문자로 정규화)
              if (project.parentFmeaId) {
                setSelectedBaseFmea(project.parentFmeaId.toLowerCase());
                console.log('[DFMEA 등록] 상위 FMEA 로드:', project.parentFmeaId.toLowerCase());
              }
              
              // ★ 상위 APQP 로드
              if (project.parentApqpNo) {
                setSelectedParentApqp(project.parentApqpNo); // ★ 문자열로 저장
                console.log('[DFMEA 등록] 상위 APQP 로드:', project.parentApqpNo);
              }
              
              // localStorage에도 동기화 (캐시)
              syncToLocalStorage(project.id, dbFmeaInfo, project.cftMembers || []);
              
              // ★ 마지막 작업 FMEA ID 저장 (다음 방문 시 자동 로드용)
              localStorage.setItem('dfmea-last-edited', project.id.toLowerCase());
              
              console.log('[DFMEA 등록] ✅ 모든 데이터 로드 완료:', {
                FMEA_ID: project.id,
                FMEA명: dbFmeaInfo.subject,
                CFT멤버수: project.cftMembers?.length || 0,
                상위APQP: project.parentApqpNo || '없음',
                상위FMEA: project.parentFmeaId || '없음',
              });
              
              return; // DB에서 성공적으로 로드됨
            } else {
              console.warn('[DFMEA 등록] ⚠️ DB에서 프로젝트를 찾을 수 없습니다:', {
                검색ID: targetId,
                정규화ID: normalizedTargetId,
                응답프로젝트수: data.projects?.length || 0,
                응답프로젝트ID목록: data.projects?.map((p: any) => p.id) || [],
              });
            }
          } else {
            console.error('[DFMEA 등록] ❌ API 응답 실패:', {
              status: res.status,
              statusText: res.statusText,
              검색ID: targetId,
            });
          }
        } catch (e) {
          console.error('[DFMEA 등록] ❌ DB 로드 실패:', e);
          console.warn('[DFMEA 등록] localStorage 폴백 시도...');
        }
        
        // 2. DB 실패 시 localStorage 폴백
        const storedProjects = localStorage.getItem('dfmea-projects');
        if (storedProjects) {
          try {
            const projects = JSON.parse(storedProjects);
            // ★ 소문자로 정규화하여 비교
            const existingProject = projects.find((p: { id: string }) => 
              p.id?.toLowerCase() === targetId.toLowerCase()
            );
            if (existingProject) {
              console.log('[DFMEA 등록] localStorage에서 로드:', targetId, '→ 찾은 ID:', existingProject.id);
              // ✅ FMEA ID는 항상 대문자로 정규화
              setFmeaId(existingProject.id?.toLowerCase() || existingProject.id);
              if (existingProject.fmeaInfo) {
                setFmeaInfo(existingProject.fmeaInfo);
              }
              if (existingProject.cftMembers && existingProject.cftMembers.length > 0) {
                setCftMembers(existingProject.cftMembers);
              }
          }
        } catch (e) {
            console.error('localStorage 로드 실패:', e);
          }
        }
      } else {
        // ========== 신규 등록 모드 ==========
        // ✅ 신규 등록 시에는 DB나 localStorage에서 데이터를 로드하지 않음
        // ✅ 사용자가 입력한 데이터를 유지하기 위해 초기화만 수행
        // ★ ID는 저장 시에만 생성 (자동 생성 금지)
        console.log('[DFMEA 등록] 신규 등록 모드 - ID는 저장 시 생성');
        
        // ✅ CFT 멤버는 초기 상태 유지 (사용자가 입력한 데이터 보호)
        // setCftMembers 호출하지 않음 - 이미 초기화되어 있음
      }
    };
    
    // localStorage 동기화 헬퍼
    const syncToLocalStorage = (id: string, info: FMEAInfo, cft: CFTMember[]) => {
      try {
        let projects = [];
        const stored = localStorage.getItem('dfmea-projects');
        if (stored) projects = JSON.parse(stored);
        projects = projects.filter((p: any) => p.id !== id);
        projects.unshift({ id, fmeaInfo: info, cftMembers: cft, updatedAt: new Date().toISOString() });
        localStorage.setItem('dfmea-projects', JSON.stringify(projects));
      } catch (e) {
        console.error('localStorage 동기화 실패:', e);
      }
    };
    
    loadProjectData();
    
    // URL 해시가 있으면 해당 섹션으로 스크롤 (CFT 섹션 등)
    if (typeof window !== 'undefined' && window.location.hash) {
      setTimeout(() => {
        const element = document.querySelector(window.location.hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [isEditMode, editId, router, searchParams]); // searchParams 추가하여 URL 변경 감지

  // ✅ 새로 등록 - 초기화 후 새 ID 생성
  const handleNewRegister = () => {
    if (confirm('새로운 FMEA를 등록하시겠습니까?\n현재 화면의 내용은 초기화됩니다.')) {
      setFmeaInfo(INITIAL_FMEA);
      setCftMembers(createInitialCFTMembers());
      // ★ 새로등록 버튼 클릭 시 즉시 신규 ID 생성 (FMEA 타입에 따라)
      const newId = generateFMEAId(fmeaInfo.fmeaType || 'P');
      setFmeaId(newId);
      console.log('[DFMEA 등록] 새로등록 버튼 클릭 - 신규 ID 생성:', newId);
      setSelectedBaseFmea(null);
      setSelectedParentApqp(null);
      localStorage.removeItem('dfmea-register-draft');
      
      // ★ 마지막 작업 FMEA 기록 삭제 (새 FMEA 등록 시작)
      localStorage.removeItem('dfmea-last-edited');
      
      // ★ URL 초기화 (수정 모드 해제)
      router.replace('/dfmea/register');
    }
  };

  // ★ DB에서 FMEA 데이터 불러오기 (수동 버튼)
  const handleLoadFromDB = async () => {
    const targetId = editId || fmeaId;
    
    if (!targetId || targetId.trim() === '') {
      alert('FMEA ID를 입력하거나 URL에 ID를 포함해주세요.\n\n예: /dfmea/register?id=dfm26-m001');
      return;
    }

    setSaveStatus('saving'); // 로딩 상태 표시
    
    try {
      const normalizedId = targetId.toLowerCase().trim();
      console.log('[DFMEA 등록] 🔄 수동 불러오기 시작:', normalizedId);
      
      const res = await fetch(`/api/fmea/projects?id=${normalizedId}`);
      
      if (!res.ok) {
        throw new Error(`API 응답 실패: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      const project = data.projects?.find((p: any) => 
        p.id?.toLowerCase() === normalizedId
      );
      
      if (!project) {
        alert(`FMEA ID "${normalizedId}"를 찾을 수 없습니다.\n\nDB에 등록된 FMEA인지 확인해주세요.`);
        setSaveStatus('idle');
        return;
      }
      
      // FMEA 정보 로드
      setFmeaId(project.id?.toLowerCase() || project.id);
      const dbFmeaInfo: FMEAInfo = {
        companyName: project.project?.customer || project.fmeaInfo?.companyName || '',
        engineeringLocation: project.fmeaInfo?.engineeringLocation || '',
        customerName: project.project?.customer || project.fmeaInfo?.customerName || '',
        modelYear: project.fmeaInfo?.modelYear || '',
        subject: project.fmeaInfo?.subject || project.project?.projectName || '',
        fmeaStartDate: project.fmeaInfo?.fmeaStartDate || '',
        fmeaRevisionDate: project.fmeaInfo?.fmeaRevisionDate || '',
        fmeaProjectName: project.project?.projectName || '',
        fmeaId: project.id,
        fmeaType: (project.fmeaType || 'P') as FMEAType,
        designResponsibility: project.fmeaInfo?.designResponsibility || '',
        confidentialityLevel: project.fmeaInfo?.confidentialityLevel || '',
        fmeaResponsibleName: project.fmeaInfo?.fmeaResponsibleName || '',
      };
      setFmeaInfo(dbFmeaInfo);
      
      // CFT 멤버 로드
      if (project.cftMembers && project.cftMembers.length > 0) {
        const mappedMembers: CFTMember[] = project.cftMembers.map((m: any, idx: number) => ({
          id: m.id || (idx + 1).toString(),
          role: m.role || '',
          name: m.name || '',
          department: m.department || '',
          position: m.position || '',
          task: m.task || m.responsibility || '',
          email: m.email || '',
          phone: m.phone || '',
          remark: m.remark || m.remarks || '',
        }));
        
        // 단일 역할 중복 제거
        const SINGLE_ROLES = ['Champion', 'Leader', 'PM', 'Moderator'];
        for (const role of SINGLE_ROLES) {
          const membersWithRole = mappedMembers.filter(m => m.role === role);
          if (membersWithRole.length > 1) {
            let firstFound = false;
            mappedMembers.forEach((m) => {
              if (m.role === role) {
                if (!firstFound) {
                  firstFound = true;
                } else {
                  m.role = '';
                  console.warn(`[DFMEA 등록] ⚠️ 중복 ${role} 제거: ${m.name || '(이름 없음)'}`);
                }
              }
            });
          }
        }
        
        // ★ 10행 보장 로직 제거
        setCftMembers(mappedMembers);
        console.log(`[DFMEA 등록] ✅ CFT 멤버 로드: ${mappedMembers.length}행`);
      } else {
        setCftMembers(createInitialCFTMembers());
      }
      
      // 상위 FMEA 로드
      if (project.parentFmeaId) {
        setSelectedBaseFmea(project.parentFmeaId.toLowerCase());
      }
      
      // 상위 APQP 로드
      if (project.parentApqpNo) {
        setSelectedParentApqp(project.parentApqpNo); // ★ 문자열로 저장
      }
      
      // URL 업데이트
      router.replace(`/dfmea/register?id=${project.id.toLowerCase()}`);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      alert(`✅ FMEA 데이터를 성공적으로 불러왔습니다.\n\nFMEA ID: ${project.id}\nFMEA명: ${dbFmeaInfo.subject || '(제목 없음)'}\nCFT 멤버: ${project.cftMembers?.length || 0}명`);
      console.log('[DFMEA 등록] ✅ 수동 불러오기 완료:', project.id);
      
    } catch (error: any) {
      console.error('[DFMEA 등록] ❌ 수동 불러오기 실패:', error);
      alert(`데이터 불러오기 실패:\n\n${error.message || '알 수 없는 오류가 발생했습니다.'}\n\nFMEA ID를 확인하고 다시 시도해주세요.`);
      setSaveStatus('idle');
    }
  };

  // 필드 업데이트
  const updateField = (field: keyof FMEAInfo, value: string) => {
    setFmeaInfo(prev => ({ ...prev, [field]: value }));
  };

  // 기초정보 선택 (고객 정보만 설정, 회사명/FMEA명은 수동 입력)
  const handleBizInfoSelect = (info: BizInfoProject) => {
    setFmeaInfo(prev => ({
      ...prev,
      // ★ companyName(회사명)은 작성 회사이므로 고객명과 분리 - 수동 입력
      // ★ fmeaProjectName(FMEA명)도 수동 입력
      // ★ subject도 수동 입력
      customerName: info.customerName || '',  // 고객명만 설정
      modelYear: info.modelYear || '',        // 모델년도
    }));
    setBizInfoModalOpen(false);
  };

  // 사용자 선택
  const handleUserSelect = (user: UserInfo) => {
    if (userModalTarget === 'responsible') {
      setFmeaInfo(prev => ({
        ...prev,
        fmeaResponsibleName: user.name || '',
        designResponsibility: user.department || '',
      }));
      console.log('[사용자 선택] 담당자로 설정:', user.name);
    } else if (selectedMemberIndex !== null) {
      // ✅ CFT 멤버에 사용자 정보 저장 (모든 필드 포함)
      const updated = [...cftMembers];
      const beforeName = updated[selectedMemberIndex]?.name || '(없음)';
      
      updated[selectedMemberIndex] = {
        ...updated[selectedMemberIndex],
        name: user.name || '', // ✅ name 필드 명시적으로 저장
        department: user.department || '',
        position: user.position || '',
        phone: user.phone || '',
        email: user.email || '',
        // task/responsibility는 사용자가 직접 입력
      };
      
      // ✅ 상태 업데이트 전 검증
      const updatedName = updated[selectedMemberIndex]?.name || '';
      console.log(`[사용자 선택] CFT 멤버[${selectedMemberIndex}] 업데이트:`, {
        이전name: beforeName,
        새name: updatedName,
        name비어있음: !updatedName || updatedName.trim() === '',
        전체멤버수: updated.length,
        업데이트된멤버: {
          name: updated[selectedMemberIndex].name,
          department: updated[selectedMemberIndex].department,
          role: updated[selectedMemberIndex].role,
        }
      });
      
      setCftMembers(updated);
      
      // ✅ 상태 업데이트 후 실제 상태 확인 (다음 렌더링에서)
      setTimeout(() => {
        console.log(`[사용자 선택] 상태 업데이트 완료 - CFT 멤버[${selectedMemberIndex}] name: "${updatedName}"`);
      }, 0);
    } else {
      console.warn('[사용자 선택] selectedMemberIndex가 null입니다. CFT 멤버가 업데이트되지 않았습니다.');
      alert('⚠️ CFT 멤버를 먼저 선택해주세요.\n\n💡 CFT 테이블에서 "성명" 셀을 클릭하여 사용자를 선택하세요.');
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

  // CFT 저장 (DB 저장 포함)
  const handleCftSave = async () => {
    console.log('[DFMEA 등록] CFT 테이블에서 저장 요청 -> DB 저장 실행');
    await handleSave();
    setCftSaveStatus('saved');
    setTimeout(() => setCftSaveStatus('idle'), 3000);
  };

  // CFT 초기화
  const handleCftReset = () => {
    if (confirm('CFT 목록을 초기화하시겠습니까?')) {
      localStorage.removeItem('dfmea-cft-data');
      setCftMembers(createInitialCFTMembers());
    }
  };

  // 저장 (신규 등록 또는 수정) - DB API 호출
  const handleSave = async () => {
    // ✅ 저장 시작 로그
    console.log('[DFMEA 등록] 💾 저장 버튼 클릭 - 저장 시작');
    
    if (!fmeaInfo.subject.trim()) {
      alert('FMEA명을 입력해주세요.');
      console.warn('[DFMEA 등록] ⚠️ 저장 실패: FMEA명이 없음');
      return;
    }

    // ★ FMEA ID가 없으면 신규 등록이므로 생성
    const finalFmeaId = fmeaId || generateFMEAId(fmeaInfo.fmeaType);
    if (!fmeaId) {
      setFmeaId(finalFmeaId);
      console.log('[DFMEA 등록] 신규 등록 - FMEA ID 생성:', finalFmeaId);
    }

    // ✅ CFT 멤버 데이터 검증 및 로그
    const validCftMembers = cftMembers.filter(m => m.name && m.name.trim() !== '');
    console.log('[DFMEA 등록] 저장 전 CFT 멤버 검증:', {
      총: cftMembers.length,
      유효: validCftMembers.length,
      빈행: cftMembers.length - validCftMembers.length,
      유효멤버: validCftMembers.map(m => ({ role: m.role, name: m.name, department: m.department })),
    });
    
    // ✅ 저장 전 빈 값 확인 (경고만, 저장은 진행)
    const emptyMembers = cftMembers.filter(m => !m.name || m.name.trim() === '');
    if (emptyMembers.length > 0) {
      console.warn(`[DFMEA 등록] ⚠️ ${emptyMembers.length}명의 CFT 멤버가 이름이 없습니다 (제외됨)`);
    }
    
    // ✅ name이 있는 멤버 수 확인
    if (validCftMembers.length === 0) {
      const shouldContinue = confirm('CFT 멤버가 없습니다. 그래도 저장하시겠습니까?');
      if (!shouldContinue) {
        console.warn('[DFMEA 등록] ⚠️ 저장 취소: 사용자 취소');
        return;
      }
    }

    setSaveStatus('saving' as any);
    
    try {
      const projectData = {
        projectName: fmeaInfo.fmeaProjectName || fmeaInfo.subject,
        customer: fmeaInfo.customerName,
        productName: fmeaInfo.subject,
        partNo: '',
        department: fmeaInfo.designResponsibility,
        leader: fmeaInfo.fmeaResponsibleName,
        startDate: fmeaInfo.fmeaStartDate,
        endDate: '',
      };
      
      // ✅ fmeaInfo 객체에 모든 필드 명시적으로 포함
      const fmeaInfoToSave = {
        companyName: fmeaInfo.companyName || '',
        engineeringLocation: fmeaInfo.engineeringLocation || '',
        customerName: fmeaInfo.customerName || '',
        modelYear: fmeaInfo.modelYear || '',
        subject: fmeaInfo.subject || '',
        fmeaStartDate: fmeaInfo.fmeaStartDate || '',
        fmeaRevisionDate: fmeaInfo.fmeaRevisionDate || '',
        fmeaProjectName: fmeaInfo.fmeaProjectName || '',
        fmeaId: finalFmeaId, // ★ 생성된 ID 사용 (소문자)
        fmeaType: fmeaInfo.fmeaType || 'P',
        designResponsibility: fmeaInfo.designResponsibility || '',
        confidentialityLevel: fmeaInfo.confidentialityLevel || '',
        fmeaResponsibleName: fmeaInfo.fmeaResponsibleName || '',
      };
      
      console.log('[DFMEA 등록] 저장할 fmeaInfo:', fmeaInfoToSave);
      
      // ✅ CFT 멤버 상태 최종 확인 (저장 직전 실제 상태 - 현재 상태 직접 확인)
      console.log('[DFMEA 등록] ⚠️ 저장 직전 CFT 멤버 상태 확인:');
      console.log(`  - 전체 멤버 수: ${cftMembers.length}`);
      
      // ✅ 실제 상태 값 확인 (React 상태가 아닌 현재 값)
      const actualMembers = [...cftMembers]; // 현재 상태 복사
      
      const cftMembersWithName = actualMembers.filter(m => m.name && String(m.name).trim() !== '');
      const cftMembersWithoutName = actualMembers.filter(m => !m.name || String(m.name).trim() === '');
      
      console.log(`  - name 있는 멤버: ${cftMembersWithName.length}명`);
      if (cftMembersWithName.length > 0) {
        console.log('    ✅ name 있는 멤버:', cftMembersWithName.map((m, idx) => `[${idx}] ${m.name || '(없음)'} (${m.role || '(role없음)'})`).join(', '));
      }
      
      console.log(`  - name 없는 멤버: ${cftMembersWithoutName.length}명`);
      if (cftMembersWithoutName.length > 0) {
        console.warn('    ⚠️ name 없는 멤버:', cftMembersWithoutName.map((m, idx) => `[${idx}] ${m.role || '(role없음)'}`).join(', '));
      }
      
      // ✅ 저장할 CFT 멤버 상세 로그 (실제 전달되는 데이터 - 현재 상태 그대로)
      console.log('[DFMEA 등록] 저장할 CFT 멤버 (상세 - 실제 전달 데이터):', 
        JSON.stringify(actualMembers.map((m, idx) => ({
          index: idx,
          id: m.id || '(id없음)',
          role: m.role || '(role없음)',
          name: m.name || '(이름없음)',
          nameType: typeof m.name,
          nameValue: String(m.name || ''),
          nameTrimmed: String(m.name || '').trim(),
          nameEmpty: !m.name || String(m.name).trim() === '',
          department: m.department || '(부서없음)',
          position: m.position || '(직급없음)',
          task: m.task || '(담당업무없음)',
          email: m.email || '(이메일없음)',
          phone: m.phone || '(전화없음)',
          remark: m.remark || '(비고없음)',
        })), null, 2)
      );
      
      // ★ 이름이 없는 멤버는 저장 불가 (즉시 중단)
      if (cftMembersWithoutName.length > 0) {
        const rolesWithoutName = cftMembersWithoutName.map(m => m.role || '(역할 없음)').join(', ');
        alert(`이름이 없는 CFT 멤버가 있습니다.\n\n이름 없는 멤버: ${cftMembersWithoutName.length}명\n역할: ${rolesWithoutName}\n\n이름을 입력하거나 해당 행을 삭제해주세요.`);
        console.error('[DFMEA 등록] ❌ 저장 실패: 이름 없는 멤버 존재', cftMembersWithoutName);
        setSaveStatus('idle');
        return;
      }
      
      // ★ 이름이 있는 멤버만 저장 (이름 없는 멤버는 제외)
      const membersToSave = actualMembers.filter(m => m.name && m.name.trim() !== '');
      
      if (membersToSave.length === 0) {
        alert('이름이 있는 CFT 멤버가 최소 1명 이상 필요합니다.');
        console.error('[DFMEA 등록] ❌ 저장 실패: 이름 있는 멤버 없음');
        setSaveStatus('idle');
        return;
      }
      
      // ★ 단일 역할 중복 체크 (저장 직전 최종 검증)
      const SINGLE_ROLES = ['Champion', 'Leader', 'PM', 'Moderator'];
      for (const role of SINGLE_ROLES) {
        const membersWithRole = membersToSave.filter(m => m.role === role);
        if (membersWithRole.length > 1) {
          const memberNames = membersWithRole.map(m => m.name || '(이름 없음)').join(', ');
          alert(`${role}은 한 명만 등록할 수 있습니다.\n\n현재 ${role}: ${membersWithRole.length}명\n${memberNames}\n\n중복된 ${role}의 역할을 변경해주세요.`);
          console.error(`[DFMEA 등록] ❌ 저장 실패: ${role} 중복 (최종 검증)`, membersWithRole);
          setSaveStatus('idle');
          return;
        }
      }
      
      // ✅ parentFmeaId 결정: Master는 본인이 상위 FMEA, Family/Part는 선택된 상위 FMEA
      // ✅ FMEA ID는 항상 소문자로 정규화 (DB 일관성 보장)
      let actualFmeaType: FMEAType;
      if (fmeaInfo.fmeaType) {
        actualFmeaType = fmeaInfo.fmeaType as FMEAType;
      } else if (finalFmeaId.includes('-M')) {
        actualFmeaType = 'M';
      } else if (finalFmeaId.includes('-F')) {
        actualFmeaType = 'F';
      } else {
        actualFmeaType = 'P';
      }
      
      let parentId: string | null = null;
      let parentType: string | null = null;
      
      if (actualFmeaType === 'M') {
        // ★ Master FMEA는 본인이 상위 FMEA (자기 자신이 parent)
        parentId = finalFmeaId.toLowerCase();
        parentType = 'M';
      } else if (selectedBaseFmea) {
        // Family/Part는 선택된 상위 FMEA를 parent로 가짐
        parentId = selectedBaseFmea.toLowerCase();
        // parentFmeaType 추출
        const match = selectedBaseFmea.match(/dfm\d{2}-([mfp])/i);
        if (match) {
          parentType = match[1].toUpperCase(); // M, F, P
        }
      }
      
      console.log('[DFMEA 등록] 상위 FMEA 저장:', { 
        fmeaType: actualFmeaType,
        parentFmeaId: parentId, 
        parentFmeaType: parentType,
        isMaster: actualFmeaType === 'M',
        masterSelfParent: actualFmeaType === 'M' ? '본인이 상위 FMEA' : '선택된 상위 FMEA'
      });
      
      // 1. DB에 프로젝트 생성/수정 (CFT 멤버 + 상위 APQP + 상위 FMEA 포함)
      const response = await fetch('/api/fmea/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId: finalFmeaId, // ★ 생성된 ID 사용 (소문자)
          fmeaType: fmeaInfo.fmeaType,
          project: projectData,
          fmeaInfo: fmeaInfoToSave,  // ✅ 모든 필드 포함
          cftMembers: membersToSave,  // ✅ CFT 멤버도 DB에 저장 (현재 상태 명시적으로 전달)
          parentApqpNo: selectedParentApqp || null,  // ★ 상위 APQP 저장 (이미 문자열)
          parentFmeaId: parentId,  // ✅ 상위 FMEA ID 저장 (이미 대문자로 변환됨)
          parentFmeaType: parentType,  // ✅ 상위 FMEA 유형 저장
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '저장 실패');
      }
      
      // ✅ 저장 성공 후 응답 확인
      console.log('[DFMEA 등록] ✅ 저장 성공:', {
        fmeaId: result.fmeaId,
        저장된CFT멤버수: membersToSave.length,
        name있는멤버수: membersToSave.filter(m => m.name && m.name.trim() !== '').length,
        전달된멤버: membersToSave.map(m => ({ name: m.name || '(이름없음)', role: m.role || '(role없음)' })),
      });
      
      // ✅ 저장 후 DB에서 다시 조회하여 확인 (저장이 제대로 되었는지 검증)
      try {
        const verifyRes = await fetch(`/api/fmea/projects?id=${fmeaId}`);
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const savedProject = verifyData.projects?.find((p: any) => p.id === fmeaId);
          if (savedProject && savedProject.cftMembers) {
            console.log('[DFMEA 등록] ✅ 저장 확인: DB에 저장된 CFT 멤버:', {
              DB저장멤버수: savedProject.cftMembers.length,
              멤버목록: savedProject.cftMembers.map((m: any) => ({ name: m.name || '(이름없음)', role: m.role || '(role없음)' })),
            });
            
            // ✅ 저장된 멤버 수가 다르면 에러 및 재시도
            const name있는멤버수 = cftMembers.filter(m => m.name && m.name.trim() !== '').length;
            
            if (savedProject.cftMembers.length !== name있는멤버수) {
              console.error(`[DFMEA 등록] ❌ 멤버 수 불일치!`);
              console.error(`  - 전달한 name있는멤버: ${name있는멤버수}명`);
              console.error(`  - DB에 저장된 멤버: ${savedProject.cftMembers.length}명`);
              console.error(`  - 전달한 전체 멤버: ${cftMembers.length}명`);
              
              alert(`❌ CFT 멤버 저장 실패!\n\n전달: ${name있는멤버수}명 (name 있음)\nDB 저장: ${savedProject.cftMembers.length}명\n\n콘솔에서 상세 정보를 확인하세요.`);
              
              // ❌ 저장 실패 처리 - 사용자에게 알림
              setSaveStatus('idle');
              return; // 에러 상태 유지
            } else {
              console.log(`[DFMEA 등록] ✅ 멤버 수 일치: ${savedProject.cftMembers.length}명 모두 DB에 저장됨`);
            }
            
            // ✅ 저장 확인 완료 후 화면 데이터 동기화 (6명 등 실제 저장된 데이터 유지)
            console.log('[DFMEA 등록] ✅ DB 데이터로 화면 동기화:', savedProject.cftMembers.length, '명');
            setCftMembers(savedProject.cftMembers);
          }
        }
      } catch (verifyError) {
        console.warn('[DFMEA 등록] 저장 확인 실패:', verifyError);
      }
      
      // 2. localStorage에도 백업 저장
      const existing = JSON.parse(localStorage.getItem('dfmea-projects') || '[]');
      const data = { 
        id: finalFmeaId, 
        project: projectData,
      fmeaInfo,
      cftMembers, 
      createdAt: new Date().toISOString(),
        status: 'active',
        step: 1,
        revisionNo: 'Rev.00',
    };
    
      const existingIndex = existing.findIndex((p: any) => p.id === finalFmeaId);
      if (existingIndex >= 0) {
        existing[existingIndex] = { ...existing[existingIndex], ...data, updatedAt: new Date().toISOString() };
      } else {
    existing.unshift(data);
      }
    localStorage.setItem('dfmea-projects', JSON.stringify(existing));
      
      // ★ 마지막 작업 FMEA ID 저장 (다음 방문 시 자동 로드용)
      localStorage.setItem('dfmea-last-edited', finalFmeaId);
      
      // 3. 저장 완료 이벤트 발생
      window.dispatchEvent(new Event('fmea-projects-updated'));
      
      // 4. iframe인 경우 부모 창에 저장 완료 메시지 전송
      if (window.parent !== window) {
        window.parent.postMessage('fmea-saved', '*');
      }
    
    setSaveStatus('saved');
      setShowMissingFields(true);
      console.log('✅ FMEA DB 저장 완료:', fmeaId);
      
      // ★ 저장 후 URL을 수정 모드로 업데이트 (새로고침 시 데이터 유지)
      if (!isEditMode) {
        router.replace(`/dfmea/register?id=${finalFmeaId}`);
      }
      
    setTimeout(() => {
      setSaveStatus('idle');
        console.log('[DFMEA 등록] 저장 완료 상태 유지 - 수정 가능');
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ FMEA 저장 실패:', error);
      alert('저장에 실패했습니다: ' + errorMessage);
      setSaveStatus('idle');
    }
  };

  // 새로고침 (새로 등록과 동일)
  const handleRefresh = handleNewRegister;

  // CFT 접속 로그
  const [accessLogs] = useState<CFTAccessLog[]>([
    { id: 1, projectId: fmeaId, userName: '김철수', loginTime: '2025-12-26 09:00', logoutTime: '2025-12-26 12:30', action: '수정', itemType: 'DFMEA', cellAddress: 'A1:B5', description: 'DFMEA 프로젝트 정보 수정' },
    { id: 2, projectId: fmeaId, userName: '이영희', loginTime: '2025-12-26 10:15', logoutTime: '2025-12-26 11:45', action: '추가', itemType: 'CFT', cellAddress: 'C3', description: 'CFT 팀원 추가' },
    { id: 3, projectId: fmeaId, userName: '박지민', loginTime: '2025-12-26 14:00', logoutTime: null, action: '수정', itemType: 'DFMEA', cellAddress: 'D10:F15', description: '고장형태 분석 업데이트' },
  ]);

  // AI 상태 조회
  const [aiStatus, setAiStatus] = useState<{ historyCount: number; isReady: boolean; stats: { uniqueModes: number; uniqueCauses: number; uniqueEffects: number } } | null>(null);
  
  useEffect(() => {
    // 클라이언트에서만 AI 상태 조회
    if (typeof window !== 'undefined') {
      setAiStatus(getAIStatus());
    }
  }, []);

  // 테이블 셀 스타일
  const headerCell = "bg-[#00587a] text-white px-2 py-1.5 border border-white font-semibold text-xs text-center align-middle";
  const inputCell = "border border-gray-300 px-1 py-0.5";
  const yellowCell = "bg-yellow-100";

  // CFT 멤버 이름 목록 (상호기능팀용)
  const cftNames = cftMembers.filter(m => m.name).map(m => m.name).join(', ');

  return (
    <>
      {/* 상단 고정 바로가기 메뉴 */}
      <DFMEATopNav selectedFmeaId={fmeaId} />
      
      <div className="min-h-screen bg-[#f0f0f0] px-3 py-3 pt-9 font-[Malgun_Gothic]">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
            <span className="text-lg">{isEditMode ? '✏️' : '📝'}</span>
            <h1 className="text-sm font-bold text-gray-800">D-FMEA {isEditMode ? '수정' : '등록'}</h1>
            {(editId || fmeaId) && (
              <span className="text-xs text-gray-500 ml-2">ID: {editId || fmeaId}</span>
            )}
            {isEditMode && <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-bold">수정모드</span>}
        </div>
        <div className="flex gap-2">
          {(isEditMode || fmeaId) && (
            <button 
              onClick={handleLoadFromDB} 
              disabled={saveStatus === 'saving'}
              className={`px-3 py-1.5 border text-xs rounded font-semibold ${
                saveStatus === 'saving' 
                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed' 
                  : 'bg-purple-100 border-purple-400 text-purple-700 hover:bg-purple-200'
              }`}
              title="DB에서 FMEA 데이터 불러오기"
            >
              {saveStatus === 'saving' ? '⏳ 불러오는 중...' : '🔄 불러오기'}
            </button>
          )}
          <button onClick={handleNewRegister} className="px-3 py-1.5 bg-green-100 border border-green-400 text-green-700 text-xs rounded hover:bg-green-200 font-semibold">
            ➕ 새로 등록
          </button>
          <button 
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`px-4 py-1.5 text-xs font-bold rounded ${
              saveStatus === 'saving' 
                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed' 
                : saveStatus === 'saved'
                ? 'bg-green-500 text-white'
                : 'bg-[#1976d2] text-white hover:bg-[#1565c0]'
            }`}
          >
            {saveStatus === 'saving' ? '⏳ 저장 중...' : saveStatus === 'saved' ? '✓ 저장됨' : '💾 저장'}
          </button>
        </div>
      </div>

      {/* ===== 기획 및 준비 (1단계) ===== */}
      <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
      <div className="bg-white rounded border border-gray-300 mb-3">
        <div className="bg-[#e3f2fd] px-3 py-1.5 border-b border-gray-300">
          <h2 className="text-xs font-bold text-gray-700">기획 및 준비 (1단계)</h2>
        </div>
        
        <table className="w-full border-collapse text-xs">
          <tbody>
            {/* 1행 - CP와 동일한 구조 */}
            <tr className="bg-[#e3f2fd] h-8">
              <td className={`${headerCell} w-[11%] whitespace-nowrap`}>회사 명</td>
              <td className={`${inputCell} w-[14%] relative`}>
                {showMissingFields && !fmeaInfo.companyName && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-400 text-[10px] pointer-events-none">
                    미입력
                  </span>
                )}
                <input 
                  type="text" 
                  name="fmea-company-name-x1" 
                  autoComplete="new-password" 
                  data-lpignore="true" 
                  data-form-type="other" 
                  value={fmeaInfo.companyName} 
                  onChange={(e) => {
                    updateField('companyName', e.target.value);
                    setShowMissingFields(false);
                  }}
                  className={`w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400 ${showMissingFields && !fmeaInfo.companyName ? 'text-transparent' : ''}`}
                  placeholder="설계 FMEA에 책임이 있는 회사 명" 
                />
              </td>
              <td className={`${headerCell} w-[7%] whitespace-nowrap`}>FMEA명</td>
              <td className={`${inputCell} w-[18%] relative`}>
                {showMissingFields && !fmeaInfo.subject && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-400 text-[10px] pointer-events-none">
                    미입력
                  </span>
                )}
                <input 
                  type="text" 
                  name="fmea-subject-x1" 
                  autoComplete="new-password" 
                  data-lpignore="true" 
                  data-form-type="other" 
                  value={fmeaInfo.subject} 
                  onChange={(e) => {
                    updateField('subject', e.target.value);
                    setShowMissingFields(false);
                  }}
                  className={`w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400 ${showMissingFields && !fmeaInfo.subject ? 'text-transparent' : ''}`}
                  placeholder="시스템, 서브시스템 및/또는 구성품" 
                />
              </td>
              <td className={`${headerCell} w-[7%] whitespace-nowrap`}>FMEA ID</td>
              <td className={`${inputCell} w-[10%]`}>
                <span className="px-2 text-xs font-semibold text-blue-600">{fmeaId}</span>
              </td>
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
            
            {/* 2행 - CP와 동일한 구조 */}
            <tr className="bg-white h-8">
              <td className={`${headerCell} whitespace-nowrap`}>설계 책임</td>
              <td className={`${inputCell}`}>
                <input 
                  type="text" 
                  name="fmea-dept-x1" 
                  autoComplete="new-password" 
                  data-lpignore="true" 
                  data-form-type="other" 
                  value={fmeaInfo.designResponsibility} 
                  onChange={(e) => {
                    updateField('designResponsibility', e.target.value);
                    setShowMissingFields(false);
                  }}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" 
                  placeholder="부서" 
                />
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>FMEA 책임자</td>
              <td className={`${inputCell}`}>
                <div className="flex items-center gap-1">
                  <input 
                    type="text" 
                    name="fmea-responsible-x1" 
                    autoComplete="new-password" 
                    data-lpignore="true" 
                    data-form-type="other" 
                    value={fmeaInfo.fmeaResponsibleName} 
                    onChange={(e) => {
                      updateField('fmeaResponsibleName', e.target.value);
                      setShowMissingFields(false);
                    }}
                    className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" 
                    placeholder="책임자 성명" 
                  />
                  <button onClick={() => { setUserModalTarget('responsible'); setUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700 px-1">🔍</button>
                </div>
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>시작 일자</td>
              <td className={`${inputCell}`}>
                <input 
                  type="date" 
                  name="fmea-start-date-x1" 
                  autoComplete="new-password" 
                  value={fmeaInfo.fmeaStartDate} 
                  onChange={(e) => {
                    updateField('fmeaStartDate', e.target.value);
                    setShowMissingFields(false);
                  }}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                />
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>상위 FMEA</td>
              <td className={`${inputCell} cursor-pointer hover:bg-yellow-50`} onClick={() => openFmeaSelectModal('ALL')}>
                {selectedBaseFmea ? (
                  <span className="text-xs font-semibold text-yellow-600 px-2">🔗 {selectedBaseFmea}</span>
                ) : (
                  <span className="px-2 text-xs text-gray-400">- (클릭하여 선택)</span>
                )}
              </td>
            </tr>
            
            {/* 3행 - CP와 동일한 구조 */}
            <tr className="bg-[#e3f2fd] h-8">
              <td className={`${headerCell} whitespace-nowrap`}>고객 명</td>
              <td className={`${inputCell}`}>
                <div className="flex items-center gap-1">
                  <input 
                    type="text" 
                    name="fmea-customer-x1" 
                    autoComplete="new-password" 
                    data-lpignore="true" 
                    data-form-type="other" 
                    value={fmeaInfo.customerName} 
                    onChange={(e) => {
                      updateField('customerName', e.target.value);
                      setShowMissingFields(false);
                    }}
                    className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" 
                    placeholder="고객 명" 
                  />
                  <button onClick={() => setBizInfoModalOpen(true)} className="text-blue-500 hover:text-blue-700">🔍</button>
                </div>
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>개정 일자</td>
              <td className={`${inputCell}`}>
                <input 
                  type="date" 
                  name="fmea-revision-date-x1" 
                  autoComplete="new-password" 
                  value={fmeaInfo.fmeaRevisionDate} 
                  onChange={(e) => {
                    updateField('fmeaRevisionDate', e.target.value);
                    setShowMissingFields(false);
                  }}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                />
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>엔지니어링 위치</td>
              <td className={`${inputCell}`}>
                <input 
                  type="text" 
                  name="fmea-location-x1" 
                  autoComplete="new-password" 
                  data-lpignore="true" 
                  data-form-type="other" 
                  value={fmeaInfo.engineeringLocation} 
                  onChange={(e) => {
                    updateField('engineeringLocation', e.target.value);
                    setShowMissingFields(false);
                  }}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" 
                  placeholder="지리적 위치" 
                />
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>기밀유지 수준</td>
              <td className={`${inputCell}`}>
                <select 
                  value={fmeaInfo.confidentialityLevel} 
                  onChange={(e) => {
                    updateField('confidentialityLevel', e.target.value);
                    setShowMissingFields(false);
                  }}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                >
                  <option value="">선택</option>
                  <option value="사업용도">사업용도</option>
                  <option value="독점">독점</option>
                  <option value="기밀">기밀</option>
                </select>
              </td>
            </tr>
            
            {/* 4행 - CP와 동일한 구조 */}
            <tr className="bg-white h-8">
              <td className={`${headerCell} whitespace-nowrap`}>모델 연식</td>
              <td className={`${inputCell}`}>
                <input 
                  type="text" 
                  name="fmea-model-year-x1" 
                  autoComplete="new-password" 
                  data-lpignore="true" 
                  data-form-type="other" 
                  value={fmeaInfo.modelYear} 
                  onChange={(e) => {
                    updateField('modelYear', e.target.value);
                    setShowMissingFields(false);
                  }}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" 
                  placeholder="어플리케이션" 
                />
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>FMEA 유형</td>
              <td className={`${inputCell}`}>
                <select 
                  value={fmeaInfo.fmeaType} 
                  onChange={(e) => {
                    const newType = e.target.value as FMEAType;
                    updateField('fmeaType', newType);
                    setFmeaId(generateFMEAId(newType));
                  }}
                  className="w-full h-7 px-2 text-xs border border-gray-300 bg-white text-gray-700 font-semibold rounded focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="M">M - Master FMEA</option>
                  <option value="F">F - Family FMEA</option>
                  <option value="P">P - Part FMEA</option>
                </select>
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>상호기능팀</td>
              <td className={`${inputCell}`} colSpan={3}>
                {cftNames ? (
                  <span className="text-xs text-gray-700 px-2">{cftNames}</span>
                ) : (
                  <span className="text-xs text-gray-400 px-2">-</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </form>

      {/* ===== FMEA 기초정보 등록 옵션 (테이블) - AI 예측과 동일한 5컬럼 ===== */}
      <div className="mb-3 mt-4">
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr className="h-8">
              <td className="w-[12%] bg-[#00587a] text-white px-3 py-1.5 border border-gray-400 font-bold text-center whitespace-nowrap">
                FMEA 기초 정보등록
              </td>
              <td 
                onClick={() => openFmeaSelectModal('M')}
                className="w-[18%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer hover:bg-purple-200 whitespace-nowrap font-semibold text-purple-700 bg-purple-100"
                title="Master FMEA를 선택하여 기초정보 사용"
              >
                🟣 Master Data 사용
              </td>
              <td 
                onClick={() => openFmeaSelectModal('F')}
                className="w-[25%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer hover:bg-blue-200 whitespace-nowrap font-semibold text-blue-700 bg-[#e3f2fd]"
                title="Family FMEA를 선택하여 기초정보 사용"
              >
                🔵 Family Data 사용
              </td>
              <td 
                onClick={() => openFmeaSelectModal('P')}
                className="w-[30%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer hover:bg-green-200 whitespace-nowrap font-semibold text-green-700 bg-[#e8f5e9]"
                title="기존 Part FMEA를 선택하여 기초정보 사용"
              >
                🟢 Part FMEA 사용
              </td>
              <td 
                onClick={() => window.location.href = `/dfmea/import?id=${fmeaId}&mode=new`}
                className="w-[15%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer hover:bg-amber-200 whitespace-nowrap font-semibold text-amber-700 bg-amber-100"
              >
                ✏️ 신규 입력
              </td>
            </tr>
          </tbody>
        </table>
        {selectedBaseFmea && (
          <div className="mt-2 text-xs text-blue-600">
            📌 선택된 기반 FMEA: <span className="font-bold">{selectedBaseFmea}</span>
          </div>
        )}
      </div>
      
      {/* FMEA 선택 모달 */}
      {fmeaSelectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[500px] overflow-hidden">
            <div className={`px-4 py-3 flex justify-between items-center ${
              fmeaSelectType === 'M' ? 'bg-purple-600' : 
              fmeaSelectType === 'F' ? 'bg-blue-600' : 
              fmeaSelectType === 'P' ? 'bg-green-600' : 
              'bg-gray-600'
            } text-white`}>
              <h3 className="font-bold">
                {fmeaSelectType === 'M' ? '🟣 Master FMEA 선택' : 
                 fmeaSelectType === 'F' ? '🔵 Family FMEA 선택' : 
                 fmeaSelectType === 'P' ? '🟢 Part FMEA 선택' : 
                 '📋 FMEA 리스트 선택'}
              </h3>
              <button onClick={() => setFmeaSelectModalOpen(false)} className="text-white hover:text-gray-200">✕</button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {availableFmeas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {fmeaSelectType === 'ALL' ? '등록된 FMEA가 없습니다. 자신의 FMEA ID가 상위 FMEA로 설정됩니다.' : 
                   `등록된 ${fmeaSelectType === 'M' ? 'Master' : fmeaSelectType === 'F' ? 'Family' : 'Part'} FMEA가 없습니다.`}
                </div>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left">FMEA ID</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">FMEA명</th>
                      <th className="border border-gray-300 px-3 py-2 text-center w-20">선택</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableFmeas.map((fmea, idx) => (
                      <tr key={fmea.id} className={`hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="border border-gray-300 px-3 py-2 font-semibold text-blue-600">{fmea.id}</td>
                        <td className="border border-gray-300 px-3 py-2">{fmea.subject}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <button
                            onClick={() => handleFmeaSelect(fmea.id)}
                            className={`px-3 py-1 rounded text-white text-xs font-bold ${
                              fmeaSelectType === 'M' ? 'bg-purple-500 hover:bg-purple-600' :
                              fmeaSelectType === 'F' ? 'bg-blue-500 hover:bg-blue-600' : 
                              fmeaSelectType === 'P' ? 'bg-green-500 hover:bg-green-600' :
                              'bg-gray-500 hover:bg-gray-600'
                            }`}
                          >
                            선택
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-4 py-3 bg-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setFmeaSelectModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== AI 기반 FMEA 예측 시스템 ===== */}
      <div className="mb-3">
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr className="h-8">
              <td className="w-[12%] bg-gradient-to-r from-purple-700 to-indigo-700 text-white px-3 py-1.5 border border-gray-400 font-bold text-center whitespace-nowrap">
                🤖 AI 예측 FMEA
              </td>
              <td 
                onClick={() => window.location.href = `/dfmea/worksheet?id=${fmeaId}&mode=ai`}
                className={`w-[18%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer whitespace-nowrap font-semibold ${
                  aiStatus?.isReady 
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                title={aiStatus?.isReady ? 'AI 기반으로 고장모드/원인/영향을 자동 추천받습니다' : '학습 데이터가 부족합니다 (최소 10건 필요)'}
              >
                {aiStatus?.isReady ? '✨ AI 추천 시작' : '⏳ 학습 중...'}
              </td>
              <td className="w-[25%] px-3 py-1.5 border border-gray-400 text-center whitespace-nowrap bg-indigo-50">
                <span className="text-indigo-700 font-semibold">
                  📊 학습 데이터: {aiStatus?.historyCount || 0}건
                </span>
              </td>
              <td className="w-[30%] px-3 py-1.5 border border-gray-400 text-center whitespace-nowrap bg-indigo-50">
                <span className="text-indigo-600 text-[10px]">
                  FM({aiStatus?.stats?.uniqueModes || 0}) | FC({aiStatus?.stats?.uniqueCauses || 0}) | FE({aiStatus?.stats?.uniqueEffects || 0})
                </span>
              </td>
              <td 
                onClick={() => {
                  if (confirm('AI 학습 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                    localStorage.removeItem('fmea-ai-history');
                    localStorage.removeItem('fmea-ai-rules');
                    setAiStatus({ historyCount: 0, isReady: false, stats: { uniqueModes: 0, uniqueCauses: 0, uniqueEffects: 0 } });
                    alert('AI 학습 데이터가 초기화되었습니다.');
                  }
                }}
                className="w-[15%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer hover:bg-red-100 whitespace-nowrap font-semibold text-red-500 bg-red-50"
              >
                🗑️ 초기화
              </td>
            </tr>
          </tbody>
        </table>
        <p className="text-[10px] text-gray-500 mt-1 ml-1">
          💡 AI 예측 시스템은 기존에 작성된 FMEA 데이터를 학습하여 새로운 FMEA 작성 시 고장모드, 원인, 영향을 자동으로 추천합니다.
        </p>
      </div>

      {/* ===== CFT 리스트 (표준 컴포넌트) ===== */}
      <div id="cft-section" className="mt-6 scroll-mt-20">
        <CFTRegistrationTable
          title="CFT 리스트"
          members={cftMembers}
          onMembersChange={(newMembers) => {
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
                      console.warn(`[DFMEA 등록] ⚠️ 중복 ${role} 행 삭제: ${m.name || '(이름 없음)'}`);
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

      {/* ===== CFT 접속 로그 섹션 ===== */}
      <div className="flex items-center gap-2 mt-6 mb-2">
        <span>📊</span>
        <h2 className="text-sm font-bold text-gray-700">CFT 접속 로그</h2>
      </div>
      <CFTAccessLogTable accessLogs={accessLogs} maxRows={5} />

      {/* 하단 상태바 */}
      <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
        <span>총 {cftMembers.filter(m => m.name).length}명의 CFT 멤버 | 접속 로그 {accessLogs.length}건</span>
        <span>버전: D-FMEA Suite v3.0 | 사용자: FMEA Lead</span>
      </div>

      {/* 모달 */}
      <BizInfoSelectModal
        isOpen={bizInfoModalOpen}
        onClose={() => setBizInfoModalOpen(false)}
        onSelect={handleBizInfoSelect}
      />

      <UserSelectModal
        isOpen={userModalOpen}
        onClose={() => { setUserModalOpen(false); setSelectedMemberIndex(null); }}
        onSelect={handleUserSelect}
      />
      
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
                    onClick={() => { setSelectedParentApqp(apqp.apqpNo); setApqpModalOpen(false); }}
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

// Suspense boundary wrapper for useSearchParams
export default function DFMEARegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">로딩 중...</div>}>
      <DFMEARegisterPageContent />
    </Suspense>
  );
}
