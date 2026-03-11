/**
 * @file lightweight-filter.test.ts
 * @description stripHeavyItemCodes TDD 검증
 * 수동/자동 모드 경량화: A6(검출관리)/B5(예방관리) 제거
 */

import { stripHeavyItemCodes, isLightweightData } from '../app/(fmea-core)/pfmea/import/utils/lightweight-filter';

const mkItem = (itemCode: string, value: string) => ({
  id: `t-${itemCode}`,
  processNo: '10',
  category: itemCode.charAt(0) as 'A' | 'B' | 'C',
  itemCode,
  value,
  createdAt: new Date(),
});

describe('stripHeavyItemCodes', () => {
  it('A6 항목을 제거한다', () => {
    const data = [mkItem('A1', '10'), mkItem('A6', '외관검사')];
    const result = stripHeavyItemCodes(data);
    expect(result).toHaveLength(1);
    expect(result[0].itemCode).toBe('A1');
  });

  it('B5 항목을 제거한다', () => {
    const data = [mkItem('B1', '운전자'), mkItem('B5', '교육 훈련')];
    const result = stripHeavyItemCodes(data);
    expect(result).toHaveLength(1);
    expect(result[0].itemCode).toBe('B1');
  });

  it('A1-A5, B1-B4, C1-C4는 유지한다', () => {
    const data = [
      mkItem('A1', '10'), mkItem('A2', '절단'), mkItem('A3', '기능'),
      mkItem('A4', '특성'), mkItem('A5', '고장'),
      mkItem('B1', '운전자'), mkItem('B2', '기능'), mkItem('B3', '특성'), mkItem('B4', '원인'),
      mkItem('C1', 'YP'), mkItem('C2', '제품기능'), mkItem('C3', '요구사항'), mkItem('C4', '영향'),
    ];
    const result = stripHeavyItemCodes(data);
    expect(result).toHaveLength(13);
    expect(result.map(d => d.itemCode)).toEqual([
      'A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4',
    ]);
  });

  it('A6 + B5 동시 제거', () => {
    const data = [
      mkItem('A1', '10'), mkItem('A6', '비전검사'),
      mkItem('B1', '운전자'), mkItem('B5', 'SPC'),
    ];
    const result = stripHeavyItemCodes(data);
    expect(result).toHaveLength(2);
    expect(result.map(d => d.itemCode)).toEqual(['A1', 'B1']);
  });

  it('빈 배열은 빈 배열 반환', () => {
    expect(stripHeavyItemCodes([])).toEqual([]);
  });
});

describe('isLightweightData', () => {
  it('A6/B5 없으면 true', () => {
    const data = [mkItem('A1', '10'), mkItem('B1', '운전자')];
    expect(isLightweightData(data)).toBe(true);
  });

  it('A6 있으면 false', () => {
    const data = [mkItem('A1', '10'), mkItem('A6', '검사')];
    expect(isLightweightData(data)).toBe(false);
  });

  it('B5 있으면 false', () => {
    const data = [mkItem('B1', '운전자'), mkItem('B5', '교육')];
    expect(isLightweightData(data)).toBe(false);
  });

  it('빈 배열은 true', () => {
    expect(isLightweightData([])).toBe(true);
  });
});
