/**
 * @file /api/fmea/approval/route.ts
 * @description FMEA 결재 API
 * @created 2026-01-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateApprovalToken, verifyApprovalToken } from '@/lib/email/approvalToken';
import { sendApprovalRequestEmail, sendApprovalResultEmail } from '@/lib/email/emailService';

// ============================================================================
// POST: 결재 요청 (이메일 발송)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fmeaId, 
      revisionId, 
      revisionNumber,
      approvalType, // 'CREATE' | 'REVIEW' | 'APPROVE'
      requester,    // { id, name, email }
      approver,     // { id, name, email }
      fmeaName,
    } = body;
    
    // 필수 필드 확인
    if (!fmeaId || !revisionId || !approvalType || !approver?.email) {
      return NextResponse.json({ 
        success: false, 
        error: '필수 정보가 누락되었습니다.' 
      }, { status: 400 });
    }
    
    // 결재 토큰 생성
    const token = generateApprovalToken({
      fmeaId,
      revisionId,
      revisionNumber: revisionNumber || '1.00',
      approvalType,
      approverEmail: approver.email,
      approverName: approver.name || approver.email,
      requesterId: requester?.id || 'admin',
      requesterName: requester?.name || 'admin',
    });
    
    // 결재 기록 저장 (DB)
    try {
      await prisma.fmeaApproval.create({
        data: {
          fmeaId,
          revisionId,
          revisionNumber: revisionNumber || '1.00',
          approvalType,
          approverEmail: approver.email,
          approverName: approver.name || '',
          requesterName: requester?.name || 'admin',
          token,
          status: 'PENDING',
          requestedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.warn('[결재] DB 저장 실패 (테이블 없을 수 있음):', dbError);
      // DB 없어도 이메일은 발송
    }
    
    // 이메일 발송
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const emailSent = await sendApprovalRequestEmail({
      fmeaId,
      fmeaName: fmeaName || fmeaId,
      revisionNumber: revisionNumber || '1.00',
      requesterName: requester?.name || 'admin',
      requesterEmail: requester?.email || '',
      approverName: approver.name || approver.email,
      approverEmail: approver.email,
      approvalType,
      approvalToken: token,
      baseUrl,
    });
    
    return NextResponse.json({
      success: true,
      emailSent,
      token: emailSent ? undefined : token, // 이메일 실패 시 토큰 반환 (수동 링크용)
      approvalLink: `${baseUrl}/pfmea/approve?token=${token}`,
      message: emailSent 
        ? `결재 요청 이메일이 ${approver.email}로 발송되었습니다.`
        : `이메일 발송 실패. 결재 링크: ${baseUrl}/pfmea/approve?token=${token}`,
    });
    
  } catch (error: any) {
    console.error('[결재 API] 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '결재 요청 처리 중 오류 발생' 
    }, { status: 500 });
  }
}

// ============================================================================
// PUT: 결재 처리 (승인/반려)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action, rejectReason } = body; // action: 'approve' | 'reject'
    
    if (!token || !action) {
      return NextResponse.json({ 
        success: false, 
        error: '필수 정보가 누락되었습니다.' 
      }, { status: 400 });
    }
    
    // 토큰 검증
    const verification = verifyApprovalToken(token);
    if (!verification.valid || !verification.payload) {
      return NextResponse.json({ 
        success: false, 
        error: verification.error || '유효하지 않은 토큰입니다.' 
      }, { status: 400 });
    }
    
    const payload = verification.payload;
    const isApproved = action === 'approve';
    
    // DB 업데이트
    try {
      await prisma.fmeaApproval.updateMany({
        where: { token },
        data: {
          status: isApproved ? 'APPROVED' : 'REJECTED',
          processedAt: new Date(),
          rejectReason: isApproved ? null : (rejectReason || '사유 미입력'),
        },
      });
    } catch (dbError) {
      console.warn('[결재] DB 업데이트 실패:', dbError);
    }
    
    // 결재 결과 이메일 발송
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const recipients = [
      { name: payload.requesterName, email: payload.approverEmail }, // 원래는 요청자에게
    ];
    
    // 반려 시: 하위 결재자(요청자)에게 알림
    // 승인 시: 다음 결재자에게 요청 또는 모두에게 완료 알림
    await sendApprovalResultEmail({
      fmeaId: payload.fmeaId,
      fmeaName: payload.fmeaId, // TODO: DB에서 FMEA명 조회
      revisionNumber: payload.revisionNumber,
      result: isApproved ? 'APPROVED' : 'REJECTED',
      approverName: payload.approverName,
      rejectReason: rejectReason,
      recipients,
      baseUrl,
    });
    
    // 승인 시: 다음 단계 결재자에게 자동 요청 (옵션)
    // CREATE 승인 → REVIEW에게 요청
    // REVIEW 승인 → APPROVE에게 요청
    // APPROVE 승인 → 완료
    
    return NextResponse.json({
      success: true,
      result: isApproved ? 'APPROVED' : 'REJECTED',
      message: isApproved 
        ? '결재가 승인되었습니다.' 
        : '결재가 반려되었습니다.',
      nextStep: isApproved && payload.approvalType !== 'APPROVE' 
        ? (payload.approvalType === 'CREATE' ? 'REVIEW' : 'APPROVE')
        : null,
    });
    
  } catch (error: any) {
    console.error('[결재 API] 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '결재 처리 중 오류 발생' 
    }, { status: 500 });
  }
}

// ============================================================================
// GET: 결재 상태 조회
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fmeaId = searchParams.get('fmeaId');
    const token = searchParams.get('token');
    
    if (token) {
      // 토큰으로 단일 결재 조회
      const verification = verifyApprovalToken(token);
      if (!verification.valid) {
        return NextResponse.json({ 
          success: false, 
          error: verification.error 
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        approval: verification.payload,
      });
    }
    
    if (fmeaId) {
      // FMEA별 결재 목록 조회
      try {
        const approvals = await prisma.fmeaApproval.findMany({
          where: { fmeaId },
          orderBy: { requestedAt: 'desc' },
        });
        
        return NextResponse.json({
          success: true,
          approvals,
        });
      } catch (dbError) {
        // DB 테이블 없을 경우
        return NextResponse.json({
          success: true,
          approvals: [],
          message: 'DB 테이블이 아직 생성되지 않았습니다.',
        });
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'fmeaId 또는 token이 필요합니다.' 
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('[결재 API] 조회 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
