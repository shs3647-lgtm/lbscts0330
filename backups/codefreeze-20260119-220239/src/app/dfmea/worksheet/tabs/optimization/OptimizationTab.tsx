// @ts-nocheck
/**
 * @file OptimizationTab.tsx
 * @description P-FMEA 최적화(6단계) 화면 - 4색 시스템
 * 
 * 화면정의서 v2.2 기준
 * - 기본: 13컬럼 (RPN 제외)
 * - 옵션: 14컬럼 (RPN 포함)
 * - 계획(5) + 결과모니터링(2) + 효과평가(5/6) + 비고(1)
 */

'use client';

import React from 'react';

// ============ 색상 정의 (4색 시스템) ============
const COLORS = {
  plan: { header: '#1565c0', headerLight: '#42a5f5', cell: '#e3f2fd', cellAlt: '#bbdefb' },          // 1. 계획 (파란색)
  monitoring: { header: '#2e7d32', headerLight: '#66bb6a', cell: '#e8f5e9', cellAlt: '#c8e6c9' },    // 2. 결과모니터링 (녹색)
  evaluation: { header: '#ef6c00', headerLight: '#ffa726', cell: '#fff3e0', cellAlt: '#ffe0b2' },    // 3. 효과평가 (주황색)
  note: { header: '#5d4037', headerLight: '#8d6e63', cell: '#efebe9', cellAlt: '#d7ccc8' },          // 4. 비고 (갈색)
};

const STEP_COLOR = '#558b2f'; // 1행 단계 색상 (연두색)

// ============ 높이 정의 ============
const HEIGHTS = {
  header1: 28,
  header2: 26,
  header3: 24,
  body: 24,
};

// ============ 컬럼 정의 ============
interface ColumnDef {
  id: number;
  group: string;
  name: string;
  width: number;
  headerColor: string;
  cellColor: string;
  cellAltColor: string;
  align: 'left' | 'center' | 'right';
  isRPN?: boolean;
}

// 최적화 13컬럼 (RPN 제외)
const COLUMNS_BASE: ColumnDef[] = [
  // 1. 계획 (5컬럼)
  { id: 1, group: '1. 계획', name: '예방관리개선', width: 160, headerColor: COLORS.plan.headerLight, cellColor: COLORS.plan.cell, cellAltColor: COLORS.plan.cellAlt, align: 'left' },
  { id: 2, group: '1. 계획', name: '검출관리개선', width: 160, headerColor: COLORS.plan.headerLight, cellColor: COLORS.plan.cell, cellAltColor: COLORS.plan.cellAlt, align: 'left' },
  { id: 3, group: '1. 계획', name: '책임자성명', width: 100, headerColor: COLORS.plan.headerLight, cellColor: COLORS.plan.cell, cellAltColor: COLORS.plan.cellAlt, align: 'center' },
  { id: 4, group: '1. 계획', name: '목표완료일자', width: 80, headerColor: COLORS.plan.headerLight, cellColor: COLORS.plan.cell, cellAltColor: COLORS.plan.cellAlt, align: 'center' },
  { id: 5, group: '1. 계획', name: '상태', width: 60, headerColor: COLORS.plan.headerLight, cellColor: COLORS.plan.cell, cellAltColor: COLORS.plan.cellAlt, align: 'center' },
  
  // 2. 결과 모니터링 (2컬럼)
  { id: 6, group: '2. 결과 모니터링', name: '개선결과근거', width: 140, headerColor: COLORS.monitoring.headerLight, cellColor: COLORS.monitoring.cell, cellAltColor: COLORS.monitoring.cellAlt, align: 'left' },
  { id: 7, group: '2. 결과 모니터링', name: '완료일자', width: 80, headerColor: COLORS.monitoring.headerLight, cellColor: COLORS.monitoring.cell, cellAltColor: COLORS.monitoring.cellAlt, align: 'center' },
  
  // 3. 효과 평가 (5컬럼, RPN 제외)
  { id: 8, group: '3. 효과 평가', name: '심각도(S)', width: 50, headerColor: COLORS.evaluation.headerLight, cellColor: COLORS.evaluation.cell, cellAltColor: COLORS.evaluation.cellAlt, align: 'center' },
  { id: 9, group: '3. 효과 평가', name: '발생도(O)', width: 50, headerColor: COLORS.evaluation.headerLight, cellColor: COLORS.evaluation.cell, cellAltColor: COLORS.evaluation.cellAlt, align: 'center' },
  { id: 10, group: '3. 효과 평가', name: '검출도(D)', width: 50, headerColor: COLORS.evaluation.headerLight, cellColor: COLORS.evaluation.cell, cellAltColor: COLORS.evaluation.cellAlt, align: 'center' },
  { id: 11, group: '3. 효과 평가', name: '특별특성', width: 70, headerColor: COLORS.evaluation.headerLight, cellColor: COLORS.evaluation.cell, cellAltColor: COLORS.evaluation.cellAlt, align: 'center' },
  { id: 12, group: '3. 효과 평가', name: 'AP', width: 50, headerColor: COLORS.evaluation.headerLight, cellColor: COLORS.evaluation.cell, cellAltColor: COLORS.evaluation.cellAlt, align: 'center' },
  
  // 4. 비고 (1컬럼)
  { id: 13, group: '4. 비고', name: '비고', width: 120, headerColor: COLORS.note.headerLight, cellColor: COLORS.note.cell, cellAltColor: COLORS.note.cellAlt, align: 'left' },
];

