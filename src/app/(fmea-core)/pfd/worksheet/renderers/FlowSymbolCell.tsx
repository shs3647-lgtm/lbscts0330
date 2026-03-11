// CODEFREEZE
/**
 * @file renderers/FlowSymbolCell.tsx
 * @description PFD 공정흐름 심볼 셀 렌더러 (최적화 버전)
 * 
 * ★ 핵심 변경 (최적화):
 * - 공정별 셀 병합 (processRowSpan 기반 rowSpan)
 * - 병합된 영역의 세로 중앙에 도형 1개만 표시
 * - 공정 간 연결선: 수직선 + 필요 시 수평 꺾임선
 * - 클릭 시 해당 공정의 모든 행에 동일한 흐름 유형 적용
 */

import React, { memo } from 'react';
import { PfdItem, SpanInfo } from '../types';
import { PfdColumnDef, HEIGHTS } from '../pfdConstants';

interface FlowSymbolCellProps {
  item: PfdItem;
  col: PfdColumnDef;
  rowIdx: number;
  items: PfdItem[];
  processRowSpan: SpanInfo[];
  cellStyle: React.CSSProperties;
  onCellChange: (itemId: string, key: string, value: any) => void;
}

// 심볼 정의
const SYMBOLS: Record<string, { symbol: string; label: string }> = {
  flowWork: { symbol: '●', label: '작업(Operation)' },
  flowTransport: { symbol: '▶', label: '운반(Transport)' },
  flowStorage: { symbol: '▲', label: '저장(Storage)' },
  flowInspect: { symbol: '◆', label: '검사(Inspection)' },
};

const FLOW_KEYS = ['flowWork', 'flowTransport', 'flowStorage', 'flowInspect'];
const LINE_COLOR = '#1565c0';
const ROW_H = HEIGHTS.body; // 25px

/**
 * 공정의 대표 흐름 유형(열 인덱스)을 결정
 * - 공정 내 아무 행에서든 선택된 첫 번째 흐름 유형 반환
 * - 없으면 -1
 */
function getProcessFlowCol(items: PfdItem[], startIdx: number, span: number): number {
  for (let i = startIdx; i < startIdx + span && i < items.length; i++) {
    for (let fi = 0; fi < FLOW_KEYS.length; fi++) {
      if ((items[i] as any)[FLOW_KEYS[fi]]) return fi;
    }
  }
  return -1;
}

