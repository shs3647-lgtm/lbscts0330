/**
 * @file excel-template.ts
 * @description CP 기초정보 Excel 템플릿 생성 유틸리티 (다중 시트 방식)
 * @author AI Assistant
 * @created 2026-01-13
 * @benchmark FMEA Import excel-template.ts를 벤치마킹
 * 
 * ★ 핵심 원칙: 공정번호+공정명이 모든 항목의 부모(키)가 됨
 * 
 * 시트 구조 (5개):
 * - 공정현황: 공정번호 + 공정명 + 레벨 + 공정설명 + 설비
 * - 검출장치: 공정번호 + 공정명 + EP + 자동검출장치
 * - 관리항목: 공정번호 + 공정명 + 제품특성 + 공정특성 + 특별특성 + 스펙/허용차
 * - 관리방법: 공정번호 + 공정명 + 평가방법 + 샘플크기 + 주기 + 관리방법 + 책임1 + 책임2
 * - 대응계획: 공정번호 + 공정명 + 제품특성 + 공정특성 + 대응계획
 */

import type ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/** 헤더 색상 - CP 워크시트 그룹 색상과 일치 */
const COLORS = {
  processInfo: '0D9488',    // 공정현황 - Teal
  controlItem: '2196F3',    // 관리항목 - Blue
  controlMethod: '4CAF50',  // 관리방법 - Green
  reactionPlan: 'FF9800',   // 대응계획 - Orange
  detector: '9C27B0',       // 검출장치 - Purple
};

/** CP 시트 정의 (5개 시트) - 순서: 공정현황 → 검출장치 → 관리항목 → 관리방법 → 대응계획 */
const CP_SHEET_DEFINITIONS = [
  {
    name: '공정현황',
    headers: ['공정번호', '공정명', '레벨', '공정설명', '설비/금형/지그'],
    widths: [12, 15, 10, 40, 25],
    required: [true, true, false, false, false],
    color: COLORS.processInfo,
  },
  {
    name: '검출장치',
    headers: ['공정번호', '공정명', 'EP', '자동검사장치'],
    widths: [12, 15, 25, 25],
    required: [true, true, false, false],
    color: COLORS.detector,
  },
  {
    name: '관리항목',
    headers: ['공정번호', '공정명', '제품특성', '공정특성', '특별특성', '스펙/공차'],
    widths: [12, 15, 20, 20, 12, 25],
    required: [true, true, false, false, false, false],
    color: COLORS.controlItem,
  },
  {
    name: '관리방법',
    headers: ['공정번호', '공정명', '평가방법', '샘플크기', '주기', '관리방법', '책임1', '책임2'],
    widths: [12, 15, 20, 12, 12, 20, 12, 12],
    required: [true, true, false, false, false, false, false, false],
    color: COLORS.controlMethod,
  },
  {
    name: '대응계획',
    headers: ['공정번호', '공정명', '제품특성', '공정특성', '대응계획'],
    widths: [12, 15, 20, 20, 40],
    required: [true, true, false, false, false],
    color: COLORS.reactionPlan,
  },
];

/** export for constants.ts */
export { CP_SHEET_DEFINITIONS, COLORS };

/** 공통 셀 스타일 적용 */
function applyHeaderStyle(cell: ExcelJS.Cell, color: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: '999999' } },
    left: { style: 'thin', color: { argb: '999999' } },
    bottom: { style: 'thin', color: { argb: '999999' } },
    right: { style: 'thin', color: { argb: '999999' } },
  };
}

function applyGuideStyle(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E3F2FD' } };
  cell.font = { italic: true, color: { argb: '666666' }, size: 9, name: '맑은 고딕' };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: '999999' } },
    left: { style: 'thin', color: { argb: '999999' } },
    bottom: { style: 'thin', color: { argb: '999999' } },
    right: { style: 'thin', color: { argb: '999999' } },
  };
}

function applyDataStyle(cell: ExcelJS.Cell, zebraColor?: string, align: 'left' | 'center' | 'right' = 'center') {
  if (zebraColor) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
  }
  cell.border = {
    top: { style: 'thin', color: { argb: '999999' } },
    left: { style: 'thin', color: { argb: '999999' } },
    bottom: { style: 'thin', color: { argb: '999999' } },
    right: { style: 'thin', color: { argb: '999999' } },
  };
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
  cell.font = { name: '맑은 고딕', size: 10 };
}

/** 빈 템플릿 다운로드 (다중 시트) */
export async function downloadCPEmptyTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Control Plan Smart System';
  workbook.created = new Date();

  // 각 시트 생성
  CP_SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    // 컬럼 설정
    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: def.widths[i],
    }));

    // 헤더 스타일
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    // 빈 데이터 행 15개 (2행부터 시작)
    for (let i = 0; i < 15; i++) {
      const row = worksheet.addRow(def.headers.map(() => ''));
      row.eachCell((cell) => applyDataStyle(cell, 'FFFFFF'));
    }

    // 열 고정 (공정번호+공정명 고정, 헤더 1행만)
    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  });

  // 파일 다운로드
  await downloadWorkbook(workbook, generateFileName('기초정보', 'empty'));
}

