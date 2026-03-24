/**
 * FMEA Core 사이드바 메뉴 href → App Router page.tsx 존재 검사.
 * 기대 경로는 `fmea-core-sidebar-menu.tsx`의 `collectAllFmeaCoreSidebarHrefs()`에서 수집 (SSoT).
 *
 * 실행: npx tsx scripts/audit-fmea-sidebar-routes.ts
 * npm: npm run audit:sidebar-routes
 */

import * as fs from 'fs';
import * as path from 'path';
import { collectAllFmeaCoreSidebarHrefs } from '../src/components/layout/fmea-core-sidebar-menu';

const APP = path.resolve(__dirname, '../src/app');

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
  const hrefs = collectAllFmeaCoreSidebarHrefs();
  const routes = collectRoutesFixed(APP);
  const missing: string[] = [];
  for (const h of hrefs) {
    if (routes.has(h)) continue;
    missing.push(h);
  }

  console.log('[audit-fmea-sidebar-routes] Unique hrefs from menu SSoT:', hrefs.length);
  if (missing.length === 0) {
    console.log('[audit-fmea-sidebar-routes] OK — all hrefs resolve to a page route.');
    process.exit(0);
  }
  console.error('[audit-fmea-sidebar-routes] MISSING page for:', missing.join(', '));
  process.exit(1);
}

main();
