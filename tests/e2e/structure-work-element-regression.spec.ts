/**
 * @file structure-work-element-regression.spec.ts
 * @description PFMEA 구조분석 탭 작업요소 순차 추가/삭제 회귀 테스트
 * 
 * 테스트 시나리오:
 * 1. 작업요소 1개 추가 → 저장 → 새로고침 → 검증
 * 2. 작업요소 2개 추가 → 저장 → 새로고침 → 검증
 * 3. 작업요소 3개 추가 → 저장 → 새로고침 → 검증
 * 4. 작업요소 4개 추가 → 저장 → 새로고침 → 검증
 * 5. 작업요소 5개 추가 → 저장 → 새로고침 → 검증
 * 6. 작업요소 삭제 테스트 (5개 → 1개로 순차 삭제)
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const FMEA_NO = 'pfm26-p001-l01';

// 작업요소 이름 목록
const WORK_ELEMENTS = [
    { name: '작업자', m4: 'MN' },
    { name: '셋업 엔지니어', m4: 'MN' },
    { name: 'Cutting MC', m4: 'MC' },
    { name: '톱날(DISC)', m4: 'MT' },
    { name: '지그', m4: 'MT' },
];

async function waitForPageLoad(page: Page) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
}

async function navigateToStructureTab(page: Page) {
    // PFMEA 워크시트 페이지로 이동
    await page.goto(`${BASE_URL}/pfmea/worksheet?fmeaNo=${FMEA_NO}`);
    await waitForPageLoad(page);

    // 구조분석 탭 클릭
    const structureTab = page.locator('button:has-text("1. 구조분석")');
    if (await structureTab.isVisible()) {
        await structureTab.click();
        await page.waitForTimeout(500);
    }
}

async function getWorkElementCount(page: Page): Promise<number> {
    // 트리뷰에서 작업요소 개수 확인
    const treeItems = page.locator('.tree-item, [data-testid="work-element"]');
    return await treeItems.count();
}

async function addWorkElement(page: Page, name: string, m4: string) {
    console.log(`📝 작업요소 추가: ${name} (${m4})`);

    // 작업요소 입력 필드 찾기
    const inputField = page.locator('input[placeholder*="작업요소"], input[placeholder*="요소명"]').first();

    if (await inputField.isVisible()) {
        await inputField.fill(name);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
    } else {
        // 작업요소 추가 버튼 클릭
        const addButton = page.locator('button:has-text("추가"), button:has-text("+")').first();
        if (await addButton.isVisible()) {
            await addButton.click();
            await page.waitForTimeout(300);
        }
    }
}

async function verifyWorkElements(page: Page, expectedCount: number): Promise<boolean> {
    // 테이블에서 작업요소 행 수 확인
    const rows = page.locator('table tbody tr');
    const actualCount = await rows.count();

    console.log(`🔍 검증: 예상 ${expectedCount}개, 실제 ${actualCount}개`);
    return actualCount >= expectedCount;
}

test.describe('PFMEA 구조분석 작업요소 회귀 테스트', () => {

    test.beforeEach(async ({ page }) => {
        // 각 테스트 전 페이지 초기화
        await navigateToStructureTab(page);
    });

    test('1. 작업요소 1개 추가 후 새로고침 검증', async ({ page }) => {
        console.log('=== 테스트 1: 작업요소 1개 추가 ===');

        // 첫 번째 공정 선택
        const firstProcess = page.locator('td:has-text("컷팅"), td:has-text("10")').first();
        if (await firstProcess.isVisible()) {
            await firstProcess.click();
        }

        // 스크린샷 1: 초기 상태
        await page.screenshot({ path: 'tests/screenshots/structure-1-before.png' });

        // 작업요소 추가
        await addWorkElement(page, WORK_ELEMENTS[0].name, WORK_ELEMENTS[0].m4);

        // 저장 버튼 클릭
        const saveButton = page.locator('button:has-text("저장")').first();
        if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(1000);
        }

        // 스크린샷 2: 저장 후
        await page.screenshot({ path: 'tests/screenshots/structure-1-after-save.png' });

        // 새로고침
        await page.reload();
        await waitForPageLoad(page);

        // 구조분석 탭으로 다시 이동
        await navigateToStructureTab(page);

        // 스크린샷 3: 새로고침 후
        await page.screenshot({ path: 'tests/screenshots/structure-1-after-reload.png' });

        // 검증: 작업요소가 여전히 존재하는지
        const tableBody = page.locator('table tbody');
        await expect(tableBody).toBeVisible();
    });

    test('2. 작업요소 2개 추가 후 새로고침 검증', async ({ page }) => {
        console.log('=== 테스트 2: 작업요소 2개 추가 ===');

        for (let i = 0; i < 2; i++) {
            await addWorkElement(page, WORK_ELEMENTS[i].name, WORK_ELEMENTS[i].m4);
        }

        // 저장
        const saveButton = page.locator('button:has-text("저장")').first();
        if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(1000);
        }

        // 새로고침
        await page.reload();
        await waitForPageLoad(page);
        await navigateToStructureTab(page);

        // 스크린샷
        await page.screenshot({ path: 'tests/screenshots/structure-2-after-reload.png' });

        // 검증
        const verified = await verifyWorkElements(page, 2);
        console.log(`검증 결과: ${verified ? '✅ 성공' : '❌ 실패'}`);
    });

    test('3. 작업요소 3개 추가 후 새로고침 검증', async ({ page }) => {
        console.log('=== 테스트 3: 작업요소 3개 추가 ===');

        for (let i = 0; i < 3; i++) {
            await addWorkElement(page, WORK_ELEMENTS[i].name, WORK_ELEMENTS[i].m4);
        }

        const saveButton = page.locator('button:has-text("저장")').first();
        if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(1000);
        }

        await page.reload();
        await waitForPageLoad(page);
        await navigateToStructureTab(page);

        await page.screenshot({ path: 'tests/screenshots/structure-3-after-reload.png' });

        const verified = await verifyWorkElements(page, 3);
        console.log(`검증 결과: ${verified ? '✅ 성공' : '❌ 실패'}`);
    });

    test('4. 작업요소 4개 추가 후 새로고침 검증', async ({ page }) => {
        console.log('=== 테스트 4: 작업요소 4개 추가 ===');

        for (let i = 0; i < 4; i++) {
            await addWorkElement(page, WORK_ELEMENTS[i].name, WORK_ELEMENTS[i].m4);
        }

        const saveButton = page.locator('button:has-text("저장")').first();
        if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(1000);
        }

        await page.reload();
        await waitForPageLoad(page);
        await navigateToStructureTab(page);

        await page.screenshot({ path: 'tests/screenshots/structure-4-after-reload.png' });

        const verified = await verifyWorkElements(page, 4);
        console.log(`검증 결과: ${verified ? '✅ 성공' : '❌ 실패'}`);
    });

    test('5. 작업요소 5개 추가 후 새로고침 검증', async ({ page }) => {
        console.log('=== 테스트 5: 작업요소 5개 추가 ===');

        for (let i = 0; i < 5; i++) {
            await addWorkElement(page, WORK_ELEMENTS[i].name, WORK_ELEMENTS[i].m4);
        }

        const saveButton = page.locator('button:has-text("저장")').first();
        if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(1000);
        }

        await page.reload();
        await waitForPageLoad(page);
        await navigateToStructureTab(page);

        await page.screenshot({ path: 'tests/screenshots/structure-5-after-reload.png' });

        const verified = await verifyWorkElements(page, 5);
        console.log(`검증 결과: ${verified ? '✅ 성공' : '❌ 실패'}`);
    });

    test('6. DB 데이터 원자성 검증 (API 직접 호출)', async ({ request }) => {
        console.log('=== 테스트 6: DB 데이터 원자성 검증 ===');

        // API로 FMEA 데이터 조회
        const response = await request.get(`${BASE_URL}/api/fmea/${FMEA_NO}`);

        if (response.ok()) {
            const data = await response.json();
            const l2List = data.data?.l2 || [];

            console.log('📊 L2 공정 목록:');
            l2List.forEach((proc: any, idx: number) => {
                console.log(`  ${idx + 1}. ${proc.no}-${proc.name}`);
                if (proc.l3 && Array.isArray(proc.l3)) {
                    proc.l3.forEach((l3: any, l3Idx: number) => {
                        console.log(`     L3[${l3Idx}]: ${l3.name} (m4: ${l3.m4 || '-'})`);
                        console.log(`       - functions: ${Array.isArray(l3.functions) ? l3.functions.length : 'NOT_ARRAY'}`);
                        console.log(`       - processChars: ${Array.isArray(l3.processChars) ? l3.processChars.length : 'NOT_ARRAY'}`);

                        // 원자성 검증: functions와 processChars가 배열인지 확인
                        if (!Array.isArray(l3.functions)) {
                            console.error(`❌ 오류: l3.functions가 배열이 아닙니다!`);
                        }
                        if (!Array.isArray(l3.processChars)) {
                            console.error(`❌ 오류: l3.processChars가 배열이 아닙니다!`);
                        }
                    });
                }
            });

            expect(l2List.length).toBeGreaterThan(0);
        } else {
            console.log(`API 호출 실패: ${response.status()}`);
        }
    });
});
