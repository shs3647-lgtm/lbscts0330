/**
 * @file excel-export.ts
 * @description LLD 교훈 사례 엑셀 내보내기 — ExcelJS 기반 스타일링
 * - 프로젝트 표준 패턴: 맑은 고딕, 네이비 헤더, 교차 행색, thin 테두리
 * - 구분별 색상 뱃지, 상태 신호등, SOD 수치 중앙정렬
 */

import type ExcelJS_NS from 'exceljs';
import { CLASSIFICATION_LABELS, type Classification, type LLDRow } from './types';

// ── 동적 로드 ──
async function loadExcelJS(): Promise<typeof ExcelJS_NS> {
  const mod = await import('exceljs');
  return mod.default || mod;
}

// ══════════════════════════════════════
// 색상 상수
// ══════════════════════════════════════
const C = {
  // 헤더
  titleBg: '1565C0',       // 네이비
  titleFont: 'FFFFFF',
  headerBg: '1E88E5',      // 블루
  subHeaderBg: 'E3F2FD',   // 연한 블루
  subHeaderFont: '1565C0',
  // 데이터
  rowEven: 'F5F5F5',
  rowOdd: 'FFFFFF',
  // 테두리
  border: 'BDBDBD',
  // 구분 색상 (엑셀 ARGB — # 없음)
  clsRMA: 'FFCDD2',        // 연빨
  clsABN: 'FFE0B2',        // 연주황
  clsCIP: 'C8E6C9',        // 연초록
  clsECN: 'BBDEFB',        // 연파랑
  clsField: 'E1BEE7',      // 연보라
  clsDev: 'C5CAE9',        // 연남색
  // 상태 색상
  statusG: '92D050',
  statusY: 'FFD966',
  statusR: 'FF6B6B',
  statusGFont: '1B5E20',
  statusYFont: '7C4D00',
  statusRFont: 'FFFFFF',
} as const;

const CLS_BG: Record<string, string> = {
  RMA: C.clsRMA, ABN: C.clsABN, CIP: C.clsCIP,
  ECN: C.clsECN, FieldIssue: C.clsField, DevIssue: C.clsDev,
};
const CLS_FONT: Record<string, string> = {
  RMA: 'B71C1C', ABN: 'E65100', CIP: '1B5E20',
  ECN: '0D47A1', FieldIssue: '6A1B9A', DevIssue: '283593',
};

// ── 공유 스타일 객체 (GC 절약) ──
const THIN_BORDER: Partial<ExcelJS_NS.Borders> = {
  top: { style: 'thin', color: { argb: C.border } },
  left: { style: 'thin', color: { argb: C.border } },
  bottom: { style: 'thin', color: { argb: C.border } },
  right: { style: 'thin', color: { argb: C.border } },
};
const FONT_HEADER: Partial<ExcelJS_NS.Font> = { bold: true, color: { argb: C.titleFont }, size: 10, name: '맑은 고딕' };
const FONT_SUB: Partial<ExcelJS_NS.Font> = { bold: true, color: { argb: C.subHeaderFont }, size: 9, name: '맑은 고딕' };
const FONT_DATA: Partial<ExcelJS_NS.Font> = { size: 9, name: '맑은 고딕' };
const ALIGN_CENTER: Partial<ExcelJS_NS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: true };
const ALIGN_LEFT: Partial<ExcelJS_NS.Alignment> = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };

// ══════════════════════════════════════
// 컬럼 정의
// ══════════════════════════════════════
interface ColDef { key: string; header: string; subHeader: string; width: number; align: 'center' | 'left' }

const COLUMNS: ColDef[] = [
  { key: 'no',       header: 'No',           subHeader: '#',               width: 5,  align: 'center' },
  { key: 'lldNo',    header: 'LLD No.',      subHeader: 'LLD No.',         width: 13, align: 'center' },
  { key: 'cls',      header: '구분',          subHeader: 'Category',        width: 13, align: 'center' },
  { key: 'process',  header: '공정명',        subHeader: 'Process',         width: 16, align: 'center' },
  { key: 'fm',       header: '고장형태(FM)',   subHeader: 'Failure Mode',    width: 28, align: 'left' },
  { key: 'fc',       header: '고장원인(FC)',   subHeader: 'Failure Cause',   width: 28, align: 'left' },
  { key: 's',        header: 'S',             subHeader: 'Sev',             width: 5,  align: 'center' },
  { key: 'o',        header: 'O',             subHeader: 'Occ',             width: 5,  align: 'center' },
  { key: 'd',        header: 'D',             subHeader: 'Det',             width: 5,  align: 'center' },
  { key: 'prevImpr', header: '예방관리 개선',   subHeader: 'PC Improvement',  width: 38, align: 'left' },
  { key: 'detImpr',  header: '검출관리 개선',   subHeader: 'DC Improvement',  width: 38, align: 'left' },
  { key: 'date',     header: '개선일자',       subHeader: 'Comp. Date',      width: 13, align: 'center' },
  { key: 'status',   header: '상태',          subHeader: 'Status',           width: 8,  align: 'center' },
  { key: 'owner',    header: '담당자',         subHeader: 'Owner',           width: 10, align: 'center' },
  { key: 'attach',   header: '첨부(근거서류)', subHeader: 'Attachment',       width: 22, align: 'left' },
];

