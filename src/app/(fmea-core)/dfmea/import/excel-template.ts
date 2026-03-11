/**
 * @file excel-template.ts
 * @description DFMEA 기초정보 Excel 템플릿 생성 유틸리티 (다중 시트 방식)
 * @author AI Assistant
 * @created 2025-12-26
 * @updated 2025-12-26 - 다중 시트 방식으로 변경
 * 
 * 시트 구조 (v4.0: FC 13열 N:1:N — FE→FM→FC 좌우배치):
 * A1: 초점요소번호 + 초점요소명
 * A3-A5: 초점요소번호 + 해당 항목
 * B1-B4: 초점요소번호 + 해당 항목
 * C1-C4: 구분(법규/기본/보조/관능) + 해당 항목
 * FC 고장사슬: FE구분, FE, S, 초점요소번호, FM, 타입, 하위요소(WE), FC, PC, DC, O, D, AP (13열)
 */
/* DFMEA 전용 — PFMEA 클론 후 DFMEA 용어로 변환 (2026-03-03) */


import { saveAs } from 'file-saver';
import type ExcelJS from 'exceljs';

/**
 * ★★★ 2026-02-05: 엑셀 버퍼 다운로드 헬퍼 ★★★
 * - 파일명에 .xlsx 확장자 강제
 * - MIME 타입 명확히 지정
 * - file-saver 실패 시 직접 다운로드 폴백
 */
async function downloadExcelBuffer(buffer: ExcelJS.Buffer, fileName: string) {
  const dateStr = new Date().toISOString().slice(0, 10);
  let fullFileName = `${fileName}_${dateStr}`;
  
  // 이미 .xlsx로 끝나지 않으면 추가
  if (!fullFileName.toLowerCase().endsWith('.xlsx')) {
    fullFileName = `${fullFileName}.xlsx`;
  }
  
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([buffer], { type: mimeType });
  
  try {
    saveAs(blob, fullFileName);
  } catch (e) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fullFileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

/** 템플릿 버전 — 변환규칙 문서와 동일하게 관리 */
const TEMPLATE_VERSION = 'v4.0.0';

/** 시트 정의 - 헤더 색상은 디자인 표준에 따라 네이비 (#00587A) 통일 */
const HEADER_COLOR = '00587A';  // 디자인 표준 네이비 색상

const SHEET_DEFINITIONS = [
  { name: 'L2-1(A1) 초점요소번호', headers: ['L2-1.초점요소번호', 'L2-2.초점요소명', '유형코드(선택)'], color: HEADER_COLOR, required: [true, true, false], legacyName: 'A1' },
  { name: 'L2-2(A2) 초점요소명', headers: ['L2-1.초점요소번호', 'L2-2.초점요소명'], color: HEADER_COLOR, required: [true, true], legacyName: 'A2' },
  { name: 'L2-3(A3) 초점기능', headers: ['L2-1.초점요소번호', 'L2-3.초점기능(설명)'], color: HEADER_COLOR, required: [true, false], legacyName: 'A3' },
  { name: 'L2-4(A4) 초점요소 요구사항', headers: ['L2-1.초점요소번호', 'L2-4.초점요소 요구사항', '특별특성'], color: HEADER_COLOR, required: [true, false, false], legacyName: 'A4' },
  { name: 'L2-5(A5) 고장형태', headers: ['L2-1.초점요소번호', 'L2-5.고장형태'], color: HEADER_COLOR, required: [true, false], legacyName: 'A5' },
  // v3.1.1: A6(검출관리) FC 시트 컬럼으로 복원 (별도 시트는 제거 유지)
  { name: 'L3-1(B1) 하위요소', headers: ['L2-1.초점요소번호', '타입', 'L3-1.하위요소'], color: HEADER_COLOR, required: [true, true, false], legacyName: 'B1' },
  { name: 'L3-2(B2) 하위기능', headers: ['L2-1.초점요소번호', '타입', '★하위요소(B1)', 'L3-2.하위기능'], color: HEADER_COLOR, required: [true, true, false, false], legacyName: 'B2' },
  { name: 'L3-3(B3) 하위기능 요구사항', headers: ['L2-1.초점요소번호', '타입', '★하위요소(B1)', 'L3-3.하위기능 요구사항', '특별특성'], color: HEADER_COLOR, required: [true, true, false, false, false], legacyName: 'B3' },
  { name: 'L3-4(B4) 고장원인', headers: ['L2-1.초점요소번호', '타입', 'L3-4.고장원인'], color: HEADER_COLOR, required: [true, true, false], legacyName: 'B4' },
  // v3.1.1: B5(예방관리) FC 시트 컬럼으로 복원 (별도 시트는 제거 유지)
  { name: 'L1-1(C1) 구분', headers: ['L1-1.구분'], color: HEADER_COLOR, required: [true], legacyName: 'C1' },  // 법규, 기본, 보조, 관능
  { name: 'L1-2(C2) 상위기능', headers: ['L1-1.구분', 'L1-2.상위기능'], color: HEADER_COLOR, required: [true, false], legacyName: 'C2' },
  { name: 'L1-3(C3) 상위요구사항', headers: ['L1-1.구분', 'L1-3.상위요구사항'], color: HEADER_COLOR, required: [true, false], legacyName: 'C3' },
  { name: 'L1-4(C4) 고장영향', headers: ['L1-1.구분', 'L1-4.고장영향'], color: HEADER_COLOR, required: [true, false], legacyName: 'C4' },
  // ★ FC 고장사슬 (v4.0: 13열 N:1:N — FE구분, FE, S, 초점요소번호, FM, 타입, WE, FC, PC, DC, O, D, AP)
  { name: 'FC 고장사슬', headers: ['FE구분', 'FE(고장영향)', 'S', 'L2-1.초점요소번호', 'FM(고장형태)', '타입', '하위요소(WE)', 'FC(고장원인)', 'B5.예방관리', 'A6.검출관리', 'O', 'D', 'AP'], color: 'B91C1C', required: [false, false, false, true, true, false, false, false, false, false, false, false, false], legacyName: 'FC' },
  // ★ 16번째: FA 통합분석 (ALL — v2.7.3: 26→28열, O추천/D추천 추가)
  // v3.1.1: FA 통합분석 26열 유지 (PC/DC는 FC 시트에서 별도 관리)
  { name: 'FA 통합분석', headers: ['구분(C1)', '상위기능(C2)', '상위요구사항(C3)', '초점요소No(A1)', '초점요소명(A2)', '초점기능(A3)', '초점요소 요구사항(A4)', '특별특성(A4)', '타입', '하위요소(B1)', '하위기능(B2)', '하위기능 요구사항(B3)', '특별특성(B3)', '고장영향(C4)', '고장형태(A5)', '고장원인(B4)', 'S', 'O', 'D', 'AP', 'DC추천1', 'DC추천2', 'PC추천1', 'PC추천2', 'O추천', 'D추천'], color: '1E40AF', required: [false, false, false, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, false, false, false, false, false, false, false], legacyName: 'FA' },
];

/** 텍스트 너비 계산 (한글=2, 영문/숫자=1.1, 기타=1) */
function textWidth(text: string): number {
  if (!text) return 0;
  let w = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7AF) w += 2;       // 한글
    else if (code >= 0x3000 && code <= 0x9FFF) w += 2;  // CJK
    else w += 1.1;
  }
  return w;
}

