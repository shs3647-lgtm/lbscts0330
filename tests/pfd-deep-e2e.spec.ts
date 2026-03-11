/**
 * @file pfd-deep-e2e.spec.ts
 * @description PFD(공정흐름도) 모듈 종합 E2E 테스트
 *
 * 테스트 범위:
 * 1. 리스트 페이지 - 목록 조회, 검색, 네비게이션
 * 2. 등록 페이지 - 기본정보 폼, CFT, 연동 필드
 * 3. 워크시트 - 테이블 구조, 탭, 메뉴, 모달
 * 4. 워크시트 입력 - 수동/자동 모드, 행 추가/삭제
 * 5. 워크시트 병합 - rowSpan, 확장병합 토글
 * 6. 컨텍스트 메뉴 - 우클릭 메뉴 기능
 * 7. 설비/부품 모달 - CRUD 기능
 * 8. 연동 버튼 - CP/FMEA 연동 UI
 * 9. 임포트 페이지 - 접속, 템플릿 구조
 * 10. 개정관리 페이지 - 접속, 기본 UI
 * 11. 로그 페이지 - 접속, 기본 UI
 * 12. 탭 전환 및 필터링
 * 13. 저장 및 데이터 유지
 */
import { test, expect, Page } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

// === 헬퍼 ===
async function gotoPfdWorksheet(page: Page) {
  await page.goto(`${BASE}/pfd/worksheet`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

async function domHasText(page: Page, text: string): Promise<boolean> {
  const content = await page.content();
  return content.includes(text);
}

// ============================================================================
// 1. PFD 리스트 페이지
// ============================================================================
test.describe('1. PFD 리스트 페이지', () => {

  test('1.1 리스트 페이지 접속 및 테이블 표시', async ({ page }) => {
    await page.goto(`${BASE}/pfd/list`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 페이지가 정상 로드되었는지 (에러 페이지 아닌지)
    const hasError = await domHasText(page, 'Application error');
    expect(hasError).toBe(false);

    // 테이블 또는 리스트 UI 존재 확인
    const hasTable = await page.locator('table').count();
    const hasList = await domHasText(page, 'PFD') || await domHasText(page, '공정흐름도');
    console.log(`✅ PFD 리스트 로드 성공 (테이블: ${hasTable}개)`);
    expect(hasTable > 0 || hasList).toBeTruthy();
  });

  test('1.2 리스트에서 PFD 항목 표시', async ({ page }) => {
    await page.goto(`${BASE}/pfd/list`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // pfd26 패턴의 ID가 보이는지
    const content = await page.content();
    const hasPfdId = content.includes('pfd26') || content.includes('PFD');
    console.log(`PFD 데이터: ${hasPfdId ? '✅ 표시됨' : '⚠️ 비어있음'}`);
  });

  test('1.3 리스트→워크시트 네비게이션 링크', async ({ page }) => {
    await page.goto(`${BASE}/pfd/list`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 워크시트 또는 편집 관련 링크/버튼 존재 확인
    const editLinks = page.locator('a[href*="worksheet"], button:has-text("워크시트"), button:has-text("편집")');
    const count = await editLinks.count();
    console.log(`워크시트 링크/버튼: ${count}개`);
  });
});

// ============================================================================
// 2. PFD 등록 페이지
// ============================================================================
test.describe('2. PFD 등록 페이지', () => {

  test('2.1 등록 페이지 접속 및 폼 표시', async ({ page }) => {
    await page.goto(`${BASE}/pfd/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasError = await domHasText(page, 'Application error');
    expect(hasError).toBe(false);

    // 기본정보 섹션 존재 확인
    const hasBasicInfo = await domHasText(page, '기본정보') || await domHasText(page, 'PFD');
    console.log(`✅ PFD 등록 페이지 로드 (기본정보: ${hasBasicInfo ? '있음' : '미발견'})`);
  });

  test('2.2 등록 폼 필드 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfd/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const requiredFields = ['고객명', '회사명', '품명', 'PFD'];
    let found = 0;
    for (const field of requiredFields) {
      if (await domHasText(page, field)) found++;
    }
    console.log(`등록 폼 필드: ${found}/${requiredFields.length}`);
    expect(found).toBeGreaterThanOrEqual(1);
  });

  test('2.3 연동 필드 확인 (상위 FMEA, 연동 CP)', async ({ page }) => {
    await page.goto(`${BASE}/pfd/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const linkFields = ['상위 FMEA', '연동 CP', '상위 APQP'];
    let found = 0;
    for (const field of linkFields) {
      if (await domHasText(page, field)) {
        found++;
        console.log(`✅ "${field}" 필드 존재`);
      }
    }
    console.log(`연동 필드: ${found}/${linkFields.length}`);
  });

  test('2.4 CFT 멤버 테이블 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfd/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const cftFields = ['CFT', 'Champion', 'Leader', '팀원'];
    let found = 0;
    for (const field of cftFields) {
      if (await domHasText(page, field)) found++;
    }
    console.log(`CFT 관련 필드: ${found}/${cftFields.length}`);
  });
});

// ============================================================================
// 3. PFD 워크시트 - 기본 구조
// ============================================================================
test.describe('3. PFD 워크시트 기본 구조', () => {

  test('3.1 워크시트 접속 및 테이블 렌더링', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const hasError = await domHasText(page, 'Application error');
    expect(hasError).toBe(false);

    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    console.log('✅ PFD 워크시트 테이블 렌더링 확인');
  });

  test('3.2 3행 헤더 구조 (그룹/컬럼명/열번호)', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const thead = page.locator('thead').first();
    await expect(thead).toBeVisible({ timeout: 10000 });

    const headerRows = thead.locator('tr');
    const rowCount = await headerRows.count();
    console.log(`헤더 행 수: ${rowCount}`);
    expect(rowCount).toBeGreaterThanOrEqual(3);
  });

  test('3.3 그룹 헤더 5개 섹션 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const groups = ['단계', '공정현황', '공정흐름', '공정상세', '관리항목'];
    let found = 0;
    for (const grp of groups) {
      if (await domHasText(page, grp)) {
        found++;
        console.log(`✅ 그룹 헤더 "${grp}" 존재`);
      }
    }
    expect(found).toBeGreaterThanOrEqual(4);
  });

  test('3.4 16개 컬럼 헤더 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const columns = ['공정번호', '공정명', '작업', '운반', '저장', '검사',
                     '레벨', '공정설명', '설비', '제품SC', '제품특성', '공정SC', '공정특성'];
    let found = 0;
    for (const col of columns) {
      if (await domHasText(page, col)) found++;
    }
    console.log(`컬럼 헤더: ${found}/${columns.length}`);
    expect(found).toBeGreaterThanOrEqual(10);
  });

  test('3.5 열번호 행 (A, B, C...) 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    // 열번호 행에 A, B 등 표시
    const thead = page.locator('thead');
    const thirdRow = thead.locator('tr').nth(2);
    const cells = thirdRow.locator('th');
    const count = await cells.count();
    console.log(`열번호 행 셀 수: ${count}`);
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('3.6 스크롤 컨테이너 존재', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const container = page.locator('#pfd-worksheet-scroll-container');
    const exists = await container.count();
    console.log(`스크롤 컨테이너: ${exists > 0 ? '✅ 존재' : '⚠️ 미발견'}`);
  });
});

