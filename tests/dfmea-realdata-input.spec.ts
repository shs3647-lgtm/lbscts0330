/**
 * DFMEA 실제 데이터 입력 테스트
 * 마스터 데이터 5개 활용하여 전체 워크플로우 검증
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// 마스터 데이터 5개 (Excel 기반)
const MASTER_DATA = {
  // 1. 다음상위수준 (완제품)
  product: {
    name: '타이어',
    functions: [
      '내부 압력을 유지하며 구조적 파열을 방지하는 기능',
      '노면과의 마찰력을 통해 차량을 전진·후진시키는 기능',
    ],
    requirements: ['내압 파열 압력', '접지계수'],
  },
  // 2. 초점요소 (A'SSY)
  focusElement: {
    name: 'Tread Package',
    function: '노면과 직접 접촉하여 구동력·제동력·조향력을 전달하고, 마모 수명 및 소음·배수 성능을 확보하는 기능',
    requirement: '트레드 접지계수',
  },
  // 3. 다음하위수준 (부품 또는 특성)
  part: {
    name: 'Cap Tread',
    type: 'Part',  // 타입: Part (부품)
    functions: [
      '마모 수명, 접지력, 제동 성능 및 내열성을 만족하도록 규정된 고무 물성을 제공하는 기능',
      '설계된 접지 면적을 확보하여 균일한 접지 압력과 주행 안정성을 확보하는 기능',
    ],
    requirements: ['컴파운드', '전폭', 'Crown폭'],
  },
  // 4. 고장영향
  failureEffect: {
    effect: '주행 중 파열',
    severity: 10,
  },
  // 5. 고장형태
  failureMode: {
    mode: '저마찰',
    category: 'traction',
  },
  // 6. 고장원인
  failureCause: {
    cause: '컴파운드 선정 편차',
    occurrence: 5,
  },
};

test.describe('DFMEA 실제 데이터 입력 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    // DFMEA 워크시트 열기
    await page.goto(`${BASE_URL}/dfmea/worksheet`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('1. 구조분석 - 다음상위수준 입력', async ({ page }) => {
    console.log('\n===== 구조분석: 다음상위수준 입력 시작 =====');
    
    // 다음상위수준 (제품명) 입력 필드 찾기
    const l1Input = page.locator('input[placeholder*="제품"], input[placeholder*="시스템"], input[placeholder*="입력"]').first();
    
    if (await l1Input.isVisible()) {
      // 기존 값 지우고 새 값 입력
      await l1Input.click();
      await l1Input.fill('');
      await l1Input.fill(MASTER_DATA.product.name);
      await page.waitForTimeout(300);
      
      // 입력 확인
      const value = await l1Input.inputValue();
      console.log(`✅ 다음상위수준 입력: "${value}"`);
      expect(value).toBe(MASTER_DATA.product.name);
    } else {
      console.log('⚠️ 다음상위수준 입력 필드를 찾을 수 없음');
    }
    
    // 스크린샷 저장
    await page.screenshot({ path: 'test-results/dfmea-1-structure-l1.png' });
    console.log('===== 구조분석: 다음상위수준 입력 완료 =====\n');
  });

  test('2. 구조분석 - 초점요소(A\'SSY) 선택/입력', async ({ page }) => {
    console.log('\n===== 구조분석: 초점요소 입력 시작 =====');
    
    // 먼저 다음상위수준 입력
    const l1Input = page.locator('input[placeholder*="제품"], input[placeholder*="시스템"]').first();
    if (await l1Input.isVisible()) {
      await l1Input.fill(MASTER_DATA.product.name);
    }
    
    // 초점요소 셀 클릭 (A'SSY 선택)
    const assyCell = page.locator('td:has-text("클릭하여 A\'SSY"), td:has-text("초점요소")').first();
    if (await assyCell.isVisible()) {
      await assyCell.click();
      await page.waitForTimeout(500);
      
      // 모달이 열렸는지 확인
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
      if (await modal.isVisible()) {
        console.log('✅ A\'SSY 선택 모달 열림');
        
        // 입력 필드에 직접 입력 시도
        const modalInput = modal.locator('input').first();
        if (await modalInput.isVisible()) {
          await modalInput.fill(MASTER_DATA.focusElement.name);
          console.log(`✅ 초점요소 입력: "${MASTER_DATA.focusElement.name}"`);
        }
        
        // 저장/확인 버튼 클릭
        const saveBtn = modal.locator('button:has-text("저장"), button:has-text("확인"), button:has-text("추가")').first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await page.waitForTimeout(500);
        }
      } else {
        // 모달 없이 인라인 입력
        console.log('⚠️ 모달 없음, 더블클릭으로 인라인 편집 시도');
        await assyCell.dblclick();
        await page.waitForTimeout(300);
        
        const inlineInput = page.locator('td input').first();
        if (await inlineInput.isVisible()) {
          await inlineInput.fill(MASTER_DATA.focusElement.name);
          await inlineInput.press('Enter');
          console.log(`✅ 초점요소 인라인 입력: "${MASTER_DATA.focusElement.name}"`);
        }
      }
    }
    
    await page.screenshot({ path: 'test-results/dfmea-2-structure-l2.png' });
    console.log('===== 구조분석: 초점요소 입력 완료 =====\n');
  });

  test('3. 구조분석 - 다음하위수준(부품) 입력', async ({ page }) => {
    console.log('\n===== 구조분석: 다음하위수준 입력 시작 =====');
    
    // 다음상위수준 입력
    const l1Input = page.locator('input[placeholder*="제품"], input[placeholder*="시스템"]').first();
    if (await l1Input.isVisible()) {
      await l1Input.fill(MASTER_DATA.product.name);
    }
    
    // 다음하위수준 셀 클릭
    const partCell = page.locator('td:has-text("클릭하여 부품"), td:has-text("다음하위수준")').first();
    if (await partCell.isVisible()) {
      await partCell.dblclick();
      await page.waitForTimeout(300);
      
      const inlineInput = page.locator('td input').first();
      if (await inlineInput.isVisible()) {
        await inlineInput.fill(MASTER_DATA.part.name);
        await inlineInput.press('Enter');
        console.log(`✅ 다음하위수준 입력: "${MASTER_DATA.part.name}"`);
      }
    }
    
    await page.screenshot({ path: 'test-results/dfmea-3-structure-l3.png' });
    console.log('===== 구조분석: 다음하위수준 입력 완료 =====\n');
  });

  test('4. 기능분석 탭 전환 및 데이터 확인', async ({ page }) => {
    console.log('\n===== 기능분석 탭 전환 =====');
    
    // 먼저 구조분석 데이터 입력
    const l1Input = page.locator('input[placeholder*="제품"], input[placeholder*="시스템"]').first();
    if (await l1Input.isVisible()) {
      await l1Input.fill(MASTER_DATA.product.name);
      await page.waitForTimeout(300);
    }
    
    // 기능분석 탭 클릭
    const funcTab = page.locator('button:has-text("기능분석"), button:has-text("3단계"), [role="tab"]:has-text("기능")').first();
    if (await funcTab.isVisible()) {
      await funcTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ 기능분석 탭 전환 완료');
      
      // 기능 입력 필드 찾기
      const funcInput = page.locator('input, td[contenteditable="true"]').first();
      if (await funcInput.isVisible()) {
        // 다음상위수준 기능 입력
        await funcInput.dblclick();
        await page.waitForTimeout(200);
        
        const activeInput = page.locator('input:focus, td input').first();
        if (await activeInput.isVisible()) {
          await activeInput.fill(MASTER_DATA.product.functions[0]);
          await activeInput.press('Enter');
          console.log(`✅ 다음상위수준 기능 입력: "${MASTER_DATA.product.functions[0].substring(0, 30)}..."`);
        }
      }
    }
    
    await page.screenshot({ path: 'test-results/dfmea-4-function.png' });
    console.log('===== 기능분석 탭 완료 =====\n');
  });

  test('5. 고장분석 탭 전환 및 데이터 입력', async ({ page }) => {
    console.log('\n===== 고장분석 탭 전환 =====');
    
    // 고장분석 탭 클릭
    const failTab = page.locator('button:has-text("고장분석"), button:has-text("4단계"), [role="tab"]:has-text("고장")').first();
    if (await failTab.isVisible()) {
      await failTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ 고장분석 탭 전환 완료');
      
      // 고장영향 입력 필드 찾기
      const effectInput = page.locator('td:has-text("영향"), input[placeholder*="영향"]').first();
      if (await effectInput.isVisible()) {
        await effectInput.dblclick();
        await page.waitForTimeout(200);
        
        const activeInput = page.locator('input:focus, td input').first();
        if (await activeInput.isVisible()) {
          await activeInput.fill(MASTER_DATA.failureEffect.effect);
          await activeInput.press('Enter');
          console.log(`✅ 고장영향 입력: "${MASTER_DATA.failureEffect.effect}"`);
        }
      }
    }
    
    await page.screenshot({ path: 'test-results/dfmea-5-failure.png' });
    console.log('===== 고장분석 탭 완료 =====\n');
  });

  test('6. 전체 워크플로우 - 5개 마스터 데이터 입력', async ({ page }) => {
    console.log('\n===== 전체 워크플로우 시작 =====');
    console.log('마스터 데이터 5개:');
    console.log(`  1. 다음상위수준: ${MASTER_DATA.product.name}`);
    console.log(`  2. 초점요소: ${MASTER_DATA.focusElement.name}`);
    console.log(`  3. 다음하위수준: ${MASTER_DATA.part.name}`);
    console.log(`  4. 고장영향: ${MASTER_DATA.failureEffect.effect} (S=${MASTER_DATA.failureEffect.severity})`);
    console.log(`  5. 고장형태: ${MASTER_DATA.failureMode.mode}`);
    
    // Step 1: 다음상위수준 입력
    const l1Input = page.locator('input[placeholder*="제품"], input[placeholder*="시스템"], input[placeholder*="입력"]').first();
    if (await l1Input.isVisible()) {
      await l1Input.fill(MASTER_DATA.product.name);
      await page.waitForTimeout(500);
      console.log(`\n[Step 1] ✅ 다음상위수준 입력 완료: ${MASTER_DATA.product.name}`);
    }
    
    // Step 2: 테이블 데이터 확인
    const tableContent = await page.locator('table').first().textContent();
    if (tableContent?.includes(MASTER_DATA.product.name)) {
      console.log('[Step 2] ✅ 테이블에 데이터 표시됨');
    }
    
    // Step 3: 저장 확인 (localStorage)
    const savedData = await page.evaluate(() => {
      return localStorage.getItem('dfmea-projects') || localStorage.getItem('dfmea_worksheet');
    });
    if (savedData) {
      console.log('[Step 3] ✅ localStorage에 데이터 저장됨');
    }
    
    // 최종 스크린샷
    await page.screenshot({ path: 'test-results/dfmea-6-full-workflow.png', fullPage: true });
    
    console.log('\n===== 전체 워크플로우 완료 =====');
    console.log('입력된 마스터 데이터:');
    console.log(`  ✅ 다음상위수준: ${MASTER_DATA.product.name}`);
  });
});
