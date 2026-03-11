/**
 * @file excel-info-sections.ts
 * @description CFT 현황 + 개정현황/승인 엑셀 섹션 공용 유틸리티
 * CP, PFD 등 모듈에서 Sheet1 등록정보에 CFT/승인 섹션을 추가할 때 사용
 * @created 2026-03-08
 */

// =====================================================
// 타입 정의
// =====================================================
export interface CFTMember {
  role: string;
  name: string;
  department: string;
  position: string;
  task: string;
  email: string;
  phone: string;
  remark: string;
}

export interface RevisionRecord {
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

export interface FmeaExportInfo {
  fmeaId: string;
  fmeaName: string;
  companyName: string;
  customerName: string;
  modelYear: string;
  fmeaStartDate: string;
  fmeaRevisionDate: string;
  revisionNo: string;
  fmeaResponsibleName: string;
  designResponsibility: string;
  confidentialityLevel: string;
  engineeringLocation: string;
}

// =====================================================
// API fetch
// =====================================================
export async function fetchFmeaExportData(fmeaId: string): Promise<{
  info: FmeaExportInfo;
  cftMembers: CFTMember[];
  revisions: RevisionRecord[];
}> {
  if (!fmeaId) {
    return { info: emptyInfo(fmeaId), cftMembers: [], revisions: [] };
  }

  const [infoRes, cftRes, revRes] = await Promise.all([
    fetch(`/api/fmea/info?fmeaId=${fmeaId}`).then(r => r.json()).catch(() => ({ fmeaInfo: null })),
    fetch(`/api/fmea/cft?fmeaId=${fmeaId}`).then(r => r.json()).catch(() => ({ members: [] })),
    fetch(`/api/fmea/revisions?projectId=${fmeaId}`).then(r => r.json()).catch(() => ({ revisions: [] })),
  ]);

  const raw = infoRes.fmeaInfo || {};
  const info: FmeaExportInfo = {
    fmeaId: raw.fmeaId || fmeaId,
    fmeaName: raw.subject || '',
    companyName: raw.companyName || '',
    customerName: raw.customerName || raw.customer || '',
    modelYear: raw.modelYear || '',
    fmeaStartDate: raw.fmeaStartDate || '',
    fmeaRevisionDate: raw.fmeaRevisionDate || '',
    revisionNo: raw.revisionNo || '',
    fmeaResponsibleName: raw.fmeaResponsibleName || raw.responsible || '',
    designResponsibility: raw.designResponsibility || '',
    confidentialityLevel: raw.confidentialityLevel || '',
    engineeringLocation: raw.engineeringLocation || raw.factory || '',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cftMembers: CFTMember[] = (cftRes.members || []).map((m: any) => ({
    role: m.role || '', name: m.name || '', department: m.department || '',
    position: m.position || '', task: m.task || '', email: m.email || '',
    phone: m.phone || '', remark: m.remarks || m.remark || '',
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revisions: RevisionRecord[] = (revRes.revisions || []).map((r: any) => ({
    revisionNumber: r.revisionNumber || '', revisionDate: r.revisionDate || '',
    revisionHistory: r.revisionHistory || '',
    createPosition: r.createPosition || '', createName: r.createName || '',
    createDate: r.createDate || '', createStatus: r.createStatus || '',
    reviewPosition: r.reviewPosition || '', reviewName: r.reviewName || '',
    reviewDate: r.reviewDate || '', reviewStatus: r.reviewStatus || '',
    approvePosition: r.approvePosition || '', approveName: r.approveName || '',
    approveDate: r.approveDate || '', approveStatus: r.approveStatus || '',
  }));

  return { info, cftMembers, revisions };
}

function emptyInfo(fmeaId: string): FmeaExportInfo {
  return {
    fmeaId, fmeaName: '', companyName: '', customerName: '', modelYear: '',
    fmeaStartDate: '', fmeaRevisionDate: '', revisionNo: '',
    fmeaResponsibleName: '', designResponsibility: '', confidentialityLevel: '', engineeringLocation: '',
  };
}

// =====================================================
// 스타일 헬퍼 (ExcelJS any 타입 — 동적 import 호환)
// =====================================================
const BORDER_COLOR = 'BDBDBD';
const thinBorder = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySectionBar(cell: any, bgColor: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.font = { color: { argb: '212121' }, bold: true, size: 11, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cell.border = thinBorder;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyHeader(cell: any, bgColor: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.font = { color: { argb: '212121' }, bold: true, size: 10, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = thinBorder;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyData(cell: any, isEven = false) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'F5F5F5' : 'FFFFFF' } };
  cell.font = { size: 9, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = thinBorder;
}

// =====================================================
// CFT 현황 섹션 작성
// =====================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function writeCftSection(ws: any, startRow: number, cftMembers: CFTMember[]): number {
  const CFT_COLOR = 'C8E6C9';
  let row = startRow;

  // 섹션 타이틀
  ws.mergeCells(row, 1, row, 15);
  applySectionBar(ws.getCell(row, 1), CFT_COLOR);
  ws.getCell(row, 1).value = 'CFT 현황 (Cross Functional Team)';
  ws.getRow(row).height = 26;
  row += 1;

  // 헤더
  const headers = [
    { label: 'No', start: 1, end: 1 },
    { label: 'CFT역할', start: 2, end: 3 },
    { label: '성명', start: 4, end: 5 },
    { label: '부서', start: 6, end: 7 },
    { label: '직급', start: 8, end: 8 },
    { label: '담당업무', start: 9, end: 10 },
    { label: 'Email', start: 11, end: 13 },
    { label: '전화번호', start: 14, end: 14 },
    { label: '비고', start: 15, end: 15 },
  ];
  const hRow = ws.getRow(row);
  headers.forEach(h => {
    if (h.start !== h.end) ws.mergeCells(row, h.start, row, h.end);
    hRow.getCell(h.start).value = h.label;
    applyHeader(hRow.getCell(h.start), CFT_COLOR);
    for (let c = h.start + 1; c <= h.end; c++) applyHeader(hRow.getCell(c), CFT_COLOR);
  });
  hRow.height = 22;
  row += 1;

  // 데이터 (최소 5행)
  const minRows = Math.max(cftMembers.length, 5);
  for (let idx = 0; idx < minRows; idx++) {
    const member = cftMembers[idx];
    const isEven = idx % 2 === 0;
    const vals = member
      ? [String(idx + 1), member.role, member.name, member.department, member.position, member.task, member.email, member.phone, member.remark]
      : [String(idx + 1), '', '', '', '', '', '', '', ''];
    const cells = [
      { val: vals[0], start: 1, end: 1 },
      { val: vals[1], start: 2, end: 3 },
      { val: vals[2], start: 4, end: 5 },
      { val: vals[3], start: 6, end: 7 },
      { val: vals[4], start: 8, end: 8 },
      { val: vals[5], start: 9, end: 10 },
      { val: vals[6], start: 11, end: 13 },
      { val: vals[7], start: 14, end: 14 },
      { val: vals[8], start: 15, end: 15 },
    ];
    const dRow = ws.getRow(row);
    cells.forEach(c => {
      if (c.start !== c.end) ws.mergeCells(row, c.start, row, c.end);
      dRow.getCell(c.start).value = c.val;
      applyData(dRow.getCell(c.start), isEven);
      for (let col = c.start + 1; col <= c.end; col++) applyData(dRow.getCell(col), isEven);
    });
    dRow.height = 20;
    row += 1;
  }

  return row;
}

// =====================================================
// 개정현황 및 승인 섹션 작성
// =====================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function writeRevisionSection(ws: any, startRow: number, revisions: RevisionRecord[]): number {
  const WARN_COLOR = 'FFE0B2';
  const DANGER_COLOR = 'FFCDD2';
  const PRIMARY_COLOR = 'BBDEFB';
  let row = startRow;

  // 빈 행
  row += 1;

  // 섹션 타이틀
  ws.mergeCells(row, 1, row, 15);
  applySectionBar(ws.getCell(row, 1), WARN_COLOR);
  ws.getCell(row, 1).value = '개정현황 및 승인';
  ws.getRow(row).height = 26;
  row += 1;

  // 그룹 헤더
  const groups = [
    { label: '개정정보', start: 1, end: 3, color: WARN_COLOR },
    { label: '작성', start: 4, end: 7, color: PRIMARY_COLOR },
    { label: '검토', start: 8, end: 11, color: WARN_COLOR },
    { label: '승인', start: 12, end: 15, color: DANGER_COLOR },
  ];
  const gRow = ws.getRow(row);
  groups.forEach(g => {
    ws.mergeCells(row, g.start, row, g.end);
    gRow.getCell(g.start).value = g.label;
    applyHeader(gRow.getCell(g.start), g.color);
    for (let c = g.start + 1; c <= g.end; c++) applyHeader(gRow.getCell(c), g.color);
  });
  gRow.height = 22;
  row += 1;

  // 컬럼 헤더
  const colHeaders = [
    { label: '개정번호', col: 1, color: WARN_COLOR },
    { label: '개정일자', col: 2, color: WARN_COLOR },
    { label: '개정내용', col: 3, color: WARN_COLOR },
    { label: '직급', col: 4, color: PRIMARY_COLOR },
    { label: '성명', col: 5, color: PRIMARY_COLOR },
    { label: '일자', col: 6, color: PRIMARY_COLOR },
    { label: '상태', col: 7, color: PRIMARY_COLOR },
    { label: '직급', col: 8, color: WARN_COLOR },
    { label: '성명', col: 9, color: WARN_COLOR },
    { label: '일자', col: 10, color: WARN_COLOR },
    { label: '상태', col: 11, color: WARN_COLOR },
    { label: '직급', col: 12, color: DANGER_COLOR },
    { label: '성명', col: 13, color: DANGER_COLOR },
    { label: '일자', col: 14, color: DANGER_COLOR },
    { label: '상태', col: 15, color: DANGER_COLOR },
  ];
  const cRow = ws.getRow(row);
  colHeaders.forEach(h => {
    cRow.getCell(h.col).value = h.label;
    applyHeader(cRow.getCell(h.col), h.color);
  });
  cRow.height = 22;
  row += 1;

  // 데이터 (최소 5행)
  const minRows = Math.max(revisions.length, 5);
  for (let idx = 0; idx < minRows; idx++) {
    const rev = revisions[idx];
    const isEven = idx % 2 === 0;
    const vals = rev
      ? [rev.revisionNumber, rev.revisionDate, rev.revisionHistory,
         rev.createPosition, rev.createName, rev.createDate, rev.createStatus,
         rev.reviewPosition, rev.reviewName, rev.reviewDate, rev.reviewStatus,
         rev.approvePosition, rev.approveName, rev.approveDate, rev.approveStatus]
      : Array(15).fill('');
    const dRow = ws.getRow(row);
    for (let c = 1; c <= 15; c++) {
      dRow.getCell(c).value = vals[c - 1];
      applyData(dRow.getCell(c), isEven);
    }
    dRow.height = 20;
    row += 1;
  }

  return row;
}
