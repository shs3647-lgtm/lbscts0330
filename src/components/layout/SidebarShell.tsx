/**
 * @file SidebarShell.tsx
 * @description 사이드바 공유 인프라 — 아이콘, 쉘, 렌더링 로직
 * 가족별 사이드바 (FmeaSidebar, PlanningSidebar, OperationsSidebar)가 이 컴포넌트를 사용
 * @created 2026-02-27
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/locale';
import CompanyLogo from '@/components/CompanyLogo';

// ─── 타입 ───

export interface SubItem {
  label: string;
  href: string;
  /** true면 한글\n(English) 2줄, false/undefined면 한글(English) 1줄 */
  multiline?: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string; photoSrc?: string }>;
  href: string;
  subItems?: SubItem[];
}

// ─── 컬러 아이콘 SVG ───

export const ColorIcons = {
  Dashboard: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="8" r="6" fill="#FF6B35" />
      <circle cx="16" cy="16" r="6" fill="#FF4444" />
    </svg>
  ),
  Worksheet: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="12" width="4" height="10" rx="1" fill="#E91E8C" />
      <rect x="8" y="8" width="4" height="14" rx="1" fill="#E91E8C" opacity="0.7" />
      <rect x="14" y="4" width="4" height="18" rx="1" fill="#E91E8C" opacity="0.5" />
      <rect x="20" y="10" width="4" height="12" rx="1" fill="#E91E8C" opacity="0.3" />
    </svg>
  ),
  Register: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h10" stroke="#4DD0E1" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="18" r="3" fill="#4DD0E1" />
    </svg>
  ),
  List: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="#26C6DA" />
    </svg>
  ),
  CFT: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#F48FB1" opacity="0.3" />
      <path d="M8 12L11 15L17 9" stroke="#E91E8C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Revision: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="#9575CD" opacity="0.3" />
      <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="#7E57C2" strokeWidth="1.5" />
      <path d="M12 22V12M12 12L4 7M12 12L20 7" stroke="#7E57C2" strokeWidth="1.5" />
    </svg>
  ),
  Settings: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill="#4DD0E1" />
      <path d="M12 1V3M12 21V23M23 12H21M3 12H1M20.5 3.5L19 5M5 19L3.5 20.5M20.5 20.5L19 19M5 5L3.5 3.5"
        stroke="#4DD0E1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Maintenance: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        fill="#26A69A" opacity="0.3" stroke="#00897B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="6" r="2" fill="#00897B" opacity="0.5" />
    </svg>
  ),
  User: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill="#FF8A65" />
      <path d="M4 20C4 16.6863 7.13401 14 12 14C16.866 14 20 16.6863 20 20"
        stroke="#FF8A65" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  Person: ({ className, photoSrc }: { className?: string; photoSrc?: string }) => (
    photoSrc ? (
      <img src={photoSrc} alt="User" className={cn(className, "rounded-full object-cover")} />
    ) : (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="personGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#personGrad)" />
        <circle cx="12" cy="10" r="5" fill="white" />
        <path d="M4 21C4 17 7 14 12 14C17 14 20 17 20 21" fill="white" />
      </svg>
    )
  ),
  Admin: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" fill="#FF5722" opacity="0.3" />
      <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" stroke="#E64A19" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="3" fill="#E64A19" />
      <path d="M8 16C8 14.3431 9.79086 13 12 13C14.2091 13 16 14.3431 16 16" stroke="#E64A19" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

// LocalStorage 키
const USER_PHOTO_STORAGE_KEY = 'fmea_user_photo';

// ─── 2줄 한글/영문 분리 렌더러 ───
// "나의 업무현황(My Tasks)" → 1줄: 나의 업무현황, 2줄: (My Tasks)
const BILINGUAL_RE = /^([\p{Emoji_Presentation}\p{Emoji}\u200d\ufe0f]*\s*)?(.+?)\(([^)]+)\)$/u;

function BilingualLabel({ text, className, multiline = false }: { text: string; className?: string; multiline?: boolean }) {
  const m = text.match(BILINGUAL_RE);
  if (!m) return <span className={className}>{text}</span>;
  const emoji = (m[1] || '').trim();
  const main = m[2].trim();
  const sub = m[3].trim();
  const displayMain = emoji ? `${emoji} ${main}` : main;
  if (!multiline) {
    return <span className={cn(className, 'truncate')}>{displayMain}({sub})</span>;
  }
  return (
    <span className={cn(className, 'flex flex-col leading-tight')}>
      <span className="truncate">{displayMain}</span>
      <span className="text-[8px] opacity-60 truncate">({sub})</span>
    </span>
  );
}

