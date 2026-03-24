/**
 * @file useAutoRecommendDC.ts
 * @description 검출관리(A6) 자동추천 훅 — v3.0
 *
 * ★ v3.0: A6 데이터 없어도 FM 키워드 기반 DC 자동 생성 fallback
 *   1순위: A6 flatItems (Import 마스터)
 *   2순위: 산업DB (KrIndustryDetection)
 *   3순위: FM 키워드 → DC 자동 생성 (detectionKeywordMap)
 *
 * @created 2026-02-23
 * @updated 2026-03-04 v3.0 FM 키워드 기반 DC fallback
 */

import { useCallback, useRef } from 'react';
import type { WorksheetState } from '../../../constants';
import type { ProcessedFMGroup } from '../processFailureLinks';
import { rankBySimlarity, clearSimilarityCaches } from './similarityScore';
import { rankByDetectionRules, getRecommendedDetectionMethods } from './detectionKeywordMap';
import { boostByPCLinkage } from './preventionToDetectionMap';
import { recommendDetection } from './detectionRatingMap';
import { generateDCRec2 } from './dcCategoryMap';
import {
  applyOccurrenceFromPrevention,
  buildIndustryPreventionOMap,
} from '../../../utils/applyOccurrenceFromPrevention';

interface UseAutoRecommendDCParams {
  state?: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
  processedFMGroups: ProcessedFMGroup[];
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
}

interface MasterA6Item {
  processNo: string;
  value: string;
  m4?: string;
  sourceType?: 'master' | 'industry' | 'keyword';
  sourceId?: string;
  defaultRating?: number; // 산업DB 기본 D값 (1-10)
}

/**
 * FM 키워드 기반 A6(검출관리) 자동추천 훅
 */
