/**
 * @file row-merge-logic.ts
 * @description 마지막 행 병합 로직 유틸리티
 */

import { RowMergeConfig } from './types';

/**
 * 마지막 행 병합 계산
 * FE와 FC 개수가 불일치할 때, 마지막 항목을 확장하여 빈 행 제거
 * 
 * @param feCount FE 항목 개수
 * @param fcCount FC 항목 개수
 * @param rowIdx 현재 행 인덱스
 * @param maxRows 최대 행 수 (Math.max(feCount, fcCount, 1))
 * @returns 행 병합 설정
 */
export function calculateLastRowMerge(
  feCount: number,
  fcCount: number,
  rowIdx: number,
  maxRows: number
): RowMergeConfig {
  const lastFeIdx = feCount > 0 ? feCount - 1 : -1;
  const lastFcIdx = fcCount > 0 ? fcCount - 1 : -1;
  
  // FE 처리: 각 항목 1행, 마지막 항목은 남은 행 모두 차지
  let showFe = false;
  let feRowSpan = 0;
  
  if (rowIdx < feCount) {
    showFe = true;
    // 마지막 FE면 남은 행을 모두 차지
    feRowSpan = (rowIdx === lastFeIdx) ? (maxRows - rowIdx) : 1;
  } else if (feCount === 0 && rowIdx === 0) {
    // FE가 아예 없을 때 첫 번째 행에만 빈 FE 표시
    showFe = true;
    feRowSpan = maxRows;
  }
  
  // FC 처리: 각 항목 1행, 마지막 항목은 남은 행 모두 차지
  let showFc = false;
  let fcRowSpan = 0;
  
  if (rowIdx < fcCount) {
    showFc = true;
    // 마지막 FC면 남은 행을 모두 차지
    fcRowSpan = (rowIdx === lastFcIdx) ? (maxRows - rowIdx) : 1;
  } else if (fcCount === 0 && rowIdx === 0) {
    // FC가 아예 없을 때 첫 번째 행에만 빈 FC 표시
    showFc = true;
    fcRowSpan = maxRows;
  }
  
  return {
    feRowSpan,
    fcRowSpan,
    showFe,
    showFc,
  };
}









