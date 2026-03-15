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

import type ExcelJS from 'exceljs';

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
    ['10', '자재입고', 'Wafer 및 원부자재 입고 검수', '입고 확인', '바코드 스캐너'],
    ['20', '수입검사', 'Wafer 외관 및 물성 수입검사', '성적서 확인', '현미경, 프로브 스테이션'],
    ['30', 'Scrubber', 'Wafer 표면 세정 처리', '세정 작업', 'Scrubber 장비'],
    ['40', 'UBM Sputter', 'Under Bump Metallurgy 증착', '증착 작업', 'Sputter 장비'],
    ['50', 'PR Coating', 'Photo Resist 도포', 'PR 도포', 'Coater'],
    ['60', 'Expose/Develop', '노광 및 현상 공정', '패턴 형성', 'Stepper, Developer'],
    ['70', 'Au Plating', 'Au Bump 전기도금', '도금 작업', '도금조'],
    ['90', 'Reflow', 'Bump Reflow 처리', 'Reflow 작업', 'Reflow Oven'],
    ['100', '완성검사', 'Bump 높이/위치/외관 최종검사', '검사 작업', '3D 측정기'],
  ],
  '특성정보': [
    ['10', '자재입고', 'P', 'Wafer 외관', 'C', '바코드 일치'],
    ['20', '수입검사', '', 'Wafer 두께 TTV', '', '검사 정밀도'],
    ['30', 'Scrubber', '', '파티클 수', '', '세정 시간'],
    ['40', 'UBM Sputter', 'P', 'Ti/Cu 막두께', 'C', 'Sputter Power'],
    ['50', 'PR Coating', '', 'PR 두께', '', 'Spin Speed'],
    ['60', 'Expose/Develop', 'P', 'CD(Critical Dimension)', 'C', '노광량'],
    ['70', 'Au Plating', 'P', 'Bump 높이', 'C', '도금 전류밀도'],
    ['90', 'Reflow', '', 'Bump 형상', '', 'Reflow 온도'],
    ['100', '완성검사', 'P', 'Bump 높이 균일도', 'C', 'AOI 검사'],
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
  const ExcelJS = (await import('exceljs')).default;
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
  const ExcelJS = (await import('exceljs')).default;
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
  const ExcelJS = (await import('exceljs')).default;
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
  const ExcelJS = (await import('exceljs')).default;
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
  const ExcelJS = (await import('exceljs')).default;
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
  const ExcelJS = (await import('exceljs')).default;
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
  processName: [['10', '자재입고'], ['20', '수입검사'], ['30', 'Scrubber']],
  processDesc: [['10', 'Wafer 및 원부자재 입고 검수'], ['20', 'Wafer 외관 및 물성 수입검사'], ['30', 'Wafer 표면 세정 처리']],
  workElement: [['10', '입고 확인'], ['20', '성적서 확인'], ['30', '세정 작업']],
  equipment: [['10', '바코드 스캐너'], ['20', '현미경, 프로브 스테이션'], ['30', 'Scrubber 장비']],
  productSpecialChar: [['10', 'P'], ['40', 'P'], ['70', 'P']],
  productChar: [['10', 'Wafer 외관'], ['20', 'Wafer 두께 TTV'], ['30', '파티클 수']],
  processSpecialChar: [['10', 'C'], ['40', 'C'], ['70', 'C']],
  processChar: [['10', '바코드 일치'], ['20', '검사 정밀도'], ['30', '세정 시간']],
};

/** 개별 항목 빈 템플릿 */
export async function downloadIndividualTemplate(key: string) {
  const config = INDIVIDUAL_ITEM_CONFIG[key];
  if (!config) {
    return;
  }

  const ExcelJS = (await import('exceljs')).default;
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

  const ExcelJS = (await import('exceljs')).default;
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

  const ExcelJS = (await import('exceljs')).default;
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
