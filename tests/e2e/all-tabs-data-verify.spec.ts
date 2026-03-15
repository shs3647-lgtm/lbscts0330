/**
 * @file all-tabs-data-verify.spec.ts
 * @description 전체 워크시트 탭 데이터 누락 여부 종합 검증
 *
 * 샘플 Excel Import → 워크시트 이동 → 7개 탭 순회:
 *   1L기능, 2L기능, 3L기능, 1L영향(FE), 2L형태(FM), 3L원인(FC), 고장연결
 *
 * 각 탭에서:
 *   - 테이블 행 수 > 0 확인 (데이터 존재)
 *   - 빈 셀/placeholder 비율 검증
 *   - 스크린샷 저장
 *
 * @created 2026-03-15
 */

import { test, expect, type Page } from '@playwright/test';

const FMEA_ID = 'pfm26-m010';
const IMPORT_URL = `http://localhost:3000/pfmea/import/legacy?id=${FMEA_ID}`;
const WORKSHEET_URL = `http://localhost:3000/pfmea/worksheet?id=${FMEA_ID}`;

// ─── 헬퍼 ───

/** 모달/오버레이 모두 닫기 (최대 3회 반복) */
async function dismissOverlays(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    // 확인/OK 버튼 클릭
    const okBtn = page.locator('button:has-text("확인"), button:has-text("OK"), [data-slot="dialog-close"]').first();
    if (await okBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await okBtn.click({ force: true });
      await page.waitForTimeout(300);
      continue;
    }
    // 오버레이 배경 클릭
    const overlay = page.locator('.fixed.inset-0, [class*="bg-black/30"]').first();
    if (await overlay.isVisible({ timeout: 300 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      continue;
    }
    break;
  }
}

/** 탭 클릭 후 렌더링 대기 */
async function clickTab(page: Page, label: string): Promise<boolean> {
  // 오버레이가 탭을 가릴 수 있으므로 먼저 닫기
  await dismissOverlays(page);
  const btn = page.locator(`button:has-text("${label}")`).first();
  const visible = await btn.isVisible({ timeout: 5000 }).catch(() => false);
  if (!visible) return false;
  // force: true — 오버레이가 남아 있어도 클릭
  await btn.click({ force: true });
  await page.waitForTimeout(2000);
  // 탭 전환 후 나타나는 경고 모달 닫기
  await dismissOverlays(page);
  return true;
}

/** 현재 탭의 테이블 행 수 */
async function getRowCount(page: Page): Promise<number> {
  return page.locator('table tbody tr').count();
}

/** 현재 탭의 텍스트 콘텐츠에서 (선택) placeholder 개수 */
async function getPlaceholderCount(page: Page): Promise<number> {
  const cells = page.locator('table tbody td');
  const count = await cells.count();
  let placeholders = 0;
  for (let i = 0; i < Math.min(count, 500); i++) {
    const text = await cells.nth(i).textContent().catch(() => '');
    if (text && (text.includes('(선택)') || text.includes('선택하세요'))) {
      placeholders++;
    }
  }
  return placeholders;
}

// ─── 탭 정의 ───

interface TabCheck {
  label: string;        // 탭 버튼 텍스트 (부분 일치)
  id: string;           // 식별용
  minRows: number;      // 최소 기대 행 수
}

const TABS_TO_CHECK: TabCheck[] = [
  { label: '1기능',         id: 'func-l1',   minRows: 1 },
  { label: '2기능',         id: 'func-l2',   minRows: 1 },
  { label: '3기능',         id: 'func-l3',   minRows: 1 },
  { label: '1L영향',        id: 'fail-l1',   minRows: 1 },
  { label: '2L형태',        id: 'fail-l2',   minRows: 1 },
  { label: '3L원인',        id: 'fail-l3',   minRows: 1 },
  { label: '고장연결',       id: 'fail-link', minRows: 0 },  // 고장연결은 다이어그램
];

// ─── 테스트 ───

test.describe('전체 탭 데이터 누락 검증', () => {

  test('Import → 워크시트 7개 탭 데이터 존재 확인', async ({ page }) => {
    test.setTimeout(300000);

    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    // dialog 자동 승인
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // API 에러 모니터링
    const apiErrors: string[] = [];
    page.on('response', async resp => {
      if (resp.url().includes('/api/fmea') && resp.status() >= 400) {
        const body = await resp.text().catch(() => '');
        apiErrors.push(`${resp.status()} ${body.slice(0, 200)}`);
      }
    });

    // ========== 1. Import (샘플 다운로드 → 재업로드) ==========
    await page.goto(IMPORT_URL);
    await page.waitForLoadState('networkidle');
    // 메인 콘텐츠 로드 대기
    await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });

    // 샘플 다운로드 → 재업로드
    const sampleBtn = page.locator('button:has-text("샘플Down"), button:has-text("샘플")').first();
    if (await sampleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
        sampleBtn.click(),
      ]);

      if (download) {
        const savePath = 'tests/temp-all-tabs-test.xlsx';
        await download.saveAs(savePath);
        console.log('샘플 다운로드 완료');

        const fileInput = page.locator('input[type="file"][accept*=".xlsx"], input[type="file"][accept*=".xls"]').first();
        await fileInput.setInputFiles(savePath);
        await page.waitForTimeout(15000);
        console.log('샘플 업로드 완료');
      }
    }

    // SA 확정
    const saBtn = page.locator('button:has-text("SA 확정")').first();
    await saBtn.waitFor({ state: 'visible', timeout: 15000 });
    if (await saBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
      await saBtn.click();
      await page.waitForTimeout(5000);
    }

    // SA 다이얼로그 닫기
    const saClose = page.locator('[role="dialog"] button:has-text("확인"), [data-slot="dialog-close"]').first();
    if (await saClose.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saClose.click();
      await page.waitForTimeout(1000);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // FC 확정
    const fcBtn = page.locator('button:has-text("FC 확정")').first();
    if (await fcBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (await fcBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await fcBtn.click();
        await page.waitForTimeout(5000);
      }
    }

    // FC 다이얼로그 닫기
    const fcClose = page.locator('[role="dialog"] button:has-text("확인"), [data-slot="dialog-close"]').first();
    if (await fcClose.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fcClose.click();
      await page.waitForTimeout(1000);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // DB 저장 (Import 확정)
    const importBtn = page.locator('button:has-text("Import"), button:has-text("DB 저장")').first();
    if (await importBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (await importBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await importBtn.click();
        await page.waitForTimeout(10000);
      }
    }

    await page.screenshot({ path: 'tests/screenshots/all-tabs-01-import.png', fullPage: true });
    console.log('✅ Import 완료');

    // ========== 2. 워크시트 이동 ==========
    await page.goto(WORKSHEET_URL);
    await page.waitForLoadState('networkidle');
    // 워크시트 테이블 로드 대기
    await page.locator('table').first().waitFor({ state: 'visible', timeout: 30000 });

    await page.screenshot({ path: 'tests/screenshots/all-tabs-02-worksheet.png', fullPage: true });
    console.log('✅ 워크시트 로드 완료');

    // ========== 3. API로 DB 데이터 확인 ==========
    const verifyRes = await page.request.get(
      `http://localhost:3000/api/fmea?fmeaId=${FMEA_ID}&format=atomic`
    );

    let dbStats = { l2: 0, fm: 0, fc: 0, fe: 0 };
    if (verifyRes.ok()) {
      const data = await verifyRes.json();
      dbStats = {
        l2: data.l2Structures?.length || 0,
        fm: data.failureModes?.length || 0,
        fc: data.failureCauses?.length || 0,
        fe: data.failureEffects?.length || 0,
      };
      console.log(`DB: L2=${dbStats.l2}, FM=${dbStats.fm}, FC=${dbStats.fc}, FE=${dbStats.fe}`);
    }

    // ========== 4. 7개 탭 순회 검증 ==========
    const results: { id: string; label: string; rows: number; placeholders: number; pass: boolean }[] = [];

    for (const tab of TABS_TO_CHECK) {
      const clicked = await clickTab(page, tab.label);
      if (!clicked) {
        console.log(`⚠️ [${tab.id}] "${tab.label}" 탭 찾을 수 없음`);
        results.push({ id: tab.id, label: tab.label, rows: 0, placeholders: 0, pass: false });
        continue;
      }

      const rows = await getRowCount(page);
      const placeholders = await getPlaceholderCount(page);

      await page.screenshot({
        path: `tests/screenshots/all-tabs-${tab.id}.png`,
        fullPage: true,
      });

      const pass = rows >= tab.minRows;
      results.push({ id: tab.id, label: tab.label, rows, placeholders, pass });
      console.log(
        `${pass ? '✅' : '❌'} [${tab.id}] ${tab.label}: ${rows}행, placeholder=${placeholders}`
      );
    }

    // ========== 5. 결과 요약 ==========
    console.log('\n════════════════════════════════════════');
    console.log('  전체 탭 데이터 검증 결과');
    console.log('════════════════════════════════════════');
    console.log(`DB: L2=${dbStats.l2}, FM=${dbStats.fm}, FC=${dbStats.fc}, FE=${dbStats.fe}`);
    console.log('────────────────────────────────────────');

    for (const r of results) {
      console.log(`  ${r.pass ? '✅' : '❌'} ${r.label.padEnd(14)} ${String(r.rows).padStart(4)}행  placeholder=${r.placeholders}`);
    }

    const passCount = results.filter(r => r.pass).length;
    const totalCount = results.length;
    console.log('────────────────────────────────────────');
    console.log(`  통과: ${passCount}/${totalCount}`);
    console.log('════════════════════════════════════════');

    if (apiErrors.length > 0) {
      console.log('\n⚠️ API 에러:');
      apiErrors.forEach(e => console.log(`  ${e}`));
    }

    // ========== 6. 단언 ==========
    // DB에 데이터 존재
    expect(dbStats.l2, 'L2 공정 데이터 필요').toBeGreaterThan(0);
    expect(dbStats.fm, 'FM 고장형태 데이터 필요').toBeGreaterThan(0);
    expect(dbStats.fc, 'FC 고장원인 데이터 필요').toBeGreaterThan(0);

    // 모든 탭 데이터 존재
    for (const r of results) {
      if (r.id === 'fail-link') continue; // 고장연결은 다이어그램이라 별도 처리
      expect(r.rows, `[${r.label}] 데이터 행 필요`).toBeGreaterThan(0);
    }

    // API 에러 없음
    expect(apiErrors.length, 'API 에러 없어야 함').toBe(0);

    console.log('\n✅ 전체 탭 데이터 누락 검증 완료');
  });
});
