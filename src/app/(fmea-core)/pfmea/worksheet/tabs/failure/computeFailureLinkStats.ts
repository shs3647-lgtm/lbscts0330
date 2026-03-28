/**
 * @file computeFailureLinkStats.ts
 * @description 고장연결 탭 — FM/FE/FC 연결 통계 (누락 배너용)
 *
 * ★ 2026-03-24: 누락 집계 완화 — savedLinks에 행이 있으면 **UUID 일치가 아니어도**
 *   링크에 실린 feText/fcText + feNo/fcNo + 공정명으로 feData/fcData 행을 **유일하게** 특정할 수 있으면
 *   "연결됨"으로 본다 (Import·재로드 후 feId/fcId 불일치로 가짜 누락이 쌓이는 문제 방지).
 *   유일하지 않으면 매칭하지 않음(오연결 방지).
 *
 * ★7 (2026-03-28) — 파이프라인 `unlinked*` 와의 관계 (`verify-steps.ts` verifyFk, GET pipeline-verify STEP3):
 *   - **unlinkedFE**: DB `failure_effects` 중 어떤 `failure_links.feId`에도 안 나타남.
 *   - **unlinkedFC / unlinkedFM**: 동일하게 FL의 `fcId` / `fmId` 커버리지만 본다 (Atomic PG).
 *   - **본 모듈의 `feMissingCount` 등**: 입력은 워크시트 `savedLinks`(LinkResult[]) + 레거시 fe/fm/fc 배열.
 *     텍스트·공정 보강, FM 연결 휴리스틱(아래 fmLinkedCount), FailureLinkTab의 FC시트 참조 필터는 **파이프라인에 없음**.
 *   → 숫자가 STEP3와 다르면 정상일 수 있음. 비교·감사는 **DB pipeline-verify**를 SSoT로 쓴다.
 */

import type { FEItem, FCItem, FMItem, LinkResult } from './FailureLinkTypes';
import { fcCompositeRowKey } from './failureLinkFcKey';

/** 고장연결 배너 등 tooltip — 파이프라인 대비 (★7) */
export const FAILURE_LINK_STATS_VS_PIPELINE_HINT =
  '이 화면의 누락·연결 수: 워크시트 savedLinks + 텍스트/공정 보강 + FC시트 참조 규칙 기준입니다. ' +
  'API GET /api/fmea/pipeline-verify STEP3의 unlinkedFM·unlinkedFC·unlinkedFE는 DB FailureLink FK만 집계하므로 수치가 다를 수 있습니다.';

export interface FailureLinkStats {
  feLinkedIds: Set<string>;
  feLinkedTexts: Set<string>;
  feLinkedCount: number;
  /** 레거시 FE 중 링크(및 보강)로 연결된 것으로 본 개수의 보수 */
  feMissingCount: number;
  fcLinkedIds: Set<string>;
  fcLinkedTexts: Set<string>;
  fcLinkedCount: number;
  /** 레거시 FC 중 링크(및 보강)로 연결된 것으로 본 개수의 보수 — ≠ pipeline unlinkedFC 역수(정의 상이) */
  fcMissingCount: number;
  fmLinkedIds: Set<string>;
  fmLinkedCount: number;
  /** FM: savedLinks fmId + fc/fe 카운트 + 텍스트 매칭 등 — ≠ pipeline unlinkedFM 역수 */
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

/** 링크 → fcData id (UUID → 복합키 공정|m4|we|원인 → 텍스트+공정 후보 축소) */
function resolveFcId(link: LinkResult, fcData: FCItem[], fcIdSet: Set<string>): string | undefined {
  const id = (link.fcId || '').trim();
  if (id && fcIdSet.has(id)) return id;

  const t = (link.fcText || '').trim();
  if (!t) return undefined;
  const nt = norm(t);
  const linkFcProc = (link.fcProcess || '').trim();
  const linkFmProc = (link.fmProcess || '').trim();
  const procForKey = linkFcProc || linkFmProc;
  const linkM4 = (link.fcM4 || '').trim();
  const linkWe = (link.fcWorkElem || '').trim();

  // 1) 복합키 일치 — 링크에 실린 공정·4M·작업요소·원인 (DB/FL 메타, 텍스트로 FK 추측 아님)
  const keyLink = fcCompositeRowKey(procForKey, linkM4, linkWe, t);
  const byKey = fcData.filter(
    fc =>
      procMatch(fc.processName, linkFcProc, linkFmProc) &&
      fcCompositeRowKey(fc.processName, (fc.m4 || '').trim(), (fc.workElem || '').trim(), fc.text) === keyLink,
  );
  if (byKey.length === 1) return byKey[0]!.id;
  if (byKey.length > 1) return undefined;

  let cand = fcData.filter(
    fc => norm(fc.text) === nt && procMatch(fc.processName, linkFcProc, linkFmProc),
  );
  if (cand.length === 0) return undefined;

  if (cand.length > 1 && (linkM4 || linkWe)) {
    const byMeta = cand.filter(
      fc =>
        (!linkM4 || (fc.m4 || '').trim() === linkM4) &&
        (!linkWe || (fc.workElem || '').trim() === linkWe),
    );
    if (byMeta.length === 1) return byMeta[0]!.id;
    if (byMeta.length > 0) cand = byMeta;
  }

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

  // ★ 2026-03-24 CODEFREEZE: FM 연결 판단 — savedLinks에 fmId가 있으면 "연결됨"
  // 근본원인: fcData.id = L3Function.id, savedLinks.fcId = FailureCause.id → ID 체계 불일치
  //          resolveFcId UUID 매칭 실패 → fcCount=0 → 연결된 FM도 가짜 누락 표시
  // 해결: savedLinks에 fmId가 존재하면 해당 FM은 무조건 "연결됨" (DB FL이 진실)
  //       텍스트+공정 fallback은 state.l2의 fm.id와 DB fmId가 다른 경우 대비
  const linkFmTextMap = new Map<string, boolean>();
  savedLinks.forEach(link => {
    if (link.fmId) {
      const key = norm((link.fmProcess || '') + '|' + (link.fmText || ''));
      linkFmTextMap.set(key, true);
    }
  });

  const fmLinkedCount = fmData.filter(fm => {
    // 1순위: fmId가 savedLinks에 직접 존재 (DB FL이 SSoT)
    if (fmLinkedIds.has(fm.id)) return true;
    // 2순위: fmLinkCounts UUID 매칭 + fcCount>0
    const counts = fmLinkCounts.get(fm.id);
    if (counts != null && (counts.fcCount > 0 || counts.feCount > 0)) return true;
    // 3순위: 텍스트+공정 매칭 (state fm.id ≠ DB fmId인 경우)
    const key = norm((fm.processName || '') + '|' + (fm.text || ''));
    if (linkFmTextMap.has(key)) return true;
    return false;
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
