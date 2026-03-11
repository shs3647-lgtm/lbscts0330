import { test, expect } from '@playwright/test';

test.describe('DFMEA APQP Linkage - Full Flow', () => {

    test('APQP 선택 후 기초정보 로드 확인', async ({ page, request }) => {
        // 1. 테스트용 APQP 생성 (API)
        const apqpNo = `pj26-test-${Date.now()}`;
        const res = await request.post('/api/apqp', {
            data: {
                apqpNo,
                apqpInfo: {
                    companyName: '테스트회사ABC',
                    customerName: '테스트고객XYZ',
                    subject: '테스트프로젝트123',
                    apqpStartDate: '2026-01-29',
                    confidentialityLevel: '비밀'
                }
            }
        });
        expect(res.ok()).toBeTruthy();
        console.log('✅ APQP 생성 완료:', apqpNo);

        // 2. DFMEA 신규 등록 페이지 진입
        await page.goto('/dfmea/register');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // 3. ID 확인
        const idElement = page.getByTitle('클릭하여 DFMEA 리스트로 이동');
        const idText = await idElement.innerText();
        console.log('Generated DFMEA ID:', idText);

        // 4. 상위 APQP 셀 클릭 → 모달 열기
        await page.locator('text=- (클릭하여 선택)').first().click();
        await page.waitForTimeout(500);

        // 5. 모달에서 방금 생성한 APQP 검색
        await page.fill('input[placeholder="APQP No 또는 이름으로 검색..."]', apqpNo);
        await page.waitForTimeout(300);

        // 6. 검색 결과 클릭
        await page.locator(`text=${apqpNo}`).first().click();
        await page.waitForTimeout(1000); // API 호출 대기

        // 7. 기초정보가 로드되었는지 확인
        console.log('=== 기초정보 로드 결과 ===');

        const companyInput = page.locator('input[placeholder="회사 명"]');
        const companyValue = await companyInput.inputValue();
        console.log('회사명:', companyValue);

        const customerInput = page.locator('input[placeholder="고객 명"]');
        const customerValue = await customerInput.inputValue();
        console.log('고객명:', customerValue);

        const subjectInput = page.locator('input[placeholder="시스템, 서브시스템 및/또는 구성품"]');
        const subjectValue = await subjectInput.inputValue();
        console.log('Subject:', subjectValue);

        // 8. 값 검증
        expect(companyValue).toBe('테스트회사ABC');
        expect(customerValue).toBe('테스트고객XYZ');
        expect(subjectValue).toBe('테스트프로젝트123');
    });
});
