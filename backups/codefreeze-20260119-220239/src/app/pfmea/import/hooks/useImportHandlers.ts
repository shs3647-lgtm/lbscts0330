/**
 * @file useImportHandlers.ts
 * @description PFMEA Import 핸들러 훅
 * @created 2025-12-31
 */

import { useCallback } from 'react';
import { ImportedFlatData } from '../types';
import { parseMultiSheetExcel, ParseResult } from '../excel-parser';
import { FMEAProject } from './useImportState';

interface UseImportHandlersProps {
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  previewColumn: string;
  setPreviewColumn: React.Dispatch<React.SetStateAction<string>>;
  selectedRows: Set<string>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  draggedIndex: number | null;
  setDraggedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  relationTab: 'A' | 'B' | 'C';
  selectedRelationRows: Set<string>;
  setSelectedRelationRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  partialItemCode: string;
  partialPendingData: ImportedFlatData[];
  setPartialPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  setPartialFileName: React.Dispatch<React.SetStateAction<string>>;
  setIsPartialParsing: React.Dispatch<React.SetStateAction<boolean>>;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  setIsParsing: React.Dispatch<React.SetStateAction<boolean>>;
  setParseResult: React.Dispatch<React.SetStateAction<ParseResult | null>>;
  setPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  setImportSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  relationFileInputRef: React.RefObject<HTMLInputElement | null>;
  getRelationData: (tab?: 'A' | 'B' | 'C') => Record<string, string>[];
}

