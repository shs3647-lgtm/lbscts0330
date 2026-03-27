/**
 * 마스터 JSON(flatData + chains) → PFMEA Import용 통합 엑셀 생성
 * - import-excel-file/route.ts 가 기대하는 시트 순서/열과 동일
 * - 특별특성: 지정 없으면 빈 셀 유지(위 행으로 채우지 않음)
 * - 그 외 열: 병합 대비 — 빈 셀은 바로 위 행 값으로 forward-fill
 *
 * 사용: npx tsx scripts/export-fmea-validation-excel.ts
 * 환경: MASTER_JSON (기본 data/master-fmea/pfm26-m002.json)
 *       OUT_DIR (기본 C:\Users\Administrator\Desktop\fmea검증)
 */
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { fillDownRows } from './forward-fill-utils';
import { normalizeScope, SCOPE_YP } from '@/lib/fmea/scope-constants';

interface FlatItem {
  processNo?: string;
  category?: string;
  itemCode?: string;
  value?: string;
  m4?: string;
  specialChar?: string;
}

interface ChainItem {
  processNo: string;
  m4?: string;
  workElement?: string;
  fmValue?: string;
  fcValue?: string;
  feValue?: string;
  feScope?: string;
  pcValue?: string;
  dcValue?: string;
  occurrence?: number | null;
  detection?: number | null;
  severity?: number | null;
  ap?: string;
  l2Function?: string;
  l3Function?: string;
  productChar?: string;
  processChar?: string;
}

const DEFAULT_OUT =
  process.platform === 'win32'
    ? 'C:\\Users\\Administrator\\Desktop\\fmea검증'
    : path.join(process.cwd(), 'data', 'master-fmea', 'fmea-validation-export');

function normDiv(processNo: string): string {
  // Scope-like processNo → normalize; otherwise pass through
  if (/^(Your Plant|Ship to Plant|User|YP|SP|USER|End User)$/i.test(processNo)) {
    return normalizeScope(processNo);
  }
  return processNo;
}

function normFeScope(scope: string | undefined): string {
  const s = (scope || '').trim();
  if (!s) return SCOPE_YP;
  return normalizeScope(s);
}

function stripPdPrefix(v: string | undefined): string {
  if (!v) return '';
  let t = v.trim();
  if (t.startsWith('P:')) t = t.slice(2).trim();
  if (t.startsWith('D:')) t = t.slice(2).trim();
  return t;
}

function buildL1Rows(flat: FlatItem[]): string[][] {
  const rows: string[][] = [];
  const lastC2ByDiv = new Map<string, string>();

  for (const it of flat) {
    if (it.category !== 'C') continue;
    const d = normDiv(it.processNo || '');
    if (it.itemCode === 'C1') {
      rows.push([d, '', '', '']);
    } else if (it.itemCode === 'C2') {
      lastC2ByDiv.set(d, it.value || '');
      rows.push([d, it.value || '', '', '']);
    } else if (it.itemCode === 'C3') {
      rows.push([d, lastC2ByDiv.get(d) || '', it.value || '', '']);
    } else if (it.itemCode === 'C4') {
      rows.push([d, lastC2ByDiv.get(d) || '', '', it.value || '']);
    }
  }
  return rows;
}

function buildL2Rows(flat: FlatItem[]): string[][] {
  const byPno = new Map<
    string,
    {
      a1: string;
      a2: string;
      a3: string;
      a4: { value: string; sc: string }[];
      a5: string[];
      a6: string[];
    }
  >();

  for (const it of flat) {
    if (it.category !== 'A') continue;
    const p = (it.processNo || '').trim();
    if (!byPno.has(p)) {
      byPno.set(p, { a1: '', a2: '', a3: '', a4: [], a5: [], a6: [] });
    }
    const g = byPno.get(p)!;
    const code = it.itemCode;
    if (code === 'A1') g.a1 = it.value || '';
    else if (code === 'A2') g.a2 = it.value || '';
    else if (code === 'A3') g.a3 = it.value || '';
    else if (code === 'A4') {
      const sc = (it.specialChar && String(it.specialChar).trim()) ? String(it.specialChar).trim() : '';
      g.a4.push({ value: it.value || '', sc });
    } else if (code === 'A5') g.a5.push(it.value || '');
    else if (code === 'A6') g.a6.push(it.value || '');
  }

  const pnos = [...byPno.keys()].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  const rows: string[][] = [];
  for (const pno of pnos) {
    const g = byPno.get(pno)!;
    const n = Math.max(g.a4.length, g.a5.length, g.a6.length, 1);
    for (let i = 0; i < n; i++) {
      const a4 = g.a4[i];
      rows.push([
        g.a1 || pno,
        g.a2,
        g.a3,
        a4?.value ?? '',
        a4?.sc ?? '',
        g.a5[i] ?? '',
        g.a6[i] ?? '',
      ]);
    }
  }
  return rows;
}

