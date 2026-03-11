/**
 * @file v3-multisheet-no-a6b5.test.ts
 * @description TDD RED: v3.0 excel-parser.ts에서 A6(검출관리)/B5(예방관리) 필드 및 파싱 제거 검증
 *
 * 검증 대상:
 * 1. ProcessRelation 인터페이스에서 detectionCtrls/preventionCtrls 필드 제거
 * 2. A6/B5 시트 파싱 로직 제거 (sheetMapping에서 제거)
 * 3. buildMultiSheetStatistics에서 A6/B5 통계 제거
 * 4. getParseStats에서 A6/B5 카운트 제거
 * 5. 나머지 시트(A1~A5, B1~B4, C1~C4) 파싱은 정상 유지
 *
 * @created 2026-02-28
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PARSER_FILE = path.resolve(
  __dirname,
  '../../app/(fmea-core)/pfmea/import/excel-parser.ts',
);

/**
 * 소스 코드를 읽어서 패턴을 검사하는 헬퍼
 */
function readSource(): string {
  return fs.readFileSync(PARSER_FILE, 'utf-8');
}

// ── 1. ProcessRelation 타입에서 detectionCtrls/preventionCtrls 필드 제거 ──

describe('TODO-9: ProcessRelation에서 A6/B5 필드 제거', () => {

  it('ProcessRelation에 detectionCtrls 필드가 없어야 함', () => {
    const src = readSource();
    // interface ProcessRelation 블록 내에서 detectionCtrls 선언이 없어야 함
    const interfaceMatch = src.match(/export\s+interface\s+ProcessRelation\s*\{([\s\S]*?)\n\}/);
    expect(interfaceMatch).not.toBeNull();
    const interfaceBody = interfaceMatch![1];
    expect(interfaceBody).not.toMatch(/detectionCtrls/);
  });

  it('ProcessRelation에 preventionCtrls 필드가 없어야 함', () => {
    const src = readSource();
    const interfaceMatch = src.match(/export\s+interface\s+ProcessRelation\s*\{([\s\S]*?)\n\}/);
    expect(interfaceMatch).not.toBeNull();
    const interfaceBody = interfaceMatch![1];
    expect(interfaceBody).not.toMatch(/preventionCtrls/);
  });

  it('ProcessRelation에 preventionCtrls4M 필드가 없어야 함', () => {
    const src = readSource();
    const interfaceMatch = src.match(/export\s+interface\s+ProcessRelation\s*\{([\s\S]*?)\n\}/);
    expect(interfaceMatch).not.toBeNull();
    const interfaceBody = interfaceMatch![1];
    expect(interfaceBody).not.toMatch(/preventionCtrls4M/);
  });
});

// ── 2. A6/B5 시트 파싱 로직 제거 ──

