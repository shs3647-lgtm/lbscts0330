/**
 * @file excel-template-generator.ts
 * @description 구조 기반 DFMEA 기초정보 Excel 템플릿 생성기
 * @created 2026-02-18
 *
 * 모드:
 * - generateManualTemplate(): ② 수동 — 드랍다운 설정 → 14시트 빈 양식
 * - generateAutoTemplate():   ③ 자동 — 수동 + 작업요소 입력 → B1 완성 + B2~B5 복사
 */

import { saveAs } from 'file-saver';
import type ExcelJS from 'exceljs';
import {
  SHEET_COLUMNS, SHEET_DISPLAY_NAMES, SHEET_ORDER,
  HEADER_COLOR, M4_SORT_ORDER,
  applyHeaderStyle, applyDataStyle, applyDataLeftStyle,
  applySpecialCharStyle, applyCommonRowStyle,
  type SheetColumnDef,
} from './excel-styles';

// ─── 타입 ───

export interface TemplateConfig {
  processCount: number;
  processNaming: 'number' | 'alphabet';
  commonMN: number;
  commonEN: number;
  perProcessMN: number;
  perProcessMC: number;
  perProcessIM: number;
  perProcessEN: number;
}

export interface WorkElementInput {
  id: string;
  processNo: string;
  processName: string;
  m4: 'MN' | 'MC' | 'IM' | 'EN';
  name: string;
}

export interface AutoTemplateConfig extends TemplateConfig {
  workElements: WorkElementInput[];
  b2Rows: number; // 작업요소당 행 수
  b3Rows: number;
  b4Rows: number;
  b5Rows: number;
}

// ─── 유틸 ───

/** 공정번호 생성 */
function generateProcessNumbers(count: number, naming: 'number' | 'alphabet'): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    if (naming === 'number') {
      result.push(String((i + 1) * 10));
    } else {
      result.push(String.fromCharCode(65 + i)); // A, B, C...
    }
  }
  return result;
}

/** 4M 행 목록 생성 (B시리즈용) — MN→MC→IM→EN 순서 고정 */
function generateM4Rows(config: TemplateConfig, processNumbers: string[]): Array<{ processNo: string; processName: string; m4: string }> {
  const rows: Array<{ processNo: string; processName: string; m4: string }> = [];

  // 공통(00) — MN, EN
  for (let i = 0; i < config.commonMN; i++) {
    rows.push({ processNo: '00', processName: '공통', m4: 'MN' });
  }
  for (let i = 0; i < config.commonEN; i++) {
    rows.push({ processNo: '00', processName: '공통', m4: 'EN' });
  }

  // 공정별 — MN→MC→IM→EN 순서
  processNumbers.forEach((pNo) => {
    for (let i = 0; i < config.perProcessMN; i++) rows.push({ processNo: pNo, processName: '', m4: 'MN' });
    for (let i = 0; i < config.perProcessMC; i++) rows.push({ processNo: pNo, processName: '', m4: 'MC' });
    for (let i = 0; i < config.perProcessIM; i++) rows.push({ processNo: pNo, processName: '', m4: 'IM' });
    for (let i = 0; i < config.perProcessEN; i++) rows.push({ processNo: pNo, processName: '', m4: 'EN' });
  });

  return rows;
}

/** 엑셀 다운로드 헬퍼 */
async function downloadBuffer(buffer: ExcelJS.Buffer, fileName: string) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const fullName = `${fileName}_${dateStr}.xlsx`;
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  try {
    saveAs(blob, fullName);
  } catch {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fullName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
  }
}

/** 텍스트 너비 계산 (한글=2, CJK=2, 기타=1.1) */
function textWidth(text: string): number {
  if (!text) return 0;
  let w = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7AF) w += 2;
    else if (code >= 0x3000 && code <= 0x9FFF) w += 2;
    else w += 1.1;
  }
  return w;
}

