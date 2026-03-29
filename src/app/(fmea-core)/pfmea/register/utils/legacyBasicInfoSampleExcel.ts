/**
 * 등록 화면 기초정보 Import — 레거시 15탭 샘플 엑셀 생성/다운로드
 *
 * 구조: v2.7.1 수동 Import 양식과 동일
 *   B2: 공정번호 | 4M | 요소기능   (3컬럼, belongsTo 없음)
 *   B3: 공정번호 | 4M | 공정특성 | 특별특성  (4컬럼, belongsTo 없음)
 *   B5: 공정번호 | 4M | 예방관리   (3컬럼, belongsTo 없음)
 *
 * 디자인: 파란색 헤더 (#00587A) + 줄무늬(zebra) 행 + 탭 컬러
 */
import { saveAs } from 'file-saver';
import type ExcelJS from 'exceljs';

const HEADER_BG = '00587A';
const STRIPE_EVEN = 'FFFFFF';
const STRIPE_ODD = 'E8F4FA';  // 연한 파란
const FONT_NAME = '맑은 고딕';

const THIN_BORDER: ExcelJS.Border = { style: 'thin', color: { argb: 'B0BEC5' } };
const CELL_BORDERS: Partial<ExcelJS.Borders> = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };

type TabDef = {
  name: string;
  shortLabel: string;         // 탭 표시 라벨 (ex: "A1 공정번호")
  headers: string[];
  widths: number[];
  tabColor: string;
};

const L2_COLOR = '1565C0';   // 진한 파랑
const L3_COLOR = '00838F';   // 청록
const L1_COLOR = '6A1B9A';   // 보라

const LEGACY_TABS: TabDef[] = [
  // L2 (A계열)
  { name: 'L2-1(A1) 공정번호', shortLabel: 'A1 공정번호', headers: ['L2-1.공정번호', 'L2-2.공정명'], widths: [16, 28], tabColor: L2_COLOR },
  { name: 'L2-2(A2) 공정명',   shortLabel: 'A2 공정명',   headers: ['L2-1.공정번호', 'L2-2.공정명'], widths: [16, 28], tabColor: L2_COLOR },
  { name: 'L2-3(A3) 공정기능', shortLabel: 'A3 공정기능', headers: ['L2-1.공정번호', 'L2-3.공정기능(설명)'], widths: [16, 45], tabColor: L2_COLOR },
  { name: 'L2-4(A4) 제품특성', shortLabel: 'A4 제품특성', headers: ['L2-1.공정번호', 'L2-4.제품특성', '특별특성'], widths: [16, 30, 12], tabColor: L2_COLOR },
  { name: 'L2-5(A5) 고장형태', shortLabel: 'A5 고장형태', headers: ['L2-1.공정번호', 'L2-5.고장형태'], widths: [16, 35], tabColor: L2_COLOR },
  { name: 'L2-6(A6) 검출관리', shortLabel: 'A6 검출관리', headers: ['L2-1.공정번호', 'L2-6.검출관리'], widths: [16, 40], tabColor: L2_COLOR },
  // L3 (B계열) — v2.7.1 포맷: B2/B3/B5에 belongsTo 없음
  { name: 'L3-1(B1) 작업요소', shortLabel: 'B1 작업요소', headers: ['L2-1.공정번호', '4M', 'L3-1.작업요소(설비)'], widths: [16, 8, 30], tabColor: L3_COLOR },
  { name: 'L3-2(B2) 요소기능', shortLabel: 'B2 요소기능', headers: ['L2-1.공정번호', '4M', 'L3-2.요소기능'], widths: [16, 8, 45], tabColor: L3_COLOR },
  { name: 'L3-3(B3) 공정특성', shortLabel: 'B3 공정특성', headers: ['L2-1.공정번호', '4M', 'L3-3.공정특성', '특별특성'], widths: [16, 8, 30, 12], tabColor: L3_COLOR },
  { name: 'L3-4(B4) 고장원인', shortLabel: 'B4 고장원인', headers: ['L2-1.공정번호', '4M', 'L3-4.고장원인'], widths: [16, 8, 35], tabColor: L3_COLOR },
  { name: 'L3-5(B5) 예방관리', shortLabel: 'B5 예방관리', headers: ['L2-1.공정번호', '4M', 'L3-5.예방관리'], widths: [16, 8, 40], tabColor: L3_COLOR },
  // L1 (C계열)
  { name: 'L1-1(C1) 구분',     shortLabel: 'C1 구분',     headers: ['L1-1.구분'], widths: [16], tabColor: L1_COLOR },
  { name: 'L1-2(C2) 제품기능', shortLabel: 'C2 제품기능', headers: ['L1-1.구분', 'L1-2.제품(반)기능'], widths: [16, 50], tabColor: L1_COLOR },
  { name: 'L1-3(C3) 요구사항', shortLabel: 'C3 요구사항', headers: ['L1-1.구분', 'L1-3.제품(반)요구사항'], widths: [16, 50], tabColor: L1_COLOR },
  { name: 'L1-4(C4) 고장영향', shortLabel: 'C4 고장영향', headers: ['L1-1.구분', 'L1-4.고장영향'], widths: [16, 50], tabColor: L1_COLOR },
];

