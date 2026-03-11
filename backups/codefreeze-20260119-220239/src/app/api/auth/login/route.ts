/**
 * 사용자 로그인 API
 * 
 * POST /api/auth/login - 로그인
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import * as crypto from 'crypto';

export const runtime = 'nodejs';

// 비밀번호 해시 생성 (간단한 SHA-256)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 비밀번호 검증
function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 확인
    if (!user.password) {
      // 비밀번호가 설정되지 않은 경우 (초기 사용자)
      return NextResponse.json(
        { success: false, error: '비밀번호가 설정되지 않았습니다. 관리자에게 문의하세요.' },
        { status: 401 }
      );
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 활성화 여부 확인
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: '승인 대기 중인 계정입니다. 관리자 승인 후 로그인이 가능합니다.' },
        { status: 403 }
      );
    }

    // 마지막 로그인 시간 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // 세션 정보 반환 (실제로는 JWT 토큰 또는 세션 쿠키 사용 권장)
    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      factory: user.factory,
      department: user.department,
      position: user.position,
      role: (user as any).role || 'viewer',
      permPfmea: (user as any).permPfmea || 'none',
      permDfmea: (user as any).permDfmea || 'none',
      permCp: (user as any).permCp || 'none',
      permPfd: (user as any).permPfd || 'none',
    };

    console.log(`✅ 로그인 성공: ${user.name} (${user.email})`);

    return NextResponse.json({
      success: true,
      user: sessionData,
      message: '로그인 성공',
    });
  } catch (error: any) {
    console.error('[로그인] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '로그인 실패' },
      { status: 500 }
    );
  }
}








