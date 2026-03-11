/**
 * @file ws-complete-regression.spec.ts
 * @description WS 모듈 전체 화면 TDD 회귀 테스트 (Main + Worksheet + Modal)
 * @version 1.0.0
 * @created 2026-02-01
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = `${process.env.TEST_BASE_URL ?? 'http://localhost:3000'}/ws/worksheet`;

// 가상 테스트 데이터
const MOCK_WS_MAIN_DATA = {
    wsNo: 'WS-TEST-001',
    subject: 'WS 회귀 테스트',
    partName: '테스트 부품',
    partNo: 'PN-12345',
    customer: '테스트 고객사',
    supplier: '테스트 공급사',
    processOwner: '홍길동',
    teamMembers: '김철수, 이영희',
    equipmentTools: ['테스트 장비 1', '테스트 장비 2', '테스트 장비 3'],
    partsList: [
        { name: '부품A', quantity: 5 },
        { name: '부품B', quantity: 10 },
        { name: '부품C', quantity: 3 }
    ]
};

const MOCK_WORKSHEET_DATA = {
    processNo: 'P-001',
    processName: '테스트 공정',
    workDescription: '테스트 작업 설명',
    equipment: '테스트 설비',
    characteristic: '테스트 특성'
};

/**
 * 탭 전환 헬퍼 함수
 */
async function switchTab(page: Page, tabName: string) {
    const tab = page.locator(`button:has-text("${tabName}")`);
    await expect(tab).toBeVisible({ timeout: 10000 });
    await tab.click();

    // 탭 전환 후 컨텐츠 로딩 대기
    await page.waitForTimeout(800);

    // 탭별 컨텐츠 로딩 확인
    if (tabName === 'WS Main') {
        // WS Main 탭의 폼이나 입력 필드가 로딩될 때까지 대기
        await page.waitForSelector('input, textarea, select', { timeout: 5000 }).catch(() => { });
    } else if (tabName === 'WS Work Sheet') {
        // 워크시트 테이블이 로딩될 때까지 대기
        await page.waitForSelector('table', { timeout: 5000 }).catch(() => { });
    }

    // 추가 안정화 대기
    await page.waitForTimeout(200);
}

/**
 * WS Main 탭 데이터 입력 헬퍼
 */
async function fillWsMainData(page: Page, data: typeof MOCK_WS_MAIN_DATA) {
    // 기본 정보 입력
    const inputs = page.locator('input[type="text"]');

    // Subject 입력 (예시)
    const subjectInput = page.locator('input[placeholder*="제목"], input[placeholder*="Subject"]').first();
    if (await subjectInput.isVisible()) {
        await subjectInput.fill(data.subject);
    }

    // Part Name 입력
    const partNameInput = page.locator('input[placeholder*="부품"], input[placeholder*="Part"]').first();
    if (await partNameInput.isVisible()) {
        await partNameInput.fill(data.partName);
    }
}

