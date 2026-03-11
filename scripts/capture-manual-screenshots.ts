/**
 * 사용자 매뉴얼용 전체 화면 스크린샷 자동 캡처
 *
 * 대상 FMEA: pfm26-f001-l68-r00
 * 제외: DFMEA, APQP
 * 포함: 모든 페이지 + 워크시트 탭별 + 모달 + CP/PFD 연동
 *
 * Usage: npx tsx scripts/capture-manual-screenshots.ts
 */
import { chromium, type Page, type Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const FMEA_ID = 'pfm26-f001-l68-r00';
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', '매뉴얼사진', '화면캡처');

// ============================================================
// 1. 페이지 캡처 목록 (DFMEA, APQP 제외)
// ============================================================
const PAGES = [
  // 시작하기
  { name: '01_로그인', url: '/login', wait: 2000, skipLogin: true },
  { name: '02_메인화면', url: '/welcomeboard', wait: 3000 },
  { name: '03_대시보드', url: '/pfmea/dashboard', wait: 3000 },

  // PFMEA 모듈
  { name: '04_PFMEA_리스트', url: '/pfmea/list', wait: 3000 },
  { name: '05_새문서생성', url: '/pfmea/list', wait: 3000, action: 'openCreateModal' },
  { name: '06_프로젝트등록', url: `/pfmea/register?id=${FMEA_ID}`, wait: 3000 },
  { name: '07_Import', url: `/pfmea/import?id=${FMEA_ID}`, wait: 3000 },

  // 워크시트 전체 화면
  { name: '08_워크시트_전체', url: `/pfmea/worksheet?id=${FMEA_ID}`, wait: 5000 },

  // 개정/결재/관리
  { name: '24_프로젝트목록', url: '/pfmea/list', wait: 3000 },
  { name: '25_개정관리', url: `/pfmea/revision?id=${FMEA_ID}`, wait: 3000 },
  { name: '26_승인흐름', url: `/pfmea/approve?id=${FMEA_ID}`, wait: 3000 },
  { name: '27_AP개선관리', url: '/pfmea/ap-improvement', wait: 3000 },
  { name: '28_LLD관리', url: '/pfmea/lld', wait: 3000 },

  // CP 모듈
  { name: '19_CP등록', url: '/control-plan/register', wait: 3000 },
  { name: '20_CP_Import', url: '/control-plan/import', wait: 3000 },
  { name: '21_CP워크시트', url: '/control-plan/worksheet', wait: 5000 },

  // PFD 모듈
  { name: '22_PFD등록', url: '/pfd/register', wait: 3000 },
  { name: '23_PFD워크시트', url: '/pfd/worksheet', wait: 5000 },

  // 관리자
  { name: '29_사용자관리', url: '/admin/users', wait: 3000 },
  { name: '30_마스터데이터', url: '/master', wait: 3000 },
];

// ============================================================
// 2. 워크시트 탭별 캡처
// ============================================================
const WORKSHEET_TABS = [
  { name: '09_구조분석', tabText: 'Structure', tabId: 'structure' },
  { name: '10_기능분석_1L', tabText: '1L Function', tabId: 'function-l1' },
  { name: '10_기능분석_2L', tabText: '2L Function', tabId: 'function-l2' },
  { name: '10_기능분석_3L', tabText: '3L Function', tabId: 'function-l3' },
  { name: '11_고장분석_1L영향', tabText: '1L영향', tabId: 'failure-l1' },
  { name: '11_고장분석_2L형태', tabText: '2L형태', tabId: 'failure-l2' },
  { name: '11_고장분석_3L원인', tabText: '3L원인', tabId: 'failure-l3' },
  { name: '12_고장연결', tabText: '고장연결', tabId: 'failure-link' },
  { name: '13_ALL탭', tabText: '전체보기', tabId: 'all' },
  { name: '14_리스크분석', tabText: '리스크', tabId: 'risk' },
  { name: '14_최적화', tabText: '최적화', tabId: 'opt' },
];

// ============================================================
// 3. 모달 캡처 목록
// ============================================================
const MODALS = [
  { name: 'modal_SOD선택', trigger: 'SOD 평가', fallbackSelector: '[data-modal="sod"]' },
  { name: 'modal_개선추천', trigger: '개선추천', fallbackSelector: '[data-modal="recommend"]' },
  { name: 'modal_업계개선사례', trigger: '업계 개선사례', fallbackSelector: '[data-modal="industry"]' },
  { name: 'modal_LLD선택', trigger: 'LLD', fallbackSelector: '[data-modal="lld"]' },
  { name: 'modal_특별특성', trigger: '특별특성', fallbackSelector: '[data-modal="special-char"]' },
  { name: 'modal_도움말', trigger: '도움말', fallbackSelector: '[data-modal="help"]' },
  { name: 'modal_데이터선택', trigger: '데이터 선택', fallbackSelector: '[data-modal="data-select"]' },
  { name: 'modal_새문서생성', trigger: '새 문서', fallbackSelector: '[data-modal="create-doc"]' },
];

// ============================================================
// Utility functions
// ============================================================

async function login(page: Page): Promise<void> {
  console.log('🔑 로그인 시도...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const idInput = page.locator('input[type="text"], input[name="id"], input[placeholder*="ID"], input[placeholder*="아이디"]').first();
  const pwInput = page.locator('input[type="password"]').first();

  if (await idInput.count() > 0 && await pwInput.count() > 0) {
    await idInput.fill('admin');
    await pwInput.fill('admin');
    const loginBtn = page.locator('button[type="submit"], button:has-text("로그인")').first();
    if (await loginBtn.count() > 0) {
      await loginBtn.click();
      await page.waitForTimeout(3000);
    }
  }
  console.log('✅ 로그인 완료');
}

async function screenshot(page: Page, name: string): Promise<void> {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 ${name}`);
}

async function tryClickText(page: Page, text: string, timeout = 3000): Promise<boolean> {
  try {
    const btn = page.locator(`button:has-text("${text}"), a:has-text("${text}"), [role="tab"]:has-text("${text}"), span:has-text("${text}")`).first();
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(2000);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

async function closeAnyModal(page: Page): Promise<void> {
  try {
    // Try ESC key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    // Try clicking close button if still open
    const closeBtn = page.locator('[aria-label="Close"], button:has-text("닫기"), button:has-text("취소"), [data-close]').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch {
    // ignore
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'ko-KR',
  });

  const page = await context.newPage();

  // ─── 로그인 전 캡처 ───
  console.log('\n═══ 1/5 로그인 화면 캡처 ═══');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, '01_로그인');

  // ─── 로그인 ───
  await login(page);

  // ─── 페이지별 캡처 ───
  console.log('\n═══ 2/5 페이지별 캡처 ═══');
  for (const pg of PAGES) {
    if (pg.name === '01_로그인') continue; // already captured
    try {
      await page.goto(`${BASE_URL}${pg.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(pg.wait);

      // 새 문서 생성 모달 열기
      if ((pg as any).action === 'openCreateModal') {
        await tryClickText(page, '새 문서');
        await page.waitForTimeout(1500);
      }

      await screenshot(page, pg.name);

      // 모달 열었으면 닫기
      if ((pg as any).action === 'openCreateModal') {
        await closeAnyModal(page);
      }
    } catch (e: any) {
      console.log(`  ⚠️ ${pg.name} — ${e.message?.slice(0, 80)}`);
      try { await screenshot(page, pg.name); } catch {}
    }
  }

  // ─── 워크시트 탭별 캡처 ───
  console.log('\n═══ 3/5 워크시트 탭별 캡처 ═══');
  try {
    await page.goto(`${BASE_URL}/pfmea/worksheet?id=${FMEA_ID}`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.waitForTimeout(5000);

    for (const tab of WORKSHEET_TABS) {
      try {
        // 탭 버튼 찾기 — 여러 방법 시도
        const tabBtn = page.locator([
          `button:has-text("${tab.tabText}")`,
          `[role="tab"]:has-text("${tab.tabText}")`,
          `a:has-text("${tab.tabText}")`,
          `.tab:has-text("${tab.tabText}")`,
          `span:has-text("${tab.tabText}")`,
        ].join(', ')).first();

        if (await tabBtn.count() > 0) {
          await tabBtn.click();
          await page.waitForTimeout(3000);
          await screenshot(page, tab.name);
        } else {
          console.log(`  ⚠️ ${tab.name} — 탭 버튼 "${tab.tabText}" 없음`);
          // 워크시트 상태에서 캡처 시도
          await screenshot(page, tab.name);
        }
      } catch (e: any) {
        console.log(`  ⚠️ ${tab.name} — ${e.message?.slice(0, 60)}`);
        try { await screenshot(page, tab.name); } catch {}
      }
    }

    // ─── 우측 패널 캡처 (AP표, 파레토, 트리) ───
    console.log('\n  ── 우측 패널 캡처 ──');

    // 트리 패널
    const treeBtn = page.locator('button:has-text("Tree"), button:has-text("트리")').first();
    if (await treeBtn.count() > 0) {
      await treeBtn.click();
      await page.waitForTimeout(1500);
      await screenshot(page, '18_우측패널_트리');
    }

    // AP 5단계 패널
    const ap5Btn = page.locator('button:has-text("5AP"), button:has-text("AP5"), button:has-text("AP표")').first();
    if (await ap5Btn.count() > 0) {
      await ap5Btn.click();
      await page.waitForTimeout(1500);
      await screenshot(page, '18_우측패널_AP5');
    }

    // AP 6단계 패널
    const ap6Btn = page.locator('button:has-text("6AP"), button:has-text("AP6")').first();
    if (await ap6Btn.count() > 0) {
      await ap6Btn.click();
      await page.waitForTimeout(1500);
      await screenshot(page, '18_우측패널_AP6');
    }

    // 파레토 차트
    const paretoBtn = page.locator('button:has-text("파레토"), button:has-text("Pareto"), button:has-text("RPN")').first();
    if (await paretoBtn.count() > 0) {
      await paretoBtn.click();
      await page.waitForTimeout(1500);
      await screenshot(page, '18_우측패널_파레토');
    }

    // PDF 뷰어
    const pdfBtn = page.locator('button:has-text("PDF"), button:has-text("뷰어")').first();
    if (await pdfBtn.count() > 0) {
      await pdfBtn.click();
      await page.waitForTimeout(1500);
      await screenshot(page, '18_우측패널_PDF');
    }

  } catch (e: any) {
    console.log(`  ⚠️ 워크시트 탭 캡처 오류 — ${e.message?.slice(0, 80)}`);
  }

  // ─── CP/PFD 연동 캡처 ───
  console.log('\n═══ 4/5 CP/PFD 연동 캡처 ═══');
  try {
    // 워크시트로 이동
    await page.goto(`${BASE_URL}/pfmea/worksheet?id=${FMEA_ID}`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.waitForTimeout(5000);

    // CP 연동 버튼 찾기
    const cpSyncBtn = page.locator([
      'button:has-text("CP 연동")',
      'button:has-text("CP연동")',
      'button:has-text("관리계획서")',
      'button:has-text("CP Sync")',
      'button:has-text("CP 동기화")',
    ].join(', ')).first();

    if (await cpSyncBtn.count() > 0) {
      await cpSyncBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '연동_CP동기화_위저드');
      await closeAnyModal(page);
    } else {
      console.log('  ⚠️ CP 연동 버튼 미발견');
    }

    // PFD 연동 버튼 찾기
    const pfdSyncBtn = page.locator([
      'button:has-text("PFD 연동")',
      'button:has-text("PFD연동")',
      'button:has-text("공정흐름도")',
      'button:has-text("PFD Sync")',
      'button:has-text("PFD 동기화")',
    ].join(', ')).first();

    if (await pfdSyncBtn.count() > 0) {
      await pfdSyncBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '연동_PFD동기화');
      await closeAnyModal(page);
    } else {
      console.log('  ⚠️ PFD 연동 버튼 미발견');
    }

    // CP 생성 버튼
    const createCpBtn = page.locator([
      'button:has-text("CP 생성")',
      'button:has-text("CP생성")',
      'button:has-text("관리계획서 생성")',
    ].join(', ')).first();

    if (await createCpBtn.count() > 0) {
      await createCpBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '연동_CP생성');
      await closeAnyModal(page);
    }

    // PFD 생성 버튼
    const createPfdBtn = page.locator([
      'button:has-text("PFD 생성")',
      'button:has-text("PFD생성")',
      'button:has-text("공정흐름도 생성")',
    ].join(', ')).first();

    if (await createPfdBtn.count() > 0) {
      await createPfdBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '연동_PFD생성');
      await closeAnyModal(page);
    }

  } catch (e: any) {
    console.log(`  ⚠️ 연동 캡처 오류 — ${e.message?.slice(0, 80)}`);
  }

  // ─── 모달 캡처 ───
  console.log('\n═══ 5/5 모달 캡처 ═══');

  // ALL 탭에서 모달 열기 (대부분의 모달이 여기서 접근 가능)
  try {
    await page.goto(`${BASE_URL}/pfmea/worksheet?id=${FMEA_ID}`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.waitForTimeout(5000);

    // ALL 탭으로 이동
    const allTabBtn = page.locator('button:has-text("전체보기"), button:has-text("All View"), button:has-text("ALL")').first();
    if (await allTabBtn.count() > 0) {
      await allTabBtn.click();
      await page.waitForTimeout(3000);
    }

    // 각 모달 시도
    for (const modal of MODALS) {
      try {
        const clicked = await tryClickText(page, modal.trigger);
        if (clicked) {
          await page.waitForTimeout(1500);

          // 모달이 열렸는지 확인
          const modalEl = page.locator('[role="dialog"], .modal, [data-modal], .fixed.inset-0, [class*="modal"]').first();
          if (await modalEl.count() > 0) {
            await screenshot(page, modal.name);
          } else {
            await screenshot(page, modal.name); // 어쨌든 캡처
          }
          await closeAnyModal(page);
          await page.waitForTimeout(500);
        } else {
          console.log(`  ⚠️ ${modal.name} — 트리거 버튼 "${modal.trigger}" 없음`);
        }
      } catch (e: any) {
        console.log(`  ⚠️ ${modal.name} — ${e.message?.slice(0, 60)}`);
        await closeAnyModal(page);
      }
    }

    // ── SOD 선택 모달 (셀 클릭으로 열기) ──
    console.log('  ── SOD 모달 시도 (셀 클릭) ──');
    try {
      // ALL 탭의 S/O/D 셀을 찾아서 클릭
      const sodCell = page.locator('td:has-text("S"), td:has-text("심각도")').first();
      if (await sodCell.count() > 0) {
        await sodCell.dblclick();
        await page.waitForTimeout(1500);
        await screenshot(page, '14_SOD선택');
        await closeAnyModal(page);
      }
    } catch {
      console.log('  ⚠️ SOD 셀 클릭 실패');
    }

    // ── 컨텍스트 메뉴 캡처 ──
    console.log('  ── 컨텍스트 메뉴 캡처 ──');
    try {
      // 구조분석 탭으로 이동
      const structBtn = page.locator('button:has-text("Structure")').first();
      if (await structBtn.count() > 0) {
        await structBtn.click();
        await page.waitForTimeout(2000);
      }

      // 테이블 셀에 우클릭
      const tableCell = page.locator('table td').first();
      if (await tableCell.count() > 0) {
        await tableCell.click({ button: 'right' });
        await page.waitForTimeout(1000);
        await screenshot(page, 'modal_컨텍스트메뉴');
        await page.keyboard.press('Escape');
      }
    } catch {
      console.log('  ⚠️ 컨텍스트 메뉴 캡처 실패');
    }

    // ── RPN 도움말 팝오버 ──
    console.log('  ── RPN 도움말 캡처 ──');
    try {
      const rpnBtn = page.locator('button:has-text("RPN"), button:has-text("rpn")').first();
      if (await rpnBtn.count() > 0) {
        await rpnBtn.click();
        await page.waitForTimeout(1500);
        await screenshot(page, 'modal_RPN도움말');
        await closeAnyModal(page);
      }
    } catch {
      console.log('  ⚠️ RPN 도움말 캡처 실패');
    }

  } catch (e: any) {
    console.log(`  ⚠️ 모달 캡처 전체 오류 — ${e.message?.slice(0, 80)}`);
  }

  // ─── 완료 ───
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ 완료: ${files.length}개 스크린샷 캡처됨`);
  console.log(`📂 저장 위치: ${OUTPUT_DIR}`);
  console.log(`\n캡처된 파일:`);
  files.sort().forEach(f => console.log(`  - ${f}`));

  await browser.close();
}

main().catch(console.error);
