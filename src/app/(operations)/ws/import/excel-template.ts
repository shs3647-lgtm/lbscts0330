/**
 * @file excel-template.ts
 * @description PFD 기초정보 Excel 템플릿 생성 유틸리티
 * @created 2026-01-24
 * @benchmark CP Import excel-template.ts 기반
 * 
 * PFD 시트 구조 (2개):
 * 1. 공정정보: 공정번호, 공정명, 공정설명, 작업요소, 설비/금형/지그
 * 2. 특성정보: 공정번호, 공정명, 제품특별특성, 제품특성, 공정특별특성, 공정특성
 */

import ExcelJS from 'exceljs';

/** 헤더 색상 */
const COLORS = {
  processInfo: '0D9488',    // 공정정보 - Teal
  characteristic: '2196F3', // 특성정보 - Blue
};

/** PFD 시트 정의 (2개 시트) */
const PFD_SHEET_DEFINITIONS = [
  {
    name: '공정정보',
    headers: ['공정번호', '공정명', '공정설명', '작업요소', '설비/금형/지그'],
    widths: [12, 15, 40, 20, 25],
    required: [true, true, false, false, false],
    color: COLORS.processInfo,
  },
  {
    name: '특성정보',
    headers: ['공정번호', '공정명', '제품특별특성', '제품특성', '공정특별특성', '공정특성'],
    widths: [12, 15, 15, 20, 15, 20],
    required: [true, true, false, false, false, false],
    color: COLORS.characteristic,
  },
];

/** 샘플 데이터 */
const PFD_SAMPLE_DATA: Record<string, string[][]> = {
  '공정정보': [
    ['10', '자재입고', '원자재 입고 및 검수', '입고 확인', '바코드 스캐너'],
    ['20', '수입검사', '원자재 품질 검사', '성적서 확인', 'Mooney Viscometer'],
    ['30', 'MB Mixing', 'Master Batch 배합', '배합 작업', '믹서'],
    ['40', 'FM Mixing', 'Final Mix 배합', '최종 배합', '믹서'],
    ['50', '압출', '고무 압출 공정', '압출 작업', '압출기'],
    ['60', '압연', '고무 시트 압연', '압연 작업', '압연기'],
    ['80', '성형', '제품 성형', '성형 작업', '프레스'],
    ['90', '가류', '가류 공정', '가류 작업', '가류기'],
    ['100', '완성검사', '최종 검사', '검사 작업', 'X-ray 검사기'],
  ],
  '특성정보': [
    ['10', '자재입고', 'P', '입고 확인', 'C', '바코드 일치'],
    ['20', '수입검사', '', 'ML1+4', '', 'Mooney 점도'],
    ['30', 'MB Mixing', '', '배합비', '', '온도'],
    ['40', 'FM Mixing', 'P', '최종 배합비', 'C', 'RPM'],
    ['50', '압출', '', '압출 두께', '', '압출 속도'],
    ['60', '압연', '', '시트 두께', '', '압연 속도'],
    ['80', '성형', 'P', '성형 치수', 'C', '프레스 압력'],
    ['90', '가류', '', '가류 시간', '', '가류 온도'],
    ['100', '완성검사', 'P', '외관 검사', 'C', 'X-ray 검사'],
  ],
};

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

/** 파일명 생성 */
function generateFileName(sheetName: string, type: 'template' | 'sample' = 'template'): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const typeLabel = type === 'sample' ? '샘플' : '양식';
  return `pfd${year}-m001_${sheetName}_${typeLabel}_${timestamp}.xlsx`;
}

/** 워크북 다운로드 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =====================================================
// 전체 템플릿 다운로드 (다중 시트)
// =====================================================

/** 빈 템플릿 다운로드 */
export async function downloadPFDEmptyTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PFD Smart System';
  workbook.created = new Date();

  PFD_SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: def.widths[i],
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    for (let i = 0; i < 15; i++) {
      const row = worksheet.addRow(def.headers.map(() => ''));
      row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
    }

    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  });

  await downloadWorkbook(workbook, generateFileName('기초정보', 'template'));
}

/** 샘플 데이터 템플릿 다운로드 */
export async function downloadPFDSampleTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PFD Smart System';
  workbook.created = new Date();

  PFD_SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: def.widths[i],
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    const sampleRows = PFD_SAMPLE_DATA[def.name] || [];
    sampleRows.forEach((data, idx) => {
      const row = worksheet.addRow(data);
      row.eachCell((cell) => {
        applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5');
      });
    });

    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  });

  await downloadWorkbook(workbook, generateFileName('기초정보', 'sample'));
}

// =====================================================
// 개별 시트 템플릿 다운로드
// =====================================================

/** 공정정보 빈 템플릿 */
export async function downloadProcessInfoTemplate() {
  const def = PFD_SHEET_DEFINITIONS[0];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, { properties: { tabColor: { argb: def.color } } });
  
  sheet.columns = def.headers.map((header, i) => ({ header, key: `col${i}`, width: def.widths[i] }));
  
  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));
  
  for (let i = 0; i < 15; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 공정정보 샘플 템플릿 */
export async function downloadProcessInfoSampleTemplate() {
  const def = PFD_SHEET_DEFINITIONS[0];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, { properties: { tabColor: { argb: def.color } } });
  
  sheet.columns = def.headers.map((header, i) => ({ header, key: `col${i}`, width: def.widths[i] }));
  
  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));
  
  const sampleRows = PFD_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

/** 특성정보 빈 템플릿 */
export async function downloadCharacteristicTemplate() {
  const def = PFD_SHEET_DEFINITIONS[1];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, { properties: { tabColor: { argb: def.color } } });
  
  sheet.columns = def.headers.map((header, i) => ({ header, key: `col${i}`, width: def.widths[i] }));
  
  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));
  
  for (let i = 0; i < 15; i++) {
    const row = sheet.addRow(def.headers.map(() => ''));
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'template'));
}

