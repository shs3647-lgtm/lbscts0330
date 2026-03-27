/**
 * @file migration-fc-filter.test.ts
 * @description migration.ts FC 이름 필터 정합성 검증
 *
 * 버그: includes('클릭') / includes('추가')로 정상 FC까지 삭제
 * 수정: exact match placeholder만 필터
 *
 * 검증 항목:
 * 1. placeholder FC는 필터됨 (atomic DB에 포함되지 않음)
 * 2. 정상 FC는 필터되지 않음 (atomic DB에 포함됨)
 * 3. '추가' / '클릭' 부분 문자열 포함 정상 FC 보존
 * 4. FC 개수 = Legacy FC 개수 (필터된 placeholder 제외)
 */

import { describe, test, expect } from 'vitest';
import { migrateToAtomicDB } from '@/app/(fmea-core)/pfmea/worksheet/migration';

function makeMinimalLegacy(fcs: Array<{ id: string; name: string; processCharId?: string; m4?: string }>) {
  return {
    fmeaId: 'test-migration-fc',
    l1: {
      name: '완제품',
      types: [
        {
          id: 'l1t-1',
          name: 'YP',
          functions: [{ id: 'l1f-1', name: '기능1', requirements: [{ id: 'l1r-1', name: '요구사항1' }] }],
          failureScopes: [{ id: 'fe-1', name: '고장영향1', effect: '고장영향1', severity: 8, scope: 'YP' }],
        },
      ],
    },
    l2: [
      {
        id: 'proc-1',
        no: '10',
        name: '공정10',
        m4: 'MC',
        l3: [
          {
            id: 'we-1',
            name: '작업요소1',
            m4: 'MC',
            functions: [
              {
                id: 'func-1',
                name: '기능1',
                processChars: [{ id: 'pc-1', name: '특성1' }],
              },
            ],
            failureCauses: [],
          },
        ],
        functions: [
          {
            id: 'func-1',
            name: '기능1',
            processChars: [{ id: 'pc-1', name: '특성1' }],
          },
        ],
        failureModes: [{ id: 'fm-1', name: '고장형태1', productCharId: 'pc-1' }],
        failureCauses: fcs,
        failureLinks: [],
      },
    ],
    failureLinks: [],
    riskData: {},
    structureConfirmed: true,
    l1Confirmed: true,
    l2Confirmed: true,
    l3Confirmed: true,
    failureL1Confirmed: true,
    failureL2Confirmed: true,
    failureL3Confirmed: true,
    failureLinkConfirmed: false,
  };
}

