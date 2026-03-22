/**
 * @file generate-import-4sheet.ts
 * @description 간소화 PFMEA Import 엑셀 생성 (4시트: L1+L2+L3+FC)
 *
 * ★ Import 엑셀 생성 규칙 (2026-03-22 확정):
 *   1. 4시트 구조: L1 통합(C1-C4), L2 통합(A1-A6), L3 통합(B1-B5), FC 고장사슬
 *   2. 모든 셀 누락 없이 정보 입력 (빈 셀 = 경고)
 *   3. 공정번호 순서대로 정렬 (숫자 오름차순)
 *   4. 헤더: 배경색(#00587A 틸), 흰색 굵은 글씨, 가로세로 중앙정렬, 자동줄바꿈
 *   5. 데이터: 가로세로 중앙정렬, 자동줄바꿈, 테두리(thin)
 *   6. 전체 셀 구분선(thin border)
 *
 * ★ FC 고장사슬 N:1:N 구조 (2026-03-22 확정):
 *   FE:FM:FC = N:1:N (다대다)
 *   - 1개 FM에 여러 FE 연결 가능 (각 행마다 다른 FE)
 *   - 1개 FM에 여러 FC 연결 가능 (각 행마다 다른 FC)
 *   - 각 행 = 1개 체인 (FE+FM+FC), 같은 FM의 다른 행은 다른 FE/FC 가능
 *
 * 사용법:
 *   npx tsx -r tsconfig-paths/register scripts/generate-import-4sheet.ts [입력.xlsx] [출력.xlsx]
 *   npx tsx -r tsconfig-paths/register scripts/generate-import-4sheet.ts --merge [aubump.xlsx] [연결표.xlsx] [출력.xlsx]
 *
 * @created 2026-03-22
 */
import ExcelJS from 'exceljs';
import fs from 'fs';

// ─── 타입 ───

interface L1Row { scope: string; productFunc: string; requirement: string; failureEffect: string }
interface L2Row { processNo: string; processName: string; processFunc: string; productChar: string; specialChar: string; failureMode: string; detectionCtrl: string }
interface L3Row { processNo: string; m4: string; workElement: string; elementFunc: string; processChar: string; specialChar: string; failureCause: string; preventionCtrl: string }
interface FCRow {
  feScope: string; fe: string; processNo: string; fm: string;
  m4: string; we: string; fc: string;
  s: number;
}

export interface ImportData {
  l1: L1Row[];
  l2: L2Row[];
  l3: L3Row[];
  fc: FCRow[];
}

// ─── 스타일 상수 (Import 엑셀 생성 규칙) ───

const HEADER_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00587A' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const CELL_ALIGNMENT: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' },
};

function styleSheet(ws: ExcelJS.Worksheet, dataRowCount: number, colCount: number) {
  const headerRow = ws.getRow(1);
  headerRow.height = 32;
  for (let c = 1; c <= colCount; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = CELL_ALIGNMENT;
    cell.border = BORDER;
  }
  for (let r = 2; r <= dataRowCount + 1; r++) {
    for (let c = 1; c <= colCount; c++) {
      const cell = ws.getRow(r).getCell(c);
      cell.alignment = CELL_ALIGNMENT;
      cell.border = BORDER;
    }
  }
}

// ─── 공정번호 정렬 (숫자 오름차순) ───

function sortByProcessNo<T extends { processNo: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const na = parseInt(a.processNo, 10) || 0;
    const nb = parseInt(b.processNo, 10) || 0;
    return na - nb;
  });
}

// ─── 빈 셀 검증 ───

function countEmptyCells(sheetName: string, rows: Record<string, unknown>[], skipFields: string[] = []): number {
  let empty = 0;
  for (const row of rows) {
    for (const [key, val] of Object.entries(row)) {
      if (skipFields.includes(key)) continue;
      if (val === '' || val === null || val === undefined) empty++;
    }
  }
  if (empty > 0) console.log(`  ⚠️ ${sheetName}: 빈 셀 ${empty}건`);
  return empty;
}

// ─── 시트 생성 ───

function addL1Sheet(wb: ExcelJS.Workbook, rows: L1Row[]) {
  const ws = wb.addWorksheet('L1 통합(C1-C4)');
  ws.addRow(['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)']);
  ws.columns = [{ width: 10 }, { width: 45 }, { width: 45 }, { width: 45 }];
  for (const r of rows) ws.addRow([r.scope, r.productFunc, r.requirement, r.failureEffect]);
  styleSheet(ws, rows.length, 4);
}

