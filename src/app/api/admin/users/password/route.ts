/**
 * @file route.ts
 * @description 사용자 비밀번호 변경 API (관리자용)
 * @created 2026-01-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

// POST: 비밀번호 변경
export async function POST(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { userId, userEmail, newPassword } = body;

        if (!newPassword || newPassword.length < 4) {
            return NextResponse.json({
                success: false,
                error: '비밀번호는 4자 이상이어야 합니다.'
            }, { status: 400 });
        }

        // 사용자 찾기
        let user = null;
        if (userId) {
            user = await prisma.user.findUnique({ where: { id: userId } });
        } else if (userEmail) {
            user = await prisma.user.findFirst({ where: { email: userEmail } });
        }

        if (!user) {
            return NextResponse.json({
                success: false,
                error: '사용자를 찾을 수 없습니다.'
            }, { status: 404 });
        }

        // 비밀번호 해시
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 업데이트
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });


        return NextResponse.json({
            success: true,
            message: `${user.name}님의 비밀번호가 변경되었습니다.`
        });

    } catch (error: any) {
        console.error('❌ 비밀번호 변경 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
