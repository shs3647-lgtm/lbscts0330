/**
 * @file useAutoRecommendS.ts
 * @description 심각도(S) 자동추천 훅
 * - ★ 키워드 기반 매칭 (AIAG VDA FMEA 1st Edition P-FMEA 심각도)
 * - FE(고장영향) 텍스트에서 키워드를 추출하여 S=1~10 등급 분류
 * - 규칙: 재작업/폐기/선별/안전/규제 등 핵심 키워드 + 조합 조건
 * - 이미 심각도가 입력된 FE는 스킵
 * @created 2026-02-23
 * @updated 2026-02-23 — 유사도 → 키워드 기반 매칭으로 전면 교체
 */

import { useCallback, useRef } from 'react';
import type { WorksheetState, WorksheetFailureLink } from '../../../constants';
import type { ProcessedFMGroup } from '../processFailureLinks';
import { matchFESeverity } from './severityKeywordMap';
import { recommendSeverity } from '@/hooks/useSeverityRecommend';

/** WorksheetFailureLink + feSeverity (런타임에 존재하는 확장 필드) */
interface FailureLinkWithSeverity extends WorksheetFailureLink {
  feSeverity?: number;
}

interface UseAutoRecommendSParams {
  state?: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
  processedFMGroups: ProcessedFMGroup[];
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
}

// ★ matchFESeverity (severityKeywordMap.ts)가 키워드 기반 매칭 담당

/**
 * 심각도(S) 자동추천 훅
 * SOD 평가기준의 설명 텍스트와 FE(고장영향) 텍스트의 유사도로 예비평가
 */
