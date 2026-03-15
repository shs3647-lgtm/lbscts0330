/**
 * @file register-duplicate-check.spec.ts
 * @description PFMEA 등록화면 FMEA명 중복 검증 테스트
 * 
 * 검증 항목:
 * 1. 등록화면 로드 시 FMEA명 목록 자동 로드
 * 2. FMEA명 입력 시 중복 경고 표시
 * 3. 저장 시 중복 confirm 표시
 * 4. 새 문서 생성 모달에서 중복 confirm 표시
 * 5. FMEA명 검색 모달(🔍) 열기
 * 6. 연동 CP/PFD 모달(🔗) 열기
 */

import { test, expect } from '@playwright/test';

test.describe('PFMEA 등록화면 중복 검증', () => {

  // storageState가 playwright.config.ts에서 이미 적용됨 → 수동 로그인 불필요

  test('1. 등록화면 로드 후 FMEA명 목록 자동 로드 (API 호출 확인)', async ({ page }) => {
    let fmeaProjectsApiCalled = false;

    page.on('response', (response) => {
      if (response.url().includes('/api/fmea/projects') && response.status() === 200) {
        fmeaProjectsApiCalled = true;
      }
    });

    await page.goto('/pfmea/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    expect(fmeaProjectsApiCalled).toBe(true);
  });

  test('2. FMEA명 중복 입력 시 경고 표시', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 기존 FMEA 프로젝트 목록 조회하여 이름 가져오기
    const apiRes = await page.request.get('/api/fmea/projects');
    const apiData = await apiRes.json();

    if (!apiData.success || !apiData.projects || apiData.projects.length < 2) {
      test.skip(true, 'FMEA 프로젝트가 2개 미만이라 중복 테스트 불가');
      return;
    }

    // 현재 로드된 FMEA가 아닌 다른 FMEA의 이름 가져오기
    const currentId = await page.locator('span.text-blue-600').first().textContent();
    const otherProject = apiData.projects.find(
      (p: any) => p.id?.toLowerCase() !== currentId?.toLowerCase() && p.fmeaInfo?.subject
    );

    if (!otherProject) {
      test.skip(true, '중복 테스트할 다른 FMEA 프로젝트가 없음');
      return;
    }

    const duplicateName = otherProject.fmeaInfo.subject;
    console.log(`[테스트] 중복 테스트 이름: "${duplicateName}"`);

    // FMEA명 필드 클리어 후 중복 이름 입력
    const fmeaNameInput = page.locator('input[placeholder*="시스템"]').first();
    await fmeaNameInput.click();
    await page.waitForTimeout(1500);
    await fmeaNameInput.fill('');
    await fmeaNameInput.fill(duplicateName);
    await page.waitForTimeout(1000);

    // 중복 경고 메시지 확인
    const warning = page.locator('text=중복됩니다');
    await expect(warning).toBeVisible({ timeout: 5000 });
    console.log('[테스트] ✅ 중복 경고 표시 확인');
  });

  test('3. 중복 이름으로 저장 시 confirm 다이얼로그 표시', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const apiRes = await page.request.get('/api/fmea/projects');
    const apiData = await apiRes.json();

    if (!apiData.success || !apiData.projects || apiData.projects.length < 2) {
      test.skip(true, 'FMEA 프로젝트가 2개 미만');
      return;
    }

    const currentId = await page.locator('span.text-blue-600').first().textContent();
    const otherProject = apiData.projects.find(
      (p: any) => p.id?.toLowerCase() !== currentId?.toLowerCase() && p.fmeaInfo?.subject
    );

    if (!otherProject) {
      test.skip(true, '중복 테스트 대상 없음');
      return;
    }

    // 중복 이름 입력
    const fmeaNameInput = page.locator('input[placeholder*="시스템"]').first();
    await fmeaNameInput.click();
    await page.waitForTimeout(1500);
    await fmeaNameInput.fill('');
    await fmeaNameInput.fill(otherProject.fmeaInfo.subject);
    await page.waitForTimeout(500);

    // 저장 클릭 → confirm 다이얼로그 가로채기
    let dialogShown = false;
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogShown = true;
      dialogMessage = dialog.message();
      console.log(`[테스트] dialog: ${dialogMessage}`);
      await dialog.dismiss();
    });

    const saveBtn = page.locator('button:has-text("저장")').first();
    await saveBtn.click();
    await page.waitForTimeout(3000);

    expect(dialogShown).toBe(true);
    expect(dialogMessage).toContain('중복');
    console.log('[테스트] ✅ 저장 시 중복 confirm 표시 확인');
  });

  test('4. FMEA명 검색 모달(🔍) 열기', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 🔍 버튼 클릭
    const searchBtn = page.locator('button[title="기존 FMEA 목록 보기"]').first();
    await expect(searchBtn).toBeVisible({ timeout: 5000 });
    await searchBtn.click();
    await page.waitForTimeout(500);

    // FmeaNameModal 표시 확인
    const modal = page.locator('text=FMEA명 목록');
    await expect(modal).toBeVisible({ timeout: 3000 });
    console.log('[테스트] ✅ FMEA명 검색 모달 열림 확인');
  });

  test('5. 연동 CP/PFD 모달(🔗) 열기', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 🔗 버튼 클릭 (연동 CP 또는 PFD)
    const linkBtn = page.locator('button[title*="연동"]').first();
    await expect(linkBtn).toBeVisible({ timeout: 5000 });
    await linkBtn.click();
    await page.waitForTimeout(500);

    // LinkageModal 표시 확인
    const modal = page.locator('text=연동').first();
    await expect(modal).toBeVisible({ timeout: 3000 });
    console.log('[테스트] ✅ 연동 모달 열림 확인');
  });

  test('6. 새 문서 생성 모달 중복 검증', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 기존 FMEA 이름 가져오기
    const apiRes = await page.request.get('/api/fmea/projects');
    const apiData = await apiRes.json();

    if (!apiData.success || !apiData.projects?.length) {
      test.skip(true, 'FMEA 프로젝트 없음');
      return;
    }

    const existingName = apiData.projects[0]?.fmeaInfo?.subject;
    if (!existingName) {
      test.skip(true, 'FMEA명 없는 프로젝트');
      return;
    }

    // "새로 작성" 버튼 클릭
    const createBtn = page.locator('button:has-text("새로 작성")').first();
    await createBtn.click();
    await page.waitForTimeout(1000);

    // CreateDocumentModal 표시 확인
    const modal = page.locator('text=새 문서 생성');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // 기존 이름과 동일하게 입력
    const nameInput = page.locator('input[placeholder*="입력하세요"]').first();
    await nameInput.fill(existingName);
    await page.waitForTimeout(500);

    // 생성 클릭 → confirm 가로채기
    let dialogShown = false;
    page.on('dialog', async (dialog) => {
      dialogShown = true;
      console.log(`[테스트] CreateModal dialog: ${dialog.message()}`);
      await dialog.dismiss();
    });

    const submitBtn = page.locator('button:has-text("생성")').first();
    await submitBtn.click();
    await page.waitForTimeout(4000);

    expect(dialogShown).toBe(true);
    console.log('[테스트] ✅ 새 문서 생성 중복 confirm 표시 확인');
  });

  test('7. CFT 추가 버튼 → CFT 섹션 스크롤', async ({ page }) => {
    await page.goto('/pfmea/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // CFT 추가 버튼 확인
    const cftBtn = page.locator('button:has-text("CFT 추가")').first();
    await expect(cftBtn).toBeVisible({ timeout: 5000 });
    await cftBtn.click();
    await page.waitForTimeout(1000);

    // CFT 섹션이 뷰포트에 표시되는지 확인
    const cftSection = page.locator('#cft-section');
    await expect(cftSection).toBeInViewport({ timeout: 3000 });
    console.log('[테스트] ✅ CFT 섹션 스크롤 확인');
  });
});
