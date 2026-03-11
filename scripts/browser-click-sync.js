const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // 콘솔 로그
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('FMEA') || text.includes('PFD') || text.includes('동기화') || text.includes('Error') || text.includes('에러') || text.includes('✅') || text.includes('❌') || text.includes('sync') || text.includes('로드')) {
      console.log(`[LOG] ${text}`);
    }
  });

  // Dialog 자동 수락
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.type()}: ${dialog.message().substring(0, 200)}`);
    await dialog.accept();
  });

  // sync API 응답 캡처
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('sync-from-fmea')) {
      console.log(`[API] ${response.status()} ${url}`);
      try {
        const body = await response.text();
        const data = JSON.parse(body);
        console.log(`[API RESPONSE] success=${data.success} items=${data.data?.itemCount || 0} error=${data.error || ''}`);
      } catch(e) {}
    }
  });

  // PFD 워크시트 열기
  console.log('=== PFD 워크시트 열기 ===');
  await page.goto('http://localhost:3000/pfd/worksheet?pfdNo=pfd26-p001-l39', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 현재 행 수
  const rowsBefore = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
  console.log(`현재 테이블 행 수: ${rowsBefore}`);

  // "⬅️ FMEA에서" 버튼 클릭
  console.log('\n=== "FMEA에서" 버튼 클릭 ===');
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('FMEA에서'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (!clicked) {
    console.log('❌ "FMEA에서" 버튼을 찾을 수 없음!');
    // 모든 버튼 텍스트 출력
    const allBtns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.length > 0 && t.length < 50);
    });
    console.log('가능한 버튼들:', allBtns.join(' | '));
    await browser.close();
    return;
  }

  console.log('✅ 버튼 클릭 완료, confirm 다이얼로그 수락 대기...');

  // confirm + API 호출 + 응답 대기 (10초)
  await new Promise(r => setTimeout(r, 10000));

  // 결과 확인
  const rowsAfter = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
  console.log(`\n=== 동기화 결과 ===`);
  console.log(`이전 행 수: ${rowsBefore}`);
  console.log(`이후 행 수: ${rowsAfter}`);

  // 스크린샷
  await page.screenshot({ path: 'c:/fmea-onpremise/scripts/pfd-after-sync-click.png', fullPage: false });
  console.log('스크린샷 저장: pfd-after-sync-click.png');

  await browser.close();
  console.log('\n=== 완료 ===');
})().catch(e => {
  console.error('Browser error:', e.message);
  process.exit(1);
});
