/**
 * @file downloadPreview.ts
 * @description FMEA 기초정보 미리보기 Excel 다운로드 유틸리티
 */

import { ImportedFlatData } from '../types';
import { PREVIEW_OPTIONS } from '../constants';

/**
 * FMEA 기초정보 미리보기 데이터 Excel 다운로드
 */
export async function handleDownloadPreview(
  previewColumn: string,
  flatData: ImportedFlatData[]
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const selectedLabel = PREVIEW_OPTIONS.find((opt) => opt.value === previewColumn)?.label || previewColumn;
  const sheet = workbook.addWorksheet(selectedLabel);

  // 헤더 설정
  sheet.columns = [
    { header: 'NO', key: 'no', width: 8 },
    { header: '공정번호', key: 'processNo', width: 12 },
    { header: selectedLabel.split(' ')[1] || selectedLabel, key: 'value', width: 40 },
  ];

  // 헤더 스타일 - 디자인 표준 적용
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00587A' } };
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: '맑은 고딕', size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFFFFF' } },
      left: { style: 'thin', color: { argb: 'FFFFFF' } },
      bottom: { style: 'thin', color: { argb: 'FFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFF' } },
    };
  });

  // 데이터 추가 - 가로세로 중앙정렬
  const previewData = flatData.filter((d) => d.itemCode === previewColumn);
  previewData.forEach((item, idx) => {
    const row = sheet.addRow({ no: idx + 1, processNo: item.processNo, value: item.value });
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: '999999' } },
        left: { style: 'thin', color: { argb: '999999' } },
        bottom: { style: 'thin', color: { argb: '999999' } },
        right: { style: 'thin', color: { argb: '999999' } },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { name: '맑은 고딕', size: 10 };
    });
  });

  // 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `입포트_${selectedLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}



