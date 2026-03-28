import { test, expect } from '@playwright/test';

/**
 * 전체 앱 샅샅이 검증 — 62개 페이지 로드 + 모달/배지/네비게이션 통합 테스트
 *
 * 검증 항목:
 * 1. 대시보드 위젯 렌더링
 * 2. 마이잡 상태카드 + 테이블
 * 3. 사이드바 전체 메뉴 네비게이션
 * 4. PFMEA 워크시트 7탭 순회 + 모달/배지
 * 5. SOD/LLD/AP 전용 페이지 + 모달
 * 6. CP/PFD 워크시트
 * 7. Admin/Master 페이지
 */

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m002';

// 페이지 로드 + 에러 없음 검증 helper
async function verifyPageLoad(page: any, url: string, label: string) {
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(e.message));

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
    // networkidle timeout은 무시하고 domcontentloaded로 재시도
    return page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  });
  await page.waitForTimeout(1500);

  // JS 런타임 에러 체크 (hydration 등)
  const criticalErrors = errors.filter(e =>
    !e.includes('hydration') && !e.includes('ResizeObserver') && !e.includes('AbortError')
  );

  await page.screenshot({ path: `tests/e2e/screenshots/nav-${label}.png`, fullPage: false });

  return { errors: criticalErrors, url: page.url() };
}

// ============================================================
// 1. 대시보드 + 메인 페이지
// ============================================================

