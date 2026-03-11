const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();

  // Step 1: PFD 워크시트 열기
  console.log('Step 1: PFD 워크시트 열기...');
  await page.goto('http://localhost:3000/pfd/worksheet?pfdNo=pfd26-p001-l50', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 스크린샷 1: 초기 로드 상태
  await page.screenshot({ path: 'c:/fmea-onpremise/screenshots/pfd-l50-after-sync.png', fullPage: false });
  console.log('Screenshot saved: pfd-l50-after-sync.png');

  // Step 2: 테이블에서 실제 데이터 텍스트 추출
  const cellTexts = await page.evaluate(() => {
    const cells = document.querySelectorAll('table td');
    const texts = [];
    cells.forEach((cell, i) => {
      const text = cell.textContent?.trim() || '';
      if (text && text !== '-' && text.length > 3 && i < 200) {
        texts.push(`[${i}] ${text.substring(0, 60)}`);
      }
    });
    return texts.slice(0, 30);
  });
  console.log('\n=== 테이블 셀 데이터 (공란/- 제외, first 30) ===');
  cellTexts.forEach(t => console.log('  ' + t));

  // Step 3: 공정설명 컬럼 데이터 확인
  const descTexts = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    const descs = [];
    rows.forEach((row, i) => {
      const cells = row.querySelectorAll('td');
      // 공정설명은 8번째 컬럼 (0-indexed: 7)
      if (cells.length > 7) {
        const desc = cells[7]?.textContent?.trim() || '';
        if (desc && desc !== '-') {
          descs.push(`row${i}: "${desc.substring(0, 50)}"`);
        }
      }
    });
    return descs.slice(0, 10);
  });
  console.log('\n=== 공정설명 컬럼 (first 10) ===');
  descTexts.forEach(t => console.log('  ' + t));

  // Step 4: FMEA에서 버튼 클릭 테스트
  console.log('\nStep 4: FMEA에서 버튼 클릭 테스트...');
  const fmeaBtn = await page.$('button');
  const allButtons = await page.$$eval('button', btns => btns.map(b => b.textContent?.trim()));
  console.log('All buttons:', allButtons.filter(t => t && t.includes('FMEA')));

  await browser.close();
  console.log('\nDone!');
})();
