/**
 * @file useFunctionL3Modal.ts
 * @description FunctionL3Tab 모달 상태 관리 훅
 */

import { useState } from 'react';

/** 모달 상태 타입 */
export interface FunctionL3ModalState {
  type: string;
  procId: string;
  l3Id: string;
  funcId?: string;
  title: string;
  itemCode: string;
  workElementName?: string;
}

/** 특별특성 모달 상태 타입 */
export interface SpecialCharModalState {
  procId: string;
  l3Id: string;
  funcId: string;
  charId: string;
  currentValue?: string;
}

/**
 * FunctionL3Tab 모달 관리 훅
 */
export function useFunctionL3Modal() {
  const [modal, setModal] = useState<FunctionL3ModalState | null>(null);
  const [specialCharModal, setSpecialCharModal] = useState<SpecialCharModalState | null>(null);

  /** 모달 열기 */
  const openModal = (state: FunctionL3ModalState) => {
    setModal(state);
  };

  /** 모달 닫기 */
  const closeModal = () => {
    setModal(null);
  };

  /** 특별특성 모달 열기 */
  const openSpecialCharModal = (state: SpecialCharModalState) => {
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



