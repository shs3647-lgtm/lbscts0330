/**
 * UserSelectModal + Master User CRUD 전체 기능 테스트
 */
import { test, expect, type Page, type Dialog } from '@playwright/test';

const BASE = 'http://localhost:3000';

async function waitForStable(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// ============================================================
// Part 1: Users API 직접 테스트
// ============================================================
test.describe('Users API Direct', () => {
  test('POST → DELETE → 확인', async ({ request }) => {
    const ts = Date.now();
    const createRes = await request.post(`${BASE}/api/users`, {
      data: {
        factory: 'API공장', department: 'API부서',
        name: `API_${ts}`, position: '테스트',
        email: `api_${ts}@test.com`,
      },
    });
    const { user } = await createRes.json();
    expect(user.id).toBeTruthy();

    const delRes = await request.delete(`${BASE}/api/users?id=${user.id}`);
    expect((await delRes.json()).success).toBeTruthy();

    const list = await (await request.get(`${BASE}/api/users`)).json();
    expect(list.users.find((u: any) => u.id === user.id)).toBeUndefined();
  });
});

// ============================================================
// Part 2: Master User Page — 추가→저장→삭제
// ============================================================
test.describe('Master User Page CRUD', () => {
  test('추가 → 저장 → 삭제 전체 흐름', async ({ page }) => {
    const ts = Date.now();
    const testName = `PW삭제_${ts}`;

    // 콘솔 로그 수집
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        const text = `[${msg.type()}] ${msg.text()}`;
        consoleLogs.push(text);
        if (text.includes('user-db') || text.includes('UserMaster') || text.includes('deleteUser')) {
          console.log(`  [BROWSER] ${text}`);
        }
      }
    });

    // dialog 핸들러
    const dialogs: { type: string; message: string }[] = [];
    page.on('dialog', async (dialog: Dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      console.log(`  [DIALOG] ${dialog.type()}: ${dialog.message().slice(0, 80)}`);
      await dialog.accept();
    });

    await page.goto(`${BASE}/master/user`, { waitUntil: 'networkidle' });
    await waitForStable(page);

    // --- 1. 추가 ---
    await page.click('button:has-text("추가")');
    await page.waitForTimeout(500);
    await expect(page.locator('.bg-blue-50')).toBeVisible({ timeout: 3000 });

    // --- 2. 필드 입력 ---
    await page.locator('input[placeholder="홍길동"]').fill(testName);
    await page.locator('input[placeholder="울산공장"]').fill('PW공장');
    await page.locator('input[placeholder="품질보증팀"]').fill('PW부서');
    await page.locator('input[placeholder="과장"]').fill('사원');
    await page.locator('input[placeholder="user@example.com"]').fill(`pw_${ts}@test.com`);

    // --- 3. 저장 ---
    await page.locator('.bg-blue-50 button:has-text("저장")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // --- 4. 저장 확인 ---
    const cell = page.locator(`td:has-text("${testName}")`);
    await expect(cell.first()).toBeVisible({ timeout: 5000 });
    console.log(`  [TEST] ✓ Saved "${testName}"`);

    // --- 5. API에서 ID 확인 ---
    const listBefore = await page.request.get(`${BASE}/api/users`);
    const before = await listBefore.json();
    const targetUser = before.users.find((u: any) => u.name === testName);
    expect(targetUser).toBeTruthy();
    console.log(`  [TEST] ✓ User in DB: id=${targetUser.id}`);

    // --- 6. 행 클릭 (선택) ---
    await cell.first().click();
    await page.waitForTimeout(500);

    // --- 7. 삭제 ---
    dialogs.length = 0;
    consoleLogs.length = 0;
    await page.locator('.bg-\\[\\#00587a\\] button:has-text("삭제")').first().click();

    // 비동기 작업 완료 대기
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 결과 분석
    console.log(`  [TEST] Dialogs:`, JSON.stringify(dialogs));
    const relevantLogs = consoleLogs.filter(l => l.includes('user-db') || l.includes('deleteUser') || l.includes('Delete') || l.includes('error'));
    console.log(`  [TEST] Console logs:`, relevantLogs);

    // --- 8. API에서 삭제 확인 ---
    const listAfter = await page.request.get(`${BASE}/api/users`);
    const after = await listAfter.json();
    const stillExists = after.users.find((u: any) => u.id === targetUser.id);
    console.log(`  [TEST] User still in DB: ${!!stillExists}`);

    // --- 9. UI 확인 ---
    // 페이지 새로고침으로 확실히 확인
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const afterReload = await page.locator(`td:has-text("${testName}")`).count();
    console.log(`  [TEST] After reload, UI count: ${afterReload}`);

    // 정리: 아직 DB에 있으면 API로 직접 삭제
    if (stillExists) {
      console.log(`  [TEST] ⚠ Cleaning up via API`);
      await page.request.delete(`${BASE}/api/users?id=${targetUser.id}`);
    }

    // 최종 판정
    expect(stillExists).toBeFalsy();
  });

  test('선택 없이 삭제 → alert', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });

    await page.goto(`${BASE}/master/user`, { waitUntil: 'networkidle' });
    await waitForStable(page);

    await page.locator('.bg-\\[\\#00587a\\] button:has-text("삭제")').first().click();
    await page.waitForTimeout(500);

    expect(dialogs.some(m => m.includes('선택'))).toBeTruthy();
  });
});