describe('TODO-9: A6/B5 시트 파싱 매핑 제거', () => {

  it('sheetMapping 배열에 A6 매핑이 없어야 함', () => {
    const src = readSource();
    // sheetMapping 배열 선언 찾기
    const mappingMatch = src.match(/const\s+sheetMapping[\s\S]*?\];/);
    expect(mappingMatch).not.toBeNull();
    const mappingBlock = mappingMatch![0];
    expect(mappingBlock).not.toMatch(/['"]A6['"]/);
    expect(mappingBlock).not.toMatch(/detectionCtrls/);
  });

  it('sheetMapping 배열에 B5 매핑이 없어야 함', () => {
    const src = readSource();
    const mappingMatch = src.match(/const\s+sheetMapping[\s\S]*?\];/);
    expect(mappingMatch).not.toBeNull();
    const mappingBlock = mappingMatch![0];
    expect(mappingBlock).not.toMatch(/['"]B5['"]/);
    expect(mappingBlock).not.toMatch(/preventionCtrls/);
  });

  it('sheetMapping에 A3, A4, A5, B1~B4 매핑은 유지되어야 함', () => {
    const src = readSource();
    const mappingMatch = src.match(/const\s+sheetMapping[\s\S]*?\];/);
    expect(mappingMatch).not.toBeNull();
    const mappingBlock = mappingMatch![0];
    // 남아야 하는 시트들
    expect(mappingBlock).toMatch(/['"]A3['"]/);
    expect(mappingBlock).toMatch(/['"]A4['"]/);
    expect(mappingBlock).toMatch(/['"]A5['"]/);
    expect(mappingBlock).toMatch(/['"]B1['"]/);
    expect(mappingBlock).toMatch(/['"]B2['"]/);
    expect(mappingBlock).toMatch(/['"]B3['"]/);
    expect(mappingBlock).toMatch(/['"]B4['"]/);
  });
});

// ── 3. processMap 초기화에서 detectionCtrls/preventionCtrls 제거 ──

describe('TODO-9: processMap 초기화에서 A6/B5 필드 제거', () => {

  it('소스 코드에 detectionCtrls 초기화가 없어야 함', () => {
    const src = readSource();
    // processMap 생성/초기화 코드에서 detectionCtrls: [] 패턴이 없어야 함
    expect(src).not.toMatch(/detectionCtrls\s*:/);
  });

  it('소스 코드에 preventionCtrls 초기화가 없어야 함', () => {
    const src = readSource();
    expect(src).not.toMatch(/preventionCtrls\s*:/);
  });

  it('소스 코드에 preventionCtrls4M 초기화가 없어야 함', () => {
    const src = readSource();
    expect(src).not.toMatch(/preventionCtrls4M\s*:/);
  });
});

// ── 4. buildMultiSheetStatistics에서 A6/B5 통계 제거 ──

describe('TODO-9: buildMultiSheetStatistics에서 A6/B5 통계 제거', () => {

  it('ITEM_LABELS에 A6 label이 존재해야 함 (STEP B 전처리 지원)', () => {
    const src = readSource();
    const labelsMatch = src.match(/ITEM_LABELS[\s\S]*?\{([\s\S]*?)\};/);
    expect(labelsMatch).not.toBeNull();
    const labelsBody = labelsMatch![1];
    expect(labelsBody).toMatch(/A6.*검출관리/);
  });

  it('ITEM_LABELS에 B5 label이 존재해야 함 (STEP B 전처리 지원)', () => {
    const src = readSource();
    const labelsMatch = src.match(/ITEM_LABELS[\s\S]*?\{([\s\S]*?)\};/);
    expect(labelsMatch).not.toBeNull();
    const labelsBody = labelsMatch![1];
    expect(labelsBody).toMatch(/B5.*예방관리/);
  });

  it('buildMultiSheetStatistics에서 detectionCtrls 참조가 없어야 함', () => {
    const src = readSource();
    const funcMatch = src.match(/function\s+buildMultiSheetStatistics[\s\S]*?^}/m);
    expect(funcMatch).not.toBeNull();
    const funcBody = funcMatch![0];
    expect(funcBody).not.toMatch(/detectionCtrls/);
  });

  it('buildMultiSheetStatistics에서 preventionCtrls 참조가 없어야 함', () => {
    const src = readSource();
    const funcMatch = src.match(/function\s+buildMultiSheetStatistics[\s\S]*?^}/m);
    expect(funcMatch).not.toBeNull();
    const funcBody = funcMatch![0];
    expect(funcBody).not.toMatch(/preventionCtrls/);
  });
});

// ── 5. getParseStats에서 A6/B5 카운트 제거 ──

describe('TODO-9: getParseStats에서 A6/B5 카운트 제거', () => {

  it('getParseStats에서 detectionCtrls 참조가 없어야 함', () => {
    const src = readSource();
    const funcMatch = src.match(/export\s+function\s+getParseStats[\s\S]*?^}/m);
    expect(funcMatch).not.toBeNull();
    const funcBody = funcMatch![0];
    expect(funcBody).not.toMatch(/detectionCtrls/);
  });

  it('getParseStats에서 preventionCtrls 참조가 없어야 함', () => {
    const src = readSource();
    const funcMatch = src.match(/export\s+function\s+getParseStats[\s\S]*?^}/m);
    expect(funcMatch).not.toBeNull();
    const funcBody = funcMatch![0];
    expect(funcBody).not.toMatch(/preventionCtrls/);
  });
});

// ── 6. headerKeywordMap에서 A6/B5 키워드 제거 ──

describe('TODO-9: headerKeywordMap에서 A6/B5 키워드 제거', () => {

  it('headerKeywordMap에 검출관리/A6 매핑이 없어야 함', () => {
    const src = readSource();
    const mapMatch = src.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapMatch).not.toBeNull();
    const mapBody = mapMatch![0];
    // code: 'A6' 패턴이 없어야 함
    expect(mapBody).not.toMatch(/code:\s*['"]A6['"]/);
  });

  it('headerKeywordMap에 예방관리/B5 매핑이 없어야 함', () => {
    const src = readSource();
    const mapMatch = src.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapMatch).not.toBeNull();
    const mapBody = mapMatch![0];
    // code: 'B5' 패턴이 없어야 함
    expect(mapBody).not.toMatch(/code:\s*['"]B5['"]/);
  });

  it('headerKeywordMap에 A3~A5, B1~B4 매핑은 유지되어야 함', () => {
    const src = readSource();
    const mapMatch = src.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapMatch).not.toBeNull();
    const mapBody = mapMatch![0];
    expect(mapBody).toMatch(/code:\s*['"]A3['"]/);
    expect(mapBody).toMatch(/code:\s*['"]A4['"]/);
    expect(mapBody).toMatch(/code:\s*['"]A5['"]/);
    expect(mapBody).toMatch(/code:\s*['"]B1['"]/);
    expect(mapBody).toMatch(/code:\s*['"]B2['"]/);
    expect(mapBody).toMatch(/code:\s*['"]B3['"]/);
    expect(mapBody).toMatch(/code:\s*['"]B4['"]/);
  });
});

// ── 7. B5 4M 정렬 코드 제거 ──

describe('TODO-9: B5 4M 정렬 코드 제거', () => {

  it('B5 preventionCtrls4M 정렬 블록이 없어야 함', () => {
    const src = readSource();
    // "B5: preventionCtrls + preventionCtrls4M" 주석 또는 해당 정렬 블록 없어야 함
    expect(src).not.toMatch(/preventionCtrls4M/);
  });
});

// ── 8. 공통공정 판단에서 detectionCtrls/preventionCtrls 제거 ──

describe('TODO-9: 공통공정 판단 코드에서 A6/B5 제거', () => {

  it('공통공정 hasData 판단에서 detectionCtrls 참조가 없어야 함', () => {
    const src = readSource();
    // 공통공정 블록에서 detectionCtrls를 참조하지 않아야 함
    const commonMatch = src.match(/processMap\.has\('공통'\)[\s\S]*?processMap\.delete\('공통'\)/);
    if (commonMatch) {
      expect(commonMatch[0]).not.toMatch(/detectionCtrls/);
    }
  });

  it('공통공정 hasData 판단에서 preventionCtrls 참조가 없어야 함', () => {
    const src = readSource();
    const commonMatch = src.match(/processMap\.has\('공통'\)[\s\S]*?processMap\.delete\('공통'\)/);
    if (commonMatch) {
      expect(commonMatch[0]).not.toMatch(/preventionCtrls/);
    }
  });
});
