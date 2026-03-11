// @ts-nocheck
/**
 * @file FailureLinkTab.tsx
 * @description 고장연결 탭 - FM 중심 연결 관리 (전면 재작성 버전)
 * 
 * 핵심 구조:
 * - FE(고장영향): L1.failureScopes에서 추출
 * - FM(고장형태): L2.failureModes에서 추출
 * - FC(고장원인): L3.failureCauses에서 추출
 * - 연결: FM을 중심으로 FE와 FC를 연결 (1:N 관계)
 * 
 * 데이터 구조 (정규화):
 * failureLinks: Array<{
 *   fmId: string;      // FK: L2.failureModes.id
 *   fmText: string;    // 고장형태 텍스트
 *   fmProcess: string; // A'SSY명 (DFMEA)
 *   feId: string;      // FK: L1.failureScopes.id (빈 문자열 가능)
 *   feText: string;    // 고장영향 텍스트
 *   feScope: string;   // 구분 (Your Plant/Ship to Plant/User)
 *   severity: number;  // 심각도
 *   fcId: string;      // FK: L3.failureCauses.id (빈 문자열 가능)
 *   fcText: string;    // 고장원인 텍스트
 *   fcProcess: string; // A'SSY명 (DFMEA)
 *   fcWorkElem: string;// 부품 또는 특성명 (DFMEA: 4M 제거됨)
 * }>
 */

'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { FailureTabProps } from './types';
import { uid, COLORS, FONT_SIZES } from '../../constants';
import { groupFailureLinksByFM, calculateLastRowMerge } from '../../utils';
import FailureLinkTables from './FailureLinkTables';
import FailureLinkDiagram from './FailureLinkDiagram';
import FailureLinkResult from './FailureLinkResult';
import { useSVGLines } from './hooks/useSVGLines';
import { 
  containerStyle, rightPanelStyle, rightHeaderStyle, modeButtonStyle, 
  resultButtonStyle, fmeaNameStyle, actionButtonGroupStyle, actionButtonStyle
} from './FailureLinkStyles';
import { saveToAIHistory } from '@/lib/ai-recommendation';

// 타입 정의
interface FEItem { 
  id: string; 
  scope: string; 
  feNo: string; 
  text: string; 
  severity?: number;
  // ★ 역전개 정보
  functionName?: string;
  requirement?: string; 
}

interface FMItem { 
  id: string; 
  fmNo: string; 
  processName: string; 
  text: string;
  // ★ 역전개 정보 (공정기능, 제품특성)
  processFunction?: string;  // 공정기능
  productChar?: string;      // 제품특성
}

interface FCItem { 
  id: string; 
  fcNo: string; 
  processName: string; 
  m4: string; 
  workElem: string; 
  text: string;
  // ★ 역전개 정보 (작업요소 기능, 공정특성)
  workFunction?: string;  // 작업요소 기능
  processChar?: string;   // 공정특성
}

interface LinkResult { 
  fmId: string; 
  feId: string; 
  feNo: string; 
  feScope: string; 
  feText: string; 
  severity: number; 
  // ★ FE 역전개 정보
  feFunctionName?: string;
  feRequirement?: string;
  fmText: string; 
  fmProcess: string; 
  fcId: string; 
  fcNo: string; 
  fcProcess: string; 
  fcM4: string; 
  fcWorkElem: string; 
  fcText: string;
  // ★ FC 역전개 정보
  fcWorkFunction?: string;  // 작업요소 기능
  fcProcessChar?: string;   // 공정특성
}

