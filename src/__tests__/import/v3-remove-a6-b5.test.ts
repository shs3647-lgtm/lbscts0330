/**
 * @file v3-remove-a6-b5.test.ts
 * @description TDD: v3.0 A6(검출관리)/B5(예방관리) IMPORT 제외 검증
 *
 * v3.0 핵심 변경: A6/B5는 IMPORT에서 완전 제거 → 리스크 탭에서 입력
 * - LEVEL_ITEM_CODES에서 A6/B5 제거
 * - FAILURE_ITEM_CODES에서 PC/DC 제거
 * - PREVIEW_OPTIONS에서 A6/B5 탭 제거
 * - SAMPLE_DATA에서 A6/B5 항목 제거
 * - SHEET_NAME_MAP에서 A6/B5 매핑 제거
 * - MasterFailureChain에서 pcValue/dcValue 제거
 *
 * @created 2026-02-28
 */

import { describe, it, expect } from 'vitest';

// ── TODO-1: types.ts 상수 검증 ──

describe('v3.0 TODO-1: types.ts — A6/B5 상수 제거', () => {

  it('LEVEL_ITEM_CODES.L2 에 A6이 없어야 함', async () => {
    const { LEVEL_ITEM_CODES } = await import('@/app/(fmea-core)/pfmea/import/types');
    expect(LEVEL_ITEM_CODES.L2).not.toContain('A6');
    // A1~A5 만 포함
    expect(LEVEL_ITEM_CODES.L2).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
  });

  it('LEVEL_ITEM_CODES.L3 에 B5가 없어야 함', async () => {
    const { LEVEL_ITEM_CODES } = await import('@/app/(fmea-core)/pfmea/import/types');
    expect(LEVEL_ITEM_CODES.L3).not.toContain('B5');
    // B1~B4 만 포함
    expect(LEVEL_ITEM_CODES.L3).toEqual(['B1', 'B2', 'B3', 'B4']);
  });

  it('FAILURE_ITEM_CODES에 PC/DC 키가 없어야 함', async () => {
    const { FAILURE_ITEM_CODES } = await import('@/app/(fmea-core)/pfmea/import/types');
    expect('PC' in FAILURE_ITEM_CODES).toBe(false);
    expect('DC' in FAILURE_ITEM_CODES).toBe(false);
    // FM, FC, FE만 남아야 함
    expect(Object.keys(FAILURE_ITEM_CODES).sort()).toEqual(['FC', 'FE', 'FM']);
  });

  it('ITEM_CODE_LABELS에 A6/B5 label이 존재해야 함 (STEP B 전처리 지원)', async () => {
    const { ITEM_CODE_LABELS } = await import('@/app/(fmea-core)/pfmea/import/types');
    expect(ITEM_CODE_LABELS['A6']).toBe('검출관리');
    expect(ITEM_CODE_LABELS['B5']).toBe('예방관리');
    // L2-6/L3-5 시트명 형식은 여전히 불필요
    expect('L2-6' in ITEM_CODE_LABELS).toBe(false);
    expect('L3-5' in ITEM_CODE_LABELS).toBe(false);
  });

  it('SHEET_TO_CODE_MAP에 A6/B5 매핑이 없어야 함', async () => {
    const { SHEET_TO_CODE_MAP } = await import('@/app/(fmea-core)/pfmea/import/types');
    expect('L2-6' in SHEET_TO_CODE_MAP).toBe(false);
    expect('L3-5' in SHEET_TO_CODE_MAP).toBe(false);
  });

  it('CODE_TO_SHEET_MAP에 A6/B5 매핑이 없어야 함', async () => {
    const { CODE_TO_SHEET_MAP } = await import('@/app/(fmea-core)/pfmea/import/types');
    expect('A6' in CODE_TO_SHEET_MAP).toBe(false);
    expect('B5' in CODE_TO_SHEET_MAP).toBe(false);
  });
});

// ── TODO-2: constants.ts PREVIEW_OPTIONS 검증 ──

