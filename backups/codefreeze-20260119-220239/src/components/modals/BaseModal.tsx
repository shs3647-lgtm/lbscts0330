'use client';

import React, { ReactNode, useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
 * 드래그 이동 지원
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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // 드래그 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2
      };
      setIsDragging(true);
    }
  }, []);

  // 드래그 중
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - window.innerWidth / 2 - dragOffset.current.x;
      const newY = e.clientY - window.innerHeight / 2 - dragOffset.current.y;
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  // 드래그 종료
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 마우스 이벤트 리스너
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 모달 열릴 때 위치 초기화
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        style={{ 
          width, 
          maxHeight: '90vh',
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 - 드래그 핸들 */}
        <div 
          className="px-4 py-3 flex items-center justify-between select-none cursor-grab"
          style={{ background: headerColor }}
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-white font-bold flex items-center gap-2 text-sm sm:text-base">
            {icon && <span>{icon}</span>}
            <span className="flex items-center gap-2">
              <span className="text-white/60 text-xs">⋮⋮</span>
              {title}
            </span>
          </h2>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 탭 네비게이션 */}
        {tabs && tabs.length > 0 && (
          <div className="flex border-b bg-gray-50/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
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
        <div className="px-4 py-3 border-t flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            {footerContent}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-bold border rounded-md hover:bg-gray-100 transition-colors bg-white text-gray-700"
            >
              취소
            </button>
            {onSave && (
              <button 
                onClick={onSave}
                disabled={saveDisabled}
                className={`px-6 py-2 text-sm font-bold text-white rounded-md transition-all shadow-sm ${
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
      </div>
    </div>,
    document.body
  );
}
