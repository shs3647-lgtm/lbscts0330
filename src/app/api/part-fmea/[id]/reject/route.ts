/**
 * @file Part FMEA 반려 API
 * @description POST: REVIEW → DRAFT 상태 전환 (반려 사유 필수)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const RejectSchema = z.object({
  reason: z.string().min(1, '반려 사유를 입력해주세요').max(2000),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;

    const existing = await prisma.partFmea.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Part FMEA를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    if (existing.status !== 'REVIEW') {
      return NextResponse.json(
        { success: false, error: `현재 상태(${existing.status})에서는 반려가 불가합니다. REVIEW 상태에서만 가능합니다.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = RejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const partFmea = await tx.partFmea.update({
        where: { id },
        data: {
          status: 'DRAFT',
          reviewDate: null,
        },
      });

      // 반려 이력 추가
      await tx.partFmeaRevision.create({
        data: {
          partFmeaId: id,
          revNo: 'REJECT',
          changeDesc: `반려: ${parsed.data.reason}`,
          changedBy: existing.reviewerName ?? undefined,
        },
      });

      return partFmea;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[part-fmea/reject] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
