/**
 * @file utils/index.ts
 * @description CP 워크시트 유틸리티 함수
 */

import { CPItem } from '../types';

/**
 * 빈 CP 항목 생성
 */
export function createEmptyItem(
  cpId: string,
  processNo: string = '',
  processName: string = ''
): CPItem {
  return {
    id: `cpi-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    cpId,
    processNo,
    processName,
    processLevel: '',  // C열: 기본값 빈 값 (기본값으로 초기화)
    processDesc: '',   // D열: 빈 값
    partName: '',      // ✅ 부품명: 빈 값
    equipment: '',     // E열: 설비/금형/JIG
    detectorNo: false,
    detectorEp: false,
    detectorAuto: false,
    epDeviceIds: '',
    autoDeviceIds: '',
    productChar: '',
    processChar: '',
    specialChar: '',
    charIndex: 0,  // 원자성 인덱스
    specTolerance: '',
    evalMethod: '',
    sampleSize: '',
    sampleFreq: '',
    controlMethod: '',
    owner1: '',
    owner2: '',
    reactionPlan: '',
    sortOrder: 0,
  };
}


