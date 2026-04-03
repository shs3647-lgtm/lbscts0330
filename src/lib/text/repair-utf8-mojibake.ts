/**
 * UTF-8 바이트를 Latin-1(바이트 단위)으로 잘못 해석해 생긴 모지바케 복구.
 * 예: "캠 컴파운드" → `Ã¬ÂºÂ¡ ...` 형태 (재Import 후에도 DB·화면에 남는 경우 대비)
 */

const MOJIBAKE_HINT = /[ÂÃ¬¼½¾¿]/;

function allCodeUnitsFitLatin1(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 255) return false;
  }
  return true;
}

/**
 * 한 번: code unit → 바이트 → UTF-8 디코드
 * @param maxPasses 이중·삼중 깨짐에 대비 (보통 1~2)
 */
export function repairUtf8Mojibake(input: string, maxPasses = 3): string {
  if (!input || input.length < 2) return input;

  let cur = input;
  for (let pass = 0; pass < maxPasses; pass++) {
    if (!allCodeUnitsFitLatin1(cur)) return cur;
    if (!MOJIBAKE_HINT.test(cur) && !/[\x80-\xff]/.test(cur)) return cur;

    const bytes = new Uint8Array(cur.length);
    for (let i = 0; i < cur.length; i++) {
      bytes[i] = cur.charCodeAt(i) & 0xff;
    }
    let next: string;
    try {
      next = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
      return cur;
    }
    if (next.includes('\uFFFD')) return cur;
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

/** WorksheetState 등 JSON 직렬화 가능한 트리의 모든 문자열에 복구 적용 */
export function deepRepairUtf8Mojibake<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return repairUtf8Mojibake(value) as T;
  if (Array.isArray(value)) {
    return value.map((x) => deepRepairUtf8Mojibake(x)) as T;
  }
  if (typeof value === 'object') {
    if (value instanceof Date) return value;
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      out[k] = deepRepairUtf8Mojibake(o[k]);
    }
    return out as T;
  }
  return value;
}
