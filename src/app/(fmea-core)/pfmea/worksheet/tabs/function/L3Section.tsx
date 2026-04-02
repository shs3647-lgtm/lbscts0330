'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { COLORS } from '../../constants';
import { FUNC_COLORS } from './constants';
import { FlatRow, ModalType } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';
import { getFmeaLabels } from '@/lib/fmea-labels';

interface L3SectionProps {
  row: FlatRow;
  onOpenModal: (type: ModalType, id: string, processNo?: string) => void;
}

/**
 * 3. 작업요소 기능/공정특성 섹션 (L3 레벨)
 */
export default function L3Section({ row, onOpenModal }: L3SectionProps) {
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const lb = getFmeaLabels(isDfmea);

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
          placeholder={lb.l3Func}
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
          placeholder={lb.l3Char}
          bgColor={FUNC_COLORS.l3Cell}
          onClick={() => onOpenModal('l3ProcessChar', row.l3Id, row.l2No)}
        />
      </td>
    </>
  );
}














