// CODEFREEZE L4 — v5.1.0 (2026-03-09) FC 12열 N:1:N 구조 (S 삭제, Process-first)
/**
 * @file excel-template.ts
 * @description PFMEA 기초정보 Excel 템플릿 생성 유틸리티 (다중 시트 방식)
 * @author AI Assistant
 * @created 2025-12-26
 * @updated 2025-12-26 - 다중 시트 방식으로 변경
 * 
 * 시트 구조 (v5.1: FC 12열 N:1:N — S 삭제, Process-first 계층적 병합):
 * A1: 공정번호 + 공정명
 * A3-A5: 공정번호 + 해당 항목
 * B1-B4: 공정번호 + 해당 항목
 * C1-C4: 구분(YOUR PLANT/SHIP TO PLANT/USER) + 해당 항목
 * FC 고장사슬: FE구분, FE, 공정번호, FM, 4M, WE, FC, PC, DC, O, D, AP (12열)
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v4.0.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: FC 12열 N:1:N 구조 (S삭제, Process-first) (2026-03-09) ██
 * ██  검증: tsc 에러 0개                                       ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


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

// 수동모드에서 제외할 시트 (수동=구조+기능까지, FC/고장분석은 자동/기존에서만)
const MANUAL_MODE_EXCLUDE = new Set([
  'L2-4(A4) 제품특성',
  'L2-5(A5) 고장형태',
  'L3-3(B3) 공정특성',
  'L3-4(B4) 고장원인',
  'FC 고장사슬',
  'FA 통합분석',
]);

/** 시트 정의 - 헤더 색상은 디자인 표준에 따라 네이비 (#00587A) 통일 */
const HEADER_COLOR = '00587A';  // 디자인 표준 네이비 색상

