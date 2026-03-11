/**
 * @file parser-types.ts
 * @description CP Excel 파서 타입 정의
 * @author AI Assistant
 * @created 2026-01-21
 */

import { CPMergedRow } from './excel-parser';

/** CP 시트 타입 */
export type CPSheetType =
  | 'processInfo'    // 공정현황
  | 'detector'       // 검출장치
  | 'controlItem'    // 관리항목
  | 'controlMethod'  // 관리방법
  | 'reactionPlan';  // 대응계획

/** CP 시트 설정 */
export interface CPSheetConfig {
  name: string;           // 한글 시트명
  columns: string[];      // 컬럼 목록
  required: boolean[];    // 필수 여부
  color: string;          // 헤더 색상
}

/** CP 시트 설정 정의 */
export const CP_SHEET_CONFIG: Record<CPSheetType, CPSheetConfig> = {
  processInfo: {
    name: '공정현황',
    columns: ['공정번호', '공정명', '레벨', '공정설명', '설비/금형/지그'],
    required: [true, true, false, false, false],
    color: '0D9488', // Teal
  },
  detector: {
    name: '검출장치',
    columns: ['공정번호', '공정명', 'EP', '자동검사장치'],
    required: [true, true, false, false],
    color: '9C27B0', // Purple
  },
  controlItem: {
    name: '관리항목',
    columns: ['공정번호', '공정명', '제품특성', '공정특성', '특별특성', '스펙/공차'],
    required: [true, true, false, false, false, false],
    color: '2196F3', // Blue
  },
  controlMethod: {
    name: '관리방법',
    columns: ['공정번호', '공정명', '평가방법', '샘플크기', '주기', '관리방법', '책임1', '책임2'],
    required: [true, true, false, false, false, false, false, false],
    color: '4CAF50', // Green
  },
  reactionPlan: {
    name: '대응계획',
    columns: ['공정번호', '공정명', '제품특성', '공정특성', '대응계획'],
    required: [true, true, false, false, false],
    color: 'FF9800', // Orange
  },
};

/** 파싱된 CP 행 (시트별) */
export interface CPParsedRow {
  processNo: string;
  processName: string;
  sheetType: CPSheetType;
  // 공정현황
  level?: string;
  processDesc?: string;
  equipment?: string;
  // 검출장치
  ep?: string;
  autoDetector?: string;
  // 관리항목
  productChar?: string;
  processChar?: string;
  specialChar?: string;
  spec?: string;
  // 관리방법
  evalMethod?: string;
  sampleSize?: string;
  frequency?: string;
  controlMethod?: string;
  owner1?: string;
  owner2?: string;
  // 대응계획
  reactionPlan?: string;
}

/** CP 파싱 결과 */
export interface CPParseResult {
  success: boolean;
  data: CPMergedRow[];                           // 공정번호 기준 병합된 데이터
  sheetData: Record<CPSheetType, CPParsedRow[]>; // 시트별 원본 데이터
  sheetSummary: { name: string; rowCount: number }[];
  errors: string[];
  warnings: string[];
}

/** 시트 타입 → 한글명 */
export function getSheetTypeName(sheetType: CPSheetType): string {
  return CP_SHEET_CONFIG[sheetType]?.name || sheetType;
}

/** 한글 시트명 → 시트 타입 */
export function getSheetTypeByName(name: string): CPSheetType | null {
  const entry = Object.entries(CP_SHEET_CONFIG).find(([, config]) => config.name === name);
  return entry ? (entry[0] as CPSheetType) : null;
}

/** 모든 시트 타입 목록 */
export const ALL_CP_SHEET_TYPES: CPSheetType[] = [
  'processInfo',
  'detector',
  'controlItem',
  'controlMethod',
  'reactionPlan',
];

/** 시트 타입별 그룹 색상 (Tailwind) */
export const CP_SHEET_COLORS: Record<CPSheetType, { bg: string; text: string; header: string }> = {
  processInfo: { bg: 'bg-teal-50', text: 'text-teal-700', header: 'bg-teal-600' },
  detector: { bg: 'bg-purple-50', text: 'text-purple-700', header: 'bg-purple-600' },
  controlItem: { bg: 'bg-blue-50', text: 'text-blue-700', header: 'bg-blue-600' },
  controlMethod: { bg: 'bg-green-50', text: 'text-green-700', header: 'bg-green-600' },
  reactionPlan: { bg: 'bg-orange-50', text: 'text-orange-700', header: 'bg-orange-500' },
};
