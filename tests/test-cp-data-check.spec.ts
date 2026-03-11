/**
 * CP 워크시트 E열(설비/금형), P열(관리방법), Q열(책임1), R열(책임2), O열(주기) 데이터 확인 테스트
 */
import { test, expect } from '@playwright/test';

test('CP 워크시트 데이터 확인', async ({ page }) => {
  // 콘솔 로그 모니터링
  page.on('console', msg => {
    if (msg.type() === 'log' || msg.type() === 'error') {
      console.log(`[Browser] ${msg.text()}`);
    }
  });

  // CP 워크시트 페이지로 이동
  console.log('🔍 CP 워크시트 페이지로 이동...');
  await page.goto('http://localhost:3001/control-plan/worksheet');
  await page.waitForTimeout(3000);

  // 스크린샷 캡처
  await page.screenshot({ path: 'test-results/cp-worksheet-1.png', fullPage: true });
  console.log('📸 스크린샷 저장: cp-worksheet-1.png');

  // 테이블이 로드될 때까지 대기
  const table = page.locator('table').first();
  await expect(table).toBeVisible({ timeout: 10000 });

  // E열(설비/금형/JIG) 데이터 확인
  const workElementCells = page.locator('td').filter({ hasText: /설비|금형|JIG/i });
  const workElementCount = await workElementCells.count();
  console.log(`📊 E열(설비/금형/JIG) 데이터 셀 수: ${workElementCount}`);

  // 모든 행의 데이터 확인
  const rows = page.locator('tbody tr');
  const rowCount = await rows.count();
  console.log(`📊 총 행 수: ${rowCount}`);

  // 첫 5개 행의 데이터 출력
  for (let i = 0; i < Math.min(5, rowCount); i++) {
    const row = rows.nth(i);
    const cells = row.locator('td');
    const cellCount = await cells.count();
    
    if (cellCount > 5) {
      const colE = await cells.nth(5).textContent(); // E열 (설비/금형/JIG)
      const colO = await cells.nth(15).textContent(); // O열 (주기)
      const colP = await cells.nth(16).textContent(); // P열 (관리방법)
      const colQ = await cells.nth(17).textContent(); // Q열 (책임1)
      const colR = await cells.nth(18).textContent(); // R열 (책임2)
      
      console.log(`행 ${i + 1}: E열="${colE}", O열="${colO}", P열="${colP}", Q열="${colQ}", R열="${colR}"`);
    }
  }

  // 페이지 내용 확인을 위한 대기
  await page.waitForTimeout(30000);
});
