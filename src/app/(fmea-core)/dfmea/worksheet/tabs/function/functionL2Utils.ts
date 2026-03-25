/**
 * @file functionL2Utils.ts
 * @description FunctionL2Tab 유틸리티 함수
 * 
 * ★★★ 2026-02-05: FunctionL2Tab.tsx 최적화 - 공용 유틸리티 분리 ★★★
 */

/** 플레이스홀더 값 체크 (L2용 - 추가 패턴 포함) */
export const isPlaceholderL2 = (name: string | undefined | null): boolean => {
  if (!name || !name.trim()) return true;
  const trimmed = name.trim();
  // ★ FIX: 20자 초과 = 실제 데이터 (키워드 포함해도 placeholder 아님)
  if (trimmed.length > 20) return false;
  if (trimmed.includes('클릭')) return true;
  if (trimmed.includes('선택')) return true;
  if (trimmed.includes('입력')) return true;
  if (trimmed.includes('자동생성')) return true;
  if (trimmed.includes('필요')) return true;
  if (trimmed.includes('추가')) return true;
  return false;
};

/** 의미 있는 값인지 체크 */
export const isMeaningfulL2 = (name: string | undefined | null): boolean => !isPlaceholderL2(name);

/** 의미 있는 기능 필터링 (L2) */
export const filterMeaningfulFunctionsL2 = <T extends { name?: string }>(functions: T[]): T[] => {
  return (functions || []).filter(f => isMeaningfulL2(f.name));
};

/** 의미 있는 설계특성 필터링 (중복 제거 포함) */
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

/** L2 기능 중복 제거 및 설계특성 합침 */
export const deduplicateFunctionsL2 = (
  functions: Array<{ id: string; name: string; productChars?: any[] }>
): { functions: any[]; cleaned: boolean } => {
  let cleaned = false;
  const funcMap = new Map<string, any>();
  
  functions.forEach((f, fIdx) => {
    const name = f.name?.trim();
    if (!name) {
      return;
    }
    if (funcMap.has(name)) {
      // 이미 있으면 설계특성 합침
      const existing = funcMap.get(name);
      const allChars = [...(existing.productChars || []), ...(f.productChars || [])];
      existing.productChars = allChars;
      cleaned = true;
    } else {
      funcMap.set(name, { ...f });
    }
  });

  // 각 기능별 설계특성 중복 제거
  const uniqueFuncs = Array.from(funcMap.values()).map((f: any) => {
    const chars = f.productChars || [];
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
    return { ...f, productChars: uniqueChars };
  });

  return { functions: uniqueFuncs, cleaned };
};

/** L2 COUNT 계산 */
export const calculateL2Counts = (l2: any[]) => {
  const processCount = (l2 || []).filter(p => p.name && !p.name.includes('클릭')).length;
  const functionCount = (l2 || []).reduce((sum, proc) => 
    sum + (proc.functions || []).filter((f: any) => f.name && !f.name.includes('클릭')).length, 0);
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

/** FM.productCharId 리매핑 (설계특성 중복 제거 시) */
export const remapFailureModeCharIds = (
  failureModes: any[],
  oldCharIdToName: Map<string, string>,
  canonicalIdByCharName: Map<string, string>
): { modes: any[]; cleaned: boolean } => {
  let cleaned = false;
  const remappedModes = failureModes.map((fm: any) => {
    const oldId = fm?.productCharId;
    if (!oldId) return fm;
    const oldName = oldCharIdToName.get(String(oldId));
    if (!oldName) return fm;
    const canonicalId = canonicalIdByCharName.get(oldName);
    if (canonicalId && canonicalId !== String(oldId)) {
      cleaned = true;
      return { ...fm, productCharId: canonicalId };
    }
    return fm;
  });
  return { modes: remappedModes, cleaned };
};
