/**
 * @file fmGroupUtils.ts
 * @description ALL 탭 성능 최적화 — 순수 유틸리티 함수
 *
 * AllTabEmpty.tsx의 tbodyRows useMemo 로직을 순수 함수로 추출하여:
 * 1. FMGroupRows 컴포넌트에서 FM 단위로 독립 사용
 * 2. 단위 테스트 가능
 *
 * @created 2026-03-01
 */

import type { ProcessedFMGroup } from './processFailureLinks';
import { getOptRowCount } from './multiOptUtils';
import { FM_DIVIDER, HEIGHTS } from './allTabConstants';
import type React from 'react';

// =====================================================
// 타입 정의
// =====================================================

/** 확장된 행 1개 (tbodyRows의 각 항목과 동일 구조) */
export interface ExpandedRow {
  fmGroup: ProcessedFMGroup;
  fmIdx: number;
  row: ProcessedFMGroup['rows'][0];
  rowInFM: number;
  isLastRowOfFM: boolean;
  fmDividerStyle: React.CSSProperties;
  merged: { fe: boolean; fc: boolean; fm: boolean };
  optIdx: number;
  optCount: number;
  baseFcRowSpan: number;
}

/** 공정별 그룹 */
export interface ProcessGroup {
  processNo: string;
  processName: string;
  fmGroups: ProcessedFMGroup[];
  estimatedHeight: number;
}

// =====================================================
// expandFMGroupRows — FM 1개의 행확장 (기존 tbodyRows L309-377)
// =====================================================

/**
 * FM 그룹 1개를 rowOptCounts에 따라 행확장.
 * AllTabEmpty.tsx tbodyRows useMemo 내부 로직과 동일.
 *
 * @param fmGroup 처리된 FM 그룹
 * @param rowOptCounts 각 FC행의 opt count 배열 (예: [2, 1])
 * @param fmIdx FM 인덱스 (기본 0, FMGroupRows에서 전달)
 */
export function expandFMGroupRows(
  fmGroup: ProcessedFMGroup,
  rowOptCounts: number[],
  fmIdx: number = 0,
): ExpandedRow[] {
  const result: ExpandedRow[] = [];

  // 1. FM 레벨 추가행 합산
  const fmExtraRows = rowOptCounts.reduce((sum, c) => sum + (c - 1), 0);

  // 2. adjusted fmGroup (fmRowSpan 보정)
  const adjustedFmGroup = fmExtraRows > 0
    ? { ...fmGroup, fmRowSpan: fmGroup.fmRowSpan + fmExtraRows }
    : fmGroup;

  // 3. adjusted FE/FC rowSpan 사전 계산
  const adjustedFeSpans = fmGroup.rows.map((row, idx) => {
    if (row.feRowSpan === 0) return 0;
    if (row.feRowSpan === 1) return rowOptCounts[idx];
    let sum = 0;
    for (let i = idx; i < Math.min(idx + row.feRowSpan, fmGroup.rows.length); i++) {
      sum += rowOptCounts[i];
    }
    return sum;
  });
  const adjustedFcSpans = fmGroup.rows.map((row, idx) => {
    if (row.fcRowSpan === 0) return 0;
    if (row.fcRowSpan === 1) return rowOptCounts[idx];
    let sum = 0;
    for (let i = idx; i < Math.min(idx + row.fcRowSpan, fmGroup.rows.length); i++) {
      sum += rowOptCounts[i];
    }
    return sum;
  });

  // 4. mergedRangeCache (기존 로직 인라인)
  const mergedCache = new Map<number, { fe: boolean; fc: boolean; fm: boolean }>();
  fmGroup.rows.forEach((row, rowInFM) => {
    if (rowInFM === 0) { mergedCache.set(rowInFM, { fe: false, fc: false, fm: false }); return; }
    let feMerged = false, fcMerged = false, fmMerged = false;
    for (let prevIdx = 0; prevIdx < rowInFM; prevIdx++) {
      const prevRow = fmGroup.rows[prevIdx];
      if (!prevRow) continue;
      if (!feMerged && prevRow.feRowSpan > 1 && prevIdx + prevRow.feRowSpan > rowInFM) feMerged = true;
      if (!fcMerged && prevRow.fcRowSpan > 1 && prevIdx + prevRow.fcRowSpan > rowInFM) fcMerged = true;
      if (!fmMerged && fmGroup.fmRowSpan > 1 && prevIdx + fmGroup.fmRowSpan > rowInFM) fmMerged = true;
      if (feMerged && fcMerged && fmMerged) break;
    }
    mergedCache.set(rowInFM, { fe: feMerged, fc: fcMerged, fm: fmMerged });
  });

  // 5. 행 확장: FC마다 optCount만큼 <tr> 생성
  fmGroup.rows.forEach((row, rowInFM) => {
    const optCount = rowOptCounts[rowInFM];
    const baseFcRowSpan = row.fcRowSpan;
    const adjustedRow = (adjustedFeSpans[rowInFM] !== row.feRowSpan || adjustedFcSpans[rowInFM] !== row.fcRowSpan)
      ? { ...row, feRowSpan: adjustedFeSpans[rowInFM], fcRowSpan: adjustedFcSpans[rowInFM] }
      : row;
    const merged = mergedCache.get(rowInFM) || { fe: false, fc: false, fm: false };

    for (let optIdx = 0; optIdx < optCount; optIdx++) {
      const isLastInFM = rowInFM === fmGroup.rows.length - 1 && optIdx === optCount - 1;
      result.push({
        fmGroup: adjustedFmGroup,
        fmIdx,
        row: adjustedRow,
        rowInFM,
        isLastRowOfFM: isLastInFM,
        fmDividerStyle: isLastInFM
          ? { borderBottom: `${FM_DIVIDER.borderWidth} ${FM_DIVIDER.borderStyle} ${FM_DIVIDER.borderColor}` }
          : {},
        merged,
        optIdx,
        optCount,
        baseFcRowSpan,
      });
    }
  });

  return result;
}

