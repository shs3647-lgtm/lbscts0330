/**
 * @file page.tsx
 * @description 기초정보(Master) 메인 페이지
 * @updated 2026-01-26 AdminTopNav 추가
 */

'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { FixedLayout, AdminTopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';

export default function MasterPage() {
    const { t } = useLocale();
    const { isAdmin, isManager } = useAuth();
    const canEnterprise = isAdmin || isManager;

    const menuItems: Array<{
        title: string;
        description: string;
        href: string;
        icon: string;
        adminOnly?: boolean;
    }> = [
        {
            title: '고객사정보(Customer Info)',
            description: '고객사 정보를 등록하고 관리합니다.',
            href: '/master/customer',
            icon: '🏢',
        },
        {
            title: '사용자정보(User Info)',
            description: '시스템 사용자 정보를 관리합니다.',
            href: '/master/user',
            icon: '👤',
        },
        {
            title: 'PFMEA 임포트(PFMEA Import)',
            description: 'PFMEA 데이터를 임포트합니다.',
            href: '/pfmea/import',
            icon: '📥',
        },
        {
            title: 'CP 기초정보(CP Master Data)',
            description: 'Control Plan 기초정보를 관리합니다.',
            href: '/control-plan/import',
            icon: '📋',
        },
        {
            title: '데이타 복구 관리(Data Recovery)',
            description: '삭제된 문서를 복원하거나 영구삭제합니다.',
            href: '/master/trash',
            icon: '🗑️',
        },
    ];

    /** 고객사·CFT(직원): ADMIN/MANAGER, 나머지: ADMIN만 */
    const visibleMenuItems = menuItems.filter((item) => {
        const isEnterprise = item.href === '/master/customer' || item.href === '/master/user';
        if (isEnterprise) return canEnterprise;
        if (item.adminOnly) return isAdmin;
        return isAdmin;
    });

    return (
        <FixedLayout topNav={<AdminTopNav />} showSidebar={true}>
            <div className="p-8">
                {/* 헤더 */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800" title="Master Data">기초정보(Master Data)</h1>
                    <p className="text-gray-500 mt-1">시스템 기초 데이터를 관리합니다.</p>
                </div>

                {/* 메뉴 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleMenuItems.length === 0 && (
                        <div className="col-span-full rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 text-sm">
                            기초정보 메뉴를 볼 권한이 없습니다. 고객사·CFT는 <strong>기업관리자(MANAGER)</strong>, 임포트·시스템 도구는 <strong>시스템관리자(ADMIN)</strong>에게 문의하세요.
                        </div>
                    )}
                    {visibleMenuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-200"
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-3xl">{item.icon}</span>
                                <div>
                                    <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                                        {t(item.title)}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{t(item.description)}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </FixedLayout>
    );
}
