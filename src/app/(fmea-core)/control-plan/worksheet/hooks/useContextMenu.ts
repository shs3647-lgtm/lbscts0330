/**
 * @file hooks/useContextMenu.ts
 * @description 컨텍스트 메뉴 상태 관리 훅
 */

import { useState, useCallback } from 'react';
import { ContextMenuState, ContextMenuType } from '../types';

const initialState: ContextMenuState = {
  visible: false,
  x: 0,
  y: 0,
  rowIdx: -1,
  type: 'process',
};

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(initialState);
  
  // 컨텍스트 메뉴 열기
  const openContextMenu = useCallback((
    e: React.MouseEvent, 
    rowIdx: number, 
    type: ContextMenuType,
    colKey?: string
  ) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIdx,
      type,
      colKey,
    });
  }, []);
  
  // 컨텍스트 메뉴 닫기
  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);
  
  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
  };
}



