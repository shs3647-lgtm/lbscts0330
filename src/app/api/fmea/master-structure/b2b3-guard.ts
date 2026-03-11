/**
 * @file b2b3-guard.ts
 * @description B2/B3 완전성 검증 가드 — 순수 함수
 * - 자동모드 구조 임포트 시 B2(작업요소기능)/B3(공정특성) 누락 작업요소(B1) 차단
 * - processNo + m4 키 매칭으로 B2, B3 모두 존재하는 B1만 통과
 * @created 2026-02-20
 */

/** B1 아이템 최소 인터페이스 (필터링에 필요한 필드만) */
export interface B2B3CheckItem {
  id: string;
  processNo: string;
  m4: string | null | undefined;
  value?: unknown;
}

/** B2/B3 참조용 최소 인터페이스 */
export interface B2B3Ref {
  processNo: string;
  m4: string | null | undefined;
}

/** 필터링 결과 */
export interface B2B3FilterResult {
  passed: B2B3CheckItem[];
  filtered: number;
}

/**
 * processNo + m4 복합키 생성
 * - 공백 trim, 대문자 정규화
 */
export function makeB2B3Key(
  processNo: string | null | undefined,
  m4: string | null | undefined
): string {
  return `${(processNo || '').trim()}|${(m4 || '').trim().toUpperCase()}`;
}

/**
 * B1 아이템 중 B2+B3 모두 존재하는 항목만 필터링
 * @param b1Items - B1(작업요소) 목록
 * @param b2Refs - B2(작업요소기능) processNo+m4 참조 목록
 * @param b3Refs - B3(공정특성) processNo+m4 참조 목록
 * @returns passed: 통과된 B1 목록, filtered: 제외된 건수
 */
export function filterB1ByCompleteness(
  b1Items: B2B3CheckItem[],
  b2Refs: B2B3Ref[],
  b3Refs: B2B3Ref[]
): B2B3FilterResult {
  const b2Set = new Set(b2Refs.map(r => makeB2B3Key(r.processNo, r.m4)));
  const b3Set = new Set(b3Refs.map(r => makeB2B3Key(r.processNo, r.m4)));

  const passed = b1Items.filter(item => {
    const key = makeB2B3Key(item.processNo, item.m4);
    return b2Set.has(key) && b3Set.has(key);
  });

  return {
    passed,
    filtered: b1Items.length - passed.length,
  };
}
