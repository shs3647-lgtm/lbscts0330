/**
 * @file excel-parser-fc.ts
 * @description FC_고장사슬 시트 파서 — 헤더 기반 자동 컬럼 감지
 * @created 2026-02-22
 * @updated 2026-02-22 — 구형식(13열) + SHEET_DEFINITIONS(11열) 모두 지원
 * @updated 2026-02-24 — 공정번호 정제 + FE scope 자동 추출
 * @updated 2026-02-28 — v3.1.1: PC/DC 컬럼 파싱 복원 (9열→11열)
 *
 * ★ 두 가지 FC 시트 형식 지원:
 *
 * [구형식 13열] — 단일시트 STEP B에서 변환한 구조 (ID열 포함)
 *   ID, 공정번호, 4M, 작업요소, FE구분, 고장영향, 고장형태, 고장원인, S, O, D, AP, 특별특성
 *
 * [v3.1.1 SHEET_DEFINITIONS 11열] — excel-template.ts 표준 (ID열 없음)
 *   공정번호, 4M, 고장원인(B4), 고장형태(A5), 고장영향(C4), 예방관리(B5), 검출관리(A6), S, O, D, AP
 *
 * ★ 헤더 텍스트를 읽어서 어떤 형식인지 자동 감지 → 컬럼 매핑
 */

import type ExcelJS from 'exceljs';
import { cellValueToString } from './excel-parser-utils';
import { getMergedCellValue, getMergeSpan } from '@/lib/excel-data-range';
import type { MasterFailureChain } from './types/masterFailureChain';

// ─── 공정번호 정제 ───

/**
 * ★★★ 2026-02-24: 공정번호 정제 — 잘못 파싱된 공정번호 수정 ★★★
 * 
 * 문제: "140F04_이음발생"이 공정번호 열에 들어가면 "14004"로 인식됨
 * 해결: 선행 숫자만 추출, 또는 "XX번" 패턴에서 번호만 추출
 * 
 * 예시:
 *   "140F04" → "140" (선행 숫자만)
 *   "10번F01" → "10" (선행 숫자만)
 *   "공정140" → "140" (접두사 제거 + 숫자)
 *   "Process 10" → "10"
 *   "010" → "10" (선행 0 제거 — 파싱 단계부터 정규화)
 */
function sanitizeProcessNo(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();

  // 접두사 제거 (공정, Process, P 등)
  s = s.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');

  // ★★★ 2026-03-01: "번" 접미사 제거 (STEP A 형식 "20번" → "20") ★★★
  s = s.replace(/번$/, '');

  // "XX번YYY" 패턴에서 XX만 추출 (예: "140F04" → "140")
  // 선행 숫자가 있으면 숫자만 추출
  const leadingNumMatch = s.match(/^(\d+)/);
  if (leadingNumMatch) {
    let num = leadingNumMatch[1];
    // ★★★ 2026-03-01: 선행 0 제거 (단, "0" 자체는 유지) ★★★
    // "010" → "10", "020" → "20", "0" → "0"
    num = num.replace(/^0+(?=\d)/, '');
    return num;
  }

  // 숫자가 없으면 원본 반환
  return s;
}

// ─── FC 시트 감지 ───

const FC_SHEET_PATTERNS = [
  /^fc[_\s-]*고장사슬$/i,
  /^fc[_\s-]*failurechain/i,
  /^fc$/i,
  /^고장사슬$/,
  /고장사슬/i,           // "고장사슬" 포함하면 매칭
  /failurechain/i,      // "FailureChain" 포함하면 매칭
  /^step\s*b$/i,        // "STEP B" 시트도 FC 데이터일 수 있음
  /fc\s*고장/i,         // "FC 고장", "FC고장" 등
  /^fc\s/i,             // "FC "로 시작
];

/** 워크북에서 FC_고장사슬 시트를 찾음 (없으면 null) */
export function findFCSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet | null {
  let found: ExcelJS.Worksheet | null = null;
  const sheetNames: string[] = [];
  workbook.eachSheet((sheet) => {
    sheetNames.push(sheet.name);
    if (found) return;
    const name = sheet.name.trim();
    if (FC_SHEET_PATTERNS.some(p => p.test(name))) {
      found = sheet;
    }
  });
  
  // ★ 2026-02-24: 디버깅용 로그
  if (found !== null) {
  } else {
  }
  
  return found;
}

// ─── 컬럼 매핑 ───

