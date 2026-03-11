// CODEFREEZE
/**
 * @file renderers/index.tsx
 * @description PFD 워크시트 셀 렌더러 (CP 구조 수평전개)
 * @updated 2026-01-31 - 변경 이력 마커 추가
 */

import React from 'react';
import { PfdItem, SpanInfo, ContextMenuType } from '../types';
import { PfdColumnDef, CELL_STYLE, HEIGHTS, COLORS } from '../pfdConstants';
import { ChangeMarker } from '@/lib/change-history';
import { FlowSymbolCell } from './FlowSymbolCell';

interface ColumnWidths {
  [colId: number]: number;
}

// ★★★ 최적화: groupIndex 사전 계산 맵 ★★★
export interface GroupIndexMap {
  part: number[];    // 행별 partName 그룹 인덱스
  equip: number[];   // 행별 equipment 그룹 인덱스
  process: number[]; // 행별 process 그룹 인덱스
  charNo: number[];  // 행별 공정 내 특성 순번
}

/** O(n) 단일 패스로 모든 행의 groupIndex를 사전 계산 */
export function buildGroupIndexMap(items: PfdItem[]): GroupIndexMap {
  const part: number[] = [];
  const equip: number[] = [];
  const process: number[] = [];
  const charNo: number[] = [];

  let partIdx = 0, equipIdx = 0, processIdx = 0;
  let prevPart = '', prevEquip = '', prevProcess = '';
  let charCounter = 1;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const pv = it.partName || '';
    const ev = it.equipment || '';
    const prv = `${it.processNo}_${it.processName}`;

    if (i > 0 && pv !== prevPart) partIdx++;
    if (i > 0 && ev !== prevEquip) equipIdx++;
    if (i > 0 && prv !== prevProcess) {
      processIdx++;
      charCounter = 1; // 공정 변경 시 리셋
    }

    part[i] = partIdx;
    equip[i] = equipIdx;
    process[i] = processIdx;
    charNo[i] = charCounter++;

    prevPart = pv;
    prevEquip = ev;
    prevProcess = prv;
  }

  return { part, equip, process, charNo };
}

