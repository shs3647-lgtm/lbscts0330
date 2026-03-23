'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface PanelResizerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWidthPercentChange: (leftPercent: number) => void;
  leftWidthPercent: number;
}

/** 좌측 패널 폭(%) — 드래그로 20~80% */
export function PanelResizer({ containerRef, onWidthPercentChange, leftWidthPercent }: PanelResizerProps) {
  const dragging = useRef(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      const startX = e.clientX;
      const startPct = leftWidthPercent;
      const container = containerRef.current;
      if (!container) return;
      const w = container.offsetWidth;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX;
        const next = startPct + (delta / w) * 100;
        onWidthPercentChange(Math.min(80, Math.max(20, next)));
      };

      const onUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [containerRef, leftWidthPercent, onWidthPercentChange],
  );

  useEffect(() => {
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('blur', onUp);
    return () => window.removeEventListener('blur', onUp);
  }, []);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="w-1 shrink-0 cursor-col-resize bg-slate-300 hover:bg-indigo-500 z-10"
      onMouseDown={onMouseDown}
    />
  );
}
