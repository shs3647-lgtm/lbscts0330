/**
 * @file computeFailureLinkStats.ts
 * @description 고장연결 탭 — FM/FE/FC 연결 통계 (누락 배너용)
 *
 * Rule 1.7: **FK(UUID)만** 집계한다. feText/fcText로 ID를 추론·매칭하지 않는다.
 * 링크의 feId/fcId가 feData/fcData에 없으면 해당 링크는 FE/FC 미연결로 본다 → DB/repair-fk로 ID 정합 필요.
 */

import type { FEItem, FCItem, FMItem, LinkResult } from './FailureLinkTypes';

export interface FailureLinkStats {
  feLinkedIds: Set<string>;
  feLinkedTexts: Set<string>;
  feLinkedCount: number;
  feMissingCount: number;
  fcLinkedIds: Set<string>;
  fcLinkedTexts: Set<string>;
  fcLinkedCount: number;
  fcMissingCount: number;
  fmLinkedIds: Set<string>;
  fmLinkedCount: number;
  fmMissingCount: number;
  fmLinkCounts: Map<string, { feCount: number; fcCount: number }>;
}

export function computeFailureLinkStats(
  savedLinks: LinkResult[],
  feData: FEItem[],
  fmData: FMItem[],
  fcData: FCItem[],
): FailureLinkStats {
  const feIdSet = new Set(feData.map(f => f.id));
  const fcIdSet = new Set(fcData.map(f => f.id));

  const feLinkedIds = new Set<string>();
  const fcLinkedIds = new Set<string>();
  const fmLinkedIds = new Set<string>();
  const fmLinkCounts = new Map<string, { feCount: number; fcCount: number }>();

  savedLinks.forEach(link => {
    if (link.fmId) fmLinkedIds.add(link.fmId);

    const idFe = (link.feId || '').trim();
    if (idFe && feIdSet.has(idFe)) feLinkedIds.add(idFe);

    const idFc = (link.fcId || '').trim();
    if (idFc && fcIdSet.has(idFc)) fcLinkedIds.add(idFc);

    if (!link.fmId) return;
    if (!fmLinkCounts.has(link.fmId)) {
      fmLinkCounts.set(link.fmId, { feCount: 0, fcCount: 0 });
    }
    const counts = fmLinkCounts.get(link.fmId)!;
    if (idFe && feIdSet.has(idFe)) counts.feCount++;
    if (idFc && fcIdSet.has(idFc)) counts.fcCount++;
  });

  const feLinkedCount = feData.filter(fe => feLinkedIds.has(fe.id)).length;
  const fcLinkedCount = fcData.filter(fc => fcLinkedIds.has(fc.id)).length;
  const fmLinkedCount = fmData.filter(fm => {
    const counts = fmLinkCounts.get(fm.id);
    return counts != null && counts.fcCount > 0;
  }).length;

  return {
    feLinkedIds,
    feLinkedTexts: new Set<string>(),
    feLinkedCount,
    feMissingCount: feData.length - feLinkedCount,
    fcLinkedIds,
    fcLinkedTexts: new Set<string>(),
    fcLinkedCount,
    fcMissingCount: fcData.length - fcLinkedCount,
    fmLinkedIds,
    fmLinkedCount,
    fmMissingCount: fmData.length - fmLinkedCount,
    fmLinkCounts,
  };
}
