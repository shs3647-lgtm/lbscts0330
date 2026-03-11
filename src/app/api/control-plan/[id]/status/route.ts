/**
 * @file /api/control-plan/[id]/status/route.ts
 * @description CP 상태(status) 업데이트 API — 확정/승인 시 DB 영속화
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

const VALID_STATUSES = ['draft', 'review', 'approved'];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `유효하지 않은 상태: ${status} (허용: ${VALID_STATUSES.join(', ')})` },
        { status: 400 }
      );
    }

    // CpRegistration 업데이트 (cpNo 또는 id로 조회)
    const cpReg = await prisma.cpRegistration.findFirst({
      where: { OR: [{ id }, { cpNo: id }] },
    });

    if (cpReg) {
      await prisma.cpRegistration.update({
        where: { id: cpReg.id },
        data: {
          status,
          ...(status === 'review' ? { confirmedAt: new Date() } : {}),
        },
      });
    }

    // ControlPlan 테이블도 동기화 (존재하는 경우)
    try {
      const cp = await prisma.controlPlan.findFirst({
        where: { OR: [{ id }, { cpNo: id }] },
      });
      if (cp) {
        await prisma.controlPlan.update({
          where: { id: cp.id },
          data: { status },
        });
      }
    } catch {
      // ControlPlan 레코드 없으면 무시
    }

    return NextResponse.json({
      success: true,
      message: `CP 상태가 '${status}'로 업데이트되었습니다.`,
      data: { cpNo: cpReg?.cpNo || id, status },
    });

  } catch (error: unknown) {
    console.error('[CP Status] 업데이트 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
