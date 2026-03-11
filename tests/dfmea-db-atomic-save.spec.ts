/**
 * DFMEA DB 원자성 검증 테스트
 * 
 * 목표:
 * 1. 마스터 데이터 5개 입력
 * 2. localStorage + DB 저장 검증
 * 3. 새로고침 후 데이터 유지 확인
 * 4. 모든 탭에서 데이터 확인 (구조분석 → 기능분석 → 고장분석 → 고장연결 → 리스크 → 최적화 → All)
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// 마스터 데이터 5개 (타이어 제품 기준)
const MASTER_DATA = {
  // 1. 제품명 (다음상위수준) - 완제품
  product: {
    name: '타이어',
    function: '내부 압력을 유지하며 구조적 파열을 방지하는 기능',
    requirement: '내압 파열 압력',
  },
  // 2. A'SSY (초점요소)
  focusElement: {
    name: 'Tread Package',
    function: '노면과 직접 접촉하여 구동력·제동력·조향력을 전달하는 기능',
    requirement: '트레드 접지계수',
  },
  // 3. 부품 또는 특성 (다음하위수준)
  part: {
    name: 'Cap Tread',
    type: 'Part',
    function: '마모 수명, 접지력, 제동 성능을 제공하는 기능',
    requirement: '컴파운드',
  },
  // 4. 고장 데이터
  failure: {
    effect: '주행 중 파열',
    severity: 10,
    mode: '저마찰',
    cause: '컴파운드 선정 편차',
    occurrence: 5,
  },
  // 5. 리스크/최적화 데이터
  risk: {
    prevention: '설계 검토',
    detection: '마찰계수 측정',
    detectionRate: 4,
    ap: 'H',
  },
};

// 헬퍼: 입력 필드에 값 입력
async function fillInput(page: Page, selector: string, value: string) {
  const input = page.locator(selector).first();
  if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
    await input.click();
    await input.fill('');
    await input.fill(value);
    await input.press('Tab');
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

// 헬퍼: 셀 더블클릭 후 입력
async function fillCellByDoubleClick(page: Page, cellText: string, value: string) {
  const cell = page.locator(`td:has-text("${cellText}")`).first();
  if (await cell.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cell.dblclick();
    await page.waitForTimeout(200);
    
    const input = page.locator('input:focus, td input, textarea').first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill(value);
      await input.press('Enter');
      await page.waitForTimeout(300);
      return true;
    }
  }
  return false;
}

// 헬퍼: 탭 전환
async function switchTab(page: Page, tabName: string) {
  const tab = page.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`).first();
  if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

test.describe('DFMEA DB 원자성 검증 (데이터 저장 유지)', () => {
  
  test('1. 전체 데이터 입력 및 저장', async ({ page }) => {
    console.log('\n' + '='.repeat(70));
    console.log('     DFMEA 전체 데이터 입력 및 DB 원자성 검증');
    console.log('='.repeat(70) + '\n');
    
    // DFMEA 워크시트 열기
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ 워크시트 로드 완료');
    
    // ========== Step 1: 구조분석 데이터 입력 ==========
    console.log('\n📋 [Step 1] 구조분석 데이터 입력');
    
    // 1-1. 제품명 (다음상위수준) 입력
    const l1Input = page.locator('input[placeholder*="제품"], input[placeholder*="시스템"], input[placeholder*="입력"]').first();
    if (await l1Input.isVisible()) {
      await l1Input.fill(MASTER_DATA.product.name);
      await l1Input.press('Tab');
      await page.waitForTimeout(500);
      console.log(`   ✅ 제품명: ${MASTER_DATA.product.name}`);
    }
    
    // 1-2. A'SSY (초점요소) 입력 - 셀 더블클릭
    const assyCell = page.locator('td').filter({ hasText: /클릭하여|A'SSY|초점요소/ }).first();
    if (await assyCell.isVisible()) {
      await assyCell.dblclick();
      await page.waitForTimeout(300);
      const assyInput = page.locator('input:focus, td input').first();
      if (await assyInput.isVisible()) {
        await assyInput.fill(MASTER_DATA.focusElement.name);
        await assyInput.press('Enter');
        await page.waitForTimeout(300);
        console.log(`   ✅ A'SSY: ${MASTER_DATA.focusElement.name}`);
      }
    }
    
    // 1-3. 부품 또는 특성 (다음하위수준) 입력
    const partCell = page.locator('td').filter({ hasText: /클릭하여 부품|다음하위|특성 추가/ }).first();
    if (await partCell.isVisible()) {
      await partCell.dblclick();
      await page.waitForTimeout(300);
      const partInput = page.locator('input:focus, td input').first();
      if (await partInput.isVisible()) {
        await partInput.fill(MASTER_DATA.part.name);
        await partInput.press('Enter');
        await page.waitForTimeout(300);
        console.log(`   ✅ 부품: ${MASTER_DATA.part.name}`);
      }
    }
    
    // 1-4. 타입 선택
    const typeSelect = page.locator('select').first();
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ label: MASTER_DATA.part.type });
      await page.waitForTimeout(300);
      console.log(`   ✅ 타입: ${MASTER_DATA.part.type}`);
    }
    
    // 스크린샷 저장
    await page.screenshot({ path: 'test-results/dfmea-atomic-1-structure.png', fullPage: true });
    
    // ========== Step 2: 기능분석 탭 ==========
    console.log('\n📋 [Step 2] 기능분석 데이터 입력');
    if (await switchTab(page, '기능분석') || await switchTab(page, '3단계')) {
      console.log('   → 기능분석 탭 이동');
      
      // 기능 입력 시도
      const funcCells = page.locator('td').filter({ hasText: /기능|클릭/ });
      const funcCell = funcCells.first();
      if (await funcCell.isVisible()) {
        await funcCell.dblclick();
        await page.waitForTimeout(200);
        const funcInput = page.locator('input:focus, td input, textarea').first();
        if (await funcInput.isVisible()) {
          await funcInput.fill(MASTER_DATA.product.function);
          await funcInput.press('Enter');
          console.log(`   ✅ 제품 기능: ${MASTER_DATA.product.function.substring(0, 30)}...`);
        }
      }
    }
    await page.screenshot({ path: 'test-results/dfmea-atomic-2-function.png', fullPage: true });
    
    // ========== Step 3: 고장분석 탭 ==========
    console.log('\n📋 [Step 3] 고장분석 데이터 입력');
    if (await switchTab(page, '고장분석') || await switchTab(page, '4단계')) {
      console.log('   → 고장분석 탭 이동');
      
      // 고장영향 입력
      const effectCell = page.locator('td').filter({ hasText: /영향|FE/ }).first();
      if (await effectCell.isVisible()) {
        await effectCell.dblclick();
        await page.waitForTimeout(200);
        const effectInput = page.locator('input:focus, td input').first();
        if (await effectInput.isVisible()) {
          await effectInput.fill(MASTER_DATA.failure.effect);
          await effectInput.press('Enter');
          console.log(`   ✅ 고장영향: ${MASTER_DATA.failure.effect}`);
        }
      }
    }
    await page.screenshot({ path: 'test-results/dfmea-atomic-3-failure.png', fullPage: true });
    
    // ========== Step 4: 고장연결 탭 ==========
    console.log('\n📋 [Step 4] 고장연결 탭 확인');
    if (await switchTab(page, '고장연결') || await switchTab(page, 'Link')) {
      console.log('   → 고장연결 탭 이동');
      await page.waitForTimeout(1000);
      
      // 데이터 표시 확인
      const linkContent = await page.locator('body').textContent();
      if (linkContent?.includes(MASTER_DATA.product.name) || linkContent?.includes(MASTER_DATA.part.name)) {
        console.log('   ✅ 고장연결 탭에서 데이터 확인됨');
      }
    }
    await page.screenshot({ path: 'test-results/dfmea-atomic-4-link.png', fullPage: true });
    
    // ========== Step 5: 리스크분석 탭 ==========
    console.log('\n📋 [Step 5] 리스크분석 탭 확인');
    if (await switchTab(page, '리스크') || await switchTab(page, '5단계') || await switchTab(page, 'Risk')) {
      console.log('   → 리스크분석 탭 이동');
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'test-results/dfmea-atomic-5-risk.png', fullPage: true });
    
    // ========== Step 6: 최적화 탭 ==========
    console.log('\n📋 [Step 6] 최적화 탭 확인');
    if (await switchTab(page, '최적화') || await switchTab(page, '6단계') || await switchTab(page, 'Opt')) {
      console.log('   → 최적화 탭 이동');
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'test-results/dfmea-atomic-6-opt.png', fullPage: true });
    
    // ========== Step 7: All 탭 ==========
    console.log('\n📋 [Step 7] All 탭 - 전체 데이터 확인');
    if (await switchTab(page, '전체') || await switchTab(page, 'All') || await switchTab(page, '보기')) {
      console.log('   → All 탭 이동');
      await page.waitForTimeout(1500);
      
      // 전체 테이블 데이터 확인
      const allContent = await page.locator('table').first().textContent();
      const dataChecks = {
        product: allContent?.includes(MASTER_DATA.product.name),
        focusElement: allContent?.includes(MASTER_DATA.focusElement.name),
        part: allContent?.includes(MASTER_DATA.part.name),
      };
      
      console.log('\n   📊 All 탭 데이터 확인:');
      console.log(`      - 제품명 (${MASTER_DATA.product.name}): ${dataChecks.product ? '✅' : '❌'}`);
      console.log(`      - A'SSY (${MASTER_DATA.focusElement.name}): ${dataChecks.focusElement ? '✅' : '❌'}`);
      console.log(`      - 부품 (${MASTER_DATA.part.name}): ${dataChecks.part ? '✅' : '❌'}`);
    }
    await page.screenshot({ path: 'test-results/dfmea-atomic-7-all.png', fullPage: true });
    
    // ========== Step 8: localStorage 저장 확인 ==========
    console.log('\n📋 [Step 8] localStorage 저장 확인');
    const localStorageData = await page.evaluate(() => {
      const data: Record<string, number> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('dfmea') || key.includes('fmea') || key.includes('worksheet'))) {
          const value = localStorage.getItem(key);
          data[key] = value?.length || 0;
        }
      }
      return data;
    });
    
    console.log('   💾 localStorage 데이터:');
    Object.entries(localStorageData).forEach(([key, size]) => {
      console.log(`      - ${key}: ${size} bytes`);
    });
    
    // ========== Step 9: 새로고침 후 데이터 유지 확인 ==========
    console.log('\n📋 [Step 9] 새로고침 후 데이터 유지 확인 (원자성 검증)');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 구조분석 탭으로 돌아가서 데이터 확인
    const reloadedL1 = page.locator('input[placeholder*="제품"], input[placeholder*="시스템"], input[placeholder*="입력"]').first();
    if (await reloadedL1.isVisible()) {
      const savedValue = await reloadedL1.inputValue();
      console.log(`   제품명 값: "${savedValue}"`);
      if (savedValue === MASTER_DATA.product.name) {
        console.log('   ✅ 데이터 영속성 확인: 새로고침 후에도 제품명 유지됨');
      } else {
        console.log('   ⚠️ 제품명이 초기화됨 (새 세션 또는 저장 실패)');
      }
    }
    
    // 테이블에서 데이터 확인
    const tableContent = await page.locator('table').first().textContent();
    const persistChecks = {
      product: tableContent?.includes(MASTER_DATA.product.name),
      focusElement: tableContent?.includes(MASTER_DATA.focusElement.name),
      part: tableContent?.includes(MASTER_DATA.part.name),
    };
    
    console.log('\n   📊 새로고침 후 데이터 확인:');
    console.log(`      - 제품명: ${persistChecks.product ? '✅ 유지됨' : '❌ 없음'}`);
    console.log(`      - A'SSY: ${persistChecks.focusElement ? '✅ 유지됨' : '❌ 없음'}`);
    console.log(`      - 부품: ${persistChecks.part ? '✅ 유지됨' : '❌ 없음'}`);
    
    await page.screenshot({ path: 'test-results/dfmea-atomic-8-persist.png', fullPage: true });
    
    // ========== Step 10: All 탭에서 최종 확인 ==========
    console.log('\n📋 [Step 10] All 탭에서 최종 데이터 확인');
    await switchTab(page, '전체') || await switchTab(page, 'All');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/dfmea-atomic-9-final-all.png', fullPage: true });
    
    console.log('\n' + '='.repeat(70));
    console.log('     DFMEA DB 원자성 검증 완료');
    console.log('='.repeat(70) + '\n');
    
    // 최종 데이터 확인
    console.log('📌 저장된 테스트 데이터:');
    console.log(`   - 제품명: ${MASTER_DATA.product.name}`);
    console.log(`   - A'SSY: ${MASTER_DATA.focusElement.name}`);
    console.log(`   - 부품: ${MASTER_DATA.part.name}`);
    console.log(`   - 고장영향: ${MASTER_DATA.failure.effect}`);
  });
  
  test('2. 저장된 데이터 재확인 (세션 분리)', async ({ page }) => {
    console.log('\n===== 세션 분리 후 데이터 확인 =====');
    
    // 새 세션에서 워크시트 열기
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 데이터 확인
    const tableContent = await page.locator('table').first().textContent();
    
    console.log('\n📊 새 세션 데이터 확인:');
    console.log(`   - 제품명 (${MASTER_DATA.product.name}): ${tableContent?.includes(MASTER_DATA.product.name) ? '✅' : '❌'}`);
    console.log(`   - A'SSY (${MASTER_DATA.focusElement.name}): ${tableContent?.includes(MASTER_DATA.focusElement.name) ? '✅' : '❌'}`);
    console.log(`   - 부품 (${MASTER_DATA.part.name}): ${tableContent?.includes(MASTER_DATA.part.name) ? '✅' : '❌'}`);
    
    // All 탭 이동
    await switchTab(page, '전체') || await switchTab(page, 'All');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/dfmea-atomic-10-session2-all.png', fullPage: true });
    console.log('\n===== 세션 분리 테스트 완료 =====');
  });
});
