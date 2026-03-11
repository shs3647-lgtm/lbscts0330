/**
 * @file route.ts
 * @description 사용자 승인 API - 관리자가 사용자 승인 시 이메일 발송
 * @created 2026-01-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { escapeHtml } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { userId, permPfmea, permDfmea, permCp, permPfd, role } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 사용자 활성화 및 권한 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        role: role || 'editor',
        permPfmea: permPfmea || 'none',
        permDfmea: permDfmea || 'none',
        permCp: permCp || 'none',
        permPfd: permPfd || 'none',
      }
    });


    // 사용자에게 승인 이메일 발송
    try {
      await sendApprovalEmail(updatedUser);
    } catch (emailError: any) {
      console.error('❌ 이메일 발송 실패:', emailError.message);
      // 이메일 실패해도 승인은 성공 처리
    }

    return NextResponse.json({
      success: true,
      message: '사용자가 승인되었습니다.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      }
    });

  } catch (error: any) {
    console.error('[Approve API] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '승인 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 사용자에게 승인 완료 이메일 발송
 */
async function sendApprovalEmail(user: { name: string; email: string | null; phone: string | null }) {
  if (!user.email) {
    return;
  }

  const nodemailer = await import('nodemailer');

  // SMTP 설정 가져오기
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';

  if (!smtpUser || !smtpPass) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/login`;

  const htmlContent = `
    <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">✅ 가입 승인 완료</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
        <p style="font-size: 16px; color: #333;">
          안녕하세요, <strong>${escapeHtml(user.name)}</strong>님!
        </p>
        <p style="color: #666;">
          FMEA On-Premise 시스템 가입이 승인되었습니다.<br>
          이제 로그인하여 시스템을 사용하실 수 있습니다.
        </p>
        
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <strong style="color: #856404;">🔑 로그인 정보</strong>
          <ul style="color: #856404; margin: 10px 0 0 0; padding-left: 20px;">
            <li>이메일: <strong>${escapeHtml(user.email)}</strong></li>
            <li>최초 비밀번호: <strong>본인 전화번호</strong></li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${loginUrl}" style="display: inline-block; padding: 12px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            로그인 하기
          </a>
        </div>
        
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          ※ 보안을 위해 로그인 후 비밀번호를 변경해 주세요.
        </p>
      </div>
      
      <div style="background: #343a40; color: #adb5bd; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
        FMEA On-Premise System
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: smtpUser,
    to: user.email,
    subject: `[FMEA] 가입 승인 완료 - ${escapeHtml(user.name)}님`,
    html: htmlContent,
  });
}
