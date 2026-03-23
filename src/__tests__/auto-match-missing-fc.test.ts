/**
 * @file auto-match-missing-fc.test.ts
 * @description handleAutoMatchMissing Phase 2 — 미연결 FC 자동연결 검증
 *
 * computeFailureLinkStats의 fcLinkedIds에 없는 FC가 같은 공정 FM+FE와 자동연결되는지 확인.
 */
import { describe, expect, it } from 'vitest';
import { computeFailureLinkStats } from '@/app/(fmea-core)/pfmea/worksheet/tabs/failure/computeFailureLinkStats';
import type { FEItem, FCItem, FMItem, LinkResult } from '@/app/(fmea-core)/pfmea/worksheet/tabs/failure/FailureLinkTypes';

/** 최소 LinkResult 생성 헬퍼 */
function makeLink(fm: FMItem, fe: FEItem, fc: FCItem): LinkResult {
  return {
    fmId: fm.id, fmNo: fm.fmNo, fmText: fm.text,
    fmProcess: fm.processName, fmProcessNo: fm.processNo || '',
    feId: fe.id, feNo: fe.feNo, feScope: fe.scope,
    feText: fe.text, severity: fe.severity || 0,
    fcId: fc.id, fcNo: fc.fcNo, fcProcess: fc.processName,
    fcM4: fc.m4, fcWorkElem: fc.workElem, fcText: fc.text,
  };
}

describe('미연결 FC 자동연결 (Phase 2) — computeFailureLinkStats 기반 검증', () => {
  const fe1: FEItem = { id: 'fe-1', scope: 'YP', feNo: 'Y1', text: 'Yield loss' };
  const fm1: FMItem = { id: 'fm-1', fmNo: 'M1', processName: 'PR Coating', processNo: '10', text: 'Thickness' };
  const fm2: FMItem = { id: 'fm-2', fmNo: 'M2', processName: 'Develop', processNo: '15', text: 'Residue' };
  const fc1: FCItem = { id: 'fc-1', fcNo: 'C1', processName: 'PR Coating', m4: 'MC', workElem: 'Chamber', text: 'Temp' };
  const fc2: FCItem = { id: 'fc-2', fcNo: 'C2', processName: 'PR Coating', m4: 'MN', workElem: 'Worker', text: 'Skill' };
  const fc3: FCItem = { id: 'fc-3', fcNo: 'C3', processName: 'Develop', m4: 'MC', workElem: 'Tank', text: 'Conc' };

  it('기존 링크가 fc1만 포함 → fc2는 fcLinkedIds에 없음 (미연결 대상)', () => {
    const links: LinkResult[] = [makeLink(fm1, fe1, fc1)];
    const fcData = [fc1, fc2];
    const stats = computeFailureLinkStats(links, [fe1], [fm1], fcData);

    expect(stats.fcLinkedIds.has('fc-1')).toBe(true);
    expect(stats.fcLinkedIds.has('fc-2')).toBe(false);
    expect(stats.fcMissingCount).toBe(1);
  });

  it('모든 FC가 링크에 있으면 fcMissingCount=0', () => {
    const links: LinkResult[] = [
      makeLink(fm1, fe1, fc1),
      makeLink(fm1, fe1, fc2),
      makeLink(fm2, fe1, fc3),
    ];
    const stats = computeFailureLinkStats(links, [fe1], [fm1, fm2], [fc1, fc2, fc3]);

    expect(stats.fcMissingCount).toBe(0);
    expect(stats.fcLinkedIds.size).toBe(3);
  });

  it('16건 미연결 FC 시뮬레이션 — 모두 fcLinkedIds 밖', () => {
    // FM 1건 + FE 1건 + FC 20건 중 4건만 링크
    const allFCs: FCItem[] = Array.from({ length: 20 }, (_, i) => ({
      id: `fc-${i}`, fcNo: `C${i}`, processName: 'PR Coating',
      m4: 'MC', workElem: 'WE', text: `Cause-${i}`,
    }));
    const linkedFCs = allFCs.slice(0, 4);
    const links = linkedFCs.map(fc => makeLink(fm1, fe1, fc));

    const stats = computeFailureLinkStats(links, [fe1], [fm1], allFCs);

    expect(stats.fcLinkedCount).toBe(4);
    expect(stats.fcMissingCount).toBe(16);

    // Phase 2 시뮬레이션: 미연결 FC를 같은 공정 FM+FE로 연결
    const unlinkedFCs = allFCs.filter(fc => !stats.fcLinkedIds.has(fc.id));
    expect(unlinkedFCs.length).toBe(16);

    // 자동연결 후 새 링크 추가
    const newLinks = [...links];
    for (const fc of unlinkedFCs) {
      newLinks.push(makeLink(fm1, fe1, fc));
    }

    const stats2 = computeFailureLinkStats(newLinks, [fe1], [fm1], allFCs);
    expect(stats2.fcMissingCount).toBe(0);
    expect(stats2.fcLinkedCount).toBe(20);
  });

  it('다른 공정 FC도 같은 공정 FM이 있으면 연결 가능', () => {
    // fc3 = Develop 공정, fm2 = Develop 공정
    const links: LinkResult[] = [makeLink(fm1, fe1, fc1)]; // PR Coating만 연결
    const stats = computeFailureLinkStats(links, [fe1], [fm1, fm2], [fc1, fc2, fc3]);

    expect(stats.fcMissingCount).toBe(2); // fc2, fc3 미연결

    // Phase 2: fc2→fm1(PR Coating), fc3→fm2(Develop)
    const newLinks = [...links, makeLink(fm1, fe1, fc2), makeLink(fm2, fe1, fc3)];
    const stats2 = computeFailureLinkStats(newLinks, [fe1], [fm1, fm2], [fc1, fc2, fc3]);
    expect(stats2.fcMissingCount).toBe(0);
  });
});
