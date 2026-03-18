/**
 * @file pipeline-step2-c123.spec.ts
 * @description Step 2 C1/C2/C3 Legacy 카운트 재발 방지 테스트
 *
 * 근본 원인: verifyParsing이 l1.functions[] (플랫)만 읽고
 *            l1.types[].functions[].requirements[] (계층)은 무시 → 워크시트 저장 후 C1/C2/C3=0
 *
 * 기대값 (pfm26-m066 Au Bump):
 *   C1(구분) = 3 (YP/SP/USER)
 *   C2(완제품기능) = 7
 *   C3(요구사항) = 17
 *   C4(고장영향) = 20
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m066';

test.describe('Step 2 C1/C2/C3 Legacy 카운트 검증', () => {

  test('GET pipeline-verify: C1≥3, C2≥7, C3≥17 (Legacy 기준)', async ({ request }) => {
    // GET = 읽기 전용 (자동수정 없음) → 순수 Legacy 상태 검증
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    const step2 = data.steps?.find((s: any) => s.step === 2);
    expect(step2).toBeDefined();

    const d = step2.details;
    console.log(`[Step 2] leg_C1=${d.leg_C1} leg_C2=${d.leg_C2} leg_C3=${d.leg_C3} leg_C4=${d.leg_C4}`);
    console.log(`[Step 2] atm_C1=${d.atm_C1} atm_C2=${d.atm_C2} atm_C3=${d.atm_C3} atm_C4=${d.atm_C4}`);

    // C1/C2/C3는 Legacy에서도 0이 아니어야 함 (근본 수정 확인)
    expect(d.leg_C1).toBeGreaterThanOrEqual(3);
    expect(d.leg_C2).toBeGreaterThanOrEqual(7);
    expect(d.leg_C3).toBeGreaterThanOrEqual(17);
    expect(d.leg_C4).toBeGreaterThanOrEqual(20);
  });

  test('POST pipeline-verify 후에도 C1/C2/C3 유지', async ({ request }) => {
    // POST = 자동수정 포함 → allGreen 확인
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    const step2 = data.steps?.find((s: any) => s.step === 2);
    expect(step2).toBeDefined();

    const d = step2.details;
    expect(d.leg_C1).toBeGreaterThanOrEqual(3);
    expect(d.leg_C2).toBeGreaterThanOrEqual(7);
    expect(d.leg_C3).toBeGreaterThanOrEqual(17);

    // C계열 이슈에 C1/C2/C3 관련 에러가 없어야 함
    const cIssues = (step2.issues || []).filter((i: string) =>
      i.includes('C1') || i.includes('C2') || i.includes('C3(요구')
    );
    console.log(`[Step 2 POST] C-issues: ${cIssues.length > 0 ? cIssues.join('; ') : 'none'}`);
    expect(cIssues.length).toBe(0);
  });

  test('워크시트 저장 후에도 GET C1/C2/C3 유지 (재발 방지)', async ({ request }) => {
    // 1. 워크시트 로드 → 저장 (l1.types 구조로 덮어쓰기 발생)
    const loadRes = await request.get(`${BASE}/api/fmea?fmeaId=${FMEA_ID}`);
    if (loadRes.ok()) {
      const wsData = await loadRes.json();
      if (wsData.db) {
        await request.post(`${BASE}/api/fmea`, {
          data: { db: wsData.db },
        });
      }
    }

    // 2. 저장 후 GET pipeline-verify → C1/C2/C3 여전히 유지되어야 함
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    const step2 = data.steps?.find((s: any) => s.step === 2);
    expect(step2).toBeDefined();

    const d = step2.details;
    console.log(`[After Save] leg_C1=${d.leg_C1} leg_C2=${d.leg_C2} leg_C3=${d.leg_C3}`);

    // 핵심: 워크시트 저장 후에도 C1/C2/C3가 0이 아니어야 함
    expect(d.leg_C1).toBeGreaterThanOrEqual(3);
    expect(d.leg_C2).toBeGreaterThanOrEqual(7);
    expect(d.leg_C3).toBeGreaterThanOrEqual(17);
  });
});
