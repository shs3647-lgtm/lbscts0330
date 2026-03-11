/**
 * @file route.ts
 * @description 비밀번호 변경 API
 * @created 2026-01-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { email, currentPassword, newPassword } = body;

    // 필수 필드 검증
    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: '모든 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 비밀번호 확인
    const hashedCurrentPassword = crypto.createHash('sha256').update(currentPassword).digest('hex');
    
    if (user.password !== hashedCurrentPassword) {
      return NextResponse.json(
        { success: false, error: '현재 비밀번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 새 비밀번호 해시
    const hashedNewPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword }
    });

    console.log(`✅ 비밀번호 변경 완료: ${user.name} (${user.email})`);

    return NextResponse.json({
      success: true,
      message: '비밀번호가 변경되었습니다.',
    });

  } catch (error: any) {
    console.error('[Change Password API] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '비밀번호 변경에 실패했습니다.' },
      { status: 500 }
    );
  }
}
