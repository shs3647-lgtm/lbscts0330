/**
 * @file migration-uid-safety.test.ts
 * @description P7 UUID 통일 검증 — migration.ts 내 자동생성 ID 충돌 방지 테스트
 *
 * 검증 항목:
 * 1. uid() 대량 생성 시 충돌 없음
 * 2. migrateToAtomicDB 자동생성 ID 전수 고유성 확인
 * 3. 동일 데이터 2회 마이그레이션 시에도 ID 겹침 없음
 * 4. FE/FC/FM 자동생성 경로에서 uid() 사용 확인
 */

import { describe, it, expect } from 'vitest';
import { uid } from '../app/(fmea-core)/pfmea/worksheet/schema/utils/uid';
import { migrateToAtomicDB } from '../app/(fmea-core)/pfmea/worksheet/migration';

// ── 1. uid() 기본 안전성 ──

describe('uid() 충돌 안전성', () => {
  it('10,000개 연속 생성 시 중복 없음', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      ids.add(uid());
    }
    expect(ids.size).toBe(10_000);
  });

  it('100,000개 연속 생성 시 중복 없음 (P7+ 강화)', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100_000; i++) {
      ids.add(uid());
    }
    expect(ids.size).toBe(100_000);
  });

  it('uid()는 id_ 접두사 + 랜덤(32자 hex) + 타임스탬프 형식', () => {
    const id = uid();
    // P7+: crypto.getRandomValues 기반 128bit = 32자 hex
    expect(id).toMatch(/^id_[0-9a-f]+_[0-9a-f]+$/);
    // 랜덤 부분 최소 16자 (fallback에서도 보장)
    const parts = id.split('_');
    expect(parts.length).toBe(3);
    expect(parts[1].length).toBeGreaterThanOrEqual(16);
  });

  it('연속 2개 uid()가 서로 다름', () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it('동시 생성 시뮬레이션 — 같은 밀리초 내 생성해도 충돌 없음', () => {
    // 동일 시점에 1000개 생성 → 타임스탬프가 같아도 랜덤 부분이 다름
    const batch = Array.from({ length: 1000 }, () => uid());
    const unique = new Set(batch);
    expect(unique.size).toBe(1000);
  });
});

// ── 2. 최소 데이터 마이그레이션 — ID 고유성 ──