/** 샘플 데이터 */
const CP_SAMPLE_DATA: Record<string, string[][]> = {
  '공정현황': [
    ['10', '자재입고', 'Main', '입고된 원자재를 검수하여 지정된 창고로 입고', '지게차, 입고대'],
    ['20', '수입검사', 'Main', '원부자재 샘플링 수입검사 실시', 'Mooney Viscometer'],
    ['30', 'MB Mixing', 'Main', '컴파운드 종류에 맞는 마스터배치 조건에 따라 혼련', 'MB Mixer, 믹싱롤'],
    ['40', 'FM Mixing', 'Main', '파이널믹싱 조건에 따라 혼련하여 고무시트 생산', 'FM Mixer'],
    ['50', '압출', 'Main', '고무를 압출하여 TREAD, SIDE 등 반제품 생산', '압출기'],
    ['60', '압연', 'Main', '스틸코드, 패브릭코드에 고무를 코팅하여 반제품 생산', '카렌다'],
    ['70', '비드성형', 'Sub', '비드와이어에 고무를 코팅하여 비드 생산', '비드성형기'],
    ['80', '성형', 'Main', '그린타이어 부재료 반제품을 접착하여 그린타이어 생산', '성형기'],
    ['90', '가류', 'Main', '가류기에서 그린타이어를 가열/가압하여 완제품 생산', '가류기'],
    ['100', '완성검사', 'Main', '완성품의 외관, 균형, X-ray 검사', 'X-ray 검사기'],
    ['110', '포장', 'Sub', '완성품 포장 작업', '포장기'],
    ['120', '출하', 'Sub', '완성품 출하 작업', '출하장비'],
  ],
  '관리항목': [
    ['10', '자재입고', '이물질', '입고 온도', '', '온도 20~25℃'],
    ['10', '자재입고', '보관상태', '습도', '', '습도 60% 이하'],
    ['20', '수입검사', 'Mooney Viscosity', '검사 정밀도', '★', 'Mooney 50±5'],
    ['20', '수입검사', '인장강도', '시험 조건', '', '인장강도 규격'],
    ['30', 'MB Mixing', 'Mooney Viscosity', '혼련 온도', '★', 'Mooney 60±5'],
    ['40', 'FM Mixing', 'Rheometer', 'RPM', 'SC', 'Rheometer 규격'],
    ['50', '압출', 'Tread 폭', '압출 온도', '★', 'Tread 폭 100±2mm'],
    ['60', '압연', 'Steel Cord 폭', 'EPI', 'SC', 'Steel Cord 폭 200±3mm'],
    ['80', '성형', 'Bead To Bead 폭', 'Center Deck 센터링', '★', 'B2B 폭 규격'],
    ['90', '가류', '가류도', '가류 온도', '★', '가류도 규격'],
    ['100', '완성검사', '외관', '검사 정밀도', '', '외관 규격'],
  ],
  '관리방법': [
    ['10', '자재입고', '육안검사', 'n=3', '매입고', '검수기록', '검사원', ''],
    ['20', '수입검사', 'Mooney Viscometer', 'n=5', '매Lot', '성적서관리', '검사원', '품질팀장'],
    ['30', 'MB Mixing', 'Rheometer', 'n=3', '매Batch', 'SPC관리', '작업자', '공정팀장'],
    ['40', 'FM Mixing', 'Rheometer', 'n=3', '매Batch', 'SPC관리', '작업자', '공정팀장'],
    ['50', '압출', '두께 측정', 'n=5', '매시', '관리도', '작업자', ''],
    ['60', '압연', '폭 측정', 'n=5', '매Lot', '관리도', '작업자', ''],
    ['80', '성형', '육안검사', 'n=1', '매개', '체크시트', '작업자', ''],
    ['90', '가류', '가류도 측정', 'n=3', '매Lot', 'SPC관리', '작업자', '품질팀장'],
    ['100', '완성검사', 'X-ray 검사', '전수', '매개', '자동검사', '검사원', '품질팀장'],
  ],
  '대응계획': [
    ['10', '자재입고', '이물질', '입고 온도', '반품 처리, 입고 중지'],
    ['20', '수입검사', 'Mooney Viscosity', '검사 정밀도', '재검사, 불합격 시 반품'],
    ['30', 'MB Mixing', 'Mooney Viscosity', '혼련 온도', '재작업, 공정 조건 확인'],
    ['40', 'FM Mixing', 'Rheometer', 'RPM', '재작업, 설비 점검'],
    ['50', '압출', 'Tread 폭', '압출 온도', '라인 정지, 조건 재설정'],
    ['60', '압연', 'Steel Cord 폭', 'EPI', '라인 정지, 설비 점검'],
    ['80', '성형', 'Bead To Bead 폭', 'Center Deck 센터링', '재작업, 지그 점검'],
    ['90', '가류', '가류도', '가류 온도', '재가류, 폐기'],
    ['100', '완성검사', '외관', '검사 정밀도', '불량 폐기, 원인 분석'],
  ],
  '검출장치': [
    ['10', '자재입고', '입고 확인 Poka-Yoke', '바코드 스캐너'],
    ['20', '수입검사', '성적서 확인', 'Mooney Viscometer'],
    ['30', 'MB Mixing', '온도 알람', '온도 센서'],
    ['40', 'FM Mixing', 'RPM 알람', 'Rheometer'],
    ['50', '압출', '두께 알람', '두께 측정기'],
    ['60', '압연', '폭 알람', '폭 측정기'],
    ['80', '성형', '바코드 Poka-Yoke', '바코드 스캐너'],
    ['90', '가류', '온도/시간 알람', '온도 기록계'],
    ['100', '완성검사', '불량 자동 분류', 'X-ray 자동 검사기'],
  ],
};

