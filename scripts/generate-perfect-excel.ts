/**
 * @file generate-perfect-excel.ts
 * @description Atomic DB → 완벽한 14시트 Import Excel 생성 스크립트
 *
 * Usage: npx tsx scripts/generate-perfect-excel.ts [fmeaId] [port]
 * Default: fmeaId=pfm26-m066, port=3000
 *
 * 출력:
 * - data/master-fmea/{fmeaId}-import.xlsx
 * - tests/golden-import-{fmeaId}.xlsx (테스트용 복사본)
 */
import * as fs from 'fs';
import * as path from 'path';

const FMEA_ID = process.argv[2] || 'pfm26-m066';
const PORT = process.argv[3] || '3000';
const BASE_URL = `http://localhost:${PORT}`;

const OUTPUT_DIR = path.resolve(__dirname, '..', 'data', 'master-fmea');
const TESTS_DIR = path.resolve(__dirname, '..', 'tests');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `${FMEA_ID}-import.xlsx`);
const GOLDEN_FILE = path.join(TESTS_DIR, `golden-import-${FMEA_ID}.xlsx`);

interface SheetInfo {
  name: string;
  rowCount: number;
}

async function parseExcelStats(buffer: Buffer | ArrayBuffer): Promise<SheetInfo[]> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.default.Workbook();
  await wb.xlsx.load(buffer as any);

  const sheets: SheetInfo[] = [];
  wb.eachSheet((ws) => {
    const dataRows = ws.rowCount > 0 ? ws.rowCount - 1 : 0;
    sheets.push({ name: ws.name, rowCount: dataRows });
  });
  return sheets;
}

async function main() {
  console.info(`\n${'='.repeat(60)}`);
  console.info(`  Perfect Excel Generator`);
  console.info(`  fmeaId: ${FMEA_ID}`);
  console.info(`  server: ${BASE_URL}`);
  console.info(`${'='.repeat(60)}\n`);

  // 1. 서버 health check
  console.info('[1/5] 서버 연결 확인...');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/fmea/projects`, { signal: AbortSignal.timeout(10000) });
    if (!healthRes.ok) throw new Error(`Status ${healthRes.status}`);
    console.info('  ✅ 서버 연결 OK');
  } catch (err) {
    console.error(`  ❌ 서버 연결 실패 (${BASE_URL})`);
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    console.error('  → npm run dev 로 서버를 먼저 시작하세요.');
    process.exit(1);
  }

  // 2. Excel 생성 API 호출
  console.info('[2/5] Excel 생성 API 호출...');
  const url = `${BASE_URL}/api/fmea/generate-roundtrip-excel?fmeaId=${encodeURIComponent(FMEA_ID)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });

  if (!res.ok) {
    const body = await res.text();
    console.error(`  ❌ API 실패: ${res.status} ${res.statusText}`);
    console.error(`  ${body}`);
    process.exit(1);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('spreadsheetml') && !contentType.includes('octet-stream')) {
    const body = await res.text();
    console.error(`  ❌ 예상치 않은 Content-Type: ${contentType}`);
    console.error(`  ${body.substring(0, 500)}`);
    process.exit(1);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.info(`  ✅ Excel 수신: ${(buffer.length / 1024).toFixed(1)} KB`);

  // 3. 출력 디렉토리 확인 + 파일 저장
  console.info('[3/5] 파일 저장...');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.info(`  📁 디렉토리 생성: ${OUTPUT_DIR}`);
  }

  fs.writeFileSync(OUTPUT_FILE, buffer);
  console.info(`  📄 ${OUTPUT_FILE}`);

  // 4. 테스트용 골든파일 복사
  console.info('[4/5] 골든 파일 복사...');
  fs.copyFileSync(OUTPUT_FILE, GOLDEN_FILE);
  console.info(`  📄 ${GOLDEN_FILE}`);

  // 5. 시트별 통계 출력
  console.info('[5/5] 시트별 통계 분석...\n');
  const sheets = await parseExcelStats(buffer);

  const CATEGORY_MAP: Record<string, string> = {
    'A12': 'A', 'A3': 'A', 'A4': 'A', 'A5': 'A', 'A6': 'A',
    'B1': 'B', 'B2': 'B', 'B3': 'B', 'B4': 'B', 'B5': 'B',
    'C1': 'C', 'C2': 'C', 'C3': 'C', 'C4': 'C',
  };
  const SHEET_CODE_MAP: Record<string, string> = {
    'L2-1,2(A1,2) 공정번호': 'A12', 'L2-3(A3) 공정기능': 'A3', 'L2-4(A4) 제품특성': 'A4',
    'L2-5(A5) 고장형태': 'A5', 'L2-6(A6) 검출관리': 'A6',
    'L3-1(B1) 작업요소': 'B1', 'L3-2(B2) 요소기능': 'B2', 'L3-3(B3) 공정특성': 'B3',
    'L3-4(B4) 고장원인': 'B4', 'L3-5(B5) 예방관리': 'B5',
    'L1-1(C1) 구분': 'C1', 'L1-2(C2) 완제품기능': 'C2', 'L1-3(C3) 요구사항': 'C3',
    'L1-4(C4) 고장영향': 'C4',
  };

  const categoryCounts: Record<string, number> = { A: 0, B: 0, C: 0 };
  let totalRows = 0;

  console.info('┌─────────────────────────────────┬────────┬──────────┐');
  console.info('│ 시트명                           │ 코드   │ 데이터행 │');
  console.info('├─────────────────────────────────┼────────┼──────────┤');

  for (const sheet of sheets) {
    const code = SHEET_CODE_MAP[sheet.name] || sheet.name;
    const cat = CATEGORY_MAP[code] || '?';
    const paddedName = sheet.name.padEnd(30);
    const paddedCode = code.padEnd(6);
    const paddedRows = String(sheet.rowCount).padStart(6);
    console.info(`│ ${paddedName} │ ${paddedCode} │ ${paddedRows}   │`);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + sheet.rowCount;
    totalRows += sheet.rowCount;
  }

  console.info('├─────────────────────────────────┼────────┼──────────┤');
  console.info(`│ TOTAL                            │        │ ${String(totalRows).padStart(6)}   │`);
  console.info('└─────────────────────────────────┴────────┴──────────┘');

  console.info('\n카테고리별 집계:');
  console.info(`  A (구조분석):  ${categoryCounts['A'] || 0}건`);
  console.info(`  B (고장분석):  ${categoryCounts['B'] || 0}건`);
  console.info(`  C (완제품):    ${categoryCounts['C'] || 0}건`);

  console.info(`\n${'='.repeat(60)}`);
  console.info(`  ✅ 완료!`);
  console.info(`  Excel: ${OUTPUT_FILE}`);
  console.info(`  Golden: ${GOLDEN_FILE}`);
  console.info(`  크기: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.info(`  총 데이터행: ${totalRows}`);
  console.info(`${'='.repeat(60)}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 예기치 않은 오류:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
