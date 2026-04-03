/**
 * @file /api/fmea/email-notify
 * @description FMEA 결재 이메일 알림 API (Ethereal 가상 이메일)
 *
 * POST: 결재 단계 변경 시 이메일 알림 발송
 * - type: 'submit' | 'review_approve' | 'final_approve' | 'reject'
 * - 반환: { success, previewUrl } (Ethereal 미리보기 URL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendApprovalNotification } from '@/lib/email-service';
import { isValidFmeaId } from '@/lib/security';

interface EmailNotifyRequest {
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

export async function POST(request: NextRequest) {
  try {
    const body: EmailNotifyRequest = await request.json();

    // 필수 필드 검증
    if (!body.type || !body.fmeaId || !body.fromName || !body.toName) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다 (type, fmeaId, fromName, toName)' },
        { status: 400 }
      );
    }
    if (!isValidFmeaId(body.fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const result = await sendApprovalNotification({
      type: body.type,
      revisionNumber: body.revisionNumber || '0.00',
      fmeaName: body.fmeaName || body.fmeaId,
      fmeaId: body.fmeaId,
      fromName: body.fromName,
      fromPosition: body.fromPosition || '',
      toName: body.toName,
      toPosition: body.toPosition || '',
      toEmail: body.toEmail,
      reason: body.reason,
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (error) {
    console.error('[email-notify] API 오류:', error);
    return NextResponse.json(
      { success: false, error: '이메일 발송 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
