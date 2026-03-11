// @ts-nocheck
/**
 * @file AllTabRenderer.tsx
 * @description 전체보기 탭 렌더러 (35컬럼 기본화면)
 * @updated 2026-01-10 - 화면정의서 v2.2 기준 3색 시스템 적용
 * 
 * ★★★ 새로운 ALL 화면 ★★★
 * - 기본화면: 35컬럼 (RPN 제외)
 * - 옵션화면: 37컬럼 (RPN 포함)
 * - 2행 분류 기준 3색 시스템 (구조/기능/고장분석)
 */

'use client';

import React from 'react';
import { WorksheetState } from '../../constants';
import AllTabEmpty from './AllTabEmpty';

interface AllTabRendererProps {
  tab: string;
  state: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;  // ✅ DB 저장 트리거용
  visibleSteps?: number[];
  fmeaId?: string;
  showRPN?: boolean; // RPN 표시 여부 (기본: false)
  // ★★★ 2026-01-12: 트리뷰 패널 전환 핸들러 추가 ★★★
  onOpen5AP?: () => void;
  onOpen6AP?: () => void;
  onOpenRPN?: () => void;
  activePanelId?: string; // 현재 활성 패널 ID
  // 레거시 props (호환성 유지용)
  rows?: any[];
  l1Spans?: number[];
  l1TypeSpans?: number[];
  l1FuncSpans?: number[];
  l2Spans?: number[];
  onAPClick?: () => void;
  useAtomicDB?: boolean;
}

