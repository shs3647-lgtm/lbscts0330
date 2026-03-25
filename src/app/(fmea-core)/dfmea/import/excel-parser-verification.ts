/**
 * @file excel-parser-verification.ts
 * @description 고장사슬 검증 모듈 — 원본 핑거프린트 vs 파싱 결과 대조
 * @created 2026-02-22
 *
 * ★ 핵심 원칙: 원본 스캔(1단계)은 파싱 로직과 완전히 독립
 *   - 파서 버그가 있어도 원본 스캔에 영향 없음
 *   - 셀 값만 직접 읽어서 카운트 (addIfNew, isValid 등 파서 함수 사용 안 함)
 *
 * 검증 지표:
 *   1. 공정별 고장형태(FM/A5) 고유 건수
 *   2. FM별 고장원인(FC/B4) 고유 건수
 *   3. FM별 고장영향(FE/C4) 고유 건수
 *   4. 총 고장사슬 행수 (FM+FC 모두 존재하는 행)
 */

import type ExcelJS from 'exceljs';
import type { MasterFailureChain } from './types/masterFailureChain';
import { getMergedCellValue } from '@/lib/excel-data-range';

// ─── Types ──────────────────────────────────────────────────────

/** 공정별 원본 핑거프린트 (직렬화 가능한 plain object) */
export interface RawFingerprintProcess {
  processNo: string;
  processName: string;
  fmCount: number;                      // 고유 FM 건수
  fcByFm: Record<string, number>;       // FM 텍스트 → 고유 FC 건수
  feByFm: Record<string, number>;       // FM 텍스트 → 고유 FE 건수
  chainRows: number;                    // FM+FC 모두 있는 행 수
}

/** ★★★ 2026-02-24: 엑셀 수식 기반 검증값 (VERIFY 시트에서 읽음) ★★★ */
export interface ExcelFormulaVerify {
  // Count 검증 (C1~C5)
  fmCount: number;      // FM_COUNT 수식 결과
  fcCount: number;      // FC_COUNT 수식 결과
  feCount: number;      // FE_COUNT 수식 결과
  chainCount: number;   // CHAIN_COUNT 수식 결과
  processCount: number; // PROCESS_COUNT 수식 결과
  // Consistency 검증 (S3, S4, S5) — 0이면 OK, >0이면 누락 있음
  s3Miss: number;       // 공정번호 누락 (FC→A1)
  s4Miss: number;       // FM 누락 (FC→A5)
  s5Miss: number;       // FC 누락 (FC→B4)
  hasVerifySheet: boolean; // VERIFY 시트 존재 여부
}

/** 원본 핑거프린트 전체 */
export interface RawFingerprint {
  processes: RawFingerprintProcess[];
  totalFM: number;
  totalFC: number;
  totalFE: number;
  totalChainRows: number;
  // ★★★ 2026-02-24: 엑셀 수식 검증값 (진정한 독립 기준) ★★★
  excelFormulas?: ExcelFormulaVerify;
}

/** 검증 불일치 항목 */
export interface VerificationMismatch {
  processNo: string;
  type: 'FM_COUNT' | 'FC_PER_FM' | 'FE_PER_FM' | 'CHAIN_COUNT';
  fmText?: string;                      // FC_PER_FM, FE_PER_FM일 때 해당 FM
  rawCount: number;
  parsedCount: number;
}

/** 검증 결과 */
export interface VerificationResult {
  pass: boolean;
  totalChecks: number;
  passedChecks: number;
  mismatches: VerificationMismatch[];
}

// ─── Constants ──────────────────────────────────────────────────

const MAX_SCAN_ROWS = 10000;
const MAX_SCAN_EMPTY = 50;

// ─── Raw Fingerprint Scanner ────────────────────────────────────

