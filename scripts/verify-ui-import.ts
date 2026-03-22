/**
 * Playwright: UI에서 5시트 엑셀 파일 Import 검증
 * 1. 로그인
 * 2. Import 화면 열기 (pfm26-m102)
 * 3. 5시트 엑셀 파일 선택
 * 4. Import 결과 확인
 */
import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const BASE = 'http://localhost:3000';

  // 콘솔 로그 캡처
  page.on('console', msg => {
    if (msg.text().includes('[Import]') || msg.text().includes('position-parser')) {
      console.log(`  [browser] ${msg.text()}`);
    }
  });

  // 1. API 로그인
  console.log('[1] 로그인...');
  const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
    data: { loginId: 'admin', password: '1234' },
  });
  const body = await loginRes.json();
  if (body.success && body.user) {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
    const userJson = JSON.stringify(body.user);
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
    console.log('  로그인 완료');
  }

  // 2. Import 화면 열기
  console.log('[2] Import 화면 열기...');
  await page.goto(`${BASE}/pfmea/import/legacy?fmeaId=pfm26-m102`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'data/verify-ui-import-1-page.png', fullPage: false });
  console.log('  Import 화면 로드 완료');

  // 3. 엑셀 파일 선택
  console.log('[3] 5시트 엑셀 파일 선택...');
  const filePath = path.resolve('data/m102_clean_import.xlsx');

  // file input 찾기
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.setInputFiles(filePath);
    console.log('  파일 선택 완료: ' + filePath);

    // 파싱 + Import 대기
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 'data/verify-ui-import-2-parsed.png', fullPage: false });

    // alert dialog 감지
    page.on('dialog', async dialog => {
      console.log('  [dialog] ' + dialog.message().substring(0, 200));
      await dialog.accept();
    });

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'data/verify-ui-import-3-result.png', fullPage: false });
  } else {
    console.log('  ❌ file input을 찾을 수 없습니다');

    // 버튼으로 찾기
    const importBtn = page.locator('button:has-text("Import"), button:has-text("엑셀")').first();
    if (await importBtn.isVisible().catch(() => false)) {
      console.log('  Import 버튼 발견, 클릭...');
      // fileChooser 대기
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        importBtn.click(),
      ]);
      await fileChooser.setFiles(filePath);
      console.log('  파일 선택 완료 (fileChooser)');
      await page.waitForTimeout(8000);
      await page.screenshot({ path: 'data/verify-ui-import-2-parsed.png', fullPage: false });
    }
  }

  // 4. 워크시트 확인
  console.log('[4] 워크시트 확인...');
  await page.goto(`${BASE}/pfmea/worksheet?fmeaId=pfm26-m102`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'data/verify-ui-import-4-worksheet.png', fullPage: false });

  const bodyText = await page.textContent('body') || '';
  const hasData = ['Sputter', 'Wafer', 'Etch', '공정'].some(k => bodyText.includes(k));
  console.log(`  워크시트 데이터: ${hasData ? '✅' : '❌'}`);

  // 30초 유지
  console.log('\n브라우저 30초 유지...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('완료');
}

main().catch(console.error);