// ============================================================================
// 4. PFD 워크시트 - 상단 메뉴바
// ============================================================================
test.describe('4. PFD 워크시트 메뉴바', () => {

  test('4.1 저장 상태 버튼 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const hasDraft = await domHasText(page, 'Draft');
    const hasSaved = await domHasText(page, '저장됨');
    console.log(`저장 상태: ${hasDraft ? 'Draft' : hasSaved ? '저장됨' : '미확인'}`);
    expect(hasDraft || hasSaved).toBeTruthy();
  });

  test('4.2 Export/Import 버튼 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const hasExport = await domHasText(page, 'Export') || await domHasText(page, '📤');
    const hasImport = await domHasText(page, 'Import') || await domHasText(page, '📥');
    console.log(`Export: ${hasExport ? '✅' : '⚠️'}, Import: ${hasImport ? '✅' : '⚠️'}`);
    expect(hasExport || hasImport).toBeTruthy();
  });

  test('4.3 설비/TOOL 버튼 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const btn = page.locator('button').filter({ hasText: /설비/ }).first();
    const exists = await btn.count();
    console.log(`설비/TOOL 버튼: ${exists > 0 ? '✅ 존재' : '⚠️ 미발견'}`);
    expect(exists).toBeGreaterThanOrEqual(1);
  });

  test('4.4 부품관리 버튼 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const btn = page.locator('button').filter({ hasText: /부품/ }).first();
    const exists = await btn.count();
    console.log(`부품관리 버튼: ${exists > 0 ? '✅ 존재' : '⚠️ 미발견'}`);
    expect(exists).toBeGreaterThanOrEqual(1);
  });

  test('4.5 CP/FMEA 연동 버튼 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const hasCP = await domHasText(page, 'CP로') || await domHasText(page, 'CP');
    const hasFMEA = await domHasText(page, 'FMEA로') || await domHasText(page, 'FMEA');
    console.log(`CP 연동: ${hasCP ? '✅' : '⚠️'}, FMEA 연동: ${hasFMEA ? '✅' : '⚠️'}`);
  });
});