function addL2Sheet(wb: ExcelJS.Workbook, rows: L2Row[]) {
  const ws = wb.addWorksheet('L2 통합(A1-A6)');
  ws.addRow(['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리']);
  ws.columns = [{ width: 12 }, { width: 20 }, { width: 45 }, { width: 35 }, { width: 10 }, { width: 35 }, { width: 45 }];
  const sorted = sortByProcessNo(rows);
  for (const r of sorted) ws.addRow([r.processNo, r.processName, r.processFunc, r.productChar, r.specialChar, r.failureMode, r.detectionCtrl]);
  styleSheet(ws, sorted.length, 7);
}

function addL3Sheet(wb: ExcelJS.Workbook, rows: L3Row[]) {
  const ws = wb.addWorksheet('L3 통합(B1-B5)');
  ws.addRow(['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)']);
  ws.columns = [{ width: 12 }, { width: 6 }, { width: 22 }, { width: 45 }, { width: 35 }, { width: 10 }, { width: 35 }, { width: 45 }];
  const sorted = sortByProcessNo(rows);
  for (const r of sorted) ws.addRow([r.processNo, r.m4, r.workElement, r.elementFunc, r.processChar, r.specialChar, r.failureCause, r.preventionCtrl]);
  styleSheet(ws, sorted.length, 8);
}

function addFCSheet(wb: ExcelJS.Workbook, rows: FCRow[]) {
  const ws = wb.addWorksheet('FC 고장사슬');
  // ★ 단순화: PC/DC는 L2(A6)/L3(B5)에 있으므로 제외, O/D/AP도 제외, S(심각도)만 유지
  ws.addRow(['FE구분', 'FE(고장영향)', 'S', 'L2-1.공정번호', 'FM(고장형태)', '4M', '작업요소(WE)', 'FC(고장원인)']);
  ws.columns = [
    { width: 8 }, { width: 45 }, { width: 5 }, { width: 12 }, { width: 35 },
    { width: 6 }, { width: 22 }, { width: 35 },
  ];
  const sorted = sortByProcessNo(rows);
  for (const r of sorted) ws.addRow([r.feScope, r.fe, r.s, r.processNo, r.fm, r.m4, r.we, r.fc]);
  styleSheet(ws, sorted.length, 8);
}

// ─── 엑셀 생성 (export용) ───

export async function generateImportExcel(data: ImportData): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PFMEA Import Generator';
  wb.created = new Date();
  addL1Sheet(wb, data.l1);
  addL2Sheet(wb, data.l2);
  addL3Sheet(wb, data.l3);
  addFCSheet(wb, data.fc);
  return wb;
}

// ─── 기존 엑셀에서 데이터 추출 ───

const str = (v: unknown) => String(v ?? '').trim();
const num = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const pno = (v: unknown) => {
  const s = str(v);
  if (/^\d+$/.test(s) && s.length === 1) return '0' + s;
  return s;
};

export async function extractFromExcel(inputPath: string): Promise<ImportData> {
  const XLSX = await import('xlsx');
  const wb = XLSX.default.readFile(inputPath);
  const toRows = (name: string) => {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return (XLSX.default.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]).slice(1);
  };

  const l1: L1Row[] = toRows('L1 통합(C1-C4)').filter((r: any[]) => str(r[0])).map((r: any[]) => ({
    scope: str(r[0]), productFunc: str(r[1]), requirement: str(r[2]), failureEffect: str(r[3]),
  }));
  const l2: L2Row[] = toRows('L2 통합(A1-A6)').filter((r: any[]) => str(r[0])).map((r: any[]) => ({
    processNo: pno(r[0]), processName: str(r[1]), processFunc: str(r[2]),
    productChar: str(r[3]), specialChar: str(r[4]), failureMode: str(r[5]), detectionCtrl: str(r[6]),
  }));
  const l3: L3Row[] = toRows('L3 통합(B1-B5)').filter((r: any[]) => str(r[0])).map((r: any[]) => ({
    processNo: pno(r[0]), m4: str(r[1]).toUpperCase(), workElement: str(r[2]),
    elementFunc: str(r[3]), processChar: str(r[4]), specialChar: str(r[5]),
    failureCause: str(r[6]), preventionCtrl: str(r[7]),
  }));
  const fc: FCRow[] = toRows('FC 고장사슬').filter((r: any[]) => str(r[3]) || str(r[2])).map((r: any[]) => {
    // 새 양식(8열): FE구분|FE|S|공정번호|FM|4M|WE|FC
    // 구 양식(13열): FE구분|FE|공정번호|FM|4M|WE|FC|PC|DC|S|O|D|AP
    const isNewFormat = str(r[0]) && /^\d+$/.test(str(r[2])) === false && /^\d+$/.test(str(r[3]));
    if (isNewFormat) {
      return { feScope: str(r[0]), fe: str(r[1]), s: num(r[2]), processNo: pno(r[3]), fm: str(r[4]), m4: str(r[5]).toUpperCase(), we: str(r[6]), fc: str(r[7]) };
    }
    return { feScope: str(r[0]), fe: str(r[1]), processNo: pno(r[2]), fm: str(r[3]), m4: str(r[4]).toUpperCase(), we: str(r[5]), fc: str(r[6]), s: num(r[9]) };
  });
  return { l1, l2, l3, fc };
}

