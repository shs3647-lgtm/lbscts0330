/**
 * @file downloadPreview.ts
 * @description PFMEA 기초정보 미리보기 Excel 다운로드 유틸리티
 */

import { ImportedFlatData } from '../types';
import { PREVIEW_OPTIONS } from '../sampleData';

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
  // 파일명/시트명에서 L코드 제외 (예: "L2-2 공정명" → "공정명")
  const simpleName = selectedLabel.split(' ')[1] || selectedLabel;
  const sheet = workbook.addWorksheet(simpleName);

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

  // ✅ processNo → A1 value(실제 공정번호) 매핑 생성
  const processNoMap = new Map<string, string>();
  flatData.filter((d) => d.itemCode === 'A1').forEach((d) => {
    processNoMap.set(d.processNo, d.value || d.processNo);
  });

  // 데이터 추가 - 가로세로 중앙정렬
  const previewData = flatData.filter((d) => d.itemCode === previewColumn);
  previewData.forEach((item, idx) => {
    // 공정번호 열에는 A1 value(실제 공정번호) 출력
    const displayProcessNo = processNoMap.get(item.processNo) || item.processNo;
    const row = sheet.addRow({ no: idx + 1, processNo: displayProcessNo, value: item.value });
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
  a.download = `${simpleName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}