/** 데이터 기반 열 너비 자동 계산 */
function calcAutoWidths(headers: string[], rows: string[][], minWidths?: number[]): number[] {
  return headers.map((h, i) => {
    const headerW = textWidth(h) + 2;
    let maxDataW = 0;
    for (const row of rows) {
      const cellW = textWidth(row[i] || '');
      if (cellW > maxDataW) maxDataW = cellW;
    }
    const min = minWidths?.[i] ?? 8;
    const optimal = Math.max(headerW, maxDataW + 3, min);
    return Math.min(optimal, 60); // 최대 60
  });
}

/** 긴 텍스트 컬럼 판별 (너비 16 초과) */
function isLongColumn(width: number): boolean {
  return width > 16;
}

const THIN_BORDER: ExcelJS.Border = { style: 'thin', color: { argb: '999999' } };
const CELL_BORDERS: Partial<ExcelJS.Borders> = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };

/** 공통 셀 스타일 적용 */
function applyHeaderStyle(cell: ExcelJS.Cell, color: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = CELL_BORDERS;
}

function applyDataStyle(cell: ExcelJS.Cell) {
  cell.border = CELL_BORDERS;
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.font = { name: '맑은 고딕', size: 10 };
}

/** 데이터 셀 스타일 (컬럼 너비 기반 정렬) */
function applyDataCellStyle(cell: ExcelJS.Cell, colWidth: number, bgColor?: string) {
  if (bgColor) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  }
  cell.border = CELL_BORDERS;
  cell.font = { name: '맑은 고딕', size: 10 };
  cell.alignment = {
    vertical: 'middle',
    horizontal: isLongColumn(colWidth) ? 'left' : 'center',
    wrapText: isLongColumn(colWidth),
  };
}

/** 빈 템플릿 다운로드 (다중 시트) */
export async function downloadEmptyTemplate(customFileName?: string) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = `FMEA Smart System ${TEMPLATE_VERSION}`;
  workbook.created = new Date();

  // 각 시트 생성
  SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    // 빈 양식: 헤더 기반 적정 너비
    const emptyWidths: Record<string, number> = {
      'L2-1.초점요소번호': 16, 'L2-2.초점요소명': 20, '유형코드(선택)': 16,
      'L2-3.초점기능(설명)': 40, 'L2-4.초점요소 요구사항': 22, '특별특성': 10, 'L2-5.고장형태': 25,
      '타입': 8,
      'L3-1.하위요소': 28, 'L3-2.하위기능': 35, 'L3-3.하위기능 요구사항': 22,
      'L3-4.고장원인': 30,
      'L1-1.구분': 14, 'L1-2.상위기능': 40, 'L1-3.상위요구사항': 25, 'L1-4.고장영향': 30,
      'DC추천1': 25, 'DC추천2': 25, 'PC추천1': 25, 'PC추천2': 25, 'O추천': 8, 'D추천': 8,
    };
    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: emptyWidths[header] ?? (i === 0 ? 14 : 25),
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    for (let i = 0; i < 10; i++) {
      const row = worksheet.addRow(def.headers.map(() => ''));
      row.eachCell((cell) => applyDataStyle(cell));
    }

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  });

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = customFileName || `DFMEA_기초정보_템플릿_${TEMPLATE_VERSION}`;
  await downloadExcelBuffer(buffer, fileName);
}

// =====================================================
// ★★★ 실제 데이터 기반 템플릿 다운로드 ★★★
// =====================================================

/** itemCode → 시트명 매핑 */
const ITEM_TO_SHEET: Record<string, string> = {
  A1: 'L2-1(A1) 초점요소번호', A2: 'L2-2(A2) 초점요소명', A3: 'L2-3(A3) 초점기능', A4: 'L2-4(A4) 초점요소 요구사항',
  A5: 'L2-5(A5) 고장형태',
  // v3.1.1: A6(검출관리) FC 시트 컬럼으로 복원 (별도 시트는 제거 유지)
  B1: 'L3-1(B1) 하위요소', B2: 'L3-2(B2) 하위기능', B3: 'L3-3(B3) 하위기능 요구사항',
  B4: 'L3-4(B4) 고장원인',
  // v3.1.1: B5(예방관리) FC 시트 컬럼으로 복원 (별도 시트는 제거 유지)
  C1: 'L1-1(C1) 구분', C2: 'L1-2(C2) 상위기능', C3: 'L1-3(C3) 상위요구사항', C4: 'L1-4(C4) 고장영향',
};