/** 특성정보 샘플 템플릿 */
export async function downloadCharacteristicSampleTemplate() {
  const def = PFD_SHEET_DEFINITIONS[1];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(def.name, { properties: { tabColor: { argb: def.color } } });
  
  sheet.columns = def.headers.map((header, i) => ({ header, key: `col${i}`, width: def.widths[i] }));
  
  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));
  
  const sampleRows = PFD_SAMPLE_DATA[def.name] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });
  
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(def.name, 'sample'));
}

// =====================================================
// 개별 항목 템플릿 (공정번호 + 단일 항목)
// =====================================================

const INDIVIDUAL_ITEM_CONFIG: Record<string, { label: string; width: number }> = {
  processName: { label: '공정명', width: 20 },
  processDesc: { label: '공정설명', width: 40 },
  workElement: { label: '작업요소', width: 25 },
  equipment: { label: '설비/금형/지그', width: 25 },
  productSpecialChar: { label: '제품특별특성', width: 15 },
  productChar: { label: '제품특성', width: 20 },
  processSpecialChar: { label: '공정특별특성', width: 15 },
  processChar: { label: '공정특성', width: 20 },
};

const INDIVIDUAL_SAMPLE_DATA: Record<string, string[][]> = {
  processName: [['10', '자재입고'], ['20', '수입검사'], ['30', 'MB Mixing']],
  processDesc: [['10', '원자재 입고 및 검수'], ['20', '원자재 품질 검사'], ['30', 'Master Batch 배합']],
  workElement: [['10', '입고 확인'], ['20', '성적서 확인'], ['30', '배합 작업']],
  equipment: [['10', '바코드 스캐너'], ['20', 'Mooney Viscometer'], ['30', '믹서']],
  productSpecialChar: [['10', 'P'], ['40', 'P'], ['80', 'P']],
  productChar: [['10', '입고 확인'], ['20', 'ML1+4'], ['30', '배합비']],
  processSpecialChar: [['10', 'C'], ['40', 'C'], ['80', 'C']],
  processChar: [['10', '바코드 일치'], ['20', 'Mooney 점도'], ['30', '온도']],
};

/** 개별 항목 빈 템플릿 */
export async function downloadIndividualTemplate(key: string) {
  const config = INDIVIDUAL_ITEM_CONFIG[key];
  if (!config) {
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(config.label);

  sheet.columns = [
    { header: '공정번호', key: 'processNo', width: 12 },
    { header: config.label, key: 'value', width: config.width },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, COLORS.processInfo));

  for (let i = 0; i < 15; i++) {
    const row = sheet.addRow(['', '']);
    row.eachCell((cell) => applyDataStyle(cell, i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  }

  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(config.label, 'template'));
}

/** 개별 항목 샘플 템플릿 */
export async function downloadIndividualSampleTemplate(key: string) {
  const config = INDIVIDUAL_ITEM_CONFIG[key];
  if (!config) {
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(config.label);
  
  sheet.columns = [
    { header: '공정번호', key: 'processNo', width: 12 },
    { header: config.label, key: 'value', width: config.width },
  ];
  
  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, COLORS.processInfo));
  
  const sampleRows = INDIVIDUAL_SAMPLE_DATA[key] || [];
  sampleRows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    row.eachCell((cell) => applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
  });
  
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  await downloadWorkbook(workbook, generateFileName(config.label, 'sample'));
}

// =====================================================
// 현재 데이터 다운로드 (미리보기 데이터 → Excel)
// =====================================================

/** itemCode → 컬럼 key 매핑 */
const ITEM_CODE_TO_KEY: Record<string, string> = {
  'A1': 'processNo',
  'A2': 'processName',
  'A3': 'processDesc',
  'A4': 'workElement',
  'A5': 'equipment',
  'B1': 'productSpecialChar',
  'B2': 'productChar',
  'B3': 'processSpecialChar',
  'B4': 'processChar',
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
 */
export async function downloadCurrentData(data: ImportedDataItem[], pfdId: string = 'pfd26-m001') {
  if (!data || data.length === 0) {
    alert('⚠️ 다운로드할 데이터가 없습니다.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PFD Smart System';
  workbook.created = new Date();

  const processNos = [...new Set(data.map(d => d.processNo))].sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  const getValueForProcess = (processNo: string, itemCode: string): string => {
    const item = data.find(d => d.processNo === processNo && d.itemCode === itemCode);
    return item?.value || '';
  };

  const sheetDataMapping: Record<string, string[]> = {
    '공정정보': ['A1', 'A2', 'A3', 'A4', 'A5'],
    '특성정보': ['A1', 'A2', 'B1', 'B2', 'B3', 'B4'],
  };

  PFD_SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: def.widths[i],
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    const itemCodes = sheetDataMapping[def.name] || [];

    processNos.forEach((processNo, idx) => {
      const rowData = itemCodes.map(itemCode => getValueForProcess(processNo, itemCode));
      const row = worksheet.addRow(rowData);
      row.eachCell((cell) => {
        applyDataStyle(cell, idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5');
      });
    });

    const emptyRowsNeeded = Math.max(0, 15 - processNos.length);
    for (let i = 0; i < emptyRowsNeeded; i++) {
      const row = worksheet.addRow(def.headers.map(() => ''));
      row.eachCell((cell) => applyDataStyle(cell, (processNos.length + i) % 2 === 0 ? 'FFFFFF' : 'F5F5F5'));
    }

    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  });

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `${pfdId}_기초정보_현재데이터_${timestamp}.xlsx`;
  await downloadWorkbook(workbook, fileName);
}
