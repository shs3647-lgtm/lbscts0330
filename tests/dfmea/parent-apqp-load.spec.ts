import { test, expect } from '@playwright/test';

test.describe('DFMEA Parent APQP Load', () => {

    test('편집 모드에서 parentApqpNo 로드 확인', async ({ page, request }) => {
        // 1. APQP 생성
        const apqpNo = `pj26-parent-test-${Date.now()}`;
        await request.post('/api/apqp', {
            data: {
                apqpNo,
                apqpInfo: {
                    companyName: '상위APQP회사',
                    customerName: '상위APQP고객',
                    subject: '상위APQP프로젝트',
                    apqpStartDate: '2026-01-29'
                }
            }
        });

        // 2. ProjectLinkage에서 DFMEA ID 확인
        const linkageRes = await request.get(`/api/project-linkage?apqpNo=${apqpNo}`);
        const linkageData = await linkageRes.json();
        const dfmeaId = linkageData.data[0].dfmeaId;
        console.log('DFMEA ID:', dfmeaId, 'from APQP:', apqpNo);

        // 3. DFMEA 편집 모드로 페이지 열기
        await page.goto(`/dfmea/register?id=${dfmeaId}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 4. 상위 APQP가 표시되는지 확인
        // "APQP" 배지와 apqpNo가 표시되어야 함
        const apqpBadge = page.locator('text=APQP').first();
        await expect(apqpBadge).toBeVisible({ timeout: 5000 });

        const apqpDisplay = page.locator(`text=${apqpNo}`);
        await expect(apqpDisplay).toBeVisible({ timeout: 5000 });

        console.log('✅ 상위 APQP 표시 확인:', apqpNo);
    });
});
