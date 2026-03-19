/**
 * @file generate-import-excel.ts
 * 역설계 Import 시스템 — Phase 2: DB → Import 엑셀 역생성
 * 설계서: docs/REVERSE_ENGINEERING_IMPORT_SYSTEM.md §8 generateImportExcel()
 *
 * Atomic DB → atomicToFlatData → atomicToChains → 6시트 ExcelJS 워크북
 */

import type { PrismaClient } from '@prisma/client';
import { reverseExtract } from './reverse-extract';
import type { FullAtomicDB } from './guards';

const HEADER_BG = '00587A';
const FC_BG = 'B91C1C';
const FA_BG = '1E40AF';
const VER_BG = '6B21A8';

const stripPrefix = (v: string) => (v || '').replace(/^[PD]:/gm, '').trim();

const AP_TABLE = [
  { s: '9-10', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '6-7', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '4-5', d: ['H', 'H', 'H', 'M'] },
  { s: '9-10', o: '2-3', d: ['H', 'M', 'L', 'L'] },
  { s: '9-10', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '7-8', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '7-8', o: '6-7', d: ['H', 'H', 'H', 'M'] },
  { s: '7-8', o: '4-5', d: ['H', 'M', 'M', 'M'] },
  { s: '7-8', o: '2-3', d: ['M', 'M', 'L', 'L'] },
  { s: '7-8', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', o: '8-10', d: ['H', 'H', 'M', 'M'] },
  { s: '4-6', o: '6-7', d: ['M', 'M', 'M', 'L'] },
  { s: '4-6', o: '4-5', d: ['M', 'L', 'L', 'L'] },
  { s: '4-6', o: '2-3', d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '8-10', d: ['M', 'M', 'L', 'L'] },
  { s: '2-3', o: '6-7', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '4-5', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '2-3', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '1', d: ['L', 'L', 'L', 'L'] },
];

function calcAP(s: number | undefined, o: number | undefined, d: number | undefined): string {
  const sv = Number(s) || 0, ov = Number(o) || 0, dv = Number(d) || 0;
  if (sv === 0 || ov === 0 || dv === 0) return '';
  const sRange = sv >= 9 ? '9-10' : sv >= 7 ? '7-8' : sv >= 4 ? '4-6' : sv >= 2 ? '2-3' : null;
  if (!sRange) return 'L';
  const oRange = ov >= 8 ? '8-10' : ov >= 6 ? '6-7' : ov >= 4 ? '4-5' : ov >= 2 ? '2-3' : '1';
  const dIdx = dv >= 7 ? 0 : dv >= 5 ? 1 : dv >= 2 ? 2 : 3;
  const row = AP_TABLE.find(r => r.s === sRange && r.o === oRange);
  return row ? row.d[dIdx] : 'L';
}

function thinBorder() {
  return {
    top: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    left: { style: 'thin' as const },
    right: { style: 'thin' as const },
  };
}

interface ChainRow {
  feScope: string;
  feValue: string;
  processNo: string;
  fmValue: string;
  m4: string;
  workElement: string;
  fcValue: string;
  pcValue: string;
  dcValue: string;
  severity: number;
  occurrence: number;
  detection: number;
  l2Function: string;
  productChar: string;
  l3Function: string;
  processChar: string;
  specialChar: string;
}

function sortChains(chains: ChainRow[]): ChainRow[] {
  const scopeOrder: Record<string, number> = { YP: 0, SP: 1, USER: 2 };
  return [...chains].sort((a, b) => {
    const sA = scopeOrder[a.feScope] ?? 9, sB = scopeOrder[b.feScope] ?? 9;
    if (sA !== sB) return sA - sB;
    const feCmp = (a.feValue || '').localeCompare(b.feValue || '');
    if (feCmp !== 0) return feCmp;
    const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
    if (pCmp !== 0) return pCmp;
    return (a.fcValue || '').localeCompare(b.fcValue || '');
  });
}

/** FullAtomicDB → ChainRow[] (reverseExtract 데이터 기반) */
function atomicToChainRows(data: FullAtomicDB): ChainRow[] {
  const fmById = new Map(data.failureModes.map((m: any) => [m.id, m]));
  const feById = new Map(data.failureEffects.map((e: any) => [e.id, e]));
  const fcById = new Map(data.failureCauses.map((c: any) => [c.id, c]));
  const l2ById = new Map(data.l2Structures.map((s: any) => [s.id, s]));
  const l3ById = new Map(data.l3Structures.map((s: any) => [s.id, s]));
  const l2FById = new Map(data.l2Functions.map((f: any) => [f.id, f]));
  const l3FById = new Map(data.l3Functions.map((f: any) => [f.id, f]));

  const riskByLink = new Map<string, any>();
  for (const ra of data.riskAnalyses) {
    if (!riskByLink.has(ra.linkId)) riskByLink.set(ra.linkId, ra);
  }

  const chains: ChainRow[] = [];
  for (const link of data.failureLinks) {
    const fm = fmById.get(link.fmId);
    const fe = feById.get(link.feId);
    const fc = fcById.get(link.fcId);
    if (!fm || !fe || !fc) continue;

    const l2 = l2ById.get(fm.l2StructId);
    const l3 = l3ById.get(fc.l3StructId);
    const l2f = l2FById.get(fm.l2FuncId);
    const l3f = l3FById.get(fc.l3FuncId);
    const risk = riskByLink.get(link.id);

    chains.push({
      feScope: fe.category || '',
      feValue: fe.effect || '',
      processNo: l2?.no || '',
      fmValue: fm.mode || '',
      m4: l3?.m4 || '',
      workElement: l3?.name || '',
      fcValue: fc.cause || '',
      pcValue: risk?.preventionControl || '',
      dcValue: risk?.detectionControl || '',
      severity: risk?.severity || 0,
      occurrence: risk?.occurrence || 0,
      detection: risk?.detection || 0,
      l2Function: l2f?.functionName || '',
      productChar: l2f?.productChar || '',
      l3Function: l3f?.functionName || '',
      processChar: l3f?.processChar || '',
      specialChar: l2f?.specialChar || l3f?.specialChar || '',
    });
  }

  return chains;
}

export interface GenerateExcelResult {
  buffer: Buffer;
  fileName: string;
  stats: {
    l1Rows: number;
    l2Rows: number;
    l3Rows: number;
    fcRows: number;
    faRows: number;
  };
}

/**
 * Atomic DB → Import 호환 엑셀 생성
 * reverseExtract()로 로드한 FullAtomicDB를 받아 6시트 엑셀 워크북 버퍼를 반환한다.
 */
export async function generateImportExcel(
  data: FullAtomicDB
): Promise<GenerateExcelResult> {
  const ExcelJS = (await import('exceljs')).default;
  const chains = atomicToChainRows(data);

  // ═══ L1 시트 데이터 (C1~C4) ═══
  const l1FuncsByCat = new Map<string, any[]>();
  for (const f of data.l1Functions) {
    const arr = l1FuncsByCat.get(f.category) || [];
    arr.push(f);
    l1FuncsByCat.set(f.category, arr);
  }

  const feByCat = new Map<string, any[]>();
  for (const fe of data.failureEffects) {
    const arr = feByCat.get(fe.category) || [];
    arr.push(fe);
    feByCat.set(fe.category, arr);
  }

  const l1Rows: string[][] = [];
  for (const [cat, funcs] of l1FuncsByCat) {
    const effects = feByCat.get(cat) || [];
    const maxLen = Math.max(funcs.length, effects.length);
    for (let i = 0; i < maxLen; i++) {
      const f = funcs[i];
      const fe = effects[i];
      l1Rows.push([
        i === 0 ? cat : '',
        f?.functionName || '',
        f?.requirement || '',
        fe?.effect || '',
      ]);
    }
  }

  // ═══ L2 시트 데이터 (A1~A6) — 구조 기반, carry-forward ═══
  const l2Rows: string[][] = [];

  // DC: FM별 개별 DC 매핑 (RiskAnalysis에서 직접 조회)
  const dcByFmId = new Map<string, string>();
  for (const link of data.failureLinks) {
    const risk = data.riskAnalyses.find((r: any) => r.linkId === link.id);
    if (risk?.detectionControl?.trim() && !dcByFmId.has(link.fmId)) {
      dcByFmId.set(link.fmId, risk.detectionControl);
    }
  }

  for (const l2 of data.l2Structures) {
    const l2Funcs = data.l2Functions.filter((f: any) => f.l2StructId === l2.id);
    const fms = data.failureModes.filter((m: any) => m.l2StructId === l2.id);

    const maxLen = Math.max(1, l2Funcs.length, fms.length);
    for (let i = 0; i < maxLen; i++) {
      const f = l2Funcs[i];
      const fm = fms[i];
      const dc = fm ? dcByFmId.get(fm.id) || '' : '';
      l2Rows.push([
        i === 0 ? l2.no : '',
        i === 0 ? l2.name : '',
        f?.functionName || '',
        f?.productChar || '',
        f?.specialChar || '',
        fm?.mode || '',
        stripPrefix(dc),
      ]);
    }
  }

  // ═══ L3 시트 데이터 (B1~B5) — 구조 기반 (WE 단위 그룹화, carry-forward) ═══
  const l3Rows: string[][] = [];

  // WE별 chain 인덱스
  const chainsByWE = new Map<string, ChainRow[]>();
  for (const ch of chains) {
    const key = `${ch.processNo}|${ch.m4}|${ch.workElement}`;
    const arr = chainsByWE.get(key) || [];
    arr.push(ch);
    chainsByWE.set(key, arr);
  }

  // L3Function → L3별 그룹화
  const l3FuncsByL3 = new Map<string, any[]>();
  for (const f of data.l3Functions) {
    const arr = l3FuncsByL3.get(f.l3StructId) || [];
    arr.push(f);
    l3FuncsByL3.set(f.l3StructId, arr);
  }

  // FC → L3별 그룹화
  const fcsByL3 = new Map<string, any[]>();
  for (const c of data.failureCauses) {
    const arr = fcsByL3.get(c.l3StructId) || [];
    arr.push(c);
    fcsByL3.set(c.l3StructId, arr);
  }

  // FC → RiskAnalysis (PC 조회용, FailureLink 경유)
  const riskByFcId = new Map<string, any>();
  for (const link of data.failureLinks) {
    const risk = data.riskAnalyses.find((r: any) => r.linkId === link.id);
    if (risk) riskByFcId.set(link.fcId, risk);
  }

  for (const l3 of data.l3Structures) {
    const l2 = data.l2Structures.find((s: any) => s.id === l3.l2Id);
    const pNo = l2?.no || '';
    const m4 = l3.m4 || '';
    const funcs = l3FuncsByL3.get(l3.id) || [];
    const fcs = fcsByL3.get(l3.id) || [];

    const rowCount = Math.max(1, funcs.length, fcs.length);
    for (let i = 0; i < rowCount; i++) {
      const func = funcs[i];
      const fc = fcs[i];
      const risk = fc ? riskByFcId.get(fc.id) : undefined;
      l3Rows.push([
        i === 0 ? pNo : '',
        i === 0 ? m4 : '',
        i === 0 ? l3.name : '',
        func?.functionName || '',
        func?.processChar || '',
        func?.specialChar || '',
        fc?.cause || '',
        stripPrefix(risk?.preventionControl || ''),
      ]);
    }
  }

  // ═══ FC 시트 데이터 (13열) ═══
  const sortedChains = sortChains(chains);
  const fcRows = sortedChains.map(ch => [
    ch.feScope, ch.feValue, ch.processNo, ch.fmValue,
    ch.m4, ch.workElement, ch.fcValue,
    stripPrefix(ch.pcValue), stripPrefix(ch.dcValue),
    ch.severity ? String(ch.severity) : '',
    ch.occurrence ? String(ch.occurrence) : '',
    ch.detection ? String(ch.detection) : '',
    calcAP(ch.severity, ch.occurrence, ch.detection),
  ]);

  // ═══ FA 시트 데이터 (26열) ═══
  const faRows = sortedChains.map(ch => [
    ch.feScope,
    '', '', // C2, C3 (L1에서 lookup)
    ch.processNo,
    '', // A2
    ch.l2Function || '',
    ch.productChar || '',
    ch.specialChar || '',
    ch.m4,
    ch.workElement,
    ch.l3Function || '',
    ch.processChar || '',
    ch.specialChar || '',
    ch.feValue,
    ch.fmValue,
    ch.fcValue,
    ch.severity ? String(ch.severity) : '',
    ch.occurrence ? String(ch.occurrence) : '',
    ch.detection ? String(ch.detection) : '',
    calcAP(ch.severity, ch.occurrence, ch.detection),
    stripPrefix(ch.dcValue), '',
    stripPrefix(ch.pcValue), '',
    '', '',
  ]);

  // ═══ ExcelJS 워크북 생성 ═══
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FMEA Reverse-Import Generator';
  wb.created = new Date();

  const sheets = [
    { name: 'L1 통합(C1-C4)', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)'], data: l1Rows, bg: HEADER_BG },
    { name: 'L2 통합(A1-A6)', headers: ['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리'], data: l2Rows, bg: HEADER_BG },
    { name: 'L3 통합(B1-B5)', headers: ['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)'], data: l3Rows, bg: HEADER_BG },
    { name: 'FC 고장사슬', headers: ['FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)', '4M', '작업요소(WE)', 'FC(고장원인)', 'B5.예방관리', 'A6.검출관리', 'S', 'O', 'D', 'AP'], data: fcRows, bg: FC_BG },
    {
      name: 'FA 통합분석',
      headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '공정No(A1)', '공정명(A2)', '공정기능(A3)', '제품특성(A4)', '특별특성(A4)', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성(B3)', '고장영향(C4)', '고장형태(A5)', '고장원인(B4)', 'S', 'O', 'D', 'AP', 'DC추천1', 'DC추천2', 'PC추천1', 'PC추천2', 'O추천', 'D추천'],
      data: faRows, bg: FA_BG,
    },
  ];

  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    ws.columns = s.headers.map(h => ({ header: h, width: Math.max(14, h.length * 1.5 + 4) }));
    const hr = ws.getRow(1);
    hr.height = 24;
    hr.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + s.bg } };
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      c.border = thinBorder();
    });
    for (const [idx, row] of s.data.entries()) {
      const r = ws.addRow(row);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF0F7FB';
      r.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        c.alignment = { vertical: 'top', wrapText: true };
        c.font = { size: 9 };
        c.border = thinBorder();
      });
    }
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  }

  // VERIFY 시트
  const vws = wb.addWorksheet('VERIFY');
  vws.columns = [
    { header: '검증항목', width: 20 },
    { header: '엑셀수식값', width: 15 },
    { header: '설명', width: 50 },
  ];
  const vhr = vws.getRow(1);
  vhr.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + VER_BG } };
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.border = thinBorder();
  });

  const lastL1 = l1Rows.length + 1;
  const lastL2 = l2Rows.length + 1;
  const lastL3 = l3Rows.length + 1;
  const lastFC = fcRows.length + 1;

  const verifyData: [string, any, string][] = [
    ['FM_COUNT', { formula: `COUNTA('L2 통합(A1-A6)'!F2:F${lastL2})-COUNTBLANK('L2 통합(A1-A6)'!F2:F${lastL2})` }, 'A5 고장형태 건수'],
    ['FC_COUNT', { formula: `COUNTA('L3 통합(B1-B5)'!G2:G${lastL3})-COUNTBLANK('L3 통합(B1-B5)'!G2:G${lastL3})` }, 'B4 고장원인 건수'],
    ['FE_COUNT', { formula: `COUNTA('L1 통합(C1-C4)'!D2:D${lastL1})-COUNTBLANK('L1 통합(C1-C4)'!D2:D${lastL1})` }, 'C4 고장영향 건수'],
    ['CHAIN_COUNT', { formula: `COUNTA('FC 고장사슬'!G2:G${lastFC})-COUNTBLANK('FC 고장사슬'!G2:G${lastFC})` }, 'FC 고장사슬 행수'],
    ['L1_ROWS', l1Rows.length, 'L1 통합 데이터 행 수'],
    ['L2_ROWS', l2Rows.length, 'L2 통합 데이터 행 수'],
    ['L3_ROWS', l3Rows.length, 'L3 통합 데이터 행 수'],
    ['FC_ROWS', fcRows.length, 'FC 고장사슬 데이터 행 수'],
    ['FA_ROWS', faRows.length, 'FA 통합분석 데이터 행 수'],
  ];

  for (const [label, val, desc] of verifyData) {
    vws.addRow([label, val, desc]);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `PFMEA_ReverseImport_${data.fmeaId}_${dateStr}.xlsx`;

  return {
    buffer: Buffer.from(buffer),
    fileName,
    stats: {
      l1Rows: l1Rows.length,
      l2Rows: l2Rows.length,
      l3Rows: l3Rows.length,
      fcRows: fcRows.length,
      faRows: faRows.length,
    },
  };
}

/**
 * DB에서 직접 로드 → Import 엑셀 생성
 */
export async function generateImportExcelFromDB(
  prisma: PrismaClient,
  fmeaId: string
): Promise<GenerateExcelResult> {
  const data = await reverseExtract(prisma, fmeaId);
  return generateImportExcel(data);
}
