/**
 * @file useWorksheetCore.ts
 * @description 워크시트 핵심 상태 관리 Hook (PFMEA/DFMEA 공용)
 * @version 1.0.0
 */

'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { WorksheetState } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import { createInitialState } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import type { WorksheetConfig } from './types';
import { PFMEA_CONFIG } from './types';

export interface UseWorksheetCoreReturn {
  // 상태
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced: (updater: React.SetStateAction<WorksheetState>) => void;
  stateRef: React.MutableRefObject<WorksheetState>;
  
  // 플래그
  dirty: boolean;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  lastSaved: string;
  setLastSaved: React.Dispatch<React.SetStateAction<string>>;
  isHydrated: boolean;
  
  // URL 파라미터
  selectedFmeaId: string | null;
  baseId: string | null;
  mode: string | null;
  urlTab: string | null;
  
  // Refs
  suppressAutoSaveRef: React.MutableRefObject<boolean>;
  saveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  autoSaveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastAutoSaveHashRef: React.MutableRefObject<string>;
}

export function useWorksheetCore(
  config: WorksheetConfig = PFMEA_CONFIG
): UseWorksheetCoreReturn {
  const searchParams = useSearchParams();
  
  // ✅ FMEA ID는 항상 소문자로 정규화 (DB 정규화)
  const selectedFmeaId = searchParams.get('id')?.toLowerCase() || null;
  const baseId = searchParams.get('baseId')?.toLowerCase() || null;
  const mode = searchParams.get('mode');
  const urlTab = searchParams.get('tab') || null;
  
  // ✅ 초기 상태는 항상 동일 (Hydration 오류 방지)
  const [state, setState] = useState<WorksheetState>(createInitialState);
  
  // ✅ 클라이언트에서만 localStorage에서 tab/riskData 복원 (마운트 후)
  const [isHydrated, setIsHydrated] = useState(false);
  
  // 상태 플래그
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState('');
  
  // Refs
  const suppressAutoSaveRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveHashRef = useRef<string>('');
  
  // ✅ state를 ref로 유지하여 saveToLocalStorage에서 항상 최신 값 사용
  const stateRef = useRef(state);
  
  // 방법 1: useLayoutEffect로 동기적 업데이트 (렌더 직후)
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // 방법 2: setState 래퍼 함수 - stateRef를 동기적으로 먼저 업데이트
  const setStateSynced = useCallback((updater: React.SetStateAction<WorksheetState>) => {
    if (typeof updater === 'function') {
      const newState = updater(stateRef.current);
      stateRef.current = newState;
      setState(newState);
    } else {
      stateRef.current = updater;
      setState(updater);
    }
  }, []);
  
  // ✅ Hydration 후 localStorage에서 tab/riskData 복원
  useEffect(() => {
    setIsHydrated(true);
    
    const urlParams = new URLSearchParams(window.location.search);
    const fmeaId = urlParams.get('id')?.toLowerCase();
    if (!fmeaId) return;
    
    const urlTabParam = urlParams.get('tab');
    
    let savedTab = '';
    let savedRiskData: { [key: string]: number | string } = {};
    
    // 1. URL 탭 우선 (가장 신뢰성 높음)
    if (urlTabParam) {
      savedTab = urlTabParam;
    } else {
      // 2. localStorage 탭 (백업)
      try {
        const tabStr = localStorage.getItem(`${config.localStoragePrefix}_tab_${fmeaId}`);
        if (tabStr) {
          savedTab = tabStr;
        }
      } catch { /* ignore */ }
    }
    
    try {
      const riskDataStr = localStorage.getItem(`${config.localStoragePrefix}_riskData_${fmeaId}`);
      if (riskDataStr) {
        const parsed = JSON.parse(riskDataStr);
        // O/D/S 키는 숫자만 허용 (1-10)
        const cleaned: { [key: string]: number | string } = {};
        Object.entries(parsed).forEach(([key, value]) => {
          if (key.endsWith('-O') || key.endsWith('-D') || key.endsWith('-S')) {
            if (typeof value === 'number' && value >= 1 && value <= 10) {
              cleaned[key] = value;
            } else {
            }
          } else {
            cleaned[key] = value as number | string;
          }
        });
        savedRiskData = cleaned;
        localStorage.setItem(`${config.localStoragePrefix}_riskData_${fmeaId}`, JSON.stringify(cleaned));
      }
    } catch { /* ignore */ }
    
    
    if (savedTab || Object.keys(savedRiskData).length > 0) {
      setState(prev => ({
        ...prev,
        ...(savedTab && { tab: savedTab }),
        ...(Object.keys(savedRiskData).length > 0 && { riskData: savedRiskData }),
      }));
    }
  }, [config.localStoragePrefix]);
  
  return {
    // 상태
    state,
    setState,
    setStateSynced,
    stateRef,
    
    // 플래그
    dirty,
    setDirty,
    isSaving,
    setIsSaving,
    lastSaved,
    setLastSaved,
    isHydrated,
    
    // URL 파라미터
    selectedFmeaId,
    baseId,
    mode,
    urlTab,
    
    // Refs
    suppressAutoSaveRef,
    saveTimeoutRef,
    autoSaveTimeoutRef,
    lastAutoSaveHashRef,
  };
}
