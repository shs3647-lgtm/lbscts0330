/**
 * @file useFunctionL2Modal.ts
 * @description FunctionL2Tab 모달 상태 관리 훅
 */

import { useState } from 'react';

/** 모달 상태 타입 */
export interface FunctionL2ModalState {
  type: string;
  procId: string;
  funcId?: string;
  title: string;
  itemCode: string;
  processName?: string;
}

/** 특별특성 모달 상태 타입 */
export interface SpecialCharL2ModalState {
  procId: string;
  funcId: string;
  charId: string;
  currentValue?: string;
}

/**
 * FunctionL2Tab 모달 관리 훅
 */
export function useFunctionL2Modal() {
  const [modal, setModal] = useState<FunctionL2ModalState | null>(null);
  const [specialCharModal, setSpecialCharModal] = useState<SpecialCharL2ModalState | null>(null);

  /** 모달 열기 */
  const openModal = (state: FunctionL2ModalState) => {
    setModal(state);
  };

  /** 모달 닫기 */
  const closeModal = () => {
    setModal(null);
  };

  /** 특별특성 모달 열기 */
  const openSpecialCharModal = (state: SpecialCharL2ModalState) => {
    setSpecialCharModal(state);
  };

  /** 특별특성 모달 닫기 */
  const closeSpecialCharModal = () => {
    setSpecialCharModal(null);
  };

  return {
    modal,
    setModal,
    specialCharModal,
    setSpecialCharModal,
    openModal,
    closeModal,
    openSpecialCharModal,
    closeSpecialCharModal,
  };
}



