/**
 * @file TableHeader.tsx
 * @description 공용 테이블 헤더 컴포넌트 (3행 구조)
 * 1행: 단계 대분류, 2행: 서브그룹, 3행: 컬럼명
 */

'use client';

import React from 'react';
import { ColumnDef, SubGroup, StepGroup, STEP_GROUPS, SUB_GROUPS, getColumnsByStep } from './columnConfig';
import { mainGroupHeaderStyle, subGroupHeaderStyle, columnHeaderStyle } from './TableHeaderStyles';

interface TableHeaderProps {
  visibleSteps: number[];
  onAPClick?: () => void;
}

export function TableHeader({ visibleSteps, onAPClick }: TableHeaderProps) {
  // 필터링된 그룹/컬럼
  const filteredGroups = STEP_GROUPS.filter(g => visibleSteps.includes(g.step));
  const filteredSubGroups = SUB_GROUPS.filter(sg => visibleSteps.includes(sg.step));
  const filteredColumns = visibleSteps.flatMap(step => getColumnsByStep(step));

  return (
    <>
      {/* 1행: 단계 대분류 */}
      <tr>
        {filteredGroups.map(group => (
          <th
            key={group.step}
            colSpan={group.count}
            style={mainGroupHeaderStyle(group.bg)}
          >
            {group.name}
          </th>
        ))}
      </tr>

      {/* 2행: 서브그룹 */}
      <tr>
        {filteredSubGroups.map((sg, idx) => {
          const stepGroup = STEP_GROUPS.find(g => g.step === sg.step);
          return (
            <th
              key={`${sg.step}-${idx}`}
              colSpan={sg.cols}
              style={subGroupHeaderStyle(stepGroup?.headerBg || '#f5f5f5')}
            >
              {sg.label}
            </th>
          );
        })}
      </tr>

      {/* 3행: 컬럼명 */}
      <tr>
        {filteredColumns.map(col => {
          const stepGroup = STEP_GROUPS.find(g => g.step === col.step);
          const isAPColumn = col.id === 'ap' && onAPClick;
          
          return (
            <th
              key={col.id}
              onClick={isAPColumn ? onAPClick : undefined}
              style={columnHeaderStyle(stepGroup?.cellBg || '#fafafa', col.width, isAPColumn ? 'pointer' : 'default')}
              title={isAPColumn ? 'AP 기준표 보기' : col.label}
            >
              {col.label}
            </th>
          );
        })}
      </tr>
    </>
  );
}

// 단일 단계용 헤더 (리스크분석, 최적화 등)
interface SingleStepHeaderProps {
  step: number;
  title: string;
  onAPClick?: () => void;
}

export function SingleStepHeader({ step, title, onAPClick }: SingleStepHeaderProps) {
  const stepGroup = STEP_GROUPS.find(g => g.step === step);
  const subGroups = SUB_GROUPS.filter(sg => sg.step === step);
  const columns = getColumnsByStep(step);

  if (!stepGroup) return null;

  return (
    <>
      {/* 1행: 단계 타이틀 */}
      <tr>
        <th
          colSpan={stepGroup.count}
          style={mainGroupHeaderStyle(stepGroup.bg)}
        >
          {title}
        </th>
      </tr>

      {/* 2행: 서브그룹 */}
      <tr>
        {subGroups.map((sg, idx) => (
          <th
            key={idx}
            colSpan={sg.cols}
            style={subGroupHeaderStyle(stepGroup.headerBg)}
          >
            {sg.label}
          </th>
        ))}
      </tr>

      {/* 3행: 컬럼명 */}
      <tr>
        {columns.map(col => {
          const isAPColumn = col.id === 'ap' && onAPClick;
          return (
            <th
              key={col.id}
              onClick={isAPColumn ? onAPClick : undefined}
              style={columnHeaderStyle(stepGroup.cellBg, col.width, isAPColumn ? 'pointer' : 'default')}
            >
              {col.label}
            </th>
          );
        })}
      </tr>
    </>
  );
}

export default TableHeader;

