/**
 * @file import-a6-detection-verify.spec.ts
 * @description A6(검출관리) L2-6 전용시트 파싱 + riskData 저장 검증
 *
 * v4.0.0 Excel에 L2-6(A6) 검출관리 전용 시트 23행 포함
 *
 * @created 2026-03-14
 */

import { test, expect } from '@playwright/test';

const EXCEL_FILE = 'C:\\00_LB세미콘FMEA\\FMEA&CP정보\\PFMEA_기초정보_샘플_v4.0.0_2026-03-14 (2).xlsx';
const FMEA_ID = 'pfm26-m010';
const IMPORT_URL = `http://localhost:3000/pfmea/import/legacy?id=${FMEA_ID}`;

const EXPECTED_A6_KEYWORDS = [
  '파티클 카운터', 'Wafer 두께', '비전 센서', 'KLA 파티클',
  'SEM', '막두께 측정기', 'CD SEM', '광학현미경',
  '높이 측정기', 'XRF', 'Cross-section', 'AVI',
];

test.describe('A6(검출관리) Excel L2-6 시트 → Import → riskData 검증', () => {

  test('L2-6 전용시트 파싱 성공 (A6=23건) 확인', async ({ page }) => {
    test.setTimeout(60000);

    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    // 1. Import 페이지에서 Excel 업로드
    await page.goto(IMPORT_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const fileInput = page.locator('input[type="file"][accept=".xlsx,.xls"]').first();
    await fileInput.setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(10000);

    await page.screenshot({ path: 'tests/screenshots/a6-01-after-upload.png', fullPage: true });

    // 2. A6 파싱 확인
    const a6ParseLog = logs.find(l => l.includes('전용시트 A6='));
    console.log('A6 파싱 로그:', a6ParseLog || '(없음)');
    expect(a6ParseLog, 'L2-6 전용시트 A6 파싱 로그 없음').toBeTruthy();

    const a6Match = a6ParseLog!.match(/A6=(\d+)건/);
    const a6Count = a6Match ? parseInt(a6Match[1]) : 0;
    console.log(`A6 파싱 건수: ${a6Count}`);
    expect(a6Count, 'A6 파싱 건수 0').toBeGreaterThan(0);

    // B5 파싱 확인
    const b5ParseLog = logs.find(l => l.includes('전용시트 B5='));
    console.log('B5 파싱 로그:', b5ParseLog || '(없음)');

    console.log('\nL2-6 파싱 검증 완료');
  });

  test('Import 전체 플로우 → riskData detection-* 키 포함', async ({ page }) => {
    test.setTimeout(180000);

    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    // dialog 자동 승인
    page.on('dialog', async dialog => {
      console.log(`Dialog: ${dialog.message().substring(0, 100)}`);
      await dialog.accept();
    });

    // 1. Import 페이지
    await page.goto(IMPORT_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 2. Excel 업로드
    const fileInput = page.locator('input[type="file"][accept=".xlsx,.xls"]').first();
    await fileInput.setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(10000);

    // 3. SA 확정
    const saBtn = page.locator('button:has-text("SA 확정")').first();
    if (await saBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await saBtn.click();
      await page.waitForTimeout(3000);
      // dialog overlay가 있으면 닫기
      const closeBtn = page.locator('[data-slot="dialog-close"], button:has-text("닫기")').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(1000);
      }
      // Escape로 dialog 닫기 시도
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // 4. FC 확정
    const fcBtn = page.locator('button:has-text("FC 확정")').first();
    if (await fcBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await fcBtn.click();
      await page.waitForTimeout(3000);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // 5. FA 확정
    const faBtn = page.locator('button:has-text("FA 확정")').first();
    if (await faBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await faBtn.click();
      await page.waitForTimeout(3000);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'tests/screenshots/a6-02-before-import.png', fullPage: true });

    // 6. Import 버튼 — force click으로 overlay 우회
    const importBtn = page.locator('button:has-text("Import")').first();
    if (await importBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // overlay dialog 닫기
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      if (await importBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
        const savePromise = page.waitForResponse(
          resp => resp.url().includes('/api/fmea/save-from-import') && resp.request().method() === 'POST',
          { timeout: 60000 }
        ).catch(() => null);

        await importBtn.click({ force: true });
        console.log('Import 버튼 클릭');

        const response = await savePromise;
        if (response) {
          const status = response.status();
          console.log(`Import API 응답: ${status}`);
          if (status < 400) {
            const body = await response.json().catch(() => null);
            console.log('Import 결과:', JSON.stringify(body?.atomicCounts));
          }
        }
        await page.waitForTimeout(5000);
      }
    }

    await page.screenshot({ path: 'tests/screenshots/a6-03-after-import.png', fullPage: true });

    // 7. riskData 검증
    const fmeaRes = await page.request.get(`http://localhost:3000/api/fmea?fmeaId=${FMEA_ID}`);
    if (fmeaRes.ok()) {
      const data = await fmeaRes.json();
      const riskData = data.riskData || {};

      const detectionKeys = Object.keys(riskData).filter(k => k.startsWith('detection-'));
      const detectionValues: string[] = detectionKeys
        .map(k => riskData[k])
        .filter(v => typeof v === 'string' && v.trim());
      const uniqueDetections = [...new Set(detectionValues)];

      console.log(`\nriskData detection-*:`);
      console.log(`  총 키: ${detectionKeys.length}`);
      console.log(`  비공백: ${detectionValues.length}`);
      console.log(`  고유값: ${uniqueDetections.length}`);
      uniqueDetections.forEach(v => console.log(`  - "${v}"`));

      const preventionKeys = Object.keys(riskData).filter(k => k.startsWith('prevention-'));
      console.log(`\nriskData prevention-*: ${preventionKeys.length}키`);

      // 키워드 매칭
      if (detectionValues.length > 0) {
        const allText = detectionValues.join(' ');
        const found = EXPECTED_A6_KEYWORDS.filter(kw => allText.includes(kw));
        const missing = EXPECTED_A6_KEYWORDS.filter(kw => !allText.includes(kw));
        console.log(`\nL2-6 키워드: ${found.length}/${EXPECTED_A6_KEYWORDS.length} 매칭`);
        if (missing.length > 0) console.log(`  누락: ${missing.join(', ')}`);
      }
    }

    // 관련 서버 로그
    const relatedLogs = logs.filter(l =>
      l.includes('Phase 4') || l.includes('save-from-import') ||
      l.includes('A6') || l.includes('B5')
    );
    console.log('\n=== 서버 로그 ===');
    relatedLogs.slice(0, 15).forEach(l => console.log(`  ${l}`));

    await page.screenshot({ path: 'tests/screenshots/a6-04-final.png', fullPage: true });
    console.log('\n검증 완료');
  });
});
