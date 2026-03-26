/**
 * @file useAutoLldFilter.ts
 * @description LLD(필터코드) 통합 추천 엔진
 *
 * 기존 3개 훅(useAutoRecommendPC, useAutoRecommendDC, useAutoLldHandlers)의
 * LLD 데이터 소스를 통합 LLD(필터코드) 테이블로 교체.
 *
 * 매칭 방식: 정확 매칭 (공정번호 + 공정명 기반)
 *   1순위: 동일제품 + 동일공정 (processNo + processName + productName)
 *   2순위: 동일제품 + 공정명만 매칭 (processName + productName)
 *   3순위: 수평전개 — 다른 제품 + 동일공정명 (processName only)
 *
 * 키워드 유사도 매칭은 신뢰성 문제로 완전 폐기.
 */

import { useCallback, useState, useRef } from 'react';
import type { WorksheetState } from '../../../constants';
import type { ProcessedFMGroup } from '../processFailureLinks';
import { extractKeywords, keywordMatchScore } from '@/lib/lldRecommendUtils';
import { calcAP, getSafeSODValue, getMaxSeverity } from '../riskOptUtils';
import { rankByDetectionRules, getRecommendedDetectionMethods } from './detectionKeywordMap';
import { rankBySimlarity } from './similarityScore';
import { recommendDetection } from './detectionRatingMap';
import { rankByPreventionRules } from './preventionKeywordMap';

// ── uniqueKey 생성 (FMGroupRows/RiskOptCellRenderer와 동일 패턴) ──
function buildUniqueKey(fmId: string, fcId: string, rowInFM: number): string {
  return fmId && fcId ? `${fmId}-${fcId}` : (fmId ? `${fmId}-r${rowInFM}` : `r${rowInFM}`);
}

// ── 타입 ──

interface LLDFilterItem {
  id: string;
  lldNo: string;
  classification: string;
  applyTo: 'prevention' | 'detection';
  processNo: string;
  processName: string;
  productName: string;
  failureMode: string;
  cause: string;
  severity: number | null;
  occurrence: number | null;
  detection: number | null;
  improvement: string;
  preventionImprovement?: string;
  detectionImprovement?: string;
  m4Category: string | null;
  status: string;
  priority: number;
  completedDate: string | null;
}

export interface LldFilterCandidate {
  uniqueKey: string;
  realUk: string;
  fmId: string;
  fcId: string;
  fmText: string;
  fcText: string;
  processNo: string;
  processName: string;
  applyTarget: 'prevention' | 'detection';
  matchedLld: LLDFilterItem | null;
  matchTier: 1 | 2 | 3 | 4 | 0;   // 매칭 등급 (0=미매칭, 4=자동추천)
  matchDescription: string;
  checked: boolean;
  ap: 'H' | 'M' | 'L' | null;  // ★ 현재 AP 값
  autoRecommendValue?: string;  // ★ 자동추천 DC/PC 값 (tier 4)
  autoRecommendD?: number;      // ★ 자동추천 검출도 D 값
}

export type LldApplyStep = '5ST' | '6ST';

export interface LldFilterModalState {
  isOpen: boolean;
  candidates: LldFilterCandidate[];
  totalEligible: number;
  totalMatched: number;
  applyStep: LldApplyStep;
}

/** 적용 시 반환되는 변경사항 */
export interface LldApplyResult {
  changes: Record<string, string | number>;
  appliedLldNos: string[];
}

interface MasterA6Item {
  processNo: string;
  value: string;
  m4?: string;
}

interface MasterB5Item {
  processNo: string;
  value: string;
  m4?: string;
}

interface UseAutoLldFilterParams {
  state: WorksheetState | undefined;
  processedFMGroups: ProcessedFMGroup[];
}

// ── 매칭 로직 ──

/** 공정명 부분 매칭 (한쪽이 다른쪽에 포함되면 true) */
function processNameMatches(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  return la.includes(lb) || lb.includes(la);
}

