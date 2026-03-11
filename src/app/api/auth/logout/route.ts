/**
 * 사용자 로그아웃 API
 * 
 * POST /api/auth/logout - 로그아웃
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 실제로는 세션 쿠키 삭제 또는 JWT 토큰 무효화
    // 현재는 간단히 성공 응답만 반환
    
    return NextResponse.json({
      success: true,
      message: '로그아웃 완료',
    });
  } catch (error: any) {
    console.error('[로그아웃] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '로그아웃 실패' },
      { status: 500 }
    );
  }
}








