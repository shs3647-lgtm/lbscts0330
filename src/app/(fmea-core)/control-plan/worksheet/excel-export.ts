/**
 * @file excel-export.ts
 * @description Control Plan 엑셀 내보내기 (셀 병합 유지)
 * @version 1.0.0
 * @created 2026-01-23
 * 
 * 시트 구성:
 * 1. CP 등록정보 - 기본 정보
 * 2. CP 워크시트 - 전체 데이터 (셀 병합 포함)
 */

import type ExcelJS from 'exceljs';
import { CPItem, CPState } from './types';
import { CP_COLUMNS, CP_GROUPS, COLORS } from './cpConstants';
import { fetchFmeaExportData, writeCftSection, writeRevisionSection } from '@/lib/excel-info-sections';

// =====================================================
// 타입 정의
// =====================================================
interface CPInfo {
  cpNo: string;
  fmeaId: string;
  fmeaNo: string;
  partName: string;
  customer: string;
  createdAt?: string;
  revisionNo?: string;
}

interface SpanInfo {
  isFirst: boolean;
  span: number;
}

// =====================================================
// 스타일 정의
// =====================================================
const EXCEL_COLORS = {
  primary: '1565C0',
  secondary: '2E7D32',
  warning: 'F57C00',
  purple: '7B1FA2',
  headerText: 'FFFFFF',
  lightGray: 'F5F5F5',
  white: 'FFFFFF',
  borderColor: 'BDBDBD',
};

// 헤더 스타일 적용
const applyHeaderStyle = (cell: ExcelJS.Cell, bgColor: string) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: bgColor.replace('#', '') }
  };
  cell.font = {
    color: { argb: EXCEL_COLORS.headerText },
    bold: true,
    size: 10,
    name: '맑은 고딕'
  };
  cell.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true
  };
  cell.border = {
    top: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } }
  };
};

// 데이터 셀 스타일 적용 (중앙정렬)
const applyDataStyle = (cell: ExcelJS.Cell, bgColor: string, align: 'left' | 'center' | 'right' = 'center') => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: bgColor.replace('#', '') }
  };
  cell.font = {
    size: 9,
    name: '맑은 고딕'
  };
  cell.alignment = {
    vertical: 'middle',
    horizontal: align,
    wrapText: true
  };
  cell.border = {
    top: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } }
  };
};

// 제목 스타일 적용
const applyTitleStyle = (cell: ExcelJS.Cell) => {
  cell.font = {
    bold: true,
    size: 14,
    name: '맑은 고딕',
    color: { argb: '1565C0' }
  };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
};

// 라벨 스타일 적용
const applyLabelStyle = (cell: ExcelJS.Cell) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'E3F2FD' }
  };
  cell.font = {
    bold: true,
    size: 9,
    name: '맑은 고딕'
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = {
    top: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } }
  };
};

// 값 스타일 적용
const applyValueStyle = (cell: ExcelJS.Cell) => {
  cell.font = {
    size: 9,
    name: '맑은 고딕'
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = {
    top: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } }
  };
};

// =====================================================
// RowSpan 계산 함수들
// =====================================================
function calculateProcessRowSpan(items: CPItem[]): Map<number, SpanInfo> {
  const spanMap = new Map<number, SpanInfo>();
  let currentProcess = '';
  let startIdx = 0;

  items.forEach((item, idx) => {
    const processKey = `${item.processNo}_${item.processName}`;

    if (processKey !== currentProcess) {
      // 이전 그룹의 span 설정
      if (idx > 0) {
        for (let i = startIdx; i < idx; i++) {
          spanMap.set(i, { isFirst: i === startIdx, span: i === startIdx ? idx - startIdx : 0 });
        }
      }
      currentProcess = processKey;
      startIdx = idx;
    }
  });

  // 마지막 그룹 처리
  for (let i = startIdx; i < items.length; i++) {
    spanMap.set(i, { isFirst: i === startIdx, span: i === startIdx ? items.length - startIdx : 0 });
  }

  return spanMap;
}