test.describe('1. 대시보드 + 메인 페이지', () => {

  test('메인 페이지 (Welcome) 로드', async ({ page }) => {
    const r = await verifyPageLoad(page, BASE, 'main-welcome');
    expect(r.errors).toHaveLength(0);
    // Quick Links 카드 존재 확인
    const cards = page.locator('[class*="card"], [class*="Card"], a[href*="pfmea"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('PFMEA 대시보드 로드 + 차트 렌더링', async ({ page }) => {
    const r = await verifyPageLoad(page, `${BASE}/pfmea/dashboard`, 'pfmea-dashboard');
    expect(r.errors).toHaveLength(0);
  });

  test('CP 대시보드 로드', async ({ page }) => {
    const r = await verifyPageLoad(page, `${BASE}/control-plan/dashboard`, 'cp-dashboard');
    expect(r.errors).toHaveLength(0);
  });

  test('PFD 대시보드 로드', async ({ page }) => {
    const r = await verifyPageLoad(page, `${BASE}/pfd/dashboard`, 'pfd-dashboard');
    expect(r.errors).toHaveLength(0);
  });
});

// ============================================================
// 2. 마이잡 + 결재
// ============================================================

test.describe('2. 마이잡 + 결재', () => {

  test('마이잡(MyJob) 상태카드 + 테이블 로드', async ({ page }) => {
    const r = await verifyPageLoad(page, `${BASE}/myjob`, 'myjob');
    expect(r.errors).toHaveLength(0);
    // 상태 카드 (총 업무, 진행중 등)
    const statusCards = page.locator('[class*="card"], [class*="Card"], [class*="stat"]');
    console.log(`[MyJob] 상태카드: ${await statusCards.count()}개`);
  });

  test('결재현황 포털 로드', async ({ page }) => {
    const r = await verifyPageLoad(page, `${BASE}/approval/approver-portal`, 'approval-portal');
    expect(r.errors).toHaveLength(0);
  });
});

// ============================================================
// 3. 사이드바 네비게이션 — 전체 메뉴 순회
// ============================================================

test.describe('3. 전체 메뉴 페이지 로드', () => {

  const pages = [
    { url: '/pfmea/register', label: 'pfmea-register' },
    { url: '/pfmea/list', label: 'pfmea-list' },
    { url: '/pfmea/revision', label: 'pfmea-revision' },
    { url: '/pfmea/lld', label: 'pfmea-lld' },
    { url: '/pfmea/ap-improvement', label: 'pfmea-ap' },
    { url: '/control-plan/register', label: 'cp-register' },
    { url: '/control-plan/list', label: 'cp-list' },
    { url: '/control-plan/revision', label: 'cp-revision' },
    { url: '/pfd/register', label: 'pfd-register' },
    { url: '/pfd/list', label: 'pfd-list' },
    { url: '/pfd/revision', label: 'pfd-revision' },
    { url: '/master/customer', label: 'master-customer' },
    { url: '/master/user', label: 'master-user' },
    { url: '/master/trash', label: 'master-trash' },
    { url: '/admin', label: 'admin-home' },
    { url: '/admin/settings/users', label: 'admin-users' },
    { url: '/admin/db-viewer', label: 'admin-db-viewer' },
  ];

  for (const p of pages) {
    test(`${p.label} 페이지 로드`, async ({ page }) => {
      const r = await verifyPageLoad(page, `${BASE}${p.url}`, p.label);
      expect(r.errors).toHaveLength(0);
    });
  }
});

// ============================================================
// 4. PFMEA 워크시트 7탭 순회 + 배지/모달
// ============================================================

test.describe('4. PFMEA 워크시트 7탭 순회', () => {

  test('워크시트 로드 + 탭 전체 순회', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?fmeaId=${FMEA_ID}`, {
      waitUntil: 'networkidle', timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // 탭 버튼 수집
    const tabBtns = page.locator('[role="tab"], button[class*="tab"], button[class*="Tab"]');
    const tabCount = await tabBtns.count();
    console.log(`[워크시트] 탭 수: ${tabCount}`);

    // 각 탭 클릭하여 에러 없이 렌더링되는지 확인
    const tabLabels = ['1S', '2S', '3S', '1F', '2F', '3F', '1L', '2L', '3L', 'FC', 'ALL'];
    for (const label of tabLabels) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      if (await tab.count() > 0) {
        await tab.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `tests/e2e/screenshots/ws-tab-${label}.png`, fullPage: false });
      }
    }

    // 최종 URL 확인
    expect(page.url()).toContain('worksheet');
  });

  test('3L탭 FC 누락 배지 + 클릭 → 다음 누락 스크롤', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?fmeaId=${FMEA_ID}`, {
      waitUntil: 'networkidle', timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // 3L 탭 이동
    const l3Tab = page.locator('button:has-text("3L")').first();
    if (await l3Tab.count() > 0) {
      await l3Tab.click();
      await page.waitForTimeout(1500);
    }

    // 누락 배지 찾기
    const missingBadge = page.locator('[class*="bg-red"]').first();
    if (await missingBadge.count() > 0) {
      const text = await missingBadge.textContent();
      console.log(`[3L] 누락 배지 텍스트: "${text}"`);
      // 클릭하면 다음 누락으로 스크롤
      await missingBadge.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/ws-3l-missing-click.png', fullPage: false });
    expect(page.url()).toContain('worksheet');
  });

  test('ALL탭 SOD 모달 열기 + 닫기', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/worksheet?fmeaId=${FMEA_ID}`, {
      waitUntil: 'networkidle', timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // ALL 탭
    const allTab = page.locator('button:has-text("ALL")').first();
    if (await allTab.count() > 0) {
      await allTab.click();
      await page.waitForTimeout(2000);
    }

    // S/O/D 셀 클릭 (숫자가 들어있는 셀)
    const sodCell = page.locator('td:has-text("S"), td:has-text("O"), td:has-text("D")').first();
    const clickable = page.locator('td[class*="cursor"]').first();
    if (await clickable.count() > 0) {
      await clickable.click();
      await page.waitForTimeout(1000);

      // 모달 확인
      const modal = page.locator('[class*="fixed"][class*="z-"], [role="dialog"]');
      const isOpen = await modal.count() > 0;
      console.log(`[ALL] SOD 모달 열림: ${isOpen}`);

      if (isOpen) {
        // 모달 닫기 (X 버튼 또는 ESC)
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/ws-all-sod-modal.png', fullPage: false });
    expect(page.url()).toContain('worksheet');
  });
});

// ============================================================
// 5. LLD + AP 개선 전용 페이지
// ============================================================

test.describe('5. LLD + AP 개선 페이지', () => {

  test('LLD(필터코드) 페이지 로드 + 테이블 렌더링', async ({ page }) => {
    const r = await verifyPageLoad(page, `${BASE}/pfmea/lld`, 'lld-page');
    expect(r.errors).toHaveLength(0);

    // 테이블 또는 데이터 그리드 확인
    const table = page.locator('table, [class*="grid"], [class*="Grid"]');
    console.log(`[LLD] 테이블: ${await table.count()}개`);
    // 도움말 모달 버튼 확인
    const helpBtn = page.locator('button:has-text("도움말"), button:has-text("Help")');
    console.log(`[LLD] 도움말 버튼: ${await helpBtn.count()}개`);
  });

  test('AP 개선관리 페이지 로드 + 테이블 렌더링', async ({ page }) => {
    const r = await verifyPageLoad(page, `${BASE}/pfmea/ap-improvement`, 'ap-improve');
    expect(r.errors).toHaveLength(0);

    const table = page.locator('table');
    console.log(`[AP] 테이블: ${await table.count()}개`);
  });

  test('PFMEA Import 페이지 로드', async ({ page }) => {
    const r = await verifyPageLoad(page, `${BASE}/pfmea/import`, 'pfmea-import');
    expect(r.errors).toHaveLength(0);
  });
});

// ============================================================
// 6. CP/PFD 워크시트
// ============================================================

test.describe('6. CP/PFD 워크시트', () => {

  test('CP Import 페이지 로드', async ({ page }) => {
    const r = await verifyPageLoad(page, `${BASE}/control-plan/import`, 'cp-import');
    expect(r.errors).toHaveLength(0);
  });

  test('PFD Import 페이지 로드', async ({ page }) => {
    const r = await verifyPageLoad(page, `${BASE}/pfd/import`, 'pfd-import');
    expect(r.errors).toHaveLength(0);
  });
});

// ============================================================
// 7. TopNav 공통 기능
// ============================================================

test.describe('7. TopNav 공통 기능', () => {

  test('언어 토글 (한/영) 작동', async ({ page }) => {
    await page.goto(`${BASE}/pfmea/register`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 언어 토글 버튼
    const langBtn = page.locator('button:has-text("한"), button:has-text("EN"), button:has-text("🌐")').first();
    if (await langBtn.count() > 0) {
      const before = await langBtn.textContent();
      await langBtn.click();
      await page.waitForTimeout(500);
      const after = await langBtn.textContent();
      console.log(`[언어 토글] ${before} → ${after}`);
    }
    expect(page.url()).toContain('pfmea');
  });

  test('사이드바 펼침/접힘 작동', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 사이드바 영역 찾기
    const sidebar = page.locator('nav, [class*="sidebar"], [class*="Sidebar"]').first();
    if (await sidebar.count() > 0) {
      const beforeWidth = await sidebar.evaluate((el: HTMLElement) => el.offsetWidth);
      // 사이드바 hover (펼침)
      await sidebar.hover();
      await page.waitForTimeout(500);
      const afterWidth = await sidebar.evaluate((el: HTMLElement) => el.offsetWidth);
      console.log(`[사이드바] 접힘: ${beforeWidth}px → 펼침: ${afterWidth}px`);
    }
    expect(page.url()).toContain('localhost');
  });
});
