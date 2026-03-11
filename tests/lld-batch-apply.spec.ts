/**
 * @file lld-batch-apply.spec.ts
 * @description LLD 일괄추천 적용 후 워크시트 UI 실시간 반영 검증
 *
 * 핵심 검증: applyLldFilter 호출 후 LLD 셀과 개선대책 셀이
 * 새로고침 없이 즉시 업데이트되는지 확인
 */

import { test, expect } from '@playwright/test';

test.describe('LLD 일괄추천 적용 → 워크시트 UI 반영', () => {

  test('전체선택 후 적용 → LLD/개선대책 셀이 즉시 업데이트된다', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

    // 1. PFMEA 목록 → 워크시트 진입
    await page.goto('/pfmea/list', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const worksheetLinks = page.locator('a[href*="/pfmea/worksheet"]');
    const linkCount = await worksheetLinks.count();
    test.skip(linkCount === 0, 'PFMEA 프로젝트가 없습니다');
    await worksheetLinks.first().click();

    await page.waitForURL('**/pfmea/worksheet**', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // ALL 탭 클릭
    const allTabBtn = page.locator('button:has-text("전체"), button:has-text("ALL")').first();
    if (await allTabBtn.isVisible()) {
      await allTabBtn.click();
      await page.waitForTimeout(2000);
    }

    // 2. 적용 전 상태 캡처: LLD 셀에 LLD26-xxx 값이 있는 셀 수
    const lldValuesBefore = await page.locator('td div').filter({ hasText: /^LLD\d{2}-\d{3}/ }).count();
    console.log(`[적용 전] LLD 번호 셀: ${lldValuesBefore}`);

    // 3. LLD추천 버튼 클릭
    const lldButton = page.locator('button:has-text("LLD추천")').first();
    await expect(lldButton).toBeVisible({ timeout: 5000 });
    await lldButton.click();

    // 4. 모달 대기 — "적용" 버튼 출현
    const applyBtn = page.locator('button').filter({ hasText: /적용\(/ });
    await expect(applyBtn).toBeVisible({ timeout: 15000 });

    let applyText = await applyBtn.textContent() || '';
    console.log(`[모달 초기] ${applyText}`);

    // 5. "전체선택" 체크박스 클릭 (모든 항목 선택)
    // 모달의 첫번째 체크박스가 전체선택
    const allCheckbox = page.locator('input[type="checkbox"]').first();
    await allCheckbox.click();
    await page.waitForTimeout(500);

    // 적용 버튼 건수 확인
    applyText = await applyBtn.textContent() || '';
    console.log(`[전체선택 후] ${applyText}`);

    // 건수가 0이면 이미 전체 체크해제된 상태 → 다시 클릭
    if (applyText.includes('(0건)')) {
      await allCheckbox.click();
      await page.waitForTimeout(500);
      applyText = await applyBtn.textContent() || '';
      console.log(`[재클릭 후] ${applyText}`);
    }

    // 적용할 항목이 있어야 함
    const match = applyText.match(/\((\d+)건\)/);
    const applyCount = match ? parseInt(match[1]) : 0;
    console.log(`적용 예정 건수: ${applyCount}`);
    test.skip(applyCount === 0, '적용할 LLD 항목이 없습니다');

    // 6. 적용 버튼 클릭
    await applyBtn.click();

    // 7. 모달 닫힘 + 워크시트 업데이트 대기
    await page.waitForTimeout(3000);

    // 8. 검증: LLD 셀에 LLD 번호가 표시되었는지 (적용 후)
    const lldValuesAfter = await page.locator('td div').filter({ hasText: /^LLD\d{2}-\d{3}/ }).count();
    console.log(`[적용 후] LLD 번호 셀: ${lldValuesAfter}`);

    // 적용 후 LLD 셀 수가 적용 전보다 같거나 많아야 함
    expect(lldValuesAfter).toBeGreaterThanOrEqual(lldValuesBefore);
    // 최소 1개 이상 있어야 함
    expect(lldValuesAfter).toBeGreaterThan(0);

    // 9. 검증: 개선대책에 [LLDxx-xxx] 형태 참조가 있는지
    const improvementCount = await page.locator('td').filter({ hasText: /\[LLD\d{2}-\d{3}\]/ }).count();
    console.log(`[적용 후] 개선대책 LLD 참조: ${improvementCount}`);
    expect(improvementCount).toBeGreaterThan(0);

    // 10. 검증: tooltip에 LLD 정보가 있는지
    const tooltipCount = await page.locator('td[title*="LLD26-"]').count();
    console.log(`[적용 후] LLD tooltip 셀: ${tooltipCount}`);
    expect(tooltipCount).toBeGreaterThan(0);

    // 11. 스크린샷
    await page.screenshot({ path: 'tests/test-results/lld-batch-apply-after.png', fullPage: false });

    // 12. 새로고침 후에도 LLD 값이 유지되는지 (DB 저장 검증)
    await page.waitForTimeout(2000); // DB 저장 대기
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // ALL 탭 다시 클릭
    const allTabBtn2 = page.locator('button:has-text("전체"), button:has-text("ALL")').first();
    if (await allTabBtn2.isVisible()) {
      await allTabBtn2.click();
      await page.waitForTimeout(2000);
    }

    const lldValuesReload = await page.locator('td div').filter({ hasText: /^LLD\d{2}-\d{3}/ }).count();
    console.log(`[새로고침 후] LLD 번호 셀: ${lldValuesReload}`);
    expect(lldValuesReload).toBeGreaterThan(0);

    await page.screenshot({ path: 'tests/test-results/lld-batch-apply-reload.png', fullPage: false });

    // LLD 관련 로그 출력
    const lldLogs = consoleLogs.filter(l => l.includes('LLD'));
    if (lldLogs.length > 0) {
      console.log('LLD 로그:\n' + lldLogs.slice(-15).join('\n'));
    }

    console.log('=== 테스트 완료: LLD 일괄추천 적용 + UI 반영 + DB 저장 검증 ===');
  });
});
