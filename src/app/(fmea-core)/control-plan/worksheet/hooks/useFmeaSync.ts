/**
 * @file hooks/useFmeaSync.ts
 * @description CP 워크시트용 FMEA/PFD 동기화 훅
 * @version 2.0.0 - CP→PFD 연동 추가
 * @status CODE_FREEZE 🔒
 * @frozen_date 2026-02-05
 * @freeze_level L2
 * 
 * ⚠️ 이 파일은 코드프리즈 상태입니다.
 * 버그 수정만 허용, 기능 수정 시 승인 필요
 * 
 * @module control-plan/worksheet
 */

'use client';

import { useState, useCallback } from 'react';

// ============================================================================
// 🔒 HARDCODED CONSTANTS - 변경 금지
// ============================================================================

// CP 병합 구조 규칙 (HARDCODED)
const CP_MERGE_STRUCTURE = {
  PROCESS_PARENT: ['processNo', 'processName', 'processLevel', 'processDesc'],
  PRODUCT_CHAR_PARENT: 'partName',  // 제품특성 부모 = 부품명
  PROCESS_CHAR_PARENT: 'equipment', // 공정특성 부모 = 설비 (4M=MC)
} as const; // HARDCODED

// 4M 분류 중 CP/PFD 제외 대상 (HARDCODED)
const M4_EXCLUDE = ['MN'] as const; // 사람(MN)은 연동에서 제외

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
  /** ★ CP → PFD 구조 동기화 핸들러 */
  handlePfdStructureSync: () => Promise<void>;
  /** 상태 리셋 */
  resetSyncStatus: () => void;
}

interface UseFmeaSyncParams {
  /** CP 번호 */
  cpNo: string;
  /** FMEA ID */
  fmeaId: string | null;
  /** PFD ID */
  pfdId?: string | null;
  /** 동기화 후 콜백 */
  onSyncComplete?: () => void;
}

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * CP 워크시트용 FMEA/PFD 동기화 훅
 * 
 * @param params - 동기화 파라미터
 * @returns FMEA/PFD 동기화 관련 상태 및 핸들러
 */
export function useFmeaSync({
  cpNo,
  fmeaId,
  pfdId,
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
          options: { overwrite: true },
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

  // ★ CP → PFD 구조 동기화 핸들러
  const handlePfdStructureSync = useCallback(async () => {
    if (!cpNo) {
      alert('CP가 선택되어 있어야 합니다.');
      return;
    }

    const targetPfdId = pfdId || prompt('동기화할 PFD ID를 입력하세요:');
    if (!targetPfdId) return;

    setSyncStatus('syncing');

    try {

      const res = await fetch('/api/sync/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'cp-to-pfd',
          sourceId: cpNo,
          targetId: targetPfdId,
          options: {
            overwrite: false,
            mergeStructure: CP_MERGE_STRUCTURE, // HARDCODED 상수 사용
            excludeM4: M4_EXCLUDE, // MN 제외
          },
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSyncStatus('success');
        alert(`✅ CP→PFD 구조 동기화 완료: ${result.synced}개 항목`);
        onSyncComplete?.();
      } else {
        setSyncStatus('error');
        alert(`❌ CP→PFD 동기화 실패: ${result.error}`);
      }
    } catch (error: any) {
      setSyncStatus('error');
      console.error('CP→PFD 동기화 실패:', error);
      alert('CP→PFD 동기화 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [cpNo, pfdId, onSyncComplete]);

  // 상태 리셋
  const resetSyncStatus = useCallback(() => {
    setSyncStatus('idle');
  }, []);

  return {
    syncStatus,
    handleStructureSync,
    handleDataSync,
    handlePfdStructureSync,
    resetSyncStatus,
  };
}

export default useFmeaSync;

