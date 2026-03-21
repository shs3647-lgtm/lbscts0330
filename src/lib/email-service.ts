/**
 * @file email-service.ts
 * @description FMEA 결재 이메일 알림 서비스
 * - SMTP: .env에 SMTP_USER/SMTP_PASS 설정 시 실제 발송
 * - 미설정 또는 수신자 이메일 없으면 발송하지 않음
 */

import nodemailer from 'nodemailer';

interface EmailNotifyParams {
  type: 'submit' | 'review_approve' | 'final_approve' | 'reject';
  revisionNumber: string;
  fmeaName: string;
  fmeaId: string;
  fromName: string;
  fromPosition: string;
  toName: string;
  toPosition: string;
  toEmail?: string;
  reason?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =====================================================
// SMTP 트랜스포터 생성
// =====================================================

function createTransporter(): { transporter: nodemailer.Transporter; senderEmail: string } | null {
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';

  if (!smtpUser || !smtpPass || smtpUser === 'your-email@gmail.com') {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: smtpUser, pass: smtpPass },
  });
  return { transporter, senderEmail: smtpUser };
}

// =====================================================
// 이메일 제목/본문 생성
// =====================================================

function getSubjectAndBody(params: EmailNotifyParams): { subject: string; html: string } {
  const { type, revisionNumber, fmeaName, fmeaId, fromName, fromPosition, toName, toPosition, reason } = params;

  const typeConfig = {
    submit: { title: 'FMEA 검토 요청', badge: '상신', badgeColor: '#2563eb', prefix: '[검토요청]',
      body: `<p><strong>${fromPosition} ${fromName}</strong>님이 FMEA 문서를 상신하였습니다.</p><p>검토 후 승인/반려 처리를 부탁드립니다.</p>` },
    review_approve: { title: 'FMEA 최종 승인 요청', badge: '검토승인', badgeColor: '#16a34a', prefix: '[승인요청]',
      body: `<p><strong>${fromPosition} ${fromName}</strong>님이 검토를 승인하였습니다.</p><p>최종 승인 처리를 부탁드립니다.</p>` },
    final_approve: { title: 'FMEA 결재 완료', badge: '최종승인', badgeColor: '#16a34a', prefix: '[결재완료]',
      body: `<p><strong>${fromPosition} ${fromName}</strong>님이 최종 승인하였습니다.</p><p>모든 결재가 완료되었습니다.</p>` },
    reject: { title: 'FMEA 반려 통보', badge: '반려', badgeColor: '#dc2626', prefix: '[반려]',
      body: `<p><strong>${fromPosition} ${fromName}</strong>님이 반려하였습니다.</p><p>반려 사유를 확인하시고 재상신 부탁드립니다.</p>` },
  };

  const cfg = typeConfig[type];
  return {
    subject: `${cfg.prefix} ${fmeaName} - Rev.${revisionNumber}`,
    html: buildEmailHtml({ ...cfg, type, fmeaId, fmeaName, revisionNumber, fromName, fromPosition, toName, toPosition, reason }),
  };
}

interface HtmlParams {
  title: string; badge: string; badgeColor: string; body: string;
  type: 'submit' | 'review_approve' | 'final_approve' | 'reject';
  fmeaId: string; fmeaName: string; revisionNumber: string;
  fromName: string; fromPosition: string; toName: string; toPosition: string; reason?: string;
}

function buildEmailHtml(p: HtmlParams): string {
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:'맑은 고딕',sans-serif;margin:0;padding:20px;background:#f5f5f5">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:#00587a;color:white;padding:16px 24px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:16px;font-weight:bold">SMART FMEA System</span>
      <span style="background:${p.badgeColor};color:white;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:bold">${p.badge}</span>
    </div>
  </div>
  <div style="padding:24px">
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px">${p.title}</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px">
      <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px;color:#6b7280;width:100px">FMEA ID</td><td style="padding:8px 12px;font-weight:bold;color:#2563eb">${p.fmeaId}</td></tr>
      <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px;color:#6b7280">FMEA명</td><td style="padding:8px 12px;font-weight:bold">${p.fmeaName}</td></tr>
      <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px;color:#6b7280">개정번호</td><td style="padding:8px 12px;font-weight:bold;color:#16a34a">${p.revisionNumber}</td></tr>
      <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px;color:#6b7280">발신</td><td style="padding:8px 12px">${p.fromPosition} ${p.fromName}</td></tr>
      <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px;color:#6b7280">수신</td><td style="padding:8px 12px;font-weight:bold">${p.toPosition} ${p.toName}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280">일시</td><td style="padding:8px 12px">${now}</td></tr>
    </table>
    <div style="color:#374151;line-height:1.6;margin-bottom:16px">${p.body}</div>
    ${p.reason ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin-bottom:16px">
      <div style="font-size:11px;color:#92400e;font-weight:bold;margin-bottom:4px">사유</div>
      <div style="color:#78350f;font-size:13px">${p.reason}</div>
    </div>` : ''}
    ${p.type !== 'final_approve' ? `<div style="text-align:center;margin:16px 0">
      <a href="http://new.smartfmea.co.kr:3001/approval/approver-portal" style="display:inline-block;padding:10px 24px;background:#00587a;color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold">결재 처리하기</a>
    </div>` : ''}
  </div>
  <div style="background:#f9fafb;padding:12px 24px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb">
    SMART FMEA System - 자동 발송 알림
  </div>
</div></body></html>`;
}

// =====================================================
// 이메일 발송 메인 함수
// =====================================================

export async function sendApprovalNotification(params: EmailNotifyParams): Promise<EmailResult> {
  // SMTP 미설정 시 발송하지 않음
  const smtp = createTransporter();
  if (!smtp) {
    return { success: false, error: 'SMTP 미설정 (SMTP_USER/SMTP_PASS 환경변수 필요)' };
  }

  // 수신자 이메일 없으면 발송하지 않음
  if (!params.toEmail) {
    return { success: false, error: '수신자 이메일 미등록' };
  }

  try {
    const { transporter, senderEmail } = smtp;
    const { subject, html } = getSubjectAndBody(params);

    const info = await transporter.sendMail({
      from: `"SMART FMEA (${params.fromPosition} ${params.fromName})" <${senderEmail}>`,
      to: params.toEmail,
      subject,
      html,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('[이메일 서비스] 발송 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}
