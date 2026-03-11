'use client';

import { usePathname } from 'next/navigation';

/**
 * @file CommonTopNav.tsx
 * @description 공통 상단 네비게이션 바 (반응형)
 * - APQP, FMEA, CP, PFD, WS, PM 모든 모듈에서 사용
 * - 화면 크기에 따라 자동 조정
 * 
 * @version 1.0.0
 */

export interface TopNavMenuItem {
  label: string;
  path: string;
  icon: string;
  shortLabel?: string; // 작은 화면용 짧은 레이블
}

export interface TopNavStatItem {
  label: string;
  value: number | string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';
}

export interface CommonTopNavProps {
  title: string;
  menuItems: TopNavMenuItem[];
  statItems?: TopNavStatItem[];
  statLabel?: string;
  selectedId?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

const STAT_COLORS = {
  red: 'text-red-400',
  orange: 'text-orange-300',
  yellow: 'text-yellow-400',
  green: 'text-green-300',
  blue: 'text-blue-300',
  purple: 'text-purple-300',
  gray: 'text-gray-300',
};

export default function CommonTopNav({
  title,
  menuItems,
  statItems = [],
  statLabel = '상태:',
  selectedId,
  gradientFrom = '#1a237e',
  gradientTo = '#283593',
}: CommonTopNavProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname?.startsWith(path);

  const handleNavigation = (path: string) => {
    if (selectedId) {
      window.location.href = `${path}?id=${selectedId}`;
    } else {
      window.location.href = path;
    }
  };

  return (
    <div
      className="fixed top-0 left-[53px] right-0 z-[100] flex items-center h-8 border-b border-white/20"
      style={{ background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo}, ${gradientFrom})` }}
    >
      {/* 바로가기 레이블 - 작은 화면에서 숨김 */}
      <div className="hidden sm:flex px-2 lg:px-3 text-white/80 text-[10px] lg:text-[11px] font-semibold border-r border-white/20 h-full items-center shrink-0">
        바로가기
      </div>

      {/* 메뉴 항목들 - 반응형 */}
      <div className="flex items-center h-full overflow-x-auto scrollbar-hide flex-1">
        {menuItems.map((item, index) => (
          <button
            key={item.path}
            onClick={() => handleNavigation(item.path)}
            className={`
              px-2 sm:px-3 lg:px-4 h-full text-white border-none cursor-pointer 
              text-[10px] sm:text-[11px] lg:text-xs 
              flex items-center gap-1 lg:gap-1.5 
              transition-all duration-200 whitespace-nowrap shrink-0
              ${isActive(item.path) ? 'bg-white/15 font-semibold' : 'bg-transparent font-normal hover:bg-white/10'}
              ${index < menuItems.length - 1 ? 'border-r border-white/15' : ''}
            `}
            title={item.label}
          >
            <span>{item.icon}</span>
            {/* 작은 화면: shortLabel 또는 숨김, 큰 화면: 전체 레이블 */}
            <span className="hidden sm:inline lg:hidden">{item.shortLabel || item.label}</span>
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {/* 우측 통계 영역 - 반응형 */}
      {statItems.length > 0 && (
        <div
          className="h-8 flex items-stretch border-l-2 border-white shrink-0"
          style={{ background: 'linear-gradient(to right, #0d47a1, #1565c0)' }}
        >
          {/* 레이블 - 큰 화면에서만 표시 */}
          <div className="hidden lg:flex w-[60px] xl:w-[80px] h-8 items-center justify-center border-r border-white/30 shrink-0">
            <span className="text-yellow-400 text-[10px] xl:text-xs font-bold whitespace-nowrap">{statLabel}</span>
          </div>
          
          {/* 통계 값들 */}
          {statItems.map((stat, index) => (
            <div
              key={stat.label}
              className={`
                w-[50px] sm:w-[60px] lg:w-[66px] h-8 
                flex items-center justify-center shrink-0
                ${index < statItems.length - 1 ? 'border-r border-white/30' : ''}
              `}
            >
              <span className={`text-[9px] sm:text-[10px] lg:text-xs font-semibold whitespace-nowrap ${STAT_COLORS[stat.color]}`}>
                <span className="hidden sm:inline">{stat.label}:</span>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


















