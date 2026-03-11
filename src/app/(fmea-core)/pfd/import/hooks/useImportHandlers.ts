/**
 * @file useImportHandlers.ts
 * @description PFD Import 파일 Import/템플릿 다운로드 핸들러 훅
 * @created 2026-01-24
 * @benchmark CP Import useImportHandlers.ts 기반
 */

import { useState, useCallback, useRef, RefObject } from 'react';
import type { ImportedData } from '../types';
import { validateExcelFileWithAlert } from '@/lib/excel-validation';
import { ITEM_COLUMN_MAP, standardizeItemCode } from '../constants';
import {
  downloadPFDEmptyTemplate,
  downloadPFDSampleTemplate,
  downloadProcessInfoTemplate,
  downloadProcessInfoSampleTemplate,
  downloadCharacteristicTemplate,
  downloadCharacteristicSampleTemplate,
  downloadIndividualTemplate,
  downloadIndividualSampleTemplate,
} from '../excel-template';

type PreviewTab = 'full' | 'group' | 'individual';

export interface UseImportHandlersProps {
  selectedPfdId: string;
  selectedSheet: string;
  selectedItem: string;
  setFullData: React.Dispatch<React.SetStateAction<ImportedData[]>>;
  setGroupData: React.Dispatch<React.SetStateAction<ImportedData[]>>;
  setItemData: React.Dispatch<React.SetStateAction<ImportedData[]>>;
  setActiveTab: (tab: PreviewTab) => void;
}

export interface UseImportHandlersReturn {
  // 전체 Import
  fullFileName: string;
  fullPendingData: ImportedData[];
  isFullParsing: boolean;
  isFullImporting: boolean;
  fullImportSuccess: boolean;
  fullFileInputRef: RefObject<HTMLInputElement | null>;
  handleFullFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleFullImport: () => void;
  downloadFullTemplate: () => void;
  downloadFullSampleTemplate: () => void;
  // 그룹 시트 Import
  groupFileName: string;
  groupPendingData: ImportedData[];
  isGroupParsing: boolean;
  isGroupImporting: boolean;
  groupImportSuccess: boolean;
  groupFileInputRef: RefObject<HTMLInputElement | null>;
  handleGroupFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleGroupImport: () => void;
  downloadGroupSheetTemplate: () => void;
  downloadGroupSheetSampleTemplate: () => void;
  // 개별 항목 Import
  itemFileName: string;
  itemPendingData: ImportedData[];
  isItemParsing: boolean;
  isItemImporting: boolean;
  itemImportSuccess: boolean;
  itemFileInputRef: RefObject<HTMLInputElement | null>;
  handleItemFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleItemImport: () => void;
  downloadItemTemplate: (item: string) => void;
  downloadItemSampleTemplate: (item: string) => void;
}

