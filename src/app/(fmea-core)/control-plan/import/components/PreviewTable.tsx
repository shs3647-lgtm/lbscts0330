/**
 * @file PreviewTable.tsx
 * @description CP Import 미리보기 테이블 컴포넌트
 * @created 2026-01-14
 * @line-count ~250줄
 */

'use client';

import { Pencil, Trash2, Save, X } from 'lucide-react';
import type { ImportedData } from '../types';
import { PREVIEW_COLUMNS, GROUP_HEADERS, tw } from '../constants';

// key를 itemCode로 매핑 (PREVIEW_COLUMNS의 key → 실제 itemCode)
const KEY_TO_ITEM_CODE_MAP: Record<string, string> = {
  'processNo': 'A1',
  'processName': 'A2',
  'level': 'A3',
  'processDesc': 'A4',
  'equipment': 'A5',
  'ep': 'A6',
  'autoDetector': 'A7',
  'productChar': 'B1',
  'processChar': 'B2',
  'specialChar': 'B3',
  'spec': 'B4',
  'evalMethod': 'B5',
  'sampleSize': 'B6',
  'frequency': 'B7',
  'controlMethod': 'B7-1',  // 관리방법 컬럼 추가
  'owner1': 'B8',
  'owner2': 'B9',
  'reactionPlan': 'B10',
};

// 누락 체크 제외 컬럼 (특별특성만 선택사항)
const SKIP_MISSING_CHECK = ['specialChar'];

type PreviewTab = 'full' | 'group' | 'individual';

export interface PreviewTableProps {
  data: ImportedData[];
  tab: PreviewTab;
  editingRowId: string | null;
  editValues: Record<string, string>;
  selectedRows: Set<string>;
  selectedColumn: string | null;
  onEditStart: (processNo: string, data: ImportedData[]) => void;
  onEditSave: (processNo: string, tab: PreviewTab) => void;
  onEditCancel: () => void;
  onDelete: (processNo: string, tab: PreviewTab) => void;
  onCellChange: (field: string, value: string) => void;
  onRowSelect: (processNo: string) => void;
  onColumnClick: (key: string) => void;
  onSelectAll: (processNos: string[]) => void;
  // 필터 옵션 (그룹/개별 탭용)
  groupFilter?: string;  // 그룹 필터 (processInfo, detector, controlItem, controlMethod, reactionPlan)
  columnFilter?: string; // 개별 컬럼 필터 (특정 컬럼만 보기)
}

/**
 * 미리보기 테이블 컴포넌트
 * - 전체/그룹/개별 미리보기 테이블 렌더링
 * - 행별 편집/삭제/저장 UI
 * - 헤더 렌더링
 */
