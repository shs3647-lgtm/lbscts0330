// CODEFREEZE
/**
 * @file DocSelectModals.tsx
 * @description FMEA/CP/PFD/APQP 선택 모달 컴포넌트
 */

'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface ListItem {
  id: string;
  subject: string;
  type: string;
}

// =====================================================
// FMEA 선택 모달 (PFMEA/DFMEA 공용)
// =====================================================
export function FmeaSelectModal({ isOpen, target, list, onSelect, onClose }: {
  isOpen: boolean;
  target: 'P' | 'D';
  list: ListItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 600, height: 450, minWidth: 400, minHeight: 300 });

  if (!isOpen) return null;
  const isDfmea = target === 'D';
  const bgClass = isDfmea ? 'bg-indigo-600' : 'bg-yellow-600';
  const btnClass = isDfmea ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-yellow-500 hover:bg-yellow-600';

  return typeof document === 'undefined' ? null : createPortal(
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      <div className={`flex items-center justify-between px-4 py-2 ${bgClass} text-white rounded-t-lg cursor-move`} onMouseDown={onDragStart}>
        <h3 className="text-sm font-bold">{isDfmea ? '📋 DFMEA 선택' : '📋 PFMEA 선택'}</h3>
        <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {list.length === 0 ? <div className="text-center py-6 text-gray-500 text-xs">등록된 FMEA가 없습니다.</div> : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-100"><tr><th className="border px-2 py-1 w-24">ID</th><th className="border px-2 py-1 w-12">유형</th><th className="border px-2 py-1">FMEA명</th><th className="border px-2 py-1 w-16">선택</th></tr></thead>
            <tbody>
              {list.map((f, idx) => (
                <tr key={f.id} className={`hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="border px-2 py-1 text-center font-mono text-blue-600">{f.id}</td>
                  <td className="border px-2 py-1 text-center"><span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${f.type === 'm' ? 'bg-purple-500' : f.type === 'f' ? 'bg-blue-500' : 'bg-green-500'}`}>{f.type.toUpperCase()}</span></td>
                  <td className="border px-2 py-1">{f.subject}</td>
                  <td className="border px-2 py-1 text-center"><button onClick={() => onSelect(f.id)} className={`px-2 py-0.5 text-white rounded text-[10px] ${btnClass}`}>선택</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-4 py-2 border-t bg-gray-50 flex justify-end"><button onClick={onClose} className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">닫기</button></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>, document.body);
}

// =====================================================
// CP 선택 모달
// =====================================================
export function CpSelectModal({ isOpen, list, onSelect, onClose }: {
  isOpen: boolean;
  list: ListItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 600, height: 450, minWidth: 400, minHeight: 300 });

  if (!isOpen) return null;
  return typeof document === 'undefined' ? null : createPortal(
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d9488] text-white rounded-t-lg cursor-move" onMouseDown={onDragStart}>
        <h3 className="text-sm font-bold">📋 하위 CP 선택</h3>
        <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {list.length === 0 ? <div className="text-center py-6 text-gray-500 text-xs">등록된 CP가 없습니다.</div> : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-100"><tr><th className="border px-2 py-1 w-24">ID</th><th className="border px-2 py-1 w-12">유형</th><th className="border px-2 py-1">CP명</th><th className="border px-2 py-1 w-16">선택</th></tr></thead>
            <tbody>
              {list.map((c, idx) => (
                <tr key={c.id} className={`hover:bg-teal-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="border px-2 py-1 text-center font-mono text-teal-600">{c.id}</td>
                  <td className="border px-2 py-1 text-center"><span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${c.type === 'm' ? 'bg-purple-500' : c.type === 'f' ? 'bg-blue-500' : 'bg-green-500'}`}>{c.type.toUpperCase()}</span></td>
                  <td className="border px-2 py-1">{c.subject}</td>
                  <td className="border px-2 py-1 text-center"><button onClick={() => onSelect(c.id)} className="px-2 py-0.5 bg-teal-500 text-white rounded text-[10px] hover:bg-teal-600">선택</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-4 py-2 border-t bg-gray-50 flex justify-end"><button onClick={onClose} className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">닫기</button></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>, document.body);
}

// =====================================================
// PFD 선택 모달
// =====================================================
export function PfdSelectModal({ isOpen, list, onSelect, onClose }: {
  isOpen: boolean;
  list: ListItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 600, height: 450, minWidth: 400, minHeight: 300 });

  if (!isOpen) return null;
  return typeof document === 'undefined' ? null : createPortal(
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      <div className="flex items-center justify-between px-4 py-2 bg-violet-600 text-white rounded-t-lg cursor-move" onMouseDown={onDragStart}>
        <h3 className="text-sm font-bold">📋 하위 PFD 선택</h3>
        <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {list.length === 0 ? <div className="text-center py-6 text-gray-500 text-xs">등록된 PFD가 없습니다.</div> : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-100"><tr><th className="border px-2 py-1 w-24">ID</th><th className="border px-2 py-1 w-12">유형</th><th className="border px-2 py-1">PFD명</th><th className="border px-2 py-1 w-16">선택</th></tr></thead>
            <tbody>
              {list.map((p, idx) => (
                <tr key={p.id} className={`hover:bg-violet-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="border px-2 py-1 text-center font-mono text-violet-600">{p.id}</td>
                  <td className="border px-2 py-1 text-center"><span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${p.type === 'm' ? 'bg-purple-500' : p.type === 'f' ? 'bg-blue-500' : 'bg-green-500'}`}>{p.type.toUpperCase()}</span></td>
                  <td className="border px-2 py-1">{p.subject}</td>
                  <td className="border px-2 py-1 text-center"><button onClick={() => onSelect(p.id)} className="px-2 py-0.5 bg-violet-500 text-white rounded text-[10px] hover:bg-violet-600">선택</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-4 py-2 border-t bg-gray-50 flex justify-end"><button onClick={onClose} className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">닫기</button></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>, document.body);
}

// =====================================================
// APQP 선택 모달 (편집용)
// =====================================================
export function ApqpSelectModal({ isOpen, list, onSelect, onClose }: {
  isOpen: boolean;
  list: { id: string; subject: string }[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 600, height: 450, minWidth: 400, minHeight: 300 });

  if (!isOpen) return null;
  return typeof document === 'undefined' ? null : createPortal(
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      <div className="flex items-center justify-between px-4 py-2 bg-[#2563eb] text-white rounded-t-lg cursor-move" onMouseDown={onDragStart}>
        <h3 className="text-sm font-bold">📋 APQP 선택 (편집할 APQP)</h3>
        <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {list.length === 0 ? <div className="text-center py-6 text-gray-500 text-xs">등록된 APQP가 없습니다.</div> : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-100"><tr><th className="border px-2 py-1 w-28">ID</th><th className="border px-2 py-1">APQP명</th><th className="border px-2 py-1 w-16">선택</th></tr></thead>
            <tbody>
              {list.map((a, idx) => (
                <tr key={a.id} className={`hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="border px-2 py-1 text-center font-mono text-blue-600">{a.id}</td>
                  <td className="border px-2 py-1">{a.subject}</td>
                  <td className="border px-2 py-1 text-center"><button onClick={() => onSelect(a.id)} className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600">선택</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-4 py-2 border-t bg-gray-50 flex justify-end"><button onClick={onClose} className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">닫기</button></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>, document.body);
}
