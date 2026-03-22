import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  
  page.on('pageerror', error => {
    errors.push({ name: error.name, message: error.message, stack: error.stack });
    console.log(`[PAGE ERROR] ${error.name}: ${error.message}`);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text().substring(0, 200)}`);
    }
  });

  // Test 1: Direct navigation
  console.log('--- Test 1: Direct navigation ---');
  await page.goto('http://localhost:3000/pfmea/register?id=pfm26-p002-i02', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const hasError1 = await page.$('text=화면 로드 중 오류가 발생했습니다');
  const hasContent1 = await page.$('text=PFMEA');
  console.log('Error boundary visible:', !!hasError1);
  console.log('PFMEA content visible:', !!hasContent1);
  
  // Check for the specific register page elements
  const hasFmeaType = await page.$('text=FMEA 유형');
  const hasFmeaName = await page.$('text=FMEA명');
  const hasSaveBtn = await page.$('text=저장(Save)');
  console.log('Has FMEA유형:', !!hasFmeaType);
  console.log('Has FMEA명:', !!hasFmeaName);
  console.log('Has 저장 button:', !!hasSaveBtn);

  // Test 2: Navigate from root
  console.log('\n--- Test 2: Navigate from root ---');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:3000/pfmea/register?id=pfm26-p002-i02', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const hasError2 = await page.$('text=화면 로드 중 오류가 발생했습니다');
  console.log('Error boundary visible after navigation:', !!hasError2);

  // Test 3: Reload the page
  console.log('\n--- Test 3: Reload page ---');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const hasError3 = await page.$('text=화면 로드 중 오류가 발생했습니다');
  console.log('Error boundary visible after reload:', !!hasError3);

  console.log(`\n=== Total page errors captured: ${errors.length} ===`);
  for (const err of errors) {
    console.log(`  ${err.name}: ${err.message}`);
    if (err.stack) console.log(`  Stack: ${err.stack.substring(0, 300)}`);
  }

  await browser.close();
  console.log('\nDone');
})();