export default function AllTabRenderer({ 
  tab,
  state,
  setState,
  setDirty,
  visibleSteps: propsVisibleSteps,
  fmeaId,
  showRPN = false,
  // ★★★ 2026-01-12: 트리뷰 패널 전환 핸들러 ★★★
  onOpen5AP,
  onOpen6AP,
  onOpenRPN,
  activePanelId,
}: AllTabRendererProps) {
  
  console.log('🔵 AllTabRenderer: 새로운 35컬럼 화면 렌더링', {
    tab,
    fmeaId,
    showRPN,
    stateL1Name: state.l1?.name,
  });

  // visibleSteps를 단계명으로 변환
  // ✅ 2026-01-12: visibleSteps가 객체일 수도 있으므로 배열로 정규화
  let visibleStepsNumbers: number[] = [2, 3, 4, 5, 6]; // 기본값
  
  if (propsVisibleSteps) {
    // props가 배열이면 그대로 사용
    visibleStepsNumbers = Array.isArray(propsVisibleSteps) ? propsVisibleSteps : [2, 3, 4, 5, 6];
  } else if (state.visibleSteps) {
    // state.visibleSteps가 배열이면 그대로, 객체면 배열로 변환
    if (Array.isArray(state.visibleSteps)) {
      visibleStepsNumbers = state.visibleSteps;
    } else if (typeof state.visibleSteps === 'object') {
      // { step2: true, step3: true, ... } 형태를 [2, 3, ...] 배열로 변환
      visibleStepsNumbers = [2, 3, 4, 5, 6].filter(step => {
        const key = `step${step}` as keyof typeof state.visibleSteps;
        return (state.visibleSteps as any)?.[key] !== false;
      });
    }
  }
  
  const stepNameMap: Record<number, string> = {
    2: '구조분석',
    3: '기능분석',
    4: '고장분석',
    5: '리스크분석',
    6: '최적화',
  };
  const visibleStepNames = visibleStepsNumbers.map(num => stepNameMap[num] || '').filter(Boolean);

  // ★ 제품명 (L1) (DFMEA)
  const l1ProductName = state.l1?.name || '';
  
  // ★ 고장영향(FE) → 기능분석 역전개를 위한 맵 생성
  // failureScope.reqId → 요구사항 → 기능 → 구분 역추적
  const l1Types = state.l1?.types || [];
  const failureScopes = (state.l1 as any)?.failureScopes || [];
  
  // reqId → { category, functionName, requirement } 매핑
  const reqToFuncMap = new Map<string, { category: string; functionName: string; requirement: string }>();
  // feId/feText → reqId 매핑
  const feToReqMap = new Map<string, string>();
  
  // 1. 요구사항 → 기능 → 구분 맵 생성
  l1Types.forEach((type: any) => {
    const category = type.name || '';
    (type.functions || []).forEach((func: any) => {
      const functionName = func.name || '';
      (func.requirements || []).forEach((req: any) => {
        if (req.id) {
          reqToFuncMap.set(req.id, { category, functionName, requirement: req.name || '' });
        }
      });
    });
  });
  
  // 2. failureScope → reqId 맵 생성
  failureScopes.forEach((fs: any) => {
    if (fs.id && fs.reqId) {
      feToReqMap.set(fs.id, fs.reqId);
    }
    // 텍스트로도 매핑 (fallback)
    if (fs.effect) {
      feToReqMap.set(fs.effect, fs.reqId || '');
    }
  });

  // ★ FC 역전개를 위한 맵 생성 (state.l2에서)
  // fcId → { workFunction, processChar, workElem } 매핑 (DFMEA: m4 제거됨)
  const fcToL3Map = new Map<string, { workFunction: string; processChar: string; workElem: string }>();
  const fcToTextMap = new Map<string, string>();  // ★ fcId → cause 텍스트 매핑
  const fcTextToIdMap = new Map<string, string>(); // ★ cause 텍스트 → fcId 역매핑
  
  (state.l2 || []).forEach((proc: any) => {
    // ★ 먼저 모든 failureCauses의 cause 텍스트 수집
    (proc.failureCauses || []).forEach((fc: any) => {
      if (fc.id) {
        // cause 또는 name 필드에서 고장원인 텍스트 가져오기
        const causeText = fc.cause || fc.name || '';
        if (causeText) {
          fcToTextMap.set(fc.id, causeText);
          if (!fcTextToIdMap.has(causeText)) {
            fcTextToIdMap.set(causeText, fc.id);
          }
        }
      }
    });
    
    (proc.l3 || []).forEach((we: any) => {
      // DFMEA: 4M 제거됨
      // const m4 = we.m4 || we.category || '';
      const workElem = we.name || we.element || '';
      
      (we.functions || []).forEach((fn: any) => {
        (fn.processChars || []).forEach((pc: any) => {
          // 이 부품 특성에 연결된 고장원인들 찾기 (DFMEA)
          (proc.failureCauses || []).forEach((fc: any) => {
            if (fc.processCharId === pc.id) {
              fcToL3Map.set(fc.id, {
                workFunction: fn.name || '',
                processChar: pc.name || '',
                // DFMEA: m4 제거됨
                workElem,  // ★ 부품 또는 특성 추가 (DFMEA)
              });
            }
          });
        });
      });
    });
  });
  
  console.log('🟠 fcToTextMap:', { count: fcToTextMap.size, sample: Array.from(fcToTextMap.entries()).slice(0, 3) });
  console.log('🟠 fcToL3Map (with workElem):', { count: fcToL3Map.size, sample: Array.from(fcToL3Map.entries()).slice(0, 3) }); // DFMEA: m4 제거됨

  // ★ FM 역전개를 위한 맵 생성 (state.l2에서)
  // fmId → { processFunction, productChar } 매핑
  const fmToL2Map = new Map<string, { processFunction: string; productChar: string; processName: string }>(); // DFMEA: processNo 제거됨
  const fmToTextMap = new Map<string, string>();  // ★ fmId → mode 텍스트 매핑
  const fmTextToIdMap = new Map<string, string>(); // ★ mode 텍스트 → fmId 역매핑
  
  (state.l2 || []).forEach((proc: any) => {
    if (!proc.name) return;
    
    // ★ 먼저 모든 failureModes의 mode 텍스트 수집
    (proc.failureModes || []).forEach((fm: any) => {
      if (fm.id) {
        const modeText = fm.mode || fm.name || '';
        if (modeText) {
          fmToTextMap.set(fm.id, modeText);
          if (!fmTextToIdMap.has(modeText)) {
            fmTextToIdMap.set(modeText, fm.id);
          }
        }
      }
    });
    
    (proc.failureModes || []).forEach((fm: any) => {
      if (!fm.id) return;
      
      // productCharId로 제품 특성 → A'SSY 기능 역추적 (DFMEA)
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
      
      fmToL2Map.set(fm.id, {
        processFunction,
        productChar,
        // DFMEA: processNo 제거됨
        processName: proc.name || '',
      });
    });
  });
  
  // ★ FE 텍스트 매핑 (failureScopes에서)
  const feToTextMap = new Map<string, { text: string; severity: number }>();
  const feTextToIdMap = new Map<string, string>();
  failureScopes.forEach((fs: any) => {
    if (fs.id) {
      feToTextMap.set(fs.id, {
        text: fs.effect || fs.name || '',
        severity: fs.severity || 0,
      });
      const feTextValue = fs.effect || fs.name || '';
      if (feTextValue && !feTextToIdMap.has(feTextValue)) {
        feTextToIdMap.set(feTextValue, fs.id);
      }
    }
  });
  
  console.log('🟠 fmToTextMap:', { count: fmToTextMap.size });
  console.log('🟠 feToTextMap:', { count: feToTextMap.size });

  // ★ 고장연결 데이터 추출 (state.failureLinks에서) + 기능분석 역전개
  const rawFailureLinks = (state as any).failureLinks || [];
  const failureLinks = rawFailureLinks.map((link: any) => {
    const feId = link.feId || '';
    const feText = link.feText || link.cache?.feText || '';
    const fmId = link.fmId || '';
    
    // ★ FE 역전개: 1순위 - link에 저장된 역전개 정보 사용
    let feCategory = link.feScope || '';
    let feFunctionName = link.feFunctionName || '';
    let feRequirement = link.feRequirement || '';
    
    // ★ FE 역전개: 2순위 - reqId 역추적
    if (!feFunctionName) {
      const reqId = feToReqMap.get(feId) || feToReqMap.get(feText) || '';
      if (reqId) {
        const funcData = reqToFuncMap.get(reqId);
        if (funcData) {
          if (!feCategory) feCategory = funcData.category;
          feFunctionName = funcData.functionName;
          feRequirement = funcData.requirement;
        }
      }
    }
    
    // ★ FE 역전개: 3순위 - failureScope에서 직접 찾기
    if (!feCategory) {
      const scope = failureScopes.find((fs: any) => fs.id === feId || fs.effect === feText);
      if (scope) {
        feCategory = scope.scope || '';
        feRequirement = scope.requirement || '';
      }
    }
    
    // ★ DB에서 텍스트 조회 (fallback)
    const dbFmText = fmToTextMap.get(fmId) || '';
    const dbFeData = feToTextMap.get(feId);
    const dbFcText = fcToTextMap.get(link.fcId || '') || '';
    
    // ★★★ 2026-01-12: fmText fallback 강화 - 최대한 텍스트 추출 ★★★
    let finalFmText = link.fmText || link.cache?.fmText || dbFmText || '';
    
    // ★ fallback: fmText가 비어있으면 fmId에서 추출 시도
    if (!finalFmText && fmId) {
      // state.l2에서 해당 fmId의 mode 검색
      (state.l2 || []).forEach((proc: any) => {
        (proc.failureModes || []).forEach((fm: any) => {
          if (fm.id === fmId) {
            finalFmText = fm.mode || fm.name || fm.failure || fmId;
          }
        });
      });
    }
    
    // ★ 최후의 fallback: fmId 자체를 표시
    if (!finalFmText) {
      finalFmText = fmId || '(고장형태 없음)';
    }
    
    // ★ 누락된 ID 보강 (텍스트 기반, 마지막 방어)
    const normalizedFmId = fmId || fmTextToIdMap.get(finalFmText) || '';
    const finalFeText = feText || dbFeData?.text || '';
    const normalizedFeId = feId || feTextToIdMap.get(finalFeText) || '';
    const finalFcText = link.fcText || link.cache?.fcText || dbFcText;
    const normalizedFcId = link.fcId || fcTextToIdMap.get(finalFcText || '') || '';
    
    // ★ FM 역전개: state.l2에서 A'SSY 기능, 제품 특성 찾기 (DFMEA)
    const fmL2Data = fmToL2Map.get(normalizedFmId);
    const fmProcessFunction = fmL2Data?.processFunction || '';
    const fmProductChar = fmL2Data?.productChar || '';
    // DFMEA: fmProcessNo 제거됨
    const fmProcessName = fmL2Data?.processName || link.fmProcess || '';
    
    return {
      fmId: normalizedFmId || fmId,
      fmNo: link.fmNo || '',
      // ★ fmText: 1순위 link, 2순위 cache, 3순위 DB 조회, 4순위 state.l2 검색, 5순위 fmId
      fmText: finalFmText,
      // ★ L1 역전개 데이터 (제품명) (DFMEA)
      l1ProductName,     // ★ 제품명
      // DFMEA: fmProcessNo 제거됨
      fmProcessName,     // ★ A'SSY명
      fmProcessFunction, // ★ A'SSY 기능 (역전개)
      fmProductChar,     // ★ 제품특성 (역전개)
      feId: normalizedFeId || feId,
      // ★ feText: 1순위 link, 2순위 cache, 3순위 DB 조회
      feText: finalFeText,
      // ★ 심각도: 1순위 link, 2순위 cache, 3순위 DB 조회
      feSeverity: (() => {
        const sev = link.severity || link.feSeverity || link.cache?.feSeverity || dbFeData?.severity || 0;
        if (sev > 0) console.log(`🔴 심각도 발견: ${sev} (feId=${feId})`);
        return sev;
      })(),
      fcId: normalizedFcId || link.fcId || '',
      // ★ fcText: 1순위 link, 2순위 cache, 3순위 DB 조회
      fcText: finalFcText,
      // ★ FE 역전개 데이터
      feCategory,        // 구분 (Your Plant / Ship to Plant / User)
      feFunctionName,    // 제품 기능 (DFMEA)
      feRequirement,     // 요구사항
      // ★ FC 역전개 데이터 (고장원인 → 3L 기능분석)
      fcWorkFunction: link.fcWorkFunction || fcToL3Map.get(normalizedFcId || link.fcId || '')?.workFunction || '',  // 부품 기능 (DFMEA)
      fcProcessChar: link.fcProcessChar || fcToL3Map.get(normalizedFcId || link.fcId || '')?.processChar || '',    // 부품 특성 (DFMEA)
      // ★★★ FC 역전개 데이터 (고장원인 → 2L 구조분석) - fcToL3Map에서 fallback ★★★
      // DFMEA: fcM4 제거됨
      fcWorkElem: link.fcWorkElem || fcToL3Map.get(normalizedFcId || link.fcId || '')?.workElem || '',  // 부품 또는 특성 (DFMEA)
    };
  });
  
  console.log('🔵 AllTabRenderer: 고장연결 데이터 (역전개 포함)', { 
    count: failureLinks.length,
    sample: failureLinks[0] || null,
  });

  // ★★★ 새로운 ALL 화면: AllTabEmpty 사용 ★★★
  // 사이드바, 제목, 메인메뉴, 탭 메뉴는 상위 컴포넌트에서 유지
  // 워크시트 영역만 새로운 시트로 대체
  return (
    <AllTabEmpty 
      rowCount={30} 
      showRPN={showRPN}
      visibleSteps={visibleStepNames}
      failureLinks={failureLinks}
      state={state}
      setState={setState}
      setDirty={setDirty}
      // ★★★ 2026-01-12: 트리뷰 패널 전환 핸들러 ★★★
      onOpen5AP={onOpen5AP}
      onOpen6AP={onOpen6AP}
      onOpenRPN={onOpenRPN}
      activePanelId={activePanelId}
    />
  );
}
