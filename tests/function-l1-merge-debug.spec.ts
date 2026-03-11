/**
 * @file function-l1-merge-debug.spec.ts
 * @description 1L 기능 탭 - 병합 추가 기능 디버그 테스트
 * 행 수 변화 정밀 측정 + 스크린샷 + 콘솔 로그 캡처
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('1L 기능 - 병합 추가 디버그', () => {

  test('디버그: 위로 병합 추가 - 행 수 변화 측정', async ({ page }) => {
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    // 콘솔 로그 캡처
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('FunctionL1Tab') || text.includes('병합') || text.includes('추가')) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // 1. 페이지 이동 & 데이터 로드 대기
    await page.goto(`${BASE_URL}/pfmea/worksheet?projectId=1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 2. 1L기능 탭 클릭
    const l1Tab = page.locator('text=1L기능').first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
    }

    // 3. 수동 모드 확인/전환
    const manualBtn = page.locator('button:has-text("수동")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(500);
    }

    // 4. BEFORE 스크린샷 + 행 수 측정
    await page.screenshot({ path: 'tests/screenshots/debug-l1-merge-BEFORE.png', fullPage: true });
    
    const beforeRowCount = await page.locator('table tbody tr').count();
    const beforeHTML = await page.locator('table tbody').innerHTML();
    console.log(`\n========== BEFORE ==========`);
    console.log(`행 수: ${beforeRowCount}`);
    console.log(`HTML 길이: ${beforeHTML.length}`);

    // 5. 기능 셀 찾기 (텍스트가 있는 셀)
    // 첫 번째 테이블의 tbody 안의 td 중 기능 관련 셀 찾기
    const allTds = page.locator('table tbody td');
    const tdCount = await allTds.count();
    console.log(`전체 td 개수: ${tdCount}`);

    // 모든 td의 텍스트 출력
    for (let i = 0; i < Math.min(tdCount, 20); i++) {
      const td = allTds.nth(i);
      const text = await td.innerText();
      const classes = await td.getAttribute('class');
      console.log(`  td[${i}]: "${text.substring(0, 40)}" class="${(classes || '').substring(0, 50)}"`);
    }

    // 6. 기능 셀에서 우클릭 (3번째 열 = 기능 열)
    // 첫 번째 행의 3번째 셀
    let targetCell = null;
    for (let i = 0; i < tdCount; i++) {
      const td = allTds.nth(i);
      const text = await td.innerText();
      // 기능 값이 들어있는 셀 (빈 셀이 아닌)
      if (text && !text.includes('생산공정') && !text.includes('안전') && !text.includes('기능') && !text.includes('규제') && text.length > 5) {
        targetCell = td;
        console.log(`\n=== 우클릭 대상 셀: "${text.substring(0, 50)}" ===`);
        break;
      }
    }

    // 기능 셀이 없으면 아무 셀이나 선택
    if (!targetCell) {
      // 3번째 td를 사용 (보통 기능 열)
      targetCell = allTds.nth(2);
      const text = await targetCell.innerText();
      console.log(`\n=== 우클릭 대상 셀 (대체): "${text.substring(0, 50)}" ===`);
    }

    // 7. 우클릭
    await targetCell.click({ button: 'right' });
    await page.waitForTimeout(500);

    // 컨텍스트 메뉴 표시 확인
    const ctxMenu = page.locator('text=위로 병합 추가');
    const menuVisible = await ctxMenu.isVisible();
    console.log(`\n컨텍스트 메뉴 "위로 병합 추가" 표시: ${menuVisible}`);

    if (!menuVisible) {
      // 메뉴가 안 보이면 스크린샷 찍고 실패
      await page.screenshot({ path: 'tests/screenshots/debug-l1-merge-NO-MENU.png' });
      console.log('⚠️ 컨텍스트 메뉴가 표시되지 않음!');
      // 모든 visible 버튼 텍스트 출력
      const buttons = page.locator('button:visible');
      const btnCount = await buttons.count();
      console.log(`화면에 보이는 버튼 수: ${btnCount}`);
      for (let i = 0; i < Math.min(btnCount, 30); i++) {
        const btn = buttons.nth(i);
        const btnText = await btn.innerText();
        console.log(`  btn[${i}]: "${btnText}"`);
      }
      expect(menuVisible).toBe(true);
      return;
    }

    // 8. "위로 병합 추가" 클릭
    await ctxMenu.click();
    console.log('\n"위로 병합 추가" 클릭 완료');

    // 9. 충분한 대기 (상태 업데이트 + 리렌더링)
    await page.waitForTimeout(2000);

    // 10. AFTER 스크린샷 + 행 수 측정
    await page.screenshot({ path: 'tests/screenshots/debug-l1-merge-AFTER.png', fullPage: true });
    
    const afterRowCount = await page.locator('table tbody tr').count();
    const afterHTML = await page.locator('table tbody').innerHTML();
    console.log(`\n========== AFTER ==========`);
    console.log(`행 수: ${afterRowCount}`);
    console.log(`HTML 길이: ${afterHTML.length}`);
    console.log(`행 수 변화: ${beforeRowCount} → ${afterRowCount} (차이: ${afterRowCount - beforeRowCount})`);

    // 11. 추가 후 모든 td 텍스트 출력
    const allTdsAfter = page.locator('table tbody td');
    const tdCountAfter = await allTdsAfter.count();
    console.log(`\n전체 td 개수 변화: ${tdCount} → ${tdCountAfter}`);

    for (let i = 0; i < Math.min(tdCountAfter, 30); i++) {
      const td = allTdsAfter.nth(i);
      const text = await td.innerText();
      console.log(`  td[${i}]: "${text.substring(0, 40)}"`);
    }

    // 12. 콘솔 로그 출력
    console.log('\n========== 콘솔 로그 ==========');
    consoleLogs.forEach(log => console.log(log));
    
    console.log('\n========== 콘솔 에러 ==========');
    consoleErrors.forEach(err => console.log(err));

    // 13. 핵심 검증: 행 수가 증가해야 함
    console.log(`\n========== 결과 ==========`);
    if (afterRowCount > beforeRowCount) {
      console.log(`✅ 성공! 행이 ${afterRowCount - beforeRowCount}개 추가됨`);
    } else {
      console.log(`❌ 실패! 행 수 변화 없음 (${beforeRowCount} → ${afterRowCount})`);
    }

    expect(afterRowCount).toBeGreaterThan(beforeRowCount);
  });

  test('디버그: 아래로 병합 추가 - 행 수 변화 측정', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('FunctionL1Tab') || text.includes('병합')) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto(`${BASE_URL}/pfmea/worksheet?projectId=1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 1L기능 탭
    const l1Tab = page.locator('text=1L기능').first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
    }

    // 수동 모드
    const manualBtn = page.locator('button:has-text("수동")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(500);
    }

    const beforeRowCount = await page.locator('table tbody tr').count();
    console.log(`BEFORE 행 수: ${beforeRowCount}`);

    // 기능 셀 찾아서 우클릭
    const allTds = page.locator('table tbody td');
    const tdCount = await allTds.count();
    
    let targetCell = allTds.nth(Math.min(2, tdCount - 1));
    await targetCell.click({ button: 'right' });
    await page.waitForTimeout(500);

    // "아래로 병합 추가" 클릭
    const ctxMenu = page.locator('text=아래로 병합 추가');
    if (await ctxMenu.isVisible()) {
      await ctxMenu.click();
      await page.waitForTimeout(2000);

      const afterRowCount = await page.locator('table tbody tr').count();
      console.log(`AFTER 행 수: ${afterRowCount}`);
      console.log(`행 수 변화: ${beforeRowCount} → ${afterRowCount}`);

      await page.screenshot({ path: 'tests/screenshots/debug-l1-merge-below-AFTER.png', fullPage: true });

      // 콘솔 로그
      consoleLogs.forEach(log => console.log(log));

      expect(afterRowCount).toBeGreaterThan(beforeRowCount);
    }
  });

  test('디버그: 위로 새 행 추가 vs 위로 병합 추가 비교', async ({ page }) => {
    await page.goto(`${BASE_URL}/pfmea/worksheet?projectId=1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 1L기능 탭
    const l1Tab = page.locator('text=1L기능').first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
    }

    // 수동 모드
    const manualBtn = page.locator('button:has-text("수동")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(500);
    }

    // === 테스트 1: 위로 새 행 추가 ===
    let beforeCount = await page.locator('table tbody tr').count();
    console.log(`\n=== 위로 새 행 추가 테스트 ===`);
    console.log(`BEFORE: ${beforeCount}`);

    const allTds = page.locator('table tbody td');
    const tdCount = await allTds.count();
    await allTds.nth(Math.min(2, tdCount - 1)).click({ button: 'right' });
    await page.waitForTimeout(500);

    const newRowBtn = page.locator('text=위로 새 행 추가');
    if (await newRowBtn.isVisible()) {
      await newRowBtn.click();
      await page.waitForTimeout(2000);
      const afterCount = await page.locator('table tbody tr').count();
      console.log(`AFTER: ${afterCount} (변화: ${afterCount - beforeCount})`);
    }

    // === 테스트 2: 위로 병합 추가 ===
    beforeCount = await page.locator('table tbody tr').count();
    console.log(`\n=== 위로 병합 추가 테스트 ===`);
    console.log(`BEFORE: ${beforeCount}`);

    const allTds2 = page.locator('table tbody td');
    const tdCount2 = await allTds2.count();
    await allTds2.nth(Math.min(2, tdCount2 - 1)).click({ button: 'right' });
    await page.waitForTimeout(500);

    const mergeBtn = page.locator('text=위로 병합 추가');
    if (await mergeBtn.isVisible()) {
      await mergeBtn.click();
      await page.waitForTimeout(2000);
      const afterCount = await page.locator('table tbody tr').count();
      console.log(`AFTER: ${afterCount} (변화: ${afterCount - beforeCount})`);

      await page.screenshot({ path: 'tests/screenshots/debug-l1-compare.png', fullPage: true });
    }
  });
});
