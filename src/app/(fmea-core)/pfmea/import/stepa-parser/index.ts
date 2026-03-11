/**
 * @file index.ts
 * @description STEP A 전처리 오케스트레이터 + mergeStepAB 병합 로직
 * STEP A = 구조/기능분석만 (A1~A4, B1~B3, C1~C3)
 * STEP B = 고장/리스크 포함 전체
 * @created 2026-03-05
 */

import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import type { ImportedFlatData } from '../types';
import { WarningCollector } from '../stepb-parser/types';
import type { StepBWarning, StepBConvertResult, StepBStatistics } from '../stepb-parser/types';
import { isStepASheet, detectStepAColumns } from './header-detector';
import { parseStepARows } from './row-parser';

// ── STEP A 타입 정의 ──

export interface StepARawRow {
  excelRow: number;
  procNo: string;
  procName: string;
  l1Name: string;
  l1Func: string;
  l1_4m: string;
  l1We: string;
  l1Scope: string;
  l1ScopeNorm: string;
  l2Func: string;        // A3 공정기능 / A4 제품특성
  l2_4m: string;
  l2We: string;
  l2ElemFunc: string;     // B2 요소기능 / B3 공정특성
  c2Func: string;         // C2 제품기능
  c3Req: string;          // C3 요구사항
  sc: string;             // 특별특성 원본
  scNorm: string;         // 정규화된 SC
}

export interface StepAStatistics {
  processCount: number;
  a3Count: number;
  b2Count: number;
  a4Count: number;
  b3Count: number;
  c2Count: number;
  c3Count: number;
}

export interface StepAConvertResult {
  flatData: ImportedFlatData[];
  warnings: StepBWarning[];
  statistics: StepAStatistics;
}

// ══════════════════════════════════════════════════════════════
// STEP A 파이프라인
// ══════════════════════════════════════════════════════════════

/**
 * STEP A .xlsx 파일을 ImportedFlatData[]로 변환
 *
 * 파이프라인:
 * 1. ExcelJS로 워크북 로드
 * 2. isStepASheet() 검증
 * 3. detectStepAColumns() → 헤더 감지
 * 4. parseStepARows() → 행 파싱
 * 5. buildStepAFlatData() → ImportedFlatData[] 빌드
 */
export async function parseStepAWorkbook(file: File): Promise<StepAConvertResult> {
  const warn = new WarningCollector();

  // 1. ExcelJS 워크북 로드
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    warn.error('STEPA_NO_SHEET', 'STEP A 워크시트가 없습니다.');
    return emptyResult(warn);
  }

  // 2. STEP A 시트 검증
  if (!isStepASheet(worksheet)) {
    warn.warn('STEPA_NOT_DETECTED', 'STEP A 형식이 감지되지 않았습니다. 고장데이터가 있으면 STEP B로 처리됩니다.');
  }

  // 3. 헤더 자동 감지
  const { colMap, headerRow } = detectStepAColumns(worksheet, warn);

  // 4. 행 파싱
  const parsedRows = parseStepARows(worksheet, colMap, headerRow, warn);

  if (parsedRows.length === 0) {
    warn.error('STEPA_NO_DATA', 'STEP A 파싱된 데이터가 없습니다.');
    return emptyResult(warn);
  }

  // 5. ImportedFlatData[] 빌드
  const flatData = buildStepAFlatData(parsedRows, warn);

  // 6. 통계
  const statistics = computeStepAStats(parsedRows);

  return {
    flatData,
    warnings: warn.getAll(),
    statistics,
  };
}

// ══════════════════════════════════════════════════════════════
// STEP A → ImportedFlatData[] 빌드
// ══════════════════════════════════════════════════════════════

