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
  occurrence: number | null;
  detection: number | null;
  improvement: string;
  m4Category: string | null;
  status: string;
  priority: number;
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
  matchTier: 1 | 2 | 3 | 0;   // 매칭 등급 (0=미매칭)
  matchDescription: string;
  checked: boolean;
  ap: 'H' | 'M' | 'L' | null;  // ★ 현재 AP 값
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
  // G(완료) + Y(진행중) 모두 추천 대상 (R=미완료 제외)
  const filtered = llds.filter(l => l.applyTo === applyTo && l.status !== 'R');

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
      // LLD DB 조회
      const res = await fetch('/api/lld');
      const result = await res.json();
      if (!result.success || !result.items || result.items.length === 0) {
        alert('등록된 LLD(필터코드)가 없습니다.\nPFMEA > LLD(필터코드) 메뉴에서 먼저 등록해주세요.');
        return;
      }

      const allLlds: LLDFilterItem[] = result.items;
      const riskData = state.riskData || {};

      // 현재 FMEA의 제품명 추출 (l1.name 또는 URL param)
      const productName = state.l1?.name ||
        new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('projectName') || '';

      const candidates: LldFilterCandidate[] = [];

      for (const group of processedFMGroups) {
        const processNo = group.fmProcessNo || '';
        const processName = group.fmProcessName || '';

        // ProcessedFMGroup.rows에서 FM-FC 조합 추출
        for (let rowIdx = 0; rowIdx < (group.rows || []).length; rowIdx++) {
          const row = group.rows[rowIdx];
          // ★ FMGroupRows/RiskOptCellRenderer와 동일한 uniqueKey 패턴 사용
          const uk = buildUniqueKey(group.fmId, row.fcId, rowIdx);

          // ★ 기존 LLD가 있어도 모달에 표시 (사용자가 변경 가능)
          const existingLld = riskData[`lesson-${uk}`] as string || '';

          const fmText = group.fmText || '';
          const fcText = row.fcText || '';

          // AP 계산
          const s = getSafeSODValue(riskData, `risk-${uk}-S`) || getMaxSeverity(group.fmId, state);
          const o = getSafeSODValue(riskData, `risk-${uk}-O`);
          const d = getSafeSODValue(riskData, `risk-${uk}-D`);
          const ap = (s > 0 && o > 0 && d > 0) ? calcAP(s, o, d) : null;

          // 예방관리 매칭
          const prevMatch = findBestMatch(allLlds, processNo, processName, productName, 'prevention', fmText, fcText);
          const prevHasExisting = !!existingLld;
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
            matchTier: prevMatch.tier,
            matchDescription: prevHasExisting ? `현재:${existingLld} → ${prevMatch.desc}` : prevMatch.desc,
            checked: !prevHasExisting && prevMatch.item !== null && prevMatch.tier <= 2,
            ap,
          });

          // 검출관리 매칭
          const detMatch = findBestMatch(allLlds, processNo, processName, productName, 'detection', fmText, fcText);
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
            matchTier: detMatch.tier,
            matchDescription: prevHasExisting ? `현재:${existingLld} → ${detMatch.desc}` : detMatch.desc,
            checked: !prevHasExisting && detMatch.item !== null && detMatch.tier <= 2,
            ap,
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
    const checkedItems = modal.candidates.filter(c => c.checked && c.matchedLld);
    if (checkedItems.length === 0) {
      alert('적용할 항목이 없습니다.');
      return null;
    }

    const changes: Record<string, string | number> = {};
    const appliedLldNos: string[] = [];

    const isOpt = modal.applyStep === '6ST';

    for (const item of checkedItems) {
      const lld = item.matchedLld!;
      const uk = item.realUk;
      const target = item.applyTarget;
      const improvementText = `[${lld.lldNo}] ${lld.improvement}`;

      if (isOpt) {
        // ★ 6단계 최적화에 적용
        changes[`lesson-opt-${uk}`] = lld.lldNo;
        changes[`${target}-opt-${uk}`] = improvementText;

        if (target === 'prevention' && lld.occurrence) {
          changes[`opt-${uk}-O`] = lld.occurrence;
        }
        if (target === 'detection' && lld.detection) {
          changes[`opt-${uk}-D`] = lld.detection;
        }
      } else {
        // ★ 5단계 리스크분석에 적용
        changes[`lesson-${uk}`] = lld.lldNo;
        changes[`lesson-target-${uk}`] = target;
        changes[`lesson-cls-${uk}`] = lld.classification || '';
        changes[`${target}-${uk}`] = improvementText;

        if (target === 'prevention' && lld.occurrence) {
          changes[`risk-${uk}-O`] = lld.occurrence;
        }
        if (target === 'detection' && lld.detection) {
          changes[`risk-${uk}-D`] = lld.detection;
        }
      }

      appliedLldNos.push(lld.lldNo);
    }

    // 모달 닫기
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

  // 매칭선택 + 적용 (원클릭)
  const selectMatchedAndApply = useCallback((): LldApplyResult | null => {
    // 매칭된 항목만 체크 상태로 변경 후 getCheckedChanges 호출
    const updated = modal.candidates.map(c => ({
      ...c,
      checked: c.matchedLld !== null,
    }));
    const checkedItems = updated.filter(c => c.checked && c.matchedLld);
    if (checkedItems.length === 0) {
      alert('매칭된 항목이 없습니다.');
      return null;
    }

    const changes: Record<string, string | number> = {};
    const appliedLldNos: string[] = [];
    const isOpt = modal.applyStep === '6ST';

    for (const item of checkedItems) {
      const lld = item.matchedLld!;
      const uk = item.realUk;
      const target = item.applyTarget;
      const improvementText = `[${lld.lldNo}] ${lld.improvement}`;

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
