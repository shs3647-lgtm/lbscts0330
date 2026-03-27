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

import { normalizeScope, type ScopeCode } from '@/lib/fmea/scope-constants';

/** 플레이스홀더 값 체크 (빈 값, 클릭하여, 선택, 자동생성 등) */
export const isPlaceholder = (value: string | undefined | null): boolean => {
  if (!value) return true;
  return value.trim() === '';
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

/** L1 이름 포맷팅 (생산공정 접미사 추가) */
export const formatL1Name = (name: string | undefined | null): string => {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.includes('입력') || trimmed.includes('구조분석')) {
    return trimmed || '(구조분석에서 입력)';
  }
  if (trimmed.endsWith('생산공정') || trimmed.endsWith('제조공정') || trimmed.endsWith('공정')) {
    return trimmed;
  }
  return `${trimmed} 생산공정`;
};

/** ★★★ 2026-02-16: 필수 구분 (YP/SP/USER 3개 모두 필수) ★★★ */
const REQUIRED_TYPES = ['YP', 'SP', 'USER'] as const;

/**
 * L1 구분 표시명 → YP / SP / USER (누락·배지 검사용)
 * DB/Import는 'YP'·'SP'·'USER' 통일 사용.
 * ★ 2026-03-22: normalizeScope() 중앙 함수 사용으로 통합
 */
export function normalizeL1TypeNameToKey(name: string | undefined): ScopeCode | null {
  if (!name || !name.trim()) return null;
  return normalizeScope(name);
}

/** 누락 건수 계산 */
export const calculateMissingCounts = (
  types: Array<{
    name?: string;
    functions?: Array<{
      name?: string;
      requirements?: Array<{ name?: string }>;
    }>;
  }>,
  isMissingFn: (val: string | undefined) => boolean
): { functionCount: number; requirementCount: number; total: number } => {
  let functionCount = 0;
  let requirementCount = 0;

  const meaningfulTypes = filterMeaningfulTypes(types || []);
  // ★★★ 2026-03-22: 풀네임(Your Plant 등)과 약어(YP) 혼재 — 정규화 후 필수 구분 검사
  const presentKeys = new Set<'YP' | 'SP' | 'USER'>();
  meaningfulTypes.forEach(t => {
    const k = normalizeL1TypeNameToKey(t.name);
    if (k) presentKeys.add(k);
  });
  REQUIRED_TYPES.forEach(req => {
    if (!presentKeys.has(req)) {
      functionCount += 1; // 필수 구분 누락
    }
  });

  meaningfulTypes.forEach(t => {
    const meaningfulFunctions = filterMeaningfulFunctions(t.functions || []);

    // YP/SP: 기능 최소 1개 필수, USER: N/A도 허용
    if (meaningfulFunctions.length === 0) {
      functionCount += 1;
    }

    meaningfulFunctions.forEach(f => {
      const funcName = (f.name || '').trim();
      // USER 타입의 N/A는 유효한 값으로 인정
      const isNA = funcName.toUpperCase() === 'N/A';
      if (!isNA && isMissingFn(f.name)) functionCount++;

      const meaningfulReqs = filterMeaningfulRequirements(f.requirements || []);

      // 상위레벨(기능) 입력 시 하위레벨(요구사항) 최소 1개 필수
      // USER의 N/A 기능은 요구사항도 N/A면 통과
      if (!isMissingFn(f.name) || isNA) {
        if (meaningfulReqs.length === 0 && !isNA) {
          requirementCount += 1;
        }
      }

      // 요구사항 이름 체크 (N/A는 유효)
      meaningfulReqs.forEach(r => {
        const reqName = (r.name || '').trim();
        if (reqName.toUpperCase() !== 'N/A' && isMissingFn(r.name)) requirementCount++;
      });
    });
  });

  return { functionCount, requirementCount, total: functionCount + requirementCount };
};
