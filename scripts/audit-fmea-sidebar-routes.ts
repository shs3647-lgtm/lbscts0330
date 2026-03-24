/**
 * FmeaSidebar.tsx 와 동일한 href 집합이 App Router page.tsx 와 대응되는지 검사.
 * — createSubItems 템플릿 리터럴은 정적 분석이 어려워, 메뉴 구조를 아래 배열과 동기화할 것.
 * 실행: npx tsx scripts/audit-fmea-sidebar-routes.ts
 * 종료: 0 = 전부 매칭, 1 = 누락 있음
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'src/app');

/** FmeaSidebar.tsx 의 실제 네비게이션 대상과 동기화 (주석 처리된 메뉴 제외) */
function expectedSidebarHrefs(): string[] {
  const sub = (base: string) =>
    ['dashboard', 'register', 'list', 'worksheet', 'revision'].map((s) => `${base}/${s}`);
  return [
    '/myjob',
    '/approval/approver-portal',
    '/pfmea/list',
    '/pfmea/ap-improvement',
    '/pfmea/dashboard',
    '/pfmea/register',
    '/pfmea/list',
    '/pfmea/worksheet',
    '/pfmea/revision',
    '/pfmea/lld',
    '/pfmea/ap-improvement',
    '/pfmea',
    ...sub('/control-plan'),
    '/control-plan',
    '/control-plan/import',
    ...sub('/pfd'),
    '/pfd',
    '/pfd/import',
    '/master',
    '/master/customer',
    '/master/user',
    '/pfmea/import',
    '/master/trash',
    '/admin',
    '/admin/users',
    '/admin/settings/users',
    '/admin/settings/approval',
  ];
}

function collectRoutesFixed(dir: string, baseSegments: string[] = []): Set<string> {
  const routes = new Set<string>();
  if (!fs.existsSync(dir)) return routes;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const name = e.name;
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (e.isDirectory()) {
      const seg = name.startsWith('(') && name.endsWith(')') ? null : name;
      const next = seg ? [...baseSegments, seg] : baseSegments;
      for (const r of collectRoutesFixed(full, next)) routes.add(r);
    } else if (name === 'page.tsx') {
      routes.add(baseSegments.length > 0 ? '/' + baseSegments.join('/') : '/');
    }
  }
  return routes;
}

function main(): void {
  const hrefs = [...new Set(expectedSidebarHrefs())];
  const routes = collectRoutesFixed(APP);
  const missing: string[] = [];
  for (const h of hrefs) {
    if (routes.has(h)) continue;
    missing.push(h);
  }

  console.log('[audit-fmea-sidebar-routes] Unique expected hrefs:', hrefs.length);
  if (missing.length === 0) {
    console.log('[audit-fmea-sidebar-routes] OK — all expected hrefs resolve to a page route.');
    process.exit(0);
  }
  console.error('[audit-fmea-sidebar-routes] MISSING page for:', missing.join(', '));
  process.exit(1);
}

main();
