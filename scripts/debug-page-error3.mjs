import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push({ name: error.name, message: error.message, stack: error.stack });
    console.log(`[PAGE ERROR] ${error.name}: ${error.message}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text().substring(0, 300)}`);
    }
  });

  console.log('Navigating...');
  await page.goto('http://localhost:3000/pfmea/register?id=pfm26-p002-i02', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait longer for client-side rendering
  console.log('Waiting 10s for client rendering...');
  await page.waitForTimeout(10000);

  // Get all visible text
  const bodyText = await page.evaluate(() => document.body?.innerText || '');
  console.log('\n=== VISIBLE TEXT (first 1000 chars) ===');
  console.log(bodyText.substring(0, 1000));

  // Check for specific elements
  const allH1 = await page.$$eval('h1', els => els.map(e => e.textContent));
  const allH2 = await page.$$eval('h2', els => els.map(e => e.textContent));
  const allH3 = await page.$$eval('h3', els => els.map(e => e.textContent));
  console.log('\n=== HEADINGS ===');
  console.log('H1:', allH1);
  console.log('H2:', allH2);
  console.log('H3:', allH3);

  // Check for any error-related elements
  const errorDivs = await page.$$eval('div', els => {
    return els
      .map(e => e.textContent)
      .filter(t => t && (t.includes('오류') || t.includes('에러') || t.includes('ERROR') || t.includes('error')))
      .map(t => t.substring(0, 200));
  });
  console.log('\n=== ERROR DIVS ===');
  console.log(errorDivs.length > 0 ? errorDivs : 'None found');

  // Take screenshot
  await page.screenshot({ path: 'scripts/debug-screenshot.png', fullPage: false });
  console.log('\nScreenshot saved to scripts/debug-screenshot.png');

  console.log(`\nTotal page errors: ${errors.length}`);
  for (const err of errors) {
    console.log(`  ${err.name}: ${err.message}`);
    if (err.stack) console.log(`  Stack: ${err.stack.substring(0, 500)}`);
  }

  await browser.close();
})();
