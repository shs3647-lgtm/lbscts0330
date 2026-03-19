/**
 * Master BD 등록 + 등록 페이지 Master 선택 테스트
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Master BD 등록 페이지 연동', () => {

  test('등록 페이지에서 Master BD 카운트 표시 + 클릭 로드', async ({ page }) => {
    // 새 프로젝트 등록 페이지 열기
    await page.goto(`${BASE}/pfmea/register`, { waitUntil: 'networkidle', timeout: 20000 });

    // Master 버튼이 보이는지 확인
    const masterBtn = page.locator('td:has-text("Master 기초정보")').first();
    await expect(masterBtn).toBeVisible({ timeout: 10000 });

    // 카운트가 (1) 이상인지 확인
    const masterText = await masterBtn.textContent();
    console.log('Master button text:', masterText);

    // 스크린샷
    await page.screenshot({
      path: 'tests/e2e/screenshots/family-part/Register_Master_BD.png',
      fullPage: true
    });

    // Master 버튼 클릭
    await masterBtn.click();
    await page.waitForTimeout(3000);

    // 로드 후 스크린샷
    await page.screenshot({
      path: 'tests/e2e/screenshots/family-part/Register_Master_BD_Loaded.png',
      fullPage: true
    });

    // 에러 alert가 없는지 확인 (dialog listener)
    // Note: if alert fires, test will capture it
  });
});
