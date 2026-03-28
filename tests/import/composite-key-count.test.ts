import { describe, it, expect } from 'vitest';
import {
  countCompositeKeysByItemCode,
  countFlatRowsByItemCode,
  countAllFlatRowsByItemCode,
} from '@/app/(fmea-core)/pfmea/import/utils/import-verification-columns';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

function row(p: Partial<ImportedFlatData> & Pick<ImportedFlatData, 'id' | 'itemCode' | 'value'>): ImportedFlatData {
  return {
    processNo: '',
    category: 'C',
    createdAt: new Date(),
    rowSpan: 1,
    ...p,
  } as ImportedFlatData;
}

describe('countCompositeKeysByItemCode', () => {
  it('동일 값·동일 코드라도 parentItemId 다르면 복합키 2개', () => {
    const flat: ImportedFlatData[] = [
      row({ id: '1', itemCode: 'C3', value: '요구 동일', processNo: 'YP', parentItemId: 'lf-a' }),
      row({ id: '2', itemCode: 'C3', value: '요구 동일', processNo: 'YP', parentItemId: 'lf-b' }),
    ];
    expect(countFlatRowsByItemCode(flat).C3).toBe(2);
    expect(countCompositeKeysByItemCode(flat).C3).toBe(2);
  });

  it('동일 복합키면 flat 2행이어도 고유 키 1', () => {
    const flat: ImportedFlatData[] = [
      row({ id: '1', itemCode: 'A1', value: '10', processNo: '10' }),
      row({ id: '2', itemCode: 'A1', value: '10', processNo: '10' }),
    ];
    expect(countFlatRowsByItemCode(flat).A1).toBe(2);
    expect(countCompositeKeysByItemCode(flat).A1).toBe(1);
  });
});

describe('B3 빈 공정특성 (PG l3_functions 전체 행)', () => {
  it('countFlatRows·복합키가 빈 value B3도 1행으로 센다', () => {
    const flat: ImportedFlatData[] = [
      {
        processNo: '10',
        category: 'B',
        createdAt: new Date(),
        rowSpan: 1,
        id: 'lf-x-B3',
        itemCode: 'B3',
        value: '',
        parentItemId: 'lf-x',
      } as ImportedFlatData,
    ];
    expect(countFlatRowsByItemCode(flat).B3).toBe(1);
    expect(countCompositeKeysByItemCode(flat).B3).toBe(1);
  });
});

describe('countAllFlatRowsByItemCode', () => {
  it('빈 value 행도 itemCode 있으면 파싱 행으로 센다', () => {
    const flat: ImportedFlatData[] = [
      row({ id: '1', itemCode: 'B3', value: 'x' }),
      {
        processNo: '',
        category: 'B',
        createdAt: new Date(),
        rowSpan: 1,
        id: '2',
        itemCode: 'B3',
        value: '',
      } as ImportedFlatData,
    ];
    expect(countAllFlatRowsByItemCode(flat).B3).toBe(2);
    // B3는 빈 value도 검증 행으로 포함( PG l3_functions 1:1 )
    expect(countFlatRowsByItemCode(flat).B3).toBe(2);
  });

  it('C3·B2는 빈 value는 verify-counts와 맞춰 제외', () => {
    const flat: ImportedFlatData[] = [
      row({ id: 'c3a', itemCode: 'C3', value: '요구', processNo: 'YP', parentItemId: 'lf' }),
      row({ id: 'c3b', itemCode: 'C3', value: '', processNo: 'YP', parentItemId: 'lf' }),
      row({ id: 'b2a', itemCode: 'B2', value: '기능', processNo: '10', category: 'B', parentItemId: 'b1' }),
      row({ id: 'b2b', itemCode: 'B2', value: '', processNo: '10', category: 'B', parentItemId: 'b1' }),
    ];
    expect(countFlatRowsByItemCode(flat).C3).toBe(1);
    expect(countFlatRowsByItemCode(flat).B2).toBe(1);
    expect(countAllFlatRowsByItemCode(flat).C3).toBe(1);
  });

  it('id 없는 행은 파싱·UUID 집계에서 제외', () => {
    const flat: ImportedFlatData[] = [
      { processNo: '10', category: 'A', createdAt: new Date(), id: '', itemCode: 'A1', value: '10' } as ImportedFlatData,
      row({ id: 'ok', itemCode: 'A1', value: '20', processNo: '20', category: 'A' }),
    ];
    expect(countFlatRowsByItemCode(flat).A1).toBe(1);
  });
});
