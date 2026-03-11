/**
 * @file Header.tsx
 * @description L1 헤더 컴포넌트 (로고, 시스템명, 현재 모듈, 알림/설정/프로필)
 * @author AI Assistant
 * @created 2025-12-25
 * @version 1.0.0
 * 
 * @usage
 * <Header currentModule="P-FMEA" />
 */

'use client';

import { Bell, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  /** 현재 모듈명 (예: "P-FMEA", "D-FMEA", "PFD", "CP") */
  currentModule?: string;
}

/**
 * 헤더 컴포넌트 (L1)
 * 
 * @description
 * 상단 고정 헤더로, 시스템 로고, 현재 모듈명, 알림/설정/프로필 아이콘을 표시합니다.
 * 높이: 48px
 */
export function Header({ currentModule = 'Dashboard' }: HeaderProps) {
  return (
    <header className="fixed top-0 left-12 right-0 z-40 h-12 bg-slate-800 border-b border-slate-700">
      <div className="flex h-full items-center justify-between px-4">
        {/* ======== 좌측: 시스템명 ======== */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">
            Smart System
          </h1>
        </div>

        {/* ======== 중앙: 현재 모듈명 ======== */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-xl font-bold text-blue-400">
            {currentModule}
          </span>
        </div>

        {/* ======== 우측: 알림/설정/프로필 ======== */}
        <div className="flex items-center gap-2">
          {/* 알림 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Bell className="h-5 w-5" />
          </Button>

          {/* 설정 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* 프로필 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                프로필
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                설정
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500">
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default Header;



