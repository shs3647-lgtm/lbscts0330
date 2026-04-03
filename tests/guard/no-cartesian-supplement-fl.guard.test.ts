/**
 * @file no-cartesian-supplement-fl.guard.test.ts
 * @description Guard Test G-3 — 카테시안(크로스프로덕트) 보완 FL 자동생성 코드 재삽입 방지
 *
 * 사고 이력:
 *   커밋 129: "fix(import): remove synthetic failure links (Cartesian-style supplements)"
 *   FM×FE 조합으로 FL을 자동 생성하는 코드가 삽입되었다가 제거됨
 *   Rule 0.5: 카테시안 복제 절대 금지
 *   Rule 1.6.3: FailureLink는 엔지니어의 기술적 판단 — 수학적 조합 금지
 *
 * 보호 대상: 전체 src/ — synthetic/supplement FL 생성 패턴
 * 실행: npx vitest run tests/guard/no-cartesian-supplement-fl.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'fast-glob';

describe('카테시안 보완FL 자동생성 재삽입 방지 (Guard G-3)', () => {
  // 전체 src/ 하위의 ts 파일에서 위험 패턴 탐지
  const srcDir = path.resolve(__dirname, '../../src');

  it('보완 FL 자동생성 함수가 존재하지 않아야 한다', () => {
    const dangerousPatterns = [
      'createSupplementLinks',
      'supplementFailureLinks',
      'syntheticFailureLinks',
      'createSyntheticFL',
      'autoGenerateFL',
      'crossProductLinks',
    ];

    const files = glob.sync('**/*.ts', { cwd: srcDir, absolute: true, ignore: ['**/node_modules/**'] });
    const violations: string[] = [];

    for (const file of files.slice(0, 500)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of dangerousPatterns) {
          if (content.includes(pattern)) {
            violations.push(`${path.relative(srcDir, file)}: contains "${pattern}"`);
          }
        }
      } catch { /* skip unreadable */ }
    }

    expect(violations).toEqual([]);
  });

  it('FM×FE 크로스프로덕트 루프 패턴이 없어야 한다', () => {
    // buildAtomicFromFlat / buildAtomicDB 에서  it('FM×FE 크로스프로덕트 루프 패턴이 없어야 한다', () => {
    const potentialFiles = [
      path.resolve(srcDir, 'app/(fmea-core)/pfmea/import/utils/buildAtomicDB.ts'),
      path.resolve(srcDir, 'lib/fmea-core/raw-to-atomic.ts'),
      path.resolve(srcDir, 'app/api/fmea/rebuild-atomic/route.ts'),
    ];

    for (const file of potentialFiles) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, 'utf-8');
      // 직접적인 카테시안 보완 FL 함수 호출이 없어야 함
      expect(content).not.toContain('createSupplementLinks');
      expect(content).not.toContain('syntheticFailureLinks');
    }
  });
});
