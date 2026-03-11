/**
 * @file /api/approval/process/route.ts
 * @description 결재 처리 API
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      approvalId,
      approverId,
      decision, // 'approve' | 'reject'
      comments,
      type // 'review' | 'approve'
    } = body;

    // 여기서 실제 DB 업데이트 수행
    // 현재는 더미 구현

    // 결재 기록 저장
    const approvalRecord = {
      id: approvalId,
      approverId,
      decision,
      comments,
      processedAt: new Date().toISOString(),
      type
    };

    // localStorage에 저장 (실제로는 DB에 저장)
    if (typeof window !== 'undefined') {
      const existingRecords = localStorage.getItem('approval_records') || '[]';
      const records = JSON.parse(existingRecords);
      records.push(approvalRecord);
      localStorage.setItem('approval_records', JSON.stringify(records));
    }

    // 결과 이메일 발송 (선택적)
    // await sendResultEmail(approvalRecord);

    return NextResponse.json({
      success: true,
      message: `결재가 ${decision === 'approve' ? '승인' : '반려'}되었습니다.`,
      data: approvalRecord
    });

  } catch (error) {
    console.error('Approval processing error:', error);
    return NextResponse.json({
      success: false,
      error: '결재 처리 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}