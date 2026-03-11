/**
 * @file pfd/worksheet/hooks/usePfdSync.ts
 * @description PFD 동기화 훅 (FMEA/CP 연동)
 * @module pfd/worksheet/hooks
 */

import { useState, useCallback } from 'react';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface UsePfdSyncReturn {
  syncStatus: SyncStatus;
  handleFmeaStructureSync: () => Promise<void>;
  handleCpStructureSync: () => Promise<void>;
  handleDataSync: () => Promise<void>;
}

export function usePfdSync(
  pfdId: string,
  linkedFmeaId: string | null,
  linkedCpNo: string | null
): UsePfdSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // PFD → FMEA 구조 동기화
  const handleFmeaStructureSync = useCallback(async () => {
    if (!pfdId) {
      alert('PFD를 먼저 저장해주세요.');
      return;
    }

    const targetFmeaId = linkedFmeaId || prompt('동기화할 FMEA ID를 입력하세요:');
    if (!targetFmeaId) return;

    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/sync/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'pfd-to-fmea',
          sourceId: pfdId,
          targetId: targetFmeaId,
          options: { overwrite: false },
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSyncStatus('success');
        alert(`✅ PFD→FMEA 구조 동기화 완료: ${result.synced}개 항목`);
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
  }, [pfdId, linkedFmeaId]);

  // PFD → CP 구조 동기화
  const handleCpStructureSync = useCallback(async () => {
    if (!pfdId) {
      alert('PFD를 먼저 저장해주세요.');
      return;
    }

    const targetCpNo = linkedCpNo || prompt('동기화할 CP 번호를 입력하세요:');
    if (!targetCpNo) return;

    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/sync/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'pfd-to-cp',
          sourceId: pfdId,
          targetId: targetCpNo,
          options: { overwrite: false },
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSyncStatus('success');
        alert(`✅ PFD→CP 구조 동기화 완료: ${result.synced}개 항목`);
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
  }, [pfdId, linkedCpNo]);

  // 데이터 동기화
  const handleDataSync = useCallback(async () => {
    if (!pfdId) {
      alert('PFD를 먼저 저장해주세요.');
      return;
    }

    if (!linkedFmeaId && !linkedCpNo) {
      alert('연결된 FMEA 또는 CP가 없습니다.');
      return;
    }

    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/sync/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: {
            pfdId,
            fmeaId: linkedFmeaId,
            cpNo: linkedCpNo,
          },
          conflictPolicy: 'ask',
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSyncStatus('success');
        alert(`✅ 데이터 동기화 완료: ${result.synced}개 필드 업데이트`);
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
  }, [pfdId, linkedFmeaId, linkedCpNo]);

  return {
    syncStatus,
    handleFmeaStructureSync,
    handleCpStructureSync,
    handleDataSync,
  };
}
