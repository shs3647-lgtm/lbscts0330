/**
 * @file renderers/index.tsx
 * @description CP 워크시트 셀 렌더러
 */

import React from 'react';
import { CPItem, SpanInfo, ContextMenuType } from '../types';
import { CPColumnDef, CELL_STYLE, HEIGHTS, COLORS, SPECIAL_CHAR_OPTIONS, FREQUENCY_OPTIONS, OWNER_OPTIONS, LEVEL_OPTIONS, RESIZE_CONFIG } from '../cpConstants';
import SelectableCell from '@/components/worksheet/SelectableCell';

// 컬럼 폭 타입
export interface ColumnWidths {
  [colId: number]: number;
}

// ★★★ 성능 최적화: groupIndex 사전 계산 캐시 ★★★
// 매 셀마다 O(rowIdx) 루프 → 전체 O(N) 1회 사전 계산으로 개선
let _cachedItems: CPItem[] | null = null;
let _partGroupIndices: number[] = [];
let _equipGroupIndices: number[] = [];
let _processGroupIndices: number[] = [];
let _charNoIndices: number[] = [];

function computeGroupIndices(items: CPItem[]): void {
  if (items === _cachedItems) return;
  _cachedItems = items;

  _partGroupIndices = [];
  _equipGroupIndices = [];
  _processGroupIndices = [];
  _charNoIndices = [];

  let partIdx = 0, equipIdx = 0, processIdx = 0;
  let prevPart = '', prevEquip = '', prevProcess = '';
  const processCharCount: Record<string, number> = {};

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const partName = item.partName || '';
    const workElement = item.workElement || '';
    const processKey = `${item.processNo}_${item.processName}`;
    const charProcessKey = `${item.processNo}-${item.processName}`;

    if (i > 0) {
      if (partName !== prevPart) partIdx++;
      if (workElement !== prevEquip) equipIdx++;
      if (processKey !== prevProcess) processIdx++;
    }

    _partGroupIndices.push(partIdx);
    _equipGroupIndices.push(equipIdx);
    _processGroupIndices.push(processIdx);

    // charNo: 같은 공정 내 순번
    processCharCount[charProcessKey] = (processCharCount[charProcessKey] || 0) + 1;
    _charNoIndices.push(processCharCount[charProcessKey]);

    prevPart = partName;
    prevEquip = workElement;
    prevProcess = processKey;
  }
}

interface RenderCellProps {
  item: CPItem;
  col: CPColumnDef;
  rowIdx: number;
  items: CPItem[];
  processRowSpan: SpanInfo[];
  descRowSpan: SpanInfo[];
  partNameRowSpan: SpanInfo[];  // ★ 부품명 병합
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
  // ★ 2026-01-25: 더블클릭 인라인 편집
  onDoubleClickEdit?: (itemId: string, key: string, newValue: string) => void;
}

