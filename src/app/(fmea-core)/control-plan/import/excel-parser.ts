/**
 * @file excel-parser.ts
 * @description CP 기초정보 Excel 파서 - 다중 시트 방식
 * @author AI Assistant
 * @created 2026-01-21
 * @updated 2026-01-27 - CP Export Excel 템플릿 구조에 맞게 4행부터 데이터 파싱
 *
 * =====================================================================
 * ★ CP Export Excel 템플릿 행 구조
 * =====================================================================
 * | 1행 | CP 정보 (메타: CP No, 프로젝트명)        | 스킵 |
 * | 2행 | 단계 (그룹 헤더: 공정현황, 관리항목 등)   | 스킵 |
 * | 3행 | 컬럼명                                   | 스킵 |
 * | 4행~| 실제 데이터                              | 파싱 |
 * =====================================================================
 * 
 * ⚠️ 빈 템플릿(1행 헤더, 2행 데이터)과 다름!
 *
 * 시트 구조 (5개):
 * 1. 공정현황: 공정번호, 공정명, 레벨, 공정설명, 설비/금형/지그
 * 2. 검출장치: 공정번호, 공정명, EP, 자동검사장치
 * 3. 관리항목: 공정번호, 공정명, 제품특성, 공정특성, 특별특성, 스펙/공차
 * 4. 관리방법: 공정번호, 공정명, 평가방법, 샘플크기, 주기, 관리방법, 책임1, 책임2
 * 5. 대응계획: 공정번호, 공정명, 제품특성, 공정특성, 대응계획
 *
 * 공정번호를 기준으로 모든 시트를 연결하여 관계형 데이터 생성
 * 
 * @see docs/cpdocs/CP_기초정보_Import_PRD.md
 */

import type ExcelJS from 'exceljs';
import { CPParsedRow, CPParseResult, CPSheetType, CP_SHEET_CONFIG } from './parser-types';

/**
 * CP Excel 파일 파싱 (다중 시트)
 */
export async function parseCPExcel(file: File): Promise<CPParseResult> {
  const ExcelJS = (await import('exceljs')).default;
  const errors: string[] = [];
  const warnings: string[] = [];
  const sheetSummary: { name: string; rowCount: number }[] = [];

  try {
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    // 시트별 데이터 저장
    const sheetDataMap: Record<CPSheetType, CPParsedRow[]> = {
      processInfo: [],
      detector: [],
      controlItem: [],
      controlMethod: [],
      reactionPlan: [],
    };

    // 디버깅: 모든 시트 이름 출력
    const allSheetNames: string[] = [];
    workbook.eachSheet((sheet) => {
      allSheetNames.push(sheet.name);
    });

    // 각 시트 처리
    workbook.eachSheet((sheet) => {
      const originalSheetName = sheet.name.trim();
      const sheetType = normalizeSheetName(originalSheetName);

      if (!sheetType) {
        warnings.push(`시트 "${originalSheetName}"은(는) CP 템플릿 시트가 아니어서 건너뛰었습니다.`);
        return;
      }


      const config = CP_SHEET_CONFIG[sheetType];
      const rows: CPParsedRow[] = [];

      // 데이터 시작 행 찾기 (헤더 + 안내행 건너뛰기)
      const startRow = findDataStartRow(sheet);

      // 데이터 읽기
      for (let i = startRow; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const processNo = String(row.getCell(1).value || '').trim();

        // 빈 행이면 건너뛰기
        if (!processNo) continue;

        // 공정번호가 숫자가 아니면 건너뛰기 (헤더 등)
        if (!/^\d+$/.test(processNo)) continue;

        const processName = String(row.getCell(2).value || '').trim();

        // 시트별 데이터 파싱
        const parsedRow = parseRowBySheetType(sheetType, row, processNo, processName, config.columns);
        if (parsedRow) {
          rows.push(parsedRow);
        }
      }

      sheetDataMap[sheetType] = rows;
      sheetSummary.push({ name: sheetType, rowCount: rows.length });
    });

    // 공정별 통합 데이터 생성
    const mergedData = mergeSheetData(sheetDataMap);

    return {
      success: true,
      data: mergedData,
      sheetData: sheetDataMap,
      sheetSummary,
      errors,
      warnings,
    };
  } catch (error) {
    console.error('CP Excel 파싱 오류:', error);
    return {
      success: false,
      data: [],
      sheetData: {
        processInfo: [],
        detector: [],
        controlItem: [],
        controlMethod: [],
        reactionPlan: [],
      },
      sheetSummary,
      errors: [`파일 파싱 오류: ${error}`],
      warnings,
    };
  }
}

