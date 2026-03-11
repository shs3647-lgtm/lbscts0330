/**
 * @file function-l1-merge-exact.spec.ts
 * @description 사용자 실제 시나리오 재현 - 기존 데이터가 있는 셀에서 병합 추가
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('1L 기능 - 사용자 시나리오 재현', () => {

  test('기능 셀 우클릭 → 위로 병합 추가 → 행 수 증가 확인', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('FunctionL1Tab') || text.includes('handleAdd')) {
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

    await page.screenshot({ path: 'tests/screenshots/exact-BEFORE.png', fullPage: true });
    const beforeRows = await page.locator('table tbody tr').count();
    console.log(`\nBEFORE 행 수: ${beforeRows}`);

    // ★ 핵심: 기존 데이터가 있는 "기능" 셀을 직접 찾아서 우클릭
    // "치수 정밀도를 유지한다" 또는 비슷한 기능명이 있는 셀
    const funcCells = page.locator('table tbody td');
    const cellCount = await funcCells.count();
    
    let targetFound = false;
    let targetText = '';
    
    for (let i = 0; i < cellCount; i++) {
      const cell = funcCells.nth(i);
      const text = (await cell.innerText()).trim();
      // 기능 셀: 한글로 된 기능 설명문 (최소 5자 이상, "유지한다", "확보한다" 등 포함)
      if (text.length > 5 && (text.includes('한다') || text.includes('요구한다'))) {
        targetFound = true;
        targetText = text;
        console.log(`우클릭 대상: td[${i}] = "${text}"`);
        
        // 우클릭
        await cell.click({ button: 'right' });
        await page.waitForTimeout(500);
        break;
      }
    }

    if (!targetFound) {
      console.log('⚠️ 기능 셀을 찾지 못함, 모든 셀 출력:');
      for (let i = 0; i < Math.min(cellCount, 30); i++) {
        const text = await funcCells.nth(i).innerText();
        console.log(`  td[${i}]: "${text.substring(0, 50)}"`);
      }
      expect(targetFound).toBe(true);
      return;
    }

    // 컨텍스트 메뉴 확인
    await page.screenshot({ path: 'tests/screenshots/exact-CONTEXT-MENU.png', fullPage: true });
    
    const mergeAbove = page.locator('button:has-text("위로 병합 추가")');
    const menuVisible = await mergeAbove.isVisible();
    console.log(`"위로 병합 추가" 메뉴 표시: ${menuVisible}`);
    expect(menuVisible).toBe(true);

    // "위로 병합 추가" 클릭
    await mergeAbove.click();
    console.log('"위로 병합 추가" 클릭 완료');

    // 상태 업데이트 대기
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'tests/screenshots/exact-AFTER.png', fullPage: true });
    const afterRows = await page.locator('table tbody tr').count();
    console.log(`\nAFTER 행 수: ${afterRows}`);
    console.log(`행 수 변화: ${beforeRows} → ${afterRows} (차이: ${afterRows - beforeRows})`);

    // 콘솔 로그 출력
    console.log('\n========== 콘솔 로그 ==========');
    consoleLogs.forEach(log => console.log(log));

    // ★ 핵심 검증
    if (afterRows > beforeRows) {
      console.log('✅ 성공! 병합 추가로 행이 증가함');
    } else {
      console.log('❌ 실패! 병합 추가 후 행 수 변화 없음');
      
      // 추가 디버그: 기존 대상 셀 텍스트가 아직 있는지 확인
      const stillExists = page.locator(`td:has-text("${targetText}")`);
      const count = await stillExists.count();
      console.log(`원래 대상 셀 "${targetText}" 여전히 존재: ${count > 0} (${count}개)`);
      
      // 모든 td 출력 (AFTER)
      const allTdsAfter = page.locator('table tbody td');
      const afterCellCount = await allTdsAfter.count();
      console.log(`\n셀 수 변화: ${cellCount} → ${afterCellCount}`);
      for (let i = 0; i < Math.min(afterCellCount, 30); i++) {
        const text = await allTdsAfter.nth(i).innerText();
        console.log(`  td[${i}]: "${text.substring(0, 50)}"`);
      }
    }

    expect(afterRows).toBeGreaterThan(beforeRows);
  });

  test('요구사항 셀 우클릭 → 아래로 병합 추가 → 행 수 증가 확인', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('FunctionL1Tab') || text.includes('handleAdd')) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto(`${BASE_URL}/pfmea/worksheet?projectId=1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const l1Tab = page.locator('text=1L기능').first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
    }

    const manualBtn = page.locator('button:has-text("수동")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(500);
    }

    const beforeRows = await page.locator('table tbody tr').count();
    console.log(`BEFORE 행 수: ${beforeRows}`);

    // 요구사항 셀 찾기 (짧은 단어: "치수 공차", "내구성", "하중" 등)
    const allTds = page.locator('table tbody td');
    const tdCount = await allTds.count();
    
    let targetFound = false;
    for (let i = 0; i < tdCount; i++) {
      const cell = allTds.nth(i);
      const text = (await cell.innerText()).trim();
      // 요구사항: 짧은 한글 단어 (2~6자), 기능문장이 아닌 것
      if (text.length >= 2 && text.length <= 10 && !text.includes('한다') && !text.includes('입력') && !text.includes('선택') && !text.includes('구조분석')) {
        // 해당 셀이 요구사항 열(4번째 열)인지 확인
        // 여기서는 그냥 텍스트로 판단
        if (['치수 공차', '용접부 강도', '하중', '외관 결함', '유해물질 불검출', '도막 두께', '내구성'].includes(text)) {
          targetFound = true;
          console.log(`우클릭 대상 (요구사항): td[${i}] = "${text}"`);
          await cell.click({ button: 'right' });
          await page.waitForTimeout(500);
          break;
        }
      }
    }

    if (!targetFound) {
      console.log('⚠️ 요구사항 셀을 찾지 못함');
      return;
    }

    const mergeBelow = page.locator('button:has-text("아래로 병합 추가")');
    if (await mergeBelow.isVisible()) {
      await mergeBelow.click();
      await page.waitForTimeout(3000);

      const afterRows = await page.locator('table tbody tr').count();
      console.log(`AFTER 행 수: ${afterRows}`);
      console.log(`행 수 변화: ${beforeRows} → ${afterRows} (차이: ${afterRows - beforeRows})`);

      consoleLogs.forEach(log => console.log(log));

      await page.screenshot({ path: 'tests/screenshots/exact-req-AFTER.png', fullPage: true });
      expect(afterRows).toBeGreaterThan(beforeRows);
    }
  });

  test('연속 병합 추가: 기능→기능→요구사항 순서로 3회', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('FunctionL1Tab') || text.includes('handleAdd') || text.includes('✅')) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto(`${BASE_URL}/pfmea/worksheet?projectId=1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const l1Tab = page.locator('text=1L기능').first();
    if (await l1Tab.isVisible()) {
      await l1Tab.click();
      await page.waitForTimeout(1000);
    }

    const manualBtn = page.locator('button:has-text("수동")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(500);
    }

    const initialRows = await page.locator('table tbody tr').count();
    console.log(`초기 행 수: ${initialRows}`);

    // === 1회차: 기능 셀에서 위로 병합 추가 ===
    console.log('\n=== 1회차: 기능 셀 - 위로 병합 추가 ===');
    let funcCell = page.locator('table tbody td').filter({ hasText: /유지한다|확보한다|요구한다/ }).first();
    if (await funcCell.isVisible()) {
      await funcCell.click({ button: 'right' });
      await page.waitForTimeout(500);
      const btn = page.locator('button:has-text("위로 병합 추가")');
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(2000);
        const rows = await page.locator('table tbody tr').count();
        console.log(`1회차 후 행 수: ${rows} (변화: ${rows - initialRows})`);
      }
    }

    // === 2회차: 같은 기능 셀에서 아래로 병합 추가 ===
    console.log('\n=== 2회차: 기능 셀 - 아래로 병합 추가 ===');
    const beforeRows2 = await page.locator('table tbody tr').count();
    funcCell = page.locator('table tbody td').filter({ hasText: /유지한다|확보한다|요구한다/ }).first();
    if (await funcCell.isVisible()) {
      await funcCell.click({ button: 'right' });
      await page.waitForTimeout(500);
      const btn = page.locator('button:has-text("아래로 병합 추가")');
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(2000);
        const rows = await page.locator('table tbody tr').count();
        console.log(`2회차 후 행 수: ${rows} (변화: ${rows - beforeRows2})`);
      }
    }

    // === 3회차: 요구사항 셀에서 위로 병합 추가 ===
    console.log('\n=== 3회차: 요구사항 셀 - 위로 병합 추가 ===');
    const beforeRows3 = await page.locator('table tbody tr').count();
    const reqCell = page.locator('table tbody td').filter({ hasText: /치수 공차|내구성|하중/ }).first();
    if (await reqCell.isVisible()) {
      await reqCell.click({ button: 'right' });
      await page.waitForTimeout(500);
      const btn = page.locator('button:has-text("위로 병합 추가")');
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(2000);
        const rows = await page.locator('table tbody tr').count();
        console.log(`3회차 후 행 수: ${rows} (변화: ${rows - beforeRows3})`);
      }
    }

    const finalRows = await page.locator('table tbody tr').count();
    console.log(`\n===== 최종 결과 =====`);
    console.log(`초기: ${initialRows} → 최종: ${finalRows} (총 변화: ${finalRows - initialRows})`);

    await page.screenshot({ path: 'tests/screenshots/exact-3times.png', fullPage: true });

    // 콘솔 로그
    console.log('\n========== 콘솔 로그 ==========');
    consoleLogs.forEach(log => console.log(log));

    // 최소 2행 이상 증가해야 함 (3회 추가했으므로)
    expect(finalRows).toBeGreaterThanOrEqual(initialRows + 2);
  });
});
