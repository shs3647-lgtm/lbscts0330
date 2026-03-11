/**
 * @file Header.tsx
 * @description 웰컴보드 헤더 컴포넌트
 * @author AI Assistant
 * @created 2026-01-03
 * @updated 2026-01-19: 로그인/회원가입 버튼 추가
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserSession {
  id: string;
  name: string;
  email: string;
  factory: string;
  department: string;
  role: string;
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // 로그인 상태 확인
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }
  }, []);

  // 로그아웃
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setShowMenu(false);
    router.refresh();
  };

  return (
    <header className="mb-3 bg-[#0e1a33] border border-[#1d2a48] rounded-[14px] shadow-lg">
      <div className="flex items-center justify-between h-12 px-4">
        {/* 중앙: Smart System */}
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-black text-white tracking-wide">
            Smart System
          </h1>
        </div>
        
        {/* 우측: 사용자 메뉴 */}
        <div className="flex-shrink-0 relative">
          {user ? (
            // 로그인 상태
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-4 py-2 bg-[#5ba9ff] hover:bg-[#4a9aee] text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="text-xs">👤</span>
                {user.name}
                <span className="text-xs">▼</span>
              </button>
              
              {/* 드롭다운 메뉴 */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border z-50">
                  <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
                    <p className="font-bold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">{user.factory} / {user.department}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/auth/change-password"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowMenu(false)}
                    >
                      🔑 비밀번호 변경
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        href="/admin/settings/users"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowMenu(false)}
                      >
                        👥 사용자 관리
                      </Link>
                    )}
                  </div>
                  <div className="border-t py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      🚪 로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // 비로그인 상태
            <div className="flex gap-2">
              <Link
                href="/auth/login"
                className="px-4 py-2 bg-[#5ba9ff] hover:bg-[#4a9aee] text-white text-sm font-bold rounded-lg transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 bg-transparent border border-[#5ba9ff] hover:bg-[#5ba9ff]/20 text-[#5ba9ff] text-sm font-bold rounded-lg transition-colors"
              >
                회원가입
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* 메뉴 외부 클릭 시 닫기 */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </header>
  );
}
