/**
 * @file cloneLegacyData.ts
 * @description FMEA 개정 — LegacyData 복제 제거 (Atomic DB SSoT)
 *
 * Legacy 데이터는 더 이상 SSoT가 아니므로, 이 함수는 no-op으로 변경.
 * Atomic DB 복제는 cloneAtomicData.ts에서 처리.
 *
 * @created 2026-03-02
 * @updated 2026-03-20 — Legacy 의존성 완전 제거
 */

import type { IdRemapMap, PromotionEntry } from './cloneAtomicData';

/**
 * LegacyData 복제 — no-op (Legacy 제거)
 *
 * Atomic DB가 SSoT이므로 LegacyData 복제는 더 이상 필요하지 않습니다.
 * cloneAtomicData.ts에서 모든 Atomic 테이블을 직접 복제합니다.
 *
 * @returns false (legacy data not cloned — no longer needed)
 */
export async function cloneLegacyData(
  _tx: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  _sourceFmeaId: string,
  _newFmeaId: string,
  _idMap: IdRemapMap,
  _promotionMap: Map<string, PromotionEntry>
): Promise<boolean> {
  // No-op: Legacy data cloning removed. Atomic DB is SSoT.
  return false;
}
