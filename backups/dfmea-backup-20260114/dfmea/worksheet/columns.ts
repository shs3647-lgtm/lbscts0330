/**
 * @file columns.ts
 * @description PFMEA 워크시트 40개 컬럼 정의
 * @version 1.0.0
 * @created 2025-12-26
 * @ref PRD-005-pfmea-worksheet.md
 */

import type { ColumnSettings } from 'handsontable/settings';
import type { ColumnGroup } from './types';

/** 컬럼 그룹 정의 (단계별) - 색상 표준: 구조분석-파란색, 기능분석-진한녹색, 고장분석-붉은색 */
export const COLUMN_GROUPS: ColumnGroup[] = [
  { name: 'revision', label: '개정/이력', color: '#6B7280', startCol: 0, endCol: 1 },
  { name: 'structure', label: '2단계: 구조분석', color: '#1976d2', startCol: 2, endCol: 6 },
  { name: 'function', label: '3단계: 기능분석', color: '#1b5e20', startCol: 7, endCol: 15 },
  { name: 'failure', label: '4단계: 고장분석', color: '#c62828', startCol: 16, endCol: 22 },
  { name: 'risk', label: '5단계: 리스크분석', color: '#EF4444', startCol: 23, endCol: 29 },
  { name: 'optimization', label: '6단계: 최적화', color: '#8B5CF6', startCol: 30, endCol: 43 },
];

/** 4M 드롭다운 옵션 */
const CATEGORY_4M_OPTIONS = ['MN', 'MC', 'IM', 'EN'];

/** 특별특성 드롭다운 옵션 */
const SPECIAL_CHAR_OPTIONS = ['', 'CC', 'SC', 'FFF', 'HI', 'BM-C', 'BM-L', 'BM-S'];

/** AP 드롭다운 옵션 */
const AP_OPTIONS = ['', 'H', 'M', 'L'];

/** 상태 드롭다운 옵션 */
const STATUS_OPTIONS = ['', 'Not Started', 'In Progress', 'Completed', 'Verified'];

/** SOD 점수 옵션 (1-10) */
const SOD_OPTIONS = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

/** 컬럼 정의 인터페이스 */
export interface ColumnDef {
  data: string;
  header: string;
  headerEn: string;
  width: number;
  type?: string;
  source?: string[];
  readOnly?: boolean;
  className?: string;
  renderer?: string;
}

