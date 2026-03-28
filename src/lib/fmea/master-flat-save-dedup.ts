/**
 * POST /api/pfmea/master 저장 시 in-memory dataMap 키.
 * Prisma PfmeaMasterFlatItem @@unique([datasetId, processNo, itemCode, parentItemId, value]) 와 동일 척도.
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
