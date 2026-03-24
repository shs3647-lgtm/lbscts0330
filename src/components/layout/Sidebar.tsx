/**
 * @file Sidebar.tsx
 * @description 컬러 아이콘 사이드바 컴포넌트 (호버 시 확장)
 * @author AI Assistant
 * @created 2025-12-25
 * @version 2.1.0
 * 
 * ★★★ UI/UX 코드프리즈 - 2026-01-27 ★★★
 * - Zoom 1.25배 대응: h-7(28px), text-[10px], w-4 아이콘
 * - 레이아웃 구조: Link mx-0, nav flex-col (공백 제거)
 * 
 * ⚠️ 이 파일 수정 시 반드시 Zoom 환경에서의 간격 확인 필요
 * ⚠️ 무단 수정 금지 - 레이아웃 충돌 위험
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLocale, T } from '@/lib/locale';
import CompanyLogo from '@/components/CompanyLogo';
import { ColorIcons } from './SidebarShell';
import {
  FMEA_CORE_MAIN_MENU_ITEMS,
  FMEA_CORE_BOTTOM_MENU_ITEMS,
  FMEA_CORE_ADMIN_MENU_ITEMS,
} from './fmea-core-sidebar-menu';

// LocalStorage 키
const USER_PHOTO_STORAGE_KEY = 'fmea_user_photo';

/** FMEA Core 메뉴 — `fmea-core-sidebar-menu.tsx` 단일 소스 */
const menuItems = FMEA_CORE_MAIN_MENU_ITEMS;
const bottomMenuItems = FMEA_CORE_BOTTOM_MENU_ITEMS;
const adminMenuItems = FMEA_CORE_ADMIN_MENU_ITEMS;

/**
 * 사이드바 컴포넌트
 */
