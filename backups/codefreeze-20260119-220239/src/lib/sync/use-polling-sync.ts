/**
 * @file use-polling-sync.ts
 * @description PFMEA-CP-PFD 실시간 동기화를 위한 React 훅 (Polling 기반)
 *
 * 사용법:
 * - PFMEA 앱: usePollingSync('pfmea', fmeaId)
 * - CP 앱: usePollingSync('cp', cpNo)
 * - PFD 앱: usePollingSync('pfd', pfdNo)
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Polling 설정
const POLLING_CONFIG = {
  DEFAULT_INTERVAL: 3000,  // 3초
  MIN_INTERVAL: 1000,      // 1초
  MAX_INTERVAL: 30000,     // 30초
  BACKOFF_MULTIPLIER: 1.5, // 에러 시 백오프 배수
};

export type AppType = 'pfmea' | 'cp' | 'pfd';

export interface SyncChange {
  id: string;
  sourceType: string;
  sourceTable: string;
  changeType: 'insert' | 'update' | 'delete';
  changedFields: string[] | null;
  newValues: Record<string, unknown> | null;
  createdAt: Date;
}

export interface UsePollingSyncOptions {
  enabled?: boolean;
  interval?: number;
  onChanges?: (changes: SyncChange[]) => void;
  onError?: (error: Error) => void;
}

export interface UsePollingSyncResult {
  isPolling: boolean;
  lastPolledAt: Date | null;
  pendingChanges: number;
  error: Error | null;
  startPolling: () => void;
  stopPolling: () => void;
  forceSync: () => Promise<void>;
}

/**
 * Polling 기반 실시간 동기화 훅
 */
export function usePollingSync(
  appType: AppType,
  documentId: string,
  options: UsePollingSyncOptions = {}
): UsePollingSyncResult {
  const {
    enabled = true,
    interval = POLLING_CONFIG.DEFAULT_INTERVAL,
    onChanges,
    onError,
  } = options;

  const queryClient = useQueryClient();
  const [isPolling, setIsPolling] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIntervalRef = useRef(interval);
  const retryCountRef = useRef(0);

  /**
   * 변경사항 폴링 API 호출
   */
  const fetchChanges = useCallback(async () => {
    try {
      const response = await fetch('/api/sync/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appType,
          documentId,
          since: lastPolledAt?.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status}`);
      }

      const data = await response.json();
      const changes: SyncChange[] = data.changes || [];

      setLastPolledAt(new Date(data.lastPolledAt));
      setPendingChanges(changes.length);
      setError(null);
      retryCountRef.current = 0;
      currentIntervalRef.current = interval;

      if (changes.length > 0) {
        // 변경사항이 있으면 콜백 호출
        onChanges?.(changes);

        // 관련 쿼리 무효화 (자동 리페치)
        invalidateRelatedQueries(appType, documentId, changes);
      }

      return changes;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);

      // 에러 시 백오프 적용
      retryCountRef.current++;
      currentIntervalRef.current = Math.min(
        interval * Math.pow(POLLING_CONFIG.BACKOFF_MULTIPLIER, retryCountRef.current),
        POLLING_CONFIG.MAX_INTERVAL
      );

      return [];
    }
  }, [appType, documentId, lastPolledAt, interval, onChanges, onError]);

  /**
   * 관련 쿼리 무효화
   */
  const invalidateRelatedQueries = useCallback(
    (appType: AppType, documentId: string, changes: SyncChange[]) => {
      // 앱 타입별 쿼리 키 무효화
      if (appType === 'cp') {
        // CP 관련 쿼리 무효화
        queryClient.invalidateQueries({ queryKey: ['controlPlan', documentId] });
        queryClient.invalidateQueries({ queryKey: ['controlPlanItems', documentId] });

        // 특성 변경 시 관리항목 쿼리도 무효화
        const hasCharacteristicChange = changes.some(
          c => c.sourceTable === 'shared_characteristics_master'
        );
        if (hasCharacteristicChange) {
          queryClient.invalidateQueries({ queryKey: ['cpControlItems', documentId] });
        }
      } else if (appType === 'pfd') {
        // PFD 관련 쿼리 무효화
        queryClient.invalidateQueries({ queryKey: ['pfd', documentId] });
        queryClient.invalidateQueries({ queryKey: ['pfdItems', documentId] });
      } else if (appType === 'pfmea') {
        // PFMEA 관련 쿼리 무효화 (역전파 감지용)
        queryClient.invalidateQueries({ queryKey: ['pfmea', documentId] });
      }
    },
    [queryClient]
  );

  /**
   * 폴링 시작
   */
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;

    setIsPolling(true);

    const poll = async () => {
      await fetchChanges();

      // 다음 폴링 스케줄
      intervalRef.current = setTimeout(poll, currentIntervalRef.current);
    };

    // 즉시 첫 폴링 실행
    poll();
  }, [fetchChanges]);

  /**
   * 폴링 중지
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /**
   * 강제 동기화
   */
  const forceSync = useCallback(async () => {
    await fetchChanges();
  }, [fetchChanges]);

  // 컴포넌트 마운트/언마운트 시 폴링 관리
  useEffect(() => {
    if (enabled && documentId) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, documentId, startPolling, stopPolling]);

  return {
    isPolling,
    lastPolledAt,
    pendingChanges,
    error,
    startPolling,
    stopPolling,
    forceSync,
  };
}

/**
 * 동기화 상태 표시 컴포넌트용 훅
 */
export function useSyncStatus(appType: AppType, documentId: string) {
  const [status, setStatus] = useState<'synced' | 'syncing' | 'pending' | 'error'>('synced');
  const [changeCount, setChangeCount] = useState(0);

  const { isPolling, pendingChanges, error } = usePollingSync(appType, documentId, {
    onChanges: (changes) => {
      setChangeCount(c => c + changes.length);
      setStatus('pending');
    },
    onError: () => {
      setStatus('error');
    },
  });

  useEffect(() => {
    if (error) {
      setStatus('error');
    } else if (isPolling && pendingChanges > 0) {
      setStatus('syncing');
    } else if (pendingChanges > 0) {
      setStatus('pending');
    } else {
      setStatus('synced');
    }
  }, [isPolling, pendingChanges, error]);

  const clearChanges = useCallback(() => {
    setChangeCount(0);
    setStatus('synced');
  }, []);

  return { status, changeCount, clearChanges };
}
