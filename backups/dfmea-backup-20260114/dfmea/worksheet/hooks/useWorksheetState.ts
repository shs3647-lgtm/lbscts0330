/**
 * @file useWorksheetState.ts
 * @description FMEA 워크시트 상태 관리 Hook (원자성 DB 스키마 적용)
 * @version 2.0.0 - 원자성 관계형 DB 구조 적용
 */

'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

interface UseWorksheetStateReturn {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
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
  saveAtomicDB: () => void;
}

export function useWorksheetState(): UseWorksheetStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedFmeaId = searchParams.get('id');
  
  // ✅ 초기 상태는 항상 동일 (Hydration 오류 방지)
  const [state, setState] = useState<WorksheetState>(createInitialState);
  
  // ✅ 클라이언트에서만 localStorage에서 tab/riskData 복원 (마운트 후)
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
    
    // URL에서 FMEA ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const fmeaId = urlParams.get('id');
    if (!fmeaId) return;
    
    // 별도 키에서 tab과 riskData 읽기
    let savedTab = '';
    let savedRiskData: { [key: string]: number | string } = {};
    
    try {
      const tabStr = localStorage.getItem(`pfmea_tab_${fmeaId}`);
      if (tabStr) {
        savedTab = tabStr;
      }
    } catch (e) { /* ignore */ }
    
    try {
      const riskDataStr = localStorage.getItem(`pfmea_riskData_${fmeaId}`);
      if (riskDataStr) {
        savedRiskData = JSON.parse(riskDataStr);
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

  // ✅ state를 ref로 유지하여 saveToLocalStorage에서 항상 최신 값 사용
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 원자성 DB 저장
  const saveAtomicDB = useCallback(() => {
    if (!atomicDB) return;
    
    setIsSaving(true);
    try {
      // 현재 state를 원자성 DB로 마이그레이션
      const legacyData = {
        fmeaId: atomicDB.fmeaId,
        l1: state.l1,
        l2: state.l2,
        failureLinks: (state as any).failureLinks || [],
        structureConfirmed: (state as any).structureConfirmed || false,
        l1Confirmed: (state as any).l1Confirmed || false,
        l2Confirmed: (state as any).l2Confirmed || false,
        l3Confirmed: (state as any).l3Confirmed || false,
        failureL1Confirmed: (state as any).failureL1Confirmed || false,
        failureL2Confirmed: (state as any).failureL2Confirmed || false,
        failureL3Confirmed: (state as any).failureL3Confirmed || false,
      };
      
      const newAtomicDB = migrateToAtomicDB(legacyData);
      saveWorksheetDB(newAtomicDB).catch(e => console.error('[원자성 DB 저장] 오류:', e));
      setAtomicDB(newAtomicDB);
      
      console.log('[원자성 DB 저장] 완료:', {
        fmeaId: newAtomicDB.fmeaId,
        l2Structures: newAtomicDB.l2Structures.length,
        l3Structures: newAtomicDB.l3Structures.length,
        failureModes: newAtomicDB.failureModes.length,
        failureLinks: newAtomicDB.failureLinks.length,
      });
      
      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) {
      console.error('[원자성 DB 저장] 오류:', e);
    } finally {
      setIsSaving(false);
    }
  }, [atomicDB, state]);

  // 기존 호환 저장 함수 (레거시 + 원자성 동시 저장) - ✅ stateRef 사용으로 항상 최신 상태 저장
  const saveToLocalStorage = useCallback(() => {
    const targetId = selectedFmeaId || currentFmea?.id;
    if (!targetId) {
      console.warn('[저장] FMEA ID가 없어 저장할 수 없습니다.');
      return;
    }
    
    // ✅ 항상 최신 state 사용 (클로저 문제 해결)
    const currentState = stateRef.current;
    
    setIsSaving(true);
    try {
      // 1. 레거시 형식으로 저장 (하위호환)
      const failureScopesCount = (currentState.l1 as any).failureScopes?.length || 0;
      console.log('[저장 시작] failureScopes:', failureScopesCount, '개');
      
      const worksheetData = {
        fmeaId: targetId,
        l1: currentState.l1,
        l2: currentState.l2,
        tab: currentState.tab,
        structureConfirmed: (currentState as any).structureConfirmed || false,
        l1Confirmed: (currentState as any).l1Confirmed || false,
        l2Confirmed: (currentState as any).l2Confirmed || false,
        l3Confirmed: (currentState as any).l3Confirmed || false,
        failureL1Confirmed: (currentState as any).failureL1Confirmed || false,
        failureL2Confirmed: (currentState as any).failureL2Confirmed || false,
        failureL3Confirmed: (currentState as any).failureL3Confirmed || false,
        failureLinks: (currentState as any).failureLinks || [],
        riskData: currentState.riskData || {},  // ✅ 최신 riskData 저장
        savedAt: new Date().toISOString(),
      };
      
      console.log('[저장] 레거시 데이터 저장:', {
        l1Name: worksheetData.l1.name,
        failureScopesCount: (worksheetData.l1 as any).failureScopes?.length || 0,
        riskDataCount: Object.keys(worksheetData.riskData || {}).length,
        riskDataKeys: Object.keys(worksheetData.riskData || {}),
      });
      localStorage.setItem(`dfmea_worksheet_${targetId}`, JSON.stringify(worksheetData));
      
      // 2. 원자성 DB로도 저장
      const newAtomicDB = migrateToAtomicDB(worksheetData);
      console.log('[저장] 원자성 DB 변환 후:', {
        failureEffects: newAtomicDB.failureEffects.length,
        l1Functions: newAtomicDB.l1Functions.length,
      });
      saveWorksheetDB(newAtomicDB).catch(e => console.error('[저장] DB 저장 오류:', e));
      setAtomicDB(newAtomicDB);
      
      // 로그
      console.log('[저장] 워크시트 데이터 저장 완료:', targetId, '탭:', currentState.tab);
      console.log('[저장] 고장영향(failureScopes):', failureScopesCount, '개');
      console.log('[저장] 원자성 DB:', {
        l2Structs: newAtomicDB.l2Structures.length,
        l3Structs: newAtomicDB.l3Structures.length,
        failureEffects: newAtomicDB.failureEffects.length,
        failureModes: newAtomicDB.failureModes.length,
        failureLinks: newAtomicDB.failureLinks.length,
      });
      
      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) { 
      console.error('저장 오류:', e); 
    } finally { 
      setIsSaving(false); 
    }
  }, [selectedFmeaId, currentFmea?.id]);  // ✅ state 제거, stateRef 사용

  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToLocalStorage(), 500);
  }, [saveToLocalStorage]);

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

  // ✅ tab 변경 시 별도 키로 즉시 저장 (확실한 저장)
  const tabRef = useRef<string>('structure');
  useEffect(() => {
    const targetId = selectedFmeaId || currentFmea?.id;
    if (!targetId) return;
    
    if (state.tab !== tabRef.current) {
      tabRef.current = state.tab;
      console.log('[자동저장] tab 변경 감지:', state.tab);
      
      // ✅ 별도 키로 직접 저장 (확실한 저장)
      localStorage.setItem(`pfmea_tab_${targetId}`, state.tab);
      console.log('[저장완료] tab 저장:', `pfmea_tab_${targetId}`, state.tab);
      
      // 기존 워크시트 데이터에도 업데이트
      saveToLocalStorage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tab]);

  // FMEA 목록 로드 및 자동 선택
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem('pfmea-projects');
    if (stored) {
      try {
        const projects: FMEAProject[] = JSON.parse(stored);
        setFmeaList(projects);
        
        if (selectedFmeaId) {
          const found = projects.find(p => p.id === selectedFmeaId);
          if (found) setCurrentFmea(found);
        } else if (projects.length > 0) {
          setCurrentFmea(projects[0]);
          router.push(`/pfmea/worksheet?id=${projects[0].id}`);
        }
      } catch (e) { 
        console.error('FMEA 목록 로드 실패:', e); 
      }
    }
  }, [selectedFmeaId, router]);

  // 워크시트 데이터 로드 (FMEA ID 변경 시) - 원자성 DB 우선
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedFmeaId) return;
    
    console.log('[워크시트] 데이터 로드 시작:', selectedFmeaId);
    
    // 원자성 DB 로드 시도 (async)
    (async () => {
      const loadedDB = await loadWorksheetDB(selectedFmeaId);
      
      // 원자성 DB가 있고 (l1Structure 또는 failureEffects가 있으면 유효한 DB)
      if (loadedDB && (loadedDB.l1Structure || (loadedDB.failureEffects && loadedDB.failureEffects.length > 0) || loadedDB.l2Structures.length > 0)) {
      console.log('[워크시트] 원자성 DB 발견:', loadedDB);
      console.log('[워크시트] 원자성 DB 상태:', {
        l1Structure: !!loadedDB.l1Structure,
        l2Structures: loadedDB.l2Structures.length,
        failureEffects: loadedDB.failureEffects.length,
        failureModes: loadedDB.failureModes.length,
      });
      setAtomicDB(loadedDB);
      
      // 원자성 DB를 레거시 형식으로 변환하여 state에 적용
      const legacy = convertToLegacyFormat(loadedDB);
      
      // ✅ 레거시 데이터에서 tab과 riskData 가져오기 (원자성 DB에는 저장 안됨)
      const legacyKeys = [`dfmea_worksheet_${selectedFmeaId}`, `fmea-worksheet-${selectedFmeaId}`];
      let legacyTab = 'structure';
      let legacyRiskData: { [key: string]: number | string } = {};
      for (const key of legacyKeys) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            legacyTab = parsed.tab || 'structure';
            legacyRiskData = parsed.riskData || {};
            break;
          } catch (e) { /* ignore */ }
        }
      }
      
      console.log('[워크시트] 역변환된 레거시 데이터:', {
        l1Name: legacy.l1.name,
        failureScopesCount: (legacy.l1 as any).failureScopes?.length || 0,
        l2Count: legacy.l2.length,
        riskDataCount: Object.keys(legacyRiskData).length,
        tab: legacyTab,
      });
      
      // ✅ 기존 state의 tab/riskData가 있으면 유지 (초기화 함수에서 이미 설정됨)
      setState(prev => {
        const hasExistingRiskData = Object.keys(prev.riskData || {}).length > 0;
        const hasExistingTab = prev.tab && prev.tab !== 'structure';
        
        console.log('[setState] 기존 값 확인:', {
          existingTab: prev.tab,
          existingRiskDataCount: Object.keys(prev.riskData || {}).length,
          legacyTab,
          legacyRiskDataCount: Object.keys(legacyRiskData).length,
          useExistingTab: hasExistingTab,
          useExistingRiskData: hasExistingRiskData,
        });
        
        return { 
          ...prev, 
          l1: legacy.l1 as any, 
          l2: legacy.l2 as any,
          failureLinks: legacy.failureLinks || [],
          // ✅ 기존 값이 있으면 유지, 없으면 레거시에서 복원
          riskData: hasExistingRiskData ? prev.riskData : legacyRiskData,
          tab: hasExistingTab ? prev.tab : (legacyTab !== 'structure' ? legacyTab : prev.tab),
          structureConfirmed: legacy.structureConfirmed || false,
          l1Confirmed: legacy.l1Confirmed || false,
          l2Confirmed: legacy.l2Confirmed || false,
          l3Confirmed: legacy.l3Confirmed || false,
          failureL1Confirmed: legacy.failureL1Confirmed || false,
          failureL2Confirmed: legacy.failureL2Confirmed || false,
          failureL3Confirmed: legacy.failureL3Confirmed || false,
          visibleSteps: prev.visibleSteps || [2, 3, 4, 5, 6],  // 기존 토글 상태 유지
        };
      });
      setDirty(false);
      return;
    }
    
    // 레거시 데이터 로드 시도
    const keys = [`dfmea_worksheet_${selectedFmeaId}`, `fmea-worksheet-${selectedFmeaId}`];
    let savedData = null;
    for (const key of keys) {
      savedData = localStorage.getItem(key);
      if (savedData) break;
    }
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        console.log('[워크시트] 레거시 데이터 발견:', parsed);
        
        if (parsed.l1 && parsed.l2) {
          // 마이그레이션 및 방어 코드 - failureScopes 명시적 포함
          const migratedL1 = {
            ...parsed.l1,
            types: parsed.l1.types || [],
            failureScopes: parsed.l1.failureScopes || [] // 고장영향 데이터 보존
          };
          
          console.log('[데이터 로드] failureScopes:', (parsed.l1.failureScopes || []).length, '개');
          console.log('[데이터 로드] riskData:', Object.keys(parsed.riskData || {}).length, '개', parsed.riskData);
          
          const isEmptyValue = (val: string | undefined | null): boolean => {
            if (!val) return true;
            const trimmed = String(val).trim();
            return trimmed === '' || trimmed === '-';
          };
          
          const migratedL2 = parsed.l2
            .filter((p: any) => {
              const hasName = !isEmptyValue(p.name);
              const hasL3 = (p.l3 || []).length > 0;
              const hasFunctions = (p.functions || []).length > 0;
              return hasName || hasL3 || hasFunctions;
            })
            .map((p: any) => ({
              ...p,
              functions: p.functions || [],
              productChars: p.productChars || [],
              failureModes: p.failureModes || [], 
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
            }));
          
          console.log('[데이터 정리] 원본 공정 수:', parsed.l2.length, '→ 정리 후:', migratedL2.length);

          // 원자성 DB로 마이그레이션
          const atomicData = migrateToAtomicDB({
            fmeaId: selectedFmeaId,
            l1: migratedL1,
            l2: migratedL2,
            failureLinks: parsed.failureLinks || [],
            structureConfirmed: parsed.structureConfirmed,
            l1Confirmed: parsed.l1Confirmed,
            l2Confirmed: parsed.l2Confirmed,
            l3Confirmed: parsed.l3Confirmed,
            failureL1Confirmed: parsed.failureL1Confirmed,
            failureL2Confirmed: parsed.failureL2Confirmed,
            failureL3Confirmed: parsed.failureL3Confirmed,
          });
          setAtomicDB(atomicData);
          saveWorksheetDB(atomicData).catch(e => console.error('[마이그레이션] DB 저장 오류:', e));

          // ✅ 기존 state의 tab/riskData가 있으면 유지
          setState(prev => {
            const hasExistingRiskData = Object.keys(prev.riskData || {}).length > 0;
            const parsedRiskData = parsed.riskData || {};
            const hasNewRiskData = Object.keys(parsedRiskData).length > 0;
            
            return { 
              ...prev, 
              l1: migratedL1, 
              l2: migratedL2,
              failureLinks: parsed.failureLinks || [],
              // ✅ 기존 값이 있으면 유지, 새 값이 있으면 새 값 사용
              riskData: hasExistingRiskData ? prev.riskData : (hasNewRiskData ? parsedRiskData : prev.riskData),
              tab: parsed.tab || prev.tab,
              structureConfirmed: parsed.structureConfirmed || false,
              l1Confirmed: parsed.l1Confirmed || false,
              l2Confirmed: parsed.l2Confirmed || false,
              l3Confirmed: parsed.l3Confirmed || false,
              failureL1Confirmed: parsed.failureL1Confirmed || false,
              failureL2Confirmed: parsed.failureL2Confirmed || false,
              failureL3Confirmed: parsed.failureL3Confirmed || false,
              visibleSteps: prev.visibleSteps || [2, 3, 4, 5, 6],  // 기존 토글 상태 유지
            };
          });
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
          const currentProject = projects.find((p: any) => p.id === selectedFmeaId);
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

  const handleInputBlur = useCallback(() => { 
    if (dirty) saveToLocalStorage(); 
  }, [dirty, saveToLocalStorage]);

  const handleFmeaChange = useCallback((fmeaId: string) => {
    if (fmeaId === '__NEW__') {
      setState(createInitialState());
      setAtomicDB(null);
      setCurrentFmea(null);
      setDirty(false);
      router.push('/pfmea/worksheet');
    } else { 
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
    const selectedNames = new Set(selectedProcesses.map(p => p.processName));
    
    setState(prev => {
      const keptProcesses = prev.l2.filter(p => {
        if (!p.name || p.name.includes('클릭') || p.name.includes('선택')) {
          return false;
        }
        return selectedNames.has(p.name);
      });
      
      const existingNames = new Set(keptProcesses.map(p => p.name));
      const newProcesses: Process[] = selectedProcesses
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
    state, setState, dirty, setDirty, isSaving, lastSaved, fmeaList, currentFmea, selectedFmeaId, handleFmeaChange,
    rows, l1Spans, l1TypeSpans, l1FuncSpans, l2Spans,
    saveToLocalStorage, handleInputKeyDown, handleInputBlur, handleSelect, addL2, addL3, deleteL2, deleteL3, handleProcessSelect,
    // 원자성 DB
    atomicDB, flattenedRows, saveAtomicDB,
  };
}
