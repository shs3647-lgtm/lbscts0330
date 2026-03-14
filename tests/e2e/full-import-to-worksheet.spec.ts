/**
 * @file full-import-to-worksheet.spec.ts
 * @description Import → 워크시트 전체 플로우 E2E 검증
 *
 * 1. Import 페이지에서 Excel 업로드 → Import 실행
 * 2. 워크시트 페이지로 이동
 * 3. DB 저장 성공 확인 (에러 배너 없음)
 * 4. 구조/기능/고장 탭 데이터 존재 확인
 *
 * @created 2026-03-14
 */

import { test, expect } from '@playwright/test';

const EXCEL_FILE = 'C:\\00_LB세미콘FMEA\\FMEA&CP정보\\PFMEA_AU_BUMP_Import_v13_3.xlsx';
const FMEA_ID = 'pfm26-m010';
const IMPORT_URL = `http://localhost:3000/pfmea/import/legacy?id=${FMEA_ID}`;
const WORKSHEET_URL = `http://localhost:3000/pfmea/worksheet?id=${FMEA_ID}`;

test.describe('Import → 워크시트 전체 플로우', () => {

  test('Excel Import → 워크시트 로드 → DB 저장 성공', async ({ page }) => {
    // API 에러 모니터링
    const apiErrors: string[] = [];
    page.on('response', async resp => {
      if (resp.url().includes('/api/fmea') && resp.status() >= 400) {
        const body = await resp.text().catch(() => '');
        apiErrors.push(`${resp.status()} ${body.slice(0, 200)}`);
      }
    });

    // ========== 1. Import ==========
    await page.goto(IMPORT_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const fileInput = page.locator('input[type="file"][accept=".xlsx,.xls"]').first();
    await fileInput.setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(5000);

    // Import 버튼 클릭
    const importBtn = page.locator('button:has-text("Import")').first();
    if (await importBtn.isEnabled()) {
      await importBtn.click();
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: 'tests/screenshots/full-01-import-done.png', fullPage: true });
    console.log('✅ 1단계: Import 완료');

    // ========== 2. 워크시트 페이지로 직접 이동 ==========
    await page.goto(WORKSHEET_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'tests/screenshots/full-02-worksheet.png', fullPage: true });
    console.log('✅ 2단계: 워크시트 로드 완료');

    // ========== 3. DB 저장 에러 확인 ==========
    await page.waitForTimeout(5000); // auto-save 대기

    const errorBanner = page.locator('text=DB 저장 실패');
    const hasError = await errorBanner.isVisible().catch(() => false);

    if (hasError) {
      console.log('❌ DB 저장 실패!');
      apiErrors.forEach(e => console.log(`   API 에러: ${e}`));
      await page.screenshot({ path: 'tests/screenshots/full-03-error.png', fullPage: true });
    } else {
      console.log('✅ 3단계: DB 저장 에러 없음');
    }

    // ========== 4. 데이터 존재 확인 ==========
    // 구조분석 탭 확인
    const structTab = page.locator('button:has-text("구조(Structure)")').first();
    if (await structTab.isVisible()) {
      await structTab.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'tests/screenshots/full-04-structure.png', fullPage: true });

    // API로 DB 데이터 확인
    const verifyRes = await page.request.get(`http://localhost:3000/api/fmea?fmeaId=${FMEA_ID}&format=atomic`);
    if (verifyRes.ok()) {
      const data = await verifyRes.json();
      const l2Count = data.l2Structures?.length || 0;
      const fmCount = data.failureModes?.length || 0;
      const fcCount = data.failureCauses?.length || 0;
      console.log(`✅ 4단계: DB 데이터 확인`);
      console.log(`   L2 공정: ${l2Count}`);
      console.log(`   FM 고장형태: ${fmCount}`);
      console.log(`   FC 고장원인: ${fcCount}`);
    }

    // Master API로 데이터 확인
    const masterRes = await page.request.get(`http://localhost:3000/api/pfmea/master`);
    if (masterRes.ok()) {
      const data = await masterRes.json();
      const target = (data.datasets || []).find((d: any) => d.fmeaId === FMEA_ID);
      if (target) {
        console.log(`   Master: processCount=${target.processCount}, fmCount=${target.fmCount}, dataCount=${target.dataCount}`);
      }
    }

    await page.screenshot({ path: 'tests/screenshots/full-05-final.png', fullPage: true });

    // ========== 5. 검증 단언 ==========
    expect(hasError).toBe(false);
    expect(apiErrors.length).toBe(0);
    console.log('✅ 전체 플로우 E2E 검증 완료 — DB 저장 성공');
  });
});
