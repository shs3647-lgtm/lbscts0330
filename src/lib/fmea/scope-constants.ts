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
 * ★★★ PFMEA / DFMEA 구분 명칭 혼용 절대 금지 ★★★
 *
 * PFMEA 전용: YP (Your Plant), SP (Ship to Plant), USER (End User)
 * DFMEA 전용: 법규, 기본, 보조, 관능
 *
 * ❌ DFMEA 화면/로직에 YP/SP/USER 명칭 주입 절대 불가
 * ❌ PFMEA 화면/로직에 법규/기본/보조/관능 명칭 주입 절대 불가
 * ❌ 코드 내에서 'YOUR PLANT', 'Ship to Plant' 등 문자열 직접 비교 금지
 * ✅ 필수: getRequiredScopes(isDfmea) 또는 normalizeScope() 사용
 *
 * @created 2026-03-22
 */

// ── PFMEA 약어 상수 ──────────────────────────────────────────
export const SCOPE_YP = 'YP' as const;
export const SCOPE_SP = 'SP' as const;
export const SCOPE_USER = 'USER' as const;

/** PFMEA C1 구분 약어 목록 */
export const C1_SCOPES = [SCOPE_YP, SCOPE_SP, SCOPE_USER] as const;
export type ScopeCode = typeof C1_SCOPES[number];

// ── DFMEA 구분 상수 (법규/기본/보조/관능) ──────────────────
export const DFMEA_SCOPE_REG = '법규' as const;
export const DFMEA_SCOPE_PRI = '기본' as const;
export const DFMEA_SCOPE_SEC = '보조' as const;
export const DFMEA_SCOPE_SEN = '관능' as const;

/** DFMEA C1 구분 목록 */
export const C1_DFMEA_SCOPES = [DFMEA_SCOPE_REG, DFMEA_SCOPE_PRI, DFMEA_SCOPE_SEC, DFMEA_SCOPE_SEN] as const;
export type DfmeaScopeCode = typeof C1_DFMEA_SCOPES[number];

/** FMEA 타입에 따른 필수 구분 목록 반환 */
export function getRequiredScopes(isDfmea: boolean): readonly string[] {
  return isDfmea ? C1_DFMEA_SCOPES : C1_SCOPES;
}

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

/** DFMEA 약어 → 한글 라벨 */
export const DFMEA_SCOPE_LABEL_KR: Record<DfmeaScopeCode, string> = {
  '법규': '법규',
  '기본': '기본',
  '보조': '보조',
  '관능': '관능',
};

/** DFMEA 약어 → 영문 전체명 */
export const DFMEA_SCOPE_LABEL_EN: Record<DfmeaScopeCode, string> = {
  '법규': 'Regulation',
  '기본': 'Primary',
  '보조': 'Secondary',
  '관능': 'Sensory',
};

/** DFMEA 약어 → 색상 */
export const DFMEA_SCOPE_COLOR: Record<DfmeaScopeCode, string> = {
  '법규': '#c62828',
  '기본': '#1976d2',
  '보조': '#388e3c',
  '관능': '#7b1fa2',
};

// ── 정규화 함수 ────────────────────────────────────────
/**
 * C1 scope 문자열을 약어(YP/SP/USER)로 정규화
 *
 * 입력: 'Your Plant', 'YOUR PLANT', 'YP', '자사', 'Ship to Plant', 'SP', 'End User', 'USER' 등
 * 출력: 'YP' | 'SP' | 'USER'
 * 빈값/미인식: 'YP' (기본값)
 */
export function normalizeScope(raw: string): ScopeCode | DfmeaScopeCode {
  const u = raw.toUpperCase().trim();
  const t = raw.trim();
  // PFMEA scopes
  if (u === 'YP' || u.includes('YOUR') || u === '자사') return SCOPE_YP;
  if (u === 'SP' || u.includes('SHIP')) return SCOPE_SP;
  if (u === 'USER' || u === 'US' || u.includes('END')) return SCOPE_USER;
  // DFMEA scopes (한글 원문 보존)
  if (t === '법규' || u === 'REGULATION' || u === 'REG') return DFMEA_SCOPE_REG;
  if (t === '기본' || u === 'PRIMARY' || u === 'PRI') return DFMEA_SCOPE_PRI;
  if (t === '보조' || u === 'SECONDARY' || u === 'SEC') return DFMEA_SCOPE_SEC;
  if (t === '관능' || u === 'SENSORY' || u === 'SEN') return DFMEA_SCOPE_SEN;
  if (u) return u as ScopeCode; // 알 수 없는 값은 그대로 보존
  return SCOPE_YP; // 빈값 → 기본값 YP
}

/**
 * scope 약어 → 표시용 대문자 라벨 (YOUR PLANT / SHIP TO PLANT / USER)
 */
export function scopeDisplayLabel(code: ScopeCode | DfmeaScopeCode | string): string {
  const norm = normalizeScope(code);
  return SCOPE_LABEL_UPPER[norm as ScopeCode] ?? DFMEA_SCOPE_LABEL_EN[norm as DfmeaScopeCode] ?? norm;
}

/**
 * scope 약어 → 한글 라벨 (자사공정 / 고객사 / 최종사용자)
 */
export function scopeKrLabel(code: ScopeCode | DfmeaScopeCode | string): string {
  const norm = normalizeScope(code);
  return SCOPE_LABEL_KR[norm as ScopeCode] ?? DFMEA_SCOPE_LABEL_KR[norm as DfmeaScopeCode] ?? norm;
}
