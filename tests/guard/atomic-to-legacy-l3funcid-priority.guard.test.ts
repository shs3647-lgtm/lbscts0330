/**
 * @file atomic-to-legacy-l3funcid-priority.guard.test.ts
 * @description Guard Test G-4 — atomicToLegacyAdapter에서 FC 매핑 시 l3FuncId가
 *   processCharId보다 우선하는지 검증
 *
 * 사고 이력 (2026-03-23):
 *   atomicToLegacy가 processCharId || l3FuncId 순서로 legacy FC를 만들어,
 *   failure_causes.processCharId가 레거시/오염 UUID이면
 *   워크시트 B3 id(L3Function.id)와 불일치 → FC DB에 있는데 화면 미연결
 *   근본 수정: l3FuncId 우선
 *
 * 보호 대상: src/app/(fmea-core)/pfmea/worksheet/atomicToLegacyAdapter.ts
 * 실행: npx vitest run tests/guard/atomic-to-legacy-l3funcid-priority.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ADAPTER_PATH = path.resolve(
  __dirname,
  '../../src/app/(fmea-core)/pfmea/worksheet/atomicToLegacyAdapter.ts',
);

describe('atomicToLegacyAdapter l3FuncId 우선 보호 (Guard G-4)', () => {
  const src = fs.readFileSync(ADAPTER_PATH, 'utf-8');

  it('pickLegacyFcProcessCharId 함수가 존재해야 한다', () => {
    expect(src).toContain('pickLegacyFcProcessCharId');
  });

  it('l3FuncId 우선 패턴이 존재해야 한다 (l3FuncId가 processCharId보다 먼저)', () => {
    // l3FuncId || processCharId 순서가 올바른 우선순위
    // processCharId || l3FuncId 순서는 위험 — 이전 l3FuncId 우선 수정의 회귀
    const funcBody = src.substring(
      src.indexOf('pickLegacyFcProcessCharId'),
    );
    // l3FuncId가 processCharId보다 먼저 참조되어야 함
    const l3FuncIdIdx = funcBody.indexOf('l3FuncId');
    const processCharIdIdx = funcBody.indexOf('processCharId');
    expect(l3FuncIdIdx).toBeGreaterThan(-1);
    expect(processCharIdIdx).toBeGreaterThan(-1);
    // l3FuncId가 먼저 나와야 함 (우선순위)
    expect(l3FuncIdIdx).toBeLessThan(processCharIdIdx);
  });
});
