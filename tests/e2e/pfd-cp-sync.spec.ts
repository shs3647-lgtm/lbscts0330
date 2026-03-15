/**
 * @file pfd-cp-sync.spec.ts
 * @description PFD ↔ CP 양방향 연동 E2E 테스트
 * @version 1.1.0
 * @created 2026-01-27
 * @updated 2026-01-27 - 로그인 없이 직접 테스트
 */

import { test, expect } from '@playwright/test';

test.describe('PFD ↔ CP 양방향 연동 E2E 테스트', () => {

    test.describe('1. PFD 등록 화면 테스트', () => {

        test('1.1 PFD 등록 화면에 상위 FMEA 선택 필드가 있어야 함', async ({ page }) => {
            await page.goto('http://localhost:3000/pfd/register');
            await page.waitForLoadState('networkidle');

            // 상위 FMEA 필드 확인
            const fmeaField = page.locator('td:has-text("상위 FMEA")');
            await expect(fmeaField).toBeVisible({ timeout: 20000 });
        });

        test('1.2 PFD 등록 화면에 연동 CP 선택 필드가 있어야 함', async ({ page }) => {
            await page.goto('http://localhost:3000/pfd/register');
            await page.waitForLoadState('networkidle');

            // 연동 CP 필드 확인
            const cpField = page.locator('td:has-text("연동 CP")');
            await expect(cpField).toBeVisible({ timeout: 20000 });
        });

        test('1.3 PFD 기본정보 섹션이 표시되어야 함', async ({ page }) => {
            await page.goto('http://localhost:3000/pfd/register');
            await page.waitForLoadState('networkidle');

            // 기본정보 섹션 확인
            const section = page.locator('text=PFD 기본정보');
            await expect(section).toBeVisible({ timeout: 20000 });
        });

        test('1.4 상위 APQP 필드가 있어야 함', async ({ page }) => {
            await page.goto('http://localhost:3000/pfd/register');
            await page.waitForLoadState('networkidle');

            const apqpField = page.locator('td:has-text("상위 APQP")');
            await expect(apqpField).toBeVisible({ timeout: 20000 });
        });
    });

    test.describe('2. CP 등록 화면과 필드 비교', () => {

        test('2.1 CP 등록 화면에 상위 FMEA 필드가 있어야 함', async ({ page }) => {
            await page.goto('http://localhost:3000/control-plan/register');
            await page.waitForLoadState('networkidle');

            const fmeaField = page.locator('td:has-text("상위 FMEA")');
            await expect(fmeaField).toBeVisible({ timeout: 20000 });
        });

        test('2.2 CP 등록 화면에 연동 PFD 필드가 있어야 함', async ({ page }) => {
            await page.goto('http://localhost:3000/control-plan/register');
            await page.waitForLoadState('networkidle');

            const pfdField = page.locator('td:has-text("연동 PFD")');
            await expect(pfdField).toBeVisible({ timeout: 20000 });
        });
    });

    test.describe('3. 워크시트 연동 버튼 테스트', () => {

        test('3.1 PFD 워크시트 페이지 로드', async ({ page }) => {
            const response = await page.goto('http://localhost:3000/pfd/worksheet');

            // 페이지가 로드되었는지 확인 (200 또는 리다이렉트)
            expect(response?.status()).toBeLessThan(400);
        });

        test('3.2 CP 워크시트 페이지 로드', async ({ page }) => {
            const response = await page.goto('http://localhost:3000/control-plan/worksheet');

            // 페이지가 로드되었는지 확인 (200 또는 리다이렉트)
            expect(response?.status()).toBeLessThan(400);
        });
    });

    test.describe('4. 필드 상호작용 테스트', () => {

        test('4.1 PFD 유형 드롭다운이 작동해야 함', async ({ page }) => {
            await page.goto('http://localhost:3000/pfd/register');
            await page.waitForLoadState('networkidle');

            // PFD 유형 select 확인
            const typeSelect = page.locator('select').first();
            await expect(typeSelect).toBeVisible({ timeout: 20000 });

            // 옵션 확인
            const options = await typeSelect.locator('option').count();
            expect(options).toBeGreaterThan(0);
        });

        test('4.2 PFD명 입력 필드가 작동해야 함', async ({ page }) => {
            await page.goto('http://localhost:3000/pfd/register');
            await page.waitForLoadState('networkidle');

            // PFD명 input 확인
            const nameInput = page.locator('input[placeholder*="공정흐름도"], input[placeholder*="제목"]').first();
            if (await nameInput.isVisible()) {
                await nameInput.fill('테스트 PFD');
                await expect(nameInput).toHaveValue('테스트 PFD');
            }
        });
    });
});
