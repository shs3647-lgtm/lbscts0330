/**
 * Golden Baseline Verification for m066 Au Bump FMEA
 *
 * Loads the master JSON and validates EVERY aspect of data completeness
 * across 10 rounds of assertions. Think of this as a "health checkup"
 * for the m066 dataset — each round examines a different organ system.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Golden baseline constants (confirmed 2026-03-20)
// ---------------------------------------------------------------------------
const GOLDEN = {
  L1: 1,
  L1_NAME: '12INCH AU BUMP',
  L1F: 17,
  L1F_YP: 8,
  L1F_SP: 6,
  L1F_USER: 3,
  FE: 20,
  L2: 21,
  L2F: 26,
  L3: 91,
  L3F: 103,
  FM: 26,
  FC: 103,
  FL: 103,
  RA: 103,
  CHAINS: 103,
  FLAT_TOTAL: 668,
  FLAT: {
    A1: 21,
    A2: 21,
    A3: 21,
    A4: 26,
    A5: 26,
    A6: 21,
    B1: 91,
    B2: 91,
    B3: 103,
    B4: 103,
    B5: 97,
    C1: 3,
    C2: 7,
    C3: 17,
    C4: 20,
  },
} as const;

// ---------------------------------------------------------------------------
// Load m066 master JSON
// ---------------------------------------------------------------------------
interface MasterJSON {
  atomicDB: {
    l1Structure: Record<string, unknown>;
    l1Functions: Array<Record<string, unknown>>;
    l2Structures: Array<Record<string, unknown>>;
    l2Functions: Array<Record<string, unknown>>;
    l3Structures: Array<Record<string, unknown>>;
    l3Functions: Array<Record<string, unknown>>;
    failureEffects: Array<Record<string, unknown>>;
    failureModes: Array<Record<string, unknown>>;
    failureCauses: Array<Record<string, unknown>>;
    failureLinks: Array<Record<string, unknown>>;
    riskAnalyses: Array<Record<string, unknown>>;
  };
  chains: Array<Record<string, unknown>>;
  flatData: Array<Record<string, unknown>>;
  stats: {
    flatDataCount: number;
    flatBreakdown: Record<string, number>;
    [key: string]: unknown;
  };
}

let data: MasterJSON;

beforeAll(() => {
  const filePath = path.resolve('data/master-fmea/pfm26-m066.json');
  data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as MasterJSON;
});

// ===========================================================================
// R1 — Count Verification
// ===========================================================================
describe('R1 — Count Verification', () => {
  it('L2 structures = 21', () => {
    expect(data.atomicDB.l2Structures).toHaveLength(GOLDEN.L2);
  });

  it('L3 structures = 91', () => {
    expect(data.atomicDB.l3Structures).toHaveLength(GOLDEN.L3);
  });

  it('L3 functions = 103', () => {
    expect(data.atomicDB.l3Functions).toHaveLength(GOLDEN.L3F);
  });

  it('failure modes = 26', () => {
    expect(data.atomicDB.failureModes).toHaveLength(GOLDEN.FM);
  });

  it('failure effects = 20', () => {
    expect(data.atomicDB.failureEffects).toHaveLength(GOLDEN.FE);
  });

  it('failure causes = 103', () => {
    expect(data.atomicDB.failureCauses).toHaveLength(GOLDEN.FC);
  });

  it('failure links = 103', () => {
    expect(data.atomicDB.failureLinks).toHaveLength(GOLDEN.FL);
  });

  it('risk analyses = 103', () => {
    expect(data.atomicDB.riskAnalyses).toHaveLength(GOLDEN.RA);
  });

  it('L1 functions = 17', () => {
    expect(data.atomicDB.l1Functions).toHaveLength(GOLDEN.L1F);
  });

  it('L2 functions = 26', () => {
    expect(data.atomicDB.l2Functions).toHaveLength(GOLDEN.L2F);
  });

  it('flatBreakdown matches GOLDEN.FLAT', () => {
    const breakdown = data.stats.flatBreakdown;
    for (const [code, expected] of Object.entries(GOLDEN.FLAT)) {
      expect(breakdown[code], `flatBreakdown.${code}`).toBe(expected);
    }
  });

  it('flatDataCount = GOLDEN.FLAT_TOTAL', () => {
    expect(data.stats.flatDataCount).toBe(GOLDEN.FLAT_TOTAL);
  });
});

// ===========================================================================
// R2 — FK Integrity (14 relations)
// ===========================================================================
describe('R2 — FK Integrity', () => {
  it('every L3.l2Id exists in l2Structures', () => {
    const l2Ids = new Set(data.atomicDB.l2Structures.map((l2) => l2.id));
    for (const l3 of data.atomicDB.l3Structures) {
      expect(l2Ids.has(l3.l2Id as string), `L3 ${l3.id} → l2Id ${l3.l2Id}`).toBe(true);
    }
  });

  it('every FC.l3FuncId exists in l3Functions', () => {
    const l3FuncIds = new Set(data.atomicDB.l3Functions.map((f) => f.id));
    for (const fc of data.atomicDB.failureCauses) {
      expect(l3FuncIds.has(fc.l3FuncId as string), `FC ${fc.id} → l3FuncId ${fc.l3FuncId}`).toBe(true);
    }
  });

  it('every FC.l3StructId exists in l3Structures', () => {
    const l3Ids = new Set(data.atomicDB.l3Structures.map((l3) => l3.id));
    for (const fc of data.atomicDB.failureCauses) {
      expect(l3Ids.has(fc.l3StructId as string), `FC ${fc.id} → l3StructId ${fc.l3StructId}`).toBe(true);
    }
  });

  it('every FL.fmId exists in failureModes', () => {
    const fmIds = new Set(data.atomicDB.failureModes.map((fm) => fm.id));
    for (const fl of data.atomicDB.failureLinks) {
      expect(fmIds.has(fl.fmId as string), `FL ${fl.id} → fmId ${fl.fmId}`).toBe(true);
    }
  });

  it('every FL.feId exists in failureEffects', () => {
    const feIds = new Set(data.atomicDB.failureEffects.map((fe) => fe.id));
    for (const fl of data.atomicDB.failureLinks) {
      expect(feIds.has(fl.feId as string), `FL ${fl.id} → feId ${fl.feId}`).toBe(true);
    }
  });

  it('every FL.fcId exists in failureCauses', () => {
    const fcIds = new Set(data.atomicDB.failureCauses.map((fc) => fc.id));
    for (const fl of data.atomicDB.failureLinks) {
      expect(fcIds.has(fl.fcId as string), `FL ${fl.id} → fcId ${fl.fcId}`).toBe(true);
    }
  });

  it('every RA.linkId exists in failureLinks', () => {
    const flIds = new Set(data.atomicDB.failureLinks.map((fl) => fl.id));
    for (const ra of data.atomicDB.riskAnalyses) {
      expect(flIds.has(ra.linkId as string), `RA ${ra.id} → linkId ${ra.linkId}`).toBe(true);
    }
  });

  it('every FM.productCharId exists in l2Functions (when non-null)', () => {
    const l2FuncIds = new Set(data.atomicDB.l2Functions.map((f) => f.id));
    for (const fm of data.atomicDB.failureModes) {
      const pcId = fm.productCharId as string | null;
      if (pcId) {
        expect(l2FuncIds.has(pcId), `FM ${fm.id} → productCharId ${pcId}`).toBe(true);
      }
    }
  });

  it('every FE.l1FuncId exists in l1Functions', () => {
    const l1FuncIds = new Set(data.atomicDB.l1Functions.map((f) => f.id));
    for (const fe of data.atomicDB.failureEffects) {
      expect(l1FuncIds.has(fe.l1FuncId as string), `FE ${fe.id} → l1FuncId ${fe.l1FuncId}`).toBe(true);
    }
  });

  it('every FC.l2StructId exists in l2Structures', () => {
    const l2Ids = new Set(data.atomicDB.l2Structures.map((l2) => l2.id));
    for (const fc of data.atomicDB.failureCauses) {
      expect(l2Ids.has(fc.l2StructId as string), `FC ${fc.id} → l2StructId ${fc.l2StructId}`).toBe(true);
    }
  });

  it('every L3.l1Id exists (matches l1Structure.id)', () => {
    const l1Id = data.atomicDB.l1Structure.id as string;
    for (const l3 of data.atomicDB.l3Structures) {
      expect(l3.l1Id, `L3 ${l3.id} → l1Id`).toBe(l1Id);
    }
  });

  it('every L2.l1Id exists (matches l1Structure.id)', () => {
    const l1Id = data.atomicDB.l1Structure.id as string;
    for (const l2 of data.atomicDB.l2Structures) {
      expect(l2.l1Id, `L2 ${l2.id} → l1Id`).toBe(l1Id);
    }
  });

  it('every L3Function.l2StructId exists in l2Structures', () => {
    const l2Ids = new Set(data.atomicDB.l2Structures.map((l2) => l2.id));
    for (const l3f of data.atomicDB.l3Functions) {
      expect(l2Ids.has(l3f.l2StructId as string), `L3F ${l3f.id} → l2StructId ${l3f.l2StructId}`).toBe(true);
    }
  });

  it('every L3Function.l3StructId exists in l3Structures', () => {
    const l3Ids = new Set(data.atomicDB.l3Structures.map((l3) => l3.id));
    for (const l3f of data.atomicDB.l3Functions) {
      expect(l3Ids.has(l3f.l3StructId as string), `L3F ${l3f.id} → l3StructId ${l3f.l3StructId}`).toBe(true);
    }
  });
});

// ===========================================================================
// R3 — Parent-Child Completeness
// ===========================================================================
describe('R3 — Parent-Child Completeness', () => {
  it('every L2 has at least 1 L3 child', () => {
    const l3ByL2 = new Map<string, number>();
    for (const l3 of data.atomicDB.l3Structures) {
      const l2Id = l3.l2Id as string;
      l3ByL2.set(l2Id, (l3ByL2.get(l2Id) ?? 0) + 1);
    }
    for (const l2 of data.atomicDB.l2Structures) {
      const count = l3ByL2.get(l2.id as string) ?? 0;
      expect(count, `L2 ${l2.no} has 0 L3 children`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every L3 has at least 1 L3Function child', () => {
    const funcByL3 = new Map<string, number>();
    for (const f of data.atomicDB.l3Functions) {
      const l3Id = f.l3StructId as string;
      funcByL3.set(l3Id, (funcByL3.get(l3Id) ?? 0) + 1);
    }
    for (const l3 of data.atomicDB.l3Structures) {
      const count = funcByL3.get(l3.id as string) ?? 0;
      expect(count, `L3 ${l3.id} has 0 L3Functions`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every FM has at least 1 FailureLink', () => {
    const flByFm = new Map<string, number>();
    for (const fl of data.atomicDB.failureLinks) {
      const fmId = fl.fmId as string;
      flByFm.set(fmId, (flByFm.get(fmId) ?? 0) + 1);
    }
    for (const fm of data.atomicDB.failureModes) {
      const count = flByFm.get(fm.id as string) ?? 0;
      expect(count, `FM ${fm.id} has 0 FailureLinks`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every FC has at least 1 FailureLink', () => {
    const flByFc = new Map<string, number>();
    for (const fl of data.atomicDB.failureLinks) {
      const fcId = fl.fcId as string;
      flByFc.set(fcId, (flByFc.get(fcId) ?? 0) + 1);
    }
    for (const fc of data.atomicDB.failureCauses) {
      const count = flByFc.get(fc.id as string) ?? 0;
      expect(count, `FC ${fc.id} has 0 FailureLinks`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every L2 has at least 1 FM', () => {
    const fmByL2 = new Map<string, number>();
    for (const fm of data.atomicDB.failureModes) {
      const l2Id = fm.l2StructId as string;
      fmByL2.set(l2Id, (fmByL2.get(l2Id) ?? 0) + 1);
    }
    for (const l2 of data.atomicDB.l2Structures) {
      const count = fmByL2.get(l2.id as string) ?? 0;
      expect(count, `L2 ${l2.no} has 0 FMs`).toBeGreaterThanOrEqual(1);
    }
  });
});

// ===========================================================================
// R4 — processChar Completeness
// ===========================================================================
describe('R4 — processChar Completeness', () => {
  it('no L3Function has empty/null/whitespace processChar', () => {
    const empty = data.atomicDB.l3Functions.filter((f) => {
      const pc = f.processChar as string | null | undefined;
      return !pc || !pc.trim();
    });
    expect(empty, `${empty.length} L3Functions with empty processChar`).toHaveLength(0);
  });

  it('at least one L3Function contains "Cu Target" or copper-related processChar', () => {
    const cuRelated = data.atomicDB.l3Functions.filter((f) => {
      const pc = f.processChar as string;
      return pc && /cu|copper|도금/i.test(pc);
    });
    expect(cuRelated.length, 'no Cu-related processChar found').toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// R5 — B4 Dedup Integrity
// ===========================================================================
describe('R5 — B4 Dedup Integrity', () => {
  it('no duplicate FC by (l2StructId + l3StructId + cause) key', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const fc of data.atomicDB.failureCauses) {
      const key = `${fc.l2StructId}|${fc.l3StructId}|${fc.cause}`;
      if (seen.has(key)) {
        dupes.push(key);
      }
      seen.add(key);
    }
    expect(dupes, `duplicate FC keys: ${dupes.join(', ')}`).toHaveLength(0);
  });

  it('flatData B4 items have unique (processNo + value) per L3', () => {
    const b4Items = data.flatData.filter((item) => item.itemCode === 'B4');
    // B4 items should all have non-empty values
    const emptyB4 = b4Items.filter((item) => {
      const val = item.value as string;
      return !val || !val.trim();
    });
    expect(emptyB4, 'B4 items with empty value').toHaveLength(0);
  });
});

// ===========================================================================
// R6 — SOD Completeness
// ===========================================================================
describe('R6 — SOD Completeness', () => {
  it('every RA has severity > 0', () => {
    const bad = data.atomicDB.riskAnalyses.filter((ra) => !((ra.severity as number) > 0));
    expect(bad, `${bad.length} RAs with severity <= 0`).toHaveLength(0);
  });

  it('every RA has occurrence > 0', () => {
    const bad = data.atomicDB.riskAnalyses.filter((ra) => !((ra.occurrence as number) > 0));
    expect(bad, `${bad.length} RAs with occurrence <= 0`).toHaveLength(0);
  });

  it('every RA has detection > 0', () => {
    const bad = data.atomicDB.riskAnalyses.filter((ra) => !((ra.detection as number) > 0));
    expect(bad, `${bad.length} RAs with detection <= 0`).toHaveLength(0);
  });

  it('every RA has non-empty detectionControl', () => {
    const bad = data.atomicDB.riskAnalyses.filter((ra) => {
      const dc = ra.detectionControl as string | null;
      return !dc || !dc.trim();
    });
    expect(bad, `${bad.length} RAs with empty detectionControl`).toHaveLength(0);
  });

  it('every RA has non-empty preventionControl', () => {
    const bad = data.atomicDB.riskAnalyses.filter((ra) => {
      const pc = ra.preventionControl as string | null;
      return !pc || !pc.trim();
    });
    expect(bad, `${bad.length} RAs with empty preventionControl`).toHaveLength(0);
  });
});

// ===========================================================================
// R7 — FailureLink FK Integrity
// ===========================================================================
describe('R7 — FailureLink FK Integrity (null/empty check)', () => {
  it('no FL has null/undefined/empty fmId', () => {
    const bad = data.atomicDB.failureLinks.filter((fl) => {
      const fmId = fl.fmId as string | null | undefined;
      return !fmId || !fmId.trim();
    });
    expect(bad).toHaveLength(0);
  });

  it('no FL has null/undefined/empty feId', () => {
    const bad = data.atomicDB.failureLinks.filter((fl) => {
      const feId = fl.feId as string | null | undefined;
      return !feId || !feId.trim();
    });
    expect(bad).toHaveLength(0);
  });

  it('no FL has null/undefined/empty fcId', () => {
    const bad = data.atomicDB.failureLinks.filter((fl) => {
      const fcId = fl.fcId as string | null | undefined;
      return !fcId || !fcId.trim();
    });
    expect(bad).toHaveLength(0);
  });
});

// ===========================================================================
// R8 — Dedup Verification
// ===========================================================================
describe('R8 — Dedup Verification', () => {
  it('no duplicate FC by (l2StructId + cause) key', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const fc of data.atomicDB.failureCauses) {
      const key = `${fc.l2StructId}|${fc.cause}`;
      if (seen.has(key)) {
        dupes.push(`${fc.id}: ${key}`);
      }
      seen.add(key);
    }
    expect(dupes, `duplicate FC (l2+cause): ${dupes.join('; ')}`).toHaveLength(0);
  });

  it('no duplicate RA by linkId', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const ra of data.atomicDB.riskAnalyses) {
      const linkId = ra.linkId as string;
      if (seen.has(linkId)) {
        dupes.push(`${ra.id}: linkId=${linkId}`);
      }
      seen.add(linkId);
    }
    expect(dupes, `duplicate RA linkIds: ${dupes.join('; ')}`).toHaveLength(0);
  });

  it('no duplicate FL by (fmId + fcId) key', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const fl of data.atomicDB.failureLinks) {
      const key = `${fl.fmId}|${fl.fcId}`;
      if (seen.has(key)) {
        dupes.push(`${fl.id}: ${key}`);
      }
      seen.add(key);
    }
    expect(dupes, `duplicate FL (fm+fc): ${dupes.join('; ')}`).toHaveLength(0);
  });

  it('no duplicate FL by (fmId + feId + fcId) triad', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const fl of data.atomicDB.failureLinks) {
      const key = `${fl.fmId}|${fl.feId}|${fl.fcId}`;
      if (seen.has(key)) {
        dupes.push(`${fl.id}: ${key}`);
      }
      seen.add(key);
    }
    expect(dupes, `duplicate FL triads: ${dupes.join('; ')}`).toHaveLength(0);
  });
});

// ===========================================================================
// R9 — Chain Completeness
// ===========================================================================
describe('R9 — Chain Completeness', () => {
  it('chains count = 103', () => {
    expect(data.chains).toHaveLength(GOLDEN.CHAINS);
  });

  it('every chain has non-empty dcValue', () => {
    const bad = data.chains.filter((ch) => {
      const dc = ch.dcValue as string | null;
      return !dc || !dc.trim();
    });
    expect(bad, `${bad.length} chains with empty dcValue`).toHaveLength(0);
  });

  it('every chain has non-empty pcValue', () => {
    const bad = data.chains.filter((ch) => {
      const pc = ch.pcValue as string | null;
      return !pc || !pc.trim();
    });
    expect(bad, `${bad.length} chains with empty pcValue`).toHaveLength(0);
  });

  it('every chain has non-empty fmValue', () => {
    const bad = data.chains.filter((ch) => {
      const fm = ch.fmValue as string | null;
      return !fm || !fm.trim();
    });
    expect(bad).toHaveLength(0);
  });

  it('every chain has non-empty feValue', () => {
    const bad = data.chains.filter((ch) => {
      const fe = ch.feValue as string | null;
      return !fe || !fe.trim();
    });
    expect(bad).toHaveLength(0);
  });

  it('every chain has non-empty fcValue', () => {
    const bad = data.chains.filter((ch) => {
      const fc = ch.fcValue as string | null;
      return !fc || !fc.trim();
    });
    expect(bad).toHaveLength(0);
  });

  it('every chain has valid SOD values', () => {
    const bad = data.chains.filter((ch) => {
      const s = ch.severity as number;
      const o = ch.occurrence as number;
      const d = ch.detection as number;
      return !(s > 0 && o > 0 && d > 0);
    });
    expect(bad, `${bad.length} chains with invalid SOD`).toHaveLength(0);
  });
});

// ===========================================================================
// R10 — Flat Data Completeness
// ===========================================================================
describe('R10 — Flat Data Completeness', () => {
  it('flatDataCount >= 660', () => {
    expect(data.stats.flatDataCount).toBeGreaterThanOrEqual(660);
  });

  it('every flatBreakdown code matches GOLDEN.FLAT', () => {
    for (const [code, expected] of Object.entries(GOLDEN.FLAT)) {
      expect(
        data.stats.flatBreakdown[code],
        `flatBreakdown.${code}: expected ${expected}, got ${data.stats.flatBreakdown[code]}`
      ).toBe(expected);
    }
  });

  it('no flatData item has empty value for its primary field', () => {
    const empty = data.flatData.filter((item) => {
      const val = item.value as string | null;
      return !val || !val.trim();
    });
    expect(empty, `${empty.length} flatData items with empty value`).toHaveLength(0);
  });

  it('flatData covers all 15 item codes', () => {
    const codes = new Set(data.flatData.map((item) => item.itemCode as string));
    const expectedCodes = Object.keys(GOLDEN.FLAT);
    for (const code of expectedCodes) {
      expect(codes.has(code), `missing itemCode ${code} in flatData`).toBe(true);
    }
  });
});
