/**
 * @file /api/admin/settings/approval/test-email/route.ts
 * @description 테스트 이메일 발송 API (Resend 사용)
 * @created 2026-01-19
 * @updated 2026-01-23: Resend API로 변경
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { escapeHtml, safeErrorMessage } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // 환경변수에서 API 키 로드 (하드코딩 금지)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY 환경변수가 설정되지 않았습니다.'
      }, { status: 500 });
    }

    const body = await request.json();
    const { testEmail } = body;

    // 테스트 수신 이메일 (환경변수 또는 요청 body에서)
    const targetEmail = testEmail || process.env.ADMIN_EMAIL;
    if (!targetEmail) {
      return NextResponse.json({
        success: false,
        error: '수신 이메일이 설정되지 않았습니다.'
      }, { status: 400 });
    }

    const resend = new Resend(RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'Smart System <onboarding@resend.dev>',
      to: [targetEmail],
      subject: '[Smart System] 결재 시스템 이메일 테스트',
      html: `
        <div style="font-family: 'Malgun Gothic', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="background: #00587a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2>이메일 설정 테스트 성공!</h2>
          </div>
          <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
            <p>Smart System 결재 시스템의 이메일 발송 설정이 올바르게 구성되었습니다.</p>
            <table style="width: 100%; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>서비스</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">Resend API</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>수신자</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(targetEmail)}</td></tr>
              <tr><td style="padding: 8px;"><strong>테스트 시간</strong></td><td style="padding: 8px;">${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td></tr>
            </table>
            <p style="color: #666; font-size: 13px;">이제 결재 요청 이메일을 발송할 수 있습니다.</p>
          </div>
          <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
            Smart System 결재 시스템
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('[이메일 테스트 오류]', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }


    return NextResponse.json({
      success: true,
      message: `테스트 이메일이 ${targetEmail}로 발송되었습니다.`,
      emailId: data?.id,
    });

  } catch (error: unknown) {
    console.error('[이메일 테스트 오류]', error);
    return NextResponse.json({
      success: false,
      error: safeErrorMessage(error)
    }, { status: 500 });
  }
}
