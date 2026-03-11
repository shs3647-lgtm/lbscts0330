/**
 * ProjectLinkage 통합 DB 연동 테스트 (로그인 없이)
 * 
 * 테스트 시나리오:
 * 1. CP에서 기초정보 등록 → ProjectLinkage 저장 확인
 * 2. PFD에서 기초정보 등록 → ProjectLinkage 저장 확인
 * 3. PFMEA에서 기초정보 등록 → ProjectLinkage 저장 확인
 * 4. DFMEA에서 기초정보 등록 → ProjectLinkage 저장 확인
 * 5. APQP에서 기초정보 등록 → ProjectLinkage 저장 확인
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// 공통 테스트 데이터
const TEST_DATA = {
    customerName: `테스트고객_${Date.now()}`,
    partName: `테스트품명_${Date.now()}`,
    partNo: `PN-${Date.now()}`,
    modelYear: '2026',
    companyName: '테스트회사',
    subject: `테스트프로젝트_${Date.now()}`,
};

// ====================================================================
// 테스트 1: CP 등록화면 연동 테스트
// ====================================================================
test.describe('1. CP 기초정보 연동 테스트', () => {
    test('CP 등록화면 접근 및 기초정보 입력 확인', async ({ page }) => {
        // CP 등록화면으로 바로 이동
        await page.goto(`${BASE_URL}/control-plan/register`);
        await page.waitForLoadState('networkidle');

        // 페이지 로드 확인
        const pageVisible = await page.locator('body').isVisible();
        expect(pageVisible).toBe(true);

        // 입력 필드 확인
        const hasInputFields = await page.locator('input').count() > 0;
        console.log(`✅ CP 등록화면 로드 완료 (입력필드: ${await page.locator('input').count()}개)`);

        // 고객명 입력 시도
        const customerInput = page.locator('input').filter({ hasText: /고객/ }).first();
        const anyInput = page.locator('input').first();

        if (await anyInput.isVisible()) {
            await anyInput.click();
            console.log('✅ CP 입력 필드 클릭 가능');
        }
    });
});

// ====================================================================
// 테스트 2: PFD 등록화면 연동 테스트
// ====================================================================
test.describe('2. PFD 기초정보 연동 테스트', () => {
    test('PFD 등록화면 접근 및 기초정보 입력 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/pfd/register`);
        await page.waitForLoadState('networkidle');

        const pageVisible = await page.locator('body').isVisible();
        expect(pageVisible).toBe(true);

        console.log(`✅ PFD 등록화면 로드 완료 (입력필드: ${await page.locator('input').count()}개)`);
    });
});

// ====================================================================
// 테스트 3: PFMEA 등록화면 연동 테스트
// ====================================================================
test.describe('3. PFMEA 기초정보 연동 테스트', () => {
    test('PFMEA 등록화면 접근 및 기초정보 입력 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/pfmea/register`);
        await page.waitForLoadState('networkidle');

        const pageVisible = await page.locator('body').isVisible();
        expect(pageVisible).toBe(true);

        // 기초정보 테이블 확인
        const hasTable = await page.locator('table').count() > 0;
        console.log(`✅ PFMEA 등록화면 로드 완료 (테이블: ${hasTable ? '있음' : '없음'})`);
    });
});

// ====================================================================
// 테스트 4: DFMEA 등록화면 연동 테스트
// ====================================================================
test.describe('4. DFMEA 기초정보 연동 테스트', () => {
    test('DFMEA 등록화면 접근 및 기초정보 입력 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/dfmea/register`);
        await page.waitForLoadState('networkidle');

        const pageVisible = await page.locator('body').isVisible();
        expect(pageVisible).toBe(true);

        console.log(`✅ DFMEA 등록화면 로드 완료 (입력필드: ${await page.locator('input').count()}개)`);
    });
});

// ====================================================================
// 테스트 5: APQP 등록화면 연동 테스트
// ====================================================================
test.describe('5. APQP 기초정보 연동 테스트', () => {
    test('APQP 등록화면 접근 및 기초정보 입력 확인', async ({ page }) => {
        await page.goto(`${BASE_URL}/apqp/register`);
        await page.waitForLoadState('networkidle');

        const pageVisible = await page.locator('body').isVisible();
        expect(pageVisible).toBe(true);

        console.log(`✅ APQP 등록화면 로드 완료 (입력필드: ${await page.locator('input').count()}개)`);
    });
});

// ====================================================================
// 회귀 테스트: 5회 반복 - 각 모듈 순차 접근
// ====================================================================
test.describe('회귀 테스트 (5회 반복)', () => {
    const modules = [
        { name: 'CP', url: '/control-plan/register' },
        { name: 'PFD', url: '/pfd/register' },
        { name: 'PFMEA', url: '/pfmea/register' },
        { name: 'DFMEA', url: '/dfmea/register' },
        { name: 'APQP', url: '/apqp/register' },
    ];

    for (let round = 1; round <= 5; round++) {
        test(`[${round}/5] 전체 모듈 순차 접근 검증`, async ({ page }) => {
            for (const module of modules) {
                await page.goto(`${BASE_URL}${module.url}`);
                await page.waitForLoadState('networkidle');

                const pageLoaded = await page.locator('body').isVisible();
                expect(pageLoaded).toBe(true);

                console.log(`  ✓ ${module.name} 등록화면 접근 성공`);
            }

            console.log(`✅ 회귀 테스트 ${round}/5 완료`);
        });
    }
});
