// @ts-nocheck
/**
 * @file hooks/useCpSync.ts
 * @description FMEA 워크시트용 CP 동기화 훅
 * @module pfmea/worksheet
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// 타입 정의
// ============================================================================

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface UseCpSyncReturn {
  /** 연결된 CP 번호 */
  linkedCpNo: string | null;
  /** 동기화 상태 */
  syncStatus: SyncStatus;
  /** CP 구조 동기화 핸들러 */
  handleCpStructureSync: () => Promise<void>;
  /** CP 데이터 동기화 핸들러 */
  handleCpDataSync: () => Promise<void>;
  /** 연결된 CP 설정 */
  setLinkedCpNo: (cpNo: string | null) => void;
}

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * FMEA 워크시트용 CP 동기화 훅
 * 
 * @param selectedFmeaId - 현재 선택된 FMEA ID
 * @returns CP 동기화 관련 상태 및 핸들러
 * 
 * @example
 * ```tsx
 * const { linkedCpNo, syncStatus, handleCpStructureSync, handleCpDataSync } = useCpSync(selectedFmeaId);
 * ```
 */
export function useCpSync(selectedFmeaId: string | null): UseCpSyncReturn {
  const [linkedCpNo, setLinkedCpNo] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // 연결된 CP 조회
  useEffect(() => {
    console.log('🔍 useCpSync useEffect 실행, selectedFmeaId:', selectedFmeaId);
    
    const fetchLinkedCp = async () => {
      if (!selectedFmeaId) {
        console.log('⚠️ selectedFmeaId가 없음 - CP 조회 스킵');
        setLinkedCpNo(null);
        return;
      }
      
      try {
        console.log(`📡 연결된 CP 조회 중: /api/control-plan?fmeaId=${selectedFmeaId}`);
        const res = await fetch(`/api/control-plan?fmeaId=${selectedFmeaId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.length > 0) {
            setLinkedCpNo(data.data[0].cpNo);
            console.log(`✅ 연결된 CP 발견: ${data.data[0].cpNo}`);
          } else {
            setLinkedCpNo(null);
          }
        }
      } catch (e) {
        console.error('연결된 CP 조회 실패:', e);
        setLinkedCpNo(null);
      }
    };
    
    fetchLinkedCp();
  }, [selectedFmeaId]);

  // CP 구조 동기화 핸들러
  const handleCpStructureSync = useCallback(async () => {
    console.log('🔥 handleCpStructureSync 호출됨', { selectedFmeaId, linkedCpNo });
    
    if (!selectedFmeaId) {
      alert('FMEA를 먼저 선택해주세요.');
      return;
    }
    
    const targetCpNo = linkedCpNo || prompt('동기화할 CP 번호를 입력하세요:');
    console.log('🎯 targetCpNo:', targetCpNo);
    if (!targetCpNo) return;
    
    setSyncStatus('syncing');
    
    try {
      const res = await fetch('/api/sync/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'fmea-to-cp',
          sourceId: selectedFmeaId,
          targetId: targetCpNo,
          options: { overwrite: true }, // 기존 CP 항목 삭제 후 새로 생성
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setSyncStatus('success');
        alert(`✅ FMEA→CP 구조 동기화 완료: ${result.synced}개 항목`);
        setLinkedCpNo(targetCpNo);
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
  }, [selectedFmeaId, linkedCpNo]);

  // CP 데이터 동기화 핸들러
  const handleCpDataSync = useCallback(async () => {
    if (!selectedFmeaId || !linkedCpNo) {
      alert('FMEA와 CP가 연결되어 있어야 합니다.');
      return;
    }
    
    setSyncStatus('syncing');
    
    try {
      const res = await fetch('/api/sync/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId: selectedFmeaId,
          cpNo: linkedCpNo,
          conflictPolicy: 'fmea-wins',
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setSyncStatus('success');
        alert(`✅ 데이터 동기화 완료: ${result.synced}개`);
      } else if (result.conflicts?.length > 0) {
        setSyncStatus('idle');
        alert(`⚠️ ${result.conflicts.length}개 충돌 감지`);
      } else {
        setSyncStatus('error');
        alert(`❌ 동기화 실패: ${result.error}`);
      }
    } catch (error: any) {
      setSyncStatus('error');
      console.error('데이터 동기화 실패:', error);
      alert('데이터 동기화 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [selectedFmeaId, linkedCpNo]);

  return {
    linkedCpNo,
    syncStatus,
    handleCpStructureSync,
    handleCpDataSync,
    setLinkedCpNo,
  };
}

export default useCpSync;
