/**
 * @file scrollToMissing.ts
 * @description 누락 항목 스크롤 이동 — 전탭 공통 유틸리티
 *
 * ★ 2026-03-28: 전탭 수평전개 표준 (Structure/FunctionL3/FailureL3 패턴 통일)
 *
 * 사용법:
 * 1. Row에 data-missing-row="true" 속성 부여
 * 2. scrollToFirstMissing() 호출 → 첫 번째 누락 행으로 스크롤 + 하이라이트
 */

/**
 * data-missing-row="true" 속성이 있는 첫 번째 행으로 스크롤 이동 + 주황색 하이라이트.
 * 3초 후 하이라이트 제거.
 */
export function scrollToFirstMissingRow(): void {
  const el = document.querySelector('[data-missing-row="true"]') as HTMLElement;
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.style.outline = '3px solid #ea580c';
  el.style.outlineOffset = '-1px';
  setTimeout(() => {
    el.style.outline = '';
    el.style.outlineOffset = '';
  }, 3000);
}
