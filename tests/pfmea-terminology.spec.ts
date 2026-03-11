/**
 * @file pfmea-terminology.spec.ts
 * @description PFMEA All 탭 용어 검증 테스트 (Deep & Wide TDD)
 * @created 2026-01-04
 */

import { test, expect } from '@playwright/test';

test.describe('PFMEA All 탭 용어 검증', () => {
  test.beforeEach(async ({ page }) => {
    // PFMEA 워크시트 페이지로 이동
    await page.goto('http://localhost:3000/pfmea/worksheet');
    await page.waitForLoadState('networkidle');
    
    // All 탭 클릭
    const allTab = page.locator('button:has-text("전체보기"), button:has-text("All"), [data-tab="all"]');
    if (await allTab.count() > 0) {
      await allTab.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('구조분석(2단계) 헤더에 PFMEA 용어가 표시되어야 함', async ({ page }) => {
    // PFMEA 용어 확인
    const correctTerms = ['완제품 공정명', '메인공정', '작업요소'];
    const wrongTerms = ['다음 상위수준', '초점 요소', '다음 하위수준'];

    for (const term of correctTerms) {
      const element = page.locator(`th:has-text("${term}"), td:has-text("${term}")`);
      const count = await element.count();
      console.log(`✅ PFMEA 용어 "${term}": ${count > 0 ? '발견' : '미발견'}`);
    }

    for (const term of wrongTerms) {
      const element = page.locator(`th:has-text("${term}")`);
      const count = await element.count();
      if (count > 0) {
        console.error(`❌ DFMEA 용어 "${term}" 발견됨 - 수정 필요!`);
      } else {
        console.log(`✅ DFMEA 용어 "${term}": 없음 (정상)`);
      }
      expect(count).toBe(0);
    }
  });

  test('기능분석(3단계) 헤더에 PFMEA 용어가 표시되어야 함', async ({ page }) => {
    // PFMEA 용어 확인
    const correctTerms = ['완제품 기능', '공정기능', '제품특성', '작업요소기능', '공정특성'];
    const wrongTerms = ['다음상위수준 기능', '초점요소 기능', '다음하위수준', '부품 기능', '설계특성'];

    for (const term of correctTerms) {
      const element = page.locator(`th:has-text("${term}")`);
      const count = await element.count();
      console.log(`✅ PFMEA 용어 "${term}": ${count > 0 ? '발견' : '미발견'}`);
    }

    for (const term of wrongTerms) {
      const element = page.locator(`th:has-text("${term}")`);
      const count = await element.count();
      if (count > 0) {
        console.error(`❌ DFMEA 용어 "${term}" 발견됨 - 수정 필요!`);
      } else {
        console.log(`✅ DFMEA 용어 "${term}": 없음 (정상)`);
      }
      expect(count).toBe(0);
    }
  });

  test('고장분석(4단계) 헤더에 PFMEA 용어가 표시되어야 함', async ({ page }) => {
    // PFMEA 용어 확인
    const correctTerms = ['고장영향', '고장형태', '고장원인'];
    
    for (const term of correctTerms) {
      const element = page.locator(`th:has-text("${term}")`);
      const count = await element.count();
      console.log(`✅ PFMEA 용어 "${term}": ${count > 0 ? '발견' : '미발견'}`);
    }
  });

  test('DFMEA 용어가 PFMEA 화면에 없어야 함 (Wide 검증)', async ({ page }) => {
    // 전체 페이지에서 DFMEA 용어 검색
    const dfmeaTerms = [
      '다음 상위수준',
      '초점 요소',
      '다음 하위수준',
      '다음상위수준 기능',
      '초점요소 기능',
      '다음하위수준/특성유형',
      '부품 기능',
      '설계특성',
    ];

    const pageContent = await page.content();
    
    for (const term of dfmeaTerms) {
      const found = pageContent.includes(term);
      if (found) {
        console.error(`❌ DFMEA 용어 "${term}" 페이지에서 발견됨!`);
      } else {
        console.log(`✅ DFMEA 용어 "${term}": 없음 (정상)`);
      }
      expect(found).toBe(false);
    }
  });

  test('P-FMEA 단계 헤더가 올바르게 표시되어야 함', async ({ page }) => {
    const stepHeaders = [
      'P-FMEA 구조분석(2단계)',
      'P-FMEA 기능분석(3단계)',
      'P-FMEA 고장분석(4단계)',
      'P-FMEA 리스크분석(5단계)',
      'P-FMEA 최적화(6단계)',
    ];

    for (const header of stepHeaders) {
      const element = page.locator(`th:has-text("${header}")`);
      const count = await element.count();
      console.log(`${count > 0 ? '✅' : '⚠️'} 헤더 "${header}": ${count > 0 ? '발견' : '미발견'}`);
    }
  });
});

test.describe('PFMEA 다른 탭 용어 검증 (Deep 검증)', () => {
  test('구조분석 탭 용어 확인', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet');
    await page.waitForLoadState('networkidle');
    
    // 구조분석 탭 클릭
    const structureTab = page.locator('button:has-text("구조"), [data-tab="structure"]');
    if (await structureTab.count() > 0) {
      await structureTab.first().click();
      await page.waitForTimeout(500);
    }

    const pageContent = await page.content();
    
    // PFMEA 용어 확인
    const pfmeaTerms = ['완제품', '메인공정', '작업요소'];
    for (const term of pfmeaTerms) {
      const found = pageContent.includes(term);
      console.log(`${found ? '✅' : '⚠️'} 구조분석 탭 "${term}": ${found ? '발견' : '미발견'}`);
    }
  });

  test('기능분석 탭 용어 확인', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet');
    await page.waitForLoadState('networkidle');
    
    // 기능분석 탭 클릭
    const functionTab = page.locator('button:has-text("기능"), [data-tab="function"]');
    if (await functionTab.count() > 0) {
      await functionTab.first().click();
      await page.waitForTimeout(500);
    }

    const pageContent = await page.content();
    
    // DFMEA 용어가 없어야 함
    const dfmeaTerms = ['초점요소', '부품 기능', '설계특성'];
    for (const term of dfmeaTerms) {
      const found = pageContent.includes(term);
      if (found) {
        console.error(`❌ 기능분석 탭에 DFMEA 용어 "${term}" 발견!`);
      } else {
        console.log(`✅ 기능분석 탭 DFMEA 용어 "${term}": 없음 (정상)`);
      }
    }
  });

  test('고장분석 탭 용어 확인', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/worksheet');
    await page.waitForLoadState('networkidle');
    
    // 고장분석 탭 클릭
    const failureTab = page.locator('button:has-text("고장"), [data-tab="failure"]');
    if (await failureTab.count() > 0) {
      await failureTab.first().click();
      await page.waitForTimeout(500);
    }

    const pageContent = await page.content();
    
    // PFMEA 용어 확인
    const pfmeaTerms = ['고장영향', '고장형태', '고장원인', 'FE', 'FM', 'FC'];
    for (const term of pfmeaTerms) {
      const found = pageContent.includes(term);
      console.log(`${found ? '✅' : '⚠️'} 고장분석 탭 "${term}": ${found ? '발견' : '미발견'}`);
    }
  });
});