function applyHeader(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
  cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10, name: FONT_NAME };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = CELL_BORDERS;
}

function applyDataCell(cell: ExcelJS.Cell, isOdd: boolean, isLong: boolean) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isOdd ? STRIPE_ODD : STRIPE_EVEN } };
  cell.font = { name: FONT_NAME, size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: isLong ? 'left' : 'center', wrapText: isLong };
  cell.border = CELL_BORDERS;
}

export type LegacySampleData = Record<string, string[][]>;

/**
 * 레거시 15탭 기초정보 엑셀 생성 + 다운로드
 * @param sampleData  탭명 → 데이터 행(string[][]) 맵 (없으면 빈 템플릿)
 * @param fileName    파일명 (확장자 자동 추가)
 */
export async function downloadLegacyBasicInfoSample(
  sampleData?: LegacySampleData,
  fileName?: string,
) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FMEA Smart System — 수동기초정보 샘플';
  wb.created = new Date();

  for (const tab of LEGACY_TABS) {
    const ws = wb.addWorksheet(tab.name, {
      properties: { tabColor: { argb: tab.tabColor } },
    });

    // 열 설정
    ws.columns = tab.headers.map((h, i) => ({
      header: h,
      key: `c${i}`,
      width: tab.widths[i] ?? 20,
    }));

    // 헤더 스타일
    const hdrRow = ws.getRow(1);
    hdrRow.height = 26;
    hdrRow.eachCell((cell) => applyHeader(cell));

    // 데이터 행
    const rows = sampleData?.[tab.name] || [];
    if (rows.length > 0) {
      rows.forEach((data, idx) => {
        const row = ws.addRow(data);
        row.eachCell((cell, colNum) => {
          const w = tab.widths[colNum - 1] ?? 20;
          applyDataCell(cell, idx % 2 === 1, w > 20);
        });
        // 빈 셀에도 줄무늬 적용
        for (let c = 1; c <= tab.headers.length; c++) {
          const cell = row.getCell(c);
          if (!cell.value && !cell.fill) {
            const w = tab.widths[c - 1] ?? 20;
            applyDataCell(cell, idx % 2 === 1, w > 20);
          }
        }
      });
    } else {
      // 빈 샘플 행 5개
      for (let i = 0; i < 5; i++) {
        const row = ws.addRow(tab.headers.map(() => ''));
        row.eachCell((cell, colNum) => {
          const w = tab.widths[colNum - 1] ?? 20;
          applyDataCell(cell, i % 2 === 1, w > 20);
        });
      }
    }

    // 1행 고정
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  }

  const buffer = await wb.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().slice(0, 10);
  const fn = `${fileName || '수동_기초정보_Import_Sample'}_${dateStr}.xlsx`;
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  try {
    saveAs(blob, fn);
  } catch {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fn;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  }
}