// ─── 연결표 + aubump FC 병합 (N:1:N 다대다 반영) ───

export async function mergeWithLinkageTable(
  aubumpPath: string,
  linkagePath: string,
): Promise<ImportData> {
  const XLSX = await import('xlsx');

  // 1. aubump에서 L1/L2/L3 + FC(PC/DC/SOD) 추출
  const aubumpData = await extractFromExcel(aubumpPath);

  // 2. L2에서 공정명→공정번호 매핑
  const nameToNo = new Map<string, string>();
  const noToName = new Map<string, string>();
  for (const r of aubumpData.l2) {
    nameToNo.set(r.processName, r.processNo);
    noToName.set(r.processNo, r.processName);
  }

  // 3. aubump FC를 key(pno|fm|fc)로 인덱싱 → S/m4/we 조회용
  const fcIndex = new Map<string, { s: number; m4: string; we: string }>();
  for (const r of aubumpData.fc) {
    const key = r.processNo + '|' + r.fm + '|' + r.fc;
    if (!fcIndex.has(key)) {
      fcIndex.set(key, { s: r.s, m4: r.m4, we: r.we });
    }
  }

  // 4. 연결표에서 FE↔FM↔FC 매핑 추출 (carry-forward로 병합셀 해석)
  const wbLink = XLSX.default.readFile(linkagePath);
  const sheetName = wbLink.SheetNames[0];
  const linkRows = (XLSX.default.utils.sheet_to_json(wbLink.Sheets[sheetName], { header: 1, defval: '' }) as any[][]).slice(1);

  let curCat = '', curFE = '', curFM = '', curS = 0;
  const mergedFC: FCRow[] = [];
  let matched = 0, unmatched = 0;

  for (const r of linkRows) {
    if (str(r[2])) { curCat = str(r[1]); curFE = str(r[2]); curS = num(r[3]); }
    if (str(r[5])) { curFM = str(r[5]); }
    const proc = str(r[7]);
    const we = str(r[8]);
    const fc = str(r[9]);
    if (!fc || !proc) continue;

    const processNo = nameToNo.get(proc) || '';
    const key = processNo + '|' + curFM + '|' + fc;
    const extra = fcIndex.get(key);

    if (extra) {
      matched++;
      mergedFC.push({
        feScope: curCat, fe: curFE, processNo,
        fm: curFM, m4: extra.m4, we: extra.we, fc,
        s: curS || extra.s,
      });
    } else {
      unmatched++;
      const fallbackKey = [...fcIndex.keys()].find(k => k.startsWith(processNo + '|' + curFM + '|'));
      const fb = fallbackKey ? fcIndex.get(fallbackKey)! : { s: 0, m4: '', we: '' };
      mergedFC.push({
        feScope: curCat, fe: curFE, processNo,
        fm: curFM, m4: fb.m4 || '', we: we || fb.we, fc,
        s: curS || fb.s,
      });
    }
  }

  console.log(`\n=== N:1:N 병합 결과 ===`);
  console.log(`연결표 체인: ${mergedFC.length}건`);
  console.log(`매칭 성공: ${matched}건`);
  console.log(`매칭 실패(폴백): ${unmatched}건`);

  // N:1:N 검증
  const fmToFEs = new Map<string, Set<string>>();
  for (const c of mergedFC) {
    const k = c.processNo + '|' + c.fm;
    if (!fmToFEs.has(k)) fmToFEs.set(k, new Set());
    fmToFEs.get(k)!.add(c.fe);
  }
  const multiFE = [...fmToFEs.values()].filter(s => s.size > 1).length;
  console.log(`다중 FE FM: ${multiFE}/${fmToFEs.size} (N:1:N 구조)`);

  return { l1: aubumpData.l1, l2: aubumpData.l2, l3: aubumpData.l3, fc: mergedFC };
}

