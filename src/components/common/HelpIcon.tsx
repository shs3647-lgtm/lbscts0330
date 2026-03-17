/**
 * @file HelpIcon.tsx
 * @description 표준 도움말 버튼 컴포넌트 — 드래그 가능 팝업
 *
 * @usage
 * <HelpIcon title="삭제 도움말">
 *   <p>도움말 내용</p>
 * </HelpIcon>
 *
 * @version 3.0.0
 * @created 2026-02-16
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface HelpIconProps {
  children: React.ReactNode;
  /** 팝업 너비 (px) - 기본 400 */
  popoverWidth?: number;
  /** 팝업 제목 */
  title?: string;
  /** 버튼 크기 (기본 20) */
  size?: number;
  /** true면 작은 원형 ? 아이콘 (제목 옆 등에 사용) */
  compact?: boolean;
  /** compact 모드 아이콘 지름 (px, 기본 18) */
  iconSize?: number;
}

export default function HelpIcon({
  children,
  popoverWidth = 400,
  title = '도움말',
  compact = false,
  iconSize = 18,
}: HelpIconProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // 팝업 열 때 버튼 기준 초기 위치 계산
  const handleOpen = useCallback(() => {
    setOpen(v => {
      if (!v && btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        const x = Math.min(rect.left, window.innerWidth - popoverWidth - 16);
        const y = rect.bottom + 8;
        setPos({ x: Math.max(8, x), y: Math.min(y, window.innerHeight - 300) });
      }
      return !v;
    });
  }, [popoverWidth]);

  // 드래그 시작
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (!pos) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({
        x: Math.max(0, Math.min(dragRef.current.origX + dx, window.innerWidth - 100)),
        y: Math.max(0, Math.min(dragRef.current.origY + dy, window.innerHeight - 40)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      {compact ? (
        <button
          ref={btnRef}
          onClick={handleOpen}
          title={title}
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: '50%',
            border: '1.5px solid #9ca3af',
            backgroundColor: open ? '#0c4a6e' : 'transparent',
            color: open ? '#fff' : '#6b7280',
            fontSize: Math.round(iconSize * 0.6),
            fontWeight: 700,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
            flexShrink: 0,
            padding: 0,
          }}
          onMouseEnter={e => {
            if (!open) { e.currentTarget.style.borderColor = '#0c4a6e'; e.currentTarget.style.color = '#0c4a6e'; }
          }}
          onMouseLeave={e => {
            if (!open) { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.color = '#6b7280'; }
          }}
        >
          ?
        </button>
      ) : (
        <button
          ref={btnRef}
          onClick={handleOpen}
          title={title}
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            border: '1px solid #d97706',
            backgroundColor: open ? '#d97706' : '#fbbf24',
            color: open ? '#fff' : '#78350f',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: '16px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = open ? '#b45309' : '#f59e0b'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = open ? '#d97706' : '#fbbf24'; }}
        >
          도움말
        </button>
      )}

      {/* 드래그 가능 팝업 (fixed) */}
      {open && pos && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            width: popoverWidth,
            backgroundColor: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
            zIndex: 99999,
            fontFamily: 'Malgun Gothic, sans-serif',
            animation: 'helpicon-pop 0.12s ease-out',
            overflow: 'hidden',
          }}
        >
          {/* 드래그 가능 헤더 */}
          <div
            onMouseDown={onDragStart}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              backgroundColor: '#f0f9ff',
              borderBottom: '1px solid #e2e8f0',
              cursor: 'move',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, color: '#0c4a6e' }}>&#9432;</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#0c4a6e' }}>{title}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
                color: '#9ca3af',
                padding: '0 2px',
                lineHeight: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            >
              &times;
            </button>
          </div>
          {/* 내용 (스크롤 가능) */}
          <div style={{ padding: '12px 16px', fontSize: 12, lineHeight: 1.8, color: '#374151', maxHeight: 420, overflowY: 'auto' }}>
            {children}
          </div>

          <style>{`
            @keyframes helpicon-pop {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
