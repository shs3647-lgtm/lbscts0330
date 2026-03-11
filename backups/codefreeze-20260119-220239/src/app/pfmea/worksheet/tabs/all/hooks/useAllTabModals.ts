// @ts-nocheck
/**
 * @file useAllTabModals.ts
 * @description AllTab 모달 상태 관리 훅
 */

import { useState } from 'react';
import { WorksheetState } from '../../../constants';

/** SOD 모달 상태 타입 */
export interface SODModalState {
  isOpen: boolean;
  category: 'S' | 'O' | 'D';
  currentValue?: number;
  scope?: 'Your Plant' | 'Ship to Plant' | 'User';
  targetType: 'risk' | 'opt' | 'failure';  // ★ 2026-01-11: failure 추가
  rowIndex: number;
  feIndex?: number;
  feText?: string;
  feId?: string;   // ★ 2026-01-11: 개별 FE ID 추가
  fmId?: string;   // ★ 2026-01-11: 발생도/검출도 키용
  fcId?: string;   // ★ 2026-01-11: 발생도/검출도 키용
}

/** 컨트롤 모달 상태 타입 */
export interface ControlModalState {
  isOpen: boolean;
  type: 'prevention' | 'detection' | 'specialChar' | 'prevention-opt' | 'detection-opt';
  rowIndex: number;
  fmId?: string;    // ★ 고유 키용
  fcId?: string;    // ★ 고유 키용
  fcText?: string;
}

/** 초기 SOD 모달 상태 */
const initialSodModal: SODModalState = {
  isOpen: false,
  category: 'S',
  targetType: 'risk',
  rowIndex: -1
};

/** 초기 컨트롤 모달 상태 */
const initialControlModal: ControlModalState = {
  isOpen: false,
  type: 'prevention',
  rowIndex: -1
};

/** LLD 모달 상태 타입 */
export interface LLDModalState {
  isOpen: boolean;
  rowIndex: number;
  fmId?: string;
  fcId?: string;
  currentValue?: string;
}

/** 초기 LLD 모달 상태 */
const initialLldModal: LLDModalState = {
  isOpen: false,
  rowIndex: -1
};

/** 사용자 선택 모달 상태 타입 */
export interface UserModalState {
  isOpen: boolean;
  rowIndex: number;
  fmId?: string;
  fcId?: string;
  currentValue?: string;
}

/** 초기 사용자 모달 상태 */
const initialUserModal: UserModalState = {
  isOpen: false,
  rowIndex: -1
};

/**
 * AllTab 모달 관리 훅
 */
