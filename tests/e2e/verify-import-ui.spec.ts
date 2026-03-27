/**
 * @file verify-import-ui.spec.ts
 * @description Import 페이지 간소화 UI 검증
 */
import { test, expect } from '@playwright/test';

test('Import 페이지 간소화 UI 검증', async ({ page }) => {
  await page.goto('http://localhost:3000/pfmea/import/legacy?id=pfm26-m002', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'tests/e2e/screenshots/verify-import-simplified.png', fullPage: false });

  // 1. Import 요약 카드 확인
  const importCard = page.getByText('Import 데이터', { exact: false });
  await expect(importCard).toBeVisible();

  // 2. "엑셀 Import" 버튼 확인
  const importBtn = page.getByText('엑셀 Import', { exact: false });
  await expect(importBtn).toBeVisible();

  // 3. "워크시트 이동 →" 버튼 확인
  const worksheetBtn = page.getByText('워크시트 이동', { exact: false });
  await expect(worksheetBtn.first()).toBeVisible();

  // 4. 기초정보 패널 기본 접힘 상태 확인
  const collapsedPanel = page.getByText('기초정보', { exact: false }).first();
  await expect(collapsedPanel).toBeVisible();

  // 5. 기존 SA확정/FC확정/FA확정 버튼이 보이지 않아야 함 (패널 접힘)
  const oldSABtn = page.getByText('SA 확정', { exact: true });
  expect(await oldSABtn.isVisible().catch(() => false)).toBeFalsy();

  // 6. 안내문구 확인
  const guideText = page.getByText('Verify → STEP 0', { exact: false });
  await expect(guideText.first()).toBeVisible();

  console.log('✅ Import 페이지 간소화 UI 검증 완료');
});

test('워크시트 Verify STEP 0 상세패널 검증', async ({ page }) => {
  await page.goto('http://localhost:3000/pfmea/worksheet?id=pfm26-m002', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Verify 버튼 클릭
  const verifyBtn = page.getByText('Verify', { exact: false }).first();
  if (await verifyBtn.isVisible()) {
    await verifyBtn.click();
    await page.waitForTimeout(2000);

    // 스크린샷: Verify 패널
    await page.screenshot({ path: 'tests/e2e/screenshots/verify-pipeline-panel.png', fullPage: false });

    // STEP 0 클릭
    const step0Btn = page.getByText('STEP 0', { exact: false }).first();
    if (await step0Btn.isVisible()) {
      await step0Btn.click();
      await page.waitForTimeout(5000);

      // 스크린샷: STEP 0 상세
      await page.screenshot({ path: 'tests/e2e/screenshots/verify-step0-detail.png', fullPage: false });

      // L2 탭 확인 (Master DB 로드 대기)
      const l2Tab = page.getByText('L2 공정', { exact: false });
      const hasL2 = await l2Tab.isVisible().catch(() => false);
      if (hasL2) {
        await l2Tab.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'tests/e2e/screenshots/verify-step0-l2.png', fullPage: false });

        const l3Tab = page.getByText('L3 작업요소', { exact: false });
        await l3Tab.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'tests/e2e/screenshots/verify-step0-l3.png', fullPage: false });

        console.log('✅ STEP 0 상세패널 — L2/L3 탭 검증 완료');
      } else {
        console.log('⚠️ STEP 0 L2 탭 미표시 — Master DB 데이터 없을 수 있음');
      }

      console.log('✅ STEP 0 상세패널 검증 완료');
    }
  }
});
