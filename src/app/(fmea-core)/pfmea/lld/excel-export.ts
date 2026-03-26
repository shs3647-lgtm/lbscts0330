/**
 * @file excel-export.ts
 * @description LLD 교훈 사례 엑셀 내보내기 — ExcelJS 기반
 * 원본 양식: LLD_이양식_통합본.xlsx (19컬럼 + 4그룹 헤더)
 * 그룹: 기본 정보 | 현행 리스크 | 개선 내용 | 개선 결과
 */

import type ExcelJS_NS from 'exceljs';
import { CLASSIFICATION_LABELS, type Classification, type LLDRow } from './types';

async function loadExcelJS(): Promise<typeof ExcelJS_NS> {
  const mod = await import('exceljs');
  return mod.default || mod;
}

// ══════════════════════════════════════
// 색상 상수
// ══════════════════════════════════════
const C = {
  // 그룹 헤더 (4색)
  grpInfo: '1565C0',      // 기본 정보 — 네이비
  grpRisk: 'C62828',      // 현행 리스크 — 레드
  grpImprove: '2E7D32',   // 개선 내용 — 그린
  grpResult: '7B1FA2',    // 개선 결과 — 퍼플
  // 컬럼 헤더
  headerBg: '1E88E5',
  subHeaderBg: 'E3F2FD',
  subHeaderFont: '1565C0',
  // 타이틀
  titleBg: '1565C0',
  white: 'FFFFFF',
  // 데이터
  rowEven: 'F5F5F5',
  rowOdd: 'FFFFFF',
  border: 'BDBDBD',
  // 구분
  clsRMA: 'FFCDD2', clsABN: 'FFE0B2', clsCIP: 'C8E6C9',
  clsECN: 'BBDEFB', clsField: 'E1BEE7', clsDev: 'C5CAE9',
  // 상태
  statusG: '92D050', statusY: 'FFD966', statusR: 'FF6B6B',
  statusGFont: '1B5E20', statusYFont: '7C4D00', statusRFont: 'FFFFFF',
  // SOD 점수 색상 (원본 양식: 녹≤2, 노3~4, 주5~6, 빨7~)
  sodGreen: 'C6EFCE', sodYellow: 'FFEB9C', sodOrange: 'FCD5B4', sodRed: 'FFC7CE',
  sodGreenFont: '006100', sodYellowFont: '9C6500', sodOrangeFont: '974706', sodRedFont: '9C0006',
  // AP
  apH: 'FF6B6B', apM: 'FFD966', apL: '92D050',
  // 요약
  summaryBg: 'E8EAF6', summaryFont: '283593',
} as const;

const CLS_BG: Record<string, string> = {
  RMA: C.clsRMA, ABN: C.clsABN, CIP: C.clsCIP,
  ECN: C.clsECN, FieldIssue: C.clsField, DevIssue: C.clsDev,
};
const CLS_FONT: Record<string, string> = {
  RMA: 'B71C1C', ABN: 'E65100', CIP: '1B5E20',
  ECN: '0D47A1', FieldIssue: '6A1B9A', DevIssue: '283593',
};

// ── 공유 스타일 ──
const THIN_BORDER: Partial<ExcelJS_NS.Borders> = {
  top: { style: 'thin', color: { argb: C.border } },
  left: { style: 'thin', color: { argb: C.border } },
  bottom: { style: 'thin', color: { argb: C.border } },
  right: { style: 'thin', color: { argb: C.border } },
};
const FONT_DATA: Partial<ExcelJS_NS.Font> = { size: 9, name: '맑은 고딕' };
const ALIGN_C: Partial<ExcelJS_NS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: true };
const ALIGN_L: Partial<ExcelJS_NS.Alignment> = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };

// ══════════════════════════════════════
// 19컬럼 정의 (원본 양식 기준)
// ══════════════════════════════════════
interface ColDef {
  key: string; header: string; subHeader: string;
  width: number; align: 'center' | 'left';
  group: string; groupColor: string;
}