interface FCColumnMap {
  processNo: number;
  m4: number;
  fcValue: number;   // B4 고장원인
  fmValue: number;   // A5 고장형태
  feValue: number;   // C4 고장영향
  pcValue: number;   // B5 예방관리
  dcValue: number;   // A6 검출관리
  workElement: number;
  feScope: number;
  productChar: number;  // A4 제품특성
  processChar: number;  // B3 공정특성
  l2Function: number;   // A3 공정기능
  l3Function: number;   // B2 요소기능
  severity: number;
  occurrence: number;
  detection: number;
  ap: number;
  specialChar: number;
}

/** 헤더 키워드 → 필드 매핑 */
const HEADER_PATTERNS: { field: keyof FCColumnMap; patterns: RegExp[] }[] = [
  { field: 'processNo', patterns: [/공정[번no]*호?/i, /process/i, /L2-1/i] },
  { field: 'm4', patterns: [/^4M$/i] },
  { field: 'fcValue', patterns: [/고장원인/i, /B4/i, /failure\s*cause/i, /^FC$/i] },
  { field: 'fmValue', patterns: [/고장형태/i, /A5/i, /failure\s*mode/i, /^FM$/i] },
  { field: 'feValue', patterns: [/고장영향/i, /C4/i, /failure\s*effect/i, /^FE$/i] },
  { field: 'pcValue', patterns: [/예방관리/i, /B5/i, /prevention/i, /^PC$/i] },
  { field: 'dcValue', patterns: [/검출관리/i, /A6/i, /detection\s*control/i, /^DC$/i] },
  { field: 'workElement', patterns: [/작업요소/i, /B1/i, /work.*element/i] },
  { field: 'feScope', patterns: [/FE구분/i, /구분.*FE/i, /^구분$/] },
  { field: 'severity', patterns: [/^S$/i, /심각도/i, /severity/i] },
  { field: 'occurrence', patterns: [/^O$/i, /발생도/i, /occurrence/i] },
  { field: 'detection', patterns: [/^D$/i, /검출도/i, /^detection$/i] },
  { field: 'ap', patterns: [/^AP$/i, /action.*priority/i] },
  { field: 'productChar', patterns: [/제품특성/i, /A4/i, /product.*char/i] },
  { field: 'processChar', patterns: [/공정특성/i, /B3/i, /process.*char/i] },
  { field: 'l2Function', patterns: [/공정기능/i, /A3/i, /process.*func/i] },
  { field: 'l3Function', patterns: [/요소기능/i, /B2/i, /element.*func/i] },
  { field: 'specialChar', patterns: [/특별특성/i, /special.*char/i, /^SC$/i] },
];

/** 헤더 행에서 컬럼 위치를 자동 감지 */
export function detectColumnMap(sheet: ExcelJS.Worksheet): { headerRow: number; colMap: FCColumnMap } {
  const colMap: FCColumnMap = {
    processNo: 0, m4: 0, fcValue: 0, fmValue: 0, feValue: 0,
    pcValue: 0, dcValue: 0,
    workElement: 0, feScope: 0,
    productChar: 0, processChar: 0, l2Function: 0, l3Function: 0,
    severity: 0, occurrence: 0, detection: 0, ap: 0, specialChar: 0,
  };

  // 1~5행에서 헤더 탐색 (columnCount가 0일 수 있으므로 고정값 25 사용)
  const maxRow = Math.max(5, sheet.rowCount > 0 ? Math.min(5, sheet.rowCount) : 5);
  for (let r = 1; r <= maxRow; r++) {
    const row = sheet.getRow(r);
    let matchCount = 0;

    for (let c = 1; c <= 25; c++) {
      const text = cellValueToString(row.getCell(c).value).trim();
      if (!text) continue;

      for (const { field, patterns } of HEADER_PATTERNS) {
        if (colMap[field] > 0) continue; // 이미 매핑됨
        if (patterns.some(p => p.test(text))) {
          colMap[field] = c;
          matchCount++;
          break;
        }
      }
    }

    // 최소 3개 필드 매칭 시 헤더 행으로 확정
    if (matchCount >= 3) {
      return { headerRow: r, colMap };
    }

    // 리셋 후 다음 행 시도
    Object.keys(colMap).forEach(k => { (colMap as unknown as Record<string, number>)[k] = 0; });
  }

  // 감지 실패 → 구형식(13열) 기본값
  return {
    headerRow: 1,
    colMap: {
      processNo: 2, m4: 3, workElement: 4, feScope: 5, feValue: 6,
      fmValue: 7, fcValue: 8, severity: 9, occurrence: 10, detection: 11,
      ap: 12, specialChar: 13,
      pcValue: 0, dcValue: 0,
      productChar: 0, processChar: 0, l2Function: 0, l3Function: 0,
    },
  };
}

