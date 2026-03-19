/**
 * @file Part FMEA 승인 API
 * @description POST: REVIEW → APPROVED 상태 전환 (독립 운영 — 상위 전파 없음)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

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
        { success: false, error: `현재 상태(${existing.status})에서는 승인이 불가합니다. REVIEW 상태에서만 가능합니다.` },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const partFmea = await tx.partFmea.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvalDate: new Date(),
        },
      });

      // 개정 이력 자동 추가
      const revCount = await tx.partFmeaRevision.count({
        where: { partFmeaId: id },
      });
      await tx.partFmeaRevision.create({
        data: {
          partFmeaId: id,
          revNo: `R${String(revCount + 1).padStart(2, '0')}`,
          changeDesc: '승인 완료',
          changedBy: partFmea.approverName ?? undefined,
        },
      });

      return partFmea;
    });

    // 독립 운영: 상위 전파 없음
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[part-fmea/approve] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
