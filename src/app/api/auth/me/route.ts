/**
 * 현재 로그인 사용자 정보 조회 API
 * 
 * GET /api/auth/me - 현재 사용자 정보
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured', user: null },
      { status: 500 }
    );
  }

  try {
    // 실제로는 세션 쿠키 또는 JWT 토큰에서 사용자 ID 추출
    // 현재는 헤더에서 userId를 받는 것으로 가정
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.', user: null },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        factory: true,
        department: true,
        position: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        role: true, // ✅ 2026-01-19: 권한 정보 추가
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.', user: null },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: '비활성화된 계정입니다.', user: null },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        factory: user.factory,
        department: user.department,
        position: user.position,
        phone: user.phone || '',
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        role: (user as any).role || 'viewer', // ✅ 2026-01-19: 권한 정보 추가
      }
    });
  } catch (error: any) {
    console.error('[사용자 정보 조회] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '사용자 정보 조회 실패', user: null },
      { status: 500 }
    );
  }
}








