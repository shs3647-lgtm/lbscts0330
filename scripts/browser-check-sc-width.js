const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('http://localhost:3000/pfd/worksheet?pfdNo=pfd26-p001-l39', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  // 제품SC, 공정SC 컬럼 너비 확인
  const colWidths = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('th'));
    const result = {};
    headers.forEach(th => {
      const text = th.innerText.trim();
      if (text.includes('SC') || text === '제품SC' || text === '공정SC') {
        result[text] = th.offsetWidth;
      }
    });
    return result;
  });
  console.log('SC 컬럼 너비:', JSON.stringify(colWidths));

  await page.screenshot({ path: 'c:/fmea-onpremise/scripts/pfd-sc-width.png', fullPage: false });
  console.log('스크린샷: pfd-sc-width.png');

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