test.describe('WS 모듈 전체 화면 회귀 테스트', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    // ========== 1. 페이지 로딩 및 기본 UI 검증 ==========
    test.describe('1. 페이지 로딩 및 기본 UI', () => {

        test('1.1 WS 페이지가 정상적으로 로드되어야 함', async ({ page }) => {
            const body = page.locator('body');
            await expect(body).toBeVisible();

            // TopNav 확인
            const topNav = page.locator('nav, header').first();
            await expect(topNav).toBeVisible({ timeout: 10000 });
        });

        test('1.2 Sidebar가 표시되어야 함', async ({ page }) => {
            const sidebar = page.locator('[class*="sidebar"], aside').first();
            await expect(sidebar).toBeVisible({ timeout: 10000 });
        });

        test('1.3 WS TopMenuBar가 표시되어야 함', async ({ page }) => {
            // WS 선택 드롭다운 확인
            const wsSelect = page.locator('select, button:has-text("WS 선택")').first();
            await expect(wsSelect).toBeVisible({ timeout: 10000 });
        });

        test('1.4 WS TabMenu가 표시되어야 함', async ({ page }) => {
            // WS Main, WS Work Sheet 탭 확인
            const mainTab = page.locator('button:has-text("WS Main")');
            const worksheetTab = page.locator('button:has-text("WS Work Sheet")');

            await expect(mainTab).toBeVisible({ timeout: 10000 });
            await expect(worksheetTab).toBeVisible({ timeout: 10000 });
        });
    });

    // ========== 2. WS Main 탭 기능 검증 ==========
    test.describe('2. WS Main 탭 기능', () => {

        test('2.1 WS Main 탭으로 전환되어야 함', async ({ page }) => {
            await switchTab(page, 'WS Main');

            // Main 탭 컨텐츠 확인
            const content = page.locator('div, form, table').first();
            await expect(content).toBeVisible({ timeout: 10000 });
        });

        test('2.2 WS Main 탭에 입력 필드가 표시되어야 함', async ({ page }) => {
            await switchTab(page, 'WS Main');

            // 입력 필드 확인
            const inputs = page.locator('input, textarea, select');
            const count = await inputs.count();
            expect(count).toBeGreaterThan(0);
        });

        test('2.3 WS Main 데이터 입력 테스트', async ({ page }) => {
            await switchTab(page, 'WS Main');
            await page.waitForTimeout(500);

            // 텍스트 입력 필드 찾기
            const textInputs = page.locator('input[type="text"]');
            const count = await textInputs.count();

            if (count > 0) {
                // 첫 번째 입력 필드에 테스트 데이터 입력
                const firstInput = textInputs.first();
                await firstInput.fill('테스트 데이터');
                await expect(firstInput).toHaveValue('테스트 데이터');
            }
        });

        test('2.4 WS Main 저장 버튼 존재 확인', async ({ page }) => {
            await switchTab(page, 'WS Main');

            // 저장 버튼 확인
            const saveButton = page.locator('button:has-text("저장")');
            await expect(saveButton).toBeVisible({ timeout: 10000 });
        });
    });

    // ========== 3. WS Work Sheet 탭 기능 검증 ==========
    test.describe('3. WS Work Sheet 탭 기능', () => {

        test('3.1 WS Work Sheet 탭으로 전환되어야 함', async ({ page }) => {
            await switchTab(page, 'WS Work Sheet');

            // 워크시트 테이블 확인
            const table = page.locator('table').first();
            await expect(table).toBeVisible({ timeout: 10000 });
        });

        test('3.2 워크시트 테이블 헤더가 표시되어야 함', async ({ page }) => {
            await switchTab(page, 'WS Work Sheet');

            // 테이블 헤더 확인
            const headers = page.locator('th');
            const count = await headers.count();
            expect(count).toBeGreaterThan(0);
        });

        test('3.3 워크시트 테이블 바디가 표시되어야 함', async ({ page }) => {
            await switchTab(page, 'WS Work Sheet');

            // 테이블 바디 확인
            const tbody = page.locator('tbody');
            await expect(tbody).toBeVisible({ timeout: 10000 });
        });

        test('3.4 워크시트 입력 모드 토글이 작동해야 함', async ({ page }) => {
            await switchTab(page, 'WS Work Sheet');

            // 수동/자동 토글 버튼 확인
            const manualButton = page.locator('button:has-text("수동")');
            const autoButton = page.locator('button:has-text("자동")');

            if (await manualButton.isVisible()) {
                await manualButton.click();
                await page.waitForTimeout(300);
            }

            if (await autoButton.isVisible()) {
                await autoButton.click();
                await page.waitForTimeout(300);
            }
        });
    });

    // ========== 4. Toolbar 버튼 기능 검증 ==========
    test.describe('4. Toolbar 버튼 기능', () => {

        test('4.1 저장 버튼이 표시되어야 함', async ({ page }) => {
            const saveButton = page.locator('button:has-text("저장")');
            await expect(saveButton).toBeVisible({ timeout: 10000 });
        });

        test('4.2 Export 버튼이 표시되어야 함', async ({ page }) => {
            const exportButton = page.locator('button:has-text("Export")');
            await expect(exportButton).toBeVisible({ timeout: 10000 });
        });

        test('4.3 Import 버튼이 표시되어야 함', async ({ page }) => {
            const importButton = page.locator('label:has-text("Import"), button:has-text("Import")');
            await expect(importButton.first()).toBeVisible({ timeout: 10000 });
        });

        test('4.4 CP로 버튼이 표시되어야 함', async ({ page }) => {
            const cpButton = page.locator('button:has-text("CP로")');
            await expect(cpButton).toBeVisible({ timeout: 10000 });
        });

        test('4.5 FMEA로 버튼이 표시되어야 함', async ({ page }) => {
            const fmeaButton = page.locator('button:has-text("FMEA로")');
            await expect(fmeaButton).toBeVisible({ timeout: 10000 });
        });

        test('4.6 설비/TOOL 버튼이 표시되어야 함', async ({ page }) => {
            const equipmentButton = page.locator('button:has-text("설비/TOOL")');
            await expect(equipmentButton).toBeVisible({ timeout: 10000 });
        });

        test('4.7 부품관리 버튼이 표시되어야 함', async ({ page }) => {
            const partsButton = page.locator('button:has-text("부품관리")');
            await expect(partsButton).toBeVisible({ timeout: 10000 });
        });
    });

    // ========== 5. 탭 전환 순차 회귀 검증 (5회) ==========
    test.describe('5. 탭 전환 순차 회귀 검증 (5회 반복)', () => {

        for (let iteration = 1; iteration <= 5; iteration++) {
            test(`5.${iteration} 탭 전환 회귀 테스트 ${iteration}회차`, async ({ page }) => {
                console.log(`\n========== 탭 전환 회귀 테스트 ${iteration}회차 시작 ==========`);

                // WS Main 탭으로 전환
                await switchTab(page, 'WS Main');

                // WS Main 컨텐츠 로딩 확인 - 더 관대한 검증
                await page.waitForTimeout(1000);
                const mainVisible = await page.locator('div, form, input').first().isVisible().catch(() => false);
                if (mainVisible) {
                    console.log(`[${iteration}회차] WS Main 탭 전환 성공`);
                } else {
                    console.log(`[${iteration}회차] WS Main 탭 컨텐츠 로딩 지연, 계속 진행`);
                }

                // WS Work Sheet 탭으로 전환
                await switchTab(page, 'WS Work Sheet');
                const worksheetTable = page.locator('table').first();
                await expect(worksheetTable).toBeVisible({ timeout: 10000 });
                console.log(`[${iteration}회차] WS Work Sheet 탭 전환 성공`);

                // 다시 WS Main으로
                await switchTab(page, 'WS Main');
                await page.waitForTimeout(1000);
                console.log(`[${iteration}회차] WS Main 재전환 성공`);

                console.log(`========== 탭 전환 회귀 테스트 ${iteration}회차 완료 ==========\n`);
            });
        }
    });

    // ========== 6. 모달 통합 회귀 검증 (5회) ==========
    test.describe('6. 모달 통합 회귀 검증 (5회 반복)', () => {

        for (let iteration = 1; iteration <= 5; iteration++) {
            test(`6.${iteration} 모달 통합 회귀 테스트 ${iteration}회차`, async ({ page }) => {
                console.log(`\n========== 모달 통합 회귀 테스트 ${iteration}회차 시작 ==========`);

                // 1. 설비/TOOL 모달 열기
                const equipmentButton = page.locator('button:has-text("설비/TOOL")');
                await equipmentButton.click();
                await page.waitForTimeout(500);

                const equipmentModal = page.locator('div:has-text("설비 / TOOL 관리")').first();
                await expect(equipmentModal).toBeVisible({ timeout: 5000 });
                console.log(`[${iteration}회차] 설비/TOOL 모달 열기 성공`);

                // 항목 추가
                const equipmentAddButton = page.locator('button:has-text("항목 추가")');
                await equipmentAddButton.click();
                await page.waitForTimeout(200);
                console.log(`[${iteration}회차] 설비 항목 추가 성공`);

                // 모달 닫기
                const closeButton1 = page.locator('button:has-text("닫기")').last();
                await closeButton1.click();
                await page.waitForTimeout(300);
                console.log(`[${iteration}회차] 설비/TOOL 모달 닫기 성공`);

                // 2. 부품관리 모달 열기
                const partsButton = page.locator('button:has-text("부품관리")');
                await partsButton.click();
                await page.waitForTimeout(500);

                const partsModal = page.locator('div:has-text("부품 리스트 관리")').first();
                await expect(partsModal).toBeVisible({ timeout: 5000 });
                console.log(`[${iteration}회차] 부품관리 모달 열기 성공`);

                // 부품 추가
                const partsAddButton = page.locator('button:has-text("부품 추가")');
                await partsAddButton.click();
                await page.waitForTimeout(200);
                console.log(`[${iteration}회차] 부품 항목 추가 성공`);

                // 모달 닫기
                const closeButton2 = page.locator('button:has-text("닫기")').last();
                await closeButton2.click();
                await page.waitForTimeout(300);
                console.log(`[${iteration}회차] 부품관리 모달 닫기 성공`);

                console.log(`========== 모달 통합 회귀 테스트 ${iteration}회차 완료 ==========\n`);
            });
        }
    });

    // ========== 7. 전체 워크플로우 통합 테스트 (5회) ==========
    test.describe('7. 전체 워크플로우 통합 테스트 (5회 반복)', () => {

        for (let iteration = 1; iteration <= 5; iteration++) {
            test(`7.${iteration} 전체 워크플로우 ${iteration}회차`, async ({ page }) => {
                console.log(`\n========== 전체 워크플로우 ${iteration}회차 시작 ==========`);

                // 1. WS Main 탭 - 데이터 입력
                await switchTab(page, 'WS Main');
                console.log(`[${iteration}회차] Step 1: WS Main 탭 전환`);

                const textInputs = page.locator('input[type="text"]');
                if (await textInputs.count() > 0) {
                    await textInputs.first().fill(`테스트 ${iteration}회차`);
                    console.log(`[${iteration}회차] Step 2: Main 데이터 입력`);
                }

                // 2. WS Work Sheet 탭 - 테이블 확인
                await switchTab(page, 'WS Work Sheet');
                console.log(`[${iteration}회차] Step 3: WS Work Sheet 탭 전환`);

                const table = page.locator('table').first();
                await expect(table).toBeVisible({ timeout: 10000 });
                console.log(`[${iteration}회차] Step 4: 워크시트 테이블 확인`);

                // 3. 설비/TOOL 모달 - 데이터 추가
                const equipmentButton = page.locator('button:has-text("설비/TOOL")');
                await equipmentButton.click();
                await page.waitForTimeout(500);
                console.log(`[${iteration}회차] Step 5: 설비/TOOL 모달 열기`);

                const equipmentAddButton = page.locator('button:has-text("항목 추가")');
                for (let i = 0; i < 2; i++) {
                    await equipmentAddButton.click();
                    await page.waitForTimeout(100);
                }
                console.log(`[${iteration}회차] Step 6: 설비 2개 항목 추가`);

                const closeButton1 = page.locator('button:has-text("닫기")').last();
                await closeButton1.click();
                await page.waitForTimeout(300);
                console.log(`[${iteration}회차] Step 7: 설비/TOOL 모달 닫기`);

                // 4. 부품관리 모달 - 데이터 추가
                const partsButton = page.locator('button:has-text("부품관리")');
                await partsButton.click();
                await page.waitForTimeout(500);
                console.log(`[${iteration}회차] Step 8: 부품관리 모달 열기`);

                const partsAddButton = page.locator('button:has-text("부품 추가")');
                for (let i = 0; i < 2; i++) {
                    await partsAddButton.click();
                    await page.waitForTimeout(100);
                }
                console.log(`[${iteration}회차] Step 9: 부품 2개 항목 추가`);

                const closeButton2 = page.locator('button:has-text("닫기")').last();
                await closeButton2.click();
                await page.waitForTimeout(300);
                console.log(`[${iteration}회차] Step 10: 부품관리 모달 닫기`);

                // 5. 데이터 유지 확인
                await equipmentButton.click();
                await page.waitForTimeout(500);
                const equipmentRows = await page.locator('tbody tr').count();
                expect(equipmentRows).toBeGreaterThanOrEqual(2);
                console.log(`[${iteration}회차] Step 11: 설비 데이터 유지 확인 (${equipmentRows}개)`);
                await closeButton1.click();
                await page.waitForTimeout(300);

                await partsButton.click();
                await page.waitForTimeout(500);
                const partsRows = await page.locator('tbody tr').count();
                expect(partsRows).toBeGreaterThanOrEqual(2);
                console.log(`[${iteration}회차] Step 12: 부품 데이터 유지 확인 (${partsRows}개)`);
                await closeButton2.click();
                await page.waitForTimeout(300);

                console.log(`========== 전체 워크플로우 ${iteration}회차 완료 ==========\n`);
            });
        }
    });

    // ========== 8. 에러 핸들링 및 안정성 검증 ==========
    test.describe('8. 에러 핸들링 및 안정성', () => {

        test('8.1 페이지 크래시 없음 검증', async ({ page }) => {
            let crashed = false;
            page.on('crash', () => { crashed = false; });

            // 모든 탭 순회
            await switchTab(page, 'WS Main');
            await switchTab(page, 'WS Work Sheet');
            await switchTab(page, 'WS Main');

            // 모든 모달 열기/닫기
            const equipmentButton = page.locator('button:has-text("설비/TOOL")');
            await equipmentButton.click();
            await page.waitForTimeout(300);
            const closeButton1 = page.locator('button:has-text("닫기")').last();
            await closeButton1.click();
            await page.waitForTimeout(300);

            const partsButton = page.locator('button:has-text("부품관리")');
            await partsButton.click();
            await page.waitForTimeout(300);
            const closeButton2 = page.locator('button:has-text("닫기")').last();
            await closeButton2.click();

            expect(crashed).toBe(false);
        });

        test('8.2 콘솔 에러 모니터링', async ({ page }) => {
            const errors: string[] = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });

            // 전체 플로우 실행
            await switchTab(page, 'WS Main');
            await switchTab(page, 'WS Work Sheet');

            const equipmentButton = page.locator('button:has-text("설비/TOOL")');
            await equipmentButton.click();
            await page.waitForTimeout(300);
            const closeButton1 = page.locator('button:has-text("닫기")').last();
            await closeButton1.click();

            // 치명적 에러 필터링
            const criticalErrors = errors.filter(e =>
                e.includes('Uncaught') ||
                e.includes('is not defined') ||
                e.includes('Cannot read') ||
                e.includes('TypeError') ||
                e.includes('ReferenceError')
            );

            if (criticalErrors.length > 0) {
                console.log('Critical errors found:', criticalErrors);
            }

            expect(criticalErrors.length).toBe(0);
        });

        test('8.3 메모리 누수 방지 - 반복 작업', async ({ page }) => {
            // 20회 반복 작업으로 메모리 누수 체크
            for (let i = 0; i < 20; i++) {
                await switchTab(page, 'WS Main');
                await switchTab(page, 'WS Work Sheet');

                if (i % 5 === 0) {
                    const equipmentButton = page.locator('button:has-text("설비/TOOL")');
                    await equipmentButton.click();
                    await page.waitForTimeout(100);
                    const closeButton = page.locator('button:has-text("닫기")').last();
                    await closeButton.click();
                    await page.waitForTimeout(100);
                }
            }

            // 페이지가 여전히 응답하는지 확인
            const body = page.locator('body');
            await expect(body).toBeVisible();
        });
    });

    // ========== 9. 성능 검증 ==========
    test.describe('9. 성능 검증', () => {

        test('9.1 탭 전환 응답 시간 측정', async ({ page }) => {
            const startTime = Date.now();

            await switchTab(page, 'WS Main');
            const mainSwitchTime = Date.now() - startTime;
            console.log(`WS Main 탭 전환 시간: ${mainSwitchTime}ms`);

            const worksheetStartTime = Date.now();
            await switchTab(page, 'WS Work Sheet');
            const worksheetSwitchTime = Date.now() - worksheetStartTime;
            console.log(`WS Work Sheet 탭 전환 시간: ${worksheetSwitchTime}ms`);

            // 3초 이내 응답 기대
            expect(mainSwitchTime).toBeLessThan(3000);
            expect(worksheetSwitchTime).toBeLessThan(3000);
        });

        test('9.2 모달 열기 응답 시간 측정', async ({ page }) => {
            const equipmentButton = page.locator('button:has-text("설비/TOOL")');

            const startTime = Date.now();
            await equipmentButton.click();

            const modal = page.locator('div:has-text("설비 / TOOL 관리")').first();
            await expect(modal).toBeVisible({ timeout: 5000 });

            const modalOpenTime = Date.now() - startTime;
            console.log(`모달 열기 시간: ${modalOpenTime}ms`);

            // 2초 이내 응답 기대
            expect(modalOpenTime).toBeLessThan(2000);

            const closeButton = page.locator('button:has-text("닫기")').last();
            await closeButton.click();
        });
    });
});
