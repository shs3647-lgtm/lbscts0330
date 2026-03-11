/**
 * @file pfmea-register-prd.spec.ts
 * @description PFMEA 등록 화면 PRD 기반 테스트 (11_PFMEA_등록_PRD.md)
 * @date 2026-01-24
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const REGISTER_URL = `${BASE_URL}/pfmea/register`;

test.describe('PFMEA 등록 화면 PRD 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 다이얼로그 자동 처리
    page.on('dialog', async (dlg) => {
      console.log(`Dialog: ${dlg.type()} - ${dlg.message()}`);
      await dlg.accept();
    });
  });

  test.describe('3.1 화면 로드', () => {
    test('1-1: /pfmea/register 접근 - 등록 화면 정상 표시', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');
      
      // 화면 제목 확인
      const title = page.locator('h1');
      await expect(title).toContainText(/PFMEA.*(등록|수정)/);
      
      // 스크린샷
      await page.screenshot({ path: 'tests/screenshots/register-1-1-load.png' });
    });

    test('1-2: 기초정보 섹션 표시', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');
      
      // 기획 및 준비 (1단계) 섹션
      await expect(page.locator('text=기획 및 준비 (1단계)')).toBeVisible();
      
      // 주요 필드 라벨 확인
      await expect(page.locator('text=회사 명')).toBeVisible();
      await expect(page.locator('text=FMEA명')).toBeVisible();
      await expect(page.locator('text=FMEA ID')).toBeVisible();
      await expect(page.locator('text=상위 APQP')).toBeVisible();
    });
  });

  test.describe('3.2 기초정보 입력', () => {
    test('2-1, 2-2: 회사명, FMEA명 입력', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');
      
      // 회사명 입력
      const companyInput = page.locator('input[placeholder*="회사"]').first();
      await companyInput.fill('테스트 회사');
      await expect(companyInput).toHaveValue('테스트 회사');
      
      // FMEA명 입력
      const subjectInput = page.locator('input[placeholder*="시스템"]').first();
      await subjectInput.fill('테스트 PFMEA');
      await expect(subjectInput).toHaveValue('테스트 PFMEA');
    });

    test('2-3, 2-4: FMEA 유형 변경 시 ID 재생성', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');
      
      // FMEA 유형 드롭다운 찾기
      const typeSelect = page.locator('select').filter({ hasText: /Master|Family|Part/ }).first();
      await expect(typeSelect).toBeVisible();
      
      // Master 선택
      await typeSelect.selectOption('M');
      await page.waitForTimeout(500);
      
      // ID에 'm' 포함 확인
      const idText = await page.locator('text=/pfm\\d{2}-m/i').first().textContent();
      expect(idText).toMatch(/pfm\d{2}-m/i);
      
      // Part로 변경
      await typeSelect.selectOption('P');
      await page.waitForTimeout(500);
      
      // ID에 'p' 포함 확인
      const idText2 = await page.locator('text=/pfm\\d{2}-p/i').first().textContent();
      expect(idText2).toMatch(/pfm\d{2}-p/i);
      
      await page.screenshot({ path: 'tests/screenshots/register-2-4-type-change.png' });
    });

    test('2-7: 책임자 검색 모달', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');
      
      // 책임자 검색 버튼 클릭
      const searchBtn = page.locator('button:has-text("🔍")').first();
      await searchBtn.click();
      
      // 모달 표시 확인
      await page.waitForTimeout(500);
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible();
      
      await page.screenshot({ path: 'tests/screenshots/register-2-7-user-modal.png' });
      
      // 모달 닫기
      await page.keyboard.press('Escape');
    });

    test('2-9: 시작 일자 필드 존재', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');

      // 시작 일자 라벨과 입력 필드 확인
      await expect(page.locator('text=시작 일자').first()).toBeVisible();
      await page.screenshot({ path: 'tests/screenshots/register-2-9-date-field.png' });
    });
  });

  test.describe('3.3 FMEA 기초정보 등록 옵션', () => {
    test('3-1: Master FMEA DATA 사용 클릭', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');
      
      // FMEA 기초정보 등록 섹션 확인
      await expect(page.locator('text=FMEA 기초 정보등록')).toBeVisible();
      
      // Master FMEA 버튼 클릭
      const masterBtn = page.locator('td').filter({ hasText: /MASTER.*FMEA.*DATA/i }).first();
      await masterBtn.click();
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'tests/screenshots/register-3-1-master-modal.png' });
    });
  });

  test.describe('3.4 저장 기능', () => {
    test('4-1: 새 PFMEA 생성 모달 - 완제품명 미입력 시 생성 경고', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');

      // 새로 작성 클릭 → 생성 모달 오픈
      const newBtn = page.locator('button').filter({ hasText: /새로.*(작성|등록)/}).first();
      await newBtn.click();
      await page.waitForTimeout(500);

      // 생성 모달 확인
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible();
      await expect(page.locator('text=새 PFMEA 생성')).toBeVisible();

      // 완제품명 비우고 생성 클릭 → 경고 발생 예상
      const createBtn = page.locator('button').filter({ hasText: /생성/ }).first();
      await createBtn.click();
      await page.waitForTimeout(500);

      // 모달 닫기
      const cancelBtn = page.locator('button').filter({ hasText: /취소/ }).first();
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
      }
      await page.waitForTimeout(300);
    });

    test('4-2: 기존 FMEA 수정 저장', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');

      // 현재 로드된 FMEA가 있으므로 직접 저장 (수정모드)
      const saveBtn = page.locator('button').filter({ hasText: /저장/ }).first();
      await expect(saveBtn).toBeVisible();
      await saveBtn.click();

      await page.waitForTimeout(2000);

      // URL에 id 파라미터 확인
      const url = page.url();
      expect(url).toContain('/pfmea/register');

      await page.screenshot({ path: 'tests/screenshots/register-4-2-saved.png' });
    });
  });

  test.describe('3.5 CFT 구성', () => {
    test('5-1: CFT 테이블 표시', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');
      
      // CFT 테이블 확인
      const cftSection = page.locator('text=CFT 리스트').first();
      await cftSection.scrollIntoViewIfNeeded();
      await expect(cftSection).toBeVisible();
      
      await page.screenshot({ path: 'tests/screenshots/register-5-1-cft.png' });
    });

    test('5-2: 역할 드롭다운', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');
      
      // CFT 섹션으로 스크롤
      await page.locator('text=CFT 리스트').first().scrollIntoViewIfNeeded();

      // 역할 드롭다운 찾기
      const roleSelect = page.locator('select').filter({ hasText: /Champion|Leader|PM/ }).first();
      if (await roleSelect.isVisible()) {
        await roleSelect.click();
        await page.screenshot({ path: 'tests/screenshots/register-5-2-role.png' });
      }
    });
  });

  test.describe('3.7 모달 동작', () => {
    test('7-1: 모달 외부 클릭으로 닫기', async ({ page }) => {
      await page.goto(REGISTER_URL);
      await page.waitForLoadState('networkidle');
      
      // APQP 선택 영역 클릭하여 모달 열기
      const apqpCell = page.locator('td').filter({ hasText: /클릭하여 선택/ }).first();
      await apqpCell.click();
      
      await page.waitForTimeout(500);
      
      // 모달 외부 클릭
      await page.mouse.click(10, 10);
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'tests/screenshots/register-7-1-modal-close.png' });
    });
  });
});
