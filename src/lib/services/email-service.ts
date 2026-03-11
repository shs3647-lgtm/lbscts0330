/**
 * @file email-service.ts
 * @description 이메일 발송 서비스 (nodemailer)
 * @created 2026-01-26
 */

import nodemailer from 'nodemailer';

// 이메일 설정 (환경변수 또는 기본값)
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@fmea.local';

// 트랜스포터 생성
function createTransporter() {
    // 이메일 설정이 없으면 콘솔 출력 모드
    if (!EMAIL_USER || !EMAIL_PASS) {
        return null;
    }

    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT === 465, // true for 465, false for other ports
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
}

/**
 * 비밀번호 재설정 이메일 발송
 */
export async function sendPasswordResetEmail(
    email: string,
    userName: string,
    resetLink: string
): Promise<{ success: boolean; message: string }> {
    const transporter = createTransporter();

    const emailContent = {
        from: EMAIL_FROM,
        to: email,
        subject: '[FMEA 시스템] 비밀번호 재설정 요청',
        html: `
      <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #00587a 0%, #007a9e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔐 FMEA 시스템</h1>
          <p style="color: #e0f0ff; margin: 10px 0 0 0;">비밀번호 재설정 요청</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="font-size: 16px; color: #333;">안녕하세요, <strong>${userName}</strong>님!</p>
          
          <p style="color: #555; line-height: 1.8;">
            비밀번호 재설정 요청이 접수되었습니다.<br>
            아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; background: #00587a; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              🔑 비밀번호 재설정하기
            </a>
          </div>
          
          <p style="color: #888; font-size: 13px; margin-top: 20px;">
            ⏰ 이 링크는 <strong>1시간 후</strong> 만료됩니다.<br>
            본인이 요청하지 않은 경우, 이 이메일을 무시하세요.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #aaa; font-size: 12px; text-align: center;">
            링크가 작동하지 않으면 아래 URL을 브라우저에 붙여넣으세요:<br>
            <span style="color: #666; word-break: break-all;">${resetLink}</span>
          </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © FMEA On-Premise System | AMP SYSTEM
          </p>
        </div>
      </div>
    `,
        text: `
FMEA 시스템 - 비밀번호 재설정

안녕하세요, ${userName}님!

비밀번호 재설정 요청이 접수되었습니다.
아래 링크를 클릭하여 새 비밀번호를 설정해주세요:

${resetLink}

이 링크는 1시간 후 만료됩니다.
본인이 요청하지 않은 경우, 이 이메일을 무시하세요.

© FMEA On-Premise System
    `
    };

    try {
        if (transporter) {
            await transporter.sendMail(emailContent);
            return { success: true, message: '이메일이 발송되었습니다.' };
        } else {
            // 콘솔 출력 모드 (테스트용)
            return { success: true, message: '이메일 발송 시뮬레이션 완료 (콘솔 로그 확인)' };
        }
    } catch (error: any) {
        console.error('❌ 이메일 발송 실패:', error);
        return { success: false, message: error.message };
    }
}
