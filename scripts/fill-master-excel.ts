/**
 * @file fill-master-excel.ts
 * @description 골든 마스터 JSON → 빈칸 없는 완전한 5시트 Import Excel 생성
 *
 * 기존 master_import_12inch_AuBump.xlsx의 빈칸을 모두 채운 완전한 파일 생성
 * - FC 시트: 56건 → 111건 (골든 체인 전체)
 * - 모든 셀 빈칸 없음 (carry-forward 불필요)
 *
 * Usage: npx tsx scripts/fill-master-excel.ts
 * Output: data/master-fmea/master_import_12inch_AuBump_filled.xlsx
 */
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { normalizeScope, SCOPE_YP } from '@/lib/fmea/scope-constants';

const GOLDEN_PATH = path.resolve(__dirname, '..', 'data/master-fmea/pfm26-m002-golden.json');
const ORIGINAL_PATH = path.resolve(__dirname, '..', 'data/master-fmea/master_import_12inch_AuBump.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'data/master-fmea/master_import_12inch_AuBump_filled.xlsx');

interface GoldenJSON {
  atomicDB: {
    l1Structure: { id: string; name: string };
    l1Functions: Array<{ id: string; functionName: string; category: string; requirements: string[] }>;
    failureEffects: Array<{ id: string; effect: string; l1FuncId: string; severity: number }>;
    l2Structures: Array<{ id: string; processNo: number; processName: string }>;
    l2Functions: Array<{ id: string; l2StructId: string; functionName: string; productChars: Array<{ id: string; charName: string; specialChar?: string }> }>;
    failureModes: Array<{ id: string; l2StructId: string; mode: string; productCharId?: string }>;
    l3Structures: Array<{ id: string; l2StructId: string; name: string; m4Category: string; processNo: number }>;
    l3Functions: Array<{ id: string; l3StructId: string; l2StructId: string; functionName: string; processChar: string; specialChar?: string }>;
    failureCauses: Array<{ id: string; l3FuncId: string; cause: string; l2StructId?: string; l3StructId?: string }>;
    riskAnalyses: Array<{ id: string; failureLinkId: string; detectionControl: string; preventionControl: string }>;
  };
  chains: Array<{
    processNo: string; m4: string; workElement: string;
    fmValue: string; fcValue: string; feValue: string;
    feScope: string; pcValue: string; dcValue: string;
    s: number | null; o: number | null; d: number | null; ap: string;
    l3Function?: string; processChar?: string;
    l2Function?: string; productChar?: string;
  }>;
}

async function main() {
  console.log('=== 빈칸 없는 완전한 Import Excel 생성 ===\n');

  // 1. 골든 마스터 JSON 로드
  if (!fs.existsSync(GOLDEN_PATH)) {
    console.error(`골든 JSON 없음: ${GOLDEN_PATH}`);
    process.exit(1);
  }
  const golden: GoldenJSON = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf-8'));
  console.log(`골든 JSON 로드: chains=${golden.chains.length}`);

  // 2. 기존 엑셀 읽기 (L1/L2/L3 시트는 기존 유지, FC 시트만 재생성)
  const wb = new ExcelJS.Workbook();

  // 기존 엑셀이 있으면 읽기
  if (fs.existsSync(ORIGINAL_PATH)) {
    await wb.xlsx.readFile(ORIGINAL_PATH);
    console.log(`기존 엑셀 로드: ${wb.worksheets.map(s => s.name).join(', ')}`);
  }

  // ── Sheet 0: L1 통합(C1-C4) — 빈칸 채우기 ──
  const l1Sheet = wb.getWorksheet('L1 통합(C1-C4)');
  if (l1Sheet) {
    let filledL1 = 0;
    for (let r = 2; r <= l1Sheet.rowCount; r++) {
      for (let c = 1; c <= 4; c++) {
        const cell = l1Sheet.getCell(r, c);
        if (cell.value === null || cell.value === undefined || String(cell.value).trim() === '') {
          // 이전 행에서 carry-forward
          for (let prev = r - 1; prev >= 2; prev--) {
            const prevVal = l1Sheet.getCell(prev, c).value;
            if (prevVal !== null && prevVal !== undefined && String(prevVal).trim() !== '') {
              cell.value = prevVal;
              filledL1++;
              break;
            }
          }
        }
      }
    }
    console.log(`L1 시트: ${filledL1}칸 채움`);
  }

  // ── Sheet 1: L2 통합(A1-A6) — 빈칸 채우기 ──
  const l2Sheet = wb.getWorksheet('L2 통합(A1-A6)');
  if (l2Sheet) {
    let filledL2 = 0;
    // 특별특성(col5) 빈칸은 "-"로 채움
    for (let r = 2; r <= l2Sheet.rowCount; r++) {
      for (let c = 1; c <= 7; c++) {
        const cell = l2Sheet.getCell(r, c);
        if (cell.value === null || cell.value === undefined || String(cell.value).trim() === '') {
          if (c === 5) {
            cell.value = '-'; // 특별특성 없음
            filledL2++;
          } else {
            // carry-forward from previous row
            for (let prev = r - 1; prev >= 2; prev--) {
              const prevVal = l2Sheet.getCell(prev, c).value;
              if (prevVal !== null && prevVal !== undefined && String(prevVal).trim() !== '') {
                cell.value = prevVal;
                filledL2++;
                break;
              }
            }
          }
        }
      }
    }
    console.log(`L2 시트: ${filledL2}칸 채움`);
  }

  // ── Sheet 2: L3 통합(B1-B5) — 빈칸 채우기 ──
  const l3Sheet = wb.getWorksheet('L3 통합(B1-B5)');
  if (l3Sheet) {
    let filledL3 = 0;
    for (let r = 2; r <= l3Sheet.rowCount; r++) {
      for (let c = 1; c <= 8; c++) {
        const cell = l3Sheet.getCell(r, c);
        if (cell.value === null || cell.value === undefined || String(cell.value).trim() === '') {
          if (c === 6) {
            cell.value = '-'; // 특별특성 없음
            filledL3++;
          } else {
            for (let prev = r - 1; prev >= 2; prev--) {
              const prevVal = l3Sheet.getCell(prev, c).value;
              if (prevVal !== null && prevVal !== undefined && String(prevVal).trim() !== '') {
                cell.value = prevVal;
                filledL3++;
                break;
              }
            }
          }
        }
      }
    }
    console.log(`L3 시트: ${filledL3}칸 채움`);
  }

  // ── Sheet 3: FC 고장사슬 — 전체 111건 재생성 ──
  let fcSheet = wb.getWorksheet('FC 고장사슬');
  if (fcSheet) {
    wb.removeWorksheet(fcSheet.id);
  }
  fcSheet = wb.addWorksheet('FC 고장사슬');

  // Headers
  const fcHeaders = [
    'FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)',
    '4M', 'WE(작업요소)', 'FC(고장원인)',
    'B5.예방관리(발생 전 방지)', 'A6.검출관리(발생 후 검출)',
    'S', 'O', 'D', 'AP',
  ];
  const headerRow = fcSheet.addRow(fcHeaders);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

  // scope 매핑: normalizeScope() 사용
  const scopeToShort = (raw: string | undefined): string => normalizeScope(raw || SCOPE_YP);

  let fcRowCount = 0;
  for (const ch of golden.chains) {
    const scope = scopeToShort(ch.feScope);
    fcSheet.addRow([
      scope,
      ch.feValue || '-',
      ch.processNo || '-',
      ch.fmValue || '-',
      ch.m4 || '-',
      ch.workElement || '-',
      ch.fcValue || '-',
      ch.pcValue || '-',
      ch.dcValue || '-',
      ch.s ?? 1,
      ch.o ?? 1,
      ch.d ?? 1,
      ch.ap || '-',
    ]);
    fcRowCount++;
  }

  // 열 너비 자동 조절
  fcSheet.columns.forEach((col) => {
    if (col) col.width = 20;
  });

  console.log(`FC 시트: ${fcRowCount}행 생성 (빈칸 0)`);

  // ── Sheet 4: FA 통합분석 — 전체 체인 기반 재생성 ──
  let faSheet = wb.getWorksheet('FA 통합분석');
  if (faSheet) {
    wb.removeWorksheet(faSheet.id);
  }
  faSheet = wb.addWorksheet('FA 통합분석');

  const faHeaders = [
    '구분(C1)', '제품기능(C2)', '요구사항(C3)',
    '공정No(A1)', '공정명(A2)', '공정기능(A3)', '제품특성(A4)', '특별특성(A4)',
    '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성(B3)',
    '고장영향(C4)', '고장형태(A5)', '고장원인(B4)',
    'S', 'O', 'D', 'AP',
    'DC추천1', 'DC추천2', 'PC추천1', 'PC추천2', 'O추천', 'D추천',
  ];
  const faHeaderRow = faSheet.addRow(faHeaders);
  faHeaderRow.font = { bold: true };
  faHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

  // L2 lookup: processNo → L2 info
  const l2Map = new Map<number, { name: string; func: string; char: string; specChar: string }>();
  for (const l2 of golden.atomicDB.l2Structures) {
    const l2f = golden.atomicDB.l2Functions.find(f => f.l2StructId === l2.id);
    const fm = golden.atomicDB.failureModes.find(m => m.l2StructId === l2.id);
    const pc = l2f?.productChars?.[0];
    l2Map.set(l2.processNo, {
      name: l2.processName,
      func: l2f?.functionName || '',
      char: pc?.charName || '',
      specChar: pc?.specialChar || '-',
    });
  }

  // L1Function → FE scope mapping
  const l1FuncMap = new Map<string, { category: string; funcName: string; requirement: string }>();
  for (const f of golden.atomicDB.l1Functions) {
    l1FuncMap.set(f.id, {
      category: f.category || SCOPE_YP,
      funcName: f.functionName || '',
      requirement: (f.requirements || [])[0] || '',
    });
  }
  // FE → L1Function
  const feToL1F = new Map<string, string>();
  for (const fe of golden.atomicDB.failureEffects) {
    feToL1F.set(fe.effect, fe.l1FuncId);
  }

  let faRowCount = 0;
  for (const ch of golden.chains) {
    const pno = parseInt(ch.processNo, 10) || 0;
    const l2Info = l2Map.get(pno) || { name: '', func: '', char: '', specChar: '-' };
    const l1FuncId = feToL1F.get(ch.feValue) || '';
    const l1Info = l1FuncMap.get(l1FuncId) || { category: ch.feScope || SCOPE_YP, funcName: '', requirement: '' };
    const scope = scopeToShort(ch.feScope);

    faSheet.addRow([
      scope,
      l1Info.funcName || '-',
      l1Info.requirement || '-',
      ch.processNo,
      l2Info.name || '-',
      l2Info.func || '-',
      l2Info.char || (ch as any).productChar || '-',
      l2Info.specChar || '-',
      ch.m4 || '-',
      ch.workElement || '-',
      (ch as any).l3Function || ch.workElement || '-',
      (ch as any).processChar || '-',
      '-',
      ch.feValue || '-',
      ch.fmValue || '-',
      ch.fcValue || '-',
      ch.s ?? 1,
      ch.o ?? 1,
      ch.d ?? 1,
      ch.ap || '-',
      ch.dcValue || '-',
      '-',
      ch.pcValue || '-',
      '-',
      ch.o ?? 1,
      ch.d ?? 1,
    ]);
    faRowCount++;
  }

  faSheet.columns.forEach((col) => {
    if (col) col.width = 18;
  });

  console.log(`FA 시트: ${faRowCount}행 생성 (빈칸 0)`);

  // 시트 순서 정리 (L1→L2→L3→FC→FA)
  // ExcelJS doesn't have reorder, but we already have the right order from original + re-added sheets

  // 3. 저장
  await wb.xlsx.writeFile(OUTPUT_PATH);
  console.log(`\n✅ 저장 완료: ${OUTPUT_PATH}`);
  console.log(`   파일 크기: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB`);

  // 4. 검증: 빈칸 확인
  console.log('\n=== 빈칸 검증 ===');
  const vwb = new ExcelJS.Workbook();
  await vwb.xlsx.readFile(OUTPUT_PATH);
  for (const ws of vwb.worksheets) {
    let blanks = 0;
    let total = 0;
    for (let r = 2; r <= ws.rowCount; r++) {
      for (let c = 1; c <= ws.columnCount; c++) {
        total++;
        const v = ws.getCell(r, c).value;
        if (v === null || v === undefined || String(v).trim() === '') blanks++;
      }
    }
    console.log(`  ${ws.name}: total=${total}, blanks=${blanks} ${blanks === 0 ? '✅' : '⚠️'}`);
  }

  console.log('\n완료!');
}

main().catch((err) => {
  console.error('에러:', err);
  process.exit(1);
});
