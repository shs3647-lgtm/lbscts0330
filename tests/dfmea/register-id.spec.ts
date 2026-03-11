import { test, expect } from '@playwright/test';

test.describe('DFMEA Register - ID Generation & Linkage', () => {
    test.beforeEach(async ({ page }) => {
        // 1. 로그인 (필요한 경우)
        // await page.goto('/login');
        // ...
    });

    test('should automatically generate FMEA ID on new registration', async ({ page }) => {
        // 1. DFMEA 등록 페이지 진입
        await page.goto('/dfmea/register');
        await page.waitForLoadState('networkidle');

        // 2. FMEA ID 필드 확인 (dfmXX-pXXX 형식)
        // FMEA ID는 텍스트로 렌더링됨
        const idElement = page.getByTitle('클릭하여 DFMEA 리스트로 이동');
        const idText = await idElement.innerText();
        console.log('Generated ID:', idText);

        expect(idText).toMatch(/^dfm\d{2}-[pP]\d{3}$/);

        // 3. 페이지 새로고침 후에도 유지되는지 확인 (URL 파라미터로 이동했을 것임)
        // 하지만 신규 등록 시 URL은 변경되지 않을 수 있음
        // 저장 전까지는 유지되어야 함
    });

    test('should generate DFMEA automatically when creating APQP', async ({ page, request }) => {
        // 1. APQP 생성 (API 사용)
        const apqpNo = `pj26-e2e-test-${Date.now()}`;
        const response = await request.post('/api/apqp', {
            data: {
                apqpNo,
                apqpInfo: {
                    companyName: 'E2E Test Company',
                    customerName: 'E2E Customer',
                    subject: 'E2E APQP Project',
                    apqpStartDate: '2026-01-29',
                    confidentialityLevel: 'Confidential'
                }
            }
        });
        expect(response.ok()).toBeTruthy();

        // 2. DFMEA 자동 생성 확인 (API 사용)
        const dfmeaRes = await request.get(`/api/project-linkage?apqpNo=${apqpNo}`);
        expect(dfmeaRes.ok()).toBeTruthy();
        const linkageData = await dfmeaRes.json();

        const dfmeaId = linkageData.data[0].dfmeaId;
        console.log('Linked DFMEA ID:', dfmeaId);
        expect(dfmeaId).toBeTruthy();

        // 3. DFMEA 페이지에서 데이터 확인
        await page.goto(`/dfmea/register?id=${dfmeaId}`);
        await page.waitForLoadState('networkidle');

        // 회사명, 고객명 등 기초정보 확인
        await expect(page.locator('input[placeholder="회사 명"]')).toHaveValue('E2E Test Company');
        await expect(page.locator('input[placeholder="고객 명"]')).toHaveValue('E2E Customer');
        await expect(page.locator('input[placeholder="시스템, 서브시스템 및/또는 구성품"]')).toHaveValue('E2E APQP Project');
    });
});
