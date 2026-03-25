/**
 * @file lightweight-filter.ts
 * @description 수동/자동 모드 경량화 필터
 * A6(검출관리)/B5(예방관리) 제거 — 구조분석~고장분석에 불필요
 * @created 2026-02-26
 */

import type { ImportedFlatData } from '../types';

/** 경량 모드에서 제외할 itemCode (위험분석 전용) */
const HEAVY_ITEM_CODES = new Set(['A6', 'B5']);

/**
 * A6/B5 항목을 제거하여 경량 데이터를 반환한다.
 * 유지: A1-A5, B1-B4, C1-C4
 */
export function stripHeavyItemCodes(data: ImportedFlatData[]): ImportedFlatData[] {
  return data.filter(d => !HEAVY_ITEM_CODES.has(d.itemCode));
}

/**
 * 데이터가 경량 모드인지 확인 (A6/B5 미포함)
 */
export function isLightweightData(data: ImportedFlatData[]): boolean {
  return data.every(d => !HEAVY_ITEM_CODES.has(d.itemCode));
}
