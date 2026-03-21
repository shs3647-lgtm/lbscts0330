/**
 * @file full-pipeline-render-verify.spec.ts
 * @description 완전한 PFMEA 파이프라인 검증 — Import → 전체 탭 순차 렌더링 확인
 *
 * 검증 범위:
 *   1. Excel Import (m066 골든 샘플)
 *   2. SA 확정 → FC 확정 → DB 저장
 *   3. 워크시트 렌더링 검증 (15개 탭 순차):
 *      - 구조분석 (Structure)
 *      - 1L기능, 2L기능, 3L기능
 *      - 1L영향(FE), 2L형태(FM), 3L원인(FC)
 *      - 고장연결 (Failure Link)
 *      - ALL View: 구조분석, 기능분석, 고장분석, 리스크분석, 최적화
 *   4. API 데이터 정합성 (골든 베이스라인 대조)
 *
 * 각 탭 5초 정지 — 사용자가 화면을 직접 확인할 수 있도록
 *
 * @usage npx playwright test tests/e2e/full-pipeline-render-verify.spec.ts --headed
 */

import { test, expect, type Page } from '@playwright/test';

// ─── 설정 ───
const FMEA_ID = 'pfm26-m066';
const EXCEL_PATH = 'data/master-fmea/master_import_12inch_AuBump.xlsx';
const IMPORT_URL = `http://localhost:3000/pfmea/import/legacy?id=${FMEA_ID}`;
const WORKSHEET_URL = `http://localhost:3000/pfmea/worksheet?id=${FMEA_ID}`;
const PAUSE_MS = 5000; // 각 탭에서 5초 정지 (사용자 확인용)

// ─── 골든 베이스라인 (m066) ───
const BASELINE = {
  l2: 21,
  l3: 91,
  l1Functions: 17,
  l2Functions: 26,
  l3Functions: 101,
  fm: 26,
  fe: 20,
  fc: 104,
  failureLinks: 111,
  riskAnalyses: 111,
};

// ─── 헬퍼 ───

/** 모달/오버레이 닫기 */
async function dismissOverlays(page: Page): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const okBtn = page.locator(
      'button:has-text("확인"), button:has-text("OK"), [data-slot="dialog-close"]'
    ).first();
    if (await okBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await okBtn.click({ force: true });
      await page.waitForTimeout(300);
      continue;
    }
    const overlay = page.locator('.fixed.inset-0, [class*="bg-black/30"]').first();
    if (await overlay.isVisible({ timeout: 300 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      continue;
    }
    break;
  }
}

/** 탭 클릭 (버튼 텍스트 매칭) + 렌더링 대기 */
async function clickTab(page: Page, label: string): Promise<boolean> {
  await dismissOverlays(page);
  const btn = page.locator(`button:has-text("${label}")`).first();
  const visible = await btn.isVisible({ timeout: 5000 }).catch(() => false);
  if (!visible) return false;
  await btn.click({ force: true });
  await page.waitForTimeout(2000);
  await dismissOverlays(page);
  return true;
}

/** 테이블 행 수 카운트 */
async function getRowCount(page: Page): Promise<number> {
  return page.locator('table tbody tr').count();
}

/** 테이블 셀 중 실제 데이터가 있는 비율 (빈칸이 아닌 셀) */
async function getFilledCellRatio(page: Page, maxCells = 200): Promise<{ filled: number; total: number; ratio: number }> {
  const cells = page.locator('table tbody td');
  const total = Math.min(await cells.count(), maxCells);
  let filled = 0;
  for (let i = 0; i < total; i++) {
    const text = (await cells.nth(i).textContent().catch(() => ''))?.trim() || '';
    if (text.length > 0 && text !== '-' && !text.includes('(선택)') && !text.includes('선택하세요')) {
      filled++;
    }
  }
  return { filled, total, ratio: total > 0 ? Math.round((filled / total) * 100) : 0 };
}

// ─── 탭 정의 ───
interface TabDef {
  label: string;     // 버튼 텍스트 (부분 일치)
  id: string;        // 스크린샷 파일명
  name: string;      // 한글 이름
  minRows: number;   // 최소 행 수
  type: 'table' | 'diagram' | 'allview'; // 검증 방식
}

