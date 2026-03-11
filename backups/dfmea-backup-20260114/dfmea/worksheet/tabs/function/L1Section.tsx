'use client';

import React from 'react';
import { COLORS } from '../../constants';
import { stickyFirstColStyle } from './constants';
import { stickyCellStyle } from './SectionStyles';
import { l1CellStyle, structureCellStyle, m4CellStyle, workElementCellStyle } from './SectionStyles';
import { FlatRow, ModalType } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';

interface L1SectionProps {
  row: FlatRow;
  l1Span: number;
  l1TypeSpan: number;
  l1FuncSpan: number;
  l2Span: number;
  onOpenModal: (type: ModalType, id: string, secondaryId?: string) => void;
}

/**
 * 1. 구조 및 완제품 기능/요구사항 섹션 (L1 레벨 트리 구조)
 */
export default function L1Section({ 
  row, 
  l1Span, 
  l1TypeSpan, 
  l1FuncSpan, 
  l2Span,
  onOpenModal 
}: L1SectionProps) {
  
  return (
    <>
      {/* --- 구조분석 영역 (연계) --- */}
      
      {/* 완제품명 (FMEA당 1개) */}
      {l1Span > 0 && (
        <td 
          rowSpan={l1Span}
          style={{ 
            ...stickyFirstColStyle,
            zIndex: 10,
            ...structureCellStyle('#e3f2fd', { padding: '4px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }),
          }}
        >
          {row.l1Name}
        </td>
      )}

      {/* 메인공정명 (공정당 병합) */}
      {l2Span > 0 && (
        <td 
          rowSpan={l2Span}
          style={structureCellStyle('#e8f5e9', { padding: '4px', textAlign: 'center', fontSize: '12px' })}
        >
          {row.l2No} {row.l2Name}
        </td>
      )}

      {/* 4M & 작업요소 (병합 없음) */}
      <td style={m4CellStyle}>
        {row.m4}
      </td>
      <td style={workElementCellStyle}>
        {row.l3Name}
      </td>

      {/* --- 기능분석 영역 (L1) --- */}

      {/* L1: 구분 (Type) */}
      {l1TypeSpan > 0 && (
        <td 
          rowSpan={l1TypeSpan} 
          style={{ 
            width: '80px',
            ...structureCellStyle('#c8e6c9', { padding: '0 4px', textAlign: 'center' }),
          }}
        >
          <SelectableCell
            value={row.l1Type}
            placeholder="구분"
            bgColor="#c8e6c9"
            onClick={() => onOpenModal('l1Type', row.l1Id)}
          />
        </td>
      )}

      {/* L1: 완제품 기능 (Function) */}
      {l1FuncSpan > 0 && (
        <td 
          rowSpan={l1FuncSpan} 
          style={l1CellStyle('#c8e6c9')}
        >
          <SelectableCell
            value={row.l1Function}
            placeholder="완제품 기능"
            bgColor="#c8e6c9"
            onClick={() => onOpenModal('l1Function', row.l1TypeId)}
          />
        </td>
      )}
      
      {/* L1: 요구사항 (Requirement) */}
      <td 
        style={l1CellStyle('#c8e6c9')}
      >
        <SelectableCell
          value={row.l1Requirement}
          placeholder="요구사항"
          bgColor="#c8e6c9"
          onClick={() => onOpenModal('l1Requirement', row.l1FunctionId)}
        />
      </td>
    </>
  );
}
