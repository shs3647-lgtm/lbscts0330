// @ts-nocheck
/**
 * @file FailureCellRenderer.tsx
 * @description 고장분석(4단계) 셀 렌더링 - 고장영향(FE), 심각도, 고장형태(FM), 고장원인(FC)
 * @updated 2026-01-11 - 셀 스타일 최적화 (패딩 1px, 폰트 120% 한줄)
 */
'use client';

import React from 'react';
import { HEIGHTS, CELL_STYLE, STEP_DIVIDER, STEP_FIRST_COLUMN_IDS } from './allTabConstants';

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
}

export function FailureCellRenderer({
  col,
  colIdx,
  fmGroup,
  fmIdx,
  row,
  rowInFM,
  globalRowIdx,
  handleSODClick,
}: FailureCellRendererProps): React.ReactElement | null {
  // ★ 2026-01-11: 셀 스타일 최적화 (패딩 1px, 폰트 120% 한줄) + 단계 구분선
  const isStepFirst = STEP_FIRST_COLUMN_IDS.includes(col.id);
  const cellStyle = (rowSpan: number, useGlobalIdx = false) => ({
    background: (useGlobalIdx ? globalRowIdx : fmIdx) % 2 === 0 ? col.cellColor : col.cellAltColor,
    height: `${HEIGHTS.body}px`,
    padding: CELL_STYLE.padding,
    borderTop: '1px solid #ccc',
    borderRight: '1px solid #ccc',
    borderBottom: '1px solid #ccc',
    borderLeft: isStepFirst ? `${STEP_DIVIDER.borderWidth} ${STEP_DIVIDER.borderStyle} ${STEP_DIVIDER.borderColor}` : '1px solid #ccc',
    fontSize: CELL_STYLE.fontSize,
    lineHeight: CELL_STYLE.lineHeight,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word' as const,
    textAlign: col.align,
    verticalAlign: 'middle' as const,
  });

  // ★ 누적 rowSpan 범위 체크 헬퍼 함수
  const isInMergedRange = (type: 'fe' | 'fc'): boolean => {
    for (let prevIdx = 0; prevIdx < rowInFM; prevIdx++) {
      const prevRow = fmGroup.rows[prevIdx];
      if (!prevRow) continue;
      const span = type === 'fe' ? prevRow.feRowSpan : prevRow.fcRowSpan;
      if (span > 1 && prevIdx + span > rowInFM) {
        return true; // 이전 행의 rowSpan 범위 안에 있음
      }
    }
    return false;
  };

  // ★ 고장영향(FE) - FE별 병합, 클릭하여 점수 부여
  // ★ 2026-01-12: 심각도 표시를 Y:N / S:N / U:N 으로 변경 (YP/SP/USER 구분)
  if (col.name === '고장영향(FE)') {
    // ★ rowSpan=0이면 병합된 범위 → 렌더링 안함
    if (row.feRowSpan === 0) return null;
    // 누적 범위 체크: 이전 행의 feRowSpan 범위 안에 있으면 렌더링하지 않음
    if (rowInFM === 0 || !isInMergedRange('fe')) {
      // ★ 카테고리별 심각도 표시: Y(Your Plant), S(Ship to Plant), U(User)
      const getCategoryPrefix = (category: string): string => {
        if (!category) return 'S';  // 기본값
        const cat = category.toLowerCase();
        if (cat.includes('your') || cat === 'yp') return 'Y';
        if (cat.includes('ship') || cat === 'sp') return 'S';
        if (cat.includes('user') || cat === 'u') return 'U';
        return 'S';  // 기본값
      };
      const prefix = getCategoryPrefix(row.feCategory);
      const severityDisplay = row.feSeverity > 0 ? ` (${prefix}:${row.feSeverity})` : '';
      
      return (
        <td 
          key={colIdx} 
          rowSpan={row.feRowSpan} 
          style={{ 
            ...cellStyle(row.feRowSpan), 
            borderBottom: rowInFM === fmGroup.rows.length - 1 ? '2px solid #303f9f' : '1px solid #ccc',
            cursor: 'pointer',
            // ★ 점수가 있으면 배경색 표시
            backgroundColor: row.feSeverity > 0 ? '#fff3e0' : undefined,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (handleSODClick) {
              // ★ 개별 FE에 점수 부여 - feId와 feText 전달
              handleSODClick('S', 'failure', globalRowIdx, row.feSeverity, row.feCategory, row.feId, row.feText);
            }
          }}
          title={`클릭하여 "${row.feText}" 심각도 설정 (${row.feCategory || '미분류'})`}
        >
          <span style={{ fontWeight: row.feSeverity > 0 ? 600 : 400 }}>
            {row.feText}
          </span>
          {severityDisplay && (
            <span style={{ color: '#e65100', fontWeight: 700, marginLeft: '4px' }}>
              {severityDisplay}
            </span>
          )}
        </td>
      );
    }
    return null;
  }

  // ★ 심각도 - FM 전체 병합, 최대값 표시 (클릭 시 전체 FE에 점수 부여)
  if (col.name === '심각도') {
    if (row.isFirstRow) {
      return (
        <td 
          key={colIdx} 
          rowSpan={fmGroup.fmRowSpan} 
          style={{ 
            ...cellStyle(fmGroup.fmRowSpan), 
            fontSize: '12px', 
            textAlign: 'center', 
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: fmGroup.maxSeverity > 0 ? '#ffccbc' : '#fff3e0',
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
          {fmGroup.maxSeverity > 0 ? fmGroup.maxSeverity : '-'}
        </td>
      );
    }
    return null;
  }

  // ★ 고장형태(FM) - FM 전체 병합
  if (col.name === '고장형태(FM)') {
    if (row.isFirstRow) {
      const fmLabel = fmGroup.fmNo ? `${fmGroup.fmNo} ${fmGroup.fmText}` : fmGroup.fmText;
      return (
        <td key={colIdx} rowSpan={fmGroup.fmRowSpan} style={{ ...cellStyle(fmGroup.fmRowSpan), textAlign: 'center', color: '#000', borderBottom: '2px solid #303f9f' }}>
          {fmLabel}
        </td>
      );
    }
    return null;
  }

  // ★ 고장원인(FC) - FC별 병합
  if (col.name === '고장원인(FC)') {
    // ★ rowSpan=0이면 병합된 범위 → 렌더링 안함
    if (row.fcRowSpan === 0) return null;
    // 누적 범위 체크: 이전 행의 fcRowSpan 범위 안에 있으면 렌더링하지 않음
    if (rowInFM === 0 || !isInMergedRange('fc')) {
      return (
        <td key={colIdx} rowSpan={row.fcRowSpan} style={{ ...cellStyle(row.fcRowSpan, true), borderBottom: rowInFM === fmGroup.rows.length - 1 ? '2px solid #303f9f' : '1px solid #ccc' }}>
          {row.fcText}
        </td>
      );
    }
    return null;
  }

  return null;
}

