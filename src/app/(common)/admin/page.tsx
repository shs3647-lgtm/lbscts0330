/**
 * @file page.tsx
 * @description Admin 대시보드 (관리자 전용)
 * @created 2026-01-26
 */

'use client';

import React from 'react';
import { Users, Mail, Building2, Database, Shield, Settings, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { FixedLayout, AdminTopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';

interface QuickLinkCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

const quickLinks: QuickLinkCard[] = [
  // 사용자 정보 관리
  {
    title: '사용자 정보 관리',
    description: '고객사별 사용자 계정, ID/PW, 권한 설정',
    href: '/admin/users',
    icon: <Users className="w-8 h-8" />,
    color: 'from-blue-500 to-blue-600',
    category: '사용자 관리',
  },
  {
    title: '이메일 설정',
    description: '비밀번호 재설정용 SMTP 설정',
    href: '/admin/email-settings',
    icon: <Mail className="w-8 h-8" />,
    color: 'from-purple-500 to-purple-600',
    category: '사용자 관리',
  },
  // 기초정보 관리
  {
    title: '고객사 관리',
    description: '고객사 정보 등록/수정',
    href: '/master/customer',
    icon: <Building2 className="w-8 h-8" />,
    color: 'from-green-500 to-green-600',
    category: '기초정보 관리',
  },
  {
    title: '직원 정보 (CFT)',
    description: 'CFT 등록, 결재자 등록용 직원 정보',
    href: '/master/user',
    icon: <Shield className="w-8 h-8" />,
    color: 'from-teal-500 to-teal-600',
    category: '기초정보 관리',
  },
  // DB 관리
  {
    title: 'DB 뷰어',
    description: '데이터베이스 테이블 조회/검색',
    href: '/admin/db-viewer',
    icon: <Database className="w-8 h-8" />,
    color: 'from-orange-500 to-orange-600',
    category: 'DB 관리',
  },
  {
    title: 'DB 통계',
    description: '테이블별 레코드 수, 용량 확인',
    href: '/admin/db-stats',
    icon: <BarChart3 className="w-8 h-8" />,
    color: 'from-red-500 to-red-600',
    category: 'DB 관리',
  },
];

const categories = ['사용자 관리', '기초정보 관리', 'DB 관리'];

export default function AdminPage() {
  const { t } = useLocale();
  return (
    <FixedLayout topNav={<AdminTopNav />} showSidebar={true}>
      <div className="p-6 max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white">
              <Settings className="w-6 h-6" />
            </div>
            {t('Admin 관리 페이지')}
          </h1>
          <p className="text-gray-600 mt-2">{t('시스템 관리자 전용 페이지입니다.')}</p>
        </div>

        {/* 카테고리별 카드 */}
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              {category === '사용자 관리' && <Users className="w-5 h-5 text-blue-600" />}
              {category === '기초정보 관리' && <Building2 className="w-5 h-5 text-green-600" />}
              {category === 'DB 관리' && <Database className="w-5 h-5 text-orange-600" />}
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickLinks
                .filter(link => link.category === category)
                .map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                  >
                    <div className={`h-2 bg-gradient-to-r ${link.color}`} />
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 bg-gradient-to-br ${link.color} rounded-lg text-white shadow-md group-hover:scale-110 transition-transform`}>
                          {link.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                            {link.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {link.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        ))}

        {/* 안내 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-8">
          <h4 className="font-bold text-yellow-800 mb-2">💡 Admin 접근 권한</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 이 페이지는 <strong>admin 역할</strong>을 가진 사용자만 접근 가능합니다.</li>
            <li>• 사이드바에서 🔐 Admin 메뉴를 통해 직접 접근할 수도 있습니다.</li>
          </ul>
        </div>
      </div>
    </FixedLayout>
  );
}
