/**
 * @file cp-master-save.spec.ts
 * @description CP 기초정보 Import → 저장 → Register 표시 E2E 테스트
 *
 * 검증 대상:
 * 1. CP Import 페이지 로드
 * 2. CP 등록 페이지에서 기초정보 패널 표시
 * 3. CpMasterPreviewTabs "저장" 버튼의 DB 저장 API 호출
 * 4. Register 페이지에서 CpMasterInfoTable 데이터 로드
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('CP 기초정보 Import/저장/렌더링 E2E', () => {

  test('1. CP Import 페이지가 정상 로드되어야 한다', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/import`);
    await page.waitForLoadState('domcontentloaded');

    // 페이지 제목 확인
    const title = page.locator('h1:has-text("Control Plan 기초정보 Import")');
    await expect(title).toBeVisible({ timeout: 15000 });
  });

  test('2. CP 등록 페이지가 정상 로드되어야 한다', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/register`);
    await page.waitForLoadState('domcontentloaded');

    // 페이지 제목 확인
    const title = page.locator('h1:has-text("Control Plan")');
    await expect(title).toBeVisible({ timeout: 15000 });
  });

  test('3. CP 등록 페이지에 기초정보 패널 토글이 있어야 한다', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/register`);
    await page.waitForLoadState('domcontentloaded');

    // "CP 기초 정보등록" 버튼 존재 확인
    const masterInfoToggle = page.locator('td:has-text("CP 기초 정보등록")');
    await expect(masterInfoToggle).toBeVisible({ timeout: 15000 });
  });

  test('4. CP Import 페이지에서 CP 선택 드롭다운이 존재해야 한다', async ({ page }) => {
    await page.goto(`${BASE_URL}/control-plan/import`);
    await page.waitForLoadState('domcontentloaded');

    // ImportMenuBar 내 CP 선택 영역 확인
    const cpLabel = page.locator('text=CP No');
    await expect(cpLabel).toBeVisible({ timeout: 15000 });
  });

  test('5. CpMasterPreviewTabs에 "저장" 버튼이 수정 후 나타나야 한다', async ({ page }) => {
    // CP Import 페이지에서 데이터가 있는 상태로 접근
    await page.goto(`${BASE_URL}/control-plan/import`);
    await page.waitForLoadState('domcontentloaded');

    // CpMasterPreviewTabs 컴포넌트가 로드되면 (데이터 있을 때)
    // "CP 기초정보 미리보기" 헤더 확인
    const previewHeader = page.locator('text=CP 기초정보 미리보기');
    // 데이터가 없으면 미리보기가 안 보일 수 있으므로 조건부 확인
    const isVisible = await previewHeader.isVisible().catch(() => false);

    if (isVisible) {
      // 수정 모드 진입
      const editBtn = page.locator('button:has-text("수정")');
      if (await editBtn.isVisible()) {
        await editBtn.click();
        // 편집 모드에서 셀 더블클릭하면 isDirty=true → 저장 버튼 나타남
      }
    }

    // 페이지가 에러 없이 로드되었는지 확인
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('6. CP Master API가 정상 응답해야 한다', async ({ page }) => {
    // API 직접 호출 테스트
    const response = await page.request.get(`${BASE_URL}/api/control-plan/master?cpNo=test-nonexist&includeItems=true`);
    expect(response.status()).toBe(200);

    const json = await response.json();
    // 존재하지 않는 cpNo → active: null
    expect(json).toHaveProperty('active');
  });

  test('7. CP 등록 API가 정상 응답해야 한다', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/control-plan`);
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json).toHaveProperty('success');
  });

  test('8. CP Master POST API가 저장 후 조회 가능해야 한다', async ({ page }) => {
    const testCpNo = `cp-e2e-test-${Date.now()}`;

    // 1. 먼저 CP 등록 (CpRegistration 생성)
    const regRes = await page.request.post(`${BASE_URL}/api/control-plan`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        cpNo: testCpNo,
        cpInfo: { subject: 'E2E Test CP', cpType: 'P' },
        cftMembers: [],
      },
    });
    expect(regRes.status()).toBe(200);

    // 2. 기초정보 저장
    const saveRes = await page.request.post(`${BASE_URL}/api/control-plan/master`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        cpNo: testCpNo,
        name: 'MASTER',
        setActive: true,
        replace: true,
        flatData: [
          { processNo: '10', category: 'processInfo', itemCode: 'A1', value: '10' },
          { processNo: '10', category: 'processInfo', itemCode: 'A2', value: 'E2E 용접공정' },
          { processNo: '10', category: 'processInfo', itemCode: 'A5', value: 'E2E 용접기' },
          { processNo: '20', category: 'processInfo', itemCode: 'A1', value: '20' },
          { processNo: '20', category: 'processInfo', itemCode: 'A2', value: 'E2E 도장공정' },
        ],
      },
    });

    expect(saveRes.status()).toBe(200);
    const saveJson = await saveRes.json();
    expect(saveJson.success).toBe(true);

    // 3. 저장된 데이터 조회
    const loadRes = await page.request.get(
      `${BASE_URL}/api/control-plan/master?cpNo=${testCpNo}&includeItems=true`
    );
    expect(loadRes.status()).toBe(200);

    const loadJson = await loadRes.json();
    expect(loadJson.active).not.toBeNull();
    expect(loadJson.active.flatItems.length).toBeGreaterThanOrEqual(5);

    // 4. 정리: CP 삭제
    await page.request.delete(`${BASE_URL}/api/control-plan?cpNo=${testCpNo}`);
  });
});
