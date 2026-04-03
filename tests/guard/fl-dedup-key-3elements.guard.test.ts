/**
 * @file fl-dedup-key-3elements.guard.test.ts
 * @description Guard Test G-1 — FailureLink dedup key가 fmId+fcId+feId 3요소를 모두 포함하는지 검증
 *
 * 사고 이력 (2026-03-21):
 *   FL dedup key에 feId 누락 → 유효 체인 8건 삭제 (FL 103→111)
 *   dedup key = `fmId|fcId`로 동일 FM+FC의 다른 FE 연결 체인 삭제
 *
 * 보호 대상: src/app/api/fmea/rebuild-atomic/route.ts
 * 실행: npx vitest run tests/guard/fl-dedup-key-3elements.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REBUILD_ATOMIC_PATH = path.resolve(
  __dirname,
  '../../src/app/api/fmea/rebuild-atomic/route.ts',
);

describe('FailureLink dedup key 3요소 보호 (Guard G-1)', () => {
  const src = fs.readFileSync(REBUILD_ATOMIC_PATH, 'utf-8');

  it('FL dedup key가 fmId|fcId|feId 3요소를 포함해야 한다', () => {
    // dedup key 템플릿 리터럴이 fmId, fcId, feId 3개를 모두 포함
    const dedupKeyPattern = /dedupKey\s*=\s*`\$\{.*fmId.*\}\|\$\{.*fcId.*\}\|\$\{.*feId.*\}`/;
    expect(src).toMatch(dedupKeyPattern);
  });

  it('FL dedup key에 feId가 없는 2요소 패턴이 없어야 한다', () => {
    // fmId|fcId 만으로 끝나는 dedup — feId 없이 세미콜론으로 닫히는 위험 패턴
    // 3요소 패턴(fmId|fcId|feId)은 정상이므로 제외
    const lines = src.split('\n');
    const dangerousLines = lines.filter(line => {
      const trimmed = line.trim();
      // dedupKey가 fmId과 fcId을 포함하지만 feId가 없는 할당문
      return trimmed.includes('dedupKey') &&
             trimmed.includes('fmId') &&
             trimmed.includes('fcId') &&
             !trimmed.includes('feId') &&
             trimmed.includes('=');
    });
    expect(dangerousLines).toEqual([]);
  });

  it('3요소 완전일치 주석이 존재해야 한다', () => {
    expect(src).toContain('fmId|fcId|feId');
  });

  it('FL dedup 섹션이 3곳 이상에서 3요소를 사용해야 한다', () => {
    const threeElementMatches = src.match(/fmId.*fcId.*feId/g) || [];
    expect(threeElementMatches.length).toBeGreaterThanOrEqual(3);
  });
});