// ─── 메인 (CLI) ───

async function main() {
  const args = process.argv.slice(2);

  let data: ImportData;
  let outputPath: string;

  if (args[0] === '--merge') {
    // --merge [aubump.xlsx] [연결표.xlsx] [출력.xlsx]
    const aubumpPath = args[1] || 'C:/Users/Administrator/Desktop/LB쎄미콘/aubump/aubump.xlsx';
    const linkagePath = args[2] || 'C:/Users/Administrator/Downloads/FMEA_연결표 (2).xlsx';
    outputPath = args[3] || aubumpPath.replace(/\.xlsx$/i, '_import_n1n.xlsx');

    console.log(`aubump: ${aubumpPath}`);
    console.log(`연결표: ${linkagePath}`);
    console.log(`출력: ${outputPath}`);

    data = await mergeWithLinkageTable(aubumpPath, linkagePath);
  } else {
    const inputPath = args[0] || 'C:/Users/Administrator/Desktop/LB쎄미콘/aubump/aubump.xlsx';
    outputPath = args[1] || inputPath.replace(/\.xlsx$/i, '_import.xlsx');

    console.log(`입력: ${inputPath}`);
    console.log(`출력: ${outputPath}`);

    if (inputPath.endsWith('.json')) {
      data = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as ImportData;
    } else {
      data = await extractFromExcel(inputPath);
    }
  }

  console.log(`\n=== 데이터 요약 ===`);
  console.log(`L1 (C1-C4): ${data.l1.length}행`);
  console.log(`L2 (A1-A6): ${data.l2.length}행`);
  console.log(`L3 (B1-B5): ${data.l3.length}행`);
  console.log(`FC 고장사슬: ${data.fc.length}행`);

  // 빈 셀 검증
  console.log(`\n=== 빈 셀 검증 ===`);
  let totalEmpty = 0;
  totalEmpty += countEmptyCells('L1', data.l1 as any[]);
  totalEmpty += countEmptyCells('L2', data.l2 as any[], ['specialChar']);
  totalEmpty += countEmptyCells('L3', data.l3 as any[], ['specialChar']);
  totalEmpty += countEmptyCells('FC', data.fc as any[]);
  if (totalEmpty === 0) console.log('  ✅ 모든 셀 입력 완료 (특별특성 제외)');

  // N:1:N 구조 검증
  const fmToFEs = new Map<string, Set<string>>();
  for (const c of data.fc) {
    const k = c.processNo + '|' + c.fm;
    if (!fmToFEs.has(k)) fmToFEs.set(k, new Set());
    fmToFEs.get(k)!.add(c.fe);
  }
  const multiFE = [...fmToFEs.values()].filter(s => s.size > 1).length;
  console.log(`\n=== N:1:N 구조 ===`);
  console.log(`  FM(공정별): ${fmToFEs.size}개`);
  console.log(`  다중FE FM: ${multiFE}개 (${multiFE === fmToFEs.size ? '✅ 전체 N:1:N' : '⚠️ 일부 1:1'})`);

  // 공정번호 교차 검증
  const l2Pnos = [...new Set(data.l2.map(r => r.processNo))].sort((a, b) => parseInt(a) - parseInt(b));
  const fcPnos = [...new Set(data.fc.map(r => r.processNo))];
  const l2Only = l2Pnos.filter(p => !fcPnos.includes(p));
  const fcOnly = fcPnos.filter(p => !l2Pnos.includes(p));
  console.log(`\n=== 공정번호 검증 ===`);
  console.log(`  L2 공정: ${l2Pnos.length}개`);
  console.log(`  FC 공정: ${new Set(fcPnos).size}개`);
  console.log(`  FM(고장형태): ${new Set(data.fc.map(r => r.processNo + '|' + r.fm)).size}개`);
  if (l2Only.length) console.log(`  ⚠️ L2에만 있는 공정: ${l2Only.join(', ')}`);
  if (fcOnly.length) console.log(`  ⚠️ FC에만 있는 공정: ${fcOnly.join(', ')}`);
  if (!l2Only.length && !fcOnly.length) console.log(`  ✅ L2↔FC 공정번호 일치`);

  // 엑셀 생성
  const wb = await generateImportExcel(data);
  await wb.xlsx.writeFile(outputPath);
  console.log(`\n✅ 생성 완료: ${outputPath}`);
}

main().catch(e => {
  console.error('오류:', e.message);
  process.exit(1);
});