// ★ v6.0: 통합시트 우선 — 개별 14시트는 하위호환용(legacy=true), 다운로드 시 제외
const SHEET_DEFINITIONS = [
  // ★★★ 통합시트 (메인) ★★★
  { name: 'L1 통합(C1-C4)', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)'], color: HEADER_COLOR, required: [true, false, false, false], legacyName: 'L1_UNIFIED', guide: '구분: YP/SP/USER | 제품기능·요구사항·고장영향을 한 행에 기입 | 1:N 관계는 상위값을 중복 기입 (Ctrl+D)', legacy: false },
  { name: 'L2 통합(A1-A6)', headers: ['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리'], color: HEADER_COLOR, required: [true, true, false, false, false, false, false], legacyName: 'L2_UNIFIED', guide: '공정번호+공정명 필수 | 제품특성·고장형태가 여러 건이면 공정번호·공정명 중복 기입 (Ctrl+D)', legacy: false },
  { name: 'L3 통합(B1-B5)', headers: ['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)'], color: HEADER_COLOR, required: [true, true, false, false, false, false, false, false], legacyName: 'L3_UNIFIED', guide: '4M: MC/MN/IM/EN | 작업요소별 기능·공정특성·고장원인·예방관리를 한 행에 기입 | 1:N은 상위값 중복 기입', legacy: false },
  // ★★★ FC 고장사슬 + FA 통합분석 ★★★
  { name: 'FC 고장사슬', headers: ['FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)', '4M', '작업요소(WE)', 'FC(고장원인)', 'B5.예방관리(발생 전 방지)', 'A6.검출관리(발생 후 검출)', 'O', 'D', 'AP'], color: 'B91C1C', required: [false, false, true, true, false, false, false, false, false, false, false, false], legacyName: 'FC', guide: 'B5=원인 발생 전 방지 장치·시스템·절차 | A6=발생 후 출하 전 검출 장비+방법+빈도', legacy: false },
  { name: 'FA 통합분석', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '공정No(A1)', '공정명(A2)', '공정기능(A3)', '제품특성(A4)', '특별특성(A4)', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성(B3)', '고장영향(C4)', '고장형태(A5)', '고장원인(B4)', 'S', 'O', 'D', 'AP', 'DC추천1', 'DC추천2', 'PC추천1', 'PC추천2', 'O추천', 'D추천'], color: '1E40AF', required: [false, false, false, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, false, false, false, false, false, false, false], legacyName: 'FA', guide: '', legacy: false },
  // ★★★ 개별시트 (하위호환 — Import 파서에서 참조, 다운로드 시 제외) ★★★
  { name: 'L2-1(A1) 공정번호', headers: ['L2-1.공정번호', 'L2-2.공정명', '공정유형코드(선택)'], color: HEADER_COLOR, required: [true, true, false], legacyName: 'A1', guide: '', legacy: true },
  { name: 'L2-2(A2) 공정명', headers: ['L2-1.공정번호', 'L2-2.공정명'], color: HEADER_COLOR, required: [true, true], legacyName: 'A2', guide: '', legacy: true },
  { name: 'L2-3(A3) 공정기능', headers: ['L2-1.공정번호', 'L2-3.공정기능(설명)'], color: HEADER_COLOR, required: [true, false], legacyName: 'A3', guide: '', legacy: true },
  { name: 'L2-4(A4) 제품특성', headers: ['L2-1.공정번호', 'L2-4.제품특성(Wafer 결과값 명사)', '특별특성'], color: HEADER_COLOR, required: [true, false, false], legacyName: 'A4', guide: '', legacy: true },
  { name: 'L2-5(A5) 고장형태', headers: ['L2-1.공정번호', 'L2-5.고장형태(A4이탈 현상)'], color: HEADER_COLOR, required: [true, false], legacyName: 'A5', guide: '', legacy: true },
  { name: 'L2-6(A6) 검출관리', headers: ['L2-1.공정번호', 'L2-6.검출관리(발생 후 검출 방법)'], color: HEADER_COLOR, required: [true, false], legacyName: 'A6', guide: '', legacy: true },
  { name: 'L3-1(B1) 작업요소', headers: ['L2-1.공정번호', '4M', 'L3-1.작업요소(설비·재료·인원 고유명)'], color: HEADER_COLOR, required: [true, true, false], legacyName: 'B1', guide: '', legacy: true },
  { name: 'L3-2(B2) 요소기능', headers: ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-2.요소기능'], color: HEADER_COLOR, required: [true, true, false, false], legacyName: 'B2', guide: '', legacy: true },
  { name: 'L3-3(B3) 공정특성', headers: ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-3.공정특성(설비·약품 파라미터)', '특별특성'], color: HEADER_COLOR, required: [true, true, false, false, false], legacyName: 'B3', guide: '', legacy: true },
  { name: 'L3-4(B4) 고장원인', headers: ['L2-1.공정번호', '4M', 'L3-4.고장원인(B3이탈 원인)'], color: HEADER_COLOR, required: [true, true, false], legacyName: 'B4', guide: '', legacy: true },
  { name: 'L3-5(B5) 예방관리', headers: ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-5.예방관리(발생 전 방지)'], color: HEADER_COLOR, required: [true, false, false, false], legacyName: 'B5', guide: '', legacy: true },
  { name: 'L1-1(C1) 구분', headers: ['L1-1.구분'], color: HEADER_COLOR, required: [true], legacyName: 'C1', guide: '', legacy: true },
  { name: 'L1-2(C2) 제품기능', headers: ['L1-1.구분', 'L1-2.제품(반)기능'], color: HEADER_COLOR, required: [true, false], legacyName: 'C2', guide: '', legacy: true },
  { name: 'L1-3(C3) 요구사항', headers: ['L1-1.구분', 'L1-3.제품(반)요구사항'], color: HEADER_COLOR, required: [true, false], legacyName: 'C3', guide: '', legacy: true },
  { name: 'L1-4(C4) 고장영향', headers: ['L1-1.구분', 'L1-4.고장영향'], color: HEADER_COLOR, required: [true, false], legacyName: 'C4', guide: '', legacy: true },
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

  // ★ v6.0: 통합시트만 생성 (legacy 개별시트 제외)
  SHEET_DEFINITIONS.filter(def => !(def as any).legacy).forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    const emptyWidths: Record<string, number> = {
      'L2-1.공정번호': 14, 'L2-2.공정명': 20, '공정유형코드(선택)': 16,
      'A1.공정번호': 14, 'A2.공정명': 20, 'A3.공정기능': 40, 'A4.제품특성': 22,
      '특별특성': 10, 'A5.고장형태': 25, 'A6.검출관리': 40,
      '구분(C1)': 14, '제품기능(C2)': 40, '요구사항(C3)': 25, '고장영향(C4)': 30,
      '작업요소(B1)': 28, '요소기능(B2)': 35, '공정특성(B3)': 22, '고장원인(B4)': 30,
      '예방관리(B5)': 40, '4M': 8,
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

    // ★ v2.0: 작성 가이드 행 (2행, 연한 노란색 배경)
    if ((def as typeof def & { guide?: string }).guide) {
      const guideText = (def as typeof def & { guide?: string }).guide!;
      const guideRow = worksheet.addRow(def.headers.map((_, i) => i === 0 ? guideText : ''));
      worksheet.mergeCells(2, 1, 2, def.headers.length);
      const guideCell = guideRow.getCell(1);
      guideCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9E6' } };
      guideCell.font = { name: '맑은 고딕', size: 9, italic: true, color: { argb: '8B6914' } };
      guideCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      guideCell.border = CELL_BORDERS;
      guideRow.height = 20;
    }

    for (let i = 0; i < 10; i++) {
      const row = worksheet.addRow(def.headers.map(() => ''));
      row.eachCell((cell) => applyDataStyle(cell));
    }

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  });

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = customFileName || `PFMEA_Master_Template_${TEMPLATE_VERSION}`;
  await downloadExcelBuffer(buffer, fileName);
}

// =====================================================
// ★★★ 실제 데이터 기반 템플릿 다운로드 ★★★
// =====================================================

/** itemCode → 시트명 매핑 */
const ITEM_TO_SHEET: Record<string, string> = {
  A1: 'L2-1(A1) 공정번호', A2: 'L2-2(A2) 공정명', A3: 'L2-3(A3) 공정기능', A4: 'L2-4(A4) 제품특성',
  A5: 'L2-5(A5) 고장형태',
  A6: 'L2-6(A6) 검출관리',  // v5.4: 전용 시트 복원
  B1: 'L3-1(B1) 작업요소', B2: 'L3-2(B2) 요소기능', B3: 'L3-3(B3) 공정특성',
  B4: 'L3-4(B4) 고장원인',
  B5: 'L3-5(B5) 예방관리',  // v5.4: 전용 시트 복원
  C1: 'L1-1(C1) 구분', C2: 'L1-2(C2) 제품기능', C3: 'L1-3(C3) 요구사항', C4: 'L1-4(C4) 고장영향',
};

interface FlatDataItem {
  processNo: string;
  itemCode: string;
  value: string;
  m4?: string;
  specialChar?: string;  // ★ v2.4.0: A4/B3 특별특성 기호
  belongsTo?: string;    // ★ v3.1.2: B2/B3 소속 작업요소명 (★작업요소(B1) 컬럼)
}

/** FC 고장사슬 아이템 (downloadDataTemplate용) — v4.0: N:1:N 구조 */
interface FailureChainItem {
  processNo: string;
  m4?: string;
  fcValue: string;    // B4 고장원인
  fmValue: string;    // A5 고장형태
  feValue: string;    // C4 고장영향
  feScope?: string;   // ★ v4.0: FE 구분 (YP/SP/USER)
  workElement?: string; // ★ v4.0: 작업요소 (WE)
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
  const b1NameByPNoM4: Record<string, string> = {};  // "processNo|m4" → B1 작업요소명
  flatData.filter(d => d.itemCode === 'B1').forEach(d => {
    if (!b1ByPNo[d.processNo]) b1ByPNo[d.processNo] = [];
    b1ByPNo[d.processNo].push(d.m4 || '');
    // ★ B1 작업요소명을 processNo+m4 키로 저장 (B2/B3에서 참조)
    const nameKey = `${d.processNo}|${d.m4 || ''}`;
    if (!b1NameByPNoM4[nameKey]) b1NameByPNoM4[nameKey] = d.value || '';
  });
  const bIdxMap = new Map<string, number>();  // "processNo|itemCode" → 인덱스

  // flatData를 시트별로 그룹핑
  const sheetData: Record<string, string[][]> = {};
  SHEET_DEFINITIONS.forEach(def => { sheetData[def.name] = []; });

  flatData.forEach(d => {
    const sheetName = ITEM_TO_SHEET[d.itemCode];
    if (!sheetName || !sheetData[sheetName]) return;

    if (d.itemCode === 'A1') {
      // A1: 공정번호 시트 → 공정번호 + 공정명(A2) + 공정유형코드(A0, 선택)
      const a2 = flatData.find(x => x.itemCode === 'A2' && x.processNo === d.processNo);
      const a0 = flatData.find(x => x.itemCode === 'A0' && x.processNo === d.processNo);
      sheetData[sheetName].push([d.value, a2?.value || '', a0?.value || '']);
    } else if (d.itemCode === 'A2') {
      // A2: L2-2 공정명 시트에 별도 저장
      if (sheetName && sheetData[sheetName]) {
        sheetData[sheetName].push([d.processNo, d.value]);
      }
      return; // A1 시트에도 포함됨 (위에서 처리)
    } else if (d.itemCode === 'A4') {
      // ★ v2.4.0: A4 제품특성 — 공정번호 + 값 + 특별특성 (3컬럼)
      sheetData[sheetName].push([d.processNo, d.value, d.specialChar || '']);
    } else if (d.itemCode === 'B5') {
      // ★ v5.4: B5 예방관리 전용 시트 — 공정번호 + 4M + ★작업요소(B1) + 예방관리 (4컬럼)
      let m4 = d.m4 || '';
      if (!m4) {
        const key = `${d.processNo}|B5`;
        const idx = bIdxMap.get(key) || 0;
        bIdxMap.set(key, idx + 1);
        m4 = b1ByPNo[d.processNo]?.[idx] || '';
      }
      const b1Name = d.belongsTo || b1NameByPNoM4[`${d.processNo}|${m4}`] || '';
      sheetData[sheetName].push([d.processNo, m4, b1Name, d.value]);
    } else if (d.itemCode === 'B1' || d.itemCode === 'B2' || d.itemCode === 'B3' || d.itemCode === 'B4') {
      // B1/B4: 공정번호 + 4M + 값 (3컬럼)
      // B2:    공정번호 + 4M + ★작업요소(B1) + 요소기능 (4컬럼)
      // B3:    공정번호 + 4M + ★작업요소(B1) + 공정특성 + 특별특성 (5컬럼)
      let m4 = d.m4 || '';
      // m4 누락 시 B1에서 추론 (같은 processNo의 동일 인덱스)
      if (!m4 && d.itemCode !== 'B1') {
        const key = `${d.processNo}|${d.itemCode}`;
        const idx = bIdxMap.get(key) || 0;
        bIdxMap.set(key, idx + 1);
        m4 = b1ByPNo[d.processNo]?.[idx] || '';
      }
      if (d.itemCode === 'B2') {
        // ★ FIX: B1 작업요소명을 processNo+m4 키로 조회
        const b1Name = d.belongsTo || b1NameByPNoM4[`${d.processNo}|${m4}`] || '';
        sheetData[sheetName].push([d.processNo, m4, b1Name, d.value]);
      } else if (d.itemCode === 'B3') {
        // ★ FIX: B3도 동일하게 B1 작업요소명 조회
        const b1Name = d.belongsTo || b1NameByPNoM4[`${d.processNo}|${m4}`] || '';
        sheetData[sheetName].push([d.processNo, m4, b1Name, d.value, d.specialChar || '']);
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
      // A3~A5: 공정번호 + 값
      sheetData[sheetName].push([d.processNo, d.value]);
    }
  });

  // ★★★ v5.5: 통합시트 (L1/L2/L3) 데이터 집계 — 개별시트 데이터를 합산 ★★★
  {
    // --- L2 통합(A1-A6): 공정번호 | 공정명 | 공정기능 | 제품특성 | 특별특성 | 고장형태 | 검출관리 ---
    // ★ v6.3 옵션3: 모든 컬럼 carry-forward — 빈행 0건 보장
    const l2SheetName = 'L2 통합(A1-A6)';
    const procNos = [...new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo))];
    const l2Rows: string[][] = [];
    for (const pNo of procNos) {
      const a2Val = flatData.find(d => d.itemCode === 'A2' && d.processNo === pNo)?.value || '';
      const a3Items = flatData.filter(d => d.itemCode === 'A3' && d.processNo === pNo);
      const a4Items = flatData.filter(d => d.itemCode === 'A4' && d.processNo === pNo);
      const a5Items = flatData.filter(d => d.itemCode === 'A5' && d.processNo === pNo);
      const a6Items = flatData.filter(d => d.itemCode === 'A6' && d.processNo === pNo);
      const maxLen = Math.max(1, a3Items.length, a4Items.length, a5Items.length, a6Items.length);
      let lastA3 = '', lastA4 = '', lastA4Sp = '', lastA5 = '', lastA6 = '';
      for (let i = 0; i < maxLen; i++) {
        if (a3Items[i]?.value) lastA3 = a3Items[i].value;
        if (a4Items[i]?.value) { lastA4 = a4Items[i].value; lastA4Sp = a4Items[i].specialChar || ''; }
        if (a5Items[i]?.value) lastA5 = a5Items[i].value;
        if (a6Items[i]?.value) lastA6 = a6Items[i].value;
        l2Rows.push([
          pNo,
          a2Val,
          a3Items[i]?.value || lastA3,
          a4Items[i]?.value || lastA4,
          a4Items[i]?.specialChar ?? lastA4Sp,
          a5Items[i]?.value || lastA5,
          a6Items[i]?.value || lastA6,
        ]);
      }
    }
    if (l2Rows.length > 0) sheetData[l2SheetName] = l2Rows;

    // --- L3 통합(B1-B5): 공정번호 | 4M | 작업요소 | 요소기능 | 공정특성 | 특별특성 | 고장원인 | 예방관리 ---
    // ★ v6.3 옵션3: 모든 컬럼 carry-forward — 빈행 0건 보장
    const l3SheetName = 'L3 통합(B1-B5)';
    const l3Rows: string[][] = [];
    const b1Items = flatData.filter(d => d.itemCode === 'B1');
    for (const b1 of b1Items) {
      const pNo = b1.processNo;
      const m4 = b1.m4 || '';
      const b2Items = flatData.filter(d => d.itemCode === 'B2' && d.processNo === pNo && (d.m4 || '') === m4);
      const b3Items = flatData.filter(d => d.itemCode === 'B3' && d.processNo === pNo && (d.m4 || '') === m4);
      const b4Items = flatData.filter(d => d.itemCode === 'B4' && d.processNo === pNo && (d.m4 || '') === m4);
      const b5Items = flatData.filter(d => d.itemCode === 'B5' && d.processNo === pNo && (d.m4 || '') === m4);
      const maxLen = Math.max(1, b2Items.length, b3Items.length, b4Items.length, b5Items.length);
      let lastB2 = '', lastB3 = '', lastB3Sp = '', lastB4 = '', lastB5 = '';
      for (let i = 0; i < maxLen; i++) {
        if (b2Items[i]?.value) lastB2 = b2Items[i].value;
        if (b3Items[i]?.value) { lastB3 = b3Items[i].value; lastB3Sp = b3Items[i].specialChar || ''; }
        if (b4Items[i]?.value) lastB4 = b4Items[i].value;
        if (b5Items[i]?.value) lastB5 = b5Items[i].value;
        l3Rows.push([
          pNo,
          m4,
          b1.value || '',
          b2Items[i]?.value || lastB2,
          b3Items[i]?.value || lastB3,
          b3Items[i]?.specialChar ?? lastB3Sp,
          b4Items[i]?.value || lastB4,
          b5Items[i]?.value || lastB5,
        ]);
      }
    }
    if (l3Rows.length > 0) sheetData[l3SheetName] = l3Rows;

    // --- L1 통합(C1-C4): 구분 | 제품기능 | 요구사항 | 고장영향 ---
    // ★ v6.3 옵션3: C1/C2/C3 모든 행에 carry-forward — 빈행 0건 보장
    const l1SheetName = 'L1 통합(C1-C4)';
    const l1Rows: string[][] = [];
    const c1Items = flatData.filter(d => d.itemCode === 'C1');
    for (const c1 of c1Items) {
      const scope = c1.value || '';
      const c2Items = flatData.filter(d => d.itemCode === 'C2' && d.processNo === scope);
      const c3Items = flatData.filter(d => d.itemCode === 'C3' && d.processNo === scope);
      const c4Items = flatData.filter(d => d.itemCode === 'C4' && d.processNo === scope);
      const maxLen = Math.max(1, c2Items.length, c3Items.length, c4Items.length);
      let lastC2 = '', lastC3 = '', lastC4 = '';
      for (let i = 0; i < maxLen; i++) {
        if (c2Items[i]?.value) lastC2 = c2Items[i].value;
        if (c3Items[i]?.value) lastC3 = c3Items[i].value;
        if (c4Items[i]?.value) lastC4 = c4Items[i].value;
        l1Rows.push([
          scope,
          c2Items[i]?.value || lastC2,
          c3Items[i]?.value || lastC3,
          c4Items[i]?.value || lastC4,
        ]);
      }
    }
    if (l1Rows.length > 0) sheetData[l1SheetName] = l1Rows;
  }

  // ★ FC 고장사슬 시트 데이터 (v5.1: 12컬럼 N:1:N — S 삭제, Process-first 정렬)
  if (failureChains && failureChains.length > 0) {
    const sortedChains = [...failureChains].sort((a, b) => {
      const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
      if (pCmp !== 0) return pCmp;
      const fmCmp = (a.fmValue || '').localeCompare(b.fmValue || '');
      if (fmCmp !== 0) return fmCmp;
      const scopeCmp = (a.feScope || '').localeCompare(b.feScope || '');
      if (scopeCmp !== 0) return scopeCmp;
      return (a.feValue || '').localeCompare(b.feValue || '');
    });
    sheetData['FC 고장사슬'] = sortedChains.map(fc => [
      fc.feScope || '',
      fc.feValue || '',
      fc.processNo,
      fc.fmValue,
      fc.m4 || '',
      fc.workElement || '',
      fc.fcValue,
      fc.pcValue || '',
      fc.dcValue || '',
      fc.occurrence ? String(fc.occurrence) : '',
      fc.detection ? String(fc.detection) : '',
      fc.ap || '',
    ]);

    // ★ v6.1: FA 통합분석 시트 동적 생성 — failureChains + flatData 조합
    const a2Map: Record<string, string> = {};
    const a3Map: Record<string, string> = {};
    const a4Map: Record<string, string> = {};
    const a4SpMap: Record<string, string> = {};
    const b2Map: Record<string, string> = {};
    const b3Map: Record<string, string> = {};
    const b3SpMap: Record<string, string> = {};
    const c2Map: Record<string, string> = {};
    const c3Map: Record<string, string> = {};
    flatData.forEach(d => {
      if (d.itemCode === 'A2') a2Map[d.processNo] = d.value || '';
      if (d.itemCode === 'A3' && !a3Map[d.processNo]) a3Map[d.processNo] = d.value || '';
      if (d.itemCode === 'A4' && !a4Map[d.processNo]) { a4Map[d.processNo] = d.value || ''; a4SpMap[d.processNo] = d.specialChar || ''; }
      if (d.itemCode === 'B2') { const k = `${d.processNo}|${d.m4 || ''}`; if (!b2Map[k]) b2Map[k] = d.value || ''; }
      if (d.itemCode === 'B3') { const k = `${d.processNo}|${d.m4 || ''}`; if (!b3Map[k]) { b3Map[k] = d.value || ''; b3SpMap[k] = d.specialChar || ''; } }
      if (d.itemCode === 'C2') { if (!c2Map[d.processNo]) c2Map[d.processNo] = d.value || ''; }
      if (d.itemCode === 'C3') { if (!c3Map[d.processNo]) c3Map[d.processNo] = d.value || ''; }
    });
    sheetData['FA 통합분석'] = sortedChains.map(fc => {
      const pNo = fc.processNo || '';
      const m4k = `${pNo}|${fc.m4 || ''}`;
      const scope = fc.feScope || '';
      return [
        scope,
        c2Map[scope] || '',
        c3Map[scope] || '',
        pNo,
        a2Map[pNo] || '',
        a3Map[pNo] || '',
        a4Map[pNo] || '',
        a4SpMap[pNo] || '',
        fc.m4 || '',
        fc.workElement || '',
        b2Map[m4k] || '',
        b3Map[m4k] || '',
        b3SpMap[m4k] || '',
        fc.feValue || '',
        fc.fmValue || '',
        fc.fcValue || '',
        fc.severity ? String(fc.severity) : '',
        fc.occurrence ? String(fc.occurrence) : '',
        fc.detection ? String(fc.detection) : '',
        fc.ap || '',
        fc.dcValue || '', '', // DC추천1, DC추천2
        fc.pcValue || '', '', // PC추천1, PC추천2
        '', '',               // O추천, D추천
      ];
    });
  }

  // 엑셀 생성
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = `FMEA Smart System ${TEMPLATE_VERSION}`;
  workbook.created = new Date();

  // ★ v6.0: 통합시트만 생성 (legacy 개별시트 제외)
  SHEET_DEFINITIONS.filter(def => !(def as any).legacy).forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    const rows = sheetData[def.name] || [];
    const minWidths = def.headers.map((h, i) => {
      if (h === '4M') return 8;
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

    if (def.name === 'FC 고장사슬' && rows.length > 1) {
      applyFCSheetMergeCells(worksheet, rows);
    }

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  });

  // ★★★ 2026-02-24: VERIFY 시트 추가 — 엑셀 수식 기반 검증용 ★★★
  addVerifySheet(workbook, sheetData);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = customFileName || `PFMEA_Master_${TEMPLATE_VERSION}`;
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
      formula: `=COUNTA('FC 고장사슬'!G:G)-1`,
      desc: 'FC 고장사슬 행수 — 고장원인(FC/G열) 기준 (헤더 제외)',
      type: 'count',
    },
    {
      item: 'PROCESS_COUNT',
      formula: `=COUNTA('L2-1(A1) 공정번호'!A:A)-1`,
      desc: 'A1 공정 건수 (헤더 제외)',
      type: 'count',
    },
    // ── Consistency 검증 (S3, S4, S5) ── 0이면 OK, >0이면 누락 있음
    {
      item: 'S3_MISS',
      formula: `=SUMPRODUCT(('FC 고장사슬'!C2:C5000<>"")*1*(COUNTIF('L2-1(A1) 공정번호'!A:A,'FC 고장사슬'!C2:C5000)=0))`,
      desc: '공정번호 누락 (FC C열→A1, 0=OK)',
      type: 'consistency',
    },
    {
      item: 'S4_MISS',
      formula: `=SUMPRODUCT(('FC 고장사슬'!D2:D5000<>"")*1*(COUNTIF('L2-5(A5) 고장형태'!B:B,'FC 고장사슬'!D2:D5000)=0))`,
      desc: 'FM 누락 (FC D열→A5, 0=OK)',
      type: 'consistency',
    },
    {
      item: 'S5_MISS',
      formula: `=SUMPRODUCT(('FC 고장사슬'!G2:G5000<>"")*1*(COUNTIF('L3-4(B4) 고장원인'!C:C,'FC 고장사슬'!G2:G5000)=0))`,
      desc: 'FC 누락 (FC G열→B4, 0=OK)',
      type: 'consistency',
    },
    // ── 추가 진단 수식 (v5.1 N:1:N 컬럼 위치 — S 삭제 후) ──
    {
      item: 'FC_C_COL',
      formula: `=COUNTA('FC 고장사슬'!C:C)-1`,
      desc: 'FC시트 C열(공정번호) 카운트 — 병합셀 주의',
      type: 'consistency',
    },
    {
      item: 'FC_B_COL',
      formula: `=COUNTA('FC 고장사슬'!B:B)-1`,
      desc: 'FC시트 B열(FE/고장영향) 카운트',
      type: 'consistency',
    },
    {
      item: 'FC_D_COL',
      formula: `=COUNTA('FC 고장사슬'!D:D)-1`,
      desc: 'FC시트 D열(FM/고장형태) 카운트',
      type: 'consistency',
    },
    {
      item: 'FC_G_COL',
      formula: `=COUNTA('FC 고장사슬'!G:G)-1`,
      desc: 'FC시트 G열(FC/고장원인) 카운트',
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

/** 샘플 데이터 — 최종_PFMEA_기초정보_완성_v1.0_2.xlsx 기반 (Import 자료 작성규칙 v4.2.0 준수) */
const SAMPLE_DATA: Record<string, string[][]> = {
  // ═══════════════════════════════════════════════════════════════
  // A계열: L2 공정 레벨 — Au BUMP Wafer 공정 (21공정)
  // ═══════════════════════════════════════════════════════════════
  'L2-1(A1) 공정번호': [
    ['01', '작업환경', ''],
    ['10', 'IQA(수입검사)', ''],
    ['20', 'Sorter', ''],
    ['30', 'Scrubber', ''],
    ['40', 'UBM Sputter', ''],
    ['50', 'Scrubber2', ''],
    ['60', 'PR Coating', ''],
    ['70', 'Exposure', ''],
    ['80', 'Develop', ''],
    ['90', 'Descum', ''],
    ['100', 'Au Plating', ''],
    ['110', 'PR Strip', ''],
    ['120', 'Au Etch', ''],
    ['130', 'TiW Etch', ''],
    ['140', 'Anneal', ''],
    ['150', 'Final Inspection', ''],
    ['160', 'Clean', ''],
    ['170', 'Scrubber3', ''],
    ['180', 'Sorter3', ''],
    ['190', 'AVI', ''],
    ['200', 'OGI/Packing', ''],
  ],
  'L2-2(A2) 공정명': [
    ['01', '작업환경'],
    ['10', 'IQA(수입검사)'],
    ['20', 'Sorter'],
    ['30', 'Scrubber'],
    ['40', 'UBM Sputter'],
    ['50', 'Scrubber2'],
    ['60', 'PR Coating'],
    ['70', 'Exposure'],
    ['80', 'Develop'],
    ['90', 'Descum'],
    ['100', 'Au Plating'],
    ['110', 'PR Strip'],
    ['120', 'Au Etch'],
    ['130', 'TiW Etch'],
    ['140', 'Anneal'],
    ['150', 'Final Inspection'],
    ['160', 'Clean'],
    ['170', 'Scrubber3'],
    ['180', 'Sorter3'],
    ['190', 'AVI'],
    ['200', 'OGI/Packing'],
  ],
  'L2-3(A3) 공정기능': [
    ['01', '클린룸 환경을 유지하여 오염을 방지한다'],
    ['10', '입고 자재의 품질을 확인하여 불량 자재 유입을 방지한다'],
    ['20', 'Wafer를 정렬·분류하여 후속공정 투입 순서를 확보한다'],
    ['30', 'Wafer 표면 이물을 제거하여 청정 표면을 확보한다'],
    ['40', 'Ti/Cu UBM 증착으로 Bump 접합층을 형성한다'],
    ['50', 'Sputter후 표면 이물을 제거하여 도금 품질을 확보한다'],
    ['60', 'PR을 도포하여 도금 패턴 마스크를 형성한다'],
    ['70', 'PR을 노광하여 Bump 패턴을 전사한다'],
    ['80', 'PR을 현상하여 도금 Opening을 확보한다'],
    ['90', 'PR 잔사를 제거하여 도금 접촉면을 확보한다'],
    ['100', 'Au 전해도금으로 접합부 금속층을 형성한다'],
    ['110', 'PR 제거를 통해 Bump 구조를 노출한다'],
    ['120', '불필요 Au를 에칭하여 Bump 간 절연을 확보한다'],
    ['130', '불필요 Seed Layer를 제거하여 Bump 간 단락을 방지한다'],
    ['140', '열처리로 Bump 금속 결합을 강화한다'],
    ['150', '최종 외관·치수를 검사하여 출하 합부를 판정한다'],
    ['160', '최종 세정으로 출하 전 이물을 제거한다'],
    ['170', '추가 세정으로 잔류 이물을 완전 제거한다'],
    ['180', '최종 분류·정렬로 출하 단위를 구성한다'],
    ['190', '자동외관검사로 최종 품질을 확인한다'],
    ['200', '출하 검사 및 포장으로 제품을 보호한다'],
  ],
  'L2-4(A4) 제품특성': [
    ['01', '파티클 수', ''],
    ['10', 'Wafer 두께', ''],
    ['10', 'Wafer TTV', '★'],
    ['20', '정렬 정확도', ''],
    ['30', '파티클 잔류수', ''],
    ['40', 'UBM 두께', '★'],
    ['40', '막질 균일도', ''],
    ['50', '파티클 잔류수', ''],
    ['60', 'PR 두께', ''],
    ['70', 'CD(Critical Dimension)', '★'],
    ['80', 'Opening 정확도', ''],
    ['90', 'PR 잔사 수', ''],
    ['100', 'Au Bump 높이', '★'],
    ['100', 'Au 순도', ''],
    ['110', 'PR 잔사', ''],
    ['120', '에칭 잔류물', ''],
    ['130', 'Seed 잔류물', ''],
    ['140', 'IMC 두께', ''],
    ['150', 'Bump 외관', ''],
    ['150', 'Bump 높이', '★'],
    ['160', '파티클 잔류수', ''],
    ['170', '파티클 잔류수', ''],
    ['180', '정렬 정확도', ''],
    ['190', 'Defect 수', ''],
    ['200', '포장 상태', ''],
  ],
  'L2-5(A5) 고장형태': [
    ['01', '파티클 초과'],
    ['10', '두께 규격 이탈'],
    ['10', 'TTV 규격 초과'],
    ['20', '정렬 불량'],
    ['30', '세정 불량'],
    ['40', 'UBM 두께 부족'],
    ['40', '막질 불균일'],
    ['50', '세정 불량'],
    ['60', 'PR 두께 불균일'],
    ['70', 'CD 규격 이탈'],
    ['80', 'Under/Over develop'],
    ['90', 'PR 잔사 잔류'],
    ['100', '높이 편차'],
    ['100', '순도 저하'],
    ['110', 'PR 잔사 잔류'],
    ['120', '에칭 부족/과다'],
    ['130', 'Under/Over etch'],
    ['140', 'IMC 과성장'],
    ['150', '외관 불량'],
    ['150', '높이 규격 이탈'],
    ['160', '세정 불량'],
    ['170', '세정 불량'],
    ['180', '정렬 불량'],
    ['190', '외관 결함 미검출'],
    ['200', '포장 불량'],
  ],
  'L2-6(A6) 검출관리': [
    ['01', '파티클 카운터 실시간 모니터링, 매lot 전수'],
    ['10', 'Wafer 두께 측정기 전수검사, 매lot'],
    ['20', '비전 센서 정렬 전수 확인'],
    ['30', 'KLA 파티클 카운터 전수검사'],
    ['40', 'SEM 전수검사, 4-Point Probe 매lot 측정'],
    ['50', 'KLA 파티클 카운터 전수검사'],
    ['60', '막두께 측정기 전수검사'],
    ['70', 'CD SEM 전수측정'],
    ['80', '광학현미경 샘플링 검사'],
    ['90', '광학현미경 샘플링 검사'],
    ['100', '높이 측정기 전수검사, 외관 샘플링 검사'],
    ['100', 'XRF 분석기 매lot 분석'],
    ['110', '광학현미경 샘플링 검사'],
    ['120', 'SEM 전수검사'],
    ['130', 'SEM 전수검사'],
    ['140', 'Cross-section SEM 샘플링 검사'],
    ['150', 'AVI 자동외관 전수검사'],
    ['150', '높이 측정기 전수검사'],
    ['160', 'KLA 파티클 카운터 전수검사'],
    ['170', 'KLA 파티클 카운터 전수검사'],
    ['180', '비전 센서 정렬 전수 확인'],
    ['190', 'AVI 전수 이중검사'],
    ['200', '포장 체크리스트 전수 확인'],
  ],
  // ═══════════════════════════════════════════════════════════════
  // B계열: L3 작업요소 레벨
  // ═══════════════════════════════════════════════════════════════
  'L3-1(B1) 작업요소': [
    ['01', 'MN', '클린룸 담당자'],
    ['01', 'MC', '항온항습기'],
    ['01', 'IM', '필터 소모품'],
    ['01', 'EN', '클린룸'],
    ['01', 'EN', 'FFU'],
    ['10', 'MN', '검사원'],
    ['10', 'MC', '두께 측정기'],
    ['10', 'IM', 'Wafer'],
    ['10', 'EN', '검사실'],
    ['20', 'MN', 'Sorter 작업자'],
    ['20', 'MC', 'Sorter 장비'],
    ['20', 'IM', 'Wafer Cassette'],
    ['20', 'EN', 'Sorter 작업영역'],
    ['30', 'MN', 'Scrubber 작업자'],
    ['30', 'MC', 'Scrubber 장비'],
    ['30', 'IM', 'DI Water'],
    ['30', 'EN', 'Scrubber 작업영역'],
    ['40', 'MN', 'Sputter 작업자'],
    ['40', 'MC', 'Sputter 장비'],
    ['40', 'MC', 'DC Power Supply'],
    ['40', 'IM', 'Ti Target'],
    ['40', 'IM', 'Cu Target'],
    ['40', 'EN', '진공 챔버'],
    ['50', 'MN', 'Scrubber2 작업자'],
    ['50', 'MC', 'Scrubber 장비'],
    ['50', 'IM', 'DI Water'],
    ['50', 'EN', 'Scrubber2 작업영역'],
    ['60', 'MN', 'Coating 작업자'],
    ['60', 'MC', 'Coater'],
    ['60', 'IM', 'PR(Photo Resist)'],
    ['60', 'EN', 'Yellow Room'],
    ['70', 'MN', 'Exposure 작업자'],
    ['70', 'MC', 'Stepper/Scanner'],
    ['70', 'IM', 'Mask(Reticle)'],
    ['70', 'EN', 'Exposure 챔버'],
    ['80', 'MN', 'Develop 작업자'],
    ['80', 'MC', 'Developer'],
    ['80', 'IM', '현상액'],
    ['80', 'EN', 'Develop 작업영역'],
    ['90', 'MN', 'Descum 작업자'],
    ['90', 'MC', 'Descum 장비'],
    ['90', 'IM', 'O₂ Gas'],
    ['90', 'EN', 'Descum 챔버'],
    ['100', 'MN', 'Plating 작업자'],
    ['100', 'MC', 'Au Plating Tank'],
    ['100', 'MC', '정류기(Rectifier)'],
    ['100', 'IM', 'Au 도금액'],
    ['100', 'EN', 'Plating 작업영역'],
    ['110', 'MN', 'Strip 작업자'],
    ['110', 'MC', 'Strip 장비'],
    ['110', 'IM', 'Strip 용제'],
    ['110', 'EN', 'Strip 작업영역'],
    ['120', 'MN', 'Etch 작업자'],
    ['120', 'MC', 'Etch 장비'],
    ['120', 'IM', 'Au Etchant'],
    ['120', 'EN', 'Etch 작업영역'],
    ['130', 'MN', 'TiW Etch 작업자'],
    ['130', 'MC', 'TiW Etch 장비'],
    ['130', 'IM', 'TiW Etchant'],
    ['130', 'EN', 'TiW Etch 작업영역'],
    ['140', 'MN', 'Anneal 작업자'],
    ['140', 'MC', 'Anneal 장비'],
    ['140', 'IM', 'N₂ Gas'],
    ['140', 'EN', 'N₂ 공급장치'],
    ['150', 'MN', '검사원'],
    ['150', 'MC', 'AVI 장비'],
    ['150', 'MC', '높이 측정기'],
    ['150', 'IM', '한도 견본'],
    ['150', 'EN', '검사실'],
    ['160', 'MN', 'Clean 작업자'],
    ['160', 'MC', 'Clean 장비'],
    ['160', 'IM', 'DI Water'],
    ['160', 'EN', 'Clean 작업영역'],
    ['170', 'MN', 'Scrubber3 작업자'],
    ['170', 'MC', 'Scrubber 장비'],
    ['170', 'IM', 'DI Water'],
    ['170', 'EN', 'Scrubber3 작업영역'],
    ['180', 'MN', 'Sorter3 작업자'],
    ['180', 'MC', 'Sorter 장비'],
    ['180', 'IM', 'Wafer Cassette'],
    ['180', 'EN', 'Sorter3 작업영역'],
    ['190', 'MN', 'AVI 작업자'],
    ['190', 'MC', 'AVI 장비'],
    ['190', 'IM', '한도 견본'],
    ['190', 'EN', 'AVI 작업영역'],
    ['200', 'MN', '포장 작업자'],
    ['200', 'MC', '포장 장비'],
    ['200', 'IM', '포장재'],
    ['200', 'EN', '포장 작업영역'],
  ],
  'L3-2(B2) 요소기능': [
    ['01', 'MN', '클린룸 담당자', '환경관리 담당자가 클린룸 환경 기준을 확인하고 적합 여부를 판정한다'],
    ['01', 'MC', '항온항습기', '항온항습기가 온습도를 제어하여 클린룸 환경을 유지한다'],
    ['01', 'IM', '필터 소모품', '필터 소모품이 공기 청정 기능을 제공한다'],
    ['01', 'EN', '클린룸', '클린룸이 청정 환경을 제공하여 이물 오염을 방지한다'],
    ['01', 'EN', '클린룸', 'FFU가 HEPA 필터로 파티클을 제거하여 청정도를 유지한다'],
    ['10', 'MN', '검사원', '검사원이 IQA 기준에 따라 Wafer를 판정한다'],
    ['10', 'MC', '두께 측정기', '두께 측정기가 Wafer 두께를 측정하여 합부 데이터를 제공한다'],
    ['10', 'IM', 'Wafer', 'Wafer가 후속 공정의 기판 역할을 한다'],
    ['10', 'EN', '검사실', '검사실이 항온항습 환경을 유지하여 측정 정밀도를 확보한다'],
    ['20', 'MN', 'Sorter 작업자', 'Sorter 작업자가 정렬 결과를 확인하고 적합 여부를 판정한다'],
    ['20', 'MC', 'Sorter 장비', 'Sorter가 Wafer를 정렬하여 후속공정 투입 순서를 확보한다'],
    ['20', 'IM', 'Wafer Cassette', 'Wafer Cassette가 Wafer 운반·보호 기능을 제공한다'],
    ['20', 'EN', 'Sorter 작업영역', 'Sorter 작업영역이 청정 환경을 유지하여 오염을 방지한다'],
    ['30', 'MN', 'Scrubber 작업자', 'Scrubber 작업자가 세정 결과를 확인하고 적합 여부를 판정한다'],
    ['30', 'MC', 'Scrubber 장비', 'Scrubber가 Wafer 표면을 세정하여 청정 표면을 확보한다'],
    ['30', 'IM', 'DI Water', 'DI Water가 세정 매체로 이물을 제거한다'],
    ['30', 'EN', 'Scrubber 작업영역', 'Scrubber 작업영역이 청정 환경을 유지하여 세정 품질을 확보한다'],
    ['40', 'MN', 'Sputter 작업자', 'Sputter 작업자가 증착 결과를 확인하고 막질 적합 여부를 판정한다'],
    ['40', 'MC', 'Sputter 장비', 'Sputter 장비가 Ti/Cu를 증착하여 UBM층을 형성한다'],
    ['40', 'MC', 'Sputter 장비', 'DC Power Supply가 안정 전력을 공급하여 증착 균일성을 확보한다'],
    ['40', 'IM', 'Ti Target', 'Ti Target이 증착 소스로 UBM 접합층을 형성한다'],
    ['40', 'IM', 'Ti Target', 'Cu Target이 증착 소스로 전도층을 형성한다'],
    ['40', 'EN', '진공 챔버', '진공 챔버가 진공 환경을 유지하여 증착 품질을 확보한다'],
    ['50', 'MN', 'Scrubber2 작업자', 'Scrubber2 작업자가 세정 결과를 확인하고 적합 여부를 판정한다'],
    ['50', 'MC', 'Scrubber 장비', 'Scrubber가 Sputter후 이물을 제거하여 도금 품질을 확보한다'],
    ['50', 'IM', 'DI Water', 'DI Water가 세정 매체로 이물을 제거한다'],
    ['50', 'EN', 'Scrubber2 작업영역', 'Scrubber2 작업영역이 청정 환경을 유지하여 세정 품질을 확보한다'],
    ['60', 'MN', 'Coating 작업자', 'Coating 작업자가 도포 결과를 확인하고 균일성 적합 여부를 판정한다'],
    ['60', 'MC', 'Coater', 'Coater가 PR을 균일 도포하여 패턴 마스크를 형성한다'],
    ['60', 'IM', 'PR(Photo Resist)', 'PR이 패턴 형성을 위한 감광제 역할을 한다'],
    ['60', 'EN', 'Yellow Room', 'Yellow Room이 UV 차단 환경을 유지하여 PR 감광을 방지한다'],
    ['70', 'MN', 'Exposure 작업자', 'Exposure 작업자가 노광 결과를 확인하고 패턴 적합 여부를 판정한다'],
    ['70', 'MC', 'Stepper/Scanner', 'Stepper가 패턴을 노광하여 Bump 위치를 정의한다'],
    ['70', 'IM', 'Mask(Reticle)', 'Mask가 패턴 원본을 제공하여 노광 정밀도를 확보한다'],
    ['70', 'EN', 'Exposure 챔버', 'Exposure 챔버가 온습도 환경을 유지하여 노광 정밀도를 확보한다'],
    ['80', 'MN', 'Develop 작업자', 'Develop 작업자가 현상 결과를 확인하고 Opening 적합 여부를 판정한다'],
    ['80', 'MC', 'Developer', 'Developer가 PR을 현상하여 도금 Opening을 형성한다'],
    ['80', 'IM', '현상액', '현상액이 노광된 PR을 선택적으로 용해한다'],
    ['80', 'EN', 'Develop 작업영역', 'Develop 작업영역이 온도 환경을 유지하여 현상 균일성을 확보한다'],
    ['90', 'MN', 'Descum 작업자', 'Descum 작업자가 잔사 제거 결과를 확인하고 적합 여부를 판정한다'],
    ['90', 'MC', 'Descum 장비', 'Descum이 PR 잔사를 제거하여 도금 접촉면을 확보한다'],
    ['90', 'IM', 'O₂ Gas', 'O₂ Gas가 Plasma 생성 매체를 제공한다'],
    ['90', 'EN', 'Descum 챔버', 'Descum 챔버가 진공 환경을 유지하여 Plasma 품질을 확보한다'],
    ['100', 'MN', 'Plating 작업자', 'Plating 작업자가 도금 결과를 확인하고 두께 적합 여부를 판정한다'],
    ['100', 'MC', 'Au Plating Tank', 'Au Plating Tank가 Au를 전해도금하여 Bump Core를 형성한다'],
    ['100', 'MC', 'Au Plating Tank', '정류기가 안정 전류를 공급하여 도금 균일성을 확보한다'],
    ['100', 'IM', 'Au 도금액', 'Au 도금액이 Au Ion을 공급하여 Bump을 성장시킨다'],
    ['100', 'EN', 'Plating 작업영역', 'Plating 작업영역이 온도 환경을 유지하여 도금 균일성을 확보한다'],
    ['110', 'MN', 'Strip 작업자', 'Strip 작업자가 PR 제거 결과를 확인하고 적합 여부를 판정한다'],
    ['110', 'MC', 'Strip 장비', 'Strip 장비가 PR을 제거하여 Bump 구조를 노출한다'],
    ['110', 'IM', 'Strip 용제', 'Strip 용제가 PR 용해 기능을 제공한다'],
    ['110', 'EN', 'Strip 작업영역', 'Strip 작업영역이 배기 환경을 유지하여 안전을 확보한다'],
    ['120', 'MN', 'Etch 작업자', 'Etch 작업자가 에칭 결과를 확인하고 절연 적합 여부를 판정한다'],
    ['120', 'MC', 'Etch 장비', 'Etch 장비가 Au를 선택적 에칭하여 Bump 간 절연을 확보한다'],
    ['120', 'IM', 'Au Etchant', 'Au Etchant가 Au 선택적 용해 기능을 제공한다'],
    ['120', 'EN', 'Etch 작업영역', 'Etch 작업영역이 배기 환경을 유지하여 안전을 확보한다'],
    ['130', 'MN', 'TiW Etch 작업자', 'TiW Etch 작업자가 에칭 결과를 확인하고 단락 방지 적합 여부를 판정한다'],
    ['130', 'MC', 'TiW Etch 장비', 'TiW Etch 장비가 Seed Layer를 제거하여 단락을 방지한다'],
    ['130', 'IM', 'TiW Etchant', 'TiW Etchant가 Seed Layer 선택적 용해 기능을 제공한다'],
    ['130', 'EN', 'TiW Etch 작업영역', 'TiW Etch 작업영역이 배기 환경을 유지하여 안전을 확보한다'],
    ['140', 'MN', 'Anneal 작업자', 'Anneal 작업자가 열처리 결과를 확인하고 결합 적합 여부를 판정한다'],
    ['140', 'MC', 'Anneal 장비', 'Anneal 장비가 열처리로 금속 결합을 강화한다'],
    ['140', 'IM', 'N₂ Gas', 'N₂ Gas가 불활성 분위기 조성 기능을 제공한다'],
    ['140', 'EN', 'N₂ 공급장치', 'N₂ 공급장치가 불활성 분위기를 제공하여 산화를 방지한다'],
    ['150', 'MN', '검사원', '검사원이 최종 판정 기준에 따라 합부를 결정한다'],
    ['150', 'MC', 'AVI 장비', 'AVI가 자동외관검사로 최종 합부를 판정한다'],
    ['150', 'MC', 'AVI 장비', '높이 측정기가 Bump 높이를 전수 검사한다'],
    ['150', 'IM', '한도 견본', '한도 견본이 합부 판정 기준 제공 기능을 제공한다'],
    ['150', 'EN', '검사실', '검사실이 항온항습 환경을 유지하여 검사 정밀도를 확보한다'],
    ['160', 'MN', 'Clean 작업자', 'Clean 작업자가 세정 결과를 확인하고 적합 여부를 판정한다'],
    ['160', 'MC', 'Clean 장비', 'Clean 장비가 최종 세정으로 출하 전 이물을 제거한다'],
    ['160', 'IM', 'DI Water', 'DI Water가 세정 매체로 이물 제거 기능을 제공한다'],
    ['160', 'EN', 'Clean 작업영역', 'Clean 작업영역이 청정 환경을 유지하여 세정 품질을 확보한다'],
    ['170', 'MN', 'Scrubber3 작업자', 'Scrubber3 작업자가 세정 결과를 확인하고 적합 여부를 판정한다'],
    ['170', 'MC', 'Scrubber 장비', 'Scrubber가 추가 세정으로 잔류 이물을 완전 제거한다'],
    ['170', 'IM', 'DI Water', 'DI Water가 세정 매체로 이물 제거 기능을 제공한다'],
    ['170', 'EN', 'Scrubber3 작업영역', 'Scrubber3 작업영역이 청정 환경을 유지하여 세정 품질을 확보한다'],
    ['180', 'MN', 'Sorter3 작업자', 'Sorter3 작업자가 정렬 결과를 확인하고 적합 여부를 판정한다'],
    ['180', 'MC', 'Sorter 장비', 'Sorter가 최종 분류·정렬로 출하 단위를 구성한다'],
    ['180', 'IM', 'Wafer Cassette', 'Wafer Cassette가 Wafer 운반·보호 기능을 제공한다'],
    ['180', 'EN', 'Sorter3 작업영역', 'Sorter3 작업영역이 청정 환경을 유지하여 오염을 방지한다'],
    ['190', 'MN', 'AVI 작업자', 'AVI 작업자가 검사 결과를 확인하고 합부 적합 여부를 판정한다'],
    ['190', 'MC', 'AVI 장비', 'AVI가 자동외관검사로 최종 결함을 검출한다'],
    ['190', 'IM', '한도 견본', '한도 견본이 검사 판정 기준 제공 기능을 제공한다'],
    ['190', 'EN', 'AVI 작업영역', 'AVI 작업영역이 청정 환경을 유지하여 검사 정밀도를 확보한다'],
    ['200', 'MN', '포장 작업자', '포장 작업자가 체크리스트에 따라 출하 포장을 완료한다'],
    ['200', 'MC', '포장 장비', '포장 장비가 제품을 보호 포장하여 운송 손상을 방지한다'],
    ['200', 'IM', '포장재', '포장재가 제품 보호 및 정전기 방지 기능을 제공한다'],
    ['200', 'EN', '포장 작업영역', '포장 작업영역이 청정 환경을 유지하여 오염을 방지한다'],
  ],
  'L3-3(B3) 공정특성': [
    ['01', 'MN', '클린룸 담당자', '작업 숙련도', ''],
    ['01', 'MC', '항온항습기', '설비 가동률', ''],
    ['01', 'IM', '필터 소모품', '자재 규격', ''],
    ['01', 'EN', '클린룸', '온도/습도', ''],
    ['01', 'EN', '클린룸', '풍속', ''],
    ['10', 'MN', '검사원', '판정 정확도', ''],
    ['10', 'MC', '두께 측정기', '측정 정밀도', ''],
    ['10', 'IM', 'Wafer', 'Wafer 규격', ''],
    ['10', 'EN', '검사실', '환경 조건', ''],
    ['20', 'MN', 'Sorter 작업자', '작업 숙련도', ''],
    ['20', 'MC', 'Sorter 장비', '정렬 속도', ''],
    ['20', 'IM', 'Wafer Cassette', '자재 규격', ''],
    ['20', 'EN', 'Sorter 작업영역', '환경 조건', ''],
    ['30', 'MN', 'Scrubber 작업자', '작업 숙련도', ''],
    ['30', 'MC', 'Scrubber 장비', '세정 압력', ''],
    ['30', 'IM', 'DI Water', '비저항', ''],
    ['30', 'EN', 'Scrubber 작업영역', '환경 조건', ''],
    ['40', 'MN', 'Sputter 작업자', '작업 숙련도', ''],
    ['40', 'MC', 'Sputter 장비', 'DC Power', '◇'],
    ['40', 'MC', 'Sputter 장비', '전압 안정도', ''],
    ['40', 'IM', 'Ti Target', 'Target 수명', ''],
    ['40', 'EN', '진공 챔버', '진공도', ''],
    ['50', 'MN', 'Scrubber2 작업자', '작업 숙련도', ''],
    ['50', 'MC', 'Scrubber 장비', '세정 압력', ''],
    ['50', 'IM', 'DI Water', '비저항', ''],
    ['50', 'EN', 'Scrubber2 작업영역', '환경 조건', ''],
    ['60', 'MN', 'Coating 작업자', '작업 숙련도', ''],
    ['60', 'MC', 'Coater', '회전 속도(RPM)', ''],
    ['60', 'IM', 'PR(Photo Resist)', '점도', ''],
    ['60', 'EN', 'Yellow Room', '환경 조건', ''],
    ['70', 'MN', 'Exposure 작업자', '작업 숙련도', ''],
    ['70', 'MC', 'Stepper/Scanner', '노광 에너지', '◇'],
    ['70', 'IM', 'Mask(Reticle)', 'Mask CD', ''],
    ['70', 'EN', 'Exposure 챔버', '환경 조건', ''],
    ['80', 'MN', 'Develop 작업자', '작업 숙련도', ''],
    ['80', 'MC', 'Developer', '현상 시간', ''],
    ['80', 'IM', '현상액', '농도', ''],
    ['80', 'EN', 'Develop 작업영역', '환경 조건', ''],
    ['90', 'MN', 'Descum 작업자', '작업 숙련도', ''],
    ['90', 'MC', 'Descum 장비', 'O₂ Plasma Power', ''],
    ['90', 'IM', 'O₂ Gas', '자재 규격', ''],
    ['90', 'EN', 'Descum 챔버', '환경 조건', ''],
    ['100', 'MN', 'Plating 작업자', '작업 숙련도', ''],
    ['100', 'MC', 'Au Plating Tank', '전류밀도', '◇'],
    ['100', 'MC', 'Au Plating Tank', '전류 안정도', ''],
    ['100', 'IM', 'Au 도금액', '도금액 농도', ''],
    ['100', 'EN', 'Plating 작업영역', '환경 조건', ''],
    ['110', 'MN', 'Strip 작업자', '작업 숙련도', ''],
    ['110', 'MC', 'Strip 장비', 'Strip 온도', ''],
    ['110', 'IM', 'Strip 용제', '자재 규격', ''],
    ['110', 'EN', 'Strip 작업영역', '환경 조건', ''],
    ['120', 'MN', 'Etch 작업자', '작업 숙련도', ''],
    ['120', 'MC', 'Etch 장비', '에칭 시간', ''],
    ['120', 'IM', 'Au Etchant', '자재 규격', ''],
    ['120', 'EN', 'Etch 작업영역', '환경 조건', ''],
    ['130', 'MN', 'TiW Etch 작업자', '작업 숙련도', ''],
    ['130', 'MC', 'TiW Etch 장비', '에칭 온도', ''],
    ['130', 'IM', 'TiW Etchant', '자재 규격', ''],
    ['130', 'EN', 'TiW Etch 작업영역', '환경 조건', ''],
    ['140', 'MN', 'Anneal 작업자', '작업 숙련도', ''],
    ['140', 'MC', 'Anneal 장비', 'Anneal 온도', '◇'],
    ['140', 'IM', 'N₂ Gas', '자재 규격', ''],
    ['140', 'EN', 'N₂ 공급장치', 'N₂ 유량', ''],
    ['150', 'MN', '검사원', '판정 정확도', ''],
    ['150', 'MC', 'AVI 장비', '검사 해상도', ''],
    ['150', 'MC', 'AVI 장비', '측정 정밀도', ''],
    ['150', 'IM', '한도 견본', '자재 규격', ''],
    ['150', 'EN', '검사실', '환경 조건', ''],
    ['160', 'MN', 'Clean 작업자', '작업 숙련도', ''],
    ['160', 'MC', 'Clean 장비', '세정 압력', ''],
    ['160', 'IM', 'DI Water', '자재 규격', ''],
    ['160', 'EN', 'Clean 작업영역', '환경 조건', ''],
    ['170', 'MN', 'Scrubber3 작업자', '작업 숙련도', ''],
    ['170', 'MC', 'Scrubber 장비', '세정 압력', ''],
    ['170', 'IM', 'DI Water', '자재 규격', ''],
    ['170', 'EN', 'Scrubber3 작업영역', '환경 조건', ''],
    ['180', 'MN', 'Sorter3 작업자', '작업 숙련도', ''],
    ['180', 'MC', 'Sorter 장비', '정렬 속도', ''],
    ['180', 'IM', 'Wafer Cassette', '자재 규격', ''],
    ['180', 'EN', 'Sorter3 작업영역', '환경 조건', ''],
    ['190', 'MN', 'AVI 작업자', '작업 숙련도', ''],
    ['190', 'MC', 'AVI 장비', '검사 해상도', ''],
    ['190', 'IM', '한도 견본', '자재 규격', ''],
    ['190', 'EN', 'AVI 작업영역', '환경 조건', ''],
    ['200', 'MN', '포장 작업자', '작업 숙련도', ''],
    ['200', 'MC', '포장 장비', '포장 진공도', ''],
    ['200', 'IM', '포장재', '자재 규격', ''],
    ['200', 'EN', '포장 작업영역', '환경 조건', ''],
  ],
  'L3-4(B4) 고장원인': [
    ['01', 'MN', '작업 숙련도 부족'],
    ['01', 'MC', '설비 가동률 저하'],
    ['01', 'IM', '자재 품질 부적합'],
    ['01', 'EN', '온습도 제어 이탈'],
    ['01', 'EN', '풍속 저하'],
    ['10', 'MN', '판정 기준 오적용'],
    ['10', 'MC', '측정 오차'],
    ['10', 'IM', '자재 품질 부적합'],
    ['10', 'EN', '환경 조건 이탈'],
    ['20', 'MN', '작업 숙련도 부족'],
    ['20', 'MC', '정렬 센서 오작동'],
    ['20', 'IM', '자재 품질 부적합'],
    ['20', 'EN', '환경 조건 이탈'],
    ['30', 'MN', '작업 숙련도 부족'],
    ['30', 'MC', '노즐 막힘'],
    ['30', 'IM', 'DI Water 비저항 저하'],
    ['30', 'EN', '환경 조건 이탈'],
    ['40', 'MN', '작업 숙련도 부족'],
    ['40', 'MC', 'Power 변동'],
    ['40', 'MC', '전압 변동'],
    ['40', 'IM', 'Target 소진'],
    ['40', 'EN', '진공 누설'],
    ['50', 'MN', '작업 숙련도 부족'],
    ['50', 'MC', '노즐 막힘'],
    ['50', 'IM', 'DI Water 비저항 저하'],
    ['50', 'EN', '환경 조건 이탈'],
    ['60', 'MN', '작업 숙련도 부족'],
    ['60', 'MC', 'RPM 편차'],
    ['60', 'IM', 'PR 열화'],
    ['60', 'EN', '환경 조건 이탈'],
    ['70', 'MN', '작업 숙련도 부족'],
    ['70', 'MC', '에너지 편차'],
    ['70', 'IM', 'Mask 결함'],
    ['70', 'EN', '환경 조건 이탈'],
    ['80', 'MN', '작업 숙련도 부족'],
    ['80', 'MC', '현상 시간 편차'],
    ['80', 'IM', '농도 편차'],
    ['80', 'EN', '환경 조건 이탈'],
    ['90', 'MN', '작업 숙련도 부족'],
    ['90', 'MC', 'Power 불안정'],
    ['90', 'IM', '자재 품질 부적합'],
    ['90', 'EN', '환경 조건 이탈'],
    ['100', 'MN', '작업 숙련도 부족'],
    ['100', 'MC', '전류밀도 편차'],
    ['100', 'MC', '전류 변동'],
    ['100', 'IM', '농도 저하'],
    ['100', 'EN', '환경 조건 이탈'],
    ['110', 'MN', '작업 숙련도 부족'],
    ['110', 'MC', '온도 편차'],
    ['110', 'IM', '자재 품질 부적합'],
    ['110', 'EN', '환경 조건 이탈'],
    ['120', 'MN', '작업 숙련도 부족'],
    ['120', 'MC', '에칭 시간 편차'],
    ['120', 'IM', '자재 품질 부적합'],
    ['120', 'EN', '환경 조건 이탈'],
    ['130', 'MN', '작업 숙련도 부족'],
    ['130', 'MC', '온도 편차'],
    ['130', 'IM', '자재 품질 부적합'],
    ['130', 'EN', '환경 조건 이탈'],
    ['140', 'MN', '작업 숙련도 부족'],
    ['140', 'MC', '온도 과다/부족'],
    ['140', 'IM', '자재 품질 부적합'],
    ['140', 'EN', '유량 부족'],
    ['150', 'MN', '판정 기준 오적용'],
    ['150', 'MC', '해상도 저하'],
    ['150', 'MC', '측정 오차'],
    ['150', 'IM', '자재 품질 부적합'],
    ['150', 'EN', '환경 조건 이탈'],
    ['160', 'MN', '작업 숙련도 부족'],
    ['160', 'MC', '노즐 막힘'],
    ['160', 'IM', '자재 품질 부적합'],
    ['160', 'EN', '환경 조건 이탈'],
    ['170', 'MN', '작업 숙련도 부족'],
    ['170', 'MC', '노즐 막힘'],
    ['170', 'IM', '자재 품질 부적합'],
    ['170', 'EN', '환경 조건 이탈'],
    ['180', 'MN', '작업 숙련도 부족'],
    ['180', 'MC', '정렬 센서 오작동'],
    ['180', 'IM', '자재 품질 부적합'],
    ['180', 'EN', '환경 조건 이탈'],
    ['190', 'MN', '작업 숙련도 부족'],
    ['190', 'MC', '해상도 저하'],
    ['190', 'IM', '자재 품질 부적합'],
    ['190', 'EN', '환경 조건 이탈'],
    ['200', 'MN', '체크리스트 누락'],
    ['200', 'MC', '진공 누설'],
    ['200', 'IM', '자재 품질 부적합'],
    ['200', 'EN', '환경 조건 이탈'],
  ],
  // ★ v5.6: B5 완전 데이터 — B4 89건과 1:1 대응, MN/MC 스왑 수정, 공정번호 순서 정렬
  'L3-5(B5) 예방관리': [
    // 01 작업환경 (5건: MN×1, MC×1, IM×1, EN×2)
    ['01', 'MN', '클린룸 담당자', '환경관리 담당자 정기 숙련도 평가 + 작업표준 교육'],
    ['01', 'MC', '항온항습기', '항온항습기 PM + 월 1회 이행 점검'],
    ['01', 'IM', '필터 소모품', '필터 소모품 수입검사 + 유효기한 관리'],
    ['01', 'EN', '클린룸', '항온항습기 자동제어 + 실시간 모니터링'],
    ['01', 'EN', 'FFU', 'FFU 풍속 정기점검 + 일상점검'],
    // 10 IQA (4건)
    ['10', 'MN', '검사원', '검사원 정기 교육 + 판정 기준 숙련도 평가'],
    ['10', 'MC', '두께 측정기', '측정기 정기 교정(MSA) + PM'],
    ['10', 'IM', 'Wafer', '수입검사 강화 + IQC COA 확인'],
    ['10', 'EN', '검사실', '검사실 실시간 모니터링 + 일상점검'],
    // 20 Sorter (4건)
    ['20', 'MN', 'Sorter 작업자', 'Sorter 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['20', 'MC', 'Sorter 장비', 'Sorter 센서 정기 교정 + PM'],
    ['20', 'IM', 'Wafer Cassette', 'Wafer Cassette 수입검사 + 유효기한 관리'],
    ['20', 'EN', 'Sorter 작업영역', 'Sorter 작업영역 실시간 모니터링 + 일상점검'],
    // 30 Scrubber (4건)
    ['30', 'MN', 'Scrubber 작업자', 'Scrubber 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['30', 'MC', 'Scrubber 장비', 'Scrubber PM + 노즐 정기 세정'],
    ['30', 'IM', 'DI Water', 'DI Water 비저항 실시간 모니터링'],
    ['30', 'EN', 'Scrubber 작업영역', 'Scrubber 작업영역 실시간 모니터링 + 일상점검'],
    // 40 UBM Sputter (5건: MC×2, IM×1, EN×1)
    ['40', 'MN', 'Sputter 작업자', 'Sputter 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['40', 'MC', 'Sputter 장비', 'Sputter 장비 PM + Power 실시간 모니터링'],
    ['40', 'MC', 'DC Power Supply', '정기 교정 + UPS 운용'],
    ['40', 'IM', 'Ti Target', 'Target 사용량 카운터 관리 + 수입검사'],
    ['40', 'EN', '진공 챔버', '진공도 실시간 모니터링 + Leak 점검'],
    // 50 Scrubber2 (4건)
    ['50', 'MN', 'Scrubber2 작업자', 'Scrubber2 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['50', 'MC', 'Scrubber 장비', 'Scrubber PM + 노즐 정기 세정'],
    ['50', 'IM', 'DI Water', 'DI Water 비저항 실시간 모니터링'],
    ['50', 'EN', 'Scrubber2 작업영역', 'Scrubber2 작업영역 실시간 모니터링 + 일상점검'],
    // 60 PR Coating (4건)
    ['60', 'MN', 'Coating 작업자', 'Coating 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['60', 'MC', 'Coater', 'Coater PM + RPM 실시간 모니터링'],
    ['60', 'IM', 'PR(Photo Resist)', 'PR 유효기한 관리 + 냉장보관'],
    ['60', 'EN', 'Yellow Room', 'Yellow Room 실시간 모니터링 + 일상점검'],
    // 70 Exposure (4건)
    ['70', 'MN', 'Exposure 작업자', 'Exposure 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['70', 'MC', 'Stepper/Scanner', 'Stepper 정기 교정 + 에너지 실시간 모니터링'],
    ['70', 'IM', 'Mask(Reticle)', 'Mask 정기 세정 + 결함 관리'],
    ['70', 'EN', 'Exposure 챔버', 'Exposure 챔버 실시간 모니터링 + 일상점검'],
    // 80 Develop (4건)
    ['80', 'MN', 'Develop 작업자', 'Develop 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['80', 'MC', 'Developer', 'Developer PM + 시간 자동제어'],
    ['80', 'IM', '현상액', '농도 자동 보정 시스템 + 수입검사'],
    ['80', 'EN', 'Develop 작업영역', 'Develop 작업영역 실시간 모니터링 + 일상점검'],
    // 90 Descum (4건)
    ['90', 'MN', 'Descum 작업자', 'Descum 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['90', 'MC', 'Descum 장비', 'Descum PM + Power 모니터링'],
    ['90', 'IM', 'O₂ Gas', 'O₂ Gas 수입검사 + 유효기한 관리'],
    ['90', 'EN', 'Descum 챔버', 'Descum 챔버 실시간 모니터링 + 일상점검'],
    // 100 Au Plating (5건: MC×2)
    ['100', 'MN', 'Plating 작업자', 'Plating 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['100', 'MC', 'Au Plating Tank', 'Plating Tank PM + 전류밀도 자동제어'],
    ['100', 'MC', '정류기(Rectifier)', '정류기 정기 교정 + PM'],
    ['100', 'IM', 'Au 도금액', '도금액 농도 자동분석 + 보충'],
    ['100', 'EN', 'Plating 작업영역', 'Plating 작업영역 실시간 모니터링 + 일상점검'],
    // 110 PR Strip (4건)
    ['110', 'MN', 'Strip 작업자', 'Strip 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['110', 'MC', 'Strip 장비', 'Strip 장비 PM + 온도 자동제어'],
    ['110', 'IM', 'Strip 용제', 'Strip 용제 수입검사 + 유효기한 관리'],
    ['110', 'EN', 'Strip 작업영역', 'Strip 작업영역 실시간 모니터링 + 일상점검'],
    // 120 Au Etch (4건)
    ['120', 'MN', 'Etch 작업자', 'Etch 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['120', 'MC', 'Etch 장비', 'Etch PM + 시간 자동제어'],
    ['120', 'IM', 'Au Etchant', 'Au Etchant 수입검사 + 유효기한 관리'],
    ['120', 'EN', 'Etch 작업영역', 'Etch 작업영역 실시간 모니터링 + 일상점검'],
    // 130 TiW Etch (4건)
    ['130', 'MN', 'TiW Etch 작업자', 'TiW Etch 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['130', 'MC', 'TiW Etch 장비', 'TiW Etch PM + 온도 자동제어'],
    ['130', 'IM', 'TiW Etchant', 'TiW Etchant 수입검사 + 유효기한 관리'],
    ['130', 'EN', 'TiW Etch 작업영역', 'TiW Etch 작업영역 실시간 모니터링 + 일상점검'],
    // 140 Anneal (4건)
    ['140', 'MN', 'Anneal 작업자', 'Anneal 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['140', 'MC', 'Anneal 장비', 'Anneal 장비 PM + 온도 프로파일 모니터링'],
    ['140', 'IM', 'N₂ Gas', 'N₂ Gas 수입검사 + 유효기한 관리'],
    ['140', 'EN', 'N₂ 공급장치', 'N₂ 유량 실시간 모니터링'],
    // 150 Final Inspection (5건: MC×2)
    ['150', 'MN', '검사원', '검사원 정기 교육 + 한도 견본 판정 훈련'],
    ['150', 'MC', 'AVI 장비', 'AVI 정기 교정 + PM'],
    ['150', 'MC', '높이 측정기', '측정기 정기 교정(MSA) + PM'],
    ['150', 'IM', '한도 견본', '한도 견본 수입검사 + 유효기한 관리'],
    ['150', 'EN', '검사실', '검사실 실시간 모니터링 + 일상점검'],
    // 160 Clean (4건)
    ['160', 'MN', 'Clean 작업자', 'Clean 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['160', 'MC', 'Clean 장비', 'Clean 장비 PM + 노즐 정기 세정'],
    ['160', 'IM', 'DI Water', 'DI Water 수입검사 + 유효기한 관리'],
    ['160', 'EN', 'Clean 작업영역', 'Clean 작업영역 실시간 모니터링 + 일상점검'],
    // 170 Scrubber3 (4건)
    ['170', 'MN', 'Scrubber3 작업자', 'Scrubber3 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['170', 'MC', 'Scrubber 장비', 'Scrubber PM + 노즐 정기 세정'],
    ['170', 'IM', 'DI Water', 'DI Water 수입검사 + 유효기한 관리'],
    ['170', 'EN', 'Scrubber3 작업영역', 'Scrubber3 작업영역 실시간 모니터링 + 일상점검'],
    // 180 Sorter3 (4건)
    ['180', 'MN', 'Sorter3 작업자', 'Sorter3 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['180', 'MC', 'Sorter 장비', 'Sorter 센서 정기 교정 + PM'],
    ['180', 'IM', 'Wafer Cassette', 'Wafer Cassette 수입검사 + 유효기한 관리'],
    ['180', 'EN', 'Sorter3 작업영역', 'Sorter3 작업영역 실시간 모니터링 + 일상점검'],
    // 190 AVI (4건)
    ['190', 'MN', 'AVI 작업자', 'AVI 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['190', 'MC', 'AVI 장비', 'AVI 정기 교정 + PM'],
    ['190', 'IM', '한도 견본', '한도 견본 수입검사 + 유효기한 관리'],
    ['190', 'EN', 'AVI 작업영역', 'AVI 작업영역 실시간 모니터링 + 일상점검'],
    // 200 OGI/Packing (4건)
    ['200', 'MN', '포장 작업자', '포장 작업자 체크리스트 교육 + 작업표준 교육'],
    ['200', 'MC', '포장 장비', '포장 장비 PM + 진공도 모니터링'],
    ['200', 'IM', '포장재', '포장재 수입검사 + 유효기한 관리'],
    ['200', 'EN', '포장 작업영역', '포장 작업영역 실시간 모니터링 + 일상점검'],
  ],
  // ═══════════════════════════════════════════════════════════════
  // C계열: L1 완제품 레벨
  // ═══════════════════════════════════════════════════════════════
  'L1-1(C1) 구분': [
    ['YP'],
    ['SP'],
    ['USER'],
  ],
  'L1-2(C2) 제품기능': [
    ['YP', 'Wafer 표면 결함 부재 및 Lot 식별 정확성이 확보된 입고 Wafer를 제공한다'],
    ['YP', '표면 이물이 제거된 청정 Wafer를 후공정에 제공한다'],
    ['YP', 'TiW/Au 박막이 규격 두께로 증착된 Wafer를 제공한다'],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다'],
    ['YP', 'Bump 치수·특성이 규격 적합 확인된 최종 Wafer를 제공한다'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다'],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다'],
    ['USER', 'RoHS·REACH 규제 유해물질 기준을 준수하는 Wafer를 제공한다'],
    ['USER', 'ESD 손상 방지 기준(ANSI/ESD S20.20)을 준수하는 공정 환경을 제공한다'],
    ['USER', 'ISO 9001 품질경영시스템 요구사항을 충족하는 공정 관리를 제공한다'],
  ],
  'L1-3(C3) 요구사항': [
    ['SP', 'Au Bump 높이(Bump Height, μm) — ★'],
    ['YP', 'Lot 식별 정확도(OCR ID Matching Accuracy)'],
    ['YP', 'Wafer 표면 외관 결함 부재(Visual Defect Absence)'],
    ['YP', 'Wafer 표면 스크래치 부재(Surface Scratch Absence)'],
    ['YP', 'Wafer 파손·크랙 부재(Chipping/Crack Absence)'],
    ['YP', 'Wafer 표면 청정도(Particle 농도, ea/wfr)'],
    ['YP', 'TiW 박막 두께(TiW Thickness, Å)'],
    ['YP', 'Au 박막 두께(Au Seed Thickness, Å)'],
    ['YP', 'PR 도포 두께(PR Thickness, μm)'],
    ['YP', 'PR 도포 균일도(PR Coating Uniformity, %)'],
    ['YP', 'Photo Open CD(Critical Dimension, μm)'],
    ['YP', 'Overlay 정렬 정확도(Overlay Accuracy, μm)'],
    ['YP', 'PR Scum 잔류 부재(PR Scum Absence)'],
    ['YP', 'Au Bump 높이(Bump Height, μm)'],
    ['YP', 'Au Bump 높이 균일도(Bump Height Uniformity, Co-planarity, μm)'],
    ['YP', 'Au Bump 두께 균일도(Plating Uniformity, %)'],
    ['YP', 'MES Interlock 작동 정확도(공정 Skip 방지)'],
    ['SP', 'Au Bump 전단강도(Shear Strength, gf) — ★'],
    ['SP', 'Au Bump 경도(Hardness, HV) — ★'],
    ['SP', 'Bump Co-planarity(μm) — ★'],
    ['SP', 'PKG TEST 수율(고객 요구 수율 이상)'],
    ['SP', '고객 Packing 기준 적합성(Customer Packing Standard)'],
    ['SP', 'Wafer 식별 라벨 3자 일치성(Lot Label Matching Accuracy)'],
    ['SP', 'Wafer 표면 외관 결함 부재(Visual Defect Absence)'],
    ['SP', 'Wafer 표면 스크래치 부재(Surface Scratch Absence)'],
    ['SP', 'Wafer 파손·크랙 부재(Chipping/Crack Absence)'],
    ['SP', 'Wafer Lot 식별 정확도(OCR ID Matching Accuracy)'],
    ['SP', 'TiW 박막 두께(TiW Thickness, Å)'],
    ['SP', 'Au Seed 박막 두께(Au Seed Thickness, Å)'],
    ['SP', 'Photo Open CD(Critical Dimension, μm)'],
    ['SP', 'Overlay 정렬 정확도(Overlay Accuracy, μm)'],
    ['SP', 'Au Bump 높이 균일도(Bump Co-planarity, μm) — ★'],
    ['SP', 'Bump 높이 균일도(Plating Uniformity, %)'],
    ['SP', 'IMC 두께(IMC Thickness, μm)'],
    ['USER', 'RoHS 유해물질 기준 적합성(RoHS Compliance)'],
    ['USER', 'REACH SVHC 규제 물질 제한 적합성(REACH Compliance)'],
    ['USER', 'ESD 손상 방지 기준 적합성(ANSI/ESD S20.20)'],
    ['USER', 'ISO 9001 품질경영시스템 요구사항 적합성'],
    ['USER', '클린룸 청정도 등급 적합성(ISO 14644 기준)'],
    ['USER', '암시적 요구사항 — 금지 화학물질로부터의 자유(RoHS/REACH)'],
  ],
  'L1-4(C4) 고장영향': [
    ['YP', 'Lot 혼입으로 인한 Wafer 수율 손실'],
    ['YP', 'Wafer 표면 결함 미검출로 인한 후공정 유출'],
    ['YP', 'Wafer 스크래치 발생으로 인한 수율 저하'],
    ['YP', 'Wafer 파손·크랙으로 인한 Wafer 손실'],
    ['YP', 'Particle 오염으로 인한 제품 특성 이상'],
    ['YP', 'TiW 두께 Spec Out으로 인한 제품 특성 이상'],
    ['YP', 'Au Seed 두께 Spec Out으로 인한 제품 특성 이상'],
    ['YP', 'PR 두께 Spec Out으로 인한 패턴 불량'],
    ['YP', 'PR 균일도 Spec Out으로 인한 CD 산포 불량'],
    ['YP', 'CD Spec Out으로 인한 Bump 형성 불량'],
    ['YP', 'Overlay 정렬 오차로 인한 패턴 불량'],
    ['YP', 'PR Scum 잔류로 인한 Au Bump 형성 불량'],
    ['YP', 'Bump Height Spec Out으로 인한 제품 특성 이상'],
    ['YP', 'Co-planarity Spec Out으로 인한 제품 특성 이상'],
    ['YP', 'Plating 균일도 Spec Out으로 인한 Bump 특성 이상'],
    ['YP', '공정 Skip으로 인한 제품 특성 이상(MES Interlock 미작동)'],
    ['YP', '전기적 Open/Short'],
    ['YP', 'Bump Lift-off'],
    ['YP', 'Bump간 Bridge'],
    ['SP', 'Lot 혼입 불량 유출(고객 불량 수령)'],
    ['SP', '외관 결함 불량 유출(고객 Outgoing Defect)'],
    ['SP', '스크래치 불량 유출(고객 납품 외관 불량)'],
    ['SP', 'Wafer 파손 불량 유출(고객 조립 불가)'],
    ['SP', 'Particle 오염 불량 유출(고객 기능 이상)'],
    ['SP', 'TiW 두께 불량에 의한 Chip 기능 이상'],
    ['SP', 'Au Seed 두께 불량에 의한 Chip 기능 이상'],
    ['SP', 'CD 불량에 의한 Chip 기능 이상'],
    ['SP', 'Overlay 불량에 의한 Chip 기능 이상'],
    ['SP', 'Bump Height 불량에 의한 제품 조립 불가'],
    ['SP', 'Co-planarity 불량에 의한 제품 조립 불가'],
    ['SP', 'Shear Strength 미달로 인한 Chip 기능 불량(고객 조립 수율 저하)'],
    ['SP', 'Hardness 미달로 인한 Chip 기능 불량'],
    ['SP', 'Co-planarity 불량으로 인한 제품 조립 불가(고객 조립 Reject)'],
    ['SP', 'PKG TEST 수율 미달로 인한 고객 생산 Capa 손실'],
    ['SP', '고객 Packing 기준 부적합으로 인한 납품 Reject'],
    ['SP', '라벨 불일치로 인한 Lot 혼입 불량 유출'],
    ['SP', 'Particle 오염 불량 유출로 인한 고객 기능 이상'],
    ['SP', 'IMC 과성장에 의한 접합부 열화'],
    ['USER', '고객 라인 정지, 클레임'],
    ['USER', '고객 신뢰도 하락'],
    ['USER', '클린룸 청정도 기준 위반에 의한 제품 Particle 오염 불량'],
    ['USER', '품질경영시스템 부적합(FMEA 미준수, ISO 9001 위반)'],
    ['USER', 'ESD 손상에 의한 Chip 기능 불량(현장 클레임)'],
    ['USER', 'RoHS 금지 물질 함유로 인한 제품 출하 불가(법적 위반)'],
    ['USER', 'REACH SVHC 물질 함유로 인한 제품 출하 불가(법적 위반)'],
    ['USER', 'ESD 관리 기준 위반으로 인한 Chip ESD 손상 불량'],
    ['USER', 'ISO 9001 부적합으로 인한 품질경영시스템 위반'],
    ['USER', 'ISO 14644 클린룸 등급 위반으로 인한 Particle 오염 불량'],
    ['USER', '금지 화학물질 함유로 인한 제품 출하 불가(규제 위반)'],
  ],
  // ═══════════════════════════════════════════════════════════════
  // 통합시트
  // ═══════════════════════════════════════════════════════════════
  'L1 통합(C1-C4)': [
    ['YP', 'Wafer 표면 결함 부재 및 Lot 식별 정확성이 확보된 입고 Wafer를 제공한다', 'Lot 식별 정확도(OCR ID Matching Accuracy)', 'Lot 혼입으로 인한 Wafer 수율 손실'],
    ['YP', '표면 이물이 제거된 청정 Wafer를 후공정에 제공한다', 'Wafer 표면 외관 결함 부재(Visual Defect Absence)', 'Wafer 표면 결함 미검출로 인한 후공정 유출'],
    ['YP', 'TiW/Au 박막이 규격 두께로 증착된 Wafer를 제공한다', 'Wafer 표면 스크래치 부재(Surface Scratch Absence)', 'Wafer 스크래치 발생으로 인한 수율 저하'],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'Wafer 파손·크랙 부재(Chipping/Crack Absence)', 'Wafer 파손·크랙으로 인한 Wafer 손실'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Wafer 표면 청정도(Particle 농도, ea/wfr)', 'Particle 오염으로 인한 제품 특성 이상'],
    ['YP', 'Bump 치수·특성이 규격 적합 확인된 최종 Wafer를 제공한다', 'TiW 박막 두께(TiW Thickness, Å)', 'TiW 두께 Spec Out으로 인한 제품 특성 이상'],
    ['YP', 'TiW/Au 박막이 규격 두께로 증착된 Wafer를 제공한다', 'Au 박막 두께(Au Seed Thickness, Å)', 'Au Seed 두께 Spec Out으로 인한 제품 특성 이상'],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'PR 도포 두께(PR Thickness, μm)', 'PR 두께 Spec Out으로 인한 패턴 불량'],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'PR 도포 균일도(PR Coating Uniformity, %)', 'PR 균일도 Spec Out으로 인한 CD 산포 불량'],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'Photo Open CD(Critical Dimension, μm)', 'CD Spec Out으로 인한 Bump 형성 불량'],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'Overlay 정렬 정확도(Overlay Accuracy, μm)', 'Overlay 정렬 오차로 인한 패턴 불량'],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'PR Scum 잔류 부재(PR Scum Absence)', 'PR Scum 잔류로 인한 Au Bump 형성 불량'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 높이(Bump Height, μm)', 'Bump Height Spec Out으로 인한 제품 특성 이상'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 높이 균일도(Bump Height Uniformity, Co-planarity, μm)', 'Co-planarity Spec Out으로 인한 제품 특성 이상'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 두께 균일도(Plating Uniformity, %)', 'Plating 균일도 Spec Out으로 인한 Bump 특성 이상'],
    ['YP', 'Bump 치수·특성이 규격 적합 확인된 최종 Wafer를 제공한다', 'MES Interlock 작동 정확도(공정 Skip 방지)', '공정 Skip으로 인한 제품 특성 이상(MES Interlock 미작동)'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', '전기적 Open/Short'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', 'Bump Lift-off'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', 'Bump간 Bridge'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Au Bump 높이(Bump Height, μm) — ★', 'Lot 혼입 불량 유출(고객 불량 수령)'],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다', 'Au Bump 전단강도(Shear Strength, gf) — ★', '외관 결함 불량 유출(고객 Outgoing Defect)'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Bump Co-planarity(μm) — ★', '스크래치 불량 유출(고객 납품 외관 불량)'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'PKG TEST 수율(고객 요구 수율 이상)', 'Wafer 파손 불량 유출(고객 조립 불가)'],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다', '고객 Packing 기준 적합성(Customer Packing Standard)', 'Particle 오염 불량 유출(고객 기능 이상)'],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다', 'Wafer 식별 라벨 3자 일치성(Lot Label Matching Accuracy)', 'TiW 두께 불량에 의한 Chip 기능 이상'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Au Bump 높이(Bump Height, μm) — ★', 'Au Seed 두께 불량에 의한 Chip 기능 이상'],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다', 'Wafer 표면 외관 결함 부재(Visual Defect Absence)', 'CD 불량에 의한 Chip 기능 이상'],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다', 'Wafer 표면 스크래치 부재(Surface Scratch Absence)', 'Overlay 불량에 의한 Chip 기능 이상'],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다', 'Wafer 파손·크랙 부재(Chipping/Crack Absence)', 'Bump Height 불량에 의한 제품 조립 불가'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Wafer Lot 식별 정확도(OCR ID Matching Accuracy)', 'Co-planarity 불량에 의한 제품 조립 불가'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'TiW 박막 두께(TiW Thickness, Å)', 'Shear Strength 미달로 인한 Chip 기능 불량(고객 조립 수율 저하)'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Au Seed 박막 두께(Au Seed Thickness, Å)', 'Hardness 미달로 인한 Chip 기능 불량'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Photo Open CD(Critical Dimension, μm)', 'Co-planarity 불량으로 인한 제품 조립 불가(고객 조립 Reject)'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Overlay 정렬 정확도(Overlay Accuracy, μm)', 'PKG TEST 수율 미달로 인한 고객 생산 Capa 손실'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Au Bump 높이 균일도(Bump Co-planarity, μm) — ★', '고객 Packing 기준 부적합으로 인한 납품 Reject'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Bump 높이 균일도(Plating Uniformity, %)', '라벨 불일치로 인한 Lot 혼입 불량 유출'],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다', 'Wafer 표면 청정도(Particle 농도, ea/wfr)', 'Particle 오염 불량 유출로 인한 고객 기능 이상'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'IMC 두께(IMC Thickness, μm)', 'IMC 과성장에 의한 접합부 열화'],
    ['USER', 'RoHS·REACH 규제 유해물질 기준을 준수하는 Wafer를 제공한다', 'RoHS 유해물질 기준 적합성(RoHS Compliance)', '고객 라인 정지, 클레임'],
    ['USER', 'ESD 손상 방지 기준(ANSI/ESD S20.20)을 준수하는 공정 환경을 제공한다', 'REACH SVHC 규제 물질 제한 적합성(REACH Compliance)', '고객 신뢰도 하락'],
    ['USER', 'ISO 9001 품질경영시스템 요구사항을 충족하는 공정 관리를 제공한다', 'ESD 손상 방지 기준 적합성(ANSI/ESD S20.20)', '클린룸 청정도 기준 위반에 의한 제품 Particle 오염 불량'],
    ['USER', 'ESD 손상 방지 기준(ANSI/ESD S20.20)을 준수하는 공정 환경을 제공한다', 'REACH SVHC 규제 물질 제한 적합성(REACH Compliance)', '품질경영시스템 부적합(FMEA 미준수, ISO 9001 위반)'],
    ['USER', 'ISO 9001 품질경영시스템 요구사항을 충족하는 공정 관리를 제공한다', 'ESD 손상 방지 기준 적합성(ANSI/ESD S20.20)', 'ESD 손상에 의한 Chip 기능 불량(현장 클레임)'],
    ['USER', 'ISO 9001 품질경영시스템 요구사항을 충족하는 공정 관리를 제공한다', 'ISO 9001 품질경영시스템 요구사항 적합성', 'RoHS 금지 물질 함유로 인한 제품 출하 불가(법적 위반)'],
    ['USER', 'ISO 9001 품질경영시스템 요구사항을 충족하는 공정 관리를 제공한다', '클린룸 청정도 등급 적합성(ISO 14644 기준)', 'REACH SVHC 물질 함유로 인한 제품 출하 불가(법적 위반)'],
    ['USER', 'RoHS·REACH 규제 유해물질 기준을 준수하는 Wafer를 제공한다', '암시적 요구사항 — 금지 화학물질로부터의 자유(RoHS/REACH)', 'ESD 관리 기준 위반으로 인한 Chip ESD 손상 불량'],
    ['USER', 'ISO 9001 품질경영시스템 요구사항을 충족하는 공정 관리를 제공한다', 'ISO 9001 품질경영시스템 요구사항 적합성', 'ISO 9001 부적합으로 인한 품질경영시스템 위반'],
    ['USER', 'ISO 9001 품질경영시스템 요구사항을 충족하는 공정 관리를 제공한다', '클린룸 청정도 등급 적합성(ISO 14644 기준)', 'ISO 14644 클린룸 등급 위반으로 인한 Particle 오염 불량'],
    ['USER', 'RoHS·REACH 규제 유해물질 기준을 준수하는 Wafer를 제공한다', '암시적 요구사항 — 금지 화학물질로부터의 자유(RoHS/REACH)', '금지 화학물질 함유로 인한 제품 출하 불가(규제 위반)'],
  ],
  'L2 통합(A1-A6)': [
    ['01', '작업환경', '클린룸 환경을 유지하여 오염을 방지한다', '파티클 수', '', '파티클 초과', '파티클 카운터 실시간 모니터링, 매lot 전수'],
    ['10', 'IQA(수입검사)', '입고 자재의 품질을 확인하여 불량 자재 유입을 방지한다', 'Wafer 두께', '', '두께 규격 이탈', 'Wafer 두께 측정기 전수검사, 매lot'],
    ['10', 'IQA(수입검사)', '입고 자재의 품질을 확인하여 불량 자재 유입을 방지한다', 'Wafer TTV', '★', 'TTV 규격 초과', 'Wafer 두께 측정기 전수검사, 매lot'],
    ['20', 'Sorter', 'Wafer를 정렬·분류하여 후속공정 투입 순서를 확보한다', '정렬 정확도', '', '정렬 불량', '비전 센서 정렬 전수 확인'],
    ['30', 'Scrubber', 'Wafer 표면 이물을 제거하여 청정 표면을 확보한다', '파티클 잔류수', '', '세정 불량', 'KLA 파티클 카운터 전수검사'],
    ['40', 'UBM Sputter', 'Ti/Cu UBM 증착으로 Bump 접합층을 형성한다', 'UBM 두께', '★', 'UBM 두께 부족', 'SEM 전수검사, 4-Point Probe 매lot 측정'],
    ['40', 'UBM Sputter', 'Ti/Cu UBM 증착으로 Bump 접합층을 형성한다', '막질 균일도', '', '막질 불균일', 'SEM 전수검사, 4-Point Probe 매lot 측정'],
    ['50', 'Scrubber2', 'Sputter후 표면 이물을 제거하여 도금 품질을 확보한다', '파티클 잔류수', '', '세정 불량', 'KLA 파티클 카운터 전수검사'],
    ['60', 'PR Coating', 'PR을 도포하여 도금 패턴 마스크를 형성한다', 'PR 두께', '', 'PR 두께 불균일', '막두께 측정기 전수검사'],
    ['70', 'Exposure', 'PR을 노광하여 Bump 패턴을 전사한다', 'CD(Critical Dimension)', '★', 'CD 규격 이탈', 'CD SEM 전수측정'],
    ['80', 'Develop', 'PR을 현상하여 도금 Opening을 확보한다', 'Opening 정확도', '', 'Under/Over develop', '광학현미경 샘플링 검사'],
    ['90', 'Descum', 'PR 잔사를 제거하여 도금 접촉면을 확보한다', 'PR 잔사 수', '', 'PR 잔사 잔류', '광학현미경 샘플링 검사'],
    ['100', 'Au Plating', 'Au 전해도금으로 접합부 금속층을 형성한다', 'Au Bump 높이', '★', '높이 편차', '높이 측정기 전수검사, 외관 샘플링 검사'],
    ['100', 'Au Plating', 'Au 전해도금으로 접합부 금속층을 형성한다', 'Au 순도', '', '순도 저하', 'XRF 분석기 매lot 분석'],
    ['110', 'PR Strip', 'PR 제거를 통해 Bump 구조를 노출한다', 'PR 잔사', '', 'PR 잔사 잔류', '광학현미경 샘플링 검사'],
    ['120', 'Au Etch', '불필요 Au를 에칭하여 Bump 간 절연을 확보한다', '에칭 잔류물', '', '에칭 부족/과다', 'SEM 전수검사'],
    ['130', 'TiW Etch', '불필요 Seed Layer를 제거하여 Bump 간 단락을 방지한다', 'Seed 잔류물', '', 'Under/Over etch', 'SEM 전수검사'],
    ['140', 'Anneal', '열처리로 Bump 금속 결합을 강화한다', 'IMC 두께', '', 'IMC 과성장', 'Cross-section SEM 샘플링 검사'],
    ['150', 'Final Inspection', '최종 외관·치수를 검사하여 출하 합부를 판정한다', 'Bump 외관', '', '외관 불량', 'AVI 자동외관 전수검사'],
    ['150', 'Final Inspection', '최종 외관·치수를 검사하여 출하 합부를 판정한다', 'Bump 높이', '★', '높이 규격 이탈', '높이 측정기 전수검사'],
    ['160', 'Clean', '최종 세정으로 출하 전 이물을 제거한다', '파티클 잔류수', '', '세정 불량', 'KLA 파티클 카운터 전수검사'],
    ['170', 'Scrubber3', '추가 세정으로 잔류 이물을 완전 제거한다', '파티클 잔류수', '', '세정 불량', 'KLA 파티클 카운터 전수검사'],
    ['180', 'Sorter3', '최종 분류·정렬로 출하 단위를 구성한다', '정렬 정확도', '', '정렬 불량', '비전 센서 정렬 전수 확인'],
    ['190', 'AVI', '자동외관검사로 최종 품질을 확인한다', 'Defect 수', '', '외관 결함 미검출', 'AVI 전수 이중검사'],
    ['200', 'OGI/Packing', '출하 검사 및 포장으로 제품을 보호한다', '포장 상태', '', '포장 불량', '포장 체크리스트 전수 확인'],
  ],
  'L3 통합(B1-B5)': [
    ['01', 'MN', '클린룸 담당자', '환경관리 담당자가 클린룸 환경 기준을 확인하고 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', '항온항습기 PM Table 등록 + 월 1회 PM 이행 점검'],
    ['01', 'MC', '항온항습기', '항온항습기가 온습도를 제어하여 클린룸 환경을 유지한다', '설비 가동률', '', '설비 가동률 저하', '환경관리 담당자 정기 숙련도 평가 + 작업표준 교육'],
    ['01', 'IM', '필터 소모품', '필터 소모품이 공기 청정 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', '필터 소모품 수입검사 강화 + 유효기한 관리'],
    ['01', 'EN', '클린룸', '클린룸이 청정 환경을 제공하여 이물 오염을 방지한다', '온도/습도', '', '온습도 제어 이탈', 'FFU 풍속 정기점검'],
    ['01', 'EN', '클린룸', 'FFU가 HEPA 필터로 파티클을 제거하여 청정도를 유지한다', '풍속', '', '풍속 저하', 'FFU 풍속 정기점검'],
    ['01', 'EN', 'FFU', 'FFU가 HEPA 필터로 파티클을 제거하여 청정도를 유지한다', '풍속', '', '온습도 제어 이탈', 'FFU 풍속 정기점검'],
    ['01', 'EN', 'FFU', 'FFU가 HEPA 필터로 파티클을 제거하여 청정도를 유지한다', '풍속', '', '풍속 저하', 'FFU 풍속 정기점검'],
    ['10', 'MN', '검사원', '검사원이 IQA 기준에 따라 Wafer를 판정한다', '판정 정확도', '', '판정 기준 오적용', '측정기 정기 교정(MSA)'],
    ['10', 'MC', '두께 측정기', '두께 측정기가 Wafer 두께를 측정하여 합부 데이터를 제공한다', '측정 정밀도', '', '측정 오차', '검사원 정기 교육'],
    ['10', 'IM', 'Wafer', 'Wafer가 후속 공정의 기판 역할을 한다', 'Wafer 규격', '', '자재 품질 부적합', '수입검사 강화, IQC COA 확인'],
    ['10', 'EN', '검사실', '검사실이 항온항습 환경을 유지하여 측정 정밀도를 확보한다', '환경 조건', '', '환경 조건 이탈', '검사실 실시간 모니터링 + 일상점검'],
    ['20', 'MN', 'Sorter 작업자', 'Sorter 작업자가 정렬 결과를 확인하고 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Sorter 일상점검, 센서 교정'],
    ['20', 'MC', 'Sorter 장비', 'Sorter가 Wafer를 정렬하여 후속공정 투입 순서를 확보한다', '정렬 속도', '', '정렬 센서 오작동', 'Sorter 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['20', 'IM', 'Wafer Cassette', 'Wafer Cassette가 Wafer 운반·보호 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', 'Wafer Cassette 수입검사 강화 + 유효기한 관리'],
    ['20', 'EN', 'Sorter 작업영역', 'Sorter 작업영역이 청정 환경을 유지하여 오염을 방지한다', '환경 조건', '', '환경 조건 이탈', 'Sorter 작업영역 실시간 모니터링 + 일상점검'],
    ['30', 'MN', 'Scrubber 작업자', 'Scrubber 작업자가 세정 결과를 확인하고 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Scrubber PM(예방보전)'],
    ['30', 'MC', 'Scrubber 장비', 'Scrubber가 Wafer 표면을 세정하여 청정 표면을 확보한다', '세정 압력', '', '노즐 막힘', 'Scrubber 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['30', 'IM', 'DI Water', 'DI Water가 세정 매체로 이물을 제거한다', '비저항', '', 'DI Water 비저항 저하', 'DI Water 비저항 실시간 모니터링'],
    ['30', 'EN', 'Scrubber 작업영역', 'Scrubber 작업영역이 청정 환경을 유지하여 세정 품질을 확보한다', '환경 조건', '', '환경 조건 이탈', 'Scrubber 작업영역 실시간 모니터링 + 일상점검'],
    ['40', 'MN', 'Sputter 작업자', 'Sputter 작업자가 증착 결과를 확인하고 막질 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Sputter 장비 PM, Power 실시간 모니터링'],
    ['40', 'MC', 'Sputter 장비', 'Sputter 장비가 Ti/Cu를 증착하여 UBM층을 형성한다', 'DC Power', '◇', 'Power 변동', 'Sputter 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['40', 'MC', 'Sputter 장비', 'DC Power Supply가 안정 전력을 공급하여 증착 균일성을 확보한다', '전압 안정도', '', '전압 변동', 'Sputter 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['40', 'MC', 'DC Power Supply', 'Sputter 장비가 Ti/Cu를 증착하여 UBM층을 형성한다', 'DC Power', '◇', 'Power 변동', 'Sputter 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['40', 'MC', 'DC Power Supply', 'DC Power Supply가 안정 전력을 공급하여 증착 균일성을 확보한다', '전압 안정도', '', '전압 변동', 'Sputter 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['40', 'IM', 'Ti Target', 'Ti Target이 증착 소스로 UBM 접합층을 형성한다', 'Target 수명', '', 'Target 소진', '진공도 실시간 모니터링, Leak 점검'],
    ['40', 'IM', 'Ti Target', 'Cu Target이 증착 소스로 전도층을 형성한다', '', '', '', '진공도 실시간 모니터링, Leak 점검'],
    ['40', 'IM', 'Cu Target', 'Ti Target이 증착 소스로 UBM 접합층을 형성한다', 'Target 수명', '', 'Target 소진', '진공도 실시간 모니터링, Leak 점검'],
    ['40', 'IM', 'Cu Target', 'Cu Target이 증착 소스로 전도층을 형성한다', '', '', '', '진공도 실시간 모니터링, Leak 점검'],
    ['40', 'EN', '진공 챔버', '진공 챔버가 진공 환경을 유지하여 증착 품질을 확보한다', '진공도', '', '진공 누설', '진공도 실시간 모니터링, Leak 점검'],
    ['50', 'MN', 'Scrubber2 작업자', 'Scrubber2 작업자가 세정 결과를 확인하고 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Scrubber PM(예방보전)'],
    ['50', 'MC', 'Scrubber 장비', 'Scrubber가 Sputter후 이물을 제거하여 도금 품질을 확보한다', '세정 압력', '', '노즐 막힘', 'Scrubber2 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['50', 'IM', 'DI Water', 'DI Water가 세정 매체로 이물을 제거한다', '비저항', '', 'DI Water 비저항 저하', 'DI Water 수입검사 강화 + 유효기한 관리'],
    ['50', 'EN', 'Scrubber2 작업영역', 'Scrubber2 작업영역이 청정 환경을 유지하여 세정 품질을 확보한다', '환경 조건', '', '환경 조건 이탈', 'Scrubber2 작업영역 실시간 모니터링 + 일상점검'],
    ['60', 'MN', 'Coating 작업자', 'Coating 작업자가 도포 결과를 확인하고 균일성 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Coater PM, RPM 실시간 모니터링'],
    ['60', 'MC', 'Coater', 'Coater가 PR을 균일 도포하여 패턴 마스크를 형성한다', '회전 속도(RPM)', '', 'RPM 편차', 'Coating 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['60', 'IM', 'PR(Photo Resist)', 'PR이 패턴 형성을 위한 감광제 역할을 한다', '점도', '', 'PR 열화', 'PR 유효기한 관리, 냉장보관'],
    ['60', 'EN', 'Yellow Room', 'Yellow Room이 UV 차단 환경을 유지하여 PR 감광을 방지한다', '환경 조건', '', '환경 조건 이탈', 'Yellow Room 실시간 모니터링 + 일상점검'],
    ['70', 'MN', 'Exposure 작업자', 'Exposure 작업자가 노광 결과를 확인하고 패턴 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Stepper 정기 교정, 에너지 실시간 모니터링'],
    ['70', 'MC', 'Stepper/Scanner', 'Stepper가 패턴을 노광하여 Bump 위치를 정의한다', '노광 에너지', '◇', '에너지 편차', 'Exposure 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['70', 'IM', 'Mask(Reticle)', 'Mask가 패턴 원본을 제공하여 노광 정밀도를 확보한다', 'Mask CD', '', 'Mask 결함', 'Mask 정기 세정, 결함 관리'],
    ['70', 'EN', 'Exposure 챔버', 'Exposure 챔버가 온습도 환경을 유지하여 노광 정밀도를 확보한다', '환경 조건', '', '환경 조건 이탈', 'Exposure 챔버 실시간 모니터링 + 일상점검'],
    ['80', 'MN', 'Develop 작업자', 'Develop 작업자가 현상 결과를 확인하고 Opening 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Developer PM, 시간 자동제어'],
    ['80', 'MC', 'Developer', 'Developer가 PR을 현상하여 도금 Opening을 형성한다', '현상 시간', '', '현상 시간 편차', 'Develop 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['80', 'IM', '현상액', '현상액이 노광된 PR을 선택적으로 용해한다', '농도', '', '농도 편차', '농도 자동 보정 시스템'],
    ['80', 'EN', 'Develop 작업영역', 'Develop 작업영역이 온도 환경을 유지하여 현상 균일성을 확보한다', '환경 조건', '', '환경 조건 이탈', 'Develop 작업영역 실시간 모니터링 + 일상점검'],
    ['90', 'MN', 'Descum 작업자', 'Descum 작업자가 잔사 제거 결과를 확인하고 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Descum PM, Power 모니터링'],
    ['90', 'MC', 'Descum 장비', 'Descum이 PR 잔사를 제거하여 도금 접촉면을 확보한다', 'O₂ Plasma Power', '', 'Power 불안정', 'Descum 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['90', 'IM', 'O₂ Gas', 'O₂ Gas가 Plasma 생성 매체를 제공한다', '자재 규격', '', '자재 품질 부적합', 'O₂ Gas 수입검사 강화 + 유효기한 관리'],
    ['90', 'EN', 'Descum 챔버', 'Descum 챔버가 진공 환경을 유지하여 Plasma 품질을 확보한다', '환경 조건', '', '환경 조건 이탈', 'Descum 챔버 실시간 모니터링 + 일상점검'],
    ['100', 'MN', 'Plating 작업자', 'Plating 작업자가 도금 결과를 확인하고 두께 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Plating Tank PM, 전류밀도 자동제어'],
    ['100', 'MC', 'Au Plating Tank', 'Au Plating Tank가 Au를 전해도금하여 Bump Core를 형성한다', '전류밀도', '◇', '전류밀도 편차', 'Plating 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['100', 'MC', 'Au Plating Tank', '정류기가 안정 전류를 공급하여 도금 균일성을 확보한다', '전류 안정도', '', '전류 변동', 'Plating 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['100', 'MC', '정류기(Rectifier)', 'Au Plating Tank가 Au를 전해도금하여 Bump Core를 형성한다', '전류밀도', '◇', '전류밀도 편차', 'Plating 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['100', 'MC', '정류기(Rectifier)', '정류기가 안정 전류를 공급하여 도금 균일성을 확보한다', '전류 안정도', '', '전류 변동', 'Plating 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['100', 'IM', 'Au 도금액', 'Au 도금액이 Au Ion을 공급하여 Bump을 성장시킨다', '도금액 농도', '', '농도 저하', '도금액 농도 자동분석, 보충'],
    ['100', 'EN', 'Plating 작업영역', 'Plating 작업영역이 온도 환경을 유지하여 도금 균일성을 확보한다', '환경 조건', '', '환경 조건 이탈', 'Plating 작업영역 실시간 모니터링 + 일상점검'],
    ['110', 'MN', 'Strip 작업자', 'Strip 작업자가 PR 제거 결과를 확인하고 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Strip 장비 PM, 온도 자동제어'],
    ['110', 'MC', 'Strip 장비', 'Strip 장비가 PR을 제거하여 Bump 구조를 노출한다', 'Strip 온도', '', '온도 편차', 'Strip 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['110', 'IM', 'Strip 용제', 'Strip 용제가 PR 용해 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', 'Strip 용제 수입검사 강화 + 유효기한 관리'],
    ['110', 'EN', 'Strip 작업영역', 'Strip 작업영역이 배기 환경을 유지하여 안전을 확보한다', '환경 조건', '', '환경 조건 이탈', 'Strip 작업영역 실시간 모니터링 + 일상점검'],
    ['120', 'MN', 'Etch 작업자', 'Etch 작업자가 에칭 결과를 확인하고 절연 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Etch PM, 시간 자동제어'],
    ['120', 'MC', 'Etch 장비', 'Etch 장비가 Au를 선택적 에칭하여 Bump 간 절연을 확보한다', '에칭 시간', '', '에칭 시간 편차', 'Etch 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['120', 'IM', 'Au Etchant', 'Au Etchant가 Au 선택적 용해 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', 'Au Etchant 수입검사 강화 + 유효기한 관리'],
    ['120', 'EN', 'Etch 작업영역', 'Etch 작업영역이 배기 환경을 유지하여 안전을 확보한다', '환경 조건', '', '환경 조건 이탈', 'Etch 작업영역 실시간 모니터링 + 일상점검'],
    ['130', 'MN', 'TiW Etch 작업자', 'TiW Etch 작업자가 에칭 결과를 확인하고 단락 방지 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Etch PM, 온도 자동제어'],
    ['130', 'MC', 'TiW Etch 장비', 'TiW Etch 장비가 Seed Layer를 제거하여 단락을 방지한다', '에칭 온도', '', '온도 편차', 'TiW Etch 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['130', 'IM', 'TiW Etchant', 'TiW Etchant가 Seed Layer 선택적 용해 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', 'TiW Etchant 수입검사 강화 + 유효기한 관리'],
    ['130', 'EN', 'TiW Etch 작업영역', 'TiW Etch 작업영역이 배기 환경을 유지하여 안전을 확보한다', '환경 조건', '', '환경 조건 이탈', 'TiW Etch 작업영역 실시간 모니터링 + 일상점검'],
    ['140', 'MN', 'Anneal 작업자', 'Anneal 작업자가 열처리 결과를 확인하고 결합 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Anneal 장비 PM, 온도 프로파일 모니터링'],
    ['140', 'MC', 'Anneal 장비', 'Anneal 장비가 열처리로 금속 결합을 강화한다', 'Anneal 온도', '◇', '온도 과다/부족', 'Anneal 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['140', 'IM', 'N₂ Gas', 'N₂ Gas가 불활성 분위기 조성 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', 'N₂ Gas 수입검사 강화 + 유효기한 관리'],
    ['140', 'EN', 'N₂ 공급장치', 'N₂ 공급장치가 불활성 분위기를 제공하여 산화를 방지한다', 'N₂ 유량', '', '유량 부족', 'N₂ 유량 실시간 모니터링'],
    ['150', 'MN', '검사원', '검사원이 최종 판정 기준에 따라 합부를 결정한다', '판정 정확도', '', '판정 기준 오적용', 'AVI 정기 교정, 한도 견본 검증'],
    ['150', 'MC', 'AVI 장비', 'AVI가 자동외관검사로 최종 합부를 판정한다', '검사 해상도', '', '해상도 저하', '검사원 정기 교육, 한도 견본 비치'],
    ['150', 'MC', 'AVI 장비', '높이 측정기가 Bump 높이를 전수 검사한다', '측정 정밀도', '', '측정 오차', '검사원 정기 교육, 한도 견본 비치'],
    ['150', 'MC', '높이 측정기', 'AVI가 자동외관검사로 최종 합부를 판정한다', '검사 해상도', '', '해상도 저하', '검사원 정기 교육, 한도 견본 비치'],
    ['150', 'MC', '높이 측정기', '높이 측정기가 Bump 높이를 전수 검사한다', '측정 정밀도', '', '측정 오차', '검사원 정기 교육, 한도 견본 비치'],
    ['150', 'IM', '한도 견본', '한도 견본이 합부 판정 기준 제공 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', '한도 견본 수입검사 강화 + 유효기한 관리'],
    ['150', 'EN', '검사실', '검사실이 항온항습 환경을 유지하여 검사 정밀도를 확보한다', '환경 조건', '', '환경 조건 이탈', '검사실 실시간 모니터링 + 일상점검'],
    ['160', 'MN', 'Clean 작업자', 'Clean 작업자가 세정 결과를 확인하고 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Clean 장비 PM'],
    ['160', 'MC', 'Clean 장비', 'Clean 장비가 최종 세정으로 출하 전 이물을 제거한다', '세정 압력', '', '노즐 막힘', 'Clean 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['160', 'IM', 'DI Water', 'DI Water가 세정 매체로 이물 제거 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', 'DI Water 수입검사 강화 + 유효기한 관리'],
    ['160', 'EN', 'Clean 작업영역', 'Clean 작업영역이 청정 환경을 유지하여 세정 품질을 확보한다', '환경 조건', '', '환경 조건 이탈', 'Clean 작업영역 실시간 모니터링 + 일상점검'],
    ['170', 'MN', 'Scrubber3 작업자', 'Scrubber3 작업자가 세정 결과를 확인하고 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Scrubber PM'],
    ['170', 'MC', 'Scrubber 장비', 'Scrubber가 추가 세정으로 잔류 이물을 완전 제거한다', '세정 압력', '', '노즐 막힘', 'Scrubber3 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['170', 'IM', 'DI Water', 'DI Water가 세정 매체로 이물 제거 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', 'DI Water 수입검사 강화 + 유효기한 관리'],
    ['170', 'EN', 'Scrubber3 작업영역', 'Scrubber3 작업영역이 청정 환경을 유지하여 세정 품질을 확보한다', '환경 조건', '', '환경 조건 이탈', 'Scrubber3 작업영역 실시간 모니터링 + 일상점검'],
    ['180', 'MN', 'Sorter3 작업자', 'Sorter3 작업자가 정렬 결과를 확인하고 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'Sorter3 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['180', 'MC', 'Sorter 장비', 'Sorter가 최종 분류·정렬로 출하 단위를 구성한다', '정렬 속도', '', '정렬 센서 오작동', 'Wafer Cassette 수입검사 강화 + 유효기한 관리'],
    ['180', 'IM', 'Wafer Cassette', 'Wafer Cassette가 Wafer 운반·보호 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', 'Sorter3 작업영역 실시간 모니터링 + 일상점검'],
    ['180', 'EN', 'Sorter3 작업영역', 'Sorter3 작업영역이 청정 환경을 유지하여 오염을 방지한다', '환경 조건', '', '환경 조건 이탈', 'Sorter 일상점검'],
    ['190', 'MN', 'AVI 작업자', 'AVI 작업자가 검사 결과를 확인하고 합부 적합 여부를 판정한다', '작업 숙련도', '', '작업 숙련도 부족', 'AVI 정기 교정'],
    ['190', 'MC', 'AVI 장비', 'AVI가 자동외관검사로 최종 결함을 검출한다', '검사 해상도', '', '해상도 저하', 'AVI 작업자 정기 숙련도 평가 + 작업표준 교육'],
    ['190', 'IM', '한도 견본', '한도 견본이 검사 판정 기준 제공 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', '한도 견본 수입검사 강화 + 유효기한 관리'],
    ['190', 'EN', 'AVI 작업영역', 'AVI 작업영역이 청정 환경을 유지하여 검사 정밀도를 확보한다', '환경 조건', '', '환경 조건 이탈', 'AVI 작업영역 실시간 모니터링 + 일상점검'],
    ['200', 'MN', '포장 작업자', '포장 작업자가 체크리스트에 따라 출하 포장을 완료한다', '작업 숙련도', '', '체크리스트 누락', '포장 장비 PM'],
    ['200', 'MC', '포장 장비', '포장 장비가 제품을 보호 포장하여 운송 손상을 방지한다', '포장 진공도', '', '진공 누설', '출하 체크리스트 교육'],
    ['200', 'IM', '포장재', '포장재가 제품 보호 및 정전기 방지 기능을 제공한다', '자재 규격', '', '자재 품질 부적합', '포장재 수입검사 강화 + 유효기한 관리'],
    ['200', 'EN', '포장 작업영역', '포장 작업영역이 청정 환경을 유지하여 오염을 방지한다', '환경 조건', '', '환경 조건 이탈', '포장 작업영역 실시간 모니터링 + 일상점검'],
  ],
  // ═══════════════════════════════════════════════════════════════
  // FC 고장사슬 (12열) — FE:FM:FC = N:1:N
  // ═══════════════════════════════════════════════════════════════
  'FC 고장사슬': [
    ['YP', 'Particle 오염으로 인한 제품 특성 이상', '01', '파티클 초과', 'EN', 'FFU', '풍속 저하', 'FFU 풍속 정기점검', '파티클 카운터 실시간 모니터링, 매lot 전수', '4', '3', 'M'],
    ['YP', 'Wafer 표면 결함 미검출로 인한 후공정 유출', '10', '두께 규격 이탈', 'MC', '두께 측정기', '측정 오차', '측정기 정기 교정(MSA)', 'Wafer 두께 측정기 전수검사, 매lot', '3', '3', 'L'],
    ['YP', 'Wafer 표면 결함 미검출로 인한 후공정 유출', '10', 'TTV 규격 초과', 'IM', 'Wafer', '자재 품질 부적합', '수입검사 강화, IQC COA 확인', 'Wafer 두께 측정기 전수검사, 매lot', '3', '3', 'L'],
    ['YP', 'Lot 혼입으로 인한 Wafer 수율 손실', '20', '정렬 불량', 'MC', 'Sorter 장비', '정렬 센서 오작동', 'Sorter 일상점검, 센서 교정', '비전 센서 정렬 전수 확인', '3', '3', 'L'],
    ['YP', 'Particle 오염으로 인한 제품 특성 이상', '30', '세정 불량', 'MC', 'Scrubber 장비', '노즐 막힘', 'Scrubber PM(예방보전)', 'KLA 파티클 카운터 전수검사', '3', '3', 'L'],
    ['', '', '', '', 'IM', 'DI Water', 'DI Water 비저항 저하', 'DI Water 비저항 실시간 모니터링', 'KLA 파티클 카운터 전수검사', '3', '3', 'L'],
    ['YP', '전기적 Open/Short', '40', 'UBM 두께 부족', 'MC', 'Sputter 장비', 'Power 변동', 'Sputter 장비 PM, Power 실시간 모니터링', 'SEM 전수검사, 4-Point Probe 매lot 측정', '3', '4', 'M'],
    ['', '', '', '', 'MC', 'DC Power Supply', '전압 변동', '정기 교정, UPS 운용', 'SEM 전수검사, 4-Point Probe 매lot 측정', '3', '4', 'M'],
    ['', 'Bump Lift-off', '', '', 'EN', '진공 챔버', '진공 누설', '진공도 실시간 모니터링, Leak 점검', 'SEM 전수검사, 4-Point Probe 매lot 측정', '3', '4', 'M'],
    ['YP', '전기적 Open/Short', '40', '막질 불균일', 'IM', 'Ti Target', 'Target 소진', 'Target 사용량 카운터 관리', 'SEM 전수검사, 4-Point Probe 매lot 측정', '4', '4', 'M'],
    ['', '', '', '', 'IM', 'Cu Target', 'Target 소진', 'Target 사용량 카운터 관리', 'SEM 전수검사, 4-Point Probe 매lot 측정', '4', '4', 'M'],
    ['YP', 'Particle 오염으로 인한 제품 특성 이상', '50', '세정 불량', 'MC', 'Scrubber 장비', '노즐 막힘', 'Scrubber PM(예방보전)', 'KLA 파티클 카운터 전수검사', '3', '3', 'L'],
    ['YP', 'PR 두께 Spec Out으로 인한 패턴 불량', '60', 'PR 두께 불균일', 'MC', 'Coater', 'RPM 편차', 'Coater PM, RPM 실시간 모니터링', '막두께 측정기 전수검사', '3', '4', 'M'],
    ['', '', '', '', 'IM', 'PR(Photo Resist)', 'PR 열화', 'PR 유효기한 관리, 냉장보관', '막두께 측정기 전수검사', '3', '4', 'M'],
    ['YP', 'Bump간 Bridge', '70', 'CD 규격 이탈', 'MC', 'Stepper/Scanner', '에너지 편차', 'Stepper 정기 교정, 에너지 실시간 모니터링', 'CD SEM 전수측정', '3', '3', 'M'],
    ['', '', '', '', 'IM', 'Mask(Reticle)', 'Mask 결함', 'Mask 정기 세정, 결함 관리', 'CD SEM 전수측정', '3', '3', 'L'],
    ['YP', 'CD Spec Out으로 인한 Bump 형성 불량', '80', 'Under/Over develop', 'MC', 'Developer', '현상 시간 편차', 'Developer PM, 시간 자동제어', '광학현미경 샘플링 검사', '3', '4', 'M'],
    ['', '', '', '', 'IM', '현상액', '농도 편차', '농도 자동 보정 시스템', '광학현미경 샘플링 검사', '3', '4', 'M'],
    ['YP', 'PR Scum 잔류로 인한 Au Bump 형성 불량', '90', 'PR 잔사 잔류', 'MC', 'Descum 장비', 'Power 불안정', 'Descum PM, Power 모니터링', '광학현미경 샘플링 검사', '3', '4', 'M'],
    ['YP', '전기적 Open/Short', '100', '높이 편차', 'MC', 'Au Plating Tank', '전류밀도 편차', 'Plating Tank PM, 전류밀도 자동제어', '높이 측정기 전수검사, 외관 샘플링 검사', '3', '4', 'H'],
    ['', '', '', '', 'MC', '정류기(Rectifier)', '전류 변동', '정류기 정기 교정', '높이 측정기 전수검사, 외관 샘플링 검사', '3', '4', 'M'],
    ['SP', 'IMC 과성장에 의한 접합부 열화', '100', '순도 저하', 'IM', 'Au 도금액', '농도 저하', '도금액 농도 자동분석, 보충', 'XRF 분석기 매lot 분석', '4', '4', 'H'],
    ['YP', 'Bump Height Spec Out으로 인한 제품 특성 이상', '110', 'PR 잔사 잔류', 'MC', 'Strip 장비', '온도 편차', 'Strip 장비 PM, 온도 자동제어', '광학현미경 샘플링 검사', '3', '4', 'M'],
    ['YP', 'Plating 균일도 Spec Out으로 인한 Bump 특성 이상', '120', '에칭 부족/과다', 'MC', 'Etch 장비', '에칭 시간 편차', 'Etch PM, 시간 자동제어', 'SEM 전수검사', '3', '4', 'M'],
    ['YP', 'Plating 균일도 Spec Out으로 인한 Bump 특성 이상', '130', 'Under/Over etch', 'MC', 'TiW Etch 장비', '온도 편차', 'Etch PM, 온도 자동제어', 'SEM 전수검사', '3', '4', 'M'],
    ['SP', 'IMC 과성장에 의한 접합부 열화', '140', 'IMC 과성장', 'MC', 'Anneal 장비', '온도 과다/부족', 'Anneal 장비 PM, 온도 프로파일 모니터링', 'Cross-section SEM 샘플링 검사', '4', '4', 'H'],
    ['', '', '', '', 'EN', 'N₂ 공급장치', '유량 부족', 'N₂ 유량 실시간 모니터링', 'Cross-section SEM 샘플링 검사', '3', '4', 'M'],
    ['USER', '고객 라인 정지, 클레임', '150', '외관 불량', 'MC', 'AVI 장비', '해상도 저하', 'AVI 정기 교정, 한도 견본 검증', 'AVI 자동외관 전수검사', '3', '3', 'M'],
    ['', '고객 신뢰도 하락', '', '', 'MN', '검사원', '판정 기준 오적용', '검사원 정기 교육, 한도 견본 비치', 'AVI 자동외관 전수검사', '3', '3', 'M'],
    ['USER', '고객 라인 정지, 클레임', '150', '높이 규격 이탈', 'MC', '높이 측정기', '측정 오차', '측정기 정기 교정(MSA)', '높이 측정기 전수검사', '3', '3', 'M'],
    ['SP', 'Particle 오염 불량 유출로 인한 고객 기능 이상', '160', '세정 불량', 'MC', 'Clean 장비', '노즐 막힘', 'Clean 장비 PM', 'KLA 파티클 카운터 전수검사', '3', '3', 'L'],
    ['SP', 'Particle 오염 불량 유출로 인한 고객 기능 이상', '170', '세정 불량', 'MC', 'Scrubber 장비', '노즐 막힘', 'Scrubber PM', 'KLA 파티클 카운터 전수검사', '3', '3', 'L'],
    ['SP', '라벨 불일치로 인한 Lot 혼입 불량 유출', '180', '정렬 불량', 'MC', 'Sorter 장비', '정렬 센서 오작동', 'Sorter 일상점검', '비전 센서 정렬 전수 확인', '3', '3', 'L'],
    ['SP', '외관 결함 불량 유출(고객 Outgoing Defect)', '190', '외관 결함 미검출', 'MC', 'AVI 장비', '해상도 저하', 'AVI 정기 교정', 'AVI 전수 이중검사', '3', '3', 'L'],
    ['SP', '고객 Packing 기준 부적합으로 인한 납품 Reject', '200', '포장 불량', 'MC', '포장 장비', '진공 누설', '포장 장비 PM', '포장 체크리스트 전수 확인', '3', '3', 'L'],
  ],
  // ═══════════════════════════════════════════════════════════════
  // FA 통합분석 (26열)
  // ═══════════════════════════════════════════════════════════════
  'FA 통합분석': [
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Wafer 표면 청정도(Particle 농도, ea/wfr)', '01', '작업환경', '클린룸 환경을 유지하여 오염을 방지한다', '파티클 수', '', 'EN', 'FFU', 'FFU가 HEPA 필터로 파티클을 제거하여 청정도를 유지한다', '풍속', '', 'Particle 오염으로 인한 제품 특성 이상', '파티클 초과', '풍속 저하', '5', '4', '3', 'M', '파티클 카운터 실시간 모니터링', 'KLA 파티클 검사', '', '', '3', ''],
    ['YP', '표면 이물이 제거된 청정 Wafer를 후공정에 제공한다', 'Wafer 표면 외관 결함 부재(Visual Defect Absence)', '10', 'IQA(수입검사)', '입고 자재의 품질을 확인하여 불량 자재 유입을 방지한다', 'Wafer 두께', '', 'MC', '두께 측정기', '두께 측정기가 Wafer 두께를 측정하여 합부 데이터를 제공한다', '측정 정밀도', '', 'Wafer 표면 결함 미검출로 인한 후공정 유출', '두께 규격 이탈', '측정 오차', '5', '3', '3', 'L', 'Wafer 두께 측정기 전수검사', 'SPC 관리도', '', '', '', ''],
    ['YP', '표면 이물이 제거된 청정 Wafer를 후공정에 제공한다', 'Wafer 표면 외관 결함 부재(Visual Defect Absence)', '10', 'IQA(수입검사)', '입고 자재의 품질을 확인하여 불량 자재 유입을 방지한다', 'Wafer TTV', '★', 'IM', 'Wafer', 'Wafer가 후속 공정의 기판 역할을 한다', 'Wafer 규격', '', 'Wafer 표면 결함 미검출로 인한 후공정 유출', 'TTV 규격 초과', '자재 품질 부적합', '5', '3', '3', 'L', 'Wafer 두께 측정기 전수검사', '', '수입검사 강화', '자재 유효기한 관리', '', ''],
    ['YP', 'Wafer 표면 결함 부재 및 Lot 식별 정확성이 확보된 입고 Wafer를 제공한다', 'Lot 식별 정확도(OCR ID Matching Accuracy)', '20', 'Sorter', 'Wafer를 정렬·분류하여 후속공정 투입 순서를 확보한다', '정렬 정확도', '', 'MC', 'Sorter 장비', 'Sorter가 Wafer를 정렬하여 후속공정 투입 순서를 확보한다', '정렬 속도', '', 'Lot 혼입으로 인한 Wafer 수율 손실', '정렬 불량', '정렬 센서 오작동', '5', '3', '3', 'L', '비전 센서 정렬 확인', '', '', '', '', ''],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Wafer 표면 청정도(Particle 농도, ea/wfr)', '30', 'Scrubber', 'Wafer 표면 이물을 제거하여 청정 표면을 확보한다', '파티클 잔류수', '', 'MC', 'Scrubber 장비', 'Scrubber가 Wafer 표면을 세정하여 청정 표면을 확보한다', '세정 압력', '', 'Particle 오염으로 인한 제품 특성 이상', '세정 불량', '노즐 막힘', '5', '3', '3', 'L', 'KLA 파티클 검사', 'KLA 파티클 검사', '', '', '', ''],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Wafer 표면 청정도(Particle 농도, ea/wfr)', '30', 'Scrubber', 'Wafer 표면 이물을 제거하여 청정 표면을 확보한다', '파티클 잔류수', '', 'IM', 'DI Water', 'DI Water가 세정 매체로 이물을 제거한다', '비저항', '', 'Particle 오염으로 인한 제품 특성 이상', '세정 불량', 'DI Water 비저항 저하', '5', '3', '3', 'L', 'KLA 파티클 검사', 'KLA 파티클 검사', '', '', '', ''],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', '40', 'UBM Sputter', 'Ti/Cu UBM 증착으로 Bump 접합층을 형성한다', 'UBM 두께', '★', 'MC', 'Sputter 장비', 'DC Power Supply가 안정 전력을 공급하여 증착 균일성을 확보한다', '전압 안정도', '', '전기적 Open/Short', 'UBM 두께 부족', 'Power 변동', '7', '3', '4', 'M', 'SEM 검사, 4-Point Probe', 'SPC 관리도', '', '', '', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', '40', 'UBM Sputter', 'Ti/Cu UBM 증착으로 Bump 접합층을 형성한다', 'UBM 두께', '★', 'MC', 'DC Power Supply', 'DC Power Supply가 안정적인 전압을 공급하여 Sputter Power를 유지한다', '전압 안정도', '', '전기적 Open/Short', 'UBM 두께 부족', '전압 변동', '7', '3', '4', 'M', 'SEM 검사, 4-Point Probe', 'SPC 관리도', '', '', '', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', '40', 'UBM Sputter', 'Ti/Cu UBM 증착으로 Bump 접합층을 형성한다', 'UBM 두께', '★', 'EN', '진공 챔버', '진공 챔버가 진공 환경을 유지하여 증착 품질을 확보한다', '진공도', '', 'Bump Lift-off', 'UBM 두께 부족', '진공 누설', '7', '3', '4', 'M', 'SEM 검사, 4-Point Probe', 'SPC 관리도', '', '', '', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', '40', 'UBM Sputter', 'Ti/Cu UBM 증착으로 Bump 접합층을 형성한다', '막질 균일도', '', 'IM', 'Ti Target', 'Cu Target이 증착 소스로 전도층을 형성한다', 'Target 수명', '', '전기적 Open/Short', '막질 불균일', 'Target 소진', '7', '4', '4', 'M', 'SEM 검사, 4-Point Probe', '', 'Target 사용량 카운터 관리', '수명 예측 교체', '3', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', '40', 'UBM Sputter', 'Ti/Cu UBM 증착으로 Bump 접합층을 형성한다', '막질 균일도', '', 'IM', 'Cu Target', 'Cu Target이 Cu 증착원으로 Cu 박막층을 형성한다', 'Target 수명', '', '전기적 Open/Short', '막질 불균일', 'Target 소진', '7', '4', '4', 'M', 'SEM 검사, 4-Point Probe', '', 'Target 사용량 카운터 관리', '수명 예측 교체', '3', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Wafer 표면 청정도(Particle 농도, ea/wfr)', '50', 'Scrubber2', 'Sputter후 표면 이물을 제거하여 도금 품질을 확보한다', '파티클 잔류수', '', 'MC', 'Scrubber 장비', 'Scrubber가 Sputter후 이물을 제거하여 도금 품질을 확보한다', '세정 압력', '', 'Particle 오염으로 인한 제품 특성 이상', '세정 불량', '노즐 막힘', '5', '3', '3', 'L', 'KLA 파티클 검사', 'KLA 파티클 검사', '', '', '', ''],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'PR 도포 두께(PR Thickness, μm)', '60', 'PR Coating', 'PR을 도포하여 도금 패턴 마스크를 형성한다', 'PR 두께', '', 'MC', 'Coater', 'Coater가 PR을 균일 도포하여 패턴 마스크를 형성한다', '회전 속도(RPM)', '', 'PR 두께 Spec Out으로 인한 패턴 불량', 'PR 두께 불균일', 'RPM 편차', '6', '3', '4', 'M', '막두께 측정기 검사', 'SPC 관리도', '설비 예방보전(PM) 계획 수립', 'Interlock 설정', '', '3'],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'PR 도포 두께(PR Thickness, μm)', '60', 'PR Coating', 'PR을 도포하여 도금 패턴 마스크를 형성한다', 'PR 두께', '', 'IM', 'PR(Photo Resist)', 'PR이 패턴 형성을 위한 감광제 역할을 한다', '점도', '', 'PR 두께 Spec Out으로 인한 패턴 불량', 'PR 두께 불균일', 'PR 열화', '6', '3', '4', 'M', '막두께 측정기 검사', 'SPC 관리도', '', '', '', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', '70', 'Exposure', 'PR을 노광하여 Bump 패턴을 전사한다', 'CD(Critical Dimension)', '★', 'MC', 'Stepper/Scanner', 'Stepper가 패턴을 노광하여 Bump 위치를 정의한다', '노광 에너지', '◇', 'Bump간 Bridge', 'CD 규격 이탈', '에너지 편차', '7', '3', '3', 'M', 'CD SEM 측정', 'SPC 관리도', '', '', '', ''],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', '70', 'Exposure', 'PR을 노광하여 Bump 패턴을 전사한다', 'CD(Critical Dimension)', '★', 'IM', 'Mask(Reticle)', 'Mask가 패턴 원본을 제공하여 노광 정밀도를 확보한다', 'Mask CD', '', 'Bump간 Bridge', 'CD 규격 이탈', 'Mask 결함', '7', '3', '3', 'L', 'CD SEM 측정', 'SPC 관리도', '', '', '', ''],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'Photo Open CD(Critical Dimension, μm)', '80', 'Develop', 'PR을 현상하여 도금 Opening을 확보한다', 'Opening 정확도', '', 'MC', 'Developer', 'Developer가 PR을 현상하여 도금 Opening을 형성한다', '현상 시간', '', 'CD Spec Out으로 인한 Bump 형성 불량', 'Under/Over develop', '현상 시간 편차', '6', '3', '4', 'M', '광학현미경 검사', '', '', '', '', '3'],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'Photo Open CD(Critical Dimension, μm)', '80', 'Develop', 'PR을 현상하여 도금 Opening을 확보한다', 'Opening 정확도', '', 'IM', '현상액', '현상액이 노광된 PR을 선택적으로 용해한다', '농도', '', 'CD Spec Out으로 인한 Bump 형성 불량', 'Under/Over develop', '농도 편차', '6', '3', '4', 'M', '광학현미경 검사', '', '수입검사 강화', '자재 유효기한 관리', '', '3'],
    ['YP', '설계 Pattern이 정밀하게 형성된 PR 도포 Wafer를 제공한다', 'PR Scum 잔류 부재(PR Scum Absence)', '90', 'Descum', 'PR 잔사를 제거하여 도금 접촉면을 확보한다', 'PR 잔사 수', '', 'MC', 'Descum 장비', 'Descum이 PR 잔사를 제거하여 도금 접촉면을 확보한다', 'O₂ Plasma Power', '', 'PR Scum 잔류로 인한 Au Bump 형성 불량', 'PR 잔사 잔류', 'Power 불안정', '5', '3', '4', 'M', '광학현미경 검사', '', '', '', '', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', '100', 'Au Plating', 'Au 전해도금으로 접합부 금속층을 형성한다', 'Au Bump 높이', '★', 'MC', 'Au Plating Tank', '정류기가 안정 전류를 공급하여 도금 균일성을 확보한다', '전류 안정도', '', '전기적 Open/Short', '높이 편차', '전류밀도 편차', '7', '3', '4', 'H', '높이 측정기, 외관검사', '', '', '', '', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 형상 적합성(Bump Shape Integrity)', '100', 'Au Plating', 'Au 전해도금으로 접합부 금속층을 형성한다', 'Au Bump 높이', '★', 'MC', '정류기(Rectifier)', '정류기가 직류 전류를 공급하여 도금 전류밀도를 제어한다', '전류 안정도', '', '전기적 Open/Short', '높이 편차', '전류 변동', '7', '3', '4', 'M', '높이 측정기, 외관검사', '', '', '', '', '3'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'IMC 두께(IMC Thickness, μm)', '100', 'Au Plating', 'Au 전해도금으로 접합부 금속층을 형성한다', 'Au 순도', '', 'IM', 'Au 도금액', 'Au 도금액이 Au Ion을 공급하여 Bump을 성장시킨다', '도금액 농도', '', 'IMC 과성장에 의한 접합부 열화', '순도 저하', '농도 저하', '7', '4', '4', 'H', 'XRF 분석', '', '수입검사 강화', '자재 유효기한 관리', '3', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 높이(Bump Height, μm)', '110', 'PR Strip', 'PR 제거를 통해 Bump 구조를 노출한다', 'PR 잔사', '', 'MC', 'Strip 장비', 'Strip 장비가 PR을 제거하여 Bump 구조를 노출한다', 'Strip 온도', '', 'Bump Height Spec Out으로 인한 제품 특성 이상', 'PR 잔사 잔류', '온도 편차', '6', '3', '4', 'M', '광학현미경 검사', '', '', '', '', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 두께 균일도(Plating Uniformity, %)', '120', 'Au Etch', '불필요 Au를 에칭하여 Bump 간 절연을 확보한다', '에칭 잔류물', '', 'MC', 'Etch 장비', 'Etch 장비가 Au를 선택적 에칭하여 Bump 간 절연을 확보한다', '에칭 시간', '', 'Plating 균일도 Spec Out으로 인한 Bump 특성 이상', '에칭 부족/과다', '에칭 시간 편차', '6', '3', '4', 'M', 'SEM 검사', '', '', '', '', '3'],
    ['YP', 'Au Bump가 규격 높이와 균일도로 형성된 Wafer를 제공한다', 'Au Bump 두께 균일도(Plating Uniformity, %)', '130', 'TiW Etch', '불필요 Seed Layer를 제거하여 Bump 간 단락을 방지한다', 'Seed 잔류물', '', 'MC', 'TiW Etch 장비', 'TiW Etch 장비가 Seed Layer를 제거하여 단락을 방지한다', '에칭 온도', '', 'Plating 균일도 Spec Out으로 인한 Bump 특성 이상', 'Under/Over etch', '온도 편차', '6', '3', '4', 'M', 'SEM 검사', '', '', '', '', '3'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'IMC 두께(IMC Thickness, μm)', '140', 'Anneal', '열처리로 Bump 금속 결합을 강화한다', 'IMC 두께', '', 'MC', 'Anneal 장비', 'Anneal 장비가 열처리로 금속 결합을 강화한다', 'Anneal 온도', '◇', 'IMC 과성장에 의한 접합부 열화', 'IMC 과성장', '온도 과다/부족', '7', '4', '4', 'H', 'Cross-section SEM', '', '', '', '3', '3'],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'IMC 두께(IMC Thickness, μm)', '140', 'Anneal', '열처리로 Bump 금속 결합을 강화한다', 'IMC 두께', '', 'EN', 'N₂ 공급장치', 'N₂ 공급장치가 불활성 분위기를 제공하여 산화를 방지한다', 'N₂ 유량', '', 'IMC 과성장에 의한 접합부 열화', 'IMC 과성장', '유량 부족', '7', '3', '4', 'M', 'Cross-section SEM', '', '', '', '', '3'],
    ['USER', 'RoHS·REACH 규제 유해물질 기준을 준수하는 Wafer를 제공한다', 'RoHS 유해물질 기준 적합성(RoHS Compliance)', '150', 'Final Inspection', '최종 외관·치수를 검사하여 출하 합부를 판정한다', 'Bump 외관', '', 'MC', 'AVI 장비', '높이 측정기가 Bump 높이를 전수 검사한다', '측정 정밀도', '', '고객 라인 정지, 클레임', '외관 불량', '해상도 저하', '8', '3', '3', 'M', 'AVI(자동외관검사)', 'AVI 2차 검사', '', '', '', ''],
    ['USER', 'RoHS·REACH 규제 유해물질 기준을 준수하는 Wafer를 제공한다', 'RoHS 유해물질 기준 적합성(RoHS Compliance)', '150', 'Final Inspection', '최종 외관·치수를 검사하여 출하 합부를 판정한다', 'Bump 높이', '★', 'MC', '높이 측정기', '높이 측정기가 Bump 높이를 전수 측정하여 합부 데이터를 제공한다', '측정 정밀도', '', '고객 라인 정지, 클레임', '높이 규격 이탈', '측정 오차', '8', '3', '3', 'M', '높이 측정기 전수검사', '', '', '', '', ''],
    ['USER', 'ESD 손상 방지 기준(ANSI/ESD S20.20)을 준수하는 공정 환경을 제공한다', 'REACH SVHC 규제 물질 제한 적합성(REACH Compliance)', '150', 'Final Inspection', '최종 외관·치수를 검사하여 출하 합부를 판정한다', 'Bump 외관', '', 'MN', '검사원', '검사원이 최종 판정 기준에 따라 합부를 결정한다', '판정 정확도', '', '고객 신뢰도 하락', '외관 불량', '판정 기준 오적용', '5', '3', '3', 'M', 'AVI(자동외관검사)', 'AVI 2차 검사', '', '', '', ''],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다', 'Wafer 표면 청정도(Particle 농도, ea/wfr)', '160', 'Clean', '최종 세정으로 출하 전 이물을 제거한다', '파티클 잔류수', '', 'MC', 'Clean 장비', 'Clean 장비가 최종 세정으로 출하 전 이물을 제거한다', '세정 압력', '', 'Particle 오염 불량 유출로 인한 고객 기능 이상', '세정 불량', '노즐 막힘', '6', '3', '3', 'L', 'KLA 파티클 검사', 'KLA 파티클 검사', '', '', '', ''],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다', 'Wafer 표면 청정도(Particle 농도, ea/wfr)', '170', 'Scrubber3', '추가 세정으로 잔류 이물을 완전 제거한다', '파티클 잔류수', '', 'MC', 'Scrubber 장비', 'Scrubber가 추가 세정으로 잔류 이물을 완전 제거한다', '세정 압력', '', 'Particle 오염 불량 유출로 인한 고객 기능 이상', '세정 불량', '노즐 막힘', '6', '3', '3', 'L', 'KLA 파티클 검사', 'KLA 파티클 검사', '', '', '', ''],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Bump 높이 균일도(Plating Uniformity, %)', '180', 'Sorter3', '최종 분류·정렬로 출하 단위를 구성한다', '정렬 정확도', '', 'MC', 'Sorter 장비', 'Sorter가 최종 분류·정렬로 출하 단위를 구성한다', '정렬 속도', '', '라벨 불일치로 인한 Lot 혼입 불량 유출', '정렬 불량', '정렬 센서 오작동', '6', '3', '3', 'L', '비전 센서 정렬 확인', '', '', '', '', ''],
    ['SP', '외관 결함이 없고 고객 Packing 기준에 맞게 포장된 Wafer를 제공한다', 'Au Bump 전단강도(Shear Strength, gf) — ★', '190', 'AVI', '자동외관검사로 최종 품질을 확인한다', 'Defect 수', '', 'MC', 'AVI 장비', 'AVI가 자동외관검사로 최종 결함을 검출한다', '검사 해상도', '', '외관 결함 불량 유출(고객 Outgoing Defect)', '외관 결함 미검출', '해상도 저하', '6', '3', '3', 'L', 'AVI 이중 검사', 'AVI 2차 검사', '', '', '', ''],
    ['SP', 'Au Bump 전단강도 및 높이가 고객 규격을 만족하는 Wafer를 제공한다', 'Au Bump 높이 균일도(Bump Co-planarity, μm) — ★', '200', 'OGI/Packing', '출하 검사 및 포장으로 제품을 보호한다', '포장 상태', '', 'MC', '포장 장비', '포장 장비가 제품을 보호 포장하여 운송 손상을 방지한다', '포장 진공도', '', '고객 Packing 기준 부적합으로 인한 납품 Reject', '포장 불량', '진공 누설', '8', '3', '3', 'L', '포장 체크리스트 확인', '', '', '', '', ''],
  ],
};

/**
 * ★★★ 2026-03-09: FC 시트 병합셀 적용 (v5.1 — N:1:N 계층적 병합) ★★★
 *
 * FC 고장사슬 시트 — 12컬럼 (FE구분, FE, 공정번호, FM, 4M, WE, FC, PC, DC, O, D, AP)
 *
 * N:1:N 병합 규칙 (Process-first, FM 중심축):
 *   1) Process 병합: col3(C:공정번호) — processNo (1차 축)
 *   2) FM 병합: col4(D:FM) — processNo|fmText (2차 축, Process 내 경계)
 *   3) Cat 병합: col1(A:FE구분) — processNo|fmText|scope (FM 내 경계)
 *   4) FE 병합: col2(B:FE) — processNo|fmText|scope|feText (FM 내 경계)
 */
function applyFCSheetMergeCells(
  worksheet: ExcelJS.Worksheet,
  rows: string[][],
) {
  if (rows.length < 2) return;

  /** 연속 span 계산 (범용) */
  function calcSpans(keyFn: (r: string[]) => string): Array<{ start: number; end: number }> {
    const spans: Array<{ start: number; end: number }> = [];
    let i = 0;
    while (i < rows.length) {
      const key = keyFn(rows[i]);
      let j = i + 1;
      while (j < rows.length && keyFn(rows[j]) === key) j++;
      if (j - i >= 2) {
        spans.push({ start: i, end: j - 1 });
      }
      i = j;
    }
    return spans;
  }

  /** 병합 실행 헬퍼 */
  function mergeCol(spans: Array<{ start: number; end: number }>, excelCol: number) {
    for (const { start, end } of spans) {
      const startExcelRow = start + 2;   // header=row1, data starts row2
      const endExcelRow = end + 2;
      worksheet.mergeCells(startExcelRow, excelCol, endExcelRow, excelCol);
      const masterCell = worksheet.getCell(startExcelRow, excelCol);
      masterCell.alignment = {
        ...masterCell.alignment,
        vertical: 'middle',
        horizontal: 'center',
      };
    }
  }

  // ★ N:1:N 계층적 병합 (FM 중심축, FM 경계로 FE 제한)
  // 12열: [0]FE구분, [1]FE, [2]공정번호, [3]FM, [4]4M, [5]WE, [6]FC, [7]PC, [8]DC, [9]O, [10]D, [11]AP

  // 1) Process 병합: col3(C:공정번호) — 1차 축
  mergeCol(calcSpans(r => r[2] || ''), 3);

  // 2) FM 병합: col4(D:FM) — processNo|fmText (Process 내 경계)
  const fmSpans = calcSpans(r => `${r[2] || ''}|${r[3] || ''}`);
  mergeCol(fmSpans, 4);

  // 3) Cat 병합: col1(A:FE구분) — processNo|fmText|scope (FM 내 경계)
  mergeCol(calcSpans(r => `${r[2] || ''}|${r[3] || ''}|${r[0] || ''}`), 1);

  // 4) FE 병합: col2(B:FE) — processNo|fmText|scope|feText (FM 내 경계)
  mergeCol(calcSpans(r => `${r[2] || ''}|${r[3] || ''}|${r[0] || ''}|${r[1] || ''}`), 2);
}

/**
 * ★ v6.0: Master DB 실시간 샘플 다운로드
 * masterFmeaId 지정 시 → Master DB에서 flatItems + failureChains 가져와 생성 (100% 일치 보장)
 * masterFmeaId 미지정 시 → 하드코딩 SAMPLE_DATA fallback
 */
export async function downloadSampleTemplate(customFileName?: string, manualMode = false, masterFmeaId?: string) {
  // ★ Master DB에서 실시간 데이터 fetch
  if (masterFmeaId) {
    try {
      const res = await fetch(`/api/pfmea/master?fmeaId=${masterFmeaId}&includeItems=true`);
      if (res.ok) {
        const data = await res.json();
        const ds = data.dataset;
        if (ds?.flatItems?.length > 0) {
          const flatData = ds.flatItems.map((item: any) => ({
            processNo: item.processNo || '',
            itemCode: item.itemCode || '',
            value: item.value || '',
            m4: item.m4 || undefined,
            specialChar: item.specialChar || undefined,
            belongsTo: item.belongsTo || undefined,
          }));
          const chains = (ds.failureChains || []).map((ch: any) => ({
            processNo: ch.processNo || '',
            m4: ch.m4 || undefined,
            fcValue: ch.fcValue || '',
            fmValue: ch.fmValue || '',
            feValue: ch.feValue || '',
            feScope: ch.feScope || undefined,
            workElement: ch.workElement || undefined,
            pcValue: ch.pcValue || undefined,
            dcValue: ch.dcValue || undefined,
            severity: ch.severity || undefined,
            occurrence: ch.occurrence || undefined,
            detection: ch.detection || undefined,
          }));
          const fileName = customFileName || `PFMEA_Master_Sample_${masterFmeaId}_${TEMPLATE_VERSION}`;
          await downloadDataTemplate(flatData, fileName, chains);
          return;
        }
      }
    } catch (e) {
      console.error('[downloadSampleTemplate] Master DB fetch failed, falling back to static data:', e);
    }
  }

  // fallback: 하드코딩 SAMPLE_DATA
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = `FMEA Smart System ${TEMPLATE_VERSION}`;
  workbook.created = new Date();

  const defs = SHEET_DEFINITIONS
    .filter(d => !(d as any).legacy)
    .filter(d => !manualMode || !MANUAL_MODE_EXCLUDE.has(d.name));

  defs.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    const sampleRows = SAMPLE_DATA[def.name] || [];
    const minWidths = def.headers.map((h, i) => {
      if (h === '4M') return 8;
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

    if (def.name === 'FC 고장사슬' && sampleRows.length > 1) {
      applyFCSheetMergeCells(worksheet, sampleRows);
    }

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = customFileName || `PFMEA_Master_Sample_${TEMPLATE_VERSION}`;
  await downloadExcelBuffer(buffer, fileName);
}

/** 공통 다운로드 헬퍼 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  await downloadExcelBuffer(buffer, fileName);
}

