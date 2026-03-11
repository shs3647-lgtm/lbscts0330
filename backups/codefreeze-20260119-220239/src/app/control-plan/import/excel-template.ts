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
 * 1. 공정현황: 공정번호, 공정명, 레벨, 공정설명, 설비/금형/지그
 * 2. 관리항목: 공정번호, 공정명, 제품특성, 공정특성, 특별특성, 스펙/공차
 * 3. 관리방법: 공정번호, 공정명, 평가방법, 샘플크기, 주기, 책임1, 책임2
 * 4. 대응계획: 공정번호, 공정명, 제품특성, 공정특성, 대응계획
 * 5. 검출장치: 공정번호, 공정명, EP, 자동검사장치
 */

import ExcelJS from 'exceljs';

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

function applyDataStyle(cell: ExcelJS.Cell, zebraColor?: string) {
  if (zebraColor) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
  }
  cell.border = {
    top: { style: 'thin', color: { argb: '999999' } },
    left: { style: 'thin', color: { argb: '999999' } },
    bottom: { style: 'thin', color: { argb: '999999' } },
    right: { style: 'thin', color: { argb: '999999' } },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.font = { name: '맑은 고딕', size: 10 };
}

/** 빈 템플릿 다운로드 (다중 시트) */
export async function downloadCPEmptyTemplate() {
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

    // 안내 행 (2행)
    const guideRow = worksheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
    guideRow.eachCell((cell) => applyGuideStyle(cell));

    // 빈 데이터 행 15개
    for (let i = 0; i < 15; i++) {
      const row = worksheet.addRow(def.headers.map(() => ''));
      row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
    }

    // 열 고정 (공정번호+공정명 고정)
    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
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
    ['20', '수입검사', 'Mooney Viscosity', '검사 정밀도', 'CC', 'Mooney 50±5'],
    ['20', '수입검사', '인장강도', '시험 조건', '', '인장강도 규격'],
    ['30', 'MB Mixing', 'Mooney Viscosity', '혼련 온도', 'CC', 'Mooney 60±5'],
    ['40', 'FM Mixing', 'Rheometer', 'RPM', 'SC', 'Rheometer 규격'],
    ['50', '압출', 'Tread 폭', '압출 온도', 'CC', 'Tread 폭 100±2mm'],
    ['60', '압연', 'Steel Cord 폭', 'EPI', 'SC', 'Steel Cord 폭 200±3mm'],
    ['80', '성형', 'Bead To Bead 폭', 'Center Deck 센터링', 'CC', 'B2B 폭 규격'],
    ['90', '가류', '가류도', '가류 온도', 'CC', '가류도 규격'],
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

    // 안내 행 (2행)
    const guideRow = worksheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
    guideRow.eachCell((cell) => applyGuideStyle(cell));

    // 샘플 데이터 추가
    const sampleRows = CP_SAMPLE_DATA[def.name] || [];
    sampleRows.forEach((data, idx) => {
      const row = worksheet.addRow(data);
      row.eachCell((cell) => {
        applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5');
      });
    });

    // 열 고정
    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  });

  // 파일 다운로드
  await downloadWorkbook(workbook, generateFileName('기초정보', 'sample'));
}

// =====================================================
// 개별 시트 템플릿 다운로드 함수들
// =====================================================

/** 공정현황 빈 템플릿 */
export async function downloadProcessInfoTemplate() {
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
  
  const guideRow = sheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  for (let i = 0; i < 15; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 공정현황 샘플 템플릿 */
export async function downloadProcessInfoSampleTemplate() {
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
  
  const guideRow = sheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  const sampleRows = CP_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

/** 관리항목 빈 템플릿 */
export async function downloadControlItemTemplate() {
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
  
  const guideRow = sheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 관리항목 샘플 템플릿 */
export async function downloadControlItemSampleTemplate() {
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
  
  const guideRow = sheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  const sampleRows = CP_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

/** 관리방법 빈 템플릿 */
export async function downloadControlMethodTemplate() {
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
  
  const guideRow = sheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 관리방법 샘플 템플릿 */
export async function downloadControlMethodSampleTemplate() {
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
  
  const guideRow = sheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  const sampleRows = CP_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

/** 대응계획 빈 템플릿 */
export async function downloadReactionPlanTemplate() {
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
  
  const guideRow = sheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 대응계획 샘플 템플릿 */
export async function downloadReactionPlanSampleTemplate() {
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
  
  const guideRow = sheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  const sampleRows = CP_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

/** 검출장치 빈 템플릿 */
export async function downloadDetectorTemplate() {
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
  
  const guideRow = sheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  for (let i = 0; i < 15; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 검출장치 샘플 템플릿 */
export async function downloadDetectorSampleTemplate() {
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
  
  const guideRow = sheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  const sampleRows = CP_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
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
    console.warn('localStorage 접근 실패, 기본값 사용:', error);
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

/** 공통 다운로드 헬퍼 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
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
  
  const guideRow = sheet.addRow(['(필수)', '(선택)']);
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(['', '']);
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }
  
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'empty'));
}

/** 개별 항목 샘플 템플릿 생성 헬퍼 */
async function createIndividualSampleTemplate(defKey: string) {
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
  
  const guideRow = sheet.addRow(['(필수)', '(선택)']);
  guideRow.eachCell((cell) => applyGuideStyle(cell));
  
  const sampleRows = INDIVIDUAL_SAMPLE_DATA[defKey] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });
  
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
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
