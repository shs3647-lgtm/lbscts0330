'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { ADMIN_HOME_PATH } from '@/lib/admin/admin-routes';

interface AdminBackToHomeProps {
  className?: string;
}

/**
 * 관리 서브페이지 → 카드 대시보드(/admin) 복귀 링크
 */
export function AdminBackToHome({ className = '' }: AdminBackToHomeProps) {
  return (
    <Link
      href={ADMIN_HOME_PATH}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:underline ${className}`}
    >
      <Home className="w-4 h-4 shrink-0" aria-hidden />
      관리 홈
    </Link>
  );
}