describe('migrateToAtomicDB ID 고유성', () => {
  /** 최소 PFMEA 데이터: L1 + L2 1개 + L3 1개 + FE/FM/FC 각 1개 + Link 1개 */
  const createMinimalOldData = () => ({
    fmeaId: 'PFMEA-TEST-001-r00',
    l1: {
      id: 'l1-struct-1',
      name: '완제품 공정',
      types: [
        {
          name: 'YP',
          functions: [
            {
              name: '기능1',
              requirements: [
                { id: 'req-1', name: '요구사항1' },
              ],
            },
          ],
        },
      ],
      failureScopes: [
        {
          id: 'fe-scope-1',
          scope: 'YP',
          effect: '고장영향1',
          severity: 8,
          requirement: '요구사항1',
        },
      ],
    },
    l2: [
      {
        id: 'proc-1',
        name: '공정1',
        processNo: 'P10',
        productChars: [
          { id: 'pc-1', name: '제품특성1' },
        ],
        failureModes: [
          { id: 'fm-1', name: '고장모드1', specialChar: false },
        ],
        l3: [
          {
            id: 'we-1',
            name: '작업요소1',
            processChars: [
              { id: 'pchar-1', name: '공정특성1' },
            ],
            failureCauses: [
              { id: 'fc-1', cause: '고장원인1' },
            ],
          },
        ],
      },
    ],
    failureLinks: [
      {
        fmId: 'fm-1',
        feId: 'fe-scope-1',
        fcId: 'fc-1',
        fmText: '고장모드1',
        feText: '고장영향1',
        fcText: '고장원인1',
        severity: 8,
      },
    ],
  });

  it('모든 ID가 고유함 (전수 검사)', () => {
    const oldData = createMinimalOldData();
    const db = migrateToAtomicDB(oldData);

    // 모든 엔티티의 ID 수집
    const allIds: string[] = [];

    if (db.l1Structure) allIds.push(db.l1Structure.id);
    db.l1Functions.forEach(f => allIds.push(f.id));
    db.l2Structures.forEach(s => allIds.push(s.id));
    db.l2Functions.forEach(f => allIds.push(f.id));
    db.l3Structures.forEach(s => allIds.push(s.id));
    db.l3Functions.forEach(f => allIds.push(f.id));
    db.failureEffects.forEach(e => allIds.push(e.id));
    db.failureModes.forEach(m => allIds.push(m.id));
    db.failureCauses.forEach(c => allIds.push(c.id));
    db.failureLinks.forEach(l => allIds.push(l.id));

    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('동일 데이터 2회 마이그레이션 시 자동생성 ID 겹침 없음', () => {
    const oldData = createMinimalOldData();

    const db1 = migrateToAtomicDB(oldData);
    const db2 = migrateToAtomicDB(oldData);

    // FailureLink ID는 자동생성(uid()) → 매번 달라야 함
    const linkIds1 = db1.failureLinks.map(l => l.id);
    const linkIds2 = db2.failureLinks.map(l => l.id);

    // 두 마이그레이션의 자동생성 link ID가 겹치지 않아야 함
    const overlap = linkIds1.filter(id => linkIds2.includes(id));
    expect(overlap).toHaveLength(0);
  });
});

// ── 3. FK-only 정책: FM/FE/FC FK 불일치 시 FailureLink 스킵 검증 ──
// Rule 1.5(자동생성 금지) + Rule 1.7(FK-only) 적용 후 자동생성 제거됨

describe('FK-only 정책 — FM/FE/FC FK 불일치 시 FailureLink 스킵', () => {
  it('FM FK 불일치 → FailureLink 스킵 (자동생성 금지)', () => {
    const oldData = {
      fmeaId: 'PFMEA-FALLBACK-001-r00',
      l1: {
        id: 'l1-s',
        name: '공정',
        types: [
          {
            name: 'YP',
            functions: [{ name: '기능', requirements: [{ id: 'r1', name: '요구' }] }],
          },
        ],
        failureScopes: [
          { id: 'fe-1', scope: 'YP', effect: '영향', severity: 5 },
        ],
      },
      l2: [
        {
          id: 'p1',
          name: '공정1',
          processNo: 'P10',
          productChars: [{ id: 'pc1', name: '제품특성' }],
          failureModes: [{ id: 'fm-existing', name: '기존고장모드', specialChar: false }],
          l3: [
            {
              id: 'we1',
              name: '작업',
              functions: [{ name: '기능', processChars: [{ id: 'pch1', name: '공정특성' }] }],
            },
          ],
          failureCauses: [{ id: 'fc-fallback', name: '원인', processCharId: 'pch1' }],
        },
      ],
      failureLinks: [
        {
          fmId: 'non-existent-fm',
          feId: 'fe-1',
          fcId: 'fc-fallback',
          fmText: '존재하지않는FM',
          feText: '영향',
          fcText: '원인',
          severity: 5,
        },
      ],
    };

    const db = migrateToAtomicDB(oldData);

    // FK-only: fmId 불일치 → FailureLink 생성되지 않음
    expect(db.failureLinks.length).toBe(0);
    // FM 자동생성도 없음
    const autoFm = db.failureModes.find(m => m.mode === '존재하지않는FM');
    expect(autoFm).toBeUndefined();
  });

  it('FE FK 불일치 → FailureLink 스킵 (자동생성 금지)', () => {
    const oldData = {
      fmeaId: 'PFMEA-FE-FALLBACK-001-r00',
      l1: {
        id: 'l1-s',
        name: '공정',
        types: [
          {
            name: 'YP',
            functions: [{ name: '기능', requirements: [{ id: 'r1', name: '요구' }] }],
          },
        ],
        failureScopes: [],
      },
      l2: [
        {
          id: 'p1',
          name: '공정1',
          processNo: 'P10',
          productChars: [{ id: 'pc1', name: '제품특성' }],
          failureModes: [{ id: 'fm-exists', name: '고장', specialChar: false }],
          l3: [
            {
              id: 'we1',
              name: '작업',
              functions: [{ name: '기능', processChars: [{ id: 'pch1', name: '공정특성' }] }],
            },
          ],
          failureCauses: [{ id: 'fc-exists', name: '원인', processCharId: 'pch1' }],
        },
      ],
      failureLinks: [
        {
          fmId: 'fm-exists',
          feId: 'non-existent-fe',
          fcId: 'fc-exists',
          fmText: '고장',
          feText: '존재하지않는FE',
          fcText: '원인',
          severity: 7,
          feScope: 'YP',
        },
      ],
    };

    const db = migrateToAtomicDB(oldData);

    // FK-only: feId 불일치 → FailureLink 생성되지 않음
    expect(db.failureLinks.length).toBe(0);
    // FE 자동생성도 없음
    const autoFe = db.failureEffects.find(e => e.effect === '존재하지않는FE');
    expect(autoFe).toBeUndefined();
  });

  it('FC FK 불일치 → FailureLink 스킵 (자동생성 금지)', () => {
    const oldData = {
      fmeaId: 'PFMEA-FC-FALLBACK-001-r00',
      l1: {
        id: 'l1-s',
        name: '공정',
        types: [
          {
            name: 'YP',
            functions: [{ name: '기능', requirements: [{ id: 'r1', name: '요구' }] }],
          },
        ],
        failureScopes: [
          { id: 'fe-exists', scope: 'YP', effect: '영향', severity: 5 },
        ],
      },
      l2: [
        {
          id: 'p1',
          name: '공정1',
          processNo: 'P10',
          productChars: [{ id: 'pc1', name: '제품특성' }],
          failureModes: [{ id: 'fm-exists', name: '고장', specialChar: false }],
          failureCauses: [{ id: 'fc-existing', name: '기존원인', processCharId: 'pch1' }],
          l3: [
            {
              id: 'we1',
              name: '작업',
              functions: [
                {
                  name: '작업기능',
                  processChars: [{ id: 'pch1', name: '공정특성' }],
                },
              ],
            },
          ],
        },
      ],
      failureLinks: [
        {
          fmId: 'fm-exists',
          feId: 'fe-exists',
          fcId: 'non-existent-fc',
          fmText: '고장',
          feText: '영향',
          fcText: '존재하지않는FC',
          severity: 5,
        },
      ],
    };

    const db = migrateToAtomicDB(oldData);

    // FK-only: fcId 불일치 → FailureLink 생성되지 않음
    expect(db.failureLinks.length).toBe(0);
    // FC 자동생성도 없음
    const autoFc = db.failureCauses.find(c => c.cause === '존재하지않는FC');
    expect(autoFc).toBeUndefined();
  });
});

// ── 4. 대규모 데이터 — ID 충돌 스트레스 테스트 ──

describe('대규모 마이그레이션 ID 충돌 스트레스 테스트', () => {
  it('50개 FM + 10개 FE + 50개 FC + 100개 Link 전수 고유', () => {
    const failureModes = Array.from({ length: 50 }, (_, i) => ({
      id: `fm-stress-${i}`,
      name: `고장모드${i}`,
      specialChar: false,
    }));

    const failureScopes = Array.from({ length: 10 }, (_, i) => ({
      id: `fe-stress-${i}`,
      scope: 'YP',
      effect: `영향${i}`,
      severity: 5 + (i % 5),
    }));

    const failureCauses = Array.from({ length: 50 }, (_, i) => ({
      id: `fc-stress-${i}`,
      cause: `원인${i}`,
    }));

    // 100개 link (FM 50개 × FC 2개 조합)
    const failureLinks = Array.from({ length: 100 }, (_, i) => ({
      fmId: `fm-stress-${i % 50}`,
      feId: `fe-stress-${i % 10}`,
      fcId: `fc-stress-${i % 50}`,
      fmText: `고장모드${i % 50}`,
      feText: `영향${i % 10}`,
      fcText: `원인${i % 50}`,
      severity: 5,
    }));

    const oldData = {
      fmeaId: 'PFMEA-STRESS-001-r00',
      l1: {
        id: 'l1-stress',
        name: '스트레스 공정',
        types: [
          {
            name: 'YP',
            functions: [{ name: '기능', requirements: [{ id: 'r1', name: '요구' }] }],
          },
        ],
        failureScopes,
      },
      l2: [
        {
          id: 'p-stress',
          name: '공정1',
          processNo: 'P10',
          productChars: [{ id: 'pc-s', name: '특성' }],
          failureModes,
          l3: [
            {
              id: 'we-stress',
              name: '작업1',
              processChars: [{ id: 'pch-s', name: '공정특성' }],
              failureCauses,
            },
          ],
        },
      ],
      failureLinks,
    };

    const db = migrateToAtomicDB(oldData);

    // 전체 ID 수집
    const allIds: string[] = [];
    if (db.l1Structure) allIds.push(db.l1Structure.id);
    db.l1Functions.forEach(f => allIds.push(f.id));
    db.l2Structures.forEach(s => allIds.push(s.id));
    db.l2Functions.forEach(f => allIds.push(f.id));
    db.l3Structures.forEach(s => allIds.push(s.id));
    db.l3Functions.forEach(f => allIds.push(f.id));
    db.failureEffects.forEach(e => allIds.push(e.id));
    db.failureModes.forEach(m => allIds.push(m.id));
    db.failureCauses.forEach(c => allIds.push(c.id));
    db.failureLinks.forEach(l => allIds.push(l.id));

    const uniqueIds = new Set(allIds);

    // 모든 ID가 고유해야 함
    if (uniqueIds.size !== allIds.length) {
      // 중복 ID 찾기 (디버깅용)
      const seen = new Map<string, number>();
      for (const id of allIds) {
        seen.set(id, (seen.get(id) || 0) + 1);
      }
      const duplicates = Array.from(seen.entries())
        .filter(([, count]) => count > 1)
        .map(([id, count]) => `${id} (${count}회)`);

      expect.fail(`ID 중복 발견: ${duplicates.join(', ')}`);
    }

    expect(uniqueIds.size).toBe(allIds.length);
  });
});