/** 시트에 헤더 + 데이터 행 추가 (열 너비 자동 최적화) */
function addSheetWithData(
  workbook: ExcelJS.Workbook,
  sheetCode: string,
  rows: Record<string, string>[],
) {
  const columns = SHEET_COLUMNS[sheetCode];
  const displayName = SHEET_DISPLAY_NAMES[sheetCode];
  if (!columns || !displayName) return;

  const ws = workbook.addWorksheet(displayName, {
    properties: { tabColor: { argb: HEADER_COLOR } },
  });

  // 데이터 기반 열 너비 자동 계산
  const autoWidths = columns.map((col) => {
    const headerW = textWidth(col.header) + 2;
    let maxDataW = 0;
    for (const rowData of rows) {
      const cellW = textWidth(rowData[col.key] || '');
      if (cellW > maxDataW) maxDataW = cellW;
    }
    const optimal = Math.max(headerW, maxDataW + 3, col.width);
    return Math.min(optimal, 60);
  });

  ws.columns = columns.map((col, i) => ({
    header: col.header,
    key: col.key,
    width: autoWidths[i],
  }));

  // 헤더 스타일
  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  // 데이터 행 추가
  rows.forEach((rowData) => {
    const values = columns.map((col) => rowData[col.key] || '');
    const row = ws.addRow(values);

    const isCommon = rowData.processNo === '00';

    row.eachCell((cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      if (!colDef) return;

      if (colDef.special) {
        applySpecialCharStyle(cell);
      } else if (isCommon) {
        applyCommonRowStyle(cell);
      } else if (colDef.align === 'left') {
        applyDataLeftStyle(cell);
      } else {
        applyDataStyle(cell);
      }
    });
  });

  // 열 고정 (헤더 1행)
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
}

// ─── 수동 템플릿 ───

