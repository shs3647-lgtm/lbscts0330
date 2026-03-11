/**
 * @file renderers/index.tsx
 * @description PFD 워크시트 셀 렌더러 (CP 구조 수평전개)
 * @updated 2026-01-31 - 변경 이력 마커 추가
 */

import React from 'react';
import { PfdItem, SpanInfo, ContextMenuType } from '../types';
import { PmColumnDef, CELL_STYLE, HEIGHTS, COLORS } from '../pmConstants';
import { ChangeMarker } from '@/lib/change-history';

interface ColumnWidths {
  [colId: number]: number;
}

interface RenderCellProps {
  item: PfdItem;
  col: PmColumnDef;
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

  // ★ 줄무늬 인덱스 계산
  let groupIndex = 0;
  if (isPartGroup) {
    let prevValue = '';
    for (let i = 0; i <= rowIdx && i < items.length; i++) {
      const val = items[i].partName || '';
      if (val !== prevValue && i > 0) groupIndex++;
      prevValue = val;
    }
  } else if (isEquipGroup) {
    let prevValue = '';
    for (let i = 0; i <= rowIdx && i < items.length; i++) {
      const val = items[i].equipment || '';
      if (val !== prevValue && i > 0) groupIndex++;
      prevValue = val;
    }
  } else {
    let prevValue = '';
    for (let i = 0; i <= rowIdx && i < items.length; i++) {
      const val = `${items[i].processNo}_${items[i].processName}`;
      if (val !== prevValue && i > 0) groupIndex++;
      prevValue = val;
    }
  }
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

