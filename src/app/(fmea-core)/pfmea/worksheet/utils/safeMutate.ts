/**
 * @file safeMutate.ts
 * @description 배열 조작 안전 유틸리티 (2026-03-07)
 *
 * 비유: 안전벨트가 있는 공구. 일반 splice()는 맨손 작업이지만,
 * safeSplice()는 인덱스 범위를 자동으로 보정하여 잘못된 위치 삽입을 방지한다.
 *
 * 해결하는 문제:
 * 1. splice(-1, 0, item) → 마지막에서 2번째에 삽입되는 버그 방지
 * 2. splice(999, 0, item) → 범위 초과 시 끝에 삽입
 * 3. 상태 변경 후 구조 검증
 */

/**
 * 안전한 배열 splice. 인덱스가 범위를 벗어나면 자동 보정한다.
 *
 * @param arr - 대상 배열 (mutation됨 — deep clone 후 사용할 것)
 * @param index - 삽입/삭제 위치. -1이면 끝에 삽입, 범위 초과 시 끝에 삽입
 * @param deleteCount - 삭제할 항목 수
 * @param items - 삽입할 항목들
 * @returns 삭제된 항목들
 */
export function safeSplice<T>(
  arr: T[],
  index: number,
  deleteCount: number,
  ...items: T[]
): T[] {
  if (!Array.isArray(arr)) {
    console.error('[safeSplice] 대상이 배열이 아님:', typeof arr);
    return [];
  }

  // 인덱스 보정
  let safeIndex: number;
  if (index < 0) {
    // 음수 인덱스 → 끝에 삽입 (splice(-1)의 의도치 않은 동작 방지)
    safeIndex = arr.length;
  } else if (index > arr.length) {
    // 범위 초과 → 끝에 삽입
    safeIndex = arr.length;
  } else {
    safeIndex = index;
  }

  return arr.splice(safeIndex, deleteCount, ...items);
}

/**
 * 안전한 배열 필터. 결과가 빈 배열이면 fallback 항목을 포함한 배열을 반환한다.
 * 배열이 의도치 않게 완전히 비는 것을 방지한다.
 *
 * @param arr - 대상 배열
 * @param predicate - 필터 조건
 * @param fallback - 결과가 빈 경우 기본값
 * @returns 필터된 배열 (최소 1개 항목 보장)
 */
export function safeFilter<T>(
  arr: T[],
  predicate: (item: T, index: number) => boolean,
  fallback: T,
): T[] {
  if (!Array.isArray(arr)) return [fallback];
  const result = arr.filter(predicate);
  return result.length > 0 ? result : [fallback];
}

/**
 * 배열이 빈 경우 placeholder를 보장하는 유틸리티.
 * 비유: 마지막 남은 비상구 표지판. 모든 항목이 삭제되어도 최소 1개의
 * 빈 placeholder가 남아서 렌더링 구조가 깨지지 않도록 보장한다.
 *
 * @param arr - 검사할 배열
 * @param placeholderFactory - 빈 경우 생성할 placeholder
 * @param label - 로깅용 레이블 (디버깅 시 어떤 배열이 비었는지 식별)
 * @returns 최소 1개 항목이 보장된 배열
 */
export function ensurePlaceholder<T>(
  arr: T[],
  placeholderFactory: () => T,
  label?: string,
): T[] {
  if (!Array.isArray(arr) || arr.length === 0) {
    if (label) {
      console.error(`[ensurePlaceholder] ${label} 빈 배열 → placeholder 생성`);
    }
    return [placeholderFactory()];
  }
  return arr;
}

/**
 * 삭제된 항목의 ID를 기반으로 failureLinks에서 orphan 링크를 제거한다.
 * 비유: 주소록에서 퇴사자 번호를 지우는 것. 연락처(failureLinks)에
 * 더 이상 존재하지 않는 사람(FM/FE/FC)의 번호가 남아있으면 혼란을 초래한다.
 *
 * @param links - 현재 failureLinks 배열
 * @param deletedIds - 삭제된 항목 ID 집합 { fmIds, feIds, fcIds }
 * @returns orphan이 제거된 새 failureLinks 배열
 */
