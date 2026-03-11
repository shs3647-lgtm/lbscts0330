/**
 * @file BaseWorksheetComponents.tsx
 * @description 워크시트 탭 공통 컴포넌트 (표준화/모듈화/공용화)
 * @version 1.0.0
 * @created 2026-01-03
 * 
 * 공통 컴포넌트:
 * - WorksheetContainer: 테이블 컨테이너
 * - WorksheetHeader: 3행 헤더 (단계/항목/세부)
 * - ConfirmStatusBar: 확정/수정/누락 상태 표시
 * - WorksheetColGroup: 컬럼 너비 정의
 * 
 * 공통 훅:
 * - useConfirmState: 확정 상태 관리
 * - useRowSpan: 셀 병합 계산
 * - useMissingCount: 누락 건수 계산
 */

'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { useLocale } from '@/lib/locale';

// ============ 스타일 상수 ============
export const STEP_COLORS = {
  structure: { bg: '#1976d2', text: 'white' },      // 파란색 (구조분석)
  function: { bg: '#388e3c', text: 'white' },       // 녹색 (기능분석)
  failure: { bg: '#e65100', text: 'white' },        // 주황색 (고장분석)
  risk: { bg: '#7b1fa2', text: 'white' },           // 보라색 (위험분석)
  optimize: { bg: '#1565c0', text: 'white' },       // 진한 파란색 (최적화)
};

export const LEVEL_COLORS = {
  l1: { header: '#1976d2', cell: '#e3f2fd', cellAlt: '#bbdefb' },
  l2: { header: '#42a5f5', cell: '#e8f5e9', cellAlt: '#c8e6c9' },
  l3: { header: '#64b5f6', cell: '#fff3e0', cellAlt: '#ffe0b2' },
};

// ============ 배지 스타일 ============
export const badgeStyles = {
  confirmed: 'text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-300',
  missing: 'text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300',
  ok: 'text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-300',
  btnConfirm: 'text-[10px] font-bold px-2 py-0.5 rounded bg-green-600 text-white hover:bg-green-700 cursor-pointer',
  btnEdit: 'text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer',
};

// ============ 공통 Props ============
export interface ColumnDef {
  width: string;        // Tailwind width class (예: 'w-[100px]')
  minWidth?: string;    // min-width style
}

export interface HeaderCell {
  label: string;
  colSpan?: number;
  rowSpan?: number;
  bgColor: string;
  textColor?: string;
  extra?: React.ReactNode;
}

// ============ 컴포넌트들 ============

/**
 * 워크시트 테이블 컨테이너
 */
interface WorksheetContainerProps {
  children: React.ReactNode;
  minWidth?: string;
}

