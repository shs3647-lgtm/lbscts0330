const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('저장') || text.includes('로드') || text.includes('Error') || text.includes('❌') || text.includes('✅') || text.includes('PFD')) {
      console.log(`[LOG] ${text}`);
    }
  });

  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.message().substring(0, 100)}`);
    await dialog.accept();
  });

  // Step 1: PFD 열기
  console.log('=== Step 1: PFD 열기 ===');
  await page.goto('http://localhost:3000/pfd/worksheet?pfdNo=pfd26-p001-l39', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  const rows1 = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
  console.log(`로드 후 행 수: ${rows1}`);

  // Step 2: FMEA에서 동기화
  console.log('\n=== Step 2: FMEA에서 동기화 ===');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('FMEA에서'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 8000));
  const rows2 = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
  console.log(`동기화 후 행 수: ${rows2}`);

  // Step 3: 저장 버튼 클릭
  console.log('\n=== Step 3: 저장 ===');
  const saveClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const saveBtn = btns.find(b => b.innerText.includes('저장'));
    if (saveBtn) { saveBtn.click(); return saveBtn.innerText.trim(); }
    return 'not found';
  });
  console.log(`저장 버튼: "${saveClicked}"`);
  await new Promise(r => setTimeout(r, 5000));

  // Step 4: 새로고침
  console.log('\n=== Step 4: 새로고침 ===');
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  const rows3 = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
  console.log(`새로고침 후 행 수: ${rows3}`);

  // Step 5: 첫 5행 데이터 확인
  const cells = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    const result = [];
    for (let i = 0; i < Math.min(rows.length, 3); i++) {
      const tds = rows[i].querySelectorAll('td');
      const texts = [];
      tds.forEach((td, j) => {
        if (j < 6) texts.push(td.innerText.trim().replace(/\n/g, ' '));
      });
      result.push(texts.join(' | '));
    }
    return result;
  });
  console.log('\n새로고침 후 첫 3행:');
  cells.forEach((r, i) => console.log(`  [${i}] ${r}`));

  await page.screenshot({ path: 'c:/fmea-onpremise/scripts/pfd-after-refresh.png', fullPage: false });
  console.log('\n스크린샷: pfd-after-refresh.png');

  // 최종 판정
  console.log('\n=== 결과 ===');
  if (rows3 > 0 && rows3 === rows2) {
    console.log(`✅ 저장 성공! 새로고침 후에도 ${rows3}행 유지`);
  } else if (rows3 === 0) {
    console.log(`❌ 저장 실패! 새로고침 후 데이터 사라짐 (${rows2} → 0)`);
  } else {
    console.log(`⚠️ 행 수 변경: 동기화=${rows2} → 새로고침=${rows3}`);
  }

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
