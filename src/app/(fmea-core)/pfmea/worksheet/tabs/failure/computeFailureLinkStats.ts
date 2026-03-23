/**
 * @file computeFailureLinkStats.ts
 * @description 고장연결 탭 — FM/FE/FC 연결 통계 (누락 배너용)
 *
 * ★ 2026-03-24: 누락 집계 완화 — savedLinks에 행이 있으면 **UUID 일치가 아니어도**
 *   링크에 실린 feText/fcText + feNo/fcNo + 공정명으로 feData/fcData 행을 **유일하게** 특정할 수 있으면
 *   "연결됨"으로 본다 (Import·재로드 후 feId/fcId 불일치로 가짜 누락이 쌓이는 문제 방지).
 *   유일하지 않으면 매칭하지 않음(오연결 방지).
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

function norm(s: string): string {
  return s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function procMatch(fcProcessName: string, linkFcProc: string, linkFmProc: string): boolean {
  const p = fcProcessName.trim();
  const a = linkFcProc.trim();
  const b = linkFmProc.trim();
  if (!a && !b) return true;
  if (a && p === a) return true;
  if (b && p === b) return true;
  return false;
}

/** 링크 → feData id (UUID 일치 우선, 실패 시 feNo+텍스트(+scope)로 유일 후보만) */
function resolveFeId(link: LinkResult, feData: FEItem[], feIdSet: Set<string>): string | undefined {
  const id = (link.feId || '').trim();
  if (id && feIdSet.has(id)) return id;

  const t = (link.feText || '').trim();
  if (!t) return undefined;
  const nt = norm(t);

  let cand = feData.filter(fe => norm(fe.text) === nt);
  if (cand.length === 0) return undefined;

  const feNo = (link.feNo || '').trim();
  if (feNo) {
    const byNo = cand.filter(fe => fe.feNo === feNo);
    if (byNo.length === 1) return byNo[0]!.id;
    if (byNo.length > 0) cand = byNo;
  }

  const scope = (link.feScope || '').trim();
  if (scope) {
    const byScope = cand.filter(
      fe => fe.scope === scope || fe.scope.startsWith(scope.charAt(0) || ''),
    );
    if (byScope.length === 1) return byScope[0]!.id;
    if (byScope.length > 0) cand = byScope;
  }

  if (cand.length === 1) return cand[0]!.id;
  return undefined;
}

/** 링크 → fcData id (UUID 일치 우선, 실패 시 fcNo+공정+텍스트로 유일 후보만) */
function resolveFcId(link: LinkResult, fcData: FCItem[], fcIdSet: Set<string>): string | undefined {
  const id = (link.fcId || '').trim();
  if (id && fcIdSet.has(id)) return id;

  const t = (link.fcText || '').trim();
  if (!t) return undefined;
  const nt = norm(t);
  const linkFcProc = (link.fcProcess || '').trim();
  const linkFmProc = (link.fmProcess || '').trim();

  let cand = fcData.filter(
    fc => norm(fc.text) === nt && procMatch(fc.processName, linkFcProc, linkFmProc),
  );
  if (cand.length === 0) return undefined;

  const fcNo = (link.fcNo || '').trim();
  if (fcNo) {
    const byNo = cand.filter(fc => fc.fcNo === fcNo);
    if (byNo.length === 1) return byNo[0]!.id;
    if (byNo.length > 0) cand = byNo;
  }

  if (cand.length === 1) return cand[0]!.id;
  return undefined;
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

    const effFe = resolveFeId(link, feData, feIdSet);
    const effFc = resolveFcId(link, fcData, fcIdSet);

    if (effFe) feLinkedIds.add(effFe);
    if (effFc) fcLinkedIds.add(effFc);

    if (!link.fmId) return;
    if (!fmLinkCounts.has(link.fmId)) {
      fmLinkCounts.set(link.fmId, { feCount: 0, fcCount: 0 });
    }
    const counts = fmLinkCounts.get(link.fmId)!;
    if (effFe) counts.feCount++;
    if (effFc) counts.fcCount++;
  });

  const feLinkedCount = feData.filter(fe => feLinkedIds.has(fe.id)).length;
  const fcLinkedCount = fcData.filter(fc => fcLinkedIds.has(fc.id)).length;
  // 배지·fmMissingCount: FC가 링크로 잡히면 해당 FM은 "누락 아님" (표 행 녹색은 여전히 FE+FC 모두 필요)
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
