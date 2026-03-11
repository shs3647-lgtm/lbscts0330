/**
 * @file FlowSymbolCell.tsx
 * @description 공정흐름 심볼 셀 렌더러 (작업/운반/저장/검사)
 * @created 2026-02-10 - renderers/index.tsx에서 분리
 */

import React from 'react';
import { PfdItem } from '../types';

const FLOW_KEYS = ['flowWork', 'flowTransport', 'flowStorage', 'flowInspect'] as const;

const SYMBOLS: Record<string, { symbol: string; color: string; label: string }> = {
  flowWork: { symbol: '○', color: '#2563eb', label: '작업' },
  flowTransport: { symbol: '◁', color: '#7c3aed', label: '운반' },
  flowStorage: { symbol: '△', color: '#059669', label: '저장' },
  flowInspect: { symbol: '□', color: '#dc2626', label: '검사' },
};

interface FlowSymbolCellProps {
  item: PfdItem;
  colKey: string;
  colWidth: number;
  rowIdx: number;
  items: PfdItem[];
  cellStyle: React.CSSProperties;
  onCellChange: (itemId: string, key: string, value: any) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function FlowSymbolCell({
  item,
  colKey,
  colWidth,
  rowIdx,
  items,
  cellStyle,
  onCellChange,
  onContextMenu,
}: FlowSymbolCellProps): React.ReactElement {
  const isChecked = !!(item as any)[colKey];
  const symbolInfo = SYMBOLS[colKey];
  const currentFlowIdx = FLOW_KEYS.indexOf(colKey as any);

  // 이전 행에서 선택된 심볼 위치 찾기
  let prevFlowIdx = -1;
  if (rowIdx > 0) {
    const prevItem = items[rowIdx - 1];
    for (let i = 0; i < FLOW_KEYS.length; i++) {
      if ((prevItem as any)[FLOW_KEYS[i]]) {
        prevFlowIdx = i;
        break;
      }
    }
  }

  // 현재 행에서 선택된 심볼 위치
  let currentSelectedIdx = -1;
  for (let i = 0; i < FLOW_KEYS.length; i++) {
    if ((item as any)[FLOW_KEYS[i]]) {
      currentSelectedIdx = i;
      break;
    }
  }

  const hasPrev = prevFlowIdx !== -1;
  const hasCurrent = currentSelectedIdx !== -1;
  const isSameCol = prevFlowIdx === currentSelectedIdx;
  const minIdx = Math.min(prevFlowIdx, currentSelectedIdx);
  const maxIdx = Math.max(prevFlowIdx, currentSelectedIdx);

  const showVerticalFromPrev = hasPrev && currentFlowIdx === prevFlowIdx;
  const showVerticalToCurrent = hasPrev && hasCurrent && !isSameCol && currentFlowIdx === currentSelectedIdx;
  const showHorizontal = hasPrev && hasCurrent && !isSameCol && currentFlowIdx >= minIdx && currentFlowIdx <= maxIdx;
  const showArrow = hasPrev && hasCurrent && currentFlowIdx === currentSelectedIdx;

  return (
    <td
      key={`${item.id}-${colKey}`}
      style={{
        ...cellStyle,
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
        minWidth: `${colWidth}px`,
        maxWidth: `${colWidth}px`,
      }}
      onClick={() => {
        const newValue = !isChecked;
        FLOW_KEYS.forEach(fk => {
          if (fk !== colKey) onCellChange(item.id, fk, false);
        });
        onCellChange(item.id, colKey, newValue);
      }}
      title={`${symbolInfo.label} (클릭하여 선택)`}
    >
      {showVerticalFromPrev && (
        <div style={{
          position: 'absolute', left: '50%', top: '-1px',
          width: '2px', height: isSameCol ? '100%' : '13px',
          background: '#f97316', transform: 'translateX(-50%)', zIndex: 15,
        }} />
      )}
      {showHorizontal && (
        <div style={{
          position: 'absolute',
          left: currentFlowIdx === minIdx ? '50%' : '0',
          right: currentFlowIdx === maxIdx ? '50%' : '0',
          top: '12px', height: '2px', background: '#f97316', zIndex: 15,
        }} />
      )}
      {showVerticalToCurrent && (
        <div style={{
          position: 'absolute', left: '50%', top: '12px',
          width: '2px', height: 'calc(50% - 2px)',
          background: '#f97316', transform: 'translateX(-50%)', zIndex: 15,
        }} />
      )}
      {showArrow && (
        <div style={{
          position: 'absolute', left: '50%', bottom: '2px',
          width: '0', height: '0',
          borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
          borderTop: '6px solid #f97316', transform: 'translateX(-50%)', zIndex: 20,
        }} />
      )}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%',
        fontSize: isChecked ? '18px' : '14px',
        fontWeight: isChecked ? 'bold' : 'normal',
        color: isChecked ? symbolInfo.color : '#d1d5db',
        transition: 'all 0.15s ease',
        position: 'relative', zIndex: 10,
      }}>
        {symbolInfo.symbol}
      </div>
    </td>
  );
}
