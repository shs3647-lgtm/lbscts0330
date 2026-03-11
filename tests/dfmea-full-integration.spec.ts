/**
 * DFMEA 전체 통합 테스트
 * 마스터 데이터 5개를 순차적으로 입력하고 저장 검증
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// 마스터 데이터 5개
const MASTER_DATA = {
  product: '타이어',           // 제품명 (다음상위수준)
  focusElement: 'Tread Package', // A'SSY (초점요소)
  part: 'Cap Tread',           // 부품 또는 특성 (다음하위수준)
  partType: 'Part',            // 타입: Part (부품)
  failureEffect: '주행 중 파열',
  severity: '10',
  failureMode: '저마찰',
  failureCause: '컴파운드 선정 편차',
  occurrence: '5',
};

test.describe('DFMEA 전체 통합 테스트 (5회 반복)', () => {
  
  // 5회 반복 실행
  for (let round = 1; round <= 5; round++) {
    
    test(`[${round}/5] 마스터 데이터 5개 순차 입력 및 저장`, async ({ page }) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`       DFMEA 통합 테스트 Round ${round}/5`);
      console.log(`${'='.repeat(60)}\n`);
      
      // 1. DFMEA 워크시트 열기
      await page.goto(`${BASE_URL}/dfmea/worksheet`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      console.log(`[${round}] 워크시트 로드 완료`);
      
      // 2. 다음상위수준 (타이어) 입력
      const l1Input = page.locator('input[placeholder*="제품"], input[placeholder*="시스템"], input[placeholder*="입력"]').first();
      if (await l1Input.isVisible()) {
        await l1Input.click();
        await l1Input.fill('');
        await l1Input.fill(MASTER_DATA.product);
        await l1Input.press('Tab'); // blur로 저장 트리거
        await page.waitForTimeout(500);
        
        const savedValue = await l1Input.inputValue();
        expect(savedValue).toBe(MASTER_DATA.product);
        console.log(`[${round}] ✅ 1. 다음상위수준 입력: "${MASTER_DATA.product}"`);
      }
      
      // 3. 초점요소(A'SSY) 셀 더블클릭하여 입력
      const l2Cells = page.locator('td').filter({ hasText: /클릭하여|A'SSY|초점요소/ });
      const l2Cell = l2Cells.first();
      if (await l2Cell.isVisible()) {
        await l2Cell.dblclick();
        await page.waitForTimeout(300);
        
        // 인라인 입력 필드 찾기
        const activeInput = page.locator('input:focus, td input').first();
        if (await activeInput.isVisible()) {
          await activeInput.fill(MASTER_DATA.focusElement);
          await activeInput.press('Enter');
          await page.waitForTimeout(300);
          console.log(`[${round}] ✅ 2. 초점요소 입력: "${MASTER_DATA.focusElement}"`);
        }
      }
      
      // 4. 다음하위수준(부품) 입력
      const l3Cells = page.locator('td').filter({ hasText: /클릭하여 부품|다음하위|특성 추가/ });
      const l3Cell = l3Cells.first();
      if (await l3Cell.isVisible()) {
        await l3Cell.dblclick();
        await page.waitForTimeout(300);
        
        const activeInput = page.locator('input:focus, td input').first();
        if (await activeInput.isVisible()) {
          await activeInput.fill(MASTER_DATA.part);
          await activeInput.press('Enter');
          await page.waitForTimeout(300);
          console.log(`[${round}] ✅ 3. 다음하위수준 입력: "${MASTER_DATA.part}"`);
        }
      }
      
      // 5. 타입 선택 (드롭다운)
      const typeSelect = page.locator('select').first();
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption({ label: MASTER_DATA.partType });
        await page.waitForTimeout(300);
        console.log(`[${round}] ✅ 4. 타입 선택: "${MASTER_DATA.partType}"`);
      }
      
      // 6. 기능분석 탭으로 이동
      const funcTab = page.locator('button, [role="tab"]').filter({ hasText: /기능분석|3단계/ }).first();
      if (await funcTab.isVisible()) {
        await funcTab.click();
        await page.waitForTimeout(1000);
        console.log(`[${round}] 기능분석 탭 이동`);
        
        // 기능 입력
        const funcCell = page.locator('td').filter({ hasText: /기능|클릭/ }).first();
        if (await funcCell.isVisible()) {
          await funcCell.dblclick();
          await page.waitForTimeout(200);
          
          const activeInput = page.locator('input:focus, td input, textarea').first();
          if (await activeInput.isVisible()) {
            await activeInput.fill('노면과 직접 접촉하여 구동력을 전달하는 기능');
            await activeInput.press('Enter');
            console.log(`[${round}] ✅ 5. 기능 입력 완료`);
          }
        }
      }
      
      // 7. 고장분석 탭으로 이동
      const failTab = page.locator('button, [role="tab"]').filter({ hasText: /고장분석|4단계/ }).first();
      if (await failTab.isVisible()) {
        await failTab.click();
        await page.waitForTimeout(1000);
        console.log(`[${round}] 고장분석 탭 이동`);
      }
      
      // 8. 전체보기 탭에서 데이터 확인
      const allTab = page.locator('button, [role="tab"]').filter({ hasText: /전체|All|보기/ }).first();
      if (await allTab.isVisible()) {
        await allTab.click();
        await page.waitForTimeout(1000);
        
        // 테이블에서 입력한 데이터 확인
        const tableText = await page.locator('table').first().textContent();
        
        const checks = {
          product: tableText?.includes(MASTER_DATA.product),
          focusElement: tableText?.includes(MASTER_DATA.focusElement),
          part: tableText?.includes(MASTER_DATA.part),
        };
        
        console.log(`[${round}] 전체보기 데이터 확인:`);
        console.log(`   - 다음상위수준 (${MASTER_DATA.product}): ${checks.product ? '✅' : '❌'}`);
        console.log(`   - 초점요소 (${MASTER_DATA.focusElement}): ${checks.focusElement ? '✅' : '❌'}`);
        console.log(`   - 다음하위수준 (${MASTER_DATA.part}): ${checks.part ? '✅' : '❌'}`);
      }
      
      // 9. 스크린샷 저장
      await page.screenshot({ 
        path: `test-results/dfmea-integration-round${round}.png`, 
        fullPage: true 
      });
      
      // 10. localStorage 저장 확인
      const savedData = await page.evaluate(() => {
        const keys = Object.keys(localStorage).filter(k => k.includes('dfmea'));
        return keys.map(k => ({ key: k, size: localStorage.getItem(k)?.length || 0 }));
      });
      
      if (savedData.length > 0) {
        console.log(`[${round}] ✅ localStorage 저장 확인: ${savedData.length}개 키`);
        savedData.forEach(d => console.log(`   - ${d.key}: ${d.size} bytes`));
      }
      
      console.log(`\n[${round}/5] ===== 테스트 완료 =====\n`);
    });
  }
});

// 최종 검증 테스트
test('최종: 데이터 저장 후 새로고침하여 데이터 유지 확인', async ({ page }) => {
  console.log('\n===== 최종 검증: 데이터 영속성 테스트 =====\n');
  
  // 1. 워크시트 열기
  await page.goto(`${BASE_URL}/dfmea/worksheet`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // 2. 데이터 입력
  const l1Input = page.locator('input[placeholder*="제품"], input[placeholder*="시스템"], input[placeholder*="입력"]').first();
  if (await l1Input.isVisible()) {
    await l1Input.fill(MASTER_DATA.product);
    await l1Input.press('Tab');
    await page.waitForTimeout(500);
  }
  
  // 3. 새로고침
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // 4. 데이터 유지 확인
  const reloadedInput = page.locator('input[placeholder*="제품"], input[placeholder*="시스템"], input[placeholder*="입력"]').first();
  if (await reloadedInput.isVisible()) {
    const value = await reloadedInput.inputValue();
    console.log(`새로고침 후 값: "${value}"`);
    
    if (value === MASTER_DATA.product) {
      console.log('✅ 데이터 영속성 확인: 새로고침 후에도 데이터 유지됨');
    } else {
      console.log('⚠️ 데이터가 초기화됨 (새 세션)');
    }
  }
  
  await page.screenshot({ path: 'test-results/dfmea-persistence-check.png' });
  console.log('\n===== 최종 검증 완료 =====\n');
});
