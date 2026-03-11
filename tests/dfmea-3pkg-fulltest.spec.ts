/**
 * DFMEA 3패키지 × 2부품 전체 테스트
 * 구조분석 → 고장연결 → All 화면까지 데이터 저장 검증
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// 테스트 데이터: 타이어 - 3개 패키지 × 각 2개 부품
const TEST_STRUCTURE = {
  product: '타이어',
  packages: [
    {
      name: 'Tread Package',
      parts: ['Cap Tread', 'Tread Cushion'],
    },
    {
      name: 'Belt Package', 
      parts: ['Steel Belt 1', 'Steel Belt 2'],
    },
    {
      name: 'Carcass Package',
      parts: ['Body Ply', 'Inner Liner'],
    },
  ],
};

test('DFMEA 3패키지 전체 테스트 - 모든 화면 저장', async ({ page }) => {
  console.log('\n' + '='.repeat(70));
  console.log('  DFMEA 3패키지 × 2부품 전체 테스트');
  console.log('='.repeat(70));
  
  // 1. 워크시트 열기
  await page.goto(`${BASE_URL}/dfmea/worksheet`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('\n✅ 워크시트 로드');
  
  // 2. 제품명 입력
  const l1Input = page.locator('input').first();
  await l1Input.fill(TEST_STRUCTURE.product);
  await l1Input.press('Tab');
  await page.waitForTimeout(500);
  console.log(`✅ 제품명: ${TEST_STRUCTURE.product}`);
  
  // 3. 구조분석 스크린샷
  await page.screenshot({ path: 'test-results/01-structure.png', fullPage: true });
  console.log('📸 구조분석 저장: test-results/01-structure.png');
  
  // 4. 기능분석 탭
  const tabs = page.locator('button, [role="tab"]');
  const funcTab = tabs.filter({ hasText: /기능|3단계|Function/ }).first();
  if (await funcTab.isVisible().catch(() => false)) {
    await funcTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'test-results/02-function.png', fullPage: true });
  console.log('📸 기능분석 저장: test-results/02-function.png');
  
  // 5. 고장분석 탭
  const failTab = tabs.filter({ hasText: /고장분석|4단계|Failure/ }).first();
  if (await failTab.isVisible().catch(() => false)) {
    await failTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'test-results/03-failure.png', fullPage: true });
  console.log('📸 고장분석 저장: test-results/03-failure.png');
  
  // 6. 고장연결 탭
  const linkTab = tabs.filter({ hasText: /고장연결|Link/ }).first();
  if (await linkTab.isVisible().catch(() => false)) {
    await linkTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'test-results/04-failure-link.png', fullPage: true });
  console.log('📸 고장연결 저장: test-results/04-failure-link.png');
  
  // 7. 리스크 탭
  const riskTab = tabs.filter({ hasText: /리스크|5단계|Risk/ }).first();
  if (await riskTab.isVisible().catch(() => false)) {
    await riskTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'test-results/05-risk.png', fullPage: true });
  console.log('📸 리스크 저장: test-results/05-risk.png');
  
  // 8. 최적화 탭
  const optTab = tabs.filter({ hasText: /최적화|6단계|Opt/ }).first();
  if (await optTab.isVisible().catch(() => false)) {
    await optTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'test-results/06-optimization.png', fullPage: true });
  console.log('📸 최적화 저장: test-results/06-optimization.png');
  
  // 9. All 탭
  const allTab = tabs.filter({ hasText: /전체|All|보기/ }).first();
  if (await allTab.isVisible().catch(() => false)) {
    await allTab.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: 'test-results/07-all.png', fullPage: true });
  console.log('📸 All 저장: test-results/07-all.png');
  
  console.log('\n' + '='.repeat(70));
  console.log('  모든 화면 스크린샷 저장 완료');
  console.log('  경로: test-results/01~07-*.png');
  console.log('='.repeat(70) + '\n');
});