/** 샘플 데이터 템플릿 다운로드 (다중 시트) */
export async function downloadCPSampleTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Control Plan Smart System';
  workbook.created = new Date();

  // 각 시트 생성
  CP_SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    // 컬럼 설정
    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: def.widths[i],
    }));

    // 헤더 스타일
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    // 샘플 데이터 추가 (2행부터)
    const sampleRows = CP_SAMPLE_DATA[def.name] || [];
    // 좌측정렬 컬럼 인덱스 (공정설명, 제품특성, 공정특성)
    const leftAlignHeaders = ['공정설명', '제품특성', '공정특성'];
    const leftAlignIdxs = leftAlignHeaders.map(h => def.headers.indexOf(h)).filter(i => i >= 0);
    sampleRows.forEach((data, idx) => {
      const row = worksheet.addRow(data);
      row.eachCell((cell, colNumber) => {
        const cellValue = cell.value;
        const hasValue = cellValue !== null && cellValue !== undefined && cellValue !== '';
        const bgColor = hasValue ? (idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5') : 'FFFFFF';
        const align = leftAlignIdxs.includes(colNumber - 1) ? 'left' as const : 'center' as const;
        applyDataStyle(cell, bgColor, align);
      });
    });

    // 열 고정 (헤더 1행만)
    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  });

  // 파일 다운로드
  await downloadWorkbook(workbook, generateFileName('기초정보', 'sample'));
}

// =====================================================
// 개별 시트 템플릿 다운로드 함수들
// =====================================================

/** 공정현황 빈 템플릿 */
export async function downloadProcessInfoTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const def = CP_SHEET_DEFINITIONS[0]; // 공정현황
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  for (let i = 0; i < 15; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, 'FFFFFF'));
  }

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 공정현황 샘플 템플릿 */
export async function downloadProcessInfoSampleTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const def = CP_SHEET_DEFINITIONS[0]; // 공정현황
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  const leftAlignHeaders1 = ['공정설명', '제품특성', '공정특성'];
  const leftAlignIdxs1 = leftAlignHeaders1.map(h => def.headers.indexOf(h)).filter(i => i >= 0);
  const sampleRows = CP_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell, colNumber) => {
      const cellValue = cell.value;
      const hasValue = cellValue !== null && cellValue !== undefined && cellValue !== '';
      const bgColor = hasValue ? (idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5') : 'FFFFFF';
      const align = leftAlignIdxs1.includes(colNumber - 1) ? 'left' as const : 'center' as const;
      applyDataStyle(cell, bgColor, align);
    });
  });

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

/** 관리항목 빈 템플릿 */
export async function downloadControlItemTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const def = CP_SHEET_DEFINITIONS[2]; // 관리항목 (인덱스 변경: 1→2)
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, 'FFFFFF'));
  }

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 관리항목 샘플 템플릿 */
export async function downloadControlItemSampleTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const def = CP_SHEET_DEFINITIONS[2]; // 관리항목
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  const sampleRows = CP_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => {
      const cellValue = cell.value;
      const hasValue = cellValue !== null && cellValue !== undefined && cellValue !== '';
      const bgColor = hasValue ? (idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5') : 'FFFFFF';
      applyDataStyle(cell, bgColor);
    });
  });

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

/** 관리방법 빈 템플릿 */
export async function downloadControlMethodTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const def = CP_SHEET_DEFINITIONS[3]; // 관리방법
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 관리방법 샘플 템플릿 */
export async function downloadControlMethodSampleTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const def = CP_SHEET_DEFINITIONS[3]; // 관리방법
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  const sampleRows = CP_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

/** 대응계획 빈 템플릿 */
export async function downloadReactionPlanTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const def = CP_SHEET_DEFINITIONS[4]; // 대응계획
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 대응계획 샘플 템플릿 */
export async function downloadReactionPlanSampleTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const def = CP_SHEET_DEFINITIONS[4]; // 대응계획
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  const sampleRows = CP_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

/** 검출장치 빈 템플릿 */
export async function downloadDetectorTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const def = CP_SHEET_DEFINITIONS[1]; // 검출장치
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  for (let i = 0; i < 15; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 검출장치 샘플 템플릿 */
export async function downloadDetectorSampleTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const def = CP_SHEET_DEFINITIONS[1]; // 검출장치
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  const sampleRows = CP_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

/** 파일명 생성 헬퍼 - cpid_파일명(n) 형식 (n은 날짜 기준 다운로드 횟수) */
function generateFileName(sheetName: string, type: 'template' | 'sample' | 'empty' = 'template'): string {
  const year = new Date().getFullYear().toString().slice(-2); // 26
  const sequence = '001'; // 시퀀스 번호 (고정값, 향후 동적 생성 가능)
  const cpId = `cp${year}-m${sequence}`;

  // 날짜별 다운로드 횟수 추적 (YYYY-MM-DD 형식)
  const today = new Date().toISOString().slice(0, 10); // 2026-01-14
  const storageKey = `cp-download-count-${today}-${sheetName}-${type}`;

  // localStorage에서 오늘 날짜의 다운로드 횟수 가져오기
  let count = 1;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      count = parseInt(stored, 10) + 1;
    }
    // 오늘 날짜의 다운로드 횟수 저장
    localStorage.setItem(storageKey, count.toString());
  } catch (error) {
  }

  // 파일명 형식: cpid_파일명(n)
  let fileName = sheetName;
  if (type === 'empty') {
    fileName = `${sheetName}_빈템플릿`;
  } else if (type === 'sample') {
    fileName = `${sheetName}_샘플`;
  }

  return `${cpId}_${fileName}(${count}).xlsx`;
}

