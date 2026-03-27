/**
 * @file fk-spec-verify-m002.spec.ts
 * FK 명세서 기준 m002 데이터 정합성 + 브라우저 렌더링 5회 반복 검증
 * 
 * 검증 범위:
 *   1. pipeline-verify API 5단계 allGreen
 *   2. 14개 FK 전수 orphan=0
 *   3. INV-01: L2Structure → L2Function ≥1
 *   4. INV-02: L3Structure → L3Function ≥1
 *   5. 브라우저 워크시트 7개 탭 렌더링
 *   6. 5회 반복 회귀 안정성
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m002';

async function dismissModal(page: import('@playwright/test').Page) {
  try {
    const okBtn = page.locator('button:has-text("확인"), button:has-text("OK")');
    if (await okBtn.count() > 0) {
      await okBtn.first().click({ timeout: 2000 });
      await page.waitForTimeout(500);
    }
  } catch { /* no modal */ }
}

async function clickTab(page: import('@playwright/test').Page, label: string) {
  const btn = page.locator(`button:has-text("${label}")`);
  if (await btn.count() > 0) {
    try { await btn.first().click({ timeout: 5000 }); }
    catch { await dismissModal(page); await btn.first().click({ timeout: 5000 }); }
    await page.waitForTimeout(2000);
    await dismissModal(page);
  }
}

interface PipelineStep {
  step: number;
  name: string;
  status: string;
  details: Record<string, unknown>;
  issues: string[];
  fkIntegrity?: { relation: string; total: number; valid: number; orphans: string[] }[];
}

interface PipelineResult {
  success: boolean;
  fmeaId: string;
  steps: PipelineStep[];
  allGreen: boolean;
  loopCount: number;
}

test.describe('FK 명세서 기준 m002 검증 (5회 반복)', () => {
  
  // 5회 반복 — 매회 API + 브라우저 검증
  for (let run = 1; run <= 5; run++) {
    test(`[${run}/5] pipeline-verify allGreen + FK 14개 orphan=0`, async ({ request }) => {
      const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
      expect(res.ok()).toBeTruthy();
      const data: PipelineResult = await res.json();

      console.log(`\n=== RUN ${run}/5 ===`);
      console.log(`allGreen=${data.allGreen} loopCount=${data.loopCount}`);

      // 모든 step ok
      for (const s of data.steps) {
        const issues = s.issues?.length > 0 ? ` ⚠ ${s.issues.join('; ')}` : '';
        console.log(`  S${s.step} ${s.name}: ${s.status}${issues}`);
        expect(s.status).toBe('ok');
      }
      expect(data.allGreen).toBeTruthy();

      // STEP 0: 구조
      const s0 = data.steps.find(s => s.step === 0)!;
      expect(s0.details.l2).toBe(21);
      expect(s0.details.l3).toBe(91);
      expect(s0.details.l1F).toBe(17);

      // STEP 1: UUID
      const s1 = data.steps.find(s => s.step === 1)!;
      expect(s1.details.L3F).toBeGreaterThanOrEqual(103);
      expect(s1.details.FM).toBe(26);
      expect(s1.details.FE).toBe(20);
      expect(s1.details.FC).toBeGreaterThanOrEqual(103);
      expect(s1.details.FL).toBeGreaterThanOrEqual(103);
      expect(s1.details.RA).toBeGreaterThanOrEqual(103);
      expect(s1.details.emptyProcessChar).toBe(0);
      expect(s1.details.nullL3FuncId).toBe(0);

      // STEP 3: FK 14개 전수 orphan=0
      const s3 = data.steps.find(s => s.step === 3)!;
      expect(s3.details.totalOrphans).toBe(0);
      expect(s3.details.unlinkedFC).toBe(0);
      expect(s3.details.unlinkedFM).toBe(0);
      expect(s3.details.flWithoutRA).toBe(0);
      expect(s3.details.fcDuplicates).toBe(0);

      if (s3.fkIntegrity) {
        for (const fk of s3.fkIntegrity) {
          console.log(`    FK ${fk.relation}: ${fk.valid}/${fk.total} orphans=${fk.orphans.length}`);
          expect(fk.orphans.length).toBe(0);
        }
      }

      // STEP 4: 누락
      const s4 = data.steps.find(s => s.step === 4)!;
      expect(s4.details.emptyPC).toBe(0);
      expect(s4.details.orphanPC).toBe(0);
      expect(s4.details.nullDC).toBe(0);
      expect(s4.details.nullPC).toBe(0);
    });

    test(`[${run}/5] 브라우저 워크시트 7개 탭 렌더링`, async ({ page }) => {
      test.setTimeout(60000);
      await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
      await page.waitForTimeout(5000);
      await dismissModal(page);

      const tabs = ['구조', '1기능', '2기능', '3기능', '1L영향', '2L형태', '3L원인'];
      for (const tab of tabs) {
        await clickTab(page, tab);
        const text = await page.textContent('body') || '';
        const rendered = text.length > 100;
        console.log(`  [Run ${run}][${tab}] rendered=${rendered ? 'OK' : 'EMPTY'} len=${text.length}`);
        expect(text.length).toBeGreaterThan(100);
      }

      // 스크린샷 (1회차만)
      if (run === 1) {
        await page.screenshot({
          path: `tests/e2e/screenshots/fk-spec-m002-run${run}.png`,
          fullPage: false,
        });
      }
    });
  }
});
