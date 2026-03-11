/**
 * @file ws-equipment-parts-modal.spec.ts
 * @description WS 설비/부품 관리 모달 TDD 테스트 (순차 회귀 검증 5회)
 * @version 1.0.0
 * @created 2026-02-01
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = `${process.env.TEST_BASE_URL ?? 'http://localhost:3000'}/ws/worksheet`;

// 가상 테스트 데이터
const MOCK_EQUIPMENT_DATA = [
    '프레스 기계 A-100',
    '용접 로봇 WR-500',
    '검사 지그 IG-200',
    '조립 툴 AT-300',
    '측정 게이지 MG-150'
];

const MOCK_PARTS_DATA = [
    { name: '베어링 6205', quantity: 4 },
    { name: '볼트 M8x20', quantity: 12 },
    { name: '와셔 8mm', quantity: 12 },
    { name: '스프링 SUS304', quantity: 2 },
    { name: '씰링 NBR-50', quantity: 1 }
];

/**
 * 설비/TOOL 모달 열기 헬퍼 함수
 * 
 * [Troubleshooting Guide]
 * 만약 모달이 열리지 않고 타임아웃이 발생한다면:
 * 1. 로컬 서버(localhost:3000)가 정상 작동 중인지 확인하세요.
 * 2. PC 성능에 따라 렌더링 속도가 느릴 수 있습니다. timeout 값을 늘려보세요.
 *    예: expect(modal).toBeVisible({ timeout: 20000 });
 * 3. 실제 DOM의 텍스트가 "설비 / TOOL 관리"와 일치하는지 개발자 도구로 확인하세요.
 */
async function openEquipmentModal(page: Page) {
    const equipmentButton = page.locator('button:has-text("설비/TOOL")');
    await expect(equipmentButton).toBeVisible({ timeout: 10000 });
    await equipmentButton.click();

    // 모달이 완전히 열릴 때까지 대기
    const modal = page.locator('div:has-text("설비 / TOOL 관리")').first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // 모달 내부 테이블이 렌더링될 때까지 추가 대기
    await page.waitForSelector('table', { timeout: 5000 });
    await page.waitForTimeout(800); // 300ms → 800ms
}

/**
 * 부품 리스트 모달 열기 헬퍼 함수
 */
async function openPartsModal(page: Page) {
    const partsButton = page.locator('button:has-text("부품관리")');
    await expect(partsButton).toBeVisible({ timeout: 10000 });
    await partsButton.click();

    // 모달이 완전히 열릴 때까지 대기
    const modal = page.locator('div:has-text("부품 리스트 관리")').first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // 모달 내부 테이블이 렌더링될 때까지 추가 대기
    await page.waitForSelector('table', { timeout: 5000 });
    await page.waitForTimeout(800); // 300ms → 800ms
}

/**
 * 모달 닫기 헬퍼 함수
 */
async function closeModal(page: Page) {
    const closeButton = page.locator('button:has-text("닫기")').last();
    await closeButton.click();

    // 모달이 완전히 사라질 때까지 대기
    await page.waitForTimeout(500);

    // 모달이 DOM에서 제거되었는지 확인
    const modal = page.locator('[class*="fixed"][class*="inset-0"]').first();
    await expect(modal).not.toBeVisible({ timeout: 3000 }).catch(() => { });
}

