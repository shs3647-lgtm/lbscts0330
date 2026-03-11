/**
 * @file route.ts
 * @description 데모 신청 API - Resend 사용 이메일 발송
 * @created 2026-01-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { escapeHtml, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

// 데모 신청 수신 이메일 (환경변수 설정)
const DEMO_REQUEST_EMAILS = (process.env.DEMO_REQUEST_EMAILS || process.env.ADMIN_EMAIL || '').split(',').filter(Boolean);

// POST: 데모 신청
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, company, department, position, reqPfmea, reqDfmea, reqCp, reqPfd, message } = body;

    // 필수 필드 검증
    if (!name || !email || !phone || !company) {
      return NextResponse.json({
        success: false,
        error: '필수 항목을 모두 입력해주세요.'
      }, { status: 400 });
    }

    // 관심 모듈 목록
    const modules: string[] = [];
    if (reqPfmea) modules.push('PFMEA (공정)');
    if (reqDfmea) modules.push('DFMEA (설계)');
    if (reqCp) modules.push('CP (관리계획)');
    if (reqPfd) modules.push('PFD (공정흐름)');

    if (modules.length === 0) {
      return NextResponse.json({
        success: false,
        error: '관심 모듈을 최소 1개 이상 선택해주세요.'
      }, { status: 400 });
    }

    // XSS 방지: 이메일 HTML에 사용자 입력 이스케이프
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeCompany = escapeHtml(company);
    const safeDepartment = escapeHtml(department || '-');
    const safePosition = escapeHtml(position || '-');
    const safeMessage = escapeHtml(message || '');

    // 이메일 본문 생성 (이스케이프된 값 사용)
    const emailHtml = `
      <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316, #f59e0b); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Smart System 데모 신청</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">새로운 데모 신청이 접수되었습니다.</p>
        </div>

        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th style="text-align: left; padding: 12px; background: #f9fafb; width: 120px;">성명</th>
              <td style="padding: 12px;">${safeName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th style="text-align: left; padding: 12px; background: #f9fafb;">이메일</th>
              <td style="padding: 12px;">${safeEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th style="text-align: left; padding: 12px; background: #f9fafb;">전화번호</th>
              <td style="padding: 12px;">${safePhone}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th style="text-align: left; padding: 12px; background: #f9fafb;">회사명</th>
              <td style="padding: 12px;">${safeCompany}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th style="text-align: left; padding: 12px; background: #f9fafb;">부서</th>
              <td style="padding: 12px;">${safeDepartment}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th style="text-align: left; padding: 12px; background: #f9fafb;">직급</th>
              <td style="padding: 12px;">${safePosition}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th style="text-align: left; padding: 12px; background: #f9fafb;">관심 모듈</th>
              <td style="padding: 12px;">
                ${modules.map(m => `<span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; margin: 2px;">${escapeHtml(m)}</span>`).join(' ')}
              </td>
            </tr>
            ${safeMessage ? `
            <tr>
              <th style="text-align: left; padding: 12px; background: #f9fafb; vertical-align: top;">문의사항</th>
              <td style="padding: 12px; white-space: pre-wrap;">${safeMessage}</td>
            </tr>
            ` : ''}
          </table>

          <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; font-size: 13px; color: #92400e;">
            신청일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </div>
        </div>
      </div>
    `;

    // 이메일 발송 시도
    let emailSent = false;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey && DEMO_REQUEST_EMAILS.length > 0) {
      try {
        const resend = new Resend(resendApiKey);

        const { data, error } = await resend.emails.send({
          from: 'Smart System <onboarding@resend.dev>',
          to: DEMO_REQUEST_EMAILS,
          subject: `[Smart System 데모신청] ${safeCompany} - ${safeName}`,
          html: emailHtml,
          replyTo: email,
        });

        if (error) {
          console.error('Resend 이메일 발송 실패:', error);
        } else {
          emailSent = true;
        }
      } catch (mailError) {
        console.error('이메일 발송 오류:', mailError);
      }
    } else {
    }

    return NextResponse.json({
      success: true,
      message: '데모 신청이 접수되었습니다.',
      emailSent,
    });

  } catch (error: unknown) {
    console.error('데모 신청 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: safeErrorMessage(error)
    }, { status: 500 });
  }
}
