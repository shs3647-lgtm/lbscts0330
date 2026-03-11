/**
 * @file components/CpSelectModal.tsx
 * @description CP 선택 모달 (기초정보용)
 */

import React from 'react';
import { CpSelectItem } from '../types';

interface CpSelectModalProps {
  isOpen: boolean;
  cpSelectType: 'M' | 'F' | 'P';
  availableCps: CpSelectItem[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function CpSelectModal({
  isOpen,
  cpSelectType,
  availableCps,
  onClose,
  onSelect,
}: CpSelectModalProps) {
  if (!isOpen) return null;
  
  const bgColor = cpSelectType === 'M' ? 'bg-purple-600' : 
                  cpSelectType === 'F' ? 'bg-blue-600' : 
                  'bg-green-600';
  
  const title = cpSelectType === 'M' ? '🟣 Master CP 선택' : 
                cpSelectType === 'F' ? '🔵 Family CP 선택' : 
                '🟢 Part CP 선택';
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[500px] overflow-hidden">
        <div className={`px-4 py-3 flex justify-between items-center ${bgColor} text-white`}>
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
        </div>
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {availableCps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">등록된 {cpSelectType} CP가 없습니다.</div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">CP ID</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">CP명</th>
                  <th className="border border-gray-300 px-3 py-2 text-center w-16">유형</th>
                  <th className="border border-gray-300 px-3 py-2 text-center w-20">선택</th>
                </tr>
              </thead>
              <tbody>
                {availableCps.map((cp, idx) => (
                  <tr key={cp.id} className={`hover:bg-teal-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-teal-600">{cp.id}</td>
                    <td className="border border-gray-300 px-3 py-2">{cp.subject}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${
                        cp.type === 'M' ? 'bg-purple-500' : cp.type === 'F' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        {cp.type}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <button
                        onClick={() => onSelect(cp.id)}
                        className="px-3 py-1 rounded bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold"
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


