/**
 * @file hooks/sync/useSyncFmeaToCp.ts
 * @description FMEA → CP 구조 동기화 훅
 * @module sync
 */

'use client';

import { useState, useCallback } from 'react';
import type {
  SyncStatus,
  StructureSyncRequest,
  SyncResponse,
  FmeaL2ForSync,
  CpItemForSync,
} from './types';

// ============================================================================
// 타입 정의
// ============================================================================

interface UseSyncFmeaToCpState {
  status: SyncStatus;
  progress: number;
  totalItems: number;
  error?: string;
}

interface UseSyncFmeaToCpReturn {
  state: UseSyncFmeaToCpState;
  syncStructure: (fmeaId: string, cpNo: string) => Promise<SyncResponse>;
  reset: () => void;
}

// ============================================================================
// 초기 상태
// ============================================================================

const INITIAL_STATE: UseSyncFmeaToCpState = {
  status: 'idle',
  progress: 0,
  totalItems: 0,
};

// ============================================================================
// FMEA 데이터 → CP 항목 변환 함수
// ============================================================================

/**
 * FMEA L2 데이터를 CP 항목으로 변환
 */
const transformFmeaToCpItems = (
  fmeaData: { l2: FmeaL2ForSync[] },
  cpNo: string
): CpItemForSync[] => {
  const cpItems: CpItemForSync[] = [];
  let sortOrder = 0;

  (fmeaData.l2 || []).forEach((l2) => {
    // L2 공정의 제품특성이 있는 경우
    if (l2.productChars && l2.productChars.length > 0) {
      l2.productChars.forEach((pc) => {
        cpItems.push(createCpItem({
          cpNo,
          l2,
          productChar: pc.name,
          specialChar: pc.specialChar,
          sortOrder: sortOrder++,
        }));
      });
    } else {
      // 제품특성이 없어도 공정은 추가
      cpItems.push(createCpItem({
        cpNo,
        l2,
        sortOrder: sortOrder++,
      }));
    }
  });

  return cpItems;
};

/**
 * CP 항목 생성 헬퍼
 */
const createCpItem = (params: {
  cpNo: string;
  l2: FmeaL2ForSync;
  productChar?: string;
  specialChar?: string;
  sortOrder: number;
}): CpItemForSync => {
  const { cpNo, l2, productChar, specialChar, sortOrder } = params;
  const id = `cpi-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  return {
    id,
    processNo: l2.no || '',
    processName: l2.name || '',
    processLevel: 'Main',
    processDesc: l2.function || '',
    workElement: l2.l3Structures?.[0]?.name || '',
    equipment: l2.l3Structures?.[0]?.equipment || '',
    productChar: productChar || '',
    processChar: '',
    specialChar: specialChar || '',
    specTolerance: '',
    evalMethod: '',
    sampleSize: '',
    sampleFreq: '',
    controlMethod: '',
    reactionPlan: '',
    pfmeaRowUid: l2.id,
    pfmeaProcessId: l2.id,
    sortOrder,
  };
};

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * FMEA → CP 구조 동기화 훅
 * 
 * @example
 * ```tsx
 * const { state, syncStructure, reset } = useSyncFmeaToCp();
 * 
 * const handleSync = async () => {
 *   const result = await syncStructure('pfm26-m001', 'cp26-m001');
 *   if (result.success) {
 *     console.log(`${result.synced}개 항목 동기화 완료`);
 *   }
 * };
 * ```
 */
export function useSyncFmeaToCp(): UseSyncFmeaToCpReturn {
  const [state, setState] = useState<UseSyncFmeaToCpState>(INITIAL_STATE);

  /**
   * FMEA → CP 구조 동기화 실행
   */
  const syncStructure = useCallback(async (
    fmeaId: string, 
    cpNo: string
  ): Promise<SyncResponse> => {
    setState(prev => ({ ...prev, status: 'syncing', progress: 0 }));

    try {
      // 1. FMEA 데이터 조회
      const fmeaRes = await fetch(`/api/pfmea/${fmeaId}`);
      if (!fmeaRes.ok) {
        throw new Error('FMEA 데이터 조회 실패');
      }
      
      const fmeaData = await fmeaRes.json();
      if (!fmeaData.success || !fmeaData.data) {
        throw new Error('FMEA 데이터가 없습니다');
      }

      setState(prev => ({ ...prev, progress: 30 }));

      // 2. CP 항목으로 변환
      const cpItems = transformFmeaToCpItems(fmeaData.data, cpNo);
      
      setState(prev => ({ 
        ...prev, 
        progress: 50, 
        totalItems: cpItems.length 
      }));

      // 3. CP에 저장
      const saveRes = await fetch(`/api/control-plan/${cpNo}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cpItems }),
      });

      if (!saveRes.ok) {
        throw new Error('CP 저장 실패');
      }

      const saveData = await saveRes.json();
      
      setState(prev => ({ 
        ...prev, 
        status: 'success', 
        progress: 100 
      }));


      return {
        success: true,
        synced: cpItems.length,
        conflicts: [],
        skipped: 0,
      };

    } catch (error: any) {
      console.error('❌ FMEA→CP 구조 동기화 실패:', error.message);
      
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message 
      }));

      return {
        success: false,
        synced: 0,
        conflicts: [],
        skipped: 0,
        error: error.message,
      };
    }
  }, []);

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    syncStructure,
    reset,
  };
}

export default useSyncFmeaToCp;
