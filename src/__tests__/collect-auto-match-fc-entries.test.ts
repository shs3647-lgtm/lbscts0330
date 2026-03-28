import { describe, expect, it } from 'vitest';
import {
  autoMatchLinkDedupKeys,
  fcEntriesFromPattern,
  fcEntriesSameProcessOnly,
} from '@/app/(fmea-core)/pfmea/worksheet/tabs/failure/collectAutoMatchFcEntries';
import type { FCItem, LinkResult } from '@/app/(fmea-core)/pfmea/worksheet/tabs/failure/FailureLinkTypes';

describe('collectAutoMatchFcEntries', () => {
  const fcA: FCItem = {
    id: 'fc-a',
    fcNo: 'C1',
    processName: 'NewProc',
    m4: 'MN',
    workElem: 'W1',
    text: 'Cause A',
  };
  const fcB: FCItem = {
    id: 'fc-b',
    fcNo: 'C2',
    processName: 'OldProc',
    m4: 'MC',
    workElem: 'W2',
    text: 'Cause B',
  };

  it('fcEntriesSameProcessOnly: 신규 공정명과 일치하는 FC만', () => {
    const rows = fcEntriesSameProcessOnly('NewProc', [fcA, fcB]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe('fc-a');
  });

  it('fcEntriesFromPattern: 맵 순서대로 엔트리', () => {
    const m = new Map<string, LinkResult>();
    const l1: LinkResult = {
      fmId: 'fm',
      fmText: 't',
      fmProcess: 'P',
      feId: 'fe',
      feNo: '1',
      feScope: 'YP',
      feText: 'e',
      severity: 1,
      fcId: 'fc-x',
      fcNo: 'C9',
      fcProcess: 'P',
      fcM4: 'MN',
      fcWorkElem: 'WE',
      fcText: 'x',
    };
    m.set('fc-x', l1);
    const rows = fcEntriesFromPattern(m);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe('fc-x');
    expect(rows[0]!.text).toBe('x');
  });

  it('autoMatchLinkDedupKeys: id 키와 복합키 둘 다 제공', () => {
    const fc = {
      id: 'id-1',
      fcNo: 'C1',
      process: 'PR Coating',
      m4: 'MC',
      workElem: 'Ch',
      text: 'Temp',
    };
    const keys = autoMatchLinkDedupKeys('fm-1', 'fe-1', fc, 'PR Coating');
    expect(keys).toContain('fm-1|fe-1|id-1');
    expect(keys).toHaveLength(2);
    expect(keys.some(k => k.includes('temp'))).toBe(true);
  });
});
