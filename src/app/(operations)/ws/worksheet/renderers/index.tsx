/**
 * @file renderers/index.tsx
 * @description PFD 워크시트 셀 렌더러 (CP 구조 수평전개)
 * @updated 2026-02-10 - FlowSymbolCell 분리, O(n²) → O(1) 최적화
 */

import React from 'react';
import { PfdItem, SpanInfo, ContextMenuType } from '../types';
import { PfdColumnDef, CELL_STYLE, HEIGHTS, COLORS } from '../pfdConstants';
import { ChangeMarker } from '@/lib/change-history';
import { FlowSymbolCell } from './FlowSymbolCell';

interface ColumnWidths {
  [colId: number]: number;
}

interface RenderCellProps {
  item: PfdItem;
  col: PfdColumnDef;
  rowIdx: number;
  items: PfdItem[];
  processRowSpan: SpanInfo[];
  descRowSpan: SpanInfo[];
  workRowSpan?: SpanInfo[];
  equipmentRowSpan?: SpanInfo[];
  charRowSpan: SpanInfo[];
  onCellChange: (itemId: string, key: string, value: any) => void;
  onContextMenu: (e: React.MouseEvent, rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  onAutoModeClick: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  columnWidths?: ColumnWidths;
  inputMode?: 'manual' | 'auto';
  changeMarkers?: ChangeMarker;
  /** Pre-computed group indices (part/equip/process별) */
  groupIndices?: { part: number[]; equip: number[]; process: number[] };
  /** Pre-computed charNo 배열 */
  charNos?: number[];
}

export function renderCell({
  item,
  col,
  rowIdx,
  items,
  processRowSpan,
  descRowSpan,
  workRowSpan,
  equipmentRowSpan,
  charRowSpan,
  onCellChange,
  onContextMenu,
  onAutoModeClick,
  columnWidths,
  inputMode = 'manual',
  changeMarkers,
  groupIndices,
  charNos,
}: RenderCellProps): React.ReactNode {
  const value = (item as any)[col.key];
  const isEmpty = value === null || value === undefined || value === '' || value === false;

  // 행 데이터 기준 부모-자식 그룹 색상
  const hasProductChar = !!(item.productChar && item.productChar.trim());
  const hasProcessChar = !!(item.processChar && item.processChar.trim());

  const isPartGroupParent = col.key === 'partName';
  const isEquipGroupParent = col.key === 'equipment';
  const isSharedColumn = ['productSC', 'processSC'].includes(col.key);
  const isProductCharColumn = col.key === 'productChar';
  const isProcessCharColumn = col.key === 'processChar';

  // 그룹 결정
  let isPartGroup = false;
  let isEquipGroup = false;

  if (isPartGroupParent || isProductCharColumn) {
    isPartGroup = true;
  } else if (isEquipGroupParent || isProcessCharColumn) {
    isEquipGroup = true;
  } else if (isSharedColumn) {
    if (hasProductChar && !hasProcessChar) {
      isPartGroup = true;
    } else if (hasProcessChar && !hasProductChar) {
      isEquipGroup = true;
    } else if (hasProductChar && hasProcessChar) {
      isPartGroup = true;
    } else {
      const hasPartName = !!(item.partName && item.partName.trim());
      const hasEquip = !!(item.equipment && item.equipment.trim());
      if (hasPartName) isPartGroup = true;
      else if (hasEquip) isEquipGroup = true;
    }
  }

  // ★ 줄무늬 인덱스 - O(1) lookup (pre-computed)
  let groupIndex = 0;
  if (groupIndices) {
    if (isPartGroup) groupIndex = groupIndices.part[rowIdx] ?? 0;
    else if (isEquipGroup) groupIndex = groupIndices.equip[rowIdx] ?? 0;
    else groupIndex = groupIndices.process[rowIdx] ?? 0;
  } else {
    // fallback: O(n) 계산 (pre-computed 미제공 시)
    let prevValue = '';
    const getVal = (i: number) => {
      if (isPartGroup) return items[i].partName || '';
      if (isEquipGroup) return items[i].equipment || '';
      return `${items[i].processNo}_${items[i].processName}`;
    };
    for (let i = 0; i <= rowIdx && i < items.length; i++) {
      const val = getVal(i);
      if (val !== prevValue && i > 0) groupIndex++;
      prevValue = val;
    }
  }
  const isEvenGroup = groupIndex % 2 === 0;

  // 배경색 결정
  let bgColor = col.cellColor;
  if (isEmpty) {
    bgColor = '#ffffff';
  } else if (isPartGroup) {
    bgColor = isPartGroupParent
      ? (isEvenGroup ? COLORS.partGroup.parent : COLORS.partGroup.parentAlt)
      : (isEvenGroup ? COLORS.partGroup.child : COLORS.partGroup.childAlt);
  } else if (isEquipGroup) {
    bgColor = isEquipGroupParent
      ? (isEvenGroup ? COLORS.equipGroup.parent : COLORS.equipGroup.parentAlt)
      : (isEvenGroup ? COLORS.equipGroup.child : COLORS.equipGroup.childAlt);
  } else {
    bgColor = isEvenGroup ? col.cellColor : col.cellAltColor;
  }

  const currentWidth = columnWidths?.[col.id] ?? col.width;

  // 변경 마커 확인
  const itemMarker = changeMarkers?.[item.id];
  const fieldMarker = itemMarker?.[col.key];
  const hasChange = !!fieldMarker;

  const cellStyle: React.CSSProperties = {
    padding: CELL_STYLE.padding,
    fontSize: '11px',
    lineHeight: CELL_STYLE.lineHeight,
    background: hasChange ? '#fff3cd' : bgColor,
    textAlign: col.align as any,
    border: hasChange ? '2px solid #ff9800' : '1px solid #ddd',
    height: HEIGHTS.body,
    width: currentWidth,
    minWidth: currentWidth,
    verticalAlign: 'middle',
    position: hasChange ? 'relative' : undefined,
  };

  // Change No 배지 렌더러
  const renderChangeBadge = () => {
    if (!hasChange || !fieldMarker) return null;
    return (
      <span
        style={{
          position: 'absolute', top: 0, right: 0,
          fontSize: '8px', fontWeight: 700, color: '#fff',
          background: '#ff5722', padding: '1px 3px',
          borderRadius: '0 0 0 4px', lineHeight: 1,
        }}
        title={`이전 값: ${fieldMarker.oldValue}`}
      >
        C{fieldMarker.changeNo}
      </span>
    );
  };

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    let type: ContextMenuType = 'general';
    if (col.key === 'processNo' || col.key === 'processName') type = 'process';
    else if (col.key === 'processDesc' || col.key === 'processLevel') type = 'process';
    else if (col.key === 'partName') type = 'work';
    else if (col.key === 'equipment') type = 'equipment';
    else if (col.key === 'productChar' || col.key === 'processChar') type = 'char';
    onContextMenu(e, rowIdx, type, col.key);
  };

