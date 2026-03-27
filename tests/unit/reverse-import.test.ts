/**
 * @file reverse-import.test.ts
 * 역설계 Import 시스템 — 단위 테스트
 * 설계서: docs/REVERSE_ENGINEERING_IMPORT_SYSTEM.md §9, Phase 2
 *
 * vitest run tests/unit/reverse-import.test.ts
 */

import { describe, it, expect } from 'vitest';
import { assertFmeaId, assertSourceComplete, assertQueryResult } from '../../src/lib/fmea-core/guards';
import { remapFmeaId } from '../../src/lib/fmea-core/remap-fmeaid';
import { compareAtomicDBCounts, compareAtomicDBIds, verifyFKIntegrity } from '../../src/lib/fmea-core/compare-atomic';
import type { FullAtomicDB } from '../../src/lib/fmea-core/guards';

function makeTestDB(fmeaId: string, overrides?: Partial<FullAtomicDB>): FullAtomicDB {
  return {
    fmeaId,
    l1Structure: { id: 'l1-001', fmeaId, name: 'Test Product' },
    l2Structures: [
      { id: 'l2-001', fmeaId, l1Id: 'l1-001', no: '10', name: 'Process 1', order: 1 },
      { id: 'l2-002', fmeaId, l1Id: 'l1-001', no: '20', name: 'Process 2', order: 2 },
    ],
    l3Structures: [
      { id: 'l3-001', fmeaId, l1Id: 'l1-001', l2Id: 'l2-001', name: 'WE 1', m4: 'MC', order: 1 },
    ],
    l1Functions: [
      { id: 'l1f-001', fmeaId, l1StructId: 'l1-001', category: 'YP', functionName: 'Func 1', requirement: 'Req 1' },
    ],
    l2Functions: [
      { id: 'l2f-001', fmeaId, l2StructId: 'l2-001', functionName: 'PF 1', productChar: 'PC 1' },
    ],
    l3Functions: [
      { id: 'l3f-001', fmeaId, l3StructId: 'l3-001', l2StructId: 'l2-001', functionName: 'EF 1', processChar: 'PCh 1' },
    ],
    processProductChars: [],
    failureEffects: [
      { id: 'fe-001', fmeaId, l1FuncId: 'l1f-001', category: 'YP', effect: 'Effect 1', severity: 8 },
    ],
    failureModes: [
      { id: 'fm-001', fmeaId, l2FuncId: 'l2f-001', l2StructId: 'l2-001', mode: 'Mode 1' },
    ],
    failureCauses: [
      { id: 'fc-001', fmeaId, l3FuncId: 'l3f-001', l3StructId: 'l3-001', l2StructId: 'l2-001', cause: 'Cause 1', processCharId: 'l3f-001' },
    ],
    failureLinks: [
      { id: 'fl-001', fmeaId, fmId: 'fm-001', feId: 'fe-001', fcId: 'fc-001' },
    ],
    riskAnalyses: [
      { id: 'ra-001', fmeaId, linkId: 'fl-001', severity: 8, occurrence: 4, detection: 3, ap: 'M', preventionControl: 'PC1', detectionControl: 'DC1' },
    ],
    optimizations: [],
    ...overrides,
  };
}

// ═══ Guard 함수 테스트 ═══

describe('assertFmeaId', () => {
  it('유효한 fmeaId 통과', () => {
    expect(() => assertFmeaId('pfm26-m002')).not.toThrow();
    expect(() => assertFmeaId('test_123')).not.toThrow();
  });

  it('빈 문자열 거부', () => {
    expect(() => assertFmeaId('')).toThrow('[GUARD]');
  });

  it('특수문자 포함 거부', () => {
    expect(() => assertFmeaId('test; DROP TABLE')).toThrow('[GUARD]');
    expect(() => assertFmeaId('test<script>')).toThrow('[GUARD]');
  });
});

describe('assertQueryResult', () => {
  it('fmeaId 일치 시 통과', () => {
    const records = [{ fmeaId: 'test-001' }, { fmeaId: 'test-001' }];
    expect(() => assertQueryResult(records, 'test-001', 'TestTable')).not.toThrow();
  });

  it('fmeaId 불일치 시 에러', () => {
    const records = [{ fmeaId: 'test-001' }, { fmeaId: 'wrong-id' }];
    expect(() => assertQueryResult(records, 'test-001', 'TestTable')).toThrow('불일치');
  });
});

describe('assertSourceComplete', () => {
  it('완전한 데이터 통과', () => {
    const data = makeTestDB('test-001');
    expect(() => assertSourceComplete(data, 'test-001')).not.toThrow();
  });

  it('L1Structure 없으면 에러', () => {
    const data = makeTestDB('test-001', { l1Structure: null });
    expect(() => assertSourceComplete(data, 'test-001')).toThrow('L1Structure 없음');
  });

  it('FailureLink FK 깨지면 에러', () => {
    const data = makeTestDB('test-001', {
      failureLinks: [{ id: 'fl-001', fmeaId: 'test-001', fmId: 'MISSING', feId: 'fe-001', fcId: 'fc-001' }],
    });
    expect(() => assertSourceComplete(data, 'test-001')).toThrow('FK 깨짐');
  });
});

// ═══ remapFmeaId 테스트 ═══