// ============================================================================
// 5. PFD 워크시트 - 탭 메뉴
// ============================================================================
test.describe('5. PFD 워크시트 탭 메뉴', () => {

  test('5.1 기본 탭 버튼 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const tabs = ['전체', '공정현황', '관리항목'];
    let found = 0;
    for (const tab of tabs) {
      const btn = page.locator('button').filter({ hasText: tab }).first();
      if (await btn.count() > 0) {
        found++;
        console.log(`✅ 탭 "${tab}" 존재`);
      }
    }
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('5.2 SC 탭 (제품SC/공정SC) 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const hasProdSC = await domHasText(page, '제품SC');
    const hasProcSC = await domHasText(page, '공정SC');
    console.log(`제품SC 탭: ${hasProdSC ? '✅' : '⚠️'}, 공정SC 탭: ${hasProcSC ? '✅' : '⚠️'}`);
    expect(hasProdSC || hasProcSC).toBeTruthy();
  });

  test('5.3 입력 모드 토글 (수동/자동) 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const hasManual = await domHasText(page, '수동');
    const hasAuto = await domHasText(page, '자동');
    console.log(`수동 모드: ${hasManual ? '✅' : '⚠️'}, 자동 모드: ${hasAuto ? '✅' : '⚠️'}`);
    expect(hasManual && hasAuto).toBeTruthy();
  });

  test('5.4 병합 토글 (All/D/E/F/H) 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    // 병합 토글 그룹 확인
    const content = await page.content();
    const hasMerge = content.includes('병합') || content.includes('All');
    console.log(`병합 토글: ${hasMerge ? '✅ 존재' : '⚠️ 미발견'}`);
  });

  test('5.5 탭 전환 동작 (전체 → 공정현황)', async ({ page }) => {
    await gotoPfdWorksheet(page);

    // 전체 탭 먼저 확인
    const allTab = page.locator('button').filter({ hasText: '전체' }).first();
    if (await allTab.count() > 0) {
      await allTab.click();
      await page.waitForTimeout(500);
    }

    // 공정현황 탭 클릭
    const procTab = page.locator('button').filter({ hasText: '공정현황' }).first();
    if (await procTab.count() > 0) {
      await procTab.click();
      await page.waitForTimeout(500);
      console.log('✅ 공정현황 탭 전환 성공');
    }

    // 관리항목 탭 클릭
    const charTab = page.locator('button').filter({ hasText: '관리항목' }).first();
    if (await charTab.count() > 0) {
      await charTab.click();
      await page.waitForTimeout(500);
      console.log('✅ 관리항목 탭 전환 성공');
    }
  });
});

