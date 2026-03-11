/**
 * @file useWorksheetHandlers.ts
 * @description 워크시트 페이지 핸들러 훅
 */

import { useCallback } from 'react';
import { WorksheetState, Process, WorkElement, uid } from '../constants';
import { importStructureAnalysis, exportStructureAnalysis, downloadStructureTemplate } from '../excel-export';

export interface UseWorksheetHandlersProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  currentFmea: any;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setImportMessage: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; text: string } | null>>;
}

export function useWorksheetHandlers(props: UseWorksheetHandlersProps) {
  const { state, setState, setDirty, currentFmea, fileInputRef, setImportMessage } = props;

  // 구조분석 Import 핸들러
  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportMessage(null);
    const result = await importStructureAnalysis(file, setState, setDirty);
    
    setImportMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setTimeout(() => setImportMessage(null), 3000);
  }, [setState, setDirty, fileInputRef, setImportMessage]);

  // 구조분석 Export 핸들러
  const handleStructureExport = useCallback(async () => {
    const fmeaName = currentFmea?.fmeaInfo?.subject || currentFmea?.project?.productName || 'PFMEA';
    await exportStructureAnalysis(state, fmeaName);
  }, [state, currentFmea]);

  // 템플릿 다운로드 핸들러
  const handleDownloadTemplate = useCallback(async () => {
    await downloadStructureTemplate();
  }, []);

  // 구조분석 누락 건수 계산
  const calculateStructureMissing = useCallback(() => {
    let missing = 0;
    // L1 검증
    if (!state.l1 || !state.l1.name || state.l1.name.includes('클릭')) missing++;
    // L2 검증
    (state.l2 || []).forEach((proc: Process) => {
      if (!proc.name || proc.name.includes('클릭')) missing++;
      (proc.l3 || []).forEach((we: WorkElement) => {
        if (!we.name || we.name.includes('클릭') || we.name.includes('추가')) missing++;
      });
    });
    return missing;
  }, [state]);

  // 공정 선택 모달 저장 핸들러
  const handleProcessSave = useCallback((selectedProcesses: { no: string; name: string }[]) => {
    setState((prev: WorksheetState) => {
      const newL2: Process[] = selectedProcesses.map((p, idx) => ({
        id: uid(),
        no: p.no,
        name: p.name,
        order: idx + 1,
        confirmed: true,
        l3: [] as WorkElement[],
        functions: [],
        failureModes: [],
      }));
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
  }, [setState, setDirty]);

  // 작업요소 선택 핸들러
  const handleWorkElementSelect = useCallback((selectedElements: { id: string; m4: string; name: string }[], targetL2Id: string | null) => {
    if (!targetL2Id) return;
    
    setState((prev: WorksheetState) => {
      const newL2: Process[] = (prev.l2 || []).map((proc: Process) => {
        if (proc.id !== targetL2Id) return proc;
        
        const existingL3 = (proc.l3 || []).filter((we: WorkElement) => 
          we.name && !we.name.includes('클릭') && !we.name.includes('추가')
        );
        
        const newL3: WorkElement[] = selectedElements
          .filter(se => !existingL3.some((el: WorkElement) => el.name === se.name))
          .map((se, idx) => ({
            id: se.id || uid(),
            m4: se.m4 || 'MN',
            fourM: se.m4 || 'MN',
            name: se.name,
            order: existingL3.length + idx + 1,
            confirmed: true,
            functions: [],
            failureCauses: [],
          }));
        
        return {
          ...proc,
          l3: [...existingL3, ...newL3] as WorkElement[],
        };
      });
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
  }, [setState, setDirty]);

  // 작업요소 삭제 핸들러
  const handleWorkElementDelete = useCallback((deletedNames: string[], targetL2Id: string | null) => {
    if (!targetL2Id) return;
    
    setState((prev: WorksheetState) => {
      const newL2 = (prev.l2 || []).map(proc => {
        if (proc.id !== targetL2Id) return proc;
        return {
          ...proc,
          l3: (proc.l3 || []).filter((we: WorkElement) => !deletedNames.includes(we.name)),
        };
      });
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
  }, [setState, setDirty]);

  return {
    handleImportFile,
    handleStructureExport,
    handleDownloadTemplate,
    calculateStructureMissing,
    handleProcessSave,
    handleWorkElementSelect,
    handleWorkElementDelete,
  };
}

