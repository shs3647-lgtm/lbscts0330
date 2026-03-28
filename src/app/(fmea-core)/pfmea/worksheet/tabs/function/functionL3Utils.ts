/**
 * @file functionL3Utils.ts
 * @description FunctionL3Tab 유틸리티 함수 — L3 기능/공정특성 dedup 파이프라인
 *
 * ★★★ 2026-02-05: FunctionL3Tab.tsx 최적화 - 공용 유틸리티 분리 ★★★
 * ★★★ 2026-03-28: L2(functionL2Utils.ts)와 동일 Step 구조로 리팩토링 (수평전개) ★★★
 *
 * ⚠️ AI / 유지보수 주의 (2026-03-28)
 * - L3 dedup 파이프라인은 L2(`functionL2Utils.ts`)와 **동일 Step 구조**를 유지해야 한다.
 *   L3를 수정하면 L2도 동일 패턴으로 수정할 것. (수평전개 원칙)
 * - 파이프라인 Step 구조:
 *   Step 1:   deduplicateWorkElementsL3()          — WE 복합키(m4|name) 병합
 *   Step 2:   deduplicateFunctionsL3()             — function name 병합 (processChars[] 합침, ID dedup)
 *   Step 2.5: deduplicateProcessCharsAfterWeMerge() — WE 병합으로 생긴 공정특성 이름 중복 제거
 *   Step 3:   remapFailureCauseCharIds()           — FC.processCharId FK 리매핑 (validCharIds 보호)
 * - `deduplicateFunctionsL3`: 공정특성(B3)은 **이름**으로 dedup 하지 말 것. 동일 이름·다른 id = 별개 행. **동일 id**만 제거.
 * - `deduplicateProcessCharsAfterWeMerge`는 기존 파이프라인 보호를 위해 **별도 함수로 분리**.
 *   `deduplicateFunctionsL3` 안에 넣지 말 것 — Step별 분리가 L2와 통일된 유지보수 패턴.
 * - `remapFailureCauseCharIds`: `validCharIds`에 남은 id는 리매핑 금지. 이름→첫 id 병합으로 FC를 옮기면 다른 WE/B3가 깨짐.
 * - `calculateL3Counts`·`filterMeaningfulProcessChars(removeDuplicates:false)` 등과 정책 일치 유지.
 */

/** 모달/템플릿 전용 문구 (길이 제한 전에 판정 — 🔍 복합 셀 대응) */
const L3_TEMPLATE_FULL =
  /^🔍\s*(작업요소기능|공정특성)\s*선택\s*$/u;
const L3_TEMPLATE_FULL_NO_ICON = /^(작업요소기능|공정특성)\s*선택\s*$/;

/** 플레이스홀더 값 체크 (L3용) */
// ★ FIX: 실제 데이터가 "선택"/"입력" 등 키워드를 포함할 수 있으므로
// 짧은 placeholder 문자열만 누락으로 판정 (20자 초과 = 실제 데이터)
// ★ 2026-03-22: "🔍 작업요소기능 선택, 🔍 공정특성 선택" 은 콤마로만 연결된 템플릿 → placeholder
const isPlaceholderL3 = (name: string | undefined | null): boolean => {
  if (!name || !name.trim()) return true;
  const trimmed = name.trim();
  if (L3_TEMPLATE_FULL.test(trimmed) || L3_TEMPLATE_FULL_NO_ICON.test(trimmed)) return true;
  if (/[,，]/.test(trimmed)) {
    const parts = trimmed.split(/[,，]/).map(p => p.trim()).filter(Boolean);
    if (
      parts.length > 1 &&
      parts.every(p => L3_TEMPLATE_FULL.test(p) || L3_TEMPLATE_FULL_NO_ICON.test(p))
    ) {
      return true;
    }
  }
  if (trimmed.length > 20) return false;
  // Empty string already handled above
  if (trimmed.includes('[object')) return true;
  return false;
};

/** 의미 있는 값인지 체크 */
export const isMeaningfulL3 = (name: string | undefined | null): boolean => !isPlaceholderL3(name);

/** 의미 있는 작업요소 필터링 */
export const filterMeaningfulWorkElements = <T extends { name?: string }>(l3: T[]): T[] => {
  return (l3 || []).filter(we => isMeaningfulL3(we.name));
};

/** 의미 있는 기능 필터링 (L3) */
export const filterMeaningfulFunctionsL3 = <T extends { name?: string }>(functions: T[]): T[] => {
  return (functions || []).filter(f => isMeaningfulL3(f.name));
};

