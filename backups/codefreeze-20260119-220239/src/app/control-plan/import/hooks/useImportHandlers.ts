/**
 * @file hooks/useImportHandlers.ts
 * @description CP Import 핸들러 훅 (FMEA와 동일한 구조로 벤치마킹)
 * @updated 2026-01-13 - 5개 그룹 시트 + 12개 개별 항목 시트 구조
 * 
 * ★ CP 기초정보 템플릿 구조:
 * [그룹 시트] - 5개
 * 1. 공정현황: 공정번호, 공정명, 레벨, 공정설명, 설비/금형/지그
 * 2. 관리항목: 공정번호, 공정명, 제품특성, 공정특성, 특별특성, 스펙/공차
 * 3. 관리방법: 공정번호, 공정명, 평가방법, 샘플크기, 주기, 책임1, 책임2
 * 4. 대응계획: 공정번호, 공정명, 제품특성, 공정특성, 대응계획
 * 5. 검출장치: 공정번호, 공정명, EP, 자동검사장치
 * 
 * [개별 항목 시트] - 12개 (공정번호 + 단일 항목)
 */

import { useCallback } from 'react';
import { ImportedData } from '../types';
import { PREVIEW_COLUMNS, GROUP_SHEET_OPTIONS, INDIVIDUAL_SHEET_OPTIONS } from '../constants';
import {
  downloadCPEmptyTemplate,
  downloadCPSampleTemplate,
  downloadProcessInfoTemplate,
  downloadProcessInfoSampleTemplate,
  downloadControlItemTemplate,
  downloadControlItemSampleTemplate,
  downloadControlMethodTemplate,
  downloadControlMethodSampleTemplate,
  downloadReactionPlanTemplate,
  downloadReactionPlanSampleTemplate,
  downloadDetectorTemplate,
  downloadDetectorSampleTemplate,
  downloadIndividualTemplate,
  downloadIndividualSampleTemplate,
} from '../excel-template';

interface UseImportHandlersProps {
  selectedCpId: string;
  flatData: ImportedData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedData[]>>;
  pendingData: ImportedData[];
  setPendingData: React.Dispatch<React.SetStateAction<ImportedData[]>>;
  selectedRows: Set<string>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedColumn: string | null;
  setSelectedColumn: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setIsImporting: React.Dispatch<React.SetStateAction<boolean>>;
  setImportSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  setIsParsing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSheet: string;
}

