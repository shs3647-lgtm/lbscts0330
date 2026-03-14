/**
 * @file v3-remove-a6-b5.test.ts
 * @description A6(검출관리)/B5(예방관리) Import 아키텍처 검증
 *
 * ★ 2026-03-14 아키텍처 변경:
 *   - v3.0 계획(A6/B5 제거) 철회 → A6/B5 Import 유지
 *   - LEVEL_ITEM_CODES에 A6/B5 포함 (L2-6, L3-5 시트 지원)
 *   - FC 체인 우선, 템플릿 폴백, inferDC/inferPC 3단계 소스 우선순위
 *
 * @created 2026-02-28
 * @updated 2026-03-14 — 아키텍처 변경 반영
 */

import { describe, it, expect } from 'vitest';

describe('types.ts — A6/B5 Import 상수 검증', () => {

  it('LEVEL_ITEM_CODES.L2에 A6이 포함되어야 함', async () => {
    const { LEVEL_ITEM_CODES } = await import('@/app/(fmea-core)/pfmea/import/types');
    expect(LEVEL_ITEM_CODES.L2).toContain('A6');
    expect(LEVEL_ITEM_CODES.L2).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
  });

  it('LEVEL_ITEM_CODES.L3에 B5가 포함되어야 함', async () => {
    const { LEVEL_ITEM_CODES } = await import('@/app/(fmea-core)/pfmea/import/types');
    expect(LEVEL_ITEM_CODES.L3).toContain('B5');
    expect(LEVEL_ITEM_CODES.L3).toEqual(['B1', 'B2', 'B3', 'B4', 'B5']);
  });

  it('FAILURE_ITEM_CODES에 PC/DC 키가 없어야 함', async () => {
    const { FAILURE_ITEM_CODES } = await import('@/app/(fmea-core)/pfmea/import/types');
    expect('PC' in FAILURE_ITEM_CODES).toBe(false);
    expect('DC' in FAILURE_ITEM_CODES).toBe(false);
    expect(Object.keys(FAILURE_ITEM_CODES).sort()).toEqual(['FC', 'FE', 'FM']);
  });

  it('ITEM_CODE_LABELS에 A6/B5 label이 존재해야 함', async () => {
    const { ITEM_CODE_LABELS } = await import('@/app/(fmea-core)/pfmea/import/types');
    expect(ITEM_CODE_LABELS['A6']).toBe('검출관리');
    expect(ITEM_CODE_LABELS['B5']).toBe('예방관리');
  });
});

describe('sampleData.ts — PREVIEW_OPTIONS A6/B5 제외 유지', () => {

  it('sampleData.ts PREVIEW_OPTIONS에 A6/B5 없어야 함 (리스크 탭 전용)', async () => {
    const { PREVIEW_OPTIONS } = await import('@/app/(fmea-core)/pfmea/import/sampleData');
    const values = PREVIEW_OPTIONS.map((o: { value: string }) => o.value);
    expect(values).not.toContain('A6');
    expect(values).not.toContain('B5');
  });
});

describe('excel-parser-utils.ts — A6/B5 시트명 매핑', () => {

  it('기존 A1~A5, B1~B4 매핑은 정상 동작해야 함', async () => {
    const { normalizeSheetName } = await import('@/app/(fmea-core)/pfmea/import/excel-parser-utils');
    expect(normalizeSheetName('L2-5(A5) 고장형태')).toBe('A5');
    expect(normalizeSheetName('L3-4(B4) 고장원인')).toBe('B4');
    expect(normalizeSheetName('L1-4(C4) 고장영향')).toBe('C4');
  });
});
