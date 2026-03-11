/**
 * @file HelpPopup.tsx
 * @description 드래그 가능한 비활성(non-modal) 도움말 플로팅 윈도우
 * @created 2026-02-16
 * @CODEFREEZE 2026-02-16
 * 트리뷰 옆에 놓고 작업하면서 참고할 수 있는 독립 팝업
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TREE_HELP } from '../../panels/TreePanel/treeHelpContent';

interface HelpPopupProps {
  helpKey: string;
  onClose: () => void;
}

/** helpKey prefix → 색상 매핑 */
function getThemeColor(key: string): string {
  if (key.startsWith('function')) return '#388e3c';
  if (key.startsWith('failure')) return '#f57c00';
  return '#1976d2';
}

export function HelpPopup({ helpKey, onClose }: HelpPopupProps) {
  const help = TREE_HELP[helpKey];
  const color = getThemeColor(helpKey);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 초기 위치: 화면 우측 상단 (트리뷰 근처)
  useEffect(() => {
    setPos({ x: window.innerWidth - 400, y: 80 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!pos) return;
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleMouseUp = () => setDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  if (!help || !pos) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, width: 360, borderColor: color }}
      className="bg-white border-2 rounded-lg shadow-2xl"
      onWheel={(e) => e.stopPropagation()}
    >
      {/* 타이틀 바 (드래그 핸들) */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-3 py-1.5 text-white rounded-t-md cursor-move select-none"
        style={{ background: color }}
      >
        <span className="text-[12px] font-bold">{help.title} 도움말</span>
        <button
          type="button"
          onClick={onClose}
          className="text-white hover:text-yellow-200 font-bold text-[14px] px-1 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* 내용 */}
      <div className="p-3 max-h-[400px] overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
        <div className="text-[10px] text-gray-600 mb-2 leading-relaxed">{help.summary}</div>
        {help.sections.map((section, i) => (
          <div key={i} className="mb-2">
            <div className="text-[10px] font-bold text-blue-800 mb-0.5 border-b border-blue-200 pb-0.5">
              {section.label}
            </div>
            {section.items.map((item, j) => (
              <div key={j} className="text-[10px] text-gray-600 ml-1 leading-relaxed">
                • <b>{item.title}</b> — {item.desc}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 하단 안내 */}
      <div className="px-3 py-1 border-t border-gray-200 text-[9px] text-gray-400 text-center">
        타이틀 바를 드래그하여 이동 | ✕ 클릭으로 닫기
      </div>
    </div>,
    document.body
  );
}

export default HelpPopup;