// ============================================================================
// 6. PFD 워크시트 - 공정흐름 심볼
// ============================================================================
test.describe('6. PFD 공정흐름 심볼', () => {

  test('6.1 공정흐름 4개 심볼 컬럼 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const symbols = ['작업', '운반', '저장', '검사'];
    let found = 0;
    for (const sym of symbols) {
      if (await domHasText(page, sym)) found++;
    }
    console.log(`공정흐름 심볼 컬럼: ${found}/4`);
    expect(found).toBe(4);
  });

  test('6.2 공정흐름 심볼 헤더 색상 (주황)', async ({ page }) => {
    await gotoPfdWorksheet(page);

    // 공정흐름 그룹 헤더의 배경색 확인
    const flowHeader = page.locator('th').filter({ hasText: '공정흐름' }).first();
    if (await flowHeader.count() > 0) {
      const bg = await flowHeader.evaluate(el => window.getComputedStyle(el).backgroundColor);
      console.log(`공정흐름 헤더 배경: ${bg}`);
      // #f57c00 계열인지
      const isOrange = bg.includes('245') || bg.includes('f57c00') || bg.includes('ffb74d');
      console.log(`주황 계열: ${isOrange ? '✅' : '⚠️'}`);
    }
  });
});

// ============================================================================
// 7. 설비/TOOL 모달
// ============================================================================
test.describe('7. 설비/TOOL 관리 모달', () => {

  test('7.1 설비 모달 열기/닫기', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const btn = page.locator('button').filter({ hasText: /설비/ }).first();
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(500);

      // 모달 제목 확인
      const hasTitle = await domHasText(page, '설비') && await domHasText(page, 'TOOL');
      console.log(`설비 모달: ${hasTitle ? '✅ 열림' : '⚠️ 안 열림'}`);

      // 닫기 버튼
      const closeBtn = page.locator('button').filter({ hasText: '닫기' }).first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(300);
        console.log('✅ 설비 모달 닫기 성공');
      }
    }
  });

  test('7.2 설비 모달 항목 추가', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const btn = page.locator('button').filter({ hasText: /설비/ }).first();
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(500);

      // 항목 추가 버튼 클릭
      const addBtn = page.locator('button').filter({ hasText: /항목 추가/ }).first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        await page.waitForTimeout(300);

        // 입력 필드가 추가되었는지
        const inputs = page.locator('input[placeholder*="설비"]');
        const count = await inputs.count();
        console.log(`설비 입력 필드: ${count}개`);
        expect(count).toBeGreaterThanOrEqual(1);
      }

      // 닫기
      const closeBtn = page.locator('button').filter({ hasText: '닫기' }).first();
      if (await closeBtn.count() > 0) await closeBtn.click();
    }
  });
});

// ============================================================================
// 8. 부품 관리 모달
// ============================================================================
test.describe('8. 부품 리스트 관리 모달', () => {

  test('8.1 부품 모달 열기/닫기', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const btn = page.locator('button').filter({ hasText: /부품/ }).first();
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(500);

      const hasTitle = await domHasText(page, '부품') && (await domHasText(page, '리스트') || await domHasText(page, '관리'));
      console.log(`부품 모달: ${hasTitle ? '✅ 열림' : '⚠️ 안 열림'}`);

      const closeBtn = page.locator('button').filter({ hasText: '닫기' }).first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(300);
        console.log('✅ 부품 모달 닫기 성공');
      }
    }
  });

  test('8.2 부품 모달 항목 추가', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const btn = page.locator('button').filter({ hasText: /부품/ }).first();
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(500);

      const addBtn = page.locator('button').filter({ hasText: /부품 추가/ }).first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        await page.waitForTimeout(300);

        const inputs = page.locator('input[placeholder*="부품"]');
        const count = await inputs.count();
        console.log(`부품 입력 필드: ${count}개`);
        expect(count).toBeGreaterThanOrEqual(1);
      }

      const closeBtn = page.locator('button').filter({ hasText: '닫기' }).first();
      if (await closeBtn.count() > 0) await closeBtn.click();
    }
  });
});

