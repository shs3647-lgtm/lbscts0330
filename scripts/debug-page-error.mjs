import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  const consoleMessages = [];
  
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  
  page.on('pageerror', error => {
    errors.push({ name: error.name, message: error.message, stack: error.stack });
  });

  console.log('Navigating to register page...');
  
  try {
    await page.goto('http://localhost:3000/pfmea/register?id=pfm26-p002-i02', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
  } catch (e) {
    console.log('Navigation error:', e.message);
  }

  await page.waitForTimeout(5000);

  console.log('\n=== PAGE ERRORS ===');
  if (errors.length === 0) {
    console.log('No page errors captured');
  } else {
    for (const err of errors) {
      console.log(`ERROR: ${err.name}: ${err.message}`);
      console.log(`STACK: ${err.stack?.substring(0, 500)}`);
    }
  }

  console.log('\n=== CONSOLE ERRORS ===');
  const consoleErrors = consoleMessages.filter(m => m.type === 'error');
  if (consoleErrors.length === 0) {
    console.log('No console errors');
  } else {
    for (const msg of consoleErrors) {
      console.log(`[${msg.type}] ${msg.text.substring(0, 300)}`);
    }
  }

  const errorBoundary = await page.$('text=화면 로드 중 오류가 발생했습니다');
  if (errorBoundary) {
    console.log('\n=== ERROR BOUNDARY DETECTED ===');
    const errorBox = await page.$('pre');
    if (errorBox) {
      const text = await errorBox.textContent();
      console.log('Error boundary message:', text?.substring(0, 500));
    }
    const allPres = await page.$$('pre');
    for (let i = 0; i < allPres.length; i++) {
      const t = await allPres[i].textContent();
      console.log(`Pre #${i}: ${t?.substring(0, 300)}`);
    }
  } else {
    console.log('\n=== PAGE LOADED SUCCESSFULLY ===');
    const title = await page.title();
    console.log('Page title:', title);
    const bodyText = await page.textContent('body');
    console.log('First 300 chars:', bodyText?.substring(0, 300));
  }

  await browser.close();
})();
