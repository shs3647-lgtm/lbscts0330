// @ts-nocheck
/**
 * @file useWorksheetState.ts
 * @description FMEA 워크시트 상태 관리 Hook (원자성 DB 스키마 적용)
 * @version 2.1.0 - AI 학습 데이터 자동 저장 추가
 */

'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  WorksheetState, 
  FMEAProject, 
  Process, 
  WorkElement,
  FlatRow,
  createInitialState, 
  uid 
} from '../constants';
import { saveToAIHistory } from '@/lib/ai-recommendation';
import {
  FMEAWorksheetDB,
  FlattenedRow,
  flattenDB,
  createEmptyDB,
} from '../schema';
import {
  migrateToAtomicDB,
  convertToLegacyFormat,
} from '../migration';
import {
  loadWorksheetDB,
  saveWorksheetDB,
} from '../db-storage';
import { loadWorksheetDBAtomic } from '../db-storage';

interface UseWorksheetStateReturn {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced: (updater: React.SetStateAction<WorksheetState>) => void;  // ✅ stateRef 동기 업데이트 버전
  dirty: boolean;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  lastSaved: string;
  fmeaList: FMEAProject[];
  currentFmea: FMEAProject | null;
  selectedFmeaId: string | null;
  handleFmeaChange: (fmeaId: string) => void;
  rows: FlatRow[];
  l1Spans: number[];
  l1TypeSpans: number[];
  l1FuncSpans: number[];
  l2Spans: number[];
  saveToLocalStorage: () => void;
  saveToLocalStorageOnly: () => void;  // DB 저장 없이 로컬만 저장
  handleInputKeyDown: (e: React.KeyboardEvent) => void;
  handleInputBlur: () => void;
  handleSelect: (type: 'L1' | 'L2' | 'L3', id: string | null) => void;
  addL2: () => void;
  addL3: (l2Id: string) => void;
  deleteL2: (l2Id: string) => void;
  deleteL3: (l2Id: string, l3Id: string) => void;
  handleProcessSelect: (selectedProcesses: Array<{ processNo: string; processName: string }>) => void;
  // 원자성 DB 접근
  atomicDB: FMEAWorksheetDB | null;
  flattenedRows: FlattenedRow[];
  saveAtomicDB: (force?: boolean) => void;
}

