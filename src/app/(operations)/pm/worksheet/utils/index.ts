/**
 * @file utils/index.ts
 * @description PFD 워크시트 유틸리티 함수
 */

import { PmItem } from '../types';

/**
 * 빈 PFD 항목 생성
 */
export function createEmptyItem(
  pfdId: string,
  processNo: string = '',
  processName: string = ''
): PmItem {
  return {
    id: `pfdi-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    pfdId,
    processNo,
    processName,
    processLevel: '',
    processDesc: '',
    partName: '',  // ★ 필수 필드 추가
    workElement: '',
    equipment: '',
    productSC: '',
    productChar: '',
    processSC: '',
    processChar: '',
    charIndex: 0,
    sortOrder: 0,
  };
}