// ─── FC 시트 파싱 ───

/**
 * FC_고장사슬 시트를 파싱하여 MasterFailureChain[] 반환
 *
 * ★ 2026-02-06: 병합셀(merged cells) carry-forward 지원
 *   엑셀에서 processNo/fmValue/feValue/feScope 등이 병합되면
 *   ExcelJS는 마스터 셀에만 값을 반환하고 나머지는 null.
 *   → 이전 행의 값을 유지(carry-forward)하여 모든 행에 완전한 데이터 보장
 */
export function parseFCSheet(sheet: ExcelJS.Worksheet): MasterFailureChain[] {
  const chains: MasterFailureChain[] = [];

  const { headerRow, colMap } = detectColumnMap(sheet);


  // ★★★ 2026-02-05 FIX: 병합셀을 getMergedCellValue로 정확히 읽기 ★★★
  function getCol(row: ExcelJS.Row, col: number): string {
    if (col <= 0) return '';
    return getMergedCellValue(sheet, row.number, col);
  }

  // ★ carry-forward 상태 (병합셀 지원)
  let cfProcessNo = '';
  let cfFmValue = '';
  let cfFcValue = '';   // ★★★ 2026-02-05 FIX: fcValue carry-forward 추가 ★★★
  let cfFeValue = '';
  let cfFeScope = '';
  let cfProductChar = '';
  let cfM4 = '';
  let cfWorkElement = '';
  let cfL2Function = '';
  let cfPcValue = '';    // ★★★ 2026-03-02: PC(예방관리) carry-forward 추가 ★★★
  let cfDcValue = '';    // ★★★ 2026-03-02: DC(검출관리) carry-forward 추가 ★★★
  let cfSeverity = '';   // ★★★ 2026-03-02: S(심각도) carry-forward — FM 그룹 내 동일 S 보장 ★★★

  // ★★★ 2026-02-28: 병합 span carry-forward (P1 해결) ★★★
  let cfFmMergeSpan = 1;
  let cfFeMergeSpan = 1;

  let consecutiveEmpty = 0;
  let totalSkipped = 0;
  let earlyTerminated = false;
  
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    let processNo = getCol(row, colMap.processNo);
    let fcValue = getCol(row, colMap.fcValue);
    let fmValue = getCol(row, colMap.fmValue);

    // 빈 행 감지 (processNo + FC + FM 모두 비어있고, carry-forward도 불가)
    if (!processNo && !fcValue && !fmValue) {
      consecutiveEmpty++;
      totalSkipped++;
      if (consecutiveEmpty >= 50) {
        earlyTerminated = true;
        break;
      }
      continue;
    }
    consecutiveEmpty = 0;

    // ★ carry-forward 적용 (병합셀 처리)
    if (processNo) {
      processNo = sanitizeProcessNo(processNo);
      // 공정 변경 시 FM/FC carry-forward 리셋 (다른 공정 데이터 오염 방지)
      if (cfProcessNo && processNo !== cfProcessNo) {
        cfFmValue = '';
        cfFcValue = '';
        cfFeValue = '';
        cfFeScope = '';
        cfM4 = '';
        cfWorkElement = '';
        cfProductChar = '';
        cfL2Function = '';
        cfPcValue = '';   // ★ 공정 변경 시 PC/DC 리셋
        cfDcValue = '';
        cfSeverity = ''; // ★ 공정 변경 시 S 리셋
        cfFmMergeSpan = 1;
        cfFeMergeSpan = 1;
      }
      cfProcessNo = processNo;
    } else {
      processNo = cfProcessNo;
    }

    if (fmValue) {
      // ★ FM 변경 시 S 리셋 (다른 FM은 다른 심각도를 가질 수 있음)
      if (cfFmValue && fmValue !== cfFmValue) {
        cfSeverity = '';
      }
      cfFmValue = fmValue;
      // ★★★ 2026-02-28: FM 병합 span 추출 (P1 해결) ★★★
      if (colMap.fmValue > 0) {
        const fmSpan = getMergeSpan(sheet, r, colMap.fmValue);
        cfFmMergeSpan = fmSpan.rowSpan;
      }
    } else {
      fmValue = cfFmValue;
    }

    if (fcValue) {
      cfFcValue = fcValue;
    } else {
      fcValue = cfFcValue;
    }

    // 최소 필수값: 공정번호 + (고장원인 OR 고장형태)
    // ★★★ 2026-02-05 FIX: fcValue만 필수 → fcValue OR fmValue 중 하나 있으면 유효 ★★★
    if (!processNo || (!fcValue && !fmValue)) {
      totalSkipped++;
      continue;
    }

    const id = `fc-parsed-${r}`;

    let m4 = getCol(row, colMap.m4);
    if (m4) { cfM4 = m4; } else { m4 = cfM4; }

    let workElement = getCol(row, colMap.workElement);
    if (workElement) { cfWorkElement = workElement; } else { workElement = cfWorkElement; }

    let feScope = getCol(row, colMap.feScope);
    if (feScope) { cfFeScope = feScope; } else { feScope = cfFeScope; }

    let feValue = getCol(row, colMap.feValue);
    if (feValue) {
      cfFeValue = feValue;
      // ★★★ 2026-02-28: FE 병합 span 추출 (P1 해결) ★★★
      if (colMap.feValue > 0) {
        const feSpan = getMergeSpan(sheet, r, colMap.feValue);
        cfFeMergeSpan = feSpan.rowSpan;
      }
    } else {
      feValue = cfFeValue;
    }

    // ★ 2026-02-24: feScope가 비어있으면 feValue에서 자동 추출
    // 패턴: "C3-4:설명..." → scope="C3", "Y6-3:설명..." → scope="Y6"
    if (!feScope && feValue) {
      const scopeMatch = feValue.match(/^([A-Z]+\d+)[-:]/i);
      if (scopeMatch) {
        feScope = scopeMatch[1].toUpperCase();
      }
    }

    let productChar = getCol(row, colMap.productChar);
    if (productChar) { cfProductChar = productChar; } else { productChar = cfProductChar; }

    let l2Function = getCol(row, colMap.l2Function);
    if (l2Function) { cfL2Function = l2Function; } else { l2Function = cfL2Function; }

    const processChar = getCol(row, colMap.processChar) || undefined;
    const l3Function = getCol(row, colMap.l3Function) || undefined;

    // ★★★ 2026-03-02: pcValue/dcValue carry-forward (병합셀/빈 행 지원) ★★★
    let pcRaw = getCol(row, colMap.pcValue);
    if (pcRaw) { cfPcValue = pcRaw; } else { pcRaw = cfPcValue; }
    const pcValue = pcRaw || undefined;

    let dcRaw = getCol(row, colMap.dcValue);
    if (dcRaw) { cfDcValue = dcRaw; } else { dcRaw = cfDcValue; }
    const dcValue = dcRaw || undefined;

    // ★★★ 2026-03-02: S(심각도) carry-forward — FM 그룹 내 동일 S 보장 (병합셀 누락 방어)
    let sRaw = getCol(row, colMap.severity);
    if (sRaw) { cfSeverity = sRaw; } else { sRaw = cfSeverity; }
    const oRaw = getCol(row, colMap.occurrence);
    const dRaw = getCol(row, colMap.detection);
    const ap = getCol(row, colMap.ap) || undefined;
    const specialChar = getCol(row, colMap.specialChar) || undefined;

    const severity = sRaw ? parseInt(sRaw, 10) || undefined : undefined;
    const occurrence = oRaw ? parseInt(oRaw, 10) || undefined : undefined;
    const detection = dRaw ? parseInt(dRaw, 10) || undefined : undefined;

    chains.push({
      id,
      processNo,
      m4: m4 || undefined,
      workElement: workElement || undefined,
      feValue,
      feScope: feScope || undefined,
      feSeverity: severity,
      fmValue,
      fcValue,
      productChar: productChar || undefined,
      processChar,
      l2Function: l2Function || undefined,
      l3Function,
      pcValue,
      dcValue,
      severity,
      occurrence,
      detection,
      ap,
      specialChar,
      // ★★★ 2026-02-28: 위치/병합 정보 추출 (P1 해결) ★★★
      excelRow: r,
      fmMergeSpan: cfFmMergeSpan,
      feMergeSpan: cfFeMergeSpan,
    });
  }

  // ★★★ 2026-02-24: 상세 파싱 통계 ★★★
  const emptyFE = chains.filter(c => !c.feValue?.trim()).length;
  const emptyFM = chains.filter(c => !c.fmValue?.trim()).length;
  const emptyFC = chains.filter(c => !c.fcValue?.trim()).length;
  
  // 유니크 카운트 계산
  const uniqueProcesses = new Set(chains.map(c => c.processNo)).size;
  const uniqueTriads = new Set(chains.map(c => `${c.processNo}|${c.feValue}|${c.fmValue}|${c.fcValue}`)).size;
  const uniqueChains = new Set(chains.map(c => `${c.processNo}|${c.m4}|${c.fcValue}`)).size;
  

  // ★ v3.1.3: 글자수 검증 — 잘림/누락 조기 발견
  const charStats = (_field: string, values: string[]) => {
    const lens = values.filter(v => v.length > 0).map(v => v.length);
    if (lens.length === 0) return { min: 0, max: 0, avg: 0, truncated: 0 };
    const min = Math.min(...lens);
    const max = Math.max(...lens);
    const avg = Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
    const truncated = lens.filter(l => l < avg * 0.5).length;
    return { min, max, avg, truncated };
  };
  const feStat = charStats('FE', chains.map(c => c.feValue || ''));
  const fmStat = charStats('FM', chains.map(c => c.fmValue || ''));
  const fcStat = charStats('FC', chains.map(c => c.fcValue || ''));

  // ★ 잘림 의심 항목 상세 경고
  if (feStat.truncated > 0 || fmStat.truncated > 0 || fcStat.truncated > 0) {
    for (const c of chains.slice(0, 500)) {
      const issues: string[] = [];
      if (c.feValue && c.feValue.length < feStat.avg * 0.5) issues.push(`FE="${c.feValue}"(${c.feValue.length}자<avg${feStat.avg})`);
      if (c.fmValue && c.fmValue.length < fmStat.avg * 0.5) issues.push(`FM="${c.fmValue}"(${c.fmValue.length}자<avg${fmStat.avg})`);
      if (c.fcValue && c.fcValue.length < fcStat.avg * 0.5) issues.push(`FC="${c.fcValue}"(${c.fcValue.length}자<avg${fcStat.avg})`);
      if (issues.length > 0) {
      }
    }
  }

  if (emptyFE > 0 || emptyFM > 0) {
  }

  // ★★★ 검증 + 보정: 조기 종료되었다면 나머지 행도 강제 스캔 ★★★
  if (earlyTerminated) {
    const lastParsedRow = chains.length > 0
      ? parseInt(chains[chains.length - 1].id.replace('fc-parsed-', ''), 10)
      : headerRow;
    const recoveredChains = recoverSkippedRows(
      sheet, lastParsedRow + 1, colMap, getCol,
    );
    if (recoveredChains.length > 0) {
      chains.push(...recoveredChains);
    }
  }

  // ★★★ 최종 검증 로그 ★★★

  return chains;
}

