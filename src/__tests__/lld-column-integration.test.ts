/**
 * @file lld-column-integration.test.ts
 * @description LLD(필터코드) 컬럼 통합 테스트
 *
 * 습득교훈(id:22) + Filter Code(id:221) → LLD(id:22) 1개 컬럼 통합 검증
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════
// PFMEA allTabConstants 검증
// ═══════════════════════════════════════════════════
describe('PFMEA allTabConstants - LLD 컬럼 통합', () => {
  it('LLD 컬럼이 존재해야 함 (id:22)', async () => {
    const { COLUMNS_BASE } = await import(
      '@/app/(fmea-core)/pfmea/worksheet/tabs/all/allTabConstants'
    );
    const lldCol = COLUMNS_BASE.find((c: { name: string }) => c.name === 'LLD');
    expect(lldCol).toBeDefined();
    expect(lldCol!.id).toBe(22);
    expect(lldCol!.step).toBe('리스크분석');
    expect(lldCol!.group).toBe('3. 리스크 평가');
  });

  it('습득교훈 컬럼이 더 이상 존재하지 않아야 함', async () => {
    const { COLUMNS_BASE } = await import(
      '@/app/(fmea-core)/pfmea/worksheet/tabs/all/allTabConstants'
    );
    const lessonCol = COLUMNS_BASE.find((c: { name: string }) => c.name === '습득교훈');
    expect(lessonCol).toBeUndefined();
  });

  it('Filter Code 컬럼이 더 이상 존재하지 않아야 함', async () => {
    const { COLUMNS_BASE } = await import(
      '@/app/(fmea-core)/pfmea/worksheet/tabs/all/allTabConstants'
    );
    const fcCol = COLUMNS_BASE.find((c: { name: string }) => c.name === 'Filter Code');
    expect(fcCol).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════
// DFMEA allTabConstants 검증
// ═══════════════════════════════════════════════════
describe('DFMEA allTabConstants - LLD 컬럼 통합', () => {
  it('LLD 컬럼이 존재해야 함 (id:22)', async () => {
    const { COLUMNS_BASE } = await import(
      '@/app/(fmea-core)/dfmea/worksheet/tabs/all/allTabConstants'
    );
    const lldCol = COLUMNS_BASE.find((c: { name: string }) => c.name === 'LLD');
    expect(lldCol).toBeDefined();
    expect(lldCol!.id).toBe(22);
  });

  it('습득교훈 컬럼이 더 이상 존재하지 않아야 함', async () => {
    const { COLUMNS_BASE } = await import(
      '@/app/(fmea-core)/dfmea/worksheet/tabs/all/allTabConstants'
    );
    const lessonCol = COLUMNS_BASE.find((c: { name: string }) => c.name === '습득교훈');
    expect(lessonCol).toBeUndefined();
  });
});
