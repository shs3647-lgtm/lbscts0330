/**
 * @file route.ts
 * @description 테스트 이메일 발송 API
 * @created 2026-01-26
 */

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

// POST: 테스트 이메일 발송
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { config } = body;

        if (!config) {
            return NextResponse.json({ success: false, message: '설정 데이터가 없습니다.' }, { status: 400 });
        }

        if (!config.smtpUser || !config.smtpPass) {
            // 콘솔 출력 모드 (시뮬레이션)

            return NextResponse.json({
                success: true,
                message: '테스트 발송 시뮬레이션 완료 (SMTP 인증 정보 없음 - 콘솔 로그 확인)'
            });
        }

        // 실제 이메일 발송
        const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpPort === 465,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPass,
            },
        });

        await transporter.sendMail({
            from: `"${config.fromName}" <${config.fromEmail}>`,
            to: config.smtpUser, // 자기 자신에게 발송
            subject: '[FMEA 시스템] 테스트 이메일',
            html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #00587a;">✅ FMEA 시스템 이메일 테스트</h2>
          <p>이 이메일은 SMTP 설정 테스트를 위해 발송되었습니다.</p>
          <hr>
          <p style="color: #888; font-size: 12px;">
            Host: ${config.smtpHost}:${config.smtpPort}<br>
            From: ${config.fromName} &lt;${config.fromEmail}&gt;<br>
            발송 시간: ${new Date().toLocaleString('ko-KR')}
          </p>
        </div>
      `,
        });

        return NextResponse.json({
            success: true,
            message: `테스트 이메일이 ${config.smtpUser}로 발송되었습니다.`
        });

    } catch (error: any) {
        console.error('❌ 테스트 이메일 발송 오류:', error);
        return NextResponse.json({
            success: false,
            message: `발송 실패: ${error.message}`
        }, { status: 500 });
    }
}
