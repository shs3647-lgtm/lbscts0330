/**
 * FC processCharId FK 선택 로직
 * atomicToLegacyAdapter.ts에서 분리 (2026-03-27)
 *
 * FC의 l3FuncId를 우선 사용, 유효하지 않으면 processCharId 폴백.
 * SSOT: l3FuncId (L3Function.id와 정합)
 */
export function pickFcProcessCharId(
  fc: { l3FuncId: string; processCharId?: string | null },
  validL3FuncIds: Set<string>,
): string {
  const a = String(fc.l3FuncId || '').trim();
  const b = String(fc.processCharId || '').trim();
  if (a && validL3FuncIds.has(a)) return a;
  if (b && validL3FuncIds.has(b)) return b;
  return a || b || '';
}

/** @deprecated 하위호환 alias — pickFcProcessCharId 사용 권장 */
export const pickLegacyFcProcessCharId = pickFcProcessCharId;