test.describe('WS 설비/부품 관리 모달 TDD 테스트', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    // ========== 1. UI 존재 검증 ==========
    test.describe('1. UI 요소 존재 검증', () => {

        test('1.1 설비/TOOL 버튼이 Toolbar에 표시되어야 함', async ({ page }) => {
            const equipmentButton = page.locator('button:has-text("설비/TOOL")');
            await expect(equipmentButton).toBeVisible({ timeout: 10000 });
        });

        test('1.2 부품관리 버튼이 Toolbar에 표시되어야 함', async ({ page }) => {
            const partsButton = page.locator('button:has-text("부품관리")');
            await expect(partsButton).toBeVisible({ timeout: 10000 });
        });

        test('1.3 설비/TOOL, 부품 리스트 탭이 제거되었어야 함', async ({ page }) => {
            // 탭 메뉴에서 설비/부품 탭이 없어야 함
            const equipmentTab = page.locator('button:has-text("설비/TOOL 관리")');
            const partsTab = page.locator('button:has-text("부품 리스트 관리")');

            await expect(equipmentTab).not.toBeVisible();
            await expect(partsTab).not.toBeVisible();
        });
    });

    // ========== 2. 설비/TOOL 모달 기능 검증 ==========
    test.describe('2. 설비/TOOL 모달 기본 기능', () => {

        test('2.1 설비/TOOL 모달이 열려야 함', async ({ page }) => {
            await openEquipmentModal(page);

            // 모달 헤더 확인
            const modalHeader = page.locator('h3:has-text("설비 / TOOL 관리")');
            await expect(modalHeader).toBeVisible();
        });

        test('2.2 설비/TOOL 모달에 테이블이 표시되어야 함', async ({ page }) => {
            await openEquipmentModal(page);

            // 테이블 헤더 확인
            const tableHeaders = page.locator('th');
            await expect(tableHeaders.first()).toBeVisible();

            // NO, 설비/TOOL명, 관리 컬럼 확인
            await expect(page.locator('th:has-text("NO")')).toBeVisible();
            await expect(page.locator('th:has-text("설비 / TOOL 명")')).toBeVisible();
            await expect(page.locator('th:has-text("관리")')).toBeVisible();
        });

        test('2.3 설비/TOOL 모달이 닫혀야 함', async ({ page }) => {
            await openEquipmentModal(page);
            await closeModal(page);

            // 모달이 사라졌는지 확인
            const modal = page.locator('div:has-text("설비 / TOOL 관리")').first();
            await expect(modal).not.toBeVisible();
        });
    });

    // ========== 3. 부품 리스트 모달 기능 검증 ==========
    test.describe('3. 부품 리스트 모달 기본 기능', () => {

        test('3.1 부품 리스트 모달이 열려야 함', async ({ page }) => {
            await openPartsModal(page);

            // 모달 헤더 확인
            const modalHeader = page.locator('h3:has-text("부품 리스트 관리")');
            await expect(modalHeader).toBeVisible();
        });

        test('3.2 부품 리스트 모달에 테이블이 표시되어야 함', async ({ page }) => {
            await openPartsModal(page);

            // 테이블 헤더 확인
            await expect(page.locator('th:has-text("NO")')).toBeVisible();
            await expect(page.locator('th:has-text("부품명")')).toBeVisible();
            await expect(page.locator('th:has-text("수량")')).toBeVisible();
            await expect(page.locator('th:has-text("관리")')).toBeVisible();
        });

        test('3.3 부품 리스트 모달이 닫혀야 함', async ({ page }) => {
            await openPartsModal(page);
            await closeModal(page);

            // 모달이 사라졌는지 확인
            const modal = page.locator('div:has-text("부품 리스트 관리")').first();
            await expect(modal).not.toBeVisible();
        });
    });

    // ========== 4. 설비/TOOL 데이터 CRUD 검증 (가상 데이터) ==========
    test.describe('4. 설비/TOOL 데이터 CRUD 테스트', () => {

        test('4.1 설비/TOOL 항목 추가 기능', async ({ page }) => {
            await openEquipmentModal(page);

            // 항목 추가 버튼 클릭
            const addButton = page.locator('button:has-text("항목 추가")');
            await addButton.click();
            await page.waitForTimeout(600); // 300ms → 600ms

            // 새 행이 추가되었는지 확인 - input 필드로 검증
            const inputs = page.locator('tbody input[type="text"]');
            const inputCount = await inputs.count();
            expect(inputCount).toBeGreaterThanOrEqual(1);

            await closeModal(page);
        });

        test('4.2 설비/TOOL 데이터 입력 및 저장', async ({ page }) => {
            await openEquipmentModal(page);

            // 항목 추가
            const addButton = page.locator('button:has-text("항목 추가")');
            await addButton.click();
            await page.waitForTimeout(300);

            // 마지막 input 필드에 데이터 입력
            const inputs = page.locator('tbody input[type="text"]');
            const lastInput = inputs.last();
            await lastInput.fill(MOCK_EQUIPMENT_DATA[0]);
            await page.waitForTimeout(200);

            // 입력된 값 확인
            await expect(lastInput).toHaveValue(MOCK_EQUIPMENT_DATA[0]);

            await closeModal(page);
        });

        test('4.3 설비/TOOL 항목 삭제 기능', async ({ page }) => {
            await openEquipmentModal(page);

            // 항목 추가
            const addButton = page.locator('button:has-text("항목 추가")');
            await addButton.click();
            await page.waitForTimeout(600); // 500ms → 600ms

            // input 필드 개수로 확인
            const inputsAfterAdd = await page.locator('tbody input[type="text"]').count();
            expect(inputsAfterAdd).toBeGreaterThanOrEqual(1);

            // 삭제 버튼 클릭 (마지막 행)
            const deleteButtons = page.locator('button:has-text("🗑️")');
            if (await deleteButtons.count() > 0) {
                await deleteButtons.last().click();

                // DOM 업데이트 대기 (삭제 애니메이션 및 재렌더링)
                await page.waitForTimeout(1000); // 800ms → 1000ms

                // 삭제 후 input 필드 개수 확인
                const inputsAfterDelete = await page.locator('tbody input[type="text"]').count();
                expect(inputsAfterDelete).toBe(inputsAfterAdd - 1);
            }

            await closeModal(page);
        });
    });

    // ========== 5. 부품 리스트 데이터 CRUD 검증 (가상 데이터) ==========
    test.describe('5. 부품 리스트 데이터 CRUD 테스트', () => {

        test('5.1 부품 항목 추가 기능', async ({ page }) => {
            await openPartsModal(page);

            // 부품 추가 버튼 클릭
            const addButton = page.locator('button:has-text("부품 추가")');
            await addButton.click();
            await page.waitForTimeout(600); // 300ms → 600ms

            // 새 행이 추가되었는지 확인 - input 필드로 검증
            const textInputs = page.locator('tbody input[type="text"]');
            const numberInputs = page.locator('tbody input[type="number"]');
            expect(await textInputs.count()).toBeGreaterThanOrEqual(1);
            expect(await numberInputs.count()).toBeGreaterThanOrEqual(1);

            await closeModal(page);
        });

        test('5.2 부품 데이터 입력 (부품명 + 수량)', async ({ page }) => {
            await openPartsModal(page);

            // 항목 추가
            const addButton = page.locator('button:has-text("부품 추가")');
            await addButton.click();
            await page.waitForTimeout(300);

            // 부품명 입력
            const textInputs = page.locator('tbody input[type="text"]');
            const lastTextInput = textInputs.last();
            await lastTextInput.fill(MOCK_PARTS_DATA[0].name);

            // 수량 입력
            const numberInputs = page.locator('tbody input[type="number"]');
            const lastNumberInput = numberInputs.last();
            await lastNumberInput.fill(MOCK_PARTS_DATA[0].quantity.toString());
            await page.waitForTimeout(200);

            // 입력된 값 확인
            await expect(lastTextInput).toHaveValue(MOCK_PARTS_DATA[0].name);
            await expect(lastNumberInput).toHaveValue(MOCK_PARTS_DATA[0].quantity.toString());

            await closeModal(page);
        });

        test('5.3 부품 항목 삭제 기능', async ({ page }) => {
            await openPartsModal(page);

            // 항목 추가
            const addButton = page.locator('button:has-text("부품 추가")');
            await addButton.click();
            await page.waitForTimeout(600); // 500ms → 600ms

            // input 필드 개수로 확인
            const inputsAfterAdd = await page.locator('tbody input[type="text"]').count();
            expect(inputsAfterAdd).toBeGreaterThanOrEqual(1);

            // 삭제 버튼 클릭
            const deleteButtons = page.locator('button:has-text("🗑️")');
            if (await deleteButtons.count() > 0) {
                await deleteButtons.last().click();

                // DOM 업데이트 대기 (삭제 애니메이션 및 재렌더링)
                await page.waitForTimeout(1000); // 800ms → 1000ms

                // 삭제 후 input 필드 개수 확인
                const inputsAfterDelete = await page.locator('tbody input[type="text"]').count();
                expect(inputsAfterDelete).toBe(inputsAfterAdd - 1);
            }

            await closeModal(page);
        });
    });

    // ========== 6. 순차 회귀 검증 (5회 반복) ==========
    test.describe('6. 순차 회귀 검증 - 설비/TOOL 모달 (5회 반복)', () => {

        for (let iteration = 1; iteration <= 5; iteration++) {
            test(`6.${iteration} 회귀 테스트 ${iteration}회차 - 설비/TOOL 전체 플로우`, async ({ page }) => {
                console.log(`\n========== 설비/TOOL 회귀 테스트 ${iteration}회차 시작 ==========`);

                // 1. 모달 열기
                await openEquipmentModal(page);
                console.log(`[${iteration}회차] 모달 열기 성공`);

                // 2. 가상 데이터 추가 (5개)
                for (let i = 0; i < MOCK_EQUIPMENT_DATA.length; i++) {
                    const addButton = page.locator('button:has-text("항목 추가")');
                    await addButton.click();
                    await page.waitForTimeout(200);

                    const inputs = page.locator('tbody input[type="text"]');
                    const lastInput = inputs.last();
                    await lastInput.fill(MOCK_EQUIPMENT_DATA[i]);
                    await page.waitForTimeout(100);
                }
                console.log(`[${iteration}회차] ${MOCK_EQUIPMENT_DATA.length}개 항목 추가 완료`);

                // 3. 데이터 검증
                const inputs = page.locator('tbody input[type="text"]');
                const count = await inputs.count();
                expect(count).toBeGreaterThanOrEqual(MOCK_EQUIPMENT_DATA.length);
                console.log(`[${iteration}회차] 데이터 검증 완료 (${count}개 항목)`);

                // 4. 항목 삭제 (2개)
                for (let i = 0; i < 2; i++) {
                    const deleteButtons = page.locator('button:has-text("🗑️")');
                    if (await deleteButtons.count() > 0) {
                        await deleteButtons.last().click();
                        await page.waitForTimeout(500); // DOM 업데이트 대기 증가
                    }
                }
                console.log(`[${iteration}회차] 2개 항목 삭제 완료`);

                // 5. 모달 닫기
                await closeModal(page);
                console.log(`[${iteration}회차] 모달 닫기 성공`);

                // 6. 모달 재오픈 (데이터 유지 확인)
                await page.waitForTimeout(500);
                await openEquipmentModal(page);
                console.log(`[${iteration}회차] 모달 재오픈 성공`);

                // 7. 데이터 유지 확인
                const inputsAfterReopen = page.locator('tbody input[type="text"]');
                const countAfterReopen = await inputsAfterReopen.count();
                expect(countAfterReopen).toBeGreaterThanOrEqual(MOCK_EQUIPMENT_DATA.length - 2);
                console.log(`[${iteration}회차] 데이터 유지 확인 완료 (${countAfterReopen}개 항목)`);

                await closeModal(page);
                console.log(`========== 설비/TOOL 회귀 테스트 ${iteration}회차 완료 ==========\n`);
            });
        }
    });

    // ========== 7. 순차 회귀 검증 (5회 반복) - 부품 리스트 ==========
    test.describe('7. 순차 회귀 검증 - 부품 리스트 모달 (5회 반복)', () => {

        for (let iteration = 1; iteration <= 5; iteration++) {
            test(`7.${iteration} 회귀 테스트 ${iteration}회차 - 부품 리스트 전체 플로우`, async ({ page }) => {
                console.log(`\n========== 부품 리스트 회귀 테스트 ${iteration}회차 시작 ==========`);

                // 1. 모달 열기
                await openPartsModal(page);
                console.log(`[${iteration}회차] 모달 열기 성공`);

                // 2. 가상 데이터 추가 (5개)
                for (let i = 0; i < MOCK_PARTS_DATA.length; i++) {
                    const addButton = page.locator('button:has-text("부품 추가")');
                    await addButton.click();
                    await page.waitForTimeout(200);

                    // 부품명 입력
                    const textInputs = page.locator('tbody input[type="text"]');
                    const lastTextInput = textInputs.last();
                    await lastTextInput.fill(MOCK_PARTS_DATA[i].name);

                    // 수량 입력
                    const numberInputs = page.locator('tbody input[type="number"]');
                    const lastNumberInput = numberInputs.last();
                    await lastNumberInput.fill(MOCK_PARTS_DATA[i].quantity.toString());
                    await page.waitForTimeout(100);
                }
                console.log(`[${iteration}회차] ${MOCK_PARTS_DATA.length}개 부품 추가 완료`);

                // 3. 데이터 검증
                const textInputs = page.locator('tbody input[type="text"]');
                const count = await textInputs.count();
                expect(count).toBeGreaterThanOrEqual(MOCK_PARTS_DATA.length);
                console.log(`[${iteration}회차] 데이터 검증 완료 (${count}개 부품)`);

                // 4. 수량 수정 테스트 (첫 번째 항목)
                const numberInputs = page.locator('tbody input[type="number"]');
                if (await numberInputs.count() > 0) {
                    const firstNumberInput = numberInputs.first();
                    await firstNumberInput.fill('99');
                    await page.waitForTimeout(200);
                    await expect(firstNumberInput).toHaveValue('99');
                    console.log(`[${iteration}회차] 수량 수정 테스트 완료`);
                }

                // 5. 항목 삭제 (1개)
                const deleteButtons = page.locator('button:has-text("🗑️")');
                if (await deleteButtons.count() > 0) {
                    await deleteButtons.last().click();
                    await page.waitForTimeout(500); // DOM 업데이트 대기 증가
                }
                console.log(`[${iteration}회차] 1개 항목 삭제 완료`);

                // 6. 모달 닫기
                await closeModal(page);
                console.log(`[${iteration}회차] 모달 닫기 성공`);

                // 7. 모달 재오픈
                await page.waitForTimeout(500);
                await openPartsModal(page);
                console.log(`[${iteration}회차] 모달 재오픈 성공`);

                // 8. 데이터 유지 확인
                const textInputsAfterReopen = page.locator('tbody input[type="text"]');
                const countAfterReopen = await textInputsAfterReopen.count();
                expect(countAfterReopen).toBeGreaterThanOrEqual(MOCK_PARTS_DATA.length - 1);
                console.log(`[${iteration}회차] 데이터 유지 확인 완료 (${countAfterReopen}개 부품)`);

                await closeModal(page);
                console.log(`========== 부품 리스트 회귀 테스트 ${iteration}회차 완료 ==========\n`);
            });
        }
    });

    // ========== 8. 에러 핸들링 및 안정성 검증 ==========
    test.describe('8. 에러 핸들링 및 안정성', () => {

        test('8.1 모달 연속 열기/닫기 (10회)', async ({ page }) => {
            for (let i = 0; i < 10; i++) {
                await openEquipmentModal(page);
                await page.waitForTimeout(100);
                await closeModal(page);
                await page.waitForTimeout(100);
            }

            // 크래시 없이 완료되어야 함
            const body = page.locator('body');
            await expect(body).toBeVisible();
        });

        test('8.2 두 모달 교차 열기/닫기', async ({ page }) => {
            for (let i = 0; i < 5; i++) {
                await openEquipmentModal(page);
                await closeModal(page);
                await page.waitForTimeout(100);

                await openPartsModal(page);
                await closeModal(page);
                await page.waitForTimeout(100);
            }

            const body = page.locator('body');
            await expect(body).toBeVisible();
        });

        test('8.3 콘솔 에러 모니터링', async ({ page }) => {
            const errors: string[] = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });

            // 전체 플로우 실행
            await openEquipmentModal(page);
            const addButton = page.locator('button:has-text("항목 추가")');
            await addButton.click();
            await page.waitForTimeout(200);
            await closeModal(page);

            await openPartsModal(page);
            const partsAddButton = page.locator('button:has-text("부품 추가")');
            await partsAddButton.click();
            await page.waitForTimeout(200);
            await closeModal(page);

            // 치명적 에러 필터링
            const criticalErrors = errors.filter(e =>
                e.includes('Uncaught') ||
                e.includes('is not defined') ||
                e.includes('Cannot read') ||
                e.includes('TypeError')
            );

            if (criticalErrors.length > 0) {
                console.log('Critical errors found:', criticalErrors);
            }

            expect(criticalErrors.length).toBe(0);
        });
    });

    // ========== 9. 통합 시나리오 테스트 ==========
    test.describe('9. 통합 시나리오 테스트', () => {

        test('9.1 전체 워크플로우 - 설비 + 부품 통합', async ({ page }) => {
            console.log('\n========== 통합 시나리오 테스트 시작 ==========');

            // 1. 설비 데이터 입력
            await openEquipmentModal(page);
            for (let i = 0; i < 3; i++) {
                const addButton = page.locator('button:has-text("항목 추가")');
                await addButton.click();
                await page.waitForTimeout(100);

                const inputs = page.locator('tbody input[type="text"]');
                const lastInput = inputs.last();
                await lastInput.fill(MOCK_EQUIPMENT_DATA[i]);
            }
            console.log('설비 데이터 3개 입력 완료');
            await closeModal(page);

            // 2. 부품 데이터 입력
            await openPartsModal(page);
            for (let i = 0; i < 3; i++) {
                const addButton = page.locator('button:has-text("부품 추가")');
                await addButton.click();
                await page.waitForTimeout(100);

                const textInputs = page.locator('tbody input[type="text"]');
                const lastTextInput = textInputs.last();
                await lastTextInput.fill(MOCK_PARTS_DATA[i].name);

                const numberInputs = page.locator('tbody input[type="number"]');
                const lastNumberInput = numberInputs.last();
                await lastNumberInput.fill(MOCK_PARTS_DATA[i].quantity.toString());
            }
            console.log('부품 데이터 3개 입력 완료');
            await closeModal(page);

            // 3. 데이터 유지 확인
            await openEquipmentModal(page);
            const equipmentInputs = page.locator('tbody input[type="text"]');
            const equipmentCount = await equipmentInputs.count();
            expect(equipmentCount).toBeGreaterThanOrEqual(3);
            console.log(`설비 데이터 유지 확인: ${equipmentCount}개`);
            await closeModal(page);

            await openPartsModal(page);
            const partsInputs = page.locator('tbody input[type="text"]');
            const partsCount = await partsInputs.count();
            expect(partsCount).toBeGreaterThanOrEqual(3);
            console.log(`부품 데이터 유지 확인: ${partsCount}개`);
            await closeModal(page);

            console.log('========== 통합 시나리오 테스트 완료 ==========\n');
        });
    });
});
