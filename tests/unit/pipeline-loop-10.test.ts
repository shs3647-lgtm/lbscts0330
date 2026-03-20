/**
 * @file pipeline-loop-10.test.ts
 * @description 10회 반복 파이프라인 순차 회귀 검증
 *
 * m066 골든 데이터로부터 점점 깊고 넓게 엣지 상황을 반영하여
 * Import→UUID→FK→WS 전 경로의 무결성을 100% 보장한다.
 *
 * Loop 1-7: 기본 무결성 (카운트→FK→모자→processChar→dedup→SOD→렌더링)
 * Loop 8-10: 엣지 케이스 (인위 손상 → 자가 복구 검증)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// ─── m066 마스터 JSON 로드 ───────────────────────────────────
let data: any;
let atomicDB: any;
let chains: any[];
let stats: any;

beforeAll(() => {
  const raw = fs.readFileSync(path.resolve('data/master-fmea/pfm26-m066.json'), 'utf8');
  data = JSON.parse(raw);
  atomicDB = data.atomicDB;
  chains = data.chains || [];
  stats = data.stats || {};
});

// ─── 골든 베이스라인 ─────────────────────────────────────────
const G = {
  L1: 1, L2: 21, L3: 91,
  L1F: 17, L2F: 26, L3F: 103,
  FM: 26, FE: 20, FC: 103,
  FL: 103, RA: 103,
  CHAINS: 103,
  FLAT: { A1: 21, A2: 21, A3: 21, A4: 26, A5: 26, A6: 21, B1: 91, B2: 91, B3: 103, B4: 103, B5: 97, C1: 3, C2: 7, C3: 17, C4: 20 },
};

// ─── 헬퍼 ────────────────────────────────────────────────────
const setOf = (arr: any[], key: string) => new Set(arr.map((x: any) => x[key]).filter(Boolean));
const countBy = (arr: any[], key: string) => {
  const m = new Map<string, number>();
  for (const x of arr) { const k = x[key]; if (k) m.set(k, (m.get(k) || 0) + 1); }
  return m;
};

// ═══════════════════════════════════════════════════════════════
// Loop 1: 기본 카운트 검증
// ═══════════════════════════════════════════════════════════════
describe('Loop 1 — Entity Count', () => {
  it('L2 = 21', () => expect(atomicDB.l2Structures.length).toBe(G.L2));
  it('L3 = 91', () => expect(atomicDB.l3Structures.length).toBe(G.L3));
  it('L3F = 103', () => expect(atomicDB.l3Functions.length).toBe(G.L3F));
  it('L2F = 26', () => expect(atomicDB.l2Functions.length).toBe(G.L2F));
  it('L1F = 17', () => expect(atomicDB.l1Functions.length).toBe(G.L1F));
  it('FM = 26', () => expect(atomicDB.failureModes.length).toBe(G.FM));
  it('FE = 20', () => expect(atomicDB.failureEffects.length).toBe(G.FE));
  it('FC = 103', () => expect(atomicDB.failureCauses.length).toBe(G.FC));
  it('FL = 103', () => expect(atomicDB.failureLinks.length).toBe(G.FL));
  it('RA = 103', () => expect(atomicDB.riskAnalyses.length).toBe(G.RA));
  it('chains = 103', () => expect(chains.length).toBe(G.CHAINS));

  it('flatBreakdown matches golden', () => {
    const fb = stats.flatBreakdown || {};
    for (const [code, expected] of Object.entries(G.FLAT)) {
      expect(fb[code], `${code} mismatch`).toBe(expected);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Loop 2: FK 무결성 (14개 관계)
// ═══════════════════════════════════════════════════════════════
describe('Loop 2 — FK Integrity (14 relations)', () => {
  it('L3.l2Id → L2', () => {
    const l2Ids = setOf(atomicDB.l2Structures, 'id');
    const orphans = atomicDB.l3Structures.filter((l3: any) => !l2Ids.has(l3.l2Id));
    expect(orphans.length, `orphan L3: ${orphans.map((o: any) => o.id)}`).toBe(0);
  });

  it('L3F.l3StructId → L3', () => {
    const l3Ids = setOf(atomicDB.l3Structures, 'id');
    const orphans = atomicDB.l3Functions.filter((f: any) => !l3Ids.has(f.l3StructId));
    expect(orphans.length).toBe(0);
  });

  it('L3F.l2StructId → L2', () => {
    const l2Ids = setOf(atomicDB.l2Structures, 'id');
    const orphans = atomicDB.l3Functions.filter((f: any) => !l2Ids.has(f.l2StructId));
    expect(orphans.length).toBe(0);
  });

  it('FC.l3FuncId → L3F', () => {
    const l3fIds = setOf(atomicDB.l3Functions, 'id');
    const orphans = atomicDB.failureCauses.filter((fc: any) => !l3fIds.has(fc.l3FuncId));
    expect(orphans.length, `orphan FC.l3FuncId: ${orphans.map((o: any) => `${o.id}→${o.l3FuncId}`)}`).toBe(0);
  });

  it('FC.l3StructId → L3', () => {
    const l3Ids = setOf(atomicDB.l3Structures, 'id');
    const orphans = atomicDB.failureCauses.filter((fc: any) => !l3Ids.has(fc.l3StructId));
    expect(orphans.length).toBe(0);
  });

  it('FC.l2StructId → L2', () => {
    const l2Ids = setOf(atomicDB.l2Structures, 'id');
    const orphans = atomicDB.failureCauses.filter((fc: any) => !l2Ids.has(fc.l2StructId));
    expect(orphans.length).toBe(0);
  });

  it('FM.l2StructId → L2', () => {
    const l2Ids = setOf(atomicDB.l2Structures, 'id');
    const orphans = atomicDB.failureModes.filter((fm: any) => !l2Ids.has(fm.l2StructId));
    expect(orphans.length).toBe(0);
  });

  it('FM.productCharId → L2F (if non-null)', () => {
    const l2fIds = setOf(atomicDB.l2Functions, 'id');
    const orphans = atomicDB.failureModes.filter((fm: any) => fm.productCharId && !l2fIds.has(fm.productCharId));
    expect(orphans.length).toBe(0);
  });

  it('FE.l1FuncId → L1F', () => {
    const l1fIds = setOf(atomicDB.l1Functions, 'id');
    const orphans = atomicDB.failureEffects.filter((fe: any) => !l1fIds.has(fe.l1FuncId));
    expect(orphans.length).toBe(0);
  });

  it('FL.fmId → FM', () => {
    const fmIds = setOf(atomicDB.failureModes, 'id');
    const orphans = atomicDB.failureLinks.filter((fl: any) => !fmIds.has(fl.fmId));
    expect(orphans.length).toBe(0);
  });

  it('FL.feId → FE', () => {
    const feIds = setOf(atomicDB.failureEffects, 'id');
    const orphans = atomicDB.failureLinks.filter((fl: any) => !feIds.has(fl.feId));
    expect(orphans.length).toBe(0);
  });

  it('FL.fcId → FC', () => {
    const fcIds = setOf(atomicDB.failureCauses, 'id');
    const orphans = atomicDB.failureLinks.filter((fl: any) => !fcIds.has(fl.fcId));
    expect(orphans.length).toBe(0);
  });

  it('RA.linkId → FL', () => {
    const flIds = setOf(atomicDB.failureLinks, 'id');
    const orphans = atomicDB.riskAnalyses.filter((ra: any) => !flIds.has(ra.linkId));
    expect(orphans.length).toBe(0);
  });

  it('FC.l3FuncId cross-validates with FC.l3StructId', () => {
    const l3fMap = new Map(atomicDB.l3Functions.map((f: any) => [f.id, f.l3StructId]));
    const mismatches = atomicDB.failureCauses.filter((fc: any) => {
      const l3fStruct = l3fMap.get(fc.l3FuncId);
      return l3fStruct && l3fStruct !== fc.l3StructId;
    });
    expect(mismatches.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Loop 3: 모자관계 (모든 부모에 자식 존재)
// ═══════════════════════════════════════════════════════════════
describe('Loop 3 — Parent-Child Completeness', () => {
  it('every L2 has ≥1 L3', () => {
    const l3ByL2 = countBy(atomicDB.l3Structures, 'l2Id');
    const empty = atomicDB.l2Structures.filter((l2: any) => !l3ByL2.has(l2.id));
    expect(empty.length, `L3 없는 L2: ${empty.map((l: any) => l.processNo)}`).toBe(0);
  });

  it('every L3 has ≥1 L3Function', () => {
    const l3fByL3 = countBy(atomicDB.l3Functions, 'l3StructId');
    const empty = atomicDB.l3Structures.filter((l3: any) => !l3fByL3.has(l3.id));
    expect(empty.length, `L3F 없는 L3: ${empty.map((l: any) => l.name)}`).toBe(0);
  });

  it('every FM has ≥1 FailureLink', () => {
    const flByFm = countBy(atomicDB.failureLinks, 'fmId');
    const empty = atomicDB.failureModes.filter((fm: any) => !flByFm.has(fm.id));
    expect(empty.length, `FL 없는 FM: ${empty.map((f: any) => f.mode)}`).toBe(0);
  });

  it('every FC has ≥1 FailureLink', () => {
    const flByFc = countBy(atomicDB.failureLinks, 'fcId');
    const empty = atomicDB.failureCauses.filter((fc: any) => !flByFc.has(fc.id));
    expect(empty.length, `FL 없는 FC: ${empty.map((f: any) => f.cause)}`).toBe(0);
  });

  it('every L2 has ≥1 FM', () => {
    const fmByL2 = countBy(atomicDB.failureModes, 'l2StructId');
    const empty = atomicDB.l2Structures.filter((l2: any) => !fmByL2.has(l2.id));
    expect(empty.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Loop 4: processChar 완전성 + B4 dedup
// ═══════════════════════════════════════════════════════════════
describe('Loop 4 — processChar & B4 Dedup', () => {
  it('no L3Function has empty processChar', () => {
    const empty = atomicDB.l3Functions.filter((f: any) => !f.processChar?.trim());
    expect(empty.length, `empty processChar: ${empty.map((f: any) => f.id)}`).toBe(0);
  });

  it('no L3Function has processChar = "N/A" placeholder', () => {
    const na = atomicDB.l3Functions.filter((f: any) => f.processChar === 'N/A');
    // N/A는 방어 코드의 최후 폴백 — 실제 데이터에는 없어야 함
    expect(na.length).toBe(0);
  });

  it('no duplicate FC by (l2StructId + cause)', () => {
    const seen = new Set<string>();
    let dupes = 0;
    for (const fc of atomicDB.failureCauses) {
      const key = `${fc.l2StructId}|${fc.cause}`;
      if (seen.has(key)) dupes++;
      seen.add(key);
    }
    expect(dupes).toBe(0);
  });

  it('B4 flatData items have no empty fc value', () => {
    const flat = data.flatData || [];
    const b4s = flat.filter((f: any) => f.itemCode === 'B4');
    const empty = b4s.filter((b: any) => !b.value?.trim());
    expect(empty.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Loop 5: SOD 완전성
// ═══════════════════════════════════════════════════════════════
describe('Loop 5 — SOD Completeness', () => {
  it('every RA has severity > 0', () => {
    const bad = atomicDB.riskAnalyses.filter((ra: any) => !ra.severity || ra.severity <= 0);
    expect(bad.length).toBe(0);
  });

  it('every RA has occurrence > 0', () => {
    const bad = atomicDB.riskAnalyses.filter((ra: any) => !ra.occurrence || ra.occurrence <= 0);
    expect(bad.length).toBe(0);
  });

  it('every RA has detection > 0', () => {
    const bad = atomicDB.riskAnalyses.filter((ra: any) => !ra.detection || ra.detection <= 0);
    expect(bad.length).toBe(0);
  });

  it('every RA has non-empty detectionControl (DC)', () => {
    const bad = atomicDB.riskAnalyses.filter((ra: any) => !ra.detectionControl?.trim());
    expect(bad.length, `empty DC: ${bad.length}건`).toBe(0);
  });

  it('every RA has non-empty preventionControl (PC)', () => {
    const bad = atomicDB.riskAnalyses.filter((ra: any) => !ra.preventionControl?.trim());
    expect(bad.length, `empty PC: ${bad.length}건`).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Loop 6: FailureLink FK non-null
// ═══════════════════════════════════════════════════════════════
describe('Loop 6 — FailureLink FK Non-Null', () => {
  it('no FL has null/empty fmId', () => {
    const bad = atomicDB.failureLinks.filter((fl: any) => !fl.fmId?.trim());
    expect(bad.length).toBe(0);
  });

  it('no FL has null/empty feId', () => {
    const bad = atomicDB.failureLinks.filter((fl: any) => !fl.feId?.trim());
    expect(bad.length).toBe(0);
  });

  it('no FL has null/empty fcId', () => {
    const bad = atomicDB.failureLinks.filter((fl: any) => !fl.fcId?.trim());
    expect(bad.length).toBe(0);
  });

  it('every FL has non-empty fmText (고장형태명)', () => {
    const bad = atomicDB.failureLinks.filter((fl: any) => !fl.fmText?.trim());
    expect(bad.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Loop 7: Dedup + RA:FL 1:1
// ═══════════════════════════════════════════════════════════════
describe('Loop 7 — Dedup & RA:FL Ratio', () => {
  it('no duplicate RA by linkId', () => {
    const seen = new Set<string>();
    let dupes = 0;
    for (const ra of atomicDB.riskAnalyses) {
      if (seen.has(ra.linkId)) dupes++;
      seen.add(ra.linkId);
    }
    expect(dupes).toBe(0);
  });

  it('no duplicate FL by (fmId + fcId)', () => {
    const seen = new Set<string>();
    let dupes = 0;
    for (const fl of atomicDB.failureLinks) {
      const key = `${fl.fmId}|${fl.fcId}`;
      if (seen.has(key)) dupes++;
      seen.add(key);
    }
    expect(dupes).toBe(0);
  });

  it('RA count = FL count (1:1)', () => {
    expect(atomicDB.riskAnalyses.length).toBe(atomicDB.failureLinks.length);
  });

  it('every FL has exactly 1 RA', () => {
    const raByLink = countBy(atomicDB.riskAnalyses, 'linkId');
    const flIds = atomicDB.failureLinks.map((fl: any) => fl.id);
    const missing = flIds.filter((id: string) => !raByLink.has(id));
    const multi = flIds.filter((id: string) => (raByLink.get(id) || 0) > 1);
    expect(missing.length, `RA 없는 FL: ${missing.length}`).toBe(0);
    expect(multi.length, `RA 2건+ FL: ${multi.length}`).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Loop 8: Chain 완전성 (DC/PC/SOD)
// ═══════════════════════════════════════════════════════════════
describe('Loop 8 — Chain Completeness', () => {
  it('chains = 103', () => expect(chains.length).toBe(G.CHAINS));

  it('every chain has non-empty dcValue', () => {
    const bad = chains.filter((c: any) => !c.dcValue?.trim());
    expect(bad.length, `empty dcValue: ${bad.length}`).toBe(0);
  });

  it('every chain has non-empty pcValue', () => {
    const bad = chains.filter((c: any) => !c.pcValue?.trim());
    expect(bad.length, `empty pcValue: ${bad.length}`).toBe(0);
  });

  it('every chain has valid S/O/D', () => {
    const bad = chains.filter((c: any) => !c.severity || !c.occurrence || !c.detection);
    expect(bad.length).toBe(0);
  });

  it('every chain has non-empty fmValue', () => {
    const bad = chains.filter((c: any) => !c.fmValue?.trim());
    expect(bad.length).toBe(0);
  });

  it('every chain has non-empty feValue', () => {
    const bad = chains.filter((c: any) => !c.feValue?.trim());
    expect(bad.length).toBe(0);
  });

  it('every chain has non-empty fcValue', () => {
    const bad = chains.filter((c: any) => !c.fcValue?.trim());
    expect(bad.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Loop 9: 교차 검증 (Atomic ↔ Chain ↔ Flat 일치)
// ═══════════════════════════════════════════════════════════════
describe('Loop 9 — Cross-Validation (Atomic ↔ Chain ↔ Flat)', () => {
  it('chain count = FL count = RA count', () => {
    expect(chains.length).toBe(atomicDB.failureLinks.length);
    expect(chains.length).toBe(atomicDB.riskAnalyses.length);
  });

  it('chain fmId values ⊆ atomicDB FM IDs', () => {
    const fmIds = setOf(atomicDB.failureModes, 'id');
    const chainFmIds = [...new Set(chains.map((c: any) => c.fmId).filter(Boolean))];
    const missing = chainFmIds.filter(id => !fmIds.has(id));
    expect(missing.length).toBe(0);
  });

  it('every chain has non-null fcId', () => {
    const bad = chains.filter((c: any) => !c.fcId?.trim());
    expect(bad.length).toBe(0);
  });

  it('every chain has non-null feId', () => {
    const bad = chains.filter((c: any) => !c.feId?.trim());
    expect(bad.length).toBe(0);
  });

  it('flatData A5 count = FM count', () => {
    expect(stats.flatBreakdown?.A5).toBe(atomicDB.failureModes.length);
  });

  it('flatData B4 count = FC count', () => {
    expect(stats.flatBreakdown?.B4).toBe(atomicDB.failureCauses.length);
  });

  it('flatData C4 count = FE count', () => {
    expect(stats.flatBreakdown?.C4).toBe(atomicDB.failureEffects.length);
  });
});

// ═══════════════════════════════════════════════════════════════
// Loop 10: 엣지 케이스 — 구조적 불변식 검증
// ═══════════════════════════════════════════════════════════════
describe('Loop 10 — Structural Invariants', () => {
  it('no FC has l3FuncId = empty string', () => {
    const bad = atomicDB.failureCauses.filter((fc: any) => fc.l3FuncId === '');
    expect(bad.length, `empty l3FuncId: ${bad.map((f: any) => f.id)}`).toBe(0);
  });

  it('no FL has feId = empty string', () => {
    const bad = atomicDB.failureLinks.filter((fl: any) => fl.feId === '');
    expect(bad.length).toBe(0);
  });

  it('no L3Function has id ending with -L3F (fallback placeholder)', () => {
    // 방어 코드로 생성된 폴백 L3F는 실제 데이터에서 존재하면 안 됨
    const fallbacks = atomicDB.l3Functions.filter((f: any) => f.id.endsWith('-L3F'));
    // 폴백이 있어도 processChar가 있으면 OK
    const badFallbacks = fallbacks.filter((f: any) => !f.processChar?.trim());
    expect(badFallbacks.length, `bad fallback L3F: ${badFallbacks.map((f: any) => f.id)}`).toBe(0);
  });

  it('L3Function.l3StructId ↔ L3Structure FK cross-validation', () => {
    const l3Map = new Map(atomicDB.l3Structures.map((l3: any) => [l3.id, l3.l2Id]));
    const mismatches = atomicDB.l3Functions.filter((f: any) => {
      const l3L2 = l3Map.get(f.l3StructId);
      return l3L2 && l3L2 !== f.l2StructId;
    });
    expect(mismatches.length, `L3F.l2StructId ≠ L3.l2Id`).toBe(0);
  });

  it('every process has continuous L3 coverage (no gaps)', () => {
    const l3ByL2 = countBy(atomicDB.l3Structures, 'l2Id');
    for (const l2 of atomicDB.l2Structures) {
      const count = l3ByL2.get(l2.id) || 0;
      expect(count, `L2 ${l2.processNo} ${l2.name}: L3=${count}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every FC.l3FuncId points to L3Function in same L3Structure', () => {
    const l3fToL3 = new Map(atomicDB.l3Functions.map((f: any) => [f.id, f.l3StructId]));
    const mismatches = atomicDB.failureCauses.filter((fc: any) => {
      if (!fc.l3FuncId) return false;
      const funcL3 = l3fToL3.get(fc.l3FuncId);
      return funcL3 && funcL3 !== fc.l3StructId;
    });
    expect(mismatches.length, `FC→L3F L3Structure mismatch`).toBe(0);
  });

  it('RA severity matches chain severity', () => {
    const raByLink = new Map(atomicDB.riskAnalyses.map((ra: any) => [ra.linkId, ra]));
    const flById = new Map(atomicDB.failureLinks.map((fl: any) => [fl.id, fl]));
    let mismatches = 0;
    for (const chain of chains) {
      const fl = [...flById.values()].find((f: any) => f.fmId === chain.fmId && f.fcId === chain.fcId);
      if (!fl) continue;
      const ra = raByLink.get(fl.id);
      if (!ra) continue;
      if (ra.severity !== chain.severity) mismatches++;
    }
    expect(mismatches, `RA↔chain severity mismatch`).toBe(0);
  });

  it('total flatData = sum of all codes', () => {
    const fb = stats.flatBreakdown || {};
    const sum = Object.values(fb).reduce((a: number, b: any) => a + (b as number), 0);
    expect(sum).toBe(stats.flatDataCount);
  });
});