function buildStepAFlatData(rows: StepARawRow[], warn: WarningCollector): ImportedFlatData[] {
  const flatData: ImportedFlatData[] = [];
  const now = new Date();

  // 중복 방지 세트
  const seen = {
    a1a2: new Set<string>(),
    a3: new Set<string>(),
    a4: new Set<string>(),
    b1: new Set<string>(),
    b2: new Set<string>(),
    b3: new Set<string>(),
    c1: new Set<string>(),
    c2: new Set<string>(),
    c3: new Set<string>(),
  };

  for (const r of rows) {
    const pno = r.procNo;
    if (!pno) continue;

    // 공정명 추출
    const procName = r.procName.replace(new RegExp(`^${pno}번[-\\s]*`), '').trim();

    // A1 공정번호 + A2 공정명
    if (!seen.a1a2.has(pno)) {
      seen.a1a2.add(pno);
      flatData.push({
        id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A1',
        value: pno, createdAt: now,
      });
      flatData.push({
        id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A2',
        value: procName || r.procName, createdAt: now,
      });
    }

    // A3 공정기능
    if (r.l2Func) {
      const a3Key = `${pno}|A3`;
      if (!seen.a3.has(a3Key)) {
        seen.a3.add(a3Key);
        flatData.push({
          id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A3',
          value: r.l2Func, createdAt: now,
        });
      }
    }

    // A4 제품특성 (l2Func에서 추출 — STEP A에서는 같은 컬럼)
    if (r.l2Func) {
      const a4Key = `${pno}|${r.l2Func}`;
      if (!seen.a4.has(a4Key)) {
        seen.a4.add(a4Key);
        flatData.push({
          id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A4',
          value: r.l2Func, specialChar: r.scNorm || undefined, createdAt: now,
        });
      }
    }

    // B1 작업요소 + B2 요소기능
    const m4 = r.l2_4m.trim() || r.l1_4m.trim();
    const we = r.l2We.trim() || r.l1We.trim();

    if (m4 && we) {
      const b1Key = `${pno}|${m4}|${we}`;
      if (!seen.b1.has(b1Key)) {
        seen.b1.add(b1Key);
        flatData.push({
          id: uuidv4(), processNo: pno, category: 'B', itemCode: 'B1',
          value: we, m4, createdAt: now,
        });
      }

      // B2 요소기능
      if (r.l2ElemFunc) {
        const b2Key = `${pno}|${m4}|${we}|${r.l2ElemFunc}`;
        if (!seen.b2.has(b2Key)) {
          seen.b2.add(b2Key);
          flatData.push({
            id: uuidv4(), processNo: pno, category: 'B', itemCode: 'B2',
            value: r.l2ElemFunc, m4, createdAt: now,
          });
        }
      }

      // B3 공정특성
      if (r.l2ElemFunc) {
        const b3Key = `${pno}|${m4}|${we}|${r.l2ElemFunc}`;
        if (!seen.b3.has(b3Key)) {
          seen.b3.add(b3Key);
          flatData.push({
            id: uuidv4(), processNo: pno, category: 'B', itemCode: 'B3',
            value: r.l2ElemFunc, m4, specialChar: r.scNorm || undefined, createdAt: now,
          });
        }
      }
    }

    // C1 구분
    if (r.l1ScopeNorm) {
      if (!seen.c1.has(r.l1ScopeNorm)) {
        seen.c1.add(r.l1ScopeNorm);
        flatData.push({
          id: uuidv4(), processNo: r.l1ScopeNorm, category: 'C', itemCode: 'C1',
          value: r.l1ScopeNorm, createdAt: now,
        });
      }
    }

    // C2 제품기능
    if (r.c2Func) {
      const c2Key = `${r.l1ScopeNorm || 'YP'}|${r.c2Func}`;
      if (!seen.c2.has(c2Key)) {
        seen.c2.add(c2Key);
        flatData.push({
          id: uuidv4(), processNo: r.l1ScopeNorm || 'YP', category: 'C', itemCode: 'C2',
          value: r.c2Func, createdAt: now,
        });
      }
    }

    // C3 요구사항
    if (r.c3Req) {
      const c3Key = `${r.l1ScopeNorm || 'YP'}|${r.c3Req}`;
      if (!seen.c3.has(c3Key)) {
        seen.c3.add(c3Key);
        flatData.push({
          id: uuidv4(), processNo: r.l1ScopeNorm || 'YP', category: 'C', itemCode: 'C3',
          value: r.c3Req, createdAt: now,
        });
      }
    }
  }

  warn.info('STEPA_BUILD_DONE', `STEP A flatData: ${flatData.length}건`);
  return flatData;
}

function computeStepAStats(rows: StepARawRow[]): StepAStatistics {
  const processes = new Set(rows.map(r => r.procNo).filter(Boolean));
  const a3Set = new Set<string>();
  const b2Set = new Set<string>();
  const a4Set = new Set<string>();
  const b3Set = new Set<string>();
  const c2Set = new Set<string>();
  const c3Set = new Set<string>();

  for (const r of rows) {
    if (r.l2Func) a3Set.add(`${r.procNo}|${r.l2Func}`);
    if (r.l2Func) a4Set.add(`${r.procNo}|${r.l2Func}`);
    if (r.l2ElemFunc) b2Set.add(`${r.procNo}|${r.l2ElemFunc}`);
    if (r.l2ElemFunc) b3Set.add(`${r.procNo}|${r.l2ElemFunc}`);
    if (r.c2Func) c2Set.add(r.c2Func);
    if (r.c3Req) c3Set.add(r.c3Req);
  }

  return {
    processCount: processes.size,
    a3Count: a3Set.size,
    b2Count: b2Set.size,
    a4Count: a4Set.size,
    b3Count: b3Set.size,
    c2Count: c2Set.size,
    c3Count: c3Set.size,
  };
}

// ══════════════════════════════════════════════════════════════
// mergeStepAB — STEP A 데이터로 STEP B 결과 보강
// ══════════════════════════════════════════════════════════════

/**
 * STEP A 데이터를 STEP B 결과에 병합
 *
 * 병합 규칙:
 * 1. A3: STEP B inherited=true → STEP A 원본으로 교체
 * 2. B2: STEP B inherited=true → STEP A 원본으로 교체
 * 3. A4: STEP A의 specialChar 추가
 * 4. B3: STEP A의 specialChar 추가
 * 5. C2: STEP A에서 신규 추가
 * 6. C3: STEP A에서 신규 추가
 * 7. 나머지(A5, B4, C4, FC사슬): STEP B 유지
 */