// ─── SidebarShell 컴포넌트 ───

interface SidebarShellProps {
  mainMenuItems: MenuItem[];
  bottomMenuItems?: MenuItem[];
  adminMenuItems?: MenuItem[];
}

export const SidebarShell = React.memo(function SidebarShell({
  mainMenuItems,
  bottomMenuItems = [],
  adminMenuItems = [],
}: SidebarShellProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 초기 로드
  useEffect(() => {
    const savedPin = localStorage.getItem('sidebar-pinned');
    if (savedPin === 'true') setIsPinned(true);

    const loadUserInfo = async () => {
      const session = localStorage.getItem('user_session');
      if (session) {
        try {
          const user = JSON.parse(session);
          setUserRole(user.role);
          let photo = user.photoUrl || localStorage.getItem(USER_PHOTO_STORAGE_KEY);
          if (!photo && user.id) {
            try {
              const res = await fetch(`/api/admin/users?id=${user.id}`);
              if (res.ok) {
                const data = await res.json();
                if (data.user?.photoUrl) {
                  photo = data.user.photoUrl;
                  localStorage.setItem('user_session', JSON.stringify({ ...user, photoUrl: photo }));
                }
              }
            } catch (e) { console.error('[사용자 세션 로드] 오류:', e); }
          }
          if (photo) {
            setUserPhoto(photo);
            localStorage.setItem(USER_PHOTO_STORAGE_KEY, photo);
          }
        } catch (e) { console.error('Failed to parse user session', e); }
      } else {
        const savedPhoto = localStorage.getItem(USER_PHOTO_STORAGE_KEY);
        if (savedPhoto) setUserPhoto(savedPhoto);
      }
    };
    loadUserInfo();
  }, []);

  // 타이머 정리
  useEffect(() => {
    return () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); };
  }, []);

  // 경로 기반 메뉴 자동 확장
  useEffect(() => {
    if (!pathname) return;
    const allMenus = [...mainMenuItems, ...bottomMenuItems, ...adminMenuItems];
    for (const menu of allMenus) {
      if (menu.subItems?.some(sub => pathname.startsWith(sub.href))) {
        setExpandedMenuId(menu.id);
        break;
      }
    }
  }, [pathname, mainMenuItems, bottomMenuItems, adminMenuItems]);

  const isExpanded = isPinned || isHovered;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebar-resize', { detail: { width: isExpanded ? 160 : 48 } }));
  }, [isExpanded]);

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    localStorage.setItem('sidebar-pinned', newPinned ? 'true' : 'false');
    if (!newPinned) setExpandedMenuId(null);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sidebar-resize', { detail: { width: newPinned ? 154 : 48 } }));
    }, 50);
  };

  const isActive = (href: string) => {
    if (href === '/' && pathname !== '/') return false;
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const handleItemClick = (itemId: string, hasSubItems: boolean) => {
    if (hasSubItems && isExpanded) {
      setExpandedMenuId(expandedMenuId === itemId ? null : itemId);
    }
  };

  const renderMenuItems = (items: MenuItem[], photoSrc?: string | null) => {
    return items.map((item) => {
      const Icon = item.Icon;
      const active = isActive(item.href);
      const hasSubItems = item.subItems && item.subItems.length > 0;
      const isMenuExpanded = expandedMenuId === item.id;
      const showLabels = isExpanded;
      const isMyJob = item.id === 'myjob';

      return (
        <div key={item.id} className="mb-0">
          <Link
            href={hasSubItems && showLabels ? '#' : item.href}
            onClick={(e) => {
              if (hasSubItems && showLabels) { e.preventDefault(); handleItemClick(item.id, true); }
            }}
            className={cn(
              'flex gap-2 px-2 mx-0 rounded relative group transition-all duration-200',
              !showLabels && isMyJob ? 'flex-col items-center justify-center h-auto py-1' : 'items-center h-7',
              active && 'bg-white/10 shadow-lg',
              !active && 'hover:bg-white/5'
            )}
            title={!showLabels ? t(item.label) : undefined}
          >
            <div className={cn(
              "flex-shrink-0 flex items-center justify-center",
              !showLabels && !isMyJob ? "flex-row gap-0.5" : "",
              isMyJob && photoSrc && showLabels ? "w-5 h-5 rounded-full overflow-hidden" : ""
            )}>
              {!showLabels && !isMyJob && (
                <span className="text-[8px] font-bold text-cyan-300 leading-none">{item.shortLabel}</span>
              )}
              {isMyJob ? (
                <div className={cn(photoSrc ? "rounded-full overflow-hidden" : "")}>
                  <ColorIcons.Person className={cn(showLabels ? "w-5 h-5" : "w-6 h-6")} photoSrc={photoSrc || undefined} />
                </div>
              ) : (
                <Icon className={cn(showLabels ? "w-4 h-4" : "w-4 h-4")} />
              )}
            </div>
            {!showLabels && isMyJob && (
              <span className="text-[7px] font-bold text-cyan-300 leading-none">{item.shortLabel}</span>
            )}
            <span className={cn(
              'text-[10px] font-semibold text-white/90 transition-all duration-200 overflow-hidden',
              showLabels ? 'opacity-100' : 'opacity-0 w-0'
            )}>
              <BilingualLabel text={t(item.label)} />
            </span>
            {!showLabels && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[10000]">
                {t(item.label)}
              </div>
            )}
            {hasSubItems && showLabels && (
              <svg className={cn('ml-auto w-3 h-3 text-white/60 transition-transform duration-200', isMenuExpanded && 'rotate-90')}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </Link>

          {hasSubItems && showLabels && isMenuExpanded && (
            <div className="ml-7 mt-0.5 space-y-0">
              {item.subItems?.map((subItem) => {
                const translated = t(subItem.label);
                const needsFullReload = subItem.href.includes('/worksheet')
                  || subItem.href.includes('/lld')
                  || subItem.href.includes('/ap-improvement')
                  || subItem.href.includes('/dashboard');

                const cls = cn(
                  'flex items-start px-2 py-0.5 rounded text-[10px] w-full text-left transition-colors duration-200',
                  isActive(subItem.href) ? 'text-cyan-300 bg-cyan-500/20 font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'
                );

                if (needsFullReload) {
                  return (
                    <button key={subItem.href} onClick={() => window.location.href = subItem.href}
                      className={cls} title={translated}>
                      <BilingualLabel text={translated} multiline={subItem.multiline} />
                    </button>
                  );
                }
                return (
                  <Link key={subItem.href} href={subItem.href}
                    className={cls} title={translated}>
                    <BilingualLabel text={translated} multiline={subItem.multiline} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen',
        'bg-gradient-to-b from-[#1a237e] via-[#283593] to-[#1a237e]',
        'flex flex-col transition-all duration-300 ease-in-out shadow-xl',
        isExpanded ? 'w-[160px]' : 'w-12',
        'z-[100000]'
      )}
      onMouseEnter={() => {
        if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
        hoverTimerRef.current = setTimeout(() => setIsHovered(true), 100);
      }}
      onMouseLeave={() => {
        if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
        hoverTimerRef.current = setTimeout(() => {
          setIsHovered(false);
          if (!isPinned) setExpandedMenuId(null);
        }, 400);
      }}
    >
      {/* 회사 로고 */}
      <div className="relative flex items-center justify-center border-b border-white/10 py-2">
        <CompanyLogo width={isExpanded ? 120 : 32} height={isExpanded ? 32 : 32} />
        {isExpanded && (
          <button onClick={togglePin}
            className="text-white/50 hover:text-white transition-colors absolute right-1 top-2"
            title={isPinned ? t('사이드바 접기') : t('사이드바 펼치기')}>
            {isPinned ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* 메인 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-0 scrollbar-hide flex flex-col">
        {renderMenuItems(mainMenuItems, userPhoto)}
      </nav>

      {/* 구분선 */}
      <div className="mx-2 border-t border-white/10" />

      {/* 하단 메뉴 */}
      <nav className="py-0 flex flex-col">
        {userRole === 'admin' && renderMenuItems(adminMenuItems)}
        {renderMenuItems(bottomMenuItems)}
      </nav>

      {/* 한/영 토글 → CommonTopNav로 이동 */}
    </aside>
  );
});

SidebarShell.displayName = 'SidebarShell';
export default SidebarShell;
