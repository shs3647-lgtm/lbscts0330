/**
 * Family/Part FMEA 브라우저 시각 확인 테스트
 * 각 페이지를 3초간 열어서 사용자가 직접 확인
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const PAUSE_MS = 3000;

const PAGES = [
  { name: 'Family FMEA 대시보드', url: '/pfmea/family' },
  { name: 'Family FMEA 목록', url: '/pfmea/family/list' },
  { name: 'Family FMEA 생성', url: '/pfmea/family/create' },
  { name: 'Family FMEA Master-00', url: '/pfmea/family/master' },
  { name: 'Part FMEA 대시보드', url: '/part-fmea' },
  { name: 'Part FMEA 목록', url: '/part-fmea/list' },
  { name: 'Part FMEA 생성', url: '/part-fmea/create' },
];

test.describe('Family/Part FMEA 페이지 시각 확인', () => {
  for (const page of PAGES) {
    test(`${page.name} — ${page.url}`, async ({ page: p }) => {
      await p.goto(`${BASE}${page.url}`, { waitUntil: 'networkidle', timeout: 15000 });

      // 페이지 타이틀 또는 콘텐츠 존재 확인
      const body = await p.locator('body').textContent();
      expect(body).toBeTruthy();

      // 에러 페이지가 아닌지 확인
      const hasError = await p.locator('text=오류가 발생').count();
      if (hasError > 0) {
        const errorText = await p.locator('text=오류가 발생').first().textContent();
        console.error(`[ERROR] ${page.name}: ${errorText}`);
      }
      expect(hasError).toBe(0);

      // 스크린샷 저장
      await p.screenshot({
        path: `tests/e2e/screenshots/family-part/${page.name.replace(/\s/g, '_')}.png`,
        fullPage: true
      });

      // 3초 대기 (사용자 확인용)
      await p.waitForTimeout(PAUSE_MS);
    });
  }
});