function findBestMatch(
  llds: LLDFilterItem[],
  processNo: string,
  processName: string,
  productName: string,
  applyTo: 'prevention' | 'detection',
  fmText?: string,
  fcText?: string,
): { item: LLDFilterItem | null; tier: 1 | 2 | 3 | 0; desc: string } {
  // G(완료) + Y(진행중) 모두 추천 대상 (R=미완료 제외), 개선대책(improvement)이 비어있는 경우 제외
  // ★ completedDate 필터는 호출부에서 사전 적용됨 (5ST: ≤오늘, 6ST: >오늘)
  const filtered = llds.filter(l => l.applyTo === applyTo && l.status !== 'R' && l.improvement && l.improvement.trim().length > 0);

  const byPriority = (a: LLDFilterItem, b: LLDFilterItem) => b.priority - a.priority;

  // 1순위: 동일제품 + 동일공정번호 + 동일공정명 (정확 매칭)
  if (processNo) {
    const tier1 = filtered.filter(l =>
      l.processNo === processNo && l.processName === processName && l.productName === productName
    );
    if (tier1.length > 0) {
      const best = [...tier1].sort(byPriority)[0];
      return { item: best, tier: 1, desc: `동일제품+동일공정 [${best.lldNo}]` };
    }
  }

  // 2순위: 동일제품 + 공정명 매칭 (부분매칭 포함)
  const tier2 = filtered.filter(l =>
    processNameMatches(l.processName, processName) && l.productName === productName
  );
  if (tier2.length > 0) {
    const best = [...tier2].sort(byPriority)[0];
    return { item: best, tier: 2, desc: `동일제품+공정명 [${best.lldNo}]` };
  }

  // 3순위: 수평전개 — 다른 제품 + 공정명 매칭 (부분매칭 포함)
  const tier3 = filtered.filter(l => processNameMatches(l.processName, processName));
  if (tier3.length > 0) {
    const best = [...tier3].sort(byPriority)[0];
    return { item: best, tier: 3, desc: `수평전개(${best.productName}) [${best.lldNo}]` };
  }

  // 4순위: 키워드 매칭 — 고장형태/고장원인 텍스트 유사도
  if (fmText || fcText) {
    const fmKw = extractKeywords(fmText || '');
    const fcKw = extractKeywords(fcText || '');
    let bestItem: LLDFilterItem | null = null;
    let bestScore = 0;
    for (const lld of filtered) {
      const fmScore = keywordMatchScore(fmKw, lld.failureMode) * 3
                    + keywordMatchScore(fcKw, lld.cause) * 3
                    + keywordMatchScore(fmKw, lld.cause) * 1
                    + keywordMatchScore(fcKw, lld.failureMode) * 1;
      if (fmScore > bestScore) {
        bestScore = fmScore;
        bestItem = lld;
      }
    }
    if (bestItem && bestScore >= 0.5) {
      return { item: bestItem, tier: 3, desc: `키워드매칭 [${bestItem.lldNo}]` };
    }
  }

  return { item: null, tier: 0, desc: '미매칭' };
}

// ── 훅 ──