export default function PreviewTable({
  data,
  tab,
  editingRowId,
  editValues,
  selectedRows,
  selectedColumn,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDelete,
  onCellChange,
  onRowSelect,
  onColumnClick,
  onSelectAll,
  groupFilter = '',
  columnFilter = '',
}: PreviewTableProps) {
  // ★ 필터링된 컬럼 계산
  const filteredColumns = PREVIEW_COLUMNS.filter(col => {
    // 공정번호, 공정명은 항상 표시
    if (col.key === 'processNo' || col.key === 'processName') return true;

    // 그룹 필터가 있으면 해당 그룹만 표시
    if (groupFilter && col.group !== groupFilter) return false;

    // 컬럼 필터가 있으면 해당 컬럼만 표시 (공정번호/공정명 제외하고)
    if (columnFilter && col.key !== columnFilter) return false;

    return true;
  });

  // 필터링된 그룹 헤더 계산
  const filteredGroupHeaders = GROUP_HEADERS.filter(grp => {
    if (!groupFilter && !columnFilter) return true;
    if (groupFilter) return grp.key === groupFilter;
    if (columnFilter) {
      const col = PREVIEW_COLUMNS.find(c => c.key === columnFilter);
      return col?.group === grp.key;
    }
    return true;
  }).map(grp => {
    // colSpan 재계산
    const colSpan = filteredColumns.filter(col => col.group === grp.key).length;
    return { ...grp, colSpan };
  }).filter(grp => grp.colSpan > 0);

  // 공정현황 그룹에 공정번호/공정명 포함 여부 조정
  const processInfoHeader = filteredGroupHeaders.find(g => g.key === 'processInfo');
  if (!processInfoHeader && (filteredColumns.some(c => c.key === 'processNo' || c.key === 'processName'))) {
    // processInfo 헤더가 없지만 공정번호/공정명이 있으면 기본 헤더 추가
    const basicColSpan = filteredColumns.filter(c => c.key === 'processNo' || c.key === 'processName').length;
    filteredGroupHeaders.unshift({ key: 'processInfo', label: '공정(Process)', colSpan: basicColSpan, color: 'bg-blue-600' });
  }

  // ★ 중요: processNo 기준 숫자 정렬 (10 → 20 → 30 → ... → 100)
  const processNos = [...new Set(data.map(d => d.processNo))].sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    // 둘 다 숫자인 경우 숫자 정렬
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    // 그 외에는 문자열 정렬 (숫자 우선)
    return a.localeCompare(b, undefined, { numeric: true });
  });

  return (
    <table className="border-collapse border-spacing-0 w-full table-fixed m-0 p-0 border-0">
      {/* colgroup: table-layout: fixed에서 컬럼 폭을 결정하는 핵심 요소 */}
      <colgroup>
        {/* 관리 컬럼 3개 - 작업 컬럼 너비 확장 */}
        <col className="w-[1%]" />
        <col className="w-[2%]" />
        <col className="w-[4%]" /> {/* 작업 컬럼 너비 확장: 2% → 4% */}
        {/* 필터링된 컬럼들 */}
        {filteredColumns.map(col => {
          return <col key={col.key} className={col.width} />;
        })}
      </colgroup>
      <thead className="sticky top-0 z-[10]">
        <tr className="h-[18px]">
          <th colSpan={3} className="bg-gray-600 text-white text-[10px] font-medium text-center border border-gray-400 antialiased sticky top-0">관리</th>
          {filteredGroupHeaders.map(grp => (
            <th key={grp.key} colSpan={grp.colSpan} className={`${grp.color} text-white text-[10px] font-medium text-center border border-gray-400 antialiased sticky top-0`}>
              {grp.label}
            </th>
          ))}
        </tr>
        <tr className="h-[22px]">
          <th className={`${tw.headerCell} bg-[#00587a] sticky top-[18px]`}>
            <input type="checkbox" className="w-3 h-3" onChange={(e) => {
              if (e.target.checked) onSelectAll(processNos);
              else onSelectAll([]);
            }} />
          </th>
          <th className={`${tw.headerCell} bg-[#00587a] sticky top-[18px]`}>No</th>
          <th className={`${tw.headerCell} bg-[#00587a] sticky top-[18px]`}>작업</th>
          {filteredColumns.map(col => {
            const groupColor = { processInfo: 'bg-blue-500', detector: 'bg-purple-500', controlItem: 'bg-blue-500', controlMethod: 'bg-green-500', reactionPlan: 'bg-orange-400' }[col.group || 'processInfo'];
            const isSmall = col.smallText;
            return (
              <th key={col.key}
                className={`${groupColor} text-white border border-gray-400 font-medium text-center cursor-pointer whitespace-pre-wrap antialiased sticky top-[18px] ${isSmall ? 'text-[8px] px-[1px] py-[1px] leading-[1.1]' : 'text-[10px] px-0.5 py-0.5'} ${selectedColumn === col.key ? 'ring-2 ring-yellow-400' : ''}`}
                onClick={() => onColumnClick(col.key)}>
                {col.label}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {/* ★ 2026-01-24: 행 기반 뷰로 변경 - 각 Excel 행을 개별 테이블 행으로 표시 */}
        {(() => {
          // 데이터를 행 단위로 그룹화 (id에서 rowNumber 추출)
          const rowGroups = new Map<string, ImportedData[]>();

          data.forEach(item => {
            // ID 형식: group-{sheet}-{rowNumber}-{colIdx} 또는 full-{sheetIdx}-{rowNumber}-{colIdx}
            const idParts = item.id.split('-');
            // rowNumber는 마지막에서 두 번째 파트
            const rowKey = idParts.length >= 4
              ? `${item.processNo}-${idParts[idParts.length - 2]}`
              : `${item.processNo}-${item.id}`;

            if (!rowGroups.has(rowKey)) {
              rowGroups.set(rowKey, []);
            }
            rowGroups.get(rowKey)!.push(item);
          });

          // 행 키를 정렬 (processNo 기준, 그 다음 rowNumber 기준)
          const sortedRowKeys = Array.from(rowGroups.keys()).sort((a, b) => {
            const [pNoA, rNumA] = a.split('-');
            const [pNoB, rNumB] = b.split('-');
            const numA = parseInt(pNoA, 10);
            const numB = parseInt(pNoB, 10);
            if (numA !== numB) return numA - numB;
            return parseInt(rNumA || '0', 10) - parseInt(rNumB || '0', 10);
          });

          if (sortedRowKeys.length === 0) {
            // 빈 데이터일 때 기본 행 표시
            return Array.from({ length: 20 }).map((_, i) => (
              <tr key={`empty-${i}`} className={`h-[18px] ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="border border-gray-300 px-[1px] py-[1px] text-[8px] text-center"></td>
                <td className="border border-gray-300 px-[1px] py-[1px] text-[8px] text-center text-gray-400">{i + 1}</td>
                <td className="border border-gray-300 px-[1px] py-[1px] text-[8px] text-center"></td>
                {filteredColumns.map(col => <td key={col.key} className="border border-gray-300 px-[1px] py-[1px] text-[8px]"></td>)}
              </tr>
            ));
          }

          return sortedRowKeys.map((rowKey, i) => {
            const rowData = rowGroups.get(rowKey) || [];
            const processNo = rowData[0]?.processNo || '';

            const getValue = (key: string) => {
              const itemCode = KEY_TO_ITEM_CODE_MAP[key] || key;
              return rowData.find(r => r.itemCode === itemCode)?.value || '';
            };

            const isEditing = editingRowId === rowKey;

            return (
              <tr key={`row-${rowKey}`} className={`min-h-[18px] ${selectedRows.has(processNo) ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="border border-gray-300 px-[1px] py-[1px] text-[8px] text-center align-top">
                  <input type="checkbox" className="w-2.5 h-2.5" checked={selectedRows.has(processNo)} onChange={() => onRowSelect(processNo)} />
                </td>
                <td className="border border-gray-300 px-[1px] py-[1px] text-[8px] text-center align-top">{i + 1}</td>
                <td className="border border-gray-300 px-[2px] py-[1px] text-[8px] text-center align-top">
                  <div className="flex items-center justify-center gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={() => onEditSave(processNo, tab)} className="p-1 bg-green-500 text-white rounded hover:bg-green-600" title="저장">
                          <Save size={11} />
                        </button>
                        <button onClick={onEditCancel} className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500" title="취소">
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => onEditStart(processNo, data)} className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600" title="수정">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => onDelete(processNo, tab)} className="p-1 bg-red-500 text-white rounded hover:bg-red-600" title="삭제">
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                {filteredColumns.map(col => {
                  const isProcessDesc = col.key === 'processDesc';
                  const alignClass = isProcessDesc ? 'text-left align-top' : 'text-center align-middle';

                  const cellValue = getValue(col.key);
                  const isMissing = !cellValue.trim() &&
                    !SKIP_MISSING_CHECK.includes(col.key) &&
                    col.key !== 'processNo' &&
                    col.key !== 'processName';

                  const bgClass = selectedColumn === col.key
                    ? 'bg-yellow-100'
                    : isMissing
                      ? 'bg-red-100'
                      : '';

                  return (
                    <td key={col.key} className={`border border-gray-300 px-[1px] py-[1px] text-[8px] whitespace-pre-wrap break-words ${alignClass} ${bgClass}`}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues[col.key] ?? cellValue}
                          onChange={(e) => onCellChange(col.key, e.target.value)}
                          className="w-full px-[1px] py-0 border border-blue-400 rounded text-[8px] bg-white focus:outline-none font-normal antialiased h-[16px]"
                        />
                      ) : (
                        <span className={`antialiased font-normal ${isMissing ? 'text-red-400' : ''}`}>
                          {cellValue || (isMissing ? '미입력' : '')}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          });
        })()}
      </tbody>
    </table>
  );
}

