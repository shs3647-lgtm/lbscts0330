/**
 * @file fmea-core/hooks/useUID.ts
 * @description 고유 ID 생성 유틸리티
 */

import { useCallback } from 'react';

let counter = 0;

/** 고유 ID 생성 함수 */
export const uid = (): string => {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
};

/** 고유 ID 생성 훅 */
export const useUID = (): (() => string) => {
  return useCallback(() => uid(), []);
};



