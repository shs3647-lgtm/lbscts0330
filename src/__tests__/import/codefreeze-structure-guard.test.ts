/**
 * @file codefreeze-structure-guard.test.ts
 * @description CODEFREEZE 구조 보호 테스트 — 보호 대상 파일의 핵심 인터페이스/함수 시그니처 검증
 *
 * 목적: 코드프리즈된 파일의 핵심 구조가 변경되면 즉시 감지
 * 대상: excel-parser-fc.ts, excel-parser.ts, excel-parser-single-sheet.ts,
 *       masterFailureChain.ts, failureChainInjector.ts, excel-template.ts
 *
 * @created 2026-02-28
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

const BASE = 'src/app/(fmea-core)/pfmea/import';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. excel-parser-fc.ts — FC 시트 파서 (핵심 11열 구조)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('CODEFREEZE Guard: excel-parser-fc.ts', () => {
  const filePath = `${BASE}/excel-parser-fc.ts`;
  let content: string;

  it('파일이 존재해야 함', () => {
    content = fs.readFileSync(filePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('핵심 export 함수: findFCSheet 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+findFCSheet/);
  });

  it('핵심 export 함수: detectColumnMap 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+detectColumnMap/);
  });

  it('핵심 export 함수: parseFCSheet 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+parseFCSheet/);
  });

  it('FCColumnMap에 11열 필수 필드 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    const interfaceBlock = content.match(/interface\s+FCColumnMap\s*\{([\s\S]+?)\}/);
    expect(interfaceBlock).toBeTruthy();
    const body = interfaceBlock![1];
    // 9열: processNo, m4, fcValue, fmValue, feValue, severity, occurrence, detection, ap
    expect(body).toMatch(/processNo\s*:/);
    expect(body).toMatch(/m4\s*:/);
    expect(body).toMatch(/fcValue\s*:/);
    expect(body).toMatch(/fmValue\s*:/);
    expect(body).toMatch(/feValue\s*:/);
    expect(body).toMatch(/severity\s*:/);
    expect(body).toMatch(/occurrence\s*:/);
    expect(body).toMatch(/detection\s*:/);
    expect(body).toMatch(/ap\s*:/);
  });

  it('v3.1.1: pcValue/dcValue 필드가 있어야 함 (9열→11열 복원)', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    const interfaceBlock = content.match(/interface\s+FCColumnMap\s*\{([\s\S]+?)\}/);
    expect(interfaceBlock).toBeTruthy();
    expect(interfaceBlock![1]).toMatch(/pcValue\s*:/);
    expect(interfaceBlock![1]).toMatch(/dcValue\s*:/);
  });

  it('parseFCSheet 반환 타입이 MasterFailureChain[]이어야 함', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/parseFCSheet[\s\S]*?:\s*MasterFailureChain\[\]/);
  });

  it('병합셀 carry-forward 로직 존재 (fmMergeSpan/feMergeSpan)', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/fmMergeSpan/);
    expect(content).toMatch(/feMergeSpan/);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. masterFailureChain.ts — 타입 + buildFailureChainsFromFlat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('CODEFREEZE Guard: masterFailureChain.ts', () => {
  const filePath = `${BASE}/types/masterFailureChain.ts`;
  let content: string;

  it('파일이 존재해야 함', () => {
    content = fs.readFileSync(filePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('MasterFailureChain 인터페이스 export 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+interface\s+MasterFailureChain/);
  });

  it('MasterFailureChain 핵심 필드: processNo, feValue, fmValue, fcValue', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    const block = content.match(/export\s+interface\s+MasterFailureChain\s*\{([\s\S]+?)\n\}/);
    expect(block).toBeTruthy();
    const body = block![1];
    expect(body).toMatch(/processNo\s*:\s*string/);
    expect(body).toMatch(/feValue\s*:\s*string/);
    expect(body).toMatch(/fmValue\s*:\s*string/);
    expect(body).toMatch(/fcValue\s*:\s*string/);
  });

  it('MasterFailureChain SOD/AP 필드 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    const block = content.match(/export\s+interface\s+MasterFailureChain\s*\{([\s\S]+?)\n\}/);
    expect(block).toBeTruthy();
    const body = block![1];
    expect(body).toMatch(/severity\?\s*:\s*number/);
    expect(body).toMatch(/occurrence\?\s*:\s*number/);
    expect(body).toMatch(/detection\?\s*:\s*number/);
    expect(body).toMatch(/ap\?\s*:\s*string/);
  });

  it('v3.1.1: pcValue/dcValue 복원됨', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    const block = content.match(/export\s+interface\s+MasterFailureChain\s*\{([\s\S]+?)\n\}/);
    expect(block).toBeTruthy();
    const body = block![1];
    // pcValue/dcValue 필드가 존재해야 함
    expect(body).toMatch(/^\s+pcValue\?\s*:\s*string/m);
    expect(body).toMatch(/^\s+dcValue\?\s*:\s*string/m);
  });

  it('excelRow, fmMergeSpan, feMergeSpan 위치/병합 필드 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    const block = content.match(/export\s+interface\s+MasterFailureChain\s*\{([\s\S]+?)\n\}/);
    expect(block).toBeTruthy();
    const body = block![1];
    expect(body).toMatch(/excelRow\?\s*:\s*number/);
    expect(body).toMatch(/fmMergeSpan\?\s*:\s*number/);
    expect(body).toMatch(/feMergeSpan\?\s*:\s*number/);
  });

  it('buildFailureChainsFromFlat export 함수 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+buildFailureChainsFromFlat/);
  });

  it('calculateAP export 함수 존재 (masterFailureChain.ts)', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+calculateAP/);
  });

  it('buildFailureChainsFromFlat — 카테시안 곱 없음 (사실기반 행 매칭)', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    // "카테시안 곱 제거" 또는 "사실기반" 주석 존재
    expect(content).toMatch(/카테시안\s*곱\s*제거|사실기반/);
    // excelRow 기반 매칭 로직 존재
    expect(content).toMatch(/excelRow/);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. failureChainInjector.ts — 텍스트 매칭 + seq/path
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('CODEFREEZE Guard: failureChainInjector.ts', () => {
  const filePath = `${BASE}/utils/failureChainInjector.ts`;
  let content: string;

  it('파일이 존재해야 함', () => {
    content = fs.readFileSync(filePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('FailureLinkEntry 인터페이스 export 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+interface\s+FailureLinkEntry/);
  });

  it('FailureLinkEntry — 핵심 ID 필드: fmId, feId, fcId', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    const block = content.match(/export\s+interface\s+FailureLinkEntry\s*\{([\s\S]+?)\n\}/);
    expect(block).toBeTruthy();
    const body = block![1];
    expect(body).toMatch(/fmId\s*:\s*string/);
    expect(body).toMatch(/feId\s*:\s*string/);
    expect(body).toMatch(/fcId\s*:\s*string/);
  });

  it('FailureLinkEntry — seq/path 필드 (P5 해결)', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    const block = content.match(/export\s+interface\s+FailureLinkEntry\s*\{([\s\S]+?)\n\}/);
    expect(block).toBeTruthy();
    const body = block![1];
    expect(body).toMatch(/fmSeq\?\s*:\s*number/);
    expect(body).toMatch(/feSeq\?\s*:\s*number/);
    expect(body).toMatch(/fcSeq\?\s*:\s*number/);
    expect(body).toMatch(/fmPath\?\s*:\s*string/);
    expect(body).toMatch(/fePath\?\s*:\s*string/);
    expect(body).toMatch(/fcPath\?\s*:\s*string/);
  });

  it('FailureLinkEntry — 텍스트 필드: fmText, feText, fcText', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    const block = content.match(/export\s+interface\s+FailureLinkEntry\s*\{([\s\S]+?)\n\}/);
    expect(block).toBeTruthy();
    const body = block![1];
    expect(body).toMatch(/fmText\?\s*:\s*string/);
    expect(body).toMatch(/feText\?\s*:\s*string/);
    expect(body).toMatch(/fcText\?\s*:\s*string/);
  });

  it('InjectionResult 인터페이스 export 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+interface\s+InjectionResult/);
  });

  it('injectFailureChains export 함수 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+function\s+injectFailureChains/);
  });

  it('공정번호 정규화 (normalizeProcessNo) — "번" 접미사 제거 지원', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    // "번" 접미사 제거 로직 (STEP A "20번" → "20")
    expect(content).toMatch(/번\$/);
  });

  it('normalizeProcessNo 내부 함수 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/function\s+normalizeProcessNo/);
  });

  it('computeSeqFields 내부 함수 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/function\s+computeSeqFields/);
  });

  it('자동 생성 함수 제거됨 (원자성 DB 매칭 전용)', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    // 2026-03-01: createFE/FM/FC 자동생성 → 전면 제거 (원자성 DB 매칭만)
    expect(content).not.toMatch(/function\s+createFE/);
    expect(content).not.toMatch(/function\s+createFM/);
    expect(content).not.toMatch(/function\s+createFC/);
  });

  it('2차 패스 제거됨 (카테시안 초과 링크 방지)', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    // "2차 패스 전면 제거" 주석 존재 (과거 코드의 의도적 제거)
    expect(content).toMatch(/2차\s*패스\s*전면\s*제거|2차\s*패스.*제거/);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. excel-template.ts — 15시트 + FC 11열 템플릿
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('CODEFREEZE Guard: excel-template.ts', () => {
  const filePath = `${BASE}/excel-template.ts`;
  let content: string;

  it('파일이 존재해야 함', () => {
    content = fs.readFileSync(filePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('SHEET_DEFINITIONS 상수 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/SHEET_DEFINITIONS/);
  });

  it('FC 시트 정의에 11열 헤더 포함', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    // FC 시트 헤더: 공정번호, 4M, B4, A5, C4, S, O, D, AP
    expect(content).toMatch(/고장사슬|FC/);
    expect(content).toMatch(/공정번호/);
    expect(content).toMatch(/4M/);
    expect(content).toMatch(/B4/);
    expect(content).toMatch(/A5/);
    expect(content).toMatch(/C4/);
  });

  it('downloadEmptyTemplate export 함수 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+(async\s+)?function\s+downloadEmptyTemplate/);
  });

  it('v3.0: B5(예방관리)/A6(검출관리) 시트가 제거됨', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    // SHEET_DEFINITIONS에 A6/B5 시트가 없어야 함
    // legacyName: 'A6' 또는 legacyName: 'B5'가 없어야 함
    expect(content).not.toMatch(/legacyName:\s*['"]A6['"]/);
    expect(content).not.toMatch(/legacyName:\s*['"]B5['"]/);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. excel-parser.ts — 멀티시트 파서 (STEP A)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('CODEFREEZE Guard: excel-parser.ts', () => {
  const filePath = `${BASE}/excel-parser.ts`;
  let content: string;

  it('파일이 존재해야 함', () => {
    content = fs.readFileSync(filePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('parseMultiSheetExcel 함수 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/function\s+parseMultiSheetExcel|parseMultiSheetExcel/);
  });

  it('v3.0: A6/B5 시트 파싱이 제거됨', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    // A6(검출관리) 관련 파싱 로직이 없어야 함
    expect(content).not.toMatch(/itemCode\s*[:=]\s*['"]A6['"]/);
    expect(content).not.toMatch(/itemCode\s*[:=]\s*['"]B5['"]/);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. excel-parser-single-sheet.ts — 단일시트 파서
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('CODEFREEZE Guard: excel-parser-single-sheet.ts', () => {
  const filePath = `${BASE}/excel-parser-single-sheet.ts`;
  let content: string;

  it('파일이 존재해야 함', () => {
    content = fs.readFileSync(filePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('isSingleSheetFmea 함수 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/function\s+isSingleSheetFmea|isSingleSheetFmea/);
  });

  it('isStepASheet 함수 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/function\s+isStepASheet|isStepASheet/);
  });

  it('parseSingleSheetFmea 함수 존재', () => {
    content = content || fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/function\s+parseSingleSheetFmea|parseSingleSheetFmea/);
  });
});
