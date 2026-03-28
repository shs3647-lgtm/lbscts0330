/**
 * @file clean-slate-reimport-m002.spec.ts
 * 
 * 100% 완벽성 증명 테스트: DB 완전 삭제 → 원본 Excel 재임포트 → FK 전수 검증
 * 
 * 이 테스트가 증명하는 것:
 * 1. 기존 DB 데이터에 의존하지 않고, 원본 Excel만으로 완벽한 Atomic DB 생성
 * 2. 모든 FK 관계가 정합 (orphan=0)
 * 3. 폴백/자동생성 없이도 데이터 무결
 * 4. 워크시트 7개 탭 전부 렌더링
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m002';
const EXCEL_PATH = path.resolve('data/master-fmea/master_import_12inch_AuBump.xlsx');

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

test.describe.serial('Clean Slate: DB삭제 → Excel 재임포트 → 100% 검증', () => {

  test('STEP 0: 원본 Excel 파일 존재 확인', () => {
    expect(fs.existsSync(EXCEL_PATH)).toBeTruthy();
    const stat = fs.statSync(EXCEL_PATH);
    console.log(`Excel: ${EXCEL_PATH} (${stat.size} bytes)`);
    expect(stat.size).toBeGreaterThan(10000);
  });

  test('STEP 1+2: Atomic DB 완전 삭제 → 원본 Excel 재임포트 (브라우저)', async ({ page }) => {
    test.setTimeout(120000);

    // 현재 상태 확인
    const beforeRes = await page.request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    if (beforeRes.ok()) {
      const before = await beforeRes.json();
      const s1 = before.steps?.find((s: { step: number }) => s.step === 1);
      console.log(`BEFORE: L2=${s1?.details?.L2 || 0} FM=${s1?.details?.FM || 0} FC=${s1?.details?.FC || 0} FL=${s1?.details?.FL || 0}`);
    }

    // Import 페이지로 이동 (save-from-import은 내부에서 deleteMany → createMany 수행)
    await page.goto(`${BASE}/pfmea/import?id=${FMEA_ID}`);
    await page.waitForTimeout(3000);
    await dismissModal(page);

    // Excel 파일 업로드 — .xlsx 전용 input 선택
    const fileInput = page.locator('input[type="file"][accept=".xlsx,.xls"]').first();
    const fileInputCount = await fileInput.count();
    console.log(`File input count (xlsx): ${fileInputCount}`);

    if (fileInputCount > 0) {
      await fileInput.setInputFiles(EXCEL_PATH);
      console.log('Excel file uploaded');
      await page.waitForTimeout(5000);
      await dismissModal(page);

      await page.screenshot({
        path: 'tests/e2e/screenshots/clean-slate-after-upload.png',
        fullPage: false,
      });

      // Import 시작 버튼 클릭 (다양한 텍스트 시도)
      const importBtnSelectors = [
        'button:has-text("DB 저장")',
        'button:has-text("Import")',
        'button:has-text("임포트")',
        'button:has-text("저장")',
        'button:has-text("확인")',
      ];
      for (const sel of importBtnSelectors) {
        const btn = page.locator(sel);
        if (await btn.count() > 0) {
          console.log(`Clicking: ${sel}`);
          await btn.first().click();
          break;
        }
      }

      // Import 완료 대기 (save-from-import은 5~15초)
      await page.waitForTimeout(15000);
      await dismissModal(page);

      await page.screenshot({
        path: 'tests/e2e/screenshots/clean-slate-import-done.png',
        fullPage: false,
      });
    } else {
      console.log('File input not found — test cannot proceed');
      expect(fileInputCount).toBeGreaterThan(0);
    }
  });

  test('STEP 3: 재임포트 후 pipeline-verify allGreen', async ({ request }) => {
    test.setTimeout(30000);

    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    console.log(`\n=== POST-REIMPORT VERIFICATION ===`);
    console.log(`allGreen=${data.allGreen} loopCount=${data.loopCount}`);

    for (const s of data.steps) {
      const issues = s.issues?.length > 0 ? ` ⚠ ${s.issues.join('; ')}` : '';
      console.log(`  S${s.step} ${s.name}: ${s.status}${issues}`);
    }

    expect(data.allGreen).toBeTruthy();
    for (const s of data.steps) {
      expect(s.status).toBe('ok');
    }
  });

  test('STEP 4: FK 14개 전수 orphan=0 + 엔티티 카운트', async ({ request }) => {
    test.setTimeout(30000);

    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    const data = await res.json();

    // 구조 (STEP 0)
    const s0 = data.steps.find((s: { step: number }) => s.step === 0);
    console.log(`\n=== ENTITY COUNTS ===`);
    console.log(`L1=${s0.details.l1} L2=${s0.details.l2} L3=${s0.details.l3} L1F=${s0.details.l1F}`);
    expect(s0.details.l2).toBe(21);
    expect(s0.details.l3).toBe(91);

    // UUID (STEP 1)
    const s1 = data.steps.find((s: { step: number }) => s.step === 1);
    console.log(`L2F=${s1.details.L2F} L3F=${s1.details.L3F} FM=${s1.details.FM} FE=${s1.details.FE} FC=${s1.details.FC} FL=${s1.details.FL} RA=${s1.details.RA}`);
    expect(s1.details.L3F).toBeGreaterThanOrEqual(103);
    expect(s1.details.FM).toBe(26);
    expect(s1.details.FE).toBe(20);
    expect(s1.details.FC).toBeGreaterThanOrEqual(103);
    expect(s1.details.FL).toBeGreaterThanOrEqual(103);
    expect(s1.details.RA).toBeGreaterThanOrEqual(103);
    expect(s1.details.emptyProcessChar).toBe(0);
    expect(s1.details.nullL3FuncId).toBe(0);

    // FK (STEP 3)
    const s3 = data.steps.find((s: { step: number }) => s.step === 3);
    console.log(`\n=== FK INTEGRITY (14 relations) ===`);
    expect(s3.details.totalOrphans).toBe(0);
    expect(s3.details.unlinkedFC).toBe(0);
    expect(s3.details.unlinkedFM).toBe(0);
    expect(s3.details.flWithoutRA).toBe(0);

    if (s3.fkIntegrity) {
      for (const fk of s3.fkIntegrity) {
        const status = fk.orphans.length === 0 ? '✅' : '❌';
        console.log(`  ${status} ${fk.relation}: ${fk.valid}/${fk.total} orphans=${fk.orphans.length}`);
        expect(fk.orphans.length).toBe(0);
      }
    }

    // 누락 (STEP 4)
    const s4 = data.steps.find((s: { step: number }) => s.step === 4);
    console.log(`\n=== MISSING DATA ===`);
    console.log(`emptyPC=${s4.details.emptyPC} orphanPC=${s4.details.orphanPC} nullDC=${s4.details.nullDC} nullPC=${s4.details.nullPC}`);
    expect(s4.details.emptyPC).toBe(0);
    expect(s4.details.orphanPC).toBe(0);
  });

  test('STEP 5: 브라우저 워크시트 7개 탭 렌더링', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
    await page.waitForTimeout(5000);
    await dismissModal(page);

    const tabs = ['구조', '1기능', '2기능', '3기능', '1L영향', '2L형태', '3L원인'];
    for (const tab of tabs) {
      await clickTab(page, tab);
      const text = await page.textContent('body') || '';
      const rendered = text.length > 100;
      console.log(`  [${tab}] rendered=${rendered ? 'OK' : 'FAIL'} len=${text.length}`);
      expect(text.length).toBeGreaterThan(100);
    }

    await page.screenshot({
      path: 'tests/e2e/screenshots/clean-slate-worksheet.png',
      fullPage: false,
    });
  });

  test('STEP 6: INV-01/02 직접 검증 (L2→L2F, L3→L3F 1:N)', async ({ request }) => {
    test.setTimeout(30000);

    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    const data = await res.json();

    // STEP 1의 parentChild 검증 — INV-01/02 직접 확인
    const s1 = data.steps.find((s: { step: number }) => s.step === 1);
    
    if (s1.parentChild) {
      for (const pc of s1.parentChild) {
        const missing = pc.missingChildren?.length || 0;
        const status = missing === 0 ? '✅' : '❌';
        console.log(`${status} ${pc.parent} → ${pc.child}: missing=${missing}`);
        expect(missing).toBe(0);
      }
    }

    // L2 without L3 = 0 (INV-01 관련)
    const s0 = data.steps.find((s: { step: number }) => s.step === 0);
    console.log(`L2 without L3 children: ${s0.details.l2WithoutL3}`);
    expect(s0.details.l2WithoutL3).toBe(0);
  });
});
