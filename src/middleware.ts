import { NextRequest, NextResponse } from 'next/server';
import {
  parseRoleFromFmeaUserCookie,
  isSystemAdminRole,
  canAccessEnterpriseMasterRole,
} from '@/lib/auth/roles';

// 로그인 없이 접근 가능한 경로 (/api/ 전체 공개는 아래에서 /api/admin 만 예외 처리)
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/demo-request',
  '/login',
  '/reset-password',
  '/api/',
  '/_next/',
  '/favicon.ico',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /** Admin API — 시스템 관리자(ADMIN)만 (PUBLIC /api/ 보다 먼저 처리) */
  if (pathname.startsWith('/api/admin')) {
    const userCookie = request.cookies.get('fmea-user');
    const role = parseRoleFromFmeaUserCookie(userCookie?.value);
    if (!role) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!isSystemAdminRole(role)) {
      return NextResponse.json(
        { success: false, error: '시스템 관리자(ADMIN) 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 정적 파일 통과
  if (pathname.includes('.')) {
    return NextResponse.next();
  }

  // fmea-user 쿠키 확인
  const userCookie = request.cookies.get('fmea-user');
  if (!userCookie?.value) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = parseRoleFromFmeaUserCookie(userCookie.value);

  /** 시스템 관리 화면 — ADMIN만 */
  if (pathname.startsWith('/admin') && !isSystemAdminRole(role)) {
    const home = new URL('/welcomeboard', request.url);
    home.searchParams.set('notice', 'admin_only');
    return NextResponse.redirect(home);
  }

  /** 고객사·CFT(직원) 기초정보 — ADMIN 또는 MANAGER */
  if (
    (pathname.startsWith('/master/customer') || pathname.startsWith('/master/user')) &&
    !canAccessEnterpriseMasterRole(role)
  ) {
    const home = new URL('/welcomeboard', request.url);
    home.searchParams.set('notice', 'enterprise_master_only');
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
