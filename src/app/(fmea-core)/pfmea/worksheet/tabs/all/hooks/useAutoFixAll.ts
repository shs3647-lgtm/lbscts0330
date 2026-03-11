/**
 * @file useAutoFixAll.ts
 * @description 자동수정 통합 오케스트레이터 훅
 * S매칭 → PC매칭 → DC매칭 순차 실행 + 통합 결과 표시
 * 각 훅은 silent 모드로 실행하여 개별 alert 억제
 * @created 2026-03-05
 */

import { useCallback, useState } from 'react';

interface AutoFixAllParams {
  autoRecommendS: (silent?: boolean) => Promise<{ filledCount: number; skippedAlready: number; noMatchCount: number } | undefined>;
  autoRecommendPC: (maxCount: number, force: boolean, silent?: boolean) => Promise<{ filledCount: number; manualKept: number; skippedCount: number } | undefined>;
  autoRecommendDC: (maxCount: number, force: boolean, silent?: boolean) => Promise<{ filledCount: number; manualKept: number; skippedCount: number; dEvaluatedCount: number } | undefined>;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
}

/**
 * 자동수정 통합 실행 훅
 * 실행 순서: S매칭 → PC매칭(+O평가) → DC매칭(+D평가)
 */
export function useAutoFixAll({
  autoRecommendS,
  autoRecommendPC,
  autoRecommendDC,
  saveAtomicDB,
}: AutoFixAllParams) {
  const [isRunning, setIsRunning] = useState(false);

  const runAutoFix = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      // 1. S매칭 (심각도 자동추천) — silent
      const sResult = await autoRecommendS(true);

      // 2. PC매칭 (예방관리 + O평가) — silent, maxCount=1, force=true
      const pcResult = await autoRecommendPC(1, true, true);

      // 3. DC매칭 (검출관리 + D평가) — silent, maxCount=1, force=false
      const dcResult = await autoRecommendDC(1, false, true);

      // 4. DB 일괄 저장
      await saveAtomicDB?.(true);

      // 5. 통합 결과 alert
      const sFilled = sResult?.filledCount || 0;
      const pcFilled = pcResult?.filledCount || 0;
      const dcFilled = dcResult?.filledCount || 0;
      const dEvaluated = dcResult?.dEvaluatedCount || 0;
      const totalFilled = sFilled + pcFilled + dcFilled;

      alert(
        `자동수정 완료\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `[심각도(S)] 적용: ${sFilled}건${sResult?.skippedAlready ? ` (기존: ${sResult.skippedAlready}건)` : ''}\n` +
        `[예방관리(PC)] 적용: ${pcFilled}건\n` +
        `[검출관리(DC)] 적용: ${dcFilled}건\n` +
        `[발생도(O)] 평가: ${pcFilled}건\n` +
        `[검출도(D)] 평가: ${dEvaluated}건\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        (totalFilled > 0
          ? `총 ${totalFilled}건 자동수정 — 적색 셀을 클릭하여 확인/수정`
          : `자동수정할 항목이 없습니다.`)
      );
    } catch (err) {
      console.error('[자동수정] 오류:', err);
      alert('자동수정 중 오류가 발생했습니다.');
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, autoRecommendS, autoRecommendPC, autoRecommendDC, saveAtomicDB]);

  return { runAutoFix, isRunning };
}