const COLUMNS: ColDef[] = [
  // ── 기본 정보 (3) ──
  { key: 'lldNo',    header: 'LLD No.',       subHeader: 'LLD No.',        width: 13, align: 'center', group: '기본 정보',  groupColor: C.grpInfo },
  { key: 'cls',      header: '구분',           subHeader: 'Category',       width: 13, align: 'center', group: '기본 정보',  groupColor: C.grpInfo },
  { key: 'process',  header: '공정명',         subHeader: 'Process',        width: 16, align: 'center', group: '기본 정보',  groupColor: C.grpInfo },
  // ── 현행 리스크 (5) ──
  { key: 'fm',       header: '고장형태\n(FM)', subHeader: 'Failure Mode',   width: 24, align: 'left',   group: '현행 리스크', groupColor: C.grpRisk },
  { key: 'fc',       header: '고장원인\n(FC)', subHeader: 'Failure Cause',  width: 28, align: 'left',   group: '현행 리스크', groupColor: C.grpRisk },
  { key: 's',        header: 'S',              subHeader: 'S',              width: 5,  align: 'center', group: '현행 리스크', groupColor: C.grpRisk },
  { key: 'o',        header: 'O',              subHeader: 'O',              width: 5,  align: 'center', group: '현행 리스크', groupColor: C.grpRisk },
  { key: 'd',        header: 'D',              subHeader: 'D',              width: 5,  align: 'center', group: '현행 리스크', groupColor: C.grpRisk },
  // ── 개선 내용 (6) ──
  { key: 'prevImpr', header: '예방관리\n개선', subHeader: 'PC Improvement', width: 32, align: 'left',   group: '개선 내용',  groupColor: C.grpImprove },
  { key: 'detImpr',  header: '검출관리\n개선', subHeader: 'DC Improvement', width: 32, align: 'left',   group: '개선 내용',  groupColor: C.grpImprove },
  { key: 'resp',     header: '책임자',         subHeader: 'Owner',          width: 10, align: 'center', group: '개선 내용',  groupColor: C.grpImprove },
  { key: 'target',   header: '목표\n완료일',   subHeader: 'Target\nDate',   width: 12, align: 'center', group: '개선 내용',  groupColor: C.grpImprove },
  { key: 'status',   header: '상태',           subHeader: 'Status',         width: 8,  align: 'center', group: '개선 내용',  groupColor: C.grpImprove },
  { key: 'evidence', header: '개선결과\n근거', subHeader: 'Evidence',       width: 28, align: 'left',   group: '개선 내용',  groupColor: C.grpImprove },
  // ── 개선 결과 (5) ──
  { key: 'compDate', header: '완료일자',       subHeader: 'Completion\nDate', width: 12, align: 'center', group: '개선 결과', groupColor: C.grpResult },
  { key: 'newS',     header: '개선\n후 S',     subHeader: 'S',              width: 6,  align: 'center', group: '개선 결과',  groupColor: C.grpResult },
  { key: 'newO',     header: '개선\n후 O',     subHeader: 'O',              width: 6,  align: 'center', group: '개선 결과',  groupColor: C.grpResult },
  { key: 'newD',     header: '개선\n후 D',     subHeader: 'D',              width: 6,  align: 'center', group: '개선 결과',  groupColor: C.grpResult },
  { key: 'newAP',    header: '개선\n후 AP',    subHeader: 'AP',             width: 7,  align: 'center', group: '개선 결과',  groupColor: C.grpResult },
];

const STATUS_LABEL: Record<string, string> = { G: '완료', Y: '진행중', R: '미완료' };

// ══════════════════════════════════════
// 스타일 헬퍼
// ══════════════════════════════════════
function fillCell(cell: ExcelJS_NS.Cell, bg: string, font: Partial<ExcelJS_NS.Font>, align: Partial<ExcelJS_NS.Alignment>) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.font = font;
  cell.alignment = align;
  cell.border = THIN_BORDER;
}

function styleGroupHeader(cell: ExcelJS_NS.Cell, color: string) {
  fillCell(cell, color, { bold: true, color: { argb: C.white }, size: 11, name: '맑은 고딕' }, ALIGN_C);
}

function styleHeader(cell: ExcelJS_NS.Cell, color: string) {
  fillCell(cell, color, { bold: true, color: { argb: C.white }, size: 10, name: '맑은 고딕' }, ALIGN_C);
}

function styleSubHeader(cell: ExcelJS_NS.Cell) {
  fillCell(cell, C.subHeaderBg, { bold: true, color: { argb: C.subHeaderFont }, size: 9, name: '맑은 고딕' }, ALIGN_C);
}

