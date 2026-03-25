/**
 * @file exportFAVerification.ts
 * @description FA 통합분석 결과 엑셀 내보내기 — import vs export 비교 검증용
 * @created 2026-02-05
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


import type { MasterFailureChain } from '../types/masterFailureChain';
import type { CrossTab } from './template-delete-logic';
import type { ParseStatistics } from '../excel-parser';
import type { ImportedFlatData } from '../types';
import { applyHeaderStyle, applyDataStyle, applyDataLeftStyle, BORDERS } from './excel-styles';

// ─── 색상 ───
const L1_BG = 'E0F2F1';
const L2_BG = 'E3F2FD';
const L3_BG = 'E8EAF6';
const FAIL_BG = 'FFEBEE';
const CTRL_BG = 'E3F2FD';
const VALID_OK = 'C8E6C9';
const VALID_NG = 'FFCDD2';
const SUMMARY_BG = 'FFF8E1';

// ─── processNo 정규화 (로컬) ★ 2026-03-01 ───
function normPNo(p: string | undefined): string {
  if (!p) return '';
  let n = p.trim();
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  n = n.replace(/^0+(?=\d)/, '');
  return n;
}

interface FAExportOptions {
  chains: MasterFailureChain[];
  crossTab: CrossTab;
  parseStatistics?: ParseStatistics;
  flatData?: ImportedFlatData[];
  fmeaName?: string;
}

export async function exportFAVerification({
  chains, crossTab, parseStatistics, flatData, fmeaName,
}: FAExportOptions): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  // ── 1) 검증 요약 시트 ──
  addSummarySheet(wb, chains, parseStatistics, flatData);

  // ── 2) 전체 파싱 데이터 시트 (메인시트 기반) ──
  if (flatData && flatData.length > 0) {
    addAllParsedDataSheet(wb, flatData, parseStatistics);
  }

  // ── 3) FA 통합분석 데이터 시트 (FC시트 기반) ──
  addFADataSheet(wb, chains, crossTab, parseStatistics);

  // ── 다운로드 ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FA검증_${fmeaName || 'FMEA'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── 검증 요약 시트 ───

function addSummarySheet(
  wb: import('exceljs').Workbook,
  chains: MasterFailureChain[],
  stats?: ParseStatistics,
  flatData?: ImportedFlatData[],
) {
  const ws = wb.addWorksheet('FA검증 요약');
  ws.columns = [
    { header: '항목', key: 'item', width: 22 },
    { header: 'FC시트', key: 'fcSheet', width: 12 },
    { header: '메인시트', key: 'mainSheet', width: 12 },
    { header: '스캐너', key: 'scanner', width: 12 },
    { header: 'VERIFY수식', key: 'formula', width: 12 },
    { header: '일치여부', key: 'result', width: 10 },
  ];

  const hRow = ws.getRow(1);
  hRow.eachCell(c => applyHeaderStyle(c));

  // FC시트 실제값
  const fcProc = new Set(chains.map(c => c.processNo).filter(Boolean)).size;
  const fcFM = new Set(chains.filter(c => c.fmValue?.trim()).map(c => `${c.processNo}|${c.fmValue!.trim()}`)).size;
  const fcFC = new Set(chains.filter(c => c.fcValue?.trim()).map(c => `${c.processNo}|${c.fcValue!.trim()}`)).size;
  const fcFE = new Set(chains.filter(c => c.feValue?.trim()).map(c => c.feValue!.trim())).size;

  // 메인시트 실제값 (parseStatistics)
  const itemStats = stats?.itemStats || [];
  const byCode = (code: string) => itemStats.find(s => s.itemCode === code)?.uniqueCount ?? 0;
  const mainProc = stats?.processStats?.length ?? 0;
  const mainFM = byCode('A5');
  const mainFC = byCode('B4');
  const mainFE = byCode('C4');

  // flatData 기반 보조 (메인시트가 0이면 flatData에서 계산)
  // ★ 공정 수: 카테고리 A/B만 (C는 YP/SP/USER 등 구분값이므로 제외)
  // ★★★ 2026-03-01: processNo 정규화 적용 (normPNo 모듈 함수 사용) ★★★
  const fdProc = flatData ? new Set(flatData.filter(d => d.category !== 'C' && d.processNo && /^\d+$/.test(normPNo(d.processNo))).map(d => normPNo(d.processNo))).size : 0;
  const fdFM = flatData ? new Set(flatData.filter(d => d.itemCode === 'A5' && d.value?.trim()).map(d => `${normPNo(d.processNo)}|${d.value.trim()}`)).size : 0;
  const fdFC = flatData ? new Set(flatData.filter(d => d.itemCode === 'B4' && d.value?.trim()).map(d => `${normPNo(d.processNo)}|${d.value.trim()}`)).size : 0;
  const fdFE = flatData ? new Set(flatData.filter(d => d.itemCode === 'C4' && d.value?.trim()).map(d => d.value.trim())).size : 0;

  const scanner = stats?.rawFingerprint;
  const formulas = scanner?.excelFormulas;

  const bestMain = (m: number, fd: number) => m > 0 ? m : fd;

  const rows: { item: string; fcSheet: number | string; mainSheet: number | string; scanner: number | string; formula: number | string; result: string }[] = [
    { item: 'FC시트 사슬 수', fcSheet: chains.length, mainSheet: '-', scanner: scanner?.totalChainRows ?? '-', formula: formulas?.chainCount ?? '-', result: '' },
    { item: '공정 수',        fcSheet: fcProc, mainSheet: bestMain(mainProc, fdProc), scanner: scanner?.processes.length ?? '-', formula: formulas?.processCount ?? '-', result: matchLabel(bestMain(mainProc, fdProc) as number, scanner?.processes.length, formulas?.processCount) },
    { item: 'FM (고장형태)',   fcSheet: fcFM,   mainSheet: bestMain(mainFM, fdFM), scanner: scanner?.totalFM ?? '-', formula: formulas?.fmCount ?? '-', result: matchLabel(bestMain(mainFM, fdFM) as number, scanner?.totalFM, formulas?.fmCount) },
    { item: 'FC (고장원인)',   fcSheet: fcFC,   mainSheet: bestMain(mainFC, fdFC), scanner: scanner?.totalFC ?? '-', formula: formulas?.fcCount ?? '-', result: matchLabel(bestMain(mainFC, fdFC) as number, scanner?.totalFC, formulas?.fcCount) },
    { item: 'FE (고장영향)',   fcSheet: fcFE,   mainSheet: bestMain(mainFE, fdFE), scanner: scanner?.totalFE ?? '-', formula: formulas?.feCount ?? '-', result: matchLabel(bestMain(mainFE, fdFE) as number, scanner?.totalFE, formulas?.feCount) },
  ];

  rows.forEach(r => {
    const row = ws.addRow(r);
    row.eachCell((cell, colNum) => {
      cell.font = { name: '맑은 고딕', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'left' : 'center' };
      cell.border = BORDERS;
      if (colNum === 6) {
        const v = String(cell.value || '');
        if (v === 'OK') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VALID_OK } };
          cell.font = { bold: true, color: { argb: '1B5E20' }, name: '맑은 고딕', size: 10 };
        } else if (v === 'NG') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VALID_NG } };
          cell.font = { bold: true, color: { argb: 'B71C1C' }, name: '맑은 고딕', size: 10 };
        }
      }
    });
  });

  // 공정별 상세 (메인시트 기반)
  ws.addRow([]);
  const detailHeader = ws.addRow(['공정별 상세', 'FM수', 'FC수', 'FE수', 'flatData수']);
  detailHeader.eachCell(c => applyHeaderStyle(c, '455A64'));

  const procMap = new Map<string, { fms: Set<string>; fcs: Set<string>; fes: Set<string>; count: number }>();
  const srcData = flatData && flatData.length > 0 ? flatData : [];
  srcData.forEach(d => {
    const p = normPNo(d.processNo);
    if (!p) return;
    if (!procMap.has(p)) procMap.set(p, { fms: new Set(), fcs: new Set(), fes: new Set(), count: 0 });
    const entry = procMap.get(p)!;
    if (d.itemCode === 'A5' && d.value?.trim()) entry.fms.add(d.value.trim());
    if (d.itemCode === 'B4' && d.value?.trim()) entry.fcs.add(d.value.trim());
    if (d.itemCode === 'C4' && d.value?.trim()) entry.fes.add(d.value.trim());
    entry.count++;
  });

  // FC시트 chains도 추가 (flatData가 없는 경우)
  if (srcData.length === 0) {
    chains.forEach(c => {
      const p = normPNo(c.processNo);
      if (!p) return;
      if (!procMap.has(p)) procMap.set(p, { fms: new Set(), fcs: new Set(), fes: new Set(), count: 0 });
      const entry = procMap.get(p)!;
      if (c.fmValue?.trim()) entry.fms.add(c.fmValue.trim());
      if (c.fcValue?.trim()) entry.fcs.add(c.fcValue.trim());
      if (c.feValue?.trim()) entry.fes.add(c.feValue.trim());
      entry.count++;
    });
  }

  [...procMap.entries()]
    .sort((a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0))
    .forEach(([pNo, d]) => {
      const row = ws.addRow([`공정 ${pNo}`, d.fms.size, d.fcs.size, d.fes.size, d.count]);
      row.eachCell((cell, colNum) => {
        cell.font = { name: '맑은 고딕', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'left' : 'center' };
        cell.border = BORDERS;
        if (colNum >= 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_BG } };
      });
    });
}

function matchLabel(actual: number, scanner?: number, expected?: number): string {
  const target = scanner || expected || 0;
  if (target === 0) return '-';
  return actual === target ? 'OK' : 'NG';
}

// ─── 전체 파싱 데이터 시트 (메인시트 flatData 기반) ───

const ITEM_LABELS: Record<string, string> = {
  A1: '공정번호', A2: '공정명', A3: '공정기능', A4: '제품특성', A5: '고장형태(FM)',
  B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인(FC)',
  C1: '구분', C2: '제품기능', C3: '요구사항', C4: '고장영향(FE)',
};

const ITEM_BG: Record<string, string> = {
  A5: FAIL_BG, B4: FAIL_BG, C4: FAIL_BG,
  A4: 'FFF3E0', B3: 'FFF3E0',
  A6: CTRL_BG, B5: CTRL_BG,
};

function addAllParsedDataSheet(
  wb: import('exceljs').Workbook,
  flatData: ImportedFlatData[],
  _stats?: ParseStatistics,
) {
  const ws = wb.addWorksheet('전체 파싱 데이터');

  ws.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: '공정No', key: 'processNo', width: 8 },
    { header: '카테고리', key: 'category', width: 8 },
    { header: '항목코드', key: 'itemCode', width: 10 },
    { header: '항목명', key: 'itemLabel', width: 16 },
    { header: '값', key: 'value', width: 50 },
    { header: '4M', key: 'm4', width: 6 },
    { header: '특별특성', key: 'specialChar', width: 8 },
  ];

  const hRow = ws.getRow(1);
  hRow.eachCell(c => applyHeaderStyle(c));

  const sorted = [...flatData].sort((a, b) => {
    const pA = parseInt(a.processNo) || 0;
    const pB = parseInt(b.processNo) || 0;
    if (pA !== pB) return pA - pB;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.itemCode.localeCompare(b.itemCode);
  });

  sorted.forEach((d, idx) => {
    const row = ws.addRow({
      no: idx + 1,
      processNo: d.processNo,
      category: d.category === 'A' ? 'L2(메인)' : d.category === 'B' ? 'L3(요소)' : 'L1(완제품)',
      itemCode: d.itemCode,
      itemLabel: ITEM_LABELS[d.itemCode] || d.itemCode,
      value: d.value || '',
      m4: d.m4 || '',
      specialChar: d.specialChar || '',
    });

    row.eachCell((cell, colNum) => {
      if (colNum === 6) applyDataLeftStyle(cell);
      else applyDataStyle(cell);

      const bg = ITEM_BG[d.itemCode];
      if (bg && (colNum === 4 || colNum === 5 || colNum === 6)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      }
    });
  });

  // 하단 요약
  ws.addRow([]);
  const summaryH = ws.addRow(['요약', '', '', '', '', '', '', '']);
  summaryH.eachCell(c => applyHeaderStyle(c, '455A64'));

  const procs = new Set(flatData.filter(d => d.category !== 'C' && d.processNo && /^\d+$/.test(normPNo(d.processNo))).map(d => normPNo(d.processNo)));
  const fmItems = flatData.filter(d => d.itemCode === 'A5' && d.value?.trim());
  const fcItems = flatData.filter(d => d.itemCode === 'B4' && d.value?.trim());
  const feItems = flatData.filter(d => d.itemCode === 'C4' && d.value?.trim());
  const fmUnique = new Set(fmItems.map(d => `${normPNo(d.processNo)}|${d.value.trim()}`)).size;
  const fcUnique = new Set(fcItems.map(d => `${normPNo(d.processNo)}|${d.value.trim()}`)).size;
  const feUnique = new Set(feItems.map(d => d.value.trim())).size;

  const summaryRows = [
    ['전체 데이터 건수', flatData.length],
    ['공정 수', procs.size],
    ['FM (고장형태) 고유수', fmUnique],
    ['FC (고장원인) 고유수', fcUnique],
    ['FE (고장영향) 고유수', feUnique],
    ['FM 전체 행수', fmItems.length],
    ['FC 전체 행수', fcItems.length],
    ['FE 전체 행수', feItems.length],
  ];

  summaryRows.forEach(([label, count]) => {
    const row = ws.addRow([label, count]);
    row.eachCell((cell, colNum) => {
      cell.font = { name: '맑은 고딕', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'left' : 'center' };
      cell.border = BORDERS;
      if (colNum === 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_BG } };
    });
  });

  // 공정별 FM/FC 상세
  ws.addRow([]);
  const procDetailH = ws.addRow(['공정No', '공정명', 'FM수', 'FC수', 'FE수', '전체항목수']);
  procDetailH.eachCell(c => applyHeaderStyle(c, '37474F'));

  const procDetailMap = new Map<string, { name: string; fms: Set<string>; fcs: Set<string>; fes: Set<string>; total: number }>();
  flatData.forEach(d => {
    if (!d.processNo) return;
    const npNo = normPNo(d.processNo);
    if (!npNo) return;
    if (!procDetailMap.has(npNo)) {
      procDetailMap.set(npNo, { name: '', fms: new Set(), fcs: new Set(), fes: new Set(), total: 0 });
    }
    const e = procDetailMap.get(npNo)!;
    if (d.itemCode === 'A2' && d.value?.trim()) e.name = d.value.trim();
    if (d.itemCode === 'A5' && d.value?.trim()) e.fms.add(d.value.trim());
    if (d.itemCode === 'B4' && d.value?.trim()) e.fcs.add(d.value.trim());
    if (d.itemCode === 'C4' && d.value?.trim()) e.fes.add(d.value.trim());
    e.total++;
  });

  [...procDetailMap.entries()]
    .sort((a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0))
    .forEach(([pNo, d]) => {
      const row = ws.addRow([pNo, d.name, d.fms.size, d.fcs.size, d.fes.size, d.total]);
      row.eachCell((cell, colNum) => {
        cell.font = { name: '맑은 고딕', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: colNum <= 2 ? 'left' : 'center' };
        cell.border = BORDERS;
        if (colNum >= 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_BG } };
      });
    });

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

// ─── FA 데이터 시트 ───

function addFADataSheet(
  wb: import('exceljs').Workbook,
  chains: MasterFailureChain[],
  crossTab: CrossTab,
  stats?: ParseStatistics,
) {
  const ws = wb.addWorksheet('FA 통합분석');

  // 컬럼 정의
  ws.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: '구분', key: 'feScope', width: 7 },
    { header: '제품기능/요구사항', key: 'l1Info', width: 18 },
    { header: '공정No', key: 'processNo', width: 8 },
    { header: '공정명', key: 'processName', width: 12 },
    { header: '공정기능', key: 'l2Function', width: 18 },
    { header: '제품특성', key: 'productChar', width: 12 },
    { header: '4M', key: 'm4', width: 5 },
    { header: '작업요소', key: 'workElement', width: 14 },
    { header: '요소기능', key: 'l3Function', width: 18 },
    { header: '공정특성', key: 'processChar', width: 14 },
    { header: '고장영향(FE)', key: 'feValue', width: 18 },
    { header: '고장형태(FM)', key: 'fmValue', width: 18 },
    { header: '고장원인(FC)', key: 'fcValue', width: 18 },
    { header: '예방관리(PC)', key: 'pcValue', width: 18 },
    { header: '검출관리(DC)', key: 'dcValue', width: 18 },
    { header: 'S', key: 'severity', width: 4 },
    { header: 'O', key: 'occurrence', width: 4 },
    { header: 'D', key: 'detection', width: 4 },
    { header: 'AP', key: 'ap', width: 4 },
  ];

  // 그룹 헤더 (1행)
  ws.spliceRows(1, 0, []);
  const groupRow = ws.getRow(1);
  const groups: { label: string; start: number; end: number; color: string }[] = [
    { label: '', start: 1, end: 1, color: '546E7A' },
    { label: '1L 완제품', start: 2, end: 3, color: '00897B' },
    { label: '2L 메인공정', start: 4, end: 7, color: '1565C0' },
    { label: '3L 작업요소', start: 8, end: 11, color: '283593' },
    { label: '고장분석', start: 12, end: 14, color: 'C62828' },
    { label: '관리방법', start: 15, end: 16, color: '00838F' },
    { label: 'SOD/AP', start: 17, end: 20, color: 'E65100' },
  ];
  groups.forEach(g => {
    if (g.start === g.end) {
      const cell = groupRow.getCell(g.start);
      cell.value = g.label;
      applyHeaderStyle(cell, g.color);
    } else {
      ws.mergeCells(1, g.start, 1, g.end);
      const cell = groupRow.getCell(g.start);
      cell.value = g.label;
      applyHeaderStyle(cell, g.color);
    }
  });

  // 상세 헤더 (2행)
  const detailRow = ws.getRow(2);
  const headers = ['No', '구분', '제품기능/요구사항', '공정No', '공정명', '공정기능', '제품특성',
    '4M', '작업요소', '요소기능', '공정특성', '고장영향(FE)', '고장형태(FM)', '고장원인(FC)',
    '예방관리(PC)', '검출관리(DC)',
    'S', 'O', 'D', 'AP'];
  const headerColors = [
    '546E7A',
    '00897B', '00897B',
    '1565C0', '1565C0', '1565C0', '1565C0',
    '283593', '283593', '283593', '283593',
    'C62828', 'C62828', 'C62828',
    '00838F', '00838F',
    'E65100', 'E65100', 'E65100', 'E65100',
  ];
  headers.forEach((h, i) => {
    const cell = detailRow.getCell(i + 1);
    cell.value = h;
    applyHeaderStyle(cell, headerColors[i]);
  });

  // processMap / l1Map
  const processMap = new Map<string, { A2: string; A3: string; A4: string }>();
  for (const a of crossTab.aRows) {
    processMap.set(normPNo(a.processNo) || a.processNo, { A2: a.A2, A3: a.A3, A4: a.A4 });
  }
  const l1Map = new Map<string, { C2: string; C3: string }>();
  for (const c of crossTab.cRows) {
    l1Map.set(c.C1 || c.category, { C2: c.C2, C3: c.C3 });
  }

  // 데이터 정렬
  const sorted = [...chains]
    .filter(c => c.feValue?.trim() || c.fmValue?.trim() || c.fcValue?.trim())
    .sort((a, b) => {
      if ((a.feScope || '') !== (b.feScope || '')) return (a.feScope || '').localeCompare(b.feScope || '');
      const nA = parseInt(a.processNo, 10) || 0;
      const nB = parseInt(b.processNo, 10) || 0;
      if (nA !== nB) return nA - nB;
      if (a.fmValue !== b.fmValue) return (a.fmValue || '').localeCompare(b.fmValue || '');
      return 0;
    });

  // 데이터 행
  const bgMap: Record<number, string> = {};
  for (let i = 2; i <= 3; i++) bgMap[i] = L1_BG;
  for (let i = 4; i <= 7; i++) bgMap[i] = L2_BG;
  for (let i = 8; i <= 11; i++) bgMap[i] = L3_BG;
  for (let i = 12; i <= 14; i++) bgMap[i] = FAIL_BG;
  for (let i = 15; i <= 16; i++) bgMap[i] = CTRL_BG;

  sorted.forEach((c, idx) => {
    const proc = processMap.get(normPNo(c.processNo) || c.processNo);
    const l1 = l1Map.get(c.feScope || '') || l1Map.values().next().value || { C2: '', C3: '' };
    const l1Info = [l1.C2, l1.C3].filter(Boolean).join(' / ');

    const row = ws.addRow({
      no: idx + 1,
      feScope: c.feScope || '',
      l1Info,
      processNo: c.processNo,
      processName: proc?.A2 || '',
      l2Function: c.l2Function || proc?.A3 || '',
      productChar: c.productChar || proc?.A4 || '',
      m4: c.m4 || '',
      workElement: c.workElement || '',
      l3Function: c.l3Function || '',
      processChar: c.processChar || '',
      feValue: c.feValue || '',
      fmValue: c.fmValue || '',
      fcValue: c.fcValue || '',
      pcValue: c.pcValue || '',
      dcValue: c.dcValue || '',
      severity: c.severity ?? '',
      occurrence: c.occurrence ?? '',
      detection: c.detection ?? '',
      ap: c.ap || '',
    });

    row.eachCell((cell, colNum) => {
      const isTextCol = [3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16].includes(colNum);
      if (isTextCol) applyDataLeftStyle(cell);
      else applyDataStyle(cell);

      if (bgMap[colNum]) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgMap[colNum] } };
      }
    });
  });

  // 열 고정
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
}