function buildL3Rows(flat: FlatItem[]): string[][] {
  const rows: string[][] = [];
  type Ctx = {
    pno: string;
    m4: string;
    we: string;
    b2: string;
    b3: string;
    sc: string;
    b4: string;
    b5: string;
  };
  let ctx: Partial<Ctx> = {};

  for (const it of flat) {
    if (it.category !== 'B') continue;
    const code = it.itemCode;
    if (code === 'B1') {
      ctx = {
        pno: (it.processNo || '').trim(),
        m4: (it.m4 || '').toUpperCase(),
        we: it.value || '',
        b2: '',
        b3: '',
        sc: '',
        b4: '',
        b5: '',
      };
    } else if (code === 'B2' && ctx.pno !== undefined) {
      ctx.b2 = it.value || '';
    } else if (code === 'B3' && ctx.pno !== undefined) {
      ctx.b3 = it.value || '';
      const sc = it.specialChar;
      ctx.sc = sc && String(sc).trim() ? String(sc).trim() : '';
    } else if (code === 'B4' && ctx.pno !== undefined) {
      ctx.b4 = it.value || '';
    } else if (code === 'B5' && ctx.pno !== undefined) {
      ctx.b5 = it.value || '';
      rows.push([
        ctx.pno!,
        ctx.m4 || '',
        ctx.we || '',
        ctx.b2 || '',
        ctx.b3 || '',
        ctx.sc || '',
        ctx.b4 || '',
        ctx.b5 || '',
      ]);
    }
  }
  return rows;
}

function buildFCRows(chains: ChainItem[]): string[][] {
  return chains.map((ch) => {
    const o = ch.occurrence ?? '';
    const d = ch.detection ?? '';
    const ap = ch.ap ?? '';
    return [
      normFeScope(ch.feScope),
      ch.feValue || '',
      String(ch.processNo || '').trim(),
      ch.fmValue || '',
      (ch.m4 || 'MN').toUpperCase(),
      ch.workElement || '',
      ch.fcValue || '',
      stripPdPrefix(ch.pcValue),
      stripPdPrefix(ch.dcValue),
      o === null || o === undefined ? '' : String(o),
      d === null || d === undefined ? '' : String(d),
      ap ? String(ap) : '',
    ];
  });
}

