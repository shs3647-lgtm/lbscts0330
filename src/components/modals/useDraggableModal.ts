'use client';

import { useCallback, useEffect, useState } from 'react';

interface Position {
  top: number;
  right: number;
}

interface DraggableOptions {
  initialPosition?: Position;
  modalWidth?: number;
  modalHeight?: number;
  isOpen?: boolean;
}

export function useDraggableModal(options: DraggableOptions = {}) {
  const {
    initialPosition = { top: 200, right: 0 },
    modalWidth = 350,
    modalHeight = 200,
    isOpen,
  } = options;

  const initialTop = initialPosition.top;
  const initialRight = initialPosition.right;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState<Position>(initialPosition);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPosition(prev => ({
        top: Math.max(0, Math.min(window.innerHeight - modalHeight, prev.top + deltaY)),
        right: Math.max(-modalWidth, Math.min(window.innerWidth - modalWidth, prev.right - deltaX)),
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, modalHeight, modalWidth]);

  useEffect(() => {
    if (isOpen) {
      setPosition({ top: initialTop, right: initialRight });
    }
  }, [isOpen, initialTop, initialRight]);

  return { position, setPosition, isDragging, handleMouseDown };
}