function calculateDescRowSpan(items: CPItem[]): Map<number, SpanInfo> {
  const spanMap = new Map<number, SpanInfo>();
  let currentKey = '';
  let startIdx = 0;

  items.forEach((item, idx) => {
    const key = `${item.processNo}_${item.processName}_${item.processDesc}`;

    if (key !== currentKey) {
      if (idx > 0) {
        for (let i = startIdx; i < idx; i++) {
          spanMap.set(i, { isFirst: i === startIdx, span: i === startIdx ? idx - startIdx : 0 });
        }
      }
      currentKey = key;
      startIdx = idx;
    }
  });

  for (let i = startIdx; i < items.length; i++) {
    spanMap.set(i, { isFirst: i === startIdx, span: i === startIdx ? items.length - startIdx : 0 });
  }

  return spanMap;
}

function calculateWorkRowSpan(items: CPItem[]): Map<number, SpanInfo> {
  const spanMap = new Map<number, SpanInfo>();
  let currentKey = '';
  let startIdx = 0;

  items.forEach((item, idx) => {
    const key = `${item.processNo}_${item.processName}_${item.processDesc}_${item.workElement}`;

    if (key !== currentKey) {
      if (idx > 0) {
        for (let i = startIdx; i < idx; i++) {
          spanMap.set(i, { isFirst: i === startIdx, span: i === startIdx ? idx - startIdx : 0 });
        }
      }
      currentKey = key;
      startIdx = idx;
    }
  });

  for (let i = startIdx; i < items.length; i++) {
    spanMap.set(i, { isFirst: i === startIdx, span: i === startIdx ? items.length - startIdx : 0 });
  }

  return spanMap;
}

// =====================================================
// 시트1: CP 등록정보
// =====================================================
function createSheet1_CPRegister(
  workbook: ExcelJS.Workbook,
  cpInfo: CPInfo
): void {
  const ws = workbook.addWorksheet('1. CP 등록정보', {
    properties: { tabColor: { argb: EXCEL_COLORS.primary } }
  });

  // 15열 너비 설정 (PFMEA/DFMEA 통일)
  ws.columns = [
    { width: 8 },  { width: 10 }, { width: 18 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 8 },  { width: 12 }, { width: 10 },
    { width: 12 }, { width: 8 },  { width: 10 }, { width: 10 }, { width: 8 },
  ];

  let row = 1;
  ws.mergeCells(row, 1, row, 15);
  const titleCell = ws.getCell(row, 1);
  titleCell.value = 'Control Plan (관리계획서)';
  applyTitleStyle(titleCell);
  ws.getRow(row).height = 35;

  row += 1;
  ws.getRow(row).height = 8;

  row += 1;
  const infoRows = [
    ['CP No', cpInfo.cpNo, '품명', cpInfo.partName, '고객명', cpInfo.customer, '작성일자', cpInfo.createdAt || new Date().toISOString().slice(0, 10)],
    ['FMEA ID', cpInfo.fmeaId, 'FMEA No', cpInfo.fmeaNo, '개정번호', cpInfo.revisionNo || '1.00', '', ''],
  ];

  infoRows.forEach((data) => {
    const r = ws.getRow(row);
    const pairs = [
      { label: data[0], value: data[1], lStart: 1, lEnd: 2, vStart: 3, vEnd: 4 },
      { label: data[2], value: data[3], lStart: 5, lEnd: 6, vStart: 7, vEnd: 8 },
      { label: data[4], value: data[5], lStart: 9, lEnd: 10, vStart: 11, vEnd: 12 },
      { label: data[6], value: data[7], lStart: 13, lEnd: 13, vStart: 14, vEnd: 15 },
    ];

    pairs.forEach(p => {
      if (p.lStart !== p.lEnd) ws.mergeCells(row, p.lStart, row, p.lEnd);
      const lc = r.getCell(p.lStart);
      lc.value = p.label;
      applyLabelStyle(lc);
      for (let c = p.lStart + 1; c <= p.lEnd; c++) applyLabelStyle(r.getCell(c));

      if (p.vStart !== p.vEnd) ws.mergeCells(row, p.vStart, row, p.vEnd);
      const vc = r.getCell(p.vStart);
      vc.value = p.value;
      applyValueStyle(vc);
      for (let c = p.vStart + 1; c <= p.vEnd; c++) applyValueStyle(r.getCell(c));
    });

    r.height = 24;
    row += 1;
  });
}

