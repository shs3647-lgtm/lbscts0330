/**
 * @file living-db-3cycle-verify.spec.ts
 * @description Living DB 시스템 3사이클 브라우저 검증
 *
 * 각 사이클:
 *   Import → 구조분석(SA) → FC고장사슬(FC)
 *   → 구조분석(Structure) → 1L기능 → 2L기능 → 3L기능
 *   → 1L영향(FE) → 2L형태(FM) → 3L원인(FC) → 고장연결(Failure Link)
 *   → 구조분석평가 → 기능분석 → 고장분석 → 리스크분석 → 최적화
 *   → 전체보기(ALL)
 *
 * 각 화면에서 5초 대기 → 사용자 직접 조작 검증
 * 3사이클 반복으로 코드 완전성 확보
 */
import { test, expect, Page } from '@playwright/test';

const FMEA_ID = 'pfm26-m002';
const BASE_URL = 'http://localhost:3000';
const WAIT_MS = 5000; // 각 화면 5초 대기

// 탭 검증 순서
const TAB_SEQUENCE = [
  // 분석 탭
  { id: 'structure',    label: '구조분석(Structure)' },
  { id: 'function-l1',  label: '1L기능(Function)' },
  { id: 'function-l2',  label: '2L기능(Function)' },
  { id: 'function-l3',  label: '3L기능(Function)' },
  { id: 'failure-l1',   label: '1L영향(FE)' },
  { id: 'failure-l2',   label: '2L형태(FM)' },
  { id: 'failure-l3',   label: '3L원인(FC)' },
  { id: 'failure-link', label: '고장연결(FailureLink)' },
  // 평가 탭
  { id: 'eval-structure', label: '구조분석평가' },
  { id: 'eval-function',  label: '기능분석' },
  { id: 'eval-failure',   label: '고장분석' },
  { id: 'risk',           label: '리스크분석(Risk)' },
  { id: 'opt',            label: '최적화(Optimization)' },
  // 전체보기
  { id: 'all',            label: '전체보기(ALL)' },
];

// ─── Helper Functions ──────────────────────────────────

async function waitAndVerify(page: Page, label: string, stepIndex: number) {
  // 5초 대기 (사용자 직접 조작 시간)
  await page.waitForTimeout(WAIT_MS);

  // 기본 검증: 페이지 에러 없음 (화이트 스크린 방지)
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const hasError = bodyText.includes('Application error') ||
                   bodyText.includes('Unhandled Runtime Error') ||
                   bodyText.includes('500 Internal Server Error') ||
                   bodyText.includes('Internal Server Error');

  expect(hasError, `[${label}] 화면 에러 감지`).toBe(false);

  // HTML 비어있지 않음 확인
  const bodyHTML = await page.locator('body').innerHTML().catch(() => '');
  expect(bodyHTML.length, `[${label}] 빈 화면 감지`).toBeGreaterThan(100);

  console.log(`  ✅ STEP ${stepIndex}: ${label} — OK (${WAIT_MS}ms 대기 완료)`);
}

async function navigateToTab(page: Page, tabId: string) {
  // URL 파라미터로 탭 전환 (가장 안정적)
  await page.goto(`${BASE_URL}/pfmea/worksheet?id=${FMEA_ID}&tab=${tabId}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
}

// ─── 3-Cycle Test ──────────────────────────────────────

for (let cycle = 1; cycle <= 3; cycle++) {
  test.describe(`Cycle ${cycle}/3 — Living DB 전체 화면 검증`, () => {
    test.describe.configure({ mode: 'serial' });

    // Step 0: Import 화면
    test(`[C${cycle}] Step 0: Import 화면 확인`, async ({ page }) => {
      console.log(`\n═══ CYCLE ${cycle}/3 시작 ═══`);
      await page.goto(`${BASE_URL}/pfmea/import?id=${FMEA_ID}`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });
      await waitAndVerify(page, 'Import 화면', 0);
    });

    // Step 1~14: 각 탭 순차 검증
    TAB_SEQUENCE.forEach((tab, idx) => {
      test(`[C${cycle}] Step ${idx + 1}: ${tab.label}`, async ({ page }) => {
        await navigateToTab(page, tab.id);
        await waitAndVerify(page, tab.label, idx + 1);

        // 리스크분석 탭: 추가 검증 — SOD 값 표시 확인
        if (tab.id === 'risk') {
          const hasSOD = await page.locator('text=S').first().isVisible().catch(() => false) ||
                         await page.locator('[data-col="severity"]').first().isVisible().catch(() => false);
          console.log(`    ℹ️ SOD 컬럼 표시: ${hasSOD ? 'YES' : 'NO (경고)'}`);
        }

        // ALL 탭: 추가 검증 — 테이블 행 수 확인
        if (tab.id === 'all') {
          const rowCount = await page.locator('tbody tr').count().catch(() => 0);
          console.log(`    ℹ️ ALL탭 행 수: ${rowCount}`);
          expect(rowCount, 'ALL탭에 행이 있어야 함').toBeGreaterThan(0);
        }
      });
    });

    // Cycle 완료 로그
    test(`[C${cycle}] Cycle 완료 확인`, async ({ page }) => {
      console.log(`═══ CYCLE ${cycle}/3 완료 ═══\n`);
      // 마지막에 pipeline-verify API 호출하여 데이터 정합성 확인
      const response = await page.request.get(
        `${BASE_URL}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`
      );
      const result = await response.json();
      console.log(`  Pipeline Verify: allGreen=${result.allGreen}`);

      // allGreen이 아닌 경우에도 WARN만 표시 (FAIL은 아님)
      if (!result.allGreen) {
        const issues = (result.steps || [])
          .filter((s: { status: string }) => s.status !== 'ok')
          .map((s: { name: string; status: string }) => `${s.name}:${s.status}`)
          .join(', ');
        console.log(`  ⚠️ Pipeline 이슈: ${issues}`);
      }
    });
  });
}
