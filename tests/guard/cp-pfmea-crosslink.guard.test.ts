/**
 * @file cp-pfmea-crosslink.guard.test.ts
 * @description CP↔PFMEA 제품특성/공정특성 셀 클릭 시 상호 이동 Guard Test
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('CP→PFMEA 셀 크로스링크', () => {
  it('CP renderCell에 fmeaId prop이 있어야 함', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(fmea-core)/control-plan/worksheet/renderers/index.tsx'),
      'utf-8'
    );
    expect(src).toContain('fmeaId');
  });

  it('제품특성 셀에 PFMEA 이동 버튼이 있어야 함', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(fmea-core)/control-plan/worksheet/renderers/index.tsx'),
      'utf-8'
    );
    // productChar 렌더링 블록에 pfmea 이동 로직 존재
    expect(src).toMatch(/productChar.*pfmea\/worksheet|pfmea.*productChar/s);
  });

  it('공정특성 셀에 PFMEA 이동 버튼이 있어야 함', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(fmea-core)/control-plan/worksheet/renderers/index.tsx'),
      'utf-8'
    );
    // processChar 렌더링 블록에 pfmea 이동 로직 존재
    expect(src).toMatch(/processChar.*pfmea\/worksheet|pfmea.*processChar/s);
  });
});

describe('CP 워크시트 highlightId 파라미터 지원', () => {
  it('CP page.tsx에서 highlightId 파라미터를 읽어야 함', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(fmea-core)/control-plan/worksheet/page.tsx'),
      'utf-8'
    );
    expect(src).toContain('highlightId');
  });
});

describe('PFMEA 워크시트 highlightId 파라미터 지원', () => {
  it('PFMEA page.tsx에서 highlightId 파라미터를 읽어야 함', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(fmea-core)/pfmea/worksheet/page.tsx'),
      'utf-8'
    );
    expect(src).toContain('highlightId');
  });
});
