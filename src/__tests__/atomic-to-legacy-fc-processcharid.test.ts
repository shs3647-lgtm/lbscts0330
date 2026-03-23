/**
 * FC.processCharId vs l3FuncId — 3L 고장 탭 누락 가짜 양산 방지 (atomicToLegacy)
 */
import { describe, expect, it } from 'vitest';
import {
  atomicToLegacy,
  pickLegacyFcProcessCharId,
} from '@/app/(fmea-core)/pfmea/worksheet/atomicToLegacyAdapter';
import type { FMEAWorksheetDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';
import { createEmptyDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';

describe('atomicToLegacy failureCauses.processCharId', () => {
  it('uses l3FuncId when processCharId is stale (must match L3Function.id = B3 cell id)', () => {
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
        {
          id: L3_ID,
          fmeaId: 'pfm-test',
          l1Id: 'l1-test',
          l2Id: L2_ID,
          m4: 'IM',
          name: 'WE',
          order: 1,
        },
      ],
      l3Functions: [
        {
          id: L3F_ID,
          fmeaId: 'pfm-test',
          l3StructId: L3_ID,
          l2StructId: L2_ID,
          functionName: '기능1',
          processChar: '공정특성A',
        },
      ],
      failureCauses: [
        {
          id: 'fc-test',
          fmeaId: 'pfm-test',
          l3FuncId: L3F_ID,
          l3StructId: L3_ID,
          l2StructId: L2_ID,
          processCharId: 'wrong-legacy-import-uuid',
          cause: '고장원인1',
        },
      ],
    };

    const legacy = atomicToLegacy(db);
    const proc = legacy.l2[0];
    const causes = proc.failureCauses ?? [];
    const fc = causes[0];
    expect(causes.length).toBeGreaterThan(0);
    expect(fc).toBeDefined();
    expect(fc!.processCharId).toBe(L3F_ID);

    const we = proc.l3[0];
    const pcId = we.functions[0].processChars[0].id;
    expect(pcId).toBe(L3F_ID);
    expect(fc!.processCharId).toBe(pcId);
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

  it('atomicToLegacy: L3Function.l2StructId가 l3Structure와 불일치해도 FC→B3 연결 유지', () => {
    const L2_ID = 'l2-test';
    const L2_WRONG = 'l2-wrong';
    const L3_ID = 'l3-test';
    const L3F_ID = 'l3func-test';

    const db: FMEAWorksheetDB = {
      ...createEmptyDB('pfm-test'),
      l1Structure: { id: 'l1-test', fmeaId: 'pfm-test', name: '제품' },
      l2Structures: [
        { id: L2_ID, fmeaId: 'pfm-test', l1Id: 'l1-test', no: '10', name: '공정', order: 1 },
      ],
      l3Structures: [
        {
          id: L3_ID,
          fmeaId: 'pfm-test',
          l1Id: 'l1-test',
          l2Id: L2_ID,
          m4: 'IM',
          name: 'WE',
          order: 1,
        },
      ],
      l3Functions: [
        {
          id: L3F_ID,
          fmeaId: 'pfm-test',
          l3StructId: L3_ID,
          l2StructId: L2_WRONG,
          functionName: '기능1',
          processChar: '공정특성A',
        },
      ],
      failureCauses: [
        {
          id: 'fc-test',
          fmeaId: 'pfm-test',
          l3FuncId: L3F_ID,
          l3StructId: L3_ID,
          l2StructId: L2_ID,
          processCharId: 'wrong-legacy-import-uuid',
          cause: '고장원인1',
        },
      ],
    };

    const legacy = atomicToLegacy(db);
    const proc = legacy.l2[0];
    const fc = (proc.failureCauses ?? [])[0];
    expect(fc?.processCharId).toBe(L3F_ID);
    expect(proc.l3[0]?.functions[0]?.processChars[0]?.id).toBe(L3F_ID);
  });
});