export function useAutoLldFilter({
  state,
  processedFMGroups,
}: UseAutoLldFilterParams) {
  const [modal, setModal] = useState<LldFilterModalState>({
    isOpen: false,
    candidates: [],
    totalEligible: 0,
    totalMatched: 0,
    applyStep: '5ST',
  });

  const isLoadingRef = useRef(false);

  // LLD(필터코드) 추천 모달 열기 — step: '5ST'(리스크분석) 또는 '6ST'(최적화)
  const handleAutoLldFilter = useCallback(async (step: LldApplyStep = '5ST') => {
    if (!state || isLoadingRef.current) return;
    if (processedFMGroups.length === 0) {
      alert('고장연결 데이터가 없습니다. 4단계 고장연결을 먼저 완료해주세요.');
      return;
    }

    isLoadingRef.current = true;
    try {
      // LLD DB + 마스터 A6/B5 동시 조회
      const fmeaId = state?.fmeaId ||
        new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('id') || '';

      const [lldRes, masterRes] = await Promise.all([
        fetch('/api/lld'),
        fetch(`/api/pfmea/master?fmeaId=${fmeaId}&includeItems=true`, { cache: 'no-store' }),
      ]);

      const lldResult = await lldRes.json();
      const rawLlds: LLDFilterItem[] = (lldResult.success && lldResult.items) ? lldResult.items : [];

      // ★ 5ST/6ST completedDate 필터 — SSoT: lld_filter_code.completedDate
      //   5ST(리스크분석): completedDate ≤ 오늘 (이미 완료된 교훈만)
      //   6ST(최적화): completedDate > 오늘 (아직 미완료, 진행중인 개선만)
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const allLlds: LLDFilterItem[] = rawLlds.filter(l => {
        if (!l.completedDate) return step === '5ST'; // 날짜 없으면 5ST에 포함 (레거시 호환)
        return step === '5ST' ? l.completedDate <= today : l.completedDate > today;
      });

      // 마스터 A6(검출관리) / B5(예방관리) 로드
      let masterA6: MasterA6Item[] = [];
      let masterB5: MasterB5Item[] = [];
      let masterChains: Array<{ processNo?: string; dcValue?: string; pcValue?: string; m4?: string }> = [];
      if (masterRes.ok) {
        const mData = await masterRes.json();
        const allItems = mData.dataset?.flatItems || mData.active?.flatItems || [];
        masterA6 = allItems.filter((i: any) => i.itemCode === 'A6').map((i: any) => ({
          processNo: String(i.processNo || '').trim(), value: String(i.value || '').trim(), m4: String(i.m4 || '').trim(),
        }));
        masterB5 = allItems.filter((i: any) => i.itemCode === 'B5').map((i: any) => ({
          processNo: String(i.processNo || '').trim(), value: String(i.value || '').trim(), m4: String(i.m4 || '').trim(),
        }));
        masterChains = mData.dataset?.failureChains || [];
      }

      // A6 없으면 chains.dcValue에서 복원
      if (masterA6.length === 0) {
        const seen = new Set<string>();
        masterChains.forEach(ch => {
          if (ch.dcValue?.trim()) {
            ch.dcValue.split('\n').map(v => v.replace(/^D:/, '').trim()).filter(Boolean).forEach(val => {
              const key = `${ch.processNo || ''}::${val}`;
              if (!seen.has(key)) { seen.add(key); masterA6.push({ processNo: String(ch.processNo || ''), value: val, m4: String(ch.m4 || '') }); }
            });
          }
        });
      }
      if (masterB5.length === 0) {
        const seen = new Set<string>();
        masterChains.forEach(ch => {
          if (ch.pcValue?.trim()) {
            ch.pcValue.split('\n').map(v => v.replace(/^P:/, '').trim()).filter(Boolean).forEach(val => {
              const key = `${ch.processNo || ''}::${val}`;
              if (!seen.has(key)) { seen.add(key); masterB5.push({ processNo: String(ch.processNo || ''), value: val, m4: String(ch.m4 || '') }); }
            });
          }
        });
      }

      // A6 공정별 인덱스 + 전체 풀
      const a6ByProc = new Map<string, MasterA6Item[]>();
      const a6AllPool: MasterA6Item[] = [];
      const a6Seen = new Set<string>();
      masterA6.forEach(item => {
        if (!item.value) return;
        if (item.processNo) { const arr = a6ByProc.get(item.processNo) || []; if (!arr.some(e => e.value === item.value)) arr.push(item); a6ByProc.set(item.processNo, arr); }
        if (!a6Seen.has(item.value)) { a6Seen.add(item.value); a6AllPool.push(item); }
      });
      const b5ByProc = new Map<string, MasterB5Item[]>();
      const b5AllPool: MasterB5Item[] = [];
      const b5Seen = new Set<string>();
      masterB5.forEach(item => {
        if (!item.value) return;
        if (item.processNo) { const arr = b5ByProc.get(item.processNo) || []; if (!arr.some(e => e.value === item.value)) arr.push(item); b5ByProc.set(item.processNo, arr); }
        if (!b5Seen.has(item.value)) { b5Seen.add(item.value); b5AllPool.push(item); }
      });

      if (allLlds.length === 0 && masterA6.length === 0 && masterB5.length === 0) {
        alert('LLD(필터코드)와 마스터 데이터(A6/B5) 모두 없습니다.\nPFMEA > LLD 메뉴에서 먼저 등록하거나, Import 후 마스터를 저장해주세요.');
        return;
      }

      const riskData = state.riskData || {};
      const productName = state.l1?.name ||
        new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('projectName') || '';

      const candidates: LldFilterCandidate[] = [];

      for (const group of processedFMGroups) {
        const processNo = group.fmProcessNo || '';
        const processName = group.fmProcessName || '';

        for (let rowIdx = 0; rowIdx < (group.rows || []).length; rowIdx++) {
          const row = group.rows[rowIdx];
          const uk = buildUniqueKey(group.fmId, row.fcId, rowIdx);
          const existingLld = riskData[`lesson-${uk}`] as string || '';
          const fmText = group.fmText || '';
          const fcText = row.fcText || '';

          const s = getSafeSODValue(riskData, `risk-${uk}-S`) || getMaxSeverity(group.fmId, state);
          const o = getSafeSODValue(riskData, `risk-${uk}-O`);
          const d = getSafeSODValue(riskData, `risk-${uk}-D`);
          const ap = (s > 0 && o > 0 && d > 0) ? calcAP(s, o, d) : null;

          // 예방관리 매칭
          const prevMatch = findBestMatch(allLlds, processNo, processName, productName, 'prevention', fmText, fcText);
          const prevHasExisting = !!existingLld;

          // 예방 LLD 미매칭 시 마스터 B5 fallback
          let prevAutoValue: string | undefined;
          let prevTier: 0 | 1 | 2 | 3 | 4 = prevMatch.tier;
          let prevDesc = prevMatch.desc;
          if (prevMatch.tier === 0 && masterB5.length > 0) {
            const procCandidates = b5ByProc.get(processNo) || [];
            const pool = procCandidates.length > 0 ? procCandidates : b5AllPool;
            if (pool.length > 0) {
              const combinedText = fmText ? (fcText ? `${fmText} ${fcText}` : fmText) : fcText;
              const ranked = combinedText
                ? rankByPreventionRules(fcText, fmText, '', pool)
                : pool;
              if (ranked.length > 0) {
                prevAutoValue = `P:${ranked[0].value}`;
                prevTier = 4;
                prevDesc = `마스터B5 자동추천 (${procCandidates.length > 0 ? '공정' : '전체'})`;
              }
            }
          }

          candidates.push({
            uniqueKey: `${uk}__prev`,
            realUk: uk,
            fmId: group.fmId,
            fcId: row.fcId,
            fmText,
            fcText,
            processNo,
            processName,
            applyTarget: 'prevention',
            matchedLld: prevMatch.item,
            matchTier: prevTier,
            matchDescription: prevHasExisting ? `현재:${existingLld} → ${prevDesc}` : prevDesc,
            checked: !prevHasExisting && prevTier > 0 && prevTier <= 4,
            ap,
            autoRecommendValue: prevAutoValue,
          });

          // 검출관리 매칭
          const detMatch = findBestMatch(allLlds, processNo, processName, productName, 'detection', fmText, fcText);

          // 검출 LLD 미매칭 시 마스터 A6 + FM키워드 fallback
          let detAutoValue: string | undefined;
          let detAutoD: number | undefined;
          let detTier: 0 | 1 | 2 | 3 | 4 = detMatch.tier;
          let detDesc = detMatch.desc;
          if (detMatch.tier === 0) {
            const procCandidates = a6ByProc.get(processNo) || [];
            const pool = procCandidates.length > 0 ? procCandidates : a6AllPool;
            if (pool.length > 0) {
              const combinedText = fmText ? (fcText ? `${fmText} ${fcText}` : fmText) : fcText;
              const ruleRanked = combinedText ? rankByDetectionRules(combinedText, pool) : pool;
              const finalRanked = combinedText ? hybridRankA6(ruleRanked, combinedText) : ruleRanked;
              if (finalRanked.length > 0) {
                detAutoValue = `D:${finalRanked[0].value}`;
                detAutoD = recommendDetection(detAutoValue);
                detTier = 4;
                detDesc = `마스터A6 자동추천 (${procCandidates.length > 0 ? '공정' : '전체'})`;
              }
            }
            // A6도 없으면 FM 키워드 기반 DC 생성
            if (!detAutoValue) {
              let kwMethods = getRecommendedDetectionMethods(fmText);
              if (kwMethods.length === 0 && fcText) kwMethods = getRecommendedDetectionMethods(`${fmText} ${fcText}`);
              if (kwMethods.length === 0) kwMethods = ['비전검사'];
              detAutoValue = `D:${kwMethods[0]}`;
              detAutoD = recommendDetection(detAutoValue);
              detTier = 4;
              detDesc = `FM키워드 자동추천`;
            }
          }

          candidates.push({
            uniqueKey: `${uk}__det`,
            realUk: uk,
            fmId: group.fmId,
            fcId: row.fcId,
            fmText,
            fcText,
            processNo,
            processName,
            applyTarget: 'detection',
            matchedLld: detMatch.item,
            matchTier: detTier,
            matchDescription: prevHasExisting ? `현재:${existingLld} → ${detDesc}` : detDesc,
            checked: !prevHasExisting && detTier > 0,
            ap,
            autoRecommendValue: detAutoValue,
            autoRecommendD: detAutoD && detAutoD > 0 ? detAutoD : undefined,
          });
        }
      }

      const totalMatched = candidates.filter(c => c.matchTier > 0).length;
      setModal({
        isOpen: true,
        candidates,
        totalEligible: candidates.length,
        totalMatched,
        applyStep: step,
      });
    } catch (error) {
      console.error('[LLD Filter] 추천 오류:', error);
      alert('LLD(필터코드) 추천 중 오류가 발생했습니다.');
    } finally {
      isLoadingRef.current = false;
    }
  }, [state, processedFMGroups]);

  // 체크 토글
  const toggleCheck = useCallback((uniqueKey: string) => {
    setModal(prev => ({
      ...prev,
      candidates: prev.candidates.map(c =>
        c.uniqueKey === uniqueKey ? { ...c, checked: !c.checked } : c
      ),
    }));
  }, []);

  const toggleAllCheck = useCallback((checked: boolean) => {
    setModal(prev => ({
      ...prev,
      candidates: prev.candidates.map(c => ({ ...c, checked })),
    }));
  }, []);

  // ★★★ 체크된 항목 → 변경사항 계산 (순수 함수, setState 없음) ★★★
  // 실제 setState는 AllTabEmpty에서 호출 (handleLldSelect와 동일 코드 경로)
  const getCheckedChanges = useCallback((): LldApplyResult | null => {
    const checkedItems = modal.candidates.filter(c => c.checked && (c.matchedLld || c.autoRecommendValue));
    if (checkedItems.length === 0) {
      alert('적용할 항목이 없습니다.');
      return null;
    }

    const changes: Record<string, string | number> = {};
    const appliedLldNos: string[] = [];

    const isOpt = modal.applyStep === '6ST';

    for (const item of checkedItems) {
      const uk = item.realUk;
      const target = item.applyTarget;

      // tier 4 자동추천 (LLD 없이 마스터 A6/B5 기반)
      if (!item.matchedLld && item.autoRecommendValue) {
        const prefix = isOpt ? `${target}-opt-` : `${target}-`;
        changes[`${prefix}${uk}`] = item.autoRecommendValue;
        changes[`imported-${target}-${uk}`] = 'auto';
        // ★ 소스 추적: tier 4 = master 기반 자동추천
        const srcKey = target === 'detection' ? 'dcSource' : 'pcSource';
        const srcIdKey = target === 'detection' ? 'dcSourceId' : 'pcSourceId';
        changes[`${srcKey}-${uk}`] = 'master';
        changes[`${srcIdKey}-${uk}`] = '';
        if (target === 'detection' && item.autoRecommendD && item.autoRecommendD > 0) {
          const dKey = isOpt ? `opt-${uk}-D` : `risk-${uk}-D`;
          changes[dKey] = item.autoRecommendD;
          changes[`imported-D-${uk}`] = 'auto';
        }
        appliedLldNos.push('AUTO');
        continue;
      }

      const lld = item.matchedLld!;
      const improvementText = `[${lld.lldNo}] ${lld.improvement}`;
      // ★ 소스 추적: LLD 매칭
      const srcKey = target === 'detection' ? 'dcSource' : 'pcSource';
      const srcIdKey = target === 'detection' ? 'dcSourceId' : 'pcSourceId';
      changes[`${srcKey}-${uk}`] = 'lld';
      changes[`${srcIdKey}-${uk}`] = lld.id || '';

      if (isOpt) {
        changes[`lesson-opt-${uk}`] = lld.lldNo;
        changes[`${target}-opt-${uk}`] = improvementText;
        if (target === 'prevention' && lld.occurrence) changes[`opt-${uk}-O`] = lld.occurrence;
        if (target === 'detection' && lld.detection) changes[`opt-${uk}-D`] = lld.detection;
      } else {
        changes[`lesson-${uk}`] = lld.lldNo;
        changes[`lesson-target-${uk}`] = target;
        changes[`lesson-cls-${uk}`] = lld.classification || '';
        changes[`${target}-${uk}`] = improvementText;
        if (target === 'prevention' && lld.occurrence) changes[`risk-${uk}-O`] = lld.occurrence;
        if (target === 'detection' && lld.detection) changes[`risk-${uk}-D`] = lld.detection;
      }

      appliedLldNos.push(lld.lldNo);
    }

    setModal(prev => ({ ...prev, isOpen: false }));
    return { changes, appliedLldNos };
  }, [modal.candidates, modal.applyStep]);

  // 체크된 항목 삭제
  const deleteCandidates = useCallback(() => {
    setModal(prev => {
      const remaining = prev.candidates.filter(c => !c.checked);
      const totalMatched = remaining.filter(c => c.matchTier > 0).length;
      return {
        ...prev,
        candidates: remaining,
        totalEligible: remaining.length,
        totalMatched,
      };
    });
  }, []);

  // 매칭선택 + 적용 (원클릭) — LLD 매칭 + 자동추천 포함
  const selectMatchedAndApply = useCallback((): LldApplyResult | null => {
    const updated = modal.candidates.map(c => ({
      ...c,
      checked: c.matchedLld !== null || c.autoRecommendValue !== undefined,
    }));
    const checkedItems = updated.filter(c => c.checked && (c.matchedLld || c.autoRecommendValue));
    if (checkedItems.length === 0) {
      alert('매칭된 항목이 없습니다.');
      return null;
    }

    const changes: Record<string, string | number> = {};
    const appliedLldNos: string[] = [];
    const isOpt = modal.applyStep === '6ST';

    for (const item of checkedItems) {
      const uk = item.realUk;
      const target = item.applyTarget;

      if (!item.matchedLld && item.autoRecommendValue) {
        const prefix = isOpt ? `${target}-opt-` : `${target}-`;
        changes[`${prefix}${uk}`] = item.autoRecommendValue;
        changes[`imported-${target}-${uk}`] = 'auto';
        // ★ 소스 추적: tier 4 = master 기반 자동추천
        const srcKey2 = target === 'detection' ? 'dcSource' : 'pcSource';
        const srcIdKey2 = target === 'detection' ? 'dcSourceId' : 'pcSourceId';
        changes[`${srcKey2}-${uk}`] = 'master';
        changes[`${srcIdKey2}-${uk}`] = '';
        if (target === 'detection' && item.autoRecommendD && item.autoRecommendD > 0) {
          const dKey = isOpt ? `opt-${uk}-D` : `risk-${uk}-D`;
          changes[dKey] = item.autoRecommendD;
          changes[`imported-D-${uk}`] = 'auto';
        }
        appliedLldNos.push('AUTO');
        continue;
      }

      const lld = item.matchedLld!;
      const improvementText = `[${lld.lldNo}] ${lld.improvement}`;
      // ★ 소스 추적: LLD 매칭
      const srcKey2 = target === 'detection' ? 'dcSource' : 'pcSource';
      const srcIdKey2 = target === 'detection' ? 'dcSourceId' : 'pcSourceId';
      changes[`${srcKey2}-${uk}`] = 'lld';
      changes[`${srcIdKey2}-${uk}`] = lld.id || '';
      if (isOpt) {
        changes[`lesson-opt-${uk}`] = lld.lldNo;
        changes[`${target}-opt-${uk}`] = improvementText;
        if (target === 'prevention' && lld.occurrence) changes[`opt-${uk}-O`] = lld.occurrence;
        if (target === 'detection' && lld.detection) changes[`opt-${uk}-D`] = lld.detection;
      } else {
        changes[`lesson-${uk}`] = lld.lldNo;
        changes[`lesson-target-${uk}`] = target;
        changes[`lesson-cls-${uk}`] = lld.classification || '';
        changes[`${target}-${uk}`] = improvementText;
        if (target === 'prevention' && lld.occurrence) changes[`risk-${uk}-O`] = lld.occurrence;
        if (target === 'detection' && lld.detection) changes[`risk-${uk}-D`] = lld.detection;
      }
      appliedLldNos.push(lld.lldNo);
    }

    setModal(prev => ({ ...prev, isOpen: false }));
    return { changes, appliedLldNos };
  }, [modal.candidates, modal.applyStep]);

  // 모달 닫기
  const closeModal = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    handleAutoLldFilter,
    lldFilterModal: modal,
    closeLldFilterModal: closeModal,
    getCheckedChanges,
    selectMatchedAndApply,
    deleteLldFilterCandidates: deleteCandidates,
    toggleLldFilterCheck: toggleCheck,
    toggleAllLldFilterCheck: toggleAllCheck,
  };
}

function hybridRankA6(ruleRanked: MasterA6Item[], combinedText: string): MasterA6Item[] {
  const simRanked = rankBySimlarity(combinedText, ruleRanked);
  const rulePos = new Map<string, number>();
  ruleRanked.forEach((item, idx) => rulePos.set(item.value, idx));
  const simPos = new Map<string, number>();
  simRanked.forEach((item, idx) => simPos.set(item.value, idx));
  const total = ruleRanked.length || 1;
  return [...ruleRanked].sort((a, b) => {
    const scoreA = (1 - (rulePos.get(a.value) ?? total) / total) * 0.6 + (1 - (simPos.get(a.value) ?? total) / total) * 0.4;
    const scoreB = (1 - (rulePos.get(b.value) ?? total) / total) * 0.6 + (1 - (simPos.get(b.value) ?? total) / total) * 0.4;
    return scoreB - scoreA;
  });
}
