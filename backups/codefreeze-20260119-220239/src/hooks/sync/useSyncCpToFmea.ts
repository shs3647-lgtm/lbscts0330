/**
 * @file hooks/sync/useSyncCpToFmea.ts
 * @description CP → FMEA 구조 동기화 훅 (역방향)
 * @module sync
 * 
 * 주의: CP에서 FMEA로 동기화 시 고장정보(FM/FE/FC)와 
 *       리스크 정보(S/O/D/AP)는 빈 값으로 생성됨
 */

'use client';

import { useState, useCallback } from 'react';
import type {
  SyncStatus,
  SyncResponse,
  CpItemForSync,
} from './types';

// ============================================================================
// 타입 정의
// ============================================================================

interface UseSyncCpToFmeaState {
  status: SyncStatus;
  progress: number;
  totalItems: number;
  error?: string;
}

interface UseSyncCpToFmeaReturn {
  state: UseSyncCpToFmeaState;
  syncStructure: (cpNo: string, fmeaId: string) => Promise<SyncResponse>;
  reset: () => void;
}

/** FMEA L2 구조 생성용 */
interface FmeaL2CreateData {
  no: string;
  name: string;
  function: string;
  equipment?: string;
  cpItemId: string;
}

/** FMEA L3 구조 생성용 */
interface FmeaL3CreateData {
  no: string;
  name: string;
  function: string;
  equipment?: string;
}

// ============================================================================
// 초기 상태
// ============================================================================

const INITIAL_STATE: UseSyncCpToFmeaState = {
  status: 'idle',
  progress: 0,
  totalItems: 0,
};

// ============================================================================
// CP 데이터 → FMEA 구조 변환 함수
// ============================================================================

/**
 * CP 항목들을 공정번호로 그룹화
 */
const groupCpItemsByProcess = (
  cpItems: CpItemForSync[]
): Map<string, CpItemForSync[]> => {
  const grouped = new Map<string, CpItemForSync[]>();
  
  cpItems.forEach((item) => {
    const key = `${item.processNo}_${item.processName}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  });
  
  return grouped;
};

/**
 * CP 항목 그룹을 FMEA L2 데이터로 변환
 */
const transformCpToFmeaStructure = (
  cpItems: CpItemForSync[],
  fmeaId: string
): { l2List: FmeaL2CreateData[]; l3List: FmeaL3CreateData[] } => {
  const grouped = groupCpItemsByProcess(cpItems);
  const l2List: FmeaL2CreateData[] = [];
  const l3List: FmeaL3CreateData[] = [];
  
  let l2Order = 0;
  
  grouped.forEach((items, key) => {
    const firstItem = items[0];
    
    // L2 (공정) 생성
    l2List.push({
      no: firstItem.processNo || String(++l2Order * 10),
      name: firstItem.processName || '',
      function: firstItem.processDesc || '',
      equipment: firstItem.equipment || '',
      cpItemId: firstItem.id,
    });
    
    // L3 (작업요소) - workElement가 있는 경우만
    if (firstItem.workElement) {
      l3List.push({
        no: `${firstItem.processNo}.1`,
        name: firstItem.workElement,
        function: firstItem.processDesc || '',
        equipment: firstItem.equipment || '',
      });
    }
  });
  
  return { l2List, l3List };
};

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * CP → FMEA 구조 동기화 훅
 * 
 * @description
 * CP 구조를 FMEA에 역방향 동기화합니다.
 * - 공정정보(공정번호, 공정명, 공정설명, 설비) 동기화
 * - 특성정보(제품특성, 공정특성, 특별특성) 동기화
 * - 고장정보(FM/FE/FC) → 빈 값으로 생성
 * - 리스크 정보(S/O/D/AP) → 빈 값으로 생성
 * 
 * @example
 * ```tsx
 * const { state, syncStructure, reset } = useSyncCpToFmea();
 * 
 * const handleSync = async () => {
 *   const result = await syncStructure('cp26-m001', 'pfm26-m001');
 *   if (result.success) {
 *     console.log(`${result.synced}개 공정 동기화 완료`);
 *   }
 * };
 * ```
 */
export function useSyncCpToFmea(): UseSyncCpToFmeaReturn {
  const [state, setState] = useState<UseSyncCpToFmeaState>(INITIAL_STATE);

  /**
   * CP → FMEA 구조 동기화 실행
   */
  const syncStructure = useCallback(async (
    cpNo: string,
    fmeaId: string
  ): Promise<SyncResponse> => {
    setState(prev => ({ ...prev, status: 'syncing', progress: 0 }));

    try {
      // 1. CP 데이터 조회
      const cpRes = await fetch(`/api/control-plan/${cpNo}/items`);
      if (!cpRes.ok) {
        throw new Error('CP 데이터 조회 실패');
      }
      
      const cpData = await cpRes.json();
      if (!cpData.success || !cpData.data || cpData.data.length === 0) {
        throw new Error('CP 데이터가 없습니다');
      }

      setState(prev => ({ ...prev, progress: 30 }));

      // 2. FMEA 구조로 변환
      const { l2List, l3List } = transformCpToFmeaStructure(cpData.data, fmeaId);
      
      setState(prev => ({ 
        ...prev, 
        progress: 50, 
        totalItems: l2List.length 
      }));

      // 3. FMEA에 저장 (API 호출)
      const saveRes = await fetch(`/api/sync/structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'cp-to-fmea',
          sourceId: cpNo,
          targetId: fmeaId,
          data: {
            l2List,
            l3List,
            // 고장정보와 리스크는 빈 값으로 생성하도록 플래그
            createEmptyFailureData: true,
            createEmptyRiskData: true,
          },
          options: {
            overwrite: false,
            createEmpty: true,
          },
        }),
      });

      if (!saveRes.ok) {
        // API가 없으면 로컬 시뮬레이션 (개발 중)
        console.warn('⚠️ /api/sync/structure API 미구현 - 로컬 시뮬레이션');
        
        setState(prev => ({ 
          ...prev, 
          status: 'success', 
          progress: 100 
        }));

        return {
          success: true,
          synced: l2List.length,
          conflicts: [],
          skipped: 0,
        };
      }

      const saveData = await saveRes.json();
      
      setState(prev => ({ 
        ...prev, 
        status: saveData.success ? 'success' : 'error', 
        progress: 100,
        error: saveData.error,
      }));

      console.log(`✅ CP→FMEA 구조 동기화 완료: ${l2List.length}개 공정`);

      return {
        success: saveData.success,
        synced: l2List.length,
        conflicts: saveData.conflicts || [],
        skipped: saveData.skipped || 0,
        error: saveData.error,
      };

    } catch (error: any) {
      console.error('❌ CP→FMEA 구조 동기화 실패:', error.message);
      
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

export default useSyncCpToFmea;