/** ② 수동 템플릿 생성 */
export async function generateManualTemplate(config: TemplateConfig) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FMEA Smart System';
  workbook.created = new Date();

  const processNumbers = generateProcessNumbers(config.processCount, config.processNaming);
  const m4Rows = generateM4Rows(config, processNumbers);

  for (const sheetCode of SHEET_ORDER) {
    const rows = buildSheetRows(sheetCode, processNumbers, m4Rows, null);
    addSheetWithData(workbook, sheetCode, rows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadBuffer(buffer, 'PFMEA_수동_템플릿');
}

// ─── 자동 템플릿 ───

/** ③ 자동 템플릿 생성 */
export async function generateAutoTemplate(config: AutoTemplateConfig) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FMEA Smart System';
  workbook.created = new Date();

  // 작업요소에서 공정번호 목록 추출
  const processNumbers = [...new Set(config.workElements.map((w) => w.processNo))];
  // 작업요소를 4M 순서로 정렬
  const sortedElements = [...config.workElements].sort((a, b) => {
    const pCmp = processNumbers.indexOf(a.processNo) - processNumbers.indexOf(b.processNo);
    if (pCmp !== 0) return pCmp;
    return (M4_SORT_ORDER[a.m4] ?? 9) - (M4_SORT_ORDER[b.m4] ?? 9);
  });

  for (const sheetCode of SHEET_ORDER) {
    const rows = buildAutoSheetRows(sheetCode, processNumbers, sortedElements, config);
    addSheetWithData(workbook, sheetCode, rows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadBuffer(buffer, 'PFMEA_자동_템플릿');
}

// ─── 행 생성 로직 ───

/** 수동 모드: 시트별 빈 행 생성 */
function buildSheetRows(
  sheetCode: string,
  processNumbers: string[],
  m4Rows: Array<{ processNo: string; processName: string; m4: string }>,
  _unused: null,
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  switch (sheetCode) {
    // A 시리즈: 공정 수만큼
    case 'A12':
    case 'A3':
    case 'A4':
    case 'A5':
    case 'A6':
      processNumbers.forEach((pNo) => {
        rows.push({ processNo: pNo, processName: '' });
      });
      break;

    // B 시리즈: 4M 행 기준
    case 'B1':
    case 'B2':
    case 'B3':
      m4Rows.forEach((r) => {
        rows.push({ processNo: r.processNo, processName: r.processName, m4: r.m4 });
      });
      break;

    // B4: 4M 포함
    case 'B4':
      m4Rows.forEach((r) => {
        rows.push({ processNo: r.processNo, processName: r.processName, m4: r.m4 });
      });
      break;

    // B5: 4M 포함 + 공정별만 (공통 제외)
    case 'B5':
      m4Rows.forEach((r) => {
        rows.push({ processNo: r.processNo, processName: r.processName, m4: r.m4 });
      });
      break;

    // C 시리즈: YP/SP/USER 3행
    case 'C1':
    case 'C2':
      ['YP', 'SP', 'USER'].forEach((cat) => {
        rows.push({ category: cat });
      });
      break;
    case 'C3':
      ['YP', 'SP', 'USER'].forEach((cat) => {
        rows.push({ category: cat, partName: '' });
      });
      break;
    case 'C4':
      ['YP', 'SP', 'USER'].forEach((cat) => {
        rows.push({ category: cat, severity: '-' });
      });
      break;
  }

  return rows;
}

/** 자동 모드: 작업요소 기반 행 생성 */
function buildAutoSheetRows(
  sheetCode: string,
  processNumbers: string[],
  sortedElements: WorkElementInput[],
  config: AutoTemplateConfig,
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  // 공정번호→공정명 맵
  const processNameMap = new Map<string, string>();
  sortedElements.forEach((w) => { if (w.processName) processNameMap.set(w.processNo, w.processName); });

  switch (sheetCode) {
    // A 시리즈: 공정명 채워서 출력
    case 'A12':
      processNumbers.forEach((pNo) => {
        rows.push({ processNo: pNo, processName: processNameMap.get(pNo) || '' });
      });
      break;
    case 'A3':
    case 'A4':
    case 'A5':
    case 'A6':
      processNumbers.forEach((pNo) => {
        rows.push({ processNo: pNo, processName: processNameMap.get(pNo) || '' });
      });
      break;

    // B1: 작업요소 완성
    case 'B1':
      sortedElements.forEach((w) => {
        rows.push({
          processNo: w.processNo,
          processName: processNameMap.get(w.processNo) || w.processName,
          m4: w.m4,
          workElement: w.name,
        });
      });
      break;

    // B2: 작업요소 복사 + 행 배수
    case 'B2':
      sortedElements.forEach((w) => {
        for (let i = 0; i < config.b2Rows; i++) {
          rows.push({
            processNo: w.processNo,
            processName: processNameMap.get(w.processNo) || w.processName,
            m4: w.m4,
            workElement: w.name,
          });
        }
      });
      break;

    // B3: 작업요소 복사 + 행 배수
    case 'B3':
      sortedElements.forEach((w) => {
        for (let i = 0; i < config.b3Rows; i++) {
          rows.push({
            processNo: w.processNo,
            processName: processNameMap.get(w.processNo) || w.processName,
            m4: w.m4,
            workElement: w.name,
          });
        }
      });
      break;

    // B4: 4M 포함 + 행 배수
    case 'B4':
      sortedElements.forEach((w) => {
        for (let i = 0; i < config.b4Rows; i++) {
          rows.push({
            processNo: w.processNo,
            processName: processNameMap.get(w.processNo) || w.processName,
            m4: w.m4,
            workElement: w.name,
          });
        }
      });
      break;

    // B5: 4M 포함 + 행 배수
    case 'B5':
      sortedElements.forEach((w) => {
        for (let i = 0; i < config.b5Rows; i++) {
          rows.push({
            processNo: w.processNo,
            processName: processNameMap.get(w.processNo) || w.processName,
            m4: w.m4,
          });
        }
      });
      break;

    // C 시리즈: 동일
    case 'C1':
    case 'C2':
      ['YP', 'SP', 'USER'].forEach((cat) => { rows.push({ category: cat }); });
      break;
    case 'C3':
      ['YP', 'SP', 'USER'].forEach((cat) => { rows.push({ category: cat, partName: '' }); });
      break;
    case 'C4':
      ['YP', 'SP', 'USER'].forEach((cat) => { rows.push({ category: cat, severity: '-' }); });
      break;
  }

  return rows;
}
