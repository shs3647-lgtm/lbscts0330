/**
 * @file middleware.ts
 * @description 권한 체크 미들웨어 유틸리티
 * @created 2026-01-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { UserRole, hasPermission, SessionUser } from './types';

/**
 * 요청에서 사용자 정보 추출
 * - 헤더 x-user-id 또는 쿠키에서 추출
 * - 실제 운영환경에서는 JWT 토큰 검증 필요
 */
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const prisma = getPrisma();
  if (!prisma) return null;

  // 헤더에서 사용자 ID 추출 (개발용)
  const userId = request.headers.get('x-user-id');
  
  // 쿠키에서 사용자 ID 추출 (운영용)
  const userIdFromCookie = request.cookies.get('user-id')?.value;
  
  const targetUserId = userId || userIdFromCookie;
  
  if (!targetUserId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        factory: true,
        department: true,
        position: true,
        role: true,
        isActive: true,
      }
    });

    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email || '',
      factory: user.factory,
      department: user.department,
      position: user.position,
      role: (user.role as UserRole) || 'viewer',
      isActive: user.isActive,
    };
  } catch (error) {
    console.error('[Auth] 사용자 조회 오류:', error);
    return null;
  }
}

/**
 * 권한 체크 미들웨어 생성
 * @param requiredRole 필요한 최소 권한
 */
export function withAuth(requiredRole: UserRole = 'viewer') {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, user: SessionUser) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    if (!hasPermission(user.role, requiredRole)) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    return handler(request, user);
  };
}

/**
 * 관리자 전용 미들웨어
 */
export const withAdminAuth = withAuth('admin');

/**
 * 편집자 이상 미들웨어
 */
export const withEditorAuth = withAuth('editor');

/**
 * 인증만 확인 (권한 무관)
 */
export const withViewerAuth = withAuth('viewer');

/**
 * API 라우트에서 사용하는 권한 체크 헬퍼
 * @example
 * export async function POST(request: NextRequest) {
 *   const authResult = await checkAuth(request, 'editor');
 *   if (!authResult.success) return authResult.response;
 *   const user = authResult.user;
 *   // ... 나머지 로직
 * }
 */
export async function checkAuth(
  request: NextRequest,
  requiredRole: UserRole = 'viewer'
): Promise<{ success: true; user: SessionUser } | { success: false; response: NextResponse }> {
  const user = await getSessionUser(request);

  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      ),
    };
  }

  if (!hasPermission(user.role, requiredRole)) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      ),
    };
  }

  return { success: true, user };
}
