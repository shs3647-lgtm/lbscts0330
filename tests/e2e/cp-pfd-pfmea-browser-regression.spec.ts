import { test, expect, type APIRequestContext, type Dialog, type Page } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const PFMEA_ID = process.env.TEST_FMEA_ID || 'pfm26-f001-l68-r00';
const CP_NO = process.env.TEST_CP_NO || 'cp26-f001-l68-01';

async function autoAcceptDialogs(page: Page, messages: string[]) {
  page.on('dialog', async (dialog: Dialog) => {
    messages.push(`${dialog.type()}: ${dialog.message()}`);
    await dialog.accept();
  });
}

async function resolveLinkedCpNo(request: APIRequestContext) {
  const response = await request.get(`${BASE_URL}/api/pfmea/${PFMEA_ID}`);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload?.data?.linkedCpNo || CP_NO;
}

async function openCpSyncWizard(page: Page, linkedCpNo: string) {
  await page.goto(`${BASE_URL}/pfmea/worksheet?id=${PFMEA_ID}`, {
    waitUntil: 'networkidle',
    timeout: 120000,
  });

  expect(linkedCpNo).toBeTruthy();
  await page.getByTestId('cp-sync-button').click();
  await page.getByRole('button', { name: /CP 생성/ }).click();
  await expect(page.getByRole('heading', { name: 'FMEA→CP' })).toBeVisible();
}

test.describe('CP / PFD / PFMEA browser regressions', () => {
  test.describe.configure({ mode: 'serial' });

  test('BUG-4: CP 위자드 탭 클릭 시 선택 상태와 테이블 내용이 변경되어야 함', async ({ page, request }) => {
    const dialogs: string[] = [];
    const linkedCpNo = await resolveLinkedCpNo(request);
    await autoAcceptDialogs(page, dialogs);
    await openCpSyncWizard(page, linkedCpNo);

    await expect(page.locator('text=2단계:')).toBeVisible();
    await expect(page.locator('th', { hasText: '설비/금형/지그' })).toBeVisible();

    await page.getByRole('button', { name: /3\.제품특성 연동/ }).click();
    await expect(page.locator('text=3단계:')).toBeVisible();
    await expect(page.locator('th', { hasText: '제품특성' })).toBeVisible();
    await expect(page.locator('th', { hasText: '설비/금형/지그' })).toHaveCount(0);

    await page.getByRole('button', { name: /4\.공정특성 연동/ }).click();
    await expect(page.locator('text=4단계:')).toBeVisible();
    await expect(page.locator('th', { hasText: '공정특성' })).toBeVisible();

    await page.getByRole('button', { name: /5\.특별특성 연동/ }).click();
    await expect(page.locator('text=5단계:')).toBeVisible();
    await expect(page.locator('th', { hasText: 'SC' })).toBeVisible();

    expect(dialogs.filter(msg => msg.includes('오류'))).toEqual([]);
  });

  test('BUG-1: PFMEA→CP 전체연동이 equipmentM4 Prisma 오류 없이 성공해야 함', async ({ page, request }) => {
    const dialogs: string[] = [];
    const linkedCpNo = await resolveLinkedCpNo(request);
    await autoAcceptDialogs(page, dialogs);
    await openCpSyncWizard(page, linkedCpNo);

    const responsePromise = page.waitForResponse(
      res => res.url().includes('/api/pfmea/sync-to-cp/all') && res.request().method() === 'POST',
      { timeout: 120000 }
    );

    await page.getByRole('button', { name: '전체연동' }).click();
    const response = await responsePromise;
    const payload = await response.json();

    expect(response.status()).toBe(200);
    expect(payload.success).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("Unknown argument 'equipmentM4'");
    expect(dialogs.some(msg => msg.includes('equipmentM4'))).toBe(false);
    await expect(page.locator('text=연동완료')).toBeVisible({ timeout: 120000 });
  });

  test('BUG-3: PFMEA→PFD 생성이 405 없이 성공해야 함', async ({ page }) => {
    const dialogs: string[] = [];
    await autoAcceptDialogs(page, dialogs);

    await page.goto(`${BASE_URL}/pfmea/worksheet?id=${PFMEA_ID}`, {
      waitUntil: 'networkidle',
      timeout: 120000,
    });

    const responsePromise = page.waitForResponse(
      res => res.url().includes('/api/pfmea/create-pfd') && res.request().method() === 'POST',
      { timeout: 120000 }
    );

    await page.locator('button[title*="현재 FMEA 데이터로 PFD 생성"]').click();
    const response = await responsePromise;
    const payload = await response.json();

    expect(response.status()).toBe(200);
    expect(payload.success).toBe(true);
    expect(dialogs.some(msg => msg.includes('405'))).toBe(false);
    expect(dialogs.some(msg => msg.includes('Method Not Allowed'))).toBe(false);
    await page.waitForURL(/\/pfd\/worksheet\?/, { timeout: 120000 });
  });

  test('BUG-2: CP→PFMEA 연동 API가 equipmentM4 오류 없이 성공해야 함', async ({ request }) => {
    const linkedCpNo = await resolveLinkedCpNo(request);
    const response = await request.post(`${BASE_URL}/api/pfmea/sync-from-cp`, {
      data: {
        cpNo: linkedCpNo,
        fmeaId: PFMEA_ID,
      },
    });
    const payload = await response.json();

    expect(response.status()).toBe(200);
    expect(payload.success).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("Unknown argument 'equipmentM4'");
  });
});
