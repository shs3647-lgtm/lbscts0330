/**
 * @file validation.ts
 * @description 워크시트 유효성 검증 공용 유틸리티
 *
 * @codefreeze 2026-01-10
 *
 * 모든 탭에서 공통으로 사용하는 검증 함수들
 */

/**
 * 값이 누락/플레이스홀더인지 확인
 *
 * @param name - 검사할 문자열
 * @returns true면 누락됨 (빈값, 플레이스홀더 패턴)
 *
 * @example
 * isMissing('') // true
 * isMissing('  ') // true (whitespace only)
 * isMissing('프레스') // false
 */
export function isMissing(name: string | undefined | null): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (trimmed === '' || trimmed === '-') return true;

  return false;
}

/**
 * 의미있는 요구사항 이름인지 확인 (고장분석용)
 *
 * @param name - 검사할 문자열
 * @returns true면 의미있는 값
 */
export function isMeaningfulRequirementName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  if (!n) return false;
  if (n.startsWith('(기능분석에서')) return false;
  return true;
}

/**
 * 의미있는 특성 이름인지 확인
 *
 * @param name - 검사할 문자열
 * @returns true면 의미있는 값
 */
export function isMeaningfulCharName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  if (!n) return false;
  return true;
}

/**
 * BORDER 스타일 상수
 */
export const BORDER = '1px solid #b0bec5';

/**
 * 기본 셀 스타일 생성
 * @returns CSS 스타일 객체
 */
export const createCellBase = (fontSize: string = '11px') => ({
  border: BORDER,
  padding: '4px 6px',
  fontSize,
  verticalAlign: 'middle' as const,
} as const);

