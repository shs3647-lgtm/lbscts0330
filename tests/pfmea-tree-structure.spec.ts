/**
 * @file pfmea-tree-structure.spec.ts
 * @description 트리뷰(우측 패널) 구조트리 렌더링 기본 검증
 *
 * Policy: TEST_ENV=FULL_SYSTEM 환경에서 실행
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

test('PFMEA 구조트리: 패널/카운트/서브헤더 렌더링', async ({ page }) => {
  const fmeaId = 'TREE-STRUCT';

  await page.addInitScript((id) => {
    // 원하는 탭을 구조분석으로 고정
    localStorage.setItem(`pfmea_tab_${id}`, 'structure');

    // 워크시트 저장 데이터는 비워서 초기상태 렌더링을 검증
    localStorage.removeItem(`pfmea_worksheet_${id}`);
    localStorage.removeItem(`fmea-worksheet-${id}`);
  }, fmeaId);

  await page.goto(`${BASE_URL}/pfmea/worksheet?id=${encodeURIComponent(fmeaId)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // 트리 패널 헤더(구조트리) 존재
  await expect(page.locator('text=구조트리').first()).toBeVisible();

  // 카운트 문자열 포함 (완제품/메인공정/작업요소)
  await expect(page.locator('text=/완제품\\(\\d+\\).*메인공정\\(\\d+\\).*작업요소\\(\\d+\\)/').first()).toBeVisible();

  // 서브헤더(완제품명 입력 placeholder) 존재(초기상태)
  await expect(page.locator('text=(완제품명 입력)').first()).toBeVisible();
});



