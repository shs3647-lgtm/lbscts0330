/**
 * @file useAutoLldHandlers.ts
 * @description 습득교훈(LLD) 자동선택 핸들러
 * - 예방관리개선/검출관리개선이 입력된 항목에 대해 LLD DB에서 best match 자동 매칭
 * - useRecommendHandlers.ts와 동일 패턴 (모달 열기 → 전체적용)
 */

import { useCallback, useState } from 'react';
import type { WorksheetState } from '../../../constants';
import type { ProcessedFMGroup } from '../processFailureLinks';
import { extractKeywords, calcRecommendScore, type LLDItem } from '@/lib/lldRecommendUtils';

// ─── 타입 ───

interface UseAutoLldHandlersParams {
  state: WorksheetState | undefined;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>> | undefined;
  setDirty: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  processedFMGroups: ProcessedFMGroup[];
}

export interface AutoLldCandidate {
  uniqueKey: string;          // UI용 고유키 (예: fmId-fcId__prev / fmId-fcId__det)
  realUk: string;             // 실제 riskData 키 (fmId-fcId)
  fmId: string;
  fcId: string;
  fmText: string;
  fcText: string;
  processNo: string;
  processName: string;
  hasPreventionOpt: boolean;
  hasDetectionOpt: boolean;
  bestLld: LLDItem | null;
  score: number;
  matchReasons: string[];
  applyTarget: 'prevention' | 'detection';
  checked: boolean;           // 체크 상태 (전체적용 시 포함 여부)
}

export interface AutoLldModalState {
  isOpen: boolean;
  candidates: AutoLldCandidate[];
  totalEligible: number;
  totalMatched: number;
}

// ★ Rule 13: 배포환경 샘플 데이터 폴백 제거 — DB 비어있으면 빈 배열 반환 (사용자 직접 등록)

// ─── 헬퍼 ───

/** 자동생성/빈값 판별: 빈값, "-", "N/A", "[추천]...", "P -", "D -" 등 */
function isEmptyOrAuto(val: string): boolean {
  const v = (val || '').trim();
  if (!v || v === '-' || v === 'N/A') return true;
  if (v.startsWith('[추천]')) return true;
  // "P -", "D -" 등 개선추천 자동생성 패턴
  if (/^[A-Z]\s*-\s*$/.test(v)) return true;
  return false;
}

// ─── 훅 ───

