/**
 * @file fmea-core/hooks/useUID.ts
 * @description 고유 ID 생성 유틸리티 — P7+: canonical source 위임
 */

import { useCallback } from 'react';
import { uid } from '@/app/(fmea-core)/pfmea/worksheet/schema/utils/uid';

// P7+: canonical uid re-export (crypto.getRandomValues 기반)
export { uid };

/** 고유 ID 생성 훅 */
export const useUID = (): (() => string) => {
  return useCallback(() => uid(), []);
};