/**
 * 조기 종료 이후 누락된 행을 재스캔하여 복구
 * 빈 행 50개 제한 없이 시트 끝까지 전부 스캔
 */
function recoverSkippedRows(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  colMap: FCColumnMap,
  getCol: (row: ExcelJS.Row, col: number) => string,
): MasterFailureChain[] {
  const recovered: MasterFailureChain[] = [];
  let cfProcessNo = '';
  let cfFmValue = '';
  let cfFcValue = '';

  for (let r = startRow; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    let processNo = getCol(row, colMap.processNo);
    let fcValue = getCol(row, colMap.fcValue);
    let fmValue = getCol(row, colMap.fmValue);

    if (!processNo && !fcValue && !fmValue) continue;

    if (processNo) {
      processNo = sanitizeProcessNo(processNo);
      if (cfProcessNo && processNo !== cfProcessNo) {
        cfFmValue = '';
        cfFcValue = '';
      }
      cfProcessNo = processNo;
    } else {
      processNo = cfProcessNo;
    }

    if (fmValue) cfFmValue = fmValue; else fmValue = cfFmValue;
    if (fcValue) cfFcValue = fcValue; else fcValue = cfFcValue;

    if (!processNo || (!fcValue && !fmValue)) continue;

    const feValue = getCol(row, colMap.feValue) || undefined;
    const severity = parseInt(getCol(row, colMap.severity), 10) || undefined;
    const occurrence = parseInt(getCol(row, colMap.occurrence), 10) || undefined;
    const detection = parseInt(getCol(row, colMap.detection), 10) || undefined;

    recovered.push({
      id: `fc-parsed-${r}`,
      processNo,
      m4: getCol(row, colMap.m4) || undefined,
      workElement: getCol(row, colMap.workElement) || undefined,
      feValue: feValue || '',
      feScope: getCol(row, colMap.feScope) || undefined,
      fmValue,
      fcValue,
      productChar: getCol(row, colMap.productChar) || undefined,
      processChar: getCol(row, colMap.processChar) || undefined,
      l2Function: getCol(row, colMap.l2Function) || undefined,
      l3Function: getCol(row, colMap.l3Function) || undefined,
      severity,
      occurrence,
      detection,
      ap: getCol(row, colMap.ap) || undefined,
      specialChar: getCol(row, colMap.specialChar) || undefined,
    });
  }

  return recovered;
}