// =====================================================
// buildFMOptCountKeys — FM별 opt 카운트 안정 문자열 맵
// =====================================================

/**
 * 각 FM의 FC별 opt count를 "1,2,1" 형태의 안정 문자열로 생성.
 * 이 문자열이 변하지 않으면 해당 FM의 행확장을 재계산할 필요 없음.
 */
export function buildFMOptCountKeys(
  processedFMGroups: ProcessedFMGroup[],
  riskData: Record<string, unknown>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const fg of processedFMGroups) {
    const parts: string[] = [];
    for (let rowIdx = 0; rowIdx < fg.rows.length; rowIdx++) {
      const row = fg.rows[rowIdx];
      if (row.fcRowSpan === 0) { parts.push('1'); continue; }
      // ★ fcId 빈값 방어: FMGroupRows/RiskOptCellRenderer와 동일한 키 패턴
      const uk = row.fcId ? `${fg.fmId}-${row.fcId}` : (fg.fmId ? `${fg.fmId}-r${rowIdx}` : '');
      parts.push(String(uk ? getOptRowCount(riskData, uk) : 1));
    }
    map.set(fg.fmId, parts.join(','));
  }
  return map;
}

// =====================================================
// buildProcessGroups — 공정별 FM 그룹핑
// =====================================================

/** HEIGHTS.body = 22px (행 높이) */
const ROW_HEIGHT = HEIGHTS.body;

/**
 * processedFMGroups를 공정번호 기준으로 그룹핑.
 * 각 그룹의 estimatedHeight = sum(fmRowSpan) × ROW_HEIGHT.
 */
export function buildProcessGroups(
  processedFMGroups: ProcessedFMGroup[],
): ProcessGroup[] {
  const map = new Map<string, ProcessGroup>();
  for (const fg of processedFMGroups) {
    const pNo = fg.fmProcessNo;
    if (!map.has(pNo)) {
      map.set(pNo, {
        processNo: pNo,
        processName: fg.fmProcessName,
        fmGroups: [],
        estimatedHeight: 0,
      });
    }
    const pg = map.get(pNo)!;
    pg.fmGroups.push(fg);
    pg.estimatedHeight += fg.fmRowSpan * ROW_HEIGHT;
  }
  return Array.from(map.values());
}
