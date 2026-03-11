const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();

  // Console 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('FMEA') || text.includes('동기화') || text.includes('sync') || text.includes('PFD')) {
      console.log('[BROWSER]', text);
    }
  });

  // Step 1: PFD 워크시트 열기
  console.log('Step 1: PFD 워크시트 열기...');
  await page.goto('http://localhost:3000/pfd/worksheet?pfdNo=pfd26-p001-l50', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Step 2: "⬅️ FMEA에서" 버튼 찾기
  console.log('Step 2: FMEA에서 버튼 찾기...');
  const fmeaBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent?.includes('FMEA에서'));
  });

  if (!fmeaBtn || !(await fmeaBtn.asElement())) {
    console.log('ERROR: FMEA에서 버튼을 찾을 수 없습니다!');
    await browser.close();
    return;
  }
  console.log('  ✅ 버튼 발견');

  // Step 3: confirm dialog 자동 수락 설정
  page.on('dialog', async dialog => {
    console.log(`  [Dialog] type=${dialog.type()} message="${dialog.message().substring(0, 100)}"`);
    await dialog.accept();
  });

  // Step 4: 네트워크 요청 감시
  let syncResponse = null;
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('sync-from-fmea')) {
      const status = response.status();
      try {
        const json = await response.json();
        syncResponse = { status, success: json.success, itemCount: json.data?.itemCount, error: json.error };
        console.log(`  [API] POST sync-from-fmea → status=${status} success=${json.success} items=${json.data?.itemCount || 0}`);
      } catch(e) {
        console.log(`  [API] POST sync-from-fmea → status=${status} (parse error)`);
      }
    }
  });

  // Step 5: 버튼 클릭
  console.log('Step 3: 버튼 클릭...');
  await fmeaBtn.asElement().click();

  // confirm + API 호출 + alert 대기
  await new Promise(r => setTimeout(r, 8000));

  // Step 6: 결과 확인
  console.log('\n=== 결과 확인 ===');
  if (syncResponse) {
    console.log('API 응답:', JSON.stringify(syncResponse));
  } else {
    console.log('WARNING: sync-from-fmea API 호출이 감지되지 않음!');
  }

  // 스크린샷
  await page.screenshot({ path: 'c:/fmea-onpremise/screenshots/pfd-l50-btn-test.png', fullPage: false });
  console.log('Screenshot saved: pfd-l50-btn-test.png');

  // 테이블 데이터 확인
  const hasData = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('table tbody td'));
    const nonEmpty = cells.filter(c => {
      const text = c.textContent?.trim() || '';
      return text.length > 5 && !text.includes('미입력') && !text.includes('CCSC');
    });
    return nonEmpty.length;
  });
  console.log('데이터 있는 셀 수:', hasData);

  await browser.close();
  console.log('\nDone!');
})();
