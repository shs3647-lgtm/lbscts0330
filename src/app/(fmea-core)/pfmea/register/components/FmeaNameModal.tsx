// CODEFREEZE
/**
 * @file components/FmeaNameModal.tsx
 * @description FMEA명 선택/중복 방지 모달
 * @module pfmea/register
 * @created 2026-02-10 page.tsx에서 분리
 */

'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface FmeaNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  fmeaNameList: { id: string; name: string; type: string }[];
  currentFmeaId: string;
  onApplyName: (name: string) => void;
  onLoadFmea: (id: string) => void;
}

export function FmeaNameModal({ isOpen, onClose, fmeaNameList, currentFmeaId, onApplyName, onLoadFmea }: FmeaNameModalProps) {
  const [searchText, setSearchText] = useState('');
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 600, height: 500, minWidth: 400, minHeight: 350 });

  if (!isOpen) return null;

  const handleClose = () => { onClose(); setSearchText(''); };
  const isDuplicate = searchText && fmeaNameList.some(f => f.name.toLowerCase() === searchText.toLowerCase());
  const filteredList = fmeaNameList.filter(f => f.name.toLowerCase().includes(searchText.toLowerCase()));

  return typeof document === 'undefined' ? null : createPortal(
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      <div className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white rounded-t-lg cursor-move" onMouseDown={onDragStart}>
        <h3 className="text-sm font-bold" title="FMEA Name List (Duplicate Prevention)">FMEA명 목록(Name List) (중복 방지)</h3>
        <button onClick={handleClose} className="text-white hover:text-gray-200">✕</button>
      </div>
      {/* 새 FMEA명 추가 영역 */}
      <div className="px-4 py-2 bg-green-50 border-b border-green-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-green-700">새 FMEA명(New Name):</span>
          <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
            onPaste={e => {
              const text = e.clipboardData.getData('text/plain');
              if (text) { e.preventDefault(); setSearchText(text.replace(/[\r\n]/g, ' ').trim()); }
            }}
            placeholder="새 FMEA명 입력 또는 검색..." autoFocus
            className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-400" />
          <button onClick={() => {
            if (!searchText.trim()) { alert('FMEA명을 입력해주세요.'); return; }
            if (isDuplicate) { alert(`"${searchText}"와 중복됩니다!`); return; }
            onApplyName(searchText.trim()); handleClose();
          }} className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600">✓ 적용(Apply)</button>
        </div>
        {searchText && isDuplicate && <p className="text-[10px] text-red-600 mt-1">이미 존재하는 FMEA명입니다!</p>}
        {searchText && !isDuplicate && <p className="text-[10px] text-green-600 mt-1">✓ 사용 가능한 FMEA명입니다.</p>}
      </div>
      <div className="px-4 py-1 bg-gray-100 border-b">
        <span className="text-[10px] text-gray-600">기존 FMEA 목록(Existing List) (중복 확인용)</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filteredList.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs">
            {searchText ? '검색 결과가 없습니다. 새 FMEA명으로 사용 가능합니다.' : '등록된 FMEA가 없습니다.'}
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-center w-24" title="FMEA Identifier">FMEA ID</th>
                <th className="border px-2 py-1 text-center w-12" title="FMEA Type">유형(Type)</th>
                <th className="border px-2 py-1 text-left" title="FMEA Name">FMEA명(Name)</th>
                <th className="border px-2 py-1 text-center w-16" title="Select">선택(Select)</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((f, idx) => (
                <tr key={f.id} className={`hover:bg-blue-50 ${f.id === currentFmeaId ? 'bg-yellow-100' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="border px-2 py-1 text-center font-mono text-blue-600">{f.id}</td>
                  <td className="border px-2 py-1 text-center">
                    <span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${f.type === 'M' ? 'bg-purple-500' : f.type === 'F' ? 'bg-blue-500' : 'bg-green-500'}`}>{f.type}</span>
                  </td>
                  <td className="border px-2 py-1">{f.name}</td>
                  <td className="border px-2 py-1 text-center">
                    {f.id === currentFmeaId ? (
                      <span className="text-yellow-600 font-semibold">현재(Current)</span>
                    ) : (
                      <button onClick={() => { onLoadFmea(f.id); handleClose(); }}
                        className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600">불러오기(Load)</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-4 py-2 border-t bg-gray-50 flex justify-between items-center">
        <span className="text-[10px] text-gray-500">총 {fmeaNameList.length}개 | 새 FMEA명 입력 후 [적용] 클릭</span>
        <button onClick={handleClose} className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">닫기(Close)</button>
      </div>
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>, document.body);
}
