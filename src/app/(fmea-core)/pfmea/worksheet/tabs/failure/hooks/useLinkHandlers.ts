/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useLinkHandlers.ts
 * @description FailureLinkTab의 핸들러 로직 분리
 */

import { useCallback, useMemo } from 'react';
import { FEItem, FCItem, FMItem, LinkResult } from '../FailureLinkTypes';

interface UseLinkHandlersProps {
  state: any;
  setState: (fn: (prev: any) => any) => void;
  setStateSynced?: (fn: (prev: any) => any) => void;
  setDirty: (dirty: boolean) => void;
  saveTemp?: () => void;
  saveToLocalStorage?: () => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  drawLines: () => void;
  // 상태
  currentFMId: string | null;
  setCurrentFMId: (id: string | null) => void;
  currentFM: FMItem | undefined;
  linkedFEs: Map<string, FEItem>;
  setLinkedFEs: React.Dispatch<React.SetStateAction<Map<string, FEItem>>>;
  linkedFCs: Map<string, FCItem>;
  setLinkedFCs: React.Dispatch<React.SetStateAction<Map<string, FCItem>>>;
  savedLinks: LinkResult[];
  setSavedLinks: React.Dispatch<React.SetStateAction<LinkResult[]>>;
  // 데이터
  feData: FEItem[];
  fmData: FMItem[];
  fcData: FCItem[];
  // 기타
  editMode: 'edit' | 'confirm';
  setViewMode: (mode: 'diagram' | 'result') => void;
  setSelectedProcess: (process: string) => void;
  justConfirmedRef: React.MutableRefObject<boolean>;
  linkStats: {
    fmMissingCount: number;
    feLinkedCount: number;
    fcLinkedCount: number;
    fmLinkCounts: Map<string, { feCount: number; fcCount: number }>;
  };
}

