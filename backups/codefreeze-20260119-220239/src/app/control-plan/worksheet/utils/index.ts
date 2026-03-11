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
    workElement: '',   // E열: 빈 값
    detectorNo: false,
    detectorEp: false,
    detectorAuto: false,
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

/**
 * 샘플 데이터 생성 (프레스, 가류 2행)
 */
export function createSampleItems(cpId: string): CPItem[] {
  const items: CPItem[] = [
    { 
      ...createEmptyItem(cpId, '10', '프레스'), 
      processDesc: '원료투입', 
      workElement: '원료계량', 
      productChar: '외관불량', 
      processChar: '압력', 
      specialChar: 'CC', 
      specTolerance: '100±5kgf', 
      evalMethod: '압력게이지', 
      sampleSize: '5', 
      sampleFreq: 'LOT', 
      controlMethod: 'SPC', 
      owner1: '생산', 
      owner2: '', 
      reactionPlan: '재작업', 
      sortOrder: 0 
    },
    { 
      ...createEmptyItem(cpId, '20', '가류'), 
      processDesc: '가열성형', 
      workElement: '온도관리', 
      productChar: '물성불량', 
      processChar: '시간', 
      specialChar: 'CC', 
      specTolerance: '15±1min', 
      evalMethod: '타이머', 
      sampleSize: '전수', 
      sampleFreq: '전수', 
      controlMethod: '자동제어', 
      owner1: '생산', 
      owner2: '품질', 
      reactionPlan: '폐기', 
      sortOrder: 1 
    },
  ];
  
  return items;
}



