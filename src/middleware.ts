import { NextRequest, NextResponse } from 'next/server';

// 로그인 없이 접근 가능한 경로
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
