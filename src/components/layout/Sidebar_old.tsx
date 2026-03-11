/**
 * @file Sidebar.tsx
 * @description 컬러 아이콘 사이드바 컴포넌트 (호버 시 확장)
 * @author AI Assistant
 * @created 2025-12-25
 * @version 2.0.0
 * 
 * ★★★ UI/UX 코드프리즈 - 2026-01-23 ★★★
 * - 사이드바 너비: 48px (접힌 상태), 160px (확장 상태)
 * - MyJob 아이콘: 사람 얼굴 + 사진 업로드 기능
 * - 프로필 사진: 더블클릭 업로드, 우클릭 초기화
 * ⚠️ 이 파일 수정 금지 - 레이아웃 충돌 위험
 * 
 * 디자인 참고: 화면디자인.PNG
 * - 네이비 배경 + 컬러 아이콘
 * - 호버 시 160px 확장
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import CompanyLogo from '@/components/CompanyLogo';

// LocalStorage 키
const USER_PHOTO_STORAGE_KEY = 'fmea_user_photo';

// 컬러 아이콘 SVG 컴포넌트들
const ColorIcons = {
  // AMP 로고 스타일 (주황/빨강 원형)
  Dashboard: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="8" r="6" fill="#FF6B35" />
      <circle cx="16" cy="16" r="6" fill="#FF4444" />
    </svg>
  ),
  // 분홍색 차트
  Worksheet: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="12" width="4" height="10" rx="1" fill="#E91E8C" />
      <rect x="8" y="8" width="4" height="14" rx="1" fill="#E91E8C" opacity="0.7" />
      <rect x="14" y="4" width="4" height="18" rx="1" fill="#E91E8C" opacity="0.5" />
      <rect x="20" y="10" width="4" height="12" rx="1" fill="#E91E8C" opacity="0.3" />
    </svg>
  ),
  // 민트색 연결 아이콘
  Register: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h10" stroke="#4DD0E1" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="18" r="3" fill="#4DD0E1" />
    </svg>
  ),
  // 청록색 폴더
  List: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="#26C6DA" />
    </svg>
  ),
  // 분홍 체크
  CFT: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#F48FB1" opacity="0.3" />
      <path d="M8 12L11 15L17 9" stroke="#E91E8C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  // 큐브 아이콘 (보라색)
  Revision: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="#9575CD" opacity="0.3" />
      <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="#7E57C2" strokeWidth="1.5" />
      <path d="M12 22V12M12 12L4 7M12 12L20 7" stroke="#7E57C2" strokeWidth="1.5" />
    </svg>
  ),
  // 설정 기어 (청록색)
  Settings: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill="#4DD0E1" />
      <path d="M12 1V3M12 21V23M23 12H21M3 12H1M20.5 3.5L19 5M5 19L3.5 20.5M20.5 20.5L19 19M5 5L3.5 3.5"
        stroke="#4DD0E1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  // 사용자 (주황색)
  User: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill="#FF8A65" />
      <path d="M4 20C4 16.6863 7.13401 14 12 14C16.866 14 20 16.6863 20 20"
        stroke="#FF8A65" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  // 세련된 프로필 아이콘 (MyJob용) - 모던 미니멀 스타일
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
        {/* 배경 원 */}
        <circle cx="12" cy="12" r="11" fill="url(#personGrad)" />
        {/* 얼굴 */}
        <circle cx="12" cy="10" r="5" fill="white" />
        {/* 몸통 */}
        <path d="M4 21C4 17 7 14 12 14C17 14 20 17 20 21" fill="white" />
      </svg>
    )
  ),
  // Admin 관리자 아이콘 (빨간색/주황색)
  Admin: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" fill="#FF5722" opacity="0.3" />
      <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" stroke="#E64A19" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="3" fill="#E64A19" />
      <path d="M8 16C8 14.3431 9.79086 13 12 13C14.2091 13 16 14.3431 16 16" stroke="#E64A19" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

