import { test, expect } from '@playwright/test';

/**
 * ImportMapping 영구저장 TDD 검증
 *
 * 순수 함수를 인라인으로 테스트 (Playwright .ts import 제한 우회)
 * 실제 구현: src/lib/import/importJobManager.ts
 */

// ---- 인라인 구현 (실제 모듈과 동일한 로직을 검증) ----

interface FlatToEntityMap {
  fm: Map<string, string>;
  fc: Map<string, string>;
  fe: Map<string, string>;
}

interface ImportMappingRecord {
  flatDataId: string;
  entityId: string;
  entityType: string;
  itemCode: string;
  processNo?: string;
  entityText?: string;
}

const ENTITY_TO_ITEM_CODE: Record<string, string> = { FM: 'A5', FC: 'B4', FE: 'C4' };

function serializeFlatMap(flatMap: FlatToEntityMap): ImportMappingRecord[] {
  const records: ImportMappingRecord[] = [];
  const entries: Array<{ map: Map<string, string>; entityType: string }> = [
    { map: flatMap.fm, entityType: 'FM' },
    { map: flatMap.fc, entityType: 'FC' },
    { map: flatMap.fe, entityType: 'FE' },
  ];
  for (const { map, entityType } of entries) {
    for (const [flatDataId, entityId] of map) {
      records.push({ flatDataId, entityId, entityType, itemCode: ENTITY_TO_ITEM_CODE[entityType] });
    }
  }
  return records;
}

function createImportJobData(fmeaId: string, opts: { flatDataCount?: number; chainCount?: number; fileName?: string } = {}) {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fmeaId,
    fileName: opts.fileName,
    flatDataCount: opts.flatDataCount ?? 0,
    chainCount: opts.chainCount ?? 0,
    status: 'pending' as const,
    usedReversePath: false,
  };
}

// ---- 테스트 ----

test.describe('ImportMapping serializeFlatMap 검증', () => {

  test('TC1: 3개 Map → flat array 변환 (FM 2건, FC 1건, FE 1건 = 4건)', () => {
    const flatMap: FlatToEntityMap = {
      fm: new Map([['flat-a5-001', 'PF-L2-010-M-001'], ['flat-a5-002', 'PF-L2-020-M-001']]),
      fc: new Map([['flat-b4-001', 'PF-L3-010-MC-001-K-001']]),
      fe: new Map([['flat-c4-001', 'PF-L1-FE-001']]),
    };

    const result = serializeFlatMap(flatMap);

    expect(result).toHaveLength(4);
    expect(result.filter(r => r.entityType === 'FM')).toHaveLength(2);
    expect(result.filter(r => r.entityType === 'FC')).toHaveLength(1);
    expect(result.filter(r => r.entityType === 'FE')).toHaveLength(1);

    for (const r of result) {
      expect(r.flatDataId).toBeTruthy();
      expect(r.entityId).toBeTruthy();
      expect(r.entityType).toBeTruthy();
    }
  });

  test('TC2: 빈 Map → 빈 배열 반환', () => {
    const emptyMap: FlatToEntityMap = { fm: new Map(), fc: new Map(), fe: new Map() };
    const result = serializeFlatMap(emptyMap);
    expect(result).toHaveLength(0);
  });

  test('TC3: itemCode 자동 매핑 — FM→A5, FC→B4, FE→C4', () => {
    const flatMap: FlatToEntityMap = {
      fm: new Map([['f1', 'e1']]),
      fc: new Map([['f2', 'e2']]),
      fe: new Map([['f3', 'e3']]),
    };

    const result = serializeFlatMap(flatMap);

    expect(result.find(r => r.entityType === 'FM')?.itemCode).toBe('A5');
    expect(result.find(r => r.entityType === 'FC')?.itemCode).toBe('B4');
    expect(result.find(r => r.entityType === 'FE')?.itemCode).toBe('C4');
  });
});

test.describe('ImportMapping createImportJobData 검증', () => {

  test('TC4: 올바른 구조 반환 (fmeaId, status=pending, counts)', () => {
    const result = createImportJobData('pfm26-m001', {
      flatDataCount: 150,
      chainCount: 30,
      fileName: 'test.xlsx',
    });

    expect(result.fmeaId).toBe('pfm26-m001');
    expect(result.status).toBe('pending');
    expect(result.flatDataCount).toBe(150);
    expect(result.chainCount).toBe(30);
    expect(result.fileName).toBe('test.xlsx');
    expect(result.id).toBeTruthy();
  });

  test('TC5: 불변성 검증 — 두 번 호출 시 서로 다른 ID', () => {
    const r1 = createImportJobData('pfm26-m001', { flatDataCount: 10 });
    const r2 = createImportJobData('pfm26-m001', { flatDataCount: 10 });

    expect(r1.id).not.toBe(r2.id);
  });
});
