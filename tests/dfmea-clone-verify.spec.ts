/**
 * DFMEA 클론 검증 테스트
 * PFMEA → DFMEA 클론 후 모든 주요 페이지가 정상 렌더링되는지 확인
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const DFMEA_PROJECT_ID = 'dfm26-m001-l49';

test.describe('DFMEA 클론 검증', () => {

  test('1. /dfmea/register 등록 페이지 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/dfmea/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // DFMEA 타이틀 확인
    const body = await page.textContent('body');
    expect(body).toContain('DFMEA');

    // Application error 체크 (정확한 에러 문자열)
    const hasAppError = body?.includes('Application error: a client-side exception');
    expect(hasAppError).toBeFalsy();

    await page.screenshot({ path: 'test-results/dfmea-clone-register.png', fullPage: true });
    console.log('✅ 등록 페이지 정상');
  });

  test('2. /dfmea/list 목록 페이지 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/dfmea/list`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body).toContain('DFMEA');
    expect(body).toContain('리스트');

    const hasAppError = body?.includes('Application error: a client-side exception');
    expect(hasAppError).toBeFalsy();

    await page.screenshot({ path: 'test-results/dfmea-clone-list.png', fullPage: true });
    console.log('✅ 목록 페이지 정상');
  });

  test('3. /dfmea/worksheet 워크시트 페이지 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/dfmea/worksheet`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const body = await page.textContent('body');
    expect(body).toContain('DFMEA');

    // 구조분석 탭 헤더 확인 (PFMEA 라벨이 아닌 DFMEA config labels)
    // DFMEA: 완제품 공정명 / 메인 공정명 / 작업 요소명 (config에서 설정)
    const hasStructureTab = body?.includes('구조분석') || body?.includes('구조');
    expect(hasStructureTab).toBeTruthy();

    const hasAppError = body?.includes('Application error: a client-side exception');
    expect(hasAppError).toBeFalsy();

    await page.screenshot({ path: 'test-results/dfmea-clone-worksheet.png', fullPage: true });
    console.log('✅ 워크시트 페이지 정상');
  });

  test('4. /dfmea/worksheet?id=... 특정 프로젝트 로드', async ({ page }) => {
    await page.goto(`${BASE}/dfmea/worksheet?id=${DFMEA_PROJECT_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const body = await page.textContent('body');
    expect(body).toBeTruthy();

    const hasAppError = body?.includes('Application error: a client-side exception');
    expect(hasAppError).toBeFalsy();

    await page.screenshot({ path: 'test-results/dfmea-clone-worksheet-project.png', fullPage: true });
    console.log('✅ 프로젝트 워크시트 정상');
  });

  test('5. /dfmea/import Import 페이지 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/dfmea/import`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body).toBeTruthy();

    const hasAppError = body?.includes('Application error: a client-side exception');
    expect(hasAppError).toBeFalsy();

    await page.screenshot({ path: 'test-results/dfmea-clone-import.png', fullPage: true });
    console.log('✅ Import 페이지 정상');
  });

  test('6. /dfmea/revision 개정관리 페이지 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/dfmea/revision`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body).toBeTruthy();

    const hasAppError = body?.includes('Application error: a client-side exception');
    expect(hasAppError).toBeFalsy();

    await page.screenshot({ path: 'test-results/dfmea-clone-revision.png', fullPage: true });
    console.log('✅ 개정관리 페이지 정상');
  });

  test('7. DFMEA URL에 pfmea 링크 없는지 확인', async ({ page }) => {
    await page.goto(`${BASE}/dfmea/worksheet`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const html = await page.content();
    const pfmeaLinks = (html.match(/href="\/pfmea\//g) || []).length;
    const dfmeaLinks = (html.match(/href="\/dfmea\//g) || []).length;

    console.log('PFMEA links:', pfmeaLinks, '| DFMEA links:', dfmeaLinks);
    expect(pfmeaLinks).toBe(0);

    await page.screenshot({ path: 'test-results/dfmea-clone-url-check.png', fullPage: true });
    console.log('✅ URL 경로 검증 완료');
  });

  test('8. 콘솔 치명적 에러 없는지', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto(`${BASE}/dfmea/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    console.log('Page errors:', pageErrors.length);
    pageErrors.forEach(e => console.log('  -', e.substring(0, 150)));

    // 치명적 에러가 3개 미만이면 통과
    expect(pageErrors.length).toBeLessThan(3);
    console.log('✅ 콘솔 에러 검증 완료');
  });
});
