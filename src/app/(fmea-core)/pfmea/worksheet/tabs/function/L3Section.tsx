'use client';

import React from 'react';
import { COLORS } from '../../constants';
import { FUNC_COLORS } from './constants';
import { FlatRow, ModalType } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';

interface L3SectionProps {
  row: FlatRow;
  onOpenModal: (type: ModalType, id: string, processNo?: string) => void;
}

/**
 * 3. 작업요소 기능/공정특성 섹션 (L3 레벨)
 */
export default function L3Section({ row, onOpenModal }: L3SectionProps) {
  return (
    <>
      {/* L3: 작업요소 기능 */}
      <td 
        style={{ 
          borderTop: `1px solid #ccc`,
          borderRight: `1px solid #ccc`,
          borderBottom: `1px solid #ccc`,
          borderLeft: `1px solid #ccc`,
          padding: '2px 4px', 
          background: FUNC_COLORS.l3Cell,
          wordBreak: 'break-word',
        }}
      >
        <SelectableCell
          value={row.l3Function}
          placeholder="작업요소 기능"
          bgColor={FUNC_COLORS.l3Cell}
          onClick={() => onOpenModal('l3Function', row.l3Id, row.l2No)}
        />
      </td>
      
      {/* L3: 공정특성 */}
      <td 
        style={{ 
          borderTop: `1px solid #ccc`,
          borderRight: `1px solid #ccc`,
          borderBottom: `1px solid #ccc`,
          borderLeft: `1px solid #ccc`,
          padding: '2px 4px', 
          background: FUNC_COLORS.l3Cell,
          wordBreak: 'break-word',
        }}
      >
        <SelectableCell
          value={row.l3ProcessChar}
          placeholder="공정특성"
          bgColor={FUNC_COLORS.l3Cell}
          onClick={() => onOpenModal('l3ProcessChar', row.l3Id, row.l2No)}
        />
      </td>
    </>
  );
}














