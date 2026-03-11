/**
 * @file hooks/useImportHandlers.ts
 * @description CP Import 핸들러 훅 - 전체/그룹/개별 3가지 Import 모드 지원
 * @updated 2026-01-24 - 최적화: 인라인 파싱 로직 통합
 * @updated 2026-01-27 - CP Export Excel 템플릿 구조에 맞게 4행부터 데이터 Import
 * 
 * =====================================================================
 * ★ CP Export Excel 템플릿 구조 (CP 작성화면에서 Export한 파일)
 * =====================================================================
 * | 1행 | CP 정보 (메타 정보: CP No, 프로젝트명 등) | 스킵 |
 * | 2행 | 단계 (그룹 헤더: 공정현황, 관리항목 등)   | 스킵 |
 * | 3행 | 컬럼명 (공정번호, 공정명, 레벨 등)        | 스킵 |
 * | 4행~| 실제 데이터                              | Import |
 * =====================================================================
 * 
 * ⚠️ 기초정보 빈 템플릿과 다름!
 * - 빈 템플릿: 1행이 헤더, 2행부터 데이터 (rowNumber <= 1 스킵)
 * - Export Excel: 1-3행 메타/헤더, 4행부터 데이터 (rowNumber <= 3 스킵)
 * 
 * @see docs/cpdocs/CP_기초정보_Import_PRD.md
 * @see docs/cpdocs/CP_기초정보_빈템플릿_PRD.md
 */

import { useState, useCallback, useRef, RefObject } from 'react';
import type ExcelJS from 'exceljs';
import type { ImportedData } from '../types';
import { validateExcelFileWithAlert } from '@/lib/excel-validation';
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

type PreviewTab = 'full' | 'group' | 'individual';

// ★ itemCode 표준화 매핑
const STANDARDIZE_ITEM_CODE: Record<string, string> = {
  'processNo': 'A1',
  'processName': 'A2',
  'level': 'A3',
  'processDesc': 'A4',
  'equipment': 'A5',
  'ep': 'A6',
  'autoDetector': 'A7',
  'productChar': 'B1',
  'processChar': 'B2',
  'specialChar': 'B3',
  'spec': 'B4',
  'evalMethod': 'B5',
  'sampleSize': 'B6',
  'frequency': 'B7',
  'controlMethod': 'B7-1',
  'owner1': 'B8',
  'owner2': 'B9',
  'reactionPlan': 'B10',
};

// 개별 항목 컬럼 매핑
const ITEM_COLUMN_MAP: Record<string, string> = {
  processName: 'processName', processDesc: 'processDesc', equipment: 'equipment',
  productChar: 'productChar', processChar: 'processChar', spec: 'spec',
  evalMethod: 'evalMethod', sampleSize: 'sampleSize', frequency: 'frequency',
  controlMethod: 'controlMethod', reactionPlanItem: 'reactionPlan', ep: 'ep', autoDetector: 'autoDetector',
};

// 시트 매핑 정의
const SHEET_MAPPING: Record<string, { category: string; headers: string[]; itemCodes: string[] }> = {
  '공정현황': {
    category: 'processInfo',
    headers: ['공정번호', '공정명', '레벨', '공정설명', '설비/금형/지그'],
    itemCodes: ['A1', 'A2', 'A3', 'A4', 'A5'],
  },
  '검출장치': {
    category: 'detector',
    headers: ['공정번호', '공정명', 'EP', '자동검사장치'],
    itemCodes: ['A1', 'A2', 'A6', 'A7'],
  },
  '관리항목': {
    category: 'controlItem',
    headers: ['공정번호', '공정명', '제품특성', '공정특성', '특별특성', '스펙/공차'],
    itemCodes: ['A1', 'A2', 'B1', 'B2', 'B3', 'B4'],
  },
  '관리방법': {
    category: 'controlMethod',
    headers: ['공정번호', '공정명', '평가방법', '샘플크기', '주기', '관리방법', '책임1', '책임2'],
    itemCodes: ['A1', 'A2', 'B5', 'B6', 'B7', 'B7-1', 'B8', 'B9'],
  },
  '대응계획': {
    category: 'reactionPlan',
    headers: ['공정번호', '공정명', '제품특성', '공정특성', '대응계획'],
    itemCodes: ['A1', 'A2', 'B1', 'B2', 'B10'],
  },
};

