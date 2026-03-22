import { v4 as uuidv4 } from 'uuid';
import type { ParseResult } from '../excel-parser';
import type { ImportedFlatData } from '../types';
import { assignParentsByRowSpan } from './parentItemId-mapper';
import { normalizeScope } from '@/lib/fmea/scope-constants';

function withMeta(
  base: ImportedFlatData,
  meta?: { excelRow?: number; excelCol?: number; mergeGroupId?: string; rowSpan?: number },
  orderIndex = 0,
): ImportedFlatData {
  if (!meta) return { ...base, orderIndex };
  return {
    ...base,
    orderIndex,
    excelRow: meta.excelRow,
    excelCol: meta.excelCol,
    mergeGroupId: meta.mergeGroupId,
    rowSpan: meta.rowSpan,
  };
}

export function convertLegacyParseResultToFlatData(result: ParseResult): ImportedFlatData[] {
  const flat: ImportedFlatData[] = [];
  const b1IdMap = new Map<string, string>();
  const now = new Date();

  const findB1Uuid = (pNo: string, weName: string | undefined, m4: string): string | undefined => {
    if (weName) {
      const exactKey = `${pNo}|${m4}|${weName}`;
      const exact = b1IdMap.get(exactKey);
      if (exact) return exact;
      for (const [k, v] of b1IdMap) {
        if (k.startsWith(`${pNo}|`) && k.endsWith(`|${weName}`)) return v;
      }
    }
    for (const [k, v] of b1IdMap) {
      if (k.startsWith(`${pNo}|`)) return v;
    }
    return undefined;
  };

  for (const p of result.processes) {
    const meta = (code: string, i: number) => p.itemMeta?.[`${code}-${i}`];
    flat.push({ id: `${p.processNo}-A1`, processNo: p.processNo, category: 'A', itemCode: 'A1', value: p.processNo, createdAt: now });
    flat.push({ id: `${p.processNo}-A2`, processNo: p.processNo, category: 'A', itemCode: 'A2', value: p.processName, createdAt: now });
    if (p.processTypeCode) {
      flat.push({ id: `${p.processNo}-A0`, processNo: p.processNo, category: 'A', itemCode: 'A0', value: p.processTypeCode, createdAt: now });
    }

    p.processDesc.forEach((v, i) =>
      flat.push(withMeta({
        id: `${p.processNo}-A3-${i}`,
        processNo: p.processNo,
        category: 'A',
        itemCode: 'A3',
        value: v,
        parentItemId: `${p.processNo}-A1`,
        createdAt: now,
      }, meta('A3', i), i))
    );
    p.productChars.forEach((v, i) =>
      flat.push(withMeta({
        id: `${p.processNo}-A4-${i}`,
        processNo: p.processNo,
        category: 'A',
        itemCode: 'A4',
        value: v,
        specialChar: p.productCharsSpecialChar?.[i] || undefined,
        parentItemId: `${p.processNo}-A3-0`,
        createdAt: now,
      }, meta('A4', i), i))
    );
    p.failureModes.forEach((v, i) =>
      flat.push(withMeta({
        id: `${p.processNo}-A5-${i}`,
        processNo: p.processNo,
        category: 'A',
        itemCode: 'A5',
        value: v,
        parentItemId: `${p.processNo}-A4-0`,
        createdAt: now,
      }, meta('A5', i), i))
    );
    (p.detectionCtrls || []).forEach((v, i) => {
      if (!v?.trim()) return;
      flat.push(withMeta({
        id: `${p.processNo}-A6-${i}`,
        processNo: p.processNo,
        category: 'A',
        itemCode: 'A6',
        value: v,
        parentItemId: `${p.processNo}-A5-0`,
        createdAt: now,
      }, meta('A6', i), i));
    });

    p.workElements.forEach((v, i) => {
      const b1Uuid = uuidv4();
      const m4 = p.workElements4M?.[i] || '';
      b1IdMap.set(`${p.processNo}|${m4}|${v}`, b1Uuid);
      flat.push(withMeta({
        id: b1Uuid,
        processNo: p.processNo,
        category: 'B',
        itemCode: 'B1',
        value: v,
        m4,
        parentItemId: `${p.processNo}-A1`,
        createdAt: now,
      }, meta('B1', i), i));
    });
    p.elementFuncs.forEach((v, i) =>
      flat.push(withMeta({
        id: `${p.processNo}-B2-${i}`,
        processNo: p.processNo,
        category: 'B',
        itemCode: 'B2',
        value: v,
        m4: p.elementFuncs4M?.[i] || '',
        belongsTo: p.elementFuncsWE?.[i] || undefined,
        parentItemId: findB1Uuid(p.processNo, p.elementFuncsWE?.[i], p.elementFuncs4M?.[i] || ''),
        createdAt: now,
      }, meta('B2', i), i))
    );
    p.processChars.forEach((v, i) =>
      flat.push(withMeta({
        id: `${p.processNo}-B3-${i}`,
        processNo: p.processNo,
        category: 'B',
        itemCode: 'B3',
        value: v,
        m4: p.processChars4M?.[i] || '',
        specialChar: p.processCharsSpecialChar?.[i] || undefined,
        belongsTo: p.processCharsWE?.[i] || undefined,
        parentItemId: findB1Uuid(p.processNo, p.processCharsWE?.[i], p.processChars4M?.[i] || ''),
        createdAt: now,
      }, meta('B3', i), i))
    );
    p.failureCauses.forEach((v, i) =>
      flat.push(withMeta({
        id: `${p.processNo}-B4-${i}`,
        processNo: p.processNo,
        category: 'B',
        itemCode: 'B4',
        value: v,
        m4: p.failureCauses4M?.[i] || '',
        belongsTo: p.failureCausesWE?.[i] || undefined,
        parentItemId: findB1Uuid(p.processNo, p.failureCausesWE?.[i], p.failureCauses4M?.[i] || ''),
        createdAt: now,
      }, meta('B4', i), i))
    );
    (p.preventionCtrls || []).forEach((v, i) => {
      if (!v?.trim()) return;
      flat.push(withMeta({
        id: `${p.processNo}-B5-${i}`,
        processNo: p.processNo,
        category: 'B',
        itemCode: 'B5',
        value: v,
        m4: p.preventionCtrls4M?.[i] || '',
        parentItemId: `${p.processNo}-B4-0`,
        createdAt: now,
      }, meta('B5', i), i));
    });
  }

  for (const p of result.products) {
    const categoryValue = normalizeScope(p.productProcessName) || 'YP';
    const meta = (code: string, i: number) => p.itemMeta?.[`${code}-${i}`];
    flat.push({ id: `C1-${categoryValue}`, processNo: categoryValue, category: 'C', itemCode: 'C1', value: categoryValue, createdAt: now });
    p.productFuncs.forEach((v, i) =>
      flat.push(withMeta({
        id: `C2-${categoryValue}-${i}`,
        processNo: categoryValue,
        category: 'C',
        itemCode: 'C2',
        value: v,
        parentItemId: `C1-${categoryValue}`,
        createdAt: now,
      }, meta('C2', i), i))
    );
    p.requirements.forEach((v, i) =>
      flat.push(withMeta({
        id: `C3-${categoryValue}-${i}`,
        processNo: categoryValue,
        category: 'C',
        itemCode: 'C3',
        value: v,
        createdAt: now,
      }, meta('C3', i), i))
    );
    p.failureEffects.forEach((v, i) =>
      flat.push(withMeta({
        id: `C4-${categoryValue}-${i}`,
        processNo: categoryValue,
        category: 'C',
        itemCode: 'C4',
        value: v,
        createdAt: now,
      }, meta('C4', i), i))
    );
  }

  const assignPairs: Array<{ parentCode: string; childCode: string }> = [
    { parentCode: 'A3', childCode: 'A4' },
    { parentCode: 'A4', childCode: 'A5' },
    { parentCode: 'C2', childCode: 'C3' },
    { parentCode: 'C3', childCode: 'C4' },
  ];

  for (const { parentCode, childCode } of assignPairs) {
    const parents = flat.filter(it => it.itemCode === parentCode).map(it => ({
      id: it.id,
      excelRow: it.excelRow,
      rowSpan: it.rowSpan,
      processNo: it.processNo,
    }));
    const children = flat.filter(it => it.itemCode === childCode).map(it => ({
      id: it.id,
      excelRow: it.excelRow,
      processNo: it.processNo,
    }));
    const map = assignParentsByRowSpan(parents, children);
    for (const item of flat) {
      if (item.itemCode === childCode && map.has(item.id)) {
        item.parentItemId = map.get(item.id);
      }
    }
  }

  return flat;
}
