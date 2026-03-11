/**
 * @file route.ts
 * @description 비밀번호 재설정 실행 API (토큰 검증 후 비밀번호 변경)
 * @created 2026-01-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

// GET: 토큰 유효성 검증
export async function GET(req: NextRequest) {
    try {
        const prisma = getPrisma();
        if (!prisma) {
            return NextResponse.json({ valid: false, error: 'DB 연결 실패' }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ valid: false, error: '토큰이 없습니다.' }, { status: 400 });
        }

        // 토큰 조회
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token }
        });

        if (!resetToken) {
            return NextResponse.json({ valid: false, error: '유효하지 않은 토큰입니다.' });
        }

        if (resetToken.used) {
            return NextResponse.json({ valid: false, error: '이미 사용된 토큰입니다.' });
        }

        if (new Date() > resetToken.expiresAt) {
            return NextResponse.json({ valid: false, error: '만료된 토큰입니다.' });
        }

        // 사용자 정보 조회
        const user = await prisma.user.findUnique({
            where: { id: resetToken.userId },
            select: { email: true, name: true }
        });

        return NextResponse.json({
            valid: true,
            email: user?.email,
            userName: user?.name
        });

    } catch (error: any) {
        console.error('❌ 토큰 검증 오류:', error);
        return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
    }
}

// POST: 비밀번호 변경 실행
export async function POST(req: NextRequest) {
    try {
        const prisma = getPrisma();
        if (!prisma) {
            return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
        }

        const body = await req.json();
        const { token, newPassword } = body;

        if (!token || !newPassword) {
            return NextResponse.json({
                success: false,
                error: '토큰과 새 비밀번호를 입력해주세요.'
            }, { status: 400 });
        }

        if (newPassword.length < 4) {
            return NextResponse.json({
                success: false,
                error: '비밀번호는 4자 이상이어야 합니다.'
            }, { status: 400 });
        }

        // 토큰 조회
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token }
        });

        if (!resetToken) {
            return NextResponse.json({ success: false, error: '유효하지 않은 토큰입니다.' }, { status: 400 });
        }

        if (resetToken.used) {
            return NextResponse.json({ success: false, error: '이미 사용된 토큰입니다.' }, { status: 400 });
        }

        if (new Date() > resetToken.expiresAt) {
            return NextResponse.json({ success: false, error: '만료된 토큰입니다.' }, { status: 400 });
        }

        // 비밀번호 해시
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 트랜잭션: 비밀번호 변경 + 토큰 사용 처리
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword }
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true }
            })
        ]);

        return NextResponse.json({
            success: true,
            message: '비밀번호가 성공적으로 변경되었습니다.'
        });

    } catch (error: any) {
        console.error('❌ 비밀번호 변경 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
