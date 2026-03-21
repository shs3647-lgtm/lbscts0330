/**
 * @file excel-parser.ts
 * @description PFMEA 기초정보 Excel 파서 - 다중 시트 방식
 * @author AI Assistant
 * @created 2025-12-26
 *
 * ★★★ 데이터 타입 규칙 (하드코딩) ★★★
 * - 모든 임포트 데이터는 문자열(string)로 변환
 * - 공정번호: '10', '20', '30'... (숫자가 아닌 문자열)
 * - 공통공정: '0'/'00' → '공통'으로 자동 변환 (영문: 'COM')
 *
 * 시트 구조 (v3.0: A6/B5 제거):
 * A1-A5: 공정번호 + 공정 레벨 항목
 * B1-B4: 공정번호 + 작업요소 레벨 항목
 * C1-C4: 구분(YOUR PLANT/SHIP TO PLANT/USER) + 완제품 레벨 항목
 *
 * 공정번호를 기준으로 모든 시트를 연결하여 관계형 데이터 생성
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


import {
  MAX_DATA_ROWS,
  MAX_CONSECUTIVE_EMPTY,
  MAX_DATA_COLS,
  cellValueToString,
  normalizeSheetName,
} from './excel-parser-utils';
import { m4SortValue } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import { detectDataRange, getMergedCellValue, getMergeSpan } from '@/lib/excel-data-range';
import {
  isL1UnifiedEmptyEffectDash,
  resolveL1UnifiedRowScopeKey,
} from '@/app/(fmea-core)/pfmea/import/l1-unified-scope';
import { isSingleSheetFmea, isStepASheet, parseSingleSheetFmea } from './excel-parser-single-sheet';
import { findFCSheet, parseFCSheet } from './excel-parser-fc';
// ★★★ 2026-02-24: VERIFY 시트 리더 (엑셀 수식 기반 검증) ★★★
import { readVerifySheet, scanRawFingerprint } from './excel-parser-verification';

/** 시트별 데이터 타입 */
export interface SheetData {
  sheetName: string;
  headers: string[];
  rows: { key: string; value: string; m4?: string; extra?: string; specialChar?: string; excelRow?: number; rowSpan?: number }[];
}

/** 아이템별 메타데이터 (위치/병합/모자관계) */
export interface ItemMeta {
  excelRow?: number;      // 엑셀 원본 행 번호 (1-based)
  excelCol?: number;      // 엑셀 원본 열 번호 (1-based)
  rowSpan?: number;       // 병합 행 수 (1=단일)
  mergeGroupId?: string;  // 병합 그룹 ID (processNo-itemCode 기반)
  parentItemId?: string;  // ★ 직접 꽂기용: 같은 행의 부모 UUID (C3→C2 등)
}

/** 공정별 관계형 데이터 */
export interface ProcessRelation {
  processNo: string;
  processName: string;
  processTypeCode?: string;
  // A 레벨: 공정
  processDesc: string[];      // A3
  productChars: string[];     // A4
  productCharsSpecialChar: string[];
  failureModes: string[];     // A5
  // B 레벨: 작업요소
  workElements: string[];     // B1
  workElements4M: string[];
  elementFuncs: string[];     // B2
  elementFuncs4M: string[];
  elementFuncsWE: string[];
  processChars: string[];     // B3
  processChars4M: string[];
  processCharsSpecialChar: string[];
  processCharsWE: string[];
  failureCauses: string[];    // B4
  failureCauses4M: string[];
  failureCausesWE: string[];  // ★ 2026-03-15: B4 소속 WE 추적 (FC dedup/배분에 필수)
  preventionCtrls: string[];   // B5
  preventionCtrls4M: string[];
  preventionCtrlsWE: string[];
  detectionCtrls: string[];    // A6
  // ★★★ 2026-02-25: 아이템별 메타데이터 (key: "A3-0", "B4-2" 등) ★★★
  itemMeta?: Record<string, ItemMeta>;
}

/** 완제품별 관계형 데이터 */
export interface ProductRelation {
  productProcessName: string; // C1
  productFuncs: string[];     // C2
  requirements: string[];     // C3
  failureEffects: string[];   // C4
  itemMeta?: Record<string, ItemMeta>;
}

/** 아이템코드별 파싱 통계 (원본 vs 고유) */
export interface ItemCodeStat {
  itemCode: string;       // A1~A5, B1~B4, C1~C4
  label: string;          // 한글명 (공정번호, 공정기능, ...)
  rawCount: number;       // 원본 행에서 발견된 총 횟수
  uniqueCount: number;    // 중복 제거 후 고유 건수
  dupSkipped: number;     // 중복으로 스킵된 건수
  // ★ 2026-03-14: 파이프라인 검증 컬럼 (UUID→DB 정합성)
  uuidCount?: number;     // 파싱 결과 UUID가 할당된 유효 항목 수
  dbCount?: number;       // DB(master dataset)에 저장된 항목 수
}

/** 공정별 아이템코드 카운트 */
export interface ProcessItemStat {
  processNo: string;
  processName: string;
  items: Record<string, { raw: number; unique: number }>;  // itemCode → counts
}

/**
 * 파싱 통계 — Import 검증 + R0→R1 복사 검증 공용
 * Import: 원본 엑셀 vs 파싱 결과 비교
 * R0→R1: 원본 DB vs 복사 결과 비교
 */
export interface ParseStatistics {
  source: 'import' | 'revision';    // 데이터 출처 구분
  totalRows: number;                // 원본 총 행수
  itemStats: ItemCodeStat[];        // 아이템코드별 통계
  processStats: ProcessItemStat[];  // 공정별 상세 통계
  chainCount: number;               // 고장사슬 건수
  // ★ v2.5.3: 원본 대조 검증 (단일시트 전용 — 멀티시트는 undefined)
  rawFingerprint?: import('./excel-parser-verification').RawFingerprint;
  verification?: import('./excel-parser-verification').VerificationResult;
  // ★★★ 2026-02-24: 엑셀 수식 기반 검증값 (진정한 독립 기준) ★★★
  excelFormulas?: import('./excel-parser-verification').ExcelFormulaVerify;
  // ★★★ 2026-02-27: 고장사슬 기반 공정별 FC/FE 카운트 (검증표 표시용) ★★★
  // Scanner와 동일 방식: FM별 고유 FC/FE 합산
  chainProcessStats?: Record<string, { fcTotal: number; feTotal: number; chainRows: number }>;
}

/** 파싱 결과 */
export interface ParseResult {
  success: boolean;
  processes: ProcessRelation[];
  products: ProductRelation[];
  failureChains: import('./types/masterFailureChain').MasterFailureChain[];  // ★ FC_고장사슬 시트 파싱 결과
  sheetSummary: { name: string; rowCount: number }[];
  errors: string[];
  statistics?: ParseStatistics;     // ★ v2.5.1: 파싱 통계 (변환결과 검증용)
}


/**
 * Excel 파일 파싱 (다중 시트) - 모든 열 읽기 지원
 */
