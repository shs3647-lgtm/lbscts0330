/**
 * @file /admin/page.tsx
 * @description 관리자 메인 페이지
 * @created 2026-01-19
 */

'use client';

import React from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const menuItems = [
    {
      title: '⚙️ 결재 시스템 설정',
      description: 'SMTP, 결재자 자동 지정, 알림, 그룹웨어 연동',
      href: '/admin/settings/approval',
      color: 'bg-blue-500',
    },
    {
      title: '🗄️ DB 뷰어',
      description: '데이터베이스 테이블 조회',
      href: '/admin/db-viewer',
      color: 'bg-green-500',
    },
    {
      title: '📋 FMEA 목록',
      description: 'FMEA 프로젝트 관리',
      href: '/pfmea',
      color: 'bg-purple-500',
    },
  ];
  
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-[#00587a] text-white rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold">🔐 관리자 메뉴</h1>
          <p className="text-gray-200 mt-1">FMEA On-Premise 시스템 관리</p>
        </div>
        
        {/* 메뉴 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4"
              style={{ borderLeftColor: item.color.replace('bg-', '').replace('-500', '') }}
            >
              <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center text-white text-2xl mb-4`}>
                {item.title.split(' ')[0]}
              </div>
              <h2 className="font-bold text-lg mb-2">{item.title.split(' ').slice(1).join(' ')}</h2>
              <p className="text-sm text-gray-600">{item.description}</p>
            </Link>
          ))}
        </div>
        
        {/* 시스템 정보 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-bold mb-4">📊 시스템 정보</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded">
              <span className="text-gray-500">버전</span>
              <p className="font-mono font-bold">v2.6.0</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <span className="text-gray-500">환경</span>
              <p className="font-mono font-bold">On-Premise</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <span className="text-gray-500">데이터베이스</span>
              <p className="font-mono font-bold">PostgreSQL</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <span className="text-gray-500">마지막 업데이트</span>
              <p className="font-mono font-bold">2026-01-19</p>
            </div>
          </div>
        </div>
        
        {/* 빠른 링크 */}
        <div className="mt-4 flex gap-2 justify-center">
          <Link href="/" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm">
            🏠 홈
          </Link>
          <Link href="/pfmea/worksheet" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm">
            📝 워크시트
          </Link>
          <Link href="/pfmea/revision" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm">
            📋 개정관리
          </Link>
        </div>
      </div>
    </div>
  );
}
