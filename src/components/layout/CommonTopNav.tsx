'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/locale';
import { MENU_DICT } from '@/lib/locale-dict';
import HelpSearchModal from '@/components/modals/HelpSearchModal';
import HelpChatbot from '@/components/help/HelpChatbot';

/**
 * @file CommonTopNav.tsx
 * @description 공통 상단 네비게이션 바 (반응형)
 * - APQP, FMEA, CP, PFD, WS, PM 모든 모듈에서 사용
 * - 화면 크기에 따라 자동 조정
 * - 우측에 접속자 ID 표시
 * 
 * @version 1.1.0 - 접속자 ID 표시 추가
 */

interface AuthUser {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
}

export interface TopNavMenuItem {
  label: string;
  path: string;
  icon: string;
  shortLabel?: string; // 작은 화면용 짧은 레이블
  disabled?: boolean;  // 개발중 여부
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
  const { locale, setLocale, t } = useLocale();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showHelpSearch, setShowHelpSearch] = useState(false);

  // 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      try {
        let userData: AuthUser | null = null;

        // 쿠키에서 사용자 정보 읽기
        const cookies = document.cookie.split(';');
        const userCookie = cookies.find(c => c.trim().startsWith('fmea-user='));

        if (userCookie) {
          const userJson = decodeURIComponent(userCookie.split('=')[1]);
          userData = JSON.parse(userJson);
        } else {
          // localStorage 폴백
          const stored = localStorage.getItem('fmea-user');
          if (stored) {
            userData = JSON.parse(stored);
          }
        }

        if (userData) {
          // localStorage에서 캐시된 사진 확인
          const cachedPhoto = localStorage.getItem('fmea_user_photo');
          if (cachedPhoto) {
            userData.photoUrl = cachedPhoto;
          }

          // DB에서 최신 사진 가져오기 (백그라운드)
          try {
            const res = await fetch(`/api/admin/users?id=${userData.id}`);
            const data = await res.json();
            if (data.success && data.user?.photoUrl) {
              userData.photoUrl = data.user.photoUrl;
              localStorage.setItem('fmea_user_photo', data.user.photoUrl);
            }
          } catch {
            // API 실패해도 무시 (캐시 사용)
          }

          setUser(userData);
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      }
    };
    loadUser();
  }, []);

  // 로그아웃
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fmea-user');
    document.cookie = 'fmea-user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/welcomeboard';
  };

  const isActive = (path: string) => pathname?.startsWith(path);

  const handleNavigation = (path: string) => {
    if (path.includes('?id=')) {
      // 이미 id param이 있는 경로 (예: PFMEA/CP 연동 링크) → 그대로 사용
      window.location.href = path;
    } else if (selectedId) {
      // ✅ ID 소문자 통일 (DB 정규화)
      const sep = path.includes('?') ? '&' : '?';
      window.location.href = `${path}${sep}id=${selectedId.toLowerCase()}`;
    } else {
      window.location.href = path;
    }
  };

  return (
    <div
      className="fixed top-0 left-[53px] right-0 z-[100] flex items-center h-9 border-b border-white/20"
      style={{ background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo}, ${gradientFrom})` }}
    >
      {/* 메뉴 항목들 - 1줄 컴팩트 레이아웃 한글(EN) / EN(한글) */}
      <div className="flex items-center h-full overflow-x-auto scrollbar-hide flex-1">
        {menuItems.map((item, index) => {
          const ko = item.shortLabel || item.label;
          const en = MENU_DICT[ko] || MENU_DICT[item.label] || '';
          const primary = locale === 'en' && en ? en : ko;
          const secondary = locale === 'en' ? ko : en;
          return (
            <button
              key={item.path}
              onClick={() => !item.disabled && handleNavigation(item.path)}
              className={`
                px-1 h-full border-none
                flex items-center justify-center
                transition-all duration-200 whitespace-nowrap shrink-0
                ${item.disabled
                  ? 'text-white/40 cursor-not-allowed bg-transparent'
                  : `text-white cursor-pointer ${isActive(item.path) ? 'bg-white/15 font-semibold' : 'bg-transparent font-normal hover:bg-white/10'}`
                }
                ${index < menuItems.length - 1 ? 'border-r border-white/15' : ''}
              `}
              title={`${item.label} (${en})`}
            >
              <span className="text-[9px]">{primary}{secondary && <span className="text-[7px] text-white/50 ml-0.5">({secondary})</span>}</span>
              {item.disabled && <span className="text-[7px] text-yellow-300/70 ml-0.5">(Dev)</span>}
            </button>
          );
        })}
      </div>

      {/* 우측 통계 영역 - 반응형 */}
      {statItems.length > 0 && (
        <div
          className="h-9 flex items-stretch border-l-2 border-white shrink-0"
          style={{ background: 'linear-gradient(to right, #0d47a1, #1565c0)' }}
        >
          {/* 레이블 - 큰 화면에서만 표시 */}
          <div className="hidden lg:flex w-[60px] xl:w-[80px] h-9 items-center justify-center border-r border-white/30 shrink-0">
            <span className="text-yellow-400 text-[10px] xl:text-xs font-bold whitespace-nowrap">{statLabel}</span>
          </div>

          {/* 통계 값들 */}
          {statItems.map((stat, index) => (
            <div
              key={stat.label}
              className={`
                w-[50px] sm:w-[60px] lg:w-[66px] h-9
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

      {/* Help 챗봇 토글 버튼 */}
      <HelpChatbot renderTrigger={(onOpen) => (
        <button
          onClick={onOpen}
          className="h-9 flex items-center gap-1 px-1.5 border-l border-white/30 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          title="Help"
        >
          <span className="text-[10px]">💬</span>
          <span className="text-[9px] hidden sm:inline">Help</span>
        </button>
      )} />

      {/* 한/영 토글 버튼 */}
      <button
        onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
        className="h-9 flex items-center gap-1 px-1.5 border-l border-white/30 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        title={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
      >
        <span className="text-[10px]">🌐</span>
        <span className="text-[9px] hidden sm:inline">{locale === 'ko' ? 'EN' : 'KO'}</span>
      </button>

      {/* 사용자 매뉴얼 버튼 */}
      <button
        onClick={() => setShowHelpSearch(true)}
        className="h-9 flex items-center gap-1 px-1.5 border-l border-white/30 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        title={t('사용자 매뉴얼')}
      >
        <span className="text-[10px]">📖</span>
        <span className="text-[9px] hidden sm:inline">{t('매뉴얼')}</span>
      </button>

      {/* 접속자 ID 표시 - 우측 끝 */}
      <div className="h-9 flex items-center border-l border-white/30 shrink-0 px-1.5">
        {user ? (
          <div className="flex items-center gap-1">
            {/* 프로필 사진 또는 기본 아이콘 */}
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.name}
                className="w-5 h-5 rounded-full object-cover border border-white/50"
              />
            ) : (
              <span className="text-[10px]">👤</span>
            )}
            <span className="text-white/90 text-[9px]">
              <span className="font-semibold">{user.name}</span>
              {user.role === 'admin' && (
                <span className="ml-0.5 px-0.5 py-0.5 bg-yellow-500 text-black text-[7px] rounded font-bold">AMP</span>
              )}
            </span>
            <button
              onClick={handleLogout}
              className="text-white/70 hover:text-white text-[8px] px-1 py-0.5 rounded bg-white/10 hover:bg-white/20"
              title={t('로그아웃')}
            >
              {t('로그아웃')}
            </button>
          </div>
        ) : (
          <a
            href="/auth/login"
            className="text-white/80 hover:text-white text-[9px] flex items-center gap-1"
          >
            🔐 {t('로그인')}
          </a>
        )}
      </div>

      {/* 도움말 검색 모달 */}
      <HelpSearchModal isOpen={showHelpSearch} onClose={() => setShowHelpSearch(false)} />
    </div>
  );
}


