function styleData(cell: ExcelJS_NS.Cell, isEven: boolean, align: 'center' | 'left') {
  fillCell(cell, isEven ? C.rowEven : C.rowOdd, FONT_DATA, align === 'center' ? ALIGN_C : ALIGN_L);
}

function styleClassification(cell: ExcelJS_NS.Cell, cls: string) {
  fillCell(cell, CLS_BG[cls] || C.rowOdd, { bold: true, color: { argb: CLS_FONT[cls] || '212121' }, size: 9, name: '맑은 고딕' }, ALIGN_C);
}

function styleStatus(cell: ExcelJS_NS.Cell, status: string) {
  const bgMap: Record<string, string> = { G: C.statusG, Y: C.statusY, R: C.statusR };
  const fgMap: Record<string, string> = { G: C.statusGFont, Y: C.statusYFont, R: C.statusRFont };
  fillCell(cell, bgMap[status] || C.rowOdd, { bold: true, color: { argb: fgMap[status] || '212121' }, size: 9, name: '맑은 고딕' }, ALIGN_C);
}

/** SOD 점수 색상: 녹≤2, 노3~4, 주5~6, 빨7~ */
function styleSOD(cell: ExcelJS_NS.Cell, val: number | null | string, isEven: boolean) {
  const n = typeof val === 'number' ? val : null;
  cell.value = n ?? '';
  if (n == null) { styleData(cell, isEven, 'center'); return; }
  let bg: string, fg: string;
  if (n <= 2) { bg = C.sodGreen; fg = C.sodGreenFont; }
  else if (n <= 4) { bg = C.sodYellow; fg = C.sodYellowFont; }
  else if (n <= 6) { bg = C.sodOrange; fg = C.sodOrangeFont; }
  else { bg = C.sodRed; fg = C.sodRedFont; }
  fillCell(cell, bg, { bold: n >= 7, color: { argb: fg }, size: 9, name: '맑은 고딕' }, ALIGN_C);
}

function styleAP(cell: ExcelJS_NS.Cell, ap: string) {
  const bgMap: Record<string, string> = { H: C.apH, M: C.apM, L: C.apL };
  const fgMap: Record<string, string> = { H: C.statusRFont, M: C.statusYFont, L: C.statusGFont };
  if (ap && bgMap[ap]) {
    fillCell(cell, bgMap[ap], { bold: true, color: { argb: fgMap[ap] || '212121' }, size: 9, name: '맑은 고딕' }, ALIGN_C);
  } else {
    fillCell(cell, C.rowOdd, FONT_DATA, ALIGN_C);
  }
}

// ══════════════════════════════════════
// 데이터 그룹화
// ══════════════════════════════════════
interface GroupedRow {
  lldNo: string; classification: string; processName: string;
  failureMode: string; cause: string;
  severity: number | null; occurrence: number | null; detection: number | null;
  prevImpr: string; detImpr: string;
  responsible: string; targetDate: string; status: string; evidence: string;
  completedDate: string; newS: number | null; newO: number | null; newD: number | null; newAP: string;
  owner: string; attachmentUrl: string;
}

function groupByLldNo(data: LLDRow[]): GroupedRow[] {
  const map = new Map<string, GroupedRow>();
  for (const row of data) {
    if (!map.has(row.lldNo)) {
      map.set(row.lldNo, {
        lldNo: row.lldNo, classification: row.classification, processName: row.processName,
        failureMode: row.failureMode, cause: row.cause,
        severity: row.severity, occurrence: row.occurrence, detection: row.detection,
        prevImpr: row.preventionImprovement || '', detImpr: row.detectionImprovement || '',
        responsible: row.responsible || row.owner || '', targetDate: row.targetDate || '',
        status: row.status || 'R', evidence: row.evidence || '',
        completedDate: row.completedDate || '',
        newS: row.newSeverity ?? null, newO: row.newOccurrence ?? null, newD: row.newDetection ?? null,
        newAP: row.newAP || '',
        owner: row.owner || '', attachmentUrl: row.attachmentUrl || '',
      });
    } else {
      const g = map.get(row.lldNo)!;
      if (row.preventionImprovement && !g.prevImpr) g.prevImpr = row.preventionImprovement;
      if (row.detectionImprovement && !g.detImpr) g.detImpr = row.detectionImprovement;
      if (row.occurrence != null && g.occurrence == null) g.occurrence = row.occurrence;
      if (row.detection != null && g.detection == null) g.detection = row.detection;
    }
  }
  return Array.from(map.values());
}

