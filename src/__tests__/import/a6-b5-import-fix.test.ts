/**
 * @file a6-b5-import-fix.test.ts
 * @description TDD: A6(검출관리)/B5(예방관리) Import 파싱 버그 4건 수정 검증
 *
 * BUG-1: recoverSkippedRows에서 pcValue/dcValue 누락
 * BUG-2: L2-6/L3-5 시트 다중 컬럼 파싱 → D(검출도) 숫자 혼입
 * BUG-3: Template 폴백이 All-or-Nothing → 공정별 체크 필요
 * BUG-4: headerKeywordMap에 A6/B5 키워드 미등록
 *
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';

const FC_PARSER_PATH = 'src/app/(fmea-core)/pfmea/import/excel-parser-fc.ts';
const EXCEL_PARSER_PATH = 'src/app/(fmea-core)/pfmea/import/excel-parser.ts';
const HANDLER_PATH = 'src/app/(fmea-core)/pfmea/import/hooks/useImportFileHandlers.ts';

describe('FIX-1: recoverSkippedRows — pcValue/dcValue 포함', () => {

  it('recoverSkippedRows에서 pcValue를 읽어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');

    const recoverFn = content.match(/function\s+recoverSkippedRows[\s\S]+?\n\}/);
    expect(recoverFn).toBeTruthy();

    expect(recoverFn![0]).toMatch(/pcValue/);
  });

  it('recoverSkippedRows에서 dcValue를 읽어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');

    const recoverFn = content.match(/function\s+recoverSkippedRows[\s\S]+?\n\}/);
    expect(recoverFn).toBeTruthy();

    expect(recoverFn![0]).toMatch(/dcValue/);
  });

  it('recoverSkippedRows에서 colMap.pcValue로 getCol 호출해야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');

    const recoverFn = content.match(/function\s+recoverSkippedRows[\s\S]+?\n\}/);
    expect(recoverFn).toBeTruthy();

    expect(recoverFn![0]).toMatch(/getCol\(row,\s*colMap\.pcValue\)/);
  });

  it('recoverSkippedRows에서 colMap.dcValue로 getCol 호출해야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');

    const recoverFn = content.match(/function\s+recoverSkippedRows[\s\S]+?\n\}/);
    expect(recoverFn).toBeTruthy();

    expect(recoverFn![0]).toMatch(/getCol\(row,\s*colMap\.dcValue\)/);
  });
});


describe('FIX-2: A6/B5 시트 — 단일값 파싱 (D 숫자 혼입 방지)', () => {

  it('excel-parser.ts에 A6/B5 단일값 분기가 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(EXCEL_PARSER_PATH, 'utf-8');

    // A6 또는 B5 시트코드 전용 분기 확인
    expect(content).toMatch(/sheetCode\s*===\s*['"]A6['"]/);
    expect(content).toMatch(/sheetCode\s*===\s*['"]B5['"]/);
  });

  it('A6/B5 분기에서 valStartCol만 읽어야 함 (다중 컬럼 루프 아님)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(EXCEL_PARSER_PATH, 'utf-8');

    // A6/B5 전용 분기: valStartCol 단일 컬럼만 읽는 패턴
    // "sheetCode === 'A6' || sheetCode === 'B5'" 조건 후 valStartCol 사용
    const a6b5Block = content.match(
      /else\s+if\s*\(\s*sheetCode\s*===\s*['"]A6['"][\s\S]{0,60}sheetCode\s*===\s*['"]B5['"]\s*\)\s*\{([\s\S]+?)\n\s{8}\}/
    );
    expect(a6b5Block).toBeTruthy();

    // valStartCol만 사용 (for 루프로 여러 컬럼을 읽지 않음)
    expect(a6b5Block![1]).toMatch(/valStartCol/);
    expect(a6b5Block![1]).not.toMatch(/for\s*\(\s*let\s+col/);
  });
});


describe('FIX-3: Template 폴백 — 공정별(per-process) 체크', () => {

  it('A6 템플릿 폴백이 FC 체인 공정번호 기준으로 분기해야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(HANDLER_PATH, 'utf-8');

    // 공정별 체크: fcA6Processes / fcA6Set 같은 Set으로 공정별 필터링
    // 또는 per-process 체크 패턴
    const hasPerProcessA6 = content.match(
      /fcA6(Processes|Set|ByProc)/
    );
    expect(hasPerProcessA6).toBeTruthy();
  });

  it('B5 템플릿 폴백이 FC 체인 공정번호 기준으로 분기해야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(HANDLER_PATH, 'utf-8');

    const hasPerProcessB5 = content.match(
      /fcB5(Processes|Set|ByProc)/
    );
    expect(hasPerProcessB5).toBeTruthy();
  });
});


describe('FIX-4: headerKeywordMap — A6/B5 키워드 등록', () => {

  it('headerKeywordMap에 A6(검출관리) 항목이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(EXCEL_PARSER_PATH, 'utf-8');

    // headerKeywordMap 배열 전체를 캡처 (중첩 대괄호 포함)
    const mapSection = content.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapSection).toBeTruthy();

    expect(mapSection![1]).toMatch(/검출관리/);
    expect(mapSection![1]).toMatch(/code:\s*['"]A6['"]/);
  });

  it('headerKeywordMap에 B5(예방관리) 항목이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(EXCEL_PARSER_PATH, 'utf-8');

    const mapSection = content.match(/headerKeywordMap[^=]*=\s*\[([\s\S]*?)\];/);
    expect(mapSection).toBeTruthy();

    expect(mapSection![1]).toMatch(/예방관리/);
    expect(mapSection![1]).toMatch(/code:\s*['"]B5['"]/);
  });
});
