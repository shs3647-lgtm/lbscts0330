import { describe, expect, it } from 'vitest';
import { computeFailureLinkStats } from '@/app/(fmea-core)/pfmea/worksheet/tabs/failure/computeFailureLinkStats';
import type { FEItem, FCItem, FMItem, LinkResult } from '@/app/(fmea-core)/pfmea/worksheet/tabs/failure/FailureLinkTypes';

describe('computeFailureLinkStats (UUID + 링크 메타데이터 보강)', () => {
  const fm: FMItem = {
    id: 'fm-1',
    fmNo: '1',
    processName: 'P1',
    processNo: '10',
    text: 'FM-A',
  };

  it('feId/fcId가 데이터셋과 일치하면 연결로 집계', () => {
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

  it('stale feId + feNo/feText로 유일 특정 → 해당 FE 연결로 집계', () => {
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
    expect(s.feMissingCount).toBe(1);
    expect(s.fcMissingCount).toBe(0);
    expect(s.feLinkedIds.has('fe-old')).toBe(true);
    expect(s.fmLinkCounts.get(fm.id)?.feCount).toBe(1);
    expect(s.fmLinkCounts.get(fm.id)?.fcCount).toBe(1);
  });

  it('빈 feId/fcId + feText/fcText만 있어도 유일 후보면 연결로 집계', () => {
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
        fcProcess: 'P1',
        fcM4: '',
        fcWorkElem: '',
        fcText: 'C1',
      },
    ];

    const s = computeFailureLinkStats(links, feData, [fm], fcData);
    expect(s.feMissingCount).toBe(0);
    expect(s.fcMissingCount).toBe(0);
    expect(s.fmLinkCounts.get(fm.id)?.feCount).toBe(1);
    expect(s.fmLinkCounts.get(fm.id)?.fcCount).toBe(1);
  });

  it('stale fcId + fcNo/공정/fcText로 유일 특정 → 해당 FC 연결로 집계', () => {
    const feData: FEItem[] = [{ id: 'fe-1', scope: 'YP', feNo: '1', text: 'E1' }];
    const fcData: FCItem[] = [
      { id: 'fc-real', fcNo: 'C33', processName: 'UBM Sputter', m4: 'MC', workElem: 'W', text: 'Gas 압력' },
    ];
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
        fcId: 'ghost-fc-uuid',
        fcNo: 'C33',
        fcProcess: 'UBM Sputter',
        fcM4: 'MC',
        fcWorkElem: 'W',
        fcText: 'Gas 압력',
      },
    ];

    const s = computeFailureLinkStats(links, feData, [fm], fcData);
    expect(s.fcMissingCount).toBe(0);
    expect(s.fcLinkedIds.has('fc-real')).toBe(true);
    expect(s.fmLinkCounts.get(fm.id)?.fcCount).toBe(1);
  });

  it('동일 공정·동일 fcText 다건 — fcM4+fcWorkElem으로 특정 (stale fcId·잘못된 fcNo)', () => {
    const feData: FEItem[] = [{ id: 'fe-1', scope: 'YP', feNo: '1', text: 'E1' }];
    const fcData: FCItem[] = [
      { id: 'fc-a', fcNo: 'C9', processName: 'Sorter', m4: 'MN', workElem: 'WE-A', text: '작업 숙련도 부족' },
      { id: 'fc-b', fcNo: 'C10', processName: 'Sorter', m4: 'MC', workElem: 'WE-B', text: '작업 숙련도 부족' },
    ];
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
        fcId: 'stale-fc-uuid',
        fcNo: 'C999',
        fcProcess: 'Sorter',
        fcM4: 'MC',
        fcWorkElem: 'WE-B',
        fcText: '작업 숙련도 부족',
      },
    ];

    const s = computeFailureLinkStats(links, feData, [fm], fcData);
    expect(s.fcLinkedIds.has('fc-b')).toBe(true);
    expect(s.fcMissingCount).toBe(1);
    expect(s.fmLinkCounts.get(fm.id)?.fcCount).toBe(1);
  });

  it('복합키(공정|m4|we|원인)가 fcNo·stale fcId보다 우선', () => {
    const feData: FEItem[] = [{ id: 'fe-1', scope: 'YP', feNo: '1', text: 'E1' }];
    const fcData: FCItem[] = [
      { id: 'fc-wrong', fcNo: 'C9', processName: 'IQA(수입검사)', m4: 'MN', workElem: 'WE-X', text: '판정 기준 오적용' },
      { id: 'fc-right', fcNo: 'C10', processName: 'IQA(수입검사)', m4: 'MC', workElem: 'WE-Y', text: '판정 기준 오적용' },
    ];
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
        fcId: 'stale',
        fcNo: 'C9',
        fcProcess: 'IQA(수입검사)',
        fcM4: 'MC',
        fcWorkElem: 'WE-Y',
        fcText: '판정 기준 오적용',
      },
    ];

    const s = computeFailureLinkStats(links, feData, [fm], fcData);
    expect(s.fcLinkedIds.has('fc-right')).toBe(true);
    expect(s.fcLinkedIds.has('fc-wrong')).toBe(false);
    expect(s.fcMissingCount).toBe(1);
  });
});
