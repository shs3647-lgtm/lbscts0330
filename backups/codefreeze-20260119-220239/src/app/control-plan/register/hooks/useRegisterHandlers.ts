/**
 * @file hooks/useRegisterHandlers.ts
 * @description CP 등록 핸들러 훅
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CPInfo, CPType, FmeaSelectItem, CpSelectItem, SaveStatus } from '../types';

/**
 * CP ID 생성 규칙
 * 형식: cp{YY}-{type}{NNN}
 * 예: cp26-m001, cp26-f001, cp26-p001
 * ★ 2026-01-13: 소문자로 통일 (DB 일관성, PostgreSQL 호환성)
 */
export function generateCPId(type: CPType = 'P'): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const typeChar = type.toLowerCase(); // ★ 소문자로 변환
  try {
    const stored = localStorage.getItem('cp-projects');
    if (stored) {
      const projects = JSON.parse(stored);
      const prefix = `cp${year}-${typeChar}`;
      const currentIds = projects
        .filter((p: { id: string }) => p.id?.toLowerCase().startsWith(prefix))
        .map((p: { id: string }) => {
          const match = p.id.match(/\d{3}$/);
          return match ? parseInt(match[0]) : 0;
        });
      if (currentIds.length > 0) {
        const maxSeq = Math.max(...currentIds);
        return `cp${year}-${typeChar}${(maxSeq + 1).toString().padStart(3, '0')}`;
      }
    }
  } catch (e) {
    console.error('ID 생성 중 오류:', e);
  }
  return `cp${year}-${typeChar}001`;
}

interface UseRegisterHandlersProps {
  cpInfo: CPInfo;
  setCpInfo: React.Dispatch<React.SetStateAction<CPInfo>>;
  cpId: string;
  setCpId: React.Dispatch<React.SetStateAction<string>>;
  cftMembers: any[];
  selectedParentApqp: string | null;   // ★ 상위 APQP (최상위)
  selectedParentFmea: string | null;   // 상위 FMEA
  selectedBaseCp: string | null;       // 상위 CP
  setSelectedBaseCp: React.Dispatch<React.SetStateAction<string | null>>;  // ★ 상위 CP 설정 함수
  setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
  setShowMissingFields: React.Dispatch<React.SetStateAction<boolean>>;
  setAvailableFmeas: React.Dispatch<React.SetStateAction<FmeaSelectItem[]>>;
  setFmeaSelectModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFmeaSelectType: React.Dispatch<React.SetStateAction<'M' | 'F' | 'P' | 'ALL'>>;
  setAvailableCps: React.Dispatch<React.SetStateAction<CpSelectItem[]>>;
  setCpSelectModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCpSelectType: React.Dispatch<React.SetStateAction<'M' | 'F' | 'P'>>;
  isEditMode?: boolean;  // 수정 모드 여부
}

