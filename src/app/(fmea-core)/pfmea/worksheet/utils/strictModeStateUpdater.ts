/**
 * React 18 Strict Mode(개발)에서 useState/setState의 함수형 업데이터가
 * 동일한 prev 스냅샷에 대해 두 번 호출될 수 있음 → splice 등 구조 변경이 이중 적용되는 버그 방지.
 * 두 번째 호출은 첫 번째에서 계산·캐시한 결과를 그대로 반환한다.
 *
 * @see https://react.dev/reference/react/StrictMode
 */
import type { WorksheetState } from '../constants';

export function createStrictModeDedupedUpdater(
  compute: (prev: WorksheetState) => WorksheetState,
): (prev: WorksheetState) => WorksheetState {
  let cached: WorksheetState | null = null;
  return (prev: WorksheetState) => {
    if (cached !== null) return cached;
    const next = compute(prev);
    cached = next;
    return next;
  };
}
