/**
 * @file useUserSelectModal.ts
 * @description 사용자 선택 모달 공통 훅
 * @module hooks
 * 
 * 사용처: PFMEA, DFMEA, CP, PFD 등 모든 앱에서 공통 사용
 */

'use client';

import { useState, useCallback } from 'react';
import { UserInfo } from '@/types/user';

export type UserSelectTarget = 'responsible' | 'cft' | 'review' | 'approval' | 'custom';

interface UseUserSelectModalOptions {
  onSelect?: (user: UserInfo, target: UserSelectTarget, index?: number | null) => void;
}

interface UseUserSelectModalReturn {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 선택 대상 (responsible, cft, review, approval, custom) */
  target: UserSelectTarget;
  /** 선택된 인덱스 (CFT 멤버 등) */
  selectedIndex: number | null;
  /** 모달 열기 */
  open: (target: UserSelectTarget, index?: number | null) => void;
  /** 모달 닫기 */
  close: () => void;
  /** 사용자 선택 핸들러 */
  handleSelect: (user: UserInfo) => void;
}

/**
 * 사용자 선택 모달 공통 훅
 * 
 * @example
 * ```tsx
 * const userModal = useUserSelectModal({
 *   onSelect: (user, target, index) => {
 *     if (target === 'responsible') {
 *       setResponsibleName(user.name);
 *     } else if (target === 'cft' && index !== null) {
 *       updateCftMember(index, user);
 *     }
 *   }
 * });
 * 
 * // 사용
 * <button onClick={() => userModal.open('responsible')}>담당자 선택</button>
 * <button onClick={() => userModal.open('cft', 0)}>CFT 멤버 선택</button>
 * 
 * <UserSelectModal
 *   isOpen={userModal.isOpen}
 *   onClose={userModal.close}
 *   onSelect={userModal.handleSelect}
 * />
 * ```
 */
export function useUserSelectModal(options?: UseUserSelectModalOptions): UseUserSelectModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<UserSelectTarget>('responsible');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const open = useCallback((newTarget: UserSelectTarget, index?: number | null) => {
    setTarget(newTarget);
    setSelectedIndex(index ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(null);
  }, []);

  const handleSelect = useCallback((user: UserInfo) => {
    options?.onSelect?.(user, target, selectedIndex);
    close();
  }, [options, target, selectedIndex, close]);

  return {
    isOpen,
    target,
    selectedIndex,
    open,
    close,
    handleSelect,
  };
}

export default useUserSelectModal;
