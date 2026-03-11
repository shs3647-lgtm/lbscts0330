/**
 * @file security.ts
 * @description 공통 보안 유틸리티 함수
 * @created 2026-02-20
 */

// =====================================================
// SQL Injection 방지: 식별자 검증
// =====================================================

/** PostgreSQL 스키마/테이블 이름 검증 (영문, 숫자, 언더스코어만 허용) */
export function isValidIdentifier(name: string): boolean {
  return /^[a-z][a-z0-9_]*$/i.test(name) && name.length <= 63;
}

/** fmeaId 검증 (영문, 숫자, 하이픈, 언더스코어만 허용) */
export function isValidFmeaId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 128;
}

// =====================================================
// XSS 방지: HTML 이스케이프
// =====================================================

/** HTML 특수문자 이스케이프 (이메일 템플릿 등에서 사용) */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =====================================================
// Mass Assignment 방지: 허용 필드 필터링
// =====================================================

/** 허용된 필드만 추출 (body spread 방지) */
export function pickFields<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: string[]
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result as Partial<T>;
}

// =====================================================
// Path Traversal 방지
// =====================================================

/** 경로에 traversal 문자가 없는지 검증 */
export function isValidPathSegment(segment: string): boolean {
  if (!segment) return false;
  // .. / \ null byte 등 차단
  return /^[a-zA-Z0-9_-]+$/.test(segment) && !segment.includes('..');
}

// =====================================================
// 에러 응답 안전화
// =====================================================

/** 프로덕션 안전 에러 메시지 반환 (내부 상세 정보 제거) */
export function safeErrorMessage(error: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    return error instanceof Error ? error.message : 'Unknown error';
  }
  return 'Internal server error';
}
