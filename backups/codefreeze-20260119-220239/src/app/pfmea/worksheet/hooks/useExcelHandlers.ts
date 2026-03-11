// @ts-nocheck
/**
 * @file hooks/useExcelHandlers.ts
 * @description FMEA 워크시트 엑셀 Import/Export 핸들러 훅
 * @module pfmea/worksheet
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { WorksheetState } from '../constants';
import { 
  exportFMEAWorksheet, 
  exportStructureAnalysis, 
  importStructureAnalysis,
  exportAllViewExcel,
  exportFunctionL1,
  exportFunctionL2,
  exportFunctionL3,
  downloadStructureTemplate 
} from '../excel-export';

// ============================================================================
// 타입 정의
// ============================================================================

interface ImportMessage {
  type: 'success' | 'error';
  text: string;
}

interface UseExcelHandlersParams {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  fmeaName: string;
}

interface UseExcelHandlersReturn {
  /** 파일 입력 ref */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Import 메시지 */
  importMessage: ImportMessage | null;
  /** Import 메시지 설정 */
  setImportMessage: (msg: ImportMessage | null) => void;
  /** 파일 Import 핸들러 */
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** 구조분석 Export 핸들러 */
  handleStructureExport: () => Promise<void>;
  /** 템플릿 다운로드 핸들러 */
  handleDownloadTemplate: () => Promise<void>;
  /** 전체 워크시트 Export 핸들러 */
  handleWorksheetExport: (activeTab: string) => void;
  /** 기능분석 Export 핸들러 */
  handleFunctionExport: (level: 'l1' | 'l2' | 'l3') => Promise<void>;
}

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * FMEA 워크시트 엑셀 핸들러 훅
 * 
 * @param params - 핸들러 파라미터
 * @returns 엑셀 Import/Export 관련 핸들러들
 */
export function useExcelHandlers({
  state,
  setState,
  setDirty,
  fmeaName,
}: UseExcelHandlersParams): UseExcelHandlersReturn {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<ImportMessage | null>(null);

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

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 3초 후 메시지 숨기기
    setTimeout(() => setImportMessage(null), 3000);
  }, [setState, setDirty]);

  // 구조분석 Export 핸들러
  const handleStructureExport = useCallback(async () => {
    await exportStructureAnalysis(state, fmeaName);
  }, [state, fmeaName]);

  // 템플릿 다운로드 핸들러
  const handleDownloadTemplate = useCallback(async () => {
    await downloadStructureTemplate();
  }, []);

  // 전체 워크시트 Export 핸들러
  const handleWorksheetExport = useCallback((activeTab: string) => {
    if (activeTab === 'all') {
      exportAllViewExcel(state, fmeaName);
    } else {
      exportFMEAWorksheet(state, fmeaName);
    }
  }, [state, fmeaName]);

  // 기능분석 Export 핸들러
  const handleFunctionExport = useCallback(async (level: 'l1' | 'l2' | 'l3') => {
    switch (level) {
      case 'l1':
        await exportFunctionL1(state, fmeaName);
        break;
      case 'l2':
        await exportFunctionL2(state, fmeaName);
        break;
      case 'l3':
        await exportFunctionL3(state, fmeaName);
        break;
    }
  }, [state, fmeaName]);

  return {
    fileInputRef,
    importMessage,
    setImportMessage,
    handleImportFile,
    handleStructureExport,
    handleDownloadTemplate,
    handleWorksheetExport,
    handleFunctionExport,
  };
}

export default useExcelHandlers;
