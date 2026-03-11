'use client';

import CommonTopNav, { type TopNavMenuItem } from './CommonTopNav';

/**
 * Admin 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * - 로그인 ID 표시 포함
 * 
 * @version 1.0.0
 */
export default function AdminTopNav() {
    const menuItems: TopNavMenuItem[] = [
        { label: '사용자 정보', shortLabel: '사용자', path: '/admin/users', icon: '👤' },
        { label: '이메일 설정', shortLabel: '이메일', path: '/admin/email-settings', icon: '📧' },
        { label: '고객사 관리', shortLabel: '고객사', path: '/master/customer', icon: '🏢' },
        { label: '직원 정보', shortLabel: '직원', path: '/master/user', icon: '👥' },
        { label: 'DB 뷰어', shortLabel: 'DB', path: '/admin/db-viewer', icon: '🗄️' },
        { label: 'DB 통계', shortLabel: '통계', path: '/admin/db-stats', icon: '📊' },
        { label: '대시보드', shortLabel: '메인', path: '/dashboard', icon: '🏠' },
    ];

    return (
        <CommonTopNav
            title="Admin"
            menuItems={menuItems}
            gradientFrom="#1a237e"
            gradientTo="#283593"
        />
    );
}