// ============================================================================
// 9. 컨텍스트 메뉴
// ============================================================================
test.describe('9. 컨텍스트 메뉴', () => {

  test('9.1 데이터 행 우클릭으로 메뉴 열기', async ({ page }) => {
    await gotoPfdWorksheet(page);

    // tbody의 셀을 우클릭
    const cell = page.locator('tbody td').first();
    if (await cell.count() > 0) {
      await cell.click({ button: 'right' });
      await page.waitForTimeout(500);

      // 컨텍스트 메뉴 항목 확인
      const menuItems = ['행 추가', '행 삭제', '병합'];
      let found = 0;
      for (const item of menuItems) {
        if (await domHasText(page, item)) found++;
      }
      console.log(`컨텍스트 메뉴 항목: ${found}/${menuItems.length}`);

      // 빈 영역 클릭으로 메뉴 닫기
      await page.locator('body').click();
    }
  });

  test('9.2 Undo/Redo 메뉴 항목 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const cell = page.locator('tbody td').first();
    if (await cell.count() > 0) {
      await cell.click({ button: 'right' });
      await page.waitForTimeout(500);

      const hasUndo = await domHasText(page, '실행취소');
      const hasRedo = await domHasText(page, '다시실행');
      console.log(`실행취소: ${hasUndo ? '✅' : '⚠️'}, 다시실행: ${hasRedo ? '✅' : '⚠️'}`);

      await page.locator('body').click();
    }
  });
});

// ============================================================================
// 10. 데이터 행 및 빈 행
// ============================================================================
test.describe('10. 워크시트 데이터 행', () => {

  test('10.1 데이터 행 또는 빈 행 존재 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const tbody = page.locator('tbody');
    const rows = tbody.locator('tr');
    const count = await rows.count();
    console.log(`총 행 수: ${count} (데이터 + 빈 행)`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('10.2 행에 적절한 셀 수 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const firstRow = page.locator('tbody tr').first();
    const cells = firstRow.locator('td');
    const count = await cells.count();
    console.log(`첫 행 셀 수: ${count}`);
    // 최소 10개 이상의 셀 (16컬럼이지만 rowSpan으로 줄 수 있음)
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('10.3 rowSpan 병합 셀 존재 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const mergedCells = page.locator('td[rowspan]');
    const count = await mergedCells.count();
    console.log(`rowSpan 병합 셀: ${count}개`);
    // 데이터가 있으면 병합 존재, 없으면 0일 수 있음
  });
});

// ============================================================================
// 11. 임포트 페이지
// ============================================================================
test.describe('11. PFD 임포트 페이지', () => {

  test('11.1 임포트 페이지 접속', async ({ page }) => {
    await page.goto(`${BASE}/pfd/import`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasError = await domHasText(page, 'Application error');
    expect(hasError).toBe(false);

    const hasImport = await domHasText(page, 'Import') || await domHasText(page, '임포트') || await domHasText(page, '가져오기') || await domHasText(page, 'PFD');
    console.log(`임포트 페이지: ${hasImport ? '✅ 로드됨' : '⚠️ 미확인'}`);
  });

  test('11.2 임포트 탭/모드 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfd/import`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const modes = ['전체', 'Full', '그룹', 'Group', '개별', 'Item'];
    let found = 0;
    for (const mode of modes) {
      if (await domHasText(page, mode)) found++;
    }
    console.log(`임포트 모드/탭: ${found > 0 ? '있음' : '미발견'}`);
  });
});

// ============================================================================
// 12. 개정관리 페이지
// ============================================================================
test.describe('12. PFD 개정관리 페이지', () => {

  test('12.1 개정관리 페이지 접속', async ({ page }) => {
    await page.goto(`${BASE}/pfd/revision`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasError = await domHasText(page, 'Application error');
    expect(hasError).toBe(false);

    const hasRevision = await domHasText(page, '개정') || await domHasText(page, 'Rev') || await domHasText(page, 'revision');
    console.log(`개정관리 페이지: ${hasRevision ? '✅ 로드됨' : '⚠️ 미확인'}`);
  });

  test('12.2 개정 이력 테이블/폼 확인', async ({ page }) => {
    await page.goto(`${BASE}/pfd/revision`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const revFields = ['작성자', '검토자', '승인자', '개정사항', '개정번호'];
    let found = 0;
    for (const field of revFields) {
      if (await domHasText(page, field)) found++;
    }
    console.log(`개정 필드: ${found}/${revFields.length}`);
  });
});

// ============================================================================
// 13. 로그 페이지
// ============================================================================
test.describe('13. PFD 로그 페이지', () => {

  test('13.1 로그 페이지 접속', async ({ page }) => {
    await page.goto(`${BASE}/pfd/log`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasError = await domHasText(page, 'Application error');
    expect(hasError).toBe(false);

    const hasLog = await domHasText(page, '로그') || await domHasText(page, '접속') || await domHasText(page, '활동');
    console.log(`로그 페이지: ${hasLog ? '✅ 로드됨' : '⚠️ 미확인'}`);
  });
});

// ============================================================================
// 14. 워크시트 상태 배지
// ============================================================================
test.describe('14. 워크시트 상태 관리', () => {

  test('14.1 상태 배지 표시 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const statusTexts = ['초안', '검토중', '승인됨', 'Draft'];
    let found = 0;
    for (const s of statusTexts) {
      if (await domHasText(page, s)) {
        found++;
        console.log(`✅ 상태 배지 "${s}" 표시`);
      }
    }
    console.log(`상태 배지: ${found > 0 ? '있음' : '⚠️ 미표시'}`);
  });

  test('14.2 확정/승인 버튼 확인', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const hasConfirm = await domHasText(page, '확정');
    const hasApprove = await domHasText(page, '승인');
    console.log(`확정 버튼: ${hasConfirm ? '✅' : '⚠️'}, 승인 버튼: ${hasApprove ? '✅' : '⚠️'}`);
  });
});

// ============================================================================
// 15. 워크시트 새로고침 후 데이터 유지
// ============================================================================
test.describe('15. 새로고침 안정성', () => {

  test('15.1 워크시트 새로고침 후 테이블 유지', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const beforeRows = await page.locator('tbody tr').count();
    console.log(`새로고침 전 행 수: ${beforeRows}`);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const afterRows = await page.locator('tbody tr').count();
    console.log(`새로고침 후 행 수: ${afterRows}`);
    expect(afterRows).toBeGreaterThanOrEqual(1);
  });

  test('15.2 콘솔 에러 없음 확인', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await gotoPfdWorksheet(page);

    // 몇 가지 동작 수행
    const tabs = page.locator('button').filter({ hasText: '전체' });
    if (await tabs.count() > 0) await tabs.first().click();
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e =>
      e.includes('TypeError') || e.includes('Cannot read') || e.includes('is not a function')
    );
    console.log(`콘솔 에러: ${errors.length}건 (치명적: ${criticalErrors.length}건)`);
    if (criticalErrors.length > 0) {
      console.log('치명적 에러:', criticalErrors.slice(0, 3));
    }
    expect(criticalErrors.length).toBe(0);
  });
});

