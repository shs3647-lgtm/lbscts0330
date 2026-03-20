/**
 * Structure Guard Tests for m066 Au Bump FMEA
 *
 * Validates STRUCTURAL RULES that must never be violated.
 * Think of this as "building code inspection" — not checking if the
 * furniture is pretty, but whether the load-bearing walls are intact.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

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
  stats: Record<string, unknown>;
}

let data: MasterJSON;

beforeAll(() => {
  const filePath = path.resolve('data/master-fmea/pfm26-m066.json');
  data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as MasterJSON;
});

// ===========================================================================
// 1. L1 structure: exactly 1 L1, 3 categories (YP/SP/USER)
// ===========================================================================
describe('SG1 — L1 Structure Integrity', () => {
  it('exactly 1 L1 structure exists', () => {
    expect(data.atomicDB.l1Structure).toBeDefined();
    expect(data.atomicDB.l1Structure.id).toBeTruthy();
  });

  it('L1 name is "12INCH AU BUMP"', () => {
    expect(data.atomicDB.l1Structure.name).toBe('12INCH AU BUMP');
  });

  it('L1 functions have exactly 3 categories: YP, SP, USER', () => {
    const categories = [
      ...new Set(data.atomicDB.l1Functions.map((f) => f.category as string)),
    ].sort();
    expect(categories).toEqual(['SP', 'USER', 'YP']);
  });

  it('L1 category distribution: YP=8, SP=6, USER=3', () => {
    const byCat = (cat: string) =>
      data.atomicDB.l1Functions.filter((f) => f.category === cat).length;
    expect(byCat('YP')).toBe(8);
    expect(byCat('SP')).toBe(6);
    expect(byCat('USER')).toBe(3);
  });

  it('total L1 functions = 17', () => {
    expect(data.atomicDB.l1Functions).toHaveLength(17);
  });
});

// ===========================================================================
// 2. L2 process numbering: all 21 processes present
// ===========================================================================
describe('SG2 — L2 Process Numbering', () => {
  const EXPECTED_PROCESS_NOS = [
    '01',
    '10',
    '20',
    '30',
    '40',
    '50',
    '60',
    '70',
    '80',
    '90',
    '100',
    '110',
    '120',
    '130',
    '140',
    '150',
    '160',
    '170',
    '180',
    '190',
    '200',
  ];

  it('exactly 21 L2 processes exist', () => {
    expect(data.atomicDB.l2Structures).toHaveLength(21);
  });

  it('all expected process numbers are present', () => {
    const processNos = data.atomicDB.l2Structures
      .map((l2) => l2.no as string)
      .sort((a, b) => Number(a) - Number(b));
    expect(processNos).toEqual(EXPECTED_PROCESS_NOS);
  });

  it('every L2 has a non-empty name', () => {
    const empty = data.atomicDB.l2Structures.filter((l2) => {
      const name = l2.name as string | null;
      return !name || !name.trim();
    });
    expect(empty).toHaveLength(0);
  });

  it('every L2 has valid order field', () => {
    const orders = data.atomicDB.l2Structures.map((l2) => l2.order as number);
    for (const order of orders) {
      expect(order).toBeGreaterThanOrEqual(1);
    }
    // All orders should be unique
    expect(new Set(orders).size).toBe(orders.length);
  });
});

// ===========================================================================
// 3. L3 per L2 distribution: minimum 4 per process
// ===========================================================================
describe('SG3 — L3 per L2 Distribution', () => {
  it('every L2 has at least 4 L3 children', () => {
    const l3CountByL2 = new Map<string, number>();
    for (const l3 of data.atomicDB.l3Structures) {
      const l2Id = l3.l2Id as string;
      l3CountByL2.set(l2Id, (l3CountByL2.get(l2Id) ?? 0) + 1);
    }

    for (const l2 of data.atomicDB.l2Structures) {
      const l2Id = l2.id as string;
      const count = l3CountByL2.get(l2Id) ?? 0;
      expect(count, `L2 process ${l2.no} has only ${count} L3 children`).toBeGreaterThanOrEqual(4);
    }
  });

  it('total L3 count = 91', () => {
    expect(data.atomicDB.l3Structures).toHaveLength(91);
  });

  it('L3 distribution range: 4-6 per L2', () => {
    const l3CountByL2 = new Map<string, number>();
    for (const l3 of data.atomicDB.l3Structures) {
      const l2Id = l3.l2Id as string;
      l3CountByL2.set(l2Id, (l3CountByL2.get(l2Id) ?? 0) + 1);
    }

    const counts = [...l3CountByL2.values()];
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...counts)).toBeLessThanOrEqual(6);
  });
});

// ===========================================================================
// 4. 4M categories: every L3 has valid m4
// ===========================================================================
describe('SG4 — 4M Category Validation', () => {
  const VALID_M4 = new Set(['MN', 'MC', 'IM', 'EN']);

  it('every L3 has a valid m4 value (MN/MC/IM/EN)', () => {
    const invalid = data.atomicDB.l3Structures.filter(
      (l3) => !VALID_M4.has(l3.m4 as string)
    );
    expect(
      invalid,
      `${invalid.length} L3s with invalid m4: ${invalid.map((l) => `${l.id}=${l.m4}`).join(', ')}`
    ).toHaveLength(0);
  });

  it('all 4 categories are represented', () => {
    const m4Values = [...new Set(data.atomicDB.l3Structures.map((l3) => l3.m4 as string))].sort();
    expect(m4Values).toEqual(['EN', 'IM', 'MC', 'MN']);
  });

  it('no L3 has null/empty m4', () => {
    const empty = data.atomicDB.l3Structures.filter((l3) => {
      const m4 = l3.m4 as string | null;
      return !m4 || !m4.trim();
    });
    expect(empty).toHaveLength(0);
  });
});

// ===========================================================================
// 5. FM:L2 ratio — every L2 has at least 1 FM, total FM=26
// ===========================================================================
describe('SG5 — FM:L2 Coverage', () => {
  it('every L2 has at least 1 FM (full coverage)', () => {
    const fmByL2 = new Map<string, number>();
    for (const fm of data.atomicDB.failureModes) {
      const l2Id = fm.l2StructId as string;
      fmByL2.set(l2Id, (fmByL2.get(l2Id) ?? 0) + 1);
    }

    for (const l2 of data.atomicDB.l2Structures) {
      const count = fmByL2.get(l2.id as string) ?? 0;
      expect(count, `L2 ${l2.no} has 0 failure modes`).toBeGreaterThanOrEqual(1);
    }
  });

  it('total FM count = 26 across 21 L2 processes', () => {
    expect(data.atomicDB.failureModes).toHaveLength(26);
    const uniqueL2s = new Set(data.atomicDB.failureModes.map((fm) => fm.l2StructId as string));
    expect(uniqueL2s.size).toBe(21);
  });

  it('FM per L2 ranges from 1 to 2', () => {
    const fmByL2 = new Map<string, number>();
    for (const fm of data.atomicDB.failureModes) {
      const l2Id = fm.l2StructId as string;
      fmByL2.set(l2Id, (fmByL2.get(l2Id) ?? 0) + 1);
    }
    const counts = [...fmByL2.values()];
    expect(Math.min(...counts)).toBe(1);
    expect(Math.max(...counts)).toBe(2);
  });
});

// ===========================================================================
// 6. FC:L3F linkage — every FC's l3FuncId points to valid L3Function in same L3
// ===========================================================================
describe('SG6 — FC:L3Function Cross-Validation', () => {
  it('every FC.l3FuncId points to a L3Function in the same L3Structure', () => {
    // Build L3Function → L3Structure mapping
    const l3FuncToL3Struct = new Map<string, string>();
    for (const l3f of data.atomicDB.l3Functions) {
      l3FuncToL3Struct.set(l3f.id as string, l3f.l3StructId as string);
    }

    const mismatches: string[] = [];
    for (const fc of data.atomicDB.failureCauses) {
      const fcL3StructId = fc.l3StructId as string;
      const fcL3FuncId = fc.l3FuncId as string;
      const funcL3StructId = l3FuncToL3Struct.get(fcL3FuncId);

      if (!funcL3StructId) {
        mismatches.push(`FC ${fc.id}: l3FuncId ${fcL3FuncId} not found`);
      } else if (funcL3StructId !== fcL3StructId) {
        mismatches.push(
          `FC ${fc.id}: l3StructId=${fcL3StructId} but l3Func.l3StructId=${funcL3StructId}`
        );
      }
    }
    expect(mismatches, mismatches.join('\n')).toHaveLength(0);
  });

  it('every FC.l2StructId matches its L3Function.l2StructId', () => {
    const l3FuncToL2 = new Map<string, string>();
    for (const l3f of data.atomicDB.l3Functions) {
      l3FuncToL2.set(l3f.id as string, l3f.l2StructId as string);
    }

    const mismatches: string[] = [];
    for (const fc of data.atomicDB.failureCauses) {
      const fcL2 = fc.l2StructId as string;
      const funcL2 = l3FuncToL2.get(fc.l3FuncId as string);
      if (funcL2 && fcL2 !== funcL2) {
        mismatches.push(`FC ${fc.id}: l2StructId=${fcL2} but l3Func.l2StructId=${funcL2}`);
      }
    }
    expect(mismatches, mismatches.join('\n')).toHaveLength(0);
  });
});

// ===========================================================================
// 7. FL triad uniqueness
// ===========================================================================
describe('SG7 — FailureLink Triad Uniqueness', () => {
  it('every (fmId, feId, fcId) combination is unique', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const fl of data.atomicDB.failureLinks) {
      const key = `${fl.fmId}|${fl.feId}|${fl.fcId}`;
      if (seen.has(key)) {
        dupes.push(`FL ${fl.id}: ${key}`);
      }
      seen.add(key);
    }
    expect(dupes, `duplicate triads:\n${dupes.join('\n')}`).toHaveLength(0);
  });

  it('every FL id is unique', () => {
    const ids = data.atomicDB.failureLinks.map((fl) => fl.id as string);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no FL has deletedAt set (all active)', () => {
    const deleted = data.atomicDB.failureLinks.filter((fl) => fl.deletedAt != null);
    expect(deleted).toHaveLength(0);
  });
});

// ===========================================================================
// 8. RA:FL ratio — exactly 1 RA per FL (1:1)
// ===========================================================================
describe('SG8 — RA:FL 1:1 Ratio', () => {
  it('RA count equals FL count', () => {
    expect(data.atomicDB.riskAnalyses.length).toBe(data.atomicDB.failureLinks.length);
  });

  it('every FL has exactly 1 RA', () => {
    const raByLink = new Map<string, number>();
    for (const ra of data.atomicDB.riskAnalyses) {
      const linkId = ra.linkId as string;
      raByLink.set(linkId, (raByLink.get(linkId) ?? 0) + 1);
    }

    // Check no FL is missing an RA
    const flIds = data.atomicDB.failureLinks.map((fl) => fl.id as string);
    const missingRa = flIds.filter((id) => !raByLink.has(id));
    expect(missingRa, `FLs missing RA: ${missingRa.join(', ')}`).toHaveLength(0);

    // Check no FL has more than 1 RA
    const multiRa = [...raByLink.entries()].filter(([, count]) => count > 1);
    expect(
      multiRa,
      `FLs with multiple RAs: ${multiRa.map(([id, c]) => `${id}:${c}`).join(', ')}`
    ).toHaveLength(0);
  });

  it('every RA.linkId points to an existing FL', () => {
    const flIds = new Set(data.atomicDB.failureLinks.map((fl) => fl.id));
    const orphanRa = data.atomicDB.riskAnalyses.filter(
      (ra) => !flIds.has(ra.linkId as string)
    );
    expect(orphanRa, `orphan RAs: ${orphanRa.map((r) => r.id).join(', ')}`).toHaveLength(0);
  });
});

// ===========================================================================
// 9. processNo format validation
// ===========================================================================
describe('SG9 — processNo Format', () => {
  it('all L2 processNos are valid numeric strings', () => {
    for (const l2 of data.atomicDB.l2Structures) {
      const no = l2.no as string;
      expect(no, `L2 ${l2.id} has non-string processNo`).toBeTruthy();
      expect(Number.isFinite(Number(no)), `L2 processNo "${no}" is not numeric`).toBe(true);
    }
  });

  it('processNos are ordered by numeric value', () => {
    const sorted = [...data.atomicDB.l2Structures].sort(
      (a, b) => (a.order as number) - (b.order as number)
    );
    const nums = sorted.map((l2) => Number(l2.no));
    for (let i = 1; i < nums.length; i++) {
      expect(
        nums[i],
        `processNo order violation at index ${i}: ${nums[i - 1]} -> ${nums[i]}`
      ).toBeGreaterThan(nums[i - 1]);
    }
  });

  it('first process is "01" (zero-padded)', () => {
    const sorted = [...data.atomicDB.l2Structures].sort(
      (a, b) => (a.order as number) - (b.order as number)
    );
    expect(sorted[0].no).toBe('01');
  });

  it('all processNos are unique', () => {
    const nos = data.atomicDB.l2Structures.map((l2) => l2.no as string);
    expect(new Set(nos).size).toBe(nos.length);
  });
});