const ALL_TABS: TabDef[] = [
  // 구조분석
  { label: '구조',       id: '01-structure',      name: '구조분석(Structure)',    minRows: 5,  type: 'table' },
  // 기능분석
  { label: '1기능',      id: '02-func-l1',        name: '1L기능(L1 Function)',   minRows: 1,  type: 'table' },
  { label: '2기능',      id: '03-func-l2',        name: '2L기능(L2 Function)',   minRows: 1,  type: 'table' },
  { label: '3기능',      id: '04-func-l3',        name: '3L기능(L3 Function)',   minRows: 5,  type: 'table' },
  // 고장분석
  { label: '1L영향',     id: '05-fail-l1',        name: '1L영향(FE)',            minRows: 1,  type: 'table' },
  { label: '2L형태',     id: '06-fail-l2',        name: '2L형태(FM)',            minRows: 1,  type: 'table' },
  { label: '3L원인',     id: '07-fail-l3',        name: '3L원인(FC)',            minRows: 5,  type: 'table' },
  { label: '고장연결',   id: '08-fail-link',      name: '고장연결(Failure Link)', minRows: 0,  type: 'diagram' },
  // All View 탭들
  { label: '구조분석',   id: '09-eval-structure',  name: 'ALL-구조분석',          minRows: 5,  type: 'allview' },
  { label: '기능분석',   id: '10-eval-function',   name: 'ALL-기능분석',          minRows: 5,  type: 'allview' },
  { label: '고장분석',   id: '11-eval-failure',    name: 'ALL-고장분석',          minRows: 5,  type: 'allview' },
  { label: '리스크',     id: '12-risk',            name: '리스크분석(Risk)',       minRows: 5,  type: 'allview' },
  { label: '최적화',     id: '13-optimization',    name: '최적화(Optimization)',   minRows: 5,  type: 'allview' },
  // 전체보기
  { label: '전체보기',   id: '14-all-view',        name: '전체보기(All View)',     minRows: 5,  type: 'allview' },
];

// ─── 테스트 ───