interface FlatDataItem {
  processNo: string;
  itemCode: string;
  value: string;
  m4?: string;
  specialChar?: string;  // ★ v2.4.0: A4(초점요소 요구사항)/B3(하위기능 요구사항) 특별특성 기호
  belongsTo?: string;    // ★ v3.1.2: B2/B3 소속 작업요소명 (★작업요소(B1) 컬럼)
}

/** FC 고장사슬 아이템 (downloadDataTemplate용) — v4.0: N:1:N 구조 */
interface FailureChainItem {
  processNo: string;
  m4?: string;
  fcValue: string;    // B4 고장원인
  fmValue: string;    // A5 고장형태
  feValue: string;    // C4 고장영향
  feScope?: string;   // ★ v4.0: FE 구분 (법규/기본/보조/관능)
  workElement?: string; // ★ v4.0: 하위요소 (WE)
  pcValue?: string;   // B5 예방관리
  dcValue?: string;   // A6 검출관리
  severity?: number;
  occurrence?: number;
  detection?: number;
  ap?: string;
}

/** 실제 기초정보 데이터를 포함한 템플릿 다운로드 */
export async function downloadDataTemplate(flatData: FlatDataItem[], customFileName?: string, failureChains?: FailureChainItem[]) {
  // ★★★ 2026-02-18: B4에 m4가 빠져있으면 B1에서 추론 ★★★
  // 기존 DB 데이터에서 B4의 m4가 누락될 수 있음 — B1 기준으로 보완
  const b1ByPNo: Record<string, string[]> = {};
  flatData.filter(d => d.itemCode === 'B1').forEach(d => {
    if (!b1ByPNo[d.processNo]) b1ByPNo[d.processNo] = [];
    b1ByPNo[d.processNo].push(d.m4 || '');
  });
  const bIdxMap = new Map<string, number>();  // "processNo|itemCode" → 인덱스

  // flatData를 시트별로 그룹핑
  const sheetData: Record<string, string[][]> = {};
  SHEET_DEFINITIONS.forEach(def => { sheetData[def.name] = []; });

  flatData.forEach(d => {
    const sheetName = ITEM_TO_SHEET[d.itemCode];
    if (!sheetName || !sheetData[sheetName]) return;

    if (d.itemCode === 'A1') {
      // A1: 초점요소번호 시트 → 초점요소번호 + 초점요소명(A2) + 유형코드(A0, 선택)
      const a2 = flatData.find(x => x.itemCode === 'A2' && x.processNo === d.processNo);
      const a0 = flatData.find(x => x.itemCode === 'A0' && x.processNo === d.processNo);
      sheetData[sheetName].push([d.value, a2?.value || '', a0?.value || '']);
    } else if (d.itemCode === 'A2') {
      // A2: L2-2 초점요소명 시트에 별도 저장
      if (sheetName && sheetData[sheetName]) {
        sheetData[sheetName].push([d.processNo, d.value]);
      }
      return; // A1 시트에도 포함됨 (위에서 처리)
    } else if (d.itemCode === 'A4') {
      // ★ v2.4.0: A4 초점요소 요구사항 — 초점요소번호 + 값 + 특별특성 (3컬럼)
      sheetData[sheetName].push([d.processNo, d.value, d.specialChar || '']);
    } else if (d.itemCode === 'B1' || d.itemCode === 'B2' || d.itemCode === 'B3' || d.itemCode === 'B4') {
      // B1/B4: 초점요소번호 + 타입 + 값 (3컬럼)
      // B2:    초점요소번호 + 타입 + ★하위요소(B1) + 하위기능 (4컬럼)
      // B3:    초점요소번호 + 타입 + ★하위요소(B1) + 특성 + 특별특성 (5컬럼)
      let m4 = d.m4 || '';
      // m4 누락 시 B1에서 추론 (같은 processNo의 동일 인덱스)
      if (!m4 && d.itemCode !== 'B1') {
        const key = `${d.processNo}|${d.itemCode}`;
        const idx = bIdxMap.get(key) || 0;
        bIdxMap.set(key, idx + 1);
        m4 = b1ByPNo[d.processNo]?.[idx] || '';
      }
      if (d.itemCode === 'B2') {
        // ★ v3.1.2: B2 하위기능 — 초점요소번호 + 타입 + ★하위요소(B1) + 값 (4컬럼)
        sheetData[sheetName].push([d.processNo, m4, d.belongsTo || '', d.value]);
      } else if (d.itemCode === 'B3') {
        // ★ v3.1.2: B3 하위기능 요구사항 — 초점요소번호 + 타입 + ★하위요소(B1) + 값 + 특별특성 (5컬럼)
        sheetData[sheetName].push([d.processNo, m4, d.belongsTo || '', d.value, d.specialChar || '']);
      } else {
        sheetData[sheetName].push([d.processNo, m4, d.value]);
      }
    } else if (d.itemCode === 'C1') {
      // C1: 구분 (1컬럼)
      sheetData[sheetName].push([d.value]);
    } else if (d.itemCode.startsWith('C')) {
      // C2~C4: 구분 + 값
      sheetData[sheetName].push([d.processNo, d.value]);
    } else {
      // A3~A5: 초점요소번호 + 값
      sheetData[sheetName].push([d.processNo, d.value]);
    }
  });

  // ★ FC 고장사슬 시트 데이터 (v4.0: 13컬럼 N:1:N — FE구분, FE, S, 초점요소번호, FM, 타입, WE, FC, PC, DC, O, D, AP)
  if (failureChains && failureChains.length > 0) {
    // ★ FM 기준 그룹핑을 위해 초점요소번호+FM으로 정렬 (병합셀 연속성 보장)
    const sortedChains = [...failureChains].sort((a, b) => {
      const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
      if (pCmp !== 0) return pCmp;
      return (a.fmValue || '').localeCompare(b.fmValue || '');
    });
    sheetData['FC 고장사슬'] = sortedChains.map(fc => [
      fc.feScope || '',                                // FE구분
      fc.feValue || '',                                // FE(고장영향)
      fc.severity ? String(fc.severity) : '',          // S
      fc.processNo,                                    // L2-1.초점요소번호
      fc.fmValue,                                      // FM(고장형태)
      fc.m4 || '',                                     // 타입
      fc.workElement || '',                            // 하위요소(WE)
      fc.fcValue,                                      // FC(고장원인)
      fc.pcValue || '',                                // B5.예방관리
      fc.dcValue || '',                                // A6.검출관리
      fc.occurrence ? String(fc.occurrence) : '',      // O
      fc.detection ? String(fc.detection) : '',        // D
      fc.ap || '',                                     // AP
    ]);
  }

  // 엑셀 생성
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = `FMEA Smart System ${TEMPLATE_VERSION}`;
  workbook.created = new Date();

  SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    const rows = sheetData[def.name] || [];
    // 최소 너비: 첫 컬럼(초점요소번호/구분)=12, 타입=8, 기타=12
    const minWidths = def.headers.map((h, i) => {
      if (h === '타입') return 8;
      if (i === 0) return 12;
      return 12;
    });
    const colWidths = rows.length > 0
      ? calcAutoWidths(def.headers, rows, minWidths)
      : def.headers.map((h, i) => minWidths[i] ?? (i === 0 ? 12 : 25));

    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: colWidths[i],
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    if (rows.length > 0) {
      rows.forEach((data, idx) => {
        const row = worksheet.addRow(data);
        const bg = idx % 2 === 0 ? 'FFFFFF' : 'F0F7FB';
        row.eachCell((cell, colNumber) => {
          applyDataCellStyle(cell, colWidths[colNumber - 1] ?? 20, bg);
        });
      });
    } else {
      for (let i = 0; i < 5; i++) {
        const row = worksheet.addRow(def.headers.map(() => ''));
        row.eachCell((cell) => applyDataStyle(cell));
      }
    }

    // ★★★ 2026-02-28: FC 시트 병합셀 적용 (v2.8.0) ★★★
    if (def.name === 'FC 고장사슬' && rows.length > 1) {
      applyFCSheetMergeCells(worksheet, rows);
    }

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  });

  // ★★★ 2026-02-24: VERIFY 시트 추가 — 엑셀 수식 기반 검증용 ★★★
  addVerifySheet(workbook, sheetData);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = customFileName || `DFMEA_기초정보_데이터_${TEMPLATE_VERSION}`;
  await downloadExcelBuffer(buffer, fileName);
}

