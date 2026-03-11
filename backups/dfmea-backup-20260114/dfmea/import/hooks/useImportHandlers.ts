/**
 * @file useImportHandlers.ts
 * @description Import 페이지 핸들러 함수들
 */

import { ImportedFlatData } from '../types';
import { parseMultiSheetExcel } from '../excel-parser';

export interface UseImportHandlersProps {
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  pendingData: ImportedFlatData[];
  setPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  setIsImporting: React.Dispatch<React.SetStateAction<boolean>>;
  setImportSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  setIsParsing: React.Dispatch<React.SetStateAction<boolean>>;
  setParseResult: React.Dispatch<React.SetStateAction<any>>;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useImportHandlers(props: UseImportHandlersProps) {
  const {
    flatData,
    setFlatData,
    pendingData,
    setPendingData,
    setIsImporting,
    setImportSuccess,
    setIsParsing,
    setParseResult,
    setFileName,
    fileInputRef,
    setDirty,
  } = props;

  // handleFileSelect는 page.tsx에서 별도 정의 (ParseResult 변환 로직 포함)

  /** 전체 입포트 실행 */
  const handleImport = () => {
    if (pendingData.length === 0) {
      alert('Import할 데이터가 없습니다. 먼저 Excel 파일을 선택해주세요.');
      return;
    }

    setIsImporting(true);
    setImportSuccess(false);

    try {
      const existingMap = new Map<string, ImportedFlatData>();
      flatData.forEach((item) => {
        const key = `${item.processNo}-${item.itemCode}-${item.value}`;
        existingMap.set(key, item);
      });

      const mergedData: ImportedFlatData[] = [...flatData];
      let addedCount = 0;
      let updatedCount = 0;

      pendingData.forEach((newItem) => {
        const key = `${newItem.processNo}-${newItem.itemCode}-${newItem.value}`;
        const existingIndex = mergedData.findIndex(
          (d) => d.processNo === newItem.processNo && d.itemCode === newItem.itemCode && d.id === newItem.id
        );

        if (existingIndex >= 0) {
          mergedData[existingIndex] = { ...newItem, createdAt: new Date() };
          updatedCount++;
        } else {
          mergedData.push({ ...newItem, createdAt: new Date() });
          addedCount++;
        }
      });

      setFlatData(mergedData);
      setPendingData([]);
      setImportSuccess(true);
      setDirty(true);

      console.log(`Import 완료: 추가 ${addedCount}건, 업데이트 ${updatedCount}건`);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (error) {
      console.error('Import 오류:', error);
      alert('Import 중 오류가 발생했습니다.');
    } finally {
      setIsImporting(false);
    }
  };

  return { handleImport };
}
