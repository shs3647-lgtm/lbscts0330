/**
 * @file FailureCellRenderer.tsx
 * @description 고장분석(4단계) 셀 렌더링 - 고장영향(FE), 심각도, 고장형태(FM), 고장원인(FC)
 * @updated 2026-01-11 - 셀 스타일 최적화 (패딩 1px, 폰트 120% 한줄)
 * @updated 2026-02-03 - 동적 정렬 적용 (긴 텍스트 좌측정렬)
 */
'use client';

import React from 'react';
import { HEIGHTS, CELL_STYLE, STEP_DIVIDER, STEP_FIRST_COLUMN_IDS, getDynamicAlign, COMPACT_CELL_STYLE, COMPACT_HEIGHTS, PLACEHOLDER_DASH, PLACEHOLDER_UNCLASSIFIED } from './allTabConstants';
import { normalizeScope, SCOPE_YP, SCOPE_SP } from '@/lib/fmea/scope-constants';

interface ColumnDef {
  id: number;
  step: string;
  group: string;
  name: string;
  width: number;
  cellColor: string;
  cellAltColor: string;
  align: 'left' | 'center' | 'right';
}

interface FMGroupRow {
  isFirstRow: boolean;
  feIdx?: number;
  fcIdx?: number;
  feId?: string;    // ★ 2026-01-11: FE 고유 ID 추가
  feText: string;
  feSeverity: number;
  fcText: string;
  fcM4: string;
  fcWorkElem: string;
  fcWorkFunction: string;
  fcProcessChar: string;
  feCategory: string;
  feFunctionName: string;
  feRequirement: string;
  feRowSpan: number;
  fcRowSpan: number;
}

interface FMGroup {
  fmId: string;
  fmNo: string;
  fmText: string;
  fmRowSpan: number;
  fmProcessNo: string;
  fmProcessName: string;
  fmProcessFunction: string;
  fmProductChar: string;
  maxSeverity: number;
  rows: FMGroupRow[];
}

interface FailureCellRendererProps {
  col: ColumnDef;
  colIdx: number;
  fmGroup: FMGroup;
  fmIdx: number;
  row: FMGroupRow;
  rowInFM: number;
  globalRowIdx: number;
  // ★ 2026-01-11: 심각도 클릭 핸들러 추가
  // ★ 2026-01-11: feId 파라미터 추가 - 개별 FE에 점수 부여
  handleSODClick?: (
    category: 'S' | 'O' | 'D',
    targetType: 'risk' | 'opt' | 'failure',
    rowIndex: number,
    currentValue?: number,
    feCategory?: string,
    feId?: string,  // ★ 개별 FE ID
    feText?: string // ★ FE 텍스트 (표시용)
  ) => void;
  // ★ 2026-02-22: FM/FC 셀 클릭 → 고장연결 탭 이동
  onNavigateToFailureLink?: (fmId: string) => void;
  isCompact?: boolean;
  merged?: { fe: boolean; fc: boolean; fm: boolean };
}

// ★ 성능 최적화: 콜백(handleSODClick 등) 참조 변경은 무시, 데이터 props만 비교
function areFailurePropsEqual(prev: FailureCellRendererProps, next: FailureCellRendererProps): boolean {
  return prev.col === next.col && prev.colIdx === next.colIdx &&
    prev.fmGroup === next.fmGroup && prev.fmIdx === next.fmIdx &&
    prev.row === next.row && prev.rowInFM === next.rowInFM &&
    prev.globalRowIdx === next.globalRowIdx && prev.isCompact === next.isCompact &&
    prev.merged === next.merged;
}

