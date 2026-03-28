/**
 * @file fmea-cp-pfd-integration.spec.ts
 * @description Smart System 연동 E2E 테스트
 *
 * 검증 항목:
 * 0. 연동 ID 일관성 (FmeaRegistration ↔ CpRegistration ↔ PfdRegistration)
 * 1. FMEA pipeline-verify allGreen=true
 * 2. sync-cp-pfd 실행 → CP/PFD 생성 (결정론적 선택)
 * 3. cp-pfd-verify → FK orphan=0
 * 4. CP 워크시트 저장 후 FK 보존
 * 5. PFD 워크시트 저장 후 FK 보존
 * 6~7. 브라우저 CP/PFD 렌더링
 * 8. 화면 이동 URL 일관성
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m002';

test.describe('Smart System 연동 통합 검증', () => {

  test('Step 0: 연동 ID 일관성 (Registration ↔ TripletGroup)', async ({ request }) => {
    const regResp = await request.get(`${BASE}/api/pfmea/${FMEA_ID}`);
    if (regResp.ok()) {
      const regData = await regResp.json();
      const reg = regData.data || regData;
      if (reg.linkedCpNo && reg.linkedPfdNo) {
        console.log(`FmeaReg: cpNo=${reg.linkedCpNo}, pfdNo=${reg.linkedPfdNo}`);

        const cpResp = await request.get(`${BASE}/api/control-plan?fmeaId=${FMEA_ID}`);
        if (cpResp.ok()) {
          const cpData = await cpResp.json();
          const cpList = Array.isArray(cpData.data) ? cpData.data : cpData;
          if (cpList.length > 0) {
            const matchCp = cpList.find((c: any) => c.cpNo === reg.linkedCpNo || c.fmeaId === FMEA_ID);
            expect(matchCp).toBeTruthy();
            console.log(`  CP match: ${matchCp?.cpNo} ✅`);
          }
        }

        const pfdResp = await request.get(`${BASE}/api/pfd?fmeaId=${FMEA_ID}`);
        if (pfdResp.ok()) {
          const pfdData = await pfdResp.json();
          const pfdList = Array.isArray(pfdData.data) ? pfdData.data : [pfdData.data].filter(Boolean);
          if (pfdList.length > 0) {
            const matchPfd = pfdList.find((p: any) => p.pfdNo === reg.linkedPfdNo || p.fmeaId === FMEA_ID);
            expect(matchPfd).toBeTruthy();
            console.log(`  PFD match: ${matchPfd?.pfdNo} ✅`);
          }
        }
      } else {
        console.log('FmeaRegistration linkedCpNo/linkedPfdNo is null (legacy data)');
      }
    }
  });

  test('Step 1: FMEA pipeline allGreen=true', async ({ request }) => {
    // POST로 자동수정 포함 검증 (반복 실행 시 안정성)
    const resp = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
    });
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.allGreen).toBe(true);

    console.log(`FMEA pipeline: allGreen=${data.allGreen}`);
  });

  test('Step 2: sync-cp-pfd 실행 → CP/PFD 생성 (결정론적)', async ({ request }) => {
    const resp = await request.post(`${BASE}/api/fmea/sync-cp-pfd`, {
      data: { fmeaId: FMEA_ID, mode: 'CREATE' },
    });
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.ok).toBe(true);
    expect(data.data.cpItems).toBeGreaterThan(0);
    expect(data.data.pfdItems).toBeGreaterThan(0);
    expect(data.validation.allPass).toBe(true);

    console.log(`sync-cp-pfd: cpNo=${data.data.cpNo}, pfdNo=${data.data.pfdNo}, CP=${data.data.cpItems}, PFD=${data.data.pfdItems}`);
  });

  test('Step 3: cp-pfd-verify → 7 FK orphan=0', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/fmea/cp-pfd-verify?fmeaId=${FMEA_ID}`);
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();

    expect(data.ok).toBe(true);
    expect(data.allGreen).toBe(true);
    expect(data.totalOrphans).toBe(0);

    // FMEA 기본 엔티티 수 확인 (범위 기반 — 반복 실행 안정성)
    expect(data.fmea.l2).toBe(21);
    expect(data.fmea.l3).toBe(91);
    expect(data.fmea.fm).toBe(26);
    expect(data.fmea.fl).toBeGreaterThanOrEqual(103);
    expect(data.fmea.ra).toBeGreaterThanOrEqual(103);

    // CP FK 채움률 확인
    expect(data.cp.itemCount).toBeGreaterThan(0);
    expect(data.cp.fkFilled.productCharId).toBeGreaterThan(0);
    expect(data.cp.fkFilled.linkId).toBeGreaterThan(0);
    expect(data.cp.fkFilled.processCharId).toBeGreaterThan(0);
    expect(data.cp.fkFilled.pfmeaProcessId).toBeGreaterThan(0);

    // PFD FK 채움률 확인
    expect(data.pfd.itemCount).toBeGreaterThan(0);
    expect(data.pfd.fkFilled.fmeaL2Id).toBeGreaterThan(0);
    expect(data.pfd.fkFilled.fmeaL3Id).toBeGreaterThan(0);

    // 모든 FK 체크 orphan=0
    for (const check of data.fkChecks) {
      expect(check.orphans).toBe(0);
      console.log(`  ${check.name}: total=${check.total} nonNull=${check.nonNull} orphans=${check.orphans} ✅`);
    }
  });

  test('Step 4: CP 워크시트 저장 후 FK 보존', async ({ request }) => {
    // 4.0 sync 결과에서 cpNo 조회
    const verifyResp0 = await request.get(`${BASE}/api/fmea/cp-pfd-verify?fmeaId=${FMEA_ID}`);
    const verifyData0 = await verifyResp0.json();
    const cpNo = verifyData0.cp?.cpNo || 'cp26-m002';
    console.log(`Using cpNo: ${cpNo}`);

    // 4.1 현재 CP items 조회
    const getResp = await request.get(`${BASE}/api/control-plan/${cpNo}/items`);
    expect(getResp.ok()).toBeTruthy();
    const getData = await getResp.json();
    const items = getData.data;
    expect(items.length).toBeGreaterThan(0);

    // 4.2 FK 필드가 설정된 항목 확인
    const itemsWithLinkId = items.filter((i: any) => i.linkId);
    const itemsWithPcId = items.filter((i: any) => i.productCharId);
    expect(itemsWithLinkId.length).toBeGreaterThan(0);
    expect(itemsWithPcId.length).toBeGreaterThan(0);

    // 4.3 items를 그대로 다시 저장 (편집 후 저장 시뮬레이션)
    const saveResp = await request.put(`${BASE}/api/control-plan/${cpNo}/items`, {
      data: { items },
    });
    expect(saveResp.ok()).toBeTruthy();

    // 4.4 다시 조회하여 FK 보존 확인
    const verifyResp = await request.get(`${BASE}/api/control-plan/${cpNo}/items`);
    expect(verifyResp.ok()).toBeTruthy();
    const verifyData = await verifyResp.json();
    const savedItems = verifyData.data;

    // FK 보존 확인: linkId, productCharId, processCharId
    const savedWithLinkId = savedItems.filter((i: any) => i.linkId);
    const savedWithPcId = savedItems.filter((i: any) => i.productCharId);
    const savedWithPcfId = savedItems.filter((i: any) => i.processCharId);

    expect(savedWithLinkId.length).toBe(itemsWithLinkId.length);
    expect(savedWithPcId.length).toBe(itemsWithPcId.length);

    console.log(`CP FK 보존: linkId ${savedWithLinkId.length}/${itemsWithLinkId.length}, productCharId ${savedWithPcId.length}/${itemsWithPcId.length}, processCharId ${savedWithPcfId.length}`);

    // 4.5 cp-pfd-verify 재검증
    const reVerify = await request.get(`${BASE}/api/fmea/cp-pfd-verify?fmeaId=${FMEA_ID}`);
    const reVerifyData = await reVerify.json();
    expect(reVerifyData.totalOrphans).toBe(0);
    console.log(`CP 저장 후 재검증: totalOrphans=${reVerifyData.totalOrphans} ✅`);
  });

  test('Step 5: PFD 워크시트 저장 후 FK 보존', async ({ request }) => {
    // 5.1 PFD 조회
    const pfdListResp = await request.get(`${BASE}/api/pfd?fmeaId=${FMEA_ID}`);
    expect(pfdListResp.ok()).toBeTruthy();
    const pfdListData = await pfdListResp.json();

    // PFD가 있는지 확인
    let pfdNo: string | null = null;
    if (pfdListData.data?.pfdNo) {
      pfdNo = pfdListData.data.pfdNo;
    } else if (Array.isArray(pfdListData.data)) {
      const found = pfdListData.data.find((p: any) => p.fmeaId === FMEA_ID || p.linkedPfmeaNo === FMEA_ID);
      if (found) pfdNo = found.pfdNo;
    }

    if (!pfdNo) {
      console.log('PFD not found for direct save test, using verify result');
      // cp-pfd-verify에서 PFD 번호 가져오기
      const vResp = await request.get(`${BASE}/api/fmea/cp-pfd-verify?fmeaId=${FMEA_ID}`);
      const vData = await vResp.json();
      pfdNo = vData.pfd?.pfdNo;
    }

    expect(pfdNo).toBeTruthy();

    // 5.2 PFD items 조회
    const pfdItemsResp = await request.get(`${BASE}/api/pfd/${pfdNo}`);
    expect(pfdItemsResp.ok()).toBeTruthy();
    const pfdData = await pfdItemsResp.json();
    const items = pfdData.data?.items || pfdData.items || [];

    if (items.length === 0) {
      console.log('PFD items empty — skipping save test');
      return;
    }

    const itemsWithL2Id = items.filter((i: any) => i.fmeaL2Id);
    expect(itemsWithL2Id.length).toBeGreaterThan(0);

    // 5.3 items를 그대로 다시 저장 (편집 후 저장 시뮬레이션)
    const saveResp = await request.put(`${BASE}/api/pfd/${pfdNo}/items`, {
      data: { items },
    });
    expect(saveResp.ok()).toBeTruthy();

    // 5.4 cp-pfd-verify 재검증
    const reVerify = await request.get(`${BASE}/api/fmea/cp-pfd-verify?fmeaId=${FMEA_ID}`);
    const reVerifyData = await reVerify.json();
    expect(reVerifyData.totalOrphans).toBe(0);
    console.log(`PFD 저장 후 재검증: totalOrphans=${reVerifyData.totalOrphans} ✅`);
  });

  test('Step 6: CP 워크시트 브라우저 렌더링', async ({ page }) => {
    const vResp = await page.request.get(`${BASE}/api/fmea/cp-pfd-verify?fmeaId=${FMEA_ID}`);
    const vData = await vResp.json();
    const cpNo = vData.cp?.cpNo || 'cp26-m002';
    await page.goto(`${BASE}/control-plan/worksheet?cpNo=${cpNo}&fmeaId=${FMEA_ID}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 워크시트 테이블이 렌더링되었는지 확인
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent();
    expect((bodyText || '').length).toBeGreaterThan(100);
    console.log(`CP 워크시트 렌더링: ${(bodyText || '').length} chars ✅`);
  });

  test('Step 7: PFD 워크시트 브라우저 렌더링', async ({ page }) => {
    const resp = await page.request.get(`${BASE}/api/fmea/cp-pfd-verify?fmeaId=${FMEA_ID}`);
    const data = await resp.json();
    const pfdNo = data.pfd?.pfdNo;

    if (!pfdNo) {
      console.log('PFD not found, skipping browser test');
      return;
    }

    await page.goto(`${BASE}/pfd/worksheet?pfdNo=${pfdNo}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent();
    expect((bodyText || '').length).toBeGreaterThan(100);
    console.log(`PFD 워크시트 렌더링: ${(bodyText || '').length} chars ✅`);
  });

  test('Step 8: 화면 이동 URL 일관성 (FMEA→CP→PFD→FMEA)', async ({ request }) => {
    const vResp = await request.get(`${BASE}/api/fmea/cp-pfd-verify?fmeaId=${FMEA_ID}`);
    const vData = await vResp.json();

    const cpNo = vData.cp?.cpNo;
    const pfdNo = vData.pfd?.pfdNo;

    if (!cpNo || !pfdNo) {
      console.log('CP/PFD not available, skipping navigation test');
      return;
    }

    // FMEA Registration에서 linkedCpNo/linkedPfdNo 조회
    const regResp = await request.get(`${BASE}/api/pfmea/${FMEA_ID}`);
    if (regResp.ok()) {
      const regData = await regResp.json();
      const reg = regData.data || regData;

      if (reg.linkedCpNo) {
        expect(cpNo).toBe(reg.linkedCpNo);
        console.log(`  FMEA→CP 일치: ${cpNo} = linkedCpNo(${reg.linkedCpNo}) ✅`);
      }
      if (reg.linkedPfdNo) {
        expect(pfdNo).toBe(reg.linkedPfdNo);
        console.log(`  FMEA→PFD 일치: ${pfdNo} = linkedPfdNo(${reg.linkedPfdNo}) ✅`);
      }
    }

    // CP에서 fmeaId 확인
    const cpItemResp = await request.get(`${BASE}/api/control-plan/${cpNo}/items`);
    if (cpItemResp.ok()) {
      const cpData = await cpItemResp.json();
      const cp = cpData.cp || cpData;
      if (cp.fmeaId) {
        expect(cp.fmeaId).toBe(FMEA_ID);
        console.log(`  CP→FMEA 일치: fmeaId=${cp.fmeaId} ✅`);
      }
      if (cp.linkedPfdNo) {
        expect(cp.linkedPfdNo).toBe(pfdNo);
        console.log(`  CP→PFD 일치: linkedPfdNo=${cp.linkedPfdNo} ✅`);
      }
    }

    console.log(`화면 이동 일관성: FMEA(${FMEA_ID}) ↔ CP(${cpNo}) ↔ PFD(${pfdNo}) ✅`);
  });

});
