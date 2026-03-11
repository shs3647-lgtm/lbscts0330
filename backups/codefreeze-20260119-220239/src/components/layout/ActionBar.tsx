/**
 * @file ActionBar.tsx
 * @description L3 액션바 (저장/열기/검색 버튼)
 * @author AI Assistant
 * @created 2025-12-25
 * @version 1.0.0
 */

'use client';

import { Save, FolderOpen, FileDown, FileUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ActionBarProps {
  /** 저장 버튼 클릭 핸들러 */
  onSave?: () => void;
  /** 열기 버튼 클릭 핸들러 */
  onOpen?: () => void;
  /** 액션 저장 클릭 핸들러 */
  onActionSave?: () => void;
  /** 액션 열기 클릭 핸들러 */
  onActionOpen?: () => void;
  /** 검색 핸들러 */
  onSearch?: (query: string) => void;
}

/**
 * 액션바 컴포넌트 (L3)
 * 
 * @description
 * 저장, 열기, 액션 저장/열기 버튼과 검색창을 표시합니다.
 * 높이: 36px
 */
export function ActionBar({
  onSave,
  onOpen,
  onActionSave,
  onActionOpen,
  onSearch,
}: ActionBarProps) {
  return (
    <div className="fixed top-[88px] left-12 right-0 z-20 h-9 bg-white border-b border-gray-200">
      <div className="flex h-full items-center justify-between px-4">
        {/* ======== 좌측: 버튼 그룹 ======== */}
        <div className="flex items-center gap-2">
          {/* 저장 버튼 */}
          <Button
            size="sm"
            className="h-7 bg-blue-500 hover:bg-blue-600 text-white"
            onClick={onSave}
          >
            <Save className="h-4 w-4 mr-1" />
            저장
          </Button>

          {/* 열기 버튼 */}
          <Button
            size="sm"
            className="h-7 bg-green-500 hover:bg-green-600 text-white"
            onClick={onOpen}
          >
            <FolderOpen className="h-4 w-4 mr-1" />
            열기
          </Button>

          {/* 액션 저장 버튼 */}
          <Button
            size="sm"
            className="h-7 bg-orange-500 hover:bg-orange-600 text-white"
            onClick={onActionSave}
          >
            <FileDown className="h-4 w-4 mr-1" />
            액션저장
          </Button>

          {/* 액션 열기 버튼 */}
          <Button
            size="sm"
            className="h-7 bg-purple-500 hover:bg-purple-600 text-white"
            onClick={onActionOpen}
          >
            <FileUp className="h-4 w-4 mr-1" />
            액션열기
          </Button>
        </div>

        {/* ======== 우측: 검색 ======== */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="검색..."
              className="h-7 w-64 pl-8 text-sm"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActionBar;



