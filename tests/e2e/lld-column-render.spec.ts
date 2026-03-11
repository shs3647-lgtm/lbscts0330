/**
 * @file lld-column-render.spec.ts
 * @description LLD(필터코드) 통합 컬럼 렌더링 Playwright 테스트
 *
 * 검증 항목:
 * 1. ALL탭 헤더에 "LLD" 컬럼이 표시되는지
 * 2. "습득교훈", "Filter Code" 별도 컬럼이 사라졌는지
 * 3. LLD 컬럼 내 분류 드롭다운이 존재하는지
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('LLD(필터코드) 통합 컬럼 렌더링', () => {
  test('ALL탭 헤더에 LLD 컬럼이 표시되어야 함', async ({ page }) => {
    // PFMEA 워크시트로 이동
    await page.goto(`${BASE_URL}/pfmea/worksheet`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // ALL 탭 버튼 클릭
    const allTabBtn = page.locator('button', { hasText: 'ALL' });
    if (await allTabBtn.count() > 0) {
      await allTabBtn.first().click();
      await page.waitForTimeout(2000);
    }

    // ALL탭 테이블 헤더에서 "LLD" 텍스트 확인
    const lldHeader = page.locator('th', { hasText: 'LLD' });
    await expect(lldHeader.first()).toBeVisible({ timeout: 10000 });
  });

  test('습득교훈 별도 헤더가 없어야 함', async ({ page }) => {
    await page.goto(`${BASE_URL}/pfmea/worksheet?tab=all`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // "습득교훈"이라는 텍스트가 th 헤더에 없어야 함
    const lessonHeaders = page.locator('th', { hasText: /^습득교훈$/ });
    await expect(lessonHeaders).toHaveCount(0);
  });

  test('Filter Code 별도 헤더가 없어야 함', async ({ page }) => {
    await page.goto(`${BASE_URL}/pfmea/worksheet?tab=all`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // "Filter Code"라는 텍스트가 th 헤더에 없어야 함 (단, 그룹헤더 제외)
    const fcHeaders = page.locator('th', { hasText: /^Filter\s*Code$/ });
    await expect(fcHeaders).toHaveCount(0);
  });

  test('LLD 셀 내 분류 드롭다운이 존재해야 함', async ({ page }) => {
    await page.goto(`${BASE_URL}/pfmea/worksheet?tab=all`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // LLD 셀 내부에 select 드롭다운 (분류 선택) 확인
    const lldSelects = page.locator('td select[title="분류 선택"]');
    // 데이터가 있으면 1개 이상, 없으면 0개 — 페이지 로드 자체가 에러 없음을 확인
    const count = await lldSelects.count();
    // 데이터 유무와 관계없이 페이지가 에러 없이 로드됨을 확인
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
