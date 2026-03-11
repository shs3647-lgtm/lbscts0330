/**
 * @file APTableModal.tsx
 * @description AP(Action Priority) 테이블 점수기준표 모달
 * Severity × Occurrence × Detection 3차원 매트릭스
 * 
 * @version 2.0.0 - 인라인 스타일 제거, Tailwind CSS 적용
 */

'use client';

import React from 'react';

interface APTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** AP 테이블 데이터 */
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

/** AP 등급별 스타일 */
const AP_STYLES = {
  H: { bg: 'bg-red-400', text: 'text-red-900', label: 'High (H)' },
  M: { bg: 'bg-yellow-300', text: 'text-yellow-900', label: 'Medium (M)' },
  L: { bg: 'bg-green-300', text: 'text-green-900', label: 'Low (L)' },
};

const D_HEADERS = ['7-10', '5-6', '2-4', '1'];

/** 공통 스타일 */
const tw = {
  overlay: 'fixed inset-0 flex justify-center items-center z-[9999] bg-black/50',
  modal: 'bg-white rounded-lg shadow-2xl max-w-[700px] w-[95%] max-h-[90vh] overflow-auto',
  header: 'bg-[#1e3a5f] text-white py-3 px-4 flex justify-between items-center rounded-t-lg',
  closeBtn: 'bg-transparent border-none text-white text-xl cursor-pointer leading-none hover:opacity-80',
  legend: 'p-3 flex gap-4 bg-gray-100 border-b border-gray-300',
  legendItem: 'flex items-center gap-1.5',
  legendBox: 'w-6 h-4 rounded-sm border border-gray-300',
  table: 'w-full border-collapse text-[11px] border-2 border-black',
  th: 'bg-[#1e3a5f] text-white py-2 px-2 border-2 border-black text-center font-bold',
  td: 'border border-black py-1.5 px-2 text-center font-bold text-sm',
};

export default function APTableModal({ isOpen, onClose }: APTableModalProps) {
  if (!isOpen) return null;

  const getSeverityRowSpan = (sRange: string): number => {
    return AP_TABLE_DATA.filter(row => row.s === sRange).length;
  };

  const severityRanges = [...new Set(AP_TABLE_DATA.map(row => row.s))];

  return (
    <div className={tw.overlay} onClick={onClose}>
      <div className={tw.modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={tw.header}>
          <span className="font-bold text-sm">📊 AP(Action Priority) 점수 기준표</span>
          <button onClick={onClose} className={tw.closeBtn}>×</button>
        </div>

        {/* 범례 */}
        <div className={tw.legend}>
          {Object.entries(AP_STYLES).map(([key, val]) => (
            <div key={key} className={tw.legendItem}>
              <div className={`${tw.legendBox} ${val.bg}`} />
              <span className={`text-[11px] font-semibold ${val.text}`}>{val.label}</span>
            </div>
          ))}
        </div>

        {/* 테이블 */}
        <div className="p-4 overflow-x-auto">
          <table className={tw.table}>
            <thead>
              <tr>
                <th rowSpan={2} className={`${tw.th} w-[12%]`}>Severity<br />(S)</th>
                <th rowSpan={2} className={`${tw.th} w-[12%]`}>Occurrence<br />(O)</th>
                <th colSpan={4} className={tw.th}>Detection (D)</th>
              </tr>
              <tr>
                {D_HEADERS.map(h => (
                  <th key={h} className={`${tw.th} w-[19%]`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AP_TABLE_DATA.map((row, idx) => {
                const isFirstInSeverity = idx === 0 || AP_TABLE_DATA[idx - 1].s !== row.s;
                return (
                  <tr key={`${row.s}-${row.o}-${idx}`}>
                    {isFirstInSeverity && (
                      <td
                        rowSpan={getSeverityRowSpan(row.s)}
                        className={`${tw.td} bg-gray-100`}
                      >
                        {row.s}
                      </td>
                    )}
                    <td className={`${tw.td} bg-gray-50`}>{row.o}</td>
                    {row.d.map((ap, dIdx) => (
                      <td
                        key={dIdx}
                        className={`${tw.td} ${AP_STYLES[ap].bg} ${AP_STYLES[ap].text}`}
                      >
                        {ap}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 푸터 설명 */}
        <div className="px-4 pb-4 text-[10px] text-gray-600">
          <p className="mb-1">※ AP 등급 기준:</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li><span className="text-red-700 font-semibold">H (High)</span>: 즉시 개선조치 필요</li>
            <li><span className="text-yellow-700 font-semibold">M (Medium)</span>: 개선조치 권고</li>
            <li><span className="text-green-700 font-semibold">L (Low)</span>: 현재 관리 유지</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
