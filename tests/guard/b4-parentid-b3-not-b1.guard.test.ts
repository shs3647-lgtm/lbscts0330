/**
 * @file b4-parentid-b3-not-b1.guard.test.ts
 * @description Guard Test G-2 — B4(고장원인)의 parentItemId가 B3(공정특성)을 가리키는지 검증
 *
 * 사고 이력 (2026-03-19):
 *   import-builder에서 B4.parentItemId = B1 연결 → buildWorksheetState에서 B4→B3 매칭 실패
 *   → 순차폴백 → orphanPC 발생
 *   근본 수정: B4.parentItemId → B3 ID로 변경
 *
 * 보호 대상:
 *   - src/app/(fmea-core)/pfmea/import/utils/parseValidationPipeline.ts (FK-B4-B3 규칙)
 *   - src/app/(fmea-core)/pfmea/import/utils/atomicToFlatData.ts (B4 parentItemId FK)
 *
 * 실행: npx vitest run tests/guard/b4-parentid-b3-not-b1.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('B4.parentItemId → B3 보호 (Guard G-2)', () => {
  // parseValidationPipeline에 FK-B4-B3 검증 규칙이 존재해야 함
  it('parseValidationPipeline에 FK-B4-B3 검증 규칙이 존재해야 한다', () => {
    const pvpPath = path.resolve(
      __dirname,
      '../../src/app/(fmea-core)/pfmea/import/utils/parseValidationPipeline.ts',
    );
    const src = fs.readFileSync(pvpPath, 'utf-8');
    expect(src).toContain('FK-B4-B3');
    expect(src).toContain('B4.parentItemId');
    expect(src).toContain('B3');
  });

  // atomicToFlatData에서 B4의 parentItemId가 B3 기반으로 설정되는지
  it('atomicToFlatData에서 B4 parentItemId가 B3 기반이어야 한다', () => {
    const atfPath = path.resolve(
      __dirname,
      '../../src/app/(fmea-core)/pfmea/import/utils/atomicToFlatData.ts',
    );
    const src = fs.readFileSync(atfPath, 'utf-8');
    // B4 섹션에서 parentItemId가 B3 관련 변수를 참조해야 함
    expect(src).toContain('parentB3Id');
    // B4 parentItemId가 B1을 직접 참조하면 안 됨
    const b4Section = src.substring(
      src.indexOf('B4:') > -1 ? src.indexOf('B4:') : src.indexOf('B4'),
    );
    // B1 직접 참조 패턴이 없어야 함 (parentItemId: b1Id 같은 위험 패턴)
    expect(b4Section).not.toMatch(/parentItemId:\s*b1Id\b/);
  });

  // parsing-criteria-validator에 B4→B3 FK 검증이 존재해야 함
  it('parsing-criteria-validator에 B4→B3 parentItemId FK 검증이 있어야 한다', () => {
    const pcvPath = path.resolve(
      __dirname,
      '../../src/app/(fmea-core)/pfmea/import/utils/parsing-criteria-validator.ts',
    );
    const src = fs.readFileSync(pcvPath, 'utf-8');
    expect(src).toContain('B4→B3 parentItemId');
  });
});
