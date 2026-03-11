/**
 * @file ImportStats.tsx
 * @description 입포트 현황 통계 컴포넌트
 * @author AI Assistant
 * @created 2025-12-26
 */

'use client';

import React from 'react';
import { ImportedFlatData } from './types';

interface ImportStatsProps {
  data: ImportedFlatData[];
}

export default function ImportStats({ data }: ImportStatsProps) {
  // 통계 계산
  const totalRows = data.length;
  const processCount = data.filter(d => d.itemCode.startsWith('A')).length;
  const workElementCount = data.filter(d => d.itemCode.startsWith('B')).length;
  const productCount = data.filter(d => d.itemCode.startsWith('C')).length;
  const emptyCount = data.filter(d => !d.value || d.value.trim() === '').length;

  const thCls = "bg-[#00587a] text-white font-bold px-2 py-2 text-center border border-gray-400";
  const tdCls = "text-center font-bold text-lg py-2 border border-gray-400";
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-md">
      <h3 className="text-sm font-bold text-[#00587a] mb-3">입포트 현황</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className={thCls}>총행</th>
            <th className={thCls}>공정항목</th>
            <th className={thCls}>작업요소</th>
            <th className={thCls}>완제품</th>
            <th className={thCls}>누락</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${tdCls} bg-white text-black`}>{totalRows}</td>
            <td className={`${tdCls} bg-blue-50 text-blue-600`}>{processCount}</td>
            <td className={`${tdCls} bg-green-50 text-green-600`}>{workElementCount}</td>
            <td className={`${tdCls} bg-red-50 text-red-600`}>{productCount}</td>
            <td className={`${tdCls} bg-yellow-50 text-yellow-600`}>{emptyCount}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}











