'use client';

import React from 'react';
import { COLORS } from '../../constants';
import { FUNC_COLORS } from './constants';
import { FlatRow, ModalType } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';
import { l2CellStyle } from './SectionStyles';

interface L2SectionProps {
  row: FlatRow;
  l2Span: number;
  onOpenModal: (type: ModalType, id: string, processNo?: string) => void;
}

/**
 * 2. 메인공정 기능/제품특성 섹션 (L2 레벨)
 */
export default function L2Section({ row, l2Span, onOpenModal }: L2SectionProps) {
  if (l2Span === 0) return null;

  return (
    <>
      {/* L2: 공정 기능 */}
      <td 
        rowSpan={l2Span} 
        style={l2CellStyle(FUNC_COLORS.l2Cell)}
      >
        <SelectableCell
          value={row.l2Function}
          placeholder="공정 기능"
          bgColor={FUNC_COLORS.l2Cell}
          onClick={() => onOpenModal('l2Function', row.l2Id, row.l2No)}
        />
      </td>
      
      {/* L2: 제품특성 */}
      <td 
        rowSpan={l2Span} 
        style={l2CellStyle(FUNC_COLORS.l2Cell)}
      >
        <SelectableCell
          value={row.l2ProductChar}
          placeholder="제품특성"
          bgColor={FUNC_COLORS.l2Cell}
          onClick={() => onOpenModal('l2ProductChar', row.l2Id, row.l2No)}
        />
      </td>
    </>
  );
}












