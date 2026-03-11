/**
 * @file useFailureL1Modal.ts
 * @description FailureL1Tab 모달 상태 관리 훅
 */

import { useState } from 'react';

/** SOD 모달 상태 타입 */
export interface SODL1ModalState {
  isOpen: boolean;
  feId: string;
  currentValue?: number;
  scope?: string;
}

/** 고장영향 모달 상태 타입 */
export interface FailureEffectModalState {
  isOpen: boolean;
  typeId: string;
  funcId: string;
  reqId: string;
  title: string;
}

/**
 * FailureL1Tab 모달 관리 훅
 */
export function useFailureL1Modal() {
  const [sodModal, setSodModal] = useState<SODL1ModalState>({
    isOpen: false,
    feId: '',
  });
  
  const [feModal, setFeModal] = useState<FailureEffectModalState | null>(null);

  /** SOD 모달 열기 */
  const openSodModal = (feId: string, currentValue?: number, scope?: string) => {
    setSodModal({
      isOpen: true,
      feId,
      currentValue,
      scope,
    });
  };

  /** SOD 모달 닫기 */
  const closeSodModal = () => {
    setSodModal(prev => ({ ...prev, isOpen: false }));
  };

  /** 고장영향 모달 열기 */
  const openFeModal = (state: FailureEffectModalState) => {
    setFeModal(state);
  };

  /** 고장영향 모달 닫기 */
  const closeFeModal = () => {
    setFeModal(null);
  };

  return {
    sodModal,
    setSodModal,
    feModal,
    setFeModal,
    openSodModal,
    closeSodModal,
    openFeModal,
    closeFeModal,
  };
}