export const Sidebar = React.memo(function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  // 상태 분리: 고정 여부 vs 확장된 메뉴 아이템
  const [isPinned, setIsPinned] = useState(false); // 기본 아이콘 상태로 변경
  const [isHovered, setIsHovered] = useState(false); // 호버 상태 추가
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null); // 사용자 사진
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null); // 호버 디바운스 타이머


  // 초기 로드 시 localStorage에서 핀 상태 및 사용자 정보 확인
  useEffect(() => {
    const savedPin = localStorage.getItem('sidebar-pinned');
    if (savedPin === 'true') {
      setIsPinned(true);
    }

    // 사용자 정보 확인 및 사진 로드
    const loadUserInfo = async () => {
      const session = localStorage.getItem('user_session');
      if (session) {
        try {
          const user = JSON.parse(session);
          setUserRole(user.role);
          setUserName(user.name);

          // 사진 우선순위: 세션(DB) > localStorage
          let photo = user.photoUrl || localStorage.getItem(USER_PHOTO_STORAGE_KEY);

          // 사진이 없으면 API에서 가져오기
          if (!photo && user.id) {
            try {
              const res = await fetch(`/api/admin/users?id=${user.id}`);
              if (res.ok) {
                const data = await res.json();
                if (data.user?.photoUrl) {
                  photo = data.user.photoUrl;
                  // 세션 업데이트
                  const updatedUser = { ...user, photoUrl: photo };
                  localStorage.setItem('user_session', JSON.stringify(updatedUser));
                }
              }
            } catch (e) {
            }
          }

          if (photo) {
            setUserPhoto(photo);
            localStorage.setItem(USER_PHOTO_STORAGE_KEY, photo);
          }
        } catch (e) {
          console.error('Failed to parse user session', e);
        }
      } else {
        // 세션이 없으면 localStorage에서만 확인
        const savedPhoto = localStorage.getItem(USER_PHOTO_STORAGE_KEY);
        if (savedPhoto) {
          setUserPhoto(savedPhoto);
        }
      }
    };

    loadUserInfo();
  }, []);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);


  // 현재 경로에 맞는 메뉴 자동 확장
  useEffect(() => {
    if (!pathname) return;
    const allMenus = [...menuItems, ...bottomMenuItems, ...adminMenuItems];
    for (const menu of allMenus) {
      if (menu.subItems?.some(sub => pathname.startsWith(sub.href))) {
        setExpandedMenuId(menu.id);
        break;
      }
    }
  }, [pathname]);


  const dispatchResizeEvent = (width: number) => {
    // FixedLayout에서 감지할 수 있도록 CustomEvent로 width 전달
    window.dispatchEvent(
      new CustomEvent('sidebar-resize', {
        detail: { width },
      })
    );
  };

  // 호버 시 사이드바 확장 여부 결정
  const isExpanded = isPinned || isHovered;

  // 호버 상태 변경 시 레이아웃 업데이트
  useEffect(() => {
    dispatchResizeEvent(isExpanded ? 160 : 48);
  }, [isExpanded]);

  // 핀 상태 변경 시 localStorage 업데이트
  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    localStorage.setItem('sidebar-pinned', newPinned ? 'true' : 'false');

    // 핀 해제 시 열려있는 메뉴도 닫기
    if (!newPinned) {
      setExpandedMenuId(null);
    }

    // 레이아웃 조정을 위한 이벤트 발생
    setTimeout(() => {
      dispatchResizeEvent(newPinned ? 154 : 48);
    }, 50);
  };

  const isActive = (href: string) => {
    // 정확히 일치하거나 하위 경로일 경우 active 처리
    if (href === '/' && pathname !== '/') return false;
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const handleItemClick = (itemId: string, hasSubItems: boolean) => {
    if (hasSubItems) {
      // 호버 상태에서만 서브메뉴 토글 가능
      if (isExpanded) {
        setExpandedMenuId(expandedMenuId === itemId ? null : itemId);
      }
    }
  };

  const renderMenuItems = (items: typeof menuItems, photoSrc?: string | null) => {
    return items.map((item) => {
      const Icon = item.Icon;
      const active = isActive(item.href);
      const hasSubItems = item.subItems && item.subItems.length > 0;
      // 확장 상태일 때만 서브메뉴 표시
      const isMenuExpanded = expandedMenuId === item.id;
      const showLabels = isExpanded;

      // MyJob 아이템인지 확인
      const isMyJob = item.id === 'myjob';

      return (
        <div key={item.id} className="mb-0">
          <Link
            href={hasSubItems && showLabels ? '#' : item.href}
            onClick={(e) => {
              if (hasSubItems && showLabels) {
                e.preventDefault();
                handleItemClick(item.id, true);
              }
            }}
            className={cn(
              'flex gap-2 px-2 mx-0 rounded relative group',
              'transition-all duration-200',
              !showLabels && isMyJob ? 'flex-col items-center justify-center h-auto py-1' : 'items-center h-7',
              active && 'bg-white/10 shadow-lg',
              !active && 'hover:bg-white/5'
            )}
            title={!showLabels ? t(item.label) : undefined}
          >
            {/* 컬러 아이콘 + 약어 */}
            <div className={cn(
              "flex-shrink-0 flex items-center justify-center",
              !showLabels && !isMyJob ? "flex-row gap-0.5" : "",
              isMyJob && photoSrc && showLabels ? "w-5 h-5 rounded-full overflow-hidden" : ""
            )}>
              {/* 약어 (접힌 상태 - MyJob 제외) */}
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
            {/* MyJob 약어 - 아이콘 아래 (접힌 상태) */}
            {!showLabels && isMyJob && (
              <span className="text-[7px] font-bold text-cyan-300 leading-none">{item.shortLabel}</span>
            )}

            {/* 레이블 - 표준화 12px */}
            <span
              className={cn(
                'whitespace-nowrap text-[10px] font-semibold text-white/90',
                'transition-all duration-200',
                showLabels ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              )}
            >
              <T>{item.label}</T>
            </span>

            {/* 호버 툴팁 (접힌 상태에서만) */}
            {!showLabels && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[10000]">
                <T>{item.label}</T>
              </div>
            )}

            {/* 서브메뉴 화살표 */}
            {hasSubItems && showLabels && (
              <svg
                className={cn(
                  'ml-auto w-3 h-3 text-white/60 transition-transform duration-200',
                  isMenuExpanded && 'rotate-90'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </Link>

          {/* 서브메뉴 - 표준화 11px */}
          {hasSubItems && showLabels && isMenuExpanded && (
            <div className="ml-7 mt-0.5 space-y-0">
              {item.subItems?.map((subItem) => {
                // ★ full reload 대상: 작성화면, 습득교훈, AP개선, 대시보드 등 독립 페이지
                const needsFullReload = subItem.href.includes('/worksheet')
                  || subItem.href.includes('/lld')
                  || subItem.href.includes('/ap-improvement')
                  || subItem.href.includes('/dashboard');

                if (needsFullReload) {
                  return (
                    <button
                      key={subItem.href}
                      onClick={() => window.location.href = subItem.href}
                      className={cn(
                        'flex items-center px-2 h-6 rounded text-[10px] truncate w-full text-left',
                        'transition-colors duration-200',
                        isActive(subItem.href)
                          ? 'text-cyan-300 bg-cyan-500/20 font-semibold'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      )}
                      title={t(subItem.label)}
                    >
                      <T>{subItem.label}</T>
                    </button>
                  );
                }

                return (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className={cn(
                      'flex items-center px-2 h-6 rounded text-[10px] truncate',
                      'transition-colors duration-200',
                      isActive(subItem.href)
                        ? 'text-cyan-300 bg-cyan-500/20 font-semibold'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    )}
                    title={t(subItem.label)}
                  >
                    <T>{subItem.label}</T>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  /* 아이콘 컴포넌트 추가 */
  const PinIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 5C16 4.44772 15.5523 4 15 4H9C8.44772 4 8 4.44772 8 5V9L6 11V12H11V19L12 20L13 19V12H18V11L16 9V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const UnpinIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 5L15 4H9L8 5V9L6 11V12H11V19L12 20L13 19V12H18V11L16 9V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
      <path d="M4 4L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  return (
    <>

      <aside
        className={cn(
          'fixed left-0 top-0 h-screen',
          'bg-gradient-to-b from-[#1a237e] via-[#283593] to-[#1a237e]',
          'flex flex-col',
          'transition-all duration-300 ease-in-out',
          'shadow-xl',
          isExpanded ? 'w-[160px]' : 'w-12',
          'z-[100000]'
        )}
        onMouseEnter={() => {
          // 닫힘 타이머 취소
          if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
          }
          // ★ 펼침 딜레이 100ms (빠른 반응)
          hoverTimerRef.current = setTimeout(() => {
            setIsHovered(true);
          }, 100);
        }}
        onMouseLeave={() => {
          // 펼침 타이머 취소
          if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
          }
          // ★ 닫힘 딜레이 400ms (여유있게 유지)
          hoverTimerRef.current = setTimeout(() => {
            setIsHovered(false);
            if (!isPinned) {
              setExpandedMenuId(null);
            }
          }, 400);
        }}
      >
        {/* ======== 회사 로고 영역 - 컴팩트 ======== */}
        <div className="relative flex items-center justify-center border-b border-white/10 py-2">
          <CompanyLogo
            width={isExpanded ? 120 : 32}
            height={isExpanded ? 32 : 32}
          />

          {/* 고정 토글 버튼 (확장 시에만 표시) */}
          {isExpanded && (
            <button
              onClick={togglePin}
              className="text-white/50 hover:text-white transition-colors absolute right-1 top-2"
              title={isPinned ? t('사이드바 접기') : t('사이드바 펼치기')}
            >
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

        {/* ======== 메인 메뉴 - 컴팩트 ======== */}
        <nav className="flex-1 overflow-y-auto py-0 scrollbar-hide flex flex-col">
          {renderMenuItems(menuItems, userPhoto)}
        </nav>

        {/* ======== 구분선 ======== */}
        <div className="mx-2 border-t border-white/10" />

        {/* ======== 하단 메뉴 - 컴팩트 ======== */}
        <nav className="py-0 flex flex-col">
          {userRole === 'admin' && renderMenuItems(adminMenuItems)}
          {renderMenuItems(bottomMenuItems)}
        </nav>

        {/* 하단 프로필 영역 숨김 (My Job 아이콘에서 사진 표시) */}

        {/* 한/영 토글 → CommonTopNav로 이동 */}
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