export function useLinkHandlers({
  state,
  setState,
  setStateSynced,
  setDirty,
  saveTemp,
  saveToLocalStorage,
  saveAtomicDB,
  drawLines,
  currentFMId,
  setCurrentFMId,
  currentFM,
  linkedFEs,
  setLinkedFEs,
  linkedFCs,
  setLinkedFCs,
  savedLinks,
  setSavedLinks,
  feData,
  fmData,
  fcData,
  editMode,
  setViewMode,
  setSelectedProcess,
  justConfirmedRef,
  linkStats,
}: UseLinkHandlersProps) {

  // ========== 공정 순서 비교 함수 ==========
  const getProcessOrder = useCallback((processName: string): number => {
    const proc = (state.l2 || []).find((p: any) => p.name === processName);
    if (proc) {
      const noNum = parseInt(proc.no, 10);
      if (!isNaN(noNum)) return noNum;
      return proc.order || (state.l2 || []).indexOf(proc) * 10;
    }
    return 9999;
  }, [state.l2]);

  // ========== 현재 FM 연결 상태 확인 ==========
  const isCurrentFMLinked = useMemo(() => {
    if (!currentFMId) return false;
    const fmLinks = savedLinks.filter(l => l.fmId === currentFMId);
    const hasFE = fmLinks.some(l => l.feId && l.feId.trim() !== '');
    const hasFC = fmLinks.some(l => l.fcId && l.fcId.trim() !== '');
    return hasFE || hasFC;
  }, [currentFMId, savedLinks]);

  // ========== FM 전환 전 자동 저장 (연결확정 안 눌러도 보존) ==========
  const autoSaveCurrentLinks = useCallback(() => {
    if (!currentFMId || !currentFM) return;

    const feArray = Array.from(linkedFEs.values());
    const fcArray = Array.from(linkedFCs.values());

    // FC가 없으면 유효한 연결이 아님 → 저장 스킵
    if (fcArray.length === 0) return;

    // 현재 FM의 기존 저장 링크와 비교하여 변경이 없으면 스킵
    const existingLinks = savedLinks.filter(l => l.fmId === currentFMId);
    const existingFeIds = new Set(existingLinks.map(l => l.feId).filter(Boolean));
    const existingFcIds = new Set(existingLinks.map(l => l.fcId).filter(Boolean));
    const currentFeIds = new Set(feArray.map(fe => fe.id));
    const currentFcIds = new Set(fcArray.map(fc => fc.id));

    const sameSize = existingFeIds.size === currentFeIds.size && existingFcIds.size === currentFcIds.size;
    const sameContent = sameSize
      && [...existingFeIds].every(id => currentFeIds.has(id))
      && [...existingFcIds].every(id => currentFcIds.has(id));
    if (sameContent) return; // 변경 없음

    // 새 링크 빌드 (confirmLink과 동일 로직, UI 프롬프트 없음)
    const newLinks = savedLinks.filter(l => l.fmId !== currentFMId);

    if (feArray.length > 0) {
      feArray.forEach(fe => {
        fcArray.forEach(fc => {
          newLinks.push({
            fmId: currentFMId,
            fmNo: currentFM.fmNo,
            fmText: currentFM.text,
            fmProcess: currentFM.processName,
            fmProcessNo: currentFM.processNo || '',
            feId: fe.id,
            feNo: fe.feNo,
            feScope: fe.scope,
            feText: fe.text,
            severity: fe.severity || 0,
            feFunctionName: fe.functionName || '',
            feRequirement: fe.requirement || '',
            fcId: fc.id,
            fcNo: fc.fcNo,
            fcProcess: fc.processName,
            fcM4: fc.m4,
            fcWorkElem: fc.workElem,
            fcText: fc.text,
            fcWorkFunction: fc.workFunction || '',
            fcProcessChar: fc.processChar || '',
          });
        });
      });
    } else {
      fcArray.forEach(fc => {
        newLinks.push({
          fmId: currentFMId,
          fmNo: currentFM.fmNo,
          fmText: currentFM.text,
          fmProcess: currentFM.processName,
          fmProcessNo: currentFM.processNo || '',
          feId: '',
          feNo: '',
          feScope: '',
          feText: '',
          severity: 0,
          feFunctionName: '',
          feRequirement: '',
          fcId: fc.id,
          fcNo: fc.fcNo,
          fcProcess: fc.processName,
          fcM4: fc.m4,
          fcWorkElem: fc.workElem,
          fcText: fc.text,
          fcWorkFunction: fc.workFunction || '',
          fcProcessChar: fc.processChar || '',
        });
      });
    }

    setSavedLinks(newLinks);
    const updateFn = (prev: any) => ({ ...prev, failureLinks: newLinks });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    saveTemp?.();
  }, [currentFMId, currentFM, linkedFEs, linkedFCs, savedLinks, setState, setStateSynced, setDirty, saveTemp, setSavedLinks]);

  // ========== FM 선택 ==========
  const selectFM = useCallback((id: string) => {
    // FM 전환 전 현재 연결 자동 저장
    autoSaveCurrentLinks();

    if (currentFMId === id) {
      // 동일 FM 클릭 → 선택 해제
      setCurrentFMId(null);
      setLinkedFEs(new Map());
      setLinkedFCs(new Map());
      setViewMode('diagram');
    } else {
      // 새 FM 선택
      setCurrentFMId(id);
      setViewMode('diagram');
      const fm = fmData.find(f => f.id === id);
      if (fm) {
        // FM 찾음
        setSelectedProcess(fm.processName);
      }
    }
    setTimeout(drawLines, 50);
  }, [currentFMId, fmData, drawLines, setCurrentFMId, setLinkedFEs, setLinkedFCs, setViewMode, setSelectedProcess, autoSaveCurrentLinks]);

  // ========== 이전/다음 FM 이동 ==========
  const currentFMIndex = useMemo(() => {
    if (!currentFMId) return -1;
    return fmData.findIndex(f => f.id === currentFMId);
  }, [currentFMId, fmData]);

  const hasPrevFM = currentFMIndex > 0;
  const hasNextFM = currentFMIndex >= 0 && currentFMIndex < fmData.length - 1;

  const goToPrevFM = useCallback(() => {
    if (hasPrevFM) {
      // ★ FM 전환 전 현재 연결 자동 저장
      autoSaveCurrentLinks();
      const prevFM = fmData[currentFMIndex - 1];
      setCurrentFMId(prevFM.id);
      setSelectedProcess(prevFM.processName);
      setViewMode('diagram');
      setTimeout(drawLines, 50);
    }
  }, [currentFMIndex, fmData, hasPrevFM, drawLines, setCurrentFMId, setSelectedProcess, setViewMode, autoSaveCurrentLinks]);

  const goToNextFM = useCallback(() => {
    if (hasNextFM) {
      // ★ FM 전환 전 현재 연결 자동 저장
      autoSaveCurrentLinks();
      const nextFM = fmData[currentFMIndex + 1];
      setCurrentFMId(nextFM.id);
      setSelectedProcess(nextFM.processName);
      setViewMode('diagram');
      setTimeout(drawLines, 50);
    }
  }, [currentFMIndex, fmData, hasNextFM, drawLines, setCurrentFMId, setSelectedProcess, setViewMode, autoSaveCurrentLinks]);

  // ========== FE 더블클릭 (연결 해제) ==========
  const unlinkFE = useCallback((id: string) => {
    const fe = feData.find(f => f.id === id);
    if (!fe) return;

    // unlinkFE

    let removedFromLinked = false;
    setLinkedFEs(prev => {
      if (prev.has(id)) {
        const next = new Map(prev);
        next.delete(id);
        // FE 선택 해제
        removedFromLinked = true;
        return next;
      }
      return prev;
    });

    if (currentFMId) {
      const existingLinks = savedLinks.filter(l =>
        l.fmId === currentFMId && l.feId === id
      );

      if (existingLinks.length > 0) {
        const filtered = savedLinks.filter(l =>
          !(l.fmId === currentFMId && l.feId === id)
        );

        // FE 연결 해제 (더블클릭) - ★ 2026-02-20: setStateSynced 우선 사용
        const updateState = setStateSynced || setState;

        setSavedLinks(filtered);
        updateState((prev: any) => ({ ...prev, failureLinks: filtered }));
        setDirty(true);
        requestAnimationFrame(() => {
          saveTemp?.();
        });

        alert(`✅ "${fe.text}" 연결이 해제되었습니다.`);
      }
    } else if (!removedFromLinked) {
      alert('⚠️ 고장형태(FM)를 먼저 선택해주세요.');
    }

    setTimeout(drawLines, 50);
  }, [currentFMId, feData, savedLinks, setState, setStateSynced, setDirty, saveTemp, drawLines, setLinkedFEs, setSavedLinks]);

  // ========== FE 토글 (연결/해제) ==========
  const toggleFE = useCallback((id: string) => {
    const fe = feData.find(f => f.id === id);
    if (!fe) return;

    if (!currentFMId) {
      alert('⚠️ 고장형태(FM)를 먼저 선택해주세요.');
      return;
    }

    if (linkedFEs.has(id)) {
      setLinkedFEs(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      setTimeout(drawLines, 50);
      return;
    }

    const existingLink = savedLinks.find(l =>
      l.fmId === currentFMId && l.feId === id
    );

    if (existingLink) {
      const filtered = savedLinks.filter(l =>
        !(l.fmId === currentFMId && l.feId === id)
      );

      // ★ 2026-02-20: setStateSynced 우선 사용
      const updateState = setStateSynced || setState;
      setSavedLinks(filtered);
      updateState((prev: any) => ({ ...prev, failureLinks: filtered }));
      setDirty(true);
      requestAnimationFrame(() => {
        saveTemp?.();
      });

      setLinkedFEs(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    } else if (editMode === 'edit') {
      setLinkedFEs(prev => {
        const next = new Map(prev);
        next.set(id, fe);
        return next;
      });
    }

    setTimeout(drawLines, 50);
  }, [currentFMId, editMode, feData, savedLinks, linkedFEs, setState, setStateSynced, setDirty, saveTemp, drawLines, setLinkedFEs, setSavedLinks]);

  // ========== FC 클릭 (연결 추가) ==========
  const toggleFC = useCallback((id: string) => {
    const fc = fcData.find(f => f.id === id);
    if (!fc) return;

    if (!currentFMId) {
      alert('⚠️ 고장형태(FM)를 먼저 선택해주세요.');
      return;
    }

    // 뒷공정 FC 연결 방지
    if (currentFM) {
      const fmOrder = getProcessOrder(currentFM.processName);
      const fcOrder = getProcessOrder(fc.processName);

      if (fcOrder > fmOrder) {
        alert(`⚠️ 뒷공정 원인 연결 불가!\n\n고장형태(FM): ${currentFM.processName}\n고장원인(FC): ${fc.processName}`);
        return;
      }
    }

    const existingLink = savedLinks.find(l =>
      l.fmId === currentFMId && l.fcId === id
    );
    if (existingLink) {
      return;
    }

    if (editMode === 'edit') {
      setLinkedFCs(prev => {
        const next = new Map(prev);
        next.set(id, fc);
        return next;
      });
    }

    setTimeout(drawLines, 50);
  }, [currentFMId, currentFM, editMode, fcData, savedLinks, drawLines, getProcessOrder, setLinkedFCs]);

  // ========== FC 더블클릭 (연결 해제) ==========
  const unlinkFC = useCallback((id: string) => {
    const fc = fcData.find(f => f.id === id);
    if (!fc) return;

    let removedFromLinked = false;
    setLinkedFCs(prev => {
      if (prev.has(id)) {
        const next = new Map(prev);
        next.delete(id);
        removedFromLinked = true;
        return next;
      }
      return prev;
    });

    if (currentFMId) {
      const existingLinks = savedLinks.filter(l =>
        l.fmId === currentFMId && l.fcId === id
      );

      if (existingLinks.length > 0) {
        const filtered = savedLinks.filter(l =>
          !(l.fmId === currentFMId && l.fcId === id)
        );

        // ★ 2026-02-20: setStateSynced 우선 사용
        const updateState = setStateSynced || setState;
        setSavedLinks(filtered);
        updateState((prev: any) => ({ ...prev, failureLinks: filtered }));
        setDirty(true);
        requestAnimationFrame(() => {
          saveTemp?.();
        });

        alert(`✅ "${fc.text}" 연결이 해제되었습니다.`);
      }
    } else if (!removedFromLinked) {
      alert('⚠️ 고장형태(FM)를 먼저 선택해주세요.');
    }

    setTimeout(drawLines, 50);
  }, [currentFMId, fcData, savedLinks, setState, setStateSynced, setDirty, saveTemp, drawLines, setLinkedFCs, setSavedLinks]);

  // ========== 연결 해제 ==========
  const unlinkCurrentFM = useCallback(() => {
    if (!currentFMId || !currentFM) return;

    if (!confirm(`⚠️ "${currentFM.text}"의 연결을 해제하시겠습니까?`)) {
      return;
    }

    const newLinks = savedLinks.filter(l => l.fmId !== currentFMId);
    setSavedLinks(newLinks);

    const updateFn = (prev: any) => ({ ...prev, failureLinks: newLinks });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);

    setLinkedFEs(new Map());
    setLinkedFCs(new Map());

    setTimeout(() => {
      saveTemp?.();
      drawLines();
    }, 100);

    alert(`✅ "${currentFM.text}" 연결이 해제되었습니다.`);
  }, [currentFMId, currentFM, savedLinks, setState, setStateSynced, setDirty, saveTemp, drawLines, setLinkedFEs, setLinkedFCs, setSavedLinks]);

  // ========== 연결 확정 ==========
  const confirmLink = useCallback(() => {
    if (!currentFMId || !currentFM) return;

    const feArray = Array.from(linkedFEs.values());
    const fcArray = Array.from(linkedFCs.values());

    // FC는 필수
    if (fcArray.length === 0) {
      alert('⚠️ FC(고장원인)를 선택해야 연결확정이 가능합니다.');
      return;
    }

    // FE는 선택 — 누락 시 confirm 메시지만 표시
    if (feArray.length === 0) {
      if (!window.confirm('고장영향평가 누락됨 계속진행하겠습니까?')) return;
    }

    const newLinks = savedLinks.filter(l => l.fmId !== currentFMId);

    if (feArray.length > 0) {
      feArray.forEach(fe => {
        fcArray.forEach(fc => {
          newLinks.push({
            fmId: currentFMId,
            fmNo: currentFM.fmNo,
            fmText: currentFM.text,
            fmProcess: currentFM.processName,
            fmProcessNo: currentFM.processNo || '',
            feId: fe.id,
            feNo: fe.feNo,
            feScope: fe.scope,
            feText: fe.text,
            severity: fe.severity || 0,
            feFunctionName: fe.functionName || '',
            feRequirement: fe.requirement || '',
            fcId: fc.id,
            fcNo: fc.fcNo,
            fcProcess: fc.processName,
            fcM4: fc.m4,
            fcWorkElem: fc.workElem,
            fcText: fc.text,
            fcWorkFunction: fc.workFunction || '',
            fcProcessChar: fc.processChar || '',
          });
        });
      });
    } else {
      // FE 없이 FC만 연결
      fcArray.forEach(fc => {
        newLinks.push({
          fmId: currentFMId,
          fmNo: currentFM.fmNo,
          fmText: currentFM.text,
          fmProcess: currentFM.processName,
          fmProcessNo: currentFM.processNo || '',
          feId: '',
          feNo: '',
          feScope: '',
          feText: '',
          severity: 0,
          feFunctionName: '',
          feRequirement: '',
          fcId: fc.id,
          fcNo: fc.fcNo,
          fcProcess: fc.processName,
          fcM4: fc.m4,
          fcWorkElem: fc.workElem,
          fcText: fc.text,
          fcWorkFunction: fc.workFunction || '',
          fcProcessChar: fc.processChar || '',
        });
      });
    }

    justConfirmedRef.current = true;

    setSavedLinks(newLinks);

    const updateFn = (prev: any) => ({ ...prev, failureLinks: newLinks });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);

    setTimeout(() => {
      saveTemp?.();
      drawLines();
    }, 100);

    // ★★★ 연결확정 후 → 다음 "누락 FM"으로 자동 이동 ★★★
    // newLinks 기준으로 아직 FE/FC 미연결인 FM을 찾아서 이동
    const findNextMissingFM = (): FMItem | null => {
      const globalIdx = fmData.findIndex(fm => fm.id === currentFMId);
      // newLinks에서 FM별 연결 카운트 계산
      const fmCounts = new Map<string, { fe: number; fc: number }>();
      newLinks.forEach(l => {
        if (!fmCounts.has(l.fmId)) fmCounts.set(l.fmId, { fe: 0, fc: 0 });
        const c = fmCounts.get(l.fmId)!;
        if (l.feId && l.feId.trim()) c.fe++;
        if (l.fcId && l.fcId.trim()) c.fc++;
      });
      const isMissing = (fm: FMItem) => {
        const c = fmCounts.get(fm.id);
        return !c || c.fe === 0 || c.fc === 0;
      };
      // 현재 FM 이후에서 누락건 찾기
      for (let i = globalIdx + 1; i < fmData.length; i++) {
        if (isMissing(fmData[i])) return fmData[i];
      }
      // 현재 FM 이전에서도 찾기 (순환)
      for (let i = 0; i < globalIdx; i++) {
        if (isMissing(fmData[i])) return fmData[i];
      }
      return null;
    };

    const nextMissingFM = findNextMissingFM();
    if (nextMissingFM) {
      // 다음 누락 FM으로 이동
      setTimeout(() => {
        justConfirmedRef.current = false;
        setCurrentFMId(nextMissingFM.id);
        setSelectedProcess(nextMissingFM.processName);
      }, 150);
    } else {
      // 모든 FM 연결 완료 → 결과 화면 전환
      setViewMode('result');
    }

    // 연결 완료
  }, [currentFMId, currentFM, linkedFEs, linkedFCs, savedLinks, fmData, setState, setStateSynced, setDirty, saveTemp, drawLines, justConfirmedRef, setCurrentFMId, setSelectedProcess, setViewMode, setSavedLinks]);

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
      saveTemp?.();
    });
    setViewMode('diagram');
    alert('✅ 모든 고장연결이 초기화되었습니다.');
  }, [setState, setStateSynced, setDirty, saveTemp, setViewMode, setSavedLinks, setLinkedFEs, setLinkedFCs, setCurrentFMId]);

  // ========== 역전개 ==========
  const handleReverseGenerate = useCallback(() => {
    if (savedLinks.length === 0) {
      alert('⚠️ 연결된 고장이 없습니다.');
      return;
    }

    let msg = '📊 역전개 - FK 연결 상태\n\n';

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

  // ========== 누락 FM 자동연결 ==========
  const handleAutoMatchMissing = useCallback(() => {
    // 1. 누락 FM 목록 추출
    const missingFMs = fmData.filter(fm => {
      const counts = linkStats.fmLinkCounts.get(fm.id);
      if (!counts) return true;
      return counts.feCount === 0 || counts.fcCount === 0;
    });

    if (missingFMs.length === 0) {
      alert('✅ 누락된 FM이 없습니다.');
      return;
    }

    // 2. 공정별 기존 링크 패턴 수집 (processName → { fes, fcs })
    const processPatterns = new Map<string, { fes: Map<string, LinkResult>; fcs: Map<string, LinkResult> }>();
    savedLinks.forEach(link => {
      const proc = link.fmProcess;
      if (!proc) return;
      if (!processPatterns.has(proc)) {
        processPatterns.set(proc, { fes: new Map(), fcs: new Map() });
      }
      const pat = processPatterns.get(proc)!;
      if (link.feId && link.feId.trim()) pat.fes.set(link.feId, link);
      if (link.fcId && link.fcId.trim()) pat.fcs.set(link.fcId, link);
    });

    // 3. 글로벌 FE 패턴 (fallback — 가장 많이 사용된 FE 집합)
    const globalFeMap = new Map<string, LinkResult>();
    savedLinks.forEach(link => {
      if (link.feId && link.feId.trim() && !globalFeMap.has(link.feId)) {
        globalFeMap.set(link.feId, link);
      }
    });

    // 4. 각 누락 FM에 대해 자동 링크 생성
    const newLinks: LinkResult[] = [...savedLinks];
    let linkedCount = 0;

    missingFMs.forEach(fm => {
      const pat = processPatterns.get(fm.processName);

      // FE 결정: 같은 공정 패턴 → 없으면 글로벌
      const feSourceMap = (pat && pat.fes.size > 0) ? pat.fes : globalFeMap;
      if (feSourceMap.size === 0) return;

      // FC 결정: 같은 공정 패턴 → 없으면 fcData에서 같은/앞공정 FC
      let fcEntries: { id: string; fcNo: string; process: string; m4: string; workElem: string; text: string; workFunction?: string; processChar?: string }[] = [];

      if (pat && pat.fcs.size > 0) {
        pat.fcs.forEach(link => {
          fcEntries.push({
            id: link.fcId,
            fcNo: link.fcNo,
            process: link.fcProcess,
            m4: link.fcM4,
            workElem: link.fcWorkElem,
            text: link.fcText,
            workFunction: link.fcWorkFunction,
            processChar: link.fcProcessChar,
          });
        });
      } else {
        // fcData에서 같은 공정 또는 앞공정 FC 수집
        const fmOrder = getProcessOrder(fm.processName);
        fcData
          .filter(fc => getProcessOrder(fc.processName) <= fmOrder)
          .forEach(fc => {
            fcEntries.push({
              id: fc.id,
              fcNo: fc.fcNo,
              process: fc.processName,
              m4: fc.m4,
              workElem: fc.workElem,
              text: fc.text,
              workFunction: fc.workFunction,
              processChar: fc.processChar,
            });
          });
      }

      if (fcEntries.length === 0) return;

      // 크로스 프로덕트 생성 (FM × FEs × FCs)
      feSourceMap.forEach(feLink => {
        fcEntries.forEach(fc => {
          // 중복 방지
          const dup = newLinks.some(l =>
            l.fmId === fm.id && l.feId === feLink.feId && l.fcId === fc.id
          );
          if (dup) return;

          newLinks.push({
            fmId: fm.id,
            fmNo: fm.fmNo,
            fmText: fm.text,
            fmProcess: fm.processName,
            fmProcessNo: fm.processNo || '',
            feId: feLink.feId,
            feNo: feLink.feNo,
            feScope: feLink.feScope,
            feText: feLink.feText,
            severity: feLink.severity || 0,
            feFunctionName: feLink.feFunctionName || '',
            feRequirement: feLink.feRequirement || '',
            fcId: fc.id,
            fcNo: fc.fcNo,
            fcProcess: fc.process,
            fcM4: fc.m4,
            fcWorkElem: fc.workElem,
            fcText: fc.text,
            fcWorkFunction: fc.workFunction || '',
            fcProcessChar: fc.processChar || '',
          });
        });
      });

      linkedCount++;
    });

    if (linkedCount === 0) {
      alert('⚠️ 매칭할 수 있는 FM이 없습니다.\n(같은 공정에 연결된 FM이 없거나 FC가 없습니다)');
      return;
    }

    // 5. 저장
    setSavedLinks(newLinks);
    const updateFn = (prev: any) => ({ ...prev, failureLinks: newLinks });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    requestAnimationFrame(() => {
      saveTemp?.();
    });

    alert(`✅ ${linkedCount}건 FM 고장매칭 완료!\n(같은 공정의 기존 FE·FC 패턴을 복사했습니다)`);
    setViewMode('result');
  }, [fmData, fcData, savedLinks, linkStats, getProcessOrder, setState, setStateSynced, setDirty, saveTemp, setViewMode, setSavedLinks]);

  return {
    // FM 관련
    selectFM,
    goToPrevFM,
    goToNextFM,
    hasPrevFM,
    hasNextFM,
    currentFMIndex,
    isCurrentFMLinked,
    // FE/FC 토글
    toggleFE,
    toggleFC,
    unlinkFE,
    unlinkFC,
    // 연결 관련
    confirmLink,
    unlinkCurrentFM,
    handleClearAll,
    handleReverseGenerate,
    handleAutoMatchMissing,
    // 유틸
    getProcessOrder,
  };
}
