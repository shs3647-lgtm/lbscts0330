/**
 * @file excelStyles.ts
 * @description Excel 스타일 유틸리티
 */

import ExcelJS from 'exceljs';

/** 색상 상수 */
export const EXCEL_COLORS = {
  header: '1565C0',
  rowEven: 'F5F5F5',
  rowOdd: 'FFFFFF',
  line: 'D1D1D1',
  structure: '1976D2',
  function: '1B5E20',
  failure: 'C62828',
};

/** 헤더 스타일 적용 */
export const applyHeaderStyle = (cell: ExcelJS.Cell, color: string) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: color }
  };
  cell.font = {
    color: { argb: 'FFFFFF' },
    bold: true,
    size: 10,
    name: '맑은 고딕'
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
};

/** 데이터 스타일 적용 */
export const applyDataStyle = (cell: ExcelJS.Cell, isEven: boolean) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: isEven ? 'F9F9F9' : 'FFFFFF' }
  };
  cell.font = {
    size: 9,
    name: '맑은 고딕'
  };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
};

/** 센터 정렬 스타일 */
export const applyCenterStyle = (cell: ExcelJS.Cell) => {
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
};

/** Excel 파일 저장 */
export const saveExcelFile = (buffer: ArrayBuffer | ExcelJS.Buffer, fileName: string) => {
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};

/** 병합 정보 타입 */
export interface MergeInfo {
  startRow: number;
  endRow: number;
  col: number;
}

/** 병합 적용 */
export const applyMerges = (worksheet: ExcelJS.Worksheet, merges: MergeInfo[]) => {
  merges.forEach(m => {
    if (m.endRow > m.startRow) {
      worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col);
    }
  });
};