  const handleChange = (newValue: any) => onCellChange(item.id, col.key, newValue);

  // ===== 공통 헬퍼: 병합 셀 + 수동/자동 모드 입력 =====
  const renderMergedInputCell = (
    spanInfo: SpanInfo | undefined,
    displayValue: string,
    autoType: ContextMenuType,
    textAlign: 'center' | 'left' = 'center'
  ) => {
    if (spanInfo && !spanInfo.isFirst) return null;
    const cellIsEmpty = !displayValue;
    const cellBgColor = cellIsEmpty ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa') : bgColor;

    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{ ...cellStyle, cursor: inputMode === 'auto' ? 'pointer' : 'text', verticalAlign: 'middle', background: cellBgColor, padding: '1px' }}
        rowSpan={spanInfo?.span || 1}
        onContextMenu={handleContextMenu}
        onClick={inputMode === 'auto' ? () => onAutoModeClick(rowIdx, autoType, col.key) : undefined}
      >
        {inputMode === 'manual' ? (
          <input
            type="text" value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            onContextMenu={handleContextMenu} placeholder="-"
            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', fontSize: '10px', textAlign, outline: 'none' }}
          />
        ) : (
          <div className={`flex items-center gap-1 h-full min-h-[20px] cursor-pointer ${textAlign === 'center' ? 'justify-center' : ''}`}>
            {cellIsEmpty
              ? <span className="text-gray-400 text-[9px]">-</span>
              : <span className={`w-full bg-transparent text-[10px] text-${textAlign}`}>{displayValue}</span>}
          </div>
        )}
      </td>
    );
  };

  // 고유값 표시 제거 헬퍼
  const getDisplayValue = (v: any) =>
    (v && typeof v === 'string' && v.startsWith('_')) ? '' : (v || '');

  // ===== A, B열 (공정번호, 공정명) =====
  if (col.key === 'processNo' || col.key === 'processName') {
    const spanInfo = processRowSpan[rowIdx];
    if (!spanInfo?.isFirst) return null;
    const displayValue = getDisplayValue(value);
    const isProcessName = col.key === 'processName';
    const cellIsEmpty = !displayValue;
    const cellBgColor = cellIsEmpty ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa') : bgColor;

    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{ ...cellStyle, verticalAlign: 'middle', cursor: inputMode === 'auto' && isProcessName ? 'pointer' : 'text', background: cellBgColor, padding: '1px' }}
        rowSpan={spanInfo.span}
        onContextMenu={handleContextMenu}
        onClick={inputMode === 'auto' && isProcessName ? () => onAutoModeClick(rowIdx, 'process', col.key) : undefined}
      >
        {inputMode === 'manual' ? (
          <input type="text" value={displayValue} onChange={(e) => handleChange(e.target.value)}
            onContextMenu={handleContextMenu} placeholder="-"
            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', fontSize: '10px', textAlign: 'center', outline: 'none' }} />
        ) : (
          <div className="flex items-center gap-1 justify-center h-full">
            {cellIsEmpty ? <span className="text-gray-400 text-[9px]">-</span> : <span className="text-[10px] text-center">{displayValue}</span>}
          </div>
        )}
      </td>
    );
  }

  // ===== C열 (레벨) =====
  if (col.key === 'processLevel') {
    const spanInfo = descRowSpan?.[rowIdx];
    if (spanInfo && !spanInfo.isFirst) return null;
    const displayValue = getDisplayValue(value);
    const cellIsEmpty = !displayValue;
    const cellBgColor = cellIsEmpty ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa') : bgColor;

    return (
      <td key={`${item.id}-${col.key}`} style={{ ...cellStyle, verticalAlign: 'middle', background: cellBgColor }}
        rowSpan={spanInfo?.span || 1} onContextMenu={handleContextMenu}>
        <select value={displayValue} onChange={(e) => handleChange(e.target.value)}
          style={{ width: '100%', background: 'transparent', textAlign: 'center', fontSize: '10px', outline: 'none', cursor: 'pointer',
            appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', color: cellIsEmpty ? '#9ca3af' : 'inherit' }}>
          <option value="" style={{ color: '#9ca3af' }}>미입력</option>
          <option value="Main">Main</option>
          <option value="Sub">Sub</option>
        </select>
      </td>
    );
  }

  // ===== D열 (공정설명) =====
  if (col.key === 'processDesc') {
    return renderMergedInputCell(descRowSpan?.[rowIdx], getDisplayValue(value), 'process', 'left');
  }

  // ===== E열 (부품명/partName) =====
  if (col.key === 'partName') {
    return renderMergedInputCell(workRowSpan?.[rowIdx], getDisplayValue(value), 'work', 'center');
  }

  // ===== F열 (설비/금형/치그) =====
  if (col.key === 'equipment') {
    return renderMergedInputCell(equipmentRowSpan?.[rowIdx], getDisplayValue(value), 'equipment', 'center');
  }

  // ===== NO 열 (charNo) - O(1) lookup =====
  if (col.key === 'charNo') {
    const charIndex = charNos ? charNos[rowIdx] : (() => {
      // fallback: O(n) 계산
      const currentProcess = `${item.processNo}-${item.processName}`;
      let idx = 1;
      for (let i = 0; i < rowIdx; i++) {
        if (`${items[i].processNo}-${items[i].processName}` === currentProcess) idx++;
      }
      return idx;
    })();

    return (
      <td key={`${item.id}-${col.key}`} style={{ ...cellStyle, fontWeight: 700 }} onContextMenu={handleContextMenu}>
        <span style={{ fontWeight: 600, color: '#000000', fontSize: '10px' }}>{charIndex}</span>
      </td>
    );
  }

  // ===== SC 선택 (productSC, processSC) =====
  if (col.key === 'productSC' || col.key === 'processSC') {
    return (
      <td key={`${item.id}-${col.key}`} style={cellStyle} onContextMenu={handleContextMenu}>
        <select value={value || ''} onChange={(e) => handleChange(e.target.value)}
          style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', fontSize: '9px', textAlign: 'center',
            appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer' }}>
          <option value=""></option>
          <option value="CC">CC</option>
          <option value="SC">SC</option>
        </select>
      </td>
    );
  }

  // ===== I열 (제품특성/productChar) =====
  if (col.key === 'productChar') {
    return renderMergedInputCell(charRowSpan?.[rowIdx], getDisplayValue(value), 'char', 'left');
  }

  // ===== 공정흐름 심볼 (작업/운반/저장/검사) =====
  if (['flowWork', 'flowTransport', 'flowStorage', 'flowInspect'].includes(col.key)) {
    return (
      <FlowSymbolCell
        item={item} colKey={col.key} colWidth={col.width}
        rowIdx={rowIdx} items={items} cellStyle={cellStyle}
        onCellChange={onCellChange} onContextMenu={handleContextMenu}
      />
    );
  }

  // ===== 기본 텍스트 입력 =====
  const displayValue = getDisplayValue(value);
  return (
    <td key={`${item.id}-${col.key}`} style={cellStyle} onContextMenu={handleContextMenu}>
      <input type="text" value={displayValue} onChange={(e) => handleChange(e.target.value)}
        onContextMenu={handleContextMenu}
        style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', fontSize: '11px' }} />
    </td>
  );
}
