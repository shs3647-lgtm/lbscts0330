/**
 * @file useVerificationData.ts
 * @description 역전개 검증 데이터 처리 훅
 * - processedFMGroups에서 FE/FM/FC 데이터를 추출하고 레벨별 그룹핑+정렬+rowSpan 계산
 */

import { useMemo } from 'react';
import type { ProcessedFMGroup } from '../processFailureLinks';
import type { VerificationMode, FlatFERow, FlatFMRow, FlatFCRow, SpannedRow, VerificationStats } from './types';

// M4 정렬 순서 (constants.ts의 M4_SORT_ORDER와 동일)
const M4_ORDER: Record<string, number> = { MN: 0, MC: 1, IM: 2, EN: 3 };
const m4Sort = (m4: string) => M4_ORDER[(m4 || '').toUpperCase()] ?? 99;

// FE 구분 정렬 순서
const FE_CATEGORY_ORDER: Record<string, number> = { YP: 0, SP: 1, USER: 2 };
const feCategorySort = (cat: string) => FE_CATEGORY_ORDER[(cat || '').toUpperCase()] ?? 99;

/** processNo 숫자 파싱 (정렬용) */
const parseProcessNo = (no: string): number => {
  const num = Number.parseInt(String(no || '').trim(), 10);
  return Number.isNaN(num) ? Number.MAX_SAFE_INTEGER : num;
};

// ============ FE 데이터 빌드 ============

function buildFERows(groups: ProcessedFMGroup[]): FlatFERow[] {
  const seen = new Set<string>();
  const rows: FlatFERow[] = [];

  groups.forEach(g => {
    g.rows.forEach(row => {
      if (!row.feId || seen.has(row.feId)) return;
      seen.add(row.feId);
      rows.push({
        feId: row.feId,
        feCategory: row.feCategory || '미분류',
        feFunctionName: row.feFunctionName || '-',
        feRequirement: row.feRequirement || '-',
        feText: row.feText || '-',
        feSeverity: row.feSeverity,
      });
    });
  });

  // 정렬: 구분(YP→SP→USER) → 기능명 → 요구사항명
  rows.sort((a, b) => {
    const catDiff = feCategorySort(a.feCategory) - feCategorySort(b.feCategory);
    if (catDiff !== 0) return catDiff;
    const funcDiff = a.feFunctionName.localeCompare(b.feFunctionName, 'ko');
    if (funcDiff !== 0) return funcDiff;
    return a.feRequirement.localeCompare(b.feRequirement, 'ko');
  });

  return rows;
}

/** FE rowSpan 계산: feCategory → feFunctionName → feRequirement */
function buildFESpannedRows(rows: FlatFERow[]): SpannedRow<FlatFERow>[] {
  const result: SpannedRow<FlatFERow>[] = rows.map(r => ({
    data: r,
    spans: { feCategory: 1, feFunctionName: 1, feRequirement: 1 },
  }));

  for (let i = rows.length - 1; i >= 0; i--) {
    // feRequirement 병합: 같은 category + function + requirement
    if (i > 0 &&
      rows[i].feCategory === rows[i - 1].feCategory &&
      rows[i].feFunctionName === rows[i - 1].feFunctionName &&
      rows[i].feRequirement === rows[i - 1].feRequirement) {
      result[i - 1].spans.feRequirement = result[i].spans.feRequirement + 1;
      result[i].spans.feRequirement = 0;
    }
    // feFunctionName 병합: 같은 category + function
    if (i > 0 &&
      rows[i].feCategory === rows[i - 1].feCategory &&
      rows[i].feFunctionName === rows[i - 1].feFunctionName) {
      result[i - 1].spans.feFunctionName = result[i].spans.feFunctionName + 1;
      result[i].spans.feFunctionName = 0;
    }
    // feCategory 병합: 같은 category
    if (i > 0 && rows[i].feCategory === rows[i - 1].feCategory) {
      result[i - 1].spans.feCategory = result[i].spans.feCategory + 1;
      result[i].spans.feCategory = 0;
    }
  }

  return result;
}

// ============ FM 데이터 빌드 ============

function buildFMRows(groups: ProcessedFMGroup[]): FlatFMRow[] {
  // FM은 이미 그룹 단위 — 각 group이 하나의 FM
  const rows: FlatFMRow[] = groups.map(g => ({
    fmId: g.fmId,
    processNo: g.fmProcessNo || '-',
    processName: g.fmProcessName || '-',
    processFunction: g.fmProcessFunction || '-',
    productChar: g.fmProductChar || '-',
    fmText: g.fmText || '-',
  }));

  // 정렬: processNo 숫자순 → 기능명 → FM 텍스트
  rows.sort((a, b) => {
    const noDiff = parseProcessNo(a.processNo) - parseProcessNo(b.processNo);
    if (noDiff !== 0) return noDiff;
    const funcDiff = a.processFunction.localeCompare(b.processFunction, 'ko');
    if (funcDiff !== 0) return funcDiff;
    return a.fmText.localeCompare(b.fmText, 'ko');
  });

  return rows;
}