const STATUS_LABEL: Record<string, string> = { G: '완료', Y: '진행중', R: '미완료' };

// ══════════════════════════════════════
// 셀 스타일 헬퍼
// ══════════════════════════════════════
function styleTitle(cell: ExcelJS_NS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } };
  cell.font = { bold: true, color: { argb: C.titleFont }, size: 13, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cell.border = THIN_BORDER;
}

function styleHeader(cell: ExcelJS_NS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
  cell.font = FONT_HEADER;
  cell.alignment = ALIGN_CENTER;
  cell.border = THIN_BORDER;
}

function styleSubHeader(cell: ExcelJS_NS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subHeaderBg } };
  cell.font = FONT_SUB;
  cell.alignment = ALIGN_CENTER;
  cell.border = THIN_BORDER;
}

function styleData(cell: ExcelJS_NS.Cell, isEven: boolean, align: 'center' | 'left') {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? C.rowEven : C.rowOdd } };
  cell.font = FONT_DATA;
  cell.alignment = align === 'center' ? ALIGN_CENTER : ALIGN_LEFT;
  cell.border = THIN_BORDER;
}

function styleClassification(cell: ExcelJS_NS.Cell, cls: string) {
  const bg = CLS_BG[cls] || C.rowOdd;
  const fg = CLS_FONT[cls] || '212121';
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.font = { bold: true, color: { argb: fg }, size: 9, name: '맑은 고딕' };
  cell.alignment = ALIGN_CENTER;
  cell.border = THIN_BORDER;
}

function styleStatus(cell: ExcelJS_NS.Cell, status: string) {
  const bgMap: Record<string, string> = { G: C.statusG, Y: C.statusY, R: C.statusR };
  const fgMap: Record<string, string> = { G: C.statusGFont, Y: C.statusYFont, R: C.statusRFont };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgMap[status] || C.rowOdd } };
  cell.font = { bold: true, color: { argb: fgMap[status] || '212121' }, size: 9, name: '맑은 고딕' };
  cell.alignment = ALIGN_CENTER;
  cell.border = THIN_BORDER;
}

function styleSOD(cell: ExcelJS_NS.Cell, val: number | null | string, isEven: boolean) {
  const n = typeof val === 'number' ? val : null;
  cell.value = n ?? '';
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? C.rowEven : C.rowOdd } };
  cell.font = { bold: n !== null && n >= 7, color: { argb: n !== null && n >= 8 ? 'C62828' : '212121' }, size: 9, name: '맑은 고딕' };
  cell.alignment = ALIGN_CENTER;
  cell.border = THIN_BORDER;
}

// ══════════════════════════════════════
// 데이터 그룹화 (동일 lldNo → 1행)
// ══════════════════════════════════════
interface GroupedRow {
  lldNo: string; classification: string; processName: string;
  failureMode: string; cause: string;
  severity: number | null; occurrence: number | null; detection: number | null;
  prevImpr: string; detImpr: string;
  completedDate: string; status: string; owner: string; attachmentUrl: string;
}