/**
 * 원본 엑셀 셀 스캔 — 파싱 로직과 완전히 독립
 *
 * 파서의 addIfNew, isValid, normalizeC1 등을 사용하지 않고
 * 순수하게 셀 값만 읽어서 공정별 FM/FC/FE 카운트를 수집한다.
 *
 * @param sheet - ExcelJS 워크시트
 * @param dataStartRow - 데이터 시작 행 번호
 * @param procCol - 공정번호 컬럼 (1-based)
 * @param a5Col - A5 고장형태 컬럼 (1-based), 0이면 스캔 안 함
 * @param b4Col - B4 고장원인 컬럼 (1-based), 0이면 스캔 안 함
 * @param c4Col - C4 고장영향 컬럼 (1-based), 0이면 스캔 안 함
 */
export function scanRawFingerprint(
  sheet: ExcelJS.Worksheet,
  dataStartRow: number,
  procCol: number,
  a5Col: number,
  b4Col: number,
  c4Col: number,
): RawFingerprint {
  // 공정별 내부 데이터 (Set 사용 → 직렬화 전)
  const processMap = new Map<string, {
    processName: string;
    fmSet: Set<string>;
    fcByFm: Map<string, Set<string>>;
    feByFm: Map<string, Set<string>>;
    chainRows: number;
  }>();

  // 스캐너 자체 Forward Fill 상태 (FC파서와 일관된 carry-forward)
  let ffProcStr = '';
  let ffProcNo = '';
  let ffA5 = '';
  let ffB4 = '';
  let ffC4 = '';

  let consecutiveEmpty = 0;
  const maxRow = Math.min(sheet.rowCount, dataStartRow + MAX_SCAN_ROWS - 1);

  for (let r = dataStartRow; r <= maxRow; r++) {
    // 셀 직접 읽기 (getMergedCellValue: 병합셀 자동 처리)
    const procRaw = procCol > 0 ? (getMergedCellValue(sheet, r, procCol) || '').trim() : '';
    const a5Raw = a5Col > 0 ? (getMergedCellValue(sheet, r, a5Col) || '').trim() : '';
    const b4Raw = b4Col > 0 ? (getMergedCellValue(sheet, r, b4Col) || '').trim() : '';
    const c4Raw = c4Col > 0 ? (getMergedCellValue(sheet, r, c4Col) || '').trim() : '';

    // Forward fill: 공정번호
    const procStr = procRaw || ffProcStr;
    if (procRaw) ffProcStr = procRaw;

    // 공정번호 추출 (예: "10번-자재입고" → "10")
    const procMatch = procStr.match(/^(\d+)/);
    const processNo = procMatch ? procMatch[1] : '';
    const processName = procStr.replace(/^\d+[-번]?\s*/, '').trim();

    if (!processNo) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= MAX_SCAN_EMPTY) break;
      continue;
    }
    consecutiveEmpty = 0;

    const normProcNo = (processNo === '0' || processNo === '00') ? '공통' : processNo;

    // 공정 변경 → forward fill 리셋 (FC파서와 동일)
    if (normProcNo !== ffProcNo) {
      ffProcNo = normProcNo;
      ffA5 = '';
      ffB4 = '';
      ffC4 = '';
    }

    // Forward fill: A5(FM), B4(FC), C4(FE) — FC파서와 동일하게 carry-forward
    const a5Val = (a5Raw && isScanValid(a5Raw)) ? a5Raw : ffA5;
    if (a5Raw && isScanValid(a5Raw)) ffA5 = a5Raw;
    const c4Val = (c4Raw && isScanValid(c4Raw)) ? c4Raw : ffC4;
    if (c4Raw && isScanValid(c4Raw)) ffC4 = c4Raw;
    const b4Val = (b4Raw && isScanValid(b4Raw)) ? b4Raw : ffB4;
    if (b4Raw && isScanValid(b4Raw)) ffB4 = b4Raw;

    // 유효 데이터 없으면 스킵
    if (!a5Val && !b4Val) continue;

    // 공정 엔트리 생성/조회
    if (!processMap.has(normProcNo)) {
      processMap.set(normProcNo, {
        processName,
        fmSet: new Set(),
        fcByFm: new Map(),
        feByFm: new Map(),
        chainRows: 0,
      });
    }
    const proc = processMap.get(normProcNo)!;
    if (!proc.processName && processName) proc.processName = processName;

    // FM(A5) 카운트
    if (a5Val) proc.fmSet.add(a5Val);

    // FC(B4) per FM 카운트
    if (a5Val && b4Val) {
      if (!proc.fcByFm.has(a5Val)) proc.fcByFm.set(a5Val, new Set());
      proc.fcByFm.get(a5Val)!.add(b4Val);
      proc.chainRows++;
    }

    // FE(C4) per FM 카운트
    if (a5Val && c4Val) {
      if (!proc.feByFm.has(a5Val)) proc.feByFm.set(a5Val, new Set());
      proc.feByFm.get(a5Val)!.add(c4Val);
    }
  }

  // Set/Map → plain object 직렬화
  const processes: RawFingerprintProcess[] = [];
  let totalFM = 0;
  let totalFC = 0;
  let totalFE = 0;
  let totalChainRows = 0;

  for (const [pNo, data] of processMap.entries()) {
    const fcByFm: Record<string, number> = {};
    let procFC = 0;
    for (const [fm, fcSet] of data.fcByFm.entries()) {
      fcByFm[fm] = fcSet.size;
      procFC += fcSet.size;
    }

    const feByFm: Record<string, number> = {};
    let procFE = 0;
    for (const [fm, feSet] of data.feByFm.entries()) {
      feByFm[fm] = feSet.size;
      procFE += feSet.size;
    }

    processes.push({
      processNo: pNo,
      processName: data.processName,
      fmCount: data.fmSet.size,
      fcByFm,
      feByFm,
      chainRows: data.chainRows,
    });

    totalFM += data.fmSet.size;
    totalFC += procFC;
    totalFE += procFE;
    totalChainRows += data.chainRows;
  }

  // 공정번호 정렬
  processes.sort((a, b) => (parseInt(a.processNo) || 0) - (parseInt(b.processNo) || 0));

  return { processes, totalFM, totalFC, totalFE, totalChainRows };
}

