/**
 * @file v3-template-fc9col.test.ts
 * @description TDD: 엑셀 템플릿 — A6/B5 별도시트 제거 유지, FC N:1:N 구조
 *
 * v4.0.0 변경:
 *   - SHEET_DEFINITIONS에서 A6/B5 별도 시트는 제거 유지
 *   - FC 고장사슬 시트: 12열 N:1:N (FE구분, FE, 공정번호, FM, 4M, WE, FC, PC, DC, O, D, AP) — S 제거
 *   - FE→FM→FC 좌우배치 (연결표와 동일 구조)
 *
 * @created 2026-02-28
 * @updated 2026-03-09 — v4.0 FC 13열 N:1:N 구조
 */

import { describe, it, expect } from 'vitest';

// SHEET_DEFINITIONS는 export되지 않으므로 간접 검증
// excel-template.ts를 import하여 내부 상수를 검증할 수 없다면
// 대안: 파일 내용을 직접 검증 (소스코드 패턴 체크)

describe('v3.2.1: excel-template.ts — A6/B5 별도시트 제거 유지, FC 4열 간소화', () => {

  // v5.4: A6/B5 전용시트 복원 — 시트 정의가 있어야 함
  it('SHEET_DEFINITIONS에 A6(검출관리) 전용시트가 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      'src/app/(fmea-core)/pfmea/import/excel-template.ts',
      'utf-8',
    );
    expect(content).toMatch(/name:\s*['"]L2-6\(A6\)\s*검출관리['"]/);
    expect(content).toMatch(/legacyName:\s*['"]A6['"]/);
  });

  it('SHEET_DEFINITIONS에 B5(예방관리) 전용시트가 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      'src/app/(fmea-core)/pfmea/import/excel-template.ts',
      'utf-8',
    );
    expect(content).toMatch(/name:\s*['"]L3-5\(B5\)\s*예방관리['"]/);
    expect(content).toMatch(/legacyName:\s*['"]B5['"]/);
  });

  it('FC 고장사슬 시트 headers에 N:1:N 필수 컬럼이 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      'src/app/(fmea-core)/pfmea/import/excel-template.ts',
      'utf-8',
    );
    // FC 고장사슬 시트의 headers에 N:1:N 구조 컬럼이 포함되어야 함
    const fcLine = content.split('\n').find(line =>
      line.includes("'FC 고장사슬'") && line.includes('headers'),
    );
    expect(fcLine).toBeDefined();
    expect(fcLine).toContain('FE구분');
    expect(fcLine).toContain('FE(고장영향)');
    expect(fcLine).toContain('FM(고장형태)');
    expect(fcLine).toContain('FC(고장원인)');
    expect(fcLine).toContain('WE(작업요소)');
    expect(fcLine).toContain('B5.예방관리');
    expect(fcLine).toContain('A6.검출관리');
  });

  it('FC 고장사슬 시트 headers = 12열 (v4.1 N:1:N: S제거, FE구분~AP)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      'src/app/(fmea-core)/pfmea/import/excel-template.ts',
      'utf-8',
    );
    const fcLine = content.split('\n').find(line =>
      line.includes("'FC 고장사슬'") && line.includes('headers'),
    );
    expect(fcLine).toBeDefined();
    // v4.1: FC 12열 N:1:N (FE구분, FE, 공정번호, FM, 4M, WE, FC, PC, DC, O, D, AP) — S 제거
    const headerMatch = fcLine!.match(/headers:\s*\[([^\]]+)\]/);
    expect(headerMatch).toBeTruthy();
    const headers = headerMatch![1].split(',').map(h => h.trim());
    expect(headers.length).toBe(12);
  });
});
