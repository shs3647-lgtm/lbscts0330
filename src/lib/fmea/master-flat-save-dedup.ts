/**
 * POST /api/pfmea/master 저장 시 in-memory dataMap 키(사업 키) — id 없는 행·레거시용.
 */

export function pfmeaMasterFlatDataMapKey(d: {
  processNo?: string;
  itemCode?: string;
  value?: string;
  m4?: string;
  parentItemId?: string | null;
}): string {
  const processNo = String(d.processNo ?? '').trim();
  const itemCode = String(d.itemCode ?? '').trim().toUpperCase();
  const value = String(d.value ?? '').trim();
  const m4Part = (itemCode.startsWith('B') && d.m4) ? `|${String(d.m4).trim()}` : '';
  const pid = String(d.parentItemId ?? '').trim();
  return `${processNo}|${itemCode}|${value}${m4Part}|pid:${pid}`;
}

/**
 * Master POST dataMap 키 — flat `id`(Import UUID)가 있으면 그걸로만 구분.
 * 동일 C2·C3 표시문구·동일 C1 부모의 L1Function 다행이 사업 키로는 동일해 병합되던 문제 방지.
 */
export function pfmeaMasterFlatIncomingRowDedupKey(d: {
  id?: string | null;
  processNo?: string;
  itemCode?: string;
  value?: string;
  m4?: string;
  parentItemId?: string | null;
}): string {
  const rid = String(d.id ?? '').trim();
  if (rid) return `flatId:${rid}`;
  return pfmeaMasterFlatDataMapKey({
    processNo: d.processNo,
    itemCode: d.itemCode,
    value: d.value,
    m4: d.m4,
    parentItemId: d.parentItemId,
  });
}

/** replace 부분 삭제 후 잔존 행과의 중복 비교용 (value 소문자 정규화 유지) */
export function pfmeaMasterFlatExistingRowKey(e: {
  processNo: string;
  itemCode: string;
  value: string;
  m4?: string | null;
  parentItemId?: string | null;
}): string {
  const ic = String(e.itemCode || '').trim().toUpperCase();
  const m4Part = (ic.startsWith('B') && e.m4) ? `|${String(e.m4).trim()}` : '';
  const pid = String(e.parentItemId ?? '').trim();
  return `${e.processNo}|${ic}|${String(e.value || '').trim().toLowerCase()}${m4Part}|pid:${pid}`;
}
