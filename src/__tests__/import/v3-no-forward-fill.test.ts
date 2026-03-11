/**
 * @file v3-no-forward-fill.test.ts
 * @description TDD: v3.0 Forward-Fill 완전 제거 검증
 *
 * v3.0 핵심 변경: excel-parser-single-sheet.ts에서 Forward-Fill 완전 제거
 * - `ff` 객체 (carry-forward 상태) 제거
 * - `applyForwardFill()` 함수 제거
 * - 빈 셀에 이전 행 값을 채우는 로직 완전 제거
 * - 병합셀 참조(getMergedCellValue)는 유지
 *
 * Forward-Fill이란: 빈 셀이면 이전 행의 값을 복사하여 채우는 패턴
 * 병합셀 참조란: 엑셀 병합된 셀 범위에서 원본 값을 읽는 패턴 (유지해야 함)
 *
 * @created 2026-02-28
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PARSER_PATH = path.resolve(
  __dirname,
  '../../app/(fmea-core)/pfmea/import/excel-parser-single-sheet.ts'
);

// ── 소스 코드 레벨 검증 (Forward-Fill 코드 패턴 부재 확인) ──

describe('v3.0 TODO-7: Forward-Fill 소스 코드 제거 검증', () => {
  let source: string;

  // 소스 파일 읽기
  source = fs.readFileSync(PARSER_PATH, 'utf-8');

  it('applyForwardFill 함수가 소스에 존재하지 않아야 함', () => {
    expect(source).not.toContain('applyForwardFill');
  });

  it('ff 객체 선언(carry-forward 상태)이 소스에 존재하지 않아야 함', () => {
    // ff = { procStr: '', struct4M: '', ... } 패턴
    expect(source).not.toMatch(/const\s+ff\s*=\s*\{/);
  });

  it('ff[key] 패턴(forward-fill 읽기)이 소스에 존재하지 않아야 함', () => {
    // ff[key] = ... 또는 vals[role] = ff[key] 패턴
    expect(source).not.toMatch(/ff\[/);
  });

  it('Forward-Fill 주석이 제거되어야 함', () => {
    // "Forward fill 상태" 또는 "Forward fill 적용" 주석
    expect(source).not.toMatch(/[Ff]orward[- ][Ff]ill\s*(상태|적용)/);
  });

  it('병합셀 참조(getMergedCellValue)는 유지되어야 함', () => {
    expect(source).toContain('getMergedCellValue');
  });

  it('chain 레벨 forward-fill 변수(chainA5, chainC4, chainSeverity)가 제거되어야 함', () => {
    // 이것들은 빈 셀에 이전 행 값을 채우는 forward-fill 패턴
    expect(source).not.toMatch(/let\s+chainA5\s*=/);
    expect(source).not.toMatch(/let\s+chainC4\s*=/);
    expect(source).not.toMatch(/let\s+chainSeverity\s*=/);
    expect(source).not.toMatch(/let\s+chainProcNo\s*=/);
  });

  it('curFM/curFE 변수(chain forward-fill 사용)가 제거되어야 함', () => {
    expect(source).not.toMatch(/const\s+curFM\s*=/);
    expect(source).not.toMatch(/const\s+curFE\s*=/);
    expect(source).not.toMatch(/const\s+curSev\s*=/);
  });
});

// ── 모듈 export 레벨 검증 ──

describe('v3.0 TODO-7: export 검증 — applyForwardFill 미노출', () => {

  it('모듈에서 applyForwardFill이 export되지 않아야 함', async () => {
    const mod = await import('@/app/(fmea-core)/pfmea/import/excel-parser-single-sheet');
    expect('applyForwardFill' in mod).toBe(false);
  });

  it('parseSingleSheetFmea 함수는 여전히 export되어야 함', async () => {
    const mod = await import('@/app/(fmea-core)/pfmea/import/excel-parser-single-sheet');
    expect(typeof mod.parseSingleSheetFmea).toBe('function');
  });

  it('isSingleSheetFmea 함수는 여전히 export되어야 함', async () => {
    const mod = await import('@/app/(fmea-core)/pfmea/import/excel-parser-single-sheet');
    expect(typeof mod.isSingleSheetFmea).toBe('function');
  });

  it('isStepASheet 함수는 여전히 export되어야 함', async () => {
    const mod = await import('@/app/(fmea-core)/pfmea/import/excel-parser-single-sheet');
    expect(typeof mod.isStepASheet).toBe('function');
  });
});
