/**
 * @file hooks/sync/useDataSync.ts
 * @description FMEA-CP 양방향 데이터 동기화 훅
 * @module sync
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  SyncStatus,
  SyncConflict,
  ConflictPolicy,
  ConflictResolution,
  DataSyncRequest,
  SyncResponse,
} from './types';

// ============================================================================
// 타입 정의
// ============================================================================

interface UseDataSyncState {
  status: SyncStatus;
  conflicts: SyncConflict[];
  synced: number;
  skipped: number;
  lastSyncAt?: Date;
  error?: string;
}

interface UseDataSyncReturn {
  state: UseDataSyncState;
  syncData: (request: DataSyncRequest) => Promise<SyncResponse>;
  detectConflicts: (fmeaId: string, cpNo: string) => Promise<SyncConflict[]>;
  resolveConflict: (field: string, resolution: ConflictResolution) => void;
  resolveAllConflicts: (resolution: ConflictResolution) => void;
  applyResolutions: () => Promise<SyncResponse>;
  clearConflicts: () => void;
  reset: () => void;
}

// ============================================================================
// 초기 상태
// ============================================================================

const INITIAL_STATE: UseDataSyncState = {
  status: 'idle',
  conflicts: [],
  synced: 0,
  skipped: 0,
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

// (로컬 데이터 비교 로직 제거: API 기반 동기화로 통일)

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * FMEA-CP 양방향 데이터 동기화 훅
 * 
 * @description
 * FMEA와 CP 간의 공통 필드를 양방향으로 동기화합니다.
 * - 충돌 감지: 양쪽 값이 다른 경우 감지
 * - 충돌 해결: 사용자 선택 또는 정책에 따라 해결
 * - 동기화: 선택된 값으로 양쪽 업데이트
 * 
 * @example
 * ```tsx
 * const { state, syncData, detectConflicts, resolveConflict } = useDataSync();
 * 
 * // 1. 충돌 감지
 * const conflicts = await detectConflicts('pfm26-m001', 'cp26-m001');
 * 
 * // 2. 충돌이 있으면 해결
 * if (conflicts.length > 0) {
 *   resolveConflict('processDesc', 'use-fmea');
 * }
 * 
 * // 3. 동기화 실행
 * const result = await syncData({
 *   fmeaId: 'pfm26-m001',
 *   cpNo: 'cp26-m001',
 *   conflictPolicy: 'fmea-wins'
 * });
 * ```
 */
export function useDataSync(): UseDataSyncReturn {
  const [state, setState] = useState<UseDataSyncState>(INITIAL_STATE);
  const lastTargetRef = useRef<{ fmeaId: string; cpNo: string; fields?: string[] } | null>(null);

  /**
   * 충돌 감지
   */
  const detectConflicts = useCallback(async (
    fmeaId: string,
    cpNo: string
  ): Promise<SyncConflict[]> => {
    try {
      const response = await fetch('/api/sync/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId, cpNo, conflictPolicy: 'ask' }),
      });

      const result = await response.json();
      const conflicts = result.conflicts || [];
      lastTargetRef.current = { fmeaId, cpNo };

      setState(prev => ({
        ...prev,
        conflicts,
        status: conflicts.length > 0 ? 'conflict' : 'idle',
      }));

      return conflicts;

    } catch (error: any) {
      console.error('충돌 감지 실패:', error.message);
      return [];
    }
  }, []);

  /**
   * 단일 충돌 해결
   */
  const resolveConflict = useCallback((
    field: string,
    resolution: ConflictResolution
  ) => {
    setState(prev => ({
      ...prev,
      conflicts: prev.conflicts.map(c => 
        c.field === field ? { ...c, resolution } : c
      ),
    }));
  }, []);

  /**
   * 모든 충돌 일괄 해결
   */
  const resolveAllConflicts = useCallback((
    resolution: ConflictResolution
  ) => {
    setState(prev => ({
      ...prev,
      conflicts: prev.conflicts.map(c => ({ ...c, resolution })),
    }));
  }, []);

  /**
   * 충돌 해결 적용
   */
  const applyResolutions = useCallback(async (): Promise<SyncResponse> => {
    if (!lastTargetRef.current) {
      return {
        success: false,
        synced: 0,
        conflicts: [],
        skipped: 0,
        error: '동기화 대상이 없습니다.',
      };
    }

    const resolutions = state.conflicts
      .filter(c => c.resolution)
      .map(c => ({ field: c.field, resolution: c.resolution! }));

    const response = await fetch('/api/sync/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...lastTargetRef.current,
        conflictPolicy: 'ask',
        resolutions,
      }),
    });

    const result = await response.json();
    setState(prev => ({
      ...prev,
      status: result.success ? 'success' : 'error',
      synced: result.synced || 0,
      skipped: result.skipped || 0,
      conflicts: result.conflicts || [],
      lastSyncAt: new Date(),
      error: result.error,
    }));

    return result;
  }, [state.conflicts]);

  /**
   * 데이터 동기화 실행
   */
  const syncData = useCallback(async (
    request: DataSyncRequest
  ): Promise<SyncResponse> => {
    const { fmeaId, cpNo, fields, conflictPolicy = 'ask' } = request;
    
    setState(prev => ({ ...prev, status: 'syncing' }));

    try {
      lastTargetRef.current = { fmeaId, cpNo, fields };

      // API 호출
      const syncRes = await fetch('/api/sync/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const syncData = await syncRes.json();

      if (!syncData.success && syncData.conflicts?.length > 0) {
        setState(prev => ({
          ...prev,
          status: 'conflict',
          conflicts: syncData.conflicts,
          synced: 0,
          skipped: 0,
        }));
        return syncData;
      }

      setState(prev => ({
        ...prev,
        status: syncData.success ? 'success' : 'error',
        synced: syncData.synced,
        skipped: syncData.skipped,
        lastSyncAt: new Date(),
        error: syncData.error,
      }));

      return syncData;

    } catch (error: any) {
      console.error('❌ 데이터 동기화 실패:', error.message);
      
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message,
      }));

      return {
        success: false,
        synced: 0,
        conflicts: [],
        skipped: 0,
        error: error.message,
      };
    }
  }, [applyResolutions]);

  /**
   * 충돌 목록 초기화
   */
  const clearConflicts = useCallback(() => {
    setState(prev => ({ ...prev, conflicts: [] }));
  }, []);

  /**
   * 전체 상태 초기화
   */
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    syncData,
    detectConflicts,
    resolveConflict,
    resolveAllConflicts,
    applyResolutions,
    clearConflicts,
    reset,
  };
}

export default useDataSync;
