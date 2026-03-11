/**
 * @file excel-utils.ts
 * @description 엑셀 내보내기 공통 유틸리티 - 스타일링 포함
 * @version 1.0.0
 * @created 2025-12-26
 * 
 * 디자인 표준:
 * - 헤더: #00587a (진한 네이비) 배경, 흰색 글씨, 흰색 테두리
 * - 데이터: 흰색 배경, 회색 테두리
 * - 모든 셀: 가로세로 중앙정렬
 */

import XLSX from 'xlsx-js-style';

// 헤더 스타일 (네이비 배경 + 흰색 글씨)
const HEADER_STYLE = {
  fill: {
    patternType: 'solid',
    fgColor: { rgb: '00587A' },  // 진한 네이비
  },
  font: {
    name: '맑은 고딕',
    sz: 10,
    bold: true,
    color: { rgb: 'FFFFFF' },  // 흰색 글씨
  },
  border: {
    top: { style: 'thin', color: { rgb: 'FFFFFF' } },
    bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
    left: { style: 'thin', color: { rgb: 'FFFFFF' } },
    right: { style: 'thin', color: { rgb: 'FFFFFF' } },
  },
  alignment: {
    horizontal: 'center',
    vertical: 'center',
    wrapText: false,
  },
};

// 데이터 셀 스타일 (흰색 배경 + 회색 테두리)
const DATA_STYLE = {
  fill: {
    patternType: 'solid',
    fgColor: { rgb: 'FFFFFF' },
  },
  font: {
    name: '맑은 고딕',
    sz: 10,
  },
  border: {
    top: { style: 'thin', color: { rgb: '999999' } },
    bottom: { style: 'thin', color: { rgb: '999999' } },
    left: { style: 'thin', color: { rgb: '999999' } },
    right: { style: 'thin', color: { rgb: '999999' } },
  },
  alignment: {
    horizontal: 'center',
    vertical: 'center',
    wrapText: false,
  },
};

/**
 * 스타일이 적용된 워크시트 생성 (헤더 색상, 테두리, 중앙정렬)
 * @param headers 헤더 배열
 * @param data 데이터 2차원 배열
 * @param colWidths 열 너비 배열
 * @returns 스타일이 적용된 워크시트
 */
export function createStyledWorksheet(
  headers: string[],
  data: (string | number | undefined | null)[][],
  colWidths: number[]
): XLSX.WorkSheet {
  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // 열 너비 설정
  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  // 데이터 범위 가져오기
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // 모든 셀에 스타일 적용
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      
      // 셀이 없으면 빈 셀 생성
      if (!ws[cellAddress]) {
        ws[cellAddress] = { v: '', t: 's' };
      }

      const cell = ws[cellAddress];

      // 헤더 행 스타일 (첫 번째 행)
      if (row === 0) {
        cell.s = HEADER_STYLE;
      } else {
        // 데이터 셀 스타일
        cell.s = DATA_STYLE;
      }
    }
  }

  // 행 높이 설정 (선택 사항)
  ws['!rows'] = [];
  for (let row = range.s.r; row <= range.e.r; row++) {
    ws['!rows'][row] = { hpt: 22 };  // 행 높이 22pt
  }

  return ws;
}

/**
 * 스타일이 적용된 엑셀 파일 다운로드
 * @param headers 헤더 배열
 * @param data 데이터 2차원 배열
 * @param colWidths 열 너비 배열
 * @param sheetName 시트 이름
 * @param fileName 파일 이름
 */
export function downloadStyledExcel(
  headers: string[],
  data: (string | number | undefined | null)[][],
  colWidths: number[],
  sheetName: string,
  fileName: string
): void {
  const ws = createStyledWorksheet(headers, data, colWidths);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

/**
 * 빈 템플릿 다운로드 (헤더만 있는)
 * @param headers 헤더 배열
 * @param colWidths 열 너비 배열
 * @param sheetName 시트 이름
 * @param fileName 파일 이름
 */
export function downloadTemplate(
  headers: string[],
  colWidths: number[],
  sheetName: string,
  fileName: string
): void {
  downloadStyledExcel(headers, [], colWidths, sheetName, fileName);
}