/**
 * 공통 다운로드 헬퍼
 * 
 * ★★★ 2026-02-05 수정: 엑셀 파일 형식 다운로드 문제 해결 ★★★
 * - 파일명에 .xlsx 확장자 명시적 강제
 * - MIME 타입 정확히 지정
 * - file-saver 실패 시 직접 다운로드 폴백
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();

  // ★★★ 파일명에 .xlsx 확장자 강제 ★★★
  let fullFileName = fileName;
  if (!fullFileName.toLowerCase().endsWith('.xlsx')) {
    fullFileName = `${fullFileName}.xlsx`;
  }

  // ★★★ MIME 타입 명확히 지정 ★★★
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([buffer], { type: mimeType });

  try {
    // 먼저 file-saver 시도
    saveAs(blob, fullFileName);
  } catch (e) {
    // file-saver 실패 시 직접 다운로드 로직

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fullFileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // 정리
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

  }
}

// =====================================================
// 개별 항목 시트 (공정번호 + 단일 항목)
// =====================================================

/** 개별 항목 시트 정의 (13개) */
const INDIVIDUAL_SHEET_DEFINITIONS = [
  { key: 'processName', name: '공정명', headers: ['공정번호', '공정명'], widths: [12, 20], color: COLORS.processInfo },
  { key: 'processDesc', name: '공정설명', headers: ['공정번호', '공정설명'], widths: [12, 50], color: COLORS.processInfo },
  { key: 'equipment', name: '설비/금형/지그', headers: ['공정번호', '설비/금형/지그'], widths: [12, 35], color: COLORS.processInfo },
  { key: 'productChar', name: '제품특성', headers: ['공정번호', '제품특성'], widths: [12, 30], color: COLORS.controlItem },
  { key: 'processChar', name: '공정특성', headers: ['공정번호', '공정특성'], widths: [12, 30], color: COLORS.controlItem },
  { key: 'spec', name: '스펙/공차', headers: ['공정번호', '스펙/공차'], widths: [12, 35], color: COLORS.controlItem },
  { key: 'evalMethod', name: '평가방법', headers: ['공정번호', '평가방법'], widths: [12, 30], color: COLORS.controlMethod },
  { key: 'sampleSize', name: '샘플크기', headers: ['공정번호', '샘플크기'], widths: [12, 15], color: COLORS.controlMethod },
  { key: 'frequency', name: '주기', headers: ['공정번호', '주기'], widths: [12, 15], color: COLORS.controlMethod },
  { key: 'controlMethod', name: '관리방법', headers: ['공정번호', '관리방법'], widths: [12, 25], color: COLORS.controlMethod },
  { key: 'reactionPlan', name: '대응계획', headers: ['공정번호', '대응계획'], widths: [12, 50], color: COLORS.reactionPlan },
  { key: 'ep', name: 'EP', headers: ['공정번호', 'EP'], widths: [12, 35], color: COLORS.detector },
  { key: 'autoDetector', name: '자동검사장치', headers: ['공정번호', '자동검사장치'], widths: [12, 35], color: COLORS.detector },
];

export { INDIVIDUAL_SHEET_DEFINITIONS };

/** 개별 항목 샘플 데이터 */
const INDIVIDUAL_SAMPLE_DATA: Record<string, string[][]> = {
  processName: [
    ['10', '자재입고'], ['20', '수입검사'], ['30', 'MB Mixing'], ['40', 'FM Mixing'],
    ['50', '압출'], ['60', '압연'], ['70', '비드성형'], ['80', '성형'],
    ['90', '가류'], ['100', '완성검사'], ['110', '포장'], ['120', '출하'],
  ],
  processDesc: [
    ['10', '입고된 원자재를 검수하여 지정된 창고로 입고'],
    ['20', '원부자재 샘플링 수입검사 실시'],
    ['30', '컴파운드 종류에 맞는 마스터배치 조건에 따라 혼련'],
    ['40', '파이널믹싱 조건에 따라 혼련하여 고무시트 생산'],
    ['50', '고무를 압출하여 TREAD, SIDE 등 반제품 생산'],
    ['60', '스틸코드, 패브릭코드에 고무를 코팅하여 반제품 생산'],
    ['80', '그린타이어 부재료 반제품을 접착하여 그린타이어 생산'],
    ['90', '가류기에서 그린타이어를 가열/가압하여 완제품 생산'],
    ['100', '완성품의 외관, 균형, X-ray 검사'],
  ],
  equipment: [
    ['10', '지게차, 입고대'], ['20', 'Mooney Viscometer'], ['30', 'MB Mixer, 믹싱롤'],
    ['40', 'FM Mixer'], ['50', '압출기'], ['60', '카렌다'], ['70', '비드성형기'],
    ['80', '성형기'], ['90', '가류기'], ['100', 'X-ray 검사기'],
  ],
  productChar: [
    ['10', '이물질'], ['10', '보관상태'], ['20', 'Mooney Viscosity'], ['20', '인장강도'],
    ['30', 'Mooney Viscosity'], ['40', 'Rheometer'], ['50', 'Tread 폭'],
    ['60', 'Steel Cord 폭'], ['80', 'Bead To Bead 폭'], ['90', '가류도'],
  ],
  processChar: [
    ['10', '입고 온도'], ['10', '습도'], ['20', '검사 정밀도'], ['20', '시험 조건'],
    ['30', '혼련 온도'], ['40', 'RPM'], ['50', '압출 온도'], ['60', 'EPI'],
    ['80', 'Center Deck 센터링'], ['90', '가류 온도'],
  ],
  spec: [
    ['10', '온도 20~25℃'], ['10', '습도 60% 이하'], ['20', 'Mooney 50±5'],
    ['30', 'Mooney 60±5'], ['40', 'Rheometer 규격'], ['50', 'Tread 폭 100±2mm'],
    ['60', 'Steel Cord 폭 200±3mm'], ['80', 'B2B 폭 규격'], ['90', '가류도 규격'],
  ],
  evalMethod: [
    ['10', '육안검사'], ['20', 'Mooney Viscometer'], ['30', 'Rheometer'],
    ['40', 'Rheometer'], ['50', '두께 측정'], ['60', '폭 측정'],
    ['80', '육안검사'], ['90', '가류도 측정'], ['100', 'X-ray 검사'],
  ],
  sampleSize: [
    ['10', 'n=3'], ['20', 'n=5'], ['30', 'n=3'], ['40', 'n=3'],
    ['50', 'n=5'], ['60', 'n=5'], ['80', 'n=1'], ['90', 'n=3'], ['100', '전수'],
  ],
  frequency: [
    ['10', '매입고'], ['20', '매Lot'], ['30', '매Batch'], ['40', '매Batch'],
    ['50', '매시'], ['60', '매Lot'], ['80', '매개'], ['90', '매Lot'], ['100', '매개'],
  ],
  controlMethod: [
    ['10', '검수기록'], ['20', '성적서관리'], ['30', 'SPC관리'], ['40', 'SPC관리'],
    ['50', '관리도'], ['60', '관리도'], ['80', '체크시트'], ['90', 'SPC관리'], ['100', '자동검사'],
  ],
  reactionPlan: [
    ['10', '반품 처리, 입고 중지'], ['20', '재검사, 불합격 시 반품'],
    ['30', '재작업, 공정 조건 확인'], ['40', '재작업, 설비 점검'],
    ['50', '라인 정지, 조건 재설정'], ['60', '라인 정지, 설비 점검'],
    ['80', '재작업, 지그 점검'], ['90', '재가류, 폐기'], ['100', '불량 폐기, 원인 분석'],
  ],
  ep: [
    ['10', '입고 확인 Poka-Yoke'], ['20', '성적서 확인'], ['30', '온도 알람'],
    ['40', 'RPM 알람'], ['50', '두께 알람'], ['60', '폭 알람'],
    ['80', '바코드 Poka-Yoke'], ['90', '온도/시간 알람'], ['100', '불량 자동 분류'],
  ],
  autoDetector: [
    ['10', '바코드 스캐너'], ['20', 'Mooney Viscometer'], ['30', '온도 센서'],
    ['40', 'Rheometer'], ['50', '두께 측정기'], ['60', '폭 측정기'],
    ['80', '바코드 스캐너'], ['90', '온도 기록계'], ['100', 'X-ray 자동 검사기'],
  ],
};

