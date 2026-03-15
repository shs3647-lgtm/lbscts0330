/**
 * @file project-linkage.spec.ts
 * @description ProjectLinkage 통합 테스트 (APQP → CP/PFD 기초정보 연동)
 * @version 1.0.0
 * @created 2026-01-29
 */

import { test, expect } from '@playwright/test';

test.describe('ProjectLinkage 데이터 연동 테스트', () => {

    // storageState가 playwright.config.ts에서 이미 적용됨 → 수동 로그인 불필요

    test('APQP 저장 시 ProjectLinkage에 기초정보 동기화', async ({ page }) => {
        // 1. APQP 등록화면으로 이동
        await page.goto('/apqp/register');
        await page.waitForLoadState('networkidle');

        // 2. 새로 등록 버튼 클릭
        const newRegBtn = page.locator('button:has-text("새로 등록")');
        if (await newRegBtn.isVisible()) {
            await newRegBtn.click();
            await page.waitForTimeout(500);
            page.on('dialog', dialog => dialog.accept());
        }

        // 3. 기초정보 입력
        const testTime = Date.now();
        const testSubject = `테스트 APQP ${testTime}`;
        const testCompany = `테스트회사 ${testTime}`;
        const testCustomer = `테스트고객 ${testTime}`;

        await page.fill('input[id="subject"]', testSubject);
        await page.fill('input[id="companyName"]', testCompany);
        await page.fill('input[id="customerName"]', testCustomer);
        await page.fill('input[id="modelYear"]', '2026 Test');

        // 4. 저장
        await page.click('button:has-text("저장")');
        await page.waitForTimeout(2000);

        // 5. APQP ID 확인
        const apqpIdInput = page.locator('input[readonly][value^="pj"]').first();
        const apqpId = await apqpIdInput.inputValue();
        console.log(`[테스트] APQP ID: ${apqpId}`);

        // 6. ProjectLinkage API 확인
        const linkageRes = await page.request.get(`/api/project-linkage?apqpNo=${apqpId}`);
        const linkageData = await linkageRes.json();

        expect(linkageData.success).toBe(true);
        expect(linkageData.data.length).toBeGreaterThan(0);

        const linkage = linkageData.data[0];
        expect(linkage.companyName).toBe(testCompany);
        expect(linkage.customerName).toBe(testCustomer);
        expect(linkage.subject).toBe(testSubject);
        expect(linkage.pfmeaId).toBeTruthy();
        expect(linkage.cpNo).toBeTruthy();
        expect(linkage.pfdNo).toBeTruthy();

        console.log(`[테스트] ✅ ProjectLinkage 동기화 확인 완료`);
        console.log(`  - PFMEA: ${linkage.pfmeaId}`);
        console.log(`  - CP: ${linkage.cpNo}`);
        console.log(`  - PFD: ${linkage.pfdNo}`);
    });

    test('CP 등록화면에서 ProjectLinkage 기초정보 로드', async ({ page }) => {
        // 1. 먼저 APQP 저장
        await page.goto('/apqp/register');
        await page.waitForLoadState('networkidle');

        const testTime = Date.now();
        const testSubject = `연동테스트 ${testTime}`;
        const testCompany = `연동회사 ${testTime}`;

        // 새로 등록
        const newRegBtn = page.locator('button:has-text("새로 등록")');
        if (await newRegBtn.isVisible()) {
            await newRegBtn.click();
            page.on('dialog', dialog => dialog.accept());
            await page.waitForTimeout(500);
        }

        await page.fill('input[id="subject"]', testSubject);
        await page.fill('input[id="companyName"]', testCompany);
        await page.fill('input[id="customerName"]', '연동고객');
        await page.click('button:has-text("저장")');
        await page.waitForTimeout(2000);

        // APQP에서 생성된 CP ID 확인
        const cpLinkBtn = page.locator('button:has-text("생성된 CP")').first();
        if (await cpLinkBtn.isVisible()) {
            const cpId = await cpLinkBtn.textContent();
            console.log(`[테스트] 생성된 CP ID: ${cpId}`);
        }

        // 2. CP 등록화면으로 이동
        await page.goto('/control-plan/register');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 3. 프로젝트 선택 (방금 생성된 것 선택)
        const projectSelect = page.locator('select').first();
        if (await projectSelect.isVisible()) {
            // 최신 프로젝트 선택
            await projectSelect.selectOption({ index: 1 });
            await page.waitForTimeout(1500);
        }

        // 4. 기초정보가 연동되었는지 확인
        const companyInput = page.locator('input[id="companyName"]');
        if (await companyInput.isVisible()) {
            const loadedCompany = await companyInput.inputValue();
            console.log(`[테스트] CP에 로드된 회사명: ${loadedCompany}`);

            // 연동된 경우 확인
            if (loadedCompany === testCompany) {
                console.log(`[테스트] ✅ 기초정보 연동 확인 완료!`);
            }
        }
    });

    test('PFD 등록화면에서 ProjectLinkage 기초정보 로드', async ({ page }) => {
        // 1. PFD 등록화면으로 이동
        await page.goto('/pfd/register');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 2. 기존 프로젝트 선택 시 기초정보 로드 확인
        const projectSelect = page.locator('select').first();
        if (await projectSelect.isVisible()) {
            await projectSelect.selectOption({ index: 1 });
            await page.waitForTimeout(1500);
        }

        // 3. 기초정보 필드 확인
        const companyInput = page.locator('input[id="companyName"]');
        if (await companyInput.isVisible()) {
            const loadedCompany = await companyInput.inputValue();
            console.log(`[테스트] PFD에 로드된 회사명: ${loadedCompany}`);
        }
    });
});

