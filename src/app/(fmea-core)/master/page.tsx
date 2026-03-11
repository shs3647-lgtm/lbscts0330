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
    const { isAdmin } = useAuth();

    const menuItems = [
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
            title: 'DFMEA 임포트(DFMEA Import)',
            description: 'DFMEA 데이터를 임포트합니다.',
            href: '/dfmea/import',
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
        {
            title: 'DB뷰어(DB Viewer)',
            description: '데이터베이스를 조회합니다.',
            href: '/admin/db-viewer',
            icon: '🗄️',
            adminOnly: true,
        },
    ];

    // admin이 아니면 adminOnly 메뉴 필터링
    const visibleMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

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