// ─── Parsed Fingerprint Builder ─────────────────────────────────

/**
 * 파싱된 고장사슬(chains)에서 핑거프린트 빌드 — 원본과 대조용
 */
function buildParsedFingerprint(
  chains: MasterFailureChain[],
): Map<string, { fmSet: Set<string>; fcByFm: Map<string, Set<string>>; feByFm: Map<string, Set<string>>; chainRows: number }> {
  const map = new Map<string, {
    fmSet: Set<string>;
    fcByFm: Map<string, Set<string>>;
    feByFm: Map<string, Set<string>>;
    chainRows: number;
  }>();

  for (const chain of chains) {
    const pNo = chain.processNo;
    if (!map.has(pNo)) {
      map.set(pNo, { fmSet: new Set(), fcByFm: new Map(), feByFm: new Map(), chainRows: 0 });
    }
    const entry = map.get(pNo)!;

    if (chain.fmValue) entry.fmSet.add(chain.fmValue);

    if (chain.fmValue && chain.fcValue) {
      if (!entry.fcByFm.has(chain.fmValue)) entry.fcByFm.set(chain.fmValue, new Set());
      entry.fcByFm.get(chain.fmValue)!.add(chain.fcValue);
      entry.chainRows++;
    }

    if (chain.fmValue && chain.feValue) {
      if (!entry.feByFm.has(chain.fmValue)) entry.feByFm.set(chain.fmValue, new Set());
      entry.feByFm.get(chain.fmValue)!.add(chain.feValue);
    }
  }

  return map;
}

// ─── Verification ───────────────────────────────────────────────

/**
 * 원본 핑거프린트 vs 파싱 결과 대조 검증
 *
 * 검증 항목:
 * 1. 공정별 FM(A5) 고유 건수
 * 2. FM별 FC(B4) 고유 건수
 * 3. FM별 FE(C4) 고유 건수
 * 4. 총 고장사슬 행수
 */