/** FM rowSpan 계산: processKey → processFunction → productChar */
function buildFMSpannedRows(rows: FlatFMRow[]): SpannedRow<FlatFMRow>[] {
  const result: SpannedRow<FlatFMRow>[] = rows.map(r => ({
    data: r,
    spans: { process: 1, processFunction: 1, productChar: 1 },
  }));

  const processKey = (r: FlatFMRow) => `${r.processNo}|${r.processName}`;

  for (let i = rows.length - 1; i >= 0; i--) {
    // productChar 병합
    if (i > 0 &&
      processKey(rows[i]) === processKey(rows[i - 1]) &&
      rows[i].processFunction === rows[i - 1].processFunction &&
      rows[i].productChar === rows[i - 1].productChar) {
      result[i - 1].spans.productChar = result[i].spans.productChar + 1;
      result[i].spans.productChar = 0;
    }
    // processFunction 병합
    if (i > 0 &&
      processKey(rows[i]) === processKey(rows[i - 1]) &&
      rows[i].processFunction === rows[i - 1].processFunction) {
      result[i - 1].spans.processFunction = result[i].spans.processFunction + 1;
      result[i].spans.processFunction = 0;
    }
    // process 병합
    if (i > 0 && processKey(rows[i]) === processKey(rows[i - 1])) {
      result[i - 1].spans.process = result[i].spans.process + 1;
      result[i].spans.process = 0;
    }
  }

  return result;
}

// ============ FC 데이터 빌드 ============

function buildFCRows(groups: ProcessedFMGroup[]): FlatFCRow[] {
  const seen = new Set<string>();
  const rows: FlatFCRow[] = [];

  groups.forEach(g => {
    g.rows.forEach(row => {
      if (!row.fcId || seen.has(row.fcId)) return;
      seen.add(row.fcId);
      rows.push({
        fcId: row.fcId,
        processNo: g.fmProcessNo || '-',
        processName: g.fmProcessName || '-',
        fcM4: row.fcM4 || '-',
        fcWorkElem: row.fcWorkElem || '-',
        fcWorkFunction: row.fcWorkFunction || '-',
        fcProcessChar: row.fcProcessChar || '-',
        fcText: row.fcText || '-',
      });
    });
  });

  // 정렬: processNo → M4 순서 → 작업요소 → 기능 → 특성
  rows.sort((a, b) => {
    const noDiff = parseProcessNo(a.processNo) - parseProcessNo(b.processNo);
    if (noDiff !== 0) return noDiff;
    const m4Diff = m4Sort(a.fcM4) - m4Sort(b.fcM4);
    if (m4Diff !== 0) return m4Diff;
    const weDiff = a.fcWorkElem.localeCompare(b.fcWorkElem, 'ko');
    if (weDiff !== 0) return weDiff;
    const funcDiff = a.fcWorkFunction.localeCompare(b.fcWorkFunction, 'ko');
    if (funcDiff !== 0) return funcDiff;
    return a.fcProcessChar.localeCompare(b.fcProcessChar, 'ko');
  });

  return rows;
}

/** FC rowSpan 계산: process → m4+workElem → workFunction → processChar */
function buildFCSpannedRows(rows: FlatFCRow[]): SpannedRow<FlatFCRow>[] {
  const result: SpannedRow<FlatFCRow>[] = rows.map(r => ({
    data: r,
    spans: { process: 1, workElem: 1, workFunction: 1, processChar: 1 },
  }));

  const processKey = (r: FlatFCRow) => `${r.processNo}|${r.processName}`;
  const workElemKey = (r: FlatFCRow) => `${processKey(r)}|${r.fcM4}|${r.fcWorkElem}`;

  for (let i = rows.length - 1; i >= 0; i--) {
    // processChar 병합
    if (i > 0 &&
      workElemKey(rows[i]) === workElemKey(rows[i - 1]) &&
      rows[i].fcWorkFunction === rows[i - 1].fcWorkFunction &&
      rows[i].fcProcessChar === rows[i - 1].fcProcessChar) {
      result[i - 1].spans.processChar = result[i].spans.processChar + 1;
      result[i].spans.processChar = 0;
    }
    // workFunction 병합
    if (i > 0 &&
      workElemKey(rows[i]) === workElemKey(rows[i - 1]) &&
      rows[i].fcWorkFunction === rows[i - 1].fcWorkFunction) {
      result[i - 1].spans.workFunction = result[i].spans.workFunction + 1;
      result[i].spans.workFunction = 0;
    }
    // workElem 병합 (m4 + workElem 동일)
    if (i > 0 && workElemKey(rows[i]) === workElemKey(rows[i - 1])) {
      result[i - 1].spans.workElem = result[i].spans.workElem + 1;
      result[i].spans.workElem = 0;
    }
    // process 병합
    if (i > 0 && processKey(rows[i]) === processKey(rows[i - 1])) {
      result[i - 1].spans.process = result[i].spans.process + 1;
      result[i].spans.process = 0;
    }
  }

  return result;
}

