/**
 * @file useBizInfoSelectModal.ts
 * @description 고객/사업자 정보 선택 모달 공통 훅
 * @module hooks
 * 
 * 사용처: PFMEA, DFMEA, CP, PFD 등 모든 앱에서 공통 사용
 */

'use client';

import { useState, useCallback } from 'react';
import { BizInfoProject } from '@/types/bizinfo';

interface UseBizInfoSelectModalOptions {
  onSelect?: (bizInfo: BizInfoProject) => void;
}

interface UseBizInfoSelectModalReturn {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 열기 */
  open: () => void;
  /** 모달 닫기 */
  close: () => void;
  /** 선택 핸들러 */
  handleSelect: (bizInfo: BizInfoProject) => void;
}

/**
 * 고객/사업자 정보 선택 모달 공통 훅
 * 
 * @example
 * ```tsx
 * const bizInfoModal = useBizInfoSelectModal({
 *   onSelect: (bizInfo) => {
 *     setCustomerName(bizInfo.customerName);
 *     setModelYear(bizInfo.modelYear);
 *   }
 * });
 * 
 * // 사용
 * <button onClick={bizInfoModal.open}>고객 검색</button>
 * 
 * <BizInfoSelectModal
 *   isOpen={bizInfoModal.isOpen}
 *   onClose={bizInfoModal.close}
 *   onSelect={bizInfoModal.handleSelect}
 * />
 * ```
 */
export function useBizInfoSelectModal(options?: UseBizInfoSelectModalOptions): UseBizInfoSelectModalReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback((bizInfo: BizInfoProject) => {
    options?.onSelect?.(bizInfo);
    close();
  }, [options, close]);

  return {
    isOpen,
    open,
    close,
    handleSelect,
  };
}

export default useBizInfoSelectModal;
