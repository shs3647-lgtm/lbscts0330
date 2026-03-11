/**
 * @file hooks/useFmeaSync.ts
 * @description CP 워크시트용 FMEA 동기화 훅
 * @module control-plan/worksheet
 */

'use client';

import { useState, useCallback } from 'react';

// ============================================================================
// 타입 정의
// ============================================================================

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface UseFmeaSyncReturn {
  /** 동기화 상태 */
  syncStatus: SyncStatus;
  /** FMEA 구조 동기화 핸들러 */
  handleStructureSync: () => Promise<void>;
  /** FMEA 데이터 동기화 핸들러 */
  handleDataSync: () => Promise<void>;
  /** 상태 리셋 */
  resetSyncStatus: () => void;
}

interface UseFmeaSyncParams {
  /** CP 번호 */
  cpNo: string;
  /** FMEA ID */
  fmeaId: string | null;
  /** FMEA 동기화 후 콜백 */
  onSyncComplete?: () => void;
}

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * CP 워크시트용 FMEA 동기화 훅
 * 
 * @param params - 동기화 파라미터
 * @returns FMEA 동기화 관련 상태 및 핸들러
 * 
 * @example
 * ```tsx
 * const { syncStatus, handleStructureSync, handleDataSync } = useFmeaSync({
 *   cpNo: state.cpNo,
 *   fmeaId: state.fmeaId,
 *   onSyncComplete: () => refetchData(),
 * });
 * ```
 */
export function useFmeaSync({
  cpNo,
  fmeaId,
  onSyncComplete,
}: UseFmeaSyncParams): UseFmeaSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // FMEA 구조 동기화 핸들러
  const handleStructureSync = useCallback(async () => {
    if (!fmeaId || !cpNo) {
      alert('FMEA와 CP가 연결되어 있어야 합니다.');
      return;
    }
    
    setSyncStatus('syncing');
    
    try {
      const res = await fetch('/api/sync/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'fmea-to-cp',
          sourceId: fmeaId,
          targetId: cpNo,
          options: { overwrite: true },  // 기존 데이터 대체 (중복 방지)
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setSyncStatus('success');
        alert(`✅ FMEA→CP 구조 동기화 완료: ${result.synced}개 항목`);
        onSyncComplete?.();
      } else {
        setSyncStatus('error');
        alert(`❌ 구조 동기화 실패: ${result.error}`);
      }
    } catch (error: any) {
      setSyncStatus('error');
      console.error('구조 동기화 실패:', error);
      alert('구조 동기화 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [fmeaId, cpNo, onSyncComplete]);

  // FMEA 데이터 동기화 핸들러
  const handleDataSync = useCallback(async () => {
    if (!fmeaId || !cpNo) {
      alert('FMEA와 CP가 연결되어 있어야 합니다.');
      return;
    }
    
    setSyncStatus('syncing');
    
    try {
      const res = await fetch('/api/sync/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId: fmeaId,
          cpNo: cpNo,
          conflictPolicy: 'fmea-wins',
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setSyncStatus('success');
        alert(`✅ 데이터 동기화 완료: ${result.synced}개 동기화, ${result.skipped}개 스킵`);
      } else if (result.conflicts?.length > 0) {
        setSyncStatus('idle');
        alert(`⚠️ ${result.conflicts.length}개 충돌 감지. 충돌 해결 기능 준비 중...`);
      } else {
        setSyncStatus('error');
        alert(`❌ 데이터 동기화 실패: ${result.error}`);
      }
    } catch (error: any) {
      setSyncStatus('error');
      console.error('데이터 동기화 실패:', error);
      alert('데이터 동기화 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [fmeaId, cpNo]);

  // 상태 리셋
  const resetSyncStatus = useCallback(() => {
    setSyncStatus('idle');
  }, []);

  return {
    syncStatus,
    handleStructureSync,
    handleDataSync,
    resetSyncStatus,
  };
}

export default useFmeaSync;