describe('v3.0 TODO-2: constants.ts — PREVIEW_OPTIONS A6/B5 제거', () => {

  it('constants.ts PREVIEW_OPTIONS에 A6이 없어야 함', async () => {
    const { PREVIEW_OPTIONS } = await import('@/app/(fmea-core)/pfmea/import/constants');
    const values = PREVIEW_OPTIONS.map((o: { value: string }) => o.value);
    expect(values).not.toContain('A6');
  });

  it('constants.ts PREVIEW_OPTIONS에 B5가 없어야 함', async () => {
    const { PREVIEW_OPTIONS } = await import('@/app/(fmea-core)/pfmea/import/constants');
    const values = PREVIEW_OPTIONS.map((o: { value: string }) => o.value);
    expect(values).not.toContain('B5');
  });

  it('constants.ts PREVIEW_OPTIONS = 13개 (15개 시트 중 A2는 A1에 포함)', async () => {
    const { PREVIEW_OPTIONS } = await import('@/app/(fmea-core)/pfmea/import/constants');
    // A1~A5(5) + B1~B4(4) + C1~C4(4) = 13개
    expect(PREVIEW_OPTIONS.length).toBe(13);
  });

  it('constants.ts SAMPLE_DATA에 A6/B5 항목 없어야 함', async () => {
    const { SAMPLE_DATA } = await import('@/app/(fmea-core)/pfmea/import/constants');
    const a6Items = SAMPLE_DATA.filter((d: { itemCode: string }) => d.itemCode === 'A6');
    const b5Items = SAMPLE_DATA.filter((d: { itemCode: string }) => d.itemCode === 'B5');
    expect(a6Items.length).toBe(0);
    expect(b5Items.length).toBe(0);
  });
});

// ── TODO-3: sampleData.ts 검증 ──

describe('v3.0 TODO-3: sampleData.ts — A6/B5 샘플 데이터 제거', () => {

  it('sampleData.ts SAMPLE_DATA에 A6 항목 없어야 함', async () => {
    const { SAMPLE_DATA } = await import('@/app/(fmea-core)/pfmea/import/sampleData');
    const a6Items = SAMPLE_DATA.filter((d: { itemCode: string }) => d.itemCode === 'A6');
    expect(a6Items.length).toBe(0);
  });

  it('sampleData.ts SAMPLE_DATA에 B5 항목 없어야 함', async () => {
    const { SAMPLE_DATA } = await import('@/app/(fmea-core)/pfmea/import/sampleData');
    const b5Items = SAMPLE_DATA.filter((d: { itemCode: string }) => d.itemCode === 'B5');
    expect(b5Items.length).toBe(0);
  });

  it('sampleData.ts PREVIEW_OPTIONS에 A6/B5 없어야 함', async () => {
    const { PREVIEW_OPTIONS } = await import('@/app/(fmea-core)/pfmea/import/sampleData');
    const values = PREVIEW_OPTIONS.map((o: { value: string }) => o.value);
    expect(values).not.toContain('A6');
    expect(values).not.toContain('B5');
  });
});

// ── TODO-5: excel-parser-utils.ts 검증 ──

describe('v3.0 TODO-5: excel-parser-utils.ts — A6/B5 시트 매핑 제거', () => {

  it('normalizeSheetName("L2-6")이 null을 반환해야 함 (A6 매핑 제거)', async () => {
    const { normalizeSheetName } = await import('@/app/(fmea-core)/pfmea/import/excel-parser-utils');
    expect(normalizeSheetName('L2-6')).toBeNull();
    expect(normalizeSheetName('L2-6 검출관리')).toBeNull();
    expect(normalizeSheetName('L2-6(A6) 검출관리')).toBeNull();
  });

  it('normalizeSheetName("L3-5")이 null을 반환해야 함 (B5 매핑 제거)', async () => {
    const { normalizeSheetName } = await import('@/app/(fmea-core)/pfmea/import/excel-parser-utils');
    expect(normalizeSheetName('L3-5')).toBeNull();
    expect(normalizeSheetName('L3-5 예방관리')).toBeNull();
    expect(normalizeSheetName('L3-5(B5) 예방관리')).toBeNull();
  });

  it('기존 A1~A5, B1~B4 매핑은 정상 동작해야 함', async () => {
    const { normalizeSheetName } = await import('@/app/(fmea-core)/pfmea/import/excel-parser-utils');
    expect(normalizeSheetName('L2-5(A5) 고장형태')).toBe('A5');
    expect(normalizeSheetName('L3-4(B4) 고장원인')).toBe('B4');
    expect(normalizeSheetName('L1-4(C4) 고장영향')).toBe('C4');
  });
});