export function useRegisterHandlers({
  cpInfo,
  setCpInfo,
  cpId,
  setCpId,
  cftMembers,
  selectedParentApqp,
  selectedParentFmea,
  selectedBaseCp,
  setSelectedBaseCp,  // ★ 상위 CP 설정 함수 추가
  setSaveStatus,
  setShowMissingFields,
  setAvailableFmeas,
  setFmeaSelectModalOpen,
  setFmeaSelectType,
  setAvailableCps,
  setCpSelectModalOpen,
  setCpSelectType,
  isEditMode = false,
}: UseRegisterHandlersProps) {
  const router = useRouter();
  
  // CP 유형 변경 시 ID 재생성 및 MASTER CP는 상위 CP를 자신으로 설정
  const handleCpTypeChange = useCallback((newType: CPType) => {
    setCpInfo(prev => ({ ...prev, cpType: newType }));
    const newCpId = generateCPId(newType);
    setCpId(newCpId);
    
    // ★ MASTER CP는 상위 CP가 자신이 되도록 설정
    if (newType === 'M') {
      setSelectedBaseCp(newCpId);
    } else if (cpInfo.cpType === 'M' && (newType === 'F' || newType === 'P')) {
      // MASTER에서 다른 타입으로 변경 시 상위 CP 초기화
      setSelectedBaseCp(null);
    }
  }, [setCpInfo, setCpId, setSelectedBaseCp, cpInfo.cpType]);
  
  // 필드 업데이트
  const updateField = useCallback((field: keyof CPInfo, value: string) => {
    setCpInfo(prev => ({ ...prev, [field]: value }));
  }, [setCpInfo]);
  
  // FMEA 선택 모달 열기
  const openFmeaSelectModal = useCallback(async (type: 'M' | 'F' | 'P' | 'ALL' = 'ALL') => {
    setFmeaSelectType(type);
    try {
      const res = await fetch('/api/fmea/projects');
      if (!res.ok) throw new Error('DB 로드 실패');
      
      const data = await res.json();
      const projects = data.projects || data || [];
      
      const filtered = projects
        .filter((p: any) => {
          if (type === 'ALL') return p.id !== cpId;
          const fmeaType = p.fmeaInfo?.fmeaType || p.id.match(/pfm\d{2}-([MFP])/i)?.[1] || 'P';
          return fmeaType.toLowerCase() === type.toLowerCase() && p.id !== cpId;
        })
        .map((p: any) => {
          let fmeaType = 'P';
          if (p.fmeaInfo?.fmeaType) {
            fmeaType = p.fmeaInfo.fmeaType.toLowerCase();
          } else {
            const match = p.id.match(/pfm\d{2}-([MFP])/i);
            if (match) fmeaType = match[1].toLowerCase();
          }
          return {
            id: p.id,
            subject: p.fmeaInfo?.subject || p.project?.productName || p.name || '제목 없음',
            type: fmeaType
          };
        });
      
      if (filtered.length === 0) {
        alert(type === 'ALL' ? '등록된 FMEA가 없습니다.' : `등록된 ${type} FMEA가 없습니다.`);
        return;
      }
      
      setAvailableFmeas(filtered);
      setFmeaSelectModalOpen(true);
    } catch (e) {
      console.error('FMEA 목록 로드 실패:', e);
      alert('FMEA 목록을 불러올 수 없습니다.');
    }
  }, [cpId, setAvailableFmeas, setFmeaSelectModalOpen, setFmeaSelectType]);
  
  // CP 선택 모달 열기 (기초정보용)
  const openCpSelectModal = useCallback(async (type: 'M' | 'F' | 'P') => {
    // ★ MASTER CP는 상위 CP가 자신이므로 모달을 열지 않고 자동 설정
    if (type === 'M') {
      if (cpId) {
        setSelectedBaseCp(cpId);
        alert('MASTER CP는 상위 CP가 자신으로 자동 설정되었습니다.');
      } else {
        alert('CP ID가 생성되지 않았습니다. 저장 후 다시 시도해주세요.');
      }
      return;
    }
    
    setCpSelectType(type);
    try {
      const stored = localStorage.getItem('cp-projects');
      if (!stored) {
        alert(`등록된 ${type === 'F' ? 'Family' : 'Part'} CP가 없습니다.`);
        return;
      }
      
      const projects = JSON.parse(stored);
      const filtered = projects
        .filter((p: any) => {
          const cpType = p.cpInfo?.cpType || p.id.match(/CP\d{2}-([MFP])/i)?.[1] || 'P';
          return cpType.toLowerCase() === type.toLowerCase() && p.id !== cpId;
        })
        .map((p: any) => ({
          id: p.id,
          subject: p.cpInfo?.subject || '제목 없음',
          type: type
        }));
      
      if (filtered.length === 0) {
        alert(`등록된 ${type === 'F' ? 'Family' : 'Part'} CP가 없습니다.`);
        return;
      }
      
      setAvailableCps(filtered);
      setCpSelectModalOpen(true);
    } catch (e) {
      console.error('CP 목록 로드 실패:', e);
      alert('CP 목록을 불러올 수 없습니다.');
    }
  }, [cpId, setSelectedBaseCp, setAvailableCps, setCpSelectModalOpen, setCpSelectType]);
  
  // 저장 (DB API 호출)
  const handleSave = useCallback(async () => {
    if (!cpInfo.subject.trim()) {
      alert('CP명을 입력해주세요.');
      return;
    }

    // ★ 저장 전 단일 역할 중복 체크 (Champion, Leader, PM, Moderator는 각각 1명만 허용)
    const SINGLE_ROLES = ['Champion', 'Leader', 'PM', 'Moderator'];
    for (const role of SINGLE_ROLES) {
      const membersWithRole = cftMembers.filter(m => m.role === role);
      if (membersWithRole.length > 1) {
        const memberNames = membersWithRole.map(m => m.name || '(이름 없음)').join(', ');
        alert(`${role}은 한 명만 등록할 수 있습니다.\n\n현재 ${role}: ${membersWithRole.length}명\n${memberNames}\n\n중복된 ${role}의 역할을 변경해주세요.`);
        console.error(`[CP 등록] ❌ 저장 실패: ${role} 중복`, membersWithRole);
        setSaveStatus('idle');
        return;
      }
    }
    
    // ★ 이름이 없는 멤버는 저장 불가 (즉시 중단)
    const membersWithoutName = cftMembers.filter(m => !m.name || m.name.trim() === '');
    if (membersWithoutName.length > 0) {
      const rolesWithoutName = membersWithoutName.map(m => m.role || '(역할 없음)').join(', ');
      alert(`이름이 없는 CFT 멤버가 있습니다.\n\n이름 없는 멤버: ${membersWithoutName.length}명\n역할: ${rolesWithoutName}\n\n이름을 입력하거나 해당 행을 삭제해주세요.`);
      console.error('[CP 등록] ❌ 저장 실패: 이름 없는 멤버 존재', membersWithoutName);
      setSaveStatus('idle');
      return;
    }

    // CP ID가 없으면 자동 생성
    let finalCpId = cpId;
    if (!finalCpId || finalCpId.trim() === '') {
      finalCpId = generateCPId(cpInfo.cpType);
      setCpId(finalCpId);
    }

    setSaveStatus('saving');
    
    try {
      // 1. DB에 저장
      // ★ parentApqpNo 정규화 (문자열로 변환, 빈 값은 null)
      console.log('🔍 [CP 저장] selectedParentApqp 원본 값:', selectedParentApqp, '타입:', typeof selectedParentApqp);
      const normalizedParentApqpNo = selectedParentApqp && selectedParentApqp.trim() !== '' 
        ? selectedParentApqp.trim() 
        : null;
      console.log('🔍 [CP 저장] normalizedParentApqpNo:', normalizedParentApqpNo);
      
      // ★ 이름이 있는 멤버만 저장 (이름 없는 멤버는 제외)
      const membersToSave = cftMembers.filter((m: any) => m.name && m.name.trim() !== '');
      
      if (membersToSave.length === 0) {
        alert('이름이 있는 CFT 멤버가 최소 1명 이상 필요합니다.');
        console.error('[CP 등록] ❌ 저장 실패: 이름 있는 멤버 없음');
        setSaveStatus('idle');
        return;
      }
      
      const saveData = {
        cpNo: finalCpId,
        cpInfo,
        cftMembers: membersToSave, // ★ 이름 있는 멤버만 저장
        parentApqpNo: normalizedParentApqpNo,  // ★ 상위 APQP (정규화된 값)
        parentFmeaId: selectedParentFmea,  // 상위 FMEA
        baseCpId: selectedBaseCp,          // 상위 CP
      };
      
      console.log('💾 CP 저장 데이터:', {
        cpNo: finalCpId,
        parentApqpNo: normalizedParentApqpNo,
        parentApqpNo_raw: selectedParentApqp,
        parentFmeaId: selectedParentFmea,
        baseCpId: selectedBaseCp,
        engineeringLocation: cpInfo.engineeringLocation,
      });
      
      const response = await fetch('/api/control-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'DB 저장 실패');
      }

      console.log('✅ CP DB 저장 완료:', result.cpNo);
      console.log('💾 저장된 parentApqpNo:', normalizedParentApqpNo);

      // 2. localStorage에도 백업 (오프라인 지원)
      const data = {
        id: finalCpId,
        cpInfo,
        cftMembers,
        parentApqpNo: selectedParentApqp || null,  // ★ 문자열 (apqpNo)로 저장
        parentFmeaId: selectedParentFmea,
        baseCpId: selectedBaseCp,
        createdAt: new Date().toISOString(),
        dbSynced: true,
      };
      
      let projects = [];
      const stored = localStorage.getItem('cp-projects');
      if (stored) projects = JSON.parse(stored);
      projects = projects.filter((p: any) => p.id !== finalCpId);
      projects.unshift(data);
      localStorage.setItem('cp-projects', JSON.stringify(projects));
      
      // ★ 마지막 작업 CP ID 저장 (다음 방문 시 자동 로드용)
      localStorage.setItem('cp-last-edited', finalCpId);
      
      // ★ 저장 후 DB에서 다시 로드하여 parentApqpNo 확인 (동기화 보장)
      try {
        const reloadResponse = await fetch(`/api/control-plan?cpNo=${finalCpId.toLowerCase()}`);
        const reloadResult = await reloadResponse.json();
        if (reloadResult.success && reloadResult.data) {
          const reloadedCp = reloadResult.data;
          console.log('🔄 저장 후 재로드 - parentApqpNo:', reloadedCp.parentApqpNo);
          // parentApqpNo가 저장되었는지 확인
          if (reloadedCp.parentApqpNo !== normalizedParentApqpNo) {
            console.warn('⚠️ parentApqpNo 불일치:', {
              저장한값: normalizedParentApqpNo,
              DB값: reloadedCp.parentApqpNo,
            });
          }
        }
      } catch (reloadError) {
        console.warn('⚠️ 저장 후 재로드 실패 (무시):', reloadError);
      }
      
      setSaveStatus('saved');
      setShowMissingFields(true);
      
      // ★ 저장 후 URL을 수정 모드로 업데이트 (새로고침 시 데이터 유지)
      if (!isEditMode) {
        router.replace(`/control-plan/register?id=${finalCpId}`);
      }
      
      // ★ 저장 후 DB에서 다시 로드하여 parentApqpNo 확인 (동기화 보장)
      // 주의: 이 로직은 검증용이며, 실제 상태 업데이트는 useEffect에서 처리됨
      try {
        const reloadResponse = await fetch(`/api/control-plan?cpNo=${finalCpId.toLowerCase()}`);
        const reloadResult = await reloadResponse.json();
        if (reloadResult.success && reloadResult.data) {
          const reloadedCp = reloadResult.data;
          console.log('🔄 저장 후 재로드 - parentApqpNo:', reloadedCp.parentApqpNo);
          // parentApqpNo가 저장되었는지 확인
          if (reloadedCp.parentApqpNo !== normalizedParentApqpNo) {
            console.error('❌ parentApqpNo 저장 불일치:', {
              저장한값: normalizedParentApqpNo,
              DB값: reloadedCp.parentApqpNo,
            });
          } else {
            console.log('✅ parentApqpNo 저장 확인:', normalizedParentApqpNo);
          }
        }
      } catch (reloadError) {
        console.warn('⚠️ 저장 후 재로드 실패 (무시):', reloadError);
      }
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error('저장 실패:', error);
      
      // DB 실패 시 localStorage만 저장 (폴백)
      try {
        const data = {
          id: finalCpId,
          cpInfo,
          cftMembers,
          parentApqpNo: selectedParentApqp || null,  // ★ 상위 APQP 추가
          parentFmeaId: selectedParentFmea,
          baseCpId: selectedBaseCp,
          createdAt: new Date().toISOString(),
          dbSynced: false,
        };
        
        let projects = [];
        const stored = localStorage.getItem('cp-projects');
        if (stored) projects = JSON.parse(stored);
        projects = projects.filter((p: any) => p.id !== finalCpId);
        projects.unshift(data);
        localStorage.setItem('cp-projects', JSON.stringify(projects));
        
        setSaveStatus('saved');
        alert('DB 연결 실패. 로컬에 임시 저장되었습니다.');
      } catch (localError) {
        alert('저장에 실패했습니다: ' + error.message);
        setSaveStatus('idle');
      }
    }
  }, [cpInfo, cpId, cftMembers, selectedParentApqp, selectedParentFmea, selectedBaseCp, setSaveStatus, setShowMissingFields, isEditMode, router]); // ★ selectedParentApqp는 이미 문자열로 전달됨 (selectedParentApqp?.apqpNo || null)
  
  return {
    handleCpTypeChange,
    updateField,
    openFmeaSelectModal,
    openCpSelectModal,
    handleSave,
  };
}


