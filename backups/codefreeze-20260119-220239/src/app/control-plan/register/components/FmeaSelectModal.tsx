/**
 * @file components/FmeaSelectModal.tsx
 * @description FMEA 선택 모달
 */

import React from 'react';
import { FmeaSelectItem } from '../types';

interface FmeaSelectModalProps {
  isOpen: boolean;
  fmeaSelectType: 'M' | 'F' | 'P' | 'ALL';
  availableFmeas: FmeaSelectItem[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function FmeaSelectModal({
  isOpen,
  fmeaSelectType,
  availableFmeas,
  onClose,
  onSelect,
}: FmeaSelectModalProps) {
  if (!isOpen) return null;
  
  const bgColor = fmeaSelectType === 'M' ? 'bg-purple-600' : 
                  fmeaSelectType === 'F' ? 'bg-blue-600' : 
                  fmeaSelectType === 'P' ? 'bg-green-600' : 
                  'bg-gray-600';
  
  const title = fmeaSelectType === 'M' ? '🟣 Master FMEA 선택' : 
                fmeaSelectType === 'F' ? '🔵 Family FMEA 선택' : 
                fmeaSelectType === 'P' ? '🟢 Part FMEA 선택' : 
                '📋 FMEA 리스트 선택';
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[500px] overflow-hidden">
        <div className={`px-4 py-3 flex justify-between items-center ${bgColor} text-white`}>
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
        </div>
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {availableFmeas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">등록된 FMEA가 없습니다.</div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">FMEA ID</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">FMEA명</th>
                  <th className="border border-gray-300 px-3 py-2 text-center w-16">유형</th>
                  <th className="border border-gray-300 px-3 py-2 text-center w-20">선택</th>
                </tr>
              </thead>
              <tbody>
                {availableFmeas.map((fmea, idx) => (
                  <tr key={fmea.id} className={`hover:bg-purple-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-purple-600">{fmea.id}</td>
                    <td className="border border-gray-300 px-3 py-2">{fmea.subject}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${
                        fmea.type === 'M' ? 'bg-purple-500' : fmea.type === 'F' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        {fmea.type}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <button
                        onClick={() => onSelect(fmea.id)}
                        className="px-3 py-1 rounded bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold"
                      >
                        선택
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-3 bg-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-400">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}


