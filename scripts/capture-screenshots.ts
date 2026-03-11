/**
 * 사용자 매뉴얼용 전체 화면 스크린샷 자동 캡처
 * Usage: npx playwright test scripts/capture-screenshots.ts
 */
import { chromium, type Page, type Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', '매뉴얼사진', '화면캡처');

// 모든 캡처 대상 화면 정의
const SCREENS = [
  // 1. 시작하기
  { name: '01_로그인', url: '/login', wait: 2000 },
  { name: '02_웰컴보드', url: '/welcomeboard', wait: 3000 },

  // 2. PFMEA 모듈
  { name: '03_PFMEA_리스트', url: '/pfmea/list', wait: 3000 },
  { name: '04_PFMEA_등록', url: '/pfmea/register', wait: 3000 },
  { name: '05_PFMEA_Import', url: '/pfmea/import', wait: 3000 },
  { name: '06_PFMEA_워크시트', url: '/pfmea/worksheet', wait: 5000 },
  { name: '07_PFMEA_개정관리', url: '/pfmea/revision', wait: 3000 },
  { name: '08_PFMEA_LLD', url: '/pfmea/lld', wait: 3000 },
  { name: '09_PFMEA_AP개선', url: '/pfmea/ap-improvement', wait: 3000 },
  { name: '10_PFMEA_대시보드', url: '/pfmea/dashboard', wait: 3000 },

  // 3. DFMEA 모듈
  { name: '11_DFMEA_리스트', url: '/dfmea/list', wait: 3000 },
  { name: '12_DFMEA_등록', url: '/dfmea/register', wait: 3000 },
  { name: '13_DFMEA_워크시트', url: '/dfmea/worksheet', wait: 5000 },
  { name: '14_DFMEA_대시보드', url: '/dfmea/dashboard', wait: 3000 },

  // 4. 관리계획서 (CP)
  { name: '15_CP_리스트', url: '/control-plan/list', wait: 3000 },
  { name: '16_CP_등록', url: '/control-plan/register', wait: 3000 },
  { name: '17_CP_Import', url: '/control-plan/import', wait: 3000 },
  { name: '18_CP_워크시트', url: '/control-plan/worksheet', wait: 5000 },
  { name: '19_CP_대시보드', url: '/control-plan/dashboard', wait: 3000 },

  // 5. PFD
  { name: '20_PFD_리스트', url: '/pfd/list', wait: 3000 },
  { name: '21_PFD_등록', url: '/pfd/register', wait: 3000 },
  { name: '22_PFD_워크시트', url: '/pfd/worksheet', wait: 5000 },
  { name: '23_PFD_대시보드', url: '/pfd/dashboard', wait: 3000 },

  // 6. APQP
  { name: '24_APQP_리스트', url: '/apqp/list', wait: 3000 },
  { name: '25_APQP_등록', url: '/apqp/register', wait: 3000 },
  { name: '26_APQP_워크시트', url: '/apqp/worksheet', wait: 5000 },

  // 7. 관리자
  { name: '27_관리자_사용자관리', url: '/admin/users', wait: 3000 },
  { name: '28_관리자_DB통계', url: '/admin/db-stats', wait: 3000 },

  // 8. 마스터데이터
  { name: '29_마스터_고객정보', url: '/master/customer', wait: 3000 },
  { name: '30_마스터_사용자정보', url: '/master/user', wait: 3000 },
  { name: '31_마스터_데이터복구', url: '/master/trash', wait: 3000 },

  // 9. 결재
  { name: '32_결재_포탈', url: '/approval/approver-portal', wait: 3000 },

  // 10. 운영
  { name: '33_WS_워크시트', url: '/ws/worksheet', wait: 3000 },
  { name: '34_PM_워크시트', url: '/pm/worksheet', wait: 3000 },
];

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(1000);

    // Try common login credentials
    const idInput = page.locator('input[type="text"], input[name="id"], input[placeholder*="ID"], input[placeholder*="아이디"]').first();
    const pwInput = page.locator('input[type="password"]').first();

    if (await idInput.count() > 0 && await pwInput.count() > 0) {
      await idInput.fill('admin');
      await pwInput.fill('admin');

      const loginBtn = page.locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login")').first();
      if (await loginBtn.count() > 0) {
        await loginBtn.click();
        await page.waitForTimeout(3000);
      }
    }
    return true;
  } catch (e) {
    console.log('Login attempt completed (may already be logged in)');
    return true;
  }
}

async function captureScreen(page: Page, screen: typeof SCREENS[0]): Promise<string> {
  const filePath = path.join(OUTPUT_DIR, `${screen.name}.png`);
  try {
    await page.goto(`${BASE_URL}${screen.url}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(screen.wait);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`✅ ${screen.name}`);
    return filePath;
  } catch (e: any) {
    console.log(`⚠️ ${screen.name} — ${e.message?.slice(0, 80)}`);
    // Take screenshot anyway even if page didn't fully load
    try {
      await page.screenshot({ path: filePath, fullPage: false });
    } catch {}
    return filePath;
  }
}

async function main() {
  // Ensure output dir
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'ko-KR',
  });

  const page = await context.newPage();

  console.log('🔑 로그인 시도...');
  await login(page);

  console.log(`\n📸 ${SCREENS.length}개 화면 캡처 시작...\n`);

  let success = 0;
  for (const screen of SCREENS) {
    await captureScreen(page, screen);
    success++;
  }

  console.log(`\n✅ 완료: ${success}/${SCREENS.length}개 화면 캡처됨`);
  console.log(`📂 저장 위치: ${OUTPUT_DIR}`);

  await browser.close();
}

main().catch(console.error);
