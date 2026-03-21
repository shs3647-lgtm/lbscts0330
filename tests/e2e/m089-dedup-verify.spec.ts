/**
 * @file m089-dedup-verify.spec.ts
 * @description B2/B3 dedup 제거 검증 — 3회 순회
 *
 * 각 탭에서:
 * 1. "누락(Missing)" 텍스트가 0건이어야 PASS
 * 2. 1L/2L/3L 기능 탭에서 기대 데이터가 모두 보여야 PASS
 */

import { test, expect, type Page } from '@playwright/test';

const FMEA_ID = 'pfm26-m089';
const WS_URL = `http://localhost:3000/pfmea/worksheet?id=${FMEA_ID}`;
const WAIT = 3000;

// 각 탭에서 반드시 보여야 하는 텍스트
const TAB_CHECKS: { label: string; name: string; mustContain?: string[]; noMissing?: boolean }[] = [
  { label: 'Structure(구조)',        name: '구조분석',
    mustContain: ['Sputter Deposition', 'Electroplating', 'Wet Etch'], noMissing: true },
  { label: '1L Function(기능)',      name: '1L 기능',
    mustContain: ['전기적 연결 신뢰성 확보', '기계적 강도 확보', 'BGA 접합부 저항', 'Ball Shear'], noMissing: true },
  { label: '2L Function(기능)',      name: '2L 기능',
    mustContain: ['박막 두께 균일도', 'Bump 높이', '식각 선택비'], noMissing: true },
  { label: '3L Function(기능)',      name: '3L 기능',
    mustContain: ['Cu Target', 'Ti Target', 'Au 도금액', 'Cu 도금액', 'Au Etchant', 'TiW Etchant',
                  'Target 두께 잔량', '도금액 농도', 'H₂O₂ 농도', '작업 숙련도'], noMissing: true },
  { label: '1L영향(FE)',             name: '1L 영향',
    mustContain: ['전기적 Open 불량', 'Bump 높이 불균일', '단락'], noMissing: true },
  { label: '2L형태(FM)',             name: '2L 형태',
    mustContain: ['막두께 불균일', 'Bump 높이 편차', '식각 잔류물'], noMissing: true },
  { label: '3L원인(FC)',             name: '3L 원인',
    mustContain: ['Cu Target 소진', 'Ti Target 순도', 'DC Power 이탈', 'Au 도금액 농도', 'Cu 도금액 Fe', 'H₂O₂'], noMissing: true },
  { label: 'Failure Link(고장연결)', name: '고장연결' },
  { label: '구조분석(Structure)',     name: 'ALL 구조분석' },
  { label: '기능분석(Function)',      name: 'ALL 기능분석' },
  { label: '고장분석(Failure)',       name: 'ALL 고장분석' },
  { label: '리스크분석(Risk)',        name: 'ALL 리스크' },
];

async function clickTab(page: Page, label: string): Promise<void> {
  // 모달 닫기
  for (let i = 0; i < 3; i++) {
    const hasOverlay = await page.locator('[class*="fixed"][class*="inset-0"][class*="bg-black"]').count();
    if (hasOverlay > 0) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const closeBtn = page.locator('[class*="fixed"] button:has-text("닫기"), [class*="fixed"] button:has-text("취소")');
      if (await closeBtn.count() > 0) await closeBtn.first().click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(300);
    } else break;
  }

  const btn = page.locator(`button:text-is("${label}")`);
  if (await btn.count() > 0) {
    await btn.first().click({ force: true, timeout: 10000 });
  }
  await page.waitForTimeout(WAIT);
}

for (let cycle = 1; cycle <= 3; cycle++) {
  test(`Cycle ${cycle}/3: 12탭 순회 + 누락 검증`, async ({ page }) => {
    test.setTimeout(600000);

    console.log(`\n${'='.repeat(50)}`);
    console.log(`  CYCLE ${cycle}/3`);
    console.log(`${'='.repeat(50)}`);

    await page.goto(WS_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    let totalFail = 0;

    for (let i = 0; i < TAB_CHECKS.length; i++) {
      const tab = TAB_CHECKS[i];
      console.log(`\n  [${i + 1}/12] ${tab.name}`);

      await clickTab(page, tab.label);

      // 스크린샷
      await page.screenshot({
        path: `tests/e2e/screenshots/m089-c${cycle}-${String(i + 1).padStart(2, '0')}-${tab.name.replace(/ /g, '_')}.png`,
        fullPage: false,
      });

      const body = await page.textContent('body') || '';

      // 검증 1: 화이트스크린 에러
      const errCount = await page.locator('.error-boundary').count();
      if (errCount > 0) {
        console.log(`  ❌ 화이트스크린 에러!`);
        totalFail++;
      }

      // 검증 2: "누락(Missing)" 텍스트
      if (tab.noMissing) {
        const missingMatch = body.match(/누락.*?(\d+)건|Missing.*?(\d+)/);
        if (missingMatch) {
          const missingCount = parseInt(missingMatch[1] || missingMatch[2] || '0');
          if (missingCount > 0) {
            console.log(`  ❌ 누락 ${missingCount}건 발견!`);
            totalFail++;
            expect(missingCount, `${tab.name}: 누락 ${missingCount}건`).toBe(0);
          } else {
            console.log(`  ✅ 누락 0건`);
          }
        } else {
          console.log(`  ✅ 누락 표시 없음`);
        }
      }

      // 검증 3: 필수 텍스트 포함
      if (tab.mustContain) {
        let missing: string[] = [];
        for (const text of tab.mustContain) {
          if (!body.includes(text)) {
            missing.push(text);
          }
        }
        if (missing.length > 0) {
          console.log(`  ❌ 미표시: ${missing.join(', ')}`);
          totalFail++;
          expect(missing.length, `${tab.name}: ${missing.join(',')} 미표시`).toBe(0);
        } else {
          console.log(`  ✅ ${tab.mustContain.length}건 모두 표시`);
        }
      }

      console.log(`  ✅ ${tab.name} 완료`);
    }

    console.log(`\n  === CYCLE ${cycle} 결과: ${totalFail === 0 ? '✅ ALL PASS' : `❌ ${totalFail}건 FAIL`} ===\n`);
    expect(totalFail, `Cycle ${cycle}: ${totalFail}건 실패`).toBe(0);
  });
}
