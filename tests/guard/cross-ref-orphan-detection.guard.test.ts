/**
 * @file cross-ref-orphan-detection.guard.test.ts
 * @description Guard: cross-schema 참조 고아 감지 유틸이 올바르게 동작하는지 검증
 *
 * ★ TODO-04 재정의: UnifiedProcessItem/PfdItem/CpAtomicProcess의
 *   fmeaL2Id/fmeaL3Id/pfmeaL2Id/pfmeaL3Id는 같은 프로젝트 스키마 내
 *   L2/L3Structure를 참조하지만 @relation FK가 없음.
 *   이 테스트는 validateCrossSchemaRefs()가 고아 참조를 정확히 감지하는지 확인.
 */
import { describe, it, expect } from 'vitest';
import { validateCrossSchemaRefs } from '@/lib/validate-cross-refs';

describe('G-CROSSREF: cross-schema 참조 고아 감지', () => {
  // Mock prisma — L2/L3 findMany가 실제 존재하는 ID만 반환
  function makeMockPrisma(existingL2Ids: string[], existingL3Ids: string[]) {
    return {
      l2Structure: {
        findMany: async ({ where }: any) => {
          const ids: string[] = where.id.in;
          return ids.filter(id => existingL2Ids.includes(id)).map(id => ({ id }));
        },
      },
      l3Structure: {
        findMany: async ({ where }: any) => {
          const ids: string[] = where.id.in;
          return ids.filter(id => existingL3Ids.includes(id)).map(id => ({ id }));
        },
      },
    };
  }

  it('유효한 참조는 고아 0건 반환', async () => {
    const prisma = makeMockPrisma(['l2-001', 'l2-002'], ['l3-001']);
    const result = await validateCrossSchemaRefs(prisma, [
      { sourceModel: 'UnifiedProcessItem', sourceId: 'upi-1', fmeaL2Id: 'l2-001', fmeaL3Id: 'l3-001' },
      { sourceModel: 'PfdItem', sourceId: 'pfd-1', fmeaL2Id: 'l2-002', fmeaL3Id: null },
    ]);
    expect(result).toHaveLength(0);
  });

  it('삭제된 L2Structure를 참조하면 고아 감지', async () => {
    const prisma = makeMockPrisma(['l2-001'], ['l3-001']); // l2-DELETED 없음
    const result = await validateCrossSchemaRefs(prisma, [
      { sourceModel: 'CpAtomicProcess', sourceId: 'cp-1', fmeaL2Id: 'l2-DELETED', fmeaL3Id: 'l3-001' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sourceModel: 'CpAtomicProcess',
      sourceId: 'cp-1',
      field: 'fmeaL2Id',
      orphanId: 'l2-DELETED',
    });
  });

  it('삭제된 L3Structure를 참조하면 고아 감지', async () => {
    const prisma = makeMockPrisma(['l2-001'], []); // l3 전부 없음
    const result = await validateCrossSchemaRefs(prisma, [
      { sourceModel: 'PfdItem', sourceId: 'pfd-1', fmeaL2Id: 'l2-001', fmeaL3Id: 'l3-GONE' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('fmeaL3Id');
    expect(result[0].orphanId).toBe('l3-GONE');
  });

  it('L2+L3 동시 고아 시 2건 반환', async () => {
    const prisma = makeMockPrisma([], []);
    const result = await validateCrossSchemaRefs(prisma, [
      { sourceModel: 'UnifiedProcessItem', sourceId: 'upi-1', fmeaL2Id: 'l2-X', fmeaL3Id: 'l3-Y' },
    ]);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.field).sort()).toEqual(['fmeaL2Id', 'fmeaL3Id']);
  });

  it('null 참조는 검사 대상이 아님 (고아 0건)', async () => {
    const prisma = makeMockPrisma([], []);
    const result = await validateCrossSchemaRefs(prisma, [
      { sourceModel: 'PfdItem', sourceId: 'pfd-1', fmeaL2Id: null, fmeaL3Id: undefined },
    ]);
    expect(result).toHaveLength(0);
  });

  it('빈 입력 배열은 즉시 빈 배열 반환', async () => {
    const prisma = makeMockPrisma([], []);
    const result = await validateCrossSchemaRefs(prisma, []);
    expect(result).toHaveLength(0);
  });
});