/** 개별 항목 빈 템플릿 생성 헬퍼 */
async function createIndividualEmptyTemplate(defKey: string) {
  const ExcelJS = (await import('exceljs')).default;
  const def = INDIVIDUAL_SHEET_DEFINITIONS.find(d => d.key === defKey);
  if (!def) return;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(['', '']);
    row.eachCell((cell) => applyDataStyle(cell, 'FFFFFF'));
  }

  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'empty'));
}

/** 개별 항목 샘플 템플릿 생성 헬퍼 */
async function createIndividualSampleTemplate(defKey: string) {
  const ExcelJS = (await import('exceljs')).default;
  const def = INDIVIDUAL_SHEET_DEFINITIONS.find(d => d.key === defKey);
  if (!def) return;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, {
    properties: { tabColor: { argb: def.color } },
  });

  sheet.columns = def.headers.map((header, i) => ({
    header,
    key: `col${i}`,
    width: def.widths[i],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

  // 안내행 제거 - 2행부터 데이터 입력

  const sampleRows = INDIVIDUAL_SAMPLE_DATA[defKey] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => {
      const cellValue = cell.value;
      const hasValue = cellValue !== null && cellValue !== undefined && cellValue !== '';
      const bgColor = hasValue ? (idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5') : 'FFFFFF';
      applyDataStyle(cell, bgColor);
    });
  });

  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

// =====================================================
// 개별 항목 템플릿 다운로드 함수들 (12개)
// =====================================================

/** 공정명 빈 템플릿 */
export async function downloadProcessNameTemplate() { await createIndividualEmptyTemplate('processName'); }
/** 공정명 샘플 템플릿 */
export async function downloadProcessNameSampleTemplate() { await createIndividualSampleTemplate('processName'); }

/** 공정설명 빈 템플릿 */
export async function downloadProcessDescTemplate() { await createIndividualEmptyTemplate('processDesc'); }
/** 공정설명 샘플 템플릿 */
export async function downloadProcessDescSampleTemplate() { await createIndividualSampleTemplate('processDesc'); }

/** 설비/금형/지그 빈 템플릿 */
export async function downloadEquipmentTemplate() { await createIndividualEmptyTemplate('equipment'); }
/** 설비/금형/지그 샘플 템플릿 */
export async function downloadEquipmentSampleTemplate() { await createIndividualSampleTemplate('equipment'); }

/** 제품특성 빈 템플릿 */
export async function downloadProductCharTemplate() { await createIndividualEmptyTemplate('productChar'); }
/** 제품특성 샘플 템플릿 */
export async function downloadProductCharSampleTemplate() { await createIndividualSampleTemplate('productChar'); }

/** 공정특성 빈 템플릿 */
export async function downloadProcessCharTemplate() { await createIndividualEmptyTemplate('processChar'); }
/** 공정특성 샘플 템플릿 */
export async function downloadProcessCharSampleTemplate() { await createIndividualSampleTemplate('processChar'); }

/** 스펙/공차 빈 템플릿 */
export async function downloadSpecTemplate() { await createIndividualEmptyTemplate('spec'); }
/** 스펙/공차 샘플 템플릿 */
export async function downloadSpecSampleTemplate() { await createIndividualSampleTemplate('spec'); }

/** 평가방법 빈 템플릿 */
export async function downloadEvalMethodTemplate() { await createIndividualEmptyTemplate('evalMethod'); }
/** 평가방법 샘플 템플릿 */
export async function downloadEvalMethodSampleTemplate() { await createIndividualSampleTemplate('evalMethod'); }

/** 샘플크기 빈 템플릿 */
export async function downloadSampleSizeTemplate() { await createIndividualEmptyTemplate('sampleSize'); }
/** 샘플크기 샘플 템플릿 */
export async function downloadSampleSizeSampleTemplate() { await createIndividualSampleTemplate('sampleSize'); }

/** 주기 빈 템플릿 */
export async function downloadFrequencyTemplate() { await createIndividualEmptyTemplate('frequency'); }
/** 주기 샘플 템플릿 */
export async function downloadFrequencySampleTemplate() { await createIndividualSampleTemplate('frequency'); }

/** 대응계획 빈 템플릿 (단일 항목) */
export async function downloadReactionPlanItemTemplate() { await createIndividualEmptyTemplate('reactionPlan'); }
/** 대응계획 샘플 템플릿 (단일 항목) */
export async function downloadReactionPlanItemSampleTemplate() { await createIndividualSampleTemplate('reactionPlan'); }

/** EP 빈 템플릿 */
export async function downloadEPTemplate() { await createIndividualEmptyTemplate('ep'); }
/** EP 샘플 템플릿 */
export async function downloadEPSampleTemplate() { await createIndividualSampleTemplate('ep'); }

/** 자동검사장치 빈 템플릿 */
export async function downloadAutoDetectorTemplate() { await createIndividualEmptyTemplate('autoDetector'); }
/** 자동검사장치 샘플 템플릿 */
export async function downloadAutoDetectorSampleTemplate() { await createIndividualSampleTemplate('autoDetector'); }

/** 동적 개별 항목 템플릿 다운로드 (key 기반) */
export async function downloadIndividualTemplate(key: string) {
  await createIndividualEmptyTemplate(key);
}

/** 동적 개별 항목 샘플 템플릿 다운로드 (key 기반) */
export async function downloadIndividualSampleTemplate(key: string) {
  await createIndividualSampleTemplate(key);
}

// =====================================================
// CP 워크시트 템플릿 (19컬럼, 셀병합 포함)
// =====================================================

/** 워크시트 19컬럼 정의 */
const WS_COLUMNS = [
  { key: 'processNo', label: '공정번호', width: 8, group: 'processInfo' },
  { key: 'processName', label: '공정명', width: 12, group: 'processInfo' },
  { key: 'level', label: '레벨', width: 6, group: 'processInfo' },
  { key: 'processDesc', label: '공정설명', width: 25, group: 'processInfo' },
  { key: 'equipment', label: '설비/금형/JIG', width: 15, group: 'processInfo' },
  { key: 'ep', label: 'EP', width: 10, group: 'detector' },
  { key: 'autoDetector', label: '자동검사', width: 10, group: 'detector' },
  { key: 'productChar', label: '제품특성', width: 12, group: 'controlItem' },
  { key: 'processChar', label: '공정특성', width: 12, group: 'controlItem' },
  { key: 'specialChar', label: '특별특성', width: 6, group: 'controlItem' },
  { key: 'spec', label: '스펙/공차', width: 15, group: 'controlItem' },
  { key: 'evalMethod', label: '평가방법', width: 15, group: 'controlMethod' },
  { key: 'sampleSize', label: '샘플크기', width: 8, group: 'controlMethod' },
  { key: 'frequency', label: '주기', width: 8, group: 'controlMethod' },
  { key: 'controlMethod', label: '관리방법', width: 12, group: 'controlMethod' },
  { key: 'owner1', label: '책임1', width: 8, group: 'controlMethod' },
  { key: 'owner2', label: '책임2', width: 8, group: 'controlMethod' },
  { key: 'reactionPlan', label: '조치방법', width: 20, group: 'reactionPlan' },
];

/** 워크시트 그룹 헤더 정의 (행2 셀병합) */
const WS_GROUP_HEADERS = [
  { label: '공정현황', colStart: 1, colEnd: 5, color: COLORS.processInfo },
  { label: '검출장치', colStart: 6, colEnd: 7, color: COLORS.detector },
  { label: '관리항목', colStart: 8, colEnd: 11, color: COLORS.controlItem },
  { label: '관리방법', colStart: 12, colEnd: 17, color: COLORS.controlMethod },
  { label: '조치방법', colStart: 18, colEnd: 18, color: COLORS.reactionPlan },
];

/** 워크시트 셀병합 샘플 데이터 (공정번호가 같은 행은 공정현황 컬럼 병합) */
const WS_SAMPLE_DATA: string[][] = [
  ['10', '자재입고', 'Main', '입고된 원자재를 검수하여 창고 입고', '지게차, 입고대', '입고 확인 Poka-Yoke', '바코드 스캐너', '이물질', '입고 온도', '', '온도 20~25℃', '육안검사', 'n=3', '매입고', '검수기록', '검사원', '', '반품 처리, 입고 중지'],
  ['10', '자재입고', 'Main', '입고된 원자재를 검수하여 창고 입고', '지게차, 입고대', '', '', '보관상태', '습도', '', '습도 60% 이하', '육안검사', 'n=3', '매입고', '검수기록', '검사원', '', '반품 처리, 입고 중지'],
  ['20', '수입검사', 'Main', '원부자재 샘플링 수입검사 실시', 'Mooney Viscometer', '성적서 확인', 'Mooney Viscometer', 'Mooney Viscosity', '검사 정밀도', '★', 'Mooney 50±5', 'Mooney Viscometer', 'n=5', '매Lot', '성적서관리', '검사원', '품질팀장', '재검사, 불합격 시 반품'],
  ['20', '수입검사', 'Main', '원부자재 샘플링 수입검사 실시', 'Mooney Viscometer', '', '', '인장강도', '시험 조건', '', '인장강도 규격', 'Mooney Viscometer', 'n=5', '매Lot', '성적서관리', '검사원', '품질팀장', '재검사, 불합격 시 반품'],
  ['30', 'MB Mixing', 'Main', '마스터배치 조건에 따라 혼련', 'MB Mixer, 믹싱롤', '온도 알람', '온도 센서', 'Mooney Viscosity', '혼련 온도', '★', 'Mooney 60±5', 'Rheometer', 'n=3', '매Batch', 'SPC관리', '작업자', '공정팀장', '재작업, 공정 조건 확인'],
  ['40', 'FM Mixing', 'Main', '파이널믹싱 조건에 따라 혼련', 'FM Mixer', 'RPM 알람', 'Rheometer', 'Rheometer', 'RPM', 'SC', 'Rheometer 규격', 'Rheometer', 'n=3', '매Batch', 'SPC관리', '작업자', '공정팀장', '재작업, 설비 점검'],
  ['50', '압출', 'Main', '고무를 압출하여 반제품 생산', '압출기', '두께 알람', '두께 측정기', 'Tread 폭', '압출 온도', '★', 'Tread 폭 100±2mm', '두께 측정', 'n=5', '매시', '관리도', '작업자', '', '라인 정지, 조건 재설정'],
  ['60', '압연', 'Main', '스틸코드에 고무 코팅하여 반제품 생산', '카렌다', '폭 알람', '폭 측정기', 'Steel Cord 폭', 'EPI', 'SC', 'Steel Cord 폭 200±3mm', '폭 측정', 'n=5', '매Lot', '관리도', '작업자', '', '라인 정지, 설비 점검'],
  ['80', '성형', 'Main', '그린타이어 반제품 접착', '성형기', '바코드 Poka-Yoke', '바코드 스캐너', 'B2B 폭', 'Center Deck 센터링', '★', 'B2B 폭 규격', '육안검사', 'n=1', '매개', '체크시트', '작업자', '', '재작업, 지그 점검'],
  ['90', '가류', 'Main', '그린타이어를 가열/가압하여 완제품 생산', '가류기', '온도/시간 알람', '온도 기록계', '가류도', '가류 온도', '★', '가류도 규격', '가류도 측정', 'n=3', '매Lot', 'SPC관리', '작업자', '품질팀장', '재가류, 폐기'],
  ['100', '완성검사', 'Main', '완성품 외관, 균형, X-ray 검사', 'X-ray 검사기', '불량 자동 분류', 'X-ray 자동 검사기', '외관', '검사 정밀도', '', '외관 규격', 'X-ray 검사', '전수', '매개', '자동검사', '검사원', '품질팀장', '불량 폐기, 원인 분석'],
];

/** 워크시트 Excel 공통 생성 로직 */
async function createWorksheetTemplate(isSample: boolean) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Control Plan Smart System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('CP 워크시트', {
    properties: { tabColor: { argb: COLORS.processInfo } },
  });

  // 컬럼 너비 설정
  WS_COLUMNS.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.width;
  });

  // ── 행1: 메타 정보 ──
  const metaRow = sheet.getRow(1);
  metaRow.height = 22;
  const metaCell = sheet.getCell('A1');
  metaCell.value = 'CP No: (자동)  |  품명: (입력)  |  고객: (입력)  |  개정: Rev.0';
  metaCell.font = { bold: true, size: 10, name: '맑은 고딕', color: { argb: '333333' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.mergeCells(1, 1, 1, WS_COLUMNS.length);

  // ── 행2: 그룹 헤더 (셀병합) ──
  const groupRow = sheet.getRow(2);
  groupRow.height = 22;
  WS_GROUP_HEADERS.forEach((gh) => {
    if (gh.colStart !== gh.colEnd) {
      sheet.mergeCells(2, gh.colStart, 2, gh.colEnd);
    }
    const cell = sheet.getCell(2, gh.colStart);
    cell.value = gh.label;
    applyHeaderStyle(cell, gh.color);
  });
  // 병합 안 된 셀도 스타일 적용
  for (let c = 1; c <= WS_COLUMNS.length; c++) {
    const cell = sheet.getCell(2, c);
    if (!cell.value) {
      const gh = WS_GROUP_HEADERS.find(g => c >= g.colStart && c <= g.colEnd);
      if (gh) applyHeaderStyle(cell, gh.color);
    }
  }

  // ── 행3: 컬럼 헤더 ──
  const headerRow = sheet.getRow(3);
  headerRow.height = 22;
  WS_COLUMNS.forEach((col, i) => {
    const cell = sheet.getCell(3, i + 1);
    cell.value = col.label;
    const gh = WS_GROUP_HEADERS.find(g => (i + 1) >= g.colStart && (i + 1) <= g.colEnd);
    applyHeaderStyle(cell, gh?.color || COLORS.processInfo);
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 9, name: '맑은 고딕' };
  });

  // ── 행4~: 데이터 ──
  const dataRows = isSample ? WS_SAMPLE_DATA : [];

  if (isSample && dataRows.length > 0) {
    // 셀병합 적용: 동일 공정번호 행의 공정현황 컬럼(1~5) 병합
    let startRowIdx = 4; // Excel 행 번호
    let i = 0;
    while (i < dataRows.length) {
      const processNo = dataRows[i][0];
      let count = 1;
      while (i + count < dataRows.length && dataRows[i + count][0] === processNo) {
        count++;
      }

      // 데이터 행 추가
      for (let j = 0; j < count; j++) {
        const row = sheet.getRow(startRowIdx + j);
        dataRows[i + j].forEach((val, ci) => {
          const cell = row.getCell(ci + 1);
          cell.value = val;
          const zebraColor = (startRowIdx + j) % 2 === 0 ? 'F5F5F5' : 'FFFFFF';
          applyDataStyle(cell, zebraColor, ci >= 3 ? 'left' : 'center');
        });
      }

      // 공정현황 컬럼(1~5) + 검출장치(6~7) 셀병합 (2행 이상일 때)
      if (count > 1) {
        for (let col = 1; col <= 7; col++) {
          sheet.mergeCells(startRowIdx, col, startRowIdx + count - 1, col);
        }
      }

      startRowIdx += count;
      i += count;
    }
  } else {
    // 빈 템플릿: 15행
    for (let r = 0; r < 15; r++) {
      const row = sheet.getRow(4 + r);
      for (let c = 1; c <= WS_COLUMNS.length; c++) {
        const cell = row.getCell(c);
        cell.value = '';
        applyDataStyle(cell, r % 2 === 0 ? 'FFFFFF' : 'F5F5F5');
      }
    }
  }

  // 열 고정 (공정번호+공정명 고정, 헤더 3행)
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 3 }];

  return workbook;
}

