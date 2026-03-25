/**
 * @file excel-color-detector.ts
 * @description 엑셀 셀 적색 표기 감지 (수정본 추적)
 *
 * CODEFREEZE된 파서를 수정하지 않고, 파싱 후 별도로 엑셀 파일을
 * 재스캔하여 적색(빨간색) 폰트/배경 셀을 감지하는 후처리 유틸리티.
 *
 * 감지 기준:
 *   - 폰트 색상(cell.font.color.argb): R≥180, G<100, B<100
 *   - 배경 색상(cell.fill.fgColor.argb): 동일 기준
 *   - 엑셀 theme 색상 + tint 조합도 처리
 *
 * @created 2026-03-13
 */

import { normalizeSheetName } from '../excel-parser-utils';

/**
 * ARGB 8자리 또는 RGB 6자리 hex → 빨간색 계열 판별
 * 순수 빨강(FF0000), 어두운 빨강(C00000), 밝은 빨강(FF6666) 등 모두 감지
 */
function isRedArgb(argb: string | undefined): boolean {
  if (!argb || argb.length < 6) return false;
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  return r >= 180 && g < 100 && b < 100;
}

/**
 * ExcelJS theme 인덱스 기반 빨간색 판별
 * Excel 표준 theme: 0=background, 1=text, 5=Accent2(빨간색 계열)
 */
function isRedTheme(theme?: number, tint?: number): boolean {
  if (theme === undefined) return false;
  if (theme === 5 && (tint === undefined || tint >= -0.5)) return true;
  return false;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CellColor {
  argb?: string;
  theme?: number;
  tint?: number;
}

function getCellFontColor(cell: any): CellColor | null {
  if (!cell?.font?.color) return null;
  return cell.font.color as CellColor;
}

function getCellFillColor(cell: any): CellColor | null {
  if (!cell?.fill) return null;
  const fill = cell.fill;
  if (fill.type === 'pattern' && fill.fgColor) {
    return fill.fgColor as CellColor;
  }
  return null;
}

function isCellRed(cell: any): boolean {
  const fontColor = getCellFontColor(cell);
  if (fontColor) {
    if (isRedArgb(fontColor.argb)) return true;
    if (isRedTheme(fontColor.theme, fontColor.tint)) return true;
  }

  const fillColor = getCellFillColor(cell);
  if (fillColor) {
    if (isRedArgb(fillColor.argb)) return true;
    if (isRedTheme(fillColor.theme, fillColor.tint)) return true;
  }

  return false;
}

/**
 * 적색 셀 맵: `{sheetCode}|{excelRow}` → true
 */
export type RedCellMap = Set<string>;

/**
 * 엑셀 파일에서 적색 셀 위치를 스캔
 * @param file - 원본 엑셀 파일
 * @returns RedCellMap — `{sheetCode}|{rowNum}` 집합
 */
export async function detectRedCells(file: File): Promise<RedCellMap> {
  const redCells: RedCellMap = new Set();

  try {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    workbook.eachSheet((sheet) => {
      const sheetName = sheet.name?.trim();
      if (!sheetName) return;

      const sheetCode = normalizeSheetName(sheetName);
      const isFCSheet = sheetName.toLowerCase().includes('fc') ||
                        sheetName.includes('고장사슬');
      const effectiveCode = sheetCode || (isFCSheet ? 'FC' : null);
      if (!effectiveCode) return;

      const rowCount = Math.min(sheet.rowCount, 5000);

      for (let r = 2; r <= rowCount; r++) {
        const row = sheet.getRow(r);
        if (!row) continue;

        let rowHasRed = false;
        row.eachCell({ includeEmpty: false }, (cell) => {
          if (!rowHasRed && isCellRed(cell)) {
            rowHasRed = true;
          }
        });

        if (rowHasRed) {
          redCells.add(`${effectiveCode}|${r}`);
        }
      }
    });
  } catch (err) {
    console.error('[excel-color-detector] 적색 감지 실패:', err);
  }

  return redCells;
}

/**
 * flatData 항목들에 isRevised 플래그 적용
 * excelRow와 itemCode 기준으로 redCellMap과 매칭
 */
export function applyRevisedFlags(
  flatData: Array<{ itemCode: string; excelRow?: number; isRevised?: boolean }>,
  redCellMap: RedCellMap,
): void {
  if (redCellMap.size === 0) return;

  const codeToSheet: Record<string, string> = {
    A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4', A5: 'A5', A6: 'A6',
    B1: 'B1', B2: 'B2', B3: 'B3', B4: 'B4', B5: 'B5',
    C1: 'C1', C2: 'C2', C3: 'C3', C4: 'C4',
  };

  for (const item of flatData) {
    if (!item.excelRow) continue;
    const sheetCode = codeToSheet[item.itemCode];
    if (!sheetCode) continue;
    const key = `${sheetCode}|${item.excelRow}`;
    if (redCellMap.has(key)) {
      item.isRevised = true;
    }
  }
}

/**
 * FC 고장사슬 항목들에 isRevised 플래그 적용
 */
export function applyRevisedFlagsToChains(
  chains: Array<{ excelRow?: number; isRevised?: boolean }>,
  redCellMap: RedCellMap,
): void {
  if (redCellMap.size === 0) return;

  for (const chain of chains) {
    if (!chain.excelRow) continue;
    const key = `FC|${chain.excelRow}`;
    if (redCellMap.has(key)) {
      chain.isRevised = true;
    }
  }
}
