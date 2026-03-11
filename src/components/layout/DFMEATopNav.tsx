'use client';

import CommonTopNav, { TopNavMenuItem } from './CommonTopNav';
import { useEffect, useState } from 'react';

interface DFMEATopNavProps {
  selectedFmeaId?: string;
}

/**
 * DFMEA 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * - Admin 메뉴 추가 (admin 역할인 경우만)
 * 
 * @version 1.0.0 - DFMEA 모듈 생성
 */
export default function DFMEATopNav({ selectedFmeaId }: DFMEATopNavProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const cookies = document.cookie.split(';');
      const userCookie = cookies.find(c => c.trim().startsWith('fmea-user='));
      if (userCookie) {
        const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        setIsAdmin(user?.role === 'admin');
      } else {
        const stored = localStorage.getItem('fmea-user');
        if (stored) {
          const user = JSON.parse(stored);
          setIsAdmin(user?.role === 'admin');
        }
      }
    } catch { }
  }, []);

  const baseMenuItems: TopNavMenuItem[] = [
    { label: 'DFMEA등록', shortLabel: '등록', path: '/dfmea/register', icon: '📝' },
    { label: 'DFMEA 리스트', shortLabel: '리스트', path: '/dfmea/list', icon: '📋' },
    { label: 'DFMEA 작성화면', shortLabel: '작성', path: '/dfmea/worksheet', icon: '✏️' },
    { label: 'DFMEA 개정관리', shortLabel: '개정', path: '/dfmea/revision', icon: '📜' },
  ];

  // Admin 메뉴 추가
  const menuItems = isAdmin
    ? [...baseMenuItems, { label: '관리설정', shortLabel: 'Admin', path: '/admin', icon: '⚙️' }]
    : baseMenuItems;

  return (
    <CommonTopNav
      title="D-FMEA"
      menuItems={menuItems}
      selectedId={selectedFmeaId}
      gradientFrom="#1a237e"
      gradientTo="#303f9f"
    />
  );
}
