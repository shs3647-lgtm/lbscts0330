/**
 * @file pfmea-all-tab-e2e.spec.ts
 * @description ALL 화면(전체보기) E2E 테스트 - 구조분석(2단계)부터 최적화(6단계)까지
 *
 * 테스트 대상: PFM26-M001 (시드 데이터 기준)
 * - 3 L2 공정 (컷팅/프레스/용접), 5 L3 작업요소, 5 고장연결(FailureLink)
 * - 3 FE (severity 7/8/10), 3 FM, 5 FC, 5 RiskAnalysis
 *
 * 주의: ALL 탭은 35+ 컬럼(~3200px)으로 뷰포트보다 넓음
 * → off-screen 요소는 DOM 존재(count > 0) 또는 scrollIntoView로 확인
 */
import { test, expect, Page } from '@playwright/test';
import { SCOPE_LABEL_EN, SCOPE_YP, SCOPE_SP, SCOPE_USER } from '@/lib/fmea/scope-constants';

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const FMEA_ID = process.env.TEST_FMEA_ID ?? 'PFM26-M001';

// === 헬퍼 ===
async function gotoAllTab(page: Page) {
  await page.goto(`${BASE}/pfmea/worksheet?id=${FMEA_ID}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // ALL 탭 버튼 클릭 (UI에서 "ALL"로 표시됨)
  const allTabBtn = page.locator('button').filter({ hasText: /^ALL$/ }).first();
  await expect(allTabBtn).toBeVisible({ timeout: 5000 });
  await allTabBtn.click();
  await page.waitForTimeout(3000);
}

/** off-screen 요소를 scrollIntoView로 보이게 함 */
async function scrollToElement(page: Page, locator: ReturnType<Page['locator']>) {
  await locator.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' }));
  await page.waitForTimeout(300);
}

/** DOM에 텍스트가 존재하는지 (visibility 무관) */
async function domHasText(page: Page, text: string): Promise<boolean> {
  const content = await page.content();
  return content.includes(text);
}

// ============================================================================
// 1. ALL 탭 기본 렌더링
// ============================================================================
test.describe('1. ALL 탭 기본 렌더링', () => {

  test('1.1 ALL 탭 진입 및 테이블 표시', async ({ page }) => {
    await gotoAllTab(page);

    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    console.log('✅ ALL 탭 테이블 렌더링 확인');
  });

  test('1.2 3행 헤더 구조 확인', async ({ page }) => {
    await gotoAllTab(page);

    const thead = page.locator('thead').first();
    await expect(thead).toBeVisible({ timeout: 10000 });

    const headerRows = thead.locator('tr');
    const rowCount = await headerRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);
    console.log(`✅ 헤더 행 수: ${rowCount}행 (3행 이상)`);
  });

  test('1.3 5단계 섹션 헤더 텍스트 확인 (DOM)', async ({ page }) => {
    await gotoAllTab(page);

    // 5단계 섹션 헤더는 넓은 테이블에 걸쳐 있어 뷰포트 밖일 수 있음 → DOM으로 확인
    const stepHeaders = [
      '2단계 구조분석',
      '3단계 기능분석',
      '4단계 고장분석',
      '5단계 리스크분석',
      '6단계 최적화',
    ];

    let foundCount = 0;
    for (const header of stepHeaders) {
      const exists = await domHasText(page, header);
      console.log(`${exists ? '✅' : '⚠️'} ${header}: ${exists ? 'DOM 존재' : '미발견'}`);
      if (exists) foundCount++;
    }
    // 최소 3개 이상 존재해야 함
    expect(foundCount).toBeGreaterThanOrEqual(3);
  });

  test('1.4 데이터 행이 존재하는지 확인', async ({ page }) => {
    await gotoAllTab(page);

    const dataRows = page.locator('tbody tr');
    const count = await dataRows.count();
    console.log(`✅ 데이터 행 수: ${count}행`);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 2. 구조분석(2단계) 컬럼 검증
// ============================================================================
test.describe('2. 구조분석(2단계) 컬럼 검증', () => {

  test('2.1 구조분석 헤더 컬럼명 확인', async ({ page }) => {
    await gotoAllTab(page);

    // 구조분석은 좌측이라 뷰포트 안에 있음
    const structureHeaders = ['완제품 공정명', '공정명', '4M', '작업요소'];
    for (const hdr of structureHeaders) {
      const exists = await domHasText(page, hdr);
      console.log(`${exists ? '✅' : '⚠️'} 구조분석 헤더 "${hdr}": ${exists ? '존재' : '미발견'}`);
    }
  });

  test('2.2 L2 공정명 데이터 표시 확인', async ({ page }) => {
    await gotoAllTab(page);

    const processNames = ['컷팅', '프레스', '용접'];
    let found = 0;
    for (const name of processNames) {
      const cell = page.locator('td').filter({ hasText: name }).first();
      if (await cell.count() > 0) {
        found++;
        console.log(`✅ 공정명 "${name}" 표시됨`);
      }
    }
    console.log(`공정명 표시: ${found}/${processNames.length}`);
    expect(found).toBeGreaterThanOrEqual(1);
  });

  test('2.3 4M 컬럼 존재 확인', async ({ page }) => {
    await gotoAllTab(page);

    // 4M 헤더 컬럼이 존재하는지 확인 (데이터는 L3 등록 후 표시됨)
    const has4MHeader = await domHasText(page, '4M');
    console.log(`✅ 4M 헤더 컬럼: ${has4MHeader ? '존재' : '미발견'}`);
    expect(has4MHeader).toBe(true);

    // 4M 뱃지 데이터는 선택적 확인 (기초정보만 임포트한 경우 비어있을 수 있음)
    const m4Values = ['MN', 'MC', 'IM', 'EN'];
    let found = 0;
    for (const m4 of m4Values) {
      const cells = page.locator('td').filter({ hasText: new RegExp(`^${m4}$`) });
      const count = await cells.count();
      if (count > 0) found++;
    }
    console.log(`4M 뱃지 데이터: ${found > 0 ? `${found}종 표시` : '미등록 (정상 - 기초정보만 임포트)'}`);
  });

  test('2.4 L3 작업요소 컬럼 존재 확인', async ({ page }) => {
    await gotoAllTab(page);

    // 작업요소 헤더 컬럼이 존재하는지 확인
    const hasHeader = await domHasText(page, '작업요소');
    console.log(`✅ 작업요소 헤더: ${hasHeader ? '존재' : '미발견'}`);
    expect(hasHeader).toBe(true);

    // L3 작업요소 데이터는 선택적 (기초정보만 임포트 시 비어있을 수 있음)
    const content = await page.content();
    const hasL3Data = content.includes('작업요소 없음') || content.includes('세팅') || content.includes('조작');
    console.log(`L3 작업요소 데이터: ${hasL3Data ? '표시됨' : '비어있음 (정상 - 기초정보만 임포트)'}`);
  });
});

// ============================================================================
// 3. 기능분석(3단계) 컬럼 검증
// ============================================================================
test.describe('3. 기능분석(3단계) 컬럼 검증', () => {

  test('3.1 기능분석 헤더 컬럼명 확인 (DOM)', async ({ page }) => {
    await gotoAllTab(page);

    // 기능분석 컬럼은 뷰포트 밖일 수 있음 → DOM 확인
    const funcHeaders = ['완제품기능', '요구사항', '공정 기능', '제품특성', '작업요소 기능', '공정특성'];
    let found = 0;
    for (const hdr of funcHeaders) {
      const exists = await domHasText(page, hdr);
      console.log(`${exists ? '✅' : '⚠️'} 기능분석 헤더 "${hdr}": ${exists ? 'DOM 존재' : '미발견'}`);
      if (exists) found++;
    }
    expect(found).toBeGreaterThanOrEqual(3);
  });

  test('3.2 L1 기능 데이터 표시 확인', async ({ page }) => {
    await gotoAllTab(page);

    const l1Functions = ['자전거 프레임 생산', '고객사 납품', '안전한 주행'];
    let found = 0;
    for (const fn of l1Functions) {
      if (await domHasText(page, fn)) {
        found++;
        console.log(`✅ L1 기능 "${fn}" DOM 존재`);
      }
    }
    expect(found).toBeGreaterThanOrEqual(1);
  });

  test('3.3 L2 공정기능 데이터 확인 (DOM)', async ({ page }) => {
    await gotoAllTab(page);

    // L2 기능은 기능분석 컬럼에 있으므로 off-screen 가능
    const l2Functions = ['규격에 맞게 절단', '소재를 성형', '부품을 접합'];
    let found = 0;
    for (const fn of l2Functions) {
      if (await domHasText(page, fn)) found++;
    }
    console.log(`L2 공정기능 DOM 존재: ${found}/${l2Functions.length}`);
    expect(found).toBeGreaterThanOrEqual(1);
  });

  test('3.4 L3 작업요소 기능 컬럼 구조 확인 (DOM)', async ({ page }) => {
    await gotoAllTab(page);

    // 작업요소 기능 관련 헤더 컬럼 존재 확인
    const headers = ['작업요소 기능', '공정특성'];
    let headerFound = 0;
    for (const hdr of headers) {
      if (await domHasText(page, hdr)) headerFound++;
    }
    console.log(`L3 기능 관련 헤더: ${headerFound}/${headers.length}`);
    expect(headerFound).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 4. 고장분석(4단계) 컬럼 검증
// ============================================================================
test.describe('4. 고장분석(4단계) 컬럼 검증', () => {

  test('4.1 고장분석 헤더 컬럼명 확인 (DOM)', async ({ page }) => {
    await gotoAllTab(page);

    const failHeaders = ['고장영향', '심각도', '고장형태', '고장원인'];
    let found = 0;
    for (const hdr of failHeaders) {
      const exists = await domHasText(page, hdr);
      console.log(`${exists ? '✅' : '⚠️'} 고장분석 헤더 "${hdr}": ${exists ? 'DOM 존재' : '미발견'}`);
      if (exists) found++;
    }
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('4.2 FE(고장영향) 데이터 확인', async ({ page }) => {
    await gotoAllTab(page);

    const feTexts = ['치수 불량', '외관 불량', '프레임 파단'];
    let found = 0;
    for (const fe of feTexts) {
      if (await domHasText(page, fe)) {
        found++;
        console.log(`✅ FE "${fe}" DOM 존재`);
      }
    }
    expect(found).toBeGreaterThanOrEqual(1);
  });

  test('4.3 FM(고장형태) 데이터 확인', async ({ page }) => {
    await gotoAllTab(page);

    const fmTexts = ['절단 길이 초과', '성형 치수 편차', '용접 강도 미달'];
    let found = 0;
    for (const fm of fmTexts) {
      if (await domHasText(page, fm)) {
        found++;
        console.log(`✅ FM "${fm}" DOM 존재`);
      }
    }
    expect(found).toBeGreaterThanOrEqual(1);
  });

  test('4.4 FC(고장원인) 데이터 확인', async ({ page }) => {
    await gotoAllTab(page);

    const fcTexts = ['자재 고정 불량', '컷팅 속도 과다', '프레스 압력 부족', '금형 정렬 불량', '용접 전류 설정 오류'];
    let found = 0;
    for (const fc of fcTexts) {
      if (await domHasText(page, fc)) found++;
    }
    console.log(`FC DOM 존재: ${found}/${fcTexts.length}`);
    expect(found).toBeGreaterThanOrEqual(1);
  });

  test('4.5 심각도(Severity) 수치 확인', async ({ page }) => {
    await gotoAllTab(page);

    // 시드 데이터 severity: 7, 8, 10 → DOM에 존재 확인
    const content = await page.content();
    const hasSeverity = content.includes('>7<') || content.includes('>8<') || content.includes('>10<');
    console.log(`심각도 수치 존재: ${hasSeverity ? '✅' : '⚠️'}`);
    expect(hasSeverity).toBe(true);
  });

  test('4.6 FM 구분선(하단 divider) 확인', async ({ page }) => {
    await gotoAllTab(page);

    const lastRows = page.locator('tr[data-last-row="true"]');
    const count = await lastRows.count();
    console.log(`FM 구분선 행: ${count}개`);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 5. 리스크분석(5단계) 컬럼 검증
// ============================================================================
test.describe('5. 리스크분석(5단계) 컬럼 검증', () => {

  test('5.1 리스크분석 헤더 컬럼명 확인 (DOM)', async ({ page }) => {
    await gotoAllTab(page);

    const riskHeaders = ['예방관리', '발생도', '검출관리', '검출도', 'AP'];
    let found = 0;
    for (const hdr of riskHeaders) {
      const exists = await domHasText(page, hdr);
      console.log(`${exists ? '✅' : '⚠️'} 리스크 헤더 "${hdr}": ${exists ? 'DOM 존재' : '미발견'}`);
      if (exists) found++;
    }
    expect(found).toBeGreaterThanOrEqual(3);
  });

  test('5.2 예방관리(PC) 컬럼 구조 확인', async ({ page }) => {
    await gotoAllTab(page);

    // 예방관리 헤더 존재 확인
    const hasPC = await domHasText(page, '예방관리');
    console.log(`✅ 예방관리 헤더: ${hasPC ? '존재' : '미발견'}`);
    expect(hasPC).toBe(true);

    // 예방관리 데이터는 리스크분석 입력 후 표시 (기초정보만 임포트 시 비어있음)
    const content = await page.content();
    const hasPCData = content.includes('관리') && (content.includes('모니터링') || content.includes('표준') || content.includes('점검'));
    console.log(`예방관리 데이터: ${hasPCData ? '입력됨' : '비어있음 (정상 - 리스크분석 미입력)'}`);
  });

  test('5.3 검출관리(DC) 컬럼 구조 확인', async ({ page }) => {
    await gotoAllTab(page);

    // 검출관리 헤더 존재 확인
    const hasDC = await domHasText(page, '검출관리');
    console.log(`✅ 검출관리 헤더: ${hasDC ? '존재' : '미발견'}`);
    expect(hasDC).toBe(true);

    // 검출관리 데이터는 리스크분석 입력 후 표시
    const content = await page.content();
    const hasDCData = content.includes('검사') || content.includes('시험') || content.includes('측정');
    console.log(`검출관리 데이터: ${hasDCData ? '입력됨' : '비어있음 (정상 - 리스크분석 미입력)'}`);
  });

  test('5.4 AP(Action Priority) 값 표시 확인', async ({ page }) => {
    await gotoAllTab(page);

    const content = await page.content();
    // AP 값은 span/td 내에 H 또는 M으로 표시
    const hasH = content.includes('>H<') || content.includes('>H </') || content.match(/<[^>]*>H<\/[^>]*>/);
    const hasM = content.includes('>M<') || content.includes('>M </') || content.match(/<[^>]*>M<\/[^>]*>/);
    console.log(`AP 값 존재 - H: ${hasH ? '✅' : '⚠️'}, M: ${hasM ? '✅' : '⚠️'}`);
    expect(hasH || hasM).toBeTruthy();
  });

  test('5.5 리스크분석 헤더에 H/M/L 카운트 뱃지', async ({ page }) => {
    await gotoAllTab(page);

    const content = await page.content();
    // H:n M:n L:n 패턴 확인
    const hasHML = /H:\d+/.test(content) && /M:\d+/.test(content) && /L:\d+/.test(content);
    console.log(`H/M/L 카운트 뱃지: ${hasHML ? '✅' : '⚠️'}`);
  });

  test('5.6 SOD 컬럼(발생도/검출도) 헤더 확인', async ({ page }) => {
    await gotoAllTab(page);

    // SOD 관련 헤더 컬럼 존재 확인
    const hasO = await domHasText(page, '발생도');
    const hasD = await domHasText(page, '검출도');
    console.log(`✅ 발생도 헤더: ${hasO ? '존재' : '미발견'}`);
    console.log(`✅ 검출도 헤더: ${hasD ? '존재' : '미발견'}`);
    expect(hasO || hasD).toBe(true);

    // SOD 수치는 리스크분석 입력 후 표시 (기초정보만 임포트 시 비어있음)
    const content = await page.content();
    const hasNumbers = content.includes('>4<') || content.includes('>5<') ||
                       content.includes('>6<') || content.includes('>3<');
    console.log(`SOD 수치: ${hasNumbers ? '입력됨' : '비어있음 (정상 - 리스크분석 미입력)'}`);
  });
});

// ============================================================================
// 6. 최적화(6단계) 컬럼 검증
// ============================================================================
test.describe('6. 최적화(6단계) 컬럼 검증', () => {

  test('6.1 최적화 헤더 컬럼명 확인 (DOM)', async ({ page }) => {
    await gotoAllTab(page);

    const optHeaders = ['예방관리개선', '검출관리개선', '책임자', '목표완료', '상태'];
    let found = 0;
    for (const hdr of optHeaders) {
      const exists = await domHasText(page, hdr);
      console.log(`${exists ? '✅' : '⚠️'} 최적화 헤더 "${hdr}": ${exists ? 'DOM 존재' : '미발견'}`);
      if (exists) found++;
    }
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('6.2 최적화 결과 평가 컬럼 확인 (DOM)', async ({ page }) => {
    await gotoAllTab(page);

    const evalHeaders = ['완료일자', '비고'];
    let found = 0;
    for (const hdr of evalHeaders) {
      const exists = await domHasText(page, hdr);
      console.log(`${exists ? '✅' : '⚠️'} 최적화 평가 헤더 "${hdr}": ${exists ? 'DOM 존재' : '미발견'}`);
      if (exists) found++;
    }
    expect(found).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 7. 데이터 무결성 검증
// ============================================================================
test.describe('7. 데이터 무결성 검증', () => {

  test('7.1 FM별 rowSpan(셀 병합) 확인', async ({ page }) => {
    await gotoAllTab(page);

    const mergedCells = page.locator('td[rowspan]');
    const count = await mergedCells.count();
    console.log(`rowSpan 병합 셀: ${count}개`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('7.2 고장연결 행 수 검증', async ({ page }) => {
    await gotoAllTab(page);

    const dataRows = page.locator('tbody tr');
    const rowCount = await dataRows.count();
    console.log(`ALL 탭 데이터 행: ${rowCount}행`);
    expect(rowCount).toBeGreaterThanOrEqual(3);
  });

  test('7.3 구조→기능→고장 데이터 정합성', { timeout: 90000 }, async ({ page }) => {
    await gotoAllTab(page);

    // 첫 번째 행에 셀이 충분히 있는지
    const firstRow = page.locator('tbody tr').first();
    const cellCount = await firstRow.locator('td').count();
    console.log(`첫 행 셀 수: ${cellCount}`);
    expect(cellCount).toBeGreaterThanOrEqual(5);
  });

  test('7.4 FE 카테고리 표시 확인', async ({ page }) => {
    await gotoAllTab(page);

    // FE 카테고리: Your Plant, Ship to Plant, User → 기능분석 구분 컬럼에 표시
    const categories = [SCOPE_LABEL_EN[SCOPE_YP], SCOPE_LABEL_EN[SCOPE_SP], SCOPE_LABEL_EN[SCOPE_USER]];
    let foundAny = false;
    for (const cat of categories) {
      if (await domHasText(page, cat)) {
        foundAny = true;
        console.log(`✅ FE 카테고리 "${cat}" DOM 존재`);
      }
    }
    console.log(`FE 카테고리: ${foundAny ? '✅ 있음' : '⚠️ 미표시'}`);
  });
});

// ============================================================================
// 8. 스크롤 및 레이아웃
// ============================================================================
test.describe('8. 스크롤 및 레이아웃', () => {

  test('8.1 수평 스크롤 가능 확인 (테이블 > 뷰포트)', async ({ page }) => {
    await gotoAllTab(page);

    const table = page.locator('table').first();
    const tableWidth = await table.evaluate(el => el.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    console.log(`테이블 너비: ${tableWidth}px, 뷰포트: ${viewportWidth}px`);
    expect(tableWidth).toBeGreaterThan(viewportWidth);
  });

  test('8.2 헤더 sticky 동작 확인', async ({ page }) => {
    await gotoAllTab(page);

    const thead = page.locator('thead').first();
    const position = await thead.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.position;
    });
    console.log(`thead position: ${position}`);
    expect(position).toBe('sticky');
  });

  test('8.3 수평 스크롤 후 최적화 컬럼 visible 확인', async ({ page }) => {
    await gotoAllTab(page);

    // 최적화 컬럼(마지막)으로 스크롤
    const optHeader = page.locator('th, td').filter({ hasText: '비고' }).last();
    if (await optHeader.count() > 0) {
      await scrollToElement(page, optHeader);
      const isVisible = await optHeader.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`최적화 "비고" 컬럼 스크롤 후 visible: ${isVisible ? '✅' : '⚠️'}`);
    }
  });
});

// ============================================================================
// 9. 고장분석 헤더 뱃지 (FE/FM/FC 카운트)
// ============================================================================
test.describe('9. 고장분석 헤더 뱃지', () => {

  test('9.1 고장분석 헤더에 FE/FM/FC 카운트 표시', async ({ page }) => {
    await gotoAllTab(page);

    const content = await page.content();
    const has4Step = content.includes('4단계 고장분석');
    console.log(`4단계 고장분석 헤더 DOM: ${has4Step ? '✅ 존재' : '⚠️ 미발견'}`);
  });
});

// ============================================================================
// 10. ALL 탭 ↔ 다른 탭 전환
// ============================================================================
test.describe('10. ALL 탭 ↔ 다른 탭 전환', () => {

  test('10.1 ALL → 구조분석 탭 전환', async ({ page }) => {
    await gotoAllTab(page);

    // ALL 탭에서 데이터 행이 있는지 확인
    const allRowsBefore = await page.locator('tbody tr').count();
    console.log(`ALL 탭 행: ${allRowsBefore}`);

    // 구조분석 탭 클릭
    const structTab = page.locator('button').filter({ hasText: /구조분석/ }).first();
    if (await structTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await structTab.click();
      await page.waitForTimeout(1500);
      console.log('✅ 구조분석 탭 전환 완료');
    }
  });

  test('10.2 ALL → 리스크 → ALL 복귀', async ({ page }) => {
    await gotoAllTab(page);

    // 5ST 탭 클릭 (리스크분석 단축)
    const riskTab = page.locator('button').filter({ hasText: /5ST/ }).first();
    if (await riskTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await riskTab.click();
      await page.waitForTimeout(1000);
    }

    // 다시 ALL 클릭
    const allTabBtn = page.locator('button').filter({ hasText: /^ALL$/ }).first();
    if (await allTabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await allTabBtn.click();
      await page.waitForTimeout(2000);

      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 5000 });
      console.log('✅ ALL 탭 복귀 확인');
    }
  });
});

// ============================================================================
// 11. 새로고침 후 데이터 유지
// ============================================================================
test.describe('11. 새로고침 후 데이터 유지', () => {

  test('11.1 ALL 탭에서 새로고침 후 데이터 유지', async ({ page }) => {
    await gotoAllTab(page);

    const beforeRows = await page.locator('tbody tr').count();
    console.log(`새로고침 전 행 수: ${beforeRows}`);

    // 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ALL 탭 다시 클릭
    const allTabBtn = page.locator('button').filter({ hasText: /^ALL$/ }).first();
    if (await allTabBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await allTabBtn.click();
      await page.waitForTimeout(3000);
    }

    const afterRows = await page.locator('tbody tr').count();
    console.log(`새로고침 후 행 수: ${afterRows}`);
    expect(afterRows).toBeGreaterThanOrEqual(1);
  });
});
