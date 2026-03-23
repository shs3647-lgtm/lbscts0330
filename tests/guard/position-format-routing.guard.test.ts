/**
 * @file position-format-routing.guard.test.ts
 * @description 3중 방어 Guard — isPositionBasedFormat 라우팅 보호
 *
 * 사고 이력 (2026-03-23 ab7054a):
 *   "통합" 키워드 차단 4줄 추가 → 위치기반 엑셀이 레거시 파서로 빠짐
 *   → A5=1, B4=18 (정상: 25+, 90+) → 106건 FC 누락 → 렌더링 전체 실패
 *
 * PRD 정의:
 *   위치기반 포맷의 정상 시트명 = "L1 통합(C1-C4)", "L2 통합(A1-A6)",
 *   "L3 통합(B1-B5)", "FC 고장사슬" → "통합" 포함이 정상
 *
 * 이 테스트가 실패하면:
 *   isPositionBasedFormat에서 "통합" 키워드를 차단하는 코드가 재삽입된 것.
 *   해당 코드를 즉시 제거하고 사용자에게 보고할 것.
 *
 * 실행: npx vitest run tests/guard/position-format-routing.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PARSER_PATH = path.resolve(
  __dirname,
  '../../src/lib/fmea/position-parser.ts',
);

describe('isPositionBasedFormat 라우팅 보호 (3중 방어)', () => {
  const src = fs.readFileSync(PARSER_PATH, 'utf-8');

  // 핵심: "통합" 키워드로 return false 하는 코드가 절대 존재하면 안 됨
  it('isPositionBasedFormat에서 "통합" 키워드 차단 코드가 없어야 한다', () => {
    const fnStart = src.indexOf('function isPositionBasedFormat');
    expect(fnStart).toBeGreaterThan(-1);

    const fnEnd = src.indexOf('\n}', fnStart);
    const fnBody = src.substring(fnStart, fnEnd);

    expect(fnBody).not.toMatch(/통합.*return\s+false/);
    expect(fnBody).not.toMatch(/UNIFIED.*return\s+false/i);
    expect(fnBody).not.toMatch(/hasUnified/);
  });

  // "통합" 포함 시트명이 true를 반환하는지 직접 검증
  it('PRD 정의 시트명 (통합 포함)이 위치기반으로 감지되어야 한다', async () => {
    const mod = await import('../../src/lib/fmea/position-parser');
    const result = mod.isPositionBasedFormat([
      'L1 통합(C1-C4)',
      'L2 통합(A1-A6)',
      'L3 통합(B1-B5)',
      'FC 고장사슬',
    ]);
    expect(result).toBe(true);
  });

  // 기본 위치기반 시트명 (통합 없는 버전)도 true
  it('기본 L1/L2/L3/FC 시트명도 위치기반으로 감지되어야 한다', async () => {
    const mod = await import('../../src/lib/fmea/position-parser');
    const result = mod.isPositionBasedFormat([
      'L1',
      'L2',
      'L3',
      'FC',
    ]);
    expect(result).toBe(true);
  });

  // L1/L2/L3/FC가 없으면 false (레거시 파서)
  it('L1/L2/L3/FC 시트가 없으면 false를 반환해야 한다', async () => {
    const mod = await import('../../src/lib/fmea/position-parser');
    const result = mod.isPositionBasedFormat([
      'Sheet1',
      'Sheet2',
      'Sheet3',
    ]);
    expect(result).toBe(false);
  });

  // CODEFREEZE 주석 존재 확인
  it('CODEFREEZE 주석이 isPositionBasedFormat 근처에 존재해야 한다', () => {
    const fnStart = src.indexOf('function isPositionBasedFormat');
    const preceding = src.substring(Math.max(0, fnStart - 1000), fnStart);
    expect(preceding).toContain('CODEFREEZE');
  });
});
