/**
 * @file /api/approval/send-email/route.ts
 * @description 결재 요청 이메일 발송 API
 */

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      approvalId,
      fmeaType,
      fmeaTitle,
      requesterName,
      requesterEmail,
      approverId,
      approverName,
      approverEmail,
      approvalType, // 'review' | 'approve'
      dueDate,
      comments
    } = body;

    // localStorage에서 SMTP 설정 가져오기 (실제로는 DB에서 가져와야 함)
    const smtpSettings = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    // 이메일 전송기 설정
    const transporter = nodemailer.createTransport(smtpSettings);

    // 결재 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const approvalToken = Buffer.from(`${approvalId}:${approverId}:${Date.now()}`).toString('base64');
    const approvalLink = `${baseUrl}/approval/review?token=${approvalToken}&type=${approvalType}`;

    // 이메일 HTML 템플릿
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #00587a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: white; border: 1px solid #ddd; padding: 30px; border-radius: 0 0 8px 8px; }
          .button-container { text-align: center; margin: 30px 0; }
          .approve-button {
            display: inline-block;
            padding: 12px 30px;
            background: #10b981;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 0 10px;
          }
          .reject-button {
            display: inline-block;
            padding: 12px 30px;
            background: #ef4444;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 0 10px;
          }
          .view-button {
            display: inline-block;
            padding: 12px 30px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 0 10px;
          }
          .info-box {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .info-row { margin: 8px 0; }
          .label { font-weight: bold; color: #374151; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📋 FMEA 결재 요청</h1>
            <p style="margin: 5px 0 0 0;">
              ${approvalType === 'review' ? '검토 요청' : '승인 요청'}이 도착했습니다.
            </p>
          </div>

          <div class="content">
            <p>안녕하세요, <strong>${approverName}</strong>님</p>

            <p>
              <strong>${requesterName}</strong>님이 아래 FMEA에 대한
              ${approvalType === 'review' ? '검토' : '최종 승인'}을 요청하였습니다.
            </p>

            <div class="info-box">
              <div class="info-row">
                <span class="label">FMEA 유형:</span> ${fmeaType.toUpperCase()}
              </div>
              <div class="info-row">
                <span class="label">제목:</span> ${fmeaTitle}
              </div>
              <div class="info-row">
                <span class="label">요청자:</span> ${requesterName} (${requesterEmail})
              </div>
              <div class="info-row">
                <span class="label">처리 기한:</span> ${new Date(dueDate).toLocaleDateString('ko-KR')}
              </div>
              ${comments ? `
              <div class="info-row">
                <span class="label">요청 사유:</span> ${comments}
              </div>
              ` : ''}
            </div>

            <div class="button-container">
              <a href="${approvalLink}&action=approve" class="approve-button">✅ 승인하기</a>
              <a href="${approvalLink}&action=reject" class="reject-button">❌ 반려하기</a>
              <a href="${approvalLink}&action=view" class="view-button">📄 상세보기</a>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 20px;">
              <p style="margin: 0; color: #92400e;">
                <strong>⚠️ 주의사항:</strong><br>
                • 이 이메일은 FMEA 시스템에서 자동 발송된 메일입니다.<br>
                • 결재 링크는 보안상 24시간 동안만 유효합니다.<br>
                • 문의사항은 ${requesterEmail}로 연락 바랍니다.
              </p>
            </div>
          </div>

          <div class="footer">
            <p>
              FMEA 결재 시스템 | Powered by FMEA OnPremise<br>
              © 2026 All Rights Reserved
            </p>
            <p>
              이 메일은 수신 거부가 불가능한 시스템 알림 메일입니다.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 이메일 발송
    const mailOptions = {
      from: `"FMEA 시스템" <${smtpSettings.auth.user}>`,
      to: approverEmail,
      subject: `[FMEA 결재] ${approvalType === 'review' ? '검토' : '승인'} 요청 - ${fmeaTitle}`,
      html: emailHtml,
      text: `
        ${approverName}님, ${requesterName}님이 FMEA ${approvalType === 'review' ? '검토' : '승인'}을 요청하였습니다.

        FMEA 정보:
        - 유형: ${fmeaType.toUpperCase()}
        - 제목: ${fmeaTitle}
        - 처리 기한: ${new Date(dueDate).toLocaleDateString('ko-KR')}

        아래 링크에서 결재를 진행해주세요:
        ${approvalLink}
      `
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: '이메일이 성공적으로 발송되었습니다.'
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '이메일 발송 실패'
    }, { status: 500 });
  }
}