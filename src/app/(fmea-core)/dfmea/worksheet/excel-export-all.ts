/**
 * @file excel-export-all.ts
 * @description PFMEA ALL 화면 멀티시트 엑셀 내보내기 (2시트 구성)
 * @version 2.0.0
 * @created 2026-01-23
 * @updated 2026-03-03
 *
 * 시트 구성:
 * 1. FMEA 정보 - 등록정보 + CFT 현황 + 개정현황/승인
 * 2. FMEA ALL - 전체보기 데이터 (구조~최적화 41컬럼)
 */

import { WorksheetState } from './constants';

/** UI 스레드 양보 — 100행마다 호출하여 브라우저 응답성 유지 */
function yieldToMain(): Promise<void> {
  return new Promise(r => setTimeout(r, 0));
}

// =====================================================
// 타입 정의
// =====================================================
interface FMEAInfo {
  fmeaId: string;
  fmeaName: string;          // FMEA명 (subject)
  companyName: string;       // 회사명
  customerName: string;      // 고객명
  modelYear: string;         // 모델년도
  fmeaStartDate: string;     // 시작일
  fmeaRevisionDate: string;  // 개정일
  revisionNo: string;        // 개정번호
  fmeaResponsibleName: string; // 책임자
  designResponsibility: string; // 설계책임
  confidentialityLevel: string; // 기밀등급
  engineeringLocation: string;  // 엔지니어링 위치
}

interface CFTMember {
  role: string;
  name: string;
  department: string;
  position: string;
  task: string;
  email: string;
  phone: string;
  remark: string;
}

interface RevisionRecord {
  revisionNumber: string;
  revisionDate: string;
  revisionHistory: string;
  createPosition: string;
  createName: string;
  createDate: string;
  createStatus: string;
  reviewPosition: string;
  reviewName: string;
  reviewDate: string;
  reviewStatus: string;
  approvePosition: string;
  approveName: string;
  approveDate: string;
  approveStatus: string;
}

