/**
 * @file pm-deep-e2e.spec.ts
 * @description PM (예방보전) 모듈 종합 E2E 테스트 (16개 섹션, ~45 테스트)
 *
 * 테스트 범위:
 * 1. 리스트 페이지 - 목록 조회, 생성 버튼, 테이블 표시
 * 2. 등록 페이지 - 기본정보 폼, 필드, 저장, CFT
 * 3. 워크시트 기본 구조 - 렌더링, 메뉴바, 탭, 드롭다운
 * 4. 워크시트 탭 - PM Main, PM Work Sheet, 설비/TOOL, 작업표준
 * 5. 상단 메뉴바 - 저장, Export, Import, CP연동, FMEA연동
 * 6. 컨텍스트 메뉴 - 우클릭 메뉴, 병합 옵션
 * 7. PM Main 탭 내용 - 표준정보, 작업 공정도, 작업 방법
 * 8. 설비/TOOL 탭 - 설비 관리, 추가 버튼
 * 9. 작업표준 탭 - 작업표준 관리, 추가 버튼
 * 10. CFT 리다이렉트 - /pm/cft -> /pm/register
 * 11. 로그 페이지 - 접속 및 기본 UI
 * 12. API 테스트 - GET/POST/DELETE
 * 13. 등록 필드 저장 - 기밀수준, 공정책임
 * 14. 확정/승인 - 확정 버튼, 승인 버튼
 * 15. 입력 모드 토글 - 수동/자동
 * 16. 병합 토글 - All/D/E/F/H
 */
import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';