export function useAutoLldHandlers({
  state, setState, setDirty, saveAtomicDB, processedFMGroups,
}: UseAutoLldHandlersParams) {

  const [autoLldModal, setAutoLldModal] = useState<AutoLldModalState>({
    isOpen: false, candidates: [], totalEligible: 0, totalMatched: 0,
  });

  // ★ LLD 자동선택 — 모달 열기 (데이터 준비)
  const handleAutoLld = useCallback(async () => {
    if (!state || !setState) return;
    const riskData = state.riskData || {};

    // 0. processedFMGroups 빈 배열 체크 — 고장연결 미완료
    if (processedFMGroups.length === 0) {
      alert('자동선택 대상이 없습니다.\n\n고장연결 데이터가 없습니다.\n먼저 고장분석(4단계)에서 고장연결을 완료해주세요.');
      return;
    }

    // 1. LLD DB 조회
    let lldItems: LLDItem[] = [];
    try {
      const res = await fetch('/api/lessons-learned');
      const data = await res.json();
      if (data.success && data.items && Array.isArray(data.items) && data.items.length > 0) {
        lldItems = data.items.map((item: Record<string, unknown>) => ({
          id: String(item.id || item.lldNo || ''),
          lldNo: String(item.lldNo || ''),
          vehicle: String(item.vehicle || ''),
          target: String(item.target || ''),
          failureMode: String(item.failureMode || ''),
          cause: String(item.cause || ''),
          category: String(item.category || ''),
          improvement: String(item.improvement || ''),
          status: String(item.status || 'Y'),
        }));
      } else {
      }
    } catch (error) {
      console.error('[AutoLLD] LLD API 호출 실패:', error);
    }

    if (lldItems.length === 0) {
      alert('습득교훈(LLD) 데이터가 없습니다.\n먼저 습득교훈 화면에서 데이터를 등록해주세요.');
      return;
    }

    // 2. 대상 항목 수집 + 매칭
    const candidates: AutoLldCandidate[] = [];

    // ★★★ 진단 카운터 ★★★
    let totalRows = 0;
    let skippedNoId = 0;
    let skippedAllApplied = 0;

    // ★ 카테고리별 best LLD 찾기 헬퍼
    const findBestLld = (
      items: LLDItem[], fmKw: string[], fcKw: string[], category?: string,
    ): { lld: LLDItem | null; score: number; reasons: string[] } => {
      let bestLld: LLDItem | null = null;
      let bestScore = 0;
      let bestReasons: string[] = [];
      for (const lld of items) {
        if (category && lld.category !== category) continue;
        const { score, reasons } = calcRecommendScore(lld, fmKw, fcKw);
        if (score > bestScore) { bestScore = score; bestLld = lld; bestReasons = reasons; }
      }
      return { lld: bestLld, score: bestScore, reasons: bestReasons };
    };

    processedFMGroups.forEach(fmGroup => {
      fmGroup.rows.forEach(row => {
        totalRows++;
        if (!row.fcId || !fmGroup.fmId) {
          skippedNoId++;
          return;
        }
        const uk = `${fmGroup.fmId}-${row.fcId}`;

        // ★ LLD 이미 적용 여부 확인 (lesson-{uk} 키 기준)
        const existingLesson = ((riskData[`lesson-${uk}`] as string) || '').trim();
        const existingTarget = ((riskData[`lesson-target-${uk}`] as string) || '').trim();
        const prevAlreadyApplied = existingLesson && (existingTarget === 'prevention' || existingTarget.includes('prevention'));
        const detAlreadyApplied = existingLesson && (existingTarget === 'detection' || existingTarget.includes('detection'));

        // 예방+검출 모두 이미 LLD 적용됨 → 건너뛰기
        if (prevAlreadyApplied && detAlreadyApplied) {
          skippedAllApplied++;
          return;
        }

        // ★ 개선추천 실행 여부와 무관하게, LLD 미적용 대상을 자동 매칭
        const needPrev = !prevAlreadyApplied;
        const needDet = !detAlreadyApplied;

        // 기존 opt 값 확인 (있으면 hasXxxOpt=true)
        const prevOpt = ((riskData[`prevention-opt-${uk}`] as string) || '').trim();
        const detOpt = ((riskData[`detection-opt-${uk}`] as string) || '').trim();
        const hasPreventionOpt = !isEmptyOrAuto(prevOpt);
        const hasDetectionOpt = !isEmptyOrAuto(detOpt);

        // 키워드 추출
        const fmKeywords = extractKeywords(fmGroup.fmText || '');
        const fcKeywords = extractKeywords(row.fcText || '');

        const baseCand = {
          fmId: fmGroup.fmId,
          fcId: row.fcId,
          fmText: fmGroup.fmText || '',
          fcText: row.fcText || '',
          processNo: fmGroup.fmProcessNo || '',
          processName: fmGroup.fmProcessName || '',
          hasPreventionOpt,
          hasDetectionOpt,
        };

        // ★ 예방/검출 각각 별도 candidate 생성 (LLD 미적용 타겟만)
        if (needPrev) {
          const prev = findBestLld(lldItems, fmKeywords, fcKeywords, '예방관리');
          const fallback = prev.lld ? prev : findBestLld(lldItems, fmKeywords, fcKeywords);
          candidates.push({
            ...baseCand,
            uniqueKey: needDet ? `${uk}__prev` : uk,
            realUk: uk,
            bestLld: fallback.lld,
            score: fallback.score,
            matchReasons: fallback.reasons,
            applyTarget: 'prevention',
            checked: fallback.score > 0,
          });
        }

        if (needDet) {
          const det = findBestLld(lldItems, fmKeywords, fcKeywords, '검출관리');
          const fallback = det.lld ? det : findBestLld(lldItems, fmKeywords, fcKeywords);
          candidates.push({
            ...baseCand,
            uniqueKey: needPrev ? `${uk}__det` : uk,
            realUk: uk,
            bestLld: fallback.lld,
            score: fallback.score,
            matchReasons: fallback.reasons,
            applyTarget: 'detection',
            checked: fallback.score > 0,
          });
        }
      });
    });

    if (candidates.length === 0) {
      // ★ 원인별 상세 에러 메시지
      if (totalRows === 0) {
        alert('자동선택 대상이 없습니다.\n\n고장연결 행이 없습니다.\n먼저 고장분석(4단계)에서 FE-FM-FC 연결을 완료해주세요.');
      } else if (skippedNoId === totalRows) {
        alert('자동선택 대상이 없습니다.\n\n고장형태(FM) 또는 고장원인(FC) ID가 누락되었습니다.\n고장연결 데이터를 확인해주세요.');
      } else if (skippedAllApplied > 0) {
        alert('자동선택 대상이 없습니다.\n\n모든 항목에 이미 습득교훈이 지정되어 있습니다.');
      } else {
        alert('자동선택 대상이 없습니다.\n\n고장연결 데이터를 확인해주세요.\n(콘솔 로그에서 상세 정보를 확인할 수 있습니다)');
      }
      return;
    }

    const matched = candidates.filter(c => c.bestLld !== null).length;
    setAutoLldModal({ isOpen: true, candidates, totalEligible: candidates.length, totalMatched: matched });
  }, [state, setState, processedFMGroups]);

  // ★ 체크 토글 (모달에서 호출)
  const toggleAutoLldCheck = useCallback((uniqueKey: string) => {
    setAutoLldModal(prev => ({
      ...prev,
      candidates: prev.candidates.map(c =>
        c.uniqueKey === uniqueKey ? { ...c, checked: !c.checked } : c
      ),
    }));
  }, []);

  // ★ 전체 체크/해제
  const toggleAllAutoLldCheck = useCallback((checked: boolean) => {
    setAutoLldModal(prev => ({
      ...prev,
      candidates: prev.candidates.map(c =>
        c.bestLld ? { ...c, checked } : c
      ),
    }));
  }, []);

  // ★ 전체적용 핸들러
  const applyAutoLld = useCallback(async () => {
    if (!state || !setState) return;
    const { candidates } = autoLldModal;
    const toApply = candidates.filter(c => c.checked && c.bestLld);

    if (toApply.length === 0) {
      alert('적용할 항목이 없습니다.');
      return;
    }

    const fmeaId = (state as unknown as Record<string, unknown>)?.fmeaId as string
      || new URLSearchParams(window.location.search).get('id') || '';
    const updates: Record<string, string> = {};

    for (const c of toApply) {
      const lld = c.bestLld!;
      const uk = c.realUk;  // ★ realUk 사용 (uniqueKey는 UI용)
      const targetKey = `${c.applyTarget === 'detection' ? 'detection' : 'prevention'}-opt-${uk}`;

      // lesson 키 업데이트 (같은 uk에 예방+검출 둘 다 적용 시 누적)
      const existingLessonInUpdates = updates[`lesson-${uk}`] || '';
      if (!existingLessonInUpdates.includes(lld.lldNo)) {
        updates[`lesson-${uk}`] = existingLessonInUpdates
          ? `${existingLessonInUpdates}, ${lld.lldNo}`
          : lld.lldNo;
      }
      const existingTargetInUpdates = updates[`lesson-target-${uk}`] || '';
      if (!existingTargetInUpdates.includes(c.applyTarget)) {
        updates[`lesson-target-${uk}`] = existingTargetInUpdates
          ? `${existingTargetInUpdates},${c.applyTarget}`
          : c.applyTarget;
      }

      // 개선대책 텍스트: 자동생성값이면 대체, 사용자 입력값이면 추가
      if (lld.improvement) {
        const prefix = `[${lld.lldNo}] `;
        const existing = (updates[targetKey] || (state.riskData?.[targetKey] as string) || '').trim();
        if (isEmptyOrAuto(existing)) {
          // 자동생성값 → LLD 개선대책으로 완전 대체
          updates[targetKey] = `${prefix}${lld.improvement}`;
        } else if (!existing.includes(lld.improvement)) {
          // 사용자 입력값 → 하단에 추가
          updates[targetKey] = `${existing}\n${prefix}${lld.improvement}`;
        }
      }
    }

    // riskData 업데이트
    setState(prev => ({
      ...prev,
      riskData: { ...(prev.riskData || {}), ...updates },
    }));
    setDirty?.(true);
    saveAtomicDB?.(true);

    // LLD 적용결과 API 호출 (각 LLD마다)
    if (fmeaId) {
      const today = new Date().toISOString().slice(0, 10);
      const uniqueLldNos = [...new Set(toApply.map(c => c.bestLld!.lldNo))];
      for (const lldNo of uniqueLldNos) {
        try {
          await fetch('/api/lessons-learned/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lldNo, fmeaId, appliedDate: today }),
          });
        } catch (error) {
          console.error('[AutoLLD] 적용결과 업데이트 오류:', error);
        }
      }
    }

    // 모달 닫기
    setAutoLldModal(prev => ({ ...prev, isOpen: false }));
    alert(`습득교훈 ${toApply.length}건 자동 적용 완료`);
  }, [state, setState, setDirty, saveAtomicDB, autoLldModal]);

  // ★ 모달 닫기
  const closeAutoLldModal = useCallback(() => {
    setAutoLldModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    handleAutoLld,
    autoLldModal,
    closeAutoLldModal,
    applyAutoLld,
    toggleAutoLldCheck,
    toggleAllAutoLldCheck,
  };
}
