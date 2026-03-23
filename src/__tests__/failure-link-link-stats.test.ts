import { describe, expect, it } from 'vitest';
import { computeFailureLinkStats } from '@/app/(fmea-core)/pfmea/worksheet/tabs/failure/computeFailureLinkStats';
import type { FEItem, FCItem, FMItem, LinkResult } from '@/app/(fmea-core)/pfmea/worksheet/tabs/failure/FailureLinkTypes';

describe('computeFailureLinkStats (FK/UUID only)', () => {
  const fm: FMItem = {
    id: 'fm-1',
    fmNo: '1',
    processName: 'P1',
    processNo: '10',
    text: 'FM-A',
  };

  it('counts FE/FC only when feId/fcId exist in feData/fcData', () => {
    const feData: FEItem[] = [{ id: 'fe-1', scope: 'YP', feNo: '1', text: 'E1' }];
    const fcData: FCItem[] = [{ id: 'fc-1', fcNo: '1', processName: 'P1', m4: 'MN', workElem: 'W', text: 'C1' }];
    const links: LinkResult[] = [
      {
        fmId: fm.id,
        fmText: fm.text,
        fmProcess: fm.processName,
        fmProcessNo: fm.processNo,
        feId: 'fe-1',
        feNo: '1',
        feScope: 'YP',
        feText: 'E1',
        severity: 1,
        fcId: 'fc-1',
        fcNo: '1',
        fcProcess: 'P1',
        fcM4: 'MN',
        fcWorkElem: 'W',
        fcText: 'C1',
      },
    ];

    const s = computeFailureLinkStats(links, feData, [fm], fcData);
    expect(s.feMissingCount).toBe(0);
    expect(s.fcMissingCount).toBe(0);
    expect(s.fmLinkCounts.get(fm.id)?.feCount).toBe(1);
    expect(s.fmLinkCounts.get(fm.id)?.fcCount).toBe(1);
  });

  it('stale feId: feText alone does NOT mark feData rows as linked', () => {
    const feData: FEItem[] = [
      { id: 'fe-old', scope: 'YP', feNo: '1', text: 'Same effect' },
      { id: 'fe-new', scope: 'YP', feNo: '2', text: 'Same effect' },
    ];
    const fcData: FCItem[] = [
      { id: 'fc-1', fcNo: '1', processName: 'P1', m4: 'MN', workElem: 'W', text: 'Cause A' },
    ];
    const links: LinkResult[] = [
      {
        fmId: fm.id,
        fmText: fm.text,
        fmProcess: fm.processName,
        fmProcessNo: fm.processNo,
        feId: 'stale-fe-id-not-in-feData',
        feNo: '1',
        feScope: 'YP',
        feText: 'Same effect',
        severity: 1,
        fcId: 'fc-1',
        fcNo: '1',
        fcProcess: 'P1',
        fcM4: 'MN',
        fcWorkElem: 'W',
        fcText: 'Cause A',
      },
    ];

    const s = computeFailureLinkStats(links, feData, [fm], fcData);
    expect(s.feMissingCount).toBe(2);
    expect(s.fcMissingCount).toBe(0);
    expect(s.fmLinkCounts.get(fm.id)?.feCount).toBe(0);
    expect(s.fmLinkCounts.get(fm.id)?.fcCount).toBe(1);
  });

  it('empty feId/fcId with only feText/fcText: no FE/FC link credit', () => {
    const feData: FEItem[] = [{ id: 'fe-1', scope: 'YP', feNo: '1', text: 'E1' }];
    const fcData: FCItem[] = [{ id: 'fc-1', fcNo: '1', processName: 'P1', m4: 'MN', workElem: 'W', text: 'C1' }];
    const links: LinkResult[] = [
      {
        fmId: fm.id,
        fmText: fm.text,
        fmProcess: fm.processName,
        fmProcessNo: fm.processNo,
        feId: '',
        feNo: '',
        feScope: '',
        feText: 'E1',
        severity: 0,
        fcId: '',
        fcNo: '',
        fcProcess: '',
        fcM4: '',
        fcWorkElem: '',
        fcText: 'C1',
      },
    ];

    const s = computeFailureLinkStats(links, feData, [fm], fcData);
    expect(s.feMissingCount).toBe(1);
    expect(s.fcMissingCount).toBe(1);
    expect(s.fmLinkCounts.get(fm.id)?.feCount).toBe(0);
    expect(s.fmLinkCounts.get(fm.id)?.fcCount).toBe(0);
  });
});