export function useImportHandlers({
  selectedCpId,
  flatData,
  setFlatData,
  pendingData,
  setPendingData,
  selectedRows,
  setSelectedRows,
  selectedColumn,
  setSelectedColumn,
  setIsSaving,
  setIsSaved,
  setIsImporting,
  setImportSuccess,
  setFileName,
  setIsParsing,
  selectedSheet,
}: UseImportHandlersProps) {

  // ===== 전체 템플릿 다운로드 (다중 시트) =====
  const downloadFullTemplate = useCallback(() => {
    downloadCPEmptyTemplate();
  }, []);

  const downloadFullSampleTemplate = useCallback(() => {
    downloadCPSampleTemplate();
  }, []);

  // ===== 그룹 시트 템플릿 다운로드 =====
  const downloadGroupSheetTemplate = useCallback(() => {
    switch (selectedSheet) {
      case 'processInfo':
        downloadProcessInfoTemplate();
        break;
      case 'controlItem':
        downloadControlItemTemplate();
        break;
      case 'controlMethod':
        downloadControlMethodTemplate();
        break;
      case 'reactionPlan':
        downloadReactionPlanTemplate();
        break;
      case 'detector':
        downloadDetectorTemplate();
        break;
      default:
        downloadCPEmptyTemplate();
    }
  }, [selectedSheet]);

  const downloadGroupSheetSampleTemplate = useCallback(() => {
    switch (selectedSheet) {
      case 'processInfo':
        downloadProcessInfoSampleTemplate();
        break;
      case 'detector':
        downloadDetectorSampleTemplate();
        break;
      case 'controlItem':
        downloadControlItemSampleTemplate();
        break;
      case 'controlMethod':
        downloadControlMethodSampleTemplate();
        break;
      case 'reactionPlan':
        downloadReactionPlanSampleTemplate();
        break;
      default:
        downloadCPSampleTemplate();
    }
  }, [selectedSheet]);

  // ===== 개별 항목 시트 템플릿 다운로드 =====
  const downloadItemTemplate = useCallback((itemKey: string) => {
    downloadIndividualTemplate(itemKey);
  }, []);

  const downloadItemSampleTemplate = useCallback((itemKey: string) => {
    downloadIndividualSampleTemplate(itemKey);
  }, []);

  // ===== 파일 선택 핸들러 =====
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setIsParsing(true);
    setImportSuccess(false);
    
    // TODO: Excel 파싱 로직 구현 (ExcelJS 사용)
    setTimeout(() => {
      // 샘플 데이터 (파싱된 것처럼 표시)
      const sampleData: ImportedData[] = [
        { id: '1', processNo: '10', category: 'processInfo', itemCode: 'processNo', value: '10', createdAt: new Date() },
        { id: '2', processNo: '10', category: 'processInfo', itemCode: 'processName', value: '자재입고', createdAt: new Date() },
        { id: '3', processNo: '10', category: 'processInfo', itemCode: 'level', value: 'Main', createdAt: new Date() },
        { id: '4', processNo: '20', category: 'processInfo', itemCode: 'processNo', value: '20', createdAt: new Date() },
        { id: '5', processNo: '20', category: 'processInfo', itemCode: 'processName', value: '수입검사', createdAt: new Date() },
      ];
      setPendingData(sampleData);
      setIsParsing(false);
    }, 1000);
  }, [setFileName, setIsParsing, setImportSuccess, setPendingData]);

  // ===== Import 실행 =====
  const handleImport = useCallback(() => {
    if (pendingData.length === 0) return;
    
    setIsImporting(true);
    
    setTimeout(() => {
      setFlatData(prev => [...prev, ...pendingData]);
      setPendingData([]);
      setIsImporting(false);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    }, 500);
  }, [pendingData, setFlatData, setPendingData, setIsImporting, setImportSuccess]);

  // ===== 저장 =====
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    
    try {
      const key = `cp-import-data-${selectedCpId}`;
      localStorage.setItem(key, JSON.stringify(flatData));
      localStorage.setItem(`${key}-saved-at`, new Date().toISOString());
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedCpId, flatData, setIsSaving, setIsSaved]);

  // ===== 삭제 핸들러 =====
  const handleAllDelete = useCallback(() => {
    if (!confirm('모든 데이터를 삭제하시겠습니까?')) return;
    setFlatData([]);
    setSelectedRows(new Set());
    setSelectedColumn(null);
  }, [setFlatData, setSelectedRows, setSelectedColumn]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.size === 0) {
      alert('삭제할 행을 선택하세요.');
      return;
    }
    setFlatData(prev => prev.filter(d => !selectedRows.has(d.processNo)));
    setSelectedRows(new Set());
  }, [selectedRows, setFlatData, setSelectedRows]);

  const handleColumnAllDelete = useCallback(() => {
    if (!selectedColumn) {
      alert('삭제할 컬럼을 선택하세요.');
      return;
    }
    const colLabel = PREVIEW_COLUMNS.find(c => c.key === selectedColumn)?.label || selectedColumn;
    if (!confirm(`"${colLabel}" 컬럼의 모든 데이터를 삭제하시겠습니까?`)) return;
    setFlatData(prev => prev.filter(d => d.itemCode !== selectedColumn));
    setSelectedColumn(null);
  }, [selectedColumn, setFlatData, setSelectedColumn]);

  const handleColumnDeleteSelected = useCallback(() => {
    if (!selectedColumn) {
      alert('삭제할 컬럼을 선택하세요.');
      return;
    }
    if (selectedRows.size === 0) {
      alert('삭제할 행을 선택하세요.');
      return;
    }
    setFlatData(prev => prev.filter(d => !(d.itemCode === selectedColumn && selectedRows.has(d.processNo))));
    setSelectedRows(new Set());
  }, [selectedColumn, selectedRows, setFlatData, setSelectedRows]);

  // ===== 선택 핸들러 =====
  const handleColumnClick = useCallback((colKey: string) => {
    setSelectedColumn(prev => prev === colKey ? null : colKey);
  }, [setSelectedColumn]);

  const handleRowSelect = useCallback((id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [setSelectedRows]);

  return {
    // 전체 템플릿 다운로드
    downloadFullTemplate,
    downloadFullSampleTemplate,
    // 그룹 시트 템플릿 다운로드
    downloadGroupSheetTemplate,
    downloadGroupSheetSampleTemplate,
    // 개별 항목 시트 템플릿 다운로드
    downloadItemTemplate,
    downloadItemSampleTemplate,
    // 파일 핸들러
    handleFileSelect,
    handleImport,
    handleSave,
    // 삭제 핸들러
    handleAllDelete,
    handleDeleteSelected,
    handleColumnAllDelete,
    handleColumnDeleteSelected,
    // 선택 핸들러
    handleColumnClick,
    handleRowSelect,
  };
}