// 공통 하위 메뉴 생성 함수 (4개: 등록, 리스트, 작성화면, 개정관리)
const createSubItems = (basePath: string) => [
  { label: '등록', href: `${basePath}/register` },
  { label: '리스트', href: `${basePath}/list` },
  { label: '작성화면', href: `${basePath}/worksheet` },
  { label: '개정관리', href: `${basePath}/revision` },
];

// PFMEA 전용 하위 메뉴
const pfmeaSubItems = [
  { label: '등록', href: '/pfmea/register' },
  { label: '리스트', href: '/pfmea/list' },
  { label: 'New FMEA', href: '/pfmea/worksheet' },
  { label: 'FMEA4판', href: '/pfmea/fmea4' },
  { label: '개정관리', href: '/pfmea/revision' },
  { label: '📚 습득교훈(LLD)', href: '/pfmea/lessons-learned' },
  { label: '🚀 AP 개선관리', href: '/pfmea/ap-improvement' },
  { label: '📊 대시보드', href: '/pfmea/dashboard' },
];

// DFMEA 전용 하위 메뉴
const dfmeaSubItems = [
  { label: '등록', href: '/dfmea/register' },
  { label: '리스트', href: '/dfmea/list' },
  { label: '작성화면', href: '/dfmea/worksheet' },
  { label: '개정관리', href: '/dfmea/revision' },
  { label: '🚀 AP 개선관리', href: '/dfmea/ap-improvement' },
  { label: '📊 대시보드', href: '/dfmea/dashboard' },
];

// Admin 관리자 하위 메뉴
const adminSubItems = [
  { label: '🏠 관리자 홈', href: '/admin' },
  { label: '👤 사용자관리', href: '/admin/settings/users' },
  { label: '⚙️ 결제환경설정', href: '/admin/settings/approval' },
  { label: '🗄️ DB 뷰어', href: '/admin/db-viewer' },
];

// MyJob 메뉴는 특별 처리 (사진 업로드 기능)
const myJobMenuItem = {
  id: 'approval-portal',
  label: 'MyJob',
  Icon: ColorIcons.Person,
  href: '/approval/approver-portal',
  subItems: [
    { label: '내가 결제해야할 현황', href: '/approval/approver-portal' },
    { label: '프로젝트 진행현황', href: '/pfmea/list' },
    { label: 'AP 개선 진행 현황', href: '/pfmea/ap-improvement' },
  ],
};

// 메뉴 아이템 정의
const menuItems = [
  myJobMenuItem,
  {
    id: 'apqp',
    label: 'APQP',
    Icon: ColorIcons.Worksheet,
    href: '/apqp',
    subItems: createSubItems('/apqp'),
  },
  {
    id: 'dfmea',
    label: 'DFMEA',
    Icon: ColorIcons.Register,
    href: '/dfmea',
    subItems: dfmeaSubItems,
  },
  {
    id: 'pfmea',
    label: 'PFMEA',
    Icon: ColorIcons.List,
    href: '/pfmea',
    subItems: pfmeaSubItems,
  },
  {
    id: 'cp',
    label: 'Control Plan',
    Icon: ColorIcons.CFT,
    href: '/control-plan',
    subItems: createSubItems('/control-plan'),
  },
  {
    id: 'pfd',
    label: 'PFD',
    Icon: ColorIcons.Revision,
    href: '/pfd',
    subItems: createSubItems('/pfd'),
  },
  {
    id: 'ws',
    label: 'WS',
    Icon: ColorIcons.Settings,
    href: '/ws',
    subItems: createSubItems('/ws'),
  },
  {
    id: 'pm',
    label: 'PM',
    Icon: ColorIcons.User,
    href: '/pm',
    subItems: createSubItems('/pm'),
  },
  {
    id: 'spc',
    label: 'SPC',
    Icon: ColorIcons.Dashboard,
    href: '/spc',
    subItems: createSubItems('/spc'),
  },
  {
    id: 'msa',
    label: 'MSA',
    Icon: ColorIcons.Worksheet,
    href: '/msa',
    subItems: createSubItems('/msa'),
  },
  {
    id: 'admin',
    label: 'Admin',
    Icon: ColorIcons.Admin,
    href: '/admin',
    subItems: adminSubItems,
  },
];