export function WorksheetContainer({ children, minWidth = '800px' }: WorksheetContainerProps) {
  return (
    <div className="p-0 overflow-auto h-full">
      <table 
        className="w-full border-collapse table-fixed" 
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

/**
 * 컬럼 그룹 정의
 */
interface WorksheetColGroupProps {
  columns: ColumnDef[];
}

export function WorksheetColGroup({ columns }: WorksheetColGroupProps) {
  return (
    <colgroup>
      {columns.map((col, idx) => (
        <col key={idx} className={col.width} style={col.minWidth ? { minWidth: col.minWidth } : undefined} />
      ))}
    </colgroup>
  );
}

/**
 * 확정/수정/누락 상태 바
 */
interface ConfirmStatusBarProps {
  isConfirmed: boolean;
  count: number;
  missingCount: number;
  onConfirm: () => void;
  onEdit: () => void;
  label?: string;
}

export function ConfirmStatusBar({
  isConfirmed,
  count,
  missingCount,
  onConfirm,
  onEdit,
  label = '',
}: ConfirmStatusBarProps) {
  const { t } = useLocale();
  return (
    <div className="flex gap-1">
      {isConfirmed ? (
        <span className={badgeStyles.confirmed}>✓ 확정됨(Confirmed)({count})</span>
      ) : (
        <button type="button" onClick={onConfirm} className={badgeStyles.btnConfirm}>확정(Confirm)</button>
      )}
      <span className={missingCount > 0 ? badgeStyles.missing : badgeStyles.ok}>
        누락(Missing) {missingCount}건(cases)
      </span>
      {isConfirmed && (
        <button type="button" onClick={onEdit} className={badgeStyles.btnEdit}>수정(Edit)</button>
      )}
    </div>
  );
}

/**
 * 3행 헤더 생성 (단계 구분 / 항목 그룹 / 세부 컬럼)
 */
interface WorksheetHeaderProps {
  row1: HeaderCell[];   // 1행: 단계 구분
  row2: HeaderCell[];   // 2행: 항목 그룹
  row3: HeaderCell[];   // 3행: 세부 컬럼
}

export function WorksheetHeader({ row1, row2, row3 }: WorksheetHeaderProps) {
  const renderRow = (cells: HeaderCell[], rowIdx: number) => (
    <tr key={rowIdx}>
      {cells.map((cell, idx) => (
        <th
          key={idx}
          colSpan={cell.colSpan}
          rowSpan={cell.rowSpan}
          className="border border-[#ccc] p-2 text-xs font-extrabold text-center"
          style={{ backgroundColor: cell.bgColor, color: cell.textColor || 'white' }}
        >
          <div className="flex items-center justify-center gap-2">
            <span>{cell.label}</span>
            {cell.extra}
          </div>
        </th>
      ))}
    </tr>
  );

  return (
    <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
      {renderRow(row1, 0)}
      {renderRow(row2, 1)}
      {renderRow(row3, 2)}
    </thead>
  );
}

/**
 * 단순 2행 헤더 (단계 구분 / 세부 컬럼)
 */
interface SimpleHeaderProps {
  row1: HeaderCell[];
  row2: HeaderCell[];
}

export function SimpleHeader({ row1, row2 }: SimpleHeaderProps) {
  const renderRow = (cells: HeaderCell[], rowIdx: number) => (
    <tr key={rowIdx}>
      {cells.map((cell, idx) => (
        <th
          key={idx}
          colSpan={cell.colSpan}
          rowSpan={cell.rowSpan}
          className={`border border-[#ccc] p-1.5 text-xs font-semibold ${rowIdx === 0 ? 'font-extrabold' : ''}`}
          style={{ backgroundColor: cell.bgColor, color: cell.textColor || 'white' }}
        >
          <div className="flex items-center justify-center gap-2">
            <span>{cell.label}</span>
            {cell.extra}
          </div>
        </th>
      ))}
    </tr>
  );

  return (
    <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
      {renderRow(row1, 0)}
      {renderRow(row2, 1)}
    </thead>
  );
}

// ============ 훅들 ============

/**
 * 확정 상태 관리 훅
 */
export function useConfirmState(initialConfirmed = false) {
  const [isConfirmed, setIsConfirmed] = useState(initialConfirmed);
  
  const handleConfirm = useCallback(() => {
    setIsConfirmed(true);
  }, []);
  
  const handleEdit = useCallback(() => {
    setIsConfirmed(false);
  }, []);
  
  return { isConfirmed, setIsConfirmed, handleConfirm, handleEdit };
}

/**
 * 셀 병합 (rowSpan) 계산 훅
 * 
 * @param items 아이템 배열
 * @param getChildCount 각 아이템의 자식 개수 반환 함수
 * @returns spans 배열 (0이면 병합된 행, >0이면 rowSpan 값)
 */
export function useRowSpan<T>(
  items: T[],
  getChildCount: (item: T) => number
): number[] {
  return useMemo(() => {
    const spans: number[] = [];
    
    items.forEach((item, idx) => {
      const childCount = getChildCount(item);
      if (childCount === 0) {
        spans.push(1);
      } else {
        spans.push(childCount);
        // 자식 행들은 0으로 표시 (병합됨)
        for (let i = 1; i < childCount; i++) {
          spans.push(0);
        }
      }
    });
    
    return spans;
  }, [items, getChildCount]);
}

/**
 * 중첩 셀 병합 계산 훅 (L1 → L2 → L3 구조)
 */
export function useNestedRowSpan<L1, L2>(
  l1Items: L1[],
  getL2Items: (l1: L1) => L2[],
  getL3Count: (l2: L2) => number
): { l1Spans: number[]; l2Spans: number[] } {
  return useMemo(() => {
    const l1Spans: number[] = [];
    const l2Spans: number[] = [];
    
    l1Items.forEach((l1Item) => {
      const l2Items = getL2Items(l1Item);
      let l1TotalRows = 0;
      
      l2Items.forEach((l2Item, l2Idx) => {
        const l3Count = Math.max(1, getL3Count(l2Item));
        l1TotalRows += l3Count;
        
        // L2 span
        if (l2Idx === 0) {
          l2Spans.push(l3Count);
        } else {
          l2Spans.push(l3Count);
        }
        
        // L3 자식 행들은 0
        for (let i = 1; i < l3Count; i++) {
          l2Spans.push(0);
        }
      });
      
      // L1 span
      l1Spans.push(Math.max(1, l1TotalRows));
      for (let i = 1; i < l1TotalRows; i++) {
        l1Spans.push(0);
      }
    });
    
    return { l1Spans, l2Spans };
  }, [l1Items, getL2Items, getL3Count]);
}

/**
 * 누락 건수 계산 훅
 */
export function useMissingCount<T>(
  items: T[],
  isValid: (item: T) => boolean
): number {
  return useMemo(() => {
    return items.filter(item => !isValid(item)).length;
  }, [items, isValid]);
}

/**
 * 플랫 행 생성 훅 (중첩 구조를 평면화)
 */
export function useFlatRows<L1, L2, L3, R>(
  l1Items: L1[],
  getL2Items: (l1: L1) => L2[],
  getL3Items: (l2: L2) => L3[],
  createRow: (l1: L1, l2: L2, l3: L3, l1Span: number, l2Span: number) => R
): R[] {
  return useMemo(() => {
    const rows: R[] = [];
    
    l1Items.forEach((l1Item) => {
      const l2Items = getL2Items(l1Item);
      let l1FirstRow = true;
      let l1TotalRows = 0;
      
      // L1 전체 행 수 계산
      l2Items.forEach((l2Item) => {
        l1TotalRows += Math.max(1, getL3Items(l2Item).length);
      });
      
      l2Items.forEach((l2Item) => {
        const l3Items = getL3Items(l2Item);
        const l2RowCount = Math.max(1, l3Items.length);
        let l2FirstRow = true;
        
        if (l3Items.length === 0) {
          // L3가 없으면 빈 행 생성
           
          rows.push(createRow(
            l1Item,
            l2Item,
            null as unknown as L3,
            l1FirstRow ? l1TotalRows : 0,
            l2FirstRow ? l2RowCount : 0
          ));
          l1FirstRow = false;
          l2FirstRow = false;
        } else {
          l3Items.forEach((l3Item) => {
            rows.push(createRow(
              l1Item,
              l2Item,
              l3Item,
              l1FirstRow ? l1TotalRows : 0,
              l2FirstRow ? l2RowCount : 0
            ));
            l1FirstRow = false;
            l2FirstRow = false;
          });
        }
      });
    });
    
    return rows;
  }, [l1Items, getL2Items, getL3Items, createRow]);
}

// ============ 2-Line Bilingual Header Helper ============
/**
 * 한글/영문 2줄 헤더 렌더링
 * 형식: 한글 (위, 큰 글씨) + (English) (아래, 작은 글씨)
 * @param ko 한글 텍스트 (예: '1L 구조분석')
 * @param en 영문 텍스트 (예: 'Structure')
 * @param enSize 영문 폰트 크기 (default: '8px')
 */
export function BiHeader({ ko, en, enSize = '8px' }: { ko: string; en: string; enSize?: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15 }}>
      <span>{ko}</span>
      <span style={{ fontSize: enSize, opacity: 0.7 }}>({en})</span>
    </span>
  );
}

// ============ 셀 스타일 헬퍼 ============
export const cellStyles = {
  base: 'border border-[#ccc] p-0 align-middle',
  center: 'border border-[#ccc] p-0 align-middle text-center',
  header: (bg: string, text = 'white') => `border border-[#ccc] p-1.5 text-xs font-semibold text-center`,
};

// ============ 제브라 스트라이프 ============
export function getZebraClass(index: number, evenClass: string, oddClass: string): string {
  return index % 2 === 0 ? evenClass : oddClass;
}





