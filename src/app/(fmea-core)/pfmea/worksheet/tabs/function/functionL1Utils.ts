/**
 * @file functionL1Utils.ts
 * @description FunctionL1Tab 유틸리티 함수
 *
 * ★★★ 2026-02-05: FunctionL1Tab.tsx 최적화 - 공용 유틸리티 분리 ★★★
 *
 * 원인 분석:
 * 1. 동일한 필터링 로직(meaningfulTypes/Functions/Reqs)이 5회 이상 반복
 * 2. 플레이스홀더 체크 로직이 여러 곳에 분산
 * 3. 타입 rowSpan 계산 로직 중복
 */

import { normalizeScope, getRequiredScopes, type ScopeCode, type DfmeaScopeCode } from '@/lib/fmea/scope-constants';
import { PLACEHOLDER_TEXT } from '../../utils/safeMutate';

/** 플레이스홀더 값 체크 (빈 값, '미입력' 등 시스템 플레이스홀더 포함) */
export const isPlaceholder = (value: string | undefined | null): boolean => {
  if (!value) return true;
  const t = value.trim();
  return t === '' || t === PLACEHOLDER_TEXT;
};

/** 의미 있는 값인지 체크 (플레이스홀더가 아닌 값) */
export const isMeaningful = (value: string | undefined | null): boolean => !isPlaceholder(value);

/** 의미 있는 타입 필터링 */
const filterMeaningfulTypes = <T extends { name?: string }>(types: T[]): T[] => {
  return (types || []).filter(t => isMeaningful(t.name));
};

/** 의미 있는 기능 필터링 */
export const filterMeaningfulFunctions = <T extends { name?: string }>(functions: T[]): T[] => {
  return (functions || []).filter(f => isMeaningful(f.name));
};

/** 의미 있는 요구사항 필터링 */
export const filterMeaningfulRequirements = <T extends { name?: string }>(requirements: T[]): T[] => {
  return (requirements || []).filter(r => isMeaningful(r.name));
};

/** 타입의 총 행 수 계산 (rowSpan용) */
export const calculateTypeRowSpan = (
  functions: Array<{ name?: string; requirements?: Array<{ name?: string }> }>
): number => {
  const meaningfulFunctions = filterMeaningfulFunctions(functions || []);
  if (meaningfulFunctions.length === 0) return 1;
  
  return meaningfulFunctions.reduce((acc, f) => {
    const meaningfulReqs = filterMeaningfulRequirements(f.requirements || []);
    return acc + Math.max(1, meaningfulReqs.length);
  }, 0);
};

/** 기능의 총 행 수 계산 (rowSpan용) */
export const calculateFunctionRowSpan = (
  requirements: Array<{ name?: string }>
): number => {
  const meaningfulReqs = filterMeaningfulRequirements(requirements || []);
  return Math.max(1, meaningfulReqs.length);
};

/** L1 이름 포맷팅 (생산공정 접미사 추가, DFMEA는 접미사 없음) */
export const formatL1Name = (name: string | undefined | null, isDfmea = false): string => {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.includes('입력') || trimmed.includes('구조분석')) {
    return trimmed || '(구조분석에서 입력)';
  }
  if (isDfmea) return trimmed;
  if (trimmed.endsWith('생산공정') || trimmed.endsWith('제조공정') || trimmed.endsWith('공정')) {
    return trimmed;
  }
  return `${trimmed} 생산공정`;
};

/**
 * ★★★ 필수 구분 — DFMEA에 PFMEA 명칭(YP/SP/USER) 절대 주입 금지 ★★★
 * PFMEA: YP / SP / USER
 * DFMEA: 법규 / 기본 / 보조 / 관능
 * ❌ isDfmea=true일 때 YP/SP/USER 반환 절대 불가
 * ❌ isDfmea=false일 때 법규/기본/보조/관능 반환 절대 불가
 */
export function getRequiredTypes(isDfmea: boolean): readonly string[] {
  return isDfmea
    ? ['법규', '기본', '보조', '관능']
    : ['YP', 'SP', 'USER'];
}

/**
 * L1 구분 표시명 → YP / SP / USER (누락·배지 검사용)
 * DB/Import는 'YP'·'SP'·'USER' 통일 사용.
 * ★ 2026-03-22: normalizeScope() 중앙 함수 사용으로 통합
 */
export function normalizeL1TypeNameToKey(name: string | undefined): ScopeCode | DfmeaScopeCode | null {
  if (!name || !name.trim()) return null;
  return normalizeScope(name);
}

/**
 * 누락 건수 계산
 *
 * ★★★ 2026-04-03 리팩토링: isPlaceholder 단일 기준 통일 ★★★
 * - filterMeaningfulFunctions/Requirements 와 동일한 isPlaceholder 기준 사용
 * - isMissing(tabUtils) 패턴매칭('입력','선택' 등) 사용 금지 → ghost-counting 근절
 * - 누락 = 필수 구분(scope) 미존재만 카운트
 * - 미입력 기능/요구사항은 '미시작'으로 간주 (누락 아님)
 */
export const calculateMissingCounts = (
  types: Array<{
    name?: string;
    functions?: Array<{
      name?: string;
      requirements?: Array<{ name?: string }>;
    }>;
  }>,
  _isMissingFn: (val: string | undefined) => boolean,
  isDfmea = false
): { functionCount: number; requirementCount: number; total: number } => {
  let functionCount = 0;
  const requirementCount = 0;

  const meaningfulTypes = filterMeaningfulTypes(types || []);
  const presentKeys = new Set<string>();
  meaningfulTypes.forEach(t => {
    const k = normalizeL1TypeNameToKey(t.name);
    if (k) presentKeys.add(k);
  });
  const requiredTypes = getRequiredScopes(isDfmea);
  requiredTypes.forEach(req => {
    if (!presentKeys.has(req)) {
      functionCount += 1;
    }
  });

  return { functionCount, requirementCount, total: functionCount + requirementCount };
};
