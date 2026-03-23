/**
 * @file raw-to-atomic-fields.guard.test.ts
 * @description ⛔ GUARD TEST — raw-to-atomic.ts 필수 필드 존재 검증
 *
 * 배경:
 *   Prisma 캐시 문제 임시 대응으로 아래 필드들이 2번 실수로 제거됨 (2026-03-23)
 *   이 테스트는 해당 필드가 코드에 반드시 존재하는지 정적 검사
 *
 * 재발 방지:
 *   npx vitest run tests/guard/raw-to-atomic-fields.guard.test.ts
 *   → 필드 누락 시 즉시 실패 → 커밋 차단
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const FILE_PATH = path.resolve(__dirname, '../../src/lib/fmea-core/raw-to-atomic.ts');

describe('⛔ raw-to-atomic.ts 필수 필드 GUARD', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(FILE_PATH, 'utf-8');
  });

  it('L1Requirement: parentId 필드 존재', () => {
    // l1Requirement.createMany 블록 내에 parentId 있어야 함
    const block = extractBlock(src, 'l1Requirement.createMany');
    expect(block).toContain('parentId');
  });

  it('FailureMode: feRefs 필드 존재', () => {
    const block = extractBlock(src, 'failureMode.createMany');
    expect(block).toContain('feRefs');
  });

  it('FailureMode: fcRefs 필드 존재', () => {
    const block = extractBlock(src, 'failureMode.createMany');
    expect(block).toContain('fcRefs');
  });

  it('FailureLink: l2StructId 필드 존재', () => {
    const block = extractBlock(src, 'failureLink.createMany');
    expect(block).toContain('l2StructId');
  });

  it('FailureLink: l3StructId 필드 존재', () => {
    const block = extractBlock(src, 'failureLink.createMany');
    expect(block).toContain('l3StructId');
  });

  it('RiskAnalysis: fmId 필드 존재 (★v4 EX-06)', () => {
    const block = extractBlock(src, 'riskAnalysis.createMany');
    expect(block).toContain('fmId');
  });

  it('RiskAnalysis: fcId 필드 존재 (★v4 EX-06)', () => {
    const block = extractBlock(src, 'riskAnalysis.createMany');
    expect(block).toContain('fcId');
  });

  it('RiskAnalysis: feId 필드 존재 (★v4 EX-06)', () => {
    const block = extractBlock(src, 'riskAnalysis.createMany');
    expect(block).toContain('feId');
  });

  it('GUARD 주석 존재 — 삭제 경고 표시', () => {
    const guardCount = (src.match(/⛔ GUARD/g) || []).length;
    expect(guardCount).toBeGreaterThanOrEqual(4);
  });
});

/** createMany 호출 블록 추출 (해당 테이블 기준 200자) */
function extractBlock(src: string, keyword: string): string {
  const idx = src.indexOf(keyword);
  if (idx === -1) return '';
  return src.slice(idx, idx + 600);
}
