// CODEFREEZE
/**
 * @file useFloatingWindow.ts
 * @description 비모달 플로팅 윈도우 공용 훅
 * 드래그 이동 + 리사이즈 + 화면 중앙 초기 배치
 *
 * @usage
 * const { pos, size, onDragStart, onResizeStart, resizeHandle } = useFloatingWindow({
 *   isOpen, width: 600, height: 400, minWidth: 400, minHeight: 280
 * });
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseFloatingWindowOptions {
  isOpen: boolean;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  /** 초기 Y 오프셋 (기본: 자동 중앙) */
  initialY?: number;
}

interface FloatingWindowResult {
  pos: { x: number; y: number };
  size: { w: number; h: number };
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
}

export function useFloatingWindow({
  isOpen,
  width = 600,
  height = 400,
  minWidth = 400,
  minHeight = 280,
  initialY,
}: UseFloatingWindowOptions): FloatingWindowResult {
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [size, setSize] = useState({ w: width, h: height });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  // 열릴 때 화면 중앙 배치
  useEffect(() => {
    if (isOpen) {
      const cx = Math.max(0, Math.round((window.innerWidth - width) / 2));
      const cy = initialY ?? Math.max(30, Math.round((window.innerHeight - height) / 2 - 30));
      setPos({ x: cx, y: cy });
      setSize({ w: width, h: height });
    }
  }, [isOpen, width, height, initialY]);

  // 드래그
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
        y: Math.max(0, dragRef.current.origY + (ev.clientY - dragRef.current.startY)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pos]);

  // 리사이즈
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      setSize({
        w: Math.max(minWidth, resizeRef.current.origW + (ev.clientX - resizeRef.current.startX)),
        h: Math.max(minHeight, resizeRef.current.origH + (ev.clientY - resizeRef.current.startY)),
      });
    };
    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [size, minWidth, minHeight]);

  return { pos, size, onDragStart, onResizeStart };
}

/** 리사이즈 핸들 SVG (우하단) - JSX로 직접 사용 */
export const RESIZE_HANDLE_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" class="text-gray-400 opacity-60"><path d="M12 2v10H2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 6v6H6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
