/**
 * 브라우저에서 URL 열기
 */
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:51212/';
  
  console.log('브라우저 열기:', url);
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { timeout: 5000 });
    console.log('✅ 페이지 로드 성공');
    await page.waitForTimeout(2000);
  } catch (e) {
    console.error('❌ 페이지 로드 실패:', e.message);
    console.log('페이지가 연결되지 않았습니다. 서버가 실행 중인지 확인하세요.');
  }
  
  // 브라우저는 열어둠
  console.log('브라우저가 열렸습니다. 확인 후 닫으세요.');
})();