function FlowSymbolCellInner({
  item,
  col,
  rowIdx,
  items,
  processRowSpan,
  cellStyle,
  onCellChange,
}: FlowSymbolCellProps): React.ReactNode {
  const spanInfo = processRowSpan[rowIdx];

  // 병합된 행은 null (공정명과 동일)
  if (!spanInfo?.isFirst) {
    return null;
  }

  const span = spanInfo.span;
  const currentFlowIdx = FLOW_KEYS.indexOf(col.key);
  const totalHeight = span * ROW_H;
  const centerY = totalHeight / 2;

  // ★ 이 공정의 대표 흐름 유형 (열 인덱스)
  const processFlowCol = getProcessFlowCol(items, rowIdx, span);
  const isSelected = processFlowCol === currentFlowIdx;

  // ★ 이전 공정의 대표 흐름 유형
  let prevProcessFlowCol = -1;
  if (rowIdx > 0) {
    // 이전 공정의 시작 행 찾기
    let prevStart = rowIdx - 1;
    while (prevStart > 0 && processRowSpan[prevStart] && !processRowSpan[prevStart].isFirst) {
      prevStart--;
    }
    const prevSpan = processRowSpan[prevStart]?.span || 1;
    prevProcessFlowCol = getProcessFlowCol(items, prevStart, prevSpan);
  }

  // ★ 다음 공정의 대표 흐름 유형
  const nextRowIdx = rowIdx + span;
  let nextProcessFlowCol = -1;
  if (nextRowIdx < items.length) {
    const nextSpan = processRowSpan[nextRowIdx]?.span || 1;
    nextProcessFlowCol = getProcessFlowCol(items, nextRowIdx, nextSpan);
  }

  // ★ 클릭 핸들러: 공정의 모든 행에 이 흐름 유형을 토글
  const handleClick = () => {
    const newValue = !isSelected;
    for (let i = rowIdx; i < rowIdx + span && i < items.length; i++) {
      const pItem = items[i];
      FLOW_KEYS.forEach(fk => {
        onCellChange(pItem.id, fk, fk === col.key ? newValue : false);
      });
    }
  };

  // ========== 연결선 생성 ==========
  const lines: React.ReactNode[] = [];

  // [1] 이전 공정 → 현재 공정 연결선 (셀 상단 → 중앙)
  if (prevProcessFlowCol !== -1 && processFlowCol !== -1) {
    const fromCol = prevProcessFlowCol;
    const toCol = processFlowCol;
    const minCol = Math.min(fromCol, toCol);
    const maxCol = Math.max(fromCol, toCol);

    if (currentFlowIdx >= minCol && currentFlowIdx <= maxCol) {
      if (fromCol === toCol && currentFlowIdx === fromCol) {
        // 같은 열: 상단 → 중앙 수직선
        lines.push(
          <div key="in-v" style={{
            position: 'absolute', left: '50%', top: 0,
            width: 2, height: centerY,
            background: LINE_COLOR, transform: 'translateX(-50%)', zIndex: 5,
          }} />
        );
      } else {
        // 꺾이는 연결 - 상단에서 수평선
        lines.push(
          <div key="in-h" style={{
            position: 'absolute',
            left: currentFlowIdx === minCol ? '50%' : 0,
            right: currentFlowIdx === maxCol ? '50%' : 0,
            top: 0, height: 2, background: LINE_COLOR, zIndex: 5,
          }} />
        );
        // from 열: 상단에서 짧은 수직 연결
        if (currentFlowIdx === fromCol) {
          lines.push(
            <div key="in-vf" style={{
              position: 'absolute', left: '50%', top: -1,
              width: 2, height: 3,
              background: LINE_COLOR, transform: 'translateX(-50%)', zIndex: 5,
            }} />
          );
        }
        // to 열: 상단 → 중앙 수직선
        if (currentFlowIdx === toCol) {
          lines.push(
            <div key="in-vt" style={{
              position: 'absolute', left: '50%', top: 0,
              width: 2, height: centerY,
              background: LINE_COLOR, transform: 'translateX(-50%)', zIndex: 5,
            }} />
          );
        }
      }
    }
  }

  // [2] 현재 공정 → 다음 공정 연결선 (중앙 → 셀 하단)
  if (nextProcessFlowCol !== -1 && processFlowCol !== -1) {
    const fromCol = processFlowCol;
    const toCol = nextProcessFlowCol;
    const minCol = Math.min(fromCol, toCol);
    const maxCol = Math.max(fromCol, toCol);

    if (currentFlowIdx >= minCol && currentFlowIdx <= maxCol) {
      if (fromCol === toCol && currentFlowIdx === fromCol) {
        // 같은 열: 중앙 → 하단 수직선
        lines.push(
          <div key="out-v" style={{
            position: 'absolute', left: '50%', top: centerY,
            width: 2, height: totalHeight - centerY,
            background: LINE_COLOR, transform: 'translateX(-50%)', zIndex: 5,
          }} />
        );
      } else {
        // 꺾이는 연결 - 하단에서 수평선
        lines.push(
          <div key="out-h" style={{
            position: 'absolute',
            left: currentFlowIdx === minCol ? '50%' : 0,
            right: currentFlowIdx === maxCol ? '50%' : 0,
            bottom: 0, height: 2, background: LINE_COLOR, zIndex: 5,
          }} />
        );
        // from 열: 중앙 → 하단 수직선
        if (currentFlowIdx === fromCol) {
          lines.push(
            <div key="out-vf" style={{
              position: 'absolute', left: '50%', top: centerY,
              width: 2, height: totalHeight - centerY,
              background: LINE_COLOR, transform: 'translateX(-50%)', zIndex: 5,
            }} />
          );
        }
        // to 열: 하단에서 짧은 수직 연결
        if (currentFlowIdx === toCol) {
          lines.push(
            <div key="out-vt" style={{
              position: 'absolute', left: '50%', bottom: -1,
              width: 2, height: 3,
              background: LINE_COLOR, transform: 'translateX(-50%)', zIndex: 5,
            }} />
          );
        }
      }
    }
  }

  return (
    <td
      key={`${item.id}-${col.key}`}
      rowSpan={span}
      style={{
        ...cellStyle,
        padding: 0,
        verticalAlign: 'middle',
        height: totalHeight,
        cursor: 'pointer',
      }}
      title={`${SYMBOLS[col.key]?.label || col.key} (클릭하여 선택)`}
      onClick={handleClick}
    >
      {/* ★ 래퍼 div - position:relative 컨테이너 */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: totalHeight,
        overflow: 'visible',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* 연결선 */}
        {lines}

        {/* ★ 공정당 도형 1개 (중앙 배치) */}
        <span style={{
          fontSize: isSelected ? '16px' : '10px',
          fontWeight: 'bold',
          color: isSelected ? LINE_COLOR : '#d1d5db',
          transition: 'all 0.15s ease',
          position: 'relative',
          zIndex: 10,
        }}>
          {SYMBOLS[col.key]?.symbol}
        </span>
      </div>
    </td>
  );
}

// ★★★ 최적화: React.memo로 불필요한 재렌더링 방지 ★★★
export const FlowSymbolCell = memo(FlowSymbolCellInner);
