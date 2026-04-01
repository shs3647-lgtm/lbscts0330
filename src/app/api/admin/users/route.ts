/**
 * @file route.ts
 * @description 사용자 관리 API (조회/추가/수정/삭제)
 * @created 2026-01-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

// GET: 사용자 목록 조회 또는 개별 사용자 조회
export async function GET(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패', users: [] });
    }

    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('id');
        const userEmail = searchParams.get('email');  // ★ 이메일로 조회 추가

        // 개별 사용자 조회 (id 파라미터가 있는 경우)
        if (userId) {
            const user = await prisma.user.findFirst({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    factory: true,
                    department: true,
                    position: true,
                    phone: true,
                    role: true,
                    permPfmea: true,
                    permDfmea: true,
                    permCp: true,
                    permPfd: true,
                    isActive: true,
                    photoUrl: true,
                }
            });

            if (!user) {
                return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' });
            }

            return NextResponse.json({
                success: true,
                user: {
                    ...user,
                    customer: user.factory || '전체',
                    loginType: 'email' as const,
                }
            });
        }

        // ★ 이메일로 사용자 조회 (로그인 화면에서 프로필 사진 표시용)
        if (userEmail) {
            const user = await prisma.user.findFirst({
                where: { email: userEmail },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    photoUrl: true,
                }
            });

            if (!user) {
                return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' });
            }

            return NextResponse.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    photoUrl: user.photoUrl,
                }
            });
        }

        // 전체 사용자 목록 조회
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                factory: true,
                department: true,
                position: true,
                phone: true,
                role: true,
                permPfmea: true,
                permDfmea: true,
                permCp: true,
                permPfd: true,
                isActive: true,
                photoUrl: true,
            }
        });

        // 로그인 타입을 email로 기본 설정 
        const usersWithType = users.map((u: any) => ({
            ...u,
            loginType: 'email' as const,
            customer: u.factory || '전체',
        }));

        return NextResponse.json({ success: true, users: usersWithType });
    } catch (error: any) {
        console.error('사용자 조회 오류:', error);
        return NextResponse.json({ success: false, error: error.message, users: [] });
    }
}

// POST: 사용자 추가/수정
export async function POST(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { user } = body;

        if (!user || !user.name || !user.email) {
            return NextResponse.json({ success: false, error: '이름과 이메일은 필수입니다.' }, { status: 400 });
        }

        // 기존 사용자 확인
        const existing = await prisma.user.findFirst({
            where: { email: user.email }
        });

        if (existing) {
            // 수정
            await prisma.user.update({
                where: { id: existing.id },
                data: {
                    name: user.name,
                    factory: user.customer || existing.factory || '전체',
                    department: user.department || '',
                    position: user.position || '',
                    phone: user.phone || null,
                    role: user.role || 'viewer',
                    permPfmea: user.permPfmea || 'none',
                    permDfmea: user.permDfmea || 'none',
                    permCp: user.permCp || 'none',
                    permPfd: user.permPfd || 'none',
                    isActive: user.isActive !== false,
                    ...(user.photoUrl !== undefined && { photoUrl: user.photoUrl }),
                }
            });
            return NextResponse.json({ success: true, message: '사용자 정보가 수정되었습니다.' });
        } else {
            // 추가 (기본 비밀번호: 1234)
            const hashedPassword = await bcrypt.hash('1234', 10);
            await prisma.user.create({
                data: {
                    name: user.name,
                    email: user.email,
                    factory: user.customer || '기본',
                    department: user.department || '',
                    position: user.position || '',
                    phone: user.phone || null,
                    password: hashedPassword,
                    role: user.role || 'viewer',
                    permPfmea: user.permPfmea || 'none',
                    permDfmea: user.permDfmea || 'none',
                    permCp: user.permCp || 'none',
                    permPfd: user.permPfd || 'none',
                    isActive: user.isActive !== false,
                }
            });
            return NextResponse.json({ success: true, message: '사용자가 추가되었습니다. (초기 비밀번호: 1234)' });
        }
    } catch (error: any) {
        console.error('사용자 저장 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: 사용자 삭제
export async function DELETE(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID가 필요합니다.' }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: '사용자가 삭제되었습니다.' });
    } catch (error: any) {
        console.error('사용자 삭제 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
