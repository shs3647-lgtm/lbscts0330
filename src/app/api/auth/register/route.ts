/**
 * @file route.ts
 * @description 회원가입 API - 사용자 가입 신청 및 관리자 이메일 발송
 * @created 2026-01-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

// 관리자 이메일 (환경 변수에서 가져오기)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@company.com';

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
    const {
      name,
      email,
      phone,
      factory,
      department,
      position,
      reqPfmea,
      reqDfmea,
      reqCp,
      reqPfd,
      photoUrl, // 프로필 사진 (Base64)
    } = body;

    // 필수 필드 검증
    if (!name || !email || !phone || !factory || !department) {
      return NextResponse.json(
        { success: false, error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 중복 체크
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 이메일입니다.' },
        { status: 400 }
      );
    }

    // 전화번호에서 숫자만 추출
    const phoneDigits = phone.replace(/\D/g, '');

    // 비밀번호 = 전화번호 (bcrypt 해시)
    const hashedPassword = await bcrypt.hash(phoneDigits, 10);

    // 사용자 생성 (비활성 상태로)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phoneDigits,
        factory,
        department,
        position: position || '',
        password: hashedPassword,
        role: 'viewer', // 기본 역할
        isActive: false, // 관리자 승인 전까지 비활성
        // 모듈 권한은 일단 'none'으로 설정 (관리자가 승인 시 변경)
        permPfmea: 'none',
        permDfmea: 'none',
        permCp: 'none',
        permPfd: 'none',
        // 프로필 사진 (Base64)
        photoUrl: photoUrl || null,
      }
    });


    // 관리자에게 이메일 발송 (권한 승인 요청)
    try {
      await sendAdminNotification({
        id: user.id,
        name: user.name,
        email: user.email ?? '',
        phone: user.phone ?? '',
        factory: user.factory,
        department: user.department,
        position: user.position,
      }, {
        reqPfmea,
        reqDfmea,
        reqCp,
        reqPfd,
      });
    } catch (emailError: any) {
      console.error('❌ 이메일 발송 실패:', emailError.message);
      // 이메일 실패해도 가입은 성공 처리
    }

    return NextResponse.json({
      success: true,
      message: '가입 신청이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.',
      userId: user.id,
    });

  } catch (error: any) {
    console.error('[Register API] 오류:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '이미 등록된 이메일입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || '가입 신청에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 관리자에게 가입 신청 알림 이메일 발송
 */
async function sendAdminNotification(
  user: { id: string; name: string; email: string; phone: string; factory: string; department: string; position: string },
  permissions: { reqPfmea: boolean; reqDfmea: boolean; reqCp: boolean; reqPfd: boolean }
) {
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

  const requestedModules = [
    permissions.reqPfmea && 'PFMEA',
    permissions.reqDfmea && 'DFMEA',
    permissions.reqCp && 'CP',
    permissions.reqPfd && 'PFD',
  ].filter(Boolean).join(', ');

  const approvalUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/settings/users`;

  const htmlContent = `
    <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">🔔 신규 사용자 가입 신청</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
        <h2 style="color: #333; margin-top: 0;">신청자 정보</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; width: 100px; font-weight: bold;">성명</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">이메일</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">전화번호</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.phone}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">공장</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.factory}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">부서</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.department}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">직급</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.position || '-'}</td>
          </tr>
        </table>
        
        <h2 style="color: #333; margin-top: 20px;">신청 모듈</h2>
        <p style="font-size: 16px; font-weight: bold; color: #007bff;">${requestedModules || '없음'}</p>
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="${approvalUrl}" style="display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            권한 설정하러 가기
          </a>
        </div>
      </div>
      
      <div style="background: #343a40; color: #adb5bd; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
        FMEA On-Premise System
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: smtpUser,
    to: ADMIN_EMAIL,
    subject: `[FMEA] 신규 사용자 가입 신청 - ${user.name}`,
    html: htmlContent,
  });
}
