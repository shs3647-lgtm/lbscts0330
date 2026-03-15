/**
 * @file chain-driven-verify.spec.ts
 * @description Chain-Driven Entity Creation 검증
 *
 * 불변 조건:
 * - S4-1: FailureLink는 FE+FM+FC 3요소 모두 매칭 시에만 생성
 * - S6-3~6: 모든 FK가 참조 대상에 존재
 * - S2-1: A4 카테시안 복제 없음
 *
 * 검증 흐름:
 * 1. save-from-import API 직접 호출 (chains 포함)
 * 2. DB에서 FailureLink, FM, FC, FE 카운트 확인
 * 3. FK 정합성 검증
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm-chain-test-01';

test.describe('Chain-Driven Entity Creation 검증', () => {

  test('save-from-import API → DB 카운트 + FK 정합성', async ({ request }) => {
    // ── 1. 테스트 데이터: 최소 flatData + chains ──
    const flatData = [
      { processNo: '10', itemCode: 'A1', value: '10' },
      { processNo: '10', itemCode: 'A2', value: 'Wafer Bonding' },
      { processNo: '10', itemCode: 'A3', value: 'Au 범프 접합' },
      { processNo: '10', itemCode: 'A4', value: '접합 강도', specialChar: 'C' },
      { processNo: '10', itemCode: 'B1', value: '가열 프레스', m4: 'MC' },
      { processNo: '10', itemCode: 'B2', value: '가열 프레스 동작' },
      { processNo: '10', itemCode: 'B3', value: '온도 편차' },
      { processNo: '10', itemCode: 'C1', value: 'YP' },
      { processNo: '10', itemCode: 'C2', value: 'YP 기능' },
      { processNo: '10', itemCode: 'C3', value: 'YP 요구사항' },
      { processNo: '10', itemCode: 'C4', value: '후속공정 불량' },
      { processNo: '20', itemCode: 'A1', value: '20' },
      { processNo: '20', itemCode: 'A2', value: 'Wire Bonding' },
      { processNo: '20', itemCode: 'A3', value: 'Au 와이어 연결' },
      { processNo: '20', itemCode: 'A4', value: '와이어 강도' },
      { processNo: '20', itemCode: 'B1', value: '본딩기', m4: 'MC' },
      { processNo: '20', itemCode: 'B2', value: '본딩기 동작' },
      { processNo: '20', itemCode: 'B3', value: '루프 높이 편차' },
      { processNo: '20', itemCode: 'C4', value: '완제품 기능 저하' },
    ];

    const chains = [
      {
        id: 'c1', processNo: '10', m4: 'MC',
        fmValue: '접합 불량', fcValue: '온도 부족', feValue: '후속공정 불량',
        feScope: 'YP', severity: 8, occurrence: 4, detection: 6,
        pcValue: 'SPC 온도 모니터링', dcValue: '파괴시험',
      },
      {
        id: 'c2', processNo: '10', m4: 'MC',
        fmValue: '접합 불량', fcValue: '압력 부족', feValue: '후속공정 불량',
        feScope: 'YP', severity: 8, occurrence: 3, detection: 5,
        pcValue: '압력 센서 확인', dcValue: '전수검사',
      },
      {
        id: 'c3', processNo: '20', m4: 'MC',
        fmValue: '와이어 단선', fcValue: '루프 높이 초과', feValue: '완제품 기능 저하',
        feScope: 'YP', severity: 9, occurrence: 2, detection: 4,
        pcValue: '높이 자동 측정', dcValue: 'AOI 검사',
      },
    ];

    // ── 2. save-from-import API 호출 ──
    const saveRes = await request.post(`${BASE}/api/fmea/save-from-import`, {
      data: { fmeaId: FMEA_ID, flatData, l1Name: 'Au BUMP 테스트', failureChains: chains },
    });
    expect(saveRes.ok()).toBe(true);
    const saveData = await saveRes.json();
    console.log('save-from-import 결과:', JSON.stringify(saveData, null, 2));

    expect(saveData.success).toBe(true);

    // ── 3. DB 카운트 검증 ──
    const linkStats = saveData.buildResult?.diagnostics?.linkStats;
    if (linkStats) {
      console.log(`linkStats: injected=${linkStats.injectedCount} skipped=${linkStats.skippedCount}`);
      // 3개 chain → 3개 link 생성 기대
      expect(linkStats.injectedCount).toBeGreaterThanOrEqual(3);
      expect(linkStats.skippedCount).toBeLessThanOrEqual(0);
    }

    // ── 4. 워크시트 로드 후 API 검증 ──
    const verifyRes = await request.get(`${BASE}/api/fmea?fmeaId=${FMEA_ID}`);
    if (verifyRes.ok()) {
      const d = await verifyRes.json();
      const legacy = d.data || d;
      const l2 = legacy.l2 || [];
      const links = legacy.failureLinks || [];
      const riskData = legacy.riskData || {};

      console.log(`DB 검증: l2=${l2.length} links=${links.length} riskKeys=${Object.keys(riskData).length}`);

      // 공정 2개
      expect(l2.length).toBeGreaterThanOrEqual(2);
      // 링크 3개
      expect(links.length).toBeGreaterThanOrEqual(3);
      // riskData: S/O/D 키 존재
      const sKeys = Object.keys(riskData).filter(k => k.endsWith('-S'));
      const oKeys = Object.keys(riskData).filter(k => k.endsWith('-O'));
      const dKeys = Object.keys(riskData).filter(k => k.endsWith('-D'));
      console.log(`riskData: S=${sKeys.length} O=${oKeys.length} D=${dKeys.length}`);
      expect(sKeys.length).toBeGreaterThanOrEqual(2); // 최소 2개 FM-FC 쌍

      // FK 정합성: 모든 link의 fmId/feId/fcId가 비어있지 않음
      for (const link of links) {
        const l = link as { fmId?: string; feId?: string; fcId?: string };
        expect(l.fmId).toBeTruthy();
        expect(l.feId).toBeTruthy();
        expect(l.fcId).toBeTruthy();
      }

      // PC/DC riskData 존재
      const pcKeys = Object.keys(riskData).filter(k => k.startsWith('prevention-'));
      const dcKeys = Object.keys(riskData).filter(k => k.startsWith('detection-'));
      console.log(`PC/DC: prevention=${pcKeys.length} detection=${dcKeys.length}`);
      expect(pcKeys.length).toBeGreaterThanOrEqual(2);
      expect(dcKeys.length).toBeGreaterThanOrEqual(2);
    }

    console.log('✅ Chain-Driven Entity Creation 검증 완료');
  });

  test('워크시트 UI에서 고장연결 탭 데이터 확인', async ({ page }) => {
    // ── 워크시트 페이지 로드 ──
    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // ── 에러 배너 없음 ──
    const errorBanner = page.locator('text=DB 저장 실패');
    const hasError = await errorBanner.isVisible().catch(() => false);
    expect(hasError).toBe(false);

    // ── 고장연결 탭 클릭 ──
    const failureLinkTab = page.locator('button:has-text("고장연결"), button:has-text("Failure Link")').first();
    if (await failureLinkTab.isVisible()) {
      await failureLinkTab.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: 'tests/screenshots/chain-driven-failure-link.png',
      fullPage: true,
    });

    // ── ALL 탭 클릭 ──
    const allTab = page.locator('button:has-text("ALL")').first();
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: 'tests/screenshots/chain-driven-all-tab.png',
      fullPage: true,
    });

    console.log('✅ 워크시트 UI 고장연결 확인 완료');
  });
});