function buildFARows(chains: ChainItem[]): string[][] {
  return chains.map((ch) => [
    normFeScope(ch.feScope),
    '',
    '',
    String(ch.processNo || '').trim(),
    '',
    ch.l2Function || '',
    ch.productChar || '',
    '',
    (ch.m4 || 'MN').toUpperCase(),
    ch.workElement || '',
    ch.l3Function || '',
    ch.processChar || '',
    '',
    ch.feValue || '',
    ch.fmValue || '',
    ch.fcValue || '',
    ch.severity != null ? String(ch.severity) : '',
    ch.occurrence != null ? String(ch.occurrence) : '',
    ch.detection != null ? String(ch.detection) : '',
    ch.ap ? String(ch.ap) : '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
}

/** FA: flatData로 C2·C3(구분별 첫 값), 공정명(A2) 시드 → 이후 fillDown으로 행 전체 정합 */
function enrichFAFromFlat(faRows: string[][], flat: FlatItem[]): string[][] {
  const pnoToA2 = new Map<string, string>();
  for (const it of flat) {
    if (it.category === 'A' && it.itemCode === 'A2') {
      pnoToA2.set((it.processNo || '').trim(), (it.value || '').trim());
    }
  }
  const scopeToC2 = new Map<string, string>();
  const scopeToC3 = new Map<string, string>();
  for (const it of flat) {
    if (it.category !== 'C') continue;
    const sc = normDiv(it.processNo || '');
    if (it.itemCode === 'C2' && !scopeToC2.has(sc)) scopeToC2.set(sc, (it.value || '').trim());
    if (it.itemCode === 'C3' && !scopeToC3.has(sc)) scopeToC3.set(sc, (it.value || '').trim());
  }
  const W = 26;
  return faRows.map((row) => {
    const r = [...row];
    while (r.length < W) r.push('');
    const scope = (r[0] || '').trim();
    const pno = (r[3] || '').trim();
    const a2 = pnoToA2.get(pno) || r[4] || '';
    r[1] = (r[1] || '').trim() || scopeToC2.get(scope) || '';
    r[2] = (r[2] || '').trim() || scopeToC3.get(scope) || '';
    r[4] = (r[4] || '').trim() || a2;
    return r;
  });
}

function sortChainsForSheet<T extends { feScope?: string; processNo?: string; fmValue?: string; fcValue?: string }>(
  chains: T[],
): T[] {
  return [...chains].sort((a, b) => {
    const sa = normFeScope(a.feScope).localeCompare(normFeScope(b.feScope));
    if (sa !== 0) return sa;
    const pa = parseInt(String(a.processNo || ''), 10);
    const pb = parseInt(String(b.processNo || ''), 10);
    if (!Number.isNaN(pa) && !Number.isNaN(pb) && pa !== pb) return pa - pb;
    const pns = String(a.processNo || '').localeCompare(String(b.processNo || ''));
    if (pns !== 0) return pns;
    const fm = (a.fmValue || '').localeCompare(b.fmValue || '');
    if (fm !== 0) return fm;
    return (a.fcValue || '').localeCompare(b.fcValue || '');
  });
}

async function main() {
  const root = process.cwd();
  const masterPath =
    process.env.MASTER_JSON || path.join(root, 'data', 'master-fmea', 'pfm26-m002.json');
  const outDir = process.env.OUT_DIR || DEFAULT_OUT;

  const raw = fs.readFileSync(masterPath, 'utf8');
  const data = JSON.parse(raw) as {
    fmeaId?: string;
    flatData?: FlatItem[];
    chains?: ChainItem[];
  };

  const flat = data.flatData || [];
  const chainsSorted = sortChainsForSheet(data.chains || []);

  const l1 = fillDownRows(buildL1Rows(flat), new Set());
  const l2 = fillDownRows(buildL2Rows(flat), new Set([4]));
  const l3 = fillDownRows(buildL3Rows(flat), new Set([5]));
  const fc = fillDownRows(buildFCRows(chainsSorted as ChainItem[]), new Set());
  const fa = fillDownRows(
    enrichFAFromFlat(buildFARows(chainsSorted as ChainItem[]), flat),
    new Set([7, 12]),
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = 'autom-fmea export-fmea-validation-excel';
  wb.created = new Date();

  const sh1 = wb.addWorksheet('L1 통합(C1-C4)');
  sh1.addRow(['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)']);
  l1.forEach((r) => sh1.addRow(r));

  const sh2 = wb.addWorksheet('L2 통합(A1-A6)');
  sh2.addRow(['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리']);
  l2.forEach((r) => sh2.addRow(r));

  const sh3 = wb.addWorksheet('L3 통합(B1-B5)');
  sh3.addRow([
    '공정번호',
    '4M',
    '작업요소(B1)',
    '요소기능(B2)',
    '공정특성(B3)',
    '특별특성',
    '고장원인(B4)',
    '예방관리(B5)',
  ]);
  l3.forEach((r) => sh3.addRow(r));

  const sh4 = wb.addWorksheet('FC 고장사슬');
  sh4.addRow([
    'FE구분',
    'FE(고장영향)',
    'L2-1.공정번호',
    'FM(고장형태)',
    '4M',
    '작업요소(WE)',
    'FC(고장원인)',
    'B5.예방관리(발생 전 방지)',
    'A6.검출관리(발생 후 검출)',
    'O',
    'D',
    'AP',
  ]);
  fc.forEach((r) => sh4.addRow(r));

  const sh5 = wb.addWorksheet('FA 통합분석');
  sh5.addRow([
    '구분(C1)',
    '제품기능(C2)',
    '요구사항(C3)',
    '공정No(A1)',
    '공정명(A2)',
    '공정기능(A3)',
    '제품특성(A4)',
    '특별특성(A4)',
    '4M',
    '작업요소(B1)',
    '요소기능(B2)',
    '공정특성(B3)',
    '특별특성(B3)',
    '고장영향(C4)',
    '고장형태(A5)',
    '고장원인(B4)',
    'S',
    'O',
    'D',
    'AP',
    'DC추천1',
    'DC추천2',
    'PC추천1',
    'PC추천2',
    'O추천',
    'D추천',
  ]);
  fa.forEach((r) => sh5.addRow(r));

  fs.mkdirSync(outDir, { recursive: true });
  const baseName = `PFMEA_Import_${data.fmeaId || 'export'}_validation_full.xlsx`;
  const outPath = path.join(outDir, baseName);

  await wb.xlsx.writeFile(outPath);
  console.info(`[export-fmea-validation-excel] Wrote ${outPath}`);
  console.info(
    `  L1=${l1.length} L2=${l2.length} L3=${l3.length} FC=${fc.length} FA=${fa.length} (from ${masterPath})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