describe('remapFmeaId', () => {
  it('fmeaId만 변경, UUID 유지', () => {
    const source = makeTestDB('source-001');
    const result = remapFmeaId(source, 'target-002');

    expect(result.fmeaId).toBe('target-002');
    expect(result.l2Structures[0].fmeaId).toBe('target-002');
    expect(result.l2Structures[0].id).toBe('l2-001'); // UUID 불변
    expect(result.failureLinks[0].fmId).toBe('fm-001'); // FK 불변
    expect(result.failureLinks[0].feId).toBe('fe-001');
    expect(result.failureLinks[0].fcId).toBe('fc-001');
  });

  it('원본 데이터 변경 없음 (immutable)', () => {
    const source = makeTestDB('source-001');
    const origId = source.l2Structures[0].fmeaId;
    remapFmeaId(source, 'target-002');
    expect(source.l2Structures[0].fmeaId).toBe(origId);
  });

  it('모든 테이블의 fmeaId 변환', () => {
    const source = makeTestDB('source-001');
    const result = remapFmeaId(source, 'target-002');

    const allRecords = [
      ...result.l2Structures,
      ...result.l3Structures,
      ...result.l1Functions,
      ...result.l2Functions,
      ...result.l3Functions,
      ...result.failureEffects,
      ...result.failureModes,
      ...result.failureCauses,
      ...result.failureLinks,
      ...result.riskAnalyses,
    ];

    for (const record of allRecords) {
      expect(record.fmeaId).toBe('target-002');
    }
  });
});

// ═══ compare 테스트 ═══

describe('compareAtomicDBCounts', () => {
  it('동일한 데이터 = allMatch true', () => {
    const a = makeTestDB('a');
    const b = makeTestDB('b');
    const result = compareAtomicDBCounts(a, b);
    expect(result.allMatch).toBe(true);
  });

  it('수량 불일치 = allMatch false', () => {
    const a = makeTestDB('a');
    const b = makeTestDB('b', { failureLinks: [] });
    const result = compareAtomicDBCounts(a, b);
    expect(result.allMatch).toBe(false);
    const flCheck = result.checks.find(c => c.entity === 'FailureLink');
    expect(flCheck?.match).toBe(false);
  });
});

describe('compareAtomicDBIds', () => {
  it('동일 ID = allMatch true', () => {
    const a = makeTestDB('a');
    const b = makeTestDB('b');
    const result = compareAtomicDBIds(a, b);
    expect(result.allMatch).toBe(true);
  });

  it('ID 누락 = details에 missing 표시', () => {
    const a = makeTestDB('a');
    const b = makeTestDB('b', {
      failureModes: [{ id: 'fm-DIFFERENT', fmeaId: 'b', l2FuncId: 'l2f-001', l2StructId: 'l2-001', mode: 'Mode X' }],
    });
    const result = compareAtomicDBIds(a, b);
    const fmCheck = result.checks.find(c => c.entity === 'FailureMode');
    expect(fmCheck?.match).toBe(false);
    expect(fmCheck?.details).toContain('missing=1');
  });
});

describe('verifyFKIntegrity', () => {
  it('정상 데이터 = allMatch true', () => {
    const data = makeTestDB('test');
    const result = verifyFKIntegrity(data);
    expect(result.allMatch).toBe(true);
  });

  it('orphanPC 감지', () => {
    const data = makeTestDB('test', {
      l3Functions: [
        { id: 'l3f-001', fmeaId: 'test', l3StructId: 'l3-001', l2StructId: 'l2-001', functionName: 'EF 1', processChar: 'PCh 1' },
        { id: 'l3f-ORPHAN', fmeaId: 'test', l3StructId: 'l3-001', l2StructId: 'l2-001', functionName: 'Orphan', processChar: 'Orphan PC' },
      ],
    });
    const result = verifyFKIntegrity(data);
    const orphanCheck = result.checks.find(c => c.entity === 'orphanPC (FC없는 L3F)');
    expect(orphanCheck?.match).toBe(false);
    expect(orphanCheck?.targetCount).toBe(1);
  });

  it('processCharId != l3FuncId 감지 (V08)', () => {
    const data = makeTestDB('test', {
      failureCauses: [
        { id: 'fc-001', fmeaId: 'test', l3FuncId: 'l3f-001', l3StructId: 'l3-001', l2StructId: 'l2-001', cause: 'C1', processCharId: 'WRONG-ID' },
      ],
    });
    const result = verifyFKIntegrity(data);
    const pcCheck = result.checks.find(c => c.entity === 'FC.processCharId=l3FuncId');
    expect(pcCheck?.match).toBe(false);
  });
});

// ═══ 멱등성 테스트 (순수함수) ═══

describe('멱등성', () => {
  it('remapFmeaId 2회 실행 = 동일 결과', () => {
    const source = makeTestDB('src');
    const r1 = remapFmeaId(source, 'tgt');
    const r2 = remapFmeaId(source, 'tgt');

    expect(r1.l2Structures.length).toBe(r2.l2Structures.length);
    expect(r1.failureLinks.length).toBe(r2.failureLinks.length);
    expect(r1.riskAnalyses.length).toBe(r2.riskAnalyses.length);

    for (let i = 0; i < r1.l2Structures.length; i++) {
      expect(r1.l2Structures[i].id).toBe(r2.l2Structures[i].id);
    }
  });

  it('compareAtomicDBCounts 자기자신 비교 = allMatch', () => {
    const data = makeTestDB('test');
    const result = compareAtomicDBCounts(data, data);
    expect(result.allMatch).toBe(true);
  });
});
