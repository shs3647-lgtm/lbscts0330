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
  targetType: 'risk' | 'opt';
  rowIndex: number;
  feIndex?: number;
  feText?: string;
}

/** 컨트롤 모달 상태 타입 */
export interface ControlModalState {
  isOpen: boolean;
  type: 'prevention' | 'detection' | 'specialChar';
  rowIndex: number;
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

/**
 * AllTab 모달 관리 훅
 */
export function useAllTabModals(setState?: React.Dispatch<React.SetStateAction<WorksheetState>>) {
  const [sodModal, setSodModal] = useState<SODModalState>(initialSodModal);
  const [controlModal, setControlModal] = useState<ControlModalState>(initialControlModal);

  /** SOD 셀 클릭 핸들러 */
  const handleSODClick = (
    category: 'S' | 'O' | 'D',
    targetType: 'risk' | 'opt',
    rowIndex: number,
    currentValue?: number,
    scope?: string,
    feIndex?: number,
    feText?: string
  ) => {
    console.log('🔥 SOD 클릭:', { category, targetType, rowIndex, currentValue, scope, feText });
    setSodModal({
      isOpen: true,
      category,
      targetType,
      rowIndex,
      currentValue,
      scope: scope as 'Your Plant' | 'Ship to Plant' | 'User' | undefined,
      feIndex,
      feText
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
      rating,
      item
    });
    
    if (!setState) {
      console.error('❌ setState가 없어서 저장할 수 없습니다.');
      alert('저장 실패: setState가 없습니다.');
      setSodModal(prev => ({ ...prev, isOpen: false }));
      return;
    }
    
    setState((prevState: WorksheetState) => {
      console.log('📦 이전 상태:', prevState.riskData);
      
      let riskKey: string;
      if (sodModal.category === 'S' && sodModal.feText) {
        riskKey = `S-fe-${sodModal.feText}`;
      } else {
        riskKey = `${sodModal.targetType}-${sodModal.rowIndex}-${sodModal.category}`;
      }
      
      const updatedRiskData = {
        ...(prevState.riskData || {}),
        [riskKey]: rating
      };
      
      console.log(`✅ ${categoryName} 저장: riskData[${riskKey}] = ${rating}`);
      console.log('📦 업데이트된 riskData:', updatedRiskData);
      
      const newState = {
        ...prevState,
        riskData: updatedRiskData
      };
      
      console.log('✅ 새 상태 반환:', newState.riskData);
      return newState;
    });
    
    setSodModal(prev => ({ ...prev, isOpen: false }));
    console.log(`✅ ${categoryName} ${rating}점 저장 완료`);
  };

  /** 습득교훈 텍스트 입력 핸들러 */
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

  /** 컨트롤 모달 열기 */
  const openControlModal = (type: 'prevention' | 'detection' | 'specialChar', rowIndex: number, fcText?: string) => {
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

  return {
    sodModal,
    setSodModal,
    controlModal,
    setControlModal,
    handleSODClick,
    handleSODSelect,
    handleLessonInput,
    openControlModal,
    closeControlModal,
    closeSodModal
  };
}



