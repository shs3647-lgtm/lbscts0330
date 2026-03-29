/**
 * @file usePageHandlers.ts
 * @description 워크시트 페이지 핸들러 모음 (page.tsx에서 분리)
 */

import { useCallback } from 'react';
import { WorksheetState, Process, WorkElement, uid } from '../constants';
import { normalizeL2ProcessNo } from '../utils/processNoNormalize';
// ✅ excel-export: ES dynamic import() — 사용자 액션 시점에 로드 (초기 번들 제외)

interface UsePageHandlersProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentFmea: any;
  targetL2Id: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setImportMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

export function usePageHandlers({
  state,
  setState,
  setDirty,
  currentFmea,
  targetL2Id,
  fileInputRef,
  setImportMessage
}: UsePageHandlersProps) {

  // 구조분석 Import 핸들러
  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportMessage(null);
    const { importStructureAnalysis } = await import('../excel-export');
    const result = await importStructureAnalysis(file, setState, setDirty);

    setImportMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 3초 후 메시지 숨기기
    setTimeout(() => setImportMessage(null), 3000);
  }, [setState, setDirty, fileInputRef, setImportMessage]);

  // 구조분석 Export 핸들러
  const handleStructureExport = useCallback(async () => {
    const fmeaName = currentFmea?.fmeaInfo?.subject || currentFmea?.project?.productName || 'PFMEA';
    const { exportStructureAnalysis } = await import('../excel-export');
    await exportStructureAnalysis(state, fmeaName);
  }, [state, currentFmea]);

  // 템플릿 다운로드 핸들러
  const handleDownloadTemplate = useCallback(async () => {
    const { downloadStructureTemplate } = await import('../excel-export');
    await downloadStructureTemplate();
  }, []);

  // 구조분석 누락 건수 계산
  const calculateStructureMissing = useCallback(() => {
    let count = 0;

    // 완제품명 누락
    if (!state.l1.name || state.l1.name.trim() === '') count++;

    // 공정 및 작업요소 검사
    state.l2.forEach(proc => {
      const procName = proc.name || '';
      if (!procName?.trim()) count++;

      proc.l3.forEach(we => {
        const weName = we.name || '';
        if (!weName?.trim()) count++;
      });
    });

    return count;
  }, [state.l1.name, state.l2]);

  // 공정 모달 저장 핸들러
  const handleProcessSave = useCallback((selectedProcesses: { no: string; name: string }[]) => {

    setState(prev => {
      const selectedNames = selectedProcesses.map(p => p.name);
      const keepL2 = prev.l2.filter(p => p.name?.trim() && selectedNames.includes(p.name));

      // 선택된 순서대로 처리 (기존 유지 또는 신규 생성)
      const finalL2: Process[] = selectedProcesses.map((p, idx) => {
        const existing = prev.l2.find(e => e.name === p.name && e.name?.trim());
        if (existing) {
          return { ...existing, no: normalizeL2ProcessNo(p.no), order: (idx + 1) * 10 };
        }
        return {
          id: uid(),
          no: normalizeL2ProcessNo(p.no),
          name: p.name,
          order: (idx + 1) * 10,
          functions: [],
          productChars: [],
          l3: [{ id: uid(), m4: '', name: '', order: 10, functions: [], processChars: [] }]
        };
      });

      // 빈 경우 기본 항목 추가
      if (finalL2.length === 0) {
        finalL2.push({
          id: uid(),
          no: '',
          name: '',
          order: 10,
          functions: [],
          productChars: [],
          l3: [{ id: uid(), m4: '', name: '', order: 10, functions: [], processChars: [] }]
        });
      }

      return { ...prev, l2: finalL2 };
    });
    setDirty(true);
  }, [setState, setDirty]);

  // 작업요소 모달 저장 핸들러
  const handleWorkElementSelect = useCallback((selectedElements: { id: string; m4: string; name: string }[]) => {
    if (!targetL2Id) return;

    // 중복 제거 (이름 기준)
    const uniqueElements = selectedElements.filter((e, idx, arr) =>
      arr.findIndex(x => x.name === e.name) === idx
    );

    setState(prev => {
      const newL2 = prev.l2.map(proc => {
        if (proc.id !== targetL2Id) return proc;

        const existingCount = proc.l3.length;

        // 선택된 항목들로 새 리스트 생성
        const newL3: WorkElement[] = uniqueElements.map((e, idx) => ({
          id: uid(),
          m4: e.m4 || '',
          name: e.name,
          order: (idx + 1) * 10,
          functions: [],
          processChars: [],
        }));

        // 행이 1개만 남았는데 0개 선택 → 내용만 비우고 행 유지
        if (existingCount === 1 && newL3.length === 0) {
          newL3.push({
            id: proc.l3[0]?.id || uid(),
            m4: '',
            name: '',
            order: 10,
            functions: [],
            processChars: []
          });
        }

        // 최소 1행 보장
        if (newL3.length === 0) {
          newL3.push({ id: uid(), m4: '', name: '', order: 10, functions: [], processChars: [] });
        }

        return { ...proc, l3: newL3 };
      });
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
  }, [targetL2Id, setState, setDirty]);

  // 작업요소 모달 삭제 핸들러
  const handleWorkElementDelete = useCallback((deletedNames: string[]) => {
    if (!targetL2Id || deletedNames.length === 0) return;

    const normalizedDeletedNames = deletedNames.map(n => n.trim());

    setState(prev => {
      const newL2 = prev.l2.map(proc => {
        if (proc.id !== targetL2Id) return proc;

        const currentCount = proc.l3.length;

        if (currentCount > 1) {
          const remainingL3 = proc.l3.filter(w => !normalizedDeletedNames.includes(w.name.trim()));
          if (remainingL3.length === 0) {
            remainingL3.push({ id: uid(), m4: '', name: '', order: 10, functions: [], processChars: [] });
          }
          return { ...proc, l3: remainingL3 };
        } else {
          const updatedL3 = proc.l3.map(w => {
            if (normalizedDeletedNames.includes(w.name.trim())) {
              return { ...w, name: '', m4: '' };
            }
            return w;
          });
          return { ...proc, l3: updatedL3 };
        }
      });
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
  }, [targetL2Id, setState, setDirty]);

  // 작업요소명 수정
  const renameL3 = useCallback((l3Id: string, newName: string) => {
    setState(prev => ({
      ...prev,
      l2: prev.l2.map(p => ({
        ...p,
        l3: p.l3.map(w => w.id === l3Id ? { ...w, name: newName } : w)
      }))
    }));
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
    renameL3
  };
}