/** CP 워크시트 빈 템플릿 다운로드 (19컬럼 셀병합) */
export async function downloadWorksheetEmptyTemplate() {
  const workbook = await createWorksheetTemplate(false);
  await downloadWorkbook(workbook, generateFileName('워크시트', 'empty'));
}

/** CP 워크시트 샘플 템플릿 다운로드 (19컬럼 셀병합 + 샘플데이터) */
export async function downloadWorksheetSampleTemplate() {
  const workbook = await createWorksheetTemplate(true);
  await downloadWorkbook(workbook, generateFileName('워크시트', 'sample'));
}

// =====================================================
// 현재 데이터 다운로드 (미리보기 데이터 → Excel)
// =====================================================

/** itemCode → 컬럼 key 매핑 */
const ITEM_CODE_TO_KEY: Record<string, string> = {
  'A1': 'processNo',
  'A2': 'processName',
  'A3': 'level',
  'A4': 'processDesc',
  'A5': 'equipment',
  'A6': 'ep',
  'A7': 'autoDetector',
  'B1': 'productChar',
  'B2': 'processChar',
  'B3': 'specialChar',
  'B4': 'spec',
  'B5': 'evalMethod',
  'B6': 'sampleSize',
  'B7': 'frequency',
  'B7-1': 'controlMethod',
  'B8': 'owner1',
  'B9': 'owner2',
  'B10': 'reactionPlan',
};