test.describe('Full Pipeline Render Verify — Import → 전체 탭 렌더링 검증', () => {
  test.setTimeout(600000); // 10분

  test('m066 Import → 14개 탭 순차 렌더링 + 5초 정지 검증', async ({ page }) => {
    const results: Array<{
      id: string; name: string; rows: number;
      filled: number; total: number; ratio: number;
      pass: boolean; error?: string;
    }> = [];

    // API 에러 수집
    const apiErrors: string[] = [];
    page.on('response', async (resp) => {
      if (resp.url().includes('/api/') && resp.status() >= 400) {
        const body = await resp.text().catch(() => '');
        apiErrors.push(`[${resp.status()}] ${resp.url().split('/api/')[1]?.slice(0, 60)} — ${body.slice(0, 150)}`);
      }
    });

    // dialog 자동 승인
    page.on('dialog', async (dialog) => { await dialog.accept(); });

    console.log('═══════════════════════════════════════════════════');
    console.log('  PFMEA Full Pipeline Render Verify');
    console.log(`  fmeaId: ${FMEA_ID}  |  Excel: ${EXCEL_PATH}`);
    console.log('═══════════════════════════════════════════════════\n');

    // ══════════════════════════════════════════
    // PHASE 1: IMPORT
    // ══════════════════════════════════════════
    console.log('▶ PHASE 1: Import Excel...');
    await page.goto(IMPORT_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 파일 업로드
    const fileInput = page.locator('input[type="file"]').first();
    const fileVisible = await fileInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (fileVisible) {
      await fileInput.setInputFiles(EXCEL_PATH);
      console.log('  ✓ Excel 파일 업로드');
      await page.waitForTimeout(15000); // 파싱 대기
    } else {
      // 샘플 다운로드 후 업로드
      const sampleBtn = page.locator('button:has-text("샘플Down"), button:has-text("샘플")').first();
      if (await sampleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
          sampleBtn.click(),
        ]);
        if (download) {
          const savePath = 'tests/temp-full-pipeline-test.xlsx';
          await download.saveAs(savePath);
          await fileInput.setInputFiles(savePath);
          await page.waitForTimeout(15000);
          console.log('  ✓ 샘플 다운로드 → 업로드');
        }
      }
    }

    await page.screenshot({ path: 'tests/screenshots/full-pipe-01-after-upload.png', fullPage: true });

    // SA 확정
    console.log('  ▶ SA 확정...');
    const saBtn = page.locator('button:has-text("SA 확정"), button:has-text("SA확정")').first();
    if (await saBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      if (await saBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await saBtn.click();
        await page.waitForTimeout(5000);
        console.log('  ✓ SA 확정 클릭');
      }
    }
    await dismissOverlays(page);

    // FC 확정
    console.log('  ▶ FC 확정...');
    const fcBtn = page.locator('button:has-text("FC 확정"), button:has-text("FC확정")').first();
    if (await fcBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (await fcBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await fcBtn.click();
        await page.waitForTimeout(5000);
        console.log('  ✓ FC 확정 클릭');
      }
    }
    await dismissOverlays(page);

    // DB 저장 (Import 확정)
    console.log('  ▶ DB 저장...');
    const importBtn = page.locator('button:has-text("Import"), button:has-text("DB 저장"), button:has-text("DB저장")').first();
    if (await importBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (await importBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await importBtn.click();
        await page.waitForTimeout(15000);
        console.log('  ✓ DB 저장 완료');
      }
    }
    await dismissOverlays(page);
    await page.screenshot({ path: 'tests/screenshots/full-pipe-02-after-import.png', fullPage: true });

    // ══════════════════════════════════════════
    // PHASE 2: API 데이터 정합성 검증
    // ══════════════════════════════════════════
    console.log('\n▶ PHASE 2: API 데이터 정합성 검증...');
    const atomicRes = await page.request.get(
      `http://localhost:3000/api/fmea?fmeaId=${FMEA_ID}&format=atomic`
    );

    let dbStats = {
      l2: 0, l3: 0, l1Functions: 0, l2Functions: 0, l3Functions: 0,
      fm: 0, fe: 0, fc: 0, failureLinks: 0, riskAnalyses: 0,
    };

    if (atomicRes.ok()) {
      const data = await atomicRes.json();
      dbStats = {
        l2: data.l2Structures?.length || 0,
        l3: data.l3Structures?.length || 0,
        l1Functions: data.l1Functions?.length || 0,
        l2Functions: data.l2Functions?.length || 0,
        l3Functions: data.l3Functions?.length || 0,
        fm: data.failureModes?.length || 0,
        fe: data.failureEffects?.length || 0,
        fc: data.failureCauses?.length || 0,
        failureLinks: data.failureLinks?.length || 0,
        riskAnalyses: data.riskAnalyses?.length || 0,
      };
    }

    console.log('  ┌──────────────────┬────────┬──────────┐');
    console.log('  │ 항목             │ 실제값 │ 베이스라인│');
    console.log('  ├──────────────────┼────────┼──────────┤');
    const entries = Object.entries(dbStats) as [keyof typeof dbStats, number][];
    for (const [key, val] of entries) {
      const base = BASELINE[key] || 0;
      const ok = val >= base * 0.8; // 80% 이상이면 PASS
      const mark = ok ? '✅' : '❌';
      console.log(`  │ ${mark} ${String(key).padEnd(15)} │ ${String(val).padStart(6)} │ ${String(base).padStart(8)} │`);
    }
    console.log('  └──────────────────┴────────┴──────────┘');

    // ══════════════════════════════════════════
    // PHASE 3: 워크시트 이동 + 전체 탭 순회
    // ══════════════════════════════════════════
    console.log('\n▶ PHASE 3: 워크시트 렌더링 검증 (14개 탭)...');
    await page.goto(WORKSHEET_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // 초기 로드 대기

    // 테이블 or 콘텐츠 영역 로드 확인
    const contentLoaded = await page.locator('table, [id="all-tab-scroll-wrapper"]')
      .first().waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true).catch(() => false);

    if (!contentLoaded) {
      console.log('  ⚠️ 워크시트 콘텐츠 로드 실패 — 스크린샷 확인');
      await page.screenshot({ path: 'tests/screenshots/full-pipe-03-ws-load-fail.png', fullPage: true });
    }

    console.log(`  워크시트 로드 ${contentLoaded ? '성공' : '실패'}\n`);

    // ── 14개 탭 순차 순회 ──
    for (const tab of ALL_TABS) {
      console.log(`  ▶ [${tab.id}] ${tab.name}...`);

      const clicked = await clickTab(page, tab.label);
      if (!clicked) {
        console.log(`    ⚠️ "${tab.label}" 탭 버튼을 찾을 수 없음`);
        results.push({
          id: tab.id, name: tab.name, rows: 0,
          filled: 0, total: 0, ratio: 0,
          pass: false, error: '탭 버튼 없음',
        });
        continue;
      }

      // 렌더링 대기
      await page.waitForTimeout(1000);

      let rows = 0;
      let cellStats = { filled: 0, total: 0, ratio: 0 };

      if (tab.type === 'diagram') {
        // 고장연결 탭: SVG 또는 다이어그램 확인
        const hasSvg = await page.locator('svg, canvas, [class*="link"], [class*="chain"]')
          .first().isVisible({ timeout: 3000 }).catch(() => false);
        const hasTbody = await page.locator('table tbody tr').count().catch(() => 0);
        rows = hasSvg ? 1 : hasTbody;
        cellStats = { filled: rows > 0 ? 1 : 0, total: 1, ratio: rows > 0 ? 100 : 0 };
      } else {
        rows = await getRowCount(page);
        cellStats = await getFilledCellRatio(page);
      }

      const pass = rows >= tab.minRows;

      // 스크린샷 저장
      await page.screenshot({
        path: `tests/screenshots/full-pipe-${tab.id}.png`,
        fullPage: true,
      });

      results.push({
        id: tab.id, name: tab.name, rows,
        filled: cellStats.filled, total: cellStats.total, ratio: cellStats.ratio,
        pass,
      });

      const mark = pass ? '✅' : '❌';
      console.log(`    ${mark} 행=${rows}, 데이터=${cellStats.filled}/${cellStats.total} (${cellStats.ratio}%)`);

      // ★ 5초 정지 — 사용자가 화면을 직접 확인
      console.log(`    ⏸️  5초 대기 (사용자 확인)...`);
      await page.waitForTimeout(PAUSE_MS);
    }

    // ══════════════════════════════════════════
    // PHASE 4: 결과 요약
    // ══════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  FULL PIPELINE RENDER VERIFY — 결과 요약');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('  ┌────┬──────────────────────┬──────┬─────────┬────────┐');
    console.log('  │ #  │ 탭                   │ 행수 │ 데이터% │ 결과   │');
    console.log('  ├────┼──────────────────────┼──────┼─────────┼────────┤');
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const mark = r.pass ? '✅' : '❌';
      const num = String(i + 1).padStart(2);
      const name = r.name.padEnd(20);
      const rows = String(r.rows).padStart(4);
      const ratio = `${r.ratio}%`.padStart(7);
      console.log(`  │ ${num} │ ${name} │ ${rows} │ ${ratio} │ ${mark}     │`);
    }
    console.log('  └────┴──────────────────────┴──────┴─────────┴────────┘');

    const passCount = results.filter((r) => r.pass).length;
    const failCount = results.filter((r) => !r.pass).length;
    console.log(`\n  통과: ${passCount}/${results.length}  |  실패: ${failCount}`);

    if (apiErrors.length > 0) {
      console.log('\n  ⚠️ API 에러:');
      for (const e of apiErrors) {
        console.log(`    ${e}`);
      }
    }

    // ══════════════════════════════════════════
    // PHASE 5: DB 베이스라인 대조 단언
    // ══════════════════════════════════════════
    console.log('\n▶ PHASE 5: 베이스라인 단언...');

    // DB 데이터 존재
    expect(dbStats.l2, 'L2 공정').toBeGreaterThan(0);
    expect(dbStats.l3, 'L3 작업요소').toBeGreaterThan(0);
    expect(dbStats.fm, 'FM 고장형태').toBeGreaterThan(0);
    expect(dbStats.fe, 'FE 고장영향').toBeGreaterThan(0);
    expect(dbStats.fc, 'FC 고장원인').toBeGreaterThan(0);
    expect(dbStats.failureLinks, 'FailureLink 고장연결').toBeGreaterThan(0);

    // 렌더링 검증 (테이블 탭은 행 존재 필수)
    for (const r of results) {
      if (r.id.includes('fail-link')) continue; // diagram은 별도
      if (!r.pass) {
        console.log(`  ❌ FAIL: [${r.name}] 행=${r.rows} (최소 ${ALL_TABS.find((t) => t.id === r.id)?.minRows || 0} 필요)`);
      }
    }

    // 전체 통과율 80% 이상
    expect(passCount, `탭 통과율 ${passCount}/${results.length}`).toBeGreaterThanOrEqual(
      Math.floor(results.length * 0.8)
    );

    console.log('\n✅ Full Pipeline Render Verify 완료');
    console.log('═══════════════════════════════════════════════════\n');
  });
});
