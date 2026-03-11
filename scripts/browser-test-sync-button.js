const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // 모든 콘솔 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('FMEA') || text.includes('PFD') || text.includes('동기화') || text.includes('sync') || text.includes('Error') || text.includes('에러') || text.includes('404') || text.includes('fetch')) {
      console.log(`[CONSOLE] ${text}`);
    }
  });

  // Dialog (alert/confirm) 자동 처리
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.type()}: ${dialog.message()}`);
    await dialog.accept(); // confirm → OK, alert → OK
  });

  // 네트워크 요청 캡처
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('sync-from-fmea') || url.includes('create-pfd')) {
      const status = response.status();
      console.log(`[NET] ${status} ${url}`);
      try {
        const body = await response.text();
        const data = JSON.parse(body);
        console.log(`[NET BODY] success=${data.success} itemCount=${data.data?.itemCount || 0}`);
      } catch(e) {}
    }
  });

  // 1. 먼저 PFMEA 워크시트 열기 (FMEA에서 PFD 생성 버튼 테스트)
  console.log('=== PFMEA 워크시트 열기 ===');
  await page.goto('http://localhost:3000/pfmea/worksheet?fmeaId=pfm26-p001-l39', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'c:/fmea-onpremise/scripts/pfmea-worksheet.png', fullPage: false });
  console.log('PFMEA 스크린샷 저장');

  // CP연동 드롭다운 버튼 찾기
  const cpSyncBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const cpBtn = buttons.find(b => b.innerText.includes('CP') || b.innerText.includes('연동'));
    return cpBtn ? cpBtn.innerText.trim() : 'not found';
  });
  console.log(`CP연동 버튼: "${cpSyncBtn}"`);

  // 2. PFD 워크시트 열기 - FMEA→PFD 버튼 테스트
  console.log('\n=== PFD 워크시트 열기 (fmeaId 있는 PFD) ===');
  await page.goto('http://localhost:3000/pfd/worksheet?pfdNo=pfd26-p001-l39', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // FMEA→PFD 동기화 버튼 찾기
  const syncBtnInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const allBtnTexts = buttons.map(b => b.innerText.trim()).filter(t => t.length > 0 && t.length < 50);
    const fmeaBtn = buttons.find(b => b.innerText.includes('FMEA') && (b.innerText.includes('PFD') || b.innerText.includes('연동') || b.innerText.includes('가져오기')));
    return {
      found: !!fmeaBtn,
      text: fmeaBtn ? fmeaBtn.innerText.trim() : 'not found',
      allButtons: allBtnTexts.slice(0, 20),
    };
  });
  console.log(`FMEA→PFD 버튼: "${syncBtnInfo.text}"`);
  console.log(`모든 버튼: ${syncBtnInfo.allButtons.join(' | ')}`);

  await page.screenshot({ path: 'c:/fmea-onpremise/scripts/pfd-sync-button.png', fullPage: false });
  console.log('\nPFD 스크린샷 저장');

  // 3. 버튼 클릭 테스트
  if (syncBtnInfo.found) {
    console.log('\n=== FMEA→PFD 버튼 클릭! ===');
    const fmeaBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.innerText.includes('FMEA') && (b.innerText.includes('PFD') || b.innerText.includes('연동') || b.innerText.includes('가져오기')));
    });
    await fmeaBtn.click();
    await new Promise(r => setTimeout(r, 5000)); // 동기화 완료 대기

    // 결과 확인
    const rowCountAfter = await page.evaluate(() => {
      return document.querySelectorAll('table tbody tr').length;
    });
    console.log(`동기화 후 테이블 행 수: ${rowCountAfter}`);

    await page.screenshot({ path: 'c:/fmea-onpremise/scripts/pfd-after-sync.png', fullPage: false });
    console.log('동기화 후 스크린샷 저장');
  }

  await browser.close();
  console.log('\n=== 완료 ===');
})().catch(e => {
  console.error('Browser error:', e.message);
  process.exit(1);
});