export async function parseMultiSheetExcel(file: File): Promise<ParseResult> {
  const ExcelJS = (await import('exceljs')).default;
  const errors: string[] = [];
  const sheetSummary: { name: string; rowCount: number }[] = [];

  try {
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    // ★★★ 2026-02-22: 단일시트 FMEA 자동 감지 (STEP A/B "fmea result" 형식) ★★★
    // 모든 시트명이 인식 불가하거나, "fmea result" 시트가 있으면 단일시트 파서로 위임
    const allSheetNames: string[] = [];
    workbook.eachSheet((sheet) => {
      allSheetNames.push(sheet.name);
    });

    // ★ 2026-02-24: 시트 갯수 로그

    // 단일시트 감지: (1) "fmea result" 시트 존재 또는 (2) 인식 가능 시트 0개 + 단일시트 FMEA 키워드 감지
    const fmeaResultSheet = workbook.worksheets.find(s =>
      s.name.toLowerCase().includes('fmea result') || s.name.toLowerCase().includes('fmea_result')
    );
    const mappedCount = allSheetNames.filter(n => normalizeSheetName(n.trim())).length;

    // ★★★ 2026-02-25: STEP A+B 2시트 통합 Import (파싱방법 2개 분리) ★★★
    // 변환규칙 v2.7.1 기준:
    //   시트1 = STEP A (구조+기능: A1~A4, B1~B3, C1~C3)
    //   시트2 = STEP B (고장분석: 고장사슬 FC↔FM↔FE + SOD/AP)
    // 감지 조건: 2개 이상 시트 + 표준 시트명 매칭 0개
    //   + (시트1이 FMEA 형식 OR STEP A 구조 형식)
    if (workbook.worksheets.length >= 2 && mappedCount === 0) {
      const sheet1 = workbook.worksheets[0];
      const sheet2 = workbook.worksheets[1];

      const sheet1IsFmea = isSingleSheetFmea(sheet1);
      const sheet1IsStepA = isStepASheet(sheet1);
      const sheet2IsFmea = isSingleSheetFmea(sheet2);
      const sheet2IsStepA = isStepASheet(sheet2);

      // STEP A+B 감지: 시트1이 FMEA 형식이거나 STEP A 구조 형식
      if (sheet1IsFmea || sheet1IsStepA) {
        const detectMethod = sheet1IsFmea ? 'FMEA 키워드 5+' : 'STEP A 구조 키워드 3+';

        // ── Parser 1: STEP A 파싱 (구조+기능 + 가능하면 고장분석) ──
        const stepAResult = parseSingleSheetFmea(sheet1);

        // ── Parser 2: STEP B 파싱 (고장사슬 데이터) ──
        // 전략: ① FC 파서 → ② 단일시트 파서(failureChains) → ③ STEP A 체인 사용
        let stepBChains = parseFCSheet(sheet2);
        let stepBSource = 'FC 파서';

        if (stepBChains.length === 0 && (sheet2IsFmea || sheet2IsStepA)) {
          const stepBResult = parseSingleSheetFmea(sheet2);
          stepBChains = stepBResult.failureChains || [];
          stepBSource = '단일시트 파서 fallback';

          // STEP B에 추가 구조 데이터가 있으면 STEP A에 병합
          if (stepBResult.processes.length > 0 && stepAResult.processes.length === 0) {
            stepAResult.processes.push(...stepBResult.processes);
          }
          if (stepBResult.products.length > 0 && stepAResult.products.length === 0) {
            stepAResult.products.push(...stepBResult.products);
          }
        }

        const finalChains = stepBChains.length > 0 ? stepBChains : (stepAResult.failureChains || []);

        return {
          ...stepAResult,
          failureChains: finalChains,
          sheetSummary: [
            { name: `${sheet1.name} (STEP A)`, rowCount: stepAResult.processes.length },
            { name: `${sheet2.name} (STEP B: ${stepBSource})`, rowCount: stepBChains.length },
          ],
          errors: [
            ...stepAResult.errors,
            ...(finalChains.length === 0 ? ['⚠️ STEP B(시트2)에서 고장사슬 데이터를 찾지 못했습니다.'] : []),
          ],
        };
      }
    }

    if (fmeaResultSheet && isSingleSheetFmea(fmeaResultSheet)) {
      // 단일시트 FMEA 파서로 위임
      return parseSingleSheetFmea(fmeaResultSheet);
    }
    if (mappedCount === 0 && workbook.worksheets.length > 0) {
      // 인식 가능 시트 없음 → 첫 시트가 단일시트 FMEA인지 확인
      const firstSheet = workbook.worksheets[0];
      if (isSingleSheetFmea(firstSheet)) {
        return parseSingleSheetFmea(firstSheet);
      }
    }

    // ── 기존 다중 시트 파싱 로직 ──
    const sheetDataMap: Record<string, SheetData> = {};

    // 각 시트명의 매핑 결과 미리 확인
    const unmappedSheets: string[] = [];
    allSheetNames.forEach(sheetName => {
      const normalized = normalizeSheetName(sheetName.trim());
      if (!normalized) {
        unmappedSheets.push(sheetName);
      }
    });

    // ★★★ 2026-02-04: 인식되지 않은 시트명이 있으면 경고 메시지 추가 ★★★
    if (unmappedSheets.length > 0) {
      errors.push(`⚠️ 인식되지 않은 시트: ${unmappedSheets.join(', ')} (예상 시트명: L2-1~L2-6, L3-1~L3-5, L1-1~L1-4)`);
    }

    // ★★★ 2026-03-17 FIX: 통합시트 우선 정책 (unified-first)
    // 통합시트가 파싱한 코드를 기록 → 나중에 개별시트가 나오면 스킵
    const unifiedFilledCodes = new Set<string>();

    // L1 통합시트 C3→C2 텍스트 매핑 (parentItemId 보정용)
    // key: `${c1}|${c3_value}`, value: c2_value
    const l1UnifiedC3ToC2 = new Map<string, string>();

    workbook.eachSheet((sheet) => {
      const originalSheetName = sheet.name.trim();
      const sheetName = normalizeSheetName(originalSheetName);

      // 유효한 시트만 처리 (A1-A5, B1-B4, C1-C4 또는 L2-1 ~ L1-4 형식)
      if (!sheetName) {
        return;
      }

      const headers: string[] = [];
      const headerColMap: number[] = []; // ★ headers[i] → 실제 엑셀 컬럼 번호
      const rows: SheetData['rows'] = [];

      // 헤더 읽기 (1행) — ★ 컬럼 번호도 함께 저장
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers.push(cellValueToString(cell.value));
        headerColMap.push(colNumber);
      });

      // ★★★ 2026-02-17: 시트명 1차 + 헤더 보정 2차 ★★★
      // 문제: 2열 헤더 우선 시 B시트 전부 "4M"→B1, A1시트 "공정명"→A2 오분류
      // 해결: 시트명(normalizeSheetName)이 유효하면 1차 사용, 헤더는 보정/폴백용
      const secondColumnHeader = headers.length > 1 ? headers[1].toLowerCase() : '';
      const thirdColumnHeader = headers.length > 2 ? headers[2].toLowerCase() : '';
      // ★ 공백 제거 정규화 — "요소 기능" → "요소기능" 대응
      const noSp = (s: string) => s.replace(/\s/g, '');

      const headerKeywordMap: { keywords: string[]; code: string; multiMatch?: boolean }[] = [
        // ★ v5.5: 통합시트 감지 (다중 키워드 동시 매칭 필요 — multiMatch)
        { keywords: ['공정명', '공정기능', '고장형태'], code: 'L2_UNIFIED', multiMatch: true },
        { keywords: ['작업요소', '고장원인', '예방관리'], code: 'L3_UNIFIED', multiMatch: true },
        { keywords: ['구분', '제품기능', '요구사항', '고장영향'], code: 'L1_UNIFIED', multiMatch: true },
        // 폴백: 개별시트 감지 (통합시트 없는 레거시 양식 호환용)
        { keywords: ['공정명', 'l2-2'], code: 'A2' },
        { keywords: ['공정기능', 'l2-3'], code: 'A3' },
        { keywords: ['제품특성', 'l2-4'], code: 'A4' },
        { keywords: ['고장형태', 'l2-5'], code: 'A5' },
        { keywords: ['검출관리', 'l2-6'], code: 'A6' },
        { keywords: ['작업요소', '설비', 'l3-1'], code: 'B1' },
        { keywords: ['요소기능', 'l3-2'], code: 'B2' },
        { keywords: ['공정특성', 'l3-3'], code: 'B3' },
        { keywords: ['고장원인', 'l3-4'], code: 'B4' },
        { keywords: ['예방관리', 'l3-5'], code: 'B5' },
        { keywords: ['구분', 'l1-1'], code: 'C1' },
        { keywords: ['제품기능', 'l1-2'], code: 'C2' },
        { keywords: ['요구사항', 'l1-3'], code: 'C3' },
        { keywords: ['고장영향', 'l1-4'], code: 'C4' },
        { keywords: ['공정번호', 'l2-1'], code: 'A1' },
      ];

      // ── 1차: 시트명 매핑 (normalizeSheetName 결과) ──
      let finalSheetName: string | null = sheetName; // 이미 normalizeSheetName 결과

      // ── 2차: 헤더 기반 보정 (시트명 없을 때 OR 4M/공정명 특수 케이스) ──
      if (!finalSheetName) {
        const headerText = headers.join(' ').toLowerCase();
        const headerTextNoSp = noSp(headerText);

        // ★ v5.5: 통합시트 우선 감지 (multiMatch — 모든 키워드 동시 존재)
        for (const { keywords, code, multiMatch } of headerKeywordMap) {
          if (multiMatch && keywords.every(kw => headerTextNoSp.includes(noSp(kw)))) {
            finalSheetName = code;
            break;
          }
        }

        // 통합시트 미감지 시 → 폴백 개별시트 감지
        if (!finalSheetName) {
          if (secondColumnHeader.includes('4m') || secondColumnHeader.includes('m4')) {
            // B 시트 계열: 2열=4M → 3열 키워드로 구체 분류
            for (const { keywords, code } of headerKeywordMap) {
              if (code.startsWith('B') && keywords.some(kw => noSp(thirdColumnHeader).includes(noSp(kw)))) {
                finalSheetName = code;
                break;
              }
            }
            if (!finalSheetName) finalSheetName = 'B1'; // 3열도 모르면 B1 기본값
          } else {
            // 일반: 2열 키워드 매칭
            for (const { keywords, code, multiMatch } of headerKeywordMap) {
              if (!multiMatch && keywords.some(kw => noSp(secondColumnHeader).includes(noSp(kw)))) {
                finalSheetName = code;
                break;
              }
            }
          }
        }
      }

      // 3차 폴백: 전체 헤더 텍스트에서 재시도 (통합시트 미감지 시 폴백)
      if (!finalSheetName) {
        const headerText = headers.join(' ').toLowerCase();
        for (const { keywords, code, multiMatch } of headerKeywordMap) {
          if (!multiMatch && keywords.some(kw => noSp(headerText).includes(noSp(kw)))) {
            finalSheetName = code;
            break;
          }
        }
      }

      // 최종 시트명 사용
      const sheetCode = finalSheetName;

      // ★★★ 2026-02-17: detectDataRange로 데이터 범위 자동 감지 ★★★
      // 예외 패턴 대응: 1열 빈 칸/NO열, 비고/메모 무시, 헤더 위치 자동 감지
      const dataRange = detectDataRange(sheet);
      const startRow = dataRange.dataStartRow;
      const keyColIdx = dataRange.keyCol;         // 키 컬럼 (동적 감지, NO열 건너뜀)
      const valStartCol = dataRange.valueStartCol; // 값 시작 컬럼
      const valEndCol = dataRange.valueEndCol;    // 값 끝 컬럼 (비고 제외)
      const detected4M = dataRange.has4MCol;      // 4M 컬럼 감지 여부
      const detected4MCol = dataRange.m4Col;      // 4M 컬럼 번호

      // ★★★ 2026-02-23: 특별특성(specialChar) 컬럼 감지 (eachCell 컬럼번호 보정) ★★★
      // eachCell은 빈 셀을 건너뛰므로 headers 인덱스 ≠ 실제 컬럼 번호
      // headerColMap[i]로 실제 엑셀 컬럼 번호를 참조해야 함
      let specialCharCol = 0; // 0 = 미감지 (실제 엑셀 컬럼 번호)
      const scSheets = ['A4', 'A5', 'B3', 'B4'];
      if (scSheets.includes(sheetCode || '')) {
        // [SC-DIAG] 헤더 전체 출력 — 특별특성 컬럼 감지 디버그
        for (let i = 0; i < headers.length; i++) {
          const raw = (headers[i] || '').trim();
          const h = raw.replace(/\s/g, '');
          const hLower = h.toLowerCase();
          const isSpecialCharCol = h.includes('특별특성') || h.includes('특별') || hLower.includes('sc') || h.includes('Special') || h.includes('기호') || h.includes('symbol')
            || (hLower.includes('특별') && (hLower.includes('a4') || hLower.includes('b3') || hLower.includes('l2-4') || hLower.includes('l3-3')));
          if (isSpecialCharCol) {
            specialCharCol = headerColMap[i]; // ★ 실제 엑셀 컬럼 번호 사용
            break;
          }
        }
        if (specialCharCol === 0) {
        }
      }

      // ★★★ 2026-02-23: B2/B3 시트 workElement 중간 컬럼 감지 (complex/extended template) ★★★
      // Extended template: 공정번호 | (공정명) | 4M | 작업요소 | 데이터값 | ...
      // m4Col+1이 "작업요소"이면 → 실제 데이터는 더 뒤 컬럼

      // B2 complex template 감지
      let b2WECol = 0;          // B2 workElement 컬럼 (1-indexed, 0=미감지)
      let b2ElemFuncCol = 0;    // B2 요소기능 컬럼 (1-indexed, 0=미감지)
      if (sheetCode === 'B2' && detected4M && detected4MCol > 0) {
        const nextHeaderIdx = detected4MCol;
        const nextHeader = (headers[nextHeaderIdx] || '').replace(/\s/g, '').toLowerCase();
        if (nextHeader.includes('작업요소') && !nextHeader.includes('기능') && !nextHeader.includes('공정특성')) {
          b2WECol = detected4MCol + 1;
          // 요소기능 컬럼 찾기
          for (let hi = nextHeaderIdx + 1; hi < headers.length; hi++) {
            const h = (headers[hi] || '').replace(/\s/g, '').toLowerCase();
            if (h.includes('기능') || h.includes('요소기능') || h.includes('l3-2')) {
              b2ElemFuncCol = hi + 1;
              break;
            }
          }
          if (!b2ElemFuncCol) {
            b2ElemFuncCol = detected4MCol + 2; // 폴백: 작업요소 다음열
          }
        }
      }

      // B3 complex template 감지
      let b3WECol = 0;         // workElement 컬럼 (1-indexed, 0=미감지)
      let b3ProcessCharCol = 0; // processChar 컬럼 (1-indexed, 0=미감지)
      if (sheetCode === 'B3' && detected4M && detected4MCol > 0) {
        const nextHeaderIdx = detected4MCol;
        const nextHeader = (headers[nextHeaderIdx] || '').replace(/\s/g, '').toLowerCase();
        if (nextHeader.includes('작업요소') && !nextHeader.includes('기능') && !nextHeader.includes('공정특성')) {
          b3WECol = detected4MCol + 1;
          for (let hi = nextHeaderIdx + 1; hi < headers.length; hi++) {
            const h = (headers[hi] || '').replace(/\s/g, '').toLowerCase();
            if (h.includes('공정특성') || h.includes('l3-3')) {
              b3ProcessCharCol = hi + 1;
              break;
            }
          }
          if (!b3ProcessCharCol) {
            b3ProcessCharCol = detected4MCol + 3;
          }
        }
      }

      // ★★★ 2026-03-15 FIX: B4 complex template 감지 — FC 소속 WE 추적 필수 ★★★
      let b4WECol = 0;          // B4 workElement 컬럼 (1-indexed, 0=미감지)
      let b4CauseCol = 0;       // B4 고장원인 컬럼 (1-indexed, 0=미감지)
      if (sheetCode === 'B4' && detected4M && detected4MCol > 0) {
        const nextHeaderIdx = detected4MCol;
        const nextHeader = (headers[nextHeaderIdx] || '').replace(/\s/g, '').toLowerCase();
        if (nextHeader.includes('작업요소') && !nextHeader.includes('기능') && !nextHeader.includes('공정특성') && !nextHeader.includes('고장')) {
          b4WECol = detected4MCol + 1;
          for (let hi = nextHeaderIdx + 1; hi < headers.length; hi++) {
            const h = (headers[hi] || '').replace(/\s/g, '').toLowerCase();
            if (h.includes('고장원인') || h.includes('원인') || h.includes('l3-4') || h.includes('b4')) {
              b4CauseCol = hi + 1;
              break;
            }
          }
          if (!b4CauseCol) {
            b4CauseCol = detected4MCol + 2; // 폴백: 작업요소 다음열
          }
        }
      }

      // 행 제한 (시트당 최대 500행)
      const maxRow = Math.min(sheet.rowCount, startRow + MAX_DATA_ROWS - 1);

      if (sheet.rowCount > startRow + MAX_DATA_ROWS - 1) {
        errors.push(`⚠️ 시트 "${originalSheetName}": ${sheet.rowCount - startRow + 1}행 중 최대 ${MAX_DATA_ROWS}행만 읽습니다.`);
      }

      // 병합 셀 + 연속 빈 행 처리
      // ★ v5.5: 통합시트 → 개별 시트 코드로 분배 (기존 processMap 로직 재활용)
      const isUnified = sheetCode === 'L1_UNIFIED' || sheetCode === 'L2_UNIFIED' || sheetCode === 'L3_UNIFIED';
      if (isUnified) {
        // ★★★ 2026-03-17: 통합시트 우선 정책 (unified-first) ★★★
        // 통합시트는 항상 파싱. 파싱 완료 후 해당 코드를 unifiedFilledCodes에 기록.
        // 나중에 개별시트가 나오면 이미 통합시트에서 채운 코드는 스킵.
        // (이전 "개별시트 우선" 80줄 패치워크 제거 — A6/B5 부분추출, C3→C2 이중매핑 불필요)

        // 통합시트: 행 하나에서 여러 필드를 추출하여 개별 sheetDataMap 항목으로 분배
        // 헤더 인덱스 → 필드 매핑 (헤더 키워드 기반)
        const colFieldMap: Array<{ col: number; targetCode: string; fieldHint: string }> = [];
        for (let ci = 0; ci < headers.length; ci++) {
          const h = (headers[ci] || '').replace(/\s/g, '').toLowerCase();
          if (sheetCode === 'L2_UNIFIED') {
            if (h.includes('공정번호')) colFieldMap.push({ col: headerColMap[ci], targetCode: '_KEY', fieldHint: 'processNo' });
            else if (h.includes('공정명')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'A2', fieldHint: 'processName' });
            else if (h.includes('공정기능')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'A3', fieldHint: 'processDesc' });
            else if (h.includes('제품특성')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'A4', fieldHint: 'productChars' });
            else if (h.includes('특별특성')) colFieldMap.push({ col: headerColMap[ci], targetCode: '_SC', fieldHint: 'specialChar' });
            else if (h.includes('고장형태')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'A5', fieldHint: 'failureModes' });
            else if (h.includes('검출관리')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'A6', fieldHint: 'detectionCtrls' });
          } else if (sheetCode === 'L3_UNIFIED') {
            if (h.includes('공정번호')) colFieldMap.push({ col: headerColMap[ci], targetCode: '_KEY', fieldHint: 'processNo' });
            else if (h.includes('4m') || h.includes('m4')) colFieldMap.push({ col: headerColMap[ci], targetCode: '_4M', fieldHint: 'm4' });
            else if (h.includes('작업요소')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'B1', fieldHint: 'workElements' });
            else if (h.includes('요소기능')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'B2', fieldHint: 'elementFuncs' });
            else if (h.includes('공정특성')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'B3', fieldHint: 'processChars' });
            else if (h.includes('특별특성')) colFieldMap.push({ col: headerColMap[ci], targetCode: '_SC', fieldHint: 'specialChar' });
            else if (h.includes('고장원인')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'B4', fieldHint: 'failureCauses' });
            else if (h.includes('예방관리')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'B5', fieldHint: 'preventionCtrls' });
          } else if (sheetCode === 'L1_UNIFIED') {
            if (h.includes('구분')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'C1', fieldHint: 'scope' });
            else if (h.includes('제품기능')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'C2', fieldHint: 'productFunc' });
            else if (h.includes('요구사항')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'C3', fieldHint: 'requirements' });
            else if (h.includes('고장영향')) colFieldMap.push({ col: headerColMap[ci], targetCode: 'C4', fieldHint: 'failureEffects' });
          }
        }

        const keyMapping = colFieldMap.find(m => m.targetCode === '_KEY' || m.targetCode === 'C1');
        const m4Mapping = colFieldMap.find(m => m.targetCode === '_4M');
        const scMapping = colFieldMap.find(m => m.targetCode === '_SC');

        // L1_UNIFIED에서 C3→C2 매핑 추출 (parentItemId 보정용)
        // carry-forward로 병합 셀(C1/C2 merged) 대응
        if (sheetCode === 'L1_UNIFIED' && keyMapping) {
          const c2Entry = colFieldMap.find(m => m.targetCode === 'C2');
          const c3Entry = colFieldMap.find(m => m.targetCode === 'C3');
          if (c2Entry && c3Entry) {
            let cfKeyC3 = '';
            let lastC2 = '';
            for (let ri = startRow; ri <= sheet.rowCount; ri++) {
              const uRow = sheet.getRow(ri);
              if (!uRow || uRow.cellCount === 0) continue;
              const { keyVal: c1Key, nextCfKey } = resolveL1UnifiedRowScopeKey(
                sheet,
                ri,
                keyMapping.col,
                cfKeyC3,
              );
              cfKeyC3 = nextCfKey;
              if (!c1Key) continue;
              let c2Raw = getMergedCellValue(sheet, ri, c2Entry.col).trim();
              if (c2Raw) lastC2 = c2Raw;
              else c2Raw = lastC2;
              const c3Raw = getMergedCellValue(sheet, ri, c3Entry.col).trim();
              if (c1Key && c2Raw && c3Raw) {
                l1UnifiedC3ToC2.set(`${c1Key}|${c3Raw}`, c2Raw);
              }
            }
            console.info(`[L1_UNIFIED 직접] C3→C2 매핑 구축: ${l1UnifiedC3ToC2.size}건`);
          }
        }

        // ★ v6.3 옵션3 안전장치: 전체 통합시트 carry-forward — 빈 셀 시 이전 값 사용
        // L1: C1(key), C2, C3, C4 | L2: 공정번호(key), A2, A3, A4, A5, A6 | L3: 공정번호(key), 4M, B1~B5
        let cfKey = '';
        let cfM4 = '';
        const cfParents = new Map<string, string>();
        const parentCodes = new Set<string>();
        if (sheetCode === 'L1_UNIFIED') { parentCodes.add('C2'); parentCodes.add('C3'); parentCodes.add('C4'); }
        if (sheetCode === 'L2_UNIFIED') { parentCodes.add('A2'); parentCodes.add('A3'); parentCodes.add('A4'); parentCodes.add('A5'); parentCodes.add('A6'); }
        if (sheetCode === 'L3_UNIFIED') { parentCodes.add('B1'); parentCodes.add('B2'); parentCodes.add('B3'); parentCodes.add('B4'); parentCodes.add('B5'); }

        for (let ri = startRow; ri <= sheet.rowCount; ri++) {
          const uRow = sheet.getRow(ri);
          if (!uRow || uRow.cellCount === 0) continue;

          let keyVal = '';
          if (sheetCode === 'L1_UNIFIED' && keyMapping) {
            const resolved = resolveL1UnifiedRowScopeKey(sheet, ri, keyMapping.col, cfKey);
            keyVal = resolved.keyVal;
            cfKey = resolved.nextCfKey;
          } else if (keyMapping) {
            keyVal = cellValueToString(uRow.getCell(keyMapping.col).value).trim();
            if (!keyVal) keyVal = cfKey;
            if (!keyVal) continue;
            cfKey = keyVal;
          }
          if (!keyVal) continue;

          let m4Val = m4Mapping ? cellValueToString(uRow.getCell(m4Mapping.col).value).trim().toUpperCase() : '';
          if (!m4Val && sheetCode === 'L3_UNIFIED') m4Val = cfM4;
          if (m4Val && sheetCode === 'L3_UNIFIED') cfM4 = m4Val;
          const scVal = scMapping ? cellValueToString(uRow.getCell(scMapping.col).value).trim() : '';

          for (const mapping of colFieldMap) {
            if (mapping.targetCode === '_KEY' || mapping.targetCode === '_4M' || mapping.targetCode === '_SC') continue;
            let val =
              sheetCode === 'L1_UNIFIED'
                ? getMergedCellValue(sheet, ri, mapping.col).trim()
                : cellValueToString(uRow.getCell(mapping.col).value).trim();
            // ★ 부모 컬럼 carry-forward: 빈칸이면 이전 값으로 채움
            if (parentCodes.has(mapping.targetCode)) {
              if (val) cfParents.set(mapping.targetCode, val);
              else val = cfParents.get(mapping.targetCode) || '';
            }
            // C4: 표시용 "-" / N/A 는 고장영향 없음과 동일
            if (sheetCode === 'L1_UNIFIED' && mapping.targetCode === 'C4' && isL1UnifiedEmptyEffectDash(val)) {
              val = '';
            }
            if (!val || val === 'null' || val === 'undefined') continue;

            if (!sheetDataMap[mapping.targetCode]) {
              sheetDataMap[mapping.targetCode] = { sheetName: mapping.targetCode, headers: [], rows: [] };
            }

            const rowEntry: { key: string; value: string; m4?: string; extra?: string; specialChar?: string; excelRow: number; rowSpan?: number } = {
              key: keyVal,
              value: val,
              excelRow: ri,
              rowSpan: getMergeSpan(sheet, ri, mapping.col).rowSpan,
            };

            // B 시트 계열: 4M 정보 추가
            if (mapping.targetCode.startsWith('B')) {
              const normalizedM4 = (m4Val === 'MD' || m4Val === 'JG') ? 'MC' : m4Val;
              if (['MN', 'MC', 'IM', 'EN'].includes(normalizedM4)) {
                rowEntry.m4 = normalizedM4;
              }
            }

            // A2(공정명): A1도 동시 생성 (공정번호+공정명)
            if (mapping.targetCode === 'A2') {
              if (!sheetDataMap['A1']) {
                sheetDataMap['A1'] = { sheetName: 'A1', headers: [], rows: [] };
              }
              const a1Exists = sheetDataMap['A1'].rows.some(
                (r: { key: string }) => r.key === keyVal
              );
              if (!a1Exists) {
                sheetDataMap['A1'].rows.push({ key: keyVal, value: val, excelRow: ri });
              }
            }

            // C1(구분): C1은 key=value=구분
            if (mapping.targetCode === 'C1') {
              rowEntry.value = keyVal;
            }

            // 특별특성 정보 추가 (A4, B3)
            if (scVal && (mapping.targetCode === 'A4' || mapping.targetCode === 'B3')) {
              rowEntry.specialChar = scVal;
            }

            // B2/B3/B4/B5에 소속 workElement 추가 (extra 필드)
            // ★ carry-forward된 B1 값도 활용 — 빈 B1 셀에서도 WE 정보 유지
            if ((mapping.targetCode === 'B2' || mapping.targetCode === 'B3' || mapping.targetCode === 'B4' || mapping.targetCode === 'B5') && sheetCode === 'L3_UNIFIED') {
              const b1Mapping = colFieldMap.find(m => m.targetCode === 'B1');
              if (b1Mapping) {
                const weVal = cellValueToString(uRow.getCell(b1Mapping.col).value).trim() || cfParents.get('B1') || '';
                if (weVal) rowEntry.extra = weVal;
              }
            }

            sheetDataMap[mapping.targetCode].rows.push(rowEntry);
          }
        }

        // 통합시트 파싱 완료 — 해당 코드들을 기록하여 개별시트 중복 방지
        const filledCodes = sheetCode === 'L1_UNIFIED' ? ['C1', 'C2', 'C3', 'C4']
          : sheetCode === 'L2_UNIFIED' ? ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']
          : ['B1', 'B2', 'B3', 'B4', 'B5'];
        filledCodes.forEach(c => {
          if (sheetDataMap[c]?.rows?.length > 0) unifiedFilledCodes.add(c);
        });
        console.info(`[excel-parser] ${sheetCode} 통합시트 파싱 완료: ${filledCodes.filter(c => unifiedFilledCodes.has(c)).join(',')} (${filledCodes.filter(c => unifiedFilledCodes.has(c)).length}개 코드)`);

        return; // eachSheet callback — 다음 시트로
      }

      // ★★★ 2026-03-17: 통합시트에서 이미 파싱된 코드의 개별시트 → 스킵 ★★★
      if (sheetCode && unifiedFilledCodes.has(sheetCode)) {
        console.info(`[excel-parser] ${sheetCode} 개별시트 스킵: 통합시트에서 이미 파싱됨`);
        return;
      }

      let lastKey = '';
      let lastM4 = '';
      let consecutiveEmpty = 0;

      for (let i = startRow; i <= maxRow; i++) {
        const row = sheet.getRow(i);
        // ★ 키 컬럼: detectDataRange가 감지한 열 사용 (1열 빈 칸 패턴 대응)
        // ★ 병합 셀: getMergedCellValue가 마스터 셀 값 자동 반환
        let key = getMergedCellValue(sheet, i, keyColIdx);

        // 폴백: getMergedCellValue로도 못 찾으면 lastKey 사용 (레거시 대응)
        if (key === '' && lastKey) {
          key = lastKey;
        }

        // 연속 빈 행 감지 → 데이터 끝 자동 판별
        if (key === '') {
          consecutiveEmpty++;
          if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
            break;
          }
          continue;
        }
        consecutiveEmpty = 0;

        // ★ 공통공정 번호 변환: 0/00 → '공통' (영문: COM)
        if (key === '0' || key === '00') key = '공통';

        // ★ 2026-02-24: 공정번호 추출 (긴 텍스트에서 "N번" 패턴 추출)
        const processNoMatch = key.match(/^(\d+번)/);
        if (processNoMatch && key.length > processNoMatch[1].length + 1) {
          const extractedKey = processNoMatch[1];
          key = extractedKey;
        }

        lastKey = key;

        // 시트 타입에 따라 다르게 처리 (sheetCode = 헤더 기반 재매핑 결과)
        // - A1 시트('L2-1 공정번호'): 1열=공정번호, 2열=공정명 → key=공정번호, value=공정명
        // - A2 시트: 별도 시트가 있는 경우 1열=공정번호, 2열=공정명
        // - A3-A5, B1-B4 시트: 1열=공정번호, 2열~N열=값들 (다중 값, 같은 공정번호에 여러 값)
        // - C1 시트('L1-1 구분'): 1열=구분 → key=구분, value=구분(동일)
        // - C2-C4 시트: 1열=구분, 2열~N열=값들 (다중 값, 같은 구분에 여러 값)
        const isSingleValueSheet = sheetCode === 'A1' || sheetCode === 'A2';
        const isC1Sheet = sheetCode === 'C1';

        if (isSingleValueSheet) {
          // A1, A2 시트: 키 다음열=공정명, 그 다음열=공정유형코드(선택)
          const value = cellValueToString(row.getCell(valStartCol).value);
          const col3 = cellValueToString(row.getCell(valStartCol + 1).value).trim();
          if (value &&
            value !== 'null' &&
            value !== 'undefined' &&
            value !== '(필수)' &&
            value !== '(선택)') {
            rows.push({ key, value, extra: col3 || undefined, excelRow: i });
          }
        } else if (isC1Sheet) {
          // C1 시트: 1열=구분 (값도 동일하게)
          if (key &&
            key !== 'null' &&
            key !== 'undefined' &&
            key !== '(필수)' &&
            key !== '(선택)' &&
            !key.includes('구분') &&
            !key.includes('L1-1')) {
            rows.push({ key, value: key, excelRow: i });
          }
        } else if (sheetCode === 'B1' || sheetCode === 'B2' || sheetCode === 'B3' || sheetCode === 'B4') {
          // ★★★ 2026-02-17: B1~B4 4M 컬럼 — detectDataRange 결과 사용 ★★★
          // NO열이 있어도 keyCol/m4Col이 올바른 위치를 가리킴
          const is3Column = detected4M;
          const m4ColIdx = detected4MCol;
          const dataColIdx = detected4M ? detected4MCol + 1 : valStartCol;

          let m4Value = '';
          let dataValue = '';

          // ★★★ 2026-02-23: B2/B3 complex template 특수 처리 ★★★
          let bWeValue = ''; // B2/B3 공용: 소속 workElement 이름
          if (is3Column && m4ColIdx > 0) {
            // 4M 컬럼 감지됨: m4Col=4M, m4Col+1=데이터
            m4Value = cellValueToString(row.getCell(m4ColIdx).value).toUpperCase();

            if (sheetCode === 'B2' && b2WECol > 0 && b2ElemFuncCol > 0) {
              // B2 extended template: workElement(Col) + elementFunc(Col)
              bWeValue = cellValueToString(row.getCell(b2WECol).value);
              dataValue = cellValueToString(row.getCell(b2ElemFuncCol).value);
            } else if (sheetCode === 'B3' && b3WECol > 0 && b3ProcessCharCol > 0) {
              // B3 complex template: workElement(Col) + processChar(Col)
              bWeValue = cellValueToString(row.getCell(b3WECol).value);
              dataValue = cellValueToString(row.getCell(b3ProcessCharCol).value);
            } else if (sheetCode === 'B4' && b4WECol > 0 && b4CauseCol > 0) {
              // ★★★ 2026-03-15 FIX: B4 complex template — 소속 WE + 고장원인 ★★★
              bWeValue = cellValueToString(row.getCell(b4WECol).value);
              dataValue = cellValueToString(row.getCell(b4CauseCol).value);
            } else {
              dataValue = cellValueToString(row.getCell(dataColIdx).value);
            }

            // MD/JG → MC 통합 (설비 계열)
            if (m4Value === 'MD' || m4Value === 'JG') m4Value = 'MC';

            // 병합 셀 대응 - 4M이 빈칸이면 이전 행의 4M 사용
            if (!m4Value && lastM4) {
              m4Value = lastM4;
            }
            if (m4Value && ['MN', 'MC', 'IM', 'EN'].includes(m4Value)) {
              lastM4 = m4Value;
            }
          } else {
            // 4M 없음: 키 다음열=데이터
            dataValue = cellValueToString(row.getCell(valStartCol).value);
          }

          const valid4M = ['MN', 'MC', 'IM', 'EN'].includes(m4Value) ? m4Value : '';

          // ★★★ 2026-03-02: B1 작업요소 "XX번-장비명" → "장비명" 접두사 제거 ★★★
          // 엑셀 B1 셀에 "20번-LED 점등검사기" 형식이 들어올 수 있음
          // processNo는 key(1열)에 이미 별도 저장되므로 value에서 접두사 제거
          if (sheetCode === 'B1' && dataValue) {
            dataValue = dataValue.replace(/^\d+번[-\s]?/, '');
          }

          // ★★★ 2026-02-22: B시트 특별특성 읽기 ★★★
          const bSc = specialCharCol > 0 ? cellValueToString(row.getCell(specialCharCol).value) : '';

          if (dataValue &&
            dataValue !== 'null' &&
            dataValue !== 'undefined' &&
            dataValue !== '(필수)' &&
            dataValue !== '(선택)' &&
            !dataValue.includes('공정번호') &&
            !/^L[123]-\d/.test(dataValue)) {
            rows.push({ key, value: dataValue, m4: valid4M, extra: bWeValue || undefined, specialChar: bSc || undefined, excelRow: i, rowSpan: getMergeSpan(sheet, i, valStartCol).rowSpan });
          }
        } else if (sheetCode === 'A6' || sheetCode === 'B5') {
          // ★★★ 2026-03-16 FIX: A6/B5 — 4M+WE 포함 파싱 (B1~B4와 동일한 패턴)
          // 이전 버그: m4/WE 누락 → dedupKey에서 m4 빈 문자열 → 같은 공정 내 다른 WE의 B5 중복 제거
          // B5 시트 구조: [공정번호(1), 4M(2), ★작업요소(3), B5 예방관리(4)]
          // A6 시트 구조: [공정번호(1), A6 검출관리(2)] (4M/WE 없음)
          let a6b5m4 = '';
          let a6b5we = '';
          const hasB5WECol = sheetCode === 'B5' && detected4M && detected4MCol > 0;
          if (hasB5WECol) {
            a6b5m4 = cellValueToString(row.getCell(detected4MCol).value).toUpperCase();
            if (a6b5m4 === 'MD' || a6b5m4 === 'JG') a6b5m4 = 'MC';
            if (!a6b5m4 && lastM4) a6b5m4 = lastM4;
            if (a6b5m4 && ['MN', 'MC', 'IM', 'EN'].includes(a6b5m4)) lastM4 = a6b5m4;
            // WE 컬럼 (4M 다음 컬럼)
            a6b5we = cellValueToString(row.getCell(detected4MCol + 1).value);
          }
          // ★★★ B5: 값은 WE 다음 컬럼(4열), A6: valStartCol 그대로 ★★★
          const b5a6ValueCol = hasB5WECol ? detected4MCol + 2 : valStartCol;
          if (i === startRow && (sheetCode === 'B5' || sheetCode === 'A6')) {
            console.log(`[excel-parser:${sheetCode}] detected4MCol=${detected4MCol} valStartCol=${valStartCol} b5a6ValueCol=${b5a6ValueCol} hasB5WECol=${hasB5WECol}`);
          }
          const value = cellValueToString(row.getCell(b5a6ValueCol).value);
          if (value &&
            value !== 'null' &&
            value !== 'undefined' &&
            value !== '(필수)' &&
            value !== '(선택)' &&
            value !== '공정번호' &&
            !/^L[123]-\d/.test(value)) {
            const validM4 = ['MN', 'MC', 'IM', 'EN'].includes(a6b5m4) ? a6b5m4 : '';
            rows.push({ key, value, m4: validM4, extra: a6b5we || undefined, excelRow: i, rowSpan: getMergeSpan(sheet, i, valStartCol).rowSpan });
          }
        } else {
          // A3-A5, C2-C4 시트: 값 시작열부터 읽기 (B1~B4는 위에서 4M 처리)
          // ★★★ 2026-02-17: detectDataRange 결과 사용 (NO열 건너뜀, 비고 열 제외) ★★★
          const maxCol = Math.min(headers.length || valStartCol, valEndCol || MAX_DATA_COLS);
          const colCount = Math.max(valStartCol, maxCol);
          let hasValue = false;

          // ★★★ 2026-02-22: A시트 특별특성 읽기 (A4/A5/B3/B4) ★★★
          const aSc = specialCharCol > 0 ? cellValueToString(row.getCell(specialCharCol).value) : '';

          for (let col = valStartCol; col <= colCount; col++) {
            // 특별특성 컬럼은 데이터 값으로 취급하지 않음 (별도 필드로 처리)
            if (specialCharCol > 0 && col === specialCharCol) continue;

            const cellValue = row.getCell(col).value;
            // ★★★ cellValueToString 사용으로 [object Object] 문제 해결 ★★★
            const value = cellValueToString(cellValue);
            // 빈 값, null, undefined, '(필수)', '(선택)', 헤더 텍스트 제외
            // ★ 2026-02-24: '구분' 필터는 "구분"으로만 구성된 셀에만 적용 (C4 데이터 보호)
            const isHeaderOnly = value === '구분' || value === '공정번호' || /^L[123]-\d/.test(value);
            if (value &&
              value !== 'null' &&
              value !== 'undefined' &&
              value !== '(필수)' &&
              value !== '(선택)' &&
              !isHeaderOnly) {
              rows.push({ key, value, specialChar: aSc || undefined, excelRow: i, rowSpan: getMergeSpan(sheet, i, valStartCol).rowSpan });
              hasValue = true;
              // ★ C4 디버그 로그
              if (sheetCode === 'C4') {
              }
            }
          }

          // 값이 하나도 없으면 값 시작열 값만이라도 추가 시도
          if (!hasValue) {
            const value = cellValueToString(row.getCell(valStartCol).value);
            // ★ 2026-02-24: 동일하게 isHeaderOnly 체크
            const isHeaderOnlyFallback = value === '구분' || value === '공정번호' || /^L[123]-\d/.test(value);
            if (value &&
              value !== 'null' &&
              value !== 'undefined' &&
              value !== '(필수)' &&
              value !== '(선택)' &&
              !isHeaderOnlyFallback) {
              rows.push({ key, value, specialChar: aSc || undefined, excelRow: i, rowSpan: getMergeSpan(sheet, i, valStartCol).rowSpan });
            }
          }
        }
      }

      sheetDataMap[sheetCode] = { sheetName: sheetCode, headers, rows };
      sheetSummary.push({ name: sheetCode, rowCount: rows.length });
      // ★ DEBUG: A6/B5 파싱 결과 로그
      if (sheetCode === 'A6' || sheetCode === 'B5') {
        console.log(`[excel-parser] ${sheetCode} 시트 파싱: ${rows.length}건, detected4M=${detected4M}, valStartCol=${valStartCol}`);
      }
    });

    // 공정별 관계형 데이터 구축
    const processMap = new Map<string, ProcessRelation>();

    // A1 시트에서 공정 마스터 생성 (L2-1 공정번호 시트: 1열=공정번호, 2열=공정명)
    const a1Data = sheetDataMap['A1'];
    if (a1Data) {
      // A1 시트는 공정번호와 공정명이 같은 행에 있음 (1열=번호, 2열=명)
      // 같은 공정번호가 여러 번 나올 수 있으므로 Map으로 중복 제거
      // processNo -> { processName, typeCode }
      const processNoMap = new Map<string, { name: string; typeCode: string }>();

      a1Data.rows.forEach((row) => {
        if (row.key) {
          if (!processNoMap.has(row.key)) {
            processNoMap.set(row.key, { name: row.value || '', typeCode: row.extra || '' });
          }
        }
      });

      // 공정 마스터 생성 (공정유형코드: 엑셀 값 → 자동추론 → 빈칸)
      processNoMap.forEach(({ name: processName, typeCode }, processNo) => {
        // 공정유형코드: 엑셀 3열 값만 사용 (사용자 직접 입력)
        const resolvedTypeCode = typeCode;
        if (!processMap.has(processNo)) {
          processMap.set(processNo, {
            processNo,
            processName,
            processTypeCode: resolvedTypeCode || undefined,
            processDesc: [],
            productChars: [],
            productCharsSpecialChar: [],
            failureModes: [],
            workElements: [],
            workElements4M: [],
            elementFuncs: [],
            elementFuncs4M: [],
            elementFuncsWE: [],
            processChars: [],
            processChars4M: [],
            processCharsSpecialChar: [],
            processCharsWE: [],
            failureCauses: [],
            failureCauses4M: [],
            failureCausesWE: [],
            preventionCtrls: [],
            preventionCtrls4M: [],
            preventionCtrlsWE: [],
            detectionCtrls: [],
          });
        } else {
          // 이미 있으면 공정명 업데이트 (빈 경우만)
          const process = processMap.get(processNo);
          if (process && !process.processName && processName) {
            process.processName = processName;
          }
          // 공정유형코드 업데이트 (빈 경우만)
          if (process && !process.processTypeCode && resolvedTypeCode) {
            process.processTypeCode = resolvedTypeCode;
          }
        }
      });
    }

    // A2 시트에서 공정명 업데이트 (A2 시트가 별도로 있는 경우 또는 A1이 A2로 분류된 경우)
    const a2Data = sheetDataMap['A2'];
    if (a2Data) {
      a2Data.rows.forEach((row) => {
        if (row.key) {
          const process = processMap.get(row.key);
          if (process) {
            // 공정명 업데이트 (기존 값이 없거나 더 긴 값으로 업데이트)
            if (row.value && (!process.processName || row.value.length > process.processName.length)) {
              process.processName = row.value;
            }
            // 공정유형코드 업데이트 (빈 경우만, 사용자 직접 입력값)
            if (!process.processTypeCode && row.extra) {
              process.processTypeCode = row.extra;
            }
          } else {
            // A1에 없는 공정이면 새로 생성
            processMap.set(row.key, {
              processNo: row.key,
              processName: row.value || '',
              processTypeCode: row.extra || undefined,
              processDesc: [],
              productChars: [],
              productCharsSpecialChar: [],
              failureModes: [],
              workElements: [],
              workElements4M: [],
              elementFuncs: [],
              elementFuncs4M: [],
              elementFuncsWE: [],
              processChars: [],
              processChars4M: [],
              processCharsSpecialChar: [],
              processCharsWE: [],
              failureCauses: [],
              failureCauses4M: [],
              failureCausesWE: [],
              preventionCtrls: [],
              preventionCtrls4M: [],
              preventionCtrlsWE: [],
              detectionCtrls: [],
            });
          }
        }
      });
    }

    // A3-A6, B1-B5 데이터 매핑
    const sheetMapping: { sheet: string; field: keyof ProcessRelation }[] = [
      { sheet: 'A3', field: 'processDesc' },
      { sheet: 'A4', field: 'productChars' },
      { sheet: 'A5', field: 'failureModes' },
      { sheet: 'B1', field: 'workElements' },
      { sheet: 'B2', field: 'elementFuncs' },
      { sheet: 'B3', field: 'processChars' },
      { sheet: 'B4', field: 'failureCauses' },
      { sheet: 'A6', field: 'detectionCtrls' },
      { sheet: 'B5', field: 'preventionCtrls' },
    ];

    // ★★★ 2026-03-14 FIX: 멀티시트 중복 방지 — processNo+sheet+m4+value 기준 dedup ★★★
    // 이전: 중복 검사 없이 push → 엑셀 병합셀/반복행에서 같은 값 2회 push → 2배 복제
    // 수정: seen Set으로 dedup (싱글시트 파서의 addIfNew 패턴과 동일)
    const multiSheetSeen = new Set<string>();
    sheetMapping.forEach(({ sheet, field }) => {
      const sheetData = sheetDataMap[sheet];
      if (sheet === 'B5' || sheet === 'A6') {
        console.log(`[excel-parser] sheetMapping ${sheet}: sheetData=${sheetData ? sheetData.rows.length + '건' : 'NULL'}`);
      }
      if (sheetData) {
        sheetData.rows.forEach((row) => {
          const process = processMap.get(row.key);
          if (process && row.value) {
            // ★ 중복 검사: processNo + sheet + value 기준 (B5/A6는 m4 제외 — verify-counts distinct 기준과 일치)
            // B5(예방관리)/A6(검출관리): 같은 공정+값이면 m4가 달라도 중복으로 처리
            const dedupKey = (sheet === 'B5' || sheet === 'A6')
              ? `${row.key}|${sheet}|${row.value.trim()}`
              : `${row.key}|${sheet}|${row.m4 || ''}|${row.value.trim()}`;
            if (multiSheetSeen.has(dedupKey)) return;  // 중복 → 스킵
            multiSheetSeen.add(dedupKey);

            const idx = (process[field] as string[]).length;
            (process[field] as string[]).push(row.value);
            // 메타데이터 기록
            if (row.excelRow) {
              if (!process.itemMeta) process.itemMeta = {};
              process.itemMeta[`${sheet}-${idx}`] = {
                excelRow: row.excelRow,
                rowSpan: row.rowSpan,
                mergeGroupId: `${process.processNo}-${sheet}`,
              };
            }
            if (sheet === 'B1') {
              process.workElements4M.push(row.m4 || '');
            } else if (sheet === 'B2') {
              process.elementFuncs4M.push(row.m4 || '');
              process.elementFuncsWE.push(row.extra || '');
            } else if (sheet === 'B3') {
              process.processChars4M.push(row.m4 || '');
              process.processCharsSpecialChar.push(row.specialChar || '');
              process.processCharsWE.push(row.extra || '');
            } else if (sheet === 'B4') {
              process.failureCauses4M.push(row.m4 || '');
              process.failureCausesWE.push(row.extra || '');  // ★ 2026-03-15 FIX: FC 소속 WE 기록
            } else if (sheet === 'B5') {
              process.preventionCtrls4M.push(row.m4 || '');
              process.preventionCtrlsWE.push(row.extra || '');
            }
            if (sheet === 'A4') {
              process.productCharsSpecialChar.push(row.specialChar || '');
            }
          } else if (row.key && !processMap.has(row.key)) {
            // 공정이 없으면 생성 — 첫 행이므로 dedup 키 등록
            const newDedupKey = `${row.key}|${sheet}|${row.m4 || ''}|${row.value.trim()}`;
            multiSheetSeen.add(newDedupKey);
            const newProcess: ProcessRelation = {
              processNo: row.key,
              processName: '',
              processTypeCode: undefined,
              processDesc: [],
              productChars: [],
              productCharsSpecialChar: [],
              failureModes: [],
              workElements: [],
              workElements4M: [],
              elementFuncs: [],
              elementFuncs4M: [],
              elementFuncsWE: [],
              processChars: [],
              processChars4M: [],
              processCharsSpecialChar: [],
              processCharsWE: [],
              failureCauses: [],
              failureCauses4M: [],
              failureCausesWE: [],
              preventionCtrls: [],
              preventionCtrls4M: [],
              preventionCtrlsWE: [],
              detectionCtrls: [],
            };
            (newProcess[field] as string[]).push(row.value);
            if (row.excelRow) {
              newProcess.itemMeta = { [`${sheet}-0`]: { excelRow: row.excelRow, rowSpan: row.rowSpan, mergeGroupId: `${row.key}-${sheet}` } };
            }
            if (sheet === 'B1') {
              newProcess.workElements4M.push(row.m4 || '');
            } else if (sheet === 'B2') {
              newProcess.elementFuncs4M.push(row.m4 || '');
              newProcess.elementFuncsWE.push(row.extra || '');
            } else if (sheet === 'B3') {
              newProcess.processChars4M.push(row.m4 || '');
              newProcess.processCharsSpecialChar.push(row.specialChar || '');
              newProcess.processCharsWE.push(row.extra || '');
            } else if (sheet === 'B4') {
              newProcess.failureCauses4M.push(row.m4 || '');
            }
            if (sheet === 'A4') {
              newProcess.productCharsSpecialChar.push(row.specialChar || '');
            }
            processMap.set(row.key, newProcess);
          }
        });
      }
    });

    // 완제품별 관계형 데이터 구축
    const productMap = new Map<string, ProductRelation>();

    // C1 시트에서 구분 마스터 생성 (YOUR PLANT, SHIP TO PLANT, USER)
    const c1Data = sheetDataMap['C1'];
    if (c1Data) {
      c1Data.rows.forEach((row) => {
        // C1 시트: 1열이 구분, 2열부터 값들
        const productName = row.key || row.value;
        if (productName && !productMap.has(productName)) {
          productMap.set(productName, {
            productProcessName: productName,
            productFuncs: [],
            requirements: [],
            failureEffects: [],
          });
        }
      });
    }

    // C2-C4 데이터 매핑
    const productSheetMapping: { sheet: string; field: keyof ProductRelation }[] = [
      { sheet: 'C2', field: 'productFuncs' },
      { sheet: 'C3', field: 'requirements' },
      { sheet: 'C4', field: 'failureEffects' },
    ];

    productSheetMapping.forEach(({ sheet, field }) => {
      const sheetData = sheetDataMap[sheet];
      if (sheetData) {
        sheetData.rows.forEach((row) => {
          // C2-C4 시트: 1열이 C1의 구분과 매칭되어야 함
          // ★★★ 2026-02-02: key를 trim()하여 공백 문제 해결 ★★★
          const trimmedKey = row.key.trim();
          const product = productMap.get(trimmedKey);
          if (product && row.value) {
            const arr = product[field] as string[];
            if (!arr.includes(row.value)) {
              const idx = arr.length;
              arr.push(row.value);
              // ★★★ 2026-03-16: C2/C3/C4 itemMeta 기록 — rowSpan 기반 parentItemId 매핑에 필수 ★★★
              if (row.excelRow) {
                if (!product.itemMeta) product.itemMeta = {};
                product.itemMeta[`${sheet}-${idx}`] = {
                  excelRow: row.excelRow,
                  rowSpan: row.rowSpan,
                  mergeGroupId: `${trimmedKey}-${sheet}`,
                };
              }
            }
          } else if (trimmedKey && !productMap.has(trimmedKey)) {
            // C1에 없는 구분이면 자동 생성
            const newProduct: ProductRelation = {
              productProcessName: trimmedKey,
              productFuncs: [],
              requirements: [],
              failureEffects: [],
            };
            (newProduct[field] as string[]).push(row.value);
            // ★★★ 2026-03-16: 자동 생성된 product에도 itemMeta 기록 ★★★
            if (row.excelRow) {
              newProduct.itemMeta = {
                [`${sheet}-0`]: { excelRow: row.excelRow, rowSpan: row.rowSpan, mergeGroupId: `${trimmedKey}-${sheet}` },
              };
            }
            productMap.set(trimmedKey, newProduct);
          }
        });
      }
    });

    // L1 통합시트 매핑으로 C3 itemMeta.parentItemId 보정
    // C1 구분 전체명↔약어 정규화 — "YOUR PLANT"↔"YP" 불일치 해소
    const normText = (s: string) => s.trim().replace(/\s+/g, ' ');
    // C1 카테고리 전체명 → 약어 매핑 (useImportFileHandlers.ts C1_CATEGORY_MAP와 동일)
    const C1_ABBREV_MAP: Record<string, string> = {
      'your plant': 'YP', 'yourplant': 'YP',
      'ship to plant': 'SP', 'shiptoplant': 'SP',
      'user': 'USER', 'end user': 'USER', 'enduser': 'USER',
      '자사공장': 'YP', '고객사': 'SP', '최종사용자': 'USER',
    };
    const abbrevC1 = (s: string): string => {
      const lower = s.toLowerCase().replace(/\s+/g, '');
      return C1_ABBREV_MAP[lower] ?? C1_ABBREV_MAP[s.toLowerCase().trim()] ?? s;
    };
    // 정규화 키 맵: 원본 맵에서 못 찾을 경우를 위한 보조 맵 (정규화된 c1+c3 → c2)
    // ★ c1 약어 정규화 포함: "YOUR PLANT|req" → also stored as "YP|req"
    const l1UnifiedC3ToC2Norm = new Map<string, string>();
    for (const [k, v] of l1UnifiedC3ToC2.entries()) {
      const [c1Part, ...c3Parts] = k.split('|');
      const c3Norm = normText(c3Parts.join('|'));
      l1UnifiedC3ToC2Norm.set(`${normText(c1Part)}|${c3Norm}`, v);
      // also store abbreviated C1 key for cross-format lookup
      const c1Abbrev = abbrevC1(c1Part);
      l1UnifiedC3ToC2Norm.set(`${c1Abbrev}|${c3Norm}`, v);
    }
    if (l1UnifiedC3ToC2.size > 0) {
      let c3ParentAssigned = 0;
      let c3C2NotFound = 0;
      let c3MapMiss = 0;
      for (const [c1Key, product] of productMap.entries()) {
        product.requirements.forEach((c3Val, c3Idx) => {
          const c3ValNorm = normText(c3Val);
          const key1 = `${c1Key}|${c3Val}`;
          const key2 = `${normText(c1Key)}|${c3ValNorm}`;
          const key3 = `${abbrevC1(c1Key)}|${c3ValNorm}`;
          const c2Val = l1UnifiedC3ToC2.get(key1)
            ?? l1UnifiedC3ToC2Norm.get(key2)
            ?? l1UnifiedC3ToC2Norm.get(key3);
          if (!c2Val) {
            c3MapMiss++;
            console.warn(`[l1UnifiedC3ToC2] 맵 미스 — c1="${c1Key}" c3="${c3Val.substring(0,40)}" keys=["${key1.substring(0,50)}","${key3.substring(0,50)}"]`);
            return;
          }
          const c2ValNorm = normText(c2Val);
          const c2Idx = product.productFuncs.findIndex(f => {
            const fn = normText(f);
            return fn === c2ValNorm || fn.startsWith(c2ValNorm) || c2ValNorm.startsWith(fn);
          });
          let resolvedC2Idx = c2Idx;
          if (c2Idx < 0) {
            // ★★★ 2026-03-17 FIX: C2가 productFuncs에 없으면 L1_UNIFIED 값으로 보충
            // 이유: 개별 L1 시트에 C2(제품기능) 열이 없거나 텍스트 불일치 시 발생
            // 해결: productFuncs에 없는 경우 c2Val을 추가 → useImportFileHandlers에서 C2 flat item 자동 생성
            // ★ 중복 방지: 같은 c2Val이 이미 추가되었으면 해당 인덱스 재사용
            const existingIdx = product.productFuncs.findIndex(f => normText(f) === c2ValNorm);
            if (existingIdx >= 0) {
              resolvedC2Idx = existingIdx;
            } else {
              resolvedC2Idx = product.productFuncs.length;
              product.productFuncs.push(c2Val);
              console.info(`[l1UnifiedC3ToC2] C2 보충 — c1="${c1Key}" c2Val="${c2Val.substring(0,40)}" (idx=${resolvedC2Idx})`);
            }
            c3C2NotFound++;
          }
          // ★ c1Key를 약어로 정규화 — flat item id는 normalizeC1 결과(예: "YP")를 사용하기 때문
          const parentId = `C2-${abbrevC1(c1Key)}-${resolvedC2Idx}`;
          if (!product.itemMeta) product.itemMeta = {};
          const existing = product.itemMeta[`C3-${c3Idx}`];
          if (existing) {
            existing.parentItemId = parentId;
          } else {
            product.itemMeta[`C3-${c3Idx}`] = { parentItemId: parentId };
          }
          c3ParentAssigned++;
        });
      }
      console.log(`[l1UnifiedC3ToC2] 결과 — 할당성공: ${c3ParentAssigned}건, C2못찾음: ${c3C2NotFound}건, 맵미스: ${c3MapMiss}건 (map.size=${l1UnifiedC3ToC2.size})`);
    }

    // ★★★ 2026-02-17: B1~B4 데이터를 4M 순서(MN→MC→IM→EN)로 정렬 ★★★
    // 공용 상수 m4SortValue (constants.ts) 사용 — 중복 정의 방지
    for (const proc of processMap.values()) {
      // B1: workElements + workElements4M (병렬 배열)
      if (proc.workElements4M.length > 0 && proc.workElements4M.some(m => m)) {
        const paired = proc.workElements.map((v, i) => ({ v, m4: proc.workElements4M[i] || '' }));
        paired.sort((a, b) => m4SortValue(a.m4) - m4SortValue(b.m4));
        proc.workElements = paired.map(p => p.v);
        proc.workElements4M = paired.map(p => p.m4);
      }
      // B2: elementFuncs + elementFuncs4M + elementFuncsWE
      if (proc.elementFuncs4M.length > 0 && proc.elementFuncs4M.some(m => m)) {
        const paired = proc.elementFuncs.map((v, i) => ({ v, m4: proc.elementFuncs4M[i] || '', we: proc.elementFuncsWE[i] || '' }));
        paired.sort((a, b) => m4SortValue(a.m4) - m4SortValue(b.m4));
        proc.elementFuncs = paired.map(p => p.v);
        proc.elementFuncs4M = paired.map(p => p.m4);
        proc.elementFuncsWE = paired.map(p => p.we);
      }
      // B3: processChars + processChars4M + processCharsSpecialChar + processCharsWE
      if (proc.processChars4M.length > 0 && proc.processChars4M.some(m => m)) {
        const paired = proc.processChars.map((v, i) => ({ v, m4: proc.processChars4M[i] || '', sc: proc.processCharsSpecialChar[i] || '', we: proc.processCharsWE[i] || '' }));
        paired.sort((a, b) => m4SortValue(a.m4) - m4SortValue(b.m4));
        proc.processChars = paired.map(p => p.v);
        proc.processChars4M = paired.map(p => p.m4);
        proc.processCharsSpecialChar = paired.map(p => p.sc);
        proc.processCharsWE = paired.map(p => p.we);
      }
      // B4: failureCauses + failureCauses4M + failureCausesWE
      if (proc.failureCauses4M.length > 0 && proc.failureCauses4M.some(m => m)) {
        const paired = proc.failureCauses.map((v, i) => ({ v, m4: proc.failureCauses4M[i] || '', we: proc.failureCausesWE?.[i] || '' }));
        paired.sort((a, b) => m4SortValue(a.m4) - m4SortValue(b.m4));
        proc.failureCauses = paired.map(p => p.v);
        proc.failureCauses4M = paired.map(p => p.m4);
        proc.failureCausesWE = paired.map(p => p.we);
      }
    }

    // ★★★ 2026-02-17: B1-B2 검증은 hierarchy-validation.ts로 이관 ★★★
    // useImportFileHandlers.ts에서 파싱 후 validateHierarchy() 호출

    // ★ 공통공정('공통')은 실제 데이터가 있을 때만 포함 (빈 문자열만 있으면 제거)
    if (processMap.has('공통')) {
      const com = processMap.get('공통')!;
      const nonEmpty = (arr: string[]) => arr.some(v => v.trim() !== '');
      const hasData = (com.processName && com.processName.trim() !== '')
        || nonEmpty(com.processDesc) || nonEmpty(com.productChars)
        || nonEmpty(com.failureModes)
        || nonEmpty(com.workElements) || nonEmpty(com.elementFuncs)
        || nonEmpty(com.processChars) || nonEmpty(com.failureCauses);
      if (!hasData) processMap.delete('공통');
    }

    // ★★★ 2026-02-22: FC_고장사슬 시트 파싱 — STEP B 확정 데이터 ★★★
    const fcSheet = findFCSheet(workbook);
    const failureChains = fcSheet ? parseFCSheet(fcSheet) : [];
    if (fcSheet) {
      sheetSummary.push({ name: fcSheet.name, rowCount: failureChains.length });
    }

    // ★ v2.5.1: 멀티시트 통계 생성 (ProcessRelation에서 역산)
    const multiProcesses = Array.from(processMap.values());
    const multiProducts = Array.from(productMap.values());
    const multiStatistics = buildMultiSheetStatistics(multiProcesses, multiProducts, failureChains.length, sheetSummary);

    // ★★★ FC시트 독립 스캔 — rawFingerprint 생성 (멀티시트도 검증 가능) ★★★
    if (fcSheet) {
      try {
        const { detectColumnMap: detectFCColumns } = await import('./excel-parser-fc');
        const { headerRow: fcHdr, colMap: fcCols } = detectFCColumns(fcSheet);
        if (fcCols.processNo > 0 && fcCols.fmValue > 0) {
          const fcFingerprint = scanRawFingerprint(
            fcSheet, fcHdr + 1,
            fcCols.processNo, fcCols.fmValue, fcCols.fcValue, fcCols.feValue,
          );
          multiStatistics.rawFingerprint = fcFingerprint;
        }
      } catch (e) {
      }
    }

    // ★★★ 2026-02-27: 고장사슬 기반 공정별 FC/FE 통계 (검증표 표시용) ★★★
    // Scanner와 동일 방식: FM별 고유 FC/FE를 합산 (process 단위 합계)
    if (failureChains.length > 0) {
      const chainMap = new Map<string, { fcByFm: Map<string, Set<string>>; feByFm: Map<string, Set<string>>; chainRows: number }>();
      for (const chain of failureChains) {
        const pNo = chain.processNo;
        if (!chainMap.has(pNo)) {
          chainMap.set(pNo, { fcByFm: new Map(), feByFm: new Map(), chainRows: 0 });
        }
        const entry = chainMap.get(pNo)!;
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
      const chainProcessStats: Record<string, { fcTotal: number; feTotal: number; chainRows: number }> = {};
      for (const [pNo, data] of chainMap.entries()) {
        let fcTotal = 0;
        for (const fcSet of data.fcByFm.values()) fcTotal += fcSet.size;
        let feTotal = 0;
        for (const feSet of data.feByFm.values()) feTotal += feSet.size;
        chainProcessStats[pNo] = { fcTotal, feTotal, chainRows: data.chainRows };
      }
      multiStatistics.chainProcessStats = chainProcessStats;
    }

    // ★★★ 2026-02-24: VERIFY 시트에서 엑셀 수식 검증값 읽기 ★★★
    const excelFormulas = readVerifySheet(workbook);
    if (excelFormulas) {
      multiStatistics.excelFormulas = excelFormulas;
      if (multiStatistics.rawFingerprint) {
        multiStatistics.rawFingerprint.excelFormulas = excelFormulas;
      }

      // ★ 파서 vs VERIFY 비교 진단
      const parserA5 = multiStatistics.itemStats.find(s => s.itemCode === 'A5')?.uniqueCount ?? 0;
      const parserB4 = multiStatistics.itemStats.find(s => s.itemCode === 'B4')?.uniqueCount ?? 0;
      const parserC4 = multiStatistics.itemStats.find(s => s.itemCode === 'C4')?.uniqueCount ?? 0;
      const parserChain = failureChains.length;
      const mismatches: string[] = [];
      if (excelFormulas.fmCount !== parserA5) mismatches.push(`FM: VERIFY=${excelFormulas.fmCount} vs 파서=${parserA5}`);
      if (excelFormulas.fcCount !== parserB4) mismatches.push(`FC: VERIFY=${excelFormulas.fcCount} vs 파서=${parserB4}`);
      if (excelFormulas.feCount !== parserC4) mismatches.push(`FE: VERIFY=${excelFormulas.feCount} vs 파서=${parserC4}`);
      if (excelFormulas.chainCount !== parserChain) mismatches.push(`Chain: VERIFY=${excelFormulas.chainCount} vs 파서=${parserChain}`);
      if (mismatches.length > 0) {
      } else {
      }
    }

    // [SC-DIAG] 파싱 결과 specialChar 요약
    {
      let a4Total = 0, a4SC = 0, b3Total = 0, b3SC = 0;
      for (const p of multiProcesses) {
        a4Total += p.productChars.length;
        a4SC += p.productCharsSpecialChar.filter(s => s && s.trim()).length;
        b3Total += p.processChars.length;
        b3SC += p.processCharsSpecialChar.filter(s => s && s.trim()).length;
      }
      if (a4SC === 0 && b3SC === 0) {
      }
    }

    return {
      success: true,  // 파싱 성공 여부만 반환 (상하관계 검증은 별도)
      processes: multiProcesses,
      products: multiProducts,
      failureChains,
      sheetSummary,
      errors,
      statistics: multiStatistics,
    };
  } catch (error) {
    return {
      success: false,
      processes: [],
      products: [],
      failureChains: [],
      sheetSummary,
      errors: [`파일 파싱 오류: ${error}`],
    };
  }
}

