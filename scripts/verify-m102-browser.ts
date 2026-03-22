/**
 * Playwright 브라우저 검증: m102 위치기반 Import 결과 확인
 * 로그인: admin / 1234 (auth.setup.ts 참조)
 */
import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const BASE = 'http://localhost:3000';

  // 1. API 로그인
  console.log('[1] API 로그인...');
  const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
    data: { loginId: 'admin', password: '1234' },
  });

  let user: Record<string, unknown> | null = null;
  if (loginRes.ok()) {
    const body = await loginRes.json();
    if (body.success && body.user) user = body.user;
  }

  if (!user) {
    // UI 로그인 폴백
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
    await page.locator('input[type="text"], input[type="email"]').first().fill('admin');
    await page.locator('input[type="password"]').first().fill('1234');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('  UI 로그인 완료');
  } else {
    // localStorage + cookie 설정
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
    const userJson = JSON.stringify(user);
    await page.evaluate((json) => {
      localStorage.setItem('user_session', json);
      localStorage.setItem('USER', json);
      localStorage.setItem('fmea-user', json);
    }, userJson);
    await page.context().addCookies([{
      name: 'fmea-user',
      value: encodeURIComponent(userJson),
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400,
    }]);
    console.log('  API 로그인 완료:', (user as any).name || 'admin');
  }

  // 2. 워크시트 페이지
  console.log('[2] m102 워크시트 열기...');
  await page.goto(`${BASE}/pfmea/worksheet?fmeaId=pfm26-m102`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'data/verify-m102-worksheet.png', fullPage: false });
  console.log('  스크린샷: verify-m102-worksheet.png');

  // 3. 테이블 행 확인
  const rows = await page.$$('table tbody tr, table tr');
  console.log(`  테이블 행 수: ${rows.length}`);

  const bodyText = await page.textContent('body') || '';
  const keywords = ['Sputter', 'Au Bump', 'Wafer', '규격', '공정', 'Etch', 'Plating'];
  const found = keywords.filter(k => bodyText.includes(k));
  console.log(`  데이터 키워드: ${found.length > 0 ? found.join(', ') : '없음'}`);

  // 4. 탭 전환: 구조분석
  console.log('[3] 구조분석 탭...');
  const structBtn = page.locator('button:has-text("구조"), [data-tab="structure"]').first();
  if (await structBtn.isVisible().catch(() => false)) {
    await structBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'data/verify-m102-structure.png', fullPage: false });
    console.log('  스크린샷: verify-m102-structure.png');
  }

  // 5. 탭 전환: All
  console.log('[4] All 탭...');
  const allBtn = page.locator('button:has-text("All"), [data-tab="all"]').first();
  if (await allBtn.isVisible().catch(() => false)) {
    await allBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'data/verify-m102-all.png', fullPage: false });
    console.log('  스크린샷: verify-m102-all.png');
    const allRows = await page.$$('table tbody tr, table tr');
    console.log(`  All 탭 행 수: ${allRows.length}`);
  }

  // 6. 탭 전환: 고장분석
  console.log('[5] 고장분석 탭...');
  const failBtn = page.locator('button:has-text("고장"), [data-tab="failure"]').first();
  if (await failBtn.isVisible().catch(() => false)) {
    await failBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'data/verify-m102-failure.png', fullPage: false });
    console.log('  스크린샷: verify-m102-failure.png');
  }

  // 7. 콘솔 에러
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.waitForTimeout(1000);

  console.log('\n=== 검증 결과 ===');
  console.log(`데이터 키워드: ${found.length > 0 ? '✅ ' + found.join(', ') : '❌ 없음'}`);
  console.log(`콘솔 에러: ${errors.length}건`);

  // 30초 유지
  console.log('\n브라우저 30초 유지...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('완료');
}

main().catch(console.error);
