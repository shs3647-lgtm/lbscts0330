/**
 * @file /api/approval/process/route.ts
 * @description 결재 처리 API (DB 기반)
 * @fixed 2026-03-12 — localStorage 버그 수정 → Prisma DB 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      approvalId,
      approverId,
      decision,
      comments,
      type,
    } = body;

    if (!approvalId || !decision) {
      return NextResponse.json({
        success: false,
        error: '필수 정보가 누락되었습니다. (approvalId, decision)',
      }, { status: 400 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({
        success: false,
        error: 'DB 연결이 설정되지 않았습니다.',
      }, { status: 503 });
    }

    const isApproved = decision === 'approve';

    const updated = await prisma.fmeaApproval.updateMany({
      where: { id: approvalId, status: 'PENDING' },
      data: {
        status: isApproved ? 'APPROVED' : 'REJECTED',
        processedAt: new Date(),
        rejectReason: isApproved ? null : (comments || '사유 미입력'),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({
        success: false,
        error: '처리할 수 있는 결재 건이 없습니다. (이미 처리되었거나 존재하지 않음)',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `결재가 ${isApproved ? '승인' : '반려'}되었습니다.`,
      data: {
        approvalId,
        approverId,
        decision,
        comments,
        processedAt: new Date().toISOString(),
        type,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[결재 처리 API] 오류:', msg);
    return NextResponse.json({
      success: false,
      error: '결재 처리 중 오류가 발생했습니다.',
    }, { status: 500 });
  }
}
