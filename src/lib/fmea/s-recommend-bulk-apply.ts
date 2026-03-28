/**
 * @file s-recommend-bulk-apply.ts
 * @description 1L S추천 일괄 적용 — Public DB (SeverityUsageRecord) 우선, 키워드표 폴백
 *
 * ★★★ CODEFREEZE L4 (2026-03-28) ★★★
 * S추천 Public DB 단일 루트 — localStorage 사용 금지
 * SSoT: SeverityUsageRecord (Public DB)
 *
 * 근본원인(2026-03-23): FailureL1Tab.handleAutoRecommendS가 severityKeywordMap만 사용하여
 * YIELD 6·7 추천 등 매핑표 행이 추천 결과·근거에 반영되지 않음.
 */
import type { L1Data, L1FailureScope } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import { normalizeScope } from '@/lib/fmea/scope-constants';
import { loadSeverityFromDB, matchAiagVdaSeverityRow } from '@/lib/fmea/aiag-vda-severity-mapping';
import { matchFESeverity } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/severityKeywordMap';

export interface BulkSRecommendResult {
  updatedScopes: L1FailureScope[];
  changeCount: number;
  details: string[];
}

function buildReqIdContext(
  l1: L1Data | undefined,
): Map<string, { typeName: string; funcName: string; reqName: string }> {
  const map = new Map<string, { typeName: string; funcName: string; reqName: string }>();
  if (!l1?.types) return map;
  for (const type of l1.types) {
    const typeName = (type as { name?: string }).name || '';
    for (const func of (type as { functions?: Array<{ id?: string; name?: string; requirements?: Array<{ id?: string; name?: string }> }> }).functions || []) {
      const funcName = func.name || '';
      for (const req of func.requirements || []) {
        if (req.id) {
          map.set(req.id, { typeName, funcName, reqName: (req.name || '').trim() });
        }
      }
      if ((func.requirements || []).length === 0 && func.id) {
        map.set(func.id, { typeName, funcName, reqName: '' });
      }
    }
  }
  return map;
}

/**
 * 고장영향(FE)이 있는 failureScopes에 대해 S·severityRationale 산출 (미리보기/적용 공용)
 * ★ async: Public DB에서 S추천 데이터 로드
 */
export async function applyBulkSeverityRecommendations(
  l1: L1Data | undefined,
  fmeaId: string,
): Promise<BulkSRecommendResult> {
  const scopes = (l1?.failureScopes || []) as L1FailureScope[];
  const reqCtx = buildReqIdContext(l1);
  // ★ DB에서 로드 (localStorage 대신 Public DB SSoT)
  const mapRows = await loadSeverityFromDB(500);
  let changeCount = 0;
  const details: string[] = [];

  const updatedScopes = scopes.map((scope) => {
    const s = scope as L1FailureScope & { reqId?: string; scope?: string; requirement?: string };
    const effect = (s.effect || '').trim();
    if (!effect) return scope;

    const ctx = s.reqId ? reqCtx.get(s.reqId) : undefined;
    const scopeNorm = normalizeScope(ctx?.typeName || s.scope || '');

    const mapHit = matchAiagVdaSeverityRow(mapRows, {
      scope: scopeNorm,
      productFunction: ctx?.funcName || '',
      requirement: ctx?.reqName || (s.requirement || '').trim() || '',
      failureEffect: effect,
    });

    let newRating: number | undefined;
    let rationale: string | undefined;

    // ★ S=1 제외: AIAG-VDA 기준 "영향 없음"은 추천하지 않음 (최소 S≥2)
    if (mapHit && mapHit.severity >= 2 && mapHit.severity <= 10) {
      newRating = mapHit.severity;
      rationale = (mapHit.basis || '').trim();
    } else {
      const matches = matchFESeverity(effect, scopeNorm);
      if (matches.length > 0) {
        const best = matches[0];
        if (best.rating >= 2) {  // ★ S=1 제외
          newRating = best.rating;
          rationale = best.matchedKeywords.join(', ').replace(/^직접매핑:\s*/, '');
        }
      }
    }

    if (newRating === undefined) return scope;
    const prev = s.severity || 0;
    if (prev === newRating) return scope;

    changeCount++;
    const snippet = effect.length > 28 ? `${effect.slice(0, 28)}…` : effect;
    const ratShort = (rationale || '').length > 42 ? `${(rationale || '').slice(0, 42)}…` : rationale || '';
    details.push(`S=${prev}→${newRating} "${snippet}" — ${ratShort}`);
    return {
      ...scope,
      severity: newRating,
      severityRationale: rationale || (scope as { severityRationale?: string }).severityRationale,
    } as L1FailureScope;
  });

  return { updatedScopes, changeCount, details };
}
