/**
 * PFMEA 좌우 비교 뷰 — 탭/기본 Master ID
 */
export const DEFAULT_COMPARE_MASTER_FMEA_ID = 'pfm26-m001';

/** 비교 뷰에서 동기화할 분석 탭 (전체 워크시트 tab id와 동일) */
export const COMPARE_SYNC_TAB_IDS = [
  'structure',
  'function-l1',
  'function-l2',
  'function-l3',
  'failure-l1',
  'failure-l2',
  'failure-l3',
] as const;

export type CompareSyncTabId = (typeof COMPARE_SYNC_TAB_IDS)[number];

/** URL/워크시트 tab → 비교 뷰에서 동기화 가능한 탭만 허용 */
export function normalizeCompareTab(tab: string | null | undefined): CompareSyncTabId {
  const t = tab || 'structure';
  return (COMPARE_SYNC_TAB_IDS as readonly string[]).includes(t) ? (t as CompareSyncTabId) : 'structure';
}