export function useAllTabModals(
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>,
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>  // ★★★ 2026-01-12: DB 저장 트리거 추가
) {
  const [sodModal, setSodModal] = useState<SODModalState>(initialSodModal);
  const [controlModal, setControlModal] = useState<ControlModalState>(initialControlModal);
  const [lldModal, setLldModal] = useState<LLDModalState>(initialLldModal);
  const [userModal, setUserModal] = useState<UserModalState>(initialUserModal);

  /** SOD 셀 클릭 핸들러 */
  const handleSODClick = (
    category: 'S' | 'O' | 'D',
    targetType: 'risk' | 'opt' | 'failure',  // ★ 2026-01-11: failure 추가
    rowIndex: number,
    currentValue?: number,
    scope?: string,
    feId?: string,    // ★ 2026-01-11: 개별 FE ID
    feText?: string,  // ★ FE 텍스트 (표시용)
    fmId?: string,    // ★ 2026-01-11: 발생도/검출도 키용
    fcId?: string     // ★ 2026-01-11: 발생도/검출도 키용
  ) => {
    console.log('🔥 SOD 클릭:', { category, targetType, rowIndex, currentValue, scope, feId, feText, fmId, fcId });
    setSodModal({
      isOpen: true,
      category,
      targetType,
      rowIndex,
      currentValue,
      scope: scope as 'Your Plant' | 'Ship to Plant' | 'User' | undefined,
      feId,    // ★ 개별 FE ID 전달
      feText,
      fmId,    // ★ 발생도/검출도 키용
      fcId     // ★ 발생도/검출도 키용
    });
  };

  /** SOD 선택 핸들러 */
  const handleSODSelect = (rating: number, item: any) => {
    const categoryName = sodModal.category === 'S' ? '심각도' : sodModal.category === 'O' ? '발생도' : '검출도';
    console.log('🔥 SOD 선택 시작:', {
      category: sodModal.category,
      categoryName,
      targetType: sodModal.targetType,
      rowIndex: sodModal.rowIndex,
      feText: sodModal.feText,
      scope: sodModal.scope,
      rating,
      item
    });
    
    if (!setState) {
      console.error('❌ setState가 없어서 저장할 수 없습니다.');
      alert('저장 실패: setState가 없습니다.');
      setSodModal(prev => ({ ...prev, isOpen: false }));
      return;
    }
    
    // ★★★ 2026-01-11: 고장분석 심각도 - 개별 FE 또는 전체에 적용 ★★★
    if (sodModal.targetType === 'failure' && sodModal.category === 'S') {
      setState((prevState: WorksheetState) => {
        const failureScopes = prevState.l1?.failureScopes || [];
        const failureLinks = (prevState as any).failureLinks || [];
        
        // ★ feId가 있으면 해당 FE만 업데이트, 없으면 전체 업데이트
        const targetFeId = sodModal.feId;
        const targetFeText = sodModal.feText;
        
        let updatedScopes;
        let updatedLinks;
        
        if (targetFeId || targetFeText) {
          // ★ 개별 FE에만 점수 부여 (고장영향 셀 클릭 시)
          console.log(`🎯 개별 FE 업데이트: feId=${targetFeId}, feText=${targetFeText}`);
          
          updatedScopes = failureScopes.map((scope: any) => {
            // feId로 매칭 또는 effect(feText)로 매칭
            if ((targetFeId && scope.id === targetFeId) || 
                (targetFeText && scope.effect === targetFeText)) {
              console.log(`✅ FE 심각도 ${rating} 적용: ${scope.effect}`);
              return { ...scope, severity: rating };
            }
            return scope;
          });
          
          updatedLinks = failureLinks.map((link: any) => {
            if ((targetFeId && link.feId === targetFeId) ||
                (targetFeText && link.feText === targetFeText)) {
              return { ...link, feSeverity: rating, severity: rating };
            }
            return link;
          });
        } else {
          // ★ 전체 FE에 점수 부여 (심각도 컬럼 클릭 시)
          console.log('🎯 전체 FE 업데이트');
          
          updatedScopes = failureScopes.map((scope: any) => {
            return { ...scope, severity: rating };
          });
          
          updatedLinks = failureLinks.map((link: any) => {
            return { ...link, feSeverity: rating, severity: rating };
          });
        }
        
        return {
          ...prevState,
          l1: {
            ...prevState.l1,
            failureScopes: updatedScopes
          },
          failureLinks: updatedLinks
        };
      });
      
      // ★★★ 2026-01-12: DB 저장 트리거 ★★★
      if (setDirty) {
        setDirty(true);
        console.log('🔥 DB 저장 트리거 (setDirty=true) - 심각도');
      }
      
      setSodModal(prev => ({ ...prev, isOpen: false }));
      const targetInfo = sodModal.feText ? `"${sodModal.feText}"` : '전체 FE';
      console.log(`✅ [failure] ${categoryName} ${rating}점 저장 완료 (${targetInfo})`);
      return;
    }
    
    // ★ 리스크분석/최적화 - riskData에 저장
    setState((prevState: WorksheetState) => {
      console.log('📦 [handleSODSelect] 이전 riskData 키 개수:', Object.keys(prevState.riskData || {}).length);
      
      let riskKey: string;
      let uniqueKey = '';
      
      // ★★★ 2026-01-12: 키 생성 로직 디버깅 ★★★
      console.log('🔑 [키 생성] 입력값:', {
        category: sodModal.category,
        targetType: sodModal.targetType,
        fmId: sodModal.fmId,
        fcId: sodModal.fcId,
        rowIndex: sodModal.rowIndex,
        feText: sodModal.feText,
      });
      
      if (sodModal.category === 'S' && sodModal.feText) {
        // 심각도 (개별 FE 텍스트 기준)
        riskKey = `S-fe-${sodModal.feText}`;
      } else if (sodModal.fmId && sodModal.fcId) {
        // ★★★ 2026-01-11: 최적화 단계 포함 - fmId-fcId 조합 키 사용 ★★★
        uniqueKey = `${sodModal.fmId}-${sodModal.fcId}`;
        riskKey = `${sodModal.targetType}-${uniqueKey}-${sodModal.category}`;
      } else {
        // 폴백: rowIndex 기반
        riskKey = `${sodModal.targetType}-${sodModal.rowIndex}-${sodModal.category}`;
        console.log('⚠️ [키 생성] fmId/fcId 없음 → 레거시 키 사용:', riskKey);
      }
      
      console.log('🔑 [키 생성] 최종 키:', riskKey, '값:', rating);
      
      let updatedRiskData = {
        ...(prevState.riskData || {}),
        [riskKey]: rating
      };
      
      console.log(`✅ ${categoryName} 저장: riskData[${riskKey}] = ${rating}`);
      
      // ★★★ 2026-01-12: 발생도 입력 시 동일 예방관리에 동일 발생도 자동 적용 ★★★
      if (sodModal.category === 'O' && sodModal.targetType === 'risk' && uniqueKey) {
        const preventionKey = `prevention-${uniqueKey}`;
        const currentPreventionValue = prevState.riskData?.[preventionKey] || '';
        
        if (currentPreventionValue) {
          console.log(`🔗 [발생도 자동연결] 현재 예방관리: "${currentPreventionValue}"`);
          
          // failureLinks에서 동일 예방관리를 가진 다른 행 찾기
          const failureLinks = (prevState as any).failureLinks || [];
          let autoLinkedCount = 0;
          
          failureLinks.forEach((link: any) => {
            const linkUniqueKey = `${link.fmId}-${link.fcId}`;
            if (linkUniqueKey === uniqueKey) return; // 현재 행은 스킵
            
            const linkPreventionKey = `prevention-${linkUniqueKey}`;
            const linkPreventionValue = prevState.riskData?.[linkPreventionKey] || '';
            
            // 예방관리가 일치하면 발생도 자동 적용
            if (linkPreventionValue === currentPreventionValue) {
              const linkOccurrenceKey = `risk-${linkUniqueKey}-O`;
              updatedRiskData[linkOccurrenceKey] = rating;
              autoLinkedCount++;
              console.log(`  → 자동적용: ${linkOccurrenceKey} = ${rating}`);
            }
          });
          
          if (autoLinkedCount > 0) {
            console.log(`✅ [발생도 자동연결] 총 ${autoLinkedCount}개 행에 동일 발생도(${rating}) 적용`);
          }
        }
      }
      
      // ★★★ 2026-01-12: 검출도 입력 시 동일 고장형태(FM) 내 동일 검출관리에 동일 검출도 자동 적용 ★★★
      if (sodModal.category === 'D' && sodModal.targetType === 'risk' && uniqueKey && sodModal.fmId) {
        const detectionKey = `detection-${uniqueKey}`;
        const currentDetectionValue = prevState.riskData?.[detectionKey] || '';
        
        if (currentDetectionValue) {
          console.log(`🔗 [검출도 자동연결] 동일 고장형태(FM) 내 현재 검출관리: "${currentDetectionValue}"`);
          
          // ★★★ 동일한 고장형태(FM) 내에서만 검출관리를 가진 다른 행 찾기 ★★★
          const failureLinks = (prevState as any).failureLinks || [];
          let autoLinkedCount = 0;
          
          failureLinks.forEach((link: any) => {
            // 동일한 고장형태(FM) 내에서만 검색
            if (link.fmId !== sodModal.fmId) return;
            
            const linkUniqueKey = `${link.fmId}-${link.fcId}`;
            if (linkUniqueKey === uniqueKey) return; // 현재 행은 스킵
            
            const linkDetectionKey = `detection-${linkUniqueKey}`;
            const linkDetectionValue = prevState.riskData?.[linkDetectionKey] || '';
            
            // 검출관리가 일치하면 검출도 자동 적용
            if (linkDetectionValue === currentDetectionValue) {
              const linkDetectionOKey = `risk-${linkUniqueKey}-D`;
              updatedRiskData[linkDetectionOKey] = rating;
              autoLinkedCount++;
              console.log(`  → 자동적용 (동일 FM): ${linkDetectionOKey} = ${rating}`);
            }
          });
          
          if (autoLinkedCount > 0) {
            console.log(`✅ [검출도 자동연결] 동일 고장형태(FM) 내 ${autoLinkedCount}개 행에 동일 검출도(${rating}) 적용`);
          }
        }
      }
      
      console.log('📦 업데이트된 riskData:', updatedRiskData);
      
      const newState = {
        ...prevState,
        riskData: updatedRiskData
      };
      
      console.log('✅ 새 상태 반환:', newState.riskData);
      return newState;
    });
    
    // ★★★ 2026-01-12: DB 저장 트리거 ★★★
    if (setDirty) {
      setDirty(true);
      console.log('🔥 DB 저장 트리거 (setDirty=true)');
    }
    
    setSodModal(prev => ({ ...prev, isOpen: false }));
    console.log(`✅ ${categoryName} ${rating}점 저장 완료`);
  };

  /** 습득교훈 텍스트 입력 핸들러 (레거시) */
  const handleLessonInput = (rowIndex: number, value: string) => {
    if (setState) {
      setState((prev: WorksheetState) => ({
        ...prev,
        riskData: {
          ...(prev.riskData || {}),
          [`lesson-${rowIndex}`]: value
        }
      }));
    }
  };

  /** ★ LLD 모달 열기 (습득교훈 셀 클릭 시) */
  const openLldModal = (rowIndex: number, currentValue?: string, fmId?: string, fcId?: string) => {
    console.log('🔥 LLD 모달 열기:', { rowIndex, currentValue, fmId, fcId });
    setLldModal({ isOpen: true, rowIndex, currentValue, fmId, fcId });
  };

  /** ★ LLD 모달 닫기 */
  const closeLldModal = () => {
    setLldModal(prev => ({ ...prev, isOpen: false }));
  };

  /** ★ LLD 선택 완료 핸들러 */
  const handleLldSelect = async (lldNo: string, fmeaId?: string) => {
    if (!setState || lldModal.rowIndex < 0) return;
    
    // ★ fmId-fcId 기반 키 또는 rowIndex 기반 키
    const key = (lldModal.fmId && lldModal.fcId) 
      ? `lesson-${lldModal.fmId}-${lldModal.fcId}` 
      : `lesson-${lldModal.rowIndex}`;
    
    console.log('✅ LLD 선택:', { lldNo, key, fmeaId });
    
    // ★ FMEA 워크시트에 LLD_No 저장
    setState((prev: WorksheetState) => ({
      ...prev,
      riskData: {
        ...(prev.riskData || {}),
        [key]: lldNo
      }
    }));
    
    if (setDirty) {
      setDirty(true);
      console.log('🔥 DB 저장 트리거 (setDirty=true)');
    }
    
    // ★★★ 2026-01-12: LLD DB에 fmeaId와 appliedDate 업데이트 ★★★
    if (fmeaId && lldNo) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const response = await fetch('/api/lessons-learned/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lldNo,
            fmeaId,
            appliedDate: today
          })
        });
        const result = await response.json();
        if (result.success) {
          console.log('✅ LLD 적용결과 업데이트 완료:', { lldNo, fmeaId, appliedDate: today });
        }
      } catch (error) {
        console.error('LLD 적용결과 업데이트 오류:', error);
      }
    }
    
    closeLldModal();
  };

  /** 컨트롤 모달 열기 */
  const openControlModal = (type: 'prevention' | 'detection' | 'specialChar' | 'prevention-opt' | 'detection-opt', rowIndex: number, fcText?: string) => {
    setControlModal({ isOpen: true, type, rowIndex, fcText });
  };

  /** 컨트롤 모달 닫기 */
  const closeControlModal = () => {
    setControlModal(prev => ({ ...prev, isOpen: false }));
  };

  /** SOD 모달 닫기 */
  const closeSodModal = () => {
    setSodModal(prev => ({ ...prev, isOpen: false }));
  };

  /** 사용자 모달 열기 */
  const openUserModal = (rowIndex: number, currentValue?: string, fmId?: string, fcId?: string) => {
    console.log('👤 사용자 모달 열기:', { rowIndex, currentValue, fmId, fcId });
    setUserModal({ isOpen: true, rowIndex, currentValue, fmId, fcId });
  };

  /** 사용자 모달 닫기 */
  const closeUserModal = () => {
    setUserModal(prev => ({ ...prev, isOpen: false }));
  };

  /** 사용자 선택 처리 */
  const handleUserSelect = (user: { id: string; name: string; department?: string; position?: string }) => {
    if (!setState || userModal.rowIndex < 0) return;

    // fmId-fcId 기반 키 생성
    const key = (userModal.fmId && userModal.fcId)
      ? `person-opt-${userModal.fmId}-${userModal.fcId}`
      : `person-opt-${userModal.rowIndex}`;

    console.log('👤 사용자 선택:', { key, user });

    setState((prev: WorksheetState) => ({
      ...prev,
      riskData: {
        ...(prev.riskData || {}),
        [key]: user.name  // 사용자 이름만 저장
      }
    }));

    if (setDirty) setDirty(true);
    closeUserModal();
  };

  return {
    sodModal,
    setSodModal,
    controlModal,
    setControlModal,
    lldModal,
    setLldModal,
    userModal,
    setUserModal,
    handleSODClick,
    handleSODSelect,
    handleLessonInput,
    openControlModal,
    closeControlModal,
    closeSodModal,
    openLldModal,
    closeLldModal,
    handleLldSelect,
    openUserModal,
    closeUserModal,
    handleUserSelect
  };
}


