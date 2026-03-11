// CODEFREEZE
/**
 * @file APTableModal.tsx
 * @description AP(Action Priority) 테이블 점수기준표 플로팅 윈도우
 * Severity × Occurrence × Detection 3차원 매트릭스
 *
 * @version 3.0.0 - 비모달 플로팅 윈도우 전환
 */

'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface APTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** AIAG-VDA FMEA 1st Edition 공식 AP 테이블. D범위: 7-10, 5-6, 2-4, 1 */
const AP_TABLE_DATA: { s: string; o: string; d: ('H' | 'M' | 'L')[] }[] = [
  { s: '9-10', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '6-7', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '4-5', d: ['H', 'H', 'H', 'M'] },
  { s: '9-10', o: '2-3', d: ['H', 'M', 'L', 'L'] },
  { s: '9-10', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '7-8', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '7-8', o: '6-7', d: ['H', 'H', 'H', 'M'] },
  { s: '7-8', o: '4-5', d: ['H', 'M', 'M', 'M'] },
  { s: '7-8', o: '2-3', d: ['M', 'M', 'L', 'L'] },
  { s: '7-8', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', o: '8-10', d: ['H', 'H', 'M', 'M'] },
  { s: '4-6', o: '6-7', d: ['M', 'M', 'M', 'L'] },
  { s: '4-6', o: '4-5', d: ['M', 'L', 'L', 'L'] },
  { s: '4-6', o: '2-3', d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '8-10', d: ['M', 'M', 'L', 'L'] },
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
  header: 'bg-[#1e3a5f] text-white py-3 px-4 flex justify-between items-center rounded-t-lg cursor-move shrink-0',
  closeBtn: 'bg-transparent border-none text-white text-xl cursor-pointer leading-none hover:opacity-80',
  legend: 'p-3 flex gap-4 bg-gray-100 border-b border-gray-300 shrink-0',
  legendItem: 'flex items-center gap-1.5',
  legendBox: 'w-6 h-4 rounded-sm border border-gray-300',
  table: 'w-full border-collapse text-[11px] border-2 border-black',
  th: 'bg-[#1e3a5f] text-white py-2 px-2 border-2 border-black text-center font-bold',
  td: 'border border-black py-1.5 px-2 text-center font-bold text-sm',
};

export default function APTableModal({ isOpen, onClose }: APTableModalProps) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 700, height: 600, minWidth: 500, minHeight: 400
  });

  if (!isOpen) return null;

  const getSeverityRowSpan = (sRange: string): number => {
    return AP_TABLE_DATA.filter(row => row.s === sRange).length;
  };

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* 헤더 */}
      <div className={tw.header} onMouseDown={onDragStart}>
        <span className="font-bold text-sm" title="AP Criteria Table">📊 AP 기준(AP Criteria)</span>
        <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className={tw.closeBtn}>×</button>
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
      <div className="flex-1 overflow-auto p-4">
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
      <div className="px-4 pb-4 text-[10px] text-gray-600 shrink-0">
        <p className="mb-1">※ AP 등급 기준:</p>
        <ul className="list-disc list-inside ml-2 space-y-0.5">
          <li><span className="text-red-700 font-semibold">H (High)</span>: 즉시 개선조치 필요</li>
          <li><span className="text-yellow-700 font-semibold">M (Medium)</span>: 개선조치 권고</li>
          <li><span className="text-green-700 font-semibold">L (Low)</span>: 현재 관리 유지</li>
        </ul>
      </div>

      {/* 리사이즈 핸들 */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>,
    document.body
  );
}