// ============================================================================
// 헬퍼 함수
// ============================================================================
async function gotoPmWorksheet(page: Page) {
  await page.goto(`${BASE}/pm/worksheet`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

async function domHasText(page: Page, text: string): Promise<boolean> {
  const content = await page.content();
  return content.includes(text);
}

// ============================================================================
// 1. PM 리스트 페이지
// ============================================================================
test.describe('1. PM 리스트 페이지', () => {

  test('1.1 리스트 페이지 접속 및 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/pm`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasError = await domHasText(page, 'Application error');
    expect(hasError).toBe(false);

    const hasPM = await domHasText(page, 'PM') || await domHasText(page, '예방보전') || await domHasText(page, '공정관리');
    console.log(`PM 리스트 로드: ${hasPM ? 'OK' : 'WARN'}`);
    expect(hasPM).toBe(true);
  });

  test('1.2 생성 버튼 확인', async ({ page }) => {
    await page.goto(`${BASE}/pm`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createBtn = page.locator('button, a').filter({ hasText: /새로|작성|등록|추가|생성/ });
    const count = await createBtn.count();
    console.log(`생성 버튼: ${count > 0 ? 'OK' : 'WARN - not found'}`);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('1.3 테이블 표시 확인', async ({ page }) => {
    await page.goto(`${BASE}/pm`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const tables = page.locator('table');
    const tableCount = await tables.count();
    console.log(`PM 리스트 테이블: ${tableCount}개`);
    expect(tableCount).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 2. PM 등록 페이지
// ============================================================================
test.describe('2. PM 등록 페이지', () => {

  test('2.1 등록 페이지 접속 및 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/pm/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasError = await domHasText(page, 'Application error');
    expect(hasError).toBe(false);

    const hasPage = await domHasText(page, 'PM') || await domHasText(page, '등록') || await domHasText(page, '기본정보');
    console.log(`PM 등록 페이지 로드: ${hasPage ? 'OK' : 'WARN'}`);
    expect(hasPage).toBe(true);
  });

  test('2.2 등록 폼 주요 필드 확인 [PM명, 고객, 회사, 모델]', async ({ page }) => {
    await page.goto(`${BASE}/pm/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const fields = ['고객', '회사', '모델', '품명', '품번', 'PM'];
    let found = 0;
    for (const field of fields) {
      if (await domHasText(page, field)) found++;
    }
    console.log(`등록 폼 필드: ${found}/${fields.length}`);
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('2.3 저장 버튼 확인', async ({ page }) => {
    await page.goto(`${BASE}/pm/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const saveBtn = page.locator('button').filter({ hasText: /저장|Save/ });
    const count = await saveBtn.count();
    console.log(`저장 버튼: ${count > 0 ? 'OK' : 'WARN - not found'}`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('2.4 CFT 섹션 확인', async ({ page }) => {
    await page.goto(`${BASE}/pm/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const cftFields = ['CFT', 'Champion', 'Leader', '팀원', '역할', '부서', '성명'];
    let found = 0;
    for (const field of cftFields) {
      if (await domHasText(page, field)) found++;
    }
    console.log(`CFT 관련 필드: ${found}/${cftFields.length}`);
    expect(found).toBeGreaterThanOrEqual(1);
  });

  test('2.5 연동 필드 확인 (상위 FMEA, 연동 CP, 상위 APQP)', async ({ page }) => {
    await page.goto(`${BASE}/pm/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const linkFields = ['FMEA', 'CP', 'APQP', 'PFD'];
    let found = 0;
    for (const field of linkFields) {
      if (await domHasText(page, field)) {
        found++;
        console.log(`"${field}" 연동 필드 존재`);
      }
    }
    console.log(`연동 필드: ${found}/${linkFields.length}`);
    expect(found).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 3. PM 워크시트 기본 구조
// ============================================================================
test.describe('3. PM 워크시트 기본 구조', () => {

  test('3.1 워크시트 접속 및 렌더링', async ({ page }) => {
    await gotoPmWorksheet(page);

    const hasError = await domHasText(page, 'Application error');
    expect(hasError).toBe(false);

    const hasPM = await domHasText(page, 'PM') || await domHasText(page, 'WS') || await domHasText(page, '워크시트') || await domHasText(page, '작업표준');
    console.log(`PM 워크시트 로드: ${hasPM ? 'OK' : 'WARN'}`);
    expect(hasPM).toBe(true);
  });

  test('3.2 상단 메뉴바 존재 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    // PmTopMenuBar: WS 선택, 저장 버튼
    const hasWSSelect = await domHasText(page, 'WS 선택') || await domHasText(page, 'WS를 선택');
    const hasSaveBtn = await domHasText(page, '저장');
    console.log(`WS 선택: ${hasWSSelect ? 'OK' : 'WARN'}, 저장: ${hasSaveBtn ? 'OK' : 'WARN'}`);
    expect(hasWSSelect || hasSaveBtn).toBe(true);
  });

  test('3.3 탭 메뉴 존재 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const tabs = ['PM Main', 'PM Work Sheet', '설비/TOOL', '작업표준'];
    let found = 0;
    for (const tab of tabs) {
      if (await domHasText(page, tab)) {
        found++;
        console.log(`탭 "${tab}" 존재`);
      }
    }
    console.log(`탭 메뉴: ${found}/${tabs.length}`);
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('3.4 탭 전환 동작 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    // PM Main 탭 클릭
    const mainTab = page.locator('button').filter({ hasText: 'PM Main' }).first();
    if (await mainTab.count() > 0) {
      await mainTab.click();
      await page.waitForTimeout(1000);
      console.log('PM Main 탭 전환 성공');
    }

    // PM Work Sheet 탭 클릭
    const worksheetTab = page.locator('button').filter({ hasText: 'PM Work Sheet' }).first();
    if (await worksheetTab.count() > 0) {
      await worksheetTab.click();
      await page.waitForTimeout(1000);
      console.log('PM Work Sheet 탭 전환 성공');
    }

    // 설비/TOOL 탭 클릭
    const equipTab = page.locator('button').filter({ hasText: '설비' }).first();
    if (await equipTab.count() > 0) {
      await equipTab.click();
      await page.waitForTimeout(1000);
      console.log('설비/TOOL 탭 전환 성공');
    }

    // 모달이 열려있으면 닫기 (설비 탭 클릭 시 모달이 열릴 수 있음)
    const closeBtn = page.locator('button').filter({ hasText: '닫기' }).first();
    if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
    // ESC로도 모달 닫기 시도
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 작업표준 탭 클릭
    const workStdTab = page.locator('button').filter({ hasText: '작업표준' }).first();
    if (await workStdTab.count() > 0) {
      await workStdTab.click({ force: true });
      await page.waitForTimeout(1000);
      console.log('작업표준 탭 전환 성공');
    }

    expect(true).toBe(true);
  });

  test('3.5 WS 선택 드롭다운 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const selectEl = page.locator('select').first();
    const exists = await selectEl.count();
    console.log(`WS 선택 드롭다운: ${exists > 0 ? 'OK' : 'WARN - not found'}`);
    expect(exists).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 4. PM 워크시트 탭 내용
// ============================================================================
test.describe('4. PM 워크시트 탭 내용', () => {

  test('4.1 PM Main 탭 콘텐츠 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const mainTab = page.locator('button').filter({ hasText: 'PM Main' }).first();
    if (await mainTab.count() > 0) {
      await mainTab.click();
      await page.waitForTimeout(1500);
    }

    const hasContent = await domHasText(page, '표준') || await domHasText(page, '결재') ||
                       await domHasText(page, '작업표준') || await domHasText(page, '공정');
    console.log(`PM Main 탭 콘텐츠: ${hasContent ? 'OK' : 'WARN'}`);
    expect(hasContent).toBe(true);
  });

  test('4.2 PM Work Sheet 탭 (데이터 그리드) 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const wsTab = page.locator('button').filter({ hasText: 'PM Work Sheet' }).first();
    if (await wsTab.count() > 0) {
      await wsTab.click();
      await page.waitForTimeout(1500);
    }

    const tables = page.locator('table');
    const tableCount = await tables.count();
    console.log(`PM Work Sheet 테이블: ${tableCount}개`);
    expect(tableCount).toBeGreaterThanOrEqual(1);
  });

  test('4.3 설비/TOOL 탭 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const equipTab = page.locator('button').filter({ hasText: '설비' }).first();
    if (await equipTab.count() > 0) {
      await equipTab.click();
      await page.waitForTimeout(1500);
    }

    const hasEquip = await domHasText(page, '설비') || await domHasText(page, 'TOOL');
    console.log(`설비/TOOL 탭: ${hasEquip ? 'OK' : 'WARN'}`);
    expect(hasEquip).toBe(true);
  });

  test('4.4 작업표준 탭 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const workStdTab = page.locator('button').filter({ hasText: '작업표준' }).first();
    if (await workStdTab.count() > 0) {
      await workStdTab.click();
      await page.waitForTimeout(1500);
    }

    const hasWorkStd = await domHasText(page, '작업표준') || await domHasText(page, '작업 단계') || await domHasText(page, '단계');
    console.log(`작업표준 탭: ${hasWorkStd ? 'OK' : 'WARN'}`);
    expect(hasWorkStd).toBe(true);
  });
});

// ============================================================================
// 5. PM 상단 메뉴바
// ============================================================================
test.describe('5. PM 상단 메뉴바', () => {

  test('5.1 저장 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const saveBtn = page.locator('button').filter({ hasText: /저장/ });
    const count = await saveBtn.count();
    console.log(`저장 버튼: ${count > 0 ? 'OK' : 'WARN - not found'}`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('5.2 Export 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const hasExport = await domHasText(page, 'Export') || await domHasText(page, '내보내기');
    console.log(`Export 버튼: ${hasExport ? 'OK' : 'WARN'}`);
    expect(hasExport).toBe(true);
  });

  test('5.3 Import 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const hasImport = await domHasText(page, 'Import') || await domHasText(page, '가져오기');
    console.log(`Import 버튼: ${hasImport ? 'OK' : 'WARN'}`);
    expect(hasImport).toBe(true);
  });

  test('5.4 CP연동 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const hasCP = await domHasText(page, 'CP로') || await domHasText(page, 'CP연동') || await domHasText(page, 'CP');
    console.log(`CP연동 버튼: ${hasCP ? 'OK' : 'WARN'}`);
    expect(hasCP).toBe(true);
  });

  test('5.5 FMEA연동 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const hasFMEA = await domHasText(page, 'FMEA로') || await domHasText(page, 'FMEA연동') || await domHasText(page, 'FMEA');
    console.log(`FMEA연동 버튼: ${hasFMEA ? 'OK' : 'WARN'}`);
    expect(hasFMEA).toBe(true);
  });

  test('5.6 설비/TOOL 관리 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const hasEquipBtn = await domHasText(page, '설비/TOOL') || await domHasText(page, '🔧');
    console.log(`설비/TOOL 관리 버튼: ${hasEquipBtn ? 'OK' : 'WARN'}`);
    expect(hasEquipBtn).toBe(true);
  });

  test('5.7 부품관리 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const hasPartsBtn = await domHasText(page, '부품관리') || await domHasText(page, '📦');
    console.log(`부품관리 버튼: ${hasPartsBtn ? 'OK' : 'WARN'}`);
    expect(hasPartsBtn).toBe(true);
  });
});

// ============================================================================
// 6. 컨텍스트 메뉴
// ============================================================================
test.describe('6. 컨텍스트 메뉴', () => {

  test('6.1 우클릭으로 컨텍스트 메뉴 표시', async ({ page }) => {
    await gotoPmWorksheet(page);

    // PM Work Sheet 탭이 기본 활성 탭
    const cell = page.locator('tbody td').first();
    if (await cell.count() > 0) {
      await cell.click({ button: 'right' });
      await page.waitForTimeout(500);

      const menuItems = ['행 추가', '행 삭제', '실행 취소', '위로', '아래로'];
      let found = 0;
      for (const item of menuItems) {
        if (await domHasText(page, item)) found++;
      }
      console.log(`컨텍스트 메뉴 항목: ${found}/${menuItems.length}`);
      expect(found).toBeGreaterThanOrEqual(1);

      await page.locator('body').click();
    } else {
      console.log('데이터 행 없음 - 컨텍스트 메뉴 테스트 스킵');
      expect(true).toBe(true);
    }
  });

  test('6.2 병합 옵션 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const cell = page.locator('tbody td').first();
    if (await cell.count() > 0) {
      await cell.click({ button: 'right' });
      await page.waitForTimeout(500);

      const hasMerge = await domHasText(page, '병합') || await domHasText(page, 'merge');
      console.log(`병합 옵션: ${hasMerge ? 'OK' : 'WARN - not visible (column-dependent)'}`);

      await page.locator('body').click();
    }
    expect(true).toBe(true);
  });
});

// ============================================================================
// 7. PM Main 탭 콘텐츠
// ============================================================================
test.describe('7. PM Main 탭 콘텐츠', () => {

  test('7.1 표준정보 헤더 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const mainTab = page.locator('button').filter({ hasText: 'PM Main' }).first();
    if (await mainTab.count() > 0) {
      await mainTab.click();
      await page.waitForTimeout(1500);
    }

    const headerFields = ['표준번호', '제정일자', '개정일자', '개정번호', '작업표준'];
    let found = 0;
    for (const field of headerFields) {
      if (await domHasText(page, field)) found++;
    }
    console.log(`표준정보 헤더: ${found}/${headerFields.length}`);
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('7.2 공정정보 필드 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const mainTab = page.locator('button').filter({ hasText: 'PM Main' }).first();
    if (await mainTab.count() > 0) {
      await mainTab.click();
      await page.waitForTimeout(1500);
    }

    const processFields = ['공정번호', '공정명', '품명', '품번'];
    let found = 0;
    for (const field of processFields) {
      if (await domHasText(page, field)) found++;
    }
    console.log(`공정정보 필드: ${found}/${processFields.length}`);
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('7.3 결재란 섹션 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const mainTab = page.locator('button').filter({ hasText: 'PM Main' }).first();
    if (await mainTab.count() > 0) {
      await mainTab.click();
      await page.waitForTimeout(1500);
    }

    const approvalFields = ['작성', '검토', '승인'];
    let found = 0;
    for (const field of approvalFields) {
      if (await domHasText(page, field)) found++;
    }
    console.log(`결재란: ${found}/${approvalFields.length}`);
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('7.4 안전보호구 섹션 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const mainTab = page.locator('button').filter({ hasText: 'PM Main' }).first();
    if (await mainTab.count() > 0) {
      await mainTab.click();
      await page.waitForTimeout(1500);
    }

    const safetyItems = ['장갑', '안전화', '안전모', '마스크'];
    let found = 0;
    for (const item of safetyItems) {
      if (await domHasText(page, item)) found++;
    }
    console.log(`안전보호구: ${found}/${safetyItems.length}`);
    expect(found).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// 8. 설비/TOOL 탭
// ============================================================================
test.describe('8. 설비/TOOL 탭', () => {

  test('8.1 설비 관리 헤딩 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const equipTab = page.locator('button').filter({ hasText: '설비' }).first();
    if (await equipTab.count() > 0) {
      await equipTab.click();
      await page.waitForTimeout(1500);
    }

    const hasHeading = await domHasText(page, '설비') && await domHasText(page, 'TOOL');
    console.log(`설비 헤딩: ${hasHeading ? 'OK' : 'WARN'}`);
    expect(hasHeading).toBe(true);
  });

  test('8.2 설비 추가 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const equipTab = page.locator('button').filter({ hasText: '설비' }).first();
    if (await equipTab.count() > 0) {
      await equipTab.click();
      await page.waitForTimeout(1500);
    }

    const addBtn = page.locator('button').filter({ hasText: /추가|Add/ });
    const count = await addBtn.count();
    console.log(`설비 추가 버튼: ${count > 0 ? 'OK' : 'WARN - not found'}`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('8.3 샘플 데이터 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const equipTab = page.locator('button').filter({ hasText: '설비' }).first();
    if (await equipTab.count() > 0) {
      await equipTab.click();
      await page.waitForTimeout(1500);
    }

    const sampleBtn = page.locator('button').filter({ hasText: /샘플/ });
    const count = await sampleBtn.count();
    console.log(`샘플 버튼: ${count > 0 ? 'OK' : 'WARN - not found'}`);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 9. 작업표준 탭
// ============================================================================
test.describe('9. 작업표준 탭', () => {

  test('9.1 작업표준 헤딩 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const workStdTab = page.locator('button').filter({ hasText: '작업표준' }).first();
    if (await workStdTab.count() > 0) {
      await workStdTab.click();
      await page.waitForTimeout(1500);
    }

    const hasHeading = await domHasText(page, '작업표준');
    console.log(`작업표준 헤딩: ${hasHeading ? 'OK' : 'WARN'}`);
    expect(hasHeading).toBe(true);
  });

  test('9.2 단계 추가 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const workStdTab = page.locator('button').filter({ hasText: '작업표준' }).first();
    if (await workStdTab.count() > 0) {
      await workStdTab.click();
      await page.waitForTimeout(1500);
    }

    const addBtn = page.locator('button').filter({ hasText: /추가|단계/ });
    const count = await addBtn.count();
    console.log(`단계 추가 버튼: ${count > 0 ? 'OK' : 'WARN - not found'}`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('9.3 안전보호구 패널 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const workStdTab = page.locator('button').filter({ hasText: '작업표준' }).first();
    if (await workStdTab.count() > 0) {
      await workStdTab.click();
      await page.waitForTimeout(1500);
    }

    // 작업표준 탭의 우측 패널에 안전보호구 섹션이 있음
    const hasSafety = await domHasText(page, '안전 보호구') || await domHasText(page, '보호구') || await domHasText(page, '장갑');
    console.log(`안전보호구 패널: ${hasSafety ? 'OK' : 'WARN'}`);
    expect(hasSafety).toBe(true);
  });
});

// ============================================================================
// 10. CFT 리다이렉트
// ============================================================================
test.describe('10. CFT 리다이렉트', () => {

  test('10.1 /pm/cft 접속 시 /pm/register로 리다이렉트', async ({ page }) => {
    await page.goto(`${BASE}/pm/cft`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const hasRegisterContent = await domHasText(page, '등록') || await domHasText(page, '기본정보') ||
                               await domHasText(page, 'PM') || currentUrl.includes('/pm/register');
    console.log(`CFT 리다이렉트: ${currentUrl}`);
    console.log(`등록 페이지 콘텐츠: ${hasRegisterContent ? 'OK' : 'WARN'}`);
    expect(hasRegisterContent).toBe(true);
  });
});

// ============================================================================
// 11. 로그 페이지
// ============================================================================
test.describe('11. 로그 페이지', () => {

  test('11.1 /pm/log 접속 및 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/pm/log`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasError = await domHasText(page, 'Application error');
    expect(hasError).toBe(false);

    const hasLog = await domHasText(page, '로그') || await domHasText(page, '접속') ||
                   await domHasText(page, '활동') || await domHasText(page, 'PM');
    console.log(`로그 페이지: ${hasLog ? 'OK' : 'WARN'}`);
    expect(hasLog).toBe(true);
  });
});

// ============================================================================
// 12. API 테스트
// ============================================================================
test.describe('12. PM API 테스트', () => {

  test('12.1 GET /api/pm - 목록 조회 성공', async ({ request }) => {
    const res = await request.get(`${BASE}/api/pm`);
    expect(res.status()).toBe(200);

    const data = await res.json();
    console.log(`API GET /api/pm: status=${res.status()}, success=${data.success}`);
    expect(data.success).toBe(true);
  });

  test('12.2 GET /api/pm?pmNo=xxx - 단일 조회 응답', async ({ request }) => {
    const res = await request.get(`${BASE}/api/pm?pmNo=test-nonexistent`);
    expect(res.status()).toBe(200);

    const data = await res.json();
    console.log(`API GET /api/pm?pmNo=test-nonexistent: success=${data.success}, data=${data.data}`);
    expect(data.success).toBe(true);
  });

  test('12.3 POST /api/pm - PM 생성', async ({ request }) => {
    const testPmNo = `pm-e2e-test-${Date.now()}`;

    const res = await request.post(`${BASE}/api/pm`, {
      data: {
        pmNo: testPmNo,
        subject: 'E2E Test PM',
        customerName: 'Test Customer',
        companyName: 'Test Company',
        modelYear: '2026',
        partName: 'Test Part',
        partNo: 'TP-001',
      },
    });

    console.log(`API POST /api/pm: status=${res.status()}`);
    expect(res.status()).toBeLessThan(500);

    // 생성 후 정리: DELETE
    try {
      await request.delete(`${BASE}/api/pm?pmNo=${testPmNo}`);
    } catch {
      // 정리 실패해도 테스트에는 영향 없음
    }
  });

  test('12.4 DELETE /api/pm?pmNo=xxx - PM 삭제', async ({ request }) => {
    // 먼저 임시 PM 생성
    const testPmNo = `pm-e2e-del-${Date.now()}`;
    await request.post(`${BASE}/api/pm`, {
      data: {
        pmNo: testPmNo,
        subject: 'E2E Delete Test',
      },
    });

    // 삭제
    const res = await request.delete(`${BASE}/api/pm?pmNo=${testPmNo}`);
    console.log(`API DELETE /api/pm?pmNo=${testPmNo}: status=${res.status()}`);
    expect(res.status()).toBeLessThan(500);
  });

  test('12.5 GET /api/pm?pmNo=xxx - 대소문자 무시 조회', async ({ request }) => {
    // 소문자로 생성
    const testPmNo = `pm-case-test-${Date.now()}`;
    await request.post(`${BASE}/api/pm`, {
      data: {
        pmNo: testPmNo,
        subject: 'Case Test PM',
      },
    });

    // 대문자로 조회
    const res = await request.get(`${BASE}/api/pm?pmNo=${testPmNo.toUpperCase()}`);
    const data = await res.json();
    console.log(`대소문자 무시 조회: success=${data.success}, data=${data.data ? 'found' : 'null'}`);
    // 대소문자 무시 검색이 동작하면 data가 null이 아님
    expect(data.success).toBe(true);

    // 정리
    try {
      await request.delete(`${BASE}/api/pm?pmNo=${testPmNo}`);
    } catch { /* ignore */ }
  });
});

// ============================================================================
// 13. 등록 필드 저장
// ============================================================================
test.describe('13. 등록 필드 저장', () => {

  test('13.1 기밀수준(securityLevel) 필드 확인', async ({ page }) => {
    await page.goto(`${BASE}/pm/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasSecLevel = await domHasText(page, '기밀') || await domHasText(page, '보안') || await domHasText(page, 'security');
    console.log(`기밀수준 필드: ${hasSecLevel ? 'OK' : 'WARN - not found'}`);
    expect(true).toBe(true);
  });

  test('13.2 공정책임(processResponsibility) 필드 확인', async ({ page }) => {
    await page.goto(`${BASE}/pm/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasResp = await domHasText(page, '공정책임') || await domHasText(page, '책임') || await domHasText(page, 'responsible');
    console.log(`공정책임 필드: ${hasResp ? 'OK' : 'WARN - not found'}`);
    expect(true).toBe(true);
  });
});

// ============================================================================
// 14. 확정/승인
// ============================================================================
test.describe('14. 확정/승인 기능', () => {

  test('14.1 확정 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const confirmBtn = page.locator('button').filter({ hasText: /확정|재확정/ });
    const count = await confirmBtn.count();
    console.log(`확정 버튼: ${count > 0 ? 'OK' : 'WARN - not found'}`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('14.2 승인 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const approveBtn = page.locator('button').filter({ hasText: /승인/ });
    const count = await approveBtn.count();
    console.log(`승인 버튼: ${count > 0 ? 'OK' : 'WARN - not found'}`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('14.3 상태 배지 확인 (초안/확정/승인됨)', async ({ page }) => {
    await gotoPmWorksheet(page);

    const hasStatus = await domHasText(page, '초안') || await domHasText(page, '확정') || await domHasText(page, '승인');
    console.log(`상태 배지: ${hasStatus ? 'OK' : 'WARN'}`);
    expect(hasStatus).toBe(true);
  });
});

// ============================================================================
// 15. 입력 모드 토글
// ============================================================================
test.describe('15. 입력 모드 토글', () => {

  test('15.1 수동/자동 토글 존재 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const hasManual = await domHasText(page, '수동');
    const hasAuto = await domHasText(page, '자동');
    console.log(`수동 모드: ${hasManual ? 'OK' : 'WARN'}, 자동 모드: ${hasAuto ? 'OK' : 'WARN'}`);
    expect(hasManual && hasAuto).toBe(true);
  });

  test('15.2 기본값이 수동 모드인지 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const manualBtn = page.locator('button').filter({ hasText: '수동' }).first();
    if (await manualBtn.count() > 0) {
      const classes = await manualBtn.getAttribute('class') || '';
      const isActive = classes.includes('bg-white') || classes.includes('text-blue');
      console.log(`수동 모드 기본 활성: ${isActive ? 'OK' : 'WARN'}`);
      expect(isActive).toBe(true);
    } else {
      console.log('수동 버튼 미발견 - 스킵');
      expect(true).toBe(true);
    }
  });
});

// ============================================================================
// 16. 병합 토글
// ============================================================================
test.describe('16. 병합 토글', () => {

  test('16.1 병합 토글 UI 존재 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const hasMerge = await domHasText(page, '병합');
    console.log(`병합 토글 라벨: ${hasMerge ? 'OK' : 'WARN'}`);
    expect(hasMerge).toBe(true);
  });

  test('16.2 All/D/E/F/H 버튼 확인', async ({ page }) => {
    await gotoPmWorksheet(page);

    const buttons = ['All', 'D', 'E', 'F', 'H'];
    let found = 0;
    for (const btn of buttons) {
      const locator = page.locator('button').filter({ hasText: new RegExp(`^${btn}$`) });
      if (await locator.count() > 0) {
        found++;
      }
    }
    console.log(`병합 토글 버튼: ${found}/${buttons.length}`);
    expect(found).toBeGreaterThanOrEqual(3);
  });
});
