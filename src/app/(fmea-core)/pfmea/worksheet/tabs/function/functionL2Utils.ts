/**
 * @file functionL2Utils.ts
 * @description FunctionL2Tab 유틸리티 함수 — L2 기능/제품특성 dedup 파이프라인
 *
 * ★★★ 2026-02-05: FunctionL2Tab.tsx 최적화 - 공용 유틸리티 분리 ★★★
 * ★★★ 2026-03-28: L3과 동일 Step 구조로 리팩토링 (수평전개) ★★★
 *
 * ⚠️ AI / 유지보수 주의 (2026-03-28)
 * - L2 dedup 파이프라인은 L3(`functionL3Utils.ts`)과 **동일 Step 구조**를 유지해야 한다.
 *   L2를 수정하면 L3도 동일 패턴으로 수정할 것. (수평전개 원칙)
 * - 파이프라인 Step 구조:
 *   Step 1: deduplicateFunctionsL2()       — 같은 이름 function 병합 (productChars[] 합침, ID dedup)
 *   Step 1.5: deduplicateProductCharsAfterFuncMerge() — function 병합으로 생긴 제품특성 이름 중복 제거
 *   Step 2: remapFailureModeCharIds()      — FM.productCharId FK 리매핑 (validCharIds 보호)
 * - `deduplicateProductCharsAfterFuncMerge`는 기존 파이프라인 보호를 위해 **별도 함수로 분리**.
 *   `deduplicateFunctionsL2` 안에 넣지 말 것 — Step별 분리가 L3과 통일된 유지보수 패턴.
 */

/** 플레이스홀더 값 체크 (L2용 - 빈값 체크) */
export const isPlaceholderL2 = (name: string | undefined | null): boolean => {
  if (!name || !name.trim()) return true;
  return false;
};

/** 의미 있는 값인지 체크 */
export const isMeaningfulL2 = (name: string | undefined | null): boolean => !isPlaceholderL2(name);

/** 의미 있는 기능 필터링 (L2) */
export const filterMeaningfulFunctionsL2 = <T extends { name?: string }>(functions: T[]): T[] => {
  return (functions || []).filter(f => isMeaningfulL2(f.name));
};

