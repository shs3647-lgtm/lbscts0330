/**
 * @file route.ts
 * @description 비밀번호 재설정 요청 API (이메일 발송)
 * @created 2026-01-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/services/email-service';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

// POST: 비밀번호 재설정 요청 (이메일 발송)
export async function POST(req: NextRequest) {
    try {
        const prisma = getPrisma();
        if (!prisma) {
            return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
        }

        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({
                success: false,
                error: '이메일을 입력해주세요.'
            }, { status: 400 });
        }

        // 사용자 검색
        const user = await prisma.user.findFirst({
            where: {
                email: email,
                isActive: true
            }
        });

        // 보안상 사용자 존재 여부를 알려주지 않음
        if (!user) {
            // 사용자가 없어도 동일한 메시지 반환 (보안)
            return NextResponse.json({
                success: true,
                message: '등록된 이메일이라면 비밀번호 재설정 링크가 발송됩니다.'
            });
        }

        // 기존 토큰 삭제 (미사용분)
        await prisma.passwordResetToken.deleteMany({
            where: {
                userId: user.id,
                used: false
            }
        });

        // 새 토큰 생성 (1시간 유효)
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간 후

        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt,
            }
        });

        // 재설정 링크 생성
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const resetLink = `${baseUrl}/reset-password?token=${token}`;

        // 이메일 발송
        const emailResult = await sendPasswordResetEmail(
            user.email!,
            user.name,
            resetLink
        );

        if (!emailResult.success) {
            console.error('이메일 발송 실패:', emailResult.message);
            // 실패해도 보안상 동일 메시지
        }

        return NextResponse.json({
            success: true,
            message: '등록된 이메일이라면 비밀번호 재설정 링크가 발송됩니다.'
        });

    } catch (error: any) {
        console.error('❌ 비밀번호 재설정 요청 오류:', error);
        return NextResponse.json({ success: false, error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

// GET: 사용 방법 안내
export async function GET() {
    return NextResponse.json({
        message: '비밀번호 재설정 요청 API',
        usage: {
            method: 'POST',
            body: { email: '사용자 이메일 (필수)' },
        }
    });
}
