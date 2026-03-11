/**
 * @file TopNav.tsx
 * @description L2 탑 네비게이션 (워크시트/등록/리스트/CFT/개정 탭)
 * @author AI Assistant
 * @created 2025-12-25
 * @version 1.0.0
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

// 탭 메뉴 정의
const tabs = [
  { id: 'worksheet', label: '워크시트', href: '/pfmea', color: 'bg-amber-500' },
  { id: 'register', label: '등록', href: '/project/register', color: 'bg-red-500' },
  { id: 'list', label: '리스트', href: '/project/list', color: 'bg-emerald-500' },
  { id: 'cft', label: 'CFT', href: '/project/cft', color: 'bg-purple-500' },
  { id: 'revision', label: '개정', href: '/project/revision', color: 'bg-cyan-500' },
];

/**
 * 탑 네비게이션 컴포넌트 (L2)
 * 
 * @description
 * 워크시트, 등록, 리스트, CFT, 개정 등의 탭 메뉴를 표시합니다.
 * 높이: 40px
 */
export function TopNav() {
  const pathname = usePathname();

  /**
   * 현재 경로가 탭과 일치하는지 확인
   */
  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href);
  };

  return (
    <nav className="fixed top-12 left-12 right-0 z-30 h-10 bg-gray-100 border-b border-gray-200">
      <div className="flex h-full items-center justify-between px-4">
        {/* ======== 좌측: 탭 메뉴 ======== */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md',
                'transition-colors duration-200',
                isActive(tab.href)
                  ? `${tab.color} text-white`
                  : 'text-gray-600 hover:bg-gray-200'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* ======== 우측: 드롭다운 메뉴 ======== */}
        <div className="flex items-center gap-2">
          {/* 기초정보 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-md">
              기초정보
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>PFMEA 임포트</DropdownMenuItem>
              <DropdownMenuItem>DFMEA 임포트</DropdownMenuItem>
              <DropdownMenuItem>CP 임포트</DropdownMenuItem>
              <DropdownMenuItem>BOM 임포트</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 사용자정보 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-md">
              사용자정보
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>내 정보</DropdownMenuItem>
              <DropdownMenuItem>설정</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

export default TopNav;



