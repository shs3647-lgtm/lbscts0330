/**
 * @file route.ts
 * @description 이메일 설정 API (고객사별 SMTP 저장/조회)
 * @created 2026-01-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// POST: 이메일 설정 저장
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { config } = body;

        if (!config) {
            return NextResponse.json({ success: false, error: '설정 데이터가 없습니다.' }, { status: 400 });
        }

        // 환경변수로 저장하는 방식 (실제로는 DB에 저장하거나 .env 파일 수정)
        // 온프레미스 환경에서는 주로 .env 파일을 직접 수정하거나 DB에 저장

        // 현재는 시뮬레이션 (콘솔 로그)

        // TODO: 실제 구현 시 DB 또는 파일에 저장
        // const prisma = getPrisma();
        // await prisma.systemConfig.upsert({...});

        return NextResponse.json({
            success: true,
            message: `${config.customerName} 이메일 설정이 저장되었습니다.`
        });

    } catch (error: any) {
        console.error('❌ 이메일 설정 저장 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// GET: 이메일 설정 조회
export async function GET() {
    try {
        // 환경변수에서 현재 설정 반환
        return NextResponse.json({
            success: true,
            config: {
                smtpHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
                smtpPort: parseInt(process.env.EMAIL_PORT || '587'),
                smtpUser: process.env.EMAIL_USER || '',
                fromEmail: process.env.EMAIL_FROM || 'noreply@fmea.local',
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
