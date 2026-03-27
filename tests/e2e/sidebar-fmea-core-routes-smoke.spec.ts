/**
 * FMEA Core 사이드바 SSoT 경로에 대한 HTTP 스모크 (API 컨텍스트 request).
 * — dev 서버 기동 + (선택) auth.setup 세션 전제. 연결 거부 시 스킵.
 *
 * 실행: npx playwright test tests/e2e/sidebar-fmea-core-routes-smoke.spec.ts
 */

import { test, expect } from '@playwright/test';
import { collectAllFmeaCoreSidebarHrefs } from '@/components/layout/fmea-core-sidebar-menu';

const PATHS = collectAllFmeaCoreSidebarHrefs()
  .filter(p => !p.startsWith('/dfmea'));

test.describe('FMEA Core sidebar routes — HTTP smoke', () => {
  for (const p of PATHS) {
    test(`GET ${p}`, async ({ request }) => {
      let res;
      try {
        res = await request.get(p);
      } catch {
        test.skip(true, 'dev server not reachable');
        return;
      }
      expect(res.status(), `unexpected failure for ${p}`).not.toBe(404);
      expect(res.status(), `server error for ${p}`).toBeLessThan(500);
    });
  }
});