export function mergeStepAB(
  stepA: StepAConvertResult,
  stepB: StepBConvertResult,
): StepBConvertResult {
  const mergedWarnings: StepBWarning[] = [...stepA.warnings, ...stepB.warnings];

  // STEP A 데이터를 processNo 기준 Map으로 인덱싱
  const stepAByKey = new Map<string, ImportedFlatData>();
  for (const item of stepA.flatData) {
    const key = `${item.processNo}|${item.itemCode}`;
    // 같은 키가 여러 개일 수 있으므로 첫 번째만 (A3, B2는 공정당 1개)
    if (!stepAByKey.has(key)) {
      stepAByKey.set(key, item);
    }
  }

  // STEP A A4/B3 specialChar 인덱스
  const stepASCMap = new Map<string, string>();
  for (const item of stepA.flatData) {
    if ((item.itemCode === 'A4' || item.itemCode === 'B3') && item.specialChar) {
      const key = `${item.processNo}|${item.itemCode}|${item.value}`;
      stepASCMap.set(key, item.specialChar);
    }
  }

  // STEP B flatData 복사 + 병합
  let replacedA3 = 0;
  let replacedB2 = 0;
  let enrichedSC = 0;

  const mergedFlatData = stepB.flatData.map(item => {
    // A3 대체: inherited=true이면 STEP A 원본으로 교체
    if (item.itemCode === 'A3' && item.inherited) {
      const stepAItem = stepAByKey.get(`${item.processNo}|A3`);
      if (stepAItem) {
        replacedA3++;
        return { ...item, value: stepAItem.value, inherited: false };
      }
    }

    // B2 대체: inherited=true이면 STEP A 원본으로 교체
    if (item.itemCode === 'B2' && item.inherited) {
      const stepAItem = stepAByKey.get(`${item.processNo}|B2`);
      if (stepAItem) {
        replacedB2++;
        return { ...item, value: stepAItem.value, inherited: false };
      }
    }

    // A4/B3 specialChar 보강
    if ((item.itemCode === 'A4' || item.itemCode === 'B3') && !item.specialChar) {
      const scKey = `${item.processNo}|${item.itemCode}|${item.value}`;
      const sc = stepASCMap.get(scKey);
      if (sc) {
        enrichedSC++;
        return { ...item, specialChar: sc };
      }
    }

    return item;
  });

  // C2, C3 항목 추가 (STEP A에서만 존재)
  const existingC2Keys = new Set(
    mergedFlatData.filter(d => d.itemCode === 'C2').map(d => `${d.processNo}|${d.value}`)
  );
  const existingC3Keys = new Set(
    mergedFlatData.filter(d => d.itemCode === 'C3').map(d => `${d.processNo}|${d.value}`)
  );

  let addedC2 = 0;
  let addedC3 = 0;

  for (const item of stepA.flatData) {
    if (item.itemCode === 'C2') {
      const key = `${item.processNo}|${item.value}`;
      if (!existingC2Keys.has(key)) {
        mergedFlatData.push(item);
        existingC2Keys.add(key);
        addedC2++;
      }
    }
    if (item.itemCode === 'C3') {
      const key = `${item.processNo}|${item.value}`;
      if (!existingC3Keys.has(key)) {
        mergedFlatData.push(item);
        existingC3Keys.add(key);
        addedC3++;
      }
    }
  }

  // 병합 리포트
  const mergeDetails: string[] = [];
  if (replacedA3 > 0) mergeDetails.push(`A3 대체: ${replacedA3}건`);
  if (replacedB2 > 0) mergeDetails.push(`B2 대체: ${replacedB2}건`);
  if (enrichedSC > 0) mergeDetails.push(`특별특성 보강: ${enrichedSC}건`);
  if (addedC2 > 0) mergeDetails.push(`C2 추가: ${addedC2}건`);
  if (addedC3 > 0) mergeDetails.push(`C3 추가: ${addedC3}건`);

  mergedWarnings.push({
    level: 'INFO',
    code: 'STEP_A_MERGE',
    message: `STEP A 병합 완료 — ${mergeDetails.join(', ') || '변경 없음'}`,
  });

  // 통계 재계산
  const autoGeneratedCount = mergedFlatData.filter(d => d.inherited).length;
  const mergedStatistics: StepBStatistics = {
    ...stepB.statistics,
    autoGeneratedCount,
  };

  return {
    flatData: mergedFlatData,
    failureChains: stepB.failureChains,
    warnings: mergedWarnings,
    statistics: mergedStatistics,
  };
}

function emptyResult(warn: WarningCollector): StepAConvertResult {
  return {
    flatData: [],
    warnings: warn.getAll(),
    statistics: {
      processCount: 0, a3Count: 0, b2Count: 0,
      a4Count: 0, b3Count: 0, c2Count: 0, c3Count: 0,
    },
  };
}

// StepAConvertResult and StepAStatistics are already exported above via interface declarations
