/**
 * @file FailureLinkTab.tsx
 * @description 고장연결 탭 - FM 중심 연결 관리 (SVG 연결선)
 * 좌측 60%: FE/FM/FC 3개 독립 테이블
 * 우측 40% 상단: 고장 연결도 (FM 중심, SVG 선 연결)
 * 우측 40% 하단: 연결 결과 테이블
 */

'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { FailureTabProps } from './types';
import { uid, COLORS, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '../../constants';
// 유틸리티 함수 import
import { 
  groupFailureLinksByFM,
  calculateLastRowMerge
} from '../../utils';
import FailureLinkTables from './FailureLinkTables';
import FailureLinkDiagram from './FailureLinkDiagram';
import FailureLinkResult from './FailureLinkResult';
import { useSVGLines } from './hooks/useSVGLines';
import { 
  containerStyle, 
  rightPanelStyle, 
  rightHeaderStyle, 
  modeButtonStyle, 
  resultButtonStyle,
  fmeaNameStyle,
  actionButtonGroupStyle,
  actionButtonStyle
} from './FailureLinkStyles';
import { saveToAIHistory } from '@/lib/ai-recommendation';

interface FEItem { id: string; scope: string; feNo: string; text: string; severity?: number; }
interface FMItem { id: string; fmNo: string; processName: string; text: string; }
interface FCItem { id: string; fcNo: string; processName: string; m4: string; workElem: string; text: string; }
interface LinkResult { fmId: string; feId: string; feNo: string; feScope: string; feText: string; severity: number; fmText: string; fmProcess: string; fcId: string; fcNo: string; fcProcess: string; fcM4: string; fcWorkElem: string; fcText: string; }

export default function FailureLinkTab({ state, setState, setDirty, saveToLocalStorage }: FailureTabProps) {
  const [currentFMId, setCurrentFMId] = useState<string | null>(null);
  const [linkedFEs, setLinkedFEs] = useState<Map<string, FEItem>>(new Map());
  const [linkedFCs, setLinkedFCs] = useState<Map<string, FCItem>>(new Map());
  const initialLinks = (state as any).failureLinks || [];
  const [savedLinks, setSavedLinks] = useState<LinkResult[]>(initialLinks);
  const [editMode, setEditMode] = useState<'edit' | 'confirm'>('edit');
  // 저장된 결과가 있으면 분석결과 뷰를 기본으로 표시
  const [viewMode, setViewMode] = useState<'diagram' | 'result'>(initialLinks.length > 0 ? 'result' : 'diagram');
  const [selectedProcess, setSelectedProcess] = useState<string>('all'); // 공정 필터 (FM용)
  const [fcLinkScope, setFcLinkScope] = useState<'current' | 'all'>('current'); // FC 연결 범위: 해당공정/모든공정
  const chainAreaRef = useRef<HTMLDivElement>(null);
  const fmNodeRef = useRef<HTMLDivElement>(null);
  const feColRef = useRef<HTMLDivElement>(null);
  const fcColRef = useRef<HTMLDivElement>(null);
  
  // ========== 초기 데이터 로드 (화면 전환 시에도 항상 복원) ==========
  const isInitialLoad = useRef(true);
  useEffect(() => {
    const stateLinks = (state as any).failureLinks || [];
    // ✅ 수정: isInitialLoad 조건 제거 - state.failureLinks가 있으면 항상 복원
    if (stateLinks.length > 0) {
      console.log('[FailureLinkTab] 데이터 복원: state.failureLinks →', stateLinks.length, '개');
      setSavedLinks(stateLinks);
      // ✅ 고장사슬을 기본값으로 유지 (result 화면으로 자동 전환하지 않음)
      isInitialLoad.current = false;
    }
  }, [(state as any).failureLinks]);

  // 제거: useEffect로 인한 무한 루프 방지 (toggleFE/toggleFC에서 직접 처리)

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
      
      // 구분(scope) 찾기: reqId로 type 조회
      let scope = 'Your Plant';
      if (fs.reqId) {
        (state.l1?.types || []).forEach((type: any) => {
          (type.functions || []).forEach((fn: any) => {
            (fn.requirements || []).forEach((req: any) => {
              if (req.id === fs.reqId) scope = type.name || 'Your Plant';
            });
          });
        });
      }
      
      // 중복 체크: 동일 구분 + 동일 고장영향은 하나로 통합
      const key = `${scope}|${fs.effect}`;
      if (seen.has(key)) {
        return; // 이미 추가된 조합이면 스킵
      }
      seen.add(key);
      
      const scopeName = scope || 'Your Plant';
      const prefix = scopeName === 'Your Plant' ? 'Y' : scopeName === 'Ship to Plant' ? 'S' : scopeName === 'User' ? 'U' : 'X';
      const feNo = `${prefix}${(counters[scopeName] || 0) + 1}`;
      counters[scopeName] = (counters[scopeName] || 0) + 1;
      items.push({ id: fs.id, scope: scopeName, feNo, text: fs.effect, severity: fs.severity });
    });
    return items;
  }, [state.l1, isL1Confirmed]);

  // FM 데이터 추출 (번호 포함)
  const fmData: FMItem[] = useMemo(() => {
    const items: FMItem[] = [];
    let counter = 1;
    (state.l2 || []).forEach((proc: any) => {
      if (!proc.name || proc.name.includes('클릭')) return;
      (proc.failureModes || []).forEach((fm: any) => {
        if (fm.name && !fm.name.includes('클릭') && !fm.name.includes('추가')) {
          items.push({ id: fm.id || uid(), fmNo: `M${counter}`, processName: proc.name, text: fm.name });
          counter++;
        }
      });
    });
    return items;
  }, [state.l2]);

  // FC 데이터 추출 (번호 포함)
  const fcData: FCItem[] = useMemo(() => {
    const items: FCItem[] = [];
    let counter = 1;
    (state.l2 || []).forEach((proc: any) => {
      if (!proc.name || proc.name.includes('클릭')) return;
      (proc.l3 || []).forEach((we: any) => {
        if (!we.name || we.name.includes('클릭') || we.name.includes('추가')) return;
        const m4 = we.m4 || we.fourM || 'MN';
        (we.failureCauses || []).forEach((fc: any) => {
          if (fc.name && !fc.name.includes('클릭') && !fc.name.includes('추가')) {
            items.push({ id: fc.id || uid(), fcNo: `C${counter}`, processName: proc.name, m4, workElem: we.name, text: fc.name });
            counter++;
          }
        });
      });
    });
    return items;
  }, [state.l2]);

  const currentFM = useMemo(() => fmData.find(f => f.id === currentFMId), [fmData, currentFMId]);

  // SVG 연결선 계산 훅
  const { svgPaths, drawLines } = useSVGLines(
    chainAreaRef,
    fmNodeRef,
    feColRef,
    fcColRef,
    linkedFEs,
    linkedFCs,
    currentFM
  );

  // 공정 목록 추출
  const processList = useMemo(() => {
    const procs = new Set<string>();
    (state.l2 || []).forEach((proc: any) => {
      if (proc.name && !proc.name.includes('클릭')) {
        procs.add(proc.name);
      }
    });
    return Array.from(procs);
  }, [state.l2]);

  // 필터링된 FM 데이터
  const filteredFmData = useMemo(() => {
    if (selectedProcess === 'all') return fmData;
    return fmData.filter(fm => fm.processName === selectedProcess);
  }, [fmData, selectedProcess]);

  // 필터링된 FC 데이터
  // FC 필터링: fcLinkScope에 따라 해당공정/모든공정 선택
  const filteredFcData = useMemo(() => {
    // 복합연결(모든공정) 모드면 전체 FC 표시
    if (fcLinkScope === 'all') return fcData;
    // 단순연결(해당공정) 모드면 현재 FM의 공정과 같은 FC만 표시
    if (selectedProcess === 'all') return fcData;
    return fcData.filter(fc => fc.processName === selectedProcess);
  }, [fcData, selectedProcess, fcLinkScope]);

  // 연결 현황 계산 (ID 기반 정확한 매칭)
  const linkStats = useMemo(() => {
    // FE 연결 현황 (빈 문자열 제외, 정확한 ID 매칭)
    const feLinkedIds = new Set<string>(
      savedLinks
        .filter(l => l.feId && l.feId.trim() !== '') // 빈 문자열 및 공백 제외
        .map(l => l.feId)
    );
    const feLinkedTexts = new Set<string>(
      savedLinks
        .filter(l => l.feText && l.feText.trim() !== '') // 하위호환용
        .map(l => l.feText)
    );
    const feLinkedCount = feData.filter(fe => 
      feLinkedIds.has(fe.id) || (fe.text && feLinkedTexts.has(fe.text))
    ).length;
    const feMissingCount = feData.length - feLinkedCount;

    // FM 연결 현황 (빈 문자열 제외)
    const fmLinkedIds = new Set<string>(
      savedLinks
        .filter(l => l.fmId && l.fmId.trim() !== '')
        .map(l => l.fmId)
    );
    const fmLinkedCount = fmData.filter(fm => fmLinkedIds.has(fm.id)).length;
    const fmMissingCount = fmData.length - fmLinkedCount;

    // FC 연결 현황 (빈 문자열 제외, 정확한 ID 매칭)
    const fcLinkedIds = new Set<string>(
      savedLinks
        .filter(l => l.fcId && l.fcId.trim() !== '') // 빈 문자열 및 공백 제외
        .map(l => l.fcId)
    );
    const fcLinkedTexts = new Set<string>(
      savedLinks
        .filter(l => l.fcText && l.fcText.trim() !== '') // 하위호환용
        .map(l => l.fcText)
    );
    const fcLinkedCount = fcData.filter(fc => 
      fcLinkedIds.has(fc.id) || (fc.text && fcLinkedTexts.has(fc.text))
    ).length;
    const fcMissingCount = fcData.length - fcLinkedCount;

    // 각 FM별 연결된 FE/FC 개수 계산
    const fmLinkCounts = new Map<string, { feCount: number; fcCount: number }>();
    fmData.forEach(fm => {
      const feCount = savedLinks.filter(l => l.fmId === fm.id && l.feId && l.feId.trim() !== '').length;
      const fcCount = savedLinks.filter(l => l.fmId === fm.id && l.fcId && l.fcId.trim() !== '').length;
      fmLinkCounts.set(fm.id, { feCount, fcCount });
    });

    console.log('[linkStats 재계산]', {
      savedLinksCount: savedLinks.length,
      feLinkedIds: Array.from(feLinkedIds),
      fcLinkedIds: Array.from(fcLinkedIds),
      fmLinkedIds: Array.from(fmLinkedIds)
    });

    return { 
      feLinkedCount, feMissingCount, 
      fmLinkedCount, fmMissingCount, 
      fcLinkedCount, fcMissingCount, 
      feLinkedIds, feLinkedTexts, // ID와 텍스트 모두 반환
      fmLinkedIds, 
      fcLinkedIds, fcLinkedTexts, // ID와 텍스트 모두 반환
      fmLinkCounts // 각 FM별 연결 카운트
    };
  }, [savedLinks, feData, fmData, fcData]);

  // SVG 연결선 계산은 useSVGLines 훅에서 처리 (위에서 정의됨)

  const selectFM = useCallback((id: string) => {
    // 이미 선택된 FM을 다시 클릭하면 해제
    if (currentFMId === id) {
      setCurrentFMId(null);
      setLinkedFEs(new Map());
      setLinkedFCs(new Map());
      setViewMode('diagram');
      setTimeout(drawLines, 50);
      return;
    }
    
    setCurrentFMId(id);
    setViewMode('diagram'); // FM 선택 시 고장사슬 화면으로 자동 전환
    // 선택한 FM의 공정으로 자동 필터링
    const selectedFm = fmData.find(f => f.id === id);
    if (selectedFm) {
      setSelectedProcess(selectedFm.processName);
    }
    // linkedFEs/linkedFCs는 useEffect에서 savedLinks를 기반으로 업데이트됨
    setTimeout(drawLines, 50);
  }, [currentFMId, fmData, drawLines]);

  // currentFMId 변경 시 savedLinks에서 해당 FM의 연결된 FE/FC 로드
  useEffect(() => {
    if (!currentFMId) {
      setLinkedFEs(new Map());
      setLinkedFCs(new Map());
      return;
    }
    
    const fmLinks = savedLinks.filter(l => l.fmId === currentFMId);
    const newFEs = new Map<string, FEItem>();
    const newFCs = new Map<string, FCItem>();
    fmLinks.forEach(link => {
      // feId/fcId로 조회 (ID 기반)
      if (link.feId) {
        const feItem = feData.find(f => f.id === link.feId);
        if (feItem) newFEs.set(feItem.id, feItem);
      }
      if (link.fcId) {
        const fcItem = fcData.find(f => f.id === link.fcId);
        if (fcItem) newFCs.set(fcItem.id, fcItem);
      }
    });
    setLinkedFEs(newFEs);
    setLinkedFCs(newFCs);
  }, [currentFMId, savedLinks, feData, fcData]);

  const toggleFE = useCallback((id: string) => {
    console.log('[toggleFE] 호출됨:', { currentFMId, feId: id, editMode });
    const fe = feData.find(f => f.id === id);
    if (!fe) {
      console.log('[toggleFE] FE 데이터 없음:', id);
      return;
    }
    
    // savedLinks를 함수형 업데이트로 안전하게 처리
    setSavedLinks(prev => {
      const currentLinks = prev;
      // currentFMId가 있으면 해당 FM과의 연결만 확인, 없으면 모든 FM과의 연결 확인
      const existingLink = currentFMId 
        ? currentLinks.find(l => l.fmId === currentFMId && l.feId === id && l.feId && l.feId.trim() !== '')
        : currentLinks.find(l => l.feId === id && l.feId && l.feId.trim() !== '');
      
      console.log('[toggleFE] 기존 연결 확인:', { 
        currentFMId, 
        feId: id, 
        existingLink: !!existingLink,
        savedLinksCount: currentLinks.length,
        allLinks: currentLinks.map(l => ({ fmId: l.fmId, feId: l.feId, fcId: l.fcId }))
      });
      
      if (existingLink) {
        // 이미 저장된 연결이면 해제 (currentFMId가 있으면 해당 FM만, 없으면 모든 FM에서 해제)
        const filtered = currentFMId
          ? currentLinks.filter(l => !(l.fmId === currentFMId && l.feId === id))
          : currentLinks.filter(l => l.feId !== id);
        
        console.log('[고장연결 해제] FE:', fe.text, 'FM:', currentFMId || '모든FM', '남은 연결:', filtered.length);
        
        // 상태 업데이트 (다음 이벤트 루프에서 실행하여 안전성 보장)
        requestAnimationFrame(() => {
          setState((prevState: any) => {
            console.log('[toggleFE 해제] state.failureLinks 업데이트:', filtered.length);
            return { ...prevState, failureLinks: filtered };
          });
          setDirty(true);
          setTimeout(() => {
            saveToLocalStorage?.();
          }, 100);
        });
        
        // 편집 중인 상태에서도 제거
        setLinkedFEs(prevFEs => {
          const next = new Map(prevFEs);
          next.delete(id);
          return next;
        });
        
        // 해제 후 분석결과 뷰로 전환
        if (filtered.length === 0) {
          setViewMode('diagram');
        } else {
          setViewMode('result');
        }
        
        return filtered;
      } else {
        // 새로 연결은 편집 모드에서만 (반환값 없음 = 상태 유지)
        if (currentFMId && editMode === 'edit') {
          setLinkedFEs(prevFEs => {
            const next = new Map(prevFEs);
            next.set(id, fe);
            return next;
          });
        } else if (!currentFMId) {
          alert('⚠️ 고장형태(FM)를 먼저 선택해주세요.');
        }
        return prev; // 상태 변경 없음
      }
    });
    setTimeout(drawLines, 50);
  }, [currentFMId, editMode, feData, drawLines, setState, setDirty, saveToLocalStorage]);

  const toggleFC = useCallback((id: string) => {
    console.log('[toggleFC] 호출됨:', { currentFMId, fcId: id, editMode });
    const fc = fcData.find(f => f.id === id);
    if (!fc) {
      console.log('[toggleFC] FC 데이터 없음:', id);
      return;
    }
    
    // savedLinks를 함수형 업데이트로 안전하게 처리
    setSavedLinks(prev => {
      const currentLinks = prev;
      // currentFMId가 있으면 해당 FM과의 연결만 확인, 없으면 모든 FM과의 연결 확인
      const existingLink = currentFMId
        ? currentLinks.find(l => l.fmId === currentFMId && l.fcId === id && l.fcId && l.fcId.trim() !== '')
        : currentLinks.find(l => l.fcId === id && l.fcId && l.fcId.trim() !== '');
      
      console.log('[toggleFC] 기존 연결 확인:', { 
        currentFMId, 
        fcId: id, 
        existingLink: !!existingLink,
        savedLinksCount: currentLinks.length,
        allLinks: currentLinks.map(l => ({ fmId: l.fmId, feId: l.feId, fcId: l.fcId }))
      });
      
      if (existingLink) {
        // 이미 저장된 연결이면 해제 (currentFMId가 있으면 해당 FM만, 없으면 모든 FM에서 해제)
        const filtered = currentFMId
          ? currentLinks.filter(l => !(l.fmId === currentFMId && l.fcId === id))
          : currentLinks.filter(l => l.fcId !== id);
        
        console.log('[고장연결 해제] FC:', fc.text, 'FM:', currentFMId || '모든FM', '남은 연결:', filtered.length);
        
        // 상태 업데이트 (다음 이벤트 루프에서 실행하여 안전성 보장)
        requestAnimationFrame(() => {
          setState((prevState: any) => {
            console.log('[toggleFC 해제] state.failureLinks 업데이트:', filtered.length);
            return { ...prevState, failureLinks: filtered };
          });
          setDirty(true);
          setTimeout(() => {
            saveToLocalStorage?.();
          }, 100);
        });
        
        // 편집 중인 상태에서도 제거
        setLinkedFCs(prevFCs => {
          const next = new Map(prevFCs);
          next.delete(id);
          return next;
        });
        
        // 해제 후 분석결과 뷰로 전환
        if (filtered.length === 0) {
          setViewMode('diagram');
        } else {
          setViewMode('result');
        }
        
        return filtered;
      } else {
        // 새로 연결은 편집 모드에서만 (반환값 없음 = 상태 유지)
        if (currentFMId && editMode === 'edit') {
          setLinkedFCs(prevFCs => {
            const next = new Map(prevFCs);
            next.set(id, fc);
            return next;
          });
        } else if (!currentFMId) {
          alert('⚠️ 고장형태(FM)를 먼저 선택해주세요.');
        }
        return prev; // 상태 변경 없음
      }
    });
    setTimeout(drawLines, 50);
  }, [currentFMId, editMode, fcData, drawLines, setState, setDirty, saveToLocalStorage]);

  const confirmLink = useCallback(() => {
    if (!currentFMId || !currentFM) return;
    // savedLinks state 사용 (현재 값 사용)
    let newLinks = savedLinks.filter(l => l.fmId !== currentFMId);
    const feArray = Array.from(linkedFEs.values());
    const fcArray = Array.from(linkedFCs.values());
    
    // ⚠️ 누락 검증: FE와 FC 모두 연결되어야 확정 가능
    const missingItems: string[] = [];
    if (feArray.length === 0) {
      missingItems.push('고장영향(FE)');
    }
    if (fcArray.length === 0) {
      missingItems.push('고장원인(FC)');
    }
    
    if (missingItems.length > 0) {
      alert(`⚠️ 고장연결 확정 불가\n\n누락된 항목:\n• ${missingItems.join('\n• ')}\n\n고장형태(FM)에 고장영향(FE)과 고장원인(FC)이 모두 연결되어야 확정할 수 있습니다.`);
      return;
    }
    
    // FK 관계 검증: ID가 실제 데이터와 일치하는지 확인
    const fmExists = fmData.find(fm => fm.id === currentFMId);
    if (!fmExists) {
      alert('⚠️ 고장형태(FM)를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
    const invalidFEIds = feArray.filter(fe => !feData.find(f => f.id === fe.id)).map(fe => fe.id);
    const invalidFCIds = fcArray.filter(fc => !fcData.find(f => f.id === fc.id)).map(fc => fc.id);
    
    if (invalidFEIds.length > 0 || invalidFCIds.length > 0) {
      console.error('[고장연결] FK 검증 실패:', { invalidFEIds, invalidFCIds });
      alert('⚠️ 연결할 데이터를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
    console.log('[고장연결 확정] FK 관계 검증 통과:', {
      fmId: currentFMId,
      feIds: feArray.map(fe => fe.id),
      fcIds: fcArray.map(fc => fc.id),
    });
    
    // FE와 FC를 각각 독립적으로 저장 (1:N 관계 지원 - 원자성 DB의 FailureLink는 1:1:1이지만, 여러 개의 Link로 표현)
    // FE 연결
    feArray.forEach(fe => {
      newLinks.push({
        fmId: currentFMId,
        feId: fe.id,
        feNo: fe.feNo,
        feScope: fe.scope,
        feText: fe.text,
        severity: fe.severity || 0,
        fmText: currentFM.text,
        fmProcess: currentFM.processName,
        fcId: '',
        fcNo: '',
        fcProcess: '',
        fcM4: '',
        fcWorkElem: '',
        fcText: ''
      });
    });
    
    // FC 연결
    fcArray.forEach(fc => {
      newLinks.push({
        fmId: currentFMId,
        feId: '',
        feNo: '',
        feScope: '',
        feText: '',
        severity: 0,
        fmText: currentFM.text,
        fmProcess: currentFM.processName,
        fcId: fc.id,
        fcNo: fc.fcNo,
        fcProcess: fc.processName,
        fcM4: fc.m4,
        fcWorkElem: fc.workElem,
        fcText: fc.text
      });
    });
    
    console.log('[고장연결 확정] 저장될 연결 수:', newLinks.length, '개 (FE:', feArray.length, 'FC:', fcArray.length, ')');
    
    setSavedLinks(newLinks);
    setState((prev: any) => ({ ...prev, failureLinks: newLinks }));
    setDirty(true);
    // 상태 업데이트 후 저장 보장
    setTimeout(() => {
      saveToLocalStorage?.();
    }, 100);
    setEditMode('edit');
    alert(`✅ ${currentFM.text} 연결이 확정 및 저장되었습니다.\n\nFE: ${feArray.length}개, FC: ${fcArray.length}개`);
  }, [currentFMId, currentFM, linkedFEs, linkedFCs, savedLinks, setState, setDirty, saveToLocalStorage, fmData, feData, fcData, editMode]);

  const handleModeChange = useCallback((mode: 'edit' | 'confirm') => {
    setEditMode(mode);
    if (mode === 'confirm' && currentFMId && (linkedFEs.size > 0 || linkedFCs.size > 0)) {
      confirmLink();
      setViewMode('result'); // 연결확정 후 분석결과 뷰로 전환
    }
  }, [currentFMId, linkedFEs, linkedFCs, confirmLink]);

  const handleSaveAll = useCallback(() => {
    setState((prev: any) => ({ ...prev, failureLinks: savedLinks }));
    setDirty(true);
    saveToLocalStorage?.();
    alert(`✅ 총 ${savedLinks.length}개의 고장연결이 저장되었습니다.`);
  }, [savedLinks, setState, setDirty, saveToLocalStorage]);

  // 고장연결 데이터 초기화
  const handleClearAll = useCallback(() => {
    if (!confirm('⚠️ 모든 고장연결 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    const emptyLinks: LinkResult[] = [];
    setSavedLinks(emptyLinks);
    setLinkedFEs(new Map());
    setLinkedFCs(new Map());
    setCurrentFMId(null);
    setState((prev: any) => ({ ...prev, failureLinks: emptyLinks }));
    setDirty(true);
    saveToLocalStorage?.();
    setViewMode('diagram');
    alert('✅ 모든 고장연결 데이터가 초기화되었습니다.');
    console.log('[고장연결 초기화] 모든 연결 데이터 삭제됨');
  }, [setState, setDirty, saveToLocalStorage]);

  // 역전개: 고장분석 ↔ 기능분석 FK 연결 확인 (자동변환 금지!)
  const handleReverseGenerate = useCallback(() => {
    if (savedLinks.length === 0) {
      alert('⚠️ 연결된 고장이 없습니다. 먼저 고장연결을 완료하세요.');
      return;
    }

    // FK 연결 상태 확인 (자동변환 없음 - DB에 저장된 실제 데이터만 조회)
    // 1L: 고장영향(FE) ↔ 요구사항 연결 확인
    const feConnections: { feText: string; feScope: string; reqId: string | null; reqName: string | null }[] = [];
    savedLinks.forEach(link => {
      if (link.feId && !feConnections.some(c => c.feText === link.feText)) {
        // failureScopes에서 reqId 조회
        const failureScope = (state.l1?.failureScopes || []).find((fs: any) => fs.id === link.feId) as any;
        const reqId = failureScope?.reqId || null;
        // 요구사항 이름 조회
        let reqName: string | null = null;
        if (reqId) {
          (state.l1?.types || []).forEach((type: any) => {
            (type.functions || []).forEach((func: any) => {
              const req = (func.requirements || []).find((r: any) => r.id === reqId);
              if (req) reqName = req.name;
            });
          });
        }
        feConnections.push({ feText: link.feText, feScope: link.feScope, reqId, reqName });
      }
    });

    // 2L: 고장형태(FM) ↔ 제품특성 연결 확인
    const fmConnections: { fmText: string; fmProcess: string; productCharName: string | null }[] = [];
    savedLinks.forEach(link => {
      if (link.fmId && !fmConnections.some(c => c.fmText === link.fmText)) {
        // 공정에서 제품특성 조회
        const procName = (link.fmProcess || '').replace(/^\d+\s*/, '').trim();
        let productCharName: string | null = null;
        (state.l2 || []).forEach((proc: any) => {
          if (proc.name === procName || proc.name.includes(procName) || procName.includes(proc.name)) {
            (proc.functions || []).forEach((func: any) => {
              if ((func.productChars || []).length > 0) {
                productCharName = func.productChars[0].name;
              }
            });
          }
        });
        fmConnections.push({ fmText: link.fmText, fmProcess: link.fmProcess, productCharName });
      }
    });

    // 3L: 고장원인(FC) ↔ 공정특성 연결 확인
    const fcConnections: { fcText: string; workElem: string; processCharName: string | null }[] = [];
    savedLinks.forEach(link => {
      if (link.fcId && !fcConnections.some(c => c.fcText === link.fcText)) {
        // 작업요소에서 공정특성 조회
        let processCharName: string | null = null;
        (state.l2 || []).forEach((proc: any) => {
          (proc.l3 || []).forEach((we: any) => {
            if (we.name === link.fcWorkElem || we.name.includes(link.fcWorkElem) || (link.fcWorkElem || '').includes(we.name)) {
              (we.functions || []).forEach((func: any) => {
                if ((func.processChars || []).length > 0) {
                  processCharName = func.processChars[0].name;
                }
              });
            }
          });
        });
        fcConnections.push({ fcText: link.fcText, workElem: link.fcWorkElem, processCharName });
      }
    });

    // 연결 상태 표시 (DB 데이터 그대로 표시, 자동변환 없음!)
    let resultMsg = '📊 역전개 - DB 연결 상태 확인 (자동변환 없음)\n\n';
    
    resultMsg += '【1L 고장영향 ↔ 요구사항】\n';
    const feLinked = feConnections.filter(c => c.reqName).length;
    const feMissing = feConnections.length - feLinked;
    resultMsg += `  ✓ 연결됨: ${feLinked}건 / ✗ 미연결: ${feMissing}건\n`;
    feConnections.forEach(c => {
      if (c.reqName) {
        resultMsg += `    ✅ ${c.feScope}: "${c.feText}" ↔ "${c.reqName}"\n`;
      } else {
        resultMsg += `    ❌ ${c.feScope}: "${c.feText}" → (기능분석 데이터 없음)\n`;
      }
    });
    
    resultMsg += '\n【2L 고장형태 ↔ 제품특성】\n';
    const fmLinked = fmConnections.filter(c => c.productCharName).length;
    const fmMissing = fmConnections.length - fmLinked;
    resultMsg += `  ✓ 연결됨: ${fmLinked}건 / ✗ 미연결: ${fmMissing}건\n`;
    fmConnections.forEach(c => {
      if (c.productCharName) {
        resultMsg += `    ✅ ${c.fmProcess}: "${c.fmText}" ↔ "${c.productCharName}"\n`;
      } else {
        resultMsg += `    ❌ ${c.fmProcess}: "${c.fmText}" → (기능분석 데이터 없음)\n`;
      }
    });
    
    resultMsg += '\n【3L 고장원인 ↔ 공정특성】\n';
    const fcLinked = fcConnections.filter(c => c.processCharName).length;
    const fcMissing = fcConnections.length - fcLinked;
    resultMsg += `  ✓ 연결됨: ${fcLinked}건 / ✗ 미연결: ${fcMissing}건\n`;
    fcConnections.forEach(c => {
      if (c.processCharName) {
        resultMsg += `    ✅ ${c.workElem}: "${c.fcText}" ↔ "${c.processCharName}"\n`;
      } else {
        resultMsg += `    ❌ ${c.workElem}: "${c.fcText}" → (기능분석 데이터 없음)\n`;
      }
    });

    resultMsg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    resultMsg += '⚠️ 미연결 항목은 기능분석 탭(1L/2L/3L)에서\n   직접 입력해야 합니다.\n';
    resultMsg += '📝 FMEA는 자동생성이 아닌, 실제 분석 결과입니다.\n';

    alert(resultMsg);
    
    // 기능분석 탭으로 이동 안내
    if (feMissing > 0 || fmMissing > 0 || fcMissing > 0) {
      const goToFunction = window.confirm(
        `미연결 항목이 있습니다.\n\n` +
        `• 1L 요구사항: ${feMissing}건 미연결\n` +
        `• 2L 제품특성: ${fmMissing}건 미연결\n` +
        `• 3L 공정특성: ${fcMissing}건 미연결\n\n` +
        `기능분석 탭(2L 메인공정 기능)으로 이동하시겠습니까?`
      );
      if (goToFunction) {
        setState((prev: any) => ({ ...prev, tab: 'function-l2' }));
      }
    }
  }, [savedLinks, state.l1, state.l2, setState]);

  return (
    <div style={containerStyle}>
      {/* 좌측: 3개 테이블 (60%) - FailureLinkTables 컴포넌트로 분리됨 */}
      <FailureLinkTables
        feData={feData}
        fmData={fmData}
        fcData={fcData}
        currentFMId={currentFMId}
        linkStats={linkStats}
        selectedProcess={selectedProcess}
        fcLinkScope={fcLinkScope}
        onSelectFM={selectFM}
        onToggleFE={toggleFE}
        onToggleFC={toggleFC}
        onProcessChange={setSelectedProcess}
        onFcScopeChange={setFcLinkScope}
      />

      {/* 우측: 토글 화면 (40%) */}
      <div style={rightPanelStyle}>
        {/* 헤더 + 토글 버튼 */}
        <div style={rightHeaderStyle}>
          {/* 고장사슬 토글 버튼 */}
          <button 
            onClick={() => setViewMode('diagram')} 
            style={modeButtonStyle(viewMode === 'diagram')}
          >
            고장사슬
          </button>
          
          {/* FMEA명 + 분석결과 (5:5 비율) */}
          <div className="flex-1 flex gap-1 min-w-0">
            {/* FMEA명 (50%) */}
            <div style={fmeaNameStyle}>
              {state.l1?.name || 'FMEA'}
            </div>
            
            {/* 분석결과 버튼 (50%) */}
            <button 
              onClick={() => setViewMode('result')} 
              style={resultButtonStyle(viewMode === 'result')}
            >
              분석결과 (FE:{new Set(savedLinks.map(l => l.feId).filter(Boolean)).size} FM:{new Set(savedLinks.map(l => l.fmId)).size} FC:{new Set(savedLinks.map(l => l.fcId).filter(Boolean)).size})
            </button>
          </div>
          
          {/* 우측 버튼들 */}
          <div style={actionButtonGroupStyle}>
            <button 
              onClick={() => handleModeChange('confirm')} 
              disabled={!currentFMId || (linkedFEs.size === 0 && linkedFCs.size === 0)} 
              style={actionButtonStyle({
                bg: '#2196f3',
                color: '#fff',
                opacity: (!currentFMId || (linkedFEs.size === 0 && linkedFCs.size === 0)) ? 0.5 : 1,
              })}
            >
              연결확정
            </button>
            <button 
              onClick={() => handleModeChange('edit')} 
              style={actionButtonStyle({
                bg: editMode === 'edit' ? '#4caf50' : '#fff',
                color: editMode === 'edit' ? '#fff' : '#333',
              })}
            >
              수정
            </button>
            <button 
              onClick={handleReverseGenerate} 
              disabled={savedLinks.length === 0} 
              style={actionButtonStyle({
                bg: '#fff8e1',
                color: '#e65100',
                border: '1px solid #e65100',
                opacity: savedLinks.length === 0 ? 0.5 : 1,
                cursor: savedLinks.length > 0 ? 'pointer' : 'not-allowed',
              })}
            >
              🔄 역전개
            </button>
            <button 
              onClick={handleClearAll} 
              disabled={savedLinks.length === 0} 
              style={actionButtonStyle({
                bg: '#ffebee',
                color: '#f57c00',
                border: '1px solid #f57c00',
                opacity: savedLinks.length === 0 ? 0.5 : 1,
                cursor: savedLinks.length > 0 ? 'pointer' : 'not-allowed',
              })}
            >
              🗑️ 초기화
            </button>
          </div>
        </div>
        
        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-auto">
          {/* 고장연결도 뷰 */}
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
            />
          )}

          {/* 연결결과 뷰 */}
          {viewMode === 'result' && (
            <FailureLinkResult
              savedLinks={savedLinks}
              fmData={fmData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
