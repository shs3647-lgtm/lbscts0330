/**
 * @file APTableInline.tsx
 * @description AP 테이블 인라인 컴포넌트 (5AP, 6AP 기준표)
 */

'use client';

import React from 'react';
import { apTableHeaderStyle, apTableCellStyle } from './APTableInlineStyles';

// AP 테이블 데이터
const AP_TABLE_DATA: { s: string; o: string; d: ('H' | 'M' | 'L')[] }[] = [
  { s: '9-10', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '6-7', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '4-5', d: ['H', 'H', 'L', 'L'] },
  { s: '9-10', o: '2-3', d: ['H', 'M', 'L', 'L'] },
  { s: '9-10', o: '1', d: ['H', 'L', 'L', 'L'] },
  { s: '7-8', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '7-8', o: '6-7', d: ['H', 'H', 'M', 'H'] },
  { s: '7-8', o: '4-5', d: ['H', 'M', 'L', 'L'] },
  { s: '7-8', o: '2-3', d: ['M', 'L', 'L', 'L'] },
  { s: '7-8', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', o: '8-10', d: ['H', 'H', 'M', 'L'] },
  { s: '4-6', o: '6-7', d: ['H', 'M', 'L', 'L'] },
  { s: '4-6', o: '4-5', d: ['H', 'M', 'L', 'L'] },
  { s: '4-6', o: '2-3', d: ['M', 'L', 'L', 'L'] },
  { s: '4-6', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '8-10', d: ['M', 'L', 'L', 'L'] },
  { s: '2-3', o: '6-7', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '4-5', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '2-3', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '1', d: ['L', 'L', 'L', 'L'] },
];

const D_HEADERS = ['7-10', '5-6', '2-4', '1'];
const AP_COLORS: Record<'H' | 'M' | 'L', { bg: string; text: string }> = {
  H: { bg: '#f87171', text: '#7f1d1d' },
  M: { bg: '#fde047', text: '#713f12' },
  L: { bg: '#86efac', text: '#14532d' },
};

interface APTableInlineProps {
  onClose: () => void;
  showClose?: boolean;
  stage?: 5 | 6;
}

export default function APTableInline({ onClose, showClose = true, stage = 5 }: APTableInlineProps) {
  const severityRanges = ['9-10', '7-8', '4-6', '2-3'];
  const getSeverityRowSpan = (s: string) => AP_TABLE_DATA.filter(r => r.s === s).length;
  
  // 개수 계산
  let hCount = 0, mCount = 0, lCount = 0;
  AP_TABLE_DATA.forEach(row => {
    row.d.forEach(ap => {
      if (ap === 'H') hCount++;
      else if (ap === 'M') mCount++;
      else lCount++;
    });
  });

  // 단계별 헤더 색상
  const headerBg = stage === 6 ? '#2e7d32' : '#1e3a5f';
  const stageLabel = stage === 6 ? '6AP' : '5AP';

  const thStyle = 'border border-black p-0.5 text-[8px]';
  
  return (
    <div className="flex flex-col h-full">
      <div className="text-white py-1.5 px-2.5 text-[11px] font-bold flex justify-center items-center" style={apTableHeaderStyle(headerBg)}>
        <span>📊 {stageLabel} 기준표 (H:{hCount} M:{mCount} L:{lCount})</span>
      </div>
      <div className="flex-1 overflow-auto p-0.5 bg-white">
        <table className="w-full border-collapse text-[8px]">
          <colgroup>
            <col className="w-[13px]" />
            <col className="w-[19px]" />
            <col className="w-[19px]" />
            <col className="w-[19px]" />
            <col className="w-[19px]" />
            <col className="w-[19px]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-100">
              <th className={thStyle}>S</th>
              <th className={thStyle}>O</th>
              {D_HEADERS.map(d => <th key={d} className={thStyle}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {AP_TABLE_DATA.map((row, idx) => {
              const isFirstOfSeverity = idx === 0 || AP_TABLE_DATA[idx - 1].s !== row.s;
              return (
                <tr key={idx}>
                  {isFirstOfSeverity && (
                    <td rowSpan={getSeverityRowSpan(row.s)} className="border border-black p-0 font-bold text-center bg-blue-100 text-[9px] [writing-mode:vertical-rl]">
                      {row.s}
                    </td>
                  )}
                  <td className="border border-black p-0.5 text-center bg-gray-100 text-[9px]">{row.o}</td>
                  {row.d.map((ap, dIdx) => (
                    <td key={dIdx} className="border border-black p-0.5 text-center font-bold text-[10px]" style={apTableCellStyle(AP_COLORS[ap].bg, AP_COLORS[ap].text)}>
                      {ap}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-100 p-1 text-[9px] flex gap-2 justify-center">
        <span className="flex items-center gap-0.5"><span className="w-3 h-3 bg-red-400 rounded-sm"></span>H</span>
        <span className="flex items-center gap-0.5"><span className="w-3 h-3 bg-yellow-300 rounded-sm"></span>M</span>
        <span className="flex items-center gap-0.5"><span className="w-3 h-3 bg-green-300 rounded-sm"></span>L</span>
      </div>
    </div>
  );
}