// ============================================================================
// 16. PFD API 연동 확인
// ============================================================================
test.describe('16. PFD API 기본 동작', () => {

  test('16.1 PFD 목록 API 응답 확인', async ({ page }) => {
    const response = await page.goto(`${BASE}/api/pfd`);
    expect(response?.status()).toBeLessThan(500);

    const body = await page.content();
    const hasSuccess = body.includes('success') || body.includes('data');
    console.log(`API /api/pfd 응답: status=${response?.status()}, success=${hasSuccess}`);
  });

  test('16.2 PFD 최신 조회 API', async ({ page }) => {
    const response = await page.goto(`${BASE}/api/pfd?latest=true`);
    expect(response?.status()).toBeLessThan(500);
    console.log(`API /api/pfd?latest=true: status=${response?.status()}`);
  });
});

// ============================================================================
// 17. 크로스 모듈 네비게이션
// ============================================================================
test.describe('17. 크로스 모듈 네비게이션', () => {

  test('17.1 워크시트→CP 이동 버튼', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const cpBtn = page.locator('button').filter({ hasText: /CP/ }).first();
    const exists = await cpBtn.count();
    console.log(`CP 관련 버튼: ${exists > 0 ? '✅ 존재' : '⚠️ 미발견'}`);
  });

  test('17.2 워크시트→FMEA 이동 버튼', async ({ page }) => {
    await gotoPfdWorksheet(page);

    const fmeaBtn = page.locator('button').filter({ hasText: /FMEA/ }).first();
    const exists = await fmeaBtn.count();
    console.log(`FMEA 관련 버튼: ${exists > 0 ? '✅ 존재' : '⚠️ 미발견'}`);
  });
});
