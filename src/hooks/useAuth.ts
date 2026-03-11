/**
 * @file useAuth.ts
 * @description 사용자 인증 훅
 * @created 2026-01-21
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  department: string;
  position: string;
  role: string;
  permPfmea: string;
  permDfmea: string;
  permCp: string;
  permPfd: string;
}

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (loginId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (module: 'pfmea' | 'dfmea' | 'cp' | 'pfd', action: 'read' | 'write') => boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 10분 비활동 시 자동 로그아웃 (밀리초)
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

  // 쿠키에서 사용자 정보 로드
  useEffect(() => {
    const loadUser = () => {
      try {
        // 쿠키에서 사용자 정보 읽기
        const cookies = document.cookie.split(';');
        const userCookie = cookies.find(c => c.trim().startsWith('fmea-user='));

        if (userCookie) {
          const userJson = decodeURIComponent(userCookie.split('=')[1]);
          const userData = JSON.parse(userJson);
          setUser(userData);
        } else {
          // localStorage 폴백
          const stored = localStorage.getItem('fmea-user');
          if (stored) {
            setUser(JSON.parse(stored));
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // 10분 비활동 자동 로그아웃
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert('10분 동안 활동이 없어 자동 로그아웃됩니다.');
        // 로그아웃 처리
        setUser(null);
        localStorage.removeItem('fmea-user');
        document.cookie = 'fmea-user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/login';
      }, INACTIVITY_TIMEOUT);
    };

    // 사용자 활동 감지 이벤트
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // 초기 타이머 시작
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  // 로그인
  const login = useCallback(async (loginId: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('fmea-user', JSON.stringify(data.user));
        return { success: true };
      }

      return { success: false, error: data.error || '로그인 실패' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  // 로그아웃
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('fmea-user');
    // 쿠키 삭제
    document.cookie = 'fmea-user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // 접속 로그 기록
    if (user) {
      fetch('/api/auth/access-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          module: 'AUTH',
          action: 'logout',
          description: `로그아웃: ${user.name}`,
        }),
      }).catch(console.error);
    }
  }, [user]);

  // 권한 확인
  const hasPermission = useCallback((module: 'pfmea' | 'dfmea' | 'cp' | 'pfd', action: 'read' | 'write') => {
    if (!user) return false;

    // admin은 모든 권한
    if (user.role === 'admin') return true;

    const permKey = `perm${module.charAt(0).toUpperCase() + module.slice(1)}` as keyof AuthUser;
    const permission = user[permKey] as string;

    if (action === 'read') {
      return permission === 'read' || permission === 'write';
    }
    return permission === 'write';
  }, [user]);

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    hasPermission,
  };
}

export default useAuth;