/** ★ v2.5.1: 멀티시트 파서용 통계 생성 (ProcessRelation에서 역산) */
function buildMultiSheetStatistics(
  processes: ProcessRelation[],
  products: ProductRelation[],
  chainCount: number,
  sheetSummary: { name: string; rowCount: number }[],
): ParseStatistics {
  const ITEM_LABELS: Record<string, string> = {
    A3: '공정기능', A4: '제품특성', A5: '고장형태', A6: '검출관리',
    B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인', B5: '예방관리',
    C2: '제품기능', C3: '요구사항', C4: '고장영향',
  };

  // ★ 통계: raw=배열길이, unique=Set 중복제거 (Scanner와 동일 기준으로 비교)
  const itemTotals: Record<string, number> = {};
  const processStats: ProcessItemStat[] = [];

  for (const proc of processes) {
    const pItems: Record<string, { raw: number; unique: number }> = {};
    const add = (code: string, arr: string[]) => {
      const raw = arr.length;
      const unique = new Set(arr.map(s => s.trim())).size;
      pItems[code] = { raw, unique };
      itemTotals[code] = (itemTotals[code] || 0) + unique;
    };
    add('A3', proc.processDesc);
    add('A4', proc.productChars);
    add('A5', proc.failureModes);
    add('B1', proc.workElements);
    add('B2', proc.elementFuncs);
    add('B3', proc.processChars);
    add('B4', proc.failureCauses);
    add('A6', proc.detectionCtrls);
    add('B5', proc.preventionCtrls);
    processStats.push({ processNo: proc.processNo, processName: proc.processName || '', items: pItems });
  }

  // C 레벨
  for (const prod of products) {
    const add = (code: string, count: number) => {
      itemTotals[code] = (itemTotals[code] || 0) + count;
    };
    add('C2', prod.productFuncs.length);
    add('C3', prod.requirements.length);
    add('C4', prod.failureEffects.length);
  }

  processStats.sort((a, b) => (parseInt(a.processNo) || 0) - (parseInt(b.processNo) || 0));

  const itemStats: ItemCodeStat[] = Object.entries(itemTotals).map(([code, count]) => ({
    itemCode: code,
    label: ITEM_LABELS[code] || code,
    rawCount: count,
    uniqueCount: count,
    dupSkipped: 0,  // 멀티시트는 시트별 분리이므로 중복 없음
  }));
  itemStats.sort((a, b) => a.itemCode.localeCompare(b.itemCode));

  const totalRows = sheetSummary.reduce((s, sh) => s + sh.rowCount, 0);

  return { source: 'import', totalRows, itemStats, processStats, chainCount };
}

/** 파싱 결과 통계 */
export function getParseStats(result: ParseResult) {
  return {
    totalProcesses: result.processes.length,
    totalProducts: result.products.length,
    aLevelItems: result.processes.reduce((sum, p) =>
      sum + p.productChars.length + p.failureModes.length, 0),
    bLevelItems: result.processes.reduce((sum, p) =>
      sum + p.workElements.length + p.failureCauses.length, 0),
    cLevelItems: result.products.reduce((sum, p) =>
      sum + p.productFuncs.length + p.requirements.length + p.failureEffects.length, 0),
  };
}
