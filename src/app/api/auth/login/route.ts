/**
 * @file route.ts
 * @description 로그인 API
 * @created 2026-01-21
 */

import { NextRequest, NextResponse } from 'next/server';
import { login, initializeAdmin } from '@/lib/services/auth-service';

export const runtime = 'nodejs';

// POST: 로그인
export async function POST(req: NextRequest) {
  try {
    // Admin 초기화 (DB 오류 시 무시 - 하드코딩된 계정으로 로그인 가능)
    try {
      await initializeAdmin();
    } catch (initError) {
      console.error('[login] Admin 초기화 실패:', initError);
    }

    const body = await req.json();
    // email 또는 loginId 모두 지원
    const loginId = body.loginId || body.email;
    const password = body.password;

    if (!loginId || !password) {
      return NextResponse.json({
        success: false,
        error: 'ID와 비밀번호를 입력해주세요.'
      }, { status: 400 });
    }

    const result = await login(loginId, password);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 401 });
    }

    // 응답에 사용자 정보 포함
    const response = NextResponse.json({
      success: true,
      user: result.user
    });

    // 쿠키로 세션 저장 (간단한 구현)
    response.cookies.set('fmea-user', JSON.stringify(result.user), {
      httpOnly: false, // 클라이언트에서 읽을 수 있도록
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24시간
    });

    return response;
  } catch (error) {
    console.error('❌ 로그인 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: '로그인 처리 중 서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
