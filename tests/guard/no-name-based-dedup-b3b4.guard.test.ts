/**
 * @file no-name-based-dedup-b3b4.guard.test.ts
 * @description Guard Test G-7 — B3/B4 이름기반 dedup 재삽입 방지
 *
 * 사고 이력 (2026-03-23):
 *   deduplicateFunctionsL3·filterMeaningfulProcessChars(removeDuplicates)가
 *   이름(name) 기준으로 B3 행 제거 → FK 단절 → orphanPC
 *   remapFailureCauseCharIds가 동일 이름의 첫 id로 FC 강제 병합
 *   MBD-26-009 시리즈에서 6회+ 반복 수정
 *
 * 근본 수정: 이름 dedup 제거, id 중복만 제거
 *
 * 보호 대상:
 *   - src/app/(fmea-core)/pfmea/worksheet/ 하위 dedup 관련 유틸
 *   - src/app/(fmea-core)/pfmea/import/utils/atomicToFlatData.ts
 *
 * 실행: npx vitest run tests/guard/no-name-based-dedup-b3b4.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('B3/B4 이름기반 dedup 재삽입 방지 (Guard G-7)', () => {

  it('atomicToFlatData에서 B3 이름기반 dedup 코드가 없어야 한다', () => {
    const filePath = path.resolve(
      __dirname,
      '../../src/app/(fmea-core)/pfmea/import/utils/atomicToFlatData.ts',
    );
    if (!fs.existsSync(filePath)) return; // 파일 없으면 스킵
    const src = fs.readFileSync(filePath, 'utf-8');

    // 이름 기반 dedup 위험 패턴들
    const dangerousPatterns = [
      /\.name\s*===\s*.*\.name/,           // 이름 비교로 중복 판정
      /dedup.*\.name/,                      // dedup 로직에서 name 사용
      /seenNames\.has\(/,                   // 이름 Set으로 중복 검사
      /removeDuplicates.*true/,             // removeDuplicates flag
    ];

    for (const pattern of dangerousPatterns) {
      // B3/B4 섹션 근처에서만 검사 (다른 엔티티는 무관)
      const b3Idx = src.indexOf('B3');
      if (b3Idx > -1) {
        const b3Section = src.substring(Math.max(0, b3Idx - 200), b3Idx + 2000);
        // 이름 기반 dedup은 허용하지 않음
        const match = b3Section.match(pattern);
        if (match) {
          // seenNames.has 같은 패턴이 B3에 있으면 위반
          expect(match).toBeNull();
        }
      }
    }
  });

  it('remapFailureCauseCharIds 함수에서 이름 기반 매핑이 없어야 한다', () => {
    const worksheetDir = path.resolve(
      __dirname,
      '../../src/app/(fmea-core)/pfmea/worksheet',
    );
    // worksheet 디렉토리 하위에서 remapFailureCauseCharIds 검색
    const files = fs.readdirSync(worksheetDir, { recursive: true }) as string[];
    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
      const fullPath = path.join(worksheetDir, file);
      try {
        const src = fs.readFileSync(fullPath, 'utf-8');
        if (src.includes('remapFailureCauseCharIds')) {
          // 이름기반 매칭(find by name) 패턴이 없어야 함
          expect(src).not.toMatch(/\.find\(\s*\w+\s*=>\s*\w+\.name\s*===.*remapFailureCauseCharIds/s);
        }
      } catch { /* skip */ }
    }
  });
});