/** 40개 컬럼 정의 */
export const PFMEA_COLUMNS: ColumnDef[] = [
  // ========== 개정/이력 (2개) ==========
  { data: 'revisionNo', header: '개정번호', headerEn: 'Rev No', width: 80, className: 'htCenter' },
  { data: 'changeHistory', header: '변경이력/승인', headerEn: 'History', width: 150 },
  
  // ========== 2단계: 구조분석 (5개) ==========
  { data: 'productName', header: '완제품 이름명', headerEn: 'Product', width: 150, className: 'htLeft structure-col' },
  { data: 'processName', header: 'NO+공정명', headerEn: 'Process', width: 150, className: 'htLeft structure-col' },
  { data: 'workElement', header: '작업요소명', headerEn: 'Work Element', width: 120, className: 'htLeft structure-col' },
  { data: 'category4M', header: '4M', headerEn: '4M', width: 60, type: 'dropdown', source: CATEGORY_4M_OPTIONS, className: 'htCenter structure-col' },
  { data: 'workElementDetail', header: '작업요소', headerEn: 'W/E Detail', width: 120, className: 'htLeft structure-col' },
  
  // ========== 3단계: 기능분석 (9개) ==========
  { data: 'productRequirement', header: '완제품 요구사항', headerEn: 'Product Req', width: 180, className: 'htLeft function-col' },
  { data: 'requirement', header: '요구사항', headerEn: 'Requirement', width: 150, className: 'htLeft function-col' },
  { data: 'processFunction', header: '공정 기능', headerEn: 'Process Func', width: 180, className: 'htLeft function-col' },
  { data: 'productChar', header: '제품특성', headerEn: 'Product Char', width: 120, className: 'htLeft function-col' },
  { data: 'workElementFunc', header: '작업요소 기능', headerEn: 'W/E Func', width: 150, className: 'htLeft function-col' },
  { data: 'workElementFunc2', header: '작업요소 기능2', headerEn: 'W/E Func2', width: 150, className: 'htLeft function-col' },
  { data: 'processChar', header: '공정특성', headerEn: 'Process Char', width: 120, className: 'htLeft function-col' },
  { data: 'processChar2', header: '공정특성2', headerEn: 'P.Char2', width: 120, className: 'htLeft function-col' },
  { data: 'processChar3', header: '공정특성3', headerEn: 'P.Char3', width: 120, className: 'htLeft function-col' },
  
  // ========== 4단계: 고장분석 (7개) ==========
  { data: 'failureNaming', header: '고장 이름명', headerEn: 'Failure Name', width: 120, className: 'htLeft failure-col' },
  { data: 'failureEffect', header: '고장영향 (FE)', headerEn: 'FE', width: 180, className: 'htLeft failure-col' },
  { data: 'severity', header: '심각도', headerEn: 'S', width: 60, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter failure-col' },
  { data: 'failureMode', header: '고장형태 (FM)', headerEn: 'FM', width: 180, className: 'htLeft failure-col' },
  { data: 'workElementFC', header: '작업요소', headerEn: 'W/E FC', width: 100, className: 'htLeft failure-col' },
  { data: 'failureCause', header: '고장원인 (FC)', headerEn: 'FC', width: 180, className: 'htLeft failure-col' },
  { data: 'failureCause2', header: '고장원인2', headerEn: 'FC2', width: 150, className: 'htLeft failure-col' },
  
  // ========== 5단계: 리스크분석 (7개) ==========
  { data: 'preventionControl', header: '예방관리 (PC)', headerEn: 'PC', width: 180, className: 'htLeft risk-col' },
  { data: 'occurrence', header: '발생도', headerEn: 'O', width: 60, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter risk-col' },
  { data: 'detectionControl', header: '검출관리 (DC)', headerEn: 'DC', width: 180, className: 'htLeft risk-col' },
  { data: 'detection', header: '검출도', headerEn: 'D', width: 60, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter risk-col' },
  { data: 'ap', header: 'AP', headerEn: 'AP', width: 50, type: 'dropdown', source: AP_OPTIONS, className: 'htCenter risk-col', renderer: 'apRenderer' },
  { data: 'specialChar', header: '특별특성', headerEn: 'SC', width: 80, type: 'dropdown', source: SPECIAL_CHAR_OPTIONS, className: 'htCenter risk-col' },
  { data: 'remarks', header: '비고', headerEn: 'Remarks', width: 120, className: 'htLeft risk-col' },
  
  // ========== 6단계: 최적화 (14개) ==========
  { data: 'improvementPlan', header: '개선계획', headerEn: 'Improvement', width: 180, className: 'htLeft optimize-col' },
  { data: 'preventionAction', header: '예방조치내용', headerEn: 'P.Action', width: 150, className: 'htLeft optimize-col' },
  { data: 'detectionAction', header: '검출조치내용', headerEn: 'D.Action', width: 150, className: 'htLeft optimize-col' },
  { data: 'responsiblePerson', header: '책임자/소속', headerEn: 'Responsible', width: 100, className: 'htCenter optimize-col' },
  { data: 'targetDate', header: '목표일', headerEn: 'Target', width: 100, type: 'date', className: 'htCenter optimize-col' },
  { data: 'status', header: '상태', headerEn: 'Status', width: 100, type: 'dropdown', source: STATUS_OPTIONS, className: 'htCenter optimize-col' },
  { data: 'actionTaken', header: '조치내용', headerEn: 'Action Taken', width: 180, className: 'htLeft optimize-col' },
  { data: 'completionDate', header: '완료일', headerEn: 'Complete', width: 100, type: 'date', className: 'htCenter optimize-col' },
  { data: 'severityAfter', header: '심각도(후)', headerEn: 'S(A)', width: 70, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter optimize-col' },
  { data: 'occurrenceAfter', header: '발생도(후)', headerEn: 'O(A)', width: 70, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter optimize-col' },
  { data: 'detectionAfter', header: '검출도(후)', headerEn: 'D(A)', width: 70, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter optimize-col' },
  { data: 'specialCharAfter', header: '특별특성(후)', headerEn: 'SC(A)', width: 90, type: 'dropdown', source: SPECIAL_CHAR_OPTIONS, className: 'htCenter optimize-col' },
  { data: 'apAfter', header: 'AP(후)', headerEn: 'AP(A)', width: 60, type: 'dropdown', source: AP_OPTIONS, className: 'htCenter optimize-col', renderer: 'apRenderer' },
  { data: 'remarksAfter', header: '비고(후)', headerEn: 'Remarks(A)', width: 120, className: 'htLeft optimize-col' },
];

/** Handsontable 컬럼 설정 생성 */
export function getColumnSettings(): ColumnSettings[] {
  return PFMEA_COLUMNS.map((col) => {
    const settings: ColumnSettings = {
      data: col.data,
      width: col.width,
      className: col.className,
    };
    
    if (col.type === 'dropdown') {
      settings.type = 'dropdown';
      settings.source = col.source;
      settings.strict = false;
      settings.allowInvalid = true;
    }
    
    if (col.type === 'date') {
      settings.type = 'date';
      settings.dateFormat = 'YYYY-MM-DD';
      settings.correctFormat = true;
    }
    
    if (col.readOnly) {
      settings.readOnly = true;
    }
    
    return settings;
  });
}

/** 컬럼 헤더 생성 */
export function getColumnHeaders(): string[] {
  return PFMEA_COLUMNS.map((col) => col.header);
}

/** 중첩 헤더 생성 (단계별 그룹) */
export function getNestedHeaders(): (string | { label: string; colspan: number })[][] {
  const groupRow = COLUMN_GROUPS.map((group) => ({
    label: group.label,
    colspan: group.endCol - group.startCol + 1,
  }));
  
  const headerRow = PFMEA_COLUMNS.map((col) => col.header);
  
  return [groupRow, headerRow];
}



