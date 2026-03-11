'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';

interface OrderArrowsProps {
  color?: string;
  size?: number;
  draggable?: boolean;
}

/**
 * 순서 변경 화살표 컴포넌트
 */
export function OrderArrows({ color = '#ccc', size = 10, draggable = false }: OrderArrowsProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-0 ${draggable ? 'cursor-grab' : 'cursor-default'}`}>
      <ChevronUp size={size} color={color} />
      <ChevronDown size={size} color={color} />
    </div>
  );
}








