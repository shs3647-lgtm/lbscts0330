const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Console 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('PFD') || text.includes('pfd') || text.includes('로드') || text.includes('items') || text.includes('Error') || text.includes('에러') || text.includes('404')) {
      console.log(`[BROWSER] ${text}`);
    }
  });

  // 네트워크 에러 캡처
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/pfd/')) {
      console.log(`[NET] ${response.status()} ${url.split('?')[0]}`);
      if (response.status() >= 400) {
        try {
          const body = await response.text();
          console.log(`[NET ERROR] ${body.substring(0, 200)}`);
        } catch(e) {}
      }
    }
  });

  console.log('=== PFD 워크시트 브라우저 열기 ===');
  await page.goto('http://localhost:3000/pfd/worksheet?pfdNo=pfd26-p001-l39', { waitUntil: 'networkidle2', timeout: 30000 });

  // 3초 대기 (React 렌더링 완료)
  await new Promise(r => setTimeout(r, 3000));

  // 테이블 행 수 확인
  const rowCount = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    return rows.length;
  });
  console.log(`\n[결과] 테이블 행 수: ${rowCount}`);

  // 테이블 내용 확인
  const cellTexts = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    const result = [];
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const cells = rows[i].querySelectorAll('td');
      const rowData = [];
      cells.forEach(cell => {
        const text = cell.innerText.trim();
        if (text) rowData.push(text);
      });
      result.push(rowData.join(' | '));
    }
    return result;
  });
  console.log('\n[테이블 내용 (first 5 rows)]:');
  cellTexts.forEach((row, i) => console.log(`  [${i}] ${row}`));

  // 빈 테이블인지 확인
  const isEmpty = await page.evaluate(() => {
    // "데이터가 없습니다" 또는 빈 테이블 메시지 확인
    const text = document.body.innerText;
    return text.includes('데이터가 없습니다') || text.includes('항목이 없습니다') || text.includes('없습니다');
  });
  if (isEmpty) {
    console.log('\n❌ 빈 테이블 메시지 발견!');
  }

  // 아이템 카운트 표시 확인 (메뉴바)
  const itemCountText = await page.evaluate(() => {
    const body = document.body.innerText;
    const match = body.match(/\d+\s*건/);
    return match ? match[0] : 'not found';
  });
  console.log(`\n[메뉴바 건수 표시]: ${itemCountText}`);

  // 스크린샷
  await page.screenshot({ path: 'c:/fmea-onpremise/scripts/pfd-browser-check.png', fullPage: false });
  console.log('\n스크린샷: scripts/pfd-browser-check.png');

  await browser.close();
})().catch(e => {
  console.error('Browser error:', e.message);
  process.exit(1);
});
