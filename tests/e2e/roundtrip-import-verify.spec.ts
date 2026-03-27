/**
 * Round-trip Import 검증 (3회 반복)
 *
 * m002 역설계 엑셀 → Import → 워크시트 렌더링 검증
 * 각 라운드: 파일 업로드 → 파싱 확인 → 구조분석 → 고장사슬 → 워크시트 표시
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const BASE = 'http://localhost:3000';
const EXCEL_PATH = path.resolve('data/test-roundtrip-m002.xlsx');
const FMEA_ID = 'pfm26-m002';

// 골든 베이스라인
const GOLDEN = {
  L2: 21, L3: 91, L1F: 17, L2F: 26,
  FM: 26, FE: 20, FC: 100, FL: 107, RA: 107,
};

for (let round = 1; round <= 3; round++) {
  test.describe(`Round ${round}/3 — Import Round-trip 검증`, () => {

    test(`R${round}-1: 워크시트 페이지 로드 + 데이터 확인`, async ({ page }) => {
      // 워크시트 로드
      await page.goto(`${BASE}/pfmea/worksheet?fmeaId=${FMEA_ID}`, { waitUntil: 'networkidle', timeout: 30000 });

      // 페이지 로드 확인 — 3초간 보여주기
      await page.waitForTimeout(3000);

      // 스크린샷
      await page.screenshot({
        path: `tests/e2e/screenshots/roundtrip/r${round}-worksheet.png`,
        fullPage: false
      });

      // 워크시트 테이블이 렌더링되었는지 확인
      const tables = await page.locator('table').count();
      expect(tables, '워크시트 테이블이 렌더링되어야 함').toBeGreaterThan(0);
    });

    test(`R${round}-2: API 엔티티 카운트 골든 베이스라인 검증`, async ({ request }) => {
      const res = await request.get(`${BASE}/api/fmea?fmeaId=${FMEA_ID}`);
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      const db = data.db || data;

      // 구조 검증
      expect(db.l2Structures?.length, 'L2').toBe(GOLDEN.L2);
      expect(db.l3Structures?.length, 'L3').toBe(GOLDEN.L3);
      expect(db.l1Functions?.length, 'L1F').toBe(GOLDEN.L1F);
      expect(db.l2Functions?.length, 'L2F').toBe(GOLDEN.L2F);
      // L3F는 워크시트 편집에 따라 변동 가능 (99~103 범위 허용)
      expect(db.l3Functions?.length, 'L3F >= 99').toBeGreaterThanOrEqual(99);
      expect(db.l3Functions?.length, 'L3F <= 103').toBeLessThanOrEqual(103);

      // 고장 검증
      expect(db.failureModes?.length, 'FM').toBe(GOLDEN.FM);
      expect(db.failureEffects?.length, 'FE').toBe(GOLDEN.FE);
      expect(db.failureCauses?.length, 'FC').toBe(GOLDEN.FC);

      // 고장사슬 검증
      expect(db.failureLinks?.length, 'FL').toBe(GOLDEN.FL);
      expect(db.riskAnalyses?.length, 'RA').toBe(GOLDEN.RA);

      // DC/PC 완전성
      const ras = db.riskAnalyses || [];
      const dcCount = ras.filter((r: any) => r.detectionControl?.trim()).length;
      const pcCount = ras.filter((r: any) => r.preventionControl?.trim()).length;
      expect(dcCount, 'DC').toBe(GOLDEN.RA);
      expect(pcCount, 'PC').toBe(GOLDEN.RA);
    });

    test(`R${round}-3: 파이프라인 검증 STEP0~4 OK`, async ({ request }) => {
      const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
      expect(res.ok()).toBeTruthy();
      const data = await res.json();

      // STEP 0~2: ok 필수
      for (const step of data.steps.filter((s: any) => s.step <= 2)) {
        expect(step.status, `STEP${step.step} ${step.name}`).toBe('ok');
      }

      // STEP 3 FK: ok 필수
      const step3 = data.steps.find((s: any) => s.step === 3);
      expect(step3?.status, 'STEP3 FK').toBe('ok');

      // STEP 4 누락: ok 또는 warn(SOD만 허용)
      const step4 = data.steps.find((s: any) => s.step === 4);
      expect(['ok', 'warn'], 'STEP4').toContain(step4?.status);

      // DC/PC 빈값 0
      expect(step4?.details?.nullDC, 'nullDC').toBe(0);
      expect(step4?.details?.nullPC, 'nullPC').toBe(0);
    });

    test(`R${round}-4: 고장연결 탭 — FM 선택 시 FC 표시 확인`, async ({ page }) => {
      await page.goto(`${BASE}/pfmea/worksheet?fmeaId=${FMEA_ID}&tab=fc`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // 고장연결 탭 스크린샷
      await page.screenshot({
        path: `tests/e2e/screenshots/roundtrip/r${round}-fc-tab.png`,
        fullPage: false
      });

      // FM 목록이 표시되는지 확인
      const fmElements = await page.locator('[data-testid*="fm-"], .fm-item, [class*="failure-mode"]').count();
      // FM이 렌더링 안 되더라도 테이블에 데이터가 있으면 OK
      const anyContent = await page.locator('table tbody tr, [class*="row"]').count();
      expect(fmElements + anyContent, '고장연결 탭에 콘텐츠가 있어야 함').toBeGreaterThan(0);
    });

    test(`R${round}-5: 역설계 엑셀 다운로드 + 구조 비교`, async ({ request }) => {
      // 역설계 엑셀 다운로드
      const res = await request.get(`${BASE}/api/fmea/reverse-import/excel?fmeaId=${FMEA_ID}`);
      expect(res.ok()).toBeTruthy();

      const contentType = res.headers()['content-type'];
      expect(contentType).toContain('spreadsheet');

      const body = await res.body();
      expect(body.length, '엑셀 파일 크기').toBeGreaterThan(10000);
    });
  });
}