export const FailureCellRenderer = React.memo(function FailureCellRendererInner({
  col,
  colIdx,
  fmGroup,
  fmIdx,
  row,
  rowInFM,
  globalRowIdx,
  handleSODClick,
  onNavigateToFailureLink,
  isCompact,
  merged,
}: FailureCellRendererProps): React.ReactElement | null {
  // ★ 2026-01-11: 셀 스타일 최적화 + 단계 구분선 + compact 모드
  const isStepFirst = STEP_FIRST_COLUMN_IDS.includes(col.id);
  const cs = isCompact ? COMPACT_CELL_STYLE : CELL_STYLE;
  const cellStyle = (rowSpan: number, useGlobalIdx = false) => ({
    background: (useGlobalIdx ? globalRowIdx : fmIdx) % 2 === 0 ? col.cellColor : col.cellAltColor,
    height: isCompact ? undefined : `${HEIGHTS.body}px`,
    minHeight: isCompact ? `${COMPACT_HEIGHTS.body}px` : undefined,
    padding: cs.padding,
    borderTop: '1px solid #ccc',
    borderRight: '1px solid #ccc',
    borderBottom: '1px solid #ccc',
    borderLeft: isStepFirst ? `${STEP_DIVIDER.borderWidth} ${STEP_DIVIDER.borderStyle} ${STEP_DIVIDER.borderColor}` : '1px solid #ccc',
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    overflow: 'hidden' as const,
    whiteSpace: isCompact ? 'normal' as const : undefined,
    wordBreak: 'break-word' as const,
    textAlign: col.align,
    verticalAlign: 'middle' as const,
  });

  // ★ 성능 최적화: 사전 계산된 merged 캐시 사용 (O(n) 루프 제거)
  const isInMergedRange = (type: 'fe' | 'fc'): boolean => {
    if (merged) return type === 'fe' ? merged.fe : merged.fc;
    return false;
  };

  // ★ 고장영향(FE) - FE별 병합, 클릭하여 점수 부여
  // ★ 2026-01-12: 심각도 표시를 Y:N / S:N / U:N 으로 변경 (YP/SP/USER 구분)
  // ★ 2026-01-25: 배경색=레벨 색상, 글씨=점수별 구분
  if (col.name === '고장영향(FE)') {
    // ★ rowSpan=0이면 병합된 범위 → 렌더링 안함
    if (row.feRowSpan === 0) return null;
    // 누적 범위 체크: 이전 행의 feRowSpan 범위 안에 있으면 렌더링하지 않음
    if (rowInFM === 0 || !isInMergedRange('fe')) {
      // ★ 카테고리별 심각도 표시: Y(YP), S(SP), U(USER)
      // ★ 2026-03-22: 중앙 normalizeScope() 사용
      const getCategoryPrefix = (category: string): string => {
        if (!category) return 'S';  // 기본값
        const norm = normalizeScope(category);
        if (norm === SCOPE_YP) return 'Y';
        if (norm === SCOPE_SP) return 'S';
        return 'U';
      };
      const prefix = getCategoryPrefix(row.feCategory);
      const severityDisplay = row.feSeverity > 0 ? ` (${prefix}:${row.feSeverity})` : '';

      // ★★★ 글씨색: 점수별 구분 (1-3녹색, 4-6주황, 7-10빨강) ★★★
      const getSeverityColor = (severity: number): string => {
        if (severity >= 7) return '#c62828';  // 7-10: 빨강
        if (severity >= 4) return '#f57f17';  // 4-6: 주황
        if (severity >= 1) return '#2e7d32';  // 1-3: 녹색
        return '#666';  // 미입력
      };

      return (
        <td
          key={colIdx}
          rowSpan={row.feRowSpan}
          style={{
            ...cellStyle(row.feRowSpan),
            borderBottom: rowInFM === fmGroup.rows.length - 1 ? '2px solid #303f9f' : '1px solid #ccc',
            cursor: 'pointer',
            // ★★★ 배경색: 레벨 색상 (하드코딩 제거) ★★★
            // (cellStyle에서 이미 레벨 색상 적용됨)
            fontWeight: 400,  // ★ 입력셀: normal
            textAlign: getDynamicAlign(row.feText),  // ★ 2026-02-03: 긴 텍스트 좌측정렬
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (handleSODClick) {
              // ★ 개별 FE에 점수 부여 - feId와 feText 전달
              handleSODClick('S', 'failure', globalRowIdx, row.feSeverity, row.feCategory, row.feId, row.feText);
            }
          }}
          title={`클릭하여 "${row.feText}" 심각도 설정 (${row.feCategory || PLACEHOLDER_UNCLASSIFIED})`}
        >
          <span style={{ fontWeight: 400 }}>
            {row.feText}
          </span>
          {severityDisplay && (
            <span style={{ color: getSeverityColor(row.feSeverity), fontWeight: 700, marginLeft: '4px' }}>
              {severityDisplay}
            </span>
          )}
        </td>
      );
    }
    return null;
  }

  // ★ 심각도 - FM 전체 병합, 최대값 표시 (클릭 시 전체 FE에 점수 부여)
  // ★ 2026-01-25: 배경색=레벨 색상, 글씨=점수별 구분
  if (col.name === '심각도(S)') {
    if (row.isFirstRow) {
      // ★★★ 글씨색: 점수별 구분 (1-3녹색, 4-6주황, 7-10빨강) ★★★
      const getSeverityTextColor = (severity: number): string => {
        if (severity >= 7) return '#c62828';  // 7-10: 빨강
        if (severity >= 4) return '#f57f17';  // 4-6: 주황
        if (severity >= 1) return '#2e7d32';  // 1-3: 녹색
        return '#666';  // 미입력
      };

      return (
        <td
          key={colIdx}
          rowSpan={fmGroup.fmRowSpan}
          style={{
            ...cellStyle(fmGroup.fmRowSpan),
            fontSize: '11px',  // ★ 표준 11px
            textAlign: 'center',
            fontWeight: fmGroup.maxSeverity > 0 ? 700 : 400,  // ★ 값 있으면 bold
            cursor: 'pointer',
            // ★★★ 배경색: 레벨 색상 (하드코딩 제거) ★★★
            // (cellStyle에서 이미 레벨 색상 적용됨)
            color: getSeverityTextColor(fmGroup.maxSeverity),  // ★ 글씨색 점수별 구분
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (handleSODClick) {
              // ★ feId, feText를 undefined로 전달하여 전체 FE 업데이트
              handleSODClick('S', 'failure', globalRowIdx, fmGroup.maxSeverity, row.feCategory, undefined, undefined);
            }
          }}
          title="클릭하여 모든 고장영향의 심각도 일괄 수정"
        >
          {fmGroup.maxSeverity > 0 ? fmGroup.maxSeverity : PLACEHOLDER_DASH}
        </td>
      );
    }
    return null;
  }

  // ★ 고장형태(FM) - FM 전체 병합 (클릭 → 고장연결 탭 이동)
  if (col.name === '고장형태(FM)') {
    if (row.isFirstRow) {
      const fmLabel = fmGroup.fmNo ? `${fmGroup.fmNo} ${fmGroup.fmText}` : fmGroup.fmText;
      return (
        <td
          key={colIdx}
          rowSpan={fmGroup.fmRowSpan}
          style={{
            ...cellStyle(fmGroup.fmRowSpan),
            textAlign: getDynamicAlign(fmLabel),
            color: '#000',
            borderBottom: '2px solid #303f9f',
            cursor: onNavigateToFailureLink ? 'pointer' : undefined,
          }}
          onDoubleClick={onNavigateToFailureLink ? () => onNavigateToFailureLink(fmGroup.fmId) : undefined}
          title={onNavigateToFailureLink ? '더블클릭하여 고장연결 탭에서 수정' : undefined}
        >
          {fmLabel}
        </td>
      );
    }
    return null;
  }

  // ★ 고장원인(FC) - FC별 병합 (클릭 → 고장연결 탭 이동)
  if (col.name === '고장원인(FC)') {
    // ★ rowSpan=0이면 병합된 범위 → 렌더링 안함
    if (row.fcRowSpan === 0) return null;
    // 누적 범위 체크: 이전 행의 fcRowSpan 범위 안에 있으면 렌더링하지 않음
    if (rowInFM === 0 || !isInMergedRange('fc')) {
      return (
        <td
          key={colIdx}
          rowSpan={row.fcRowSpan}
          style={{
            ...cellStyle(row.fcRowSpan, true),
            borderBottom: rowInFM === fmGroup.rows.length - 1 ? '2px solid #303f9f' : '1px solid #ccc',
            textAlign: getDynamicAlign(row.fcText),
            cursor: onNavigateToFailureLink ? 'pointer' : undefined,
          }}
          onDoubleClick={onNavigateToFailureLink ? () => onNavigateToFailureLink(fmGroup.fmId) : undefined}
          title={onNavigateToFailureLink ? '더블클릭하여 고장연결 탭에서 수정' : undefined}
        >
          {row.fcText}
        </td>
      );
    }
    return null;
  }

  return null;
}, areFailurePropsEqual);