export function renderCell({
  item,
  col,
  rowIdx,
  items,
  processRowSpan,
  descRowSpan,
  partNameRowSpan,  // ★ 부품명 병합
  workRowSpan,
  charRowSpan,
  onCellChange,
  onContextMenu,
  onAutoModeClick,
  onEnterKey,
  columnWidths,
  onEPDeviceClick,
  onDoubleClickEdit,
}: RenderCellProps): React.ReactNode {
  const value = (item as any)[col.key];

  // 빈 셀 여부 확인 (null, undefined, 빈 문자열, false)
  const isEmpty = value === null || value === undefined || value === '' || value === false;

  // ★★★ 행 데이터 기준 부모-자식 그룹 색상 ★★★
  // - 제품특성 값이 있으면 → 특별특성~조치방법 파란색 (부품명 그룹)
  // - 공정특성 값이 있으면 → 특별특성~조치방법 녹색 (설비 그룹)
  // - 부품명이 빈 행은 다음 설비명까지 부품명 그룹으로 처리
  // - EP, 자동검사장치, NO는 미적용 (기존 색상)

  // 해당 행의 제품특성/공정특성 값 확인
  const hasProductChar = !!(item.productChar && item.productChar.trim());
  const hasProcessChar = !!(item.processChar && item.processChar.trim());

  // 부모 컬럼
  const isPartGroupParent = col.key === 'partName';
  const isEquipGroupParent = col.key === 'workElement';

  // 공유 컬럼 (특별특성 ~ 조치방법) - 제품특성/공정특성 유무에 따라 그룹 결정
  const isSharedColumn = ['specialChar', 'specTolerance', 'evalMethod', 'sampleSize', 'sampleFreq', 'controlMethod', 'owner1', 'owner2', 'reactionPlan'].includes(col.key);

  // 제품특성/공정특성 컬럼
  const isProductCharColumn = col.key === 'productChar';
  const isProcessCharColumn = col.key === 'processChar';

  // ★ 그룹 결정 (행 데이터 기준)
  let isPartGroup = false;
  let isEquipGroup = false;

  if (isPartGroupParent || isProductCharColumn) {
    // 부품명, 제품특성 → 항상 부품명 그룹 (파란색)
    isPartGroup = true;
  } else if (isEquipGroupParent || isProcessCharColumn) {
    // 설비, 공정특성 → 항상 설비 그룹 (녹색)
    isEquipGroup = true;
  } else if (isSharedColumn) {
    // 공유 컬럼 (특별특성 ~ 조치방법) → 행 데이터 기준
    if (hasProductChar && !hasProcessChar) {
      isPartGroup = true;  // 제품특성만 있으면 파란색
    } else if (hasProcessChar && !hasProductChar) {
      isEquipGroup = true;  // 공정특성만 있으면 녹색
    } else if (hasProductChar && hasProcessChar) {
      isPartGroup = true;  // 둘 다 있으면 파란색 우선
    } else {
      // 둘 다 없으면: 부품명이 있으면 파란색, 설비가 있으면 녹색
      const hasPartName = !!(item.partName && item.partName.trim());
      const hasWorkElement = !!(item.workElement && item.workElement.trim());
      if (hasPartName) {
        isPartGroup = true;
      } else if (hasWorkElement) {
        isEquipGroup = true;
      }
    }
  }

  // ★ 줄무늬 인덱스 계산 (사전 계산된 캐시 사용 - O(1))
  computeGroupIndices(items);
  let groupIndex = 0;
  if (isPartGroup) {
    groupIndex = _partGroupIndices[rowIdx] || 0;
  } else if (isEquipGroup) {
    groupIndex = _equipGroupIndices[rowIdx] || 0;
  } else {
    groupIndex = _processGroupIndices[rowIdx] || 0;
  }
  const isEvenGroup = groupIndex % 2 === 0;

  // ★ 배경색 결정
  let bgColor = col.cellColor;  // 기본값
  if (isEmpty) {
    bgColor = '#ffffff';  // 빈 셀은 흰색
  } else if (isPartGroup) {
    // 부품명 그룹: 파란색 계열
    if (isPartGroupParent) {
      bgColor = isEvenGroup ? COLORS.partGroup.parent : COLORS.partGroup.parentAlt;
    } else {
      bgColor = isEvenGroup ? COLORS.partGroup.child : COLORS.partGroup.childAlt;
    }
  } else if (isEquipGroup) {
    // 설비 그룹: 녹색 계열
    if (isEquipGroupParent) {
      bgColor = isEvenGroup ? COLORS.equipGroup.parent : COLORS.equipGroup.parentAlt;
    } else {
      bgColor = isEvenGroup ? COLORS.equipGroup.child : COLORS.equipGroup.childAlt;
    }
  } else {
    // 기타 컬럼: 기존 공정 기준 색상
    bgColor = isEvenGroup ? col.cellColor : col.cellAltColor;
  }

  // ★ 2026-01-24: 동적 컬럼 폭 및 폰트 크기 계산 (80~120% 최적화)
  const currentWidth = columnWidths?.[col.id] ?? col.width;
  const widthRatio = currentWidth / col.width;

  // 폰트 크기: 80%~120% 범위에서 선형 조정 (8px ~ 10px)
  // 80% → 8px, 100% → 9px, 120% → 10px
  let fontSize = RESIZE_CONFIG.defaultFontSize;
  if (widthRatio <= RESIZE_CONFIG.maxRatio) {
    const scale = (widthRatio - RESIZE_CONFIG.minRatio) / (RESIZE_CONFIG.maxRatio - RESIZE_CONFIG.minRatio);
    fontSize = RESIZE_CONFIG.minFontSize + (RESIZE_CONFIG.defaultFontSize - RESIZE_CONFIG.minFontSize) * Math.max(0, Math.min(1, scale));
    fontSize = Math.max(RESIZE_CONFIG.minFontSize, Math.round(fontSize));
  }

  const cellStyle: React.CSSProperties = {
    padding: CELL_STYLE.padding,
    fontSize: `${fontSize}px`,
    lineHeight: 1.15,  // 줄바꿈 가독성
    background: bgColor,
    textAlign: col.align,
    border: '1px solid #ccc',
    borderBottom: '1px solid #ccc',
    height: 'auto',
    minHeight: HEIGHTS.body,
    width: currentWidth,
    minWidth: currentWidth,
    maxWidth: currentWidth,
    verticalAlign: 'middle',
    whiteSpace: 'normal',
    wordBreak: 'break-all',
    overflowWrap: 'break-word',
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
      } else if (col.key === 'partName') {
        type = 'part';
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
          borderLeft: '2px solid #1565c0', // ★ 워크시트 좌측 구분선
        }}
      >
        <span style={{ fontWeight: 600, color: '#000000', fontSize: '10px' }}>{rowIdx + 1}</span>
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
    const isEmpty = !displayValue;
    // 미입력 → 흰색/회색, 입력됨 → 컬럼 색상
    const cellBgColor = isEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;
    return (
      <td
        key={col.id}
        style={{
          ...cellStyle,
          verticalAlign: 'middle',
          cursor: isProcessName ? 'pointer' : 'context-menu',
          background: cellBgColor,
          padding: '1px',
        }}
        rowSpan={spanInfo.span}
        onContextMenu={(e) => onContextMenu(e, rowIdx, 'process', col.key)}
        onClick={isProcessName ? () => onAutoModeClick(rowIdx, 'process', col.key) : undefined}
      >
        <div
          className="flex items-center gap-1 justify-center h-full cursor-pointer"
          onClick={isProcessName ? () => onAutoModeClick(rowIdx, 'process', col.key) : undefined}
        >
          {isEmpty ? (
            <span className="text-gray-400 text-[9px]">미입력</span>
          ) : (
            <span className="text-[10px] text-center">{displayValue}</span>
          )}
        </div>
      </td>
    );
  }

  // NO (공정별 특성 순번) - 같은 공정 내에서 1, 2, 3...
  if (col.key === 'charNo') {
    computeGroupIndices(items);
    const charIndex = _charNoIndices[rowIdx] || 1;
    return (
      <td key={col.id} style={cellStyle}>
        <span className="font-bold text-gray-700 text-[10px]">{charIndex}</span>
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
    const isEmpty = !displayValue;
    // 미입력 → 흰색/회색, 입력됨 → 컬럼 색상
    const cellBgColor = isEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;
    return (
      <td
        key={col.id}
        style={{ ...cellStyle, verticalAlign: 'middle', background: cellBgColor }}
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
          className={`w-full bg-transparent text-center text-[10px] outline-none cursor-pointer ${isEmpty ? 'text-gray-400' : ''}`}
        >
          <option value="" className="text-gray-400">미입력</option>
          {LEVEL_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </td>
    );
  }

  // Boolean 타입 (체크박스) - EP/자동검사는 클릭 시 모달 열기
  if (col.type === 'boolean') {
    // EP 또는 자동검사 컬럼인 경우 - 텍스트로 표시 (EP / Auto)
    const isEPColumn = col.key === 'detectorEp';
    const isAutoColumn = col.key === 'detectorAuto';

    if ((isEPColumn || isAutoColumn) && onEPDeviceClick) {
      const displayText = value ? (isEPColumn ? 'EP' : 'Auto') : '';
      return (
        <td
          key={col.id}
          style={{
            ...cellStyle,
            cursor: 'pointer',
            background: value ? '#e3f2fd' : bgColor,
          }}
          onClick={() => onEPDeviceClick(rowIdx, isEPColumn ? 'EP' : '자동검사')}
          title={isEPColumn ? 'EP 검사장치 선택' : '자동검사장치 선택'}
        >
          <div className="flex items-center justify-center">
            {value ? (
              <span className="text-[10px] font-bold text-blue-700">{displayText}</span>
            ) : (
              <span className="text-[9px] text-gray-300">-</span>
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
    const isEmpty = !value;
    const color = isEmpty ? '#999' : (COLORS.special[value as keyof typeof COLORS.special] || '#666');
    // 미입력 → 흰색/회색, 입력됨 → 컬럼 색상
    const cellBgColor = isEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;
    return (
      <td
        key={col.id}
        style={{ ...cellStyle, background: cellBgColor }}
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
          className="w-full bg-transparent text-center text-[10px] font-bold outline-none cursor-pointer"
          style={{ color }}
        >
          <option value="" className="text-gray-400">-</option>
          {SPECIAL_CHAR_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </td>
    );
  }

  // 주기 선택
  if (col.key === 'sampleFreq') {
    // 현재 값이 옵션에 없으면 옵션에 추가
    const currentValue = value || '';
    const hasValue = currentValue && !FREQUENCY_OPTIONS.includes(currentValue);
    const isEmpty = !currentValue;
    // 미입력 → 흰색/회색, 입력됨 → 컬럼 색상
    const cellBgColor = isEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;
    return (
      <td
        key={col.id}
        style={{ ...cellStyle, background: cellBgColor }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <select
          value={currentValue}
          onChange={(e) => {
            e.stopPropagation();
            onCellChange(item.id, col.key, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className={`w-full bg-transparent text-center text-[10px] outline-none cursor-pointer ${isEmpty ? 'text-gray-400' : ''}`}
        >
          <option value="" className="text-gray-400">미입력</option>
          {hasValue && <option key={currentValue} value={currentValue}>{currentValue}</option>}
          {FREQUENCY_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </td>
    );
  }

  // 책임1/책임2 선택
  if (col.key === 'owner1' || col.key === 'owner2') {
    // 현재 값이 옵션에 없으면 옵션에 추가
    const currentValue = value || '';
    const hasValue = currentValue && !OWNER_OPTIONS.includes(currentValue);
    const isEmpty = !currentValue;
    // 미입력 → 흰색/회색, 입력됨 → 컬럼 색상
    const cellBgColor = isEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;
    return (
      <td
        key={col.id}
        style={{ ...cellStyle, background: cellBgColor }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <select
          value={currentValue}
          onChange={(e) => {
            e.stopPropagation();
            onCellChange(item.id, col.key, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className={`w-full bg-transparent text-center text-[10px] outline-none cursor-pointer ${isEmpty ? 'text-gray-400' : ''}`}
        >
          <option value="" className="text-gray-400">미입력</option>
          {hasValue && <option key={currentValue} value={currentValue}>{currentValue}</option>}
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
    const isEmpty = !displayValue;
    // 미입력 → 흰색/회색, 입력됨 → 컬럼 색상
    const cellBgColor = isEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;
    return (
      <td
        key={col.id}
        style={{
          ...cellStyle,
          cursor: 'pointer',
          verticalAlign: 'middle',
          background: cellBgColor,
          padding: '1px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
        rowSpan={spanInfo.span}
        onContextMenu={(e) => onContextMenu(e, rowIdx, 'process', col.key)}
        onClick={() => onAutoModeClick(rowIdx, 'process', col.key)}
      >
        <div className="flex items-center gap-1 h-full min-h-[20px] cursor-pointer">
          {isEmpty ? (
            <span className="text-gray-400 text-[9px]">미입력</span>
          ) : (
            <span className="w-full bg-transparent text-[10px] text-left">
              {displayValue}
            </span>
          )}
        </div>
      </td>
    );
  }

  // ★★★ 부품명 - rowSpan 병합 + 클릭 시 모달 (통합 모드) ★★★
  if (col.key === 'partName') {
    const spanInfo = partNameRowSpan[rowIdx];
    if (!spanInfo?.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    const displayValue = value || '';
    const isEmpty = !displayValue.trim();
    // 미입력 → 흰색/회색, 입력됨 → 컬럼 색상
    const cellBgColor = isEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;
    return (
      <td
        key={col.id}
        style={{
          ...cellStyle,
          cursor: 'pointer',
          verticalAlign: 'middle',
          background: cellBgColor,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        rowSpan={spanInfo.span}
        onContextMenu={(e) => onContextMenu(e, rowIdx, 'part', col.key)}
        onClick={() => onAutoModeClick(rowIdx, 'part', 'partName')}
      >
        <div className="flex items-center gap-1 justify-center">
          {isEmpty ? (
            <span className="text-gray-400 text-[9px]">-</span>
          ) : (
            <span
              className="w-full bg-transparent text-center text-[10px] leading-tight"
              style={{ wordBreak: 'break-word' }}
            >
              {displayValue}
            </span>
          )}
        </div>
      </td>
    );
  }

  // 설비/금형/JIG - rowSpan 병합 + 클릭 시 모달 (통합 모드)
  if (col.key === 'equipment') {
    const spanInfo = workRowSpan[rowIdx];
    if (!spanInfo?.isFirst) {
      return null; // 병합된 행은 렌더링 안함
    }
    // ★ 설비명만 표시 (4M 프리픽스 소스에서 제거됨, 기존 데이터 방어용 strip 유지)
    const rawValue = value || '';
    const displayValue = rawValue
      .replace(/^\[?[A-Z]{1,3}\]?\s*/i, '')  // 기존 데이터 방어: [MC] 프리픽스 제거
      .replace(/^\d*번[-\s]?/, '')  // "XX번-" 접두사 방어 제거
      .trim();
    const isEmpty = !displayValue;
    // 미입력 → 흰색/회색, 입력됨 → 컬럼 색상
    const cellBgColor = isEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;
    return (
      <td
        key={col.id}
        style={{
          ...cellStyle,
          cursor: 'pointer',
          verticalAlign: 'middle',
          background: cellBgColor,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        rowSpan={spanInfo.span}
        onContextMenu={(e) => onContextMenu(e, rowIdx, 'work', col.key)}
        onClick={() => onAutoModeClick(rowIdx, 'work', 'equipment')}
      >
        <div className="flex items-center gap-1 justify-center">
          {isEmpty ? (
            <span className="text-gray-400 text-[9px]">-</span>
          ) : (
            <span
              className="w-full bg-transparent text-center text-[10px] leading-tight"
              style={{ wordBreak: 'break-word' }}
            >
              {displayValue}
            </span>
          )}
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
    const productValue = value || '';
    const processValue = (item as any).processChar || '';
    const isEmpty = !productValue.trim();
    const hasProcessChar = !!processValue.trim();

    // 제품특성 없음 + 공정특성 있음 → '-' 표시
    // 둘 다 없음 → '미입력' 표시
    const displayDash = isEmpty && hasProcessChar;
    const displayEmpty = isEmpty && !hasProcessChar;

    // 미입력/- → 흰색/회색, 입력됨 → 컬럼 색상
    const cellBgColor = isEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;
    return (
      <td
        key={col.id}
        data-column={col.key}
        style={{
          ...cellStyle,
          verticalAlign: 'middle',
          cursor: 'pointer',
          background: cellBgColor,
          padding: '1px',
        }}
        rowSpan={spanInfo.span}
        onContextMenu={(e) => onContextMenu(e, rowIdx, 'char', col.key)}
        onClick={() => onAutoModeClick(rowIdx, 'char', col.key)}
      >
        <div className="flex items-center gap-1 justify-center h-full">
          {displayDash ? (
            <span className="text-gray-400 text-[9px]">-</span>
          ) : displayEmpty ? (
            <span className="text-gray-400 text-[9px]">미입력</span>
          ) : (
            <span
              className="w-full bg-transparent text-center text-[10px] leading-tight"
              style={{ wordBreak: 'break-word' }}
            >
              {value || ''}
            </span>
          )}
        </div>
      </td>
    );
  }

  // 공정특성 - 클릭 시 모달 (제품특성 있으면 '-', 둘 다 없으면 '미입력')
  if (col.key === 'processChar') {
    const processValue = value || '';
    const productValue = (item as any).productChar || '';
    const isEmpty = !processValue.trim();
    const hasProductChar = !!productValue.trim();

    // 공정특성 없음 + 제품특성 있음 → '-' 표시
    // 둘 다 없음 → '미입력' 표시
    const displayDash = isEmpty && hasProductChar;
    const displayEmpty = isEmpty && !hasProductChar;

    // 미입력/- → 흰색/회색, 입력됨 → 컬럼 색상
    const cellBgColor = isEmpty
      ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')
      : bgColor;
    return (
      <td
        key={col.id}
        data-column={col.key}
        style={{
          ...cellStyle,
          verticalAlign: 'middle',
          cursor: 'pointer',
          background: cellBgColor,
          padding: '1px',
        }}
        onContextMenu={(e) => onContextMenu(e, rowIdx, 'char', col.key)}
        onClick={() => onAutoModeClick(rowIdx, 'char', col.key)}
      >
        <div className="flex items-center gap-1 justify-center h-full">
          {displayDash ? (
            <span className="text-gray-400 text-[9px]">-</span>
          ) : displayEmpty ? (
            <span className="text-gray-400 text-[9px]">미입력</span>
          ) : (
            <span
              className="w-full bg-transparent text-center text-[10px] leading-tight"
              style={{ wordBreak: 'break-word' }}
            >
              {value || ''}
            </span>
          )}
        </div>
      </td>
    );
  }

  // 기본 텍스트 입력 (통합 모드: 클릭 시 모달, 우클릭 시 컨텍스트 메뉴)
  const isTextInputColumn = col.editable !== false && !['processLevel', 'specialChar', 'sampleFreq', 'owner1', 'owner2', 'detectorEp', 'detectorAuto', 'charNo', 'rowNo'].includes(col.key);
  const isEmptyCell = !value || (typeof value === 'string' && value.trim() === '');

  // ★ 컬럼별 컨텍스트 메뉴 타입 결정
  const getContextType = (): ContextMenuType => {
    if (col.key === 'partName') return 'part';
    return 'general';
  };
  const contextType = getContextType();

  // 미입력 → 흰색/회색, 입력됨 → 컬럼 색상
  const cellBgColor = isEmptyCell
    ? (rowIdx % 2 === 0 ? '#ffffff' : '#fafafa')  // 미입력: 흰색/회색
    : bgColor;  // 입력됨: 컬럼 색상

  return (
    <td
      key={col.id}
      data-column={col.key}
      style={{
        ...cellStyle,
        cursor: isTextInputColumn ? 'pointer' : 'context-menu',
        padding: '1px',
        verticalAlign: 'middle',
        background: cellBgColor,
      }}
      onContextMenu={(e) => onContextMenu(e, rowIdx, contextType, col.key)}
      onClick={isTextInputColumn ? () => onAutoModeClick(rowIdx, contextType, col.key) : undefined}
    >
      <div className="flex items-center gap-1 justify-center h-full">
        {isEmpty && isTextInputColumn ? (
          // ★ 부품명(partName), 설비(workElement)는 선택사항 → "-" 표시
          <span className="text-gray-400 text-[9px]">
            {col.key === 'partName' || col.key === 'workElement' ? '-' : '미입력'}
          </span>
        ) : (
          <span
            className="w-full bg-transparent text-center text-[10px] leading-tight"
            style={{ wordBreak: 'break-word' }}
          >
            {value || ''}
          </span>
        )}
      </div>
    </td>
  );
}



