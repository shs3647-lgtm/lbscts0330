'use client';
// CODEFREEZE

import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from './useFloatingWindow';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  headerColor?: string;
  width?: string;
  tabs?: { id: string; label: string; icon?: string }[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  footerContent?: ReactNode;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  children: ReactNode;
}

/**
 * 프로젝트 전체 모달 표준화를 위한 베이스 컴포넌트
 * 비모달 플로팅 윈도우 (드래그 이동 + 리사이즈)
 */
export default function BaseModal({
  isOpen,
  onClose,
  title,
  icon,
  headerColor = '#2b78c5',
  width = '600px',
  tabs,
  activeTab,
  onTabChange,
  footerContent,
  onSave,
  saveDisabled = false,
  saveLabel = '저장',
  children,
}: BaseModalProps) {
  const [mounted, setMounted] = useState(false);
  const numWidth = parseInt(width) || 600;
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: numWidth, height: 500, minWidth: 400, minHeight: 300
  });

  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* 헤더 - 드래그 핸들 */}
      <div
        className="px-4 py-2 flex items-center justify-between select-none cursor-move shrink-0"
        style={{ background: headerColor }}
        onMouseDown={onDragStart}
      >
        <h2 className="text-white font-bold flex items-center gap-2 text-sm">
          {icon && <span>{icon}</span>}
          <span className="flex items-center gap-2">
            <span className="text-white/60 text-xs">⋮⋮</span>
            {title}
          </span>
        </h2>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="text-white hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      {/* 탭 네비게이션 */}
      {tabs && tabs.length > 0 && (
        <div className="flex border-b bg-gray-50/50 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`flex-1 px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border-blue-500'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 본문 콘텐츠 */}
      <div className="flex-1 overflow-auto flex flex-col">
        {children}
      </div>

      {/* 푸터 */}
      <div className="px-4 py-2 border-t flex items-center justify-between bg-gray-50/80 shrink-0">
        <div className="flex items-center gap-3">
          {footerContent}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-bold border rounded-md hover:bg-gray-100 transition-colors bg-white text-gray-700"
          >
            취소
          </button>
          {onSave && (
            <button
              onClick={onSave}
              disabled={saveDisabled}
              className={`px-6 py-1.5 text-sm font-bold text-white rounded-md transition-all shadow-sm ${
                saveDisabled
                  ? 'bg-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {saveLabel}
            </button>
          )}
        </div>
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
