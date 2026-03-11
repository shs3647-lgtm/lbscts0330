/**
 * @file useFailureLinkActions.ts
 * @description 고장연결 액션 훅 (저장, 확정, 연결/해제 등)
 */

import { useCallback } from 'react';
import { WorksheetState } from '../../../constants';
import { FEItem, FMItem, FCItem, LinkResult } from '../failureLinkTypes';

interface UseFailureLinkActionsProps {
  currentFMId: string | null;
  currentFM: FMItem | undefined;
  linkedFEs: Map<string, FEItem>;
  linkedFCs: Map<string, FCItem>;
  savedLinks: LinkResult[];
  setSavedLinks: React.Dispatch<React.SetStateAction<LinkResult[]>>;
  setLinkedFEs: React.Dispatch<React.SetStateAction<Map<string, FEItem>>>;
  setLinkedFCs: React.Dispatch<React.SetStateAction<Map<string, FCItem>>>;
  setEditMode: React.Dispatch<React.SetStateAction<'edit' | 'confirm'>>;
  setViewMode: React.Dispatch<React.SetStateAction<'diagram' | 'result'>>;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: () => void;
}

/**
 * 고장연결 액션 훅
 */
export function useFailureLinkActions({
  currentFMId,
  currentFM,
  linkedFEs,
  linkedFCs,
  savedLinks,
  setSavedLinks,
  setLinkedFEs,
  setLinkedFCs,
  setEditMode,
  setViewMode,
  setState,
  setDirty,
  saveToLocalStorage,
}: UseFailureLinkActionsProps) {
  
  /** 현재 연결 확정 */
  const confirmCurrentLink = useCallback(() => {
    if (!currentFMId || !currentFM) {
      alert('고장형태(FM)를 선택해주세요.');
      return;
    }
    if (linkedFEs.size === 0 && linkedFCs.size === 0) {
      alert('연결할 고장영향(FE) 또는 고장원인(FC)을 선택해주세요.');
      return;
    }
    
    // 기존 savedLinks에서 현재 FM의 연결 제거
    const filteredLinks = savedLinks.filter(l => l.fmId !== currentFMId);
    
    // 새 연결 생성: FE×FC 조합 (Cartesian Product)
    const newLinks: LinkResult[] = [];
    
    if (linkedFEs.size > 0 && linkedFCs.size > 0) {
      // FE와 FC 모두 있으면 Cartesian Product
      linkedFEs.forEach(fe => {
        linkedFCs.forEach(fc => {
          newLinks.push({
            fmId: currentFMId,
            feId: fe.id,
            feNo: fe.feNo,
            feScope: fe.scope,
            feText: fe.text,
            severity: fe.severity || 0,
            fmText: currentFM.text,
            fmProcess: currentFM.processName,
            fcId: fc.id,
            fcNo: fc.fcNo,
            fcProcess: fc.processName,
            fcM4: fc.m4,
            fcWorkElem: fc.workElem,
            fcText: fc.text,
          });
        });
      });
    } else if (linkedFEs.size > 0) {
      // FE만 있으면 FC 없이 저장
      linkedFEs.forEach(fe => {
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
          fcText: '',
        });
      });
    } else if (linkedFCs.size > 0) {
      // FC만 있으면 FE 없이 저장
      linkedFCs.forEach(fc => {
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
          fcText: fc.text,
        });
      });
    }
    
    const updatedLinks = [...filteredLinks, ...newLinks];
    setSavedLinks(updatedLinks);
    
    // state 업데이트
    setState((prevState: any) => ({
      ...prevState,
      failureLinks: updatedLinks,
    }));
    
    setDirty(true);
    setEditMode('confirm');
    setViewMode('result');
    
    console.log('[확정] 새 연결:', newLinks.length, '개, 총:', updatedLinks.length, '개');
    
    setTimeout(() => {
      saveToLocalStorage?.();
    }, 100);
  }, [currentFMId, currentFM, linkedFEs, linkedFCs, savedLinks, setSavedLinks, setState, setDirty, setEditMode, setViewMode, saveToLocalStorage]);
  
  /** 전체 연결 초기화 */
  const resetAllLinks = useCallback(() => {
    if (!confirm('⚠️ 모든 고장연결을 초기화하시겠습니까?')) return;
    
    setSavedLinks([]);
    setLinkedFEs(new Map());
    setLinkedFCs(new Map());
    
    setState((prevState: any) => ({
      ...prevState,
      failureLinks: [],
    }));
    
    setDirty(true);
    setViewMode('diagram');
    
    setTimeout(() => {
      saveToLocalStorage?.();
    }, 100);
    
    console.log('[초기화] 모든 연결 삭제됨');
  }, [setSavedLinks, setLinkedFEs, setLinkedFCs, setState, setDirty, setViewMode, saveToLocalStorage]);
  
  /** 특정 연결 삭제 */
  const deleteLink = useCallback((linkToDelete: LinkResult) => {
    const filteredLinks = savedLinks.filter(l => 
      !(l.fmId === linkToDelete.fmId && l.feId === linkToDelete.feId && l.fcId === linkToDelete.fcId)
    );
    
    setSavedLinks(filteredLinks);
    
    setState((prevState: any) => ({
      ...prevState,
      failureLinks: filteredLinks,
    }));
    
    setDirty(true);
    
    setTimeout(() => {
      saveToLocalStorage?.();
    }, 100);
    
    console.log('[삭제] 연결 삭제됨, 남은 연결:', filteredLinks.length);
  }, [savedLinks, setSavedLinks, setState, setDirty, saveToLocalStorage]);
  
  return {
    confirmCurrentLink,
    resetAllLinks,
    deleteLink,
  };
}



