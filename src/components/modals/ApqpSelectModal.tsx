// CODEFREEZE
/**
 * @file ApqpSelectModal.tsx
 * @description APQP 선택 플로팅 윈도우 (공통 컴포넌트)
 * @usage PFMEA, DFMEA, CP 등에서 상위 APQP 선택
 */

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

export interface ApqpItem {
  apqpNo: string;
  subject: string;
  customerName?: string;
}

interface ApqpSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (apqpNo: string) => void;
  apqps: ApqpItem[];
}

export function ApqpSelectModal({
  isOpen,
  onClose,
  onSelect,
  apqps,
}: ApqpSelectModalProps) {
  const [search, setSearch] = useState('');
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 500, height: 500, minWidth: 380, minHeight: 300
  });

  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = apqps.filter(a =>
    a.apqpNo.toLowerCase().includes(search.toLowerCase()) ||
    a.subject.toLowerCase().includes(search.toLowerCase()) ||
    (a.customerName || '').toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* 헤더 */}
      <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between cursor-move shrink-0 rounded-t-lg" onMouseDown={onDragStart}>
        <h2 className="font-bold" title="Select APQP">📋 APQP 선택(Select APQP)</h2>
        <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className="text-white/70 hover:text-white text-xl">✕</button>
      </div>

      {/* 검색 */}
      <div className="p-3 border-b bg-gray-50 shrink-0">
        <input
          type="text"
          placeholder="APQP No 또는 이름으로 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:border-green-500"
        />
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-2xl">📭</span>
            <p className="mt-2 text-sm">
              {apqps.length === 0 ? '등록된 APQP가 없습니다' : '검색 결과가 없습니다'}
            </p>
          </div>
        ) : (
          filtered.map((apqp, idx) => (
            <div
              key={apqp.apqpNo}
              onClick={() => { onSelect(apqp.apqpNo); onClose(); }}
              className={`px-4 py-3 border-b cursor-pointer hover:bg-green-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-green-600">{apqp.apqpNo}</div>
                  <div className="text-xs text-gray-600">{apqp.subject || '(이름 없음)'}</div>
                </div>
                <span className="text-xs text-gray-500">{apqp.customerName}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 푸터 */}
      <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-t shrink-0 rounded-b-lg">
        <span className="text-xs text-gray-500">총 {filtered.length}개</span>
        <button onClick={onClose} className="px-4 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">
          닫기
        </button>
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

export default ApqpSelectModal;