// RPN 컬럼 (옵션)
const RPN_COLUMN: ColumnDef = { 
  id: 0, group: '3. 효과 평가', name: 'RPN', width: 50, 
  headerColor: COLORS.evaluation.headerLight, cellColor: COLORS.evaluation.cell, cellAltColor: COLORS.evaluation.cellAlt, 
  align: 'center', isRPN: true 
};

// 옵션화면용 14컬럼 생성 함수
function getColumnsWithRPN(): ColumnDef[] {
  const columns = [...COLUMNS_BASE];
  const rpnIdx = columns.findIndex(c => c.group === '4. 비고');
  columns.splice(rpnIdx, 0, { ...RPN_COLUMN, id: rpnIdx + 1 });
  for (let i = rpnIdx; i < columns.length; i++) {
    columns[i] = { ...columns[i], id: i + 1 };
  }
  return columns;
}

// ============ 2행 그룹 colSpan 계산 ============
interface GroupSpan {
  group: string;
  colSpan: number;
  color: string;
}

function calculateGroupSpans(columns: ColumnDef[]): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let currentGroup = '';
  let currentSpan = 0;
  let currentColor = '';
  
  columns.forEach((col, idx) => {
    if (col.group !== currentGroup) {
      if (currentSpan > 0) {
        spans.push({ group: currentGroup, colSpan: currentSpan, color: currentColor });
      }
      currentGroup = col.group;
      currentSpan = 1;
      currentColor = col.headerColor;
    } else {
      currentSpan++;
    }
    
    if (idx === columns.length - 1) {
      spans.push({ group: currentGroup, colSpan: currentSpan, color: currentColor });
    }
  });
  
  return spans;
}

// ============ 컴포넌트 ============
interface OptimizationTabProps {
  rowCount?: number;
  showRPN?: boolean;
}

export default function OptimizationTab({ rowCount = 20, showRPN = false }: OptimizationTabProps) {
  const columns = showRPN ? getColumnsWithRPN() : COLUMNS_BASE;
  const groupSpans = calculateGroupSpans(columns);
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  
  return (
    <div className="relative w-full h-full overflow-auto bg-white">
      <table
        style={{
          width: `${totalWidth}px`,
          minWidth: `${totalWidth}px`,
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
      >
        {/* colgroup */}
        <colgroup>
          {columns.map((col, idx) => (
            <col key={idx} style={{ width: `${col.width}px` }} />
          ))}
        </colgroup>
        
        <thead className="sticky top-0 z-20 border-b-2 border-[#1a237e]">
          {/* 1행: 단계 */}
          <tr>
            <th
              colSpan={columns.length}
              style={{
                background: STEP_COLOR,
                color: '#fff',
                height: `${HEIGHTS.header1}px`,
                padding: '4px 8px',
                border: '1px solid #ccc',
                fontWeight: 800,
                fontSize: '13px',
                textAlign: 'center',
              }}
            >
              P-FMEA 최적화 (6단계) | {showRPN ? '14컬럼 (RPN 포함)' : '13컬럼 (RPN 제외)'}
            </th>
          </tr>
          
          {/* 2행: 분류 (4색 시스템) */}
          <tr>
            {groupSpans.map((span, idx) => (
              <th
                key={idx}
                colSpan={span.colSpan}
                style={{
                  background: span.color,
                  color: '#000',
                  height: `${HEIGHTS.header2}px`,
                  padding: '4px 6px',
                  border: '1px solid #ccc',
                  fontWeight: 600,
                  fontSize: '11px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {span.group}
              </th>
            ))}
          </tr>
          
          {/* 3행: 컬럼명 */}
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  background: col.cellAltColor,
                  color: '#000',
                  height: `${HEIGHTS.header3}px`,
                  padding: '3px 4px',
                  border: '1px solid #ccc',
                  fontWeight: 600,
                  fontSize: '11px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody>
          {Array.from({ length: rowCount }, (_, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((col, colIdx) => (
                <td 
                  key={colIdx} 
                  style={{
                    background: rowIdx % 2 === 0 ? col.cellColor : col.cellAltColor,
                    height: `${HEIGHTS.body}px`,
                    padding: '3px 4px',
                    border: '1px solid #ccc',
                    fontSize: '11px',
                    textAlign: col.align,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Export
export { COLUMNS_BASE as OPT_COLUMNS_BASE, COLORS as OPT_COLORS, getColumnsWithRPN as getOptColumnsWithRPN };
