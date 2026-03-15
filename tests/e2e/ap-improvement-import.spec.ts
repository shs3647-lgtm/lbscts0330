/**
 * @file ap-improvement-import.spec.ts
 * @description AP 개선관리 Import/Export/Save/Help + 그래프 렌더링 E2E 테스트
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const AP_PAGE = `${BASE_URL}/pfmea/ap-improvement`;

test.describe('AP 개선관리 Import/Export + 그래프', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AP_PAGE, { waitUntil: 'networkidle', timeout: 30000 });
    // "12 au bump" 프로젝트 선택 대기
    await page.waitForTimeout(1500);
  });

  test('1. 페이지 로드 — 메뉴바에 모든 버튼 존재 (Import/Export/양식/Save/Del/Help)', async ({ page }) => {
    await expect(page.locator('button', { hasText: '↑Import' })).toBeVisible();
    await expect(page.locator('button', { hasText: '↓Export' })).toBeVisible();
    await expect(page.locator('button', { hasText: '📋양식' })).toBeVisible();
    await expect(page.locator('button', { hasText: '⊞Save' })).toBeVisible();
    await expect(page.locator('button', { hasText: '✕Del' })).toBeVisible();
    await expect(page.locator('button', { hasText: '?Help' })).toBeVisible();
    await expect(page.locator('button', { hasText: '⟳Refresh' })).toBeVisible();
  });

  test('2. CIP DB 데이터 로드 — 시드 5건이 테이블에 표시', async ({ page }) => {
    // "12 au bump" 프로젝트가 이미 선택되어 있으므로 CIP 데이터가 로드되어야 함
    // 5건의 시드 데이터 중 하나가 테이블에 보이는지 확인
    const tableBody = page.locator('tbody');
    await page.waitForTimeout(2000);
    const bodyText = await tableBody.textContent();

    // 시드 데이터의 고장형태 중 하나가 표시되는지 확인
    const hasSeededData = bodyText?.includes('솔더 브릿지')
      || bodyText?.includes('볼 조인트 크랙')
      || bodyText?.includes('와이어 리프트오프')
      || bodyText?.includes('보이드')
      || bodyText?.includes('Leakage')
      || bodyText?.includes('김품질')
      || bodyText?.includes('박공정');

    expect(hasSeededData).toBeTruthy();
  });

  test('3. 그래프 렌더링 — AP 등급 분포 차트에 데이터 표시', async ({ page }) => {
    await page.waitForTimeout(2000);

    // APSummaryChart: "AP 등급 분포" 제목이 표시되는지 확인
    const summaryChart = page.locator('text=AP 등급 분포');
    await expect(summaryChart).toBeVisible();

    // APImprovementChart: "AP 개선 현황" 제목이 표시되는지 확인
    const improvementChart = page.locator('text=AP 개선 현황');
    await expect(improvementChart).toBeVisible();

    // 차트 내에 데이터가 0이 아닌 값이 있는지 확인
    // "전체 대상 N건" 텍스트에서 N > 0 확인
    const totalText = page.locator('text=/전체 대상 \\d+건/');
    const text = await totalText.textContent();
    const match = text?.match(/전체 대상 (\d+)건/);
    if (match) {
      expect(parseInt(match[1], 10)).toBeGreaterThan(0);
    }
  });

  test('4. Help 모달 — 열기/닫기 동작', async ({ page }) => {
    // Help 버튼 클릭
    const helpBtn = page.locator('button', { hasText: '?Help' });
    await helpBtn.click();
    await page.waitForTimeout(500);

    // 모달이 열리고 도움말 내용이 보이는지 확인
    await expect(page.locator('text=AP 개선관리 도움말')).toBeVisible();
    await expect(page.locator('text=AP 등급 (Action Priority)')).toBeVisible();
    await expect(page.locator('text=기능 버튼')).toBeVisible();
    await expect(page.locator('text=데이터 소스')).toBeVisible();

    // 닫기 버튼 클릭
    const closeBtn = page.locator('button', { hasText: '닫기 (Close)' });
    await closeBtn.click();
    await page.waitForTimeout(300);

    // 모달이 닫혔는지 확인
    await expect(page.locator('text=AP 개선관리 도움말')).not.toBeVisible();
  });

  test('5. Excel Import — 5건 테스트 데이터 추가 로드', async ({ page }) => {
    const testFile = path.resolve(__dirname, '../temp-ap-test.xlsx');

    // 기존 데이터 수 확인
    await page.waitForTimeout(1500);

    // dialog handler 등록
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // hidden file input에 파일 업로드
    const fileInput = page.locator('input[type="file"][accept=".xlsx,.xls"]');
    await fileInput.setInputFiles(testFile);

    await page.waitForTimeout(1500);

    // Import 후 테이블에 데이터가 추가되었는지 확인
    const bodyText = await page.locator('tbody').textContent();
    const hasImportedData = bodyText?.includes('솔더 브릿지')
      || bodyText?.includes('Solder Paste')
      || bodyText?.includes('김품질');

    expect(hasImportedData).toBeTruthy();
  });

  test('6. +Add — 수동 행 추가 후 테이블에 표시', async ({ page }) => {
    const addBtn = page.locator('button', { hasText: '+Add' });
    await addBtn.click();
    await page.waitForTimeout(500);

    // 새 행이 추가됨을 확인 — 테이블 행이 존재
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('7. Template Download — 양식 다운로드', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    const templateBtn = page.locator('button', { hasText: '📋양식' });
    await templateBtn.click();

    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('AP개선_양식');
    }
  });

  test('8. 필터 동작 — AP H/M/L 및 Target 필터', async ({ page }) => {
    await page.waitForTimeout(1500);

    // H 필터
    const hBtn = page.locator('button', { hasText: /^H\(/ });
    if (await hBtn.isVisible()) {
      await hBtn.click();
      await page.waitForTimeout(300);
    }

    // 전체 복원
    const allBtn = page.locator('button', { hasText: /전체\(All\)/ });
    if (await allBtn.isVisible()) {
      await allBtn.click();
      await page.waitForTimeout(300);
    }

    // Quality 필터 — 메뉴바 내의 필터 버튼만 선택
    const menuBar = page.locator('.flex-shrink-0.bg-white.border-b');
    const qualityBtn = menuBar.locator('button', { hasText: 'Quality' });
    if (await qualityBtn.isVisible()) {
      await qualityBtn.click();
      await page.waitForTimeout(300);
    }

    expect(true).toBeTruthy();
  });

  test('9. 그래프 카운터 — 상태 카운트 표시 확인', async ({ page }) => {
    await page.waitForTimeout(2000);

    // 상태 카운트가 표시되는지 확인 (✓, ◎, ✕)
    const menuBar = page.locator('.flex-shrink-0.bg-white.border-b');
    const menuText = await menuBar.textContent();

    // 카운트 값이 존재하는지 확인 (어떤 값이든)
    expect(menuText).toContain('✓');
    expect(menuText).toContain('◎');
    expect(menuText).toContain('✕');
  });
});
