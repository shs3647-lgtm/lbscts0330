'use client';

import { useMemo, useState, useEffect } from 'react';
import CommonTopNav, { type TopNavMenuItem } from './CommonTopNav';
import { ROLE_ADMIN, ROLE_MANAGER } from '@/lib/auth/roles';

function readRoleFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('fmea-user');
    if (raw) {
      const u = JSON.parse(raw) as { role?: string };
      return u.role ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Admin 상단 바로가기 메뉴바
 * - ADMIN: 시스템 관리 전체
 * - MANAGER: 기초정보(고객사·직원)만 — /admin 링크 없음
 */
export default function AdminTopNav() {
  const [role, setRole] = useState<string | null>(() => readRoleFromStorage());

  useEffect(() => {
    setRole(readRoleFromStorage());
  }, []);

  const menuItems: TopNavMenuItem[] = useMemo(() => {
    const systemAdminMenu: TopNavMenuItem[] = [
      { label: '관리 홈', shortLabel: '홈', path: '/admin', icon: '🏠' },
      { label: '사용자 정보', shortLabel: '사용자', path: '/admin/users', icon: '👤' },
      { label: '이메일 설정', shortLabel: '이메일', path: '/admin/email-settings', icon: '📧' },
      { label: '결재 환경', shortLabel: '결재', path: '/admin/settings/approval', icon: '✅' },
      { label: '권한(CSV)', shortLabel: 'CSV', path: '/admin/settings/users', icon: '📋' },
      { label: '고객사 관리', shortLabel: '고객사', path: '/master/customer', icon: '🏢' },
      { label: '직원 정보', shortLabel: '직원', path: '/master/user', icon: '👥' },
    ];

    const enterpriseOnlyMenu: TopNavMenuItem[] = [
      { label: '기초정보', shortLabel: '기초', path: '/master', icon: '📁' },
      { label: '고객사 관리', shortLabel: '고객사', path: '/master/customer', icon: '🏢' },
      { label: '직원 정보(CFT)', shortLabel: 'CFT', path: '/master/user', icon: '👥' },
    ];

    if (role === ROLE_MANAGER) {
      return enterpriseOnlyMenu;
    }
    if (role === ROLE_ADMIN || role == null) {
      return systemAdminMenu;
    }
    return systemAdminMenu;
  }, [role]);

  return (
    <CommonTopNav
      title={role === ROLE_MANAGER ? 'Master' : 'Admin'}
      menuItems={menuItems}
      gradientFrom="#1a237e"
      gradientTo="#283593"
    />
  );
}
