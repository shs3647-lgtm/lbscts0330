/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * C1 구분(Scope) 중앙 상수 + 정규화 유틸리티
 *
 * FMEA 표준 고장영향 범위:
 *   YP (Your Plant)   = 자사공정
 *   SP (Ship to Plant) = 고객사
 *   USER (End User)    = 최종사용자
 *
 * ❌ 금지: 코드 내에서 'YOUR PLANT', 'Ship to Plant' 등 문자열 직접 비교
 * ✅ 필수: normalizeScope() 또는 SCOPE_* 상수 사용
 *
 * @created 2026-03-22
 */

// ── 약어 상수 ──────────────────────────────────────────
export const SCOPE_YP = 'YP' as const;
export const SCOPE_SP = 'SP' as const;
export const SCOPE_USER = 'USER' as const;

/** C1 구분 약어 목록 */
export const C1_SCOPES = [SCOPE_YP, SCOPE_SP, SCOPE_USER] as const;
export type ScopeCode = typeof C1_SCOPES[number];

// ── 전체명 ↔ 약어 매핑 ────────────────────────────────
/** 약어 → 한글 라벨 */
export const SCOPE_LABEL_KR: Record<ScopeCode, string> = {
  YP: '자사공정',
  SP: '고객사',
  USER: '최종사용자',
};

/** 약어 → 영문 전체명 */
export const SCOPE_LABEL_EN: Record<ScopeCode, string> = {
  YP: 'Your Plant',
  SP: 'Ship to Plant',
  USER: 'End User',
};

/** 약어 → 대문자 전체명 (엑셀 헤더/표시용) */
export const SCOPE_LABEL_UPPER: Record<ScopeCode, string> = {
  YP: 'YOUR PLANT',
  SP: 'SHIP TO PLANT',
  USER: 'USER',
};

/** 약어 → 색상 */
export const SCOPE_COLOR: Record<ScopeCode, string> = {
  YP: '#1565c0',
  SP: '#f57c00',
  USER: '#2e7d32',
};

// ── 정규화 함수 ────────────────────────────────────────
/**
 * C1 scope 문자열을 약어(YP/SP/USER)로 정규화
 *
 * 입력: 'Your Plant', 'YOUR PLANT', 'YP', '자사', 'Ship to Plant', 'SP', 'End User', 'USER' 등
 * 출력: 'YP' | 'SP' | 'USER'
 * 빈값/미인식: 'YP' (기본값)
 */
export function normalizeScope(raw: string): ScopeCode {
  const u = raw.toUpperCase().trim();
  if (u === 'YP' || u.includes('YOUR') || u === '자사') return SCOPE_YP;
  if (u === 'SP' || u.includes('SHIP')) return SCOPE_SP;
  if (u === 'USER' || u === 'US' || u.includes('END')) return SCOPE_USER;
  if (u) return u as ScopeCode; // 알 수 없는 값은 그대로 보존
  return SCOPE_YP; // 빈값 → 기본값 YP
}

/**
 * scope 약어 → 표시용 대문자 라벨 (YOUR PLANT / SHIP TO PLANT / USER)
 */
export function scopeDisplayLabel(code: ScopeCode | string): string {
  const norm = normalizeScope(code);
  return SCOPE_LABEL_UPPER[norm] ?? norm;
}

/**
 * scope 약어 → 한글 라벨 (자사공정 / 고객사 / 최종사용자)
 */
export function scopeKrLabel(code: ScopeCode | string): string {
  const norm = normalizeScope(code);
  return SCOPE_LABEL_KR[norm] ?? norm;
}