export default function FailureLinkTab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveToLocalStorageOnly, saveAtomicDB }: FailureTabProps) {
  // ========== 상태 관리 ==========
  const [currentFMId, setCurrentFMId] = useState<string | null>(null);
  const [linkedFEs, setLinkedFEs] = useState<Map<string, FEItem>>(new Map());
  const [linkedFCs, setLinkedFCs] = useState<Map<string, FCItem>>(new Map());
  const [savedLinks, setSavedLinks] = useState<LinkResult[]>([]);
  const [editMode, setEditMode] = useState<'edit' | 'confirm'>('edit');
  const [viewMode, setViewMode] = useState<'diagram' | 'result'>('diagram');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  const [fcLinkScope, setFcLinkScope] = useState<'current' | 'all'>('current');
  
  // 고장연결 확정 상태
  const isConfirmed = (state as any).failureLinkConfirmed || false;
  
  // Refs
  const chainAreaRef = useRef<HTMLDivElement>(null);
  const fmNodeRef = useRef<HTMLDivElement>(null);
  const feColRef = useRef<HTMLDivElement>(null);
  const fcColRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  // ✅ 연결확정 직후 useEffect가 linkedFEs/linkedFCs를 덮어쓰지 않도록 방지
  const justConfirmedRef = useRef(false);

  // ========== 초기 데이터 로드 (화면 전환 시에도 항상 복원) ==========
  const stateFailureLinksJson = JSON.stringify((state as any).failureLinks || []);
  useEffect(() => {
    const stateLinks = (state as any).failureLinks || [];
    // ✅ 수정: state.failureLinks가 있으면 항상 복원 (savedLinks와 비교하여 중복 방지)
    if (stateLinks.length > 0 && stateLinks.length !== savedLinks.length) {
      console.log('[FailureLinkTab] ✅ 데이터 복원: state.failureLinks →', stateLinks.length, '개');
      setSavedLinks(stateLinks);
      isInitialLoad.current = false;
    } else if (stateLinks.length > 0 && isInitialLoad.current) {
      console.log('[FailureLinkTab] ✅ 초기 로드: state.failureLinks →', stateLinks.length, '개');
      setSavedLinks(stateLinks);
      isInitialLoad.current = false;
    }
  }, [stateFailureLinksJson]); // ✅ JSON 문자열로 깊은 비교

  // ✅ 성능 최적화: 편집 중에는 localStorage만 저장, 전체확정에서만 DB 저장
  const saveTemp = saveToLocalStorageOnly ?? saveToLocalStorage;

  // ========== savedLinks 변경 시 자동 동기화 + 저장 ==========
  const savedLinksJson = JSON.stringify(savedLinks);
  const prevSavedLinksRef = useRef<string>('[]');
  const saveCompletedRef = useRef(true);  // ✅ 저장 완료 여부 추적
  useEffect(() => {
    // 초기 로드 시에는 스킵 (무한 루프 방지)
    if (isInitialLoad.current) return;
    
    // 이전 값과 동일하면 스킵
    if (savedLinksJson === prevSavedLinksRef.current) return;
    prevSavedLinksRef.current = savedLinksJson;
    saveCompletedRef.current = false;  // ✅ 저장 필요 표시
    
    // savedLinks가 변경되면 state에 동기화
    console.log('[FailureLinkTab] 🔄 savedLinks 변경 감지:', savedLinks.length, '건 → state 동기화');
    
    // ✅ setStateSynced 사용하여 stateRef 즉시 동기화 (핵심 수정!)
    const updateFn = (prev: any) => {
      const currentLinks = prev.failureLinks || [];
      if (JSON.stringify(currentLinks) === savedLinksJson) {
        return prev;
      }
      return { ...prev, failureLinks: savedLinks };
    };
    
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    
    setDirty(true);
    
    // ✅ 변경 시 자동 저장 (debounce)
    const saveTimer = setTimeout(() => {
      saveTemp?.();
      saveCompletedRef.current = true;  // ✅ 저장 완료 표시
      console.log('[FailureLinkTab] ✅ 자동 저장 완료:', savedLinks.length, '건');
    }, 300);
    
    // ✅ cleanup에서 저장이 아직 안 됐으면 즉시 저장 (탭 이동 시 데이터 손실 방지!)
    return () => {
      clearTimeout(saveTimer);
      if (!saveCompletedRef.current) {
        saveTemp?.();
        saveCompletedRef.current = true;
        console.log('[FailureLinkTab] ⚠️ cleanup 즉시 저장:', savedLinks.length, '건');
      }
    };
  }, [savedLinksJson, setState, setStateSynced, setDirty, saveTemp, savedLinks]);

  // ========== FE 데이터 추출 (확정된 것만 사용 + 중복 제거) ==========
  const isL1Confirmed = state.failureL1Confirmed || false;
  
  const feData: FEItem[] = useMemo(() => {
    // ✅ 핵심: 1L 고장영향 분석이 확정되지 않으면 FE 데이터 반환 안함
    if (!isL1Confirmed) {
      console.log('[FE 데이터] 1L 고장분석 미확정 → 빈 배열 반환');
      return [];
    }
    
    const items: FEItem[] = [];
    const seen = new Set<string>(); // 구분+고장영향 조합으로 중복 체크
    const counters: Record<string, number> = { 'Your Plant': 0, 'Ship to Plant': 0, 'User': 0 };
    
    (state.l1?.failureScopes || []).forEach((fs: any) => {
      if (!fs.effect || !fs.id) return;
      
      // ★ 역전개: reqId로 구분/완제품기능/요구사항 찾기
      let scope = 'Your Plant';
      let functionName = '';
      let requirement = '';
      if (fs.reqId) {
        (state.l1?.types || []).forEach((type: any) => {
          (type.functions || []).forEach((fn: any) => {
            (fn.requirements || []).forEach((req: any) => {
              if (req.id === fs.reqId) {
                scope = type.name || 'Your Plant';
                functionName = fn.name || '';
                requirement = req.name || '';
              }
            });
          });
        });
      }
      
      // 중복 체크: 동일 구분 + 동일 고장영향은 하나로 통합
      const key = `${scope}|${fs.effect}`;
      if (seen.has(key)) {
        console.log('[FE 중복 제거]', scope, '-', fs.effect);
        return; // 중복이면 스킵
      }
      seen.add(key);
      
      // 번호 생성 (Your Plant → Y, Ship to Plant → S, User → U)
      const getPrefix = (s: string) => {
        if (s === 'Your Plant' || s === 'YP' || s.startsWith('Y')) return 'Y';
        if (s === 'Ship to Plant' || s === 'SP' || s.startsWith('S')) return 'S';
        if (s === 'User' || s.startsWith('U')) return 'U';
        return 'U'; // 기본값 User
      };
      const prefix = getPrefix(scope);
      counters[scope] = (counters[scope] || 0) + 1;
      const feNo = `${prefix}${counters[scope]}`;
      
      items.push({ 
        id: fs.id, 
        scope, 
        feNo, 
        text: fs.effect, 
        severity: fs.severity || 0,
        // ★ 역전개 정보 추가
        functionName,
        requirement,
      });
    });
    
    // ✅ 정렬: Your Plant → Ship to Plant → User 순서
    const scopeOrder: Record<string, number> = { 'Your Plant': 0, 'YP': 0, 'Ship to Plant': 1, 'SP': 1, 'User': 2 };
    items.sort((a, b) => (scopeOrder[a.scope] ?? 9) - (scopeOrder[b.scope] ?? 9));
    
    console.log('[FE 데이터]', items.length, '개 (확정됨 + 중복 제거됨 + 정렬됨):', items.map(f => `${f.feNo}:${f.text.substring(0, 20)}`));
    console.log('[FE 데이터] 심각도 확인:', items.map(f => ({ feNo: f.feNo, severity: f.severity })));
    return items;
  }, [state.l1, isL1Confirmed]);

  // ========== FM 데이터 추출 (확정된 것만 사용 + 중복 제거) ==========
  const isL2Confirmed = state.failureL2Confirmed || false;
  
  const fmData: FMItem[] = useMemo(() => {
    // ✅ 핵심: 2L 고장형태 분석이 확정되지 않으면 FM 데이터 반환 안함
    if (!isL2Confirmed) {
      console.log('[FM 데이터] 2L 고장분석 미확정 → 빈 배열 반환');
      return [];
    }
    
    const items: FMItem[] = [];
    const seen = new Set<string>(); // 공정명+고장형태 조합으로 중복 체크
    let counter = 1;
    
    (state.l2 || []).forEach((proc: any) => {
      if (!proc.name || proc.name.includes('클릭')) return;
      
      (proc.failureModes || []).forEach((fm: any) => {
        if (!fm.name || fm.name.includes('클릭') || fm.name.includes('추가')) return;
        if (!fm.id) fm.id = uid(); // ID 보장
        
        // 중복 체크: 동일 공정 + 동일 고장형태는 하나로 통합
        const key = `${proc.name}|${fm.name}`;
        if (seen.has(key)) {
          console.log('[FM 중복 제거]', proc.name, '-', fm.name);
          return; // 중복이면 스킵
        }
        seen.add(key);
        
        // ★ 역전개: productCharId로 제품특성 → 공정기능 역추적
        let processFunction = '';
        let productChar = '';
        if (fm.productCharId) {
          (proc.functions || []).forEach((fn: any) => {
            (fn.productChars || []).forEach((pc: any) => {
              if (pc.id === fm.productCharId) {
                processFunction = fn.name || '';
                productChar = pc.name || '';
              }
            });
          });
        }
        // fallback: 첫 번째 function과 productChar 사용
        if (!processFunction && (proc.functions || []).length > 0) {
          const firstFunc = proc.functions[0];
          processFunction = firstFunc.name || '';
          if ((firstFunc.productChars || []).length > 0) {
            productChar = firstFunc.productChars[0].name || '';
          }
        }
        
        items.push({ 
          id: fm.id, 
          fmNo: `M${counter}`, 
          processName: proc.name, 
          text: fm.name,
          // ★ 역전개 정보
          processFunction,
          productChar,
        });
        counter++;
      });
    });
    
    console.log('[FM 데이터]', items.length, '개 (확정됨 + 중복 제거됨):', items.map(f => `${f.fmNo}:${f.text.substring(0, 20)}`));
    return items;
  }, [state.l2, isL2Confirmed]);

  // ========== FC 데이터 추출 (확정된 것만 사용 + 중복 제거) ==========
  // ✅ FailureL3Tab.tsx의 flatRows 로직과 동일하게 공정특성 기준으로 추출
  const isL3Confirmed = state.failureL3Confirmed || false;
  
  const fcData: FCItem[] = useMemo(() => {
    // ✅ 핵심: 3L 고장원인 분석이 확정되지 않으면 FC 데이터 반환 안함
    if (!isL3Confirmed) {
      console.log('[FC 데이터] 3L 고장분석 미확정 → 빈 배열 반환');
      return [];
    }
    
    const items: FCItem[] = [];
    const seen = new Set<string>(); // 공정명+작업요소+고장원인 조합으로 중복 체크
    let counter = 1;
    
    // ✅ 의미 있는 이름인지 확인하는 헬퍼 함수
    const isMeaningful = (name: string) => {
      if (!name || name.trim() === '') return false;
      const placeholders = ['클릭', '선택', '입력', '추가', '필요', '기능분석에서'];
      return !placeholders.some(p => name.includes(p));
    };
    
    const processes = (state.l2 || []).filter((p: any) => p.name && !p.name.includes('클릭'));
    
    processes.forEach((proc: any) => {
      const allCauses = proc.failureCauses || [];  // 공정 레벨에 저장된 고장원인
      const workElements = (proc.l3 || []).filter((we: any) => we.name && !we.name.includes('클릭'));
      
      // ✅ 공정특성 기준으로 순회 (FailureL3Tab.tsx와 동일)
      workElements.forEach((we: any) => {
        const weName = we.name || '';
        const m4 = we.m4 || we.fourM || 'MN';
        
        // 의미 있는 공정특성 수집
        const functions = we.functions || [];
        const allProcessChars: any[] = [];
        
        functions.forEach((f: any) => {
          if (!isMeaningful(f.name)) return;
          (f.processChars || []).forEach((pc: any) => {
            if (!isMeaningful(pc.name)) return;
            allProcessChars.push({ ...pc, funcId: f.id, funcName: f.name });
          });
        });
        
        // 각 공정특성에 연결된 고장원인 추출
        allProcessChars.forEach((pc: any) => {
          const linkedCauses = allCauses.filter((c: any) => c.processCharId === pc.id);
          
          linkedCauses.forEach((fc: any) => {
            if (!isMeaningful(fc.name)) return;
            if (!fc.id) fc.id = uid();
            
            const key = `${proc.name}|${weName}|${fc.name}`;
            if (seen.has(key)) return;
            seen.add(key);
            
            items.push({ 
              id: fc.id, 
              fcNo: `C${counter}`, 
              processName: proc.name, 
              m4, 
              workElem: weName, 
              text: fc.name,
              // ★ 역전개 정보
              workFunction: pc.funcName || '',  // 작업요소 기능
              processChar: pc.name || '',       // 공정특성
            });
            counter++;
          });
        });
      });
      
      // ✅ 하위호환: processCharId가 없는 고장원인 (기존 we.failureCauses 구조)
      workElements.forEach((we: any) => {
        const weName = we.name || '';
        const m4 = we.m4 || we.fourM || 'MN';
        
        (we.failureCauses || []).forEach((fc: any) => {
          if (!isMeaningful(fc.name)) return;
          if (!fc.id) fc.id = uid();
          
          const key = `${proc.name}|${weName}|${fc.name}`;
          if (seen.has(key)) return;
          seen.add(key);
          
          items.push({ 
            id: fc.id, 
            fcNo: `C${counter}`, 
            processName: proc.name, 
            m4, 
            workElem: weName, 
            text: fc.name 
          });
          counter++;
        });
      });
    });
    
    console.log('[FC 데이터]', items.length, '개 (확정됨 + 중복 제거됨):', items.map(f => `${f.fcNo}:${f.text.substring(0, 20)}`));
    return items;
  }, [state.l2, isL3Confirmed]);

  // ========== savedLinks 보강 (ID만 있는 경우 텍스트 복원) ==========
  const fmById = useMemo(() => new Map(fmData.map(fm => [fm.id, fm])), [fmData]);
  const feById = useMemo(() => new Map(feData.map(fe => [fe.id, fe])), [feData]);
  const fcById = useMemo(() => new Map(fcData.map(fc => [fc.id, fc])), [fcData]);
  const rawFmById = useMemo(() => {
    const map = new Map<string, { text: string; processName: string }>();
    (state.l2 || []).forEach((proc: any) => {
      (proc.failureModes || []).forEach((fm: any) => {
        if (!fm?.id) return;
        // name 또는 mode 필드에서 텍스트 추출
        const text = fm.name || fm.mode || '';
        map.set(fm.id, { text, processName: proc.name || '' });
      });
    });
    console.log('[rawFmById] FM 맵 구축:', map.size, '개');
    return map;
  }, [state.l2]);
  const rawFeById = useMemo(() => {
    const map = new Map<string, { text: string; scope: string; severity?: number }>();
    const types = state.l1?.types || [];
    (state.l1?.failureScopes || []).forEach((fs: any) => {
      if (!fs?.id) return;
      let scope = fs.scope || fs.category || '';
      if (!scope && fs.reqId) {
        types.forEach((type: any) => {
          (type.functions || []).forEach((fn: any) => {
            (fn.requirements || []).forEach((req: any) => {
              if (req.id === fs.reqId) {
                scope = type.name || scope;
              }
            });
          });
        });
      }
      map.set(fs.id, { text: fs.effect || '', scope, severity: fs.severity });
    });
    return map;
  }, [state.l1]);
  const rawFcById = useMemo(() => {
    const map = new Map<string, { text: string; processName: string }>();
    (state.l2 || []).forEach((proc: any) => {
      // 1. 공정 레벨의 failureCauses
      (proc.failureCauses || []).forEach((fc: any) => {
        if (!fc?.id) return;
        map.set(fc.id, { text: fc.name || '', processName: proc.name || '' });
      });
      // 2. 작업요소(l3) 레벨의 failureCauses (하위호환)
      (proc.l3 || []).forEach((we: any) => {
        (we.failureCauses || []).forEach((fc: any) => {
          if (!fc?.id || map.has(fc.id)) return;
          map.set(fc.id, { text: fc.name || '', processName: proc.name || '' });
        });
        // 3. 공정특성(processChars) 레벨의 failureCauses
        (we.functions || []).forEach((fn: any) => {
          (fn.processChars || []).forEach((pc: any) => {
            (pc.failureCauses || []).forEach((fc: any) => {
              if (!fc?.id || map.has(fc.id)) return;
              map.set(fc.id, { text: fc.name || '', processName: proc.name || '' });
            });
          });
        });
      });
    });
    console.log('[rawFcById] FC 맵 구축:', map.size, '개');
    return map;
  }, [state.l2]);
  const enrichedLinks = useMemo(() => {
    // 텍스트 복원 통계
    let restoredFmCount = 0, restoredFeCount = 0, restoredFcCount = 0;
    
    const result = savedLinks.map(link => {
      const fm = fmById.get(link.fmId) ?? rawFmById.get(link.fmId);
      const fe = feById.get(link.feId) ?? rawFeById.get(link.feId);
      const fc = fcById.get(link.fcId) ?? rawFcById.get(link.fcId);
      
      // 텍스트 복원 여부 추적
      const needFmRestore = !link.fmText && fm?.text;
      const needFeRestore = !link.feText && fe?.text;
      const needFcRestore = !link.fcText && fc?.text;
      
      if (needFmRestore) restoredFmCount++;
      if (needFeRestore) restoredFeCount++;
      if (needFcRestore) restoredFcCount++;
      
      return {
        ...link,
        fmText: link.fmText || fm?.text || '',
        fmProcess: link.fmProcess || fm?.processName || '',
        feNo: link.feNo || fe?.feNo || '',
        feScope: link.feScope || fe?.scope || '',
        feText: link.feText || fe?.text || '',
        severity: link.severity ?? fe?.severity ?? 0,
        fcNo: link.fcNo || fc?.fcNo || '',
        fcProcess: link.fcProcess || fc?.processName || '',
        fcM4: link.fcM4 || fc?.m4 || '',
        fcWorkElem: link.fcWorkElem || fc?.workElem || '',
        fcText: link.fcText || fc?.text || '',
      };
    });
    
    // 복원 결과 로그
    if (savedLinks.length > 0) {
      console.log('[enrichedLinks] 텍스트 복원:', {
        totalLinks: savedLinks.length,
        restoredFm: restoredFmCount,
        restoredFe: restoredFeCount,
        restoredFc: restoredFcCount,
        fmMapSize: rawFmById.size,
        feMapSize: rawFeById.size,
        fcMapSize: rawFcById.size,
        sampleLink: result[0] ? {
          fmId: result[0].fmId,
          fmText: result[0].fmText?.substring(0, 20),
          feText: result[0].feText?.substring(0, 20),
          fcText: result[0].fcText?.substring(0, 20),
        } : null,
      });
    }
    
    return result;
  }, [savedLinks, fmById, feById, fcById, rawFmById, rawFeById, rawFcById]);

  useEffect(() => {
    if (savedLinks.length === 0) return;
    const nextJson = JSON.stringify(enrichedLinks);
    if (nextJson !== savedLinksJson) {
      setSavedLinks(enrichedLinks);
    }
  }, [savedLinksJson, savedLinks.length, enrichedLinks]);

  // ========== 현재 선택된 FM ==========
  const currentFM = useMemo(() => fmData.find(f => f.id === currentFMId), [fmData, currentFMId]);

  // ========== viewMode 초기화 (5ST/6ST/ALL 버튼으로 들어온 경우 result 화면 표시) ==========
  useEffect(() => {
    const requestedViewMode = (state as any).failureLinkViewMode;
    if (requestedViewMode === 'result') {
      setViewMode('result');
      setSelectedProcess('all');
      // ✅ failureLinkViewMode 플래그 초기화 (한 번만 적용)
      setState((prev: any) => {
        const { failureLinkViewMode, ...rest } = prev;
        return rest;
      });
      console.log('[FailureLinkTab] 5ST/6ST/ALL 버튼으로 전체 화면 표시');
    }
  }, [(state as any).failureLinkViewMode, setState]);

  // ========== 첫 번째 FM 자동 선택 (고장사슬 기본 표시) ==========
  useEffect(() => {
    // FM 데이터가 있고 현재 선택된 FM이 없으면 첫 번째 FM 자동 선택 (diagram 모드일 때만)
    if (viewMode === 'diagram' && fmData.length > 0 && !currentFMId) {
      const firstFM = fmData[0];
      console.log('[FailureLinkTab] 첫 번째 FM 자동 선택:', firstFM.fmNo, firstFM.text);
      setCurrentFMId(firstFM.id);
      setSelectedProcess(firstFM.processName);
    }
  }, [fmData, currentFMId, viewMode]);

  // ========== SVG 연결선 ==========
  const { svgPaths, drawLines } = useSVGLines(
    chainAreaRef, fmNodeRef, feColRef, fcColRef, linkedFEs, linkedFCs, currentFM
  );

  // ========== FE 더블클릭 (연결 해제) - FC와 동일한 패턴 ==========
  const unlinkFE = useCallback((id: string) => {
    const fe = feData.find(f => f.id === id);
    if (!fe) {
      console.log('[unlinkFE] FE를 찾을 수 없음:', id);
      return;
    }
    
    console.log('[unlinkFE 시작]', { feId: id, feText: fe.text, currentFMId });
    
    // 1. 먼저 linkedFEs (미저장 상태)에서 제거 시도
    let removedFromLinked = false;
    setLinkedFEs(prev => {
      if (prev.has(id)) {
        const next = new Map(prev);
        next.delete(id);
        console.log('[FE 선택 해제] linkedFEs에서 제거:', fe.text);
        removedFromLinked = true;
        return next;
      }
      return prev;
    });
    
    // 2. savedLinks에서 해당 FE와 관련된 연결 모두 찾기 (현재 FM 기준)
    // ✅ ID만 사용 (텍스트 기반 매칭 완전 제거)
    if (currentFMId) {
      const existingLinks = savedLinks.filter(l => 
        l.fmId === currentFMId && l.feId === id
      );
      
      console.log('[unlinkFE] 기존 연결 검색:', existingLinks.length, '개 발견');
      
      if (existingLinks.length > 0) {
        // 연결 해제 (ID만 사용)
        const filtered = savedLinks.filter(l => 
          !(l.fmId === currentFMId && l.feId === id)
        );
        
        console.log('[FE 연결 해제 (더블클릭)]', fe.text, 'from FM:', currentFMId, '| 제거:', existingLinks.length, '개');
        
        setSavedLinks(filtered);
        setState((prev: any) => ({ ...prev, failureLinks: filtered }));
        setDirty(true);
        requestAnimationFrame(() => {
          saveTemp?.(); // ✅ 편집 중: localStorage만
        });
        
        alert(`✅ "${fe.text}" 연결이 해제되었습니다.`);
      } else if (!removedFromLinked) {
        console.log('[unlinkFE] 현재 FM과 연결 없음');
      }
    } else {
      if (!removedFromLinked) {
        alert('⚠️ 고장형태(FM)를 먼저 선택해주세요.');
      }
    }
    
    setTimeout(drawLines, 50);
  }, [currentFMId, feData, savedLinks, setState, setDirty, saveToLocalStorage, saveAtomicDB, drawLines]);

  // ========== viewMode 변경 시 화살표 다시 그리기 ==========
  useEffect(() => {
    if (viewMode === 'diagram') {
      // diagram 모드로 전환 시 화살표 다시 그리기 (여러 타이밍)
      const timer1 = setTimeout(drawLines, 100);
      const timer2 = setTimeout(drawLines, 300);
      const timer3 = setTimeout(drawLines, 500);
      const timer4 = setTimeout(drawLines, 1000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [viewMode, drawLines]);

  // ========== 컴포넌트 마운트/탭 전환 시 화살표 다시 그리기 ==========
  useEffect(() => {
    // 컴포넌트가 마운트될 때 화살표 그리기 (탭 전환 후)
    const timer1 = setTimeout(drawLines, 100);
    const timer2 = setTimeout(drawLines, 300);
    const timer3 = setTimeout(drawLines, 500);
    const timer4 = setTimeout(drawLines, 1000);
    const timer5 = setTimeout(drawLines, 2000);
    
    console.log('[FailureLinkTab] 컴포넌트 마운트, 화살표 그리기 예약');
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 한 번만 실행

  // ========== 연결 통계 계산 ==========
  const linkStats = useMemo(() => {
    // ✅ ID 기반으로만 연결 확인 (텍스트 매칭 완전 제거)
    const feLinkedIds = new Set<string>();
    const fcLinkedIds = new Set<string>();
    const fmLinkedIds = new Set<string>();
    const fmLinkCounts = new Map<string, { feCount: number; fcCount: number }>();
    
    savedLinks.forEach(link => {
      if (link.fmId) fmLinkedIds.add(link.fmId);
      if (link.feId && link.feId.trim() !== '') feLinkedIds.add(link.feId);
      if (link.fcId && link.fcId.trim() !== '') fcLinkedIds.add(link.fcId);
      
      // FM별 연결 카운트 (ID만 확인)
      if (!fmLinkCounts.has(link.fmId)) {
        fmLinkCounts.set(link.fmId, { feCount: 0, fcCount: 0 });
      }
      const counts = fmLinkCounts.get(link.fmId)!;
      
      // FE 카운트: feId만 확인
      if (link.feId && link.feId.trim() !== '') {
        counts.feCount++;
      }
      
      // FC 카운트: fcId만 확인
      if (link.fcId && link.fcId.trim() !== '') {
        counts.fcCount++;
      }
    });
    
    // ✅ ID 기반으로만 카운트 (텍스트/번호 매칭 완전 제거)
    const feLinkedCount = feData.filter(fe => feLinkedIds.has(fe.id)).length;
    const fcLinkedCount = fcData.filter(fc => fcLinkedIds.has(fc.id)).length;
    const fmLinkedCount = fmData.filter(fm => fmLinkedIds.has(fm.id)).length;
    
    return {
      feLinkedIds, feLinkedTexts: new Set<string>(), feLinkedCount, feMissingCount: feData.length - feLinkedCount,
      fcLinkedIds, fcLinkedTexts: new Set<string>(), fcLinkedCount, fcMissingCount: fcData.length - fcLinkedCount,
      fmLinkedIds, fmLinkedCount, fmMissingCount: fmData.length - fmLinkedCount,
      fmLinkCounts
    };
  }, [savedLinks, feData, fmData, fcData]);

  // ========== FM 선택 시 연결된 FE/FC 로드 ==========
  useEffect(() => {
    // ✅ 연결확정 직후에는 이 useEffect가 linkedFEs/linkedFCs를 덮어쓰지 않음
    if (justConfirmedRef.current) {
      console.log('[FM 선택] ⏭️ justConfirmed=true, 덮어쓰기 스킵');
      justConfirmedRef.current = false; // 다음에는 정상 작동
      return;
    }
    
    if (!currentFMId) {
      setLinkedFEs(new Map());
      setLinkedFCs(new Map());
      return;
    }
    
    const newFEs = new Map<string, FEItem>();
    const newFCs = new Map<string, FCItem>();
    
    const fmLinks = savedLinks.filter(l => l.fmId === currentFMId);
    console.log('[FM 선택] 연결된 links:', fmLinks.length, '개', fmLinks.map(l => ({ feId: l.feId, feText: l.feText, fcId: l.fcId, fcText: l.fcText })));
    
    fmLinks.forEach(link => {
      // ✅ FE 로드 (ID 기반 - feData에서 못찾으면 savedLinks 저장 데이터로 복원)
      if (link.feId && link.feId.trim() !== '') {
        let feItem = feData.find(f => f.id === link.feId);
        if (feItem) {
          console.log('[FE 로드] ID 매칭 성공:', link.feId, '→', feItem.text);
          newFEs.set(feItem.id, feItem);
        } else if (link.feText) {
          // ✅ 핵심 수정: feData가 비어있어도 savedLinks에 저장된 데이터로 임시 FEItem 생성
          const rawFe = rawFeById.get(link.feId);
          const tempFE: FEItem = {
            id: link.feId,
            feNo: link.feNo || '',
            scope: link.feScope || rawFe?.scope || '',
            text: link.feText || rawFe?.text || '',
            severity: link.severity ?? rawFe?.severity ?? 0,
            functionName: (link as any).feFunctionName || '',
            requirement: (link as any).feRequirement || '',
          };
          console.log('[FE 로드] ✅ savedLinks에서 복원:', link.feId, '→', tempFE.text);
          newFEs.set(link.feId, tempFE);
        } else {
          console.warn('[FE 로드] ID 매칭 실패 (feText도 없음):', link.feId);
        }
      }
      
      // ✅ FC 로드 (ID 기반 - fcData에서 못찾으면 savedLinks 저장 데이터로 복원)
      if (link.fcId && link.fcId.trim() !== '') {
        let fcItem = fcData.find(f => f.id === link.fcId);
        if (fcItem) {
          console.log('[FC 로드] ID 매칭 성공:', link.fcId, '→', fcItem.text);
          newFCs.set(fcItem.id, fcItem);
        } else if (link.fcText) {
          // ✅ 핵심 수정: fcData가 비어있어도 savedLinks에 저장된 데이터로 임시 FCItem 생성
          const rawFc = rawFcById.get(link.fcId);
          const tempFC: FCItem = {
            id: link.fcId,
            fcNo: link.fcNo || '',
            processName: link.fcProcess || rawFc?.processName || '',
            m4: link.fcM4 || '',
            workElem: link.fcWorkElem || '',
            text: link.fcText || rawFc?.text || '',
            workFunction: (link as any).fcWorkFunction || '',
            processChar: (link as any).fcProcessChar || '',
          };
          console.log('[FC 로드] ✅ savedLinks에서 복원:', link.fcId, '→', tempFC.text);
          newFCs.set(link.fcId, tempFC);
        } else {
          console.warn('[FC 로드] ID 매칭 실패 (fcText도 없음):', link.fcId);
        }
      }
    });
    
    setLinkedFEs(newFEs);
    setLinkedFCs(newFCs);
    console.log('[FM 선택 완료]', currentFMId, '→ FE:', newFEs.size, 'FC:', newFCs.size, '| savedLinks:', savedLinks.length);
  }, [currentFMId, savedLinks, feData, fcData, rawFeById, rawFcById]);

  // ========== 규격미달(M1) 저장 데이터 vs 화면 표시 비교 ==========
  // 디버그 로직 제거됨 - 타이밍 이슈로 인한 거짓 양성 에러 방지

  // ========== FM 선택 ==========
  const selectFM = useCallback((id: string) => {
    console.log('[selectFM 호출]', { id, currentFMId, fmDataLength: fmData.length });
    
    if (currentFMId === id) {
      // 선택 해제
      console.log('[selectFM] 동일 FM 클릭 → 선택 해제');
      setCurrentFMId(null);
      setLinkedFEs(new Map());
      setLinkedFCs(new Map());
      setViewMode('diagram');
    } else {
      // 새로 선택
      console.log('[selectFM] 새 FM 선택:', id);
      setCurrentFMId(id);
      setViewMode('diagram');
      const fm = fmData.find(f => f.id === id);
      if (fm) {
        console.log('[selectFM] FM 찾음:', fm.fmNo, fm.text);
        setSelectedProcess(fm.processName);
      } else {
        console.warn('[selectFM] FM을 찾지 못함:', id, '| fmData IDs:', fmData.map(f => f.id));
      }
    }
    setTimeout(drawLines, 50);
  }, [currentFMId, fmData, drawLines]);

  // ========== 이전/다음 FM 이동 ==========
  const currentFMIndex = useMemo(() => {
    if (!currentFMId) return -1;
    return fmData.findIndex(f => f.id === currentFMId);
  }, [currentFMId, fmData]);

  const hasPrevFM = currentFMIndex > 0;
  const hasNextFM = currentFMIndex >= 0 && currentFMIndex < fmData.length - 1;

  const goToPrevFM = useCallback(() => {
    if (hasPrevFM) {
      const prevFM = fmData[currentFMIndex - 1];
      setCurrentFMId(prevFM.id);
      setSelectedProcess(prevFM.processName);
      setViewMode('diagram');
      setTimeout(drawLines, 50);
    }
  }, [currentFMIndex, fmData, hasPrevFM, drawLines]);

  const goToNextFM = useCallback(() => {
    if (hasNextFM) {
      const nextFM = fmData[currentFMIndex + 1];
      setCurrentFMId(nextFM.id);
      setSelectedProcess(nextFM.processName);
      setViewMode('diagram');
      setTimeout(drawLines, 50);
    }
  }, [currentFMIndex, fmData, hasNextFM, drawLines]);

  // ========== FE 토글 (연결/해제) - N:M 관계 지원 ==========
  // 하나의 FE는 여러 FM에 연결될 수 있음
  const toggleFE = useCallback((id: string) => {
    const fe = feData.find(f => f.id === id);
    if (!fe) return;
    
    // FM이 선택되지 않은 경우
    if (!currentFMId) {
      alert('⚠️ 고장형태(FM)를 먼저 선택해주세요.\n\n하나의 고장영향(FE)은 여러 고장형태(FM)에 연결될 수 있습니다.');
      return;
    }
    
    // 0단계: 아직 확정되지 않은 임시 연결(Linked 상태)만 있을 때는 단순 토글 해제
    if (linkedFEs.has(id)) {
      setLinkedFEs(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      setTimeout(drawLines, 50);
      return;
    }
    
    // ✅ 현재 FM과의 연결만 확인 (ID만 사용 - 텍스트 매칭 완전 제거)
    const existingLink = savedLinks.find(l => 
      l.fmId === currentFMId && l.feId === id
    );
    
    if (existingLink) {
      // 현재 FM과의 연결만 해제 (다른 FM과의 연결은 유지됨)
      const filtered = savedLinks.filter(l => 
        !(l.fmId === currentFMId && l.feId === id)
      );
      
      console.log('[FE 연결 해제]', fe.text, 'from FM:', currentFMId, '(다른 FM 연결 유지)');
      
      setSavedLinks(filtered);
      setState((prev: any) => ({ ...prev, failureLinks: filtered }));
      setDirty(true);
      requestAnimationFrame(() => {
        saveTemp?.(); // ✅ 편집 중: localStorage만
      });
      
      setLinkedFEs(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    } else if (editMode === 'edit') {
      // 새 연결 추가 (기존 다른 FM과의 연결과 별개로 추가됨)
      setLinkedFEs(prev => {
        const next = new Map(prev);
        next.set(id, fe);
        return next;
      });
      console.log('[FE 선택]', fe.text, 'to FM:', currentFMId, '(연결확정으로 저장)');
    }
    
    setTimeout(drawLines, 50);
  }, [currentFMId, editMode, feData, savedLinks, setState, setDirty, saveToLocalStorage, drawLines]);

  // ========== FC 클릭 (연결 추가) ==========
  // ========== 공정 순서 비교 함수 ==========
  const getProcessOrder = useCallback((processName: string): number => {
    const proc = state.l2.find((p: any) => p.name === processName);
    if (proc) {
      // no가 숫자 형태면 파싱, 아니면 order 또는 인덱스 사용
      const noNum = parseInt(proc.no, 10);
      if (!isNaN(noNum)) return noNum;
      return proc.order || state.l2.indexOf(proc) * 10;
    }
    return 9999; // 못 찾으면 맨 뒤로
  }, [state.l2]);

  const toggleFC = useCallback((id: string) => {
    const fc = fcData.find(f => f.id === id);
    if (!fc) return;
    
    // FM이 선택되지 않은 경우
    if (!currentFMId) {
      alert('⚠️ 고장형태(FM)를 먼저 선택해주세요.\n\n하나의 고장원인(FC)은 여러 고장형태(FM)에 연결될 수 있습니다.');
      return;
    }
    
    // ✅ 뒷공정 FC 연결 방지: FC 공정이 FM 공정보다 뒤면 연결 불가
    if (currentFM) {
      const fmOrder = getProcessOrder(currentFM.processName);
      const fcOrder = getProcessOrder(fc.processName);
      
      if (fcOrder > fmOrder) {
        alert(`⚠️ 뒷공정 원인 연결 불가!\n\n고장형태(FM): ${currentFM.processName} (순서: ${fmOrder})\n고장원인(FC): ${fc.processName} (순서: ${fcOrder})\n\n💡 고장원인(FC)은 고장형태(FM)와 같은 공정이거나 앞 공정에서만 연결할 수 있습니다.`);
        console.log('[FC 연결 차단] 뒷공정 원인:', fc.processName, '>', currentFM.processName);
        return;
      }
    }
    
    // ✅ 이미 연결된 경우 - 안내 메시지 (ID만 사용 - 텍스트 매칭 완전 제거)
    const existingLink = savedLinks.find(l => 
      l.fmId === currentFMId && l.fcId === id
    );
    if (existingLink) {
      console.log('[FC 이미 연결됨] 더블클릭으로 해제하세요:', fc.text);
      return; // 이미 연결된 경우 클릭으로는 해제 안함
    }
    
    // 편집 모드에서만 연결 추가
    if (editMode === 'edit') {
      setLinkedFCs(prev => {
        const next = new Map(prev);
        next.set(id, fc);
        return next;
      });
      console.log('[FC 선택 → 연결]', fc.text, 'to FM:', currentFMId);
    }
    
    setTimeout(drawLines, 50);
  }, [currentFMId, currentFM, editMode, fcData, savedLinks, drawLines, getProcessOrder]);

  // ========== FC 더블클릭 (연결 해제) ==========
  const unlinkFC = useCallback((id: string) => {
    const fc = fcData.find(f => f.id === id);
    if (!fc) {
      console.log('[unlinkFC] FC를 찾을 수 없음:', id);
      return;
    }
    
    console.log('[unlinkFC 시작]', { fcId: id, fcText: fc.text, currentFMId });
    
    // 1. 먼저 linkedFCs (미저장 상태)에서 제거 시도
    let removedFromLinked = false;
    setLinkedFCs(prev => {
      if (prev.has(id)) {
        const next = new Map(prev);
        next.delete(id);
        console.log('[FC 선택 해제] linkedFCs에서 제거:', fc.text);
        removedFromLinked = true;
        return next;
      }
      return prev;
    });
    
    // 2. savedLinks에서 해당 FC와 관련된 연결 모두 찾기 (현재 FM 기준)
    // ✅ ID만 사용 (텍스트 기반 매칭 완전 제거)
    if (currentFMId) {
      const existingLinks = savedLinks.filter(l => 
        l.fmId === currentFMId && l.fcId === id
      );
      
      console.log('[unlinkFC] 기존 연결 검색:', existingLinks.length, '개 발견');
      
      if (existingLinks.length > 0) {
        // 연결 해제 (ID만 사용)
        const filtered = savedLinks.filter(l => 
          !(l.fmId === currentFMId && l.fcId === id)
        );
        
        console.log('[FC 연결 해제 (더블클릭)]', fc.text, 'from FM:', currentFMId, '| 제거:', existingLinks.length, '개');
        
        setSavedLinks(filtered);
        setState((prev: any) => ({ ...prev, failureLinks: filtered }));
        setDirty(true);
        requestAnimationFrame(() => {
          saveTemp?.(); // ✅ 편집 중: localStorage만
        });
        
        alert(`✅ "${fc.text}" 연결이 해제되었습니다.`);
      } else if (!removedFromLinked) {
        console.log('[unlinkFC] 현재 FM과 연결 없음');
      }
    } else {
      if (!removedFromLinked) {
        alert('⚠️ 고장형태(FM)를 먼저 선택해주세요.');
      }
    }
    
    setTimeout(drawLines, 50);
  }, [currentFMId, fcData, savedLinks, setState, setDirty, saveToLocalStorage, drawLines]);

  // ========== 현재 FM 연결 상태 확인 ==========
  const isCurrentFMLinked = useMemo(() => {
    if (!currentFMId) return false;
    const fmLinks = savedLinks.filter(l => l.fmId === currentFMId);
    const hasFE = fmLinks.some(l => l.feId && l.feId.trim() !== '');
    const hasFC = fmLinks.some(l => l.fcId && l.fcId.trim() !== '');
    return hasFE || hasFC;
  }, [currentFMId, savedLinks]);

  // ========== 연결 해제 (수정 모드에서만 사용) ==========
  const unlinkCurrentFM = useCallback(() => {
    if (!currentFMId || !currentFM) return;
    
    if (!confirm(`⚠️ "${currentFM.text}"의 연결을 해제하시겠습니까?\n\n연결된 FE/FC가 모두 해제됩니다.`)) {
      return;
    }
    
    const newLinks = savedLinks.filter(l => l.fmId !== currentFMId);
    setSavedLinks(newLinks);
    
    // ✅ setStateSynced 패턴 적용
    const updateFn = (prev: any) => ({ ...prev, failureLinks: newLinks });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    
    // linkedFEs/linkedFCs 초기화
    setLinkedFEs(new Map());
    setLinkedFCs(new Map());
    
    setTimeout(() => {
      saveTemp?.();
      drawLines();
    }, 100);
    
    console.log('[연결 해제]', currentFM.text);
    alert(`✅ "${currentFM.text}" 연결이 해제되었습니다.\n\n다시 FE/FC를 선택하여 연결할 수 있습니다.`);
  }, [currentFMId, currentFM, savedLinks, setState, setStateSynced, setDirty, saveTemp, drawLines]);

  // ========== 연결 확정 (확정 전용, 토글 아님) ==========
  const confirmLink = useCallback(() => {
    if (!currentFMId || !currentFM) return;
    
    // ✅ 이미 연결되어 있으면 수정 안내 메시지 표시 (토글 방지)
    if (isCurrentFMLinked) {
      alert(`ℹ️ "${currentFM.text}"는 이미 연결이 확정되었습니다.\n\n💡 연결을 수정하려면 [🔗 연결해제] 버튼을 사용하세요.`);
      return;
    }
    
    const feArray = Array.from(linkedFEs.values());
    const fcArray = Array.from(linkedFCs.values());
    
    // ✅ 검증(원자성/DB FK 보장): FE/FC 둘 다 있어야 "연결확정" 가능
    if (feArray.length === 0 || fcArray.length === 0) {
      const missing = [];
      if (feArray.length === 0) missing.push('FE(고장영향)');
      if (fcArray.length === 0) missing.push('FC(고장원인)');
      alert(`⚠️ ${missing.join(' + ')}를 선택해야 연결확정이 가능합니다.`);
      return;
    }
    
    // 기존 연결 제거 후 새 연결 추가
    let newLinks = savedLinks.filter(l => l.fmId !== currentFMId);
    
    // ✅ 원자성 링크 생성: (FM, FE, FC) 완전한 3자 링크만 저장
    // - 1개의 FM에 여러 FE/FC를 선택할 수 있으므로, FE×FC 조합(카테시안)으로 link row 생성
    feArray.forEach(fe => {
      fcArray.forEach(fc => {
        newLinks.push({
          fmId: currentFMId,
          fmNo: currentFM.fmNo,
          fmText: currentFM.text,
          fmProcess: currentFM.processName,
          feId: fe.id,
          feNo: fe.feNo,
          feScope: fe.scope,
          feText: fe.text,
          severity: fe.severity || 0,
          // ★ 역전개 정보 저장
          feFunctionName: fe.functionName || '',
          feRequirement: fe.requirement || '',
          fcId: fc.id,
          fcNo: fc.fcNo,
          fcProcess: fc.processName,
          fcM4: fc.m4,
          fcWorkElem: fc.workElem,
          fcText: fc.text,
          // ★ FC 역전개 정보 저장
          fcWorkFunction: fc.workFunction || '',
          fcProcessChar: fc.processChar || '',
        });
      });
    });
    
    console.log('[연결 확정]', currentFM.text, '→ FE:', feArray.length, 'FC:', fcArray.length, '총:', newLinks.length);
    console.log('[연결 확정] 심각도 확인:', newLinks.map(l => ({ feText: l.feText?.slice(0,10), severity: l.severity })));
    
    // ✅ 핵심: useEffect가 linkedFEs/linkedFCs를 덮어쓰지 않도록 플래그 설정
    justConfirmedRef.current = true;
    
    // ✅ 로컬 상태 업데이트
    setSavedLinks(newLinks);
    
    // ✅ setStateSynced 패턴 적용 (다른 탭과 동일한 패턴)
    const updateFn = (prev: any) => ({ ...prev, failureLinks: newLinks });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    
    // ✅ 저장 (setTimeout으로 state 업데이트 대기)
    setTimeout(() => {
      saveTemp?.();
      drawLines(); // 화살표 다시 그리기
    }, 100);
    setTimeout(drawLines, 300);
    
    // ✅ 자동으로 다음 FM 이동
    const currentProcess = currentFM.processName;
    const currentProcessFMs = fmData.filter(fm => fm.processName === currentProcess);
    
    // 새로 저장된 links로 연결 상태 확인
    const allLinkedInProcess = currentProcessFMs.every(fm => {
      const fmLinks = newLinks.filter(l => l.fmId === fm.id);
      const hasFE = fmLinks.some(l => l.feId && l.feId.trim() !== '');
      const hasFC = fmLinks.some(l => l.fcId && l.fcId.trim() !== '');
      return hasFE && hasFC;
    });
    
    // 같은 공정 내 다음 FM 확인
    const sameProcFMs = fmData.filter(fm => fm.processName === currentProcess);
    const currentFMIdx = sameProcFMs.findIndex(fm => fm.id === currentFMId);
    const nextFMInProc = sameProcFMs[currentFMIdx + 1];
    
    // 다음 공정 확인
    const allProcesses = [...new Set(fmData.map(fm => fm.processName))];
    const currentIdx = allProcesses.indexOf(currentProcess);
    const nextProcess = allProcesses[currentIdx + 1];
    
    // ✅ 자동 FM 이동 (setTimeout으로 상태 업데이트 대기)
    // ⚠️ linkedFEs/linkedFCs는 수동으로 초기화하지 않음 - useEffect가 savedLinks 기반으로 로드
    if (allLinkedInProcess && nextProcess) {
      // 현재 공정 완료 → 다음 공정의 첫 번째 FM으로 이동
      const nextFM = fmData.find(fm => fm.processName === nextProcess);
      if (nextFM) {
        setTimeout(() => {
          justConfirmedRef.current = false; // ✅ 다음 FM 로딩을 위해 리셋
          setCurrentFMId(nextFM.id);
          setSelectedProcess(nextProcess);
        }, 200);
        alert(`✅ ${currentFM.text} 연결 완료!\n\n🎯 ${currentProcess} 공정 완료!\n\n➡️ 다음 공정: ${nextProcess}`);
        return;
      }
    } else if (allLinkedInProcess && !nextProcess) {
      // 모든 공정 완료
      setViewMode('result');
      alert(`✅ ${currentFM.text} 연결 완료!\n\n🎉 모든 공정의 고장연결이 완료되었습니다!\n\n[전체확정] 버튼을 눌러 확정해주세요.`);
      return;
    } else if (nextFMInProc) {
      // 같은 공정 내 다음 FM으로 이동
      setTimeout(() => {
        justConfirmedRef.current = false; // ✅ 다음 FM 로딩을 위해 리셋
        setCurrentFMId(nextFMInProc.id);
      }, 200);
      alert(`✅ ${currentFM.text} 연결 완료!\n\n➡️ 다음 FM: ${nextFMInProc.fmNo}: ${nextFMInProc.text}`);
      return;
    }
    
    // 현재 공정의 마지막 FM
    alert(`✅ ${currentFM.text} 연결 완료!\n\nFE: ${feArray.length}개, FC: ${fcArray.length}개`);
  }, [currentFMId, currentFM, linkedFEs, linkedFCs, savedLinks, fmData, setState, setStateSynced, setDirty, saveToLocalStorage, drawLines]);

  // ========== 엔터키로 연결확정 ==========
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있으면 무시
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      
      // 엔터키를 누르면 연결확정
      if (e.key === 'Enter' && currentFMId && (linkedFEs.size > 0 || linkedFCs.size > 0)) {
        e.preventDefault();
        confirmLink();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFMId, linkedFEs.size, linkedFCs.size, confirmLink]);

  // ========== 고장연결 전체 확정 ==========
  const handleConfirmAll = useCallback(() => {
    // 모든 FM이 FE와 FC에 연결되어 있는지 확인
    const unlinkedFMs = fmData.filter(fm => {
      const counts = linkStats.fmLinkCounts.get(fm.id) || { feCount: 0, fcCount: 0 };
      return counts.feCount === 0 || counts.fcCount === 0;
    });
    
    // ✅ 누락이 있으면 경고 후 계속할지 확인
    if (unlinkedFMs.length > 0) {
      const unlinkedList = unlinkedFMs.slice(0, 5).map(fm => `  • ${fm.fmNo}: ${fm.text}`).join('\n');
      const confirmProceed = window.confirm(
        `⚠️ 고장연결 누락 경고!\n\n` +
        `연결이 완료되지 않은 FM이 ${unlinkedFMs.length}건 있습니다:\n\n` +
        `${unlinkedList}${unlinkedFMs.length > 5 ? `\n  ... 외 ${unlinkedFMs.length - 5}건` : ''}\n\n` +
        `💡 누락된 항목은 ALL(전체보기) 화면에서 수동으로 입력할 수 있습니다.\n\n` +
        `그래도 확정하시겠습니까?`
      );
      
      if (!confirmProceed) {
        return; // 취소하면 확정하지 않음
      }
      // 계속 진행하면 아래로 흘러감
    }
    
    // ✅ 강화: failureLinks와 failureLinkConfirmed 모두 저장
    // ✅ setStateSynced 사용하여 stateRef 즉시 동기화 (DB 저장 전 최신 상태 보장)
    const updateFn = (prev: any) => ({ 
      ...prev, 
      failureLinkConfirmed: true,
      failureLinks: savedLinks,  // ✅ 고장연결 데이터도 state에 저장
    });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    
    // ✅ 전체확정: DB에 확정 저장 (원자성 + 레거시 SSOT)
    // ✅ setTimeout으로 상태 업데이트 후 저장 (stateRef 반영 보장)
    console.log('[고장연결 전체확정] ✅ DB 확정 저장 시작:', savedLinks.length, '건');
    setTimeout(() => {
      saveToLocalStorage?.(); // 레거시 local backup
      saveAtomicDB?.();       // PostgreSQL 저장 (확정 시 1회)
    }, 100);
    
    // ===== AI 학습 데이터 저장 =====
    // 확정된 고장연결 데이터를 AI 시스템에 저장하여 학습
    try {
      savedLinks.forEach(link => {
        saveToAIHistory({
          processName: link.fmProcess || '',
          workElement: link.fcWorkElem || '',
          m4Category: link.fcM4 || '',
          categoryType: link.feScope || '',
          failureEffect: link.feText || '',
          failureMode: link.fmText || '',
          failureCause: link.fcText || '',
          severity: link.severity || 0,
          projectId: state.l1?.name || '',
        });
      });
      console.log(`[AI 학습] ${savedLinks.length}건의 고장연결 데이터가 AI 시스템에 저장되었습니다.`);
    } catch (e) {
      console.error('[AI 학습 오류]', e);
    }
    
    const missingCount = linkStats.fmMissingCount;
    const missingMsg = missingCount > 0 
      ? `\n\n⚠️ 누락: ${missingCount}개\n💡 ALL(전체보기) 화면에서 수동 입력 가능` 
      : '';
    alert(`✅ 고장연결이 확정되었습니다!\n\nFM: ${fmData.length}개\nFE: ${linkStats.feLinkedCount}개\nFC: ${linkStats.fcLinkedCount}개${missingMsg}\n\n🤖 AI 학습 데이터 ${savedLinks.length}건 저장됨`);
  }, [fmData, linkStats, savedLinks, state.l1, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ========== 고장연결 수정 모드 ==========
  const handleEditMode = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, failureLinkConfirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    requestAnimationFrame(() => {
      saveTemp?.(); // ✅ 편집 중: localStorage만
    });
    alert('📝 고장연결 수정 모드로 전환되었습니다.');
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ========== 초기화 ==========
  const handleClearAll = useCallback(() => {
    if (!confirm('⚠️ 모든 고장연결 데이터를 초기화하시겠습니까?')) return;
    
    setSavedLinks([]);
    setLinkedFEs(new Map());
    setLinkedFCs(new Map());
    setCurrentFMId(null);
    
    const updateFn = (prev: any) => ({ ...prev, failureLinks: [], failureLinkConfirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    requestAnimationFrame(() => {
      saveTemp?.(); // ✅ 편집 중: localStorage만
    });
    setViewMode('diagram');
    alert('✅ 모든 고장연결이 초기화되었습니다.');
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ========== 역전개 ==========
  const handleReverseGenerate = useCallback(() => {
    if (savedLinks.length === 0) {
      alert('⚠️ 연결된 고장이 없습니다.');
      return;
    }
    
    let msg = '📊 역전개 - FK 연결 상태\n\n';
    
    // FE-요구사항 연결 확인
    const feConnections: { fe: string; req: string | null }[] = [];
    savedLinks.filter(l => l.feId).forEach(link => {
      const fs = (state.l1?.failureScopes || []).find((f: any) => f.id === link.feId);
      let reqName: string | null = null;
      if (fs?.reqId) {
        (state.l1?.types || []).forEach((t: any) => {
          (t.functions || []).forEach((f: any) => {
            const req = (f.requirements || []).find((r: any) => r.id === fs.reqId);
            if (req) reqName = req.name;
          });
        });
      }
      if (!feConnections.some(c => c.fe === link.feText)) {
        feConnections.push({ fe: link.feText, req: reqName });
      }
    });
    
    msg += '【FE ↔ 요구사항】\n';
    feConnections.forEach(c => {
      msg += c.req ? `  ✅ ${c.fe} → ${c.req}\n` : `  ❌ ${c.fe} → (없음)\n`;
    });
    
    alert(msg);
  }, [savedLinks, state.l1]);

  // ========== 필수 분석 확정 여부 체크 ==========
  // ✅ 디버깅: 확정 상태 로그
  console.log('[고장연결] 확정 상태 확인:', {
    failureL1Confirmed: state.failureL1Confirmed,
    failureL2Confirmed: state.failureL2Confirmed,
    failureL3Confirmed: state.failureL3Confirmed,
    isL1Confirmed,
    isL2Confirmed,
    isL3Confirmed,
  });
  
  // ✅ Fallback: 실제 데이터 존재 여부 확인 (확정 플래그가 false여도 데이터가 있으면 통과)
  const hasFailureEffects = (state.l1?.failureScopes || []).length > 0;
  const hasFailureModes = state.l2.some((p: any) => (p.failureModes || []).length > 0);
  const hasFailureCauses = state.l2.some((p: any) => (p.l3 || []).some((we: any) => 
    (we.functions || []).some((f: any) => (f.processChars || []).some((pc: any) => 
      (pc.failureCauses || []).length > 0
    ))
  ));
  
  console.log('[고장연결] 실제 데이터 존재 여부:', {
    hasFailureEffects,
    hasFailureModes,
    hasFailureCauses,
  });
  
  // ✅ 확정 플래그 또는 실제 데이터 존재 여부로 판단
  const allAnalysisConfirmed = (isL1Confirmed || hasFailureEffects) && 
                                (isL2Confirmed || hasFailureModes) && 
                                (isL3Confirmed || hasFailureCauses);
  const missingAnalysis: string[] = [];
  if (!isL1Confirmed && !hasFailureEffects) missingAnalysis.push('1L 고장영향');
  if (!isL2Confirmed && !hasFailureModes) missingAnalysis.push('2L 고장형태');
  if (!isL3Confirmed && !hasFailureCauses) missingAnalysis.push('3L 고장원인');

  // ========== 렌더링 ==========
  
  // ✅ 미확정 상태 경고 화면
  if (!allAnalysisConfirmed) {
    return (
      <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#e65100' }}>
          고장분석이 완료되지 않았습니다
        </div>
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 1.8 }}>
          고장연결을 진행하려면 아래 분석을 먼저 완료하고 확정해주세요:
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {missingAnalysis.map(name => (
              <div key={name} style={{ 
                padding: '8px 20px', 
                background: '#fff3e0', 
                border: '1px solid #ffb74d', 
                borderRadius: 6, 
                color: '#e65100',
                fontWeight: 600
              }}>
                ❌ {name} 분석 미확정
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: '#999' }}>
          각 분석 탭에서 "확정" 버튼을 눌러 분석을 완료해주세요
        </div>
      </div>
    );
  }
  
  return (
    <div style={containerStyle}>
      {/* 좌측: 3개 테이블 (60%) */}
      <FailureLinkTables
        feData={feData}
        fmData={fmData}
        fcData={fcData}
        currentFMId={currentFMId}
        linkedFEIds={new Set(linkedFEs.keys())}
        linkedFCIds={new Set(linkedFCs.keys())}
        linkStats={linkStats}
        selectedProcess={selectedProcess}
        fcLinkScope={fcLinkScope}
        onSelectFM={selectFM}
        onToggleFE={toggleFE}
        onToggleFC={toggleFC}
        onUnlinkFE={unlinkFE}
        onUnlinkFC={unlinkFC}
        onProcessChange={(process: string) => {
          setSelectedProcess(process);
          // ✅ ALL 버튼 클릭 시 전체 화면(result)으로 전환
          if (process === 'all') {
            setViewMode('result');
          }
        }}
        onFcScopeChange={setFcLinkScope}
      />

      {/* 우측: 토글 화면 (40%) */}
      <div style={rightPanelStyle}>
        {/* ✅ 고장연결 완료 배너 */}
        {linkStats.fmMissingCount === 0 && savedLinks.length > 0 && !isConfirmed && (
          <div style={{
            background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            margin: '8px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
            animation: 'pulse 2s infinite',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              🎉 모든 고장연결이 완료되었습니다!
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              아래 [전체확정] 버튼을 눌러 확정해주세요
            </div>
          </div>
        )}
        
        {/* 헤더 */}
        <div style={rightHeaderStyle}>
          <button onClick={() => setViewMode('diagram')} style={modeButtonStyle(viewMode === 'diagram')}>
            고장사슬
          </button>
          
          <button 
            onClick={() => setViewMode('result')} 
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '11px',
              fontWeight: 600,
              border: '1px solid #0d47a1',
              borderRadius: '3px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content',
              background: viewMode === 'result' ? '#0d47a1' : '#ffffff',
              color: viewMode === 'result' ? '#ffffff' : '#0d47a1',
            }}
          >
            분석결과(<span style={{color: viewMode === 'result' ? '#90caf9' : '#1976d2',fontWeight:700}}>FE:{linkStats.feLinkedCount}</span>,<span style={{color: viewMode === 'result' ? '#ffab91' : '#e65100',fontWeight:700}}>FM:{linkStats.fmLinkedCount}</span>,<span style={{color: viewMode === 'result' ? '#a5d6a7' : '#388e3c',fontWeight:700}}>FC:{linkStats.fcLinkedCount}</span>{linkStats.fmMissingCount > 0 && <span style={{color: viewMode === 'result' ? '#ff8a80' : '#d32f2f',fontWeight:700}}>,누락:{linkStats.fmMissingCount}</span>})
          </button>
          
          <div style={actionButtonGroupStyle}>
            {/* 연결확정 버튼 (이미 확정된 경우 비활성) */}
            <button 
              onClick={confirmLink} 
              disabled={!currentFMId || isCurrentFMLinked || (linkedFEs.size === 0 && linkedFCs.size === 0)}
              className={!isCurrentFMLinked && currentFMId && (linkedFEs.size > 0 || linkedFCs.size > 0) ? 'blink-orange' : ''}
              style={{
                ...actionButtonStyle({
                  bg: isCurrentFMLinked ? '#4caf50' : '#ef6c00', 
                  color: '#fff',
                  opacity: (!currentFMId || isCurrentFMLinked || (linkedFEs.size === 0 && linkedFCs.size === 0)) ? 0.5 : 1
                }),
                whiteSpace: 'nowrap',
                minWidth: '80px'
              }}
            >
              {isCurrentFMLinked ? '✅ 확정됨' : '🔗 연결확정'}
            </button>
            
            {/* 연결해제 버튼 (확정된 경우만 표시) */}
            {isCurrentFMLinked && (
              <button 
                onClick={unlinkCurrentFM} 
                style={{
                  ...actionButtonStyle({
                    bg: '#ff5722', 
                    color: '#fff',
                    opacity: 1
                  }),
                  whiteSpace: 'nowrap',
                  minWidth: '70px'
                }}
              >
                🔓 연결해제
              </button>
            )}
            
            {/* 전체 확정/수정 버튼 */}
            {!isConfirmed ? (
              // 미확정 상태: 전체확정 버튼 표시
              <button 
                onClick={handleConfirmAll} 
                disabled={savedLinks.length === 0}
                style={{
                  ...actionButtonStyle({ 
                    bg: linkStats.fmMissingCount === 0 && savedLinks.length > 0 ? '#2e7d32' : '#4caf50', 
                    color: '#fff', 
                    opacity: savedLinks.length === 0 ? 0.5 : 1
                  }),
                  // ✅ 완료 시 강조 애니메이션
                  ...(linkStats.fmMissingCount === 0 && savedLinks.length > 0 ? {
                    boxShadow: '0 0 12px rgba(46, 125, 50, 0.8)',
                    animation: 'pulse 1.5s infinite',
                    fontWeight: 700,
                  } : {})
                }}
              >
                {linkStats.fmMissingCount === 0 && savedLinks.length > 0 ? '🎉 전체확정' : '✅ 전체확정'}
              </button>
            ) : linkStats.fmMissingCount === 0 ? (
              // 확정 + 모든 FM 연결됨: 완료 상태 표시
              <button 
                disabled
                style={{
                  ...actionButtonStyle({ 
                    bg: '#1b5e20', 
                    color: '#fff',
                    opacity: 1
                  }),
                  boxShadow: '0 0 12px rgba(27, 94, 32, 0.8)',
                  fontWeight: 700,
                  cursor: 'default'
                }}
              >
                🎉 고장연결 완료
              </button>
            ) : (
              // 확정 + 일부 FM 미연결: 수정 버튼 표시
              <button 
                onClick={handleEditMode}
                style={actionButtonStyle({ 
                  bg: '#ff9800', color: '#fff'
                })}
              >
                ✏️ 수정
              </button>
            )}
          </div>
        </div>
        
        {/* 콘텐츠 */}
        <div className="flex-1 overflow-auto" style={{ paddingBottom: '50px' }}>
          {viewMode === 'diagram' && (
            <FailureLinkDiagram
              currentFM={currentFM}
              linkedFEs={linkedFEs}
              linkedFCs={linkedFCs}
              svgPaths={svgPaths}
              chainAreaRef={chainAreaRef}
              fmNodeRef={fmNodeRef}
              feColRef={feColRef}
              fcColRef={fcColRef}
              onPrevFM={goToPrevFM}
              onNextFM={goToNextFM}
              hasPrevFM={hasPrevFM}
              hasNextFM={hasNextFM}
            />
          )}
          {viewMode === 'result' && (
            // ✅ 고장분석 결과 화면: FM 중심으로 FE(고장영향)↔FC(고장원인) 연결 표시
            <FailureLinkResult savedLinks={savedLinks} fmData={fmData} />
          )}
        </div>
      </div>
    </div>
  );
}
