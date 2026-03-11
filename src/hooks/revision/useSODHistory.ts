/**
 * @file hooks/revision/useSODHistory.ts
 * @description SOD 변경 히스토리 관리 훅
 * @module revision
 * @created 2026-01-19
 * @lines ~150 (500줄 미만 원칙)
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  SODHistoryState,
  UseSODHistoryReturn,
  CreateSODHistoryRequest,
  SODHistoryResponse,
  SODSnapshot,
  SODChangeType,
} from './types';

// ============================================================================
// 초기 상태
// ============================================================================

const initialState: SODHistoryState = {
  isLoading: false,
  histories: [],
  revMajor: 0,
  revMinor: 0,
  error: undefined,
};

// ============================================================================
// SOD 히스토리 관리 훅
// ============================================================================

/**
 * SOD 변경 히스토리 관리 훅
 * @param fmeaId FMEA 프로젝트 ID
 */
export function useSODHistory(fmeaId: string): UseSODHistoryReturn {
  const [state, setState] = useState<SODHistoryState>(initialState);
  
  // 스냅샷 저장 (변경 감지용)
  const snapshotsRef = useRef<Map<string, SODSnapshot>>(new Map());

  // --------------------------------------------------------------------------
  // 히스토리 조회
  // --------------------------------------------------------------------------
  const loadHistories = useCallback(async () => {
    if (!fmeaId) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const res = await fetch(`/api/fmea/sod-history?fmeaId=${encodeURIComponent(fmeaId)}`);
      const data: SODHistoryResponse = await res.json();
      
      if (data.success && data.data) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          histories: data.data || [],
          revMajor: data.revMajor ?? 0,
          revMinor: data.revMinor || 0,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || '히스토리 조회 실패',
        }));
      }
    } catch (error) {
      console.error('[useSODHistory] loadHistories error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '히스토리 조회 중 오류 발생',
      }));
    }
  }, [fmeaId]);

  // --------------------------------------------------------------------------
  // 변경 기록
  // --------------------------------------------------------------------------
  const recordChange = useCallback(async (change: CreateSODHistoryRequest): Promise<boolean> => {
    if (!fmeaId) return false;
    
    try {
      const res = await fetch('/api/fmea/sod-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...change, fmeaId }),
      });
      
      const data: SODHistoryResponse = await res.json();
      
      if (data.success) {
        // 상태 업데이트
        setState(prev => ({
          ...prev,
          revMinor: data.revMinor || prev.revMinor + 1,
        }));
        // 히스토리 새로고침
        await loadHistories();
        return true;
      } else {
        console.error('[useSODHistory] recordChange failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('[useSODHistory] recordChange error:', error);
      return false;
    }
  }, [fmeaId, loadHistories]);

  // --------------------------------------------------------------------------
  // 히스토리 삭제 (개별)
  // --------------------------------------------------------------------------
  const deleteHistory = useCallback(async (historyId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/fmea/sod-history?id=${encodeURIComponent(historyId)}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (data.success) {
        await loadHistories();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useSODHistory] deleteHistory error:', error);
      return false;
    }
  }, [loadHistories]);

  // --------------------------------------------------------------------------
  // 정식개정 시 히스토리 초기화
  // --------------------------------------------------------------------------
  const clearHistoriesForRevision = useCallback(async (revMajor: number): Promise<boolean> => {
    if (!fmeaId) return false;
    
    try {
      const res = await fetch('/api/fmea/sod-history/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId, revMajor }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          histories: [],
          revMajor: revMajor + 1,
          revMinor: 0,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useSODHistory] clearHistoriesForRevision error:', error);
      return false;
    }
  }, [fmeaId]);

  return {
    state,
    loadHistories,
    recordChange,
    deleteHistory,
    clearHistoriesForRevision,
  };
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * SOD 값 비교하여 변경 감지
 */
export function detectSODChanges(
  oldSnapshot: SODSnapshot,
  newValues: { severity: number; occurrence: number; detection: number }
): Array<{ type: SODChangeType; oldValue: number; newValue: number }> {
  const changes: Array<{ type: SODChangeType; oldValue: number; newValue: number }> = [];
  
  if (oldSnapshot.values.severity !== newValues.severity) {
    changes.push({
      type: 'S',
      oldValue: oldSnapshot.values.severity,
      newValue: newValues.severity,
    });
  }
  
  if (oldSnapshot.values.occurrence !== newValues.occurrence) {
    changes.push({
      type: 'O',
      oldValue: oldSnapshot.values.occurrence,
      newValue: newValues.occurrence,
    });
  }
  
  if (oldSnapshot.values.detection !== newValues.detection) {
    changes.push({
      type: 'D',
      oldValue: oldSnapshot.values.detection,
      newValue: newValues.detection,
    });
  }
  
  return changes;
}

export default useSODHistory;