// ══════════════════════════════════════
// 그룹 범위 계산
// ══════════════════════════════════════
function getGroupRanges(): { name: string; color: string; start: number; end: number }[] {
  const groups: { name: string; color: string; start: number; end: number }[] = [];
  let curGroup = '';
  for (let i = 0; i < COLUMNS.length; i++) {
    const col = COLUMNS[i];
    if (col.group !== curGroup) {
      if (groups.length > 0) groups[groups.length - 1].end = i; // 0-based
      groups.push({ name: col.group, color: col.groupColor, start: i + 1, end: -1 }); // 1-based
      curGroup = col.group;
    }
  }
  if (groups.length > 0) groups[groups.length - 1].end = COLUMNS.length;
  return groups;
}

// ══════════════════════════════════════
// 메인 Export 함수
// ══════════════════════════════════════
export async function exportLLDExcel(data: LLDRow[]) {
  if (data.length === 0) { alert('내보낼 데이터가 없습니다.'); return; }

  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FMEA On-Premise';
  wb.created = new Date();

  const ws = wb.addWorksheet('LLD 교훈사례', {
    properties: { tabColor: { argb: '1B5E20' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }],
  });

  const colCount = COLUMNS.length;
  const grouped = groupByLldNo(data);
  const groups = getGroupRanges();

  ws.columns = COLUMNS.map(c => ({ width: c.width }));

  // ═══════════════════════════════════
  // ROW 1: 타이틀 바
  // ═══════════════════════════════════
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  const today = new Date().toISOString().slice(0, 10);
  titleCell.value = `LLD — 교훈 사례 등록 (통합본)  |  ${today}  |  총 ${grouped.length}건`;
  fillCell(titleCell, C.titleBg, { bold: true, color: { argb: C.white }, size: 13, name: '맑은 고딕' }, { vertical: 'middle', horizontal: 'left', indent: 1 });
  ws.getRow(1).height = 34;
  for (let c = 2; c <= colCount; c++) ws.getCell(1, c).border = THIN_BORDER;

  // ═══════════════════════════════════
  // ROW 2: 그룹 헤더 (4색 구분)
  // ═══════════════════════════════════
  ws.getRow(2).height = 26;
  for (const g of groups) {
    ws.mergeCells(2, g.start, 2, g.end);
    const cell = ws.getCell(2, g.start);
    cell.value = g.name;
    styleGroupHeader(cell, g.color);
    // 병합 영역 나머지에 테두리
    for (let c = g.start + 1; c <= g.end; c++) ws.getCell(2, c).border = THIN_BORDER;
  }

  // ═══════════════════════════════════
  // ROW 3: 한글 헤더
  // ═══════════════════════════════════
  ws.getRow(3).height = 30;
  for (let i = 0; i < colCount; i++) {
    const cell = ws.getCell(3, i + 1);
    cell.value = COLUMNS[i].header;
    styleHeader(cell, COLUMNS[i].groupColor);
  }

  // ═══════════════════════════════════
  // ROW 4: 영문 서브헤더
  // ═══════════════════════════════════
  ws.getRow(4).height = 22;
  for (let i = 0; i < colCount; i++) {
    const cell = ws.getCell(4, i + 1);
    cell.value = COLUMNS[i].subHeader;
    styleSubHeader(cell);
  }

  // ═══════════════════════════════════
  // ROW 5+: 데이터 행
  // ═══════════════════════════════════
  for (let r = 0; r < grouped.length; r++) {
    const row = grouped[r];
    const rowNum = r + 5;
    const isEven = r % 2 === 0;
    const wsRow = ws.getRow(rowNum);
    wsRow.height = 26;

    const vals: (string | number | null)[] = [
      row.lldNo,
      CLASSIFICATION_LABELS[row.classification as Classification] || row.classification,
      row.processName,
      row.failureMode, row.cause,
      row.severity, row.occurrence, row.detection,
      row.prevImpr, row.detImpr,
      row.responsible, row.targetDate,
      STATUS_LABEL[row.status] || row.status,
      row.evidence,
      row.completedDate,
      row.newS, row.newO, row.newD, row.newAP,
    ];

    for (let c = 0; c < colCount; c++) {
      const cell = ws.getCell(rowNum, c + 1);
      const col = COLUMNS[c];

      // SOD 점수 (현행 + 개선후)
      if (['s', 'o', 'd', 'newS', 'newO', 'newD'].includes(col.key)) {
        styleSOD(cell, vals[c], isEven);
        continue;
      }
      // AP
      if (col.key === 'newAP') {
        cell.value = vals[c] ?? '';
        styleAP(cell, String(vals[c] || ''));
        continue;
      }

      cell.value = vals[c] ?? '';

      // 구분
      if (col.key === 'cls') { styleClassification(cell, row.classification); continue; }
      // 상태
      if (col.key === 'status') { styleStatus(cell, row.status); continue; }
      // 일반
      styleData(cell, isEven, col.align);
    }
  }

  // ═══════════════════════════════════
  // 하단 요약
  // ═══════════════════════════════════
  const sumRow = grouped.length + 5;
  ws.mergeCells(sumRow, 1, sumRow, colCount);
  const sumCell = ws.getCell(sumRow, 1);
  const gC = grouped.filter(r => r.status === 'G').length;
  const yC = grouped.filter(r => r.status === 'Y').length;
  const rC = grouped.filter(r => r.status === 'R').length;
  sumCell.value = `※ 총 ${grouped.length}건  |  완료(G): ${gC}건  |  진행중(Y): ${yC}건  |  미완료(R): ${rC}건  |  구분: 이상(ABN) = 이상/불량 사례  |  개선(CIP) = 지속 개선 활동  |  점수 색상: 녹색 ≤2  노랑 3~4  주황 5~6  빨강 7~`;
  fillCell(sumCell, C.summaryBg, { bold: true, color: { argb: C.summaryFont }, size: 9, name: '맑은 고딕' }, { vertical: 'middle', horizontal: 'left', indent: 1 });
  ws.getRow(sumRow).height = 24;
  for (let c = 2; c <= colCount; c++) ws.getCell(sumRow, c).border = THIN_BORDER;

  // ── 다운로드 ──
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LLD_Export_${dateStr}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════
// 빈 양식 템플릿
// ══════════════════════════════════════
export async function exportLLDTemplate() {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FMEA On-Premise';

  const ws = wb.addWorksheet('LLD 교훈사례', {
    properties: { tabColor: { argb: '1B5E20' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }],
  });

  const colCount = COLUMNS.length;
  const groups = getGroupRanges();
  ws.columns = COLUMNS.map(c => ({ width: c.width }));

  // 타이틀
  ws.mergeCells(1, 1, 1, colCount);
  const tc = ws.getCell(1, 1);
  tc.value = 'LLD — 교훈 사례 등록 (통합본)';
  fillCell(tc, C.titleBg, { bold: true, color: { argb: C.white }, size: 13, name: '맑은 고딕' }, { vertical: 'middle', horizontal: 'left', indent: 1 });
  ws.getRow(1).height = 34;
  for (let c = 2; c <= colCount; c++) ws.getCell(1, c).border = THIN_BORDER;

  // 그룹 헤더
  ws.getRow(2).height = 26;
  for (const g of groups) {
    ws.mergeCells(2, g.start, 2, g.end);
    const cell = ws.getCell(2, g.start);
    cell.value = g.name;
    styleGroupHeader(cell, g.color);
    for (let c = g.start + 1; c <= g.end; c++) ws.getCell(2, c).border = THIN_BORDER;
  }

  // 한글 헤더
  ws.getRow(3).height = 30;
  for (let i = 0; i < colCount; i++) {
    const cell = ws.getCell(3, i + 1);
    cell.value = COLUMNS[i].header;
    styleHeader(cell, COLUMNS[i].groupColor);
  }

  // 영문 헤더
  ws.getRow(4).height = 22;
  for (let i = 0; i < colCount; i++) {
    const cell = ws.getCell(4, i + 1);
    cell.value = COLUMNS[i].subHeader;
    styleSubHeader(cell);
  }

  // 빈 행 5개
  for (let r = 0; r < 5; r++) {
    ws.getRow(r + 5).height = 26;
    for (let c = 0; c < colCount; c++) {
      const cell = ws.getCell(r + 5, c + 1);
      cell.value = '';
      styleData(cell, r % 2 === 0, COLUMNS[c].align);
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'LLD_Unified_Template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