describe('migration.ts FC 이름 필터 원자성 검증', () => {

  test('정상 FC 이름은 atomic DB에 포함되어야 함', () => {
    const legacy = makeMinimalLegacy([
      { id: 'fc-1', name: '작업 숙련도 부족', processCharId: 'pc-1' },
      { id: 'fc-2', name: '설비 가동률 저하', processCharId: 'pc-1' },
      { id: 'fc-3', name: '자재 투입 오류', processCharId: 'pc-1' },
    ]);

    const db = migrateToAtomicDB(legacy);
    expect(db.failureCauses.length).toBe(3);

    const fcNames = db.failureCauses.map(fc => fc.cause);
    expect(fcNames).toContain('작업 숙련도 부족');
    expect(fcNames).toContain('설비 가동률 저하');
    expect(fcNames).toContain('자재 투입 오류');
  });

  test('placeholder FC는 atomic DB에서 필터되어야 함', () => {
    const legacy = makeMinimalLegacy([
      { id: 'fc-1', name: '작업 숙련도 부족', processCharId: 'pc-1' },
      { id: 'fc-p1', name: '고장원인 선택', processCharId: 'pc-1' },
      { id: 'fc-p2', name: '클릭하여 추가', processCharId: 'pc-1' },
      { id: 'fc-p3', name: '여기를 클릭하여 추가', processCharId: 'pc-1' },
      { id: 'fc-p4', name: '고장원인을 입력하세요', processCharId: 'pc-1' },
      { id: 'fc-p5', name: '', processCharId: 'pc-1' },
      { id: 'fc-p6', name: '   ', processCharId: 'pc-1' },
    ]);

    const db = migrateToAtomicDB(legacy);
    expect(db.failureCauses.length).toBe(1);
    expect(db.failureCauses[0].cause).toBe('작업 숙련도 부족');
  });

  test('"추가" 부분 문자열 포함 정상 FC는 보존되어야 함 (이전 버그)', () => {
    const legacy = makeMinimalLegacy([
      { id: 'fc-1', name: '추가 작업 미수행', processCharId: 'pc-1' },
      { id: 'fc-2', name: '기름 추가 부족', processCharId: 'pc-1' },
      { id: 'fc-3', name: '소재 추가 투입 오류', processCharId: 'pc-1' },
    ]);

    const db = migrateToAtomicDB(legacy);
    expect(db.failureCauses.length).toBe(3);

    const fcNames = db.failureCauses.map(fc => fc.cause);
    expect(fcNames).toContain('추가 작업 미수행');
    expect(fcNames).toContain('기름 추가 부족');
    expect(fcNames).toContain('소재 추가 투입 오류');
  });

  test('"클릭" 부분 문자열 포함 정상 FC는 보존되어야 함 (이전 버그)', () => {
    const legacy = makeMinimalLegacy([
      { id: 'fc-1', name: '클릭 토크 부족', processCharId: 'pc-1' },
      { id: 'fc-2', name: '더블클릭 오류', processCharId: 'pc-1' },
    ]);

    const db = migrateToAtomicDB(legacy);
    expect(db.failureCauses.length).toBe(2);

    const fcNames = db.failureCauses.map(fc => fc.cause);
    expect(fcNames).toContain('클릭 토크 부족');
    expect(fcNames).toContain('더블클릭 오류');
  });

  test('FC의 l3FuncId, l3StructId, l2StructId FK가 모두 유효해야 함', () => {
    const legacy = makeMinimalLegacy([
      { id: 'fc-1', name: '작업 숙련도 부족', processCharId: 'pc-1' },
      { id: 'fc-2', name: '설비 마모', processCharId: 'pc-1', m4: 'MC' },
      { id: 'fc-3', name: '자재 불량', processCharId: 'pc-1' },
    ]);

    const db = migrateToAtomicDB(legacy);
    expect(db.failureCauses.length).toBe(3);

    const l3FuncIds = new Set(db.l3Functions.map(f => f.id));
    const l3StructIds = new Set(db.l3Structures.map(s => s.id));
    const l2StructIds = new Set(db.l2Structures.map(s => s.id));

    for (const fc of db.failureCauses) {
      expect(l3FuncIds.has(fc.l3FuncId)).toBe(true);
      expect(l3StructIds.has(fc.l3StructId)).toBe(true);
      expect(l2StructIds.has(fc.l2StructId)).toBe(true);
      expect(fc.cause).toBeTruthy();
    }
  });

  test('FC 개수 = Legacy FC 개수 (placeholder 제외)', () => {
    const validFCs = [
      { id: 'fc-1', name: '용접 불량', processCharId: 'pc-1' },
      { id: 'fc-2', name: '프레스 과압', processCharId: 'pc-1' },
      { id: 'fc-3', name: '도장 박리', processCharId: 'pc-1' },
      { id: 'fc-4', name: '조립 미스', processCharId: 'pc-1' },
      { id: 'fc-5', name: '검사 누락', processCharId: 'pc-1' },
      { id: 'fc-6', name: '세척 잔류물', processCharId: 'pc-1' },
    ];
    const placeholderFCs = [
      { id: 'fc-p1', name: '', processCharId: 'pc-1' },
      { id: 'fc-p2', name: '고장원인 선택', processCharId: 'pc-1' },
    ];

    const legacy = makeMinimalLegacy([...validFCs, ...placeholderFCs]);

    const db = migrateToAtomicDB(legacy);
    expect(db.failureCauses.length).toBe(validFCs.length);
  });

  test('processCharId가 있는 FC는 원자성 DB에서 processCharId를 보존해야 함', () => {
    const legacy = makeMinimalLegacy([
      { id: 'fc-1', name: '치수 불량', processCharId: 'pc-1' },
    ]);

    const db = migrateToAtomicDB(legacy);
    expect(db.failureCauses.length).toBe(1);
    expect(db.failureCauses[0].processCharId).toBe('pc-1');
  });
});