export function cleanOrphanLinks(
  links: Array<{ fmId?: string; feId?: string; fcId?: string; [key: string]: unknown }> | undefined,
  deletedIds: {
    fmIds?: Set<string>;
    feIds?: Set<string>;
    fcIds?: Set<string>;
  },
): Array<{ fmId?: string; feId?: string; fcId?: string; [key: string]: unknown }> {
  if (!Array.isArray(links) || links.length === 0) return [];

  const { fmIds, feIds, fcIds } = deletedIds;
  const hasFm = fmIds && fmIds.size > 0;
  const hasFe = feIds && feIds.size > 0;
  const hasFc = fcIds && fcIds.size > 0;

  if (!hasFm && !hasFe && !hasFc) return links;

  return links.filter(link => {
    if (hasFm && link.fmId && fmIds!.has(link.fmId)) return false;
    if (hasFe && link.feId && feIds!.has(link.feId)) return false;
    if (hasFc && link.fcId && fcIds!.has(link.fcId)) return false;
    return true;
  });
}

/**
 * WorksheetState에서 현재 존재하는 모든 FM/FE/FC ID를 수집한다.
 * failureLinks 검증 시 존재하지 않는 ID를 가진 링크를 찾는 데 사용.
 */
export function collectValidIds(state: {
  l1?: { failureScopes?: Array<{ id?: string }> };
  l2?: Array<{
    failureModes?: Array<{ id?: string }>;
    failureCauses?: Array<{ id?: string }>;
  }>;
}): { validFmIds: Set<string>; validFeIds: Set<string>; validFcIds: Set<string> } {
  const validFmIds = new Set<string>();
  const validFeIds = new Set<string>();
  const validFcIds = new Set<string>();

  (state.l1?.failureScopes || []).forEach(s => {
    if (s.id) validFeIds.add(s.id);
  });

  (state.l2 || []).forEach(proc => {
    (proc.failureModes || []).forEach(m => {
      if (m.id) validFmIds.add(m.id);
    });
    (proc.failureCauses || []).forEach(c => {
      if (c.id) validFcIds.add(c.id);
    });
  });

  return { validFmIds, validFeIds, validFcIds };
}

/**
 * failureLinks에서 현재 state에 존재하지 않는 orphan 링크를 모두 제거한다.
 * 삭제 후 최종 방어선으로 사용.
 */
export function purgeAllOrphanLinks(
  failureLinks: Array<{ fmId?: string; feId?: string; fcId?: string; [key: string]: unknown }> | undefined,
  state: {
    l1?: { failureScopes?: Array<{ id?: string }> };
    l2?: Array<{
      failureModes?: Array<{ id?: string }>;
      failureCauses?: Array<{ id?: string }>;
    }>;
  },
): Array<{ fmId?: string; feId?: string; fcId?: string; [key: string]: unknown }> {
  if (!Array.isArray(failureLinks) || failureLinks.length === 0) return [];

  const { validFmIds, validFeIds, validFcIds } = collectValidIds(state);

  return failureLinks.filter(link => {
    if (link.fmId && !validFmIds.has(link.fmId)) return false;
    if (link.feId && validFeIds.size > 0 && !validFeIds.has(link.feId)) return false;
    if (link.fcId && validFcIds.size > 0 && !validFcIds.has(link.fcId)) return false;
    return true;
  });
}

/**
 * 깊은 복제 후 콜백 실행. JSON.parse/stringify보다 안전한 패턴.
 * undefined 값을 보존하고, 순환 참조를 감지한다.
 *
 * @param obj - 복제할 객체
 * @returns 깊은 복제본
 */
export function safeDeepClone<T>(obj: T): T {
  try {
    // structuredClone이 있으면 사용 (undefined 보존, 더 빠름)
    if (typeof structuredClone === 'function') {
      return structuredClone(obj);
    }
  } catch {
    // structuredClone 실패 시 (함수 포함 등) JSON 폴백
  }

  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error('[safeDeepClone] 복제 실패:', e);
    return obj; // 최후의 폴백: 원본 반환 (mutation 위험 있지만 크래시보다 나음)
  }
}