interface ImportedDataItem {
  id: string;
  processNo: string;
  processName?: string;
  category: string;
  itemCode: string;
  value: string;
  createdAt: Date;
}

/**
 * 현재 미리보기 데이터를 Excel 파일로 다운로드
 * @param data - ImportedData 배열 (fullData + groupData + itemData)
 * @param cpId - CP ID (파일명에 사용)
 */
export async function downloadCurrentData(data: ImportedDataItem[], cpId: string = 'cp26-m001') {
  if (!data || data.length === 0) {
    alert('⚠️ 다운로드할 데이터가 없습니다.');
    return;
  }

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Control Plan Smart System';
  workbook.created = new Date();

  // 데이터를 공정번호별로 그룹화
  const processNos = [...new Set(data.map(d => d.processNo))].sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  // 각 공정번호에 대한 데이터 추출 함수
  const getValueForProcess = (processNo: string, itemCode: string): string => {
    const item = data.find(d => d.processNo === processNo && d.itemCode === itemCode);
    return item?.value || '';
  };

  // 각 시트 생성 및 데이터 추가
  CP_SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    // 컬럼 설정
    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: def.widths[i],
    }));

    // 헤더 스타일
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    // 시트별 데이터 매핑
    const sheetDataMapping: Record<string, string[]> = {
      '공정현황': ['A1', 'A2', 'A3', 'A4', 'A5'],
      '검출장치': ['A1', 'A2', 'A6', 'A7'],
      '관리항목': ['A1', 'A2', 'B1', 'B2', 'B3', 'B4'],
      '관리방법': ['A1', 'A2', 'B5', 'B6', 'B7', 'B7-1', 'B8', 'B9'],
      '대응계획': ['A1', 'A2', 'B1', 'B2', 'B10'],
    };

    const itemCodes = sheetDataMapping[def.name] || [];

    // 데이터 행 추가
    processNos.forEach((processNo, idx) => {
      const rowData = itemCodes.map(itemCode => getValueForProcess(processNo, itemCode));
      const row = worksheet.addRow(rowData);
      row.eachCell((cell) => {
        applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5');
      });
    });

    // 빈 행 추가 (최소 15행)
    const emptyRowsNeeded = Math.max(0, 15 - processNos.length);
    for (let i = 0; i < emptyRowsNeeded; i++) {
      const row = worksheet.addRow(def.headers.map(() => ''));
      row.eachCell((cell) => applyDataStyle(cell, (processNos.length + i) % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
    }

    // 열 고정
    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  });

  // 파일명 생성 및 다운로드
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `${cpId}_기초정보_현재데이터_${timestamp}.xlsx`;
  await downloadWorkbook(workbook, fileName);
}
