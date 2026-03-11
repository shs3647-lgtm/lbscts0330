/**
 * @file pfmea-list-emptyrow.spec.ts
 * @description PFMEA 리스트: '미입력' 미표시 + 빈행 1개만 유지 회귀 테스트
 *
 * Policy: TEST_ENV=FULL_SYSTEM 환경에서 실행
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

test.describe.configure({ mode: 'serial' });

test('PFMEA 리스트: 미입력 텍스트 없음 + 빈검색 시 빈행 1개', async ({ page }) => {
  // 테스트 데이터 주입 (샘플 데이터 대신)
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    const projects = [
      {
        id: 'PFM25-999',
        project: {
          projectName: 'TEST PROJECT',
          customer: 'TEST',
          productName: 'TEST PROD',
          partNo: '',
          department: 'QA',
          leader: 'Tester',
          startDate: '2026-01-04',
          endDate: '',
        },
        fmeaInfo: {
          subject: 'TEST FMEA',
          fmeaStartDate: '2026-01-04',
          fmeaRevisionDate: '2026-01-04',
          modelYear: 'MY2026',
          designResponsibility: 'QA',
          fmeaResponsibleName: 'Tester',
        },
        createdAt: now,
        status: 'draft',
        step: 1,
        revisionNo: 'Rev.00',
      },
      {
        // intentionally incomplete row: should render '-' and NOT '미입력'
        id: 'PFM25-998',
        project: {
          projectName: '',
          customer: '',
          productName: '',
          partNo: '',
          department: '',
          leader: '',
          startDate: '',
          endDate: '',
        },
        fmeaInfo: {},
        createdAt: now,
        status: 'draft',
        step: 1,
        revisionNo: 'Rev.00',
      },
    ];
    localStorage.setItem('pfmea-projects', JSON.stringify(projects));
    localStorage.removeItem('fmea-projects');
  });

  await page.goto(`${BASE_URL}/pfmea/list`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // '미입력' 문구는 리스트에서 표시하지 않음
  await expect(page.locator('text=미입력')).toHaveCount(0);

  // 빈검색(0건) 만들기 → tbody에는 빈행 1개만 존재해야 함
  await page.locator('input[placeholder*="검색"]').fill('___NO_MATCH___');
  await page.waitForTimeout(300);
  await expect(page.locator('text=/총\\s*0건/')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
});