export function useAutoRecommendS({
  state,
  setState,
  setDirty,
  processedFMGroups,
  saveAtomicDB,
}: UseAutoRecommendSParams) {
  const isLoadingRef = useRef(false);

  const autoRecommendS = useCallback(async (silent?: boolean): Promise<{ filledCount: number; skippedAlready: number; noMatchCount: number } | undefined> => {
    if (!state || !setState || isLoadingRef.current) return undefined;
    if (processedFMGroups.length === 0) {
      if (!silent) alert('고장연결 데이터가 없습니다. 4단계 고장연결을 먼저 완료해주세요.');
      return undefined;
    }

    isLoadingRef.current = true;

    try {
      // 1. FE별 심각도 매칭 — failureLinks + processedFMGroups에서 수집
      const failureLinks: FailureLinkWithSeverity[] = state.failureLinks || [];
      const feMap = new Map<string, { text: string; currentSeverity: number; processName: string }>();

      failureLinks.forEach((link) => {
        if (link.feId && link.feText && !feMap.has(link.feId)) {
          feMap.set(link.feId, {
            text: link.feText,
            currentSeverity: link.feSeverity || 0,
            processName: (link as unknown as Record<string, string>).fmProcessName || '',
          });
        }
      });

      // processedFMGroups에서도 수집 (보완 + processName)
      processedFMGroups.forEach(fmGroup => {
        fmGroup.rows.forEach(row => {
          if (row.feId && row.feText && !feMap.has(row.feId)) {
            feMap.set(row.feId, {
              text: row.feText,
              currentSeverity: row.feSeverity || 0,
              processName: fmGroup.fmProcessName || '',
            });
          }
        });
      });

      // 2. ★★★ 2026-03-15: DB 이력 우선 조회 + 키워드 기반 매칭 병합 (지속적 개선 루프) ★★★
      let filledCount = 0;
      let skippedAlready = 0;
      let noMatchCount = 0;
      const recommendations: { feId: string; feText: string; rating: number; score: number; level: string; keywords: string[] }[] = [];

      // DB 이력 일괄 조회 (병렬)
      const pendingEntries: Array<{ feId: string; feData: { text: string; currentSeverity: number; processName: string } }> = [];
      feMap.forEach((feData, feId) => {
        if (feData.currentSeverity > 0) {
          skippedAlready++;
        } else {
          pendingEntries.push({ feId, feData });
        }
      });

      // DB 이력 조회 (fire-and-forget 실패 시 키워드 폴백)
      // ✅ 2026-03-17: processName 전달하여 공정별 정확한 추천 (마스터 학습 데이터)
      const dbResults = new Map<string, number>();
      try {
        const dbPromises = pendingEntries.map(async ({ feId, feData }) => {
          const result = await recommendSeverity(feData.text, feData.processName);
          if (result.severity && (result.confidence === 'high' || result.confidence === 'medium')) {
            dbResults.set(feId, result.severity);
          }
        });
        await Promise.all(dbPromises);
      } catch {
        // DB 조회 실패 시 키워드 매칭으로 전체 폴백
      }

      // DB 이력 우선 → 키워드 매칭 폴백
      for (const { feId, feData } of pendingEntries) {
        const dbSeverity = dbResults.get(feId);
        if (dbSeverity) {
          // DB 이력에서 확인된 값 우선 적용
          recommendations.push({
            feId,
            feText: feData.text,
            rating: dbSeverity,
            score: 2.0,
            level: 'DB이력',
            keywords: ['과거프로젝트'],
          });
          filledCount++;
        } else {
          // 키워드 기반 매칭 (기존 로직)
          const matches = matchFESeverity(feData.text);
          if (matches.length > 0) {
            const best = matches[0];
            recommendations.push({
              feId,
              feText: feData.text,
              rating: best.rating,
              score: best.score,
              level: best.level,
              keywords: best.matchedKeywords,
            });
            filledCount++;
          } else {
            noMatchCount++;
          }
        }
      }

      if (recommendations.length === 0) {
        if (!silent) {
          if (skippedAlready > 0) {
            alert(`심각도 자동추천: 모든 FE에 이미 심각도가 입력되어 있습니다. (${skippedAlready}건)`);
          } else {
            alert('심각도 자동추천: 매칭 가능한 항목이 없습니다.');
          }
        }
        return { filledCount: 0, skippedAlready, noMatchCount };
      }

      // 3. ★★★ 2026-03-25: Master SOD 일괄 추천 — S뿐만 아니라 O, D도 적용 ★★★
      const fmeaId = state.fmeaId || '';
      let masterSODCount = 0;
      const masterSODMap = new Map<string, { s: number; o: number | null; d: number | null }>();

      if (fmeaId) {
        try {
          const sodRes = await fetch('/api/master/sod-recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fmeaId }),
          });
          const sodJson = await sodRes.json();
          if (sodJson.success && sodJson.results) {
            for (const r of sodJson.results) {
              if (r.severity || r.occurrence || r.detection) {
                masterSODMap.set(r.linkId, {
                  s: r.severity || 0,
                  o: r.occurrence || null,
                  d: r.detection || null,
                });
                masterSODCount++;
              }
            }
          }
        } catch {
          // Master SOD API 실패 시 기존 키워드 매칭으로 폴백
        }
      }

      const recMap = new Map(recommendations.map(r => [r.feId, r.rating]));
      // ★ imported flag용 riskData 변경분
      const importedChanges: Record<string, string | number> = {};
      recommendations.forEach(r => {
        importedChanges[`imported-S-fe-${r.feId}`] = 'auto';
      });

      setState((prev: WorksheetState) => {
        const prevLinks: FailureLinkWithSeverity[] = prev.failureLinks || [];
        const prevScopes = prev.l1?.failureScopes || [];
        const prevRiskData = { ...(prev.riskData || {}) };

        // failureLinks 업데이트 + Master SOD riskData 적용
        const updatedLinks = prevLinks.map((link) => {
          const rating = link.feId ? recMap.get(link.feId) : undefined;
          let updatedLink = link;

          // S 적용 (기존 키워드/DB 추천)
          if (rating !== undefined && (!link.feSeverity || link.feSeverity === 0)) {
            updatedLink = { ...updatedLink, feSeverity: rating, severity: rating };
          }

          // ★ Master SOD 적용 — linkId 기반으로 O, D도 채움
          const masterSOD = link.id ? masterSODMap.get(link.id) : undefined;
          if (masterSOD) {
            const uniqueKey = `${link.fmId}-${link.fcId}`;
            // S: Master 우선 (키워드보다 정확)
            if (masterSOD.s > 0 && (!updatedLink.feSeverity || updatedLink.feSeverity === 0)) {
              updatedLink = { ...updatedLink, feSeverity: masterSOD.s, severity: masterSOD.s };
            }
            if (masterSOD.s > 0) {
              prevRiskData[`risk-${uniqueKey}-S`] = masterSOD.s;
            }
            // O: Master 값 적용
            if (masterSOD.o && masterSOD.o > 0) {
              prevRiskData[`risk-${uniqueKey}-O`] = masterSOD.o;
              importedChanges[`imported-O-${uniqueKey}`] = 'auto';
            }
            // D: Master 값 적용
            if (masterSOD.d && masterSOD.d > 0) {
              prevRiskData[`risk-${uniqueKey}-D`] = masterSOD.d;
              importedChanges[`imported-D-${uniqueKey}`] = 'auto';
            }
          }

          return updatedLink;
        });

        // failureScopes 업데이트
        const updatedScopes = prevScopes.map((scope) => {
          const rating = recMap.get(scope.id);
          if (rating !== undefined && (!scope.severity || scope.severity === 0)) {
            return { ...scope, severity: rating };
          }
          if (!scope.severity || scope.severity === 0) {
            const rec = recommendations.find(r => r.feText === scope.effect);
            if (rec) return { ...scope, severity: rec.rating };
          }
          return scope;
        });

        return {
          ...prev,
          failureLinks: updatedLinks,
          l1: {
            ...prev.l1!,
            failureScopes: updatedScopes,
          },
          riskData: { ...prevRiskData, ...importedChanges },
        };
      });

      setDirty?.(true);

      // 4. 결과 알림
      const preview = recommendations
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
        .map(r => `  S=${r.rating}(${r.level}) ← "${r.feText.substring(0, 25)}..." [${r.keywords.join(',')}]`)
        .join('\n');

      if (!silent) {
        alert(
          `SOD 자동추천 완료 (Master FMEA + 키워드)\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `• S 추천 적용: ${filledCount}건\n` +
          `• Master SOD: ${masterSODCount}건 (O, D 포함)\n` +
          `• 이미 입력: ${skippedAlready}건 (스킵)\n` +
          `• 매칭 불가: ${noMatchCount}건\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `[추천 예시 (상위 5건)]\n${preview}\n\n` +
          `※ 예비평가입니다. SOD 기준표를 확인 후 조정하세요.`
        );
      }

      // DB 저장
      if (!silent) saveAtomicDB?.(true);

      return { filledCount, skippedAlready, noMatchCount };

    } catch (err) {
      console.error('[자동추천S] 오류:', err);
      if (!silent) alert('심각도 자동추천 중 오류가 발생했습니다.');
      return undefined;
    } finally {
      isLoadingRef.current = false;
    }
  }, [state, setState, setDirty, processedFMGroups, saveAtomicDB]);

  return { autoRecommendS, isLoading: isLoadingRef };
}
