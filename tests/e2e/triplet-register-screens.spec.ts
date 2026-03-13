/**
 * @file triplet-register-screens.spec.ts
 * @description PFMEA/CP/PFD 등록화면 + Triplet API E2E 검증
 */

import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded');

  const loginInput = page.locator('#login-id');
  const isLoginPage = await loginInput.isVisible({ timeout: 3000 }).catch(() => false);

  if (!isLoginPage) return;

  await loginInput.click();
  await loginInput.fill('');
  await loginInput.fill('admin');

  const pwdInput = page.locator('#login-password');
  await pwdInput.click();
  await pwdInput.fill('');
  await pwdInput.fill('1234');

  await page.locator('button[type="submit"]').click();

  await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 15000 });
  await page.waitForTimeout(1000);
}

test.describe('PFMEA 등록화면', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('1. PFMEA 등록화면 로드 성공', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('domcontentloaded');

    const title = page.locator('h1:has-text("PFMEA")');
    await expect(title).toBeVisible({ timeout: 15000 });

    const saveBtn = page.locator('button:has-text("저장")').first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
  });

  test('2. PFMEA 유형 선택 (M/F/P)', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const typeSelect = page.locator('select').first();
    await expect(typeSelect).toBeVisible({ timeout: 10000 });

    const options = await typeSelect.locator('option').allTextContents();
    const hasM = options.some(o => /master|M/i.test(o));
    const hasF = options.some(o => /family|F/i.test(o));
    const hasP = options.some(o => /part|P/i.test(o));
    expect(hasM || hasF || hasP).toBe(true);
  });

  test('3. PFMEA명 입력 필드 존재 + 입력', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const nameInput = page.locator('input[placeholder*="시스템"]').first();
    if (await nameInput.count() > 0) {
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      await nameInput.fill('Playwright 테스트 FMEA');
      expect(await nameInput.inputValue()).toBe('Playwright 테스트 FMEA');
    } else {
      const fallback = page.locator('table input[type="text"]').first();
      await expect(fallback).toBeVisible({ timeout: 10000 });
    }
  });

  test('4. 새로 작성 버튼 → CreateDocumentModal', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const createBtn = page.locator('button:has-text("새로 작성")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(1000);

    const modal = page.locator('text=새 문서 생성');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('5. FMEA명 목록 API 자동 호출', async ({ page }) => {
    let apiCalled = false;
    page.on('response', r => {
      if (r.url().includes('/api/fmea/projects') && r.status() === 200) apiCalled = true;
    });

    await page.goto('/pfmea/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    expect(apiCalled).toBe(true);
  });
});

test.describe('CP 등록화면', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('1. CP 등록화면 로드 성공', async ({ page }) => {
    await page.goto('/control-plan/register');
    await page.waitForLoadState('domcontentloaded');

    const title = page.locator('h1:has-text("Control Plan")');
    await expect(title).toBeVisible({ timeout: 15000 });

    const saveBtn = page.locator('button:has-text("저장")').first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
  });

  test('2. CP 유형 선택', async ({ page }) => {
    await page.goto('/control-plan/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const typeSelect = page.locator('select').first();
    await expect(typeSelect).toBeVisible({ timeout: 10000 });

    const options = await typeSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(1);
  });

  test('3. CP 새로 작성 → CreateDocumentModal', async ({ page }) => {
    await page.goto('/control-plan/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const createBtn = page.locator('button:has-text("새로 작성"), button:has-text("Create")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(1000);

    const modal = page.locator('text=새 문서 생성');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });
});

test.describe('PFD 등록화면', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('1. PFD 등록화면 로드 성공', async ({ page }) => {
    await page.goto('/pfd/register');
    await page.waitForLoadState('domcontentloaded');

    const title = page.locator('h1:has-text("PFD")');
    await expect(title).toBeVisible({ timeout: 15000 });

    const saveBtn = page.locator('button:has-text("저장")').first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
  });

  test('2. PFD 유형 선택', async ({ page }) => {
    await page.goto('/pfd/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const typeSelect = page.locator('select').first();
    await expect(typeSelect).toBeVisible({ timeout: 10000 });

    const options = await typeSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(1);
  });

  test('3. PFD 새로 작성 → CreateDocumentModal', async ({ page }) => {
    await page.goto('/pfd/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const createBtn = page.locator('button:has-text("새로 작성"), button:has-text("Create")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(1000);

    const modal = page.locator('text=새 문서 생성');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Triplet API 검증', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('1. Triplet 목록 API 응답', async ({ page }) => {
    const res = await page.request.get('/api/triplet/list');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.triplets)).toBe(true);
  });

  test('2. FMEA 프로젝트 목록 API 응답', async ({ page }) => {
    const res = await page.request.get('/api/fmea/projects');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.projects)).toBe(true);
  });

  test('3. Triplet 생성 API 유효성 (빈 body → 400)', async ({ page }) => {
    const res = await page.request.post('/api/triplet/create', { data: {} });
    expect(res.status()).toBe(400);
  });
});
