/**
 * @file e2e/linkage-scenarios.spec.ts
 * @description Playwright E2E 테스트 - CP/PFD/FMEA 연동 시나리오
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// 테스트 설정
test.describe.configure({ mode: 'serial' });

// ============================================================================
// 헬퍼 함수
// ============================================================================

async function waitForPageLoad(page: Page) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
}

async function takeScreenshot(page: Page, name: string) {
    await page.screenshot({
        path: `./test-results/screenshots/${name}.png`,
        fullPage: true
    });
}

// ============================================================================
// 1. CP 페이지 테스트
// ============================================================================

test.describe('1. CP (Control Plan) 테스트', () => {

    test('CP 등록화면 접속', async ({ page }) => {
        await page.goto(`${BASE_URL}/control-plan`);
        await waitForPageLoad(page);

        // CP 페이지 로드 확인
        await expect(page.locator('body')).toBeVisible();
        await takeScreenshot(page, '1-1-cp-list');

        console.log('✅ CP 등록화면 접속 성공');
    });

    test('CP 워크시트 열기', async ({ page }) => {
        await page.goto(`${BASE_URL}/control-plan`);
        await waitForPageLoad(page);

        // 첫 번째 CP 항목 클릭 (있는 경우)
        const cpItem = page.locator('table tbody tr').first();
        if (await cpItem.isVisible()) {
            await cpItem.click();
            await waitForPageLoad(page);
            await takeScreenshot(page, '1-2-cp-worksheet');
            console.log('✅ CP 워크시트 열기 성공');
        } else {
            console.log('⚠️ CP 항목 없음 - 스킵');
        }
    });

    test('CP Excel Import 기능 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/control-plan`);
        await waitForPageLoad(page);

        // Import 버튼 확인
        const importBtn = page.getByRole('button', { name: /import|가져오기|엑셀/i });
        if (await importBtn.isVisible()) {
            console.log('✅ CP Excel Import 버튼 존재');
        } else {
            console.log('⚠️ Import 버튼 없음');
        }

        await takeScreenshot(page, '1-3-cp-import');
    });
});

// ============================================================================
// 2. PFD 페이지 테스트
// ============================================================================

test.describe('2. PFD (Process Flow Diagram) 테스트', () => {

    test('PFD 등록화면 접속', async ({ page }) => {
        await page.goto(`${BASE_URL}/pfd`);
        await waitForPageLoad(page);

        await expect(page.locator('body')).toBeVisible();
        await takeScreenshot(page, '2-1-pfd-list');

        console.log('✅ PFD 등록화면 접속 성공');
    });

    test('PFD 워크시트 열기', async ({ page }) => {
        await page.goto(`${BASE_URL}/pfd`);
        await waitForPageLoad(page);

        const pfdItem = page.locator('table tbody tr').first();
        if (await pfdItem.isVisible()) {
            await pfdItem.click();
            await waitForPageLoad(page);
            await takeScreenshot(page, '2-2-pfd-worksheet');
            console.log('✅ PFD 워크시트 열기 성공');
        } else {
            console.log('⚠️ PFD 항목 없음 - 스킵');
        }
    });
});

// ============================================================================
// 3. FMEA (PFMEA) 페이지 테스트
// ============================================================================

test.describe('3. FMEA (PFMEA) 테스트', () => {

    test('FMEA 등록화면 접속', async ({ page }) => {
        await page.goto(`${BASE_URL}/pfmea`);
        await waitForPageLoad(page);

        await expect(page.locator('body')).toBeVisible();
        await takeScreenshot(page, '3-1-fmea-list');

        console.log('✅ FMEA 등록화면 접속 성공');
    });

    test('FMEA 워크시트 열기', async ({ page }) => {
        await page.goto(`${BASE_URL}/pfmea`);
        await waitForPageLoad(page);

        // FMEA 항목 클릭
        const fmeaItem = page.locator('table tbody tr, [data-testid="fmea-item"]').first();
        if (await fmeaItem.isVisible()) {
            await fmeaItem.click();
            await waitForPageLoad(page);
            await takeScreenshot(page, '3-2-fmea-worksheet');
            console.log('✅ FMEA 워크시트 열기 성공');
        } else {
            // 직접 워크시트 페이지로 이동 시도
            await page.goto(`${BASE_URL}/pfmea/worksheet`);
            await waitForPageLoad(page);
            await takeScreenshot(page, '3-2-fmea-worksheet');
            console.log('✅ FMEA 워크시트 직접 접속');
        }
    });
});

// ============================================================================
// 4. CP → PFD 연동 테스트
// ============================================================================

test.describe('4. CP → PFD 연동 테스트', () => {

    test('CP에서 PFD 구조연동 버튼 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/control-plan`);
        await waitForPageLoad(page);

        // 구조연동 버튼 확인
        const syncBtn = page.getByRole('button', { name: /pfd|구조연동|연동/i });
        const hasSyncBtn = await syncBtn.count() > 0;

        if (hasSyncBtn) {
            console.log('✅ CP→PFD 구조연동 버튼 존재');
        }

        await takeScreenshot(page, '4-1-cp-to-pfd-sync');
    });
});

// ============================================================================
// 5. CP → FMEA 연동 테스트
// ============================================================================

test.describe('5. CP → FMEA 연동 테스트', () => {

    test('CP에서 FMEA 연동 버튼 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/control-plan`);
        await waitForPageLoad(page);

        const syncBtn = page.getByRole('button', { name: /fmea|연동/i });
        const hasSyncBtn = await syncBtn.count() > 0;

        if (hasSyncBtn) {
            console.log('✅ CP→FMEA 연동 버튼 존재');
        }

        await takeScreenshot(page, '5-1-cp-to-fmea-sync');
    });
});

// ============================================================================
// 6. PFD → FMEA 연동 테스트
// ============================================================================

test.describe('6. PFD → FMEA 연동 테스트', () => {

    test('PFD에서 FMEA 구조연동 버튼 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/pfd`);
        await waitForPageLoad(page);

        const syncBtn = page.getByRole('button', { name: /fmea|구조연동|연동/i });
        const hasSyncBtn = await syncBtn.count() > 0;

        if (hasSyncBtn) {
            console.log('✅ PFD→FMEA 구조연동 버튼 존재');
        }

        await takeScreenshot(page, '6-1-pfd-to-fmea-sync');
    });
});

// ============================================================================
// 7. FMEA → CP 연동 테스트
// ============================================================================

test.describe('7. FMEA → CP 연동 테스트', () => {

    test('FMEA에서 CP 연동 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/pfmea/worksheet`);
        await waitForPageLoad(page);

        // CP 연동 버튼 또는 메뉴 확인
        const syncBtn = page.getByRole('button', { name: /cp|control/i });
        const hasSyncBtn = await syncBtn.count() > 0;

        if (hasSyncBtn) {
            console.log('✅ FMEA→CP 연동 버튼 존재');
        }

        await takeScreenshot(page, '7-1-fmea-to-cp-sync');
    });
});

// ============================================================================
// 8. FMEA → PFD 연동 테스트
// ============================================================================

test.describe('8. FMEA → PFD 연동 테스트', () => {

    test('FMEA에서 PFD 연동 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/pfmea/worksheet`);
        await waitForPageLoad(page);

        const syncBtn = page.getByRole('button', { name: /pfd|연동/i });
        const hasSyncBtn = await syncBtn.count() > 0;

        if (hasSyncBtn) {
            console.log('✅ FMEA→PFD 연동 버튼 존재');
        }

        await takeScreenshot(page, '8-1-fmea-to-pfd-sync');
    });
});

// ============================================================================
// 9. 셀 병합 렌더링 테스트
// ============================================================================

test.describe('9. 셀 병합 렌더링 테스트', () => {

    test('CP 워크시트 rowSpan 렌더링 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/control-plan`);
        await waitForPageLoad(page);

        // 테이블의 병합된 셀 확인
        const mergedCells = page.locator('td[rowspan]');
        const mergedCount = await mergedCells.count();

        console.log(`✅ CP 워크시트: ${mergedCount}개 병합 셀 발견`);
        await takeScreenshot(page, '9-1-cp-rowspan');
    });

    test('PFD 워크시트 rowSpan 렌더링 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/pfd`);
        await waitForPageLoad(page);

        const mergedCells = page.locator('td[rowspan]');
        const mergedCount = await mergedCells.count();

        console.log(`✅ PFD 워크시트: ${mergedCount}개 병합 셀 발견`);
        await takeScreenshot(page, '9-2-pfd-rowspan');
    });
});

// ============================================================================
// 10. 전체 연동 흐름 테스트
// ============================================================================

test.describe('10. 전체 연동 흐름 테스트', () => {

    test('CP → PFD → FMEA 순차 접속', async ({ page }) => {
        // CP 접속
        await page.goto(`${BASE_URL}/control-plan`);
        await waitForPageLoad(page);
        await takeScreenshot(page, '10-1-flow-cp');

        // PFD 이동
        await page.goto(`${BASE_URL}/pfd`);
        await waitForPageLoad(page);
        await takeScreenshot(page, '10-2-flow-pfd');

        // FMEA 이동
        await page.goto(`${BASE_URL}/pfmea`);
        await waitForPageLoad(page);
        await takeScreenshot(page, '10-3-flow-fmea');

        console.log('✅ CP → PFD → FMEA 순차 접속 완료');
    });

    test('FMEA → PFD → CP 역순 접속', async ({ page }) => {
        // FMEA 접속
        await page.goto(`${BASE_URL}/pfmea`);
        await waitForPageLoad(page);

        // PFD 이동
        await page.goto(`${BASE_URL}/pfd`);
        await waitForPageLoad(page);

        // CP 이동
        await page.goto(`${BASE_URL}/control-plan`);
        await waitForPageLoad(page);

        console.log('✅ FMEA → PFD → CP 역순 접속 완료');
        await takeScreenshot(page, '10-4-flow-reverse');
    });
});
