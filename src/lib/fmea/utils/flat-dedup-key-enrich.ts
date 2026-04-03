/**
 * 레거시/워크시트 역변환 등 `dedupKey`가 비어 있는 ImportedFlatData에 Phase 3 복합키를 채운다.
 * 이미 `dedupKey`가 있으면 유지 (위치기반 atomicToFlatData 등).
 *
 * @see docs/FMEA Import UUID복합키FKparentId 재설계 적용.md
 */

import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import {
  dedupKey_FL_FC,
  dedupKey_FL_FE,
  dedupKey_FL_FM,
  dedupKey_FN_L1,
  dedupKey_FN_L2,
  dedupKey_FN_L3,
  dedupKey_ST_L1,
  dedupKey_ST_L2,
  dedupKey_ST_L3,
  normalize as dedupNormalize,
} from '@/lib/fmea/utils/dedup-key';

function resolveStL1Root(flat: ImportedFlatData[]): string {
  const c1WithParent = flat.find((r) => r.itemCode === 'C1' && r.parentItemId);
  if (c1WithParent?.parentItemId) return c1WithParent.parentItemId;
  const c2 = flat.find((r) => r.itemCode === 'C2' && r.parentItemId);
  if (c2?.parentItemId) return c2.parentItemId;
  return 'WS-L1-ROOT';
}

function a1IdForProcessNo(flat: ImportedFlatData[], processNo: string): string | undefined {
  const p = processNo.trim();
  return flat.find((r) => r.itemCode === 'A1' && (r.processNo || '').trim() === p)?.id;
}

function l3FuncIdFromB4Parent(
  parentItemId: string | undefined,
  byId: Map<string, ImportedFlatData>
): string | undefined {
  if (!parentItemId) return undefined;
  if (parentItemId.endsWith('-B3')) {
    return parentItemId.slice(0, -4);
  }
  const p = byId.get(parentItemId);
  if (p?.itemCode === 'B3') {
    return p.parentItemId || undefined;
  }
  return undefined;
}

function buildDedupKeyForRow(
  row: ImportedFlatData,
  flat: ImportedFlatData[],
  byId: Map<string, ImportedFlatData>,
  stL1: string
): string | undefined {
  const pno = row.processNo ?? '';

  switch (row.itemCode) {
    case 'C1':
      return dedupKey_ST_L1(stL1, row.value);
    case 'C2': {
      const c1 = row.parentItemId ? byId.get(row.parentItemId) : undefined;
      const cat = (c1?.value ?? pno).trim();
      const c3 = flat.find((r) => r.itemCode === 'C3' && r.parentItemId === row.id);
      const req = c3?.value ?? '';
      const base = dedupKey_FN_L1(stL1, cat, row.value) + '::req::' + dedupNormalize(req);
      return `${base}::C2`;
    }
    case 'C3': {
      const c2 = row.parentItemId ? byId.get(row.parentItemId) : undefined;
      if (!c2 || c2.itemCode !== 'C2') return undefined;
      const c1 = c2.parentItemId ? byId.get(c2.parentItemId) : undefined;
      const cat = (c1?.value ?? pno).trim();
      const base = dedupKey_FN_L1(stL1, cat, c2.value) + '::req::' + dedupNormalize(row.value);
      return `${base}::C3`;
    }
    case 'C4': {
      const c3 = row.parentItemId ? byId.get(row.parentItemId) : undefined;
      const c2 = c3?.parentItemId ? byId.get(c3.parentItemId) : undefined;
      const fnKey = c2?.id ?? row.parentItemId ?? 'L1F';
      return dedupKey_FL_FE(fnKey, row.value);
    }
    case 'A1':
    case 'A2':
      return dedupKey_ST_L2(stL1, pno);
    case 'A3': {
      const a1 = row.parentItemId ? byId.get(row.parentItemId) : undefined;
      const st2 = a1?.id ?? stL1;
      return dedupKey_FN_L2(st2, row.value, '__A3__');
    }
    case 'A4': {
      const parent = row.parentItemId ? byId.get(row.parentItemId) : undefined;
      const st2 =
        parent?.itemCode === 'A1'
          ? parent.id
          : parent?.itemCode === 'A3'
            ? (() => {
                const a1 = parent.parentItemId ? byId.get(parent.parentItemId) : undefined;
                return a1?.id ?? stL1;
              })()
            : stL1;
      const fnName = parent?.itemCode === 'A3' ? parent.value : '__EMPTY__';
      return dedupKey_FN_L2(st2, fnName, row.id);
    }
    case 'A5': {
      const a4 = row.parentItemId ? byId.get(row.parentItemId) : undefined;
      const fmParent = a4?.itemCode === 'A4' && a4.parentItemId ? byId.get(a4.parentItemId) : undefined;
      const l2FuncId =
        fmParent?.itemCode === 'A3' ? fmParent.id : (a4?.id ?? row.parentItemId ?? row.id);
      return dedupKey_FL_FM(l2FuncId, row.value);
    }
    case 'A6': {
      const pid = row.parentItemId ?? row.id;
      return `${pid}::A6::${dedupNormalize(row.value)}`;
    }
    case 'B1': {
      const st2 = a1IdForProcessNo(flat, pno) ?? stL1;
      return dedupKey_ST_L3(st2, row.m4 || '', row.value);
    }
    case 'B2': {
      const b1 = row.parentItemId ? byId.get(row.parentItemId) : undefined;
      const l3s = b1?.id ?? row.parentItemId ?? 'L3S';
      return dedupKey_FN_L3(l3s, row.value, '__B2__');
    }
    case 'B3': {
      const b2 = row.parentItemId ? byId.get(row.parentItemId) : undefined;
      const b1 = b2?.parentItemId ? byId.get(b2.parentItemId) : undefined;
      const l3s = b1?.id ?? 'L3S';
      const fn = b2?.value ?? '';
      return dedupKey_FN_L3(l3s, fn, row.value);
    }
    case 'SC': {
      const b2 = row.parentItemId ? byId.get(row.parentItemId) : undefined;
      const b1 = b2?.parentItemId ? byId.get(b2.parentItemId) : undefined;
      const l3s = b1?.id ?? 'L3S';
      const fn = b2?.value ?? '';
      return dedupKey_FN_L3(l3s, fn, `SC:${row.value}`);
    }
    case 'B4': {
      const l3f = l3FuncIdFromB4Parent(row.parentItemId, byId);
      if (l3f) return dedupKey_FL_FC(l3f, row.value);
      return dedupKey_FL_FC(row.parentItemId ?? row.id, row.value);
    }
    case 'B5':
      return `${row.parentItemId ?? row.id}::B5::${dedupNormalize(row.value)}`;
    default:
      return undefined;
  }
}

/** flat 전체에 대해 `dedupKey` 누락 행만 채운 새 배열을 반환 */
export function enrichImportedFlatWithDedupKeys(flat: ImportedFlatData[]): ImportedFlatData[] {
  if (flat.length === 0) return flat;
  const byId = new Map(flat.map((r) => [r.id, r]));
  const stL1 = resolveStL1Root(flat);

  return flat.map((row) => {
    if (row.dedupKey) return row;
    const key = buildDedupKeyForRow(row, flat, byId, stL1);
    if (!key) return row;
    return { ...row, dedupKey: key };
  });
}
