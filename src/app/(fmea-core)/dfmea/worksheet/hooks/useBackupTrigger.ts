/**
 * @file useBackupTrigger.ts
 * @description 자동 백업 트리거 훅
 * - lastSaved 변경 감지 → 10회마다 주기적 스냅샷
 * - Ctrl+Shift+B 키보드 단축키 → 백업 패널 열기
 * - triggerConfirmBackup() → 확정 핸들러에서 호출
 * @created 2026-02-23
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WorksheetState } from '../constants';
import { createSnapshot } from '@/lib/backup/snapshot-manager';

const PERIODIC_INTERVAL = 10; // 10회 저장마다 자동 스냅샷

interface UseBackupTriggerParams {
  fmeaId: string | null;
  stateRef: React.MutableRefObject<WorksheetState>;
  lastSaved: string;
}

interface UseBackupTriggerReturn {
  isBackupPanelOpen: boolean;
  setBackupPanelOpen: (open: boolean) => void;
  triggerConfirmBackup: (note: string) => void;
}

export function useBackupTrigger({
  fmeaId,
  stateRef,
  lastSaved,
}: UseBackupTriggerParams): UseBackupTriggerReturn {
  const [isBackupPanelOpen, setBackupPanelOpen] = useState(false);
  const saveCountRef = useRef(0);
  const lastSavedRef = useRef(lastSaved);

  // =========================================================================
  // 주기적 자동 백업 (10회 저장마다)
  // =========================================================================

  useEffect(() => {
    // lastSaved가 변경되면 save count 증가
    if (lastSaved && lastSaved !== lastSavedRef.current) {
      lastSavedRef.current = lastSaved;
      saveCountRef.current += 1;

      if (saveCountRef.current > 0 && saveCountRef.current % PERIODIC_INTERVAL === 0 && fmeaId) {
        createSnapshot(
          fmeaId,
          stateRef.current,
          'AUTO_PERIODIC',
          `자동(${saveCountRef.current}회차)`,
        ).catch(e => console.error('[자동백업] 주기적 스냅샷 오류:', e));
      }
    }
  }, [lastSaved, fmeaId, stateRef]);

  // =========================================================================
  // 키보드 단축키 (Ctrl+Shift+B)
  // =========================================================================

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setBackupPanelOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // =========================================================================
  // 확정 시 백업 트리거
  // =========================================================================

  const triggerConfirmBackup = useCallback((note: string) => {
    if (!fmeaId) return;
    createSnapshot(fmeaId, stateRef.current, 'AUTO_CONFIRM', note).catch(e =>
      console.error('[자동백업] 확정 스냅샷 오류:', e),
    );
  }, [fmeaId, stateRef]);

  return { isBackupPanelOpen, setBackupPanelOpen, triggerConfirmBackup };
}
