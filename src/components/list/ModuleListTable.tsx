/**
 * @file ModuleListTable.tsx
 * @description 모듈 리스트 테이블 공통 컴포넌트
 * @version 1.0.0
 * @created 2026-01-24
 */

'use client';

import React from 'react';
import { ListModuleConfig, ListItem } from './config/types';

interface ModuleListTableProps {
  config: ListModuleConfig;
  data: ListItem[];
  selectedRows: Set<string>;
  onRowClick: (id: string) => void;
  onToggleAll: (allIds: string[]) => void;
  isAllSelected: boolean;
  renderCell: (column: any, row: ListItem, index: number) => React.ReactNode;
  onOpenRegister: (id: string, section?: string) => void;
}

export default function ModuleListTable({
  config,
  data,
  selectedRows,
  onRowClick,
  onToggleAll,
  isAllSelected,
  renderCell,
  onOpenRegister,
}: ModuleListTableProps) {
  const allIds = data.map(row => row[config.idField]);

  return (
    <div className="rounded-lg overflow-x-auto border border-gray-400 bg-white">
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr style={{ backgroundColor: config.headerBgColor, height: '28px' }} className="text-white">
            <th className="border border-white px-1 py-1 text-center align-middle w-8">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => onToggleAll(allIds)}
                className="w-3.5 h-3.5"
              />
            </th>
            {config.columns.map((col, idx) => (
              <th
                key={idx}
                className="border border-white px-1 py-1 text-center align-middle font-semibold whitespace-nowrap text-[11px]"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const rowId = row[config.idField];
            const isSelected = selectedRows.has(rowId);
            
            return (
              <tr
                key={`${rowId}-${index}`}
                className={`hover:bg-${config.rowHoverBgColor} cursor-pointer transition-colors ${
                  index % 2 === 0 ? `bg-[${config.rowEvenBgColor}]` : 'bg-white'
                } ${isSelected ? 'bg-blue-100' : ''}`}
                style={{ 
                  height: '28px',
                  backgroundColor: isSelected ? '#dbeafe' : (index % 2 === 0 ? config.rowEvenBgColor : 'white')
                }}
                onClick={() => onRowClick(rowId)}
              >
                <td className="border border-gray-400 px-1 py-0.5 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onRowClick(rowId)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3.5 h-3.5"
                  />
                </td>
                {config.columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={`border border-gray-400 px-1 py-0.5 align-middle whitespace-nowrap text-[9px] ${
                      col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-center'
                    }`}
                  >
                    {renderCell(col, row, index)}
                  </td>
                ))}
              </tr>
            );
          })}
          
          {/* 빈 행 */}
          {data.length === 0 && (
            <tr style={{ height: '28px' }} className="bg-white">
              <td className="border border-gray-400 px-1 py-0.5 text-center align-middle">
                <input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" />
              </td>
              {config.columns.map((_, i) => (
                <td key={i} className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
