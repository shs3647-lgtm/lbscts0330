/**
 * @file fmea-sidebar-no-part-fmea-menu.guard.test.ts
 * @description FMEA Core 사이드바에서 Part FMEA 최상위 메뉴 비노출 정책 보호
 *
 * Part FMEA 앱(/part-fmea/*)·API는 유지하되, 글로벌 사이드바 진입점만 제거(2026-03-22 요청).
 * 실행: npx vitest run tests/guard/fmea-sidebar-no-part-fmea-menu.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SIDEBAR_PATH = path.resolve(
  __dirname,
  '../../src/components/layout/FmeaSidebar.tsx',
);

describe('FmeaSidebar — Part FMEA 글로벌 메뉴 비노출', () => {
  const src = fs.readFileSync(SIDEBAR_PATH, 'utf-8');

  it("mainMenuItems에 id: 'part-fmea' 가 없어야 한다", () => {
    expect(src).not.toMatch(/id:\s*['"]part-fmea['"]/);
  });

  it('partFmeaSubItems 정의가 없어야 한다', () => {
    expect(src).not.toContain('partFmeaSubItems');
  });

  it("label: 'Part FMEA' 가 main 메뉴 블록에 없어야 한다", () => {
    expect(src).not.toContain("label: 'Part FMEA'");
  });
});
