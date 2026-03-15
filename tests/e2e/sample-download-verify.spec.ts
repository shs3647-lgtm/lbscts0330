/**
 * @file sample-download-verify.spec.ts
 * @description 샘플다운로드 엑셀 완전성 검증
 *
 * 1. Import 페이지 → 샘플Down 버튼 → 엑셀 다운로드
 * 2. 다운로드된 엑셀을 xlsx로 파싱
 * 3. 참조 엑셀(최종_PFMEA_기초정보_완성_v1.0_2.xlsx)과 시트별 비교
 * 4. 시트 수, 행 수, 셀 내용 100% 일치 검증
 */
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const FMEA_ID = 'pfm26-m010';
const IMPORT_URL = `http://localhost:3000/pfmea/import/legacy?id=${FMEA_ID}`;
const REF_PATH = 'C:/00_LB세미콘FMEA/FMEA&CP정보/최종_PFMEA_기초정보_완성_v1.0_2.xlsx';

/** 셀 값 정규화 (비교용) */
function norm(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/** FC 시트 병합셀 상속 — 병합 영역의 빈 셀을 상위 값으로 채움 */
function inheritFCMergeCells(rows: string[][]): void {
  const mergeCols = [0, 1, 2, 3]; // FE구분, FE, 공정번호, FM
  for (let r = 2; r < rows.length; r++) { // row 0=header, row 1=first data
    for (const c of mergeCols) {
      if (norm(rows[r]?.[c]) === '' && rows[r - 1]) {
        if (!rows[r]) rows[r] = [];
        rows[r][c] = rows[r - 1][c];
      }
    }
  }
}

test.describe('샘플다운로드 완전성 검증', () => {

  test('샘플Down → 참조 엑셀과 20개 시트 100% 일치', async ({ page }) => {
    test.setTimeout(120000);

    // ── 1. 참조 엑셀 로드 ──
    const refWb = XLSX.readFile(REF_PATH);
    const refData: Record<string, string[][]> = {};
    for (const name of refWb.SheetNames) {
      if (name === 'VERIFY') continue;
      const rows = XLSX.utils.sheet_to_json(refWb.Sheets[name], { header: 1, defval: '' }) as string[][];
      if (name === 'FC 고장사슬') inheritFCMergeCells(rows);
      refData[name] = rows;
    }
    console.log(`참조 엑셀: ${Object.keys(refData).length}개 시트 로드`);

    // ── 2. Import 페이지 → 샘플Down ──
    await page.goto(IMPORT_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // dialog 자동 승인
    page.on('dialog', async d => await d.accept());

    const sampleBtn = page.locator('button:has-text("샘플Down"), button:has-text("샘플")').first();
    await sampleBtn.waitFor({ state: 'visible', timeout: 15000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      sampleBtn.click(),
    ]);

    const dlPath = path.join('tests', 'temp-sample-verify.xlsx');
    await download.saveAs(dlPath);
    console.log(`샘플 다운로드 완료: ${dlPath}`);

    // ── 3. 다운로드된 엑셀 파싱 ──
    const dlWb = XLSX.readFile(dlPath);
    const dlData: Record<string, string[][]> = {};
    for (const name of dlWb.SheetNames) {
      if (name === 'VERIFY') continue;
      const rows = XLSX.utils.sheet_to_json(dlWb.Sheets[name], { header: 1, defval: '' }) as string[][];
      if (name === 'FC 고장사슬') inheritFCMergeCells(rows);
      dlData[name] = rows;
    }
    console.log(`다운로드 엑셀: ${Object.keys(dlData).length}개 시트`);

    // ── 4. 시트별 비교 ──
    const results: {
      sheet: string;
      refRows: number;
      dlRows: number;
      rowMatch: boolean;
      cellMismatches: number;
      details: string[];
    }[] = [];

    // 비교 대상 시트 (VERIFY, FA 통합분석 제외 — FA는 시스템 자동생성 가능)
    const compareSheets = [
      'L2-1(A1) 공정번호', 'L2-2(A2) 공정명', 'L2-3(A3) 공정기능',
      'L2-4(A4) 제품특성', 'L2-5(A5) 고장형태', 'L2-6(A6) 검출관리',
      'L3-1(B1) 작업요소', 'L3-2(B2) 요소기능', 'L3-3(B3) 공정특성',
      'L3-4(B4) 고장원인', 'L3-5(B5) 예방관리',
      'L1-1(C1) 구분', 'L1-2(C2) 제품기능', 'L1-3(C3) 요구사항', 'L1-4(C4) 고장영향',
      'L1 통합(C1-C4)', 'L2 통합(A1-A6)', 'L3 통합(B1-B5)',
      'FC 고장사슬', 'FA 통합분석',
    ];

    for (const sheetName of compareSheets) {
      const refRows = refData[sheetName] || [];
      const dlRows = dlData[sheetName] || [];

      // Skip header row for data comparison (row 0 = header)
      const refDataRows = refRows.slice(1).filter(r => r.some(c => norm(c) !== ''));
      const dlDataRows = dlRows.slice(1).filter(r => r.some(c => norm(c) !== ''));

      const details: string[] = [];
      let cellMismatches = 0;

      // Row count check
      const rowMatch = refDataRows.length === dlDataRows.length;
      if (!rowMatch) {
        details.push(`행수 불일치: 참조=${refDataRows.length}, 다운로드=${dlDataRows.length}`);
      }

      // Cell-by-cell comparison (up to min rows)
      const minRows = Math.min(refDataRows.length, dlDataRows.length);
      for (let r = 0; r < minRows; r++) {
        const refRow = refDataRows[r];
        const dlRow = dlDataRows[r];
        const maxCols = Math.max(refRow.length, dlRow.length);
        for (let c = 0; c < maxCols; c++) {
          const rv = norm(refRow[c]);
          const dv = norm(dlRow[c]);
          if (rv !== dv) {
            cellMismatches++;
            if (details.length < 5) {
              details.push(`[행${r+1},열${c+1}] 참조="${rv.slice(0,30)}" ≠ 다운="${dv.slice(0,30)}"`);
            }
          }
        }
      }

      results.push({
        sheet: sheetName,
        refRows: refDataRows.length,
        dlRows: dlDataRows.length,
        rowMatch,
        cellMismatches,
        details,
      });

      const status = rowMatch && cellMismatches === 0 ? '✅' : '❌';
      console.log(`${status} ${sheetName}: 참조=${refDataRows.length}행, 다운=${dlDataRows.length}행, 불일치=${cellMismatches}셀`);
      for (const d of details) {
        console.log(`    ${d}`);
      }
    }

    // ── 5. 결과 요약 ──
    console.log('\n════════════════════════════════════════');
    console.log('  샘플다운로드 검증 결과');
    console.log('════════════════════════════════════════');

    let passCount = 0;
    let totalMismatches = 0;
    for (const r of results) {
      const ok = r.rowMatch && r.cellMismatches === 0;
      if (ok) passCount++;
      totalMismatches += r.cellMismatches;
      console.log(`  ${ok ? '✅' : '❌'} ${r.sheet.padEnd(25)} ${String(r.dlRows).padStart(3)}/${String(r.refRows).padStart(3)}행  불일치=${r.cellMismatches}`);
    }
    console.log('────────────────────────────────────────');
    console.log(`  통과: ${passCount}/${results.length}, 총 불일치 셀: ${totalMismatches}`);
    console.log('════════════════════════════════════════');

    // ── 6. 단언 ──
    // 모든 시트 행수 일치
    for (const r of results) {
      expect(r.rowMatch, `[${r.sheet}] 행수 일치 필요 (참조=${r.refRows}, 다운=${r.dlRows})`).toBe(true);
    }

    // 셀 불일치 0
    expect(totalMismatches, `총 셀 불일치 0 필요 (현재=${totalMismatches})`).toBe(0);

    console.log('\n✅ 샘플다운로드 20개 시트 100% 검증 완료');
  });
});
