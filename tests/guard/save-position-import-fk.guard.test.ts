/**
 * @file save-position-import-fk.guard.test.ts
 * @description 3중 방어 Guard #2 — save-position-import의 FK 필드 보호
 *
 * 사고 이력 (2026-03-23 e1f1bd5):
 *   "런타임 호환성" 명목으로 parentId 19개 + FK 4개 제거 → DB FK 전멸
 *   이 테스트는 해당 필드가 코드에서 절대 제거되지 않도록 보호합니다.
 *
 * 실행: npx vitest run tests/guard/save-position-import-fk.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROUTE_PATH = path.resolve(
  __dirname,
  '../../src/app/api/fmea/save-position-import/route.ts',
);

describe('save-position-import FK 필드 보호 (3중 방어 Guard #2)', () => {
  const src = fs.readFileSync(ROUTE_PATH, 'utf-8');

  // parentId 필드가 최소 18개 이상 존재해야 함 (19개 엔티티에서 사용)
  it('parentId 필드가 18개 이상 존재해야 한다', () => {
    const matches = src.match(/parentId:\s/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(18);
  });

  // FailureMode의 feRefs/fcRefs 필드 존재
  it('FailureMode에 feRefs/fcRefs 필드가 존재해야 한다', () => {
    expect(src).toContain('feRefs:');
    expect(src).toContain('fcRefs:');
  });

  // FailureLink의 l2StructId/l3StructId 필드 존재
  it('FailureLink에 l2StructId/l3StructId FK가 존재해야 한다', () => {
    const flSection = src.substring(
      src.indexOf('// 11. FailureLinks'),
      src.indexOf('// 12. RiskAnalyses'),
    );
    expect(flSection).toContain('l2StructId:');
    expect(flSection).toContain('l3StructId:');
  });

  // RiskAnalysis의 parentId 필드 존재
  it('RiskAnalysis에 parentId FK가 존재해야 한다', () => {
    const raSection = src.substring(
      src.indexOf('// 12. RiskAnalyses'),
      src.indexOf('// 13. Verify counts'),
    );
    expect(raSection).toContain('parentId:');
  });

  // CODEFREEZE 주석 존재
  it('CODEFREEZE 주석이 존재해야 한다', () => {
    expect(src).toContain('CODEFREEZE');
    expect(src).toContain('parentId');
  });

  // 핵심 엔티티별 parentId 존재 확인
  const entityParentIdChecks = [
    { entity: 'L1Scope', marker: '// 1b. L1Scopes' },
    { entity: 'L2Structure', marker: '// 2. L2Structures' },
    { entity: 'L3Structure', marker: '// 3. L3Structures' },
    { entity: 'L1Function', marker: '// 4. L1Functions' },
    { entity: 'L2Function', marker: '// 5. L2Functions' },
    { entity: 'ProcessProductChar', marker: '// 6. ProcessProductChars' },
    { entity: 'FailureEffect', marker: '// 8. FailureEffects' },
    { entity: 'FailureMode', marker: '// 9. FailureModes' },
    { entity: 'FailureCause', marker: '// 10. FailureCauses' },
    { entity: 'RiskAnalysis', marker: '// 12. RiskAnalyses' },
  ];

  for (const { entity, marker } of entityParentIdChecks) {
    it(`${entity} 섹션에 parentId가 존재해야 한다`, () => {
      const idx = src.indexOf(marker);
      expect(idx).toBeGreaterThan(-1);
      const nextMarkerIdx = src.indexOf('\n      // ', idx + marker.length + 50);
      const section = src.substring(idx, nextMarkerIdx > idx ? nextMarkerIdx : idx + 500);
      expect(section).toContain('parentId');
    });
  }
});
