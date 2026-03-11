/**
 * @file functionL3Utils.ts
 * @description FunctionL3Tab 유틸리티 함수
 * 
 * ★★★ 2026-02-05: FunctionL3Tab.tsx 최적화 - 공용 유틸리티 분리 ★★★
 */

/** 플레이스홀더 값 체크 (L3용) */
// ★ FIX: 실제 데이터가 "선택"/"입력" 등 키워드를 포함할 수 있으므로
// 짧은 placeholder 문자열만 누락으로 판정 (20자 초과 = 실제 데이터)
const isPlaceholderL3 = (name: string | undefined | null): boolean => {
  if (!name || !name.trim()) return true;
  const trimmed = name.trim();
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
    const meaningfulChars = filterMeaningfulProcessChars(f.processChars || [], true);
    return acc + Math.max(1, meaningfulChars.length);
  }, 0);
};

/** 공정의 총 rowSpan 계산 (L3) */
export const calculateProcRowSpanL3 = (l3: any[]): number => {
  const meaningfulL3 = filterMeaningfulWorkElements(l3 || []);
  if (meaningfulL3.length === 0) return 1;
  
  return meaningfulL3.reduce((acc, we) => acc + calculateWorkElementRowSpan(we.functions || []), 0);
};

/** L3 기능 중복 제거 및 공정특성 합침 */
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

  // 각 기능별 공정특성 중복 제거
  const uniqueFuncs = Array.from(funcMap.values()).map((f: any) => {
    const chars = f.processChars || [];
    const seen = new Set<string>();
    const uniqueChars = chars.filter((c: any) => {
      const name = c.name?.trim();
      if (!name || seen.has(name)) {
        if (name && seen.has(name)) cleaned = true;
        return false;
      }
      seen.add(name);
      return true;
    });
    return { ...f, processChars: uniqueChars };
  });

  return { functions: uniqueFuncs, cleaned };
};

/** L3 COUNT 계산 */
export const calculateL3Counts = (l2: any[]) => {
  const workElementCount = (l2 || []).reduce((sum, proc) => 
    sum + (proc.l3 || []).filter((we: any) => we.name && !we.name.includes('클릭')).length, 0);
  const functionCount = (l2 || []).reduce((sum, proc) => 
    sum + (proc.l3 || []).reduce((weSum: number, we: any) => 
      weSum + (we.functions || []).filter((f: any) => f.name && !f.name.includes('클릭')).length, 0), 0);
  const uniqueProcessChars = new Set<string>();
  for (const proc of (l2 || [])) {
    for (const we of (proc.l3 || [])) {
      for (const func of (we.functions || [])) {
        for (const c of (func.processChars || [])) {
          const n = String(c?.name || '').trim();
          if (n) uniqueProcessChars.add(`${proc.no || proc.id}|${n}`);
        }
      }
    }
  }
  const processCharCount = uniqueProcessChars.size;
  
  return { workElementCount, functionCount, processCharCount };
};

/** FC.processCharId 리매핑 (공정특성 중복 제거 시) */
export const remapFailureCauseCharIds = (
  failureCauses: any[],
  oldCharIdToName: Map<string, string>,
  canonicalIdByCharName: Map<string, string>
): { causes: any[]; cleaned: boolean } => {
  let cleaned = false;
  const remappedCauses = failureCauses.map((fc: any) => {
    const oldId = fc?.processCharId;
    if (!oldId) return fc;
    const oldName = oldCharIdToName.get(String(oldId));
    if (!oldName) return fc;
    const canonicalId = canonicalIdByCharName.get(oldName);
    if (canonicalId && canonicalId !== String(oldId)) {
      cleaned = true;
      return { ...fc, processCharId: canonicalId };
    }
    return fc;
  });
  return { causes: remappedCauses, cleaned };
};
