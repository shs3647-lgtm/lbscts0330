/**
 * @file route.ts
 * @description 사용자 일괄 Import API (엑셀)
 * @created 2026-01-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

// POST: 사용자 일괄 Import
export async function POST(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { users } = body;

        if (!users || !Array.isArray(users) || users.length === 0) {
            return NextResponse.json({ success: false, error: '가져올 사용자 데이터가 없습니다.' }, { status: 400 });
        }

        let count = 0;
        const hashedPassword = await bcrypt.hash('1234', 10); // 기본 비밀번호

        for (const user of users) {
            if (!user.name || !user.email) continue;

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
                        department: user.department || '',
                        position: user.position || '',
                        phone: user.phone || null,
                        role: user.role || 'viewer',
                        permPfmea: user.permPfmea || 'none',
                        permDfmea: user.permDfmea || 'none',
                        permCp: user.permCp || 'none',
                        permPfd: user.permPfd || 'none',
                        isActive: user.isActive !== false,
                    }
                });
            } else {
                // 추가
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
            }
            count++;
        }

        return NextResponse.json({
            success: true,
            count,
            message: `${count}명의 사용자를 가져왔습니다.`
        });
    } catch (error: any) {
        console.error('사용자 Import 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
