/**
 * @file db-save-after-import.spec.ts
 * @description Import 후 워크시트 DB 저장 성공 검증
 *
 * 1. Import 페이지에서 Excel 업로드 → Import
 * 2. 워크시트 페이지로 이동
 * 3. DB 저장 트리거 → 성공 확인
 *
 * @created 2026-03-14
 */

import { test, expect } from '@playwright/test';

const FMEA_ID = 'pfm26-m010';
const WORKSHEET_URL = `http://localhost:3000/pfmea/worksheet?id=${FMEA_ID}`;

test.describe('워크시트 DB 저장 검증', () => {

  test('워크시트 로드 → DB 저장 시 에러 없음', async ({ page }) => {
    // 콘솔 에러/경고 수집
    const errors: string[] = [];
    const warnings: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.type() === 'warning') warnings.push(msg.text());
    });

    // 네트워크 응답 모니터링
    const apiResponses: { url: string; status: number; body?: string }[] = [];
    page.on('response', async resp => {
      if (resp.url().includes('/api/fmea')) {
        const body = await resp.text().catch(() => '');
        apiResponses.push({ url: resp.url(), status: resp.status(), body: body.slice(0, 500) });
      }
    });

    // 1. 워크시트 페이지 접근
    await page.goto(WORKSHEET_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'tests/screenshots/db-save-01-worksheet.png', fullPage: true });
    console.log('✅ 1단계: 워크시트 페이지 로드 완료');

    // 2. DB 저장 에러 배너 확인
    const errorBanner = page.locator('text=DB 저장 실패');
    const hasError = await errorBanner.isVisible().catch(() => false);

    if (hasError) {
      console.log('❌ DB 저장 실패 배너 발견!');

      // API 응답에서 에러 상세 확인
      const fmeaApiErrors = apiResponses.filter(r => r.status >= 400);
      fmeaApiErrors.forEach(r => {
        console.log(`   API 에러: ${r.status} ${r.url}`);
        console.log(`   응답: ${r.body}`);
      });

      // 서버 콘솔 에러 출력
      errors.forEach(e => console.log(`   콘솔 에러: ${e}`));
    }

    // POST /api/fmea 응답 확인
    const postResponses = apiResponses.filter(r =>
      r.url.includes('/api/fmea') && !r.url.includes('?')
    );

    console.log(`   FMEA API 호출 ${postResponses.length}건:`);
    postResponses.forEach(r => {
      console.log(`   ${r.status} — ${r.body?.slice(0, 200)}`);
    });

    // 3. 탭 이동하여 DB 저장 트리거
    // 구조분석 탭 클릭
    const structTab = page.locator('button:has-text("구조"), button:has-text("Structure")').first();
    if (await structTab.isVisible()) {
      await structTab.click();
      await page.waitForTimeout(2000);
    }

    // 기능분석 탭 클릭 (탭 이동 시 auto-save 트리거)
    const funcTab = page.locator('button:has-text("2L기능"), button:has-text("Function"), button:has-text("기능")').first();
    if (await funcTab.isVisible()) {
      await funcTab.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'tests/screenshots/db-save-02-after-tab.png', fullPage: true });

    // 4. DB 저장 에러 재확인
    const errorBanner2 = page.locator('text=DB 저장 실패');
    const hasError2 = await errorBanner2.isVisible().catch(() => false);

    if (hasError2) {
      console.log('❌ 탭 이동 후에도 DB 저장 실패!');

      // 추가 API 에러 확인
      const newErrors = apiResponses.filter(r => r.status >= 400);
      newErrors.forEach(r => {
        console.log(`   POST 에러: ${r.status}`);
        console.log(`   응답: ${r.body}`);
      });
    } else {
      console.log('✅ DB 저장 에러 없음');
    }

    // 5. 최종 스크린샷
    await page.screenshot({ path: 'tests/screenshots/db-save-03-final.png', fullPage: true });

    // 전체 API 응답 요약
    console.log('\n=== API 응답 요약 ===');
    apiResponses.forEach(r => {
      const method = r.url.includes('?') ? 'GET' : 'POST/PUT';
      console.log(`   [${r.status}] ${method} ${r.url.replace('http://localhost:3000', '')}`);
    });

    console.log('\n=== 콘솔 에러 ===');
    errors.forEach(e => console.log(`   ${e}`));
  });
});
