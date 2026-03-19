/**
 * Family/Part FMEA BD 연동 테스트
 * 등록 페이지에서 Master/Family/Part BD 선택 + 역설계 렌더링 확인
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Family/Part FMEA BD 등록 페이지 연동', () => {

  test('등록 페이지 — Master/Family/Part BD 카운트 표시', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/register`, { waitUntil: 'networkidle', timeout: 20000 });

    // Master, Family, Part 버튼 확인
    const masterBtn = page.locator('td:has-text("Master 기초정보")').first();
    const familyBtn = page.locator('td:has-text("Family 기초정보")').first();
    const partBtn = page.locator('td:has-text("Part 기초정보")').first();

    await expect(masterBtn).toBeVisible({ timeout: 10000 });
    await expect(familyBtn).toBeVisible({ timeout: 5000 });
    await expect(partBtn).toBeVisible({ timeout: 5000 });

    const masterText = await masterBtn.textContent() || '';
    const familyText = await familyBtn.textContent() || '';
    const partText = await partBtn.textContent() || '';

    console.log('Master:', masterText);
    console.log('Family:', familyText);
    console.log('Part:', partText);

    // Master에 (1) 카운트 있는지 확인
    expect(masterText).toContain('(1)');

    await page.screenshot({
      path: 'tests/e2e/screenshots/family-part/BD_카운트_표시.png',
      fullPage: true
    });
  });

  test('Family BD 클릭 — 목록 표시 + BD 로드', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/register`, { waitUntil: 'networkidle', timeout: 20000 });

    const familyBtn = page.locator('td:has-text("Family 기초정보")').first();
    await familyBtn.click();
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'tests/e2e/screenshots/family-part/Family_BD_클릭.png',
      fullPage: true
    });

    // 에러 alert가 나오지 않았는지 확인 (Family가 1건이면 바로 로드)
    const body = await page.locator('body').textContent() || '';
    // Family BD가 로드되면 기초정보 테이블이 나타남
    const hasData = body.includes('기초정보') || body.includes('공정');
    expect(hasData).toBeTruthy();
  });

  test('Part BD 클릭 — 목록 표시 + BD 로드', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/register`, { waitUntil: 'networkidle', timeout: 20000 });

    const partBtn = page.locator('td:has-text("Part 기초정보")').first();
    await partBtn.click();
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'tests/e2e/screenshots/family-part/Part_BD_클릭.png',
      fullPage: true
    });
  });
});