/**
 * 데이터 시작 행 찾기
 * - 1행: CP 정보 (메타 정보)
 * - 2행: 단계 (그룹 헤더)
 * - 3행: 컬럼명
 * - 4행~: 실제 데이터
 */
function findDataStartRow(sheet: ExcelJS.Worksheet): number {
  let startRow = 4; // 기본값: 4행 (1행 CP정보 + 2행 단계 + 3행 컬럼명 다음)

  for (let i = 1; i <= Math.min(5, sheet.rowCount); i++) {
    const row = sheet.getRow(i);
    const firstCell = String(row.getCell(1).value || '').trim();

    // 숫자로 시작하면 데이터 행으로 판단
    if (firstCell && /^\d+$/.test(firstCell)) {
      return i;
    }

    // 헤더 행 감지
    if (firstCell && (
      firstCell.includes('공정번호') ||
      firstCell.includes('번호') ||
      firstCell.includes('No')
    )) {
      startRow = i + 1;
    }

    // (필수)/(선택) 안내행 건너뛰기
    if (firstCell === '(필수)' || firstCell === '(선택)') {
      startRow = i + 1;
    }
  }

  return startRow;
}

/**
 * 시트 타입별 행 파싱
 */
function parseRowBySheetType(
  sheetType: CPSheetType,
  row: ExcelJS.Row,
  processNo: string,
  processName: string,
  columns: string[]
): CPParsedRow | null {
  const baseData = { processNo, processName };

  switch (sheetType) {
    case 'processInfo':
      return {
        ...baseData,
        sheetType,
        level: String(row.getCell(3).value || '').trim(),
        processDesc: String(row.getCell(4).value || '').trim(),
        equipment: String(row.getCell(5).value || '').trim(),
      };

    case 'detector':
      return {
        ...baseData,
        sheetType,
        ep: String(row.getCell(3).value || '').trim(),
        autoDetector: String(row.getCell(4).value || '').trim(),
      };

    case 'controlItem':
      return {
        ...baseData,
        sheetType,
        productChar: String(row.getCell(3).value || '').trim(),
        processChar: String(row.getCell(4).value || '').trim(),
        specialChar: String(row.getCell(5).value || '').trim(),
        spec: String(row.getCell(6).value || '').trim(),
      };

    case 'controlMethod':
      return {
        ...baseData,
        sheetType,
        evalMethod: String(row.getCell(3).value || '').trim(),
        sampleSize: String(row.getCell(4).value || '').trim(),
        frequency: String(row.getCell(5).value || '').trim(),
        controlMethod: String(row.getCell(6).value || '').trim(),
        owner1: String(row.getCell(7).value || '').trim(),
        owner2: String(row.getCell(8).value || '').trim(),
      };

    case 'reactionPlan':
      return {
        ...baseData,
        sheetType,
        productChar: String(row.getCell(3).value || '').trim(),
        processChar: String(row.getCell(4).value || '').trim(),
        reactionPlan: String(row.getCell(5).value || '').trim(),
      };

    default:
      return null;
  }
}

/**
 * 시트별 데이터를 공정번호 기준으로 병합
 */