// 중복 데이터 제거
const removeDuplicates = (data: ImportedData[]): ImportedData[] => {
  const seen = new Set<string>();
  return data.filter(item => {
    const key = `${item.processNo}|${item.itemCode}|${item.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Import 핸들러 훅
 * - 전체/그룹/개별 Excel Import
 * - 템플릿 다운로드
 */
export function useImportHandlers({
  selectedPfdId,
  selectedSheet,
  selectedItem,
  setFullData,
  setGroupData,
  setItemData,
  setActiveTab,
}: UseImportHandlersProps): UseImportHandlersReturn {
  // 전체 Import 상태
  const [fullFileName, setFullFileName] = useState('');
  const [fullPendingData, setFullPendingData] = useState<ImportedData[]>([]);
  const [isFullParsing, setIsFullParsing] = useState(false);
  const [isFullImporting, setIsFullImporting] = useState(false);
  const [fullImportSuccess, setFullImportSuccess] = useState(false);

  // 그룹 시트 Import 상태
  const [groupFileName, setGroupFileName] = useState('');
  const [groupPendingData, setGroupPendingData] = useState<ImportedData[]>([]);
  const [isGroupParsing, setIsGroupParsing] = useState(false);
  const [isGroupImporting, setIsGroupImporting] = useState(false);
  const [groupImportSuccess, setGroupImportSuccess] = useState(false);

  // 개별 항목 Import 상태
  const [itemFileName, setItemFileName] = useState('');
  const [itemPendingData, setItemPendingData] = useState<ImportedData[]>([]);
  const [isItemParsing, setIsItemParsing] = useState(false);
  const [isItemImporting, setIsItemImporting] = useState(false);
  const [itemImportSuccess, setItemImportSuccess] = useState(false);

  // 파일 입력 refs
  const fullFileInputRef = useRef<HTMLInputElement>(null);
  const groupFileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  // ===== 템플릿 다운로드 핸들러 =====
  const downloadFullTemplate = useCallback(() => {
    downloadPFDEmptyTemplate();
  }, []);

  const downloadFullSampleTemplate = useCallback(() => {
    downloadPFDSampleTemplate();
  }, []);

  const downloadGroupSheetTemplate = useCallback(() => {
    switch (selectedSheet) {
      case 'processInfo':
        downloadProcessInfoTemplate();
        break;
      case 'characteristic':
        downloadCharacteristicTemplate();
        break;
      default:
        downloadPFDEmptyTemplate();
    }
  }, [selectedSheet]);

  const downloadGroupSheetSampleTemplate = useCallback(() => {
    switch (selectedSheet) {
      case 'processInfo':
        downloadProcessInfoSampleTemplate();
        break;
      case 'characteristic':
        downloadCharacteristicSampleTemplate();
        break;
      default:
        downloadPFDSampleTemplate();
    }
  }, [selectedSheet]);

  const downloadItemTemplateHandler = useCallback((itemKey: string) => {
    downloadIndividualTemplate(itemKey);
  }, []);

  const downloadItemSampleTemplateHandler = useCallback((itemKey: string) => {
    downloadIndividualSampleTemplate(itemKey);
  }, []);

  // ===== 전체 파일 파싱 =====
  const handleFullFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ★★★ 2026-02-05: 엑셀 파일 형식 검증 (.xlsx만 지원) ★★★
    if (!validateExcelFileWithAlert(file)) {
      e.target.value = '';
      return;
    }

    setFullFileName(file.name);
    setIsFullParsing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const parsedData: ImportedData[] = [];

      // PFD 시트 매핑
      const sheetMapping: Record<string, { category: string; itemCodes: string[] }> = {
        '공정정보': {
          category: 'processInfo',
          itemCodes: ['A1', 'A2', 'A3', 'A4', 'A5'],
        },
        '특성정보': {
          category: 'characteristic',
          itemCodes: ['A1', 'A2', 'B1', 'B2', 'B3', 'B4'],
        },
      };

      workbook.worksheets.forEach((worksheet, sheetIdx) => {
        const sheetName = worksheet.name;
        const mapping = sheetMapping[sheetName];

        if (!mapping) {
          return;
        }

        let rowCount = 0;

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber <= 1) return; // 헤더 행 스킵 (1행만)

          const processNo = String(row.getCell(1).value || '').trim();
          const processName = String(row.getCell(2).value || '').trim();

          if (!processNo) return;
          rowCount++;

          mapping.itemCodes.forEach((itemCode, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            let value = '';

            if (cell.value !== null && cell.value !== undefined) {
              if (typeof cell.value === 'object' && 'text' in cell.value) {
                value = String(cell.value.text || '').trim();
              } else if (typeof cell.value === 'object' && 'result' in cell.value) {
                value = String(cell.value.result || '').trim();
              } else {
                value = String(cell.value || '').trim();
              }
            }

            parsedData.push({
              id: `full-${sheetIdx}-${rowNumber}-${colIdx}`,
              processNo,
              processName: itemCode === 'A2' ? value : processName || '',
              category: mapping.category,
              itemCode,
              value,
              createdAt: new Date(),
            });
          });
        });

      });

      setFullPendingData(parsedData);
    } catch (error) {
      console.error('❌ Excel 파싱 실패:', error);
      alert('Excel 파일을 읽는데 실패했습니다.');
    } finally {
      setIsFullParsing(false);
    }
  }, []);

  // ===== 그룹 시트 파일 파싱 =====
  const handleGroupFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ★★★ 2026-02-05: 엑셀 파일 형식 검증 (.xlsx만 지원) ★★★
    if (!validateExcelFileWithAlert(file)) {
      e.target.value = '';
      return;
    }

    setGroupFileName(file.name);
    setIsGroupParsing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const parsedData: ImportedData[] = [];

      const sheetMapping: Record<string, { category: string; itemCodes: string[] }> = {
        'processInfo': {
          category: 'processInfo',
          itemCodes: ['A1', 'A2', 'A3', 'A4', 'A5'],
        },
        'characteristic': {
          category: 'characteristic',
          itemCodes: ['A1', 'A2', 'B1', 'B2', 'B3', 'B4'],
        },
      };

      const sheetNameMap: Record<string, string> = {
        'processInfo': '공정정보',
        'characteristic': '특성정보',
      };

      const targetSheetName = sheetNameMap[selectedSheet];
      const mapping = sheetMapping[selectedSheet];

      if (!targetSheetName || !mapping) {
        alert(`알 수 없는 시트: ${selectedSheet}`);
        setIsGroupParsing(false);
        return;
      }

      const worksheet = workbook.worksheets.find(ws => ws.name === targetSheetName) || workbook.worksheets[0];

      if (!worksheet) {
        alert('시트를 찾을 수 없습니다.');
        setIsGroupParsing(false);
        return;
      }

      let rowCount = 0;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 1) return; // 헤더 행 스킵

        const processNo = String(row.getCell(1).value || '').trim();
        const processName = String(row.getCell(2).value || '').trim();

        if (!processNo) return;
        rowCount++;

        mapping.itemCodes.forEach((itemCode, colIdx) => {
          const cell = row.getCell(colIdx + 1);
          let value = '';

          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'object' && 'text' in cell.value) {
              value = String(cell.value.text || '').trim();
            } else if (typeof cell.value === 'object' && 'result' in cell.value) {
              value = String(cell.value.result || '').trim();
            } else {
              value = String(cell.value || '').trim();
            }
          }

          parsedData.push({
            id: `group-${selectedSheet}-${rowNumber}-${colIdx}`,
            processNo,
            processName: itemCode === 'A2' ? value : processName || '',
            category: mapping.category,
            itemCode,
            value,
            createdAt: new Date(),
          });
        });
      });

      setGroupPendingData(parsedData);
    } catch (error) {
      console.error('❌ Excel 파싱 실패:', error);
      alert('Excel 파일을 읽는데 실패했습니다.');
    } finally {
      setIsGroupParsing(false);
    }
  }, [selectedSheet]);

  // ===== 개별 항목 파일 파싱 =====
  const handleItemFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ★★★ 2026-02-05: 엑셀 파일 형식 검증 (.xlsx만 지원) ★★★
    if (!validateExcelFileWithAlert(file)) {
      e.target.value = '';
      return;
    }

    setItemFileName(file.name);
    setIsItemParsing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('시트를 찾을 수 없습니다');

      const parsedData: ImportedData[] = [];
      const itemCode = standardizeItemCode(ITEM_COLUMN_MAP[selectedItem] || selectedItem);

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 1) return; // 헤더 행 스킵

        const processNo = String(row.getCell(1).value || '').trim();
        const value = String(row.getCell(2).value || '').trim();

        if (processNo) {
          parsedData.push({
            id: `i-${rowNumber}-1`,
            processNo,
            category: 'individual',
            itemCode: 'A1',
            value: processNo,
            createdAt: new Date(),
          });
          parsedData.push({
            id: `i-${rowNumber}-2`,
            processNo,
            category: 'individual',
            itemCode,
            value,
            createdAt: new Date(),
          });
        }
      });

      setItemPendingData(parsedData);
    } catch (error) {
      console.error('❌ Excel 파싱 실패:', error);
      alert('Excel 파일을 읽는데 실패했습니다.');
    } finally {
      setIsItemParsing(false);
    }
  }, [selectedItem]);

  // ===== Import 실행 =====
  const handleFullImport = useCallback(() => {
    if (fullPendingData.length === 0) return;
    setIsFullImporting(true);
    setTimeout(() => {
      const uniqueData = removeDuplicates(fullPendingData);
      setFullData(prev => removeDuplicates([...prev, ...uniqueData]));
      setFullPendingData([]);
      setIsFullImporting(false);
      setFullImportSuccess(true);
      setActiveTab('full');
      setTimeout(() => setFullImportSuccess(false), 3000);
    }, 300);
  }, [fullPendingData, setFullData, setActiveTab]);

  const handleGroupImport = useCallback(() => {
    if (groupPendingData.length === 0) return;
    setIsGroupImporting(true);
    setTimeout(() => {
      const uniqueData = removeDuplicates(groupPendingData);
      setGroupData(prev => removeDuplicates([...prev, ...uniqueData]));
      setGroupPendingData([]);
      setIsGroupImporting(false);
      setGroupImportSuccess(true);
      setActiveTab('group');
      setTimeout(() => setGroupImportSuccess(false), 3000);
    }, 300);
  }, [groupPendingData, setGroupData, setActiveTab]);

  const handleItemImport = useCallback(() => {
    if (itemPendingData.length === 0) return;
    setIsItemImporting(true);
    setTimeout(() => {
      const uniqueData = removeDuplicates(itemPendingData);
      setItemData(prev => removeDuplicates([...prev, ...uniqueData]));
      setItemPendingData([]);
      setIsItemImporting(false);
      setItemImportSuccess(true);
      setActiveTab('individual');
      setTimeout(() => setItemImportSuccess(false), 3000);
    }, 300);
  }, [itemPendingData, setItemData, setActiveTab]);

  return {
    // 전체 Import
    fullFileName,
    fullPendingData,
    isFullParsing,
    isFullImporting,
    fullImportSuccess,
    fullFileInputRef,
    handleFullFileSelect,
    handleFullImport,
    downloadFullTemplate,
    downloadFullSampleTemplate,
    // 그룹 시트 Import
    groupFileName,
    groupPendingData,
    isGroupParsing,
    isGroupImporting,
    groupImportSuccess,
    groupFileInputRef,
    handleGroupFileSelect,
    handleGroupImport,
    downloadGroupSheetTemplate,
    downloadGroupSheetSampleTemplate,
    // 개별 항목 Import
    itemFileName,
    itemPendingData,
    isItemParsing,
    isItemImporting,
    itemImportSuccess,
    itemFileInputRef,
    handleItemFileSelect,
    handleItemImport,
    downloadItemTemplate: downloadItemTemplateHandler,
    downloadItemSampleTemplate: downloadItemSampleTemplateHandler,
  };
}
