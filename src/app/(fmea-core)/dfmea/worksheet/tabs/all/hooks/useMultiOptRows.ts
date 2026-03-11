/**
 * @file useMultiOptRows.ts
 * @description 최적화 6단계 개선안 다중행 관리 React hook
 * - 행 추가/삭제 핸들러 (startTransition 성능 최적화)
 * - SOD는 각 행에서 독립 동기화 (RiskOptCellRenderer useEffect)
 * @created 2026-03-01
 * @updated 2026-03-01 — 집계 로직 제거 (aggregated→multi 전환)
 */

import { useCallback, startTransition } from 'react';
import type { WorksheetState } from '../../../constants';
import { addOptRow, removeOptRow } from '../multiOptUtils';

interface UseMultiOptRowsParams {
  state: WorksheetState | undefined;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>> | undefined;
  setDirty: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  processedFMGroups?: unknown; // ← AllTabEmpty.tsx 하위호환 (사용하지 않음)
}

export function useMultiOptRows({ setState, setDirty }: UseMultiOptRowsParams) {
  /** 개선행 추가 (startTransition — 비동기 우선순위 낮춤) */
  const handleAddOptRow = useCallback((uniqueKey: string) => {
    if (!setState) return;
    startTransition(() => {
      setState(prev => {
        const rd = prev.riskData;
        if (!rd) return prev;
        const updates = addOptRow(rd, uniqueKey);
        return { ...prev, riskData: { ...rd, ...updates } };
      });
    });
    setDirty?.(true);
  }, [setState, setDirty]);

  /** 개선행 삭제 (startTransition + cleanup O(50) 최적화) */
  const handleRemoveOptRow = useCallback((uniqueKey: string, rowIdx: number) => {
    if (!setState) return;
    startTransition(() => {
      setState(prev => {
        const rd = prev.riskData;
        if (!rd) return prev;
        const updates = removeOptRow(rd, uniqueKey, rowIdx);
        if (Object.keys(updates).length === 0) return prev;
        const newRD = { ...rd, ...updates };
        // ★ 최적화: updates 키만 순회 (전체 riskData O(4000) → updates O(50))
        for (const k of Object.keys(updates)) {
          if (newRD[k] === '') delete newRD[k];
        }
        return { ...prev, riskData: newRD };
      });
    });
    setDirty?.(true);
  }, [setState, setDirty]);

  return { handleAddOptRow, handleRemoveOptRow };
}
