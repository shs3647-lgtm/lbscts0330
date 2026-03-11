/**
 * @file FailureLinkResult.tsx
 * @description 고장연결 결과 트리 컴포넌트
 */

'use client';

import React from 'react';
import { WorksheetState } from '../constants';

interface FailureLinkResultProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage: () => void;
}

const COLORS_LINK = { 
  mn: '#eef7ff', 
  mc: '#ffe6e6', 
  en: '#fef0ff', 
  line: '#6f8fb4' 
};

export default function FailureLinkResult({ 
  state, 
  setState, 
  setDirty, 
  saveToLocalStorage 
}: FailureLinkResultProps) {
  const ui = (state as any).failureLinkUI || {};
  const { currentFMId, savedLinks = [], stats = { linkedFM: 0, totalFM: 0, totalLinks: 0 } } = ui;
  const resultLinks = currentFMId ? savedLinks.filter((l: any) => l.fmId === currentFMId) : [];

  return (
    <>
      <div className="bg-indigo-700 text-white py-2 px-3 text-xs font-bold shrink-0 flex justify-between items-center">
        <span>🔗 연결 결과</span>
        <span className="text-[10px] font-normal">연결: {stats.linkedFM}/{stats.totalFM} FM</span>
      </div>
      <div className="flex-1 overflow-auto p-1 bg-indigo-50">
        <table className="w-full border-collapse text-[8px]">
          <thead>
            <tr>
              <th colSpan={3} className="bg-blue-200 py-0.5 text-center font-bold border border-gray-300">1. 고장영향(FE)</th>
              <th className="bg-amber-100 py-0.5 text-center font-bold border border-gray-300">2. FM</th>
              <th colSpan={3} className="bg-green-200 py-0.5 text-center font-bold border border-gray-300">3. 고장원인(FC)</th>
            </tr>
            <tr>
              <th className="bg-blue-100 py-0.5 text-center font-semibold border border-gray-300">구분</th>
              <th className="bg-blue-100 py-0.5 text-center font-semibold border border-gray-300">FE</th>
              <th className="bg-blue-100 py-0.5 text-center font-semibold border border-gray-300">S</th>
              <th className="bg-amber-100 py-0.5 text-center font-semibold border border-gray-300">FM</th>
              <th className="bg-green-100 py-0.5 text-center font-semibold border border-gray-300">4M</th>
              <th className="bg-green-100 py-0.5 text-center font-semibold border border-gray-300">작업요소</th>
              <th className="bg-green-100 py-0.5 text-center font-semibold border border-gray-300">FC</th>
            </tr>
          </thead>
          <tbody>
            {resultLinks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-5 text-gray-400 text-[10px]">
                  {currentFMId ? '연결된 항목이 없습니다' : 'FM을 선택하세요'}
                </td>
              </tr>
            ) : resultLinks.map((link: any, idx: number) => {
              const m4Bg = link.fcM4 === 'MN' ? COLORS_LINK.mn : link.fcM4 === 'MC' ? COLORS_LINK.mc : COLORS_LINK.en;
              return (
                <tr key={idx}>
                  <td className="py-0.5 px-1 border border-gray-300 text-center">{link.feScope}</td>
                  <td className="py-0.5 px-1 border border-gray-300">{link.feText}</td>
                  <td className={`py-0.5 px-1 border border-gray-300 text-center font-bold ${link.severity >= 8 ? 'text-orange-600' : 'text-gray-800'}`}>
                    {link.severity}
                  </td>
                  {idx === 0 && (
                    <td rowSpan={resultLinks.length} className="py-0.5 px-1 border border-gray-300 bg-amber-100 font-bold text-center align-middle">
                      {link.fmText}
                    </td>
                  )}
                  <td className="py-0.5 px-1 border border-gray-300 text-center" style={{ background: m4Bg }}>{link.fcM4}</td>
                  <td className="py-0.5 px-1 border border-gray-300">{link.fcWorkElem}</td>
                  <td className="py-0.5 px-1 border border-gray-300">{link.fcText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 py-1.5 px-2.5 border-t border-gray-300 bg-indigo-50 text-[10px] text-indigo-700 flex justify-between items-center">
        <span>총 {stats.totalLinks}개 연결</span>
        <button 
          onClick={() => {
            const links = (state as any).failureLinks || [];
            setState((prev: any) => ({ ...prev, failureLinks: links }));
            setDirty(true);
            saveToLocalStorage();
            alert(`✅ ${links.length}개 고장연결이 저장되었습니다.`);
          }}
          className="py-0.5 px-2.5 bg-red-600 text-white border-none rounded text-[9px] cursor-pointer font-bold"
        >
          💾 저장
        </button>
      </div>
    </>
  );
}