// 하단 메뉴 (기초정보 - 개발 완료된 화면만 연결)
const bottomMenuItems = [
  {
    id: 'master',
    label: '기초정보',
    Icon: ColorIcons.Settings,
    href: '/master',
    subItems: [
      { label: '고객사정보', href: '/master/customer' },
      { label: '사용자정보', href: '/master/user' },
      { label: 'PFMEA 임포트', href: '/pfmea/import' },
      { label: 'DFMEA 임포트', href: '/dfmea/import' },
      { label: 'CP 기초정보', href: '/control-plan/import' },
    ],
  },
];

// 시스템 관리 메뉴 (관리자 전용)
const adminMenuItems = [
  {
    id: 'admin',
    label: '시스템 관리',
    Icon: ColorIcons.Admin,
    href: '/admin',
    subItems: [
      { label: '사용자 권한 설정', href: '/admin/settings/users' },
      { label: '⚙️ 결제환경설정', href: '/admin/settings/approval' },
      { label: '🗄️ DB 뷰어', href: '/admin/db-viewer' },
    ],
  },
];


/**
 * 사이드바 컴포넌트
 */
export function Sidebar() {
  const pathname = usePathname();
  // 상태 분리: 고정 여부 vs 확장된 메뉴 아이템
  const [isPinned, setIsPinned] = useState(false); // 기본 아이콘 상태로 변경
  const [isHovered, setIsHovered] = useState(false); // 호버 상태 추가
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null); // 사용자 사진
  const photoInputRef = useRef<HTMLInputElement>(null);


  // 초기 로드 시 localStorage에서 핀 상태 및 사용자 정보 확인
  useEffect(() => {
    const savedPin = localStorage.getItem('sidebar-pinned');
    if (savedPin === 'true') {
      setIsPinned(true);
    }

    // 사용자 사진 불러오기
    const savedPhoto = localStorage.getItem(USER_PHOTO_STORAGE_KEY);
    if (savedPhoto) {
      setUserPhoto(savedPhoto);
    }

    // 사용자 정보 확인
    const session = localStorage.getItem('user_session');
    if (session) {
      try {
        const user = JSON.parse(session);
        setUserRole(user.role);
        setUserName(user.name);
      } catch (e) {
        console.error('Failed to parse user session', e);
      }
    }
  }, []);

  // 사진 업로드 핸들러
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('파일 크기는 2MB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      try {
        localStorage.setItem(USER_PHOTO_STORAGE_KEY, base64);
        setUserPhoto(base64);
      } catch (error) {
        console.error('사진 저장 실패:', error);
        alert('사진 저장에 실패했습니다.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  // 사진 초기화 (우클릭)
  const handlePhotoReset = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (userPhoto && confirm('기본 아이콘으로 복원하시겠습니까?')) {
      localStorage.removeItem(USER_PHOTO_STORAGE_KEY);
      setUserPhoto(null);
    }
  }, [userPhoto]);


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
      const isMyJob = item.id === 'approval-portal';

      return (
        <div key={item.id} className="mb-0.5">
          <Link
            href={hasSubItems && showLabels ? '#' : item.href}
            onClick={(e) => {
              if (hasSubItems && showLabels) {
                e.preventDefault();
                handleItemClick(item.id, true);
              }
            }}
            className={cn(
              'flex items-center gap-2 px-2 py-2 mx-0.5 rounded relative group',
              'transition-all duration-200',
              active && 'bg-white/10 shadow-lg',
              !active && 'hover:bg-white/5'
            )}
            title={!showLabels ? item.label : undefined}
          >
            {/* 컬러 아이콘 - MyJob은 사진 지원 */}
            <div className={cn(
              "flex-shrink-0 flex items-center justify-center",
              isMyJob && photoSrc ? "w-6 h-6 rounded-full overflow-hidden" : "w-5 h-5"
            )}>
              {isMyJob ? (
                <ColorIcons.Person className="w-full h-full" photoSrc={photoSrc || undefined} />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>

            {/* 레이블 - 표준화 12px */}
            <span
              className={cn(
                'whitespace-nowrap text-xs font-semibold text-white/90',
                'transition-all duration-200',
                showLabels ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              )}
            >
              {item.label}
            </span>

            {/* 호버 툴팁 (접힌 상태에서만) */}
            {!showLabels && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[10000]">
                {item.label}
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
              {item.subItems?.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={cn(
                    'block px-2 py-1.5 rounded text-[11px] truncate',
                    'transition-colors duration-200',
                    isActive(subItem.href)
                      ? 'text-cyan-300 bg-cyan-500/20 font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                  title={subItem.label}
                >
                  {subItem.label}
                </Link>
              ))}
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
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen',
        'bg-gradient-to-b from-[#1a237e] via-[#283593] to-[#1a237e]',
        'flex flex-col',
        'transition-all duration-300 ease-in-out',
        'shadow-xl',
        isExpanded ? 'w-[160px]' : 'w-12',
        'z-50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        // 호버 해제 시 열려있던 서브메뉴도 닫기 (핀 상태가 아닐 때만)
        if (!isPinned) {
          setExpandedMenuId(null);
        }
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
            title={isPinned ? '사이드바 접기' : '사이드바 펼치기'}
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
      <nav className="flex-1 overflow-y-auto py-1 scrollbar-hide">
        {renderMenuItems(menuItems, userPhoto)}
      </nav>

      {/* ======== 구분선 ======== */}
      <div className="mx-2 border-t border-white/10" />

      {/* ======== 하단 메뉴 - 컴팩트 ======== */}
      <nav className="py-1">
        {userRole === 'admin' && renderMenuItems(adminMenuItems)}
        {renderMenuItems(bottomMenuItems)}
      </nav>

      {/* ======== 사용자 정보 표시 (더블클릭으로 사진 변경) ======== */}
      <div className="border-t border-white/10 p-2 mt-auto">
        {/* 숨겨진 파일 입력 */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        <div className={cn(
          "flex items-center gap-3 px-2 py-2 rounded hover:bg-white/5 transition-colors group relative",
          !isExpanded && "justify-center"
        )}>
          {/* 프로필 사진/아이콘 - 더블클릭으로 사진 변경, 우클릭으로 초기화 */}
          <div
            className="w-7 h-7 rounded-full overflow-hidden cursor-pointer shrink-0 border-2 border-white/30 hover:border-cyan-400 transition-colors"
            onDoubleClick={() => photoInputRef.current?.click()}
            onContextMenu={handlePhotoReset}
            title="더블클릭: 사진 변경 / 우클릭: 기본으로 복원"
          >
            {userPhoto ? (
              <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
            ) : (
              /* 세련된 그라데이션 프로필 아이콘 */
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <defs>
                  <linearGradient id="profileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
                {/* 배경 */}
                <rect width="24" height="24" rx="12" fill="url(#profileGrad)" />
                {/* 얼굴 */}
                <circle cx="12" cy="10" r="4" fill="white" />
                {/* 몸통 */}
                <path d="M5 22C5 17 8 14 12 14C16 14 19 17 19 22" fill="white" />
              </svg>
            )}
          </div>

          {isExpanded && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-white text-[11px] font-semibold truncate">{userName || '사용자'}</span>
              <span className="text-white/40 text-[9px] uppercase">{userRole || 'viewer'}</span>
            </div>
          )}

          {/* 로그아웃 버튼 */}
          <button
            onClick={() => {
              if (confirm('로그아웃 하시겠습니까?')) {
                localStorage.removeItem('user_session');
                window.location.href = '/login';
              }
            }}
            className={cn(
              "text-white/40 hover:text-red-400 transition-colors",
              isExpanded ? "block" : "hidden group-hover:block absolute left-full ml-2 bg-gray-900 p-1 rounded shadow-lg"
            )}
            title="로그아웃"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

    </aside>
  );
}

export default Sidebar;
