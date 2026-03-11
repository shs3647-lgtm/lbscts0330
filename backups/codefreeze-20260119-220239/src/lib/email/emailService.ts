/**
 * @file emailService.ts
 * @description FMEA 결재 이메일 발송 서비스
 * @created 2026-01-19
 */

import nodemailer from 'nodemailer';

// ============================================================================
// 타입 정의
// ============================================================================

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface ApprovalEmailData {
  fmeaId: string;
  fmeaName: string;
  revisionNumber: string;
  requesterName: string;
  requesterEmail: string;
  approverName: string;
  approverEmail: string;
  approvalType: 'CREATE' | 'REVIEW' | 'APPROVE';
  approvalToken: string;
  baseUrl: string;
}

export interface ApprovalResultEmailData {
  fmeaId: string;
  fmeaName: string;
  revisionNumber: string;
  result: 'APPROVED' | 'REJECTED';
  approverName: string;
  rejectReason?: string;
  recipients: { name: string; email: string }[];
  baseUrl: string;
}

// ============================================================================
// 이메일 설정 (환경변수에서 로드)
// ============================================================================

const getEmailConfig = (): EmailConfig => {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };
};

// ============================================================================
// Nodemailer 트랜스포터 생성
// ============================================================================

let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    const config = getEmailConfig();
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }
  return transporter;
};

// ============================================================================
// 결재 요청 이메일 발송
// ============================================================================

export const sendApprovalRequestEmail = async (data: ApprovalEmailData): Promise<boolean> => {
  const approvalTypeLabels = {
    CREATE: '작성',
    REVIEW: '검토',
    APPROVE: '승인',
  };
  
  const approvalLink = `${data.baseUrl}/pfmea/approve?token=${data.approvalToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #00587a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table td { padding: 10px; border-bottom: 1px solid #eee; }
        .info-table td:first-child { font-weight: bold; width: 120px; color: #666; }
        .btn { display: inline-block; padding: 15px 40px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 5px; }
        .btn-reject { background: #f44336; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📋 FMEA 결재 요청</h2>
        </div>
        <div class="content">
          <p><strong>${data.approverName}</strong>님, 안녕하세요.</p>
          <p>아래 FMEA 문서에 대한 <strong>${approvalTypeLabels[data.approvalType]}</strong> 결재 요청이 있습니다.</p>
          
          <table class="info-table">
            <tr><td>FMEA ID</td><td>${data.fmeaId}</td></tr>
            <tr><td>FMEA명</td><td>${data.fmeaName}</td></tr>
            <tr><td>개정번호</td><td>${data.revisionNumber}</td></tr>
            <tr><td>요청자</td><td>${data.requesterName}</td></tr>
            <tr><td>결재 유형</td><td>${approvalTypeLabels[data.approvalType]}</td></tr>
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${approvalLink}" class="btn">✅ 결재하기</a>
          </div>
          
          <p style="color: #666; font-size: 13px;">
            위 버튼을 클릭하면 결재 페이지로 이동합니다.<br>
            승인 또는 반려를 선택할 수 있습니다.
          </p>
        </div>
        <div class="footer">
          <p>본 메일은 FMEA On-Premise 시스템에서 자동 발송되었습니다.</p>
          <p>문의: FMEA 시스템 관리자</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    const transport = getTransporter();
    
    await transport.sendMail({
      from: `"FMEA 시스템" <${getEmailConfig().auth.user}>`,
      to: data.approverEmail,
      subject: `[FMEA 결재요청] ${data.fmeaName} - ${approvalTypeLabels[data.approvalType]}`,
      html: htmlContent,
    });
    
    console.log(`[이메일] 결재 요청 발송 완료: ${data.approverEmail}`);
    return true;
  } catch (error) {
    console.error('[이메일] 발송 실패:', error);
    return false;
  }
};

// ============================================================================
// 결재 결과 이메일 발송
// ============================================================================

export const sendApprovalResultEmail = async (data: ApprovalResultEmailData): Promise<boolean> => {
  const resultLabel = data.result === 'APPROVED' ? '승인' : '반려';
  const resultColor = data.result === 'APPROVED' ? '#4CAF50' : '#f44336';
  const resultIcon = data.result === 'APPROVED' ? '✅' : '❌';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${resultColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table td { padding: 10px; border-bottom: 1px solid #eee; }
        .info-table td:first-child { font-weight: bold; width: 120px; color: #666; }
        .reason-box { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .btn { display: inline-block; padding: 12px 30px; background: #00587a; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${resultIcon} FMEA 결재 ${resultLabel}</h2>
        </div>
        <div class="content">
          <p>FMEA 결재가 <strong>${resultLabel}</strong>되었습니다.</p>
          
          <table class="info-table">
            <tr><td>FMEA ID</td><td>${data.fmeaId}</td></tr>
            <tr><td>FMEA명</td><td>${data.fmeaName}</td></tr>
            <tr><td>개정번호</td><td>${data.revisionNumber}</td></tr>
            <tr><td>결재자</td><td>${data.approverName}</td></tr>
            <tr><td>결재 결과</td><td style="color: ${resultColor}; font-weight: bold;">${resultLabel}</td></tr>
          </table>
          
          ${data.result === 'REJECTED' && data.rejectReason ? `
            <div class="reason-box">
              <strong>반려 사유:</strong><br>
              ${data.rejectReason}
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.baseUrl}/pfmea/revision?id=${data.fmeaId}" class="btn">📋 개정이력 보기</a>
          </div>
        </div>
        <div class="footer">
          <p>본 메일은 FMEA On-Premise 시스템에서 자동 발송되었습니다.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    const transport = getTransporter();
    
    for (const recipient of data.recipients) {
      await transport.sendMail({
        from: `"FMEA 시스템" <${getEmailConfig().auth.user}>`,
        to: recipient.email,
        subject: `[FMEA 결재${resultLabel}] ${data.fmeaName}`,
        html: htmlContent,
      });
      console.log(`[이메일] 결재 결과 발송: ${recipient.email}`);
    }
    
    return true;
  } catch (error) {
    console.error('[이메일] 발송 실패:', error);
    return false;
  }
};

// ============================================================================
// 이메일 설정 테스트
// ============================================================================

export const testEmailConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const transport = getTransporter();
    await transport.verify();
    return { success: true, message: 'SMTP 연결 성공' };
  } catch (error: any) {
    return { success: false, message: `SMTP 연결 실패: ${error.message}` };
  }
};