// =====================================================
// 시트2: CP 워크시트 (셀 병합 포함)
// =====================================================
function createSheet2_CPWorksheet(
  workbook: ExcelJS.Workbook,
  cpInfo: CPInfo,
  items: CPItem[],
  partNameMode?: string
): void {
  const ws = workbook.addWorksheet('2. CP 워크시트', {
    properties: { tabColor: { argb: EXCEL_COLORS.secondary } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });

  // ★ 부품명 모드: A=숨김(기본), B=표시
  // ★ S/O/D/AP 컬럼 제외 (PFMEA참조 그룹 — 엑셀 내보내기에서 불필요)
  const showPartName = partNameMode === 'B';
  const allColumns = (showPartName ? CP_COLUMNS : CP_COLUMNS.filter(c => c.key !== 'partName'))
    .filter(c => !c.group.startsWith('PFMEA'));

  // 열 너비 설정 (rowNo 제외)
  const dataColumns = allColumns.filter(c => c.key !== 'rowNo');
  ws.columns = dataColumns.map(col => ({ width: Math.ceil(col.width / 6) }));

  // 1행: 라벨-값 쌍 (PFMEA/DFMEA 통일 포맷)
  const row1Pairs = [
    { label: 'CP No', value: cpInfo.cpNo, lStart: 1, lEnd: 1, vStart: 2, vEnd: 3 },
    { label: '품명', value: cpInfo.partName, lStart: 4, lEnd: 4, vStart: 5, vEnd: 6 },
    { label: '고객', value: cpInfo.customer, lStart: 7, lEnd: 7, vStart: 8, vEnd: 8 },
    { label: '개정', value: `${cpInfo.createdAt || new Date().toISOString().slice(0, 10)} / Rev.${cpInfo.revisionNo || '1.00'}`, lStart: 9, lEnd: 10, vStart: 11, vEnd: 13 },
  ];
  const r1 = ws.getRow(1);
  row1Pairs.forEach(p => {
    if (p.lStart !== p.lEnd) ws.mergeCells(1, p.lStart, 1, p.lEnd);
    const lc = r1.getCell(p.lStart);
    lc.value = p.label;
    applyLabelStyle(lc);
    for (let c = p.lStart + 1; c <= p.lEnd; c++) applyLabelStyle(r1.getCell(c));
    if (p.vStart !== p.vEnd) ws.mergeCells(1, p.vStart, 1, p.vEnd);
    const vc = r1.getCell(p.vStart);
    vc.value = p.value;
    applyValueStyle(vc);
    for (let c = p.vStart + 1; c <= p.vEnd; c++) applyValueStyle(r1.getCell(c));
  });
  ws.getRow(1).height = 22;

  // 2행: 그룹 헤더 (4개 그룹)
  const processColCount = showPartName ? 6 : 5;  // ★ 부품명 있으면 6, 없으면 5
  const groups = [
    { name: '공정현황', count: processColCount, color: COLORS.process.header },
    { name: '관리항목', count: 7, color: COLORS.control.header },
    { name: '관리방법', count: 6, color: COLORS.method.header },
    { name: '조치방법', count: 1, color: COLORS.action.header },
  ];

  let colIdx = 1;
  const group1Row = ws.getRow(2);
  groups.forEach(g => {
    ws.mergeCells(2, colIdx, 2, colIdx + g.count - 1);
    const cell = group1Row.getCell(colIdx);
    cell.value = g.name;
    applyHeaderStyle(cell, g.color);
    // 병합된 셀들도 스타일 적용
    for (let i = 1; i < g.count; i++) {
      applyHeaderStyle(group1Row.getCell(colIdx + i), g.color);
    }
    colIdx += g.count;
  });
  group1Row.height = 25;

  // 3행: 컬럼 헤더
  const headerRow = ws.getRow(3);
  dataColumns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.name;

    // 그룹에 따른 색상 결정
    let color = COLORS.process.header;
    if (col.group === '관리항목') color = COLORS.control.header;
    else if (col.group === '관리방법') color = COLORS.method.header;
    else if (col.group === '조치방법') color = COLORS.action.header;

    applyHeaderStyle(cell, color);
  });
  headerRow.height = 28;

  // RowSpan 계산
  const processSpan = calculateProcessRowSpan(items);
  const descSpan = calculateDescRowSpan(items);
  const workSpan = calculateWorkRowSpan(items);

  // 데이터 행 작성 (4행부터)
  const startRow = 4;

  // 먼저 모든 데이터를 기록
  items.forEach((item, idx) => {
    const row = ws.getRow(startRow + idx);
    const isEven = idx % 2 === 0;

    dataColumns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);

      // 값 설정
      let value: string | boolean | number = '';
      switch (col.key) {
        case 'processNo': value = item.processNo || ''; break;
        case 'processName': value = item.processName || ''; break;
        case 'processLevel': value = item.processLevel || ''; break;
        case 'processDesc': value = item.processDesc || ''; break;
        case 'partName': value = item.partName || ''; break;
        case 'workElement': value = item.workElement || ''; break;
        case 'detectorEp': value = item.detectorEp ? '●' : ''; break;
        case 'detectorAuto': value = item.detectorAuto ? '●' : ''; break;
        case 'charNo': value = item.charIndex || ''; break;
        case 'productChar': value = item.productChar || ''; break;
        case 'processChar': value = item.processChar || ''; break;
        case 'specialChar': value = item.specialChar || ''; break;
        case 'specTolerance': value = item.specTolerance || ''; break;
        case 'evalMethod': value = item.evalMethod || ''; break;
        case 'sampleSize': value = item.sampleSize || ''; break;
        case 'sampleFreq': value = item.sampleFreq || ''; break;
        case 'controlMethod': value = item.controlMethod || ''; break;
        case 'owner1': value = item.owner1 || ''; break;
        case 'owner2': value = item.owner2 || ''; break;
        case 'reactionPlan': value = item.reactionPlan || ''; break;
      }

      cell.value = value;

      // 색상 결정: 데이터가 있는 셀만 배경색, 빈 셀은 흰색
      const hasValue = value !== '' && value !== undefined && value !== null;
      const bgColor = hasValue ? (isEven ? col.cellColor : col.cellAltColor) : EXCEL_COLORS.white;
      // 공정설명, 제품특성, 공정특성은 좌측정렬, 나머지는 각 컬럼의 기본 정렬
      const leftAlignKeys = ['processDesc', 'productChar', 'processChar'];
      const align = leftAlignKeys.includes(col.key) ? 'left' : col.align;
      applyDataStyle(cell, bgColor, align);
    });

    row.height = 22;
  });

  // 셀 병합 적용 (공정번호, 공정명)
  const mergedCells = new Set<string>();

  items.forEach((item, idx) => {
    const rowNum = startRow + idx;

    // 공정번호/공정명 병합 (processSpan)
    const pSpan = processSpan.get(idx);
    if (pSpan && pSpan.isFirst && pSpan.span > 1) {
      // 공정번호 (1열)
      const mergeKey1 = `A${rowNum}:A${rowNum + pSpan.span - 1}`;
      if (!mergedCells.has(mergeKey1)) {
        try {
          ws.mergeCells(rowNum, 1, rowNum + pSpan.span - 1, 1);
          mergedCells.add(mergeKey1);
        } catch (e) { /* 이미 병합됨 */ }
      }
      // 공정명 (2열)
      const mergeKey2 = `B${rowNum}:B${rowNum + pSpan.span - 1}`;
      if (!mergedCells.has(mergeKey2)) {
        try {
          ws.mergeCells(rowNum, 2, rowNum + pSpan.span - 1, 2);
          mergedCells.add(mergeKey2);
        } catch (e) { /* 이미 병합됨 */ }
      }
    }

    // 레벨/공정설명 병합 (descSpan)
    const dSpan = descSpan.get(idx);
    if (dSpan && dSpan.isFirst && dSpan.span > 1) {
      // 레벨 (3열)
      const mergeKey3 = `C${rowNum}:C${rowNum + dSpan.span - 1}`;
      if (!mergedCells.has(mergeKey3)) {
        try {
          ws.mergeCells(rowNum, 3, rowNum + dSpan.span - 1, 3);
          mergedCells.add(mergeKey3);
        } catch (e) { /* 이미 병합됨 */ }
      }
      // 공정설명 (4열)
      const mergeKey4 = `D${rowNum}:D${rowNum + dSpan.span - 1}`;
      if (!mergedCells.has(mergeKey4)) {
        try {
          ws.mergeCells(rowNum, 4, rowNum + dSpan.span - 1, 4);
          mergedCells.add(mergeKey4);
        } catch (e) { /* 이미 병합됨 */ }
      }
    }

    // 설비/금형 병합 (workSpan) - 동적 컬럼 위치 계산
    const wSpan = workSpan.get(idx);
    if (wSpan && wSpan.isFirst && wSpan.span > 1) {
      // ★ 동적 컬럼 위치: dataColumns에서 key로 찾기
      const partNameColIdx = dataColumns.findIndex(c => c.key === 'partName') + 1;  // 0 if hidden
      const equipColIdx = dataColumns.findIndex(c => c.key === 'equipment') + 1;
      const epColIdx = dataColumns.findIndex(c => c.key === 'detectorEp') + 1;
      const autoColIdx = dataColumns.findIndex(c => c.key === 'detectorAuto') + 1;

      // 부품명 병합 (표시 모드일 때만)
      if (partNameColIdx > 0) {
        const mk = `${partNameColIdx}:${rowNum}-${rowNum + wSpan.span - 1}`;
        if (!mergedCells.has(mk)) {
          try { ws.mergeCells(rowNum, partNameColIdx, rowNum + wSpan.span - 1, partNameColIdx); mergedCells.add(mk); } catch { }
        }
      }
      // 설비/금형 병합
      if (equipColIdx > 0) {
        const mk = `${equipColIdx}:${rowNum}-${rowNum + wSpan.span - 1}`;
        if (!mergedCells.has(mk)) {
          try { ws.mergeCells(rowNum, equipColIdx, rowNum + wSpan.span - 1, equipColIdx); mergedCells.add(mk); } catch { }
        }
      }
      // EP 병합
      if (epColIdx > 0) {
        const mk = `${epColIdx}:${rowNum}-${rowNum + wSpan.span - 1}`;
        if (!mergedCells.has(mk)) {
          try { ws.mergeCells(rowNum, epColIdx, rowNum + wSpan.span - 1, epColIdx); mergedCells.add(mk); } catch { }
        }
      }
      // 자동 병합
      if (autoColIdx > 0) {
        const mk = `${autoColIdx}:${rowNum}-${rowNum + wSpan.span - 1}`;
        if (!mergedCells.has(mk)) {
          try { ws.mergeCells(rowNum, autoColIdx, rowNum + wSpan.span - 1, autoColIdx); mergedCells.add(mk); } catch { }
        }
      }
    }
  });
}

