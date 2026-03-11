// @ts-nocheck
/**
 * @file columns.ts
 * @description DFMEA 워크시트 35개 컬럼 정의
 * @version 1.0.0
 * @created 2026-01-14
 * @ref DFMEA_PRD.md
 */

import type { ColumnSettings } from 'handsontable/settings';
import type { ColumnGroup } from './types';

/** 컬럼 그룹 정의 (단계별) - 색상 표준: 구조분석-파란색, 기능분석-녹색, 고장분석-노랑, 리스크분석-네이비, 최적화-연두 */
export const COLUMN_GROUPS: ColumnGroup[] = [
  { name: 'revision', label: '개정/이력', color: '#6B7280', startCol: 0, endCol: 1 },
  { name: 'structure', label: '2단계: 구조분석', color: '#1976d2', startCol: 2, endCol: 5 },
  { name: 'function', label: '3단계: 기능분석', color: '#1b5e20', startCol: 6, endCol: 12 },
  { name: 'failure', label: '4단계: 고장분석', color: '#c62828', startCol: 13, endCol: 16 },
  { name: 'risk', label: '5단계: 리스크분석', color: '#3949ab', startCol: 17, endCol: 23 },
  { name: 'optimization', label: '6단계: 최적화', color: '#8B5CF6', startCol: 24, endCol: 36 },
];

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

/** 35개 컬럼 정의 (DFMEA_PRD.md 기반) */
export const DFMEA_COLUMNS: ColumnDef[] = [
  // ========== 개정/이력 (2개) ==========
  { data: 'revisionNo', header: '개정번호', headerEn: 'Rev No', width: 80, className: 'htCenter' },
  { data: 'changeHistory', header: '변경이력/승인', headerEn: 'History', width: 150 },
  
  // ========== 2단계: 구조분석 (4개) ==========
  { data: 'productName', header: '제품명', headerEn: 'Product', width: 160, className: 'htLeft structure-col' },
  { data: 'assy', header: 'A\'SSY', headerEn: 'ASSY', width: 140, className: 'htLeft structure-col' },
  { data: 'type', header: '타입', headerEn: 'Type', width: 100, className: 'htLeft structure-col' },
  { data: 'partOrChar', header: '부품 또는 특성', headerEn: 'Part/Char', width: 120, className: 'htLeft structure-col' },
  
  // ========== 3단계: 기능분석 (7개) ==========
  { data: 'category', header: '분류', headerEn: 'Category', width: 60, className: 'htLeft function-col' },
  { data: 'productFunction', header: '제품 기능', headerEn: 'Product Func', width: 180, className: 'htLeft function-col' },
  { data: 'requirement', header: '요구사항', headerEn: 'Requirement', width: 180, className: 'htLeft function-col' },
  { data: 'focusElementFunction', header: '초점요소 기능', headerEn: 'Focus Func', width: 160, className: 'htLeft function-col' },
  { data: 'focusElementRequirement', header: '요구사항', headerEn: 'Focus Req', width: 140, className: 'htLeft function-col' },
  { data: 'partFunctionOrChar', header: '부품 기능 또는 특성', headerEn: 'Part Func/Char', width: 160, className: 'htLeft function-col' },
  { data: 'partRequirement', header: '요구사항', headerEn: 'Part Req', width: 140, className: 'htLeft function-col' },
  
  // ========== 4단계: 고장분석 (4개) ==========
  { data: 'failureEffect', header: '고장영향', headerEn: 'FE', width: 180, className: 'htLeft failure-col' },
  { data: 'severity', header: '심각도', headerEn: 'S', width: 30, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter failure-col' },
  { data: 'failureMode', header: '고장형태', headerEn: 'FM', width: 160, className: 'htLeft failure-col' },
  { data: 'failureCause', header: '고장원인', headerEn: 'FC', width: 180, className: 'htLeft failure-col' },
  
  // ========== 5단계: 리스크분석 (7개) ==========
  { data: 'preventionControl', header: '예방관리', headerEn: 'PC', width: 160, className: 'htLeft risk-col' },
  { data: 'occurrence', header: '발생도', headerEn: 'O', width: 30, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter risk-col' },
  { data: 'detectionControl', header: '검출관리', headerEn: 'DC', width: 160, className: 'htLeft risk-col' },
  { data: 'detection', header: '검출도', headerEn: 'D', width: 30, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter risk-col' },
  { data: 'ap', header: 'AP', headerEn: 'AP', width: 30, type: 'dropdown', source: AP_OPTIONS, className: 'htCenter risk-col', renderer: 'apRenderer' },
  { data: 'specialChar', header: '특별특성', headerEn: 'SC', width: 60, type: 'dropdown', source: SPECIAL_CHAR_OPTIONS, className: 'htCenter risk-col' },
  { data: 'lessonsLearned', header: '습득교훈', headerEn: 'Lessons', width: 120, className: 'htLeft risk-col' },
  
  // ========== 6단계: 최적화 (13개) ==========
  { data: 'designPreventionAction', header: '설계 예방 조치', headerEn: 'Design P.Action', width: 160, className: 'htLeft optimize-col' },
  { data: 'designDetectionAction', header: '설계 검출 조치', headerEn: 'Design D.Action', width: 160, className: 'htLeft optimize-col' },
  { data: 'responsible', header: '책임자', headerEn: 'Responsible', width: 100, className: 'htCenter optimize-col' },
  { data: 'targetDate', header: '목표 완료일', headerEn: 'Target', width: 60, type: 'date', className: 'htCenter optimize-col' },
  { data: 'status', header: '상태', headerEn: 'Status', width: 60, type: 'dropdown', source: STATUS_OPTIONS, className: 'htCenter optimize-col' },
  { data: 'reportName', header: '보고서 이름', headerEn: 'Report', width: 100, className: 'htLeft optimize-col' },
  { data: 'completionDate', header: '완료일', headerEn: 'Complete', width: 60, type: 'date', className: 'htCenter optimize-col' },
  { data: 'effectSeverity', header: '심각도', headerEn: 'S', width: 30, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter optimize-col' },
  { data: 'effectOccurrence', header: '발생도', headerEn: 'O', width: 30, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter optimize-col' },
  { data: 'effectDetection', header: '검출도', headerEn: 'D', width: 30, type: 'dropdown', source: SOD_OPTIONS, className: 'htCenter optimize-col' },
  { data: 'effectSC', header: 'S/C', headerEn: 'S/C', width: 60, type: 'dropdown', source: SPECIAL_CHAR_OPTIONS, className: 'htCenter optimize-col' },
  { data: 'effectAP', header: 'AP', headerEn: 'AP', width: 30, type: 'dropdown', source: AP_OPTIONS, className: 'htCenter optimize-col', renderer: 'apRenderer' },
  { data: 'remarks', header: '비고', headerEn: 'Remarks', width: 100, className: 'htLeft optimize-col' },
];

// PFMEA_COLUMNS는 DFMEA_COLUMNS로 별칭 (하위 호환성)
export const PFMEA_COLUMNS = DFMEA_COLUMNS;