/**
 * ★★★ 2026-02-24: VERIFY 시트 생성 — 엑셀 수식 기반 독립 검증 ★★★
 * 
 * 검증 원칙:
 * - 파서/스캐너와 완전히 독립적인 엑셀 내장 수식으로 카운트
 * - 이 값이 "진정한 기준"이 되어 스캐너/파서 버그 검출 가능
 * 
 * 수식 설명:
 * - COUNTA: 비어있지 않은 셀 개수
 * - 헤더 1행 제외를 위해 -1
 */
function addVerifySheet(workbook: ExcelJS.Workbook, sheetData: Record<string, string[][]>) {
  const verifySheet = workbook.addWorksheet('VERIFY', {
    properties: { tabColor: { argb: '10B981' } }, // 초록색
    state: 'visible', // 검증 확인용으로 보이게 설정
  });

  // 열 설정
  verifySheet.columns = [
    { header: '검증항목', key: 'item', width: 25 },
    { header: '엑셀수식값', key: 'formula', width: 15 },
    { header: '설명', key: 'desc', width: 40 },
  ];

  // 헤더 스타일
  const headerRow = verifySheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } };
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11, name: '맑은 고딕' };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = CELL_BORDERS;
  });

  // 검증 항목 및 수식 정의 (Count 5개 + Consistency 3개)
  const verifyItems: { item: string; formula: string; desc: string; type: 'count' | 'consistency' }[] = [
    // ── Count 검증 (C1~C5) ──
    {
      item: 'FM_COUNT',
      formula: `=COUNTA('L2-5(A5) 고장형태'!B:B)-1`,
      desc: 'A5 고장형태 건수 (헤더 제외)',
      type: 'count',
    },
    {
      item: 'FC_COUNT',
      formula: `=COUNTA('L3-4(B4) 고장원인'!C:C)-1`,
      desc: 'B4 고장원인 건수 (헤더 제외)',
      type: 'count',
    },
    {
      item: 'FE_COUNT',
      formula: `=COUNTA('L1-4(C4) 고장영향'!B:B)-1`,
      desc: 'C4 고장영향 건수 (헤더 제외)',
      type: 'count',
    },
    {
      item: 'CHAIN_COUNT',
      formula: `=COUNTA('FC 고장사슬'!H:H)-1`,
      desc: 'FC 고장사슬 행수 — 고장원인(FC/H열) 기준 (헤더 제외)',
      type: 'count',
    },
    {
      item: 'PROCESS_COUNT',
      formula: `=COUNTA('L2-1(A1) 초점요소번호'!A:A)-1`,
      desc: 'A1 초점요소 건수 (헤더 제외)',
      type: 'count',
    },
    // ── Consistency 검증 (S3, S4, S5) ── 0이면 OK, >0이면 누락 있음
    {
      item: 'S3_MISS',
      formula: `=SUMPRODUCT(('FC 고장사슬'!D2:D5000<>"")*1*(COUNTIF('L2-1(A1) 초점요소번호'!A:A,'FC 고장사슬'!D2:D5000)=0))`,
      desc: '초점요소번호 누락 (FC D열→A1, 0=OK)',
      type: 'consistency',
    },
    {
      item: 'S4_MISS',
      formula: `=SUMPRODUCT(('FC 고장사슬'!E2:E5000<>"")*1*(COUNTIF('L2-5(A5) 고장형태'!B:B,'FC 고장사슬'!E2:E5000)=0))`,
      desc: 'FM 누락 (FC E열→A5, 0=OK)',
      type: 'consistency',
    },
    {
      item: 'S5_MISS',
      formula: `=SUMPRODUCT(('FC 고장사슬'!H2:H5000<>"")*1*(COUNTIF('L3-4(B4) 고장원인'!C:C,'FC 고장사슬'!H2:H5000)=0))`,
      desc: 'FC 누락 (FC H열→B4, 0=OK)',
      type: 'consistency',
    },
    // ── 추가 진단 수식 (v4.0 N:1:N 컬럼 위치) ──
    {
      item: 'FC_D_COL',
      formula: `=COUNTA('FC 고장사슬'!D:D)-1`,
      desc: 'FC시트 D열(초점요소번호) 카운트 — 병합셀 주의',
      type: 'consistency',
    },
    {
      item: 'FC_B_COL',
      formula: `=COUNTA('FC 고장사슬'!B:B)-1`,
      desc: 'FC시트 B열(FE/고장영향) 카운트',
      type: 'consistency',
    },
    {
      item: 'FC_E_COL',
      formula: `=COUNTA('FC 고장사슬'!E:E)-1`,
      desc: 'FC시트 E열(FM/고장형태) 카운트',
      type: 'consistency',
    },
    {
      item: 'FC_H_COL',
      formula: `=COUNTA('FC 고장사슬'!H:H)-1`,
      desc: 'FC시트 H열(FC/고장원인) 카운트',
      type: 'consistency',
    },
  ];

  // 각 항목 추가
  verifyItems.forEach((v, idx) => {
    const row = verifySheet.addRow([v.item, '', v.desc]);
    
    // 수식 셀에 실제 수식 적용
    const formulaCell = row.getCell(2);
    formulaCell.value = { formula: v.formula.substring(1) }; // '=' 제거
    
    // 스타일 적용 (Count=초록, Consistency=파랑)
    const isConsistency = v.type === 'consistency';
    row.eachCell((cell, colNumber) => {
      cell.border = CELL_BORDERS;
      cell.font = { name: '맑은 고딕', size: 10 };
      if (colNumber === 1) {
        cell.font = { bold: true, name: '맑은 고딕', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isConsistency ? 'EFF6FF' : 'F0FDF4' } };
      } else if (colNumber === 2) {
        cell.alignment = { horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isConsistency ? 'DBEAFE' : 'ECFDF5' } };
        cell.font = { bold: true, color: { argb: isConsistency ? '1D4ED8' : '059669' }, name: '맑은 고딕', size: 11 };
      }
    });
  });

  // 안내 메시지 추가
  const infoRow = verifySheet.addRow(['']);
  const infoRow2 = verifySheet.addRow(['※ 이 시트의 값은 엑셀 수식으로 자동 계산됩니다.', '', '']);
  const infoRow3 = verifySheet.addRow(['※ Import 시 이 값과 파서 결과를 비교하여 파싱 오류를 검출합니다.', '', '']);
  
  [infoRow2, infoRow3].forEach(r => {
    r.getCell(1).font = { italic: true, color: { argb: '6B7280' }, size: 9, name: '맑은 고딕' };
  });
}

