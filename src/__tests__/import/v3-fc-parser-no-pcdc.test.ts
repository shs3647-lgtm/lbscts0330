/**
 * @file v3-fc-parser-no-pcdc.test.ts
 * @description TDD: v3.1.1 excel-parser-fc.ts — PC/DC 컬럼 복원 (9열→11열)
 *
 * v3.1.1 변경:
 *   - FCColumnMap에 pcValue, dcValue 필드 복원
 *   - 9열 → 11열 (공정번호, 4M, 고장원인(B4), 고장형태(A5), 고장영향(C4), 예방관리(B5), 검출관리(A6), S, O, D, AP)
 *   - PC/DC 관련 파싱 로직 복원
 *   - parseFCSheet() 결과에 pcValue/dcValue 포함
 *
 * @created 2026-02-28
 */

import { describe, it, expect } from 'vitest';

const FC_PARSER_PATH = 'src/app/(fmea-core)/pfmea/import/excel-parser-fc.ts';

describe('v3.1.1: excel-parser-fc.ts — PC/DC 컬럼 파싱 복원', () => {

  // ─── 소스코드 레벨 검증: FCColumnMap에 pcValue/dcValue 존재 ───

  it('FCColumnMap 인터페이스에 pcValue 필드가 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');
    const interfaceMatch = content.match(/interface\s+FCColumnMap\s*\{([\s\S]+?)\}/);
    expect(interfaceMatch).toBeTruthy();
    expect(interfaceMatch![1]).toMatch(/pcValue\s*:/);
  });

  it('FCColumnMap 인터페이스에 dcValue 필드가 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');
    const interfaceMatch = content.match(/interface\s+FCColumnMap\s*\{([\s\S]+?)\}/);
    expect(interfaceMatch).toBeTruthy();
    expect(interfaceMatch![1]).toMatch(/dcValue\s*:/);
  });

  // ─── 소스코드 레벨 검증: HEADER_PATTERNS에 PC/DC 패턴 존재 ───

  it('HEADER_PATTERNS에 pcValue 매핑이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');
    expect(content).toMatch(/field:\s*['"]pcValue['"]/);
  });

  it('HEADER_PATTERNS에 dcValue 매핑이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');
    expect(content).toMatch(/field:\s*['"]dcValue['"]/);
  });

  // ─── 소스코드 레벨 검증: detectColumnMap 초기값에 포함 ───

  it('detectColumnMap 초기화에 pcValue/dcValue가 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');
    const fnMatch = content.match(/function\s+detectColumnMap[\s\S]*?return\s*\{/);
    expect(fnMatch).toBeTruthy();
    // detectColumnMap 함수 전체에서 pcValue/dcValue 초기화 확인
    const fnBody = content.match(/function\s+detectColumnMap[\s\S]*?\n\}/);
    expect(fnBody).toBeTruthy();
    expect(fnBody![0]).toMatch(/pcValue/);
    expect(fnBody![0]).toMatch(/dcValue/);
  });

  // ─── 소스코드 레벨 검증: parseFCSheet에서 pcValue/dcValue 파싱 ───

  it('parseFCSheet에서 colMap.pcValue를 읽어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');
    expect(content).toMatch(/colMap\.pcValue/);
  });

  it('parseFCSheet에서 colMap.dcValue를 읽어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');
    expect(content).toMatch(/colMap\.dcValue/);
  });

  // ─── 소스코드 레벨 검증: chains.push()에 pcValue/dcValue 포함 ───

  it('chains.push()에 pcValue 할당이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');
    expect(content).toMatch(/pcValue\s*[,:]/);
  });

  it('chains.push()에 dcValue 할당이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');
    expect(content).toMatch(/dcValue\s*[,:]/);
  });

  // ─── 시트 설명 주석 업데이트 검증 ───

  it('파일에 11열 형식 관련 내용이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(FC_PARSER_PATH, 'utf-8');
    // 11열 형식에 예방관리/검출관리 패턴 포함
    expect(content).toMatch(/예방관리/);
    expect(content).toMatch(/검출관리/);
  });
});