interface RenderCellProps {
  item: PfdItem;
  col: PfdColumnDef;
  rowIdx: number;
  items: PfdItem[];
  processRowSpan: SpanInfo[];
  descRowSpan: SpanInfo[];  // ★ C,D열 rowSpan 추가
  workRowSpan?: SpanInfo[];
  equipmentRowSpan?: SpanInfo[];  // ★ F열 rowSpan 추가
  charRowSpan: SpanInfo[];
  onCellChange: (itemId: string, key: string, value: any) => void;
  onContextMenu: (e: React.MouseEvent, rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  onAutoModeClick: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  columnWidths?: ColumnWidths;
  inputMode?: 'manual' | 'auto';  // ★ 입력 모드 추가
  changeMarkers?: ChangeMarker;  // ★★★ 변경 이력 마커 ★★★
  groupIndexMap?: GroupIndexMap;  // ★★★ 최적화: 사전 계산된 맵 ★★★
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
  inputMode = 'manual',  // ★ 기본값 수동 모드
  changeMarkers,  // ★★★ 변경 마커 ★★★
  groupIndexMap,  // ★★★ 최적화: 사전 계산된 맵 ★★★
}: RenderCellProps): React.ReactNode {
  const value = (item as any)[col.key];
  const isEmpty = value === null || value === undefined || value === '' || value === false;

  // ★★★ 행 데이터 기준 부모-자식 그룹 색상 (CP 동일) ★★★
  // - 제품특성 값이 있으면 → 파란색 (부품명 그룹)
  // - 공정특성 값이 있으면 → 녹색 (설비 그룹)

  // 해당 행의 제품특성/공정특성 값 확인
  const hasProductChar = !!(item.productChar && item.productChar.trim());
  const hasProcessChar = !!(item.processChar && item.processChar.trim());

  // 부모 컬럼
  const isPartGroupParent = col.key === 'partName';  // PFD에서는 partName이 부품명
  const isEquipGroupParent = col.key === 'equipment';

  // 공유 컬럼 (제품SC, 공정SC 제외한 나머지)
  const isSharedColumn = ['productSC', 'processSC'].includes(col.key);

  // 제품특성/공정특성 컬럼
  const isProductCharColumn = col.key === 'productChar';
  const isProcessCharColumn = col.key === 'processChar';

  // ★ 그룹 결정 (행 데이터 기준)
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

  // ★★★ 최적화: 사전 계산 맵에서 O(1) 조회 ★★★
  const groupIndex = groupIndexMap
    ? (isPartGroup ? groupIndexMap.part[rowIdx] : isEquipGroup ? groupIndexMap.equip[rowIdx] : groupIndexMap.process[rowIdx])
    : 0;
  const isEvenGroup = groupIndex % 2 === 0;

  // ★ 배경색 결정
  let bgColor = col.cellColor;
  if (isEmpty) {
    bgColor = '#ffffff';
  } else if (isPartGroup) {
    if (isPartGroupParent) {
      bgColor = isEvenGroup ? COLORS.partGroup.parent : COLORS.partGroup.parentAlt;
    } else {
      bgColor = isEvenGroup ? COLORS.partGroup.child : COLORS.partGroup.childAlt;
    }
  } else if (isEquipGroup) {
    if (isEquipGroupParent) {
      bgColor = isEvenGroup ? COLORS.equipGroup.parent : COLORS.equipGroup.parentAlt;
    } else {
      bgColor = isEvenGroup ? COLORS.equipGroup.child : COLORS.equipGroup.childAlt;
    }
  } else {
    bgColor = isEvenGroup ? col.cellColor : col.cellAltColor;
  }

  const currentWidth = columnWidths?.[col.id] ?? col.width;

  // ★★★ 변경 마커 확인 ★★★
  const itemMarker = changeMarkers?.[item.id];
  const fieldMarker = itemMarker?.[col.key];
  const hasChange = !!fieldMarker;

  // '-' 단독 값은 빈 데이터 표시 → 중앙정렬
  const isDashOnly = typeof value === 'string' && value.trim() === '-';

  const cellStyle: React.CSSProperties = {
    padding: CELL_STYLE.padding,
    fontSize: '11px',
    lineHeight: CELL_STYLE.lineHeight,
    background: hasChange ? '#fff3cd' : bgColor,  // ★ 변경된 셀은 노란색 배경
    textAlign: isDashOnly ? 'center' : col.align as any,
    border: hasChange ? '2px solid #ff9800' : '1px solid #ddd',  // ★ 변경된 셀은 주황 테두리
    height: HEIGHTS.body,
    width: currentWidth,
    minWidth: currentWidth,
    verticalAlign: 'middle',
    position: hasChange ? 'relative' : undefined,  // ★ Change No 표시용
  };

  // ★★★ Change No 배지 렌더러 ★★★
  const renderChangeBadge = () => {
    if (!hasChange || !fieldMarker) return null;
    return (
      <span
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          fontSize: '8px',
          fontWeight: 700,
          color: '#fff',
          background: '#ff5722',
          padding: '1px 3px',
          borderRadius: '0 0 0 4px',
          lineHeight: 1,
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
    if (col.key === 'processNo' || col.key === 'processName') {
      type = 'process';
    } else if (col.key === 'processDesc' || col.key === 'processLevel') {
      type = 'process';
    } else if (col.key === 'partName') {
      type = 'work';
    } else if (col.key === 'equipment') {
      type = 'equipment';
    } else if (col.key === 'productChar' || col.key === 'processChar') {
      type = 'char';
    }
    onContextMenu(e, rowIdx, type, col.key);
  };

  // 공통 입력 핸들러
  const handleChange = (newValue: any) => {
    onCellChange(item.id, col.key, newValue);
  };

  // ★★★ NO열 (rowNo) - 순차 번호 (1부터 시작) ★★★
  if (col.key === 'rowNo') {
    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{
          ...cellStyle,
          verticalAlign: 'middle',
          cursor: 'default',
          fontWeight: 600,
          borderLeft: '2px solid #1565c0', // ★ 워크시트 좌측 구분선
        }}
      >
        <span style={{ fontWeight: 600, color: '#000000', fontSize: '10px' }}>{rowIdx + 1}</span>
      </td>
    );
  }

  // ★★★ A, B열 (공정번호, 공정명) - rowSpan 병합 ★★★
  if (col.key === 'processNo' || col.key === 'processName') {
    const spanInfo = processRowSpan[rowIdx];
    if (!spanInfo?.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    // 고유값(언더스코어로 시작하는 값)인 경우 빈 값처럼 표시
    const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
    const isProcessName = col.key === 'processName';
    const cellIsEmpty = !displayValue;
    const cellBgColor = cellIsEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;

    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{
          ...cellStyle,
          verticalAlign: 'middle',
          cursor: inputMode === 'auto' && isProcessName ? 'pointer' : 'text',
          background: cellBgColor,
          padding: '1px',
        }}
        rowSpan={spanInfo.span}
        onContextMenu={handleContextMenu}
        onClick={inputMode === 'auto' && isProcessName ? () => onAutoModeClick(rowIdx, 'process', col.key) : undefined}
      >
        {inputMode === 'manual' ? (
          // ★ 수동 모드: 직접 텍스트 입력
          <input
            type="text"
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            onContextMenu={handleContextMenu}
            placeholder="-"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: '10px',
              textAlign: 'center',
              outline: 'none',
            }}
          />
        ) : (
          // 자동 모드: 클릭하면 모달
          <div className="flex items-center gap-1 justify-center h-full">
            {cellIsEmpty ? (
              <span className="text-gray-400 text-[9px]">-</span>
            ) : (
              <span className="text-[10px] text-center">{displayValue}</span>
            )}
          </div>
        )}
      </td>
    );
  }

  // ★★★ C열 (레벨) - rowSpan 병합 (공정설명과 함께) ★★★
  if (col.key === 'processLevel') {
    const spanInfo = descRowSpan?.[rowIdx];
    if (spanInfo && !spanInfo.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    // 고유값(언더스코어로 시작하는 값)인 경우 빈 값처럼 표시
    const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
    const cellIsEmpty = !displayValue;
    const cellBgColor = cellIsEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;

    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{ ...cellStyle, verticalAlign: 'middle', background: cellBgColor }}
        rowSpan={spanInfo?.span || 1}
        onContextMenu={handleContextMenu}
      >
        <select
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: '100%',
            background: 'transparent',
            textAlign: 'center',
            fontSize: '10px',
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',         // 드롭다운 화살표 숨김
            WebkitAppearance: 'none',   // Safari
            MozAppearance: 'none',      // Firefox
            color: cellIsEmpty ? '#9ca3af' : 'inherit',
          }}
        >
          <option value="" style={{ color: '#9ca3af' }}>미입력</option>
          <option value="Main">Main</option>
          <option value="Sub">Sub</option>
        </select>
      </td>
    );
  }

  // ★★★ D열 (공정설명) - rowSpan 병합 + 수동/자동 모드 ★★★
  if (col.key === 'processDesc') {
    const spanInfo = descRowSpan?.[rowIdx];
    if (spanInfo && !spanInfo.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    // 고유값(언더스코어로 시작하는 값)인 경우 빈 값처럼 표시
    const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
    const cellIsEmpty = !displayValue;
    const cellBgColor = cellIsEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;

    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{
          ...cellStyle,
          cursor: inputMode === 'auto' ? 'pointer' : 'text',
          verticalAlign: 'middle',
          background: cellBgColor,
          padding: '1px',
        }}
        rowSpan={spanInfo?.span || 1}
        onContextMenu={handleContextMenu}
        onClick={inputMode === 'auto' ? () => onAutoModeClick(rowIdx, 'process', col.key) : undefined}
      >
        {inputMode === 'manual' ? (
          <textarea
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            onContextMenu={handleContextMenu}
            placeholder="-"
            rows={1}
            style={{
              width: '100%',
              minHeight: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: '9px',
              textAlign: isDashOnly ? 'center' : 'left',
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
              wordBreak: 'break-word',
              lineHeight: 1.3,
              padding: '1px',
            }}
          />
        ) : (
          <div className="flex items-center gap-1 min-h-[20px] cursor-pointer">
            {cellIsEmpty ? (
              <span className="text-gray-400 text-[9px] w-full text-center">-</span>
            ) : (
              <span className="w-full bg-transparent text-[9px] text-left" style={{ wordBreak: 'break-word', lineHeight: 1.3 }}>
                {displayValue}
              </span>
            )}
          </div>
        )}
      </td>
    );
  }

  // ★★★ E열 (부품명/partName) - rowSpan 병합 + 수동/자동 모드 ★★★
  if (col.key === 'partName') {
    const spanInfo = workRowSpan?.[rowIdx];
    if (spanInfo && !spanInfo.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
    const cellIsEmpty = !displayValue;
    const cellBgColor = cellIsEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;

    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{
          ...cellStyle,
          cursor: inputMode === 'auto' ? 'pointer' : 'text',
          verticalAlign: 'middle',
          background: cellBgColor,
          padding: '1px',
        }}
        rowSpan={spanInfo?.span || 1}
        onContextMenu={handleContextMenu}
        onClick={inputMode === 'auto' ? () => onAutoModeClick(rowIdx, 'work', col.key) : undefined}
      >
        {inputMode === 'manual' ? (
          <input
            type="text"
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            onContextMenu={handleContextMenu}
            placeholder="-"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: '10px',
              textAlign: 'center',
              outline: 'none',
            }}
          />
        ) : (
          <div className="flex items-center gap-1 h-full min-h-[20px] cursor-pointer justify-center">
            {cellIsEmpty ? (
              <span className="text-gray-400 text-[9px]">-</span>
            ) : (
              <span className="w-full bg-transparent text-[10px] text-center">
                {displayValue}
              </span>
            )}
          </div>
        )}
      </td>
    );
  }

  // ★★★ F열 (설비/금형/치그/equipment) - rowSpan 병합 + 수동/자동 모드 ★★★
  if (col.key === 'equipment') {
    const spanInfo = equipmentRowSpan?.[rowIdx];
    if (spanInfo && !spanInfo.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
    const cellIsEmpty = !displayValue;
    const cellBgColor = cellIsEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;

    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{
          ...cellStyle,
          cursor: inputMode === 'auto' ? 'pointer' : 'text',
          verticalAlign: 'middle',
          background: cellBgColor,
          padding: '1px',
        }}
        rowSpan={spanInfo?.span || 1}
        onContextMenu={handleContextMenu}
        onClick={inputMode === 'auto' ? () => onAutoModeClick(rowIdx, 'equipment', col.key) : undefined}
      >
        {inputMode === 'manual' ? (
          <input
            type="text"
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            onContextMenu={handleContextMenu}
            placeholder="-"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: '10px',
              textAlign: 'center',
              outline: 'none',
            }}
          />
        ) : (
          <div className="flex items-center gap-1 h-full min-h-[20px] cursor-pointer justify-center">
            {cellIsEmpty ? (
              <span className="text-gray-400 text-[9px]">-</span>
            ) : (
              <span className="w-full bg-transparent text-[10px] text-center">
                {displayValue}
              </span>
            )}
          </div>
        )}
      </td>
    );
  }

  // NO 열 - ★★★ 공정별 특성 순번 (최적화: 사전 계산 맵 사용) ★★★
  if (col.key === 'charNo') {
    const charIndex = groupIndexMap?.charNo[rowIdx] ?? 1;
    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{ ...cellStyle, fontWeight: 700 }}
        onContextMenu={handleContextMenu}
      >
        <span style={{ fontWeight: 600, color: '#000000', fontSize: '10px' }}>{charIndex}</span>
      </td>
    );
  }

  // SC 선택 (productSC, processSC)
  if (col.key === 'productSC' || col.key === 'processSC') {
    return (
      <td
        key={`${item.id}-${col.key}`}
        style={cellStyle}
        onContextMenu={handleContextMenu}
      >
        <select
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            fontSize: '9px',
            textAlign: 'center',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            cursor: 'pointer',
          }}
        >
          <option value=""></option>
          <option value="CC">CC</option>
          <option value="SC">SC</option>
        </select>
      </td>
    );
  }

  // ★★★ I열 (제품특성/productChar) - rowSpan 병합 + 수동/자동 모드 ★★★
  if (col.key === 'productChar') {
    const spanInfo = charRowSpan?.[rowIdx];
    if (spanInfo && !spanInfo.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
    const cellIsEmpty = !displayValue;
    const cellBgColor = cellIsEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;

    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{
          ...cellStyle,
          cursor: inputMode === 'auto' ? 'pointer' : 'text',
          verticalAlign: 'middle',
          background: cellBgColor,
          padding: '1px',
        }}
        rowSpan={spanInfo?.span || 1}
        onContextMenu={handleContextMenu}
        onClick={inputMode === 'auto' ? () => onAutoModeClick(rowIdx, 'char', col.key) : undefined}
      >
        {inputMode === 'manual' ? (
          <textarea
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            onContextMenu={handleContextMenu}
            placeholder="-"
            rows={1}
            style={{
              width: '100%',
              minHeight: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: '9px',
              textAlign: isDashOnly ? 'center' : 'left',
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
              wordBreak: 'break-word',
              lineHeight: 1.3,
              padding: '1px',
            }}
          />
        ) : (
          <div className="flex items-center gap-1 min-h-[20px] cursor-pointer">
            {cellIsEmpty ? (
              <span className="text-gray-400 text-[9px] w-full text-center">-</span>
            ) : (
              <span className="w-full bg-transparent text-[9px] text-left" style={{ wordBreak: 'break-word', lineHeight: 1.3 }}>
                {displayValue}
              </span>
            )}
          </div>
        )}
      </td>
    );
  }

  // ★★★ 공정흐름 심볼 컬럼 (작업/운반/저장/검사) → 공정별 셀 병합 + SVG 연결선 ★★★
  if (['flowWork', 'flowTransport', 'flowStorage', 'flowInspect'].includes(col.key)) {
    return (
      <FlowSymbolCell
        item={item}
        col={col}
        rowIdx={rowIdx}
        items={items}
        processRowSpan={processRowSpan}
        cellStyle={cellStyle}
        onCellChange={onCellChange}
      />
    );
  }

  // 기본 텍스트 입력 - _로 시작하는 값(uniqueId)은 화면에 표시하지 않음
  const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
  // 긴 텍스트 컬럼(특성 등)은 textarea로 줄바꿈, 짧은 컬럼은 input 유지
  const isLongTextCol = ['processChar', 'processDesc', 'productChar', 'workElement'].includes(col.key);
  return (
    <td
      key={`${item.id}-${col.key}`}
      style={cellStyle}
      onContextMenu={handleContextMenu}
    >
      {isLongTextCol ? (
        <textarea
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onContextMenu={handleContextMenu}
          rows={1}
          style={{
            width: '100%',
            minHeight: '100%',
            border: 'none',
            background: 'transparent',
            fontSize: '9px',
            textAlign: isDashOnly ? 'center' : (col.align as any),
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            wordBreak: 'break-word',
            lineHeight: 1.3,
            padding: '1px',
          }}
        />
      ) : (
        <input
          type="text"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onContextMenu={handleContextMenu}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            fontSize: '11px',
            textAlign: isDashOnly ? 'center' : undefined,
          }}
        />
      )}
    </td>
  );
}