/** 샘플 데이터 (다중 시트용) - 타이어 설계 기반 */
const SAMPLE_DATA: Record<string, string[][]> = {
  'L2-1(A1) 초점요소번호': [
    ['10', '자재입고', 'RCV'],
    ['20', '수입검사', 'INS'],
    ['30', 'MB Mixing', 'MIX'],
    ['40', 'FM Mixing', 'MIX'],
    ['50', '압출', 'EXT'],
    ['60', '압연', 'CAL'],
    ['70', '비드성형', 'FRM'],
    ['80', '성형', 'FRM'],
    ['90', '가류', 'CUR'],
    ['100', '완성검사', 'INS'],
    ['110', '포장', 'PKG'],
    ['120', '출하', 'SHP'],
  ],
  'L2-2(A2) 초점요소명': [
    ['10', '자재입고'],
    ['20', '수입검사'],
    ['30', 'MB Mixing'],
    ['40', 'FM Mixing'],
    ['50', '압출'],
    ['60', '압연'],
    ['70', '비드성형'],
    ['80', '성형'],
    ['90', '가류'],
    ['100', '완성검사'],
    ['110', '포장'],
    ['120', '출하'],
  ],
  'L2-3(A3) 초점기능': [
    ['10', '입고된 원자재를 검수하여 지정된 창고로 입고'],
    ['20', '원부자재 샘플링 수입검사'],
    ['30', '컴파운드 종류에 맞는 마스터배치 조건에 따라 혼련'],
    ['40', '파이널믹싱 조건에 따라 혼련하여 고무시트 생산'],
    ['50', '고무 압출하여 TREAD, SIDE 등 반제품 생산'],
    ['60', '스틸코드, 패브릭코드에 고무를 코팅하여 반제품 생산'],
    ['70', '비드와이어에 고무를 코팅하여 비드 생산'],
    ['80', '그린타이어 부재료 반제품을 접착하여 그린타이어 생산'],
    ['90', '가류기에서 그린타이어를 가열/가압하여 완제품 생산'],
    ['100', '완성품의 외관, 균형, X-ray 검사'],
    ['110', '완성품 포장'],
    ['120', '완성품 출하'],
  ],
  'L2-4(A4) 초점요소 요구사항': [
    ['10', '이물질', ''],
    ['10', '보관상태', ''],
    ['20', 'Mooney Viscosity', '◇'],
    ['20', '인장강도', '◇'],
    ['30', 'Mooney Viscosity', ''],
    ['30', 'Scorch Time', ''],
    ['40', 'Rheometer', ''],
    ['50', 'Tread 폭', '◇'],
    ['50', 'Side Wall 두께', '◇'],
    ['60', 'Steel Cord 폭', ''],
    ['80', 'Bead To Bead 폭', '◇'],
    ['80', 'G/T 중량', ''],
    ['90', '가류도', '◇'],
    ['100', '외관', ''],
  ],
  'L2-5(A5) 고장형태': [
    ['10', '이물입 오염'],
    ['10', '포장,제품 손상'],
    ['20', 'Mooney 불만족'],
    ['20', '인장강도 불만족'],
    ['30', 'Mooney 불만족'],
    ['40', 'Rheometer 불만족'],
    ['50', 'Tread 폭 불량'],
    ['60', 'Steel Cord 폭 불량'],
    ['80', 'Bead To Bead 폭 불만족'],
    ['80', 'G/T 중량 불만족'],
    ['90', '가류 불량'],
    ['100', '외관 불량'],
  ],
  // v3.1.1: A6(검출관리) FC 시트 컬럼으로 복원 (별도 시트 샘플은 제거 유지)
  'L3-1(B1) 하위요소': [
    ['00', 'MN', '셋업엔지니어'],
    ['00', 'MN', '작업자'],
    ['00', 'MN', '운반원'],
    ['00', 'MN', '보전원'],
    ['00', 'MN', '검사원'],
    ['10', 'MC', '지게차'],
    ['10', 'MC', '자동창고'],
    ['20', 'MC', 'MOONEY VISCOMETER'],
    ['20', 'MC', 'DBP ABSORPMETER'],
    ['30', 'MC', 'MB 믹서'],
    ['40', 'MC', 'FB 믹서'],
    ['50', 'MC', '압출기'],
    ['60', 'MC', '카렌다'],
    ['80', 'MC', '카카스 드럼'],
    ['80', 'MC', '비드 드럼'],
    ['90', 'MC', '가류기'],
  ],
  'L3-2(B2) 하위기능': [
    ['00', 'MN', '설비 조건을 셋업하고 공정 파라미터를 설정하며 초기품을 승인한다'],
    ['00', 'MN', '작업을 수행하고 기준서를 준수하며 생산품을 이송한다'],
    ['00', 'MN', '자재 및 제품을 운반한다'],
    ['00', 'MN', '설비를 유지보수한다'],
    ['00', 'MN', '품질 검사를 수행한다'],
    ['10', 'MC', '자재 운반 및 입고'],
    ['20', 'MC', '점도 측정'],
    ['30', 'MC', '고무 혼련 및 배합'],
    ['50', 'MC', '고무 압출'],
    ['60', 'MC', '고무 코팅'],
    ['80', 'MC', '카카스 드럼 회전 및 반제품 부착'],
    ['90', 'MC', '가열 가압'],
  ],
  'L3-3(B3) 하위기능 요구사항': [
    ['00', 'MN', '설비 초기 조건 설정 정확도', ''],
    ['00', 'MN', '표준작업방법 준수도', ''],
    ['30', 'MC', '혼련 온도', ''],
    ['30', 'MC', 'Drop Temp', ''],
    ['40', 'MC', 'RPM', ''],
    ['50', 'MC', '압출 온도', '◆'],
    ['50', 'MC', '압출 속도', '◆'],
    ['60', 'MC', 'EPI', ''],
    ['80', 'MC', 'Center Deck 센터링', ''],
    ['80', 'MC', '비드 압력', ''],
    ['90', 'MC', '가류 온도', '◆'],
    ['90', 'MC', '가류 시간', ''],
  ],
  'L3-4(B4) 고장원인': [
    ['00', 'MN', '작업 표준서 미숙지로 인한 절차 누락'],
    ['00', 'MN', '과도한 작업속도로 인한 조립 불량'],
    ['00', 'MN', '교육훈련 부족으로 인한 품질 이상'],
    ['30', 'MC', '계량기 오류'],
    ['30', 'MC', '온도 센서 오류'],
    ['50', 'MC', '온도 설정 오류'],
    ['50', 'MC', '속도 변동'],
    ['80', 'MC', '장착Tool 규격 상이'],
    ['80', 'MN', '작업지침서 미준수'],
    ['90', 'MC', '온도 이탈'],
  ],
  // v3.1.1: B5(예방관리) FC 시트 컬럼으로 복원 (별도 시트 샘플은 제거 유지)
  'L1-1(C1) 구분': [
    ['법규'],
    ['기본'],
    ['보조'],
    ['관능'],
  ],
  'L1-2(C2) 상위기능': [
    ['법규', '법규 및 규제 요구사항을 충족하는 설계 기능을 제공한다'],
    ['기본', '제품의 기본 성능 및 내구성을 확보하는 기능을 제공한다'],
    ['보조', '사용자 안전성과 편의성을 확보한다'],
    ['관능', '제품의 외관 및 감성 품질을 확보한다'],
  ],
  'L1-3(C3) 상위요구사항': [
    ['법규', '안전규격, 환경규제 준수'],
    ['기본', '내구성능, 구조강도 규격'],
    ['보조', '안전 기준, 사용 편의성'],
    ['관능', '외관 품질, NVH 기준'],
  ],
  'L1-4(C4) 고장영향': [
    ['법규', '규제 미준수, 리콜 위험'],
    ['기본', '성능 저하, 내구 수명 단축'],
    ['보조', '안전 사고 위험, 사용 불편'],
    ['관능', '외관 불량, 소음/진동 발생'],
  ],
  // ★ FC 고장사슬 (v4.0 N:1:N): FE구분, FE, S, 초점요소번호, FM, 타입, WE, FC, PC, DC, O, D, AP
  // ★ FM이 중심축: 같은 FM에 N개 FE + N개 FC 연결 (병합셀로 그룹 표현)
  'FC 고장사슬': [
    // ── 공정 00 — 공통(사람) ──────────────────────────────────────────
    ['법규', '규제 미준수, 리콜 위험', '9', '00', '이물입 오염', 'MN', '작업자', '작업 표준서 미숙지로 인한 절차 누락', '', '', '5', '5', 'M'],
    ['기본', '성능 저하, 내구 수명 단축', '7', '00', '이물입 오염', 'MN', '작업자', '과도한 작업속도로 인한 조립 불량', '', '', '4', '4', 'L'],
    ['관능', '외관 불량, 소음/진동 발생', '5', '00', '외관 불량', 'MN', '검사원', '교육훈련 부족으로 인한 품질 이상', '', '', '3', '4', 'M'],
    // ── 공정 30 — MB Mixing (★ 1:1:2 — FE 1개 : FM 1개 : FC 2개) ──
    ['법규', '규제 미준수, 리콜 위험', '7', '30', 'Mooney 불만족', 'MC', 'MB 믹서', '계량기 오류', '온도 모니터링', 'Rheometer', '4', '3', 'M'],
    ['법규', '규제 미준수, 리콜 위험', '7', '30', 'Mooney 불만족', 'MC', 'MB 믹서', '온도 센서 오류', '온도 모니터링', 'Rheometer', '3', '4', 'M'],
    // ── 공정 50 — 압출 ──────────────────────────────────────────────
    ['기본', '성능 저하, 내구 수명 단축', '8', '50', 'Tread 폭 불량', 'MC', '압출기', '온도 설정 오류', '속도 모니터링', '두께 측정', '4', '3', 'M'],
    ['기본', '성능 저하, 내구 수명 단축', '8', '50', 'Tread 폭 불량', 'MC', '압출기', '속도 변동', '속도 모니터링', '두께 측정', '5', '3', 'H'],
    // ── 공정 80 — 성형 (★ 2:1:2 — FE 2개 : FM 1개 : FC 2개) ────
    ['기본', '성능 저하, 내구 수명 단축', '9', '80', 'Bead To Bead 폭 불만족', 'MC', '카카스 드럼', '장착Tool 규격 상이', '바코드 스캔', '육안검사', '3', '4', 'M'],
    ['보조', '안전 사고 위험, 사용 불편', '6', '80', 'G/T 중량 불만족', 'MN', '작업자', '작업지침서 미준수', 'PDA 확인', '자동중량', '4', '3', 'L'],
    // ── 공정 90 — 가류 ──────────────────────────────────────────────
    ['기본', '성능 저하, 내구 수명 단축', '9', '90', '가류 불량', 'MC', '가류기', '온도 이탈', '온도 기록계', '가류도 측정', '4', '3', 'M'],
  ],
  // ★ FA 통합분석 (ALL): v2.7.3: 28열 — ..., DC추천1, DC추천2, PC추천1, PC추천2, O추천, D추천
  'FA 통합분석': [
    ['법규', '재료 투입과 배합 일관성 확보', '이종고무 투입', '30', 'MB Mixing', 'MB조건에 따라 혼련', 'Mooney Viscosity', '', 'MC', 'MB 믹서', '고무 혼련 및 배합', '혼련 온도', '', '물성 불균일, 접착 불량으로 일부 폐기', 'Mooney 불만족', '계량기 오류', '온도 모니터링', 'Rheometer', '7', '4', '3', 'M', 'Rheometer', '육안검사', '온도 프로파일 확인', '센서 교정', '5', '6'],
    ['법규', '재료 투입과 배합 일관성 확보', '이종고무 투입', '30', 'MB Mixing', 'MB조건에 따라 혼련', 'Scorch Time', '', 'MC', 'MB 믹서', '고무 혼련 및 배합', 'Drop Temp', '', '물성 불균일, 접착 불량으로 일부 폐기', 'Mooney 불만족', '온도 센서 오류', '온도 모니터링', 'Rheometer', '7', '3', '4', 'M', 'Rheometer', '온도 기록계', '온도센서 교정', '온도 모니터링', '4', '6'],
    ['기본', '완제품 품질 및 성능 확보', '완제품 규격', '50', '압출', '고무 압출하여 반제품 생산', 'Tread 폭', '◇', 'MC', '압출기', '고무 압출', '압출 온도', '◆', '완제품 성능 불량, 반품', 'Tread 폭 불량', '온도 설정 오류', '속도 모니터링', '두께 측정', '8', '4', '3', 'M', '두께 측정', '치수측정기', '속도 모니터링', '파라미터 관리', '5', '5'],
    ['기본', '완제품 품질 및 성능 확보', '완제품 규격', '50', '압출', '고무 압출하여 반제품 생산', 'Side Wall 두께', '◇', 'MC', '압출기', '고무 압출', '압출 속도', '◆', '완제품 성능 불량, 반품', 'Tread 폭 불량', '속도 변동', '속도 모니터링', '두께 측정', '8', '5', '3', 'H', '두께 측정', '속도 모니터링', '속도 모니터링', '파라미터 관리', '5', '5'],
    ['기본', '완제품 품질 및 성능 확보', '완제품 규격', '80', '성형', '그린타이어 생산', 'Bead To Bead 폭', '◇', 'MC', '카카스 드럼', '드럼 회전 및 반제품 부착', '센터링', '', '완제품 성능 불량, 반품', 'Bead To Bead 폭 불만족', '장착Tool 규격 상이', '바코드 스캔', '육안검사', '9', '3', '4', 'M', '치수측정기', '육안검사', '지그 정기점검', '바코드 스캔', '3', '7'],
    ['법규', '설비 조건 및 작업 수행 정확도 유지', '설비/작업자 실수', '80', '성형', '그린타이어 생산', 'G/T 중량', '', 'MN', '작업자', '작업 수행 및 기준서 준수', '작업 준수도', '', '공정 조건 이탈, 품질 불균일로 일부 재작업', 'G/T 중량 불만족', '작업지침서 미준수', 'PDA 확인', '자동중량', '6', '4', '3', 'L', '자동중량', 'PDA 확인', '작업표준서 교육', '작업자 숙련도 평가', '8', '5'],
    ['기본', '완제품 품질 및 성능 확보', '완제품 규격', '90', '가류', '가열/가압하여 완제품 생산', '가류도', '', 'MC', '가류기', '가열 가압', '가류 온도', '', '완제품 성능 불량, 반품', '가류 불량', '온도 이탈', '온도 기록계', '가류도 측정', '9', '4', '3', 'M', '가류도 측정', '온도 기록계', '온도 프로파일 확인', '온도센서 교정', '4', '5'],
  ],
};