  const cellStyle: React.CSSProperties = {
    padding: CELL_STYLE.padding,
    fontSize: '11px',
    lineHeight: CELL_STYLE.lineHeight,
    background: hasChange ? '#fff3cd' : bgColor,  // ★ 변경된 셀은 노란색 배경
    textAlign: col.align as any,
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
              textAlign: 'left',
              outline: 'none',
            }}
          />
        ) : (
          <div className="flex items-center gap-1 h-full min-h-[20px] cursor-pointer">
            {cellIsEmpty ? (
              <span className="text-gray-400 text-[9px]">-</span>
            ) : (
              <span className="w-full bg-transparent text-[10px] text-left">
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

  // NO 열 - ★★★ 공정별 특성 순번 (CP charNo 로직과 동일) ★★★
  // 같은 공정(processNo + processName) 내에서 순번 계산 (공정 바뀌면 1로 리셋)
  if (col.key === 'charNo') {
    const currentProcess = `${item.processNo}-${item.processName}`;
    let charIndex = 1;
    for (let i = 0; i < rowIdx; i++) {
      const prevItem = items[i];
      const prevProcess = `${prevItem.processNo}-${prevItem.processName}`;
      if (prevProcess === currentProcess) {
        charIndex++;
      }
    }
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
              textAlign: 'left',
              outline: 'none',
            }}
          />
        ) : (
          <div className="flex items-center gap-1 h-full min-h-[20px] cursor-pointer">
            {cellIsEmpty ? (
              <span className="text-gray-400 text-[9px]">-</span>
            ) : (
              <span className="w-full bg-transparent text-[10px] text-left">
                {displayValue}
              </span>
            )}
          </div>
        )}
      </td>
    );
  }

  // ★★★ 공정흐름 심볼 컬럼 (작업/운반/저장/검사) ★★★
  if (['flowWork', 'flowTransport', 'flowStorage', 'flowInspect'].includes(col.key)) {
    const isChecked = !!value;

    // 심볼 정의
    const symbols: Record<string, { symbol: string; color: string; label: string }> = {
      flowWork: { symbol: '○', color: '#2563eb', label: '작업' },       // 파란 동그라미
      flowTransport: { symbol: '◁', color: '#7c3aed', label: '운반' },   // 보라 화살표
      flowStorage: { symbol: '△', color: '#059669', label: '저장' },    // 녹색 삼각형
      flowInspect: { symbol: '□', color: '#dc2626', label: '검사' },    // 빨강 사각형
    };
    const symbolInfo = symbols[col.key];

    // 이 행에서 선택된 흐름 심볼 찾기 (화살표 연결용)
    const flowKeys = ['flowWork', 'flowTransport', 'flowStorage', 'flowInspect'];
    const currentFlowIdx = flowKeys.indexOf(col.key);

    // 이전 행에서 선택된 심볼 위치 찾기 (꺾인 화살표 시작점)
    let prevFlowIdx = -1;
    if (rowIdx > 0) {
      const prevItem = items[rowIdx - 1];
      for (let i = 0; i < flowKeys.length; i++) {
        if ((prevItem as any)[flowKeys[i]]) {
          prevFlowIdx = i;
          break;
        }
      }
    }

    // 현재 행에서 선택된 심볼 위치 (화살표 끝점)
    let currentSelectedIdx = -1;
    for (let i = 0; i < flowKeys.length; i++) {
      if ((item as any)[flowKeys[i]]) {
        currentSelectedIdx = i;
        break;
      }
    }

    // 화살표 연결선 렌더링 조건 (단순화)
    const hasPrev = prevFlowIdx !== -1;
    const hasCurrent = currentSelectedIdx !== -1;
    const isSameCol = prevFlowIdx === currentSelectedIdx;
    const minIdx = Math.min(prevFlowIdx, currentSelectedIdx);
    const maxIdx = Math.max(prevFlowIdx, currentSelectedIdx);

    // 이전 행 선택 위치에서 수직선 (아래로)
    const showVerticalFromPrev = hasPrev && currentFlowIdx === prevFlowIdx;
    // 현재 행 선택 위치로 수직선 (위에서)
    const showVerticalToCurrent = hasPrev && hasCurrent && !isSameCol && currentFlowIdx === currentSelectedIdx;
    // 수평선 (이전~현재 사이)
    const showHorizontal = hasPrev && hasCurrent && !isSameCol && currentFlowIdx >= minIdx && currentFlowIdx <= maxIdx;
    // 화살표 머리
    const showArrow = hasPrev && hasCurrent && currentFlowIdx === currentSelectedIdx;

    return (
      <td
        key={`${item.id}-${col.key}`}
        style={{
          ...cellStyle,
          position: 'relative',
          cursor: 'pointer',
          userSelect: 'none',
          minWidth: `${col.width}px`,
          maxWidth: `${col.width}px`,
        }}
        onClick={() => {
          // 동일 행에서는 하나만 선택 가능 (라디오 버튼 동작)
          const newValue = !isChecked;

          // 다른 흐름 심볼 해제
          flowKeys.forEach(fk => {
            if (fk !== col.key) {
              onCellChange(item.id, fk, false);
            }
          });

          // 현재 심볼 토글
          onCellChange(item.id, col.key, newValue);
        }}
        title={`${symbolInfo.label} (클릭하여 선택)`}
      >
        {/* 이전 행 선택 위치에서 아래로 수직선 */}
        {showVerticalFromPrev && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '-1px',
            width: '2px',
            height: isSameCol ? '100%' : '13px',
            background: '#f97316',
            transform: 'translateX(-50%)',
            zIndex: 15,
          }} />
        )}

        {/* 수평선 (이전~현재 사이) */}
        {showHorizontal && (
          <div style={{
            position: 'absolute',
            left: currentFlowIdx === minIdx ? '50%' : '0',
            right: currentFlowIdx === maxIdx ? '50%' : '0',
            top: '12px',
            height: '2px',
            background: '#f97316',
            zIndex: 15,
          }} />
        )}

        {/* 현재 행 선택 위치로 수직선 (꺾이는 경우) */}
        {showVerticalToCurrent && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '12px',
            width: '2px',
            height: 'calc(50% - 2px)',
            background: '#f97316',
            transform: 'translateX(-50%)',
            zIndex: 15,
          }} />
        )}

        {/* 화살표 머리 ▼ */}
        {showArrow && (
          <div style={{
            position: 'absolute',
            left: '50%',
            bottom: '2px',
            width: '0',
            height: '0',
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '6px solid #f97316',
            transform: 'translateX(-50%)',
            zIndex: 20,
          }} />
        )}

        {/* 심볼 표시 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            fontSize: isChecked ? '18px' : '14px',
            fontWeight: isChecked ? 'bold' : 'normal',
            color: isChecked ? symbolInfo.color : '#d1d5db',
            transition: 'all 0.15s ease',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {symbolInfo.symbol}
        </div>
      </td>
    );
  }

  // 기본 텍스트 입력 - _로 시작하는 값(uniqueId)은 화면에 표시하지 않음
  const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
  return (
    <td
      key={`${item.id}-${col.key}`}
      style={cellStyle}
      onContextMenu={handleContextMenu}
    >
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
        }}
      />
    </td>
  );
}