export function useWorksheetState(): UseWorksheetStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  // ✅ FMEA ID는 항상 대문자로 정규화 (DB, localStorage 일관성 보장)
  const selectedFmeaId = searchParams.get('id')?.toUpperCase() || null;
  const baseId = searchParams.get('baseId')?.toUpperCase() || null;  // ✅ 상속 원본 FMEA ID
  const mode = searchParams.get('mode');  // ✅ 상속 모드 ('inherit')
  // ✅ 2026-01-12: URL에서 탭 파라미터 읽기 (새로고침 시 탭 유지)
  const urlTab = searchParams.get('tab') || null;
  
  // ✅ 초기 상태는 항상 동일 (Hydration 오류 방지)
  const [state, setState] = useState<WorksheetState>(createInitialState);
  
  // ✅ 클라이언트에서만 localStorage에서 tab/riskData 복원 (마운트 후)
  const [isHydrated, setIsHydrated] = useState(false);
  // ✅ 복구/초기 로드 중 자동저장 방지 (빈 데이터로 덮어쓰기 방지)
  const suppressAutoSaveRef = useRef<boolean>(false);
  useEffect(() => {
    setIsHydrated(true);
    
    // URL에서 FMEA ID 가져오기 (대문자 정규화)
    const urlParams = new URLSearchParams(window.location.search);
    const fmeaId = urlParams.get('id')?.toUpperCase();
    if (!fmeaId) return;
    
    // ✅ 2026-01-12: URL에서 탭 파라미터 우선 사용 (새로고침 시 탭 유지 - 근본 해결)
    const urlTabParam = urlParams.get('tab');
    
    // URL 탭 > localStorage 탭 순으로 우선순위
    let savedTab = '';
    let savedRiskData: { [key: string]: number | string } = {};
    
    // 1. URL 탭 우선 (가장 신뢰성 높음)
    if (urlTabParam) {
      savedTab = urlTabParam;
      console.log('[탭 복원] URL에서 탭 읽음:', urlTabParam);
    } else {
      // 2. localStorage 탭 (백업)
      try {
        const tabStr = localStorage.getItem(`pfmea_tab_${fmeaId}`);
        if (tabStr) {
          savedTab = tabStr;
          console.log('[탭 복원] localStorage에서 탭 읽음:', tabStr);
        }
      } catch (e) { /* ignore */ }
    }
    
    try {
      // ★★★ 2026-01-19: 정리 코드 제거 - riskData 손실 방지 ★★★
      // 기존 cleanup v3 코드가 riskData를 삭제하여 데이터 손실 발생
      // localStorage에서 직접 로드하고, DB 로드 결과와 병합
      
      const riskDataStr = localStorage.getItem(`pfmea_riskData_${fmeaId}`);
      if (riskDataStr) {
        const parsed = JSON.parse(riskDataStr);
        // ★★★ 발생도/검출도(O/D)에 문자열이 저장된 경우 완전히 제거 ★★★
        const cleaned: { [key: string]: number | string } = {};
        Object.entries(parsed).forEach(([key, value]) => {
          // O/D/S 키는 숫자만 허용 (1-10)
          if (key.endsWith('-O') || key.endsWith('-D') || key.endsWith('-S')) {
            if (typeof value === 'number' && value >= 1 && value <= 10) {
              cleaned[key] = value;
            } else {
              console.warn(`[riskData 정리] 잘못된 값 삭제: ${key} = "${value}"`);
            }
          } else {
            // 다른 키는 그대로 유지
            cleaned[key] = value as number | string;
          }
        });
        savedRiskData = cleaned;
        // ★ 정리된 데이터로 localStorage 덮어쓰기
        localStorage.setItem(`pfmea_riskData_${fmeaId}`, JSON.stringify(cleaned));
      }
    } catch (e) { /* ignore */ }
    
    console.log('[Hydration 후] 별도 키에서 tab/riskData 복원:', {
      tab: savedTab,
      riskDataCount: Object.keys(savedRiskData).length,
    });
    
    // 저장된 값이 있으면 state 업데이트
    if (savedTab || Object.keys(savedRiskData).length > 0) {
      setState(prev => ({
        ...prev,
        ...(savedTab && { tab: savedTab }),
        ...(Object.keys(savedRiskData).length > 0 && { riskData: savedRiskData }),
      }));
    }
  }, []);
  const [atomicDB, setAtomicDB] = useState<FMEAWorksheetDB | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState('');
  const [fmeaList, setFmeaList] = useState<FMEAProject[]>([]);
  const [currentFmea, setCurrentFmea] = useState<FMEAProject | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveHashRef = useRef<string>('');

  // ✅ state를 ref로 유지하여 saveToLocalStorage에서 항상 최신 값 사용
  // ⚠️ 중요: useLayoutEffect를 사용하여 렌더 직후 동기적으로 업데이트
  // useEffect는 비동기라서 setState 직후 saveToLocalStorage 호출 시 이전 값이 저장되는 문제 발생
  const stateRef = useRef(state);
  
  // 방법 1: useLayoutEffect로 동기적 업데이트 (렌더 직후)
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // 방법 2: setState 래퍼 함수 - stateRef를 동기적으로 먼저 업데이트
  // ⚠️ 중요: React의 setState 콜백은 비동기이므로, stateRef 업데이트를 setState 호출 전에 수행
  const setStateSynced = useCallback((updater: React.SetStateAction<WorksheetState>) => {
    if (typeof updater === 'function') {
      // ✅ stateRef.current를 기준으로 새 상태 계산 (동기적)
      const newState = updater(stateRef.current);
      stateRef.current = newState; // ✅ 동기적으로 ref 먼저 업데이트
      setState(newState); // 그 후 React state 업데이트
    } else {
      stateRef.current = updater; // 동기적으로 ref 업데이트
      setState(updater);
    }
  }, []);

  // ✅ 확정 플래그 불일치 복구 (이전 저장 버그로 플래그만 유실된 케이스 방어)
  const normalizeConfirmedFlags = useCallback((flags: {
    structureConfirmed: boolean;
    l1Confirmed: boolean;
    l2Confirmed: boolean;
    l3Confirmed: boolean;
    failureL1Confirmed: boolean;
    failureL2Confirmed: boolean;
    failureL3Confirmed: boolean;
    failureLinkConfirmed: boolean;
  }) => {
    const out = { ...flags };
    // 하위 단계가 확정이면 상위 단계도 확정이었어야 함 (플래그 유실 복원)
    if (out.failureL1Confirmed && !out.l1Confirmed) out.l1Confirmed = true;
    if (out.failureL2Confirmed && !out.l2Confirmed) out.l2Confirmed = true;
    if (out.failureL3Confirmed && !out.l3Confirmed) out.l3Confirmed = true;

    // 단계 체인
    if (out.l3Confirmed && !out.l2Confirmed) out.l2Confirmed = true;
    if (out.l2Confirmed && !out.l1Confirmed) out.l1Confirmed = true;
    if (out.l1Confirmed && !out.structureConfirmed) out.structureConfirmed = true;

    return out;
  }, []);

  // 원자성 DB 저장
  const saveAtomicDB = useCallback(async (force?: boolean) => {
    // ✅ FMEA ID 결정: atomicDB.fmeaId > selectedFmeaId > currentFmea?.id
    const targetFmeaId = atomicDB?.fmeaId || selectedFmeaId || currentFmea?.id;
    
    if (!targetFmeaId) {
      console.warn('[원자성 DB 저장] FMEA ID가 없어 저장 불가');
      return;
    }
    
    if (!force && suppressAutoSaveRef.current) {
      console.warn('[원자성 DB 저장] suppressAutoSave=true 이므로 저장 스킵');
      return;
    }
    if (force) {
      console.log('[원자성 DB 저장] 강제 저장 모드 (suppressAutoSave 무시)');
    }
    
    console.log('[원자성 DB 저장] 시작:', { targetFmeaId, hasAtomicDB: !!atomicDB });
    
    setIsSaving(true);
    try {
      // ✅ 항상 최신 state 사용 (클로저 문제 해결)
      const currentState = stateRef.current;
      
      // 현재 state를 원자성 DB로 마이그레이션
      const normalizedFailureLinks = normalizeFailureLinks((currentState as any).failureLinks || [], currentState);
      const legacyData = {
        fmeaId: targetFmeaId,  // ✅ atomicDB 없어도 fmeaId 사용
        l1: currentState.l1, // ✅ stateRef.current 사용
        l2: currentState.l2, // ✅ stateRef.current 사용
        failureLinks: normalizedFailureLinks,
        structureConfirmed: (currentState as any).structureConfirmed || false,
        l1Confirmed: (currentState as any).l1Confirmed || false,
        l2Confirmed: (currentState as any).l2Confirmed || false,
        l3Confirmed: (currentState as any).l3Confirmed || false,
        failureL1Confirmed: (currentState as any).failureL1Confirmed || false,
        failureL2Confirmed: (currentState as any).failureL2Confirmed || false,
        failureL3Confirmed: (currentState as any).failureL3Confirmed || false,
        failureLinkConfirmed: (currentState as any).failureLinkConfirmed || false,  // ✅ 고장연결 확정 추가
      };
      
      // ★★★ 고장원인 데이터 디버그 로그 ★★★
      const totalFailureCauses = legacyData.l2?.reduce((acc: number, p: any) => acc + (p.failureCauses?.length || 0), 0) || 0;
      console.log('[원자성 DB 저장] 📊 고장원인 현황:', {
        l2Count: legacyData.l2?.length || 0,
        totalFailureCauses,
        procsWithCauses: legacyData.l2?.filter((p: any) => p.failureCauses?.length > 0).map((p: any) => ({
          name: p.name?.substring(0, 20),
          causesCount: p.failureCauses?.length
        })) || []
      });
      console.log('[원자성 DB 저장] 확정상태:', {
        structureConfirmed: legacyData.structureConfirmed,
        l1Confirmed: legacyData.l1Confirmed,
        l2Confirmed: legacyData.l2Confirmed,
        l3Confirmed: legacyData.l3Confirmed,
        failureL1Confirmed: legacyData.failureL1Confirmed,
        failureL2Confirmed: legacyData.failureL2Confirmed,
        failureL3Confirmed: legacyData.failureL3Confirmed,
        failureLinkConfirmed: legacyData.failureLinkConfirmed,
      });
      console.log('[원자성 DB 저장] l1.name:', legacyData.l1.name);
      
      const newAtomicDB = migrateToAtomicDB(legacyData);
      console.log('[원자성 DB 저장] 확정(변환후):', newAtomicDB.confirmed);
      console.log('[원자성 DB 저장] l1Structure.name:', newAtomicDB.l1Structure?.name);
      
      // ============ 고장분석 통합 데이터 자동 생성 ============
      // 고장연결 확정 시 고장분석 통합 데이터 생성 (역전개 기능분석 + 역전개 구조분석 포함)
      if (newAtomicDB.failureLinks.length > 0 && newAtomicDB.confirmed.failureLink) {
        const { buildFailureAnalyses } = await import('../utils/failure-analysis-builder');
        newAtomicDB.failureAnalyses = buildFailureAnalyses(newAtomicDB);
        console.log('[원자성 DB 저장] 고장분석 통합 데이터 생성:', newAtomicDB.failureAnalyses.length, '개');
      } else {
        newAtomicDB.failureAnalyses = [];
      }
      
      // ★★★ 레거시 데이터를 Single Source of Truth로 함께 저장 ★★★
      // 원자성 DB 변환 과정에서의 데이터 손실 방지를 위해 레거시 데이터도 DB에 저장
      // ✅ await 추가하여 DB 저장 완료까지 대기
      await saveWorksheetDB(newAtomicDB, legacyData);
      setAtomicDB(newAtomicDB);
      
      console.log('[원자성 DB 저장] 완료:', {
        fmeaId: newAtomicDB.fmeaId,
        l1Name: newAtomicDB.l1Structure?.name, // ✅ l1.name 로그 추가
        l2Structures: newAtomicDB.l2Structures.length,
        l3Structures: newAtomicDB.l3Structures.length,
        failureModes: newAtomicDB.failureModes.length,
        failureLinks: newAtomicDB.failureLinks.length,
      });
      console.log('[원자성 DB 저장] ✅ failureLinks 상세:', {
        입력: legacyData.failureLinks?.length || 0,
        변환: newAtomicDB.failureLinks.length,
        샘플: newAtomicDB.failureLinks.slice(0, 3).map(l => ({
          fmId: l.fmId,
          feId: l.feId,
          fcId: l.fcId,
          fmText: l.cache?.fmText?.substring(0, 20)
        }))
      });
      
      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) {
      console.error('[원자성 DB 저장] 오류:', e);
    } finally {
      setIsSaving(false);
    }
  }, [atomicDB, selectedFmeaId, currentFmea]); // ✅ FMEA ID 폴백 지원

  // ✅ 구조~고장원인까지 변경 시 원자성 DB 자동 저장 (관리계획서 연동용 최신성 보장)
  useEffect(() => {
    if (suppressAutoSaveRef.current) return;
    if (!selectedFmeaId && !currentFmea?.id) return;

    const snapshot = {
      l1: stateRef.current.l1,
      l2: stateRef.current.l2,
      failureLinks: (stateRef.current as any).failureLinks || [],
      confirmed: {
        structureConfirmed: (stateRef.current as any).structureConfirmed || false,
        l1Confirmed: (stateRef.current as any).l1Confirmed || false,
        l2Confirmed: (stateRef.current as any).l2Confirmed || false,
        l3Confirmed: (stateRef.current as any).l3Confirmed || false,
        failureL1Confirmed: (stateRef.current as any).failureL1Confirmed || false,
        failureL2Confirmed: (stateRef.current as any).failureL2Confirmed || false,
        failureL3Confirmed: (stateRef.current as any).failureL3Confirmed || false,
        failureLinkConfirmed: (stateRef.current as any).failureLinkConfirmed || false,
      },
      riskData: stateRef.current.riskData || {},
    };

    const hash = JSON.stringify(snapshot);
    if (lastAutoSaveHashRef.current && hash === lastAutoSaveHashRef.current) return;
    lastAutoSaveHashRef.current = hash;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveAtomicDB().catch(e => console.error('[자동저장] 원자성 DB 저장 오류:', e));
    }, 800);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [state, selectedFmeaId, currentFmea?.id, saveAtomicDB]);

  /**
   * ✅ 성능 최적화용 저장 함수 (localStorage ONLY)
   * - 고장연결처럼 잦은 클릭이 발생하는 화면에서 매번 PostgreSQL 저장하면 반응속도가 급격히 느려짐
   * - 임시 편집 중에는 localStorage에만 저장하고, "전체확정"에서만 DB 저장하도록 분리
   */
  const normalizeFailureLinks = useCallback((links: any[], stateSnapshot: WorksheetState) => {
    if (!links || links.length === 0) return links || [];

    const normalizeKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

    const fmTextToId = new Map<string, string>();
    const fmTextProcessToId = new Map<string, string>();
    const fmIdToText = new Map<string, string>();
    const fmIdToProcess = new Map<string, string>();

    const feTextToId = new Map<string, string>();
    const feScopeTextToId = new Map<string, string>();
    const feIdToText = new Map<string, string>();

    const fcTextToId = new Map<string, string>();
    const fcTextProcessToId = new Map<string, string>();
    const fcIdToText = new Map<string, string>();

    (stateSnapshot.l2 || []).forEach((proc: any) => {
      const procName = String(proc?.name || '').trim();
      const procKey = normalizeKey(procName);

      (proc.failureModes || []).forEach((fm: any) => {
        const text = String(fm.mode || fm.name || '').trim();
        if (fm.id) {
          fmIdToText.set(fm.id, text);
          fmIdToProcess.set(fm.id, procName);
        }
        if (text && fm.id) {
          const textKey = normalizeKey(text);
          if (!fmTextToId.has(textKey)) {
            fmTextToId.set(textKey, fm.id);
          }
          if (procKey) {
            const scopedKey = `${procKey}||${textKey}`;
            if (!fmTextProcessToId.has(scopedKey)) {
              fmTextProcessToId.set(scopedKey, fm.id);
            }
          }
        }
      });

      (proc.failureCauses || []).forEach((fc: any) => {
        const text = String(fc.cause || fc.name || '').trim();
        if (fc.id) {
          fcIdToText.set(fc.id, text);
        }
        if (text && fc.id) {
          const textKey = normalizeKey(text);
          if (!fcTextToId.has(textKey)) {
            fcTextToId.set(textKey, fc.id);
          }
          if (procKey) {
            const scopedKey = `${procKey}||${textKey}`;
            if (!fcTextProcessToId.has(scopedKey)) {
              fcTextProcessToId.set(scopedKey, fc.id);
            }
          }
        }
      });
    });

    ((stateSnapshot.l1 as any)?.failureScopes || []).forEach((fe: any) => {
      const text = String(fe.effect || fe.name || '').trim();
      const scope = String(fe.scope || fe.category || '').trim();
      if (fe.id) {
        feIdToText.set(fe.id, text);
      }
      if (text && fe.id) {
        const textKey = normalizeKey(text);
        if (!feTextToId.has(textKey)) {
          feTextToId.set(textKey, fe.id);
        }
        if (scope) {
          const scopedKey = `${normalizeKey(scope)}||${textKey}`;
          if (!feScopeTextToId.has(scopedKey)) {
            feScopeTextToId.set(scopedKey, fe.id);
          }
        }
      }
    });

    return links.map((link: any) => {
      // ✅ 원본 텍스트 먼저 추출 (절대 손실 방지)
      const originalFmText = String(link.fmText || '').trim();
      const originalFeText = String(link.feText || '').trim();
      const originalFcText = String(link.fcText || '').trim();
      const originalFmProcess = String(link.fmProcess || '').trim();
      const originalFeScope = String(link.feScope || '').trim();
      const originalFcProcess = String(link.fcProcess || '').trim();
      
      const fmText = originalFmText || String(link.cache?.fmText || '').trim();
      const feText = originalFeText || String(link.cache?.feText || '').trim();
      const fcText = originalFcText || String(link.cache?.fcText || '').trim();
      const fmProcess = originalFmProcess;
      const feScope = originalFeScope || String(link.cache?.feCategory || '').trim();
      const fcProcess = originalFcProcess;

      const fmTextKey = normalizeKey(fmText);
      const feTextKey = normalizeKey(feText);
      const fcTextKey = normalizeKey(fcText);
      const fmScopedKey = fmProcess ? `${normalizeKey(fmProcess)}||${fmTextKey}` : '';
      const feScopedKey = feScope ? `${normalizeKey(feScope)}||${feTextKey}` : '';
      const fcScopedKey = fcProcess ? `${normalizeKey(fcProcess)}||${fcTextKey}` : '';

      const hasFmId = link.fmId && fmIdToText.has(link.fmId);
      const hasFeId = link.feId && feIdToText.has(link.feId);
      const hasFcId = link.fcId && fcIdToText.has(link.fcId);

      const fmId =
        (hasFmId ? link.fmId : '') ||
        (fmScopedKey ? fmTextProcessToId.get(fmScopedKey) : '') ||
        (fmTextKey ? fmTextToId.get(fmTextKey) : '') ||
        link.fmId ||
        '';
      const feId =
        (hasFeId ? link.feId : '') ||
        (feScopedKey ? feScopeTextToId.get(feScopedKey) : '') ||
        (feTextKey ? feTextToId.get(feTextKey) : '') ||
        link.feId ||
        '';
      const fcId =
        (hasFcId ? link.fcId : '') ||
        (fcScopedKey ? fcTextProcessToId.get(fcScopedKey) : '') ||
        (fcTextKey ? fcTextToId.get(fcTextKey) : '') ||
        link.fcId ||
        '';

      // ✅ 핵심 수정: 원본 텍스트를 최우선으로 유지, 맵에서 복원, 그래도 없으면 원본 반환
      return {
        ...link,
        fmId,
        fmText: fmText || fmIdToText.get(fmId) || originalFmText || link.fmText || '',
        fmProcess: fmProcess || fmIdToProcess.get(fmId) || originalFmProcess || link.fmProcess || '',
        feId,
        feText: feText || feIdToText.get(feId) || originalFeText || link.feText || '',
        feScope: feScope || originalFeScope || link.feScope || '',
        fcId,
        fcText: fcText || fcIdToText.get(fcId) || originalFcText || link.fcText || '',
        fcProcess: fcProcess || originalFcProcess || link.fcProcess || '',
      };
    });
  }, []);

  const saveToLocalStorageOnly = useCallback(() => {
    const targetId = selectedFmeaId || currentFmea?.id;
    if (!targetId) {
      console.warn('[저장(local-only)] FMEA ID가 없어 저장할 수 없습니다.');
      return;
    }
    if (suppressAutoSaveRef.current) {
      console.warn('[저장(local-only)] suppressAutoSave=true 이므로 저장 스킵');
      return;
    }

    const currentState = stateRef.current;
    setIsSaving(true);
    try {
      // l1.name preserve (기존 saveToLocalStorage와 동일 방어)
      let preservedL1Name: string | null = null;
      try {
        const existingRaw = localStorage.getItem(`pfmea_worksheet_${targetId}`);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw) as any;
          const existingName = existing?.l1?.name;
          if (typeof existingName === 'string' && existingName.trim() !== '') {
            preservedL1Name = existingName;
          }
        }
      } catch {
        // ignore
      }
      const l1ToSave =
        (!currentState?.l1?.name || String(currentState.l1.name).trim() === '') && preservedL1Name
          ? { ...currentState.l1, name: preservedL1Name }
          : currentState.l1;

      const normalizedFailureLinks = normalizeFailureLinks((currentState as any).failureLinks || [], currentState);
      const worksheetData = {
        fmeaId: targetId,
        l1: l1ToSave,
        l2: currentState.l2,
        tab: currentState.tab,
        structureConfirmed: (currentState as any).structureConfirmed || false,
        l1Confirmed: (currentState as any).l1Confirmed || false,
        l2Confirmed: (currentState as any).l2Confirmed || false,
        l3Confirmed: (currentState as any).l3Confirmed || false,
        failureL1Confirmed: (currentState as any).failureL1Confirmed || false,
        failureL2Confirmed: (currentState as any).failureL2Confirmed || false,
        failureL3Confirmed: (currentState as any).failureL3Confirmed || false,
        failureLinkConfirmed: (currentState as any).failureLinkConfirmed || false,
        failureLinks: normalizedFailureLinks,
        riskData: currentState.riskData || {},
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(`pfmea_worksheet_${targetId}`, JSON.stringify(worksheetData));
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
      setDirty(false);
      console.log('[저장(local-only)] ✅ localStorage 저장 완료:', { fmeaId: targetId, failureLinks: worksheetData.failureLinks.length });
    } catch (e) {
      console.error('[저장(local-only)] 오류:', e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedFmeaId, currentFmea?.id, normalizeFailureLinks]);

  // 기존 호환 저장 함수 (레거시 + 원자성 동시 저장) - ✅ stateRef 사용으로 항상 최신 상태 저장
  const saveToLocalStorage = useCallback(() => {
    const targetId = selectedFmeaId || currentFmea?.id;
    if (!targetId) {
      console.warn('[저장] FMEA ID가 없어 저장할 수 없습니다.');
      return;
    }
    if (suppressAutoSaveRef.current) {
      console.warn('[저장] suppressAutoSave=true 이므로 저장 스킵');
      return;
    }
    
    // ✅ 항상 최신 state 사용 (클로저 문제 해결)
    const currentState = stateRef.current;
    
    setIsSaving(true);
    try {
      // 1. 레거시 형식으로 저장 (하위호환)
      const failureScopesCount = (currentState.l1 as any).failureScopes?.length || 0;
      console.log('[저장 시작] failureScopes:', failureScopesCount, '개');

      // ✅ 근본 방어: l1.name이 빈 값으로 덮어써지는 케이스 방지 (이전 stateRef/blur 타이밍 이슈 대비)
      let preservedL1Name: string | null = null;
      try {
        const existingRaw = localStorage.getItem(`pfmea_worksheet_${targetId}`);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw) as any;
          const existingName = existing?.l1?.name;
          if (typeof existingName === 'string' && existingName.trim() !== '') {
            preservedL1Name = existingName;
          }
        }
      } catch {
        // ignore
      }
      const l1ToSave =
        (!currentState?.l1?.name || String(currentState.l1.name).trim() === '') && preservedL1Name
          ? { ...currentState.l1, name: preservedL1Name }
          : currentState.l1;

      const normalizedFailureLinks = normalizeFailureLinks((currentState as any).failureLinks || [], currentState);
      const worksheetData = {
        fmeaId: targetId,
        l1: l1ToSave,
        l2: currentState.l2,
        tab: currentState.tab,
        structureConfirmed: (currentState as any).structureConfirmed || false,
        l1Confirmed: (currentState as any).l1Confirmed || false,
        l2Confirmed: (currentState as any).l2Confirmed || false,
        l3Confirmed: (currentState as any).l3Confirmed || false,
        failureL1Confirmed: (currentState as any).failureL1Confirmed || false,
        failureL2Confirmed: (currentState as any).failureL2Confirmed || false,
        failureL3Confirmed: (currentState as any).failureL3Confirmed || false,
        failureLinkConfirmed: (currentState as any).failureLinkConfirmed || false,  // ✅ 고장연결 확정 상태
        failureLinks: normalizedFailureLinks,
        riskData: currentState.riskData || {},  // ✅ 최신 riskData 저장
        savedAt: new Date().toISOString(),
      };
      
      console.log('[저장] 레거시 데이터 저장:', {
        l1Name: worksheetData.l1.name,
        failureScopesCount: (worksheetData.l1 as any).failureScopes?.length || 0,
        riskDataCount: Object.keys(worksheetData.riskData || {}).length,
        riskDataKeys: Object.keys(worksheetData.riskData || {}),
      });
      localStorage.setItem(`pfmea_worksheet_${targetId}`, JSON.stringify(worksheetData));
      
      // 2. 원자성 DB로도 저장 (async)
      const newAtomicDB = migrateToAtomicDB(worksheetData);
      console.log('[저장] 원자성 DB 변환 후:', {
        failureEffects: newAtomicDB.failureEffects.length,
        l1Functions: newAtomicDB.l1Functions.length,
      });
      
      // ★★★ 레거시 데이터를 Single Source of Truth로 함께 저장 ★★★
      // 원자성 DB 변환 과정에서의 데이터 손실 방지를 위해 레거시 데이터도 DB에 저장
      saveWorksheetDB(newAtomicDB, worksheetData).catch(e => console.error('[저장] DB 저장 오류:', e));
      setAtomicDB(newAtomicDB);
      
      // 로그
      const failureCausesCount = currentState.l2.flatMap((p: any) => p.failureCauses || []).length;
      console.log('[저장] 워크시트 데이터 저장 완료:', targetId, '탭:', currentState.tab);
      console.log('[저장] 고장영향(failureScopes):', failureScopesCount, '개');
      console.log('[저장] 고장원인(failureCauses):', failureCausesCount, '개');
      console.log('[저장] 원자성 DB:', {
        l2Structs: newAtomicDB.l2Structures.length,
        l3Structs: newAtomicDB.l3Structures.length,
        failureEffects: newAtomicDB.failureEffects.length,
        failureModes: newAtomicDB.failureModes.length,
        failureCauses: newAtomicDB.failureCauses.length,
        failureLinks: newAtomicDB.failureLinks.length,
      });
      
      // ✅ 저장 검증: failureCauses가 제대로 저장되었는지 확인
      const savedData = localStorage.getItem(`pfmea_worksheet_${targetId}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          const savedCausesCount = parsed.l2?.flatMap((p: any) => p.failureCauses || []).length || 0;
          if (savedCausesCount !== failureCausesCount) {
            console.error('[저장 검증 실패] failureCauses 개수 불일치:', {
              저장된개수: savedCausesCount,
              현재개수: failureCausesCount
            });
          } else {
            console.log('[저장 검증 성공] failureCauses 개수 일치:', failureCausesCount, '개');
          }
        } catch (e) {
          console.error('[저장 검증] 파싱 오류:', e);
        }
      }
      
      // ✅ AI 학습 데이터 저장 (고장관계 데이터 축적)
      try {
        const l2Data = currentState.l2 || [];
        l2Data.forEach((proc: any) => {
          const processName = proc.name || '';
          const failureModes = proc.failureModes || [];
          const failureCauses = proc.failureCauses || [];
          
          failureModes.forEach((fm: any) => {
            if (fm.name) {
              saveToAIHistory({
                processName,
                processType: processName.split(' ')[0], // 첫 단어를 공정 유형으로
                failureMode: fm.name,
                projectId: targetId,
              });
            }
          });
          
          failureCauses.forEach((fc: any) => {
            if (fc.name) {
              // 작업요소 찾기
              const we = (proc.l3 || []).find((w: any) => w.id === fc.workElementId);
              saveToAIHistory({
                processName,
                processType: processName.split(' ')[0],
                workElement: we?.name || '',
                m4Category: we?.m4 || '',
                failureCause: fc.name,
                occurrence: fc.occurrence,
                projectId: targetId,
              });
            }
          });
        });
        console.log('[AI] 학습 데이터 저장 완료');
      } catch (e) {
        console.warn('[AI] 학습 데이터 저장 오류 (무시):', e);
      }
      
      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) { 
      console.error('저장 오류:', e); 
    } finally { 
      setIsSaving(false); 
    }
  }, [selectedFmeaId, currentFmea?.id, normalizeFailureLinks]);  // ✅ state 제거, stateRef 사용

  // ★★★ 2026-01-12: DB 저장도 함께 트리거 (setDirty 호출 시 자동 저장) ★★★
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToLocalStorage();
      saveAtomicDB();  // ★ DB 저장 추가
      console.log('🔥 [triggerAutoSave] localStorage + DB 저장 완료');
    }, 500);
  }, [saveToLocalStorage, saveAtomicDB]);

  useEffect(() => {
    if (dirty) triggerAutoSave();
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [dirty, triggerAutoSave]);

  // 고장영향(failureScopes) 변경 시 즉시 저장 (새로고침 시 데이터 손실 방지)
  const failureScopesRef = useRef<any[]>([]);
  useEffect(() => {
    const currentScopes = (state.l1 as any)?.failureScopes || [];
    if (JSON.stringify(currentScopes) !== JSON.stringify(failureScopesRef.current)) {
      failureScopesRef.current = currentScopes;
      console.log('[자동저장] failureScopes 변경 감지:', currentScopes.length, '개');
      saveToLocalStorage();
    }
  }, [(state.l1 as any)?.failureScopes, saveToLocalStorage]);

  // ✅ 고장형태(failureModes) 변경 시 즉시 저장 (2L 고장분석 데이터 손실 방지)
  const failureModesRef = useRef<string>('');
  useEffect(() => {
    const allModes = state.l2.flatMap((p: any) => p.failureModes || []);
    const modesKey = JSON.stringify(allModes);
    
    if (failureModesRef.current && modesKey !== failureModesRef.current) {
      console.log('[자동저장] failureModes 변경 감지:', allModes.length, '개');
      saveToLocalStorage();
    }
    failureModesRef.current = modesKey;
  }, [state.l2, saveToLocalStorage]);

  // ✅ 고장원인(failureCauses) 변경 시 즉시 저장 (3L 고장분석 데이터 손실 방지)
  // ⚠️ 중요: failureCauses는 proc.failureCauses에 저장됨 (we.failureCauses가 아님!)
  const failureCausesRef = useRef<string>('');
  const failureCausesSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // proc.failureCauses를 확인 (we.failureCauses가 아님!)
    const allCauses = state.l2.flatMap((p: any) => p.failureCauses || []);
    const causesKey = JSON.stringify(allCauses);
    
    // 초기화 시에도 저장 (첫 로드 후)
    const isInitial = failureCausesRef.current === '';
    
    if (isInitial) {
      failureCausesRef.current = causesKey;
      console.log('[자동저장] failureCauses 초기화:', allCauses.length, '개');
      return;
    }
    
    if (causesKey !== failureCausesRef.current) {
      console.log('[자동저장] failureCauses 변경 감지:', allCauses.length, '개');
      
      // 기존 타이머 취소
      if (failureCausesSaveTimeoutRef.current) {
        clearTimeout(failureCausesSaveTimeoutRef.current);
      }
      
      // 디바운싱: 300ms 후 저장 (빠른 연속 변경 방지)
      failureCausesSaveTimeoutRef.current = setTimeout(() => {
        saveToLocalStorage();
        console.log('[자동저장] failureCauses 저장 완료');
        
        // 저장 후 검증
        requestAnimationFrame(() => {
          const targetId = selectedFmeaId || currentFmea?.id;
          if (targetId) {
            const savedKey = `pfmea_worksheet_${targetId}`;
            const saved = localStorage.getItem(savedKey);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                const savedCauses = parsed.l2?.flatMap((p: any) => p.failureCauses || []) || [];
                console.log('[자동저장] failureCauses 저장 검증:', {
                  저장된개수: savedCauses.length,
                  현재개수: allCauses.length,
                  일치: savedCauses.length === allCauses.length
                });
              } catch (e) {
                console.error('[자동저장] failureCauses 저장 검증 오류:', e);
              }
            }
          }
        });
      }, 300);
    }
    
    failureCausesRef.current = causesKey;
    
    return () => {
      if (failureCausesSaveTimeoutRef.current) {
        clearTimeout(failureCausesSaveTimeoutRef.current);
      }
    };
  }, [state.l2, saveToLocalStorage, selectedFmeaId, currentFmea?.id]);

  // ✅ 고장연결 데이터 정규화 (ID 누락 방지 - 근본 해결)
  const failureLinksNormalizeRef = useRef<string>('');
  useEffect(() => {
    const links = (state as any).failureLinks || [];
    if (links.length === 0) return;

    const fmTextToId = new Map<string, string>();
    const fmIdToText = new Map<string, string>();
    const fmIdToProcess = new Map<string, string>();
    const feTextToId = new Map<string, string>();
    const feIdToText = new Map<string, string>();
    const fcTextToId = new Map<string, string>();
    const fcIdToText = new Map<string, string>();

    (state.l2 || []).forEach((proc: any) => {
      (proc.failureModes || []).forEach((fm: any) => {
        const text = fm.mode || fm.name || '';
        if (fm.id) {
          fmIdToText.set(fm.id, text);
          fmIdToProcess.set(fm.id, proc.name || '');
        }
        if (text && fm.id && !fmTextToId.has(text)) {
          fmTextToId.set(text, fm.id);
        }
      });
      (proc.failureCauses || []).forEach((fc: any) => {
        const text = fc.cause || fc.name || '';
        if (fc.id) {
          fcIdToText.set(fc.id, text);
        }
        if (text && fc.id && !fcTextToId.has(text)) {
          fcTextToId.set(text, fc.id);
        }
      });
    });

    ((state.l1 as any)?.failureScopes || []).forEach((fe: any) => {
      const text = fe.effect || fe.name || '';
      if (fe.id) {
        feIdToText.set(fe.id, text);
      }
      if (text && fe.id && !feTextToId.has(text)) {
        feTextToId.set(text, fe.id);
      }
    });

    const normalized = links.map((link: any) => {
      // ✅ 핵심: 원본 텍스트를 먼저 추출하여 절대 손실 방지
      const originalFmText = String(link.fmText || '').trim();
      const originalFeText = String(link.feText || '').trim();
      const originalFcText = String(link.fcText || '').trim();
      const originalFmProcess = String(link.fmProcess || '').trim();
      
      const fmText = originalFmText || link.cache?.fmText || '';
      const feText = originalFeText || link.cache?.feText || '';
      const fcText = originalFcText || link.cache?.fcText || '';

      const fmId = link.fmId || fmTextToId.get(fmText) || '';
      const feId = link.feId || feTextToId.get(feText) || '';
      const fcId = link.fcId || fcTextToId.get(fcText) || '';

      // ✅ ID로 조회한 텍스트 (빈 문자열이면 원본 유지)
      const lookedUpFmText = fmIdToText.get(fmId) || '';
      const lookedUpFeText = feIdToText.get(feId) || '';
      const lookedUpFcText = fcIdToText.get(fcId) || '';
      const lookedUpFmProcess = fmIdToProcess.get(fmId) || '';

      return {
        ...link,
        fmId,
        // ✅ 원본 텍스트 우선 유지 → lookup → 빈 문자열 순서
        fmText: originalFmText || fmText || lookedUpFmText || '',
        fmProcess: originalFmProcess || link.fmProcess || lookedUpFmProcess || '',
        feId,
        feText: originalFeText || feText || lookedUpFeText || '',
        fcId,
        fcText: originalFcText || fcText || lookedUpFcText || '',
      };
    });

    const currentKey = JSON.stringify(links);
    const normalizedKey = JSON.stringify(normalized);
    if (normalizedKey !== currentKey && normalizedKey !== failureLinksNormalizeRef.current) {
      failureLinksNormalizeRef.current = normalizedKey;
      setStateSynced(prev => ({ ...prev, failureLinks: normalized } as any));
      setDirty(true);
      setTimeout(() => saveToLocalStorage(), 100);
    } else {
      failureLinksNormalizeRef.current = normalizedKey;
    }
  }, [state.l1, state.l2, (state as any).failureLinks, setStateSynced, setDirty, saveToLocalStorage]);

  // ✅ 확정 상태 변경 시 즉시 저장 (분석 확정 상태 손실 방지)
  const confirmedStateRef = useRef<string>('');
  useEffect(() => {
    const confirmedState = JSON.stringify({
      structureConfirmed: (state as any).structureConfirmed || false,
      l1Confirmed: (state as any).l1Confirmed || false,
      l2Confirmed: (state as any).l2Confirmed || false,
      l3Confirmed: (state as any).l3Confirmed || false,
      failureL1Confirmed: (state as any).failureL1Confirmed || false,
      failureL2Confirmed: (state as any).failureL2Confirmed || false,
      failureL3Confirmed: (state as any).failureL3Confirmed || false,
      failureLinkConfirmed: (state as any).failureLinkConfirmed || false,
    });
    
    // 초기화 시에는 저장하지 않음
    if (confirmedStateRef.current === '') {
      confirmedStateRef.current = confirmedState;
      return;
    }
    
    // 확정 상태가 변경되었을 때만 저장
    if (confirmedState !== confirmedStateRef.current) {
      console.log('[자동저장] 확정 상태 변경 감지:', JSON.parse(confirmedState));
      confirmedStateRef.current = confirmedState;
      
      // 즉시 저장 (100ms 딜레이로 state 업데이트 대기)
      setTimeout(() => {
        saveToLocalStorage();
        console.log('[자동저장] 확정 상태 저장 완료');
      }, 100);
    }
  }, [
    (state as any).structureConfirmed,
    (state as any).l1Confirmed,
    (state as any).l2Confirmed,
    (state as any).l3Confirmed,
    (state as any).failureL1Confirmed,
    (state as any).failureL2Confirmed,
    (state as any).failureL3Confirmed,
    (state as any).failureLinkConfirmed,
    saveToLocalStorage
  ]);

  // ========== 트리뷰 기준 자동 복구 로직 제거 ==========
  // 과거 “자동 복구(방어) 코드”가 failureCauses를 재구성/저장하는 과정에서
  // processCharId(FK)를 누락/오염시켜 3L 고장원인이 새로고침 후 사라지는 현상을 유발할 수 있음.
  // on-premise 릴리즈 안정성을 위해 자동 복구는 사용하지 않고, 저장된 DB 레거시를 그대로 신뢰한다.

  // ✅ riskData 변경 시 별도 키로 즉시 저장 (확실한 저장)
  const riskDataRef = useRef<any>({});
  useEffect(() => {
    const targetId = selectedFmeaId || currentFmea?.id;
    if (!targetId) return;
    
    const currentRiskData = state.riskData || {};
    if (JSON.stringify(currentRiskData) !== JSON.stringify(riskDataRef.current)) {
      riskDataRef.current = currentRiskData;
      console.log('[자동저장] riskData 변경 감지:', Object.keys(currentRiskData).length, '개');
      
      // ✅ 별도 키로 직접 저장 (확실한 저장)
      localStorage.setItem(`pfmea_riskData_${targetId}`, JSON.stringify(currentRiskData));
      console.log('[저장완료] riskData 저장:', `pfmea_riskData_${targetId}`);
      
      // 기존 워크시트 데이터에도 업데이트
      saveToLocalStorage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.riskData]);

  // ✅ tab 변경 시 URL 업데이트 + localStorage 저장 (새로고침 시 탭 유지)
  const tabRef = useRef<string>('structure');
  useEffect(() => {
    const targetId = selectedFmeaId || currentFmea?.id;
    if (!targetId) return;
    
    if (state.tab !== tabRef.current) {
      tabRef.current = state.tab;
      console.log('[자동저장] tab 변경 감지:', state.tab);
      
      // ✅ 2026-01-12: URL 파라미터 업데이트 (새로고침 시 탭 유지) - 근본 해결
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', state.tab);
        window.history.replaceState({}, '', url.toString());
        console.log('[URL 업데이트] tab:', state.tab);
      }
      
      // ✅ 별도 키로 직접 저장 (백업용)
      localStorage.setItem(`pfmea_tab_${targetId}`, state.tab);
      
      // 기존 워크시트 데이터에도 업데이트
      saveToLocalStorage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tab]);

  // FMEA 목록 로드 및 자동 선택 (DB API 우선)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const loadFmeaList = async () => {
      try {
        // 1. DB API에서 FMEA 목록 조회
        const response = await fetch('/api/fmea/projects');
        const result = await response.json();
        
        if (result.success && result.projects?.length > 0) {
          const projects: FMEAProject[] = result.projects;
          setFmeaList(projects);
          console.log('✅ [워크시트] DB에서 FMEA 목록 로드:', projects.length, '건');
          
          if (selectedFmeaId) {
            // 대소문자 무시 비교 (ID 일관성 문제 방지)
            const found = projects.find(p => p.id?.toLowerCase() === selectedFmeaId.toLowerCase());
            if (found) {
              setCurrentFmea(found);
            } else {
              // 요청한 ID가 없으면 첫번째로 리다이렉트
              console.warn('⚠️ [워크시트] 요청한 FMEA ID 없음, 첫번째로 이동:', projects[0].id);
              setCurrentFmea(projects[0]);
              router.push(`/pfmea/worksheet?id=${projects[0].id}`);
            }
          } else {
            // ID 미지정 시 첫번째 FMEA 자동 선택
            console.log('📍 [워크시트] ID 미지정 - 첫번째 FMEA 자동 선택:', projects[0].id);
            setCurrentFmea(projects[0]);
            router.push(`/pfmea/worksheet?id=${projects[0].id}`);
          }
          return;
        }
      } catch (error) {
        console.warn('⚠️ [워크시트] DB API 호출 실패:', error);
      }
      
      // 2. localStorage 폴백
      const stored = localStorage.getItem('pfmea-projects');
      if (stored) {
        try {
          const projects: FMEAProject[] = JSON.parse(stored);
          setFmeaList(projects);
          
          if (selectedFmeaId) {
            const found = projects.find(p => p.id?.toLowerCase() === selectedFmeaId.toLowerCase());
            if (found) setCurrentFmea(found);
          } else if (projects.length > 0) {
            setCurrentFmea(projects[0]);
            router.push(`/pfmea/worksheet?id=${projects[0].id}`);
          }
          return;
        } catch (e) { 
          console.error('FMEA 목록 로드 실패:', e); 
        }
      }
      
      // 3. FMEA 목록이 없으면 등록 페이지로 이동
      console.log('📍 [워크시트] FMEA 목록 없음 - 등록 페이지로 이동');
      router.push('/pfmea/register');
    };
    
    loadFmeaList();
  }, [selectedFmeaId, router]);

  // ✅ 상속 모드 처리 (baseId가 있고 mode=inherit일 때)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!selectedFmeaId || !baseId || mode !== 'inherit') return;
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔵 [상속 모드] 시작:', { selectedFmeaId, baseId, mode });
    console.log('═══════════════════════════════════════════════════════');
    
    (async () => {
      try {
        // 1. 상속 API 호출 (데이터 조회)
        const getRes = await fetch(`/api/fmea/inherit?sourceId=${baseId}&targetId=${selectedFmeaId}`);
        const getData = await getRes.json();
        
        if (!getData.success) {
          console.error('[상속] 데이터 조회 실패:', getData.error);
          alert(`상속 실패: ${getData.error}`);
          return;
        }
        
        console.log('[상속] 데이터 조회 성공:', getData.stats);
        
        // 2. 상속 데이터 저장 (POST)
        const postRes = await fetch('/api/fmea/inherit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: baseId,
            targetId: selectedFmeaId,
            inherited: getData.inherited,
          }),
        });
        const postData = await postRes.json();
        
        if (!postData.success) {
          console.error('[상속] 저장 실패:', postData.error);
          alert(`상속 저장 실패: ${postData.error}`);
          return;
        }
        
        console.log('[상속] ✅ 저장 완료:', postData.message);
        
        // 3. State 업데이트
        const inherited = getData.inherited;
        setState(prev => ({
          ...prev,
          l1: inherited.l1 || prev.l1,
          l2: inherited.l2 || prev.l2,
          failureLinks: inherited.failureLinks || [],
          structureConfirmed: false,
          l1Confirmed: false,
          l2Confirmed: false,
          l3Confirmed: false,
          failureL1Confirmed: false,
          failureL2Confirmed: false,
          failureL3Confirmed: false,
          failureLinkConfirmed: false,
        }));
        
        // 4. localStorage에도 저장
        const worksheetData = {
          fmeaId: selectedFmeaId,
          l1: inherited.l1,
          l2: inherited.l2,
          failureLinks: inherited.failureLinks || [],
          tab: 'structure',
          structureConfirmed: false,
          _inherited: true,
          _inheritedFrom: baseId,
          _inheritedAt: new Date().toISOString(),
        };
        worksheetData.failureLinks = normalizeFailureLinks(
          worksheetData.failureLinks || [],
          worksheetData as any
        );
        localStorage.setItem(`pfmea_worksheet_${selectedFmeaId}`, JSON.stringify(worksheetData));
        
        // 5. URL에서 상속 파라미터 제거 (새로고침 시 중복 상속 방지)
        const newUrl = `/pfmea/worksheet?id=${selectedFmeaId}`;
        window.history.replaceState({}, '', newUrl);
        
        // 6. 알림
        alert(`✅ ${getData.source.subject}에서 데이터를 상속받았습니다.\n\n` +
          `- 공정: ${getData.stats.processes}개\n` +
          `- 작업요소: ${getData.stats.workElements}개\n` +
          `- 고장형태: ${getData.stats.failureModes}개\n\n` +
          `이제 필요에 따라 수정하실 수 있습니다.`);
        
        console.log('🔵 [상속 모드] 완료');
        
      } catch (e: any) {
        console.error('[상속] 오류:', e);
        alert(`상속 중 오류가 발생했습니다: ${e.message}`);
      }
    })();
  }, [selectedFmeaId, baseId, mode, setState]);
  
  // 워크시트 데이터 로드 (FMEA ID 변경 시) - 원자성 DB 우선
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedFmeaId) return;
    
    // ✅ 상속 모드일 때는 로드 스킵 (상속 useEffect에서 처리)
    if (baseId && mode === 'inherit') {
      console.log('[워크시트] 상속 모드 - 일반 로드 스킵');
      return;
    }
    
    console.log('[워크시트] 데이터 로드 시작:', selectedFmeaId);
    
    // ✅ localStorage 키 대소문자 마이그레이션 (한 번만 실행)
    const migrationKey = `_migration_uppercase_${selectedFmeaId}`;
    if (!localStorage.getItem(migrationKey)) {
      const lowerFmeaId = selectedFmeaId.toLowerCase();
      const keys = ['pfmea_worksheet_', 'pfmea_tab_', 'pfmea_riskData_'];
      keys.forEach(prefix => {
        const lowerKey = prefix + lowerFmeaId;
        const upperKey = prefix + selectedFmeaId;
        // 소문자 키가 있고 대문자 키가 없으면 마이그레이션
        const lowerData = localStorage.getItem(lowerKey);
        const upperData = localStorage.getItem(upperKey);
        if (lowerData && !upperData) {
          console.log(`[마이그레이션] ${lowerKey} → ${upperKey}`);
          localStorage.setItem(upperKey, lowerData);
          localStorage.removeItem(lowerKey);
        }
      });
      localStorage.setItem(migrationKey, new Date().toISOString());
    }
    
    // ✅ 프로젝트 정보에서 L1 이름 미리 가져오기 (빈 데이터 복구용)
    let projectL1Name = '';
    try {
      const projectsData = localStorage.getItem('pfmea-projects');
      if (projectsData) {
        const projects = JSON.parse(projectsData);
        // ✅ 대소문자 무시 비교 (ID 일관성 문제 방지)
        const currentProject = projects.find((p: any) => 
          p.id?.toUpperCase() === selectedFmeaId.toUpperCase()
        );
        if (currentProject) {
          projectL1Name = currentProject.fmeaInfo?.subject || currentProject.project?.productName || '';
          console.log('[기초정보] FMEA명 발견:', projectL1Name);
        }
      }
    } catch (e) {
      console.error('[기초정보] 로드 오류:', e);
    }
    
    // 원자성 DB 로드 시도 (async)
    (async () => {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[로드 시작] FMEA ID:', selectedFmeaId);
      console.log('═══════════════════════════════════════════════════════');

      // ✅ 초기 복구 동안 자동저장 방지
      suppressAutoSaveRef.current = true;
      
      const loadedDB = await loadWorksheetDB(selectedFmeaId);
      console.log('[로드] DB 응답:', loadedDB ? '데이터 있음' : 'null');

      // ✅ 원자성 DB 강제 로드 (레거시가 있어도 raw atomic 확보)
      const loadedAtomicDB = await loadWorksheetDBAtomic(selectedFmeaId);
      console.log('[로드] 원자성(강제) DB 응답:', loadedAtomicDB ? '데이터 있음' : 'null');
      
      // ✅ 정책 변경: "프로젝트별 DB"가 단일 진실 소스
      // - DB 응답이 있으면(local legacy/atomic 포함) localStorage 스캔/복구를 절대 수행하지 않음
      // - localStorage는 DB가 완전히 불가(오프라인/연결실패)일 때만 비상 복구용으로 사용
      let localStorageLegacy: any = null;
      
      // ✅ 2026-01-12: URL 탭 우선 → localStorage 탭 → 기본값 'structure'
      const urlTabParam = typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search).get('tab') 
        : null;
      let legacyTab = urlTabParam || localStorage.getItem(`pfmea_tab_${selectedFmeaId}`) || 'structure';
      console.log('[로드] 탭 복원:', { urlTab: urlTabParam, legacyTab });
      
      let legacyRiskData: { [key: string]: number | string } = {};

      const hasDbResponse = Boolean(loadedDB) || Boolean(loadedAtomicDB);
      if (!hasDbResponse) {
        const legacyKeys = [
          `pfmea_worksheet_${selectedFmeaId}`,
          `fmea-worksheet-${selectedFmeaId}`,
          `pfmea_atomic_${selectedFmeaId}`, // 원자성 DB 백업
        ];

        for (const key of legacyKeys) {
          const saved = localStorage.getItem(key);
          if (!saved) continue;
          try {
            const parsed = JSON.parse(saved);
            if (parsed.l1 || parsed.l2) {
              localStorageLegacy = parsed;
              // ✅ URL 탭이 없을 때만 localStorage에서 복원
              if (!urlTabParam) {
                legacyTab = parsed.tab || legacyTab;
              }
              legacyRiskData = parsed.riskData || {};
              console.warn('[로드] ⚠️ DB 없음 → localStorage 레거시로 비상 복구:', key);
              break;
            }
            if (parsed.l2Structures) {
              const legacy = convertToLegacyFormat(parsed);
              localStorageLegacy = {
                ...legacy,
                structureConfirmed: parsed.l1Structure?.confirmed ?? false,
              };
              // ✅ URL 탭 유지 (덮어쓰지 않음)
              console.warn('[로드] ⚠️ DB 없음 → localStorage 원자성 백업으로 비상 복구:', key);
              break;
            }
          } catch {
            // ignore
          }
        }
      }
      
      // ✅ 후보 스냅샷 중 “가장 완성도 높은 것” 선택 (복구 핵심)
      const scoreLegacy = (cand: any): number => {
        if (!cand) return 0;
        let score = 0;
        const l1Name = String(cand.l1?.name || '').trim();
        if (l1Name) score += 50;
        const l2 = Array.isArray(cand.l2) ? cand.l2 : [];
        // 공정(프로세스) 수
        const meaningfulProcs = l2.filter((p: any) => String(p?.name || p?.no || '').trim());
        score += meaningfulProcs.length * 20;
        // 작업요소/기능/특성/고장 데이터량
        const l3Count = l2.reduce((acc: number, p: any) => acc + (Array.isArray(p?.l3) ? p.l3.length : 0), 0);
        score += l3Count * 5;
        const fmCount = l2.reduce((acc: number, p: any) => acc + (Array.isArray(p?.failureModes) ? p.failureModes.length : 0), 0);
        const fcCount = l2.reduce((acc: number, p: any) => acc + (Array.isArray(p?.failureCauses) ? p.failureCauses.length : 0), 0);
        score += (fmCount + fcCount) * 2;
        const feCount = Array.isArray(cand?.l1?.failureScopes) ? cand.l1.failureScopes.length : 0;
        score += feCount * 2;
        return score;
      };

      const dbLegacyCandidate = (loadedDB && (loadedDB as any)._isLegacyDirect) ? (loadedDB as any) : null;
      
      // ★★★ 2026-01-11: DB 레거시에서 riskData 추출 ★★★
      let dbRiskData: { [key: string]: number | string } = {};
      if (dbLegacyCandidate && dbLegacyCandidate.riskData) {
        dbRiskData = dbLegacyCandidate.riskData;
        console.log('[로드] DB 레거시에서 riskData 발견:', Object.keys(dbRiskData).length, '개');
      }
      
      let atomicAsLegacy: any = null;
      if (loadedAtomicDB && (loadedAtomicDB as any).l2Structures) {
        try {
          atomicAsLegacy = convertToLegacyFormat(loadedAtomicDB as any);
          // confirmed 복원
          const c = (loadedAtomicDB as any).confirmed || {};
          atomicAsLegacy.structureConfirmed = Boolean(c.structure ?? (loadedAtomicDB as any).l1Structure?.confirmed ?? false);
          atomicAsLegacy.l1Confirmed = Boolean(c.l1Function ?? false);
          atomicAsLegacy.l2Confirmed = Boolean(c.l2Function ?? false);
          atomicAsLegacy.l3Confirmed = Boolean(c.l3Function ?? false);
          atomicAsLegacy.failureL1Confirmed = Boolean(c.l1Failure ?? false);
          atomicAsLegacy.failureL2Confirmed = Boolean(c.l2Failure ?? false);
          atomicAsLegacy.failureL3Confirmed = Boolean(c.l3Failure ?? false);
          atomicAsLegacy.failureLinkConfirmed = Boolean(c.failureLink ?? false);
        } catch (e) {
          console.warn('[복구] 원자성→레거시 변환 실패:', e);
        }
      }

      // ✅ 정책: DB 레거시가 있으면 DB가 단일 진실 소스
      // - on-premise 안정성을 위해 "점수 비교로 DB 레거시를 밀어내는" 케이스를 제거한다
      const dbScore = scoreLegacy(dbLegacyCandidate);
      const localScore = scoreLegacy(localStorageLegacy);
      const atomicScore = scoreLegacy(atomicAsLegacy);

      // ✅ 정책: DB(프로젝트 스키마)가 있으면 localStorage 후보는 제외
      const baseCandidates: Array<{ label: string; data: any; score: number }> = [
        { label: 'dbLegacy', data: dbLegacyCandidate, score: dbScore },
        { label: 'atomicAsLegacy', data: atomicAsLegacy, score: atomicScore },
      ];

      let candidates: Array<{ label: string; data: any; score: number }> = (hasDbResponse
        ? baseCandidates
        : [
            ...baseCandidates,
            { label: 'localStorageLegacy', data: localStorageLegacy, score: localScore },
          ]).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // tie-breaker: dbLegacy > atomicAsLegacy > localStorageLegacy
        const rank = (label: string) => (label === 'dbLegacy' ? 3 : label === 'atomicAsLegacy' ? 2 : 1);
        return rank(b.label) - rank(a.label);
      });

      // ✅✅ 단일 진실 소스 고정: DB 레거시(_isLegacyDirect)가 있으면 무조건 1순위
      // - “점수 기반 선택”으로 DB 레거시가 밀려나는 순간, 새로고침 시 일부 데이터가 사라진 것처럼 보일 수 있음
      if (dbLegacyCandidate) {
        candidates = [{ label: 'dbLegacy', data: dbLegacyCandidate, score: dbScore }];
      }

      console.log('[복구] 후보 스냅샷 점수:', candidates.map(c => ({ label: c.label, score: c.score })));

      const best = candidates[0];
      if (best && best.score > 0 && best.data) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('★★★ [복구] 가장 완성도 높은 스냅샷 선택:', best.label, 'score=', best.score, '★★★');
        console.log('═══════════════════════════════════════════════════════');

        const src = best.data;

        // 🔍 DEBUG: 로드 시 src.l2[].functions 확인
        console.log('[로드] 📊 src.l2[].functions 구조:');
        (src.l2 || []).forEach((proc: any, idx: number) => {
          const funcCount = (proc?.functions || []).length;
          console.log(`  [${idx}] "${proc?.name}" - functions: ${funcCount}개`);
          if (funcCount > 0) {
            console.log(`      functions: [${proc.functions.map((f: any) => f?.name).join(', ')}]`);
          } else {
            console.warn(`      ⚠️ functions 비어있음!`);
          }
        });

        // ✅ confirmed는 DB 값을 우선으로 병합 (localStorage가 false로 덮어쓰는 문제 방지)
        const dbConfirmed = dbLegacyCandidate?.confirmed || {};
        const confirmedFlags = {
          structureConfirmed: Boolean(dbConfirmed.structure ?? src.structureConfirmed ?? src.confirmed?.structure ?? false),
          l1Confirmed: Boolean(dbConfirmed.l1Function ?? src.l1Confirmed ?? src.confirmed?.l1Function ?? false),
          l2Confirmed: Boolean(dbConfirmed.l2Function ?? src.l2Confirmed ?? src.confirmed?.l2Function ?? false),
          l3Confirmed: Boolean(dbConfirmed.l3Function ?? src.l3Confirmed ?? src.confirmed?.l3Function ?? false),
          failureL1Confirmed: Boolean(dbConfirmed.l1Failure ?? src.failureL1Confirmed ?? src.confirmed?.l1Failure ?? false),
          failureL2Confirmed: Boolean(dbConfirmed.l2Failure ?? src.failureL2Confirmed ?? src.confirmed?.l2Failure ?? false),
          failureL3Confirmed: Boolean(dbConfirmed.l3Failure ?? src.failureL3Confirmed ?? src.confirmed?.l3Failure ?? false),
          failureLinkConfirmed: Boolean(dbConfirmed.failureLink ?? src.failureLinkConfirmed ?? src.confirmed?.failureLink ?? false),
        };
        const normalizedConfirmed = normalizeConfirmedFlags(confirmedFlags);

        // ★★★ 2026-01-11: riskData 복원 (DB 우선, localStorage 폴백) ★★★
        const restoredRiskData = src.riskData || legacyRiskData || {};
        
        const newState: WorksheetState = {
          l1: src.l1 || createInitialState().l1,
          l2: src.l2 || [],
          tab: legacyTab,
          riskData: restoredRiskData,  // ★ DB에서 로드된 riskData 사용
          search: String(src.search || ''),
          selected: src.selected || null,
          levelView: src.levelView || 'L1',
          visibleSteps: src.visibleSteps || { step2: true, step3: true, step4: true, step5: true, step6: true },
          ...normalizedConfirmed,
          failureLinks: src.failureLinks || [],  // ✅ 고장연결 데이터 복원
        };
        
        console.log('[로드] ✅ riskData 복원:', {
          source: src.riskData ? 'DB' : legacyRiskData ? 'localStorage' : '없음',
          count: Object.keys(restoredRiskData).length,
          keys: Object.keys(restoredRiskData).slice(0, 5),
        });

        console.log('[로드] ✅ failureLinks 복원:', (newState as any).failureLinks?.length || 0, '건');
        setStateSynced(newState);

        // atomic도 확보/동기화
        const derivedAtomic = loadedAtomicDB && (loadedAtomicDB as any).l2Structures
          ? (loadedAtomicDB as any)
          : migrateToAtomicDB(src);
        setAtomicDB(derivedAtomic);

        // ✅ 복구된 레거시를 DB에 저장 (단, suppress 해제 후)
        setTimeout(() => {
          suppressAutoSaveRef.current = false;
          saveWorksheetDB(derivedAtomic, src).catch(e => console.error('[복구] DB 동기화 오류:', e));
          console.log('[복구] ✅ 자동저장 재개 + DB 동기화 트리거');
        }, 1200);

        return;
      }

      // ★★★ 최우선: localStorage에 데이터가 있으면 그것을 사용 ★★★
      if (localStorageLegacy && (localStorageLegacy.l1?.name || localStorageLegacy.l2?.length > 0)) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('★★★ [localStorage 우선] 로컬 데이터 직접 사용 ★★★');
        console.log('═══════════════════════════════════════════════════════');
        
        const confirmedFlags = {
          structureConfirmed: Boolean(localStorageLegacy.structureConfirmed ?? false),
          l1Confirmed: Boolean(localStorageLegacy.l1Confirmed ?? false),
          l2Confirmed: Boolean(localStorageLegacy.l2Confirmed ?? false),
          l3Confirmed: Boolean(localStorageLegacy.l3Confirmed ?? false),
          failureL1Confirmed: Boolean(localStorageLegacy.failureL1Confirmed ?? false),
          failureL2Confirmed: Boolean(localStorageLegacy.failureL2Confirmed ?? false),
          failureL3Confirmed: Boolean(localStorageLegacy.failureL3Confirmed ?? false),
          failureLinkConfirmed: Boolean(localStorageLegacy.failureLinkConfirmed ?? false),
        };
        const normalizedConfirmed = normalizeConfirmedFlags(confirmedFlags);
        
        const newState: WorksheetState = {
          l1: localStorageLegacy.l1 || createInitialState().l1,
          l2: localStorageLegacy.l2 || [],
          tab: legacyTab,
          riskData: legacyRiskData,
          search: '',
          selected: localStorageLegacy.selected || null,
          levelView: localStorageLegacy.levelView || 'L1',
          visibleSteps: localStorageLegacy.visibleSteps || { step2: true, step3: true, step4: true, step5: true, step6: true },
          ...normalizedConfirmed,
          failureLinks: localStorageLegacy.failureLinks || [],  // ✅ 고장연결 데이터 복원
        };
        
        console.log('[로드] localStorage 데이터 적용:', {
          l1Name: newState.l1.name,
          l2Count: newState.l2.length,
          structureConfirmed: newState.structureConfirmed,
          failureModesCount: newState.l2.flatMap((p: any) => p.failureModes || []).length,
          failureCausesCount: newState.l2.flatMap((p: any) => p.failureCauses || []).length,
          failureLinksCount: (newState as any).failureLinks?.length || 0,  // ✅ 로그 추가
        });
        
        console.log('[로드] ✅ failureLinks 복원:', (newState as any).failureLinks?.length || 0, '건');
        setStateSynced(newState);
        
        // 원자성 DB 생성 및 DB에도 저장 (동기화)
        const derivedAtomicDB = migrateToAtomicDB(localStorageLegacy);
        setAtomicDB(derivedAtomicDB);
        
        // DB에도 레거시 데이터 저장 (동기화)
        saveWorksheetDB(derivedAtomicDB, localStorageLegacy).catch(e => console.error('[로드] DB 동기화 오류:', e));
        
        console.log('[로드] ✅ localStorage 데이터 로드 완료, DB에도 동기화');
        setTimeout(() => { suppressAutoSaveRef.current = false; }, 1200);
        return;
      }
      
      // ★★★ 2순위: DB에서 레거시 데이터가 직접 반환된 경우 ★★★
      if (loadedDB && (loadedDB as any)._isLegacyDirect) {
        const legacyDirect = loadedDB as any;
        
        // ✅ DB에서 가져온 레거시 데이터가 비어있으면 localStorage 사용
        const hasValidDBData = legacyDirect.l1?.name || (legacyDirect.l2 && legacyDirect.l2.length > 0);
        
        if (!hasValidDBData && localStorageLegacy) {
          console.log('═══════════════════════════════════════════════════════');
          console.log('⚠️ [복구] DB 레거시 데이터가 비어있음, localStorage에서 복구');
          console.log('═══════════════════════════════════════════════════════');
          
          // localStorage 데이터를 사용
          const recoveredLegacy = localStorageLegacy;
          
          // 확정 상태
          const confirmedFlags = {
            structureConfirmed: Boolean(recoveredLegacy.structureConfirmed ?? false),
            l1Confirmed: Boolean(recoveredLegacy.l1Confirmed ?? false),
            l2Confirmed: Boolean(recoveredLegacy.l2Confirmed ?? false),
            l3Confirmed: Boolean(recoveredLegacy.l3Confirmed ?? false),
            failureL1Confirmed: Boolean(recoveredLegacy.failureL1Confirmed ?? false),
            failureL2Confirmed: Boolean(recoveredLegacy.failureL2Confirmed ?? false),
            failureL3Confirmed: Boolean(recoveredLegacy.failureL3Confirmed ?? false),
            failureLinkConfirmed: Boolean(recoveredLegacy.failureLinkConfirmed ?? false),
          };
          const normalizedConfirmed = normalizeConfirmedFlags(confirmedFlags);
          
          const newState: WorksheetState = {
            l1: recoveredLegacy.l1 || createInitialState().l1,
            l2: recoveredLegacy.l2 || [],
            tab: legacyTab,
            riskData: legacyRiskData,
            search: '',
            selected: recoveredLegacy.selected || null,
            levelView: recoveredLegacy.levelView || 'L1',
            visibleSteps: recoveredLegacy.visibleSteps || { step2: true, step3: true, step4: true, step5: true, step6: true },
            ...normalizedConfirmed,
            failureLinks: recoveredLegacy.failureLinks || [],  // ✅ 고장연결 데이터 복원
          };
          
          console.log('[복구] localStorage에서 복구된 데이터:', {
            l1Name: newState.l1.name,
            l2Count: newState.l2.length,
            structureConfirmed: newState.structureConfirmed,
            failureLinksCount: (newState as any).failureLinks?.length || 0,  // ✅ 로그 추가
          });
          
          console.log('[복구] ✅ failureLinks 복원:', (newState as any).failureLinks?.length || 0, '건');
          setStateSynced(newState);
          
          // DB에도 저장 (복구 데이터 동기화)
          const derivedAtomicDB = migrateToAtomicDB(recoveredLegacy);
          setAtomicDB(derivedAtomicDB);
          saveWorksheetDB(derivedAtomicDB, recoveredLegacy).catch(e => console.error('[복구] DB 저장 오류:', e));
          
          console.log('[복구] ✅ localStorage에서 복구 완료, DB에도 동기화');
          return;
        }
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('★★★ [Single Source of Truth] 레거시 데이터 직접 사용 ★★★');
        console.log('═══════════════════════════════════════════════════════');
        console.log('[로드] 레거시 버전:', (loadedDB as any)._legacyVersion);
        console.log('[로드] 로드 시간:', (loadedDB as any)._loadedAt);
        
        // ✅ API의 confirmed 객체를 플랫 형태로 변환
        const apiConfirmed = legacyDirect.confirmed || {};
        const confirmedFlags = {
          structureConfirmed: Boolean(legacyDirect.structureConfirmed ?? apiConfirmed.structure ?? false),
          l1Confirmed: Boolean(legacyDirect.l1Confirmed ?? apiConfirmed.l1Function ?? false),
          l2Confirmed: Boolean(legacyDirect.l2Confirmed ?? apiConfirmed.l2Function ?? false),
          l3Confirmed: Boolean(legacyDirect.l3Confirmed ?? apiConfirmed.l3Function ?? false),
          failureL1Confirmed: Boolean(legacyDirect.failureL1Confirmed ?? apiConfirmed.l1Failure ?? false),
          failureL2Confirmed: Boolean(legacyDirect.failureL2Confirmed ?? apiConfirmed.l2Failure ?? false),
          failureL3Confirmed: Boolean(legacyDirect.failureL3Confirmed ?? apiConfirmed.l3Failure ?? false),
          failureLinkConfirmed: Boolean(legacyDirect.failureLinkConfirmed ?? apiConfirmed.failureLink ?? false),
        };
        
        console.log('[로드] 확정 상태 원본:', { legacyDirect: legacyDirect.structureConfirmed, apiConfirmed });
        
        // 확정 상태 정규화
        const normalizedConfirmed = normalizeConfirmedFlags(confirmedFlags);
        
        console.log('[로드] 정규화된 확정 상태:', normalizedConfirmed);
        
        // state 설정
        const newState: WorksheetState = {
          l1: legacyDirect.l1 || createInitialState().l1,
          l2: legacyDirect.l2 || [],
          tab: legacyTab,
          riskData: legacyRiskData,
          search: legacyDirect.search || '',  // ✅ 검색어 기본값 추가
          selected: legacyDirect.selected || null,
          levelView: legacyDirect.levelView || 'L1',
          visibleSteps: legacyDirect.visibleSteps || { step2: true, step3: true, step4: true, step5: true, step6: true },
          ...normalizedConfirmed,
          failureLinks: legacyDirect.failureLinks || [],  // ✅ 고장연결 데이터 복원
        };
        
        console.log('[로드] 레거시 데이터 직접 적용:', {
          l1Name: newState.l1.name,
          l2Count: newState.l2.length,
          failureModesCount: newState.l2.flatMap((p: any) => p.failureModes || []).length,
          failureCausesCount: newState.l2.flatMap((p: any) => p.failureCauses || []).length,
          failureLinksCount: (newState as any).failureLinks?.length || 0,  // ✅ 로그 추가
          tab: newState.tab,
        });
        
        console.log('[로드] ✅ failureLinks 복원:', (newState as any).failureLinks?.length || 0, '건');
        setStateSynced(newState);
        
        // 원자성 DB 생성 (PFD/CP/WS/PM 연동용)
        const derivedAtomicDB = migrateToAtomicDB(legacyDirect);
        setAtomicDB(derivedAtomicDB);
        
        console.log('[로드] ✅ 레거시 데이터 직접 로드 완료 (역변환 없음!)');
        setTimeout(() => { suppressAutoSaveRef.current = false; }, 1200);
        return; // ★★★ 역변환 과정 스킵 ★★★
      }
      
      // ✅ 원자성 DB에 실제 데이터가 있는지 확인 (빈 DB 객체 구분)
      const hasValidData = loadedDB && (
        (loadedDB.l1Structure && loadedDB.l1Structure.name) || 
        (loadedDB.failureEffects && loadedDB.failureEffects.length > 0) || 
        loadedDB.l2Structures.length > 0
      );
      
      // 원자성 DB가 있고 실제 데이터가 있는 경우 (하위 호환성)
      if (hasValidData) {
      console.log('[워크시트] ⚠️ 원자성 DB에서 역변환 (레거시 데이터 없음 - 하위 호환성)');
      console.log('[워크시트] 원자성 DB 상태:', {
        l1Structure: !!loadedDB.l1Structure,
        l2Structures: loadedDB.l2Structures.length,
        failureEffects: loadedDB.failureEffects.length,
        failureModes: loadedDB.failureModes.length,
        failureCauses: loadedDB.failureCauses.length,
      });
      setAtomicDB(loadedDB);
      
      // 원자성 DB를 레거시 형식으로 변환하여 state에 적용 (하위 호환성)
      const legacy = convertToLegacyFormat(loadedDB);
      console.log('[원자성 DB 로드] ✅ failureLinks 변환 완료:', {
        원자성DB: loadedDB.failureLinks.length,
        레거시변환: legacy.failureLinks?.length || 0,
        샘플: legacy.failureLinks?.slice(0, 2).map(l => ({
          fmText: l.fmText?.substring(0, 20),
          feText: l.feText?.substring(0, 20),
          fcText: l.fcText?.substring(0, 20)
        }))
      });
      
      // ✅ 레거시 원본 데이터에서 직접 추출 (근본적인 해결책)
      const legacyKeys2 = [`pfmea_worksheet_${selectedFmeaId}`, `fmea-worksheet-${selectedFmeaId}`];
      // ✅ 2026-01-12: URL 탭 우선 → localStorage 탭 → 기본값
      const urlTabParam2 = typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search).get('tab') 
        : null;
      let legacyTab2 = urlTabParam2 || localStorage.getItem(`pfmea_tab_${selectedFmeaId}`) || 'structure';
      let legacyRiskData2: { [key: string]: number | string } = {};
      let legacyOriginalData: any = null;
      
      for (const key of legacyKeys2) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            // ✅ URL 탭이 없을 때만 localStorage에서 복원
            if (!urlTabParam2) {
              legacyTab2 = parsed.tab || legacyTab2;
            }
            legacyRiskData2 = parsed.riskData || {};
            legacyOriginalData = parsed; // 원본 데이터 보관
            break;
          } catch (e) { /* ignore */ }
        }
      }
      
      // ✅ l1.name 복원: 원자성 DB 또는 레거시 원본 데이터에서 가져오기
      if (legacyOriginalData?.l1?.name) {
        legacy.l1.name = legacyOriginalData.l1.name;
        console.log('[로드] l1.name 레거시 원본에서 복원:', legacy.l1.name);
      } else if (loadedDB.l1Structure?.name) {
        legacy.l1.name = loadedDB.l1Structure.name;
        console.log('[로드] l1.name 원자성 DB에서 복원:', legacy.l1.name);
      } else if (projectL1Name) {
        legacy.l1.name = projectL1Name;
        console.log('[로드] l1.name 프로젝트 정보에서 복원:', legacy.l1.name);
      }
      
      // ========== 근본적인 해결: 레거시 원본 데이터에서 failureCauses 추출 ==========
      const legacyOriginalCauses = legacyOriginalData?.l2?.flatMap((proc: any) => {
        return (proc.failureCauses || []).map((fc: any) => ({
          procId: proc.id,
          procName: proc.name || proc.no,
          causeId: fc.id,
          causeName: fc.name,
          processCharId: fc.processCharId || '',
          occurrence: fc.occurrence
        }));
      }) || [];
      
      const legacyFailureCausesCount = legacy.l2.flatMap((p: any) => p.failureCauses || []).length;
      console.log('[워크시트] 역변환된 레거시 데이터:', {
        l1Name: legacy.l1.name,
        failureScopesCount: (legacy.l1 as any).failureScopes?.length || 0,
        l2Count: legacy.l2.length,
        failureCausesCount: legacyFailureCausesCount,
        레거시원본개수: legacyOriginalCauses.length,
        riskDataCount: Object.keys(legacyRiskData).length,
        tab: legacyTab,
      });
      
      // ✅ 로드 검증: 원자성 DB vs 레거시 원본 데이터 비교
      if (loadedDB.failureCauses.length !== legacyOriginalCauses.length) {
        console.warn('[로드 검증] failureCauses 개수 불일치:', {
          원자성DB개수: loadedDB.failureCauses.length,
          레거시원본개수: legacyOriginalCauses.length,
          레거시변환개수: legacyFailureCausesCount
        });
      } else {
        console.log('[로드 검증 성공] failureCauses 개수 일치:', legacyOriginalCauses.length, '개');
      }
      
      // ========== (중요) 트리뷰/원자성DB 자동 복구 제거 ==========
      // 과거 “일관성 검증/자동 복구” 코드가 로드 시점에 DB를 덮어써
      // 일부 케이스에서 새로고침 후 데이터가 사라지는 현상을 만들 수 있어 비활성화한다.
      let finalLegacy = legacy;
      
      // ✅ 근본적인 해결: 레거시 원본 데이터의 failureModes와 failureCauses를 finalLegacy에 반영
      if (legacyOriginalData && legacyOriginalData.l2) {
        console.log('🔧 [근본 해결] 레거시 원본 데이터의 failureModes/failureCauses를 finalLegacy에 반영');
        // 각 공정별로 failureModes와 failureCauses 복사
        finalLegacy.l2 = finalLegacy.l2.map((proc: any) => {
          const originalProc = legacyOriginalData.l2.find((p: any) => p.id === proc.id);
          if (originalProc) {
            return {
              ...proc,
              // ✅ 고장형태 복원 (레거시 원본 데이터 우선)
              failureModes: originalProc.failureModes || proc.failureModes || [],
              // ✅ 고장원인 복원 (레거시 원본 데이터 우선)
              failureCauses: originalProc.failureCauses || proc.failureCauses || [],
            };
          }
          return proc;
        });
        const modesCount = finalLegacy.l2.flatMap((p: any) => p.failureModes || []).length;
        const causesCount = finalLegacy.l2.flatMap((p: any) => p.failureCauses || []).length;
        console.log('✅ [근본 해결] 레거시 원본 데이터 반영 완료:', 
          '고장형태:', modesCount, '개, 고장원인:', causesCount, '개');
      }
      
      // ✅ 기존 state의 tab/riskData가 있으면 유지 (초기화 함수에서 이미 설정됨)
      // ✅ 2026-01-12: URL 탭 우선 (근본 해결)
      const finalUrlTab = typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search).get('tab') 
        : null;
      
      setState(prev => {
        const hasExistingRiskData = Object.keys(prev.riskData || {}).length > 0;
        // ✅ URL 탭이 있으면 무조건 사용
        const finalTab = finalUrlTab || prev.tab || legacyTab || 'structure';
        
        console.log('[setState] 탭 결정:', {
          urlTab: finalUrlTab,
          prevTab: prev.tab,
          legacyTab,
          finalTab,
        });
        
        const src: any = finalLegacy as any;
        const normalized = normalizeConfirmedFlags({
          structureConfirmed: Boolean(src.structureConfirmed ?? legacy.structureConfirmed ?? false),
          l1Confirmed: Boolean(src.l1Confirmed ?? legacy.l1Confirmed ?? false),
          l2Confirmed: Boolean(src.l2Confirmed ?? legacy.l2Confirmed ?? false),
          l3Confirmed: Boolean(src.l3Confirmed ?? legacy.l3Confirmed ?? false),
          failureL1Confirmed: Boolean(src.failureL1Confirmed ?? legacy.failureL1Confirmed ?? false),
          failureL2Confirmed: Boolean(src.failureL2Confirmed ?? legacy.failureL2Confirmed ?? false),
          failureL3Confirmed: Boolean(src.failureL3Confirmed ?? legacy.failureL3Confirmed ?? false),
          failureLinkConfirmed: Boolean(src.failureLinkConfirmed ?? (legacy as any).failureLinkConfirmed ?? false),
        });

        const nextL1: any = {
          ...(finalLegacy.l1 as any),
          // ✅ l1.name 유실 방지: 새 값이 비어있으면 기존 state의 name 유지
          name: (finalLegacy as any)?.l1?.name || (prev as any)?.l1?.name || '',
        };

        return { 
          ...prev, 
          l1: nextL1, 
          l2: finalLegacy.l2 as any,
          failureLinks: finalLegacy.failureLinks || [],
          // ✅ 기존 값이 있으면 유지, 없으면 레거시에서 복원
          riskData: hasExistingRiskData ? prev.riskData : legacyRiskData,
          // ✅ 2026-01-12: URL 탭 우선 (근본 해결)
          tab: finalTab,
          structureConfirmed: normalized.structureConfirmed,
          l1Confirmed: normalized.l1Confirmed,
          l2Confirmed: normalized.l2Confirmed,
          l3Confirmed: normalized.l3Confirmed,
          failureL1Confirmed: normalized.failureL1Confirmed,
          failureL2Confirmed: normalized.failureL2Confirmed,
          failureL3Confirmed: normalized.failureL3Confirmed,
          failureLinkConfirmed: normalized.failureLinkConfirmed,  // ✅ 고장연결 확정 상태 복원
          visibleSteps: prev.visibleSteps || [2, 3, 4, 5, 6],  // 기존 토글 상태 유지
        };
      });
      setDirty(false);
      return;
    }
    
    // 레거시 데이터 로드 시도
    const keys = [`pfmea_worksheet_${selectedFmeaId}`, `fmea-worksheet-${selectedFmeaId}`];
    let savedData = null;
    for (const key of keys) {
      savedData = localStorage.getItem(key);
      if (savedData) break;
    }
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        console.log('[워크시트] 레거시 데이터 발견:', parsed);
        
        // ✅ 고장형태 데이터 초기화 옵션 (URL 파라미터: ?reset-fm=true)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('reset-fm') === 'true') {
            console.log('[초기화] 고장형태 데이터 초기화 시작...');
            const beforeCount = parsed.l2?.reduce((sum: number, p: any) => sum + (p.failureModes?.length || 0), 0) || 0;
            console.log('[초기화 전] 고장형태 개수:', beforeCount);
            
            // 1. 레거시 데이터 초기화
            if (parsed.l2) {
              parsed.l2.forEach((p: any) => {
                p.failureModes = [];
              });
              parsed.failureL2Confirmed = false;
            }
            
            // 2. 모든 localStorage 키에서 초기화
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(key => {
              if (key.includes(selectedFmeaId) && (key.includes('worksheet') || key.includes('db'))) {
                try {
                  const data = localStorage.getItem(key);
                  if (data) {
                    const dataObj = JSON.parse(data);
                    // 레거시 형식
                    if (dataObj.l2) {
                      dataObj.l2.forEach((p: any) => {
                        p.failureModes = [];
                      });
                      dataObj.failureL2Confirmed = false;
                    }
                    // 원자성 DB 형식
                    if (dataObj.failureModes) {
                      dataObj.failureModes = [];
                    }
                    if (dataObj.confirmed) {
                      dataObj.confirmed.l2Failure = false;
                    }
                    localStorage.setItem(key, JSON.stringify(dataObj));
                    console.log('[초기화] 키 처리 완료:', key);
                  }
                } catch (e) {
                  console.warn('[초기화] 키 처리 실패:', key, e);
                }
              }
            });
            
            // 3. 초기화된 데이터 저장
            parsed.failureLinks = normalizeFailureLinks(
              parsed.failureLinks || [],
              parsed as any
            );
            localStorage.setItem(`pfmea_worksheet_${selectedFmeaId}`, JSON.stringify(parsed));
            console.log('[초기화 완료] 고장형태 데이터가 삭제되었습니다.');
            
            // 4. URL에서 파라미터 제거 후 새로고침
            urlParams.delete('reset-fm');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);
            setTimeout(() => location.reload(), 500);
            return;
          }
        }
        
        // ✅ l1과 l2가 존재하고 실제 데이터가 있는지 확인
        const hasValidL1 = parsed.l1 && (parsed.l1.name || (parsed.l1.types && parsed.l1.types.length > 0));
        const hasValidL2 = parsed.l2 && parsed.l2.length > 0 && parsed.l2.some((p: any) => p.name && !p.name.includes('클릭'));
        
        if (parsed.l1 && parsed.l2 && (hasValidL1 || hasValidL2)) {
          // 마이그레이션 및 방어 코드 - failureScopes 명시적 포함
          const migratedL1 = {
            ...parsed.l1,
            name: parsed.l1.name || projectL1Name || '', // ✅ 빈 이름이면 프로젝트 정보에서 가져오기, 없으면 빈 문자열
            types: parsed.l1.types || [],
            failureScopes: parsed.l1.failureScopes || [] // 고장영향 데이터 보존
          };
          
          // ✅ l1.name이 비어있으면 원자성 DB에서 복원 시도
          if (!migratedL1.name || migratedL1.name.trim() === '') {
            const atomicKey = `pfmea_atomic_${selectedFmeaId}`;
            const atomicData = localStorage.getItem(atomicKey);
            if (atomicData) {
              try {
                const atomicParsed = JSON.parse(atomicData);
                if (atomicParsed.l1Structure?.name) {
                  migratedL1.name = atomicParsed.l1Structure.name;
                  console.log('[데이터 로드] l1.name 원자성 DB에서 복원:', migratedL1.name);
                }
              } catch (e) {
                console.warn('[데이터 로드] 원자성 DB 파싱 실패:', e);
              }
            }
          }
          
          console.log('[데이터 로드] L1 이름:', migratedL1.name, '(원본:', parsed.l1.name, ', 프로젝트:', projectL1Name, ')');
          console.log('[데이터 로드] failureScopes:', (parsed.l1.failureScopes || []).length, '개');
          console.log('[데이터 로드] riskData:', Object.keys(parsed.riskData || {}).length, '개', parsed.riskData);
          
          const isEmptyValue = (val: string | undefined | null): boolean => {
            if (!val) return true;
            const trimmed = String(val).trim();
            return trimmed === '' || trimmed === '-';
          };
          
          let migratedL2 = parsed.l2
            .filter((p: any) => {
              const hasName = !isEmptyValue(p.name);
              const hasL3 = (p.l3 || []).length > 0;
              const hasFunctions = (p.functions || []).length > 0;
              return hasName || hasL3 || hasFunctions;
            })
            .map((p: any) => {
              // ✅ productCharId 자동 복구 마이그레이션
              const allProductChars = (p.functions || []).flatMap((f: any) => f.productChars || []);
              const migratedFailureModes = (p.failureModes || []).map((fm: any) => {
                // productCharId가 있으면 그대로 사용
                if (fm.productCharId) return fm;
                // productCharId가 없으면 첫 번째 productChar에 자동 연결
                const firstPC = allProductChars[0];
                if (firstPC) {
                  console.log('[마이그레이션] FM productCharId 자동 복구:', fm.name, '→', firstPC.id);
                  return { ...fm, productCharId: firstPC.id };
                }
                return fm;
              });
              
              return {
                ...p,
                functions: p.functions || [],
                productChars: p.productChars || [],
                failureModes: migratedFailureModes, 
                l3: (p.l3 || [])
                .filter((we: any) => {
                  const hasName = !isEmptyValue(we.name);
                  const hasM4 = !isEmptyValue(we.m4);
                  const hasFunctions = (we.functions || []).length > 0;
                  return hasName || hasM4 || hasFunctions;
                })
                .map((we: any) => ({
                  ...we,
                  m4: we.m4 === 'MT' ? 'IM' : (we.m4 || ''),
                  functions: we.functions || [],
                  processChars: we.processChars || [],
                  failureCauses: we.failureCauses || [] 
                }))
              };
            });
          
          console.log('[데이터 정리] 원본 공정 수:', parsed.l2.length, '→ 정리 후:', migratedL2.length);

          // ✅ 확정 상태 병합 (flat + confirmed 객체 모두 지원)
          const mergedConfirmed = normalizeConfirmedFlags({
            structureConfirmed: Boolean(parsed.structureConfirmed ?? parsed.confirmed?.structure ?? false),
            l1Confirmed: Boolean(parsed.l1Confirmed ?? parsed.confirmed?.l1Function ?? false),
            l2Confirmed: Boolean(parsed.l2Confirmed ?? parsed.confirmed?.l2Function ?? false),
            l3Confirmed: Boolean(parsed.l3Confirmed ?? parsed.confirmed?.l3Function ?? false),
            failureL1Confirmed: Boolean(parsed.failureL1Confirmed ?? parsed.confirmed?.l1Failure ?? false),
            failureL2Confirmed: Boolean(parsed.failureL2Confirmed ?? parsed.confirmed?.l2Failure ?? false),
            failureL3Confirmed: Boolean(parsed.failureL3Confirmed ?? parsed.confirmed?.l3Failure ?? false),
            failureLinkConfirmed: Boolean(parsed.failureLinkConfirmed ?? parsed.confirmed?.failureLink ?? false),
          });

          // 원자성 DB로 마이그레이션 (★ riskData 추가)
          const atomicData = migrateToAtomicDB({
            fmeaId: selectedFmeaId,
            l1: migratedL1,
            l2: migratedL2,
            failureLinks: parsed.failureLinks || [],
            riskData: parsed.riskData || {},  // ★ riskData 추가
            structureConfirmed: mergedConfirmed.structureConfirmed,
            l1Confirmed: mergedConfirmed.l1Confirmed,
            l2Confirmed: mergedConfirmed.l2Confirmed,
            l3Confirmed: mergedConfirmed.l3Confirmed,
            failureL1Confirmed: mergedConfirmed.failureL1Confirmed,
            failureL2Confirmed: mergedConfirmed.failureL2Confirmed,
            failureL3Confirmed: mergedConfirmed.failureL3Confirmed,
          });
          setAtomicDB(atomicData);
          // ★ legacyData도 함께 저장 (riskData 포함)
          saveWorksheetDB(atomicData, parsed).catch(e => console.error('[마이그레이션] DB 저장 오류:', e));
          
          // ========== (중요) 레거시 마이그레이션 후 “자동 복구(방어) 코드” 제거 ==========
          // 마이그레이션 직후에 원자성DB를 다시 “복구”한다며 덮어쓰는 코드는
          // 특정 케이스에서 일부 데이터 소실로 이어질 수 있어 제거한다.

          // ✅ 기존 state의 tab/riskData가 있으면 유지
          setState(prev => {
            const hasExistingRiskData = Object.keys(prev.riskData || {}).length > 0;
            const parsedRiskData = parsed.riskData || {};
            const hasNewRiskData = Object.keys(parsedRiskData).length > 0;
            
            // ✅ 고장분석 확정 상태 로드 디버깅
          console.log('[확정상태 로드] 원본 데이터:', {
            failureL1Confirmed: parsed.failureL1Confirmed,
            failureL2Confirmed: parsed.failureL2Confirmed,
            failureL3Confirmed: parsed.failureL3Confirmed,
            failureLinkConfirmed: parsed.failureLinkConfirmed,
          });
          
          return { 
              ...prev, 
              l1: migratedL1, 
              l2: migratedL2,
              failureLinks: parsed.failureLinks || [],
              // ✅ 기존 값이 있으면 유지, 새 값이 있으면 새 값 사용
              riskData: hasExistingRiskData ? prev.riskData : (hasNewRiskData ? parsedRiskData : prev.riskData),
              tab: parsed.tab || prev.tab,
              structureConfirmed: mergedConfirmed.structureConfirmed,
              l1Confirmed: mergedConfirmed.l1Confirmed,
              l2Confirmed: mergedConfirmed.l2Confirmed,
              l3Confirmed: mergedConfirmed.l3Confirmed,
              failureL1Confirmed: mergedConfirmed.failureL1Confirmed,
              failureL2Confirmed: mergedConfirmed.failureL2Confirmed,
              failureL3Confirmed: mergedConfirmed.failureL3Confirmed,
              failureLinkConfirmed: mergedConfirmed.failureLinkConfirmed,  // ✅ 고장연결 확정 상태 복원
              visibleSteps: prev.visibleSteps || [2, 3, 4, 5, 6],  // 기존 토글 상태 유지
            };
          });
          setDirty(false);
        } else {
          // ✅ 저장된 데이터가 있지만 비어있는 경우 - 프로젝트 정보로 초기화
          console.log('[워크시트] 저장된 데이터가 있지만 비어있음, 프로젝트 정보로 초기화');
          console.log('[워크시트] 프로젝트 L1 이름:', projectL1Name);
          
          const emptyDB = createEmptyDB(selectedFmeaId);
          setAtomicDB(emptyDB);
          
          setState(prev => ({
            ...prev,
            l1: { id: uid(), name: projectL1Name, types: [], failureScopes: [] },
            l2: [{
              id: uid(), no: '', name: '(클릭하여 공정 선택)', order: 10, functions: [], productChars: [],
              l3: [{ id: uid(), m4: '', name: '(공정 선택 후 작업요소 추가)', order: 10, functions: [], processChars: [] }]
            }],
            failureLinks: [],
            structureConfirmed: false
          }));
          setDirty(false);
        }
      } catch (e) {
        console.error('데이터 파싱 오류:', e);
      }
    } else {
      console.log('[워크시트] 저장된 데이터 없음, 초기화 진행');
      const emptyDB = createEmptyDB(selectedFmeaId);
      setAtomicDB(emptyDB);
      
      // FMEA 프로젝트 기초정보에서 L1 이름 가져오기
      let l1Name = '';
      try {
        const projectsData = localStorage.getItem('pfmea-projects');
        if (projectsData) {
          const projects = JSON.parse(projectsData);
          // ✅ 대소문자 무시 비교 (ID 일관성 문제 방지)
          const currentProject = projects.find((p: any) => 
            p.id?.toUpperCase() === selectedFmeaId.toUpperCase()
          );
          if (currentProject) {
            // fmeaInfo.subject (FMEA명) 사용
            l1Name = currentProject.fmeaInfo?.subject || currentProject.project?.productName || '';
            console.log('[기초정보 로드] FMEA명:', l1Name);
          }
        }
      } catch (e) {
        console.error('[기초정보 로드] 오류:', e);
      }
      
      setState(prev => ({
        ...prev,
        l1: { id: uid(), name: l1Name, types: [], failureScopes: [] },
        l2: [{
          id: uid(), no: '', name: '(클릭하여 공정 선택)', order: 10, functions: [], productChars: [],
          l3: [{ id: uid(), m4: '', name: '(공정 선택 후 작업요소 추가)', order: 10, functions: [], processChars: [] }]
        }],
        failureLinks: [],
        structureConfirmed: false
      }));
    }
    })(); // async 함수 닫기
  }, [selectedFmeaId]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveToLocalStorage(); }
  }, [saveToLocalStorage]);

  // ✅ 수정: dirty 체크 제거 - React state 비동기 업데이트로 인해 dirty가 false일 수 있음
  // onChange에서 setDirty(true)를 호출해도 onBlur 시점에 아직 반영 안됨
  const handleInputBlur = useCallback(() => { 
    saveToLocalStorage(); 
  }, [saveToLocalStorage]);

  const handleFmeaChange = useCallback((fmeaId: string) => {
    // FMEA 선택 변경 - 항상 기존 FMEA 로드
    if (fmeaId) {
      router.push(`/pfmea/worksheet?id=${fmeaId}`);
    }
  }, [router]);

  const handleSelect = useCallback((type: 'L1' | 'L2' | 'L3', id: string | null) => {
    setState(prev => ({ ...prev, selected: { type, id } }));
  }, []);

  const addL2 = useCallback(() => {
    const newProcess: Process = {
      id: uid(), no: '', name: '(클릭하여 공정 선택)', order: (state.l2.length + 1) * 10,
      functions: [], productChars: [],
      l3: [{ id: uid(), m4: '', name: '(공정 선택 후 작업요소 추가)', order: 10, functions: [], processChars: [] }]
    };
    setState(prev => ({ ...prev, l2: [...prev.l2, newProcess] }));
    setDirty(true);
  }, [state.l2.length]);

  const addL3 = useCallback((l2Id: string) => {
    const newElement: WorkElement = { 
      id: uid(), m4: '', name: '(클릭하여 작업요소 추가)', order: 10, 
      functions: [], processChars: [] 
    };
    setState(prev => ({
      ...prev,
      l2: prev.l2.map(p => p.id === l2Id ? { ...p, l3: [...p.l3, newElement] } : p)
    }));
    setDirty(true);
  }, []);

  const deleteL2 = useCallback((l2Id: string) => {
    if (state.l2.length <= 1) { 
      alert('최소 1개의 공정이 필요합니다.'); 
      return; 
    }
    setState(prev => ({ ...prev, l2: prev.l2.filter(p => p.id !== l2Id) }));
    setDirty(true);
  }, [state.l2.length]);

  const deleteL3 = useCallback((l2Id: string, l3Id: string) => {
    setState(prev => ({
      ...prev,
      l2: prev.l2.map(p => {
        if (p.id === l2Id) {
          if (p.l3.length <= 1) { 
            alert('최소 1개의 작업요소가 필요합니다.'); 
            return p; 
          }
          return { ...p, l3: p.l3.filter(w => w.id !== l3Id) };
        }
        return p;
      })
    }));
    setDirty(true);
  }, []);

  const handleProcessSelect = useCallback((selectedProcesses: Array<{ processNo: string; processName: string }>) => {
    // 중복 제거 (이름 기준) + 경고 메시지
    const duplicates = selectedProcesses.filter((p, idx, arr) => 
      arr.findIndex(x => x.processName === p.processName) !== idx
    );
    if (duplicates.length > 0) {
      const dupNames = [...new Set(duplicates.map(d => d.processName))].join(', ');
      alert(`⚠️ 중복 공정이 제거되었습니다: ${dupNames}`);
    }
    const uniqueProcesses = selectedProcesses.filter((p, idx, arr) => 
      arr.findIndex(x => x.processName === p.processName) === idx
    );
    const selectedNames = new Set(uniqueProcesses.map(p => p.processName));
    
    setState(prev => {
      const keptProcesses = prev.l2.filter(p => {
        if (!p.name || p.name.includes('클릭') || p.name.includes('선택')) {
          return false;
        }
        return selectedNames.has(p.name);
      });
      
      const existingNames = new Set(keptProcesses.map(p => p.name));
      const newProcesses: Process[] = uniqueProcesses
        .filter(p => !existingNames.has(p.processName))
        .map((p, idx) => ({
          id: uid(),
          no: p.processNo,
          name: p.processName,
          order: (keptProcesses.length + idx + 1) * 10,
          functions: [],
          productChars: [],
          l3: [{ id: uid(), m4: '', name: '(클릭하여 작업요소 추가)', order: 10, functions: [], processChars: [] }]
        }));
      
      const result = [...keptProcesses, ...newProcesses];
      
      if (result.length === 0) {
        return {
          ...prev,
          l2: [{
            id: uid(),
            no: '',
            name: '(클릭하여 공정 선택)',
            order: 10,
            functions: [],
            productChars: [],
            l3: [{ id: uid(), m4: '', name: '(공정 선택 후 작업요소 추가)', order: 10, functions: [], processChars: [] }]
          }]
        };
      }
      
      return { ...prev, l2: result };
    });
    setDirty(true);
  }, []);

  // 원자성 DB 기반 평탄화된 행 (고장연결 결과용)
  const flattenedRows = useMemo(() => {
    if (!atomicDB) return [];
    return flattenDB(atomicDB);
  }, [atomicDB]);

  // 레거시 평탄화 (기존 화면 호환)
  const rows = useMemo(() => {
    const result: FlatRow[] = [];
    const l2Data = state.l2 || [];
    if (l2Data.length === 0) return result;

    // failureLinks는 평가 탭에서만 사용 (구조분석/기능분석/고장분석 탭에서는 l2Data 사용)
    const currentTab = state.tab || '';
    const useFailureLinks = ['failure-link', 'eval-structure', 'eval-function', 'eval-failure', 'risk', 'opt', 'all'].includes(currentTab);
    const failureLinks = (state as any).failureLinks || [];
    
    if (useFailureLinks && failureLinks.length > 0) {
      const fmGroups = new Map<string, { fmId: string; fmText: string; fmProcess: string; fes: any[]; fcs: any[] }>();
      failureLinks.forEach((link: any) => {
        if (!fmGroups.has(link.fmId)) {
          fmGroups.set(link.fmId, { fmId: link.fmId, fmText: link.fmText, fmProcess: link.fmProcess, fes: [], fcs: [] });
        }
        const group = fmGroups.get(link.fmId)!;
        if (link.feId && !group.fes.some(f => f.id === link.feId)) {
          group.fes.push({ id: link.feId, scope: link.feScope, text: link.feText, severity: link.severity });
        }
        if (link.fcId && !group.fcs.some(f => f.id === link.fcId)) {
          group.fcs.push({ id: link.fcId, text: link.fcText, workElem: link.fcWorkElem, process: link.fcProcess });
        }
      });

      fmGroups.forEach((group) => {
        const maxRows = Math.max(group.fes.length, group.fcs.length, 1);
        for (let i = 0; i < maxRows; i++) {
          const fe = group.fes[i] || null;
          const fc = group.fcs[i] || null;
          
          let l1TypeId = '';
          let l1Type = fe?.scope || '';
          let l1FuncId = '';
          let l1Func = '';
          let l1ReqId = fe?.id || '';
          let l1Req = fe?.text || '';

          if (fe?.id) {
            state.l1.types.forEach(t => {
              t.functions.forEach(f => {
                const matchingReq = f.requirements.find(r => r.id === fe.id);
                if (matchingReq) {
                  l1TypeId = t.id;
                  l1Type = t.name;
                  l1FuncId = f.id;
                  l1Func = f.name;
                  l1ReqId = matchingReq.id;
                }
              });
            });
          }
          
          const proc = l2Data.find(p => p.name === group.fmProcess || p.name.includes(group.fmProcess));
          
          result.push({
            l1Id: state.l1.id,
            l1Name: state.l1.name,
            l1TypeId: l1TypeId,
            l1Type: l1Type,
            l1FunctionId: l1FuncId,
            l1Function: l1Func,
            l1RequirementId: l1ReqId,
            l1Requirement: l1Req,
            l1FailureEffect: fe?.text || '',
            l1Severity: fe?.severity?.toString() || '',
            l2Id: proc?.id || '',
            l2No: proc?.no || '',
            l2Name: proc?.name || group.fmProcess,
            l2Functions: proc?.functions || [],
            l2ProductChars: (proc?.functions || []).flatMap((f: any) => f.productChars || []),
            l2FailureMode: group.fmText,
            l3Id: '',
            m4: '',
            l3Name: fc?.workElem || '',
            l3Functions: [],
            l3ProcessChars: [],
            l3FailureCause: fc?.text || '',
          });
        }
      });
      return result;
    }

    // 기존 구조분석 방식
    let rowIdx = 0;
    const l1Types = state.l1?.types || [];
    const l1FlatData: { typeId: string; type: string; funcId: string; func: string; reqId: string; req: string }[] = [];
    l1Types.forEach(type => {
      const funcs = type.functions || [];
      if (funcs.length === 0) {
        l1FlatData.push({ typeId: type.id, type: type.name, funcId: '', func: '', reqId: '', req: '' });
      } else {
        funcs.forEach(fn => {
          const reqs = fn.requirements || [];
          if (reqs.length === 0) {
            l1FlatData.push({ typeId: type.id, type: type.name, funcId: fn.id, func: fn.name, reqId: '', req: '' });
          } else {
            reqs.forEach(req => {
              l1FlatData.push({ typeId: type.id, type: type.name, funcId: fn.id, func: fn.name, reqId: req.id, req: req.name });
            });
          }
        });
      }
    });

    l2Data.forEach(proc => {
      const l3Data = proc.l3 || [];
      if (l3Data.length === 0) {
        const l1Item = l1FlatData[rowIdx % Math.max(l1FlatData.length, 1)] || { typeId: '', type: '', funcId: '', func: '', reqId: '', req: '' };
        result.push({
          l1Id: state.l1.id, l1Name: state.l1.name,
          l1TypeId: l1Item.typeId, l1Type: l1Item.type,
          l1FunctionId: l1Item.funcId, l1Function: l1Item.func,
          l1RequirementId: l1Item.reqId, l1Requirement: l1Item.req,
          l1FailureEffect: '', l1Severity: '',
          l2Id: proc.id, l2No: proc.no, l2Name: proc.name, l2Functions: proc.functions || [],
          l2ProductChars: (proc.functions || []).flatMap((f: any) => f.productChars || []),
          l2FailureMode: (proc.failureModes || []).map((m: any) => m.name).join(', '),
          l3Id: '', m4: '', l3Name: '(작업요소 없음)', l3Functions: [], l3ProcessChars: [], l3FailureCause: ''
        });
        rowIdx++;
      } else {
        l3Data.forEach(we => {
          const l1Item = l1FlatData[rowIdx % Math.max(l1FlatData.length, 1)] || { typeId: '', type: '', funcId: '', func: '', reqId: '', req: '' };
          result.push({
            l1Id: state.l1.id, l1Name: state.l1.name,
            l1TypeId: l1Item.typeId, l1Type: l1Item.type,
            l1FunctionId: l1Item.funcId, l1Function: l1Item.func,
            l1RequirementId: l1Item.reqId, l1Requirement: l1Item.req,
            l1FailureEffect: '', l1Severity: '',
            l2Id: proc.id, l2No: proc.no, l2Name: proc.name, l2Functions: proc.functions || [],
            l2ProductChars: (proc.functions || []).flatMap((f: any) => f.productChars || []),
            l2FailureMode: (proc.failureModes || []).map((m: any) => m.name).join(', '),
            l3Id: we.id, m4: we.m4, l3Name: we.name,
            l3Functions: we.functions || [], l3ProcessChars: we.processChars || [],
            l3FailureCause: (we.failureCauses || []).map((c: any) => c.name).join(', ')
          });
          rowIdx++;
        });
      }
    });
    return result;
  }, [state.l1, state.l2, state.tab, (state as any).failureLinks]);

  const calculateSpans = (rows: FlatRow[], key: keyof FlatRow) => {
    const spans: number[] = [];
    let currentId = '';
    let spanStart = 0;
    rows.forEach((row, idx) => {
      const val = row[key] as string;
      if (val !== currentId || val === '') {
        if (currentId !== '') {
          for (let i = spanStart; i < idx; i++) spans[i] = i === spanStart ? idx - spanStart : 0;
        }
        currentId = val;
        spanStart = idx;
      }
    });
    for (let i = spanStart; i < rows.length; i++) spans[i] = i === spanStart ? rows.length - spanStart : 0;
    return spans;
  };

  const l1Spans = useMemo(() => rows.map((_, idx) => idx === 0 ? rows.length : 0), [rows]);
  const l1TypeSpans = useMemo(() => calculateSpans(rows, 'l1TypeId'), [rows]);
  const l1FuncSpans = useMemo(() => calculateSpans(rows, 'l1FunctionId'), [rows]);
  const l2Spans = useMemo(() => calculateSpans(rows, 'l2Id'), [rows]);

  return {
    state, setState, setStateSynced, dirty, setDirty, isSaving, lastSaved, fmeaList, currentFmea, selectedFmeaId, handleFmeaChange,
    rows, l1Spans, l1TypeSpans, l1FuncSpans, l2Spans,
    saveToLocalStorage,
    saveToLocalStorageOnly,
    handleInputKeyDown, handleInputBlur, handleSelect, addL2, addL3, deleteL2, deleteL3, handleProcessSelect,
    // 원자성 DB
    atomicDB, flattenedRows, saveAtomicDB,
  };
}
