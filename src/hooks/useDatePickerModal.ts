/**
 * @file useDatePickerModal.ts
 * @description 날짜 선택 모달 공통 훅
 * @module hooks
 * 
 * 사용처: PFMEA, DFMEA, CP, PFD 등 모든 앱에서 공통 사용
 */

'use client';

import { useState, useCallback } from 'react';

export type DateFieldType = 'start' | 'revision' | 'end' | 'custom';

interface UseDatePickerModalOptions {
  onSelect?: (date: string, fieldType: DateFieldType) => void;
}

interface UseDatePickerModalReturn {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 현재 선택 중인 필드 타입 */
  fieldType: DateFieldType;
  /** 모달 열기 */
  open: (fieldType: DateFieldType) => void;
  /** 모달 닫기 */
  close: () => void;
  /** 날짜 선택 핸들러 */
  handleSelect: (date: string) => void;
}

/**
 * 날짜 선택 모달 공통 훅
 * 
 * @example
 * ```tsx
 * const datePicker = useDatePickerModal({
 *   onSelect: (date, fieldType) => {
 *     if (fieldType === 'start') {
 *       setStartDate(date);
 *     } else if (fieldType === 'revision') {
 *       setRevisionDate(date);
 *     }
 *   }
 * });
 * 
 * // 사용
 * <button onClick={() => datePicker.open('start')}>시작일 선택</button>
 * <button onClick={() => datePicker.open('revision')}>개정일 선택</button>
 * 
 * <DatePickerModal
 *   isOpen={datePicker.isOpen}
 *   onClose={datePicker.close}
 *   onSelect={datePicker.handleSelect}
 * />
 * ```
 */
export function useDatePickerModal(options?: UseDatePickerModalOptions): UseDatePickerModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [fieldType, setFieldType] = useState<DateFieldType>('start');

  const open = useCallback((newFieldType: DateFieldType) => {
    setFieldType(newFieldType);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback((date: string) => {
    options?.onSelect?.(date, fieldType);
    close();
  }, [options, fieldType, close]);

  return {
    isOpen,
    fieldType,
    open,
    close,
    handleSelect,
  };
}

export default useDatePickerModal;