// ============ 통계 계산 ============

const isMissing = (val: string) => !val || val === '-' || val === '미분류';

/** 텍스트 배열에서 중복/누락/적합 통계 계산 */
function calcStats(texts: string[], missingChecks: boolean[]): VerificationStats {
  const textCount = new Map<string, number>();
  texts.forEach(t => {
    if (!isMissing(t)) textCount.set(t, (textCount.get(t) || 0) + 1);
  });
  const duplicateTexts = new Set<string>();
  textCount.forEach((count, text) => { if (count > 1) duplicateTexts.add(text); });

  let missing = 0;
  let duplicate = 0;
  let ok = 0;
  for (let i = 0; i < texts.length; i++) {
    if (missingChecks[i]) { missing++; }
    else if (duplicateTexts.has(texts[i])) { duplicate++; }
    else { ok++; }
  }
  return { ok, missing, duplicate, duplicateTexts };
}

// ============ 메인 훅 ============

export function useVerificationData(mode: VerificationMode, processedFMGroups: ProcessedFMGroup[]) {
  const feSpanned = useMemo(
    () => mode === 'FE' ? buildFESpannedRows(buildFERows(processedFMGroups)) : [],
    [mode, processedFMGroups]
  );

  const fmSpanned = useMemo(
    () => mode === 'FM' ? buildFMSpannedRows(buildFMRows(processedFMGroups)) : [],
    [mode, processedFMGroups]
  );

  const fcSpanned = useMemo(
    () => mode === 'FC' ? buildFCSpannedRows(buildFCRows(processedFMGroups)) : [],
    [mode, processedFMGroups]
  );

  // 항목 수 (드롭다운 배지용) — 모드와 무관하게 항상 계산
  const counts = useMemo(() => ({
    fe: new Set(processedFMGroups.flatMap(g => g.rows.map(r => r.feId).filter(Boolean))).size,
    fm: processedFMGroups.length,
    fc: new Set(processedFMGroups.flatMap(g => g.rows.map(r => r.fcId).filter(Boolean))).size,
  }), [processedFMGroups]);

  // ★ 왼쪽 패널 통계 (FE/FM/FC 각각)
  const leftStats = useMemo(() => {
    // FE 통계: feText 기준
    const feTexts: string[] = [];
    const feMissing: boolean[] = [];
    const seenFe = new Set<string>();
    processedFMGroups.forEach(g => g.rows.forEach(r => {
      if (!r.feId || seenFe.has(r.feId)) return;
      seenFe.add(r.feId);
      feTexts.push(r.feText || '-');
      feMissing.push(isMissing(r.feText));
    }));

    // FM 통계: fmText 기준
    const fmTexts = processedFMGroups.map(g => g.fmText || '-');
    const fmMissing = fmTexts.map(t => isMissing(t));

    // FC 통계: fcText 기준
    const fcTexts: string[] = [];
    const fcMissing: boolean[] = [];
    const seenFc = new Set<string>();
    processedFMGroups.forEach(g => g.rows.forEach(r => {
      if (!r.fcId || seenFc.has(r.fcId)) return;
      seenFc.add(r.fcId);
      fcTexts.push(r.fcText || '-');
      fcMissing.push(isMissing(r.fcText));
    }));

    return {
      fe: calcStats(feTexts, feMissing),
      fm: calcStats(fmTexts, fmMissing),
      fc: calcStats(fcTexts, fcMissing),
    };
  }, [processedFMGroups]);

  // ★ 우측 패널 통계 (선택된 레벨)
  const rightStats = useMemo((): VerificationStats => {
    if (mode === 'FE') {
      const rows = feSpanned.map(sr => sr.data);
      const texts = rows.map(r => r.feText);
      const missing = rows.map(r => isMissing(r.feText) || isMissing(r.feCategory) || isMissing(r.feFunctionName));
      return calcStats(texts, missing);
    }
    if (mode === 'FM') {
      const rows = fmSpanned.map(sr => sr.data);
      const texts = rows.map(r => r.fmText);
      const missing = rows.map(r => isMissing(r.fmText) || isMissing(r.processNo) || isMissing(r.processFunction));
      return calcStats(texts, missing);
    }
    if (mode === 'FC') {
      const rows = fcSpanned.map(sr => sr.data);
      const texts = rows.map(r => r.fcText);
      const missing = rows.map(r => isMissing(r.fcText) || isMissing(r.fcM4) || isMissing(r.fcWorkElem));
      return calcStats(texts, missing);
    }
    return { ok: 0, missing: 0, duplicate: 0, duplicateTexts: new Set() };
  }, [mode, feSpanned, fmSpanned, fcSpanned]);

  return { feSpanned, fmSpanned, fcSpanned, counts, leftStats, rightStats };
}
