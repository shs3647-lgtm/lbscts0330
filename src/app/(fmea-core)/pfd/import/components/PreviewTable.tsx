/**
 * @file PreviewTable.tsx
 * @description PFD Import 미리보기 테이블 컴포넌트 - 필터 및 누락 표시 지원
 * @updated 2026-01-24 - 필터/누락표시 기능 추가
 * 
 * PFD 컬럼 (9개):
 * - 공정정보 (5개): 공정번호, 공정명, 공정설명, 작업요소, 설비/금형/지그
 * - 특성정보 (4개): 제품특별특성, 제품특성, 공정특별특성, 공정특성
 */

'use client';

import { useMemo } from 'react';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import type { ImportedData } from '../types';
import { PREVIEW_COLUMNS, GROUP_HEADERS, tw } from '../constants';
import { PFD_KEY_TO_ITEM_CODE } from '@/lib/pfd/constants/pfd-column-ids';

const KEY_TO_ITEM_CODE_MAP = PFD_KEY_TO_ITEM_CODE;

// 누락 체크에서 제외할 항목 (특별특성은 선택적)
const SKIP_MISSING_CHECK = ['productSpecialChar', 'processSpecialChar'];

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
  // 필터 props
  groupFilter?: string;
  columnFilter?: string;
}

/**
 * PFD 미리보기 테이블 컴포넌트
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
  // 필터링된 컬럼 계산
  const filteredColumns = useMemo(() => {
    if (groupFilter) {
      return PREVIEW_COLUMNS.filter(col => col.group === groupFilter);
    }
    if (columnFilter) {
      return PREVIEW_COLUMNS.filter(col => col.key === columnFilter || col.key === 'processNo' || col.key === 'processName');
    }
    return PREVIEW_COLUMNS;
  }, [groupFilter, columnFilter]);

  // 필터링된 그룹 헤더 계산
  const filteredGroupHeaders = useMemo(() => {
    if (groupFilter) {
      return GROUP_HEADERS.filter(grp => grp.key === groupFilter);
    }
    if (columnFilter) {
      // 개별 컬럼 필터 시 공정정보만 표시 (공정번호, 공정명 포함)
      const targetCol = PREVIEW_COLUMNS.find(c => c.key === columnFilter);
      if (targetCol) {
        const groups = new Set(['processInfo']); // 항상 공정번호, 공정명 포함
        if (targetCol.group) groups.add(targetCol.group);
        return GROUP_HEADERS.filter(grp => groups.has(grp.key)).map(grp => ({
          ...grp,
          colSpan: filteredColumns.filter(c => c.group === grp.key).length,
        }));
      }
    }
    return GROUP_HEADERS;
  }, [groupFilter, columnFilter, filteredColumns]);

  // processNo 기준 숫자 정렬
  const processNos = [...new Set(data.map(d => d.processNo))].sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b, undefined, { numeric: true });
  });
  
  return (
    <table className="border-collapse border-spacing-0 w-full table-fixed m-0 p-0 border-0">
      <colgroup>
        <col className="w-[20px]" />
        <col className="w-[25px]" />
        <col className="w-[50px]" />
        {filteredColumns.map(col => (
          <col key={col.key} className={col.width} />
        ))}
      </colgroup>
      <thead className="sticky top-0 z-[10]">
        <tr className="h-[18px]">
          <th colSpan={3} className="bg-gray-600 text-white text-[10px] font-medium text-center border border-gray-400 antialiased sticky top-0" title="Management">관리(Management)</th>
          {filteredGroupHeaders.map(grp => (
            <th key={grp.key} colSpan={grp.colSpan} className={`${grp.color} text-white text-[10px] font-medium text-center border border-gray-400 antialiased sticky top-0`}>
              {grp.label}
            </th>
          ))}
        </tr>
        <tr className="h-[22px]">
          <th className={`${tw.headerCell} bg-[#0d9488] sticky top-[18px]`}>
            <input type="checkbox" className="w-3 h-3" onChange={(e) => {
              if (e.target.checked) onSelectAll(processNos);
              else onSelectAll([]);
            }} />
          </th>
          <th className={`${tw.headerCell} bg-[#0d9488] sticky top-[18px]`}>No</th>
          <th className={`${tw.headerCell} bg-[#0d9488] sticky top-[18px]`}>작업(Action)</th>
          {filteredColumns.map(col => {
            const groupColor = { processInfo: 'bg-teal-500', characteristic: 'bg-blue-500' }[col.group || 'processInfo'];
            return (
              <th key={col.key}
                className={`${groupColor} text-white border border-gray-400 font-medium text-center cursor-pointer whitespace-pre-wrap antialiased sticky top-[18px] text-[10px] px-0.5 py-0.5 ${selectedColumn === col.key ? 'ring-2 ring-yellow-400' : ''}`}
                onClick={() => onColumnClick(col.key)}>
                {col.label}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {processNos.length === 0 ? (
          Array.from({ length: 500 }).map((_, i) => (
            <tr key={`empty-${i}`} className={`h-[18px] ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <td className="border border-gray-300 px-[1px] py-[1px] text-[8px] text-center"></td>
              <td className="border border-gray-300 px-[1px] py-[1px] text-[8px] text-center text-gray-400">{i + 1}</td>
              <td className="border border-gray-300 px-[1px] py-[1px] text-[8px] text-center"></td>
              {filteredColumns.map(col => <td key={col.key} className="border border-gray-300 px-[1px] py-[1px] text-[8px]"></td>)}
            </tr>
          ))
        ) : (
          processNos.map((processNo, i) => {
            const row = data.filter(d => d.processNo === processNo);

            const getValue = (key: string) => {
              const itemCode = KEY_TO_ITEM_CODE_MAP[key] || key;
              return row.find(r => r.itemCode === itemCode)?.value || '';
            };

            const isEditing = editingRowId === processNo;

            return (
              <tr key={`row-${processNo}-${i}`} className={`min-h-[18px] ${selectedRows.has(processNo) ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="border border-gray-300 px-[1px] py-[1px] text-[8px] text-center align-top">
                  <input type="checkbox" className="w-2.5 h-2.5" checked={selectedRows.has(processNo)} onChange={() => onRowSelect(processNo)} />
                </td>
                <td className="border border-gray-300 px-[1px] py-[1px] text-[8px] text-center align-top">{i + 1}</td>
                <td className="border border-gray-300 px-[2px] py-[1px] text-[8px] text-center align-top">
                  <div className="flex items-center justify-center gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={() => onEditSave(processNo, tab)} className="p-1 bg-green-500 text-white rounded hover:bg-green-600" title="저장(Save)">
                          <Save size={11} />
                        </button>
                        <button onClick={onEditCancel} className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500" title="취소(Cancel)">
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => onEditStart(processNo, data)} className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600" title="수정(Edit)">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => onDelete(processNo, tab)} className="p-1 bg-red-500 text-white rounded hover:bg-red-600" title="삭제(Delete)">
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                {filteredColumns.map(col => {
                  const value = getValue(col.key);
                  const isEmpty = !value.trim();
                  const shouldShowMissing = isEmpty && !SKIP_MISSING_CHECK.includes(col.key);
                  const isProcessDesc = col.key === 'processDesc';
                  const alignClass = isProcessDesc ? 'text-left align-top' : 'text-center align-middle';
                  const bgClass = shouldShowMissing ? 'bg-red-100' : (selectedColumn === col.key ? 'bg-yellow-100' : '');

                  return (
                    <td key={col.key} className={`border border-gray-300 px-[1px] py-[1px] text-[8px] whitespace-pre-wrap break-words ${alignClass} ${bgClass}`}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues[col.key] ?? value}
                          onChange={(e) => onCellChange(col.key, e.target.value)}
                          className="w-full px-[1px] py-0 border border-blue-400 rounded text-[8px] bg-white focus:outline-none font-normal antialiased h-[16px]"
                        />
                      ) : (
                        shouldShowMissing ? (
                          <span className="text-red-400 antialiased font-normal">미입력(Empty)</span>
                        ) : (
                          <span className="antialiased font-normal">{value}</span>
                        )
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
