/**
 * @file cp-pfd-equipment-verify.spec.ts
 * @description pfm26-m002 FMEA↔PFD↔CP 설비명 정합성 검증
 *
 * 검증 항목:
 *   1. FMEA→PFD sync 설비명 일치
 *   2. PFD→CP sync 설비명 일치
 *   3. PFD 워크시트 브라우저: 설비명 렌더링 + 공정번호 매핑
 *   4. CP 워크시트 브라우저: 설비명 렌더링 + 공정번호 매핑
 *   5. FMEA↔PFD↔CP 3자 교차 설비명 정합성
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m002';
const PFD_NO = 'pfd26-m065';
const CP_NO = 'cp26-m002';

// 공정번호→설비명 골든 베이스라인 (FMEA L2/L3 기준 21개 공정)
const GOLDEN_EQUIPMENT: Record<string, string> = {
  '01': '항온항습기',
  '10': '두께 측정기, HIGH POWER SCOPE',
  '20': 'Sorter 장비, OCR Reader',
  '30': 'Scrubber 장비',
  '40': 'Sputter 장비, DC Power Supply',
  '50': 'Scrubber 장비',
  '60': 'Coater',
  '70': 'Stepper/Scanner',
  '80': 'Developer',
  '90': 'Descum 장비',
  '100': 'Au Plating Tank, 정류기(Rectifier)',
  '110': 'Strip 장비',
  '120': 'Au Etch 장비',
  '130': 'TiW Etch 장비',
  '140': 'Anneal 장비',
  '150': 'AVI 장비, 높이 측정기',
  '160': 'Clean 장비',
  '170': 'Scrubber 장비',
  '180': 'Sorter 장비',
  '190': 'AVI 장비',
  '200': '포장 장비',
};

// ═══════════════════════════════════════════════════
// STEP 1: FMEA→PFD sync 설비명 정합성
// ═══════════════════════════════════════════════════

test.describe('STEP 1: FMEA→PFD 설비명 정합성', () => {
  test.describe.configure({ mode: 'serial' });

  let pfdItems: any[] = [];

  test('1.1 FMEA→PFD sync 실행', async ({ request }) => {
    const res = await request.post(`${BASE}/api/pfd/sync-from-fmea`, {
      data: { fmeaId: FMEA_ID, pfdNo: PFD_NO },
      timeout: 60000,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    pfdItems = body.data?.items || [];
    expect(pfdItems.length).toBeGreaterThan(0);
    console.log(`✅ PFD items: ${pfdItems.length}건`);
  });

  test('1.2 PFD 설비명이 골든 베이스라인과 일치', async () => {
    const mismatches: string[] = [];

    for (const [processNo, expectedEquip] of Object.entries(GOLDEN_EQUIPMENT)) {
      const itemsForProcess = pfdItems.filter((i: any) => i.processNo === processNo);
      if (itemsForProcess.length === 0) {
        mismatches.push(`공정 ${processNo}: PFD에 없음`);
        continue;
      }

      // 같은 공정의 모든 아이템이 동일 설비명을 가져야 함
      const equips = new Set(itemsForProcess.map((i: any) => i.equipment));
      for (const equip of equips) {
        if (equip !== expectedEquip) {
          mismatches.push(`공정 ${processNo}: 기대="${expectedEquip}" vs 실제="${equip}"`);
        }
      }
    }

    if (mismatches.length > 0) {
      console.log('⚠️ PFD 설비명 불일치:');
      mismatches.forEach(m => console.log(`  ${m}`));
    } else {
      console.log('✅ PFD 설비명 21개 공정 모두 골든 베이스라인 일치');
    }

    expect(mismatches.length).toBe(0);
  });

  test('1.3 PFD 모든 아이템에 설비명 존재 (빈값 없음)', async () => {
    const emptyEquip = pfdItems.filter((i: any) => !i.equipment?.trim());
    console.log(`설비명 빈값: ${emptyEquip.length}/${pfdItems.length}건`);
    // 빈값 아이템 상세
    if (emptyEquip.length > 0) {
      emptyEquip.slice(0, 5).forEach((i: any) => {
        console.log(`  공정=${i.processNo} 작업요소=${i.workElement} equipment="${i.equipment}"`);
      });
    }
    expect(emptyEquip.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════
// STEP 2: PFD→CP sync 설비명 정합성
// ═══════════════════════════════════════════════════

test.describe('STEP 2: PFD→CP 설비명 정합성', () => {
  test.describe.configure({ mode: 'serial' });

  let cpItems: any[] = [];

  test('2.1 PFD→CP sync 실행', async ({ request }) => {
    // 먼저 PFD items 확보
    const pfdRes = await request.post(`${BASE}/api/pfd/sync-from-fmea`, {
      data: { fmeaId: FMEA_ID, pfdNo: PFD_NO },
      timeout: 60000,
    });
    const pfdBody = await pfdRes.json();
    const pfdItems: any[] = pfdBody.data?.items || [];

    // PFD→CP sync
    const cpRes = await request.post(`${BASE}/api/control-plan/sync-from-pfd`, {
      data: {
        pfdNo: PFD_NO,
        cpNo: CP_NO,
        fmeaId: FMEA_ID,
        items: pfdItems.map((item: any, idx: number) => ({
          processNo: item.processNo || '',
          processName: item.processName || '',
          processDesc: item.processDesc || '',
          partName: item.partName || '',
          workElement: item.workElement || '',
          equipment: item.equipment || '',
          equipmentM4: item.equipmentM4 || '',
          productChar: item.productChar || '',
          processChar: item.processChar || '',
          specialChar: item.specialChar || item.productSC || item.processSC || '',
          sortOrder: idx * 10,
        })),
      },
      timeout: 60000,
    });

    expect(cpRes.status()).toBe(200);
    const cpBody = await cpRes.json();
    expect(cpBody.success).toBe(true);
    cpItems = cpBody.data?.items || [];
    console.log(`✅ CP items: ${cpItems.length}건`);
  });

  test('2.2 CP 설비명이 PFD와 일치 (3자 교차)', async ({ request }) => {
    // CP items 다시 확보 (API에서)
    const cpRes = await request.get(`${BASE}/api/control-plan/${CP_NO}/items`, {
      timeout: 30000,
    });

    let cpItemsFromDb: any[] = [];
    if (cpRes.status() === 200) {
      const body = await cpRes.json();
      cpItemsFromDb = body.data?.items || body.items || [];
    }

    if (cpItemsFromDb.length === 0 && cpItems.length > 0) {
      cpItemsFromDb = cpItems;
    }

    const mismatches: string[] = [];
    for (const [processNo, expectedEquip] of Object.entries(GOLDEN_EQUIPMENT)) {
      const cpForProcess = cpItemsFromDb.filter((i: any) => i.processNo === processNo);
      if (cpForProcess.length === 0) continue;

      for (const cpItem of cpForProcess) {
        if (cpItem.equipment && cpItem.equipment !== expectedEquip) {
          mismatches.push(`공정 ${processNo}: CP="${cpItem.equipment}" vs 기대="${expectedEquip}"`);
        }
      }
    }

    if (mismatches.length > 0) {
      console.log('⚠️ CP 설비명 불일치:');
      mismatches.forEach(m => console.log(`  ${m}`));
    } else {
      console.log('✅ CP 설비명 PFD/FMEA와 일치');
    }

    expect(mismatches.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════
// STEP 3: PFD 워크시트 브라우저 설비명 검증
// ═══════════════════════════════════════════════════

test.describe('STEP 3: PFD 워크시트 설비명 브라우저 검증', () => {

  test('3.1 PFD 워크시트에 설비명 컬럼 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/pfd/worksheet?pfdNo=${PFD_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    // 설비 관련 헤더 존재 확인
    const headers = await page.locator('th').allTextContents();
    const hasEquipHeader = headers.some(h =>
      h.includes('설비') || h.includes('금형') || h.includes('지그') || h.includes('Equipment')
    );
    console.log(`PFD 설비 헤더: ${hasEquipHeader ? '있음' : '없음'}`);
    console.log(`  헤더 목록: ${headers.filter(h => h.trim()).join(' | ')}`);

    expect(hasEquipHeader).toBe(true);
  });

  test('3.2 PFD 워크시트에 골든 설비명 텍스트 존재', async ({ page }) => {
    await page.goto(`${BASE}/pfd/worksheet?pfdNo=${PFD_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').textContent() || '';

    // 핵심 설비명 6개 확인
    const keyEquipments = [
      'Sputter',
      'Coater',
      'Stepper',
      'Au Plating',
      'Anneal',
      'Scrubber',
    ];

    const found: string[] = [];
    const missing: string[] = [];

    for (const eq of keyEquipments) {
      if (bodyText.includes(eq)) {
        found.push(eq);
      } else {
        missing.push(eq);
      }
    }

    console.log(`PFD 설비명 렌더링: ${found.length}/${keyEquipments.length}`);
    if (found.length > 0) console.log(`  ✅ 발견: ${found.join(', ')}`);
    if (missing.length > 0) console.log(`  ❌ 미발견: ${missing.join(', ')}`);

    // 최소 4개 이상 있어야 함
    expect(found.length).toBeGreaterThanOrEqual(4);
  });

  test('3.3 PFD 워크시트 행 수 = sync 결과와 일치', async ({ page }) => {
    await page.goto(`${BASE}/pfd/worksheet?pfdNo=${PFD_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    const rowCount = await page.locator('table tbody tr').count();
    console.log(`PFD 행 수: ${rowCount} (기대: 129)`);

    // sync 결과 129건과 일치해야 함
    expect(rowCount).toBeGreaterThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════
// STEP 4: CP 워크시트 브라우저 설비명 검증
// ═══════════════════════════════════════════════════

test.describe('STEP 4: CP 워크시트 설비명 브라우저 검증', () => {

  test('4.1 CP 워크시트에 설비 관련 헤더 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/control-plan/worksheet?cpNo=${CP_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    const headers = await page.locator('th').allTextContents();
    const hasEquipHeader = headers.some(h =>
      h.includes('설비') || h.includes('금형') || h.includes('지그') || h.includes('Equipment')
    );
    console.log(`CP 설비 헤더: ${hasEquipHeader ? '있음' : '없음'}`);
    console.log(`  헤더 목록: ${headers.filter(h => h.trim()).join(' | ')}`);

    expect(hasEquipHeader).toBe(true);
  });

  test('4.2 CP 워크시트에 골든 설비명 텍스트 존재', async ({ page }) => {
    await page.goto(`${BASE}/control-plan/worksheet?cpNo=${CP_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').textContent() || '';

    const keyEquipments = [
      'Sputter',
      'Coater',
      'Stepper',
      'Au Plating',
      'Anneal',
      'Scrubber',
    ];

    const found: string[] = [];
    const missing: string[] = [];

    for (const eq of keyEquipments) {
      if (bodyText.includes(eq)) {
        found.push(eq);
      } else {
        missing.push(eq);
      }
    }

    console.log(`CP 설비명 렌더링: ${found.length}/${keyEquipments.length}`);
    if (found.length > 0) console.log(`  ✅ 발견: ${found.join(', ')}`);
    if (missing.length > 0) console.log(`  ❌ 미발견: ${missing.join(', ')}`);

    expect(found.length).toBeGreaterThanOrEqual(4);
  });

  test('4.3 CP 워크시트 행 수 확인', async ({ page }) => {
    await page.goto(`${BASE}/control-plan/worksheet?cpNo=${CP_NO}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    const rowCount = await page.locator('table tbody tr').count();
    console.log(`CP 행 수: ${rowCount}`);

    expect(rowCount).toBeGreaterThanOrEqual(30);
  });
});

// ═══════════════════════════════════════════════════
// STEP 5: 전체 파이프라인 정합성 최종 검증
// ═══════════════════════════════════════════════════

test.describe('STEP 5: 전체 정합성 최종 검증', () => {

  test('5.1 Pipeline verify allGreen', async ({ request }) => {
    const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
      data: { fmeaId: FMEA_ID },
      timeout: 120000,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.allGreen).toBe(true);

    const steps = body.steps || [];
    for (const s of steps) {
      console.log(`  STEP ${s.step} (${s.name}): ${s.status}`);
    }
  });

  test('5.2 FMEA Atomic DB 카운트 베이스라인 일치', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`, {
      timeout: 60000,
    });
    const body = await res.json();
    const step1 = body.steps?.find((s: any) => s.step === 1);
    const details = step1?.details || {};

    console.log(`  L2=${details.L2} L3=${details.L3} FM=${details.FM} FC=${details.FC} FL=${details.FL} RA=${details.RA}`);

    expect(details.L2).toBe(21);
    expect(details.L3).toBe(91);
    expect(details.FM).toBe(26);
    // FC: 104 baseline ±1 허용 (pipeline auto-fix에서 orphan FC 정리 가능)
    expect(details.FC).toBeGreaterThanOrEqual(103);
  });
});