function groupByLldNo(data: LLDRow[]): GroupedRow[] {
  const map = new Map<string, GroupedRow>();
  for (const row of data) {
    if (!map.has(row.lldNo)) {
      map.set(row.lldNo, {
        lldNo: row.lldNo,
        classification: row.classification,
        processName: row.processName,
        failureMode: row.failureMode,
        cause: row.cause,
        severity: row.severity,
        occurrence: row.occurrence,
        detection: row.detection,
        prevImpr: row.preventionImprovement || '',
        detImpr: row.detectionImprovement || '',
        completedDate: row.completedDate || '',
        status: row.status || 'R',
        owner: row.owner || '',
        attachmentUrl: row.attachmentUrl || '',
      });
    } else {
      const g = map.get(row.lldNo)!;
      // prevention / detection 병합
      if (row.preventionImprovement && !g.prevImpr) g.prevImpr = row.preventionImprovement;
      if (row.detectionImprovement && !g.detImpr) g.detImpr = row.detectionImprovement;
      if (row.occurrence != null && g.occurrence == null) g.occurrence = row.occurrence;
      if (row.detection != null && g.detection == null) g.detection = row.detection;
    }
  }
  return Array.from(map.values());
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
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
  });

  const colCount = COLUMNS.length;
  const grouped = groupByLldNo(data);

  // ── 컬럼 너비 설정 ──
  ws.columns = COLUMNS.map(c => ({ width: c.width }));

  // ═══════════════════════════════════
  // ROW 1: 타이틀 바
  // ═══════════════════════════════════
  const titleRow = ws.getRow(1);
  titleRow.height = 32;
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  const today = new Date().toISOString().slice(0, 10);
  titleCell.value = `LLD — 교훈 사례 등록 (통합본)    ${today}    총 ${grouped.length}건`;
  styleTitle(titleCell);
  // 병합된 영역 나머지에 테두리
  for (let c = 2; c <= colCount; c++) {
    const cell = ws.getCell(1, c);
    cell.border = THIN_BORDER;
  }

  // ═══════════════════════════════════
  // ROW 2: 한글 헤더
  // ═══════════════════════════════════
  const headerRow = ws.getRow(2);
  headerRow.height = 26;
  for (let i = 0; i < colCount; i++) {
    const cell = ws.getCell(2, i + 1);
    cell.value = COLUMNS[i].header;
    styleHeader(cell);
  }

  // ═══════════════════════════════════
  // ROW 3: 영문 서브헤더
  // ═══════════════════════════════════
  const subRow = ws.getRow(3);
  subRow.height = 22;
  for (let i = 0; i < colCount; i++) {
    const cell = ws.getCell(3, i + 1);
    cell.value = COLUMNS[i].subHeader;
    styleSubHeader(cell);
  }

  // ═══════════════════════════════════
  // ROW 4+: 데이터 행
  // ═══════════════════════════════════
  for (let r = 0; r < grouped.length; r++) {
    const row = grouped[r];
    const rowNum = r + 4;
    const isEven = r % 2 === 0;
    const wsRow = ws.getRow(rowNum);
    wsRow.height = 24;

    const vals: (string | number | null)[] = [
      r + 1,                                     // No
      row.lldNo,                                 // LLD No.
      CLASSIFICATION_LABELS[row.classification as Classification] || row.classification, // 구분
      row.processName,                           // 공정명
      row.failureMode,                           // FM
      row.cause,                                 // FC
      row.severity,                              // S
      row.occurrence,                            // O
      row.detection,                             // D
      row.prevImpr,                              // 예방관리 개선
      row.detImpr,                               // 검출관리 개선
      row.completedDate,                         // 개선일자
      STATUS_LABEL[row.status] || row.status,    // 상태
      row.owner,                                 // 담당자
      row.attachmentUrl,                         // 첨부
    ];

    for (let c = 0; c < colCount; c++) {
      const cell = ws.getCell(rowNum, c + 1);
      const col = COLUMNS[c];

      // SOD 특수 처리
      if (col.key === 's' || col.key === 'o' || col.key === 'd') {
        styleSOD(cell, vals[c], isEven);
        continue;
      }

      cell.value = vals[c] ?? '';

      // 구분 컬럼: 색상 뱃지
      if (col.key === 'cls') {
        styleClassification(cell, row.classification);
        continue;
      }

      // 상태 컬럼: 신호등
      if (col.key === 'status') {
        styleStatus(cell, row.status);
        continue;
      }

      // 일반 데이터
      styleData(cell, isEven, col.align);
    }
  }

  // ═══════════════════════════════════
  // 하단 요약 행
  // ═══════════════════════════════════
  const summaryRowNum = grouped.length + 4;
  ws.mergeCells(summaryRowNum, 1, summaryRowNum, colCount);
  const summaryCell = ws.getCell(summaryRowNum, 1);
  const gCount = grouped.filter(r => r.status === 'G').length;
  const yCount = grouped.filter(r => r.status === 'Y').length;
  const rCount = grouped.filter(r => r.status === 'R').length;
  summaryCell.value = `총 ${grouped.length}건  |  완료(G): ${gCount}건  |  진행중(Y): ${yCount}건  |  미완료(R): ${rCount}건`;
  summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8EAF6' } };
  summaryCell.font = { bold: true, color: { argb: '283593' }, size: 10, name: '맑은 고딕' };
  summaryCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summaryCell.border = THIN_BORDER;
  ws.getRow(summaryRowNum).height = 26;
  for (let c = 2; c <= colCount; c++) {
    ws.getCell(summaryRowNum, c).border = THIN_BORDER;
  }

  // ── 파일 다운로드 ──
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
// 빈 양식 템플릿 다운로드
// ══════════════════════════════════════
export async function exportLLDTemplate() {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FMEA On-Premise';

  const ws = wb.addWorksheet('LLD 교훈사례', {
    properties: { tabColor: { argb: '1B5E20' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
  });

  const colCount = COLUMNS.length;
  ws.columns = COLUMNS.map(c => ({ width: c.width }));

  // 타이틀
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = 'LLD — 교훈 사례 등록 (통합본)';
  styleTitle(titleCell);
  ws.getRow(1).height = 32;
  for (let c = 2; c <= colCount; c++) ws.getCell(1, c).border = THIN_BORDER;

  // 한글 헤더
  ws.getRow(2).height = 26;
  for (let i = 0; i < colCount; i++) {
    const cell = ws.getCell(2, i + 1);
    cell.value = COLUMNS[i].header;
    styleHeader(cell);
  }

  // 영문 헤더
  ws.getRow(3).height = 22;
  for (let i = 0; i < colCount; i++) {
    const cell = ws.getCell(3, i + 1);
    cell.value = COLUMNS[i].subHeader;
    styleSubHeader(cell);
  }

  // 빈 행 5개 (가이드)
  for (let r = 0; r < 5; r++) {
    const rowNum = r + 4;
    ws.getRow(rowNum).height = 24;
    for (let c = 0; c < colCount; c++) {
      const cell = ws.getCell(rowNum, c + 1);
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
