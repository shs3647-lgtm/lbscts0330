/**
 * @file /api/admin/settings/approval/test-email/route.ts
 * @description SMTP 테스트 이메일 발송 API
 * @created 2026-01-19
 */

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, secure, user, pass, fromName, testEmail } = body;
    
    if (!host || !user || !pass || !testEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'SMTP 설정이 불완전합니다.' 
      }, { status: 400 });
    }
    
    // Nodemailer 트랜스포터 생성
    const transporter = nodemailer.createTransport({
      host,
      port: port || 587,
      secure: secure || false,
      auth: { user, pass },
    });
    
    // 연결 테스트
    await transporter.verify();
    
    // 테스트 이메일 발송
    await transporter.sendMail({
      from: `"${fromName || 'FMEA 시스템'}" <${user}>`,
      to: testEmail,
      subject: '[FMEA] SMTP 설정 테스트',
      html: `
        <div style="font-family: 'Malgun Gothic', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="background: #00587a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2>✅ SMTP 설정 테스트 성공!</h2>
          </div>
          <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
            <p>FMEA 결재 시스템의 이메일 발송 설정이 올바르게 구성되었습니다.</p>
            <table style="width: 100%; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>SMTP 서버</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${host}:${port}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>발신자</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${user}</td></tr>
              <tr><td style="padding: 8px;"><strong>테스트 시간</strong></td><td style="padding: 8px;">${new Date().toLocaleString('ko-KR')}</td></tr>
            </table>
            <p style="color: #666; font-size: 13px;">이제 결재 요청 이메일을 발송할 수 있습니다.</p>
          </div>
          <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
            FMEA On-Premise 결재 시스템
          </div>
        </div>
      `,
    });
    
    return NextResponse.json({
      success: true,
      message: `테스트 이메일이 ${testEmail}로 발송되었습니다.`,
    });
    
  } catch (error: any) {
    console.error('[SMTP 테스트 오류]', error);
    
    // 에러 메시지 한글화
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = '인증 실패: 이메일 또는 비밀번호를 확인하세요. (Gmail은 앱 비밀번호 필요)';
    } else if (error.code === 'ESOCKET') {
      errorMessage = '연결 실패: SMTP 서버 주소와 포트를 확인하세요.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = '연결 거부: 방화벽 또는 네트워크 설정을 확인하세요.';
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}
