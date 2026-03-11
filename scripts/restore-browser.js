const { chromium } = require('playwright');

(async () => {
  console.log('Starting browser...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 워크시트 페이지로 이동
  console.log('Navigating to worksheet...');
  await page.goto('http://localhost:3000/pfmea/worksheet?id=pfm26-M001');
  await page.waitForTimeout(2000);
  
  // localStorage에 DB 데이터 저장
  console.log('Restoring data...');
  await page.evaluate(() => {
    const data = {
      l1: { id: 'l1-001', name: '완제품 제조라인', types: [], failureScopes: [] },
      l2: [
        { id: 'l2-001', l3: [{ id: 'l3-001', m4: 'MN', name: '00작업자', order: 10, functions: [], processChars: [] }], no: '10', name: '자재입고', order: 10, functions: [], productChars: [] },
        { id: 'l2-002', l3: [{ id: 'l3-002', m4: 'MN', name: '00검사원', order: 10, functions: [], processChars: [] }], no: '20', name: '수입검사', order: 20, functions: [], productChars: [] }
      ],
      tab: 'structure',
      fmeaId: 'pfm26-M001',
      failureLinks: [],
      visibleSteps: [2, 3, 4, 5, 6],
      structureConfirmed: true
    };
    localStorage.setItem('pfmea_worksheet_pfm26-M001', JSON.stringify(data));
    console.log('Data restored to localStorage');
  });
  
  // 페이지 새로고침
  console.log('Reloading page...');
  await page.reload();
  await page.waitForTimeout(3000);
  
  console.log('Done! Check the browser window.');
  // 브라우저 열어둠
})();











