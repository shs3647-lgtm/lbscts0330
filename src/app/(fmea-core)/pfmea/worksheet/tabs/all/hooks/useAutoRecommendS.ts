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
      const feMap = new Map<string, { text: string; currentSeverity: number }>();

      failureLinks.forEach((link) => {
        if (link.feId && link.feText && !feMap.has(link.feId)) {
          feMap.set(link.feId, {
            text: link.feText,
            currentSeverity: link.feSeverity || 0,
          });
        }
      });

      // processedFMGroups에서도 수집 (보완)
      processedFMGroups.forEach(fmGroup => {
        fmGroup.rows.forEach(row => {
          if (row.feId && row.feText && !feMap.has(row.feId)) {
            feMap.set(row.feId, {
              text: row.feText,
              currentSeverity: row.feSeverity || 0,
            });
          }
        });
      });

      // 2. ★ 키워드 기반 심각도 매칭 (AIAG VDA 1st Edition)
      let filledCount = 0;
      let skippedAlready = 0;
      let noMatchCount = 0;
      const recommendations: { feId: string; feText: string; rating: number; score: number; level: string; keywords: string[] }[] = [];

      feMap.forEach((feData, feId) => {
        // 이미 심각도가 있으면 스킵
        if (feData.currentSeverity > 0) {
          skippedAlready++;
          return;
        }

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
      });

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

      // 3. state 업데이트 — failureLinks.feSeverity + l1.failureScopes.severity + imported flags
      const recMap = new Map(recommendations.map(r => [r.feId, r.rating]));
      // ★ imported flag용 riskData 변경분
      const importedChanges: Record<string, string> = {};
      recommendations.forEach(r => {
        importedChanges[`imported-S-fe-${r.feId}`] = 'auto';
      });

      setState((prev: WorksheetState) => {
        const prevLinks: FailureLinkWithSeverity[] = prev.failureLinks || [];
        const prevScopes = prev.l1?.failureScopes || [];

        // failureLinks 업데이트
        const updatedLinks = prevLinks.map((link) => {
          const rating = link.feId ? recMap.get(link.feId) : undefined;
          if (rating !== undefined && (!link.feSeverity || link.feSeverity === 0)) {
            return { ...link, feSeverity: rating, severity: rating };
          }
          return link;
        });

        // failureScopes 업데이트
        const updatedScopes = prevScopes.map((scope) => {
          const rating = recMap.get(scope.id);
          if (rating !== undefined && (!scope.severity || scope.severity === 0)) {
            return { ...scope, severity: rating };
          }
          // feText로 매칭 시도
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
          riskData: { ...(prev.riskData || {}), ...importedChanges },
        };
      });

      setDirty?.(true);

      // 4. 결과 알림 — 상위 5건 미리보기
      const preview = recommendations
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
        .map(r => `  S=${r.rating}(${r.level}) ← "${r.feText.substring(0, 25)}..." [${r.keywords.join(',')}]`)
        .join('\n');

      if (!silent) {
        alert(
          `심각도(S) 자동추천 완료 (키워드 기반)\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `• 추천 적용: ${filledCount}건\n` +
          `• 이미 입력: ${skippedAlready}건 (스킵)\n` +
          `• 매칭 불가: ${noMatchCount}건\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `[추천 예시 (상위 5건)]\n${preview}\n\n` +
          `※ 예비평가입니다. SOD 기준표를 확인 후 조정하세요.`
        );
      }

      // DB 저장 (silent 모드에서는 orchestrator가 일괄 저장)
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