export function useAutoRecommendDC({
  state,
  setState,
  setDirty,
  processedFMGroups,
  saveAtomicDB,
}: UseAutoRecommendDCParams) {
  const isLoadingRef = useRef(false);

  const autoRecommendDC = useCallback(async (maxCount: number = 1, force: boolean = false, silent?: boolean): Promise<{ filledCount: number; manualKept: number; skippedCount: number; dEvaluatedCount: number } | undefined> => {
    if (!state || !setState || isLoadingRef.current) return undefined;
    if (processedFMGroups.length === 0) {
      if (!silent) alert('고장연결 데이터가 없습니다. 4단계 고장연결을 먼저 완료해주세요.');
      return undefined;
    }

    isLoadingRef.current = true;

    try {
      const fmeaId = state?.fmeaId ||
        new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('id') || '';
      if (!fmeaId) { if (!silent) alert('FMEA ID를 확인할 수 없습니다.'); return undefined; }

      const [masterRes, krRes] = await Promise.all([
        fetch(`/api/pfmea/master?fmeaId=${fmeaId}&includeItems=true`, { cache: 'no-store' }),
        fetch('/api/kr-industry?type=all').catch(() => null),
      ]);

      if (!masterRes.ok) { if (!silent) alert('마스터 데이터 로드 실패'); return undefined; }
      const data = await masterRes.json();
      const allItems = data.dataset?.flatItems || data.active?.flatItems || [];
      let flatItems: MasterA6Item[] = allItems
        .filter((item: { itemCode?: string }) => item.itemCode === 'A6')
        .map((item: { processNo?: string; value?: string; m4?: string }) => ({
          processNo: String(item.processNo || '').trim(),
          value: String(item.value || '').trim(),
          m4: String(item.m4 || '').trim(),
        }));

      // ★ v3.0 fallback: flatItems에 A6 없으면 failureChains.dcValue에서 추출
      if (flatItems.length === 0) {
        const chains: Array<{ processNo?: string; dcValue?: string; m4?: string }> =
          data.dataset?.failureChains || [];
        const seen = new Set<string>();
        chains.forEach(ch => {
          if (ch.dcValue?.trim()) {
            const values = ch.dcValue.split('\n').map((v: string) => v.replace(/^D:/, '').trim()).filter(Boolean);
            values.forEach((val: string) => {
              const key = `${ch.processNo || ''}::${val}`;
              if (!seen.has(key)) {
                seen.add(key);
                flatItems.push({
                  processNo: String(ch.processNo || '').trim(),
                  value: val,
                  m4: String(ch.m4 || '').trim(),
                });
              }
            });
          }
        });
        // flatItems 복원 완료 (진단 로그 제거됨)
      }

      // ★ v2.1: methodType='자동' 후보만 사용
      let krDcItems: MasterA6Item[] = [];
      let industryOMap = new Map<string, number>();
      if (krRes && krRes.ok) {
        const krData = (await krRes.json()) as {
          detection?: Array<{ id?: string; method: string; fmKeyword: string; category: string; methodType?: string; defaultRating?: number }>;
          prevention?: Array<{ method?: string; defaultRating?: number | null }>;
        };
        industryOMap = buildIndustryPreventionOMap(krData.prevention || []);
        const krDetection = krData.detection || [];
        const seenMethods = new Set(flatItems.map(i => i.value));
        krDetection.forEach(entry => {
          if (entry.method && !seenMethods.has(entry.method)) {
            const mType = (entry.methodType || '').trim();
            if (mType && mType !== '자동') return;
            seenMethods.add(entry.method);
            krDcItems.push({ processNo: '', value: entry.method, m4: '', sourceType: 'industry', sourceId: entry.id || '', defaultRating: entry.defaultRating || undefined });
          }
        });
      }

      // ★ v3.0: A6 + 산업DB 모두 없으면 FM 키워드 기반 DC 자동 생성
      const useKeywordFallback = flatItems.length === 0 && krDcItems.length === 0;

      // A6 그룹화
      const a6ByProcess = new Map<string, MasterA6Item[]>();
      const a6AllPool: MasterA6Item[] = [];
      const allPoolSeen = new Set<string>();

      flatItems.forEach(item => {
        if (!item.value) return;
        const pNo = item.processNo;
        if (pNo) {
          const pList = a6ByProcess.get(pNo) || [];
          if (!pList.some(e => e.value === item.value)) pList.push(item);
          a6ByProcess.set(pNo, pList);
        }
        if (!allPoolSeen.has(item.value)) {
          allPoolSeen.add(item.value);
          a6AllPool.push(item);
        }
      });

      krDcItems.forEach(item => {
        if (!allPoolSeen.has(item.value)) {
          allPoolSeen.add(item.value);
          a6AllPool.push(item);
        }
      });

      // PC→DC 연계용
      const pcMap = new Map<string, string>();
      if (state.riskData) {
        processedFMGroups.forEach(g => g.rows.forEach(r => {
          const uk = `${g.fmId}-${r.fcId}`;
          const pcVal = state.riskData?.[`prevention-${uk}`];
          if (pcVal) pcMap.set(uk, String(pcVal));
        }));
      }

      // ★★★ 2026-03-02 FIX: D_CAP=4→10 — 육안검사(D=8),한도견본(D=7),계량형(D=6) 등 전체 허용
      // 이전: D≤4만 기록 → 자동검출 장비만 D평가, 수동검사(육안/한도) D미기록 → D매칭 오류
      const D_CAP = 10;
      let filledCount = 0;
      let unchangedCount = 0;
      let skippedCount = 0;
      let processMatchCount = 0;
      let fallbackCount = 0;
      let dEvaluatedCount = 0;
      const sampleRecommends: string[] = [];

      // ★ 성능최적화: setState 외부에서 모든 계산 수행 + 랭킹 캐시
      clearSimilarityCaches();
      const t0 = performance.now();
      const currentRiskData = state.riskData || {};
      const changes: Record<string, string | number> = {};

      // 랭킹 캐시: "후보풀키|텍스트" → 정렬된 후보 (중복 scoreSimilarity 제거)
      const rankCache = new Map<string, MasterA6Item[]>();

      processedFMGroups.forEach((fmGroup) => {
        const processNo = (fmGroup.fmProcessNo || '').trim();
        const processCandidates = a6ByProcess.get(processNo) || [];
        const fmText = fmGroup.fmText || '';
        const useProcessCandidates = processCandidates.length > 0;
        const baseCandidates = useProcessCandidates ? processCandidates : a6AllPool;
        const poolKey = useProcessCandidates ? processNo : '*';

        fmGroup.rows.forEach((row) => {
          const uniqueKey = `${fmGroup.fmId}-${row.fcId}`;
          const dcKey = `detection-${uniqueKey}`;
          const dKey = `risk-${uniqueKey}-D`;
          const existing = currentRiskData[dcKey];

          if (existing && String(existing).trim()) {
            if (!force) {
              const evalD = recommendDetection(String(existing));
              if (evalD > 0 && evalD <= D_CAP) {
                changes[dKey] = evalD;
                dEvaluatedCount++;
              }
              return;
            }
            const existStr = String(existing).trim();
            // ★ 2026-03-09: [LLD 텍스트도 갱신 대상 — 관리활동 → 검사장비명으로 교체
            const isAutoRecommended = existStr.startsWith('D:') || existStr.startsWith('D ') ||
              existStr.includes('[LLD') ||
              existStr.split('\n').every(line => line.trim().startsWith('D:') || line.trim().startsWith('D '));
            if (!isAutoRecommended) {
              const evalD = recommendDetection(existStr);
              if (evalD > 0 && evalD <= D_CAP) {
                changes[dKey] = evalD;
                dEvaluatedCount++;
              }
              return;
            }
          }

          if (baseCandidates.length === 0) {
            // ★ FM 키워드 기반 DC 자동 생성 fallback
            if (useKeywordFallback) {
              const fcText = row.fcText || '';
              // ★ FM 텍스트 우선 매칭 (FC 합산 시 잘못된 규칙 트리거 방지)
              let kwMethods = getRecommendedDetectionMethods(fmText);
              if (kwMethods.length === 0 && fcText) {
                kwMethods = getRecommendedDetectionMethods(`${fmText} ${fcText}`);
              }
              // ★ 기본 fallback: 규칙 미매칭 → 비전검사 (가장 범용적 검출방법)
              if (kwMethods.length === 0) {
                kwMethods = ['비전검사'];
              }
              // ★ 키워드 모드는 베스트 1건만 추천
              const bestMethod = kwMethods[0];
              const recommended = `D:${bestMethod}`;
              changes[dcKey] = recommended;
              changes[`imported-detection-${uniqueKey}`] = 'auto';
              changes[`dcSource-${uniqueKey}`] = 'keyword';
              changes[`dcSourceId-${uniqueKey}`] = '';
              filledCount++;
              fallbackCount++;
              const evalD = recommendDetection(recommended);
              if (evalD > 0 && evalD <= D_CAP) {
                changes[dKey] = evalD;
                changes[`imported-D-${uniqueKey}`] = 'auto';
                dEvaluatedCount++;
              }
              const currentPC = pcMap.get(uniqueKey) || '';
              const dVal = Number(changes[dKey]) || 0;
              if (dVal > 0) {
                changes[`dcRec2-${uniqueKey}`] = generateDCRec2(fcText, currentPC, dVal);
              }
              if (sampleRecommends.length < 5) {
                sampleRecommends.push(
                  `공정${processNo}[키워드] FM:"${fmText.slice(0, 12)}" → ${bestMethod}`
                );
              }
              return;
            }
            if (existing && String(existing).trim()) {
              const evalD = recommendDetection(String(existing));
              if (evalD > 0 && evalD <= D_CAP) {
                changes[dKey] = evalD;
                dEvaluatedCount++;
              }
            }
            skippedCount++;
            return;
          }

          if (useProcessCandidates) processMatchCount++;
          else fallbackCount++;

          const fcText = row.fcText || '';
          const ruleMatchText = fmText
            ? (fcText ? `${fmText} ${fcText}` : fmText)
            : fcText;

          // ★ 캐시: 같은 후보풀 + 같은 텍스트 → 같은 랭킹 결과 재사용
          const cacheKey = `${poolKey}|${ruleMatchText}`;
          let baseRanked: MasterA6Item[];
          if (rankCache.has(cacheKey)) {
            baseRanked = rankCache.get(cacheKey)!;
          } else {
            const ruleRanked = ruleMatchText
              ? rankByDetectionRules(ruleMatchText, baseCandidates)
              : baseCandidates;
            const combinedText = ruleMatchText || '';
            baseRanked = combinedText
              ? hybridRank(ruleRanked, combinedText)
              : ruleRanked;
            rankCache.set(cacheKey, baseRanked);
          }

          // PC 연계 부스트 (행별 상이 → 캐시 불가, 단 정렬만이라 빠름)
          const currentPC = pcMap.get(uniqueKey) || '';
          const finalRanked = currentPC.trim()
            ? boostByPCLinkage(currentPC, baseRanked)
            : baseRanked;

          // ★ 베스트 1건만 추천 (maxCount 무시 — 사용자 요청)
          const recommended = finalRanked.length > 0
            ? `D:${finalRanked[0].value}`
            : '';

          if (recommended) {
            const oldVal = existing ? String(existing).trim() : '';
            const isChanged = oldVal !== recommended;
            changes[dcKey] = recommended;
            // ★ 소스 추적: master/industry 구분
            const bestItem = finalRanked[0];
            changes[`dcSource-${uniqueKey}`] = bestItem?.sourceType || 'master';
            changes[`dcSourceId-${uniqueKey}`] = bestItem?.sourceId || '';
            if (isChanged) {
              filledCount++;
              changes[`imported-detection-${uniqueKey}`] = 'auto';
            } else {
              unchangedCount++;
            }

            if (sampleRecommends.length < 5 && isChanged) {
              const fcShort = fcText.slice(0, 20);
              sampleRecommends.push(
                `공정${processNo}[${useProcessCandidates ? '공정' : '전체'}] FM:"${fmText.slice(0, 12)}" FC:"${fcShort}" → ${finalRanked[0].value}`
              );
            }

            // ★ 산업DB defaultRating 우선 → fallback: recommendDetection()
            const industryD = bestItem?.defaultRating;
            const evalD = (industryD && industryD > 0 && industryD <= 10) ? industryD : recommendDetection(recommended);
            if (evalD > 0 && evalD <= D_CAP) {
              changes[dKey] = evalD;
              if (isChanged) changes[`imported-D-${uniqueKey}`] = 'auto';
              dEvaluatedCount++;
            }

            const pcVal = currentPC;
            const dVal = Number(changes[dKey]) || 0;
            if (dVal > 0) {
              changes[`dcRec2-${uniqueKey}`] = generateDCRec2(fcText, pcVal, dVal);
            }
          }
        });
      });

      // ★ DC 매칭만 실행해도 PC가 있는 행은 O=1(Import 기본) → 산업DB·키워드로 발생도 보정
      const linkRefs = processedFMGroups.flatMap(g =>
        g.rows.map(r => ({ fmId: g.fmId, fcId: r.fcId })),
      );
      const mergedForO = { ...currentRiskData, ...changes };
      const oPass = applyOccurrenceFromPrevention(
        mergedForO,
        linkRefs,
        industryOMap.size > 0 ? industryOMap : undefined,
      );
      Object.assign(changes, oPass.updates);
      const oAdjustedCount = oPass.filledCount;

      const t1 = performance.now();
      // ★ 경량 setState: 계산 결과만 병합
      setState((prev: WorksheetState) => ({
        ...prev,
        riskData: { ...(prev.riskData || {}), ...changes },
      }));

      setDirty?.(true);

      const totalRows = processedFMGroups.reduce((acc, g) => acc + g.rows.length, 0);
      const manualKept = totalRows - filledCount - unchangedCount - skippedCount;

      if (!silent) {
        alert(
          `검출관리(DC) 자동추천 완료${force ? ' (갱신)' : ''}${useKeywordFallback ? ' [FM키워드 모드]' : ''}\n` +
          `- A6 마스터: ${flatItems.length}건 (${a6ByProcess.size}개 공정)` +
          (krDcItems.length > 0 ? ` + 산업DB ${krDcItems.length}건` : '') +
          (useKeywordFallback ? ' + FM키워드 자동생성' : '') + '\n' +
          `- 추천 변경: ${filledCount}건 (최대 ${maxCount}개/행)\n` +
          (unchangedCount > 0 ? `- 동일값 유지: ${unchangedCount}건 (이전과 같은 추천)\n` : '') +
          `  ┣ 공정별 매칭: ${processMatchCount}건\n` +
          `  ┗ 전체풀 fallback: ${fallbackCount}건\n` +
          `- 수동입력 유지: ${manualKept >= 0 ? manualKept : 0}건\n` +
          `- 후보 없음: ${skippedCount}건\n` +
          `- D값 평가: ${dEvaluatedCount}건 (AIAG-VDA 정규기준)\n` +
          `- O값 보정: ${oAdjustedCount}건 (PC+산업DB defaultRating·키워드, O=1·미입력만)` +
          (sampleRecommends.length > 0
            ? `\n\n[추천 샘플]\n${sampleRecommends.slice(0, 3).join('\n')}`
            : '')
        );
      }

      // DB 저장 (silent 모드에서는 orchestrator가 일괄 저장)
      if (!silent) saveAtomicDB?.(true);

      return { filledCount, manualKept: manualKept >= 0 ? manualKept : 0, skippedCount, dEvaluatedCount };

    } catch (err) {
      console.error('[자동추천DC] 오류:', err);
      if (!silent) alert('자동추천 중 오류가 발생했습니다.');
      return undefined;
    } finally {
      isLoadingRef.current = false;
    }
  }, [state, setState, setDirty, processedFMGroups, saveAtomicDB]);

  return { autoRecommendDC, isLoading: isLoadingRef };
}

function hybridRank(ruleRanked: MasterA6Item[], combinedText: string): MasterA6Item[] {
  const simRanked = rankBySimlarity(combinedText, ruleRanked);

  const rulePos = new Map<string, number>();
  ruleRanked.forEach((item, idx) => rulePos.set(item.value, idx));
  const simPos = new Map<string, number>();
  simRanked.forEach((item, idx) => simPos.set(item.value, idx));

  const total = ruleRanked.length || 1;
  return [...ruleRanked].sort((a, b) => {
    const ruleA = 1 - (rulePos.get(a.value) ?? total) / total;
    const ruleB = 1 - (rulePos.get(b.value) ?? total) / total;
    const simA = 1 - (simPos.get(a.value) ?? total) / total;
    const simB = 1 - (simPos.get(b.value) ?? total) / total;
    const scoreA = ruleA * 0.6 + simA * 0.4;
    const scoreB = ruleB * 0.6 + simB * 0.4;
    return scoreB - scoreA;
  });
}
