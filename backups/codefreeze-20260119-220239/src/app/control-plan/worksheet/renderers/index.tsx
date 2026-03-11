/**
 * @file renderers/index.tsx
 * @description CP 워크시트 셀 렌더러
 */

import React from 'react';
import { CPItem, SpanInfo, ContextMenuType } from '../types';
import { CPColumnDef, CELL_STYLE, HEIGHTS, COLORS, SPECIAL_CHAR_OPTIONS, FREQUENCY_OPTIONS, OWNER_OPTIONS, LEVEL_OPTIONS, RESIZE_CONFIG } from '../cpConstants';

// 컬럼 폭 타입
export interface ColumnWidths {
  [colId: number]: number;
}

interface RenderCellProps {
  item: CPItem;
  col: CPColumnDef;
  rowIdx: number;
  items: CPItem[];
  processRowSpan: SpanInfo[];
  descRowSpan: SpanInfo[];
  workRowSpan: SpanInfo[];
  charRowSpan: SpanInfo[];
  onCellChange: (itemId: string, key: string, value: any) => void;
  onContextMenu: (e: React.MouseEvent, rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  onAutoModeClick: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  onEnterKey?: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  // ★ 2026-01-18: 컬럼 리사이즈 지원
  columnWidths?: ColumnWidths;
  // ★ 2026-01-18: EP/자동검사 체크박스 클릭 시 모달 열기
  onEPDeviceClick?: (rowIdx: number, category: 'EP' | '자동검사') => void;
}

export function renderCell({
  item,
  col,
  rowIdx,
  items,
  processRowSpan,
  descRowSpan,
  workRowSpan,
  charRowSpan,
  onCellChange,
  onContextMenu,
  onAutoModeClick,
  onEnterKey,
  columnWidths,
  onEPDeviceClick,
}: RenderCellProps): React.ReactNode {
  const value = (item as any)[col.key];
  // 줄무늬 패턴: 짝수 행은 cellColor, 홀수 행은 cellAltColor
  const bgColor = rowIdx % 2 === 0 ? col.cellColor : col.cellAltColor;

  // ★ 2026-01-18: 동적 컬럼 폭 및 폰트 크기 계산
  const currentWidth = columnWidths?.[col.id] ?? col.width;
  const widthRatio = currentWidth / col.width;

  // 폰트 크기: 80%~100% 범위에서 선형 축소 (최소 8px ~ 기본 11px)
  let fontSize = RESIZE_CONFIG.defaultFontSize;
  if (widthRatio < RESIZE_CONFIG.textScaleThreshold) {
    const scale = (widthRatio - RESIZE_CONFIG.minRatio) / (RESIZE_CONFIG.textScaleThreshold - RESIZE_CONFIG.minRatio);
    fontSize = RESIZE_CONFIG.minFontSize + (RESIZE_CONFIG.defaultFontSize - RESIZE_CONFIG.minFontSize) * Math.max(0, scale);
    fontSize = Math.max(RESIZE_CONFIG.minFontSize, Math.round(fontSize));
  }

  const cellStyle: React.CSSProperties = {
    padding: CELL_STYLE.padding,
    fontSize: `${fontSize}px`,
    lineHeight: CELL_STYLE.lineHeight,
    background: bgColor,
    textAlign: col.align,
    border: '1px solid #ccc',
    borderBottom: '1px solid #ccc',
    height: HEIGHTS.body,
    width: currentWidth,
    minWidth: currentWidth,
    maxWidth: currentWidth,
    verticalAlign: 'middle',
    // ★ 폭 축소 시 자동 줄바꿈
    whiteSpace: widthRatio < 1 ? 'normal' : 'nowrap',
    wordBreak: widthRatio < 1 ? 'break-word' : 'normal',
    overflow: 'hidden',
  };
  
  // 엔터 키 핸들러 (통합 모드: 항상 행 추가)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnterKey) {
      e.preventDefault();
      // 컬럼 타입에 따라 ContextMenuType 결정
      let type: ContextMenuType = 'general';
      if (col.key === 'processNo' || col.key === 'processName' || col.key === 'processDesc') {
        type = 'process';
      } else if (col.key === 'workElement') {
        type = 'work';
      } else if (col.key === 'productChar' || col.key === 'processChar') {
        type = 'char';
      } else {
        type = 'general';
      }
      onEnterKey(rowIdx, type, col.key);
    }
  };

  // NO 열 - 순차 번호 (1부터 시작)
  if (col.key === 'rowNo') {
    return (
      <td 
        key={col.id} 
        style={{ 
          ...cellStyle, 
          verticalAlign: 'middle',
          cursor: 'default',
        }}
      >
        <span className="font-semibold text-gray-800 text-[11px]">{rowIdx + 1}</span>
      </td>
    );
  }
  
  // 공정번호, 공정명 - rowSpan 병합 + 컨텍스트 메뉴 (아래로 행 추가)
  if (col.key === 'processNo' || col.key === 'processName') {
    const spanInfo = processRowSpan[rowIdx];
    if (!spanInfo?.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    // 고유값(언더스코어로 시작하는 값)인 경우 빈 값처럼 표시
    const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
    const isProcessName = col.key === 'processName';
    return (
      <td 
        key={col.id} 
        style={{ 
          ...cellStyle, 
          verticalAlign: 'middle',
          cursor: isProcessName ? 'pointer' : 'context-menu',
          background: isProcessName ? '#e3f2fd' : cellStyle.background,
          padding: '1px',
        }}
        rowSpan={spanInfo.span}
        onContextMenu={(e) => onContextMenu(e, rowIdx, 'process', col.key)}
        onClick={isProcessName ? () => onAutoModeClick(rowIdx, 'process', col.key) : undefined}
      >
        <div className="flex items-center gap-1 justify-center h-full">
          {isProcessName && <span className="text-blue-500 text-[8px]">➕</span>}
          <input
            type="text"
            value={displayValue}
            onChange={(e) => onCellChange(item.id, col.key, e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent outline-none text-center text-[11px] p-0 h-full"
            onClick={(e) => isProcessName && e.stopPropagation()}
          />
        </div>
      </td>
    );
  }
  
  // NO (공정별 특성 순번) - 같은 공정 내에서 1, 2, 3...
  if (col.key === 'charNo') {
    // 같은 공정(processNo + processName) 내에서 순번 계산
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
      <td key={col.id} style={cellStyle}>
        <span className="font-bold text-gray-700 text-[11px]">{charIndex}</span>
      </td>
    );
  }
  
  // 레벨 선택 - rowSpan 병합 (공정설명과 함께)
  if (col.key === 'processLevel') {
    const spanInfo = descRowSpan[rowIdx];
    if (!spanInfo?.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    // 고유값(언더스코어로 시작하는 값)인 경우 빈 값처럼 표시
    const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
    return (
      <td
        key={col.id}
        style={{ ...cellStyle, verticalAlign: 'middle' }}
        rowSpan={spanInfo.span}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <select
          value={displayValue}
          onChange={(e) => {
            e.stopPropagation();
            onCellChange(item.id, col.key, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-center text-[11px] outline-none cursor-pointer"
        >
          <option value="">-</option>
          {LEVEL_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </td>
    );
  }
  
  // Boolean 타입 (체크박스) - EP/자동검사 체크박스는 클릭 시 모달 열기
  if (col.type === 'boolean') {
    // EP 또는 자동검사 체크박스인 경우
    const isEPColumn = col.key === 'detectorEp';
    const isAutoColumn = col.key === 'detectorAuto';

    if ((isEPColumn || isAutoColumn) && onEPDeviceClick) {
      return (
        <td
          key={col.id}
          style={{ ...cellStyle, cursor: 'pointer' }}
          onClick={() => onEPDeviceClick(rowIdx, isEPColumn ? 'EP' : '자동검사')}
        >
          <div className="flex items-center justify-center gap-1">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => {
                e.stopPropagation();
                // 체크 해제 시에는 직접 변경, 체크 시에는 모달 열기
                if (!e.target.checked) {
                  onCellChange(item.id, col.key, false);
                } else {
                  onEPDeviceClick(rowIdx, isEPColumn ? 'EP' : '자동검사');
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-3 h-3"
            />
            {value && (
              <span className="text-[9px] text-blue-600">▼</span>
            )}
          </div>
        </td>
      );
    }

    // 일반 체크박스
    return (
      <td key={col.id} style={cellStyle}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onCellChange(item.id, col.key, e.target.checked)}
          className="w-3 h-3"
        />
      </td>
    );
  }
  
  // 특별특성 선택
  if (col.key === 'specialChar') {
    const color = COLORS.special[value as keyof typeof COLORS.special] || '#666';
    return (
      <td
        key={col.id}
        style={cellStyle}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <select
          value={value || ''}
          onChange={(e) => {
            e.stopPropagation();
            onCellChange(item.id, col.key, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-center text-[11px] font-bold outline-none cursor-pointer"
          style={{ color }}
        >
          {SPECIAL_CHAR_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </td>
    );
  }
  
  // 주기 선택
  if (col.key === 'sampleFreq') {
    return (
      <td
        key={col.id}
        style={cellStyle}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <select
          value={value || ''}
          onChange={(e) => {
            e.stopPropagation();
            onCellChange(item.id, col.key, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-center text-[11px] outline-none cursor-pointer"
        >
          <option value="">-</option>
          {FREQUENCY_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </td>
    );
  }
  
  // 책임1/책임2 선택
  if (col.key === 'owner1' || col.key === 'owner2') {
    return (
      <td
        key={col.id}
        style={cellStyle}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <select
          value={value || ''}
          onChange={(e) => {
            e.stopPropagation();
            onCellChange(item.id, col.key, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-center text-[11px] outline-none cursor-pointer"
        >
          <option value="">-</option>
          {OWNER_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </td>
    );
  }
  
  // 공정설명 - rowSpan 병합 + 클릭 시 모달 (통합 모드)
  if (col.key === 'processDesc') {
    const spanInfo = descRowSpan[rowIdx];
    if (!spanInfo?.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    // 고유값(언더스코어로 시작하는 값)인 경우 빈 값처럼 표시
    const displayValue = (value && typeof value === 'string' && value.startsWith('_')) ? '' : (value || '');
    return (
      <td 
        key={col.id} 
        style={{ 
          ...cellStyle, 
          cursor: 'pointer', 
          verticalAlign: 'middle',
          background: '#e3f2fd',
          padding: '1px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
        rowSpan={spanInfo.span}
        onContextMenu={(e) => onContextMenu(e, rowIdx, 'process', col.key)}
        onClick={() => onAutoModeClick(rowIdx, 'process', col.key)}
      >
        <div className="flex items-center gap-1 h-full min-h-[20px]">
          <span className="text-blue-500 text-[8px] mt-1">➕</span>
          <div 
            className="w-full bg-transparent outline-none text-[11px] text-left min-h-[18px] flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {displayValue}
          </div>
        </div>
      </td>
    );
  }
  
  // 설비/금형/JIG - rowSpan 병합 + 클릭 시 모달 (통합 모드)
  if (col.key === 'workElement') {
    const spanInfo = workRowSpan[rowIdx];
    if (!spanInfo?.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    // ★ 2026-01-18: 공정번호 제거하고 설비명만 표시
    // 패턴: "[MC] 10자동창고" → "자동창고", "MC 10 자동창고" → "자동창고"
    const rawValue = value || '';
    const displayValue = rawValue
      .replace(/^\[?[A-Z]{1,3}\]?\s*\d+\s*/i, '')  // [MC] 10 또는 MC 10 제거
      .trim();
    return (
      <td
        key={col.id}
        style={{
          ...cellStyle,
          cursor: 'pointer',
          verticalAlign: 'middle',
          background: '#e8f5e9',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        rowSpan={spanInfo.span}
        onContextMenu={(e) => onContextMenu(e, rowIdx, 'work', col.key)}
        onClick={() => onAutoModeClick(rowIdx, 'work')}
      >
        <div className="flex items-center gap-1 justify-center">
          <span className="text-green-500 text-[8px]">➕</span>
          <span
            className="w-full bg-transparent text-center text-[10px] leading-tight"
            style={{ wordBreak: 'break-word' }}
          >
            {displayValue}
          </span>
        </div>
      </td>
    );
  }
  
  // 제품특성 - rowSpan 병합 + 클릭 시 모달 (통합 모드)
  if (col.key === 'productChar') {
    const spanInfo = charRowSpan[rowIdx];
    if (!spanInfo?.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    return (
      <td 
        key={col.id}
        data-column={col.key}
        style={{ 
          ...cellStyle, 
          verticalAlign: 'middle',
          cursor: 'pointer',
          background: '#fff3e0',
          padding: '1px',
        }}
        rowSpan={spanInfo.span}
        onContextMenu={(e) => onContextMenu(e, rowIdx, 'char', col.key)}
        onClick={() => onAutoModeClick(rowIdx, 'char', col.key)}
      >
        <div className="flex items-center gap-1 justify-center h-full">
          <span className="text-orange-500 text-[8px]">➕</span>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onCellChange(item.id, col.key, e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent outline-none text-center text-[11px] p-0 h-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </td>
    );
  }
  
  // 기본 텍스트 입력 (통합 모드: 클릭 시 모달, 우클릭 시 컨텍스트 메뉴)
  const isTextInputColumn = !['processLevel', 'specialChar', 'sampleFreq', 'owner1', 'owner2', 'detectorEp', 'detectorAuto', 'charNo', 'rowNo'].includes(col.key);
  
  return (
    <td 
      key={col.id}
      data-column={col.key}
      style={{ 
        ...cellStyle, 
        cursor: isTextInputColumn ? 'pointer' : 'context-menu',
        padding: '1px',
        verticalAlign: 'middle',
        background: isTextInputColumn ? '#fff8e1' : bgColor,
      }}
      onContextMenu={(e) => onContextMenu(e, rowIdx, 'general', col.key)}
      onClick={isTextInputColumn ? () => onAutoModeClick(rowIdx, 'general', col.key) : undefined}
    >
      <div className="flex items-center gap-1 justify-center h-full">
        {isTextInputColumn && <span className="text-amber-500 text-[8px]">➕</span>}
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onCellChange(item.id, col.key, e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none text-center text-[11px] p-0 h-full"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </td>
  );
}



