/**
 * @file downloadPreview.ts
 * @description PFMEA 기초정보 미리보기 Excel 다운로드 유틸리티
 */

import { ImportedFlatData } from '../types';
import { PREVIEW_OPTIONS } from '../sampleData';

/** 공통 헤더 스타일 적용 */
function applyHeaderStyle(sheet: import('exceljs').Worksheet): void {
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
}

/** 공통 데이터 행 스타일 적용 */
function applyDataRowStyle(row: import('exceljs').Row): void {
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
}

/** 단일 카테고리 시트 생성 */
function addCategorySheet(
  workbook: import('exceljs').Workbook,
  categoryCode: string,
  flatData: ImportedFlatData[],
  processNoMap: Map<string, string>,
): void {
  const opt = PREVIEW_OPTIONS.find(o => o.value === categoryCode);
  if (!opt) return;
  const simpleName = opt.label.split(' ')[1] || opt.label;
  const sheet = workbook.addWorksheet(simpleName);

  // ★★★ 2026-02-16: B1~B4 전체 4M 컬럼 포함 ★★★
  const isBItemWith4M = ['B1', 'B2', 'B3', 'B4', 'B5'].includes(categoryCode);
  // ★ v2.4.0: A4/B3에 특별특성 컬럼 추가
  const hasSpecialChar = categoryCode === 'A4' || categoryCode === 'B3';
  const baseColumns = isBItemWith4M
    ? [
        { header: 'NO', key: 'no', width: 8 },
        { header: '공정번호', key: 'processNo', width: 12 },
        { header: '4M', key: 'm4', width: 8 },
        { header: simpleName, key: 'value', width: 40 },
      ]
    : [
        { header: 'NO', key: 'no', width: 8 },
        { header: '공정번호', key: 'processNo', width: 12 },
        { header: simpleName, key: 'value', width: 40 },
      ];
  if (hasSpecialChar) {
    baseColumns.push({ header: '특별특성', key: 'specialChar', width: 10 });
  }
  sheet.columns = baseColumns;

  applyHeaderStyle(sheet);

  // ★★★ 2026-02-18: B4/B5에 m4 누락 시 B1에서 추론 ★★★
  const b1ByPNo: Record<string, string[]> = {};
  if (isBItemWith4M && categoryCode !== 'B1') {
    flatData.filter(d => d.itemCode === 'B1').forEach(d => {
      if (!b1ByPNo[d.processNo]) b1ByPNo[d.processNo] = [];
      b1ByPNo[d.processNo].push(d.m4 || '');
    });
  }
  const bIdxMap = new Map<string, number>();

  const items = flatData.filter(d => d.itemCode === categoryCode);
  items.forEach((item, idx) => {
    const displayProcessNo = processNoMap.get(item.processNo) || item.processNo;
    let m4 = item.m4 || '';
    // m4 누락 시 B1에서 추론
    if (!m4 && isBItemWith4M && categoryCode !== 'B1') {
      const key = item.processNo;
      const bIdx = bIdxMap.get(key) || 0;
      bIdxMap.set(key, bIdx + 1);
      m4 = b1ByPNo[item.processNo]?.[bIdx] || '';
    }
    const rowData: Record<string, string | number> = isBItemWith4M
      ? { no: idx + 1, processNo: displayProcessNo, m4, value: item.value }
      : { no: idx + 1, processNo: displayProcessNo, value: item.value };
    // ★ v2.4.0: A4/B3 특별특성 컬럼 데이터
    if (hasSpecialChar) {
      rowData.specialChar = item.specialChar || '';
    }
    const row = sheet.addRow(rowData);
    applyDataRowStyle(row);
  });
}

/**
 * FMEA 기초정보 미리보기 데이터 Excel 다운로드
 * - previewColumn === 'ALL': 전체 카테고리를 각각 시트로 생성
 * - 그 외: 단일 카테고리 시트 생성
 */
export async function handleDownloadPreview(
  previewColumn: string,
  flatData: ImportedFlatData[]
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();

  // ✅ processNo → A1 value(실제 공정번호) 매핑 생성
  const processNoMap = new Map<string, string>();
  flatData.filter((d) => d.itemCode === 'A1').forEach((d) => {
    processNoMap.set(d.processNo, d.value || d.processNo);
  });

  // ★★★ 2026-02-08: ALL 선택 시 전체 카테고리를 멀티시트로 다운로드 ★★★
  if (previewColumn === 'ALL') {
    const categories = PREVIEW_OPTIONS.filter(o => o.value !== 'ALL');
    for (const cat of categories) {
      const items = flatData.filter(d => d.itemCode === cat.value);
      if (items.length > 0) {
        addCategorySheet(workbook, cat.value, flatData, processNoMap);
      }
    }
    // 데이터가 하나도 없는 경우 빈 시트 방지
    if (workbook.worksheets.length === 0) {
      workbook.addWorksheet('빈 데이터');
    }
  } else {
    // 단일 카테고리 다운로드
    addCategorySheet(workbook, previewColumn, flatData, processNoMap);
  }

  // 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = previewColumn === 'ALL' ? 'FMEA_기초정보_전체.xlsx' : `${PREVIEW_OPTIONS.find(o => o.value === previewColumn)?.label.split(' ')[1] || previewColumn}.xlsx`;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
