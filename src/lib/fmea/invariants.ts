/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * @file invariants.ts — 이 파일은 절대 수정 금지
 * @description FMEA 파이프라인 불변 규칙 (재발 방지)
 *
 * ═══════════════════════════════════════════════════════════════
 * 이 규칙은 아래 3곳에서 강제 검증된다:
 *   1. Git pre-commit hook  → scripts/guard/check-invariants.ts
 *   2. 런타임 Import 시      → assertInvariant() 호출
 *   3. 코드 리뷰 체크리스트  → IMMUTABLE_RULES 참조
 *
 * 위반 시 해당 변경은 **롤백** 대상.
 * ═══════════════════════════════════════════════════════════════
 *
 * @created 2026-03-25
 * @see docs/# Smart FMEA 파이프라인 완전 재구축 마스터 체크리스트.md §8
 */

// ════════════════════════════════════════════
// 불변 규칙 상수
// ════════════════════════════════════════════

export const IMMUTABLE_RULES = {
  // 규칙 1: A4는 복제 금지
  NO_A4_CLONE: 'A4(ProcessProductChar)를 A3 내부에서 복제 생성 금지',
  // 규칙 2: FK는 cellId 기반
  FK_BY_CELLID: 'FK 연결은 반드시 cellId 기준, 문자열 명칭 비교 금지',
  // 규칙 3: 트랜잭션 필수
  SINGLE_TX: 'Import는 단일 prisma.$transaction 내에서 완료',
  // 규칙 4: distribute() 금지
  NO_DISTRIBUTE: 'distribute() 함수를 FM-PC 연결에 사용 금지',
  // 규칙 5: 파싱 순서 고정
  PARSE_ORDER: 'A4 파싱 완료 후 A5, B1 완료 후 B4/B5, 모두 완료 후 FC',
  // 규칙 6: 랜덤 UUID 금지 (Import 경로)
  NO_RANDOM_UUID: 'Import 파이프라인에서 uid()/uuidv4()/nanoid() 사용 금지 — buildCellId() 사용',
  // 규칙 7: 중복 삭제 순서
  DEDUP_ORDER: 'FK 매핑 먼저 → 중복삭제는 최종검증에서만 수행',
  // 규칙 8: 중복 삭제 조건
  DEDUP_CONDITION: '동일 공정번호+WE+기능+공정특성 또는 동일 공정특성+하위 고장원인',
  // 규칙 9: 빈 행 원천 차단 (2026-03-25 추가)
  NO_EMPTY_IMPORT: 'Import 데이터에 빈 셀 행이 있으면 삭제 후 재생성 — 빈 cellId 생성 금지',
  // 규칙 10: 레거시 파서 사용 금지 (2026-03-25 추가)
  NO_LEGACY_PARSER: 'buildWorksheetState/failureChainInjector/buildAtomicFromFlat 사용 금지 — position-parser 사용',
} as const;

/**
 * FC 파싱 직전: 9개 Map 비어있으면 오류
 * @see cell-id.ts assertMapsReady
 */
export const FC_PARSE_PREREQUISITE = [
  'a1Map', 'a4Map', 'a5Map', 'a6Map',
  'b1Map', 'b4Map', 'b5Map',
  'c1Map', 'c4Map',
] as const;

// ════════════════════════════════════════════
// 금지 패턴 목록 (Git Hook + 런타임 검증용)
// ════════════════════════════════════════════

/** 프로덕션 코드에서 금지되는 패턴 */
export const BANNED_PATTERNS = [
  {
    pattern: /distribute\s*\(/,
    rule: 'NO_DISTRIBUTE',
    message: 'distribute() 함수 사용 금지 — 카테시안 복제 원인',
    scope: 'src/lib/fmea/',
  },
  {
    pattern: /\buid\s*\(\)|uuidv4\s*\(\)|nanoid\s*\(\)/,
    rule: 'NO_RANDOM_UUID',
    message: '랜덤 UUID 생성 금지 — buildCellId() 사용',
    scope: 'src/lib/fmea/',
  },
  {
    pattern: /buildWorksheetState/,
    rule: 'NO_LEGACY_PARSER',
    message: 'buildWorksheetState 사용 금지 — position-parser 사용',
    scope: 'src/lib/fmea/',
  },
  {
    pattern: /failureChainInjector/,
    rule: 'NO_LEGACY_PARSER',
    message: 'failureChainInjector 사용 금지 — position-parser 사용',
    scope: 'src/lib/fmea/',
  },
  {
    pattern: /buildAtomicFromFlat/,
    rule: 'NO_LEGACY_PARSER',
    message: 'buildAtomicFromFlat 사용 금지 — position-parser 사용',
    scope: 'src/lib/fmea/',
  },
] as const;

// ════════════════════════════════════════════
// 런타임 검증 함수
// ════════════════════════════════════════════

/**
 * 불변 규칙 위반 시 오류 throw
 * Import 파이프라인 핵심 지점에서 호출
 *
 * @example
 *   assertInvariant(cellId !== '', 'NO_EMPTY_IMPORT');
 *   assertInvariant(!isLegacy, 'NO_LEGACY_PARSER');
 */
export function assertInvariant(
  condition: boolean,
  ruleKey: keyof typeof IMMUTABLE_RULES,
  context?: string,
): asserts condition {
  if (!condition) {
    const rule = IMMUTABLE_RULES[ruleKey];
    const msg = `[INVARIANT VIOLATION] ${ruleKey}: ${rule}` +
      (context ? ` — ${context}` : '');
    console.error(msg);
    throw new Error(msg);
  }
}

/**
 * FC 파싱 전: 9개 Map 준비 상태 검증
 * @throws 9개 Map 중 하나라도 비어있으면 오류
 */
export function assertMapsReady(
  maps: Record<string, Map<string, unknown>>,
): void {
  const missing: string[] = [];
  for (const name of FC_PARSE_PREREQUISITE) {
    const map = maps[name];
    if (!map || map.size === 0) {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `[INVARIANT] FC 파싱 전 필수 Map 미준비: ${missing.join(', ')}\n` +
      `→ ${IMMUTABLE_RULES.PARSE_ORDER}`
    );
  }
}

/**
 * CellId 유효성 검증 — 빈 문자열 또는 undefined 차단
 * @throws cellId가 비어있으면 오류
 */
export function assertValidCellId(
  cellId: string | undefined,
  entityType: string,
  context?: string,
): asserts cellId is string {
  if (!cellId || cellId.trim() === '') {
    const msg = `[INVARIANT] ${entityType}: cellId가 비어있음` +
      (context ? ` — ${context}` : '') +
      `\n→ ${IMMUTABLE_RULES.NO_EMPTY_IMPORT}`;
    console.error(msg);
    throw new Error(msg);
  }
}