export function useImportHandlers(props: UseImportHandlersProps) {
  const {
    flatData, setFlatData,
    previewColumn, setPreviewColumn,
    selectedRows, setSelectedRows,
    draggedIndex, setDraggedIndex,
    relationTab,
    selectedRelationRows, setSelectedRelationRows,
    setDirty, setIsSaved, setIsSaving,
    partialItemCode, partialPendingData, setPartialPendingData,
    setPartialFileName, setIsPartialParsing,
    setFileName, setIsParsing, setParseResult, setPendingData, setImportSuccess,
    relationFileInputRef,
    getRelationData,
  } = props;

  /** 전체 삭제 (선택된 항목 코드의 모든 데이터 삭제) */
  const handleAllDelete = useCallback(() => {
    if (!confirm(`${previewColumn} 항목의 모든 데이터를 삭제하시겠습니까?`)) return;
    setFlatData(prev => prev.filter(d => d.itemCode !== previewColumn));
    setSelectedRows(new Set());
  }, [previewColumn, setFlatData, setSelectedRows]);

  /** 선택 삭제 (체크된 행만 삭제) */
  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }
    if (!confirm(`선택된 ${selectedRows.size}개 항목을 삭제하시겠습니까?`)) return;
    setFlatData(prev => prev.filter(d => !selectedRows.has(d.id)));
    setSelectedRows(new Set());
  }, [selectedRows, setFlatData, setSelectedRows]);

  /** 관계형 테이블 - 행 선택/해제 */
  const handleRelationRowSelect = useCallback((processNo: string) => {
    setSelectedRelationRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(processNo)) {
        newSet.delete(processNo);
      } else {
        newSet.add(processNo);
      }
      return newSet;
    });
  }, [setSelectedRelationRows]);

  /** 관계형 테이블 - 선택 삭제 */
  const handleRelationDeleteSelected = useCallback(() => {
    if (selectedRelationRows.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }
    if (!confirm(`선택된 ${selectedRelationRows.size}개 공정의 데이터를 삭제하시겠습니까?`)) return;
    setFlatData(prev => prev.filter(d => !selectedRelationRows.has(d.processNo)));
    setSelectedRelationRows(new Set());
    setDirty(true);
  }, [selectedRelationRows, setFlatData, setSelectedRelationRows, setDirty]);

  /** 관계형 테이블 - 전체 삭제 */
  const handleRelationAllDelete = useCallback(() => {
    const itemCodes = relationTab === 'A' ? ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] :
                      relationTab === 'B' ? ['B1', 'B2', 'B3', 'B4', 'B5'] :
                      ['C1', 'C2', 'C3', 'C4'];
    if (!confirm(`${relationTab === 'A' ? '고장형태(L2)' : relationTab === 'B' ? '고장원인(L3)' : '고장영향(L1)'} 데이터 전체를 삭제하시겠습니까?`)) return;
    setFlatData(prev => prev.filter(d => !itemCodes.includes(d.itemCode)));
    setSelectedRelationRows(new Set());
    setDirty(true);
  }, [relationTab, setFlatData, setSelectedRelationRows, setDirty]);

  /** 행 선택/해제 토글 */
  const handleRowSelect = useCallback((id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, [setSelectedRows]);

  /** 드래그 시작 */
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, [setDraggedIndex]);

  /** 드래그 오버 (드롭 허용) */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  /** 드롭 (순서 변경) */
  const handleDrop = useCallback((targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const selectedData = flatData.filter(d => d.itemCode === previewColumn);
    const otherData = flatData.filter(d => d.itemCode !== previewColumn);
    const newSelectedData = [...selectedData];
    const [draggedItem] = newSelectedData.splice(draggedIndex, 1);
    newSelectedData.splice(targetIndex, 0, draggedItem);
    setFlatData([...otherData, ...newSelectedData]);
    setDraggedIndex(null);
  }, [draggedIndex, flatData, previewColumn, setFlatData, setDraggedIndex]);

  /** 드래그 종료 */
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, [setDraggedIndex]);

  /** 개별 입포트 실행 */
  const handlePartialImport = useCallback(() => {
    if (partialPendingData.length === 0) {
      alert('Import할 데이터가 없습니다. 먼저 Excel 파일을 선택해주세요.');
      return;
    }
    const otherData = flatData.filter(d => d.itemCode !== partialItemCode);
    const mergedData = [...otherData, ...partialPendingData];
    setFlatData(mergedData);
    setPartialPendingData([]);
    setPreviewColumn(partialItemCode);
    setIsSaved(false);
    alert(`${partialItemCode} 항목 ${partialPendingData.length}건 Import 완료!`);
  }, [partialPendingData, flatData, partialItemCode, setFlatData, setPartialPendingData, setPreviewColumn, setIsSaved]);

  /** 미리보기 데이터 저장 (LocalStorage) */
  const handleSavePreview = useCallback(async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('pfmea_master_data', JSON.stringify(flatData));
      localStorage.setItem('pfmea_saved_at', new Date().toISOString());
      setIsSaved(true);
      console.log('✅ 데이터 저장 완료:', flatData.length, '건');
      setTimeout(() => setIsSaved(false), 5000);
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [flatData, setIsSaved, setIsSaving]);

  /** 관계형 데이터 저장 */
  const handleSaveRelation = useCallback(async () => {
    try {
      const relationData = {
        A: getRelationData('A'),
        B: getRelationData('B'),
        C: getRelationData('C'),
      };
      localStorage.setItem('pfmea_relation_data', JSON.stringify(relationData));
      localStorage.setItem('pfmea_relation_saved_at', new Date().toISOString());
      console.log('✅ 관계형 데이터 저장 완료');
      alert('관계형 데이터가 저장되었습니다.');
    } catch (error) {
      console.error('관계형 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  }, [getRelationData]);

  /** 파일 선택 핸들러 */
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setIsParsing(true);
    setImportSuccess(false);
    
    try {
      const result = await parseMultiSheetExcel(file);
      setParseResult(result);
      
      const flat: ImportedFlatData[] = [];
      result.processes.forEach((p) => {
        flat.push({ id: `${p.processNo}-A1`, processNo: p.processNo, category: 'A', itemCode: 'A1', value: p.processNo, createdAt: new Date() });
        flat.push({ id: `${p.processNo}-A2`, processNo: p.processNo, category: 'A', itemCode: 'A2', value: p.processName, createdAt: new Date() });
        p.processDesc.forEach((v, i) => flat.push({ id: `${p.processNo}-A3-${i}`, processNo: p.processNo, category: 'A', itemCode: 'A3', value: v, createdAt: new Date() }));
        p.productChars.forEach((v, i) => flat.push({ id: `${p.processNo}-A4-${i}`, processNo: p.processNo, category: 'A', itemCode: 'A4', value: v, createdAt: new Date() }));
        p.failureModes.forEach((v, i) => flat.push({ id: `${p.processNo}-A5-${i}`, processNo: p.processNo, category: 'A', itemCode: 'A5', value: v, createdAt: new Date() }));
        p.detectionCtrls.forEach((v, i) => flat.push({ id: `${p.processNo}-A6-${i}`, processNo: p.processNo, category: 'A', itemCode: 'A6', value: v, createdAt: new Date() }));
        p.workElements.forEach((v, i) => flat.push({ id: `${p.processNo}-B1-${i}`, processNo: p.processNo, category: 'B', itemCode: 'B1', value: v, createdAt: new Date() }));
        p.elementFuncs.forEach((v, i) => flat.push({ id: `${p.processNo}-B2-${i}`, processNo: p.processNo, category: 'B', itemCode: 'B2', value: v, createdAt: new Date() }));
        p.processChars.forEach((v, i) => flat.push({ id: `${p.processNo}-B3-${i}`, processNo: p.processNo, category: 'B', itemCode: 'B3', value: v, createdAt: new Date() }));
        p.failureCauses.forEach((v, i) => flat.push({ id: `${p.processNo}-B4-${i}`, processNo: p.processNo, category: 'B', itemCode: 'B4', value: v, createdAt: new Date() }));
        p.preventionCtrls.forEach((v, i) => flat.push({ id: `${p.processNo}-B5-${i}`, processNo: p.processNo, category: 'B', itemCode: 'B5', value: v, createdAt: new Date() }));
      });
      result.products.forEach((p) => {
        flat.push({ id: `C1-${p.productProcessName}`, processNo: 'ALL', category: 'C', itemCode: 'C1', value: p.productProcessName, createdAt: new Date() });
        p.productFuncs.forEach((v, i) => flat.push({ id: `C2-${p.productProcessName}-${i}`, processNo: 'ALL', category: 'C', itemCode: 'C2', value: v, createdAt: new Date() }));
        p.requirements.forEach((v, i) => flat.push({ id: `C3-${p.productProcessName}-${i}`, processNo: 'ALL', category: 'C', itemCode: 'C3', value: v, createdAt: new Date() }));
        p.failureEffects.forEach((v, i) => flat.push({ id: `C4-${p.productProcessName}-${i}`, processNo: 'ALL', category: 'C', itemCode: 'C4', value: v, createdAt: new Date() }));
      });
      
      setPendingData(flat);
      console.log('✅ 파싱 완료:', flat.length, '건');
    } catch (error) {
      console.error('파싱 오류:', error);
      alert('파일 파싱 중 오류가 발생했습니다.');
    } finally {
      setIsParsing(false);
    }
  }, [setFileName, setIsParsing, setImportSuccess, setParseResult, setPendingData]);

  /** 관계형 데이터 Excel 입포트 */
  const handleRelationImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      
      const sheet = workbook.worksheets[0];
      if (!sheet) {
        alert('Excel 파일에서 시트를 찾을 수 없습니다.');
        return;
      }
      
      const newData: ImportedFlatData[] = [];
      const category = relationTab;
      
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const processNo = String(row.getCell(1).value || '').trim();
        if (!processNo) continue;
        
        const colMapping = relationTab === 'A' 
          ? ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']
          : relationTab === 'B'
          ? ['A1', 'B1', 'B2', 'B3', 'B4', 'B5']
          : ['A1', 'C1', 'C2', 'C3', 'C4'];
        
        for (let col = 2; col <= colMapping.length; col++) {
          const value = String(row.getCell(col).value || '').trim();
          const itemCode = colMapping[col - 1];
          if (value && itemCode) {
            newData.push({
              id: `${processNo}-${itemCode}-${i}`,
              processNo: category === 'C' ? 'ALL' : processNo,
              category: itemCode.charAt(0) as 'A' | 'B' | 'C',
              itemCode,
              value,
              createdAt: new Date(),
            });
          }
        }
      }
      
      if (newData.length === 0) {
        alert('Import할 데이터가 없습니다.');
        return;
      }
      
      const itemCodes = relationTab === 'A' 
        ? ['A2', 'A3', 'A4', 'A5', 'A6']
        : relationTab === 'B'
        ? ['B1', 'B2', 'B3', 'B4', 'B5']
        : ['C1', 'C2', 'C3', 'C4'];
      
      const otherData = flatData.filter(d => !itemCodes.includes(d.itemCode));
      setFlatData([...otherData, ...newData]);
      setIsSaved(false);
      
      alert(`${relationTab} 관계형 데이터 ${newData.length}건 Import 완료!`);
      
      if (relationFileInputRef.current) {
        relationFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('관계형 입포트 오류:', error);
      alert('Import 중 오류가 발생했습니다.');
    }
  }, [relationTab, flatData, setFlatData, setIsSaved, relationFileInputRef]);

  return {
    handleAllDelete,
    handleDeleteSelected,
    handleRelationRowSelect,
    handleRelationDeleteSelected,
    handleRelationAllDelete,
    handleRowSelect,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handlePartialImport,
    handleSavePreview,
    handleSaveRelation,
    handleFileSelect,
    handleRelationImport,
  };
}