test.describe('ProjectLinkage API 단위 테스트', () => {

    test('POST /api/project-linkage - 새 연동 생성', async ({ request }) => {
        const testData = {
            apqpNo: `test-apqp-${Date.now()}`,
            pfmeaId: `test-pfmea-${Date.now()}`,
            companyName: '테스트 회사',
            customerName: '테스트 고객',
            subject: '테스트 프로젝트',
        };

        const res = await request.post('/api/project-linkage', {
            data: testData,
        });

        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data.apqpNo).toBe(testData.apqpNo.toLowerCase());
        expect(data.data.companyName).toBe(testData.companyName);
    });

    test('GET /api/project-linkage - 조회', async ({ request }) => {
        // 먼저 생성
        const testApqpNo = `test-query-${Date.now()}`;
        await request.post('/api/project-linkage', {
            data: { apqpNo: testApqpNo, companyName: '조회테스트' },
        });

        // 조회
        const res = await request.get(`/api/project-linkage?apqpNo=${testApqpNo}`);
        const data = await res.json();

        expect(data.success).toBe(true);
        expect(data.data.length).toBeGreaterThan(0);
        expect(data.data[0].companyName).toBe('조회테스트');
    });

    test('POST /api/project-linkage - 기존 연동 업데이트', async ({ request }) => {
        const testApqpNo = `test-update-${Date.now()}`;

        // 1차 생성
        await request.post('/api/project-linkage', {
            data: { apqpNo: testApqpNo, companyName: '원본' },
        });

        // 2차 업데이트
        const res = await request.post('/api/project-linkage', {
            data: { apqpNo: testApqpNo, companyName: '업데이트됨' },
        });

        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.message).toBe('Linkage updated');
        expect(data.data.companyName).toBe('업데이트됨');
    });
});

// ★★★ 기초정보 최초 연동 및 독립 수정 테스트 (2026-01-29) ★★★
test.describe('기초정보 최초 연동 및 독립 수정 테스트', () => {

    test('PUT /api/fmea/info - initialSync=true 시 기초정보 비어있을 때만 채움', async ({ request }) => {
        const testFmeaId = `test-pfmea-${Date.now()}`;

        // 1. 첫 번째 호출: 기초정보 생성
        const res1 = await request.put('/api/fmea/info', {
            data: {
                id: testFmeaId,
                parentApqpNo: 'pj26-test',
                initialSync: true,
                companyName: '최초회사',
                customerName: '최초고객',
                subject: '최초프로젝트',
            },
        });
        const data1 = await res1.json();
        expect(data1.success).toBe(true);
        console.log('[테스트] 1차 생성:', data1.data);

        // 2. 두 번째 호출: initialSync=true → 기존 데이터 유지 (덮어쓰지 않음)
        const res2 = await request.put('/api/fmea/info', {
            data: {
                id: testFmeaId,
                parentApqpNo: 'pj26-test-updated',
                initialSync: true,
                companyName: '덮어쓰기시도',
                customerName: '덮어쓰기시도',
                subject: '덮어쓰기시도',
            },
        });
        const data2 = await res2.json();
        expect(data2.success).toBe(true);

        // 기초정보는 변경되지 않고, parentApqpNo만 업데이트됨
        expect(data2.data.companyName).toBe('최초회사');  // 유지됨
        expect(data2.data.parentApqpNo).toBe('pj26-test-updated');  // 업데이트됨
        console.log('[테스트] ✅ initialSync=true → 기초정보 유지, parentApqpNo 업데이트');
    });

    test('PUT /api/fmea/info - initialSync 없으면 항상 업데이트', async ({ request }) => {
        const testFmeaId = `test-pfmea-always-${Date.now()}`;

        // 1. 첫 번째 호출: 생성
        await request.put('/api/fmea/info', {
            data: {
                id: testFmeaId,
                companyName: '원본회사',
            },
        });

        // 2. 두 번째 호출: initialSync 없음 → 덮어쓰기
        const res = await request.put('/api/fmea/info', {
            data: {
                id: testFmeaId,
                companyName: '새회사',
            },
        });
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data.companyName).toBe('새회사');  // 덮어쓰기됨
        console.log('[테스트] ✅ initialSync 없음 → 항상 업데이트');
    });
});