/**
 * ★★★ 2026-03-09: FC 시트 병합셀 적용 (v4.0 — 13열 N:1:N) ★★★
 *
 * FC 고장사슬 시트 — 13컬럼 (FE구분, FE, S, 초점요소번호, FM, 타입, WE, FC, PC, DC, O, D, AP)
 * 병합 규칙:
 *   - FM(col5) 병합 = 같은 FM 연속 행 (N:1:N 그룹의 핵심 축)
 *   - 초점요소번호(col4) 병합 = FM 그룹과 동일 범위
 *   - FE구분(col1) + FE(col2) + S(col3) 병합 = 같은 FE 연속 행 (FM 그룹 내)
 */
function applyFCSheetMergeCells(
  worksheet: ExcelJS.Worksheet,
  rows: string[][],
) {
  if (rows.length < 2) return;

  // FC 시트 병합 대상 컬럼 (1-based Excel col, 0-based array idx)
  // ★ v4.0: 13열 N:1:N (FE구분, FE, S, 초점요소번호, FM, 타입, WE, FC, PC, DC, O, D, AP)
  const mergeCols = [
    { col: 1, idx: 0 },  // A: FE구분
    { col: 2, idx: 1 },  // B: FE(고장영향)
    { col: 3, idx: 2 },  // C: S(심각도)
    { col: 4, idx: 3 },  // D: 초점요소번호
    { col: 5, idx: 4 },  // E: FM(고장형태)
  ];

  for (const { col, idx } of mergeCols) {
    let groupStart = 0; // 0-based data index

    for (let i = 1; i <= rows.length; i++) {
      const isEnd = i === rows.length || (rows[i]?.[idx] || '') !== (rows[groupStart]?.[idx] || '');

      if (isEnd) {
        const count = i - groupStart;
        if (count > 1) {
          const startExcelRow = groupStart + 2;   // header=row1, data starts row2
          const endExcelRow = (i - 1) + 2;
          worksheet.mergeCells(startExcelRow, col, endExcelRow, col);
          // 병합셀 세로 중앙 정렬
          const masterCell = worksheet.getCell(startExcelRow, col);
          masterCell.alignment = {
            ...masterCell.alignment,
            vertical: 'middle',
            horizontal: 'center',
          };
        }
        groupStart = i;
      }
    }
  }
}

