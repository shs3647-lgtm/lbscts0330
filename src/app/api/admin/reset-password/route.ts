/**
 * @file route.ts
 * @description 비밀번호 재설정 API (관리자 전용)
 * @created 2026-01-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

// POST: 비밀번호 재설정 (관리자가 사용자 비밀번호 초기화)
export async function POST(req: NextRequest) {
    try {
        const prisma = getPrisma();
        if (!prisma) {
            return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
        }

        const body = await req.json();
        const { userId, userEmail, newPassword, adminPassword } = body;

        // 관리자 인증 (환경변수 기반 — ADMIN_SECRET 설정 필수)
        const adminSecret = process.env.ADMIN_SECRET;
        if (!adminSecret || adminPassword !== adminSecret) {
            return NextResponse.json({
                success: false,
                error: '관리자 인증에 실패했습니다.'
            }, { status: 401 });
        }

        // 대상 사용자 찾기
        const targetUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { id: userId || undefined },
                    { email: userEmail || undefined }
                ]
            }
        });

        if (!targetUser) {
            return NextResponse.json({
                success: false,
                error: '해당 사용자를 찾을 수 없습니다.'
            }, { status: 404 });
        }

        // 새 비밀번호 설정 (필수 입력)
        if (!newPassword || newPassword.length < 4) {
            return NextResponse.json({
                success: false,
                error: '새 비밀번호를 4자 이상으로 입력해주세요.'
            }, { status: 400 });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 비밀번호 업데이트
        await prisma.user.update({
            where: { id: targetUser.id },
            data: { password: hashedPassword }
        });

        return NextResponse.json({
            success: true,
            message: `${targetUser.name}님의 비밀번호가 초기화되었습니다.`,
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
            },
        });

    } catch (error: unknown) {
        console.error('❌ 비밀번호 재설정 오류:', error);
        return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
    }
}

// GET: 사용 방법 안내
export async function GET() {
    return NextResponse.json({
        message: '비밀번호 재설정 API (관리자 전용)',
        usage: {
            method: 'POST',
            body: {
                userEmail: '재설정할 사용자 이메일 (필수)',
                userId: '또는 사용자 ID (선택)',
                newPassword: '새 비밀번호 (필수, 4자 이상)',
                adminPassword: '관리자 비밀번호 (필수, ADMIN_SECRET 환경변수)',
            },
        }
    });
}