// 그룹 시트명 매핑
const GROUP_SHEET_NAME_MAP: Record<string, string> = {
  'processInfo': '공정현황',
  'detector': '검출장치',
  'controlItem': '관리항목',
  'controlMethod': '관리방법',
  'reactionPlan': '대응계획',
};

export interface UseImportHandlersProps {
  selectedCpId: string;
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

// 중복 데이터 제거 (동일 공정에 여러 특성 허용)
// ★ 2026-01-24 수정: ID 기반 중복 제거로 변경
// - ID에는 행번호가 포함되어 있어 각 Excel 행이 고유하게 유지됨
// - 빈 셀이 있어도 같은 행의 다른 컬럼들은 보존됨
const removeDuplicates = (data: ImportedData[]): ImportedData[] => {
  const seen = new Set<string>();
  return data.filter(item => {
    // ID 기반 중복 제거: 각 행의 각 컬럼이 고유하게 유지됨
    // ID 형식: group-{sheet}-{rowNumber}-{colIdx} 또는 full-{sheetIdx}-{rowNumber}-{colIdx}
    const key = item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// itemCode 표준화 헬퍼
const standardizeItemCode = (itemCode: string): string => {
  return STANDARDIZE_ITEM_CODE[itemCode] || itemCode;
};

// ★ 데이터 시작 행 자동 감지 (1행 헤더 / 3행 메타+헤더 모두 지원)
const findDataStartRow = (worksheet: ExcelJS.Worksheet): number => {
  for (let i = 1; i <= Math.min(5, worksheet.rowCount); i++) {
    const firstCell = String(worksheet.getRow(i).getCell(1).value || '').trim();
    // 숫자로 시작하면 데이터 행
    if (/^\d+$/.test(firstCell)) return i;
    // 헤더 행 다음이 데이터
    if (firstCell.includes('공정번호') || firstCell.includes('번호') || firstCell === 'No') {
      // 다음 행이 (필수)/(선택) 안내행이면 한 칸 더 건너뜀
      const nextCell = String(worksheet.getRow(i + 1).getCell(1).value || '').trim();
      if (nextCell === '(필수)' || nextCell === '(선택)') return i + 2;
      return i + 1;
    }
  }
  return 4; // 기본값 (CP Export 형식: 1행 메타 + 2행 그룹 + 3행 헤더)
};

// 셀 값 추출 헬퍼
const extractCellValue = (cell: ExcelJS.Cell): string => {
  if (cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object' && 'text' in cell.value) {
    return String(cell.value.text || '').trim();
  }
  if (typeof cell.value === 'object' && 'result' in cell.value) {
    return String(cell.value.result || '').trim();
  }
  return String(cell.value || '').trim();
};

/**
 * CP Import 핸들러 훅
 * - 전체/그룹/개별 Excel Import
 * - 템플릿 다운로드
 */
export function useImportHandlers({
  selectedCpId,
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
  const fullFileInputRef = useRef<HTMLInputElement>(null);

  // 그룹 시트 Import 상태
  const [groupFileName, setGroupFileName] = useState('');
  const [groupPendingData, setGroupPendingData] = useState<ImportedData[]>([]);
  const [isGroupParsing, setIsGroupParsing] = useState(false);
  const [isGroupImporting, setIsGroupImporting] = useState(false);
  const [groupImportSuccess, setGroupImportSuccess] = useState(false);
  const groupFileInputRef = useRef<HTMLInputElement>(null);

  // 개별 항목 Import 상태
  const [itemFileName, setItemFileName] = useState('');
  const [itemPendingData, setItemPendingData] = useState<ImportedData[]>([]);
  const [isItemParsing, setIsItemParsing] = useState(false);
  const [isItemImporting, setIsItemImporting] = useState(false);
  const [itemImportSuccess, setItemImportSuccess] = useState(false);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  // ===== 템플릿 다운로드 핸들러 =====
  const downloadFullTemplate = useCallback(() => {
    downloadCPEmptyTemplate();
  }, []);

  const downloadFullSampleTemplate = useCallback(() => {
    downloadCPSampleTemplate();
  }, []);

  const downloadGroupSheetTemplate = useCallback(() => {
    switch (selectedSheet) {
      case 'processInfo': downloadProcessInfoTemplate(); break;
      case 'detector': downloadDetectorTemplate(); break;
      case 'controlItem': downloadControlItemTemplate(); break;
      case 'controlMethod': downloadControlMethodTemplate(); break;
      case 'reactionPlan': downloadReactionPlanTemplate(); break;
      default: downloadCPEmptyTemplate();
    }
  }, [selectedSheet]);

  const downloadGroupSheetSampleTemplate = useCallback(() => {
    switch (selectedSheet) {
      case 'processInfo': downloadProcessInfoSampleTemplate(); break;
      case 'detector': downloadDetectorSampleTemplate(); break;
      case 'controlItem': downloadControlItemSampleTemplate(); break;
      case 'controlMethod': downloadControlMethodSampleTemplate(); break;
      case 'reactionPlan': downloadReactionPlanSampleTemplate(); break;
      default: downloadCPSampleTemplate();
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
      const ExcelJS = (await import('exceljs')).default;
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const parsedData: ImportedData[] = [];

      workbook.worksheets.forEach((worksheet, sheetIdx) => {
        const sheetName = worksheet.name;
        const mapping = SHEET_MAPPING[sheetName];

        if (!mapping) {
          return;
        }

        let rowCount = 0;
        const dataStartRow = findDataStartRow(worksheet);

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber < dataStartRow) return; // 헤더/메타 행 스킵 (자동 감지)

          const processNo = extractCellValue(row.getCell(1));
          const processName = extractCellValue(row.getCell(2));

          // processNo가 없으면 건너뛰기 (원본 그대로 - 병합 셀 자동 채움 안함)
          if (!processNo) return;

          rowCount++;

          mapping.itemCodes.forEach((itemCode, colIdx) => {
            const value = extractCellValue(row.getCell(colIdx + 1));

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
      const ExcelJS = (await import('exceljs')).default;
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const parsedData: ImportedData[] = [];
      const targetSheetName = GROUP_SHEET_NAME_MAP[selectedSheet];
      const mapping = SHEET_MAPPING[targetSheetName];

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
      const dataStartRow = findDataStartRow(worksheet);

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber < dataStartRow) return; // 헤더/메타 행 스킵 (자동 감지)

        const processNo = extractCellValue(row.getCell(1));
        const processName = extractCellValue(row.getCell(2));

        // processNo가 없으면 건너뛰기 (원본 그대로 - 병합 셀 자동 채움 안함)
        if (!processNo) return;

        rowCount++;

        mapping.itemCodes.forEach((itemCode, colIdx) => {
          const value = extractCellValue(row.getCell(colIdx + 1));

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
      const ExcelJS = (await import('exceljs')).default;
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('시트를 찾을 수 없습니다');

      const parsedData: ImportedData[] = [];
      const itemCode = ITEM_COLUMN_MAP[selectedItem] || selectedItem;

      const itemDataStartRow = findDataStartRow(worksheet);
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber < itemDataStartRow) return; // 헤더/메타 행 스킵 (자동 감지)

        const processNo = extractCellValue(row.getCell(1));
        const value = extractCellValue(row.getCell(2));

        if (processNo && value) {
          parsedData.push({
            id: `i-${rowNumber}-1`,
            processNo,
            category: 'individual',
            itemCode: standardizeItemCode('processNo'),
            value: processNo,
            createdAt: new Date(),
          });
          parsedData.push({
            id: `i-${rowNumber}-2`,
            processNo,
            category: 'individual',
            itemCode: standardizeItemCode(itemCode),
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
