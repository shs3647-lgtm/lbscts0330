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

const SHEET_DEFINITIONS = [
  { name: 'L2-1(A1) 공정번호', headers: ['L2-1.공정번호', 'L2-2.공정명', '공정유형코드(선택)'], color: HEADER_COLOR, required: [true, true, false], legacyName: 'A1', guide: '' },
  { name: 'L2-2(A2) 공정명', headers: ['L2-1.공정번호', 'L2-2.공정명'], color: HEADER_COLOR, required: [true, true], legacyName: 'A2', guide: '' },
  { name: 'L2-3(A3) 공정기능', headers: ['L2-1.공정번호', 'L2-3.공정기능(설명)'], color: HEADER_COLOR, required: [true, false], legacyName: 'A3', guide: '작성: [대상물]을 [처리방법]으로 [처리]하여 [결과]를 확보한다 | 금지: 파라미터 수치, 검사절차, 불량방지 문구' },
  { name: 'L2-4(A4) 제품특성', headers: ['L2-1.공정번호', 'L2-4.제품특성(Wafer 결과값 명사)', '특별특성'], color: HEADER_COLOR, required: [true, false, false], legacyName: 'A4', guide: '제품(Wafer)에서 측정하는 품질특성 명사 | 금지: 온도·농도·에너지 등 공정파라미터(→B3), Check·Inspection 동사형' },
  { name: 'L2-5(A5) 고장형태', headers: ['L2-1.공정번호', 'L2-5.고장형태(A4이탈 현상)'], color: HEADER_COLOR, required: [true, false], legacyName: 'A5', guide: '[A4특성명]+[이탈유형]: 규격이탈/미달/초과/미형성/부재/잔류 | 금지: 원인(→B4), 공정특성이탈(→B4)' },
  // v3.1.1: A6(검출관리) FC 시트 컬럼으로 복원 (별도 시트는 제거 유지)
  { name: 'L3-1(B1) 작업요소', headers: ['L2-1.공정번호', '4M', 'L3-1.작업요소(설비·재료·인원 고유명)'], color: HEADER_COLOR, required: [true, true, false], legacyName: 'B1', guide: 'MC=설비고유명, MN=직무역할명, IM=약품고유명 | B2★작업요소·FC(WE)와 완전 동일 표기 필수' },
  { name: 'L3-2(B2) 요소기능', headers: ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-2.요소기능'], color: HEADER_COLOR, required: [true, true, false, false], legacyName: 'B2', guide: '[B1]이 [행위]하여 [결과]를 제공한다 | 주어=B1명칭, 결과 명시 필수' },
  { name: 'L3-3(B3) 공정특성', headers: ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-3.공정특성(설비·약품 파라미터)', '특별특성'], color: HEADER_COLOR, required: [true, true, false, false, false], legacyName: 'B3', guide: '설비·약품에서 설정·모니터링하는 입력 파라미터 명사+(단위) | 금지: A4 제품특성, B2 요소기능 내용' },
  { name: 'L3-4(B4) 고장원인', headers: ['L2-1.공정번호', '4M', 'L3-4.고장원인(B3이탈 원인)'], color: HEADER_COLOR, required: [true, true, false], legacyName: 'B4', guide: 'B3파라미터 이탈의 직접 원인 | 금지: 고장형태(A5) 현상, 대책·행동 기술' },
  // v3.1.1: B5(예방관리) FC 시트 컬럼으로 복원 (별도 시트는 제거 유지)
  { name: 'L1-1(C1) 구분', headers: ['L1-1.구분'], color: HEADER_COLOR, required: [true], legacyName: 'C1', guide: 'YP(Your Plant), SP(Ship to Plant), USER 중 택1' },
  { name: 'L1-2(C2) 제품기능', headers: ['L1-1.구분', 'L1-2.제품(반)기능'], color: HEADER_COLOR, required: [true, false], legacyName: 'C2', guide: '' },
  { name: 'L1-3(C3) 요구사항', headers: ['L1-1.구분', 'L1-3.제품(반)요구사항'], color: HEADER_COLOR, required: [true, false], legacyName: 'C3', guide: '' },
  { name: 'L1-4(C4) 고장영향', headers: ['L1-1.구분', 'L1-4.고장영향'], color: HEADER_COLOR, required: [true, false], legacyName: 'C4', guide: '' },
  // ★ FC 고장사슬 (v5.1: 12열 N:1:N — S 컬럼 삭제, Process-first 정렬)
  { name: 'FC 고장사슬', headers: ['FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)', '4M', '작업요소(WE)', 'FC(고장원인)', 'B5.예방관리(발생 전 방지)', 'A6.검출관리(발생 후 검출)', 'O', 'D', 'AP'], color: 'B91C1C', required: [false, false, true, true, false, false, false, false, false, false, false, false], legacyName: 'FC', guide: 'B5=원인 발생 전 방지 장치·시스템·절차 | A6=발생 후 출하 전 검출 장비+방법+빈도' },
  // ★ 16번째: FA 통합분석 (ALL — v2.7.3: 26→28열, O추천/D추천 추가)
  // v3.1.1: FA 통합분석 26열 유지 (PC/DC는 FC 시트에서 별도 관리)
  { name: 'FA 통합분석', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '공정No(A1)', '공정명(A2)', '공정기능(A3)', '제품특성(A4)', '특별특성(A4)', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성(B3)', '고장영향(C4)', '고장형태(A5)', '고장원인(B4)', 'S', 'O', 'D', 'AP', 'DC추천1', 'DC추천2', 'PC추천1', 'PC추천2', 'O추천', 'D추천'], color: '1E40AF', required: [false, false, false, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, false, false, false, false, false, false, false], legacyName: 'FA', guide: '' },
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
      'L2-1.공정번호': 14, 'L2-2.공정명': 20, '공정유형코드(선택)': 16,
      'L2-3.공정기능(설명)': 40, 'L2-4.제품특성': 22, '특별특성': 10, 'L2-5.고장형태': 25,
      '4M': 8,
      'L3-1.작업요소(설비)': 28, 'L3-2.요소기능': 35, 'L3-3.공정특성': 22,
      'L3-4.고장원인': 30,
      'L1-1.구분': 14, 'L1-2.제품(반)기능': 40, 'L1-3.제품(반)요구사항': 25, 'L1-4.고장영향': 30,
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
  const fileName = customFileName || `PFMEA_기초정보_템플릿_${TEMPLATE_VERSION}`;
  await downloadExcelBuffer(buffer, fileName);
}

// =====================================================
// ★★★ 실제 데이터 기반 템플릿 다운로드 ★★★
// =====================================================

/** itemCode → 시트명 매핑 */
const ITEM_TO_SHEET: Record<string, string> = {
  A1: 'L2-1(A1) 공정번호', A2: 'L2-2(A2) 공정명', A3: 'L2-3(A3) 공정기능', A4: 'L2-4(A4) 제품특성',
  A5: 'L2-5(A5) 고장형태',
  // v3.1.1: A6(검출관리) FC 시트 컬럼으로 복원 (별도 시트는 제거 유지)
  B1: 'L3-1(B1) 작업요소', B2: 'L3-2(B2) 요소기능', B3: 'L3-3(B3) 공정특성',
  B4: 'L3-4(B4) 고장원인',
  // v3.1.1: B5(예방관리) FC 시트 컬럼으로 복원 (별도 시트는 제거 유지)
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

  // ★ FC 고장사슬 시트 데이터 (v5.1: 12컬럼 N:1:N — S 삭제, Process-first 정렬)
  if (failureChains && failureChains.length > 0) {
    // ★ Process-first 정렬 (N:1:N — FM 중심축): processNo → fmText → feScope → feText
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
      fc.feScope || '',                                // FE구분 (YP/SP/USER)
      fc.feValue || '',                                // FE(고장영향)
      fc.processNo,                                    // L2-1.공정번호
      fc.fmValue,                                      // FM(고장형태)
      fc.m4 || '',                                     // 4M
      fc.workElement || '',                            // 작업요소(WE)
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
    // 최소 너비: 첫 컬럼(공정번호/구분)=12, 4M=8, 기타=12
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

    // ★★★ 2026-02-28: FC 시트 병합셀 적용 (v2.8.0) ★★★
    if (def.name === 'FC 고장사슬' && rows.length > 1) {
      applyFCSheetMergeCells(worksheet, rows);
    }

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  });

  // ★★★ 2026-02-24: VERIFY 시트 추가 — 엑셀 수식 기반 검증용 ★★★
  addVerifySheet(workbook, sheetData);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = customFileName || `PFMEA_기초정보_데이터_${TEMPLATE_VERSION}`;
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

/** 샘플 데이터 (다중 시트용) - 자전거 프레임 제조 공정 기반 */
const SAMPLE_DATA: Record<string, string[][]> = {
  // ═══════════════════════════════════════════════════════════════
  // A계열: L2 공정 레벨
  // ═══════════════════════════════════════════════════════════════
  'L2-1(A1) 공정번호': [
    ['01', '공통', 'CMN'],
    ['10', '컷팅', 'MFG'],
    ['20', '프레스', 'MFG'],
    ['30', '용접', 'WLD'],
    ['40', '도장', 'PNT'],
    ['50', '조립', 'ASM'],
    ['60', '검사', 'INS'],
  ],
  'L2-2(A2) 공정명': [
    ['01', '공통'],
    ['10', '컷팅'],
    ['20', '프레스'],
    ['30', '용접'],
    ['40', '도장'],
    ['50', '조립'],
    ['60', '검사'],
  ],
  'L2-3(A3) 공정기능': [
    ['01', '공통 공정의 기능 및 환경 조건을 관리한다'],
    ['10', '원자재를 도면에서 지정된 치수로 절단한다'],
    ['20', '절단된 소재를 도면에 따라 성형 가공한다'],
    ['30', '가공된 부품을 도면에 따라 용접하여 접합한다'],
    ['40', '용접된 제품에 도장하여 표면을 보호한다'],
    ['50', '도장된 부품을 조립하여 완제품을 구성한다'],
    ['60', '완제품의 품질을 최종 검사한다'],
  ],
  'L2-4(A4) 제품특성': [
    ['10', '소재 외경', ''],
    ['10', '소재 두께', ''],
    ['10', '소재 길이', ''],
    ['20', 'BURR', ''],
    ['20', '성형 치수', '◇'],
    ['30', '외관', ''],
    ['30', '용접강도', '◇'],
    ['40', '도막 두께', '◇'],
    ['40', '도막 밀착성', ''],
    ['40', '외관', ''],
    ['50', '조립 토크', '◇'],
    ['50', '체결 상태', ''],
    ['60', '외관', ''],
    ['60', '치수 정밀도', '◇'],
    ['60', '기능 시험', '◇'],
  ],
  'L2-5(A5) 고장형태': [
    ['10', '소재 외경 부적합'],
    ['10', '소재 두께 부적합'],
    ['10', '소재 길이 부적합'],
    ['20', 'BURR 과다'],
    ['20', '성형 치수 부적합'],
    ['30', '외관 부적합'],
    ['30', '용접강도 미달'],
    ['40', '도막 두께 부적합'],
    ['40', '도막 박리'],
    ['40', '외관 부적합'],
    ['50', '조립 토크 부적합'],
    ['50', '체결 불량'],
    ['60', '외관 불량 미검출'],
    ['60', '치수 불량 미검출'],
    ['60', '기능 불량 미검출'],
  ],

  // ═══════════════════════════════════════════════════════════════
  // B계열: L3 작업요소 레벨
  // ═══════════════════════════════════════════════════════════════
  'L3-1(B1) 작업요소': [
    // ── 01 공통 (MN: 사람) ──────────────────────────────────
    ['01', 'MN', '셋업엔지니어'],
    ['01', 'MN', '작업자'],
    ['01', 'MN', '운반원'],
    ['01', 'MN', '보전원'],
    ['01', 'MN', '검사원'],
    // ── 10 컷팅 ─────────────────────────────────────────────
    ['10', 'MC', '절단기'],
    ['10', 'MC', '절단공구'],
    // ── 20 프레스 ───────────────────────────────────────────
    ['20', 'MC', '프레스'],
    ['20', 'MC', '금형/지그'],
    // ── 30 용접 ─────────────────────────────────────────────
    ['30', 'MC', '용접기'],
    ['30', 'IM', '용접봉/와이어'],
    // ── 40 도장 ─────────────────────────────────────────────
    ['40', 'MC', '도장설비'],
    // ── 50 조립 ─────────────────────────────────────────────
    ['50', 'MC', '조립공구'],
    ['50', 'MC', '체결공구'],
    // ── 60 검사 ─────────────────────────────────────────────
    ['60', 'MC', '측정장비'],
    ['60', 'MC', '시험장비'],
  ],
  'L3-2(B2) 요소기능': [
    // ── 01 공통 (MN: 사람) ──────────────────────────────────
    ['01', 'MN', '셋업엔지니어', '작업자가 설비 조건을 셋팅하고 공정 파라미터를 설정하여 초기품을 승인한다'],
    ['01', 'MN', '작업자', '작업자가 작업표준을 준수하고 소재를 가공하여 생산품을 이송한다'],
    ['01', 'MN', '운반원', '작업자가 자재 및 제품을 지정 위치로 운반한다'],
    ['01', 'MN', '보전원', '작업자가 설비 점검 결과를 확인하고 예방보전 적합성을 판정한다'],
    ['01', 'MN', '검사원', '검사원이 검사결과를 확인하고 합부를 판정한다'],
    // ── 10 컷팅 ─────────────────────────────────────────────
    ['10', 'MC', '절단기', '절단기가 지정 속도(RPM)로 소재를 절단하여 치수 정밀도를 제공한다'],
    ['10', 'MC', '절단공구', '절단공구가 절삭력을 제공하여 소재 절단면 품질을 확보한다'],
    // ── 20 프레스 ───────────────────────────────────────────
    ['20', 'MC', '프레스', '프레스가 설정 압력으로 성형하여 소재 형상을 제공한다'],
    ['20', 'MC', '금형/지그', '금형이 소재를 정위치에 고정하여 성형 치수를 제공한다'],
    // ── 30 용접 ─────────────────────────────────────────────
    ['30', 'MC', '용접기', '용접기가 전압/전류를 인가하여 아크열로 소재 접합을 제공한다'],
    ['30', 'IM', '용접봉/와이어', '용접봉이 용융되어 모재와 접합부 충전재를 제공한다'],
    // ── 40 도장 ─────────────────────────────────────────────
    ['40', 'MC', '도장설비', '도장설비가 설정 압력으로 도료를 분사하여 균일한 도막을 제공한다'],
    // ── 50 조립 ─────────────────────────────────────────────
    ['50', 'MC', '조립공구', '조립공구가 정위치 가이드를 제공하여 부품 조립 정확도를 확보한다'],
    ['50', 'MC', '체결공구', '체결공구가 규정 토크를 인가하여 체결 상태를 제공한다'],
    // ── 60 검사 ─────────────────────────────────────────────
    ['60', 'MC', '측정장비', '측정장비가 측정값을 산출하여 외관/치수 합부 데이터를 제공한다'],
    ['60', 'MC', '시험장비', '시험장비가 기능시험을 수행하여 합부 결과를 제공한다'],
  ],
  'L3-3(B3) 공정특성': [
    // ── 01 공통 (MN) ────────────────────────────────────────
    ['01', 'MN', '셋업엔지니어', '설비 조건설정 정확성', ''],
    ['01', 'MN', '작업자', '작업표준 준수', ''],
    ['01', 'MN', '운반원', '취급 조건', ''],
    ['01', 'MN', '보전원', '유지보수 정확도', ''],
    ['01', 'MN', '검사원', '판정 일관성', ''],
    // ── 10 컷팅 ─────────────────────────────────────────────
    ['10', 'MC', '절단기', '절단 속도(RPM)', ''],
    ['10', 'MC', '절단공구', '공구 교환주기', ''],
    // ── 20 프레스 ───────────────────────────────────────────
    ['20', 'MC', '프레스', '프레스 압력', '◆'],
    ['20', 'MC', '금형/지그', '금형 위치', ''],
    // ── 30 용접 ─────────────────────────────────────────────
    ['30', 'MC', '용접기', '용접전압', '◆'],
    ['30', 'MC', '용접기', '용접전류', '◆'],
    // ── 40 도장 ─────────────────────────────────────────────
    ['40', 'MC', '도장설비', '도장 압력', ''],
    ['40', 'MC', '도장설비', '도장 거리', ''],
    ['40', 'MC', '도장설비', '건조 온도/시간', '◆'],
    // ── 50 조립 ─────────────────────────────────────────────
    ['50', 'MC', '체결공구', '체결 토크', '◆'],
    ['50', 'MC', '조립공구', '조립 순서', ''],
    // ── 60 검사 ─────────────────────────────────────────────
    ['60', 'MC', '측정장비', '측정 정밀도', ''],
    ['60', 'MC', '측정장비', '판정 기준', ''],
  ],
  'L3-4(B4) 고장원인': [
    // ── 01 공통 (MN) ────────────────────────────────────────
    ['01', 'MN', '조건설정 실수'],
    ['01', 'MN', '작업 실수'],
    ['01', 'MN', '취급 부주의'],
    ['01', 'MN', '유지보수 정확도 부족'],
    ['01', 'MN', '판정 정확도 부족'],
    // ── 10 컷팅 ─────────────────────────────────────────────
    ['10', 'MC', '절단 속도 불균일'],
    ['10', 'MC', '공구 교환주기 초과'],
    // ── 20 프레스 ───────────────────────────────────────────
    ['20', 'MC', '프레스 압력 미달'],
    ['20', 'MC', '금형 위치 이탈'],
    // ── 30 용접 ─────────────────────────────────────────────
    ['30', 'MC', '용접 전압 불균일'],
    ['30', 'MC', '용접 전류 불균일'],
    // ── 40 도장 ─────────────────────────────────────────────
    ['40', 'MC', '도장 압력 불균일'],
    ['40', 'MC', '도장 거리 편차'],
    ['40', 'MC', '건조 조건 이탈'],
    // ── 50 조립 ─────────────────────────────────────────────
    ['50', 'MC', '체결 토크 미달/과다'],
    ['50', 'MC', '조립 순서 오류'],
    // ── 60 검사 ─────────────────────────────────────────────
    ['60', 'MC', '측정 오차'],
    ['60', 'MC', '판정 기준 오적용'],
    ['60', 'MN', '판정 정확도 부족'],
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
    ['YP', '치수 정밀도를 유지한다'],
    ['YP', '구조적 무결성을 확보한다'],
    ['SP', '표면 보호 및 심미성을 유지한다'],
    ['SP', '법규 및 고객요구사항을 충족한다'],
    ['USER', '주행 안정성을 요구한다'],
    ['USER', '내구성 및 안전성을 요구한다'],
  ],
  'L1-3(C3) 요구사항': [
    // ── YP (자사공장 내부 요구사항) ──
    ['YP', '치수 공차 ±허용공차 이내 (소재 외경/두께/길이)'],
    ['YP', '접합부 강도 기준값 이상 (용접강도 미달 방지)'],
    ['YP', '작업 하중 한도 준수 (프레스 압력, 체결 토크)'],
    ['YP', '외관 결함 부재 (BURR, 도막 불량, 스크래치)'],
    // ── SP (고객/완성차 요구사항) ──
    ['SP', '도막 두께 규격 준수 (전착 도막 ≥ 기준값 μm)'],
    ['SP', '유해물질 불검출 (RoHS/REACH 규제 준수)'],
    // ── USER (법적·산업표준·암시적 요구사항) ──
    ['USER', '내구성 기준 충족 — KS D ISO 4210 피로시험 합격'],
    ['USER', '변형 미발생 — 주행 중 프레임 영구변형 없음'],
    ['USER', '주행 안전성 확보 — 제동/조향/구동 기능 정상'],
    ['USER', '안전 기준 KS D ISO 4210 자전거 안전요건 준수'],
    ['USER', '환경 친화적 설계 (재활용 적합 재료 사용)'],
    ['USER', '작업자 잠재적 오용 발생 시 안전 확보'],
  ],
  'L1-4(C4) 고장영향': [
    ['YP', '조립 불능으로 인한 재작업/폐기'],
    ['YP', '사용자 안전 사고 위험'],
    ['YP', '주행 성능 상실'],
    ['YP', '고객 불만 및 브랜드 신뢰도 하락'],
    ['SP', '내구성 저하 및 외관 손상'],
    ['SP', '법적 규제위반으로 판매 중지 및 리콜 조치'],
    ['USER', '제품 수명 단축 및 중도 파손'],
    ['USER', '주행 불안정 및 안전성 위협'],
  ],

  // ═══════════════════════════════════════════════════════════════
  // FC 고장사슬 + FA 통합분석
  // ═══════════════════════════════════════════════════════════════
  // ★ FC 고장사슬 (v5.1): FE구분, FE, 공정번호, FM, 4M, WE, FC, PC, DC, O, D, AP (S 삭제)
  // ★ 34행 — 자전거 프레임 제조공정 교육용 데모
  // ★ Process-first 정렬 (processNo→fmText→feScope→feText) + 모든 행에 값 채움 (병합용)
  'FC 고장사슬': [
    // ── 공정 10: 컷팅 ──────────────────────────────────────────────
    ['YP', '고객 불만 및 브랜드 신뢰도 하락', '10', '소재 외경 부적합', 'MC', '절단공구', '공구 교환주기 초과', '공구 수명 관리 시스템(카운터), 예방 보전 계획', '측정기기(캘리퍼스, 마이크로미터) 샘플링 측정', '3', '4', 'L'],
    ['YP', '고객 불만 및 브랜드 신뢰도 하락', '10', '소재 외경 부적합', 'MC', '절단기', '절단 속도 불균일', '절단 속도 자동 제어 시스템, 실시간 모니터링 알람', '측정기기(캘리퍼스, 마이크로미터) 샘플링 측정', '3', '4', 'M'],
    ['YP', '조립 불능으로 인한 재작업/폐기', '10', '소재 길이 부적합', 'MN', '작업자', '작업 실수', '작업자 숙련도 평가 및 정기 교육, SOP 현장 게시', '측정기기(캘리퍼스, 줄자) 전수 측정', '2', '4', 'L'],
    ['YP', '조립 불능으로 인한 재작업/폐기', '10', '소재 길이 부적합', 'MC', '절단기', '절단 속도 불균일', '절단 속도 자동 제어 시스템, 실시간 모니터링 알람', '측정기기(캘리퍼스, 줄자) 전수 측정', '3', '4', 'L'],
    ['YP', '조립 불능으로 인한 재작업/폐기', '10', '소재 두께 부적합', 'MC', '절단공구', '공구 교환주기 초과', '공구 수명 관리 시스템(카운터), 예방 보전 계획', '측정기기(캘리퍼스, 줄자) 전수 측정', '3', '4', 'M'],
    ['YP', '조립 불능으로 인한 재작업/폐기', '10', '소재 두께 부적합', 'MC', '절단기', '절단 속도 불균일', '절단 속도 자동 제어 시스템, 실시간 모니터링 알람', '측정기기(캘리퍼스, 줄자) 전수 측정', '3', '4', 'M'],
    // ── 공정 20: 프레스 ─────────────────────────────────────────────
    ['YP', '고객 불만 및 브랜드 신뢰도 하락', '20', 'BURR 과다', 'MC', '금형/지그', '금형 위치 이탈', '포카요케 가이드 핀 설치, 금형 고정 상태 점검', '육안검사 전수 + 자동광학검사(AOI)', '3', '7', 'M'],
    ['YP', '고객 불만 및 브랜드 신뢰도 하락', '20', 'BURR 과다', 'MC', '프레스', '프레스 압력 미달', '압력 하한치 인터록 설정, 유압유 정기 교체', '육안검사 전수 + 자동광학검사(AOI)', '4', '7', 'M'],
    ['YP', '조립 불능으로 인한 재작업/폐기', '20', '성형 치수 부적합', 'MC', '금형/지그', '금형 위치 이탈', '포카요케 가이드 핀 설치, 금형 고정 상태 점검', 'GO-NO게이지 전수 검사', '3', '4', 'M'],
    ['YP', '조립 불능으로 인한 재작업/폐기', '20', '성형 치수 부적합', 'MC', '프레스', '프레스 압력 미달', '압력 하한치 인터록 설정, 유압유 정기 교체', 'GO-NO게이지 전수 검사', '4', '4', 'M'],
    // ── 공정 30: 용접 ──────────────────────────────────────────────
    ['SP', '내구성 저하 및 외관 손상', '30', '외관 부적합', 'MC', '용접기', '용접 전류 불균일', '접지 상태 정기 점검, 용접기 파워 소스 정밀 교정', '육안검사 + 자동광학검사(AOI)', '4', '7', 'M'],
    ['SP', '내구성 저하 및 외관 손상', '30', '외관 부적합', 'MC', '용접기', '용접 전압 불균일', '전압 안정기 설치, 실시간 용접 모니터링 시스템(WMS)', '육안검사 + 자동광학검사(AOI)', '4', '7', 'M'],
    ['YP', '사용자 안전 사고 위험', '30', '용접강도 미달', 'MC', '용접기', '용접 전류 불균일', '접지 상태 정기 점검, 용접기 파워 소스 정밀 교정', '인장시험기 Lot별 파괴검사 + 비파괴검사(NDT)', '3', '4', 'H'],
    ['YP', '사용자 안전 사고 위험', '30', '용접강도 미달', 'MC', '용접기', '용접 전압 불균일', '전압 안정기 설치, 실시간 용접 모니터링 시스템(WMS)', '인장시험기 Lot별 파괴검사 + 비파괴검사(NDT)', '3', '4', 'H'],
    ['YP', '사용자 안전 사고 위험', '30', '용접강도 미달', 'MN', '작업자', '작업 실수', '작업자 숙련도 평가 및 정기 교육, SOP 현장 게시', '인장시험기 Lot별 파괴검사 + 비파괴검사(NDT)', '2', '4', 'M'],
    ['YP', '사용자 안전 사고 위험', '30', '용접강도 미달', 'IM', '용접봉/와이어', '용접봉 품질 부적합', '용접봉 입고검사(인장강도, 화학성분 성적서 확인)', '인장시험기 Lot별 파괴검사 + 비파괴검사(NDT)', '3', '4', 'M'],
    // ── 공정 40: 도장 ──────────────────────────────────────────────
    ['SP', '내구성 저하 및 외관 손상', '40', '도막 두께 부적합', 'MC', '도장설비', '도장 거리 편차', '도장 압력 자동 제어, 분사 거리 가이드 설치', '도막두께계(전자기식) 전수 측정', '3', '4', 'L'],
    ['SP', '내구성 저하 및 외관 손상', '40', '도막 두께 부적합', 'MC', '도장설비', '도장 압력 불균일', '도장 압력 자동 제어, 분사 거리 가이드 설치', '도막두께계(전자기식) 전수 측정', '4', '4', 'L'],
    ['SP', '내구성 저하 및 외관 손상', '40', '도막 박리', 'MC', '도장설비', '건조 조건 이탈', '건조로 온도/시간 자동 제어, 실시간 모니터링', '밀착성 시험(크로스컷 + Tape 테스트) Lot별', '3', '4', 'M'],
    ['SP', '내구성 저하 및 외관 손상', '40', '도막 박리', 'MC', '도장설비', '도장 압력 불균일', '도장 압력 자동 제어, 분사 거리 가이드 설치', '밀착성 시험(크로스컷 + Tape 테스트) Lot별', '3', '4', 'M'],
    ['YP', '고객 불만 및 브랜드 신뢰도 하락', '40', '외관 부적합', 'MC', '도장설비', '도장 거리 편차', '도장 압력 자동 제어, 분사 거리 가이드 설치', '육안검사 + 자동광학검사(AOI)', '4', '7', 'M'],
    ['YP', '고객 불만 및 브랜드 신뢰도 하락', '40', '외관 부적합', 'MN', '작업자', '취급 부주의', '전용 적재 랙 사용, 취급 주의 표지판 및 완충재 적용', '육안검사 + 자동광학검사(AOI)', '3', '7', 'M'],
    // ── 공정 50: 조립 ──────────────────────────────────────────────
    ['USER', '주행 불안정 및 안전성 위협', '50', '체결 불량', 'MN', '작업자', '조립 순서 오류', '조립 순서 SOP 현장 게시, 포카요케 가이드', '육안검사 + 조립 완성도 체크리스트', '2', '7', 'H'],
    ['USER', '주행 불안정 및 안전성 위협', '50', '체결 불량', 'MC', '조립공구', '체결 토크 미달/과다', '토크렌치 정기 교정(Gage R&R), 체결 순서 포카요케', '육안검사 + 조립 완성도 체크리스트', '3', '7', 'H'],
    ['YP', '사용자 안전 사고 위험', '50', '조립 토크 부적합', 'MN', '작업자', '작업 실수', '작업자 숙련도 평가 및 정기 교육, SOP 현장 게시', '토크렌치(디지털) 전수 체결 토크 검사', '2', '4', 'M'],
    ['YP', '사용자 안전 사고 위험', '50', '조립 토크 부적합', 'MC', '체결공구', '체결 토크 미달/과다', '토크렌치 정기 교정(Gage R&R), 체결 순서 포카요케', '토크렌치(디지털) 전수 체결 토크 검사', '3', '4', 'H'],
    // ── 공정 60: 검사 ──────────────────────────────────────────────
    ['USER', '주행 불안정 및 안전성 위협', '60', '기능 불량 미검출', 'MC', '시험장비', '측정 오차', '시험장비 정기 교정(MSA Gage R&R), 판정 기준서 최신화', '기능 시험기(자동) 전수 기능검사', '2', '4', 'M'],
    ['USER', '주행 불안정 및 안전성 위협', '60', '기능 불량 미검출', 'MN', '검사원', '판정 기준 오적용', '판정 기준서 교육 + 한도 견본(OK/NG) 비치', '기능 시험기(자동) 전수 기능검사', '3', '4', 'H'],
    ['USER', '제품 수명 단축 및 중도 파손', '60', '기능 불량 미검출', 'MC', '시험장비', '측정 오차', '시험장비 정기 교정(MSA Gage R&R), 판정 기준서 최신화', '기능 시험기(자동) 전수 기능검사', '2', '4', 'M'],
    ['USER', '제품 수명 단축 및 중도 파손', '60', '기능 불량 미검출', 'MN', '검사원', '판정 기준 오적용', '판정 기준서 교육 + 한도 견본(OK/NG) 비치', '기능 시험기(자동) 전수 기능검사', '3', '4', 'M'],
    ['YP', '고객 불만 및 브랜드 신뢰도 하락', '60', '외관 불량 미검출', 'MC', '측정장비', '측정 오차', '측정기기 정기 교정(MSA), 판정 기준서 최신화', '외관 검사 기준서 + 조명 환경 표준화', '3', '7', 'M'],
    ['YP', '고객 불만 및 브랜드 신뢰도 하락', '60', '외관 불량 미검출', 'MN', '검사원', '판정 정확도 부족', '한도 견본(OK/NG) 비치, 검사원 정기 판정 교육', '외관 검사 기준서 + 조명 환경 표준화', '4', '7', 'M'],
    ['YP', '조립 불능으로 인한 재작업/폐기', '60', '치수 불량 미검출', 'MC', '측정장비', '측정 오차', '측정기기 정기 교정(MSA), 판정 기준서 최신화', '3차원 측정기(CMM) Lot별 전수 치수 측정', '3', '4', 'M'],
    ['YP', '조립 불능으로 인한 재작업/폐기', '60', '치수 불량 미검출', 'MN', '검사원', '판정 기준 오적용', '판정 기준서 교육 + 한도 견본(OK/NG) 비치', '3차원 측정기(CMM) Lot별 전수 치수 측정', '3', '4', 'M'],
  ],
  // ★ FA 통합분석 (ALL): 26열 — 자전거 프레임 제조공정 교육용 데모
  'FA 통합분석': [
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '10', '컷팅', '원자재를 도면에서 지정된 치수로 절단한다', '소재 외경', '', 'MN', '작업자', '', '', '', '조립 불능으로 인한 재작업/폐기', '소재 길이 부적합', '작업 실수', '6', '2', '4', 'L', '측정기기(캘리퍼스)', '줄자 전수 측정', '작업자 숙련도 평가 및 정기 교육', 'SOP 현장 게시', '1', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '10', '컷팅', '원자재를 도면에서 지정된 치수로 절단한다', '소재 외경', '', 'MC', '절단기', '절단기가 지정 속도(RPM)로 소재를 절단하여 치수 정밀도를 제공한다', '절단 속도(RPM)', '', '조립 불능으로 인한 재작업/폐기', '소재 길이 부적합', '절단 속도 불균일', '6', '3', '4', 'L', '측정기기(캘리퍼스)', '줄자 전수 측정', '절단 속도 자동 제어 시스템', '실시간 모니터링 알람', '2', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '10', '컷팅', '원자재를 도면에서 지정된 치수로 절단한다', '소재 외경', '', 'MC', '절단공구', '절단공구가 절삭력을 제공하여 소재 절단면 품질을 확보한다', '공구 교환주기', '', '조립 불능으로 인한 재작업/폐기', '소재 두께 부적합', '공구 교환주기 초과', '7', '3', '4', 'M', '측정기기(캘리퍼스)', '줄자 전수 측정', '공구 수명 관리 시스템(카운터)', '예방 보전 계획', '2', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '10', '컷팅', '원자재를 도면에서 지정된 치수로 절단한다', '소재 외경', '', 'MC', '절단기', '절단기가 지정 속도(RPM)로 소재를 절단하여 치수 정밀도를 제공한다', '절단 속도(RPM)', '', '조립 불능으로 인한 재작업/폐기', '소재 두께 부적합', '절단 속도 불균일', '7', '3', '4', 'M', '측정기기(캘리퍼스)', '줄자 전수 측정', '절단 속도 자동 제어 시스템', '실시간 모니터링 알람', '2', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '10', '컷팅', '원자재를 도면에서 지정된 치수로 절단한다', '소재 외경', '', 'MC', '절단공구', '절단공구가 절삭력을 제공하여 소재 절단면 품질을 확보한다', '공구 교환주기', '', '고객 불만 및 브랜드 신뢰도 하락', '소재 외경 부적합', '공구 교환주기 초과', '5', '3', '4', 'L', '캘리퍼스', '마이크로미터', '공구 수명 관리 시스템(카운터)', '예방 보전 계획', '2', '4'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '10', '컷팅', '원자재를 도면에서 지정된 치수로 절단한다', '소재 외경', '', 'MC', '절단기', '절단기가 지정 속도(RPM)로 소재를 절단하여 치수 정밀도를 제공한다', '절단 속도(RPM)', '', '조립 불능으로 인한 재작업/폐기', '소재 외경 부적합', '절단 속도 불균일', '7', '3', '4', 'M', '캘리퍼스', '마이크로미터', '절단 속도 자동 제어 시스템', '실시간 모니터링 알람', '2', '4'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '20', '프레스', '절단된 소재를 도면에 따라 성형 가공한다', 'BURR', '', 'MC', '금형/지그', '금형이 소재를 정위치에 고정하여 성형 치수를 제공한다', '금형 위치', '', '고객 불만 및 브랜드 신뢰도 하락', 'BURR 과다', '금형 위치 이탈', '5', '3', '7', 'M', '육안검사', '자동광학검사(AOI)', '포카요케 가이드 핀 설치', '금형 고정 상태 점검', '2', '5'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '20', '프레스', '절단된 소재를 도면에 따라 성형 가공한다', 'BURR', '', 'MC', '프레스', '프레스가 설정 압력으로 성형하여 소재 형상을 제공한다', '프레스 압력', '◆', '고객 불만 및 브랜드 신뢰도 하락', 'BURR 과다', '프레스 압력 미달', '5', '4', '7', 'M', '육안검사', '자동광학검사(AOI)', '압력 하한치 인터록 설정', '유압유 정기 교체', '3', '5'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '20', '프레스', '절단된 소재를 도면에 따라 성형 가공한다', 'BURR', '', 'MC', '금형/지그', '금형이 소재를 정위치에 고정하여 성형 치수를 제공한다', '금형 위치', '', '조립 불능으로 인한 재작업/폐기', '성형 치수 부적합', '금형 위치 이탈', '7', '3', '4', 'M', 'GO-NO게이지', '3차원 측정기', '포카요케 가이드 핀 설치', '금형 고정 상태 점검', '2', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '20', '프레스', '절단된 소재를 도면에 따라 성형 가공한다', 'BURR', '', 'MC', '프레스', '프레스가 설정 압력으로 성형하여 소재 형상을 제공한다', '프레스 압력', '◆', '조립 불능으로 인한 재작업/폐기', '성형 치수 부적합', '프레스 압력 미달', '7', '4', '4', 'M', 'GO-NO게이지', '3차원 측정기', '압력 하한치 인터록 설정', '유압유 정기 교체', '3', '3'],
    ['SP', '표면 보호 및 심미성을 유지한다', '도막 두께', '30', '용접', '가공된 부품을 도면에 따라 용접하여 접합한다', '외관', '', 'MC', '용접기', '용접기가 전압/전류를 인가하여 아크열로 소재 접합을 제공한다', '용접전압', '◆', '내구성 저하 및 외관 손상', '외관 부적합', '용접 전류 불균일', '4', '4', '7', 'M', '육안검사', '자동광학검사(AOI)', '접지 상태 정기 점검', '용접기 파워 소스 정밀 교정', '2', '6'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '30', '용접', '가공된 부품을 도면에 따라 용접하여 접합한다', '외관', '', 'MC', '용접기', '용접기가 전압/전류를 인가하여 아크열로 소재 접합을 제공한다', '용접전압', '◆', '고객 불만 및 브랜드 신뢰도 하락', '외관 부적합', '용접 전압 불균일', '5', '4', '7', 'M', '육안검사', '자동광학검사(AOI)', '전압 안정기 설치', '실시간 용접 모니터링 시스템(WMS)', '2', '6'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '30', '용접', '가공된 부품을 도면에 따라 용접하여 접합한다', '외관', '', 'MC', '용접기', '용접기가 전압/전류를 인가하여 아크열로 소재 접합을 제공한다', '용접전압', '◆', '사용자 안전 사고 위험', '용접강도 미달', '용접 전류 불균일', '9', '3', '4', 'H', '인장시험기', '비파괴검사(NDT)', '접지 상태 정기 점검', '용접기 파워 소스 정밀 교정', '2', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '30', '용접', '가공된 부품을 도면에 따라 용접하여 접합한다', '외관', '', 'MC', '용접기', '용접기가 전압/전류를 인가하여 아크열로 소재 접합을 제공한다', '용접전압', '◆', '사용자 안전 사고 위험', '용접강도 미달', '용접 전압 불균일', '9', '3', '4', 'H', '인장시험기', '비파괴검사(NDT)', '전압 안정기 설치', '실시간 용접 모니터링 시스템(WMS)', '2', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '30', '용접', '가공된 부품을 도면에 따라 용접하여 접합한다', '외관', '', 'MN', '작업자', '', '', '', '주행 성능 상실', '용접강도 미달', '작업 실수', '8', '2', '4', 'M', '인장시험기', '비파괴검사(NDT)', '작업자 숙련도 평가 및 정기 교육', 'SOP 현장 게시', '1', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '30', '용접', '가공된 부품을 도면에 따라 용접하여 접합한다', '외관', '', 'IM', '용접봉/와이어', '용접봉이 용융되어 모재와 접합부 충전재를 제공한다', '', '', '주행 성능 상실', '용접강도 미달', '용접봉 품질 부적합', '6', '3', '4', 'M', '인장시험기', '비파괴검사(NDT)', '용접봉 입고검사(인장강도)', '화학성분 성적서 확인', '2', '3'],
    ['SP', '표면 보호 및 심미성을 유지한다', '도막 두께', '40', '도장', '용접된 제품에 도장하여 표면을 보호한다', '도막 두께', '◇', 'MC', '도장설비', '도장설비가 설정 압력으로 도료를 분사하여 균일한 도막을 제공한다', '도장 압력', '', '내구성 저하 및 외관 손상', '도막 두께 부적합', '도장 거리 편차', '6', '3', '4', 'L', '도막두께계(전자기식)', '전자기 도막측정기', '도장 압력 자동 제어', '분사 거리 가이드 설치', '3', '3'],
    ['SP', '표면 보호 및 심미성을 유지한다', '도막 두께', '40', '도장', '용접된 제품에 도장하여 표면을 보호한다', '도막 두께', '◇', 'MC', '도장설비', '도장설비가 설정 압력으로 도료를 분사하여 균일한 도막을 제공한다', '도장 압력', '', '내구성 저하 및 외관 손상', '도막 두께 부적합', '도장 압력 불균일', '6', '4', '4', 'L', '도막두께계(전자기식)', '전자기 도막측정기', '도장 압력 자동 제어', '분사 거리 가이드 설치', '3', '3'],
    ['SP', '표면 보호 및 심미성을 유지한다', '도막 두께', '40', '도장', '용접된 제품에 도장하여 표면을 보호한다', '도막 두께', '◇', 'MC', '도장설비', '도장설비가 설정 압력으로 도료를 분사하여 균일한 도막을 제공한다', '도장 압력', '', '내구성 저하 및 외관 손상', '도막 박리', '건조 조건 이탈', '7', '3', '4', 'M', '밀착성 시험', '크로스컷 시험', '건조로 온도/시간 자동 제어', '실시간 모니터링', '2', '3'],
    ['SP', '표면 보호 및 심미성을 유지한다', '도막 두께', '40', '도장', '용접된 제품에 도장하여 표면을 보호한다', '도막 두께', '◇', 'MC', '도장설비', '도장설비가 설정 압력으로 도료를 분사하여 균일한 도막을 제공한다', '도장 압력', '', '법적 규제위반으로 판매 중지 및 리콜 조치', '도막 박리', '도장 압력 불균일', '8', '3', '4', 'M', '밀착성 시험', '크로스컷 시험', '도장 압력 자동 제어', '분사 거리 가이드 설치', '3', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '40', '도장', '용접된 제품에 도장하여 표면을 보호한다', '도막 두께', '◇', 'MC', '도장설비', '도장설비가 설정 압력으로 도료를 분사하여 균일한 도막을 제공한다', '도장 압력', '', '고객 불만 및 브랜드 신뢰도 하락', '외관 부적합', '도장 거리 편차', '5', '4', '7', 'M', '육안검사', '자동광학검사(AOI)', '도장 압력 자동 제어', '분사 거리 가이드 설치', '3', '6'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '40', '도장', '용접된 제품에 도장하여 표면을 보호한다', '도막 두께', '◇', 'MN', '작업자', '', '', '', '고객 불만 및 브랜드 신뢰도 하락', '외관 부적합', '취급 부주의', '5', '3', '7', 'M', '육안검사', '자동광학검사(AOI)', '전용 적재 랙 사용', '취급 주의 표지판 및 완충재 적용', '2', '6'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '50', '조립', '도장된 부품을 조립하여 완제품을 구성한다', '조립 토크', '◇', 'MN', '작업자', '', '', '', '사용자 안전 사고 위험', '조립 토크 부적합', '작업 실수', '9', '2', '4', 'M', '토크렌치', '자동토크모니터링', '작업자 숙련도 평가 및 정기 교육', 'SOP 현장 게시', '1', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '50', '조립', '도장된 부품을 조립하여 완제품을 구성한다', '조립 토크', '◇', 'MC', '체결공구', '체결공구가 규정 토크를 인가하여 체결 상태를 제공한다', '체결 토크', '◆', '사용자 안전 사고 위험', '조립 토크 부적합', '체결 토크 미달/과다', '9', '3', '4', 'H', '토크렌치', '자동토크모니터링', '토크렌치 정기 교정(Gage R&R)', '체결 순서 포카요케', '2', '3'],
    ['USER', '주행 안정성을 요구한다', '내구성', '50', '조립', '도장된 부품을 조립하여 완제품을 구성한다', '조립 토크', '◇', 'MN', '작업자', '', '', '', '주행 불안정 및 안전성 위협', '체결 불량', '조립 순서 오류', '9', '2', '7', 'H', '육안검사', '자동광학검사(AOI)', '조립 순서 SOP 현장 게시', '포카요케 가이드', '1', '6'],
    ['USER', '주행 안정성을 요구한다', '내구성', '50', '조립', '도장된 부품을 조립하여 완제품을 구성한다', '조립 토크', '◇', 'MC', '조립공구', '조립공구가 정위치 가이드를 제공하여 부품 조립 정확도를 확보한다', '조립 순서', '', '주행 불안정 및 안전성 위협', '체결 불량', '체결 토크 미달/과다', '9', '3', '7', 'H', '육안검사', '자동광학검사(AOI)', '토크렌치 정기 교정(Gage R&R)', '체결 순서 포카요케', '2', '6'],
    ['USER', '주행 안정성을 요구한다', '내구성', '60', '검사', '완제품의 품질을 최종 검사한다', '외관', '', 'MC', '시험장비', '시험장비가 기능시험을 수행하여 합부 결과를 제공한다', '', '', '주행 불안정 및 안전성 위협', '기능 불량 미검출', '측정 오차', '9', '2', '4', 'M', '기능 시험기', '자동기능시험기', '시험장비 정기 교정(MSA)', '판정 기준서 최신화', '2', '3'],
    ['USER', '주행 안정성을 요구한다', '내구성', '60', '검사', '완제품의 품질을 최종 검사한다', '외관', '', 'MN', '검사원', '', '', '', '주행 불안정 및 안전성 위협', '기능 불량 미검출', '판정 기준 오적용', '9', '3', '4', 'H', '기능 시험기', '자동기능시험기', '판정 기준서 교육', '한도 견본(OK/NG) 비치', '2', '3'],
    ['USER', '주행 안정성을 요구한다', '내구성', '60', '검사', '완제품의 품질을 최종 검사한다', '외관', '', 'MC', '시험장비', '시험장비가 기능시험을 수행하여 합부 결과를 제공한다', '', '', '제품 수명 단축 및 중도 파손', '기능 불량 미검출', '측정 오차', '8', '2', '4', 'M', '기능 시험기', '자동기능시험기', '시험장비 정기 교정(MSA)', '판정 기준서 최신화', '2', '3'],
    ['USER', '주행 안정성을 요구한다', '내구성', '60', '검사', '완제품의 품질을 최종 검사한다', '외관', '', 'MN', '검사원', '', '', '', '제품 수명 단축 및 중도 파손', '기능 불량 미검출', '판정 기준 오적용', '8', '3', '4', 'M', '기능 시험기', '자동기능시험기', '판정 기준서 교육', '한도 견본(OK/NG) 비치', '2', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '60', '검사', '완제품의 품질을 최종 검사한다', '외관', '', 'MC', '측정장비', '측정장비가 측정값을 산출하여 외관/치수 합부 데이터를 제공한다', '측정 정밀도', '', '고객 불만 및 브랜드 신뢰도 하락', '외관 불량 미검출', '측정 오차', '6', '3', '7', 'M', '외관 검사 기준서', '자동광학검사(AOI)', '측정기기 정기 교정(MSA)', '판정 기준서 최신화', '2', '6'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '60', '검사', '완제품의 품질을 최종 검사한다', '외관', '', 'MN', '검사원', '', '', '', '고객 불만 및 브랜드 신뢰도 하락', '외관 불량 미검출', '판정 정확도 부족', '6', '4', '7', 'M', '외관 검사 기준서', '자동광학검사(AOI)', '한도 견본(OK/NG) 비치', '검사원 정기 판정 교육', '3', '6'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '60', '검사', '완제품의 품질을 최종 검사한다', '외관', '', 'MC', '측정장비', '측정장비가 측정값을 산출하여 외관/치수 합부 데이터를 제공한다', '측정 정밀도', '', '조립 불능으로 인한 재작업/폐기', '치수 불량 미검출', '측정 오차', '7', '3', '4', 'M', '3차원 측정기', 'CMM 측정기', '측정기기 정기 교정(MSA)', '판정 기준서 최신화', '2', '3'],
    ['YP', '치수 정밀도를 유지한다', '치수 공차', '60', '검사', '완제품의 품질을 최종 검사한다', '외관', '', 'MN', '검사원', '', '', '', '조립 불능으로 인한 재작업/폐기', '치수 불량 미검출', '판정 기준 오적용', '7', '3', '4', 'M', '3차원 측정기', 'CMM 측정기', '판정 기준서 교육', '한도 견본(OK/NG) 비치', '2', '3'],
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

/** 샘플 데이터 템플릿 다운로드 (다중 시트) */
export async function downloadSampleTemplate(customFileName?: string, manualMode = false) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = `FMEA Smart System ${TEMPLATE_VERSION}`;
  workbook.created = new Date();

  // 수동모드: 구조+기능+고장영향까지만 (A4/A5/B3/B4/FC/FA 제외)
  const defs = manualMode
    ? SHEET_DEFINITIONS.filter(d => !MANUAL_MODE_EXCLUDE.has(d.name))
    : SHEET_DEFINITIONS;

  // 각 시트 생성
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

    // ★★★ 2026-02-28: FC 시트 병합셀 적용 (v2.8.0) ★★★
    if (def.name === 'FC 고장사슬' && sampleRows.length > 1) {
      applyFCSheetMergeCells(worksheet, sampleRows);
    }

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  });

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = customFileName || `PFMEA_기초정보_샘플_${TEMPLATE_VERSION}`;
  await downloadExcelBuffer(buffer, fileName);
}

/** 공통 다운로드 헬퍼 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  await downloadExcelBuffer(buffer, fileName);
}

