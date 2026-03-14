/**
 * @file v3-multisheet-no-a6b5.test.ts
 * @description excel-parser.ts A6/B5 단일값 파싱 아키텍처 검증
 *
 * ★ 2026-03-14 아키텍처 변경:
 *   - v3.0 계획(A6/B5 제거) 철회 → A6/B5는 L2-6/L3-5 시트에서 단일값으로 파싱
 *   - 다중 컬럼 파싱 버그(D 숫자 혼입) 수정 → 단일값 분기 도입
 *   - headerKeywordMap에 A6/B5 키워드 등록 (비표준 시트명 대응)
 *
 * @created 2026-02-28
 * @updated 2026-03-14 — 아키텍처 변경 반영
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PARSER_FILE = path.resolve(
  __dirname,
  '../../app/(fmea-core)/pfmea/import/excel-parser.ts',
);

function readSource(): string {
  return fs.readFileSync(PARSER_FILE, 'utf-8');
}

describe('A6/B5 시트 파싱 — 단일값 아키텍처', () => {

  it('ProcessRelation에 detectionCtrls 필드가 있어야 함 (L2-6 시트 지원)', () => {
    const src = readSource();
    const interfaceMatch = src.match(/export\s+interface\s+ProcessRelation\s*\{([\s\S]*?)\n\}/);
    expect(interfaceMatch).not.toBeNull();
    expect(interfaceMatch![1]).toMatch(/detectionCtrls/);
  });

  it('ProcessRelation에 preventionCtrls 필드가 있어야 함 (L3-5 시트 지원)', () => {
    const src = readSource();
    const interfaceMatch = src.match(/export\s+interface\s+ProcessRelation\s*\{([\s\S]*?)\n\}/);
    expect(interfaceMatch).not.toBeNull();
    expect(interfaceMatch![1]).toMatch(/preventionCtrls/);
  });

  it('ProcessRelation에 preventionCtrls4M 필드가 없어야 함', () => {
    const src = readSource();
    const interfaceMatch = src.match(/export\s+interface\s+ProcessRelation\s*\{([\s\S]*?)\n\}/);
    expect(interfaceMatch).not.toBeNull();
    expect(interfaceMatch![1]).not.toMatch(/preventionCtrls4M/);
  });
});

describe('A6/B5 시트 파싱 매핑 유지', () => {

  it('sheetMapping 배열에 A6 매핑이 있어야 함', () => {
    const src = readSource();
    const mappingMatch = src.match(/const\s+sheetMapping[\s\S]*?\];/);
    expect(mappingMatch).not.toBeNull();
    expect(mappingMatch![0]).toMatch(/['"]A6['"]/);
  });

  it('sheetMapping 배열에 B5 매핑이 있어야 함', () => {
    const src = readSource();
    const mappingMatch = src.match(/const\s+sheetMapping[\s\S]*?\];/);
    expect(mappingMatch).not.toBeNull();
    expect(mappingMatch![0]).toMatch(/['"]B5['"]/);
  });

  it('sheetMapping에 A3~A5, B1~B4 매핑도 유지되어야 함', () => {
    const src = readSource();
    const mappingMatch = src.match(/const\s+sheetMapping[\s\S]*?\];/);
    expect(mappingMatch).not.toBeNull();
    const mappingBlock = mappingMatch![0];
    expect(mappingBlock).toMatch(/['"]A3['"]/);
    expect(mappingBlock).toMatch(/['"]A4['"]/);
    expect(mappingBlock).toMatch(/['"]A5['"]/);
    expect(mappingBlock).toMatch(/['"]B1['"]/);
    expect(mappingBlock).toMatch(/['"]B2['"]/);
    expect(mappingBlock).toMatch(/['"]B3['"]/);
    expect(mappingBlock).toMatch(/['"]B4['"]/);
  });
});

describe('A6/B5 단일값 파싱 분기 존재', () => {

  it('A6/B5 전용 단일값 분기가 존재해야 함 (다중 컬럼 D 혼입 방지)', () => {
    const src = readSource();
    expect(src).toMatch(/sheetCode\s*===\s*['"]A6['"]/);
    expect(src).toMatch(/sheetCode\s*===\s*['"]B5['"]/);
  });
});

describe('headerKeywordMap — A6/B5 키워드 등록', () => {

  it('headerKeywordMap에 검출관리/A6 매핑이 있어야 함', () => {
    const src = readSource();
    const mapMatch = src.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapMatch).not.toBeNull();
    expect(mapMatch![1]).toMatch(/code:\s*['"]A6['"]/);
    expect(mapMatch![1]).toMatch(/검출관리/);
  });

  it('headerKeywordMap에 예방관리/B5 매핑이 있어야 함', () => {
    const src = readSource();
    const mapMatch = src.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapMatch).not.toBeNull();
    expect(mapMatch![1]).toMatch(/code:\s*['"]B5['"]/);
    expect(mapMatch![1]).toMatch(/예방관리/);
  });

  it('headerKeywordMap에 A3~A5, B1~B4 매핑도 유지되어야 함', () => {
    const src = readSource();
    const mapMatch = src.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapMatch).not.toBeNull();
    const body = mapMatch![1];
    expect(body).toMatch(/code:\s*['"]A3['"]/);
    expect(body).toMatch(/code:\s*['"]A4['"]/);
    expect(body).toMatch(/code:\s*['"]A5['"]/);
    expect(body).toMatch(/code:\s*['"]B1['"]/);
    expect(body).toMatch(/code:\s*['"]B2['"]/);
    expect(body).toMatch(/code:\s*['"]B3['"]/);
    expect(body).toMatch(/code:\s*['"]B4['"]/);
  });
});

describe('B5 4M 정렬 코드 제거 확인', () => {
  it('B5 preventionCtrls4M 정렬 블록이 없어야 함', () => {
    const src = readSource();
    expect(src).not.toMatch(/preventionCtrls4M/);
  });
});
