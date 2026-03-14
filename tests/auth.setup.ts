/**
 * @file auth.setup.ts
 * @description Playwright Global Setup — 로그인 1회 실행 후 세션 저장
 *
 * 모든 UI 테스트가 이 setup을 의존하여 인증 상태를 재사용한다.
 * 저장 위치: tests/.auth/user.json (storageState)
 *
 * 로그인 계정: admin / 1234 (auth-service.ts 하드코딩 폴백)
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

export const STORAGE_STATE = path.join(__dirname, '.auth/user.json');

setup('authenticate as admin', async ({ page }) => {
  // 1. 로그인 API 직접 호출 (UI 렌더링 대기 없이 빠르게)
  const loginRes = await page.request.post('/api/auth/login', {
    data: { loginId: 'admin', password: '1234' },
  });

  let user: Record<string, unknown> | null = null;

  if (loginRes.ok()) {
    const body = await loginRes.json();
    if (body.success && body.user) {
      user = body.user;
    }
  }

  // API 로그인 실패 시 UI 로그인 폴백
  if (!user) {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // 이메일/ID 입력
    const emailInput = page.locator('input[type="text"], input[type="email"]').first();
    await emailInput.fill('admin');

    // 비밀번호 입력
    const pwdInput = page.locator('input[type="password"]').first();
    await pwdInput.fill('1234');

    // 제출
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }

  // 2. localStorage + cookie 세팅 (middleware가 확인하는 키)
  if (user) {
    // 먼저 아무 페이지든 열어서 localStorage 접근 가능하게
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const userJson = JSON.stringify(user);

    await page.evaluate((json) => {
      localStorage.setItem('user_session', json);
      localStorage.setItem('USER', json);
      localStorage.setItem('fmea-user', json);
    }, userJson);

    // cookie 세팅 (middleware.ts가 'fmea-user' 쿠키 확인)
    await page.context().addCookies([
      {
        name: 'fmea-user',
        value: encodeURIComponent(userJson),
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400,
      },
    ]);
  }

  // 3. 세션 저장 → tests/.auth/user.json
  await page.context().storageState({ path: STORAGE_STATE });
});