// =====================================================
// 스타일 정의 (보라색 미사용)
// =====================================================
const COLORS = {
  primary: 'BBDEFB',      // 아주 연한 파란색 (구조/리스크)
  secondary: 'C8E6C9',    // 아주 연한 녹색 (기능/CFT)
  warning: 'FFE0B2',      // 아주 연한 주황색 (최적화/개정)
  danger: 'FFCDD2',       // 아주 연한 빨간색 (고장/승인)
  headerBg: 'E3F2FD',     // 아주 연한 헤더 배경
  headerText: '212121',   // 어두운 텍스트
  lightGray: 'F5F5F5',    // 짝수 행
  white: 'FFFFFF',        // 홀수 행
  borderColor: 'BDBDBD',  // 테두리
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyHeaderStyle = (cell: any, bgColor: string = COLORS.headerBg) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.font = { color: { argb: COLORS.headerText }, bold: true, size: 10, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.borderColor } },
    left: { style: 'thin', color: { argb: COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
    right: { style: 'thin', color: { argb: COLORS.borderColor } }
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyDataStyle = (cell: any, isEven: boolean = false) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? COLORS.lightGray : COLORS.white } };
  cell.font = { size: 9, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.borderColor } },
    left: { style: 'thin', color: { argb: COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
    right: { style: 'thin', color: { argb: COLORS.borderColor } }
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyTitleStyle = (cell: any) => {
  cell.font = { bold: true, size: 14, name: '맑은 고딕', color: { argb: '1565C0' } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyLabelStyle = (cell: any) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E3F2FD' } };
  cell.font = { bold: true, size: 9, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.borderColor } },
    left: { style: 'thin', color: { argb: COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
    right: { style: 'thin', color: { argb: COLORS.borderColor } }
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyValueStyle = (cell: any) => {
  cell.font = { size: 9, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.borderColor } },
    left: { style: 'thin', color: { argb: COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
    right: { style: 'thin', color: { argb: COLORS.borderColor } }
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applySectionBarStyle = (cell: any, bgColor: string) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.font = { color: { argb: COLORS.headerText }, bold: true, size: 11, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.borderColor } },
    left: { style: 'thin', color: { argb: COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
    right: { style: 'thin', color: { argb: COLORS.borderColor } }
  };
};

// =====================================================
// 시트1: FMEA 정보 (등록정보 + CFT + 개정/승인)
// =====================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSheet1_Combined(
  workbook: any,
  fmeaInfo: FMEAInfo,
  cftMembers: CFTMember[],
  revisions: RevisionRecord[]
): void {
  const ws = workbook.addWorksheet('1. FMEA 정보', {
    properties: { tabColor: { argb: COLORS.primary } }
  });

  // 15열 너비 설정
  ws.columns = [
    { width: 8 },  { width: 10 }, { width: 18 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 8 },  { width: 12 }, { width: 10 },
    { width: 12 }, { width: 8 },  { width: 10 }, { width: 10 }, { width: 8 },
  ];

  let row = 1;

  // ─── 섹션A: 제목 + 등록정보 ───
  ws.mergeCells(row, 1, row, 15);
  const titleCell = ws.getCell(row, 1);
  titleCell.value = 'Process Failure Modes Effects Analysis (Process FMEA)';
  applyTitleStyle(titleCell);
  ws.getRow(row).height = 35;

  row += 1; // 빈 행
  ws.getRow(row).height = 8;

  row += 1; // 등록정보 시작
  const infoRows = [
    ['FMEA ID', fmeaInfo.fmeaId, '회사명', fmeaInfo.companyName, '고객명', fmeaInfo.customerName, '기밀등급', fmeaInfo.confidentialityLevel],
    ['FMEA명', fmeaInfo.fmeaName, '모델년도', fmeaInfo.modelYear, '시작일자', fmeaInfo.fmeaStartDate, '개정번호', fmeaInfo.revisionNo],
    ['책임자', fmeaInfo.fmeaResponsibleName, '설계책임', fmeaInfo.designResponsibility, '개정일자', fmeaInfo.fmeaRevisionDate, '위치', fmeaInfo.engineeringLocation],
  ];

  infoRows.forEach((data) => {
    const r = ws.getRow(row);
    // 6쌍: A:B, C:D, E:F, G:H, I:J, K:L + 마지막 M:M(라벨), N:O(값)
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
      // 병합된 셀 모두 border 적용
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

  // 빈 행
  ws.getRow(row).height = 8;
  row += 1;

  // ─── 섹션B: CFT 현황 ───
  ws.mergeCells(row, 1, row, 15);
  const cftTitleCell = ws.getCell(row, 1);
  cftTitleCell.value = 'CFT 현황 (Cross Functional Team)';
  applySectionBarStyle(cftTitleCell, COLORS.secondary);
  for (let c = 2; c <= 15; c++) applySectionBarStyle(ws.getRow(row).getCell(c), COLORS.secondary);
  ws.getRow(row).height = 26;
  row += 1;

  // CFT 헤더 — 9필드를 15열에 배치 (병합)
  const cftHeaderDefs = [
    { label: 'No', start: 1, end: 1 },
    { label: 'CFT역할', start: 2, end: 3 },
    { label: '성명', start: 4, end: 5 },
    { label: '부서', start: 6, end: 7 },
    { label: '직급', start: 8, end: 8 },
    { label: '담당업무', start: 9, end: 10 },
    { label: 'Email', start: 11, end: 12 },
    { label: '전화번호', start: 13, end: 14 },
    { label: '비고', start: 15, end: 15 },
  ];

  const cftHeaderRow = ws.getRow(row);
  cftHeaderDefs.forEach(h => {
    if (h.start !== h.end) ws.mergeCells(row, h.start, row, h.end);
    const cell = cftHeaderRow.getCell(h.start);
    cell.value = h.label;
    applyHeaderStyle(cell, COLORS.secondary);
    for (let c = h.start + 1; c <= h.end; c++) applyHeaderStyle(cftHeaderRow.getCell(c), COLORS.secondary);
  });
  cftHeaderRow.height = 22;
  row += 1;

  // CFT 데이터 (최소 5행 보장)
  const MIN_CFT_ROWS = 5;
  const cftRowCount = Math.max(cftMembers.length, MIN_CFT_ROWS);
  for (let idx = 0; idx < cftRowCount; idx++) {
    const member = cftMembers[idx];
    const r = ws.getRow(row);
    const vals = [
      { value: member ? idx + 1 : '', start: 1, end: 1 },
      { value: member?.role || '', start: 2, end: 3 },
      { value: member?.name || '', start: 4, end: 5 },
      { value: member?.department || '', start: 6, end: 7 },
      { value: member?.position || '', start: 8, end: 8 },
      { value: member?.task || '', start: 9, end: 10 },
      { value: member?.email || '', start: 11, end: 12 },
      { value: member?.phone || '', start: 13, end: 14 },
      { value: member?.remark || '', start: 15, end: 15 },
    ];
    vals.forEach(v => {
      if (v.start !== v.end) ws.mergeCells(row, v.start, row, v.end);
      const cell = r.getCell(v.start);
      cell.value = v.value;
      applyDataStyle(cell, idx % 2 === 0);
      for (let c = v.start + 1; c <= v.end; c++) applyDataStyle(r.getCell(c), idx % 2 === 0);
    });
    r.height = 20;
    row += 1;
  }

  // 빈 행
  ws.getRow(row).height = 8;
  row += 1;

  // ─── 섹션C: 개정현황 및 승인 ───
  ws.mergeCells(row, 1, row, 15);
  const revTitleCell = ws.getCell(row, 1);
  revTitleCell.value = '개정현황 및 승인';
  applySectionBarStyle(revTitleCell, COLORS.warning);
  for (let c = 2; c <= 15; c++) applySectionBarStyle(ws.getRow(row).getCell(c), COLORS.warning);
  ws.getRow(row).height = 26;
  row += 1;

  // 개정 1단 그룹 헤더
  const revGroupRow = ws.getRow(row);
  const revGroups = [
    { label: '개정정보', start: 1, end: 3, color: COLORS.primary },
    { label: '작성', start: 4, end: 7, color: COLORS.secondary },
    { label: '검토', start: 8, end: 11, color: COLORS.primary },
    { label: '승인', start: 12, end: 15, color: COLORS.danger },
  ];
  revGroups.forEach(g => {
    ws.mergeCells(row, g.start, row, g.end);
    const cell = revGroupRow.getCell(g.start);
    cell.value = g.label;
    applyHeaderStyle(cell, g.color);
    for (let c = g.start + 1; c <= g.end; c++) applyHeaderStyle(revGroupRow.getCell(c), g.color);
  });
  revGroupRow.height = 22;
  row += 1;

  // 개정 2단 세부 헤더
  const revHeaders = ['개정번호', '개정일자', '개정내용', '직급', '성명', '일자', '상태', '직급', '성명', '일자', '상태', '직급', '성명', '일자', '상태'];
  const revHeaderRow = ws.getRow(row);
  revHeaders.forEach((header, idx) => {
    const cell = revHeaderRow.getCell(idx + 1);
    cell.value = header;
    let color = COLORS.primary;
    if (idx >= 3 && idx <= 6) color = COLORS.secondary;
    else if (idx >= 7 && idx <= 10) color = COLORS.primary;
    else if (idx >= 11) color = COLORS.danger;
    applyHeaderStyle(cell, color);
  });
  revHeaderRow.height = 22;
  row += 1;

  // 개정 데이터 (최소 5행 보장)
  const MIN_REV_ROWS = 5;
  const revRowCount = Math.max(revisions.length, MIN_REV_ROWS);
  for (let idx = 0; idx < revRowCount; idx++) {
    const rev = revisions[idx];
    const r = ws.getRow(row);
    const rowData = [
      rev?.revisionNumber || '', rev?.revisionDate || '', rev?.revisionHistory || '',
      rev?.createPosition || '', rev?.createName || '', rev?.createDate || '', rev?.createStatus || '',
      rev?.reviewPosition || '', rev?.reviewName || '', rev?.reviewDate || '', rev?.reviewStatus || '',
      rev?.approvePosition || '', rev?.approveName || '', rev?.approveDate || '', rev?.approveStatus || ''
    ];
    rowData.forEach((val, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      cell.value = val;
      applyDataStyle(cell, idx % 2 === 0);
    });
    r.height = 20;
    row += 1;
  }
}

// =====================================================
// 시트2: FMEA ALL 화면
// =====================================================
async function createSheet2_FMEAAll(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workbook: any,
  fmeaInfo: FMEAInfo,
  state: WorksheetState
): Promise<void> {
  const ws = workbook.addWorksheet('2. FMEA ALL', {
    properties: { tabColor: { argb: COLORS.danger } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5 }]
  });

  // 1행: 라벨-값 쌍 (시트1 등록정보와 동일 스타일)
  const row1Pairs = [
    { label: '회사명', value: fmeaInfo.companyName, lStart: 1, lEnd: 1, vStart: 2, vEnd: 3 },
    { label: 'FMEA명', value: fmeaInfo.fmeaName, lStart: 4, lEnd: 4, vStart: 5, vEnd: 6 },
    { label: '고객사', value: fmeaInfo.customerName, lStart: 7, lEnd: 7, vStart: 8, vEnd: 8 },
    { label: '개정일자', value: `${fmeaInfo.fmeaRevisionDate || fmeaInfo.fmeaStartDate} / Rev.${fmeaInfo.revisionNo}`, lStart: 9, lEnd: 10, vStart: 11, vEnd: 13 },
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

  // 2행: 빈 행
  ws.getRow(2).height = 5;

  // 38열 전체보기 컬럼 정의 (부품(컴포넌트) 3개 컬럼 제거)
  const ALLVIEW_COLUMNS = [
    { id: 'l1Name', label: '공정명', width: 12, group: 'structure' },
    { id: 'l2No', label: 'NO', width: 5, group: 'structure' },
    { id: 'l2Name', label: '공정명', width: 12, group: 'structure' },
    { id: 'm4', label: '4M', width: 4, group: 'structure' },
    { id: 'l1Type', label: '구분', width: 6, group: 'function' },
    { id: 'l1Function', label: '완제품기능', width: 18, group: 'function' },
    { id: 'l1Requirement', label: '요구사항', width: 15, group: 'function' },
    { id: 'l2Function', label: '설계기능', width: 18, group: 'function' },
    { id: 'productChar', label: '설계특성', width: 12, group: 'function' },
    { id: 'l3Function', label: '부품(컴포넌트)기능', width: 15, group: 'function' },
    { id: 'processChar', label: '설계파라미터', width: 12, group: 'function' },
    { id: 'feScopeF', label: '구분', width: 5, group: 'failure' },
    { id: 'failureEffect', label: '고장영향(FE)', width: 15, group: 'failure' },
    { id: 'severity', label: 'S', width: 4, group: 'failure' },
    { id: 'failureMode', label: '고장형태(FM)', width: 15, group: 'failure' },
    { id: 'failureCause', label: '고장원인(FC)', width: 15, group: 'failure' },
    { id: 'prevention', label: '설계검증 예방', width: 12, group: 'risk' },
    { id: 'occurrence', label: 'O', width: 4, group: 'risk' },
    { id: 'detection', label: '설계검증 검출', width: 12, group: 'risk' },
    { id: 'detectability', label: 'D', width: 4, group: 'risk' },
    { id: 'ap', label: 'AP', width: 4, group: 'risk' },
    { id: 'rpn', label: 'RPN', width: 5, group: 'risk' },
    { id: 'specialChar', label: '특별특성', width: 6, group: 'risk' },
    { id: 'lesson', label: '습득교훈', width: 10, group: 'risk' },
    { id: 'preventionImprove', label: '예방개선', width: 10, group: 'opt' },
    { id: 'detectionImprove', label: '검출개선', width: 10, group: 'opt' },
    { id: 'responsible', label: '책임자', width: 8, group: 'opt' },
    { id: 'targetDate', label: '목표일', width: 10, group: 'opt' },
    { id: 'status', label: '상태', width: 6, group: 'opt' },
    { id: 'evidence', label: '개선근거', width: 10, group: 'opt' },
    { id: 'completionDate', label: '완료일', width: 10, group: 'opt' },
    { id: 'newS', label: 'S', width: 4, group: 'opt' },
    { id: 'newO', label: 'O', width: 4, group: 'opt' },
    { id: 'newD', label: 'D', width: 4, group: 'opt' },
    { id: 'newSpecial', label: '특별특성', width: 6, group: 'opt' },
    { id: 'newAP', label: 'AP', width: 4, group: 'opt' },
    { id: 'newRPN', label: 'RPN', width: 5, group: 'opt' },
    { id: 'remarks', label: '비고', width: 8, group: 'opt' },
  ];

  // 열 너비 설정
  ws.columns = ALLVIEW_COLUMNS.map(col => ({ width: col.width }));

  // 3행: 1단계 그룹 헤더 (보라색→파란색 변경)
  const groups = [
    { name: 'P-FMEA 구조분석(2단계)', count: 4, color: COLORS.primary },
    { name: 'P-FMEA 기능분석(3단계)', count: 7, color: COLORS.secondary },
    { name: 'P-FMEA 고장분석(4단계)', count: 5, color: COLORS.danger },
    { name: 'P-FMEA 리스크분석(5단계)', count: 8, color: COLORS.primary },
    { name: 'P-FMEA 최적화(6단계)', count: 14, color: COLORS.warning },
  ];

  let colIdx = 1;
  const group1Row = ws.getRow(3);
  groups.forEach(g => {
    ws.mergeCells(3, colIdx, 3, colIdx + g.count - 1);
    const cell = group1Row.getCell(colIdx);
    cell.value = g.name;
    applyHeaderStyle(cell, g.color);
    for (let c = colIdx + 1; c < colIdx + g.count; c++) applyHeaderStyle(group1Row.getCell(c), g.color);
    colIdx += g.count;
  });
  group1Row.height = 25;

  // 4행: 2단계 서브그룹 헤더
  const subGroups = [
    { name: '1.완제품', start: 1, end: 1, color: COLORS.primary },
    { name: '2.메인', start: 2, end: 3, color: COLORS.primary },
    { name: '3.4M', start: 4, end: 4, color: COLORS.primary },
    { name: '1.완제품공정', start: 5, end: 7, color: COLORS.secondary },
    { name: '2.서브시스템', start: 8, end: 9, color: COLORS.secondary },
    { name: '3.부품(컴포넌트)', start: 10, end: 11, color: COLORS.secondary },
    { name: '1.고장영향(FE)', start: 12, end: 14, color: COLORS.danger },
    { name: '2.고장형태(FM)', start: 15, end: 15, color: COLORS.danger },
    { name: '3.고장원인(FC)', start: 16, end: 16, color: COLORS.danger },
    { name: '설계검증 예방', start: 17, end: 18, color: COLORS.primary },
    { name: '설계검증 검출', start: 19, end: 20, color: COLORS.primary },
    { name: '리스크평가', start: 21, end: 24, color: COLORS.primary },
    { name: '계획', start: 25, end: 28, color: COLORS.warning },
    { name: '결과모니터링', start: 29, end: 31, color: COLORS.warning },
    { name: '효과평가', start: 32, end: 38, color: COLORS.warning },
  ];

  const group2Row = ws.getRow(4);
  subGroups.forEach(sg => {
    if (sg.start !== sg.end) {
      ws.mergeCells(4, sg.start, 4, sg.end);
    }
    const cell = group2Row.getCell(sg.start);
    cell.value = sg.name;
    applyHeaderStyle(cell, sg.color);
    for (let c = sg.start + 1; c <= sg.end; c++) applyHeaderStyle(group2Row.getCell(c), sg.color);
  });
  group2Row.height = 22;

  // 5행: 컬럼 헤더
  const headerRow = ws.getRow(5);
  ALLVIEW_COLUMNS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.label;
    let color = COLORS.primary;
    if (col.group === 'function') color = COLORS.secondary;
    else if (col.group === 'failure') color = COLORS.danger;
    else if (col.group === 'risk') color = COLORS.primary;
    else if (col.group === 'opt') color = COLORS.warning;
    applyHeaderStyle(cell, color);
  });
  headerRow.height = 35;

  // ★★★ 데이터 생성 — AllTabRenderer 동일 enrichment 로직 ★★★
  const { processFailureLinks } = await import('./tabs/all/processFailureLinks');
  const l1Name = state.l1?.name || '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawFailureLinks = (state as any).failureLinks || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const riskData = (state as any).riskData || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const l1Types = (state.l1 as any)?.types || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const failureScopes = (state.l1 as any)?.failureScopes || [];

  // 1. FE → L1 enrichment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqToFuncMap = new Map<string, { category: string; functionName: string; requirement: string }>();
  const feToReqMap = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scopeById = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scopeByEffect = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  l1Types.forEach((type: any) => {
    const category = type.name || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type.functions || []).forEach((func: any) => {
      const functionName = func.name || '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (func.requirements || []).forEach((req: any) => {
        if (req.id) reqToFuncMap.set(req.id, { category, functionName, requirement: req.name || '' });
      });
    });
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  failureScopes.forEach((fs: any) => {
    if (fs.id) { feToReqMap.set(fs.id, fs.reqId || ''); scopeById.set(fs.id, fs); }
    if (fs.effect) { feToReqMap.set(fs.effect, fs.reqId || ''); scopeByEffect.set(fs.effect, fs); }
  });

  // 2. FC → L3 enrichment
  const fcToL3Map = new Map<string, { workFunction: string; processChar: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (state.l2 || []).forEach((proc: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fcByPCId = new Map<string, any[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (proc.failureCauses || []).forEach((fc: any) => {
      if (fc.id && fc.processCharId) {
        const arr = fcByPCId.get(fc.processCharId) || [];
        arr.push(fc);
        fcByPCId.set(fc.processCharId, arr);
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (proc.l3 || []).forEach((we: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (we.functions || []).forEach((fn: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fn.processChars || []).forEach((pc: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fcByPCId.get(pc.id) || []).forEach((fc: any) => {
            fcToL3Map.set(fc.id, { workFunction: fn.name || '', processChar: pc.name || '' });
          });
        });
      });
    });
  });

  // 3. FM → L2 enrichment
  const fmToL2Map = new Map<string, { processFunction: string; productChar: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (state.l2 || []).forEach((proc: any) => {
    if (!proc.name) return;
    const pcIdMap = new Map<string, { fn: string; pc: string }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (proc.functions || []).forEach((fn: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fn.productChars || []).forEach((pc: any) => {
        if (pc.id) pcIdMap.set(pc.id, { fn: fn.name || '', pc: pc.name || '' });
      });
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallbackFn = (proc.functions || [])[0] as any;
    const fallbackFnName = fallbackFn?.name || '';
    const fallbackPcName = (fallbackFn?.productChars || [])[0]?.name || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (proc.failureModes || []).forEach((fm: any) => {
      if (!fm.id) return;
      const matched = fm.productCharId ? pcIdMap.get(fm.productCharId) : null;
      fmToL2Map.set(fm.id, { processFunction: matched?.fn || fallbackFnName, productChar: matched?.pc || fallbackPcName });
    });
  });

  // 4. Enrich failureLinks
  for (const link of rawFailureLinks) {
    const feId = link.feId || '';
    const feText = link.feText || link.cache?.feText || '';
    let feCategory = link.feScope || link.feCategory || '';
    let feFunctionName = link.feFunctionName || '';
    let feRequirement = link.feRequirement || '';
    if (!feFunctionName) {
      const reqId = feToReqMap.get(feId) || feToReqMap.get(feText) || '';
      if (reqId) {
        const funcData = reqToFuncMap.get(reqId);
        if (funcData) {
          if (!feCategory) feCategory = funcData.category;
          feFunctionName = funcData.functionName;
          feRequirement = funcData.requirement;
        }
      }
    }
    if (!feCategory) {
      const scope = scopeById.get(feId) || scopeByEffect.get(feText);
      if (scope) { feCategory = scope.scope || ''; feRequirement = feRequirement || scope.requirement || ''; }
    }
    const fcL3 = fcToL3Map.get(link.fcId || '');
    if (!link.feCategory) link.feCategory = feCategory || '';
    if (!link.feFunctionName) link.feFunctionName = feFunctionName || '';
    if (!link.feRequirement) link.feRequirement = feRequirement || '';
    if (!link.fcWorkFunction) link.fcWorkFunction = fcL3?.workFunction || '';
    if (!link.fcProcessChar) link.fcProcessChar = fcL3?.processChar || '';
    if (!link.feSeverity) link.feSeverity = link.severity ?? link.feSeverity ?? 0;
  }

  // 5. processFailureLinks → fmGroups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fmGroups = processFailureLinks(rawFailureLinks, state.l2 as any, failureScopes);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fmToProcMap = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (state.l2 || []).forEach((proc: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (proc.failureModes || []).forEach((fm: any) => { if (fm.id) fmToProcMap.set(fm.id, proc); });
  });

  // 6. Build finalRows + 셀병합 추적 (41컬럼 전체 데이터)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalRows: Record<string, string | number>[] = [];
  const DATA_START = 6; // 데이터 시작 엑셀 행

  // 병합 추적 배열
  const fmMerges: { start: number; span: number }[] = [];
  const feMerges: { start: number; span: number }[] = [];
  const fcMerges: { start: number; span: number }[] = [];
  const procRanges: { start: number; end: number }[] = [];

  let dataIdx = 0;
  let currentProcNo = '';
  let procStartIdx = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const fmGroup of fmGroups as any[]) {
    const proc = fmToProcMap.get(fmGroup.fmId);
    const fmL2Data = fmToL2Map.get(fmGroup.fmId);
    const fmStartIdx = dataIdx;
    const procNo = proc?.no || fmGroup.fmProcessNo || '';

    // 공정 경계 감지
    if (procNo !== currentProcNo) {
      if (currentProcNo && dataIdx > procStartIdx + 1) {
        procRanges.push({ start: procStartIdx, end: dataIdx - 1 });
      }
      currentProcNo = procNo;
      procStartIdx = dataIdx;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (fmGroup.rows || []) as any[]) {
      // FE/FC span 추적
      if (row.feRowSpan > 1) feMerges.push({ start: dataIdx, span: row.feRowSpan });
      if (row.fcRowSpan > 1) fcMerges.push({ start: dataIdx, span: row.fcRowSpan });

      const uniqueKey = fmGroup.fmId && row.fcId ? `${fmGroup.fmId}-${row.fcId}` : '';
      const s = row.feSeverity || 0;
      const oVal = riskData[`risk-${uniqueKey}-O`];
      const dVal = riskData[`risk-${uniqueKey}-D`];
      const o = Number(oVal) || 0;
      const d = Number(dVal) || 0;
      let ap = '';
      if (s >= 9) ap = 'H';
      else if (s >= 6 && o >= 4) ap = 'H';
      else if (s >= 2 && o >= 4 && d >= 4) ap = 'H';
      else if (s >= 2 && (o >= 2 || d >= 2)) ap = 'M';
      else if (s >= 1) ap = 'L';
      const rpn = s * o * d;
      const optS = Number(riskData[`opt-${uniqueKey}-S`]) || s;
      const optO = Number(riskData[`opt-${uniqueKey}-O`]) || o;
      const optD = Number(riskData[`opt-${uniqueKey}-D`]) || d;
      let newAP = '';
      if (optS >= 9) newAP = 'H';
      else if (optS >= 6 && optO >= 4) newAP = 'H';
      else if (optS >= 2 && optO >= 4 && optD >= 4) newAP = 'H';
      else if (optS >= 2 && (optO >= 2 || optD >= 2)) newAP = 'M';
      else if (optS >= 1) newAP = 'L';
      const newRPN = optS * optO * optD;

      finalRows.push({
        l1Name,
        l2No: proc?.no || '',
        l2Name: proc?.name || fmGroup.fmProcessName || '',
        m4: row.fcM4 || '',
        l1Type: row.feCategory || '',
        l1Function: row.feFunctionName || '',
        l1Requirement: row.feRequirement || row.feText || '',
        l2Function: fmL2Data?.processFunction || fmGroup.fmProcessFunction || '',
        productChar: fmL2Data?.productChar || fmGroup.fmProductChar || '',
        l3Function: row.fcWorkFunction || '',
        processChar: row.fcProcessChar || '',
        feScopeF: row.feCategory || '',
        failureEffect: row.feText || '',
        severity: s || '',
        failureMode: fmGroup.fmText || '',
        failureCause: row.fcText || '',
        prevention: riskData[`prevention-${uniqueKey}`] || '',
        occurrence: o || '',
        detection: riskData[`detection-${uniqueKey}`] || '',
        detectability: d || '',
        ap,
        rpn: rpn || '',
        specialChar: riskData[`specialChar-${uniqueKey}`] || '',
        lesson: riskData[`lesson-${uniqueKey}`] || '',
        preventionImprove: riskData[`prevention-opt-${uniqueKey}`] || '',
        detectionImprove: riskData[`detection-opt-${uniqueKey}`] || '',
        responsible: riskData[`person-${uniqueKey}`] || '',
        targetDate: riskData[`targetDate-opt-${uniqueKey}`] || '',
        status: riskData[`status-${uniqueKey}`] || '',
        evidence: riskData[`result-${uniqueKey}`] || '',
        completionDate: riskData[`completeDate-${uniqueKey}`] || '',
        newS: optS || '',
        newO: optO || '',
        newD: optD || '',
        newSpecial: riskData[`specialChar-opt-${uniqueKey}`] || '',
        newAP,
        newRPN: newRPN || '',
        remarks: riskData[`note-${uniqueKey}`] || '',
      });
      dataIdx++;
    }

    // FM 병합 추적
    const fmRowCount = dataIdx - fmStartIdx;
    if (fmRowCount > 1) {
      fmMerges.push({ start: fmStartIdx, span: fmRowCount });
    }
  }

  // 마지막 공정 그룹
  if (currentProcNo && dataIdx > procStartIdx + 1) {
    procRanges.push({ start: procStartIdx, end: dataIdx - 1 });
  }

  // 데이터 행 작성
  for (let idx = 0; idx < finalRows.length; idx++) {
    const rowData = finalRows[idx];
    const worksheetRow = ws.getRow(idx + DATA_START);
    ALLVIEW_COLUMNS.forEach((col, ci) => {
      const cell = worksheetRow.getCell(ci + 1);
      cell.value = rowData[col.id] || '';
      applyDataStyle(cell, idx % 2 === 0);
    });
    worksheetRow.height = 20;
  }

  // ★ 셀 병합 적용 (화면 그대로 재현) — 부품(컴포넌트) 3컬럼 제거 반영
  // FM 병합 — col 15(고장형태)
  for (const m of fmMerges) {
    const s = m.start + DATA_START;
    const e = s + m.span - 1;
    ws.mergeCells(s, 15, e, 15);
  }
  // FE 병합 — col 12(구분), col 13(고장영향)
  for (const m of feMerges) {
    const s = m.start + DATA_START;
    const e = s + m.span - 1;
    ws.mergeCells(s, 12, e, 12);
    ws.mergeCells(s, 13, e, 13);
  }
  // FC 병합 — col 16(고장원인)
  for (const m of fcMerges) {
    const s = m.start + DATA_START;
    const e = s + m.span - 1;
    ws.mergeCells(s, 16, e, 16);
  }
  // 공정 구조 병합 — col 1(완제품), col 2(NO), col 3(공정명)
  for (const p of procRanges) {
    const s = p.start + DATA_START;
    const e = p.end + DATA_START;
    ws.mergeCells(s, 1, e, 1);
    ws.mergeCells(s, 2, e, 2);
    ws.mergeCells(s, 3, e, 3);
  }
}

// =====================================================
// 메인 내보내기 함수
// =====================================================
export async function exportAllSheetsExcel(
  state: WorksheetState,
  fmeaInfo: FMEAInfo,
  cftMembers: CFTMember[],
  revisions: RevisionRecord[],
  fileName?: string
): Promise<void> {
  try {
    const ExcelJS = await import('exceljs');
    const _ExcelJS = ExcelJS.default || ExcelJS;

    const workbook = new _ExcelJS.Workbook();
    workbook.creator = 'FMEA On-Premise';
    workbook.created = new Date();

    // 시트1: FMEA 정보 (등록정보 + CFT + 개정/승인)
    createSheet1_Combined(workbook, fmeaInfo, cftMembers, revisions);

    // 시트2: FMEA ALL
    await createSheet2_FMEAAll(workbook, fmeaInfo, state);

    // 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const exportFileName = fileName || `${fmeaInfo.fmeaId}_FMEA전체_${date}.xlsx`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = exportFileName;
    document.body.appendChild(a);
    a.click();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 1000);
  } catch (error) {
    console.error('[exportAllSheetsExcel] 엑셀 내보내기 실패:', error);
    alert('엑셀 내보내기 중 오류가 발생했습니다.\n(An error occurred during Excel export.)');
  }
}

// 기본 내보내기 (간단 버전 - state만 필요)
export async function exportAllViewWithInfo(
  state: WorksheetState,
  fmeaName: string
): Promise<void> {
  const fmeaInfo: FMEAInfo = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fmeaId: (state as any).fmeaId || 'FMEA-001',
    fmeaName: fmeaName,
    companyName: '',
    customerName: '',
    modelYear: '',
    fmeaStartDate: new Date().toISOString().slice(0, 10),
    fmeaRevisionDate: new Date().toISOString().slice(0, 10),
    revisionNo: '1.00',
    fmeaResponsibleName: '',
    designResponsibility: '',
    confidentialityLevel: '',
    engineeringLocation: '',
  };

  const cftMembers: CFTMember[] = [];
  const revisions: RevisionRecord[] = [];

  await exportAllSheetsExcel(state, fmeaInfo, cftMembers, revisions, `${fmeaName}_FMEA전체.xlsx`);
}