function mergeSheetData(sheetDataMap: Record<CPSheetType, CPParsedRow[]>): CPMergedRow[] {
  const processMap = new Map<string, CPMergedRow>();

  // 공정현황에서 기본 정보 생성
  sheetDataMap.processInfo.forEach((row) => {
    if (!processMap.has(row.processNo)) {
      processMap.set(row.processNo, createEmptyMergedRow(row.processNo, row.processName));
    }
    const merged = processMap.get(row.processNo)!;
    merged.processName = row.processName || merged.processName;
    merged.level = row.level || merged.level;
    merged.processDesc = row.processDesc || merged.processDesc;
    merged.equipment = row.equipment || merged.equipment;
  });

  // 검출장치 병합
  sheetDataMap.detector.forEach((row) => {
    if (!processMap.has(row.processNo)) {
      processMap.set(row.processNo, createEmptyMergedRow(row.processNo, row.processName));
    }
    const merged = processMap.get(row.processNo)!;
    if (row.ep) merged.epList.push(row.ep);
    if (row.autoDetector) merged.autoDetectorList.push(row.autoDetector);
  });

  // 관리항목 병합
  sheetDataMap.controlItem.forEach((row) => {
    if (!processMap.has(row.processNo)) {
      processMap.set(row.processNo, createEmptyMergedRow(row.processNo, row.processName));
    }
    const merged = processMap.get(row.processNo)!;
    merged.controlItems.push({
      productChar: row.productChar || '',
      processChar: row.processChar || '',
      specialChar: row.specialChar || '',
      spec: row.spec || '',
    });
  });

  // 관리방법 병합
  sheetDataMap.controlMethod.forEach((row) => {
    if (!processMap.has(row.processNo)) {
      processMap.set(row.processNo, createEmptyMergedRow(row.processNo, row.processName));
    }
    const merged = processMap.get(row.processNo)!;
    merged.controlMethods.push({
      evalMethod: row.evalMethod || '',
      sampleSize: row.sampleSize || '',
      frequency: row.frequency || '',
      controlMethod: row.controlMethod || '',
      owner1: row.owner1 || '',
      owner2: row.owner2 || '',
    });
  });

  // 대응계획 병합
  sheetDataMap.reactionPlan.forEach((row) => {
    if (!processMap.has(row.processNo)) {
      processMap.set(row.processNo, createEmptyMergedRow(row.processNo, row.processName));
    }
    const merged = processMap.get(row.processNo)!;
    merged.reactionPlans.push({
      productChar: row.productChar || '',
      processChar: row.processChar || '',
      reactionPlan: row.reactionPlan || '',
    });
  });

  // 공정번호 순으로 정렬하여 반환
  return Array.from(processMap.values())
    .sort((a, b) => parseInt(a.processNo) - parseInt(b.processNo));
}

/**
 * 빈 병합 행 생성
 */
function createEmptyMergedRow(processNo: string, processName: string): CPMergedRow {
  return {
    processNo,
    processName,
    level: '',
    processDesc: '',
    equipment: '',
    epList: [],
    autoDetectorList: [],
    controlItems: [],
    controlMethods: [],
    reactionPlans: [],
  };
}

/**
 * 시트 이름 정규화 → CPSheetType으로 변환
 */
function normalizeSheetName(name: string): CPSheetType | null {
  const trimmedName = name.trim().toLowerCase();

  // 직접 매핑
  const directMap: Record<string, CPSheetType> = {
    '공정현황': 'processInfo',
    '검출장치': 'detector',
    '관리항목': 'controlItem',
    '관리방법': 'controlMethod',
    '대응계획': 'reactionPlan',
    // 영문 매핑
    'processinfo': 'processInfo',
    'process info': 'processInfo',
    'detector': 'detector',
    'controlitem': 'controlItem',
    'control item': 'controlItem',
    'controlmethod': 'controlMethod',
    'control method': 'controlMethod',
    'reactionplan': 'reactionPlan',
    'reaction plan': 'reactionPlan',
  };

  if (directMap[trimmedName]) {
    return directMap[trimmedName];
  }

  // 부분 매칭
  if (trimmedName.includes('공정현황') || trimmedName.includes('process')) {
    return 'processInfo';
  }
  if (trimmedName.includes('검출') || trimmedName.includes('detector')) {
    return 'detector';
  }
  if (trimmedName.includes('관리항목') || trimmedName.includes('control item')) {
    return 'controlItem';
  }
  if (trimmedName.includes('관리방법') || trimmedName.includes('control method')) {
    return 'controlMethod';
  }
  if (trimmedName.includes('대응계획') || trimmedName.includes('reaction')) {
    return 'reactionPlan';
  }

  return null;
}

/**
 * 병합된 CP 행 타입 (공정번호 기준 통합)
 */
export interface CPMergedRow {
  processNo: string;
  processName: string;
  level: string;
  processDesc: string;
  equipment: string;
  epList: string[];
  autoDetectorList: string[];
  controlItems: {
    productChar: string;
    processChar: string;
    specialChar: string;
    spec: string;
  }[];
  controlMethods: {
    evalMethod: string;
    sampleSize: string;
    frequency: string;
    controlMethod: string;
    owner1: string;
    owner2: string;
  }[];
  reactionPlans: {
    productChar: string;
    processChar: string;
    reactionPlan: string;
  }[];
}

/**
 * 파싱 결과 통계
 */
export function getCPParseStats(result: CPParseResult) {
  return {
    totalProcesses: result.data.length,
    processInfoCount: result.sheetData.processInfo.length,
    detectorCount: result.sheetData.detector.length,
    controlItemCount: result.sheetData.controlItem.length,
    controlMethodCount: result.sheetData.controlMethod.length,
    reactionPlanCount: result.sheetData.reactionPlan.length,
    totalRows: Object.values(result.sheetData).reduce((sum, arr) => sum + arr.length, 0),
  };
}