/** 의미 있는 제품특성 필터링 (중복 제거 포함) */
export const filterMeaningfulProductChars = <T extends { name?: string }>(
  chars: T[],
  removeDuplicates = false
): T[] => {
  const filtered = (chars || []).filter(c => isMeaningfulL2(c.name));
  if (!removeDuplicates) return filtered;

  const seen = new Set<string>();
  return filtered.filter(c => {
    const name = c.name?.trim();
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
};

/** 공정의 rowSpan 계산 (L2) */
export const calculateProcRowSpanL2 = (
  functions: Array<{ name?: string; productChars?: Array<{ name?: string }> }>
): number => {
  const meaningfulFuncs = filterMeaningfulFunctionsL2(functions || []);
  if (meaningfulFuncs.length === 0) return 1;

  return meaningfulFuncs.reduce((acc, f) => {
    const meaningfulChars = filterMeaningfulProductChars(f.productChars || [], true);
    return acc + Math.max(1, meaningfulChars.length);
  }, 0);
};

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Step 1: L2 기능(Function) 이름 기준 병합 + 제품특성 ID dedup
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * L3 대응 함수: deduplicateFunctionsL3 (functionL3Utils.ts)
 *
 * 동작:
 * 1. 같은 이름의 function → 병합 (productChars[] 배열 합침)
 * 2. productChars는 **ID 기준만** 제거 (이름 중복은 Step 1.5에서 처리)
 *
 * ⚠️ AI주의: 이 함수 안에 이름 기준 productChar dedup을 넣지 말 것.
 *   이름 중복 제거는 별도 Step 1.5(`deduplicateProductCharsAfterFuncMerge`)에서 처리.
 *   기존 파이프라인 보호를 위해 Step별 분리 유지. (L3과 동일 패턴)
 */
export const deduplicateFunctionsL2 = (
  functions: Array<{ id: string; name: string; productChars?: any[] }>
): { functions: any[]; cleaned: boolean } => {
  let cleaned = false;
  const funcMap = new Map<string, any>();

  functions.forEach((f) => {
    const name = f.name?.trim();
    if (!name) return;
    if (funcMap.has(name)) {
      // 같은 이름 function → productChars 합침
      const existing = funcMap.get(name);
      existing.productChars = [...(existing.productChars || []), ...(f.productChars || [])];
      cleaned = true;
    } else {
      funcMap.set(name, { ...f });
    }
  });

  // productChars ID dedup (이름이 아닌 ID만 — L3 deduplicateFunctionsL3와 동일 정책)
  const uniqueFuncs = Array.from(funcMap.values()).map((f: any) => {
    const chars = f.productChars || [];
    const seenIds = new Set<string>();
    const uniqueChars = chars.filter((c: any) => {
      const id = c?.id != null && String(c.id).trim() !== '' ? String(c.id) : '';
      if (!id) return true;
      if (seenIds.has(id)) {
        cleaned = true;
        return false;
      }
      seenIds.add(id);
      return true;
    });
    return { ...f, productChars: uniqueChars };
  });

  return { functions: uniqueFuncs, cleaned };
};

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Step 1.5: Function 병합 후 제품특성 복합키(name) 중복 제거
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * L3 대응 함수: deduplicateProcessCharsAfterWeMerge (functionL3Utils.ts)
 *
 * ★ 적용 시점: deduplicateFunctionsL2 이후.
 *   Function 병합 시 같은 function의 productChars가 합쳐지면,
 *   같은 이름의 제품특성이 다른 ID로 복수 존재할 수 있다. 이 함수는 이를 제거한다.
 *
 * ★ deduplicateFunctionsL2에서 분리한 이유:
 *   기존 파이프라인 보호 — Step별 분리로 L3과 동일한 유지보수 패턴 유지.
 *   각 Step이 독립적이어야 디버깅과 테스트가 용이.
 *
 * ⚠️ AI주의: 이 함수를 deduplicateFunctionsL2 안에 넣지 말 것 — 별도 step으로만 호출.
 */
export const deduplicateProductCharsAfterFuncMerge = (
  functions: Array<{ id: string; name?: string; productChars?: any[]; [k: string]: any }>
): { functions: any[]; cleaned: boolean } => {
  let cleaned = false;
  const result = functions.map((f) => {
    const chars = f.productChars || [];
    if (chars.length <= 1) return f;

    const seenNames = new Map<string, any>();
    const uniqueChars: any[] = [];
    for (const c of chars) {
      const name = (c?.name || '').trim();
      // 빈 이름은 placeholder — 개별 보존 (dedup 안 함)
      if (!name) {
        uniqueChars.push(c);
        continue;
      }
      if (seenNames.has(name)) {
        // 중복 — 첫 번째 항목의 specialChar가 비어있으면 후속 값으로 보충
        const first = seenNames.get(name);
        if (!first.specialChar && c.specialChar) {
          first.specialChar = c.specialChar;
        }
        cleaned = true;
      } else {
        const copy = { ...c };
        seenNames.set(name, copy);
        uniqueChars.push(copy);
      }
    }
    return { ...f, productChars: uniqueChars };
  });
  return { functions: result, cleaned };
};

/** L2 COUNT 계산 */
export const calculateL2Counts = (l2: any[]) => {
  const processCount = (l2 || []).filter(p => p.name?.trim()).length;
  const functionCount = (l2 || []).reduce((sum, proc) =>
    sum + (proc.functions || []).filter((f: any) => f.name?.trim()).length, 0);
  const uniqueChars = new Set<string>();
  for (const proc of (l2 || [])) {
    for (const func of (proc.functions || [])) {
      for (const c of (func.productChars || [])) {
        const n = String(c?.name || '').trim();
        if (n) uniqueChars.add(`${proc.no || proc.id}|${n}`);
      }
    }
  }
  const productCharCount = uniqueChars.size;

  return { processCount, functionCount, productCharCount };
};

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Step 2: FM.productCharId FK 리매핑
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * L3 대응 함수: remapFailureCauseCharIds (functionL3Utils.ts)
 *
 * 제품특성 행이 dedup으로 제거되어 id가 사라진 경우,
 * FM의 productCharId를 살아있는 id로 리매핑한다.
 *
 * ★ validCharIds 보호: 현재 살아있는 제품특성 ID는 리매핑 대상에서 제외.
 *   (L3의 remapFailureCauseCharIds와 동일 보호 패턴)
 */
export const remapFailureModeCharIds = (
  failureModes: any[],
  oldCharIdToName: Map<string, string>,
  canonicalIdByCharName: Map<string, string>,
  validCharIds?: Set<string>
): { modes: any[]; cleaned: boolean } => {
  let cleaned = false;
  const remappedModes = failureModes.map((fm: any) => {
    const oldId = fm?.productCharId;
    if (!oldId) return fm;
    const oid = String(oldId);
    // ★ validCharIds 보호: 살아있는 ID는 리매핑하지 않음 (L3과 동일 패턴)
    if (validCharIds?.has(oid)) return fm;
    const oldName = oldCharIdToName.get(oid);
    if (!oldName) return fm;
    const canonicalId = canonicalIdByCharName.get(oldName);
    if (canonicalId && canonicalId !== oid) {
      cleaned = true;
      return { ...fm, productCharId: canonicalId };
    }
    return fm;
  });
  return { modes: remappedModes, cleaned };
};
