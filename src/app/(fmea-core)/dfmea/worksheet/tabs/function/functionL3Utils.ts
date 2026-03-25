/**
 * @file functionL3Utils.ts
 * @description FunctionL3Tab 유틸리티 함수
 * 
 * ★★★ 2026-02-05: FunctionL3Tab.tsx 최적화 - 공용 유틸리티 분리 ★★★
 *
 * ⚠️ AI / 유지보수 주의 (2026-03-23)
 * - `deduplicateFunctionsL3`: 설계파라미터(B3)은 **이름**으로 dedup 하지 말 것. 동일 이름·다른 id = 별개 행. **동일 id**만 제거.
 * - `remapFailureCauseCharIds`: `validCharIds`에 남은 id는 리매핑 금지. 이름→첫 id 병합으로 FC를 옮기면 다른 WE/B3가 깨짐.
 * - `calculateL3Counts`·`filterMeaningfulProcessChars(removeDuplicates:false)` 등과 정책 일치 유지.
 */

/** 모달/템플릿 전용 문구 (길이 제한 전에 판정 — 🔍 복합 셀 대응) */
const L3_TEMPLATE_FULL =
  /^🔍\s*(부품(컴포넌트)기능|설계파라미터)\s*선택\s*$/u;
const L3_TEMPLATE_FULL_NO_ICON = /^(부품(컴포넌트)기능|설계파라미터)\s*선택\s*$/;

/** 플레이스홀더 값 체크 (L3용) */
// ★ FIX: 실제 데이터가 "선택"/"입력" 등 키워드를 포함할 수 있으므로
// 짧은 placeholder 문자열만 누락으로 판정 (20자 초과 = 실제 데이터)
// ★ 2026-03-22: "🔍 부품(컴포넌트)기능 선택, 🔍 설계파라미터 선택" 은 콤마로만 연결된 템플릿 → placeholder
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
  if (trimmed.includes('클릭')) return true;
  if (trimmed.includes('선택')) return true;
  if (trimmed.includes('입력')) return true;
  if (trimmed.includes('추가')) return true;
  if (trimmed.includes('필요')) return true;
  if (trimmed.includes('[object')) return true;
  return false;
};

/** 의미 있는 값인지 체크 */
export const isMeaningfulL3 = (name: string | undefined | null): boolean => !isPlaceholderL3(name);

/** 의미 있는 부품(컴포넌트) 필터링 */
export const filterMeaningfulWorkElements = <T extends { name?: string }>(l3: T[]): T[] => {
  return (l3 || []).filter(we => isMeaningfulL3(we.name));
};

/** 의미 있는 기능 필터링 (L3) */
export const filterMeaningfulFunctionsL3 = <T extends { name?: string }>(functions: T[]): T[] => {
  return (functions || []).filter(f => isMeaningfulL3(f.name));
};

/** 의미 있는 설계파라미터 필터링 (중복 제거 포함) */
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

/** 부품(컴포넌트)의 rowSpan 계산 */
export const calculateWorkElementRowSpan = (
  functions: Array<{ name?: string; processChars?: any[] }>
): number => {
  const meaningfulFuncs = filterMeaningfulFunctionsL3(functions || []);
  if (meaningfulFuncs.length === 0) return 1;
  
  return meaningfulFuncs.reduce((acc, f) => {
    // 동일 설계파라미터명 복수 행 허용 — 이름 기준 중복 제거 없음
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
 * L3 기능 중복 제거 및 설계파라미터 합침
 * ⚠️ AI주의: processChars 배열에서 **설계파라미터 이름**으로 줄이지 말 것. (서로 다른 B3 id는 동일 텍스트 허용)
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

  // 동일 설계파라미터명 복수 행 허용 — 이름 기준 dedup 금지. 동일 id만 제거(병합 시 중복 id).
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
 * FC.processCharId 리매핑 (설계파라미터 행이 제거되어 id가 사라진 경우에만 이름→잔존 id)
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