// =====================================================
// 메인 내보내기 함수
// =====================================================
export async function exportCPExcel(
  state: CPState,
  cpInfo?: Partial<CPInfo>
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FMEA On-Premise';
  workbook.created = new Date();

  const info: CPInfo = {
    cpNo: state.cpNo || cpInfo?.cpNo || 'CP-001',
    fmeaId: state.fmeaId || cpInfo?.fmeaId || '',
    fmeaNo: state.fmeaNo || cpInfo?.fmeaNo || '',
    partName: state.partName || cpInfo?.partName || '',
    customer: state.customer || cpInfo?.customer || '',
    createdAt: cpInfo?.createdAt || new Date().toISOString().slice(0, 10),
    revisionNo: cpInfo?.revisionNo || '1.00',
  };

  // 시트1: CP 등록정보
  createSheet1_CPRegister(workbook, info);

  // 시트1에 CFT 현황 + 개정현황/승인 섹션 추가
  if (info.fmeaId) {
    try {
      const { cftMembers, revisions } = await fetchFmeaExportData(info.fmeaId);
      const ws1 = workbook.getWorksheet('1. CP 등록정보');
      if (ws1) {
        // 등록정보는 row 1~4, row 5부터 빈 행 + CFT
        let nextRow = writeCftSection(ws1, 6, cftMembers);
        writeRevisionSection(ws1, nextRow, revisions);
      }
    } catch (e) {
      console.error('[CP Export] CFT/개정현황 로드 실패:', e);
    }
  }

  // 시트2: CP 워크시트 (셀 병합 포함)
  createSheet2_CPWorksheet(workbook, info, state.items, state.partNameMode);

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  link.download = `${info.cpNo}_CP전체_${date}.xlsx`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
