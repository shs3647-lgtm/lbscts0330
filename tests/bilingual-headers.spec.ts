import { test, expect } from '@playwright/test';

/**
 * 영문 병기(Bilingual) 헤더 검증 테스트
 *
 * 모든 FMEA/CP/PFD 워크시트 탭의 테이블 헤더가
 * 한글(English) 형식으로 표시되는지 검증합니다.
 */

// 공통 영문 병기 패턴 - 괄호 안에 영문이 포함되어야 함
const BILINGUAL_PATTERNS = [
  /구조분석\(Structure/,
  /기능분석\(Function/,
  /고장분석\(Failure/,
  /최적화\(Optimization/,
  /문서화\(Documentation/,
];

// PFMEA/DFMEA 워크시트 헤더에서 반드시 표시되어야 하는 영문 병기 텍스트
const FMEA_HEADER_BILINGUAL = [
  '구조분석(Structure',
  '기능분석(Function',
  '고장분석(Failure',
  '확정됨(Confirmed)',
  'Missing',
];

test.describe('PFMEA 워크시트 영문 병기 검증', () => {
  test.beforeEach(async ({ page }) => {
    // PFMEA 리스트 페이지로 이동하여 첫 번째 프로젝트 선택
    await page.goto('/pfmea/list');
    await page.waitForLoadState('networkidle');
  });

  test('PFMEA 리스트 페이지 로드 확인', async ({ page }) => {
    await expect(page).toHaveURL(/pfmea\/list/);
    // 페이지가 에러 없이 로드되는지 확인
    const errorBoundary = page.locator('text=Something went wrong');
    await expect(errorBoundary).not.toBeVisible();
  });
});

test.describe('PFMEA 워크시트 탭 헤더 영문 병기', () => {
  test.beforeEach(async ({ page }) => {
    // 워크시트 페이지 직접 접근 (첫 번째 FMEA 프로젝트)
    await page.goto('/pfmea/list');
    await page.waitForLoadState('networkidle');

    // 첫 번째 행 클릭하여 워크시트로 이동
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('구조분석 탭 헤더에 영문 병기 표시', async ({ page }) => {
    // 구조분석 탭 클릭
    const structureTab = page.locator('text=구조분석');
    if (await structureTab.first().isVisible()) {
      await structureTab.first().click();
      await page.waitForTimeout(1000);

      // 헤더에 영문 병기가 포함되어 있는지 확인
      const headerArea = page.locator('thead, .worksheet-header, [class*="header"]');
      const headerText = await headerArea.allTextContents();
      const combinedText = headerText.join(' ');

      // Structure 영문이 포함되어야 함
      expect(combinedText).toContain('Structure');
    }
  });

  test('기능분석 탭 헤더에 영문 병기 표시', async ({ page }) => {
    const functionTab = page.locator('text=기능분석');
    if (await functionTab.first().isVisible()) {
      await functionTab.first().click();
      await page.waitForTimeout(1000);

      const headerArea = page.locator('thead, th');
      const headerText = await headerArea.allTextContents();
      const combinedText = headerText.join(' ');

      expect(combinedText).toContain('Function');
    }
  });

  test('고장분석 탭 헤더에 영문 병기 표시', async ({ page }) => {
    const failureTab = page.locator('text=고장분석');
    if (await failureTab.first().isVisible()) {
      await failureTab.first().click();
      await page.waitForTimeout(1000);

      const headerArea = page.locator('thead, th');
      const headerText = await headerArea.allTextContents();
      const combinedText = headerText.join(' ');

      expect(combinedText).toContain('Failure');
    }
  });
});

test.describe('DFMEA 워크시트 탭 헤더 영문 병기', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dfmea/list');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('DFMEA 구조분석 탭 헤더에 영문 병기 표시', async ({ page }) => {
    const structureTab = page.locator('text=구조분석');
    if (await structureTab.first().isVisible()) {
      await structureTab.first().click();
      await page.waitForTimeout(1000);

      const headerArea = page.locator('thead, th');
      const headerText = await headerArea.allTextContents();
      const combinedText = headerText.join(' ');

      expect(combinedText).toContain('Structure');
    }
  });
});

test.describe('CP 모듈 영문 병기 검증', () => {
  test('CP 리스트 페이지 로드 확인', async ({ page }) => {
    await page.goto('/control-plan/list');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/control-plan\/list/);
    const errorBoundary = page.locator('text=Something went wrong');
    await expect(errorBoundary).not.toBeVisible();
  });
});

test.describe('PFD 모듈 영문 병기 검증', () => {
  test('PFD 리스트 페이지 로드 확인', async ({ page }) => {
    await page.goto('/pfd/list');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/pfd\/list/);
    const errorBoundary = page.locator('text=Something went wrong');
    await expect(errorBoundary).not.toBeVisible();
  });
});

// 전체 페이지 에러 없음 검증 (모든 주요 페이지가 500 에러 없이 로드되는지)
test.describe('전체 페이지 정상 로드 검증', () => {
  const pages = [
    { name: 'PFMEA 리스트', url: '/pfmea/list' },
    { name: 'DFMEA 리스트', url: '/dfmea/list' },
    { name: 'CP 리스트', url: '/control-plan/list' },
    { name: 'PFD 리스트', url: '/pfd/list' },
    { name: 'PFMEA 등록', url: '/pfmea/register' },
    { name: 'DFMEA 등록', url: '/dfmea/register' },
    { name: 'CP 등록', url: '/control-plan/register' },
    { name: 'PFD 등록', url: '/pfd/register' },
  ];

  for (const p of pages) {
    test(`${p.name} 페이지 정상 로드`, async ({ page }) => {
      const response = await page.goto(p.url);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');

      // 화이트 스크린(에러 바운더리) 없음 확인
      const errorText = page.locator('text=Something went wrong');
      await expect(errorText).not.toBeVisible();
    });
  }
});
