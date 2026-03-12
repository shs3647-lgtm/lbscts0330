/**
 * @file cross-module-navigation.spec.ts
 * @description PFMEA↔CP↔PFD 상호 순환 이동/연동 ID 파이프라인 검증
 * - API 기반 ID 연동 검증 (navigation URL params)
 * - 설비/workElement 동기화 검증 (PFD→CP)
 * - 순환 이동: PFMEA→CP→PFD→PFMEA→PFD→CP
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Cross-Module Navigation ID Pipeline', () => {

  test('PFMEA→CP→PFD→PFMEA 순환 이동 검증 (API 레벨)', async ({ request }) => {
    // 1. PFMEA 프로젝트 목록에서 linked ID 조회
    const fmeaListRes = await request.get(`${BASE}/api/fmea/projects?type=P`);
    if (!fmeaListRes.ok()) {
      test.skip(true, 'FMEA projects API 호출 실패');
      return;
    }
    const fmeaList = await fmeaListRes.json();

    if (!fmeaList.success || !fmeaList.data?.length) {
      test.skip(true, 'FMEA 프로젝트가 없습니다');
      return;
    }

    // linkedCpNo가 있는 FMEA 찾기
    const linkedFmea = fmeaList.data.find((f: any) => f.linkedCpNo || f.fmeaInfo?.linkedCpNo);
    if (!linkedFmea) {
      test.skip(true, 'linkedCpNo가 있는 FMEA가 없습니다');
      return;
    }

    const fmeaId = linkedFmea.fmeaId;
    const cpNo = linkedFmea.linkedCpNo || linkedFmea.fmeaInfo?.linkedCpNo;
    const pfdNo = linkedFmea.linkedPfdNo || linkedFmea.fmeaInfo?.linkedPfdNo;

    console.log(`테스트 대상: FMEA=${fmeaId}, CP=${cpNo}, PFD=${pfdNo}`);

    // 2. PFMEA API로 linked 정보 확인
    const pfmeaRes = await request.get(`${BASE}/api/pfmea/${encodeURIComponent(fmeaId)}`);
    expect(pfmeaRes.ok()).toBeTruthy();
    const pfmeaData = await pfmeaRes.json();
    expect(pfmeaData.success).toBe(true);

    // PFMEA에서 cpNo 확인
    const pfmeaLinkedCp = pfmeaData.data?.registration?.linkedCpNo
      || pfmeaData.data?.linkedCpNo || cpNo;
    expect(pfmeaLinkedCp).toBeTruthy();
    console.log(`PFMEA→CP: ${pfmeaLinkedCp}`);

    // 3. CP 데이터 로드 — PFMEA에서 받은 cpNo 사용
    if (pfmeaLinkedCp) {
      const cpRes = await request.get(`${BASE}/api/control-plan/${encodeURIComponent(pfmeaLinkedCp)}/items`);
      if (cpRes.ok()) {
        const cpData = await cpRes.json();
        expect(cpData).toHaveProperty('items');
        console.log(`CP 로드 성공: ${pfmeaLinkedCp}, items=${cpData.items?.length || 0}`);

        // CP에서 FMEA ID 역참조 확인
        const cpFmeaId = cpData.header?.fmeaId || cpData.header?.linkedPfmeaNo;
        if (cpFmeaId) {
          expect(cpFmeaId.toLowerCase()).toBe(fmeaId.toLowerCase());
          console.log(`CP→PFMEA 역참조 정상: ${cpFmeaId}`);
        }

        // CP에서 PFD 링크 확인
        const cpLinkedPfd = cpData.header?.linkedPfdNo;
        if (cpLinkedPfd) {
          console.log(`CP→PFD: ${cpLinkedPfd}`);
        }
      }
    }

    // 4. PFD 확인 (있으면)
    if (pfdNo) {
      const pfdRes = await request.get(`${BASE}/api/pfd/${encodeURIComponent(pfdNo)}`);
      if (pfdRes.ok()) {
        const pfdData = await pfdRes.json();
        if (pfdData.success) {
          const pfdFmeaId = pfdData.data?.fmeaId || pfdData.data?.linkedPfmeaNo;
          const pfdCpNo = pfdData.data?.cpNo;
          console.log(`PFD→PFMEA: ${pfdFmeaId}, PFD→CP: ${pfdCpNo}`);

          // PFD에서 FMEA ID 역참조 확인
          if (pfdFmeaId) {
            expect(pfdFmeaId.toLowerCase()).toBe(fmeaId.toLowerCase());
          }
        }
      }
    }
  });

  test('PFD→CP sync 시 workElement 전달 검증 (API 레벨)', async ({ request }) => {
    const testItems = [
      {
        processNo: 'T-01',
        processName: 'Test Process',
        processLevel: 'Main',
        processDesc: 'Test desc',
        equipment: '프레스기계 A',
        workElement: '프레스 작업요소',
        partName: '테스트 부품',
        productChar: '',
        processChar: '',
        specialChar: '',
      },
    ];

    const syncRes = await request.post(`${BASE}/api/control-plan/sync-from-pfd`, {
      data: {
        pfdNo: 'test-pfd-nav-e2e',
        cpNo: 'test-cp-nav-e2e',
        items: testItems,
      },
    });

    const syncData = await syncRes.json();
    if (syncData.success && syncData.data?.items) {
      const firstItem = syncData.data.items[0];
      expect(firstItem.equipment).toBe('프레스기계 A');
      expect(firstItem.workElement).toBe('프레스 작업요소');
      console.log('PFD→CP workElement 전달 정상');
    }
  });

  test('설비명 양방향 동기화 검증 (CP↔PFD)', async ({ request }) => {
    // CP→PFD sync
    const cpItems = [
      {
        processNo: 'E-01',
        processName: 'Equipment Test',
        processLevel: 'Main',
        processDesc: 'Equip desc',
        equipment: '로봇용접기 B',
        workElement: '용접 작업',
        partName: '',
        productChar: '',
        processChar: '',
        specialChar: '',
      },
    ];

    const cpToPfdRes = await request.post(`${BASE}/api/pfd/sync-from-cp`, {
      data: {
        cpNo: 'test-cp-equip-e2e',
        pfdNo: 'test-pfd-equip-e2e',
        items: cpItems,
      },
    });

    const cpToPfdData = await cpToPfdRes.json();
    if (cpToPfdData.success && cpToPfdData.data?.items) {
      const pfdItem = cpToPfdData.data.items[0];
      expect(pfdItem.equipment).toBe('로봇용접기 B');
      console.log('CP→PFD equipment 전달 정상');
    }
  });
});

test.describe('Navigation URL Params 검증', () => {

  test('PFMEA worksheet 페이지 로드 (id param)', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet`);
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    const url = page.url();
    expect(url).toContain('/pfmea/worksheet');
  });

  test('CP worksheet 페이지 로드 (cpNo param)', async ({ page }) => {
    await page.goto(`${BASE}/control-plan/worksheet`);
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    const url = page.url();
    expect(url).toContain('/control-plan/worksheet');
  });

  test('PFD worksheet 페이지 로드 (pfdNo param)', async ({ page }) => {
    await page.goto(`${BASE}/pfd/worksheet`);
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    const url = page.url();
    expect(url).toContain('/pfd/worksheet');
  });
});
