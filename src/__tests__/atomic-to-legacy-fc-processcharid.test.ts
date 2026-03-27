/**
 * FC.processCharId vs l3FuncId — 3L 고장 탭 누락 가짜 양산 방지
 * 2026-03-27: atomicToLegacy 삭제 → buildLegacyCompat + pickFcProcessCharId 테스트
 */
import { describe, expect, it } from 'vitest';
import { pickLegacyFcProcessCharId } from '@/app/(fmea-core)/pfmea/worksheet/schema/utils/fcProcessCharPicker';
import { buildLegacyCompat } from '@/app/(fmea-core)/pfmea/worksheet/hooks/legacyCompatBuilder';
import type { FMEAWorksheetDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';
import { createEmptyDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';

describe('buildLegacyCompat failureCauses.processCharId', () => {
  it('uses l3FuncId for FC processCharId in legacy compat', () => {
    const L2_ID = 'l2-test';
    const L3_ID = 'l3-test';
    const L3F_ID = 'l3func-test';

    const db: FMEAWorksheetDB = {
      ...createEmptyDB('pfm-test'),
      l1Structure: { id: 'l1-test', fmeaId: 'pfm-test', name: '제품' },
      l2Structures: [
        { id: L2_ID, fmeaId: 'pfm-test', l1Id: 'l1-test', no: '10', name: '공정', order: 1 },
      ],
      l3Structures: [
        { id: L3_ID, fmeaId: 'pfm-test', l1Id: 'l1-test', l2Id: L2_ID, m4: 'IM', name: 'WE', order: 1 },
      ],
      l3Functions: [
        { id: L3F_ID, fmeaId: 'pfm-test', l3StructId: L3_ID, l2StructId: L2_ID, functionName: '기능1', processChar: '공정특성A' },
      ],
      failureCauses: [
        { id: 'fc-test', fmeaId: 'pfm-test', l3FuncId: L3F_ID, l3StructId: L3_ID, l2StructId: L2_ID, processCharId: 'wrong-legacy-import-uuid', cause: '고장원인1' },
      ],
    };

    const compat = buildLegacyCompat(db, '');
    const proc = compat.l2[0];
    const causes = proc.failureCauses ?? [];
    const fc = causes[0];
    expect(causes.length).toBeGreaterThan(0);
    expect(fc).toBeDefined();
    expect(fc!.processCharId).toBe(L3F_ID);
  });

  it('pickLegacyFcProcessCharId: l3FuncId invalid but processCharId valid → uses processCharId', () => {
    const valid = new Set(['good-pc-id']);
    expect(
      pickLegacyFcProcessCharId(
        { l3FuncId: 'wrong-l3func', processCharId: 'good-pc-id' },
        valid,
      ),
    ).toBe('good-pc-id');
  });
});
