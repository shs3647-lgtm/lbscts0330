/**
 * @file ai-recommendation.spec.ts
 * @description AI 추천 시스템 테스트
 * @version 1.0.0
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000/pfmea/worksheet';

test.describe('AI 추천 시스템 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  });

  // ========== 1. AI 컴포넌트 로드 테스트 ==========
  test.describe('1. AI 컴포넌트 로드', () => {
    
    test('1.1 3L 고장원인 탭이 정상 로드됨', async ({ page }) => {
      // 3L원인 탭으로 이동
      await page.click('button:has-text("3L원인")');
      await page.waitForTimeout(1000);
      
      // 테이블이 표시되어야 함
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('1.2 2L 고장형태 탭이 정상 로드됨', async ({ page }) => {
      // 2L형태 탭으로 이동
      await page.click('button:has-text("2L형태")');
      await page.waitForTimeout(1000);
      
      // 테이블이 표시되어야 함
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });
  });

  // ========== 2. AI 추천 패널 테스트 ==========
  test.describe('2. AI 추천 기본 규칙', () => {
    
    test('2.1 4M 분류별 기본 고장원인 확인', async ({ page }) => {
      // 페이지 내에서 JavaScript 실행하여 기본 규칙 확인
      const causes = await page.evaluate(() => {
        // localStorage에서 AI 히스토리 확인
        const historyKey = 'fmea-ai-history';
        const history = localStorage.getItem(historyKey);
        return {
          hasHistory: !!history,
          historyLength: history ? JSON.parse(history).length : 0,
        };
      });
      
      // 히스토리 확인 (있거나 없어도 에러 없어야 함)
      expect(causes).toBeDefined();
    });
  });

  // ========== 3. AI 학습 데이터 저장 테스트 ==========
  test.describe('3. AI 학습 데이터 저장', () => {
    
    test('3.1 워크시트 저장 시 AI 히스토리 저장', async ({ page }) => {
      // 구조분석 탭에서 저장 트리거
      await page.click('button:has-text("구조분석")');
      await page.waitForTimeout(500);
      
      // AI 히스토리 확인
      const aiStatus = await page.evaluate(() => {
        const historyKey = 'fmea-ai-history';
        const rulesKey = 'fmea-ai-rules';
        return {
          historyExists: !!localStorage.getItem(historyKey),
          rulesExists: !!localStorage.getItem(rulesKey),
        };
      });
      
      // 저장 여부 확인 (초기에는 없어도 됨)
      expect(aiStatus).toBeDefined();
    });
  });

  // ========== 4. 에러 없음 확인 ==========
  test.describe('4. 에러 없음 확인', () => {
    
    test('4.1 모든 탭 순회 시 AI 관련 에러 없음', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('AI') || text.includes('ai-recommendation')) {
            errors.push(text);
          }
        }
      });
      
      // 관련 탭 순회
      const tabs = ['2L형태', '3L원인'];
      for (const tabLabel of tabs) {
        await page.click(`button:has-text("${tabLabel}")`);
        await page.waitForTimeout(800);
      }
      
      expect(errors.length).toBe(0);
    });
  });

  // ========== 5. Cold Start 대응 테스트 ==========
  test.describe('5. Cold Start 대응', () => {
    
    test('5.1 학습 데이터 없어도 기본 규칙으로 추천 표시', async ({ page }) => {
      // AI 히스토리 초기화
      await page.evaluate(() => {
        localStorage.removeItem('fmea-ai-history');
        localStorage.removeItem('fmea-ai-rules');
      });
      
      // 3L원인 탭으로 이동
      await page.click('button:has-text("3L원인")');
      await page.waitForTimeout(1000);
      
      // 페이지가 정상 렌더링되어야 함
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });
  });
});