/** 의미 있는 공정특성 필터링 (중복 제거 포함) */
export const filterMeaningfulProcessChars = <T extends { name?: string }>(
  chars: T[],
  removeDuplicates = false
): T[] => {
  const filtered = (chars || []).filter(c => {
    const name = typeof c === 'object' ? ((c as any)?.name || '') : String(c || '');
    return isMeaningfulL3(name);
  });
  
  if (!removeDuplicates) return filtered;
  
  const seen = new Set<string>();
  return filtered.filter(c => {
    const name = typeof c === 'object' ? ((c as any)?.name?.trim() || '') : String(c || '').trim();
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
};

/** 작업요소의 rowSpan 계산 */
export const calculateWorkElementRowSpan = (
  functions: Array<{ name?: string; processChars?: any[] }>
): number => {
  const meaningfulFuncs = filterMeaningfulFunctionsL3(functions || []);
  if (meaningfulFuncs.length === 0) return 1;
  
  return meaningfulFuncs.reduce((acc, f) => {
    // 동일 공정특성명 복수 행 허용 — 이름 기준 중복 제거 없음
    const meaningfulChars = filterMeaningfulProcessChars(f.processChars || [], false);
    return acc + Math.max(1, meaningfulChars.length);
  }, 0);
};

/** 공정의 총 rowSpan 계산 (L3) */
export const calculateProcRowSpanL3 = (l3: any[]): number => {
  const meaningfulL3 = filterMeaningfulWorkElements(l3 || []);
  if (meaningfulL3.length === 0) return 1;
  
  return meaningfulL3.reduce((acc, we) => acc + calculateWorkElementRowSpan(we.functions || []), 0);
};

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Step 2: L3 기능(Function) 이름 기준 병합 + 공정특성 ID dedup
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * L2 대응 함수: deduplicateFunctionsL2 (functionL2Utils.ts)
 *
 * 동작:
 * 1. 같은 이름의 function → 병합 (processChars[] 배열 합침)
 * 2. processChars는 **ID 기준만** 제거 (이름 중복은 Step 2.5에서 처리)
 *
 * ⚠️ AI주의: processChars 배열에서 **공정특성 이름**으로 줄이지 말 것.
 *   서로 다른 B3 id는 동일 텍스트 허용. 이름 중복 제거는 별도 Step 2.5에서 처리.
 *   기존 파이프라인 보호를 위해 Step별 분리 유지. (L2와 동일 패턴)
 */
export const deduplicateFunctionsL3 = (
  functions: Array<{ id: string; name: string; processChars?: any[] }>
): { functions: any[]; cleaned: boolean } => {
  let cleaned = false;
  const funcMap = new Map<string, any>();
  
  functions.forEach((f) => {
    const name = f.name?.trim() || '';
    // 이름 없는 함수: processChars가 없으면 스킵 (placeholder만 있는 경우)
    // processChars가 있으면 보존 (effectiveB3 fallback으로 생성된 함수)
    if (!name && !(f.processChars || []).some((c: any) => c?.name?.trim())) return;
    if (funcMap.has(name)) {
      const existing = funcMap.get(name);
      const allChars = [...(existing.processChars || []), ...(f.processChars || [])];
      existing.processChars = allChars;
      cleaned = true;
    } else {
      funcMap.set(name, { ...f });
    }
  });

  // 동일 공정특성명 복수 행 허용 — 이름 기준 dedup 금지. 동일 id만 제거(병합 시 중복 id).
  const uniqueFuncs = Array.from(funcMap.values()).map((f: any) => {
    const chars = f.processChars || [];
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
    return { ...f, processChars: uniqueChars };
  });

  return { functions: uniqueFuncs, cleaned };
};

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Step 1: L3 작업요소(WorkElement) 복합키(m4|name) 중복 제거
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * L2 대응: L2에는 WE 계층이 없으므로 직접 대응 없음. (L2는 Step 1에서 바로 function 병합)
 *
 * 동일 공정 내에서 m4 + name이 같은 작업요소를 병합 (functions 배열 합침)
 * ⚠️ AI주의: 이 함수는 동일 공정 내 proc.l3 배열에서만 사용. 공정 간 병합 절대 금지.
 */
export const deduplicateWorkElementsL3 = (
  workElements: Array<{ id: string; m4?: string; name?: string; functions?: any[]; failureCauses?: any[]; [k: string]: any }>
): { workElements: any[]; cleaned: boolean } => {
  let cleaned = false;
  const weMap = new Map<string, any>();
  for (const we of workElements) {
    const name = (we.name || '').trim();
    if (!name) { weMap.set(we.id, { ...we }); continue; }
    const key = `${(we.m4 || '').trim()}|${name}`;
    if (weMap.has(key)) {
      const existing = weMap.get(key);
      existing.functions = [...(existing.functions || []), ...(we.functions || [])];
      if (we.failureCauses?.length) {
        existing.failureCauses = [...(existing.failureCauses || []), ...(we.failureCauses || [])];
      }
      cleaned = true;
    } else {
      weMap.set(key, { ...we });
    }
  }
  return { workElements: Array.from(weMap.values()), cleaned };
};

/** L3 COUNT 계산 — 누락(Missing) 판정과 동일하게 isMeaningfulL3 기준 (템플릿/🔍 선택 문자열은 제외) */
export const calculateL3Counts = (l2: any[]) => {
  const workElementCount = (l2 || []).reduce(
    (sum, proc) => sum + (proc.l3 || []).filter((we: any) => isMeaningfulL3(we.name)).length,
    0,
  );
  const functionCount = (l2 || []).reduce((sum, proc) => {
    const n = (proc.l3 || []).reduce((weSum: number, we: any) => {
      const cnt = (we.functions || []).filter((f: any) => {
        const fn = String(f.name || '');
        const hasPc = (f.processChars || []).some((c: any) => isMeaningfulL3(c?.name));
        const nameOk = isMeaningfulL3(fn) && !fn.includes('자동생성');
        return nameOk || hasPc;
      }).length;
      return weSum + cnt;
    }, 0);
    return sum + n;
  }, 0);
  let processCharCount = 0;
  for (const proc of l2 || []) {
    for (const we of proc.l3 || []) {
      for (const func of we.functions || []) {
        for (const c of func.processChars || []) {
          const n = String(c?.name || '').trim();
          if (n && isMeaningfulL3(n)) processCharCount += 1;
        }
      }
    }
  }

  return { workElementCount, functionCount, processCharCount };
};

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Step 3: FC.processCharId FK 리매핑
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * L2 대응 함수: remapFailureModeCharIds (functionL2Utils.ts)
 *
 * 공정특성 행이 dedup으로 제거되어 id가 사라진 경우,
 * FC의 processCharId를 살아있는 id로 리매핑한다.
 *
 * ★ validCharIds 보호: 현재 살아있는 공정특성 ID는 리매핑 대상에서 제외.
 *   (L2의 remapFailureModeCharIds와 동일 보호 패턴)
 *
 * ⚠️ AI주의: `validCharIds?.has(oid)` 이면 **절대** 이름으로 다른 id로 바꾸지 말 것. 복수 B3 동일 이름 보호용.
 */
export const remapFailureCauseCharIds = (
  failureCauses: any[],
  oldCharIdToName: Map<string, string>,
  canonicalIdByCharName: Map<string, string>,
  validCharIds?: Set<string>
): { causes: any[]; cleaned: boolean } => {
  let cleaned = false;
  const remappedCauses = failureCauses.map((fc: any) => {
    const oldId = fc?.processCharId;
    if (!oldId) return fc;
    const oid = String(oldId);
    if (validCharIds?.has(oid)) return fc;
    const oldName = oldCharIdToName.get(oid);
    if (!oldName) return fc;
    const canonicalId = canonicalIdByCharName.get(oldName);
    if (canonicalId && canonicalId !== oid) {
      cleaned = true;
      return { ...fc, processCharId: canonicalId };
    }
    return fc;
  });
  return { causes: remappedCauses, cleaned };
};

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Step 2.5: WE 병합 후 공정특성 복합키(name) 중복 제거
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * L2 대응 함수: deduplicateProductCharsAfterFuncMerge (functionL2Utils.ts)
 *
 * ★ 적용 시점: deduplicateWorkElementsL3 → deduplicateFunctionsL3 이후.
 *   WE 병합 시 다른 L3Structure에서 온 같은 function의 processChars가 합쳐지면,
 *   같은 이름의 공정특성이 다른 ID로 복수 존재할 수 있다. 이 함수는 이를 제거한다.
 *
 * ★ 기존 deduplicateFunctionsL3의 "이름 기준 dedup 금지" 정책과 다른 이유:
 *   기존 정책은 "원래 같은 L3Structure 안에서 의도적으로 같은 이름의 공정특성을 둔 경우"를 보호.
 *   이 함수는 "WE 병합으로 인해 다른 L3Structure에서 온 동일 데이터의 복제본"만 제거.
 *   기존 파이프라인 보호를 위해 별도 함수로 분리. (L2 deduplicateProductCharsAfterFuncMerge와 동일 패턴)
 *
 * ⚠️ AI주의: 이 함수를 deduplicateFunctionsL3 안에 넣지 말 것 — 별도 step으로만 호출.
 */
export const deduplicateProcessCharsAfterWeMerge = (
  functions: Array<{ id: string; name?: string; processChars?: any[]; [k: string]: any }>
): { functions: any[]; cleaned: boolean } => {
  let cleaned = false;
  const result = functions.map((f) => {
    const chars = f.processChars || [];
    if (chars.length <= 1) return f;

    const seenNames = new Map<string, any>();
    const uniqueChars: any[] = [];
    for (const c of chars) {
      const name = (c?.name || '').trim();
      // 빈 이름은 placeholder — 일단 임시 보존
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
    // ★ 2026-03-28 FIX: 유의미 공정특성이 있으면 빈 placeholder 제거 (빈행 버그 수정)
    const meaningfulChars = uniqueChars.filter(c => (c?.name || '').trim());
    const finalChars = meaningfulChars.length > 0
      ? meaningfulChars  // 유의미한 것만 남김
      : uniqueChars;     // 전부 빈 값 → placeholder 1개 유지
    if (finalChars.length < uniqueChars.length) cleaned = true;
    return { ...f, processChars: finalChars };
  });
  return { functions: result, cleaned };
};