/** 샘플 데이터 템플릿 다운로드 (다중 시트) */
export async function downloadSampleTemplate(customFileName?: string) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = `FMEA Smart System ${TEMPLATE_VERSION}`;
  workbook.created = new Date();

  // 각 시트 생성
  SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    const sampleRows = SAMPLE_DATA[def.name] || [];
    const minWidths = def.headers.map((h, i) => {
      if (h === '타입') return 8;
      if (i === 0) return 12;
      return 12;
    });
    const colWidths = sampleRows.length > 0
      ? calcAutoWidths(def.headers, sampleRows, minWidths)
      : def.headers.map((_, i) => minWidths[i] ?? (i === 0 ? 12 : 25));

    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: colWidths[i],
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    sampleRows.forEach((data, idx) => {
      const row = worksheet.addRow(data);
      const bg = idx % 2 === 0 ? 'FFFFFF' : 'F0F7FB';
      row.eachCell((cell, colNumber) => {
        applyDataCellStyle(cell, colWidths[colNumber - 1] ?? 20, bg);
      });
    });

    // ★★★ 2026-02-28: FC 시트 병합셀 적용 (v2.8.0) ★★★
    if (def.name === 'FC 고장사슬' && sampleRows.length > 1) {
      applyFCSheetMergeCells(worksheet, sampleRows);
    }

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  });

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = customFileName || `DFMEA_기초정보_샘플_${TEMPLATE_VERSION}`;
  await downloadExcelBuffer(buffer, fileName);
}

/** 공통 다운로드 헬퍼 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  await downloadExcelBuffer(buffer, fileName);
}