export function verifyParsing(
  raw: RawFingerprint,
  chains: MasterFailureChain[],
): VerificationResult {
  const mismatches: VerificationMismatch[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // 파싱된 체인에서 핑거프린트 빌드
  const parsedMap = buildParsedFingerprint(chains);

  for (const rawProc of raw.processes) {
    const parsedProc = parsedMap.get(rawProc.processNo);

    // 1. 공정별 FM 고유 건수
    totalChecks++;
    const parsedFM = parsedProc?.fmSet.size ?? 0;
    if (rawProc.fmCount !== parsedFM) {
      mismatches.push({
        processNo: rawProc.processNo,
        type: 'FM_COUNT',
        rawCount: rawProc.fmCount,
        parsedCount: parsedFM,
      });
    } else {
      passedChecks++;
    }

    // 2. FM별 FC 고유 건수
    for (const [fmText, rawFcCount] of Object.entries(rawProc.fcByFm)) {
      totalChecks++;
      const parsedFcSet = parsedProc?.fcByFm.get(fmText);
      const parsedFcCount = parsedFcSet?.size ?? 0;
      if (rawFcCount !== parsedFcCount) {
        mismatches.push({
          processNo: rawProc.processNo,
          type: 'FC_PER_FM',
          fmText,
          rawCount: rawFcCount,
          parsedCount: parsedFcCount,
        });
      } else {
        passedChecks++;
      }
    }

    // 3. FM별 FE 고유 건수
    for (const [fmText, rawFeCount] of Object.entries(rawProc.feByFm)) {
      totalChecks++;
      const parsedFeSet = parsedProc?.feByFm.get(fmText);
      const parsedFeCount = parsedFeSet?.size ?? 0;
      if (rawFeCount !== parsedFeCount) {
        mismatches.push({
          processNo: rawProc.processNo,
          type: 'FE_PER_FM',
          fmText,
          rawCount: rawFeCount,
          parsedCount: parsedFeCount,
        });
      } else {
        passedChecks++;
      }
    }

    // 4. 공정별 사슬 행수
    totalChecks++;
    const parsedChainRows = parsedProc?.chainRows ?? 0;
    if (rawProc.chainRows !== parsedChainRows) {
      mismatches.push({
        processNo: rawProc.processNo,
        type: 'CHAIN_COUNT',
        rawCount: rawProc.chainRows,
        parsedCount: parsedChainRows,
      });
    } else {
      passedChecks++;
    }
  }

  // 5. 총 사슬 행수
  totalChecks++;
  if (raw.totalChainRows !== chains.length) {
    mismatches.push({
      processNo: '전체',
      type: 'CHAIN_COUNT',
      rawCount: raw.totalChainRows,
      parsedCount: chains.length,
    });
  } else {
    passedChecks++;
  }

  return {
    pass: mismatches.length === 0,
    totalChecks,
    passedChecks,
    mismatches,
  };
}

// ─── Internal Helpers ───────────────────────────────────────────

/**
 * 스캐너 전용 유효성 검사 — 파서의 isValid()와 독립
 * placeholder/헤더 텍스트만 걸러내는 최소한의 검사
 */
function isScanValid(val: string): boolean {
  if (!val) return false;
  const t = val.trim();
  if (!t || t === '-' || t === 'null' || t === 'undefined') return false;
  if (t.includes('(필수)') || t.includes('(선택)')) return false;
  if (/^L[123]-\d/.test(t)) return false;
  if (t === '구분' || t === '4M' || t === 'NO') return false;
  return true;
}

// ─── VERIFY Sheet Reader ─────────────────────────────────────────

/**
 * ★★★ 2026-02-24: VERIFY 시트에서 엑셀 수식 결과값 읽기 ★★★
 * 
 * 이 값은 엑셀이 직접 계산한 값으로, 파서/스캐너와 완전히 독립적인 "진정한 기준"
 * - 파서 버그 → 이 값과 파싱 결과 불일치로 검출
 * - 스캐너 버그 → 이 값과 스캐너 결과 불일치로 검출
 * 
 * @param workbook - ExcelJS Workbook
 * @returns ExcelFormulaVerify | null (VERIFY 시트 없으면 null)
 */
export function readVerifySheet(workbook: ExcelJS.Workbook): ExcelFormulaVerify | null {
  const verifySheet = workbook.getWorksheet('VERIFY');
  if (!verifySheet) {
    return null;
  }

  const result: ExcelFormulaVerify = {
    fmCount: 0,
    fcCount: 0,
    feCount: 0,
    chainCount: 0,
    processCount: 0,
    s3Miss: 0,
    s4Miss: 0,
    s5Miss: 0,
    hasVerifySheet: true,
  };

  // VERIFY 시트 구조: A열=항목명, B열=수식결과값
  // 2행부터 데이터 (1행=헤더), Count 5개 + Consistency 3개 = 최대 12행
  for (let r = 2; r <= 15; r++) {
    const itemName = (verifySheet.getCell(r, 1).value?.toString() || '').trim();
    const cellValue = verifySheet.getCell(r, 2).value;
    
    // 수식 결과값 추출 (수식 셀이면 result, 아니면 직접 값)
    let numValue = 0;
    if (cellValue !== null && cellValue !== undefined) {
      if (typeof cellValue === 'object' && 'result' in cellValue) {
        // 수식 셀의 계산 결과
        numValue = Number(cellValue.result) || 0;
      } else {
        numValue = Number(cellValue) || 0;
      }
    }

    switch (itemName) {
      // Count 검증
      case 'FM_COUNT':
        result.fmCount = numValue;
        break;
      case 'FC_COUNT':
        result.fcCount = numValue;
        break;
      case 'FE_COUNT':
        result.feCount = numValue;
        break;
      case 'CHAIN_COUNT':
        result.chainCount = numValue;
        break;
      case 'PROCESS_COUNT':
        result.processCount = numValue;
        break;
      // Consistency 검증 (0=OK, >0=누락)
      case 'S3_MISS':
        result.s3Miss = numValue;
        break;
      case 'S4_MISS':
        result.s4Miss = numValue;
        break;
      case 'S5_MISS':
        result.s5Miss = numValue;
        break;
    }
  }

  return result;
}

/**
 * ★★★ 2026-02-24: 3중 검증 — 엑셀수식 vs 스캐너 vs 파서 ★★★
 * 
 * 검증 계층:
 * 1. 엑셀 수식 (진정한 기준, 외부 도구)
 * 2. 스캐너 (독립 스캔)
 * 3. 파서 (실제 파싱 결과)
 * 
 * 불일치 시나리오:
 * - 엑셀 ≠ 스캐너: 스캐너 버그
 * - 엑셀 ≠ 파서: 파서 버그
 * - 스캐너 ≠ 파서 (엑셀=스캐너): 파서 버그
 * - 스캐너 ≠ 파서 (엑셀=파서): 스캐너 버그
 */
export interface TripleVerificationResult {
  pass: boolean;
  excelVsScanner: { pass: boolean; issues: string[] };
  excelVsParser: { pass: boolean; issues: string[] };
  scannerVsParser: { pass: boolean; issues: string[] };
  summary: string;
}

export function tripleVerify(
  excelFormulas: ExcelFormulaVerify | null,
  scannerResult: RawFingerprint,
  parserChainCount: number,
  parserFmUnique: number,
  parserFcUnique: number,
  parserFeUnique: number,
): TripleVerificationResult {
  const excelVsScanner: { pass: boolean; issues: string[] } = { pass: true, issues: [] };
  const excelVsParser: { pass: boolean; issues: string[] } = { pass: true, issues: [] };
  const scannerVsParser: { pass: boolean; issues: string[] } = { pass: true, issues: [] };

  // 1. 엑셀 수식 vs 스캐너
  if (excelFormulas && excelFormulas.hasVerifySheet) {
    if (excelFormulas.fmCount !== scannerResult.totalFM) {
      excelVsScanner.pass = false;
      excelVsScanner.issues.push(`FM: 엑셀=${excelFormulas.fmCount}, 스캐너=${scannerResult.totalFM}`);
    }
    if (excelFormulas.fcCount !== scannerResult.totalFC) {
      excelVsScanner.pass = false;
      excelVsScanner.issues.push(`FC: 엑셀=${excelFormulas.fcCount}, 스캐너=${scannerResult.totalFC}`);
    }
    if (excelFormulas.feCount !== scannerResult.totalFE) {
      excelVsScanner.pass = false;
      excelVsScanner.issues.push(`FE: 엑셀=${excelFormulas.feCount}, 스캐너=${scannerResult.totalFE}`);
    }
    if (excelFormulas.chainCount !== scannerResult.totalChainRows) {
      excelVsScanner.pass = false;
      excelVsScanner.issues.push(`Chain: 엑셀=${excelFormulas.chainCount}, 스캐너=${scannerResult.totalChainRows}`);
    }

    // 2. 엑셀 수식 vs 파서
    if (excelFormulas.fmCount !== parserFmUnique) {
      excelVsParser.pass = false;
      excelVsParser.issues.push(`FM: 엑셀=${excelFormulas.fmCount}, 파서=${parserFmUnique}`);
    }
    if (excelFormulas.fcCount !== parserFcUnique) {
      excelVsParser.pass = false;
      excelVsParser.issues.push(`FC: 엑셀=${excelFormulas.fcCount}, 파서=${parserFcUnique}`);
    }
    if (excelFormulas.feCount !== parserFeUnique) {
      excelVsParser.pass = false;
      excelVsParser.issues.push(`FE: 엑셀=${excelFormulas.feCount}, 파서=${parserFeUnique}`);
    }
    if (excelFormulas.chainCount !== parserChainCount) {
      excelVsParser.pass = false;
      excelVsParser.issues.push(`Chain: 엑셀=${excelFormulas.chainCount}, 파서=${parserChainCount}`);
    }
  }

  // 3. 스캐너 vs 파서
  if (scannerResult.totalFM !== parserFmUnique) {
    scannerVsParser.pass = false;
    scannerVsParser.issues.push(`FM: 스캐너=${scannerResult.totalFM}, 파서=${parserFmUnique}`);
  }
  if (scannerResult.totalFC !== parserFcUnique) {
    scannerVsParser.pass = false;
    scannerVsParser.issues.push(`FC: 스캐너=${scannerResult.totalFC}, 파서=${parserFcUnique}`);
  }
  if (scannerResult.totalFE !== parserFeUnique) {
    scannerVsParser.pass = false;
    scannerVsParser.issues.push(`FE: 스캐너=${scannerResult.totalFE}, 파서=${parserFeUnique}`);
  }
  if (scannerResult.totalChainRows !== parserChainCount) {
    scannerVsParser.pass = false;
    scannerVsParser.issues.push(`Chain: 스캐너=${scannerResult.totalChainRows}, 파서=${parserChainCount}`);
  }

  const allPass = excelVsScanner.pass && excelVsParser.pass && scannerVsParser.pass;
  
  let summary = '';
  if (allPass) {
    summary = '✅ 3중 검증 통과: 엑셀수식 = 스캐너 = 파서';
  } else {
    const parts: string[] = [];
    if (!excelVsScanner.pass) parts.push('엑셀≠스캐너(스캐너버그?)');
    if (!excelVsParser.pass) parts.push('엑셀≠파서(파서버그?)');
    if (!scannerVsParser.pass && excelVsScanner.pass) parts.push('스캐너≠파서(파서버그)');
    summary = `❌ 검증 실패: ${parts.join(', ')}`;
  }

  return {
    pass: allPass,
    excelVsScanner,
    excelVsParser,
    scannerVsParser,
    summary,
  };
}
