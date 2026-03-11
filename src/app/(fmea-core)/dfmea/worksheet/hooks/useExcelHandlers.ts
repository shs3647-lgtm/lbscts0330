/**
 * @file hooks/useExcelHandlers.ts
 * @description FMEA 워크시트 엑셀 Import/Export 핸들러 훅
 * @module pfmea/worksheet
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { WorksheetState } from '../constants';
// ✅ excel-export: ES dynamic import() — 사용자 액션 시점에 로드 (초기 번들 제외)

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
  /** FMEA ID (등록정보/CFT/개정현황 조회용) */
  fmeaId?: string;
}

interface UseExcelHandlersReturn {
  /** 파일 입력 ref */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
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
  handleWorksheetExport: (activeTab: string) => Promise<void>;
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
  fmeaId,
}: UseExcelHandlersParams): UseExcelHandlersReturn {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<ImportMessage | null>(null);

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
  }, [setState, setDirty]);

  // 구조분석 Export 핸들러
  const handleStructureExport = useCallback(async () => {
    const { exportStructureAnalysis } = await import('../excel-export');
    await exportStructureAnalysis(state, fmeaName);
  }, [state, fmeaName]);

  // 템플릿 다운로드 핸들러
  const handleDownloadTemplate = useCallback(async () => {
    const { downloadStructureTemplate } = await import('../excel-export');
    await downloadStructureTemplate();
  }, []);

  // 전체 워크시트 Export 핸들러
  const handleWorksheetExport = useCallback(async (activeTab: string) => {
    try {
      if (activeTab === 'all') {
        // ★ 등록정보 + CFT + 개정현황을 API에서 가져와서 전체 내보내기
        const { exportAllSheetsExcel } = await import('../excel-export-all');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const id = fmeaId || (state as any).fmeaId || '';

        // 병렬 fetch: 등록정보, CFT 멤버, 개정현황
        const [infoRes, cftRes, revRes] = await Promise.all([
          id ? fetch(`/api/fmea/info?fmeaId=${id}`).then(r => r.json()).catch(() => ({ fmeaInfo: null })) : Promise.resolve({ fmeaInfo: null }),
          id ? fetch(`/api/fmea/cft?fmeaId=${id}`).then(r => r.json()).catch(() => ({ members: [] })) : Promise.resolve({ members: [] }),
          id ? fetch(`/api/fmea/revisions?projectId=${id}`).then(r => r.json()).catch(() => ({ revisions: [] })) : Promise.resolve({ revisions: [] }),
        ]);

        const info = infoRes.fmeaInfo || {};
        const fmeaInfo = {
          fmeaId: info.fmeaId || id,
          fmeaName: info.subject || fmeaName,
          companyName: info.companyName || '',
          customerName: info.customerName || info.customer || '',
          modelYear: info.modelYear || '',
          fmeaStartDate: info.fmeaStartDate || '',
          fmeaRevisionDate: info.fmeaRevisionDate || '',
          revisionNo: info.revisionNo || '',
          fmeaResponsibleName: info.fmeaResponsibleName || info.responsible || '',
          designResponsibility: info.designResponsibility || '',
          confidentialityLevel: info.confidentialityLevel || '',
          engineeringLocation: info.engineeringLocation || info.factory || '',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cftMembers = (cftRes.members || []).map((m: any) => ({
          role: m.role || '',
          name: m.name || '',
          department: m.department || '',
          position: m.position || '',
          task: m.task || '',
          email: m.email || '',
          phone: m.phone || '',
          remark: m.remarks || m.remark || '',
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const revisions = (revRes.revisions || []).map((r: any) => ({
          revisionNumber: r.revisionNumber || '',
          revisionDate: r.revisionDate || '',
          revisionHistory: r.revisionHistory || '',
          createPosition: r.createPosition || '',
          createName: r.createName || '',
          createDate: r.createDate || '',
          createStatus: r.createStatus || '',
          reviewPosition: r.reviewPosition || '',
          reviewName: r.reviewName || '',
          reviewDate: r.reviewDate || '',
          reviewStatus: r.reviewStatus || '',
          approvePosition: r.approvePosition || '',
          approveName: r.approveName || '',
          approveDate: r.approveDate || '',
          approveStatus: r.approveStatus || '',
        }));

        await exportAllSheetsExcel(state, fmeaInfo, cftMembers, revisions);
      } else {
        const { exportFMEAWorksheet } = await import('../excel-export');
        await exportFMEAWorksheet(state, fmeaName);
      }
    } catch (err) {
      console.error('[엑셀 내보내기 오류]', err);
      alert(`엑셀 내보내기 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [state, fmeaName, fmeaId]);

  // 기능분석 Export 핸들러
  const handleFunctionExport = useCallback(async (level: 'l1' | 'l2' | 'l3') => {
    try {
      const mod = await import('../excel-export');
      switch (level) {
        case 'l1':
          await mod.exportFunctionL1(state, fmeaName);
          break;
        case 'l2':
          await mod.exportFunctionL2(state, fmeaName);
          break;
        case 'l3':
          await mod.exportFunctionL3(state, fmeaName);
          break;
      }
    } catch (err) {
      console.error('[엑셀 내보내기 오류]', err);
      alert(`엑셀 내보내기 실패: ${err instanceof Error ? err.message : String(err)}`);
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
