/**
 * @file fc-matching-100.spec.ts
 * @description FC 고장사슬 매칭률 100% 검증
 *
 * 샘플 템플릿 Excel 다운로드 → 재업로드 → SA 확정 → FC 확정 → 매칭률 100% 확인
 *
 * 100% 매칭 시 FC 확정은 경고 다이얼로그 없이 바로 확정됨 상태로 전환.
 * 따라서 "FC 확정됨" 버튼 표시를 우선 확인하고, 다이얼로그가 뜬 경우에만 매칭률을 추출.
 *
 * @created 2026-03-14
 */

import { test, expect } from '@playwright/test';

const FMEA_ID = 'pfm26-m010';
const IMPORT_URL = `http://localhost:3000/pfmea/import/legacy?id=${FMEA_ID}`;

test.describe('FC 매칭률 100% 검증', () => {

  test('샘플 다운로드 → 업로드 → SA 확정 → FC 확정 → 매칭률 100%', async ({ page }) => {
    test.setTimeout(300000);

    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    // dialog 자동 승인
    page.on('dialog', async dialog => {
      console.log(`Dialog: ${dialog.message().substring(0, 300)}`);
      await dialog.accept();
    });

    // 1. Import 페이지 이동
    await page.goto(IMPORT_URL);
    await page.waitForLoadState('networkidle');
    // BD 테이블 또는 메인 콘텐츠 로드 대기
    await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });

    // 2. 샘플 다운로드 → 재업로드
    const sampleBtn = page.locator('button:has-text("샘플Down"), button:has-text("샘플")').first();
    if (await sampleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
        sampleBtn.click(),
      ]);

      if (download) {
        const savePath = 'tests/temp-fc-test-template.xlsx';
        await download.saveAs(savePath);
        console.log(`샘플 다운로드 완료: ${savePath}`);

        const fileInput = page.locator('input[type="file"][accept*=".xlsx"], input[type="file"][accept*=".xls"]').first();
        await fileInput.setInputFiles(savePath);
        await page.waitForTimeout(15000);
        console.log('샘플 재업로드 완료');
      }
    }

    await page.screenshot({ path: 'tests/screenshots/fc-match-01-after-upload.png', fullPage: true });

    // 3. SA 확정
    const saBtn = page.locator('button:has-text("SA 확정")').first();
    await saBtn.waitFor({ state: 'visible', timeout: 15000 });
    if (await saBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
      await saBtn.click();
      await page.waitForTimeout(5000);
      console.log('SA 확정 클릭');
    }

    // SA 결과 다이얼로그 닫기
    const saCloseBtn = page.locator('[role="dialog"] button:has-text("확인"), [data-slot="dialog-close"]').first();
    if (await saCloseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saCloseBtn.click();
      await page.waitForTimeout(1000);
    }
    // Escape로 잔여 다이얼로그 닫기
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/fc-match-02-after-sa.png', fullPage: true });

    // 4. FC 탭 클릭 (있으면)
    const fcTab = page.locator('button:has-text("FC"), [role="tab"]:has-text("FC")').first();
    if (await fcTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fcTab.click();
      await page.waitForTimeout(2000);
      console.log('FC 탭 클릭');
    }

    // 5. FC 확정 클릭
    const fcBtn = page.locator('button:has-text("FC 확정")').first();
    await fcBtn.waitFor({ state: 'visible', timeout: 15000 });
    if (await fcBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
      await fcBtn.click();
      await page.waitForTimeout(5000);
      console.log('FC 확정 클릭');
    }

    await page.screenshot({ path: 'tests/screenshots/fc-match-03-fc-result.png', fullPage: true });

    // 6. 결과 판정 — 두 가지 시나리오 처리
    //    A) 100% 매칭 → 다이얼로그 없이 바로 "FC 확정됨" 버튼 표시
    //    B) <100% 매칭 → 경고 다이얼로그 표시 (매칭률, 누락 건수)

    // 먼저 "FC 확정됨" 버튼 확인 (100% 시나리오)
    const fcConfirmedBtn = page.locator('button:has-text("FC 확정됨")').first();
    const isConfirmed = await fcConfirmedBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`FC 확정됨 버튼 표시: ${isConfirmed}`);

    if (isConfirmed) {
      // ★ 100% 매칭 — 다이얼로그 미표시, 바로 확정됨
      console.log('FC 매칭률 100% — 다이얼로그 없이 바로 확정됨');
    } else {
      // 다이얼로그가 떴을 수 있음 — 매칭률/누락 확인
      const fcDialogContent = await page.locator('[role="dialog"], [data-slot="dialog"]').first().textContent().catch(() => '');
      console.log(`FC 다이얼로그: ${(fcDialogContent || '').slice(0, 500)}`);

      const matchRateMatch = (fcDialogContent || '').match(/매칭률[:\s]*(\d+)%/);
      const matchRate = matchRateMatch ? parseInt(matchRateMatch[1]) : -1;
      console.log(`FC 매칭률: ${matchRate}%`);

      const missingMatch = (fcDialogContent || '').match(/누락\s*(\d+)\s*건/);
      const missingCount = missingMatch ? parseInt(missingMatch[1]) : -1;
      console.log(`FC 누락: ${missingCount}건`);

      // 다이얼로그 닫기
      const fcCloseBtn = page.locator('[role="dialog"] button:has-text("확인"), [data-slot="dialog-close"]').first();
      if (await fcCloseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fcCloseBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      // ★ 검증: 매칭률 100% 또는 누락 0건이어야 함
      if (matchRate >= 0) {
        expect(matchRate, `FC 매칭률 ${matchRate}% — 100% 목표`).toBe(100);
      } else if (missingCount >= 0) {
        expect(missingCount, `FC 누락 ${missingCount}건 — 0건 목표`).toBe(0);
      } else {
        // 다이얼로그도 없고 확정됨도 안 보임 — 예상치 못한 상태
        expect(false, 'FC 확정됨 버튼도 없고 매칭률 다이얼로그도 없음 — 비정상 상태').toBeTruthy();
      }
    }

    await page.screenshot({ path: 'tests/screenshots/fc-match-04-final.png', fullPage: true });

    // 관련 로그 출력
    const relatedLogs = logs.filter(l =>
      l.includes('FC') || l.includes('매칭') || l.includes('missing') ||
      l.includes('match') || l.includes('chain') || l.includes('누락')
    );
    console.log('\n=== FC 관련 로그 ===');
    relatedLogs.slice(0, 30).forEach(l => console.log(`  ${l}`));

    console.log('\nFC 매칭률 검증 완료');
  });
});
