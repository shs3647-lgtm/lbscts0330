/**
 * Import 후 전 단계 DB 구축 검증 + 브라우저 3초 대기 확인
 * m066-rt2 프로젝트: 역설계 Excel → Import → 워크시트 렌더링
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m066-rt2';
const TABS = [
  { id: 'structure', name: '구조분석', check: 'L2=21 L3=91' },
  { id: 'function', name: '기능분석', check: 'L1F=17 L2F=26 L3F=99' },
  { id: 'failure', name: '리스크분석', check: 'FM=26 FE=20 FC=100' },
  { id: 'fc', name: '고장연결', check: 'FL=107' },
  { id: 'risk', name: '위험분석', check: 'RA=107 DC/PC=107' },
  { id: 'all', name: '전체보기', check: 'ALL' },
];

test.describe('Import DB 전 단계 검증 (3초 대기)', () => {

  test('1. API 골든 베이스라인 9/9 일치', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea?fmeaId=${FMEA_ID}`);
    expect(res.ok()).toBeTruthy();
    const d = await res.json();
    const db = d.db || d;

    expect(db.l2Structures?.length, 'L2').toBe(21);
    expect(db.l3Structures?.length, 'L3').toBe(91);
    expect(db.l1Functions?.length, 'L1F').toBe(17);
    expect(db.l2Functions?.length, 'L2F').toBe(26);
    expect(db.failureModes?.length, 'FM').toBe(26);
    expect(db.failureEffects?.length, 'FE').toBe(20);
    expect(db.failureCauses?.length, 'FC').toBe(100);
    expect(db.failureLinks?.length, 'FL').toBe(107);
    expect(db.riskAnalyses?.length, 'RA').toBe(107);

    // DC/PC 완전
    const ras = db.riskAnalyses || [];
    expect(ras.filter((r: any) => r.detectionControl?.trim()).length, 'DC').toBe(107);
    expect(ras.filter((r: any) => r.preventionControl?.trim()).length, 'PC').toBe(107);

    // FK broken 0
    const fls = db.failureLinks || [];
    const fmIds = new Set((db.failureModes || []).map((f: any) => f.id));
    const feIds = new Set((db.failureEffects || []).map((f: any) => f.id));
    const fcIds = new Set((db.failureCauses || []).map((f: any) => f.id));
    const flIds = new Set(fls.map((f: any) => f.id));
    expect(fls.filter((f: any) => !fmIds.has(f.fmId)).length, 'FL→FM broken').toBe(0);
    expect(fls.filter((f: any) => !feIds.has(f.feId)).length, 'FL→FE broken').toBe(0);
    expect(fls.filter((f: any) => !fcIds.has(f.fcId)).length, 'FL→FC broken').toBe(0);
    expect(ras.filter((r: any) => !flIds.has(r.linkId)).length, 'RA→FL broken').toBe(0);
  });

  test('2. 파이프라인 STEP 0~4 검증', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    expect(res.ok()).toBeTruthy();
    const d = await res.json();
    for (const step of d.steps) {
      // STEP 0~3: 구조/UUID/fmeaId/FK = ok 필수
      if (step.step <= 3) {
        expect(step.status, `STEP${step.step} ${step.name}`).toBe('ok');
      }
      // STEP 4: ok 또는 warn 허용 (SOD는 프로젝트 생성 시 미복사 가능)
      if (step.step === 4) {
        expect(['ok', 'warn']).toContain(step.status);
      }
    }
  });

  for (const tab of TABS) {
    test(`3-${tab.id}. 워크시트 [${tab.name}] 탭 — 3초 대기 확인`, async ({ page }) => {
      await page.goto(`${BASE}/pfmea/worksheet?fmeaId=${FMEA_ID}&tab=${tab.id}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // 3초간 브라우저 보여주기
      await page.waitForTimeout(3000);

      // 스크린샷 저장
      await page.screenshot({
        path: `tests/e2e/screenshots/roundtrip/db-verify-${tab.id}.png`,
        fullPage: false,
      });

      // 테이블 또는 콘텐츠 존재 확인
      const content = await page.locator('table, [class*="row"], [class*="grid"], [data-testid]').count();
      expect(content, `${tab.name} 탭 콘텐츠`).toBeGreaterThan(0);
    });
  }
});
