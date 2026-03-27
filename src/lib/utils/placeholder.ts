/**
 * placeholder 판별 유틸리티
 *
 * 기존: name.includes('클릭') || name.includes('선택') (텍스트 기반 — 버그 유발)
 * 변경: 빈 문자열 체크 (데이터 기반)
 */

/** 값이 placeholder(빈값)인지 판별 */
export function isPlaceholder(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  // 레거시 호환: 기존 placeholder 텍스트도 빈값으로 취급
  if (trimmed.includes('클릭하여') || trimmed === '-') return true;
  return false;
}

/** 값이 실제 데이터인지 판별 (isPlaceholder 반대) */
export function hasValue(value: string | null | undefined): boolean {
  return !isPlaceholder(value);
}
