/**
 * @file unified-sheet-structure.test.ts
 * @description TDD: 15시트 → 5시트 통합 (L1/L2/L3/FC/VERIFY) 구조 검증
 *
 * Phase 2: 기존 개별시트(C1-C4, A1-A6, B1-B5)를 L1/L2/L3 통합시트로 합침
 * - L1 통합시트: 구분(C1), 제품기능(C2), 요구사항(C3), 고장영향(C4)
 * - L2 통합시트: 공정번호, 공정명(A1), 공정기능(A2), 제품특성(A3), 특별특성(A4), 고장형태(A5), 검출관리(A6)
 * - L3 통합시트: 공정번호, 4M, 작업요소(B1), 요소기능(B2), 공정특성(B3), 특별특성, 고장원인(B4), 예방관리(B5)
 * - FC: 기존 12열 유지
 * - VERIFY: 기존 구조 유지
 *
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';

const TEMPLATE_PATH = 'src/app/(fmea-core)/pfmea/import/excel-template.ts';
const PARSER_PATH = 'src/app/(fmea-core)/pfmea/import/excel-parser.ts';

// ────────────────────────────────────────────────────────────────
// 1. excel-template.ts — 통합시트 SHEET_DEFINITIONS 검증
// ────────────────────────────────────────────────────────────────
describe('통합시트 SHEET_DEFINITIONS', () => {

  it('L1 통합시트 정의가 있어야 함 (C1~C4 통합)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    // L1 통합시트: 구분, 제품기능, 요구사항, 고장영향
    expect(content).toMatch(/name:\s*['"]L1 통합/);
    expect(content).toMatch(/legacyName:\s*['"]L1_UNIFIED['"]/);
  });

  it('L2 통합시트 정의가 있어야 함 (A1~A6 통합)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    expect(content).toMatch(/name:\s*['"]L2 통합/);
    expect(content).toMatch(/legacyName:\s*['"]L2_UNIFIED['"]/);
  });

  it('L3 통합시트 정의가 있어야 함 (B1~B5 통합)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    expect(content).toMatch(/name:\s*['"]L3 통합/);
    expect(content).toMatch(/legacyName:\s*['"]L3_UNIFIED['"]/);
  });

  it('L1 통합시트 headers에 구분/제품기능/요구사항/고장영향 컬럼이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    // L1 통합시트 라인 찾기
    const l1Line = content.split('\n').find(line =>
      line.includes("'L1 통합") && line.includes('headers')
    );
    expect(l1Line).toBeDefined();
    expect(l1Line).toContain('구분');
    expect(l1Line).toContain('제품기능');
    expect(l1Line).toContain('요구사항');
    expect(l1Line).toContain('고장영향');
  });

  it('L2 통합시트 headers에 공정번호/공정명/공정기능/제품특성/특별특성/고장형태/검출관리 컬럼', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    const l2Line = content.split('\n').find(line =>
      line.includes("'L2 통합") && line.includes('headers')
    );
    expect(l2Line).toBeDefined();
    expect(l2Line).toContain('공정번호');
    expect(l2Line).toContain('공정명');
    expect(l2Line).toContain('공정기능');
    expect(l2Line).toContain('제품특성');
    expect(l2Line).toContain('특별특성');
    expect(l2Line).toContain('고장형태');
    expect(l2Line).toContain('검출관리');
  });

  it('L2 통합시트 = 7열', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    const l2Line = content.split('\n').find(line =>
      line.includes("'L2 통합") && line.includes('headers')
    );
    expect(l2Line).toBeDefined();
    const headerMatch = l2Line!.match(/headers:\s*\[([^\]]+)\]/);
    expect(headerMatch).toBeTruthy();
    const headers = headerMatch![1].split(',').map(h => h.trim());
    expect(headers.length).toBe(7);
  });

  it('L3 통합시트 headers에 공정번호/4M/작업요소/요소기능/공정특성/특별특성/고장원인/예방관리 컬럼', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    const l3Line = content.split('\n').find(line =>
      line.includes("'L3 통합") && line.includes('headers')
    );
    expect(l3Line).toBeDefined();
    expect(l3Line).toContain('공정번호');
    expect(l3Line).toContain('4M');
    expect(l3Line).toContain('작업요소');
    expect(l3Line).toContain('요소기능');
    expect(l3Line).toContain('공정특성');
    expect(l3Line).toContain('특별특성');
    expect(l3Line).toContain('고장원인');
    expect(l3Line).toContain('예방관리');
  });

  it('L3 통합시트 = 8열', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    const l3Line = content.split('\n').find(line =>
      line.includes("'L3 통합") && line.includes('headers')
    );
    expect(l3Line).toBeDefined();
    const headerMatch = l3Line!.match(/headers:\s*\[([^\]]+)\]/);
    expect(headerMatch).toBeTruthy();
    const headers = headerMatch![1].split(',').map(h => h.trim());
    expect(headers.length).toBe(8);
  });
});

// ────────────────────────────────────────────────────────────────
// 2. excel-template.ts — 통합시트 BUMP 샘플 데이터
// ────────────────────────────────────────────────────────────────
describe('통합시트 BUMP 샘플 데이터', () => {

  it('L2 통합시트 샘플에 BUMP 공정이 포함되어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    // BUMP 키워드: Sputter, Plating, Reflow 등
    const sampleSection = content.match(/SAMPLE_DATA_UNIFIED[^=]*=\s*\{([\s\S]*?)\n\};/);
    if (!sampleSection) {
      // SAMPLE_DATA 내에 통합시트 데이터가 있을 수도 있음
      expect(content).toMatch(/L2 통합[\s\S]*?Sputter|Plating|Scrubber/);
    } else {
      expect(sampleSection[1]).toMatch(/Sputter|Plating|Scrubber/);
    }
  });

  it('L3 통합시트 샘플에 4M 분류가 포함되어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    // L3 통합시트 샘플 데이터에 MC, MN, IM, EN 등 4M 코드가 있어야 함
    // SAMPLE_DATA에서 L3 통합 키를 찾기
    expect(content).toMatch(/L3 통합[\s\S]*?['"]MC['"]/);
  });
});

// ────────────────────────────────────────────────────────────────
// 3. excel-parser.ts — headerKeywordMap에 통합시트 코드 등록
// ────────────────────────────────────────────────────────────────
describe('excel-parser.ts — 통합시트 감지', () => {

  it('headerKeywordMap에 L1_UNIFIED 항목이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(PARSER_PATH, 'utf-8');

    const mapSection = content.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapSection).toBeTruthy();
    expect(mapSection![1]).toMatch(/code:\s*['"]L1_UNIFIED['"]/);
  });

  it('headerKeywordMap에 L2_UNIFIED 항목이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(PARSER_PATH, 'utf-8');

    const mapSection = content.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapSection).toBeTruthy();
    expect(mapSection![1]).toMatch(/code:\s*['"]L2_UNIFIED['"]/);
  });

  it('headerKeywordMap에 L3_UNIFIED 항목이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(PARSER_PATH, 'utf-8');

    const mapSection = content.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapSection).toBeTruthy();
    expect(mapSection![1]).toMatch(/code:\s*['"]L3_UNIFIED['"]/);
  });

  it('L2_UNIFIED 감지 키워드에 공정명+공정기능+고장형태 조합이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(PARSER_PATH, 'utf-8');

    // L2 통합시트 감지: 공정명+공정기능+고장형태 3개 키워드 동시 존재
    const mapSection = content.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapSection).toBeTruthy();

    // L2_UNIFIED 엔트리 추출
    const l2Entry = mapSection![1].match(/\{[^}]*L2_UNIFIED[^}]*\}/);
    expect(l2Entry).toBeTruthy();
    expect(l2Entry![0]).toMatch(/공정명/);
    expect(l2Entry![0]).toMatch(/공정기능/);
    expect(l2Entry![0]).toMatch(/고장형태/);
  });

  it('L3_UNIFIED 감지 키워드에 작업요소+고장원인+예방관리 조합이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(PARSER_PATH, 'utf-8');

    const mapSection = content.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapSection).toBeTruthy();

    const l3Entry = mapSection![1].match(/\{[^}]*L3_UNIFIED[^}]*\}/);
    expect(l3Entry).toBeTruthy();
    expect(l3Entry![0]).toMatch(/작업요소/);
    expect(l3Entry![0]).toMatch(/고장원인/);
    expect(l3Entry![0]).toMatch(/예방관리/);
  });
});

// ────────────────────────────────────────────────────────────────
// 4. 하위호환: 기존 개별시트 정의 유지
// ────────────────────────────────────────────────────────────────
describe('하위호환: 기존 개별시트 정의 유지', () => {

  it('기존 A1~A6 개별시트 정의가 유지되어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    expect(content).toMatch(/legacyName:\s*['"]A1['"]/);
    expect(content).toMatch(/legacyName:\s*['"]A2['"]/);
    expect(content).toMatch(/legacyName:\s*['"]A3['"]/);
    expect(content).toMatch(/legacyName:\s*['"]A4['"]/);
    expect(content).toMatch(/legacyName:\s*['"]A5['"]/);
    expect(content).toMatch(/legacyName:\s*['"]A6['"]/);
  });

  it('기존 B1~B5 개별시트 정의가 유지되어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    expect(content).toMatch(/legacyName:\s*['"]B1['"]/);
    expect(content).toMatch(/legacyName:\s*['"]B2['"]/);
    expect(content).toMatch(/legacyName:\s*['"]B3['"]/);
    expect(content).toMatch(/legacyName:\s*['"]B4['"]/);
    expect(content).toMatch(/legacyName:\s*['"]B5['"]/);
  });

  it('기존 C1~C4 개별시트 정의가 유지되어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    expect(content).toMatch(/legacyName:\s*['"]C1['"]/);
    expect(content).toMatch(/legacyName:\s*['"]C2['"]/);
    expect(content).toMatch(/legacyName:\s*['"]C3['"]/);
    expect(content).toMatch(/legacyName:\s*['"]C4['"]/);
  });

  it('기존 headerKeywordMap A1~C4 항목이 유지되어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(PARSER_PATH, 'utf-8');

    const mapSection = content.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapSection).toBeTruthy();

    // 기존 15개 항목 유지 확인
    for (const code of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4']) {
      expect(mapSection![1]).toMatch(new RegExp(`code:\\s*['"]${code}['"]`));
    }
  });
});
