/**
 * @file pfmea-register.spec.ts
 * @description PFMEA 프로젝트 등록 화면 기본 동작/렌더링 회귀 검증 (5회)
 *
 * Policy: TEST_ENV=FULL_SYSTEM 환경에서 실행
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const REGISTER_URL = `${BASE_URL}/pfmea/register`;

test.describe.configure({ mode: 'serial' });

for (let round = 1; round <= 5; round++) {
  test(`[PFMEA 등록][회귀 ${round}/5] 화면 렌더링/기본 UI 요소`, async ({ page }) => {
    // confirm() 등 브라우저 다이얼로그로 테스트가 멈추지 않도록 자동 dismiss
    page.on('dialog', async (dlg) => {
      await dlg.dismiss();
    });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // 헤더 타이틀 확인 (등록/수정 둘 다 허용)
    const title = page.locator('h1').filter({ hasText: /PFMEA\s*(등록|수정)/i }).first();
    await expect(title).toBeVisible();

    // ID 표시 존재
    await expect(page.locator('text=/ID:.*pfm\\d{2}/i')).toBeVisible();

    // 주요 섹션 존재
    await expect(page.locator('text=기획 및 준비 (1단계)')).toBeVisible();
    await expect(page.locator('text=FMEA 기초 정보등록')).toBeVisible();
    await expect(page.locator('text=CFT 리스트')).toBeVisible();

    // 저장 버튼 존재
    const saveBtn = page.locator('button').filter({ hasText: /저장/ }).first();
    await expect(saveBtn).toBeVisible();

    // "새로 작성" 버튼 클릭(다이얼로그는 자동 dismiss)
    const newBtn = page.locator('button').filter({ hasText: /새로\s*(작성|등록)/ }).first();
    await expect(newBtn).toBeVisible();
    await newBtn.click();

    // FMEA명 입력 가능 확인 (값 변경만, 저장은 하지 않음)
    const subjectInput = page.locator('input').filter({ hasText: '' }).nth(1); // 안전하게: 아래에서 placeholder로 재탐색
    const subjectByPlaceholder = page.locator('input[placeholder*="시스템"]').first();
    await expect(subjectByPlaceholder).toBeVisible();
    await subjectByPlaceholder.fill(`TDD-REGISTER-${round}`);

    // 오류 없음
    expect(pageErrors, `pageerror 발생: ${pageErrors.join(' | ')}`).toEqual([]);
  });
}



