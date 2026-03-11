/**
 * @file route.ts
 * @description FMEA 확정 API — 워크시트에서 확정 버튼 클릭 시 호출
 * - 개정 프로젝트: step 7 + 개정이력 createStatus='확정'
 * - 신규 프로젝트: step 7 (확정 완료)
 * @created 2026-02-18
 *
 * POST /api/fmea/revision-confirm
 * Body: { fmeaId: string }
 * Response: { success, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fmeaId } = body;

    if (!fmeaId) {
      return NextResponse.json(
        { success: false, error: 'fmeaId is required' },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const normalizedId = fmeaId.toLowerCase();
    const isRevision = /-r\d+$/.test(normalizedId);

    await prisma.$transaction(async (tx: any) => {
      // 1. 프로젝트 step 7로 업데이트
      await tx.fmeaProject.update({
        where: { fmeaId: normalizedId },
        data: { step: 7 },
      });

      // 2. 개정 프로젝트: 개정이력 createStatus를 '확정'으로 업데이트
      if (isRevision) {
        const latestHistory = await tx.fmeaRevisionHistory.findFirst({
          where: { fmeaId: normalizedId },
          orderBy: { createdAt: 'desc' },
        });

        if (latestHistory) {
          await tx.fmeaRevisionHistory.update({
            where: { id: latestHistory.id },
            data: {
              createStatus: '확정',
              createDate: new Date().toISOString().split('T')[0],
              revisionHistory: latestHistory.revisionHistory
                ? `${latestHistory.revisionHistory} → 확정 완료`
                : '개정 확정 완료',
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      fmeaId: normalizedId,
      isRevision,
      message: isRevision
        ? `개정 확정 완료 (${normalizedId}) — 개정관리에서 결재를 진행하세요.`
        : `확정 완료 (${normalizedId})`,
    });
  } catch (err) {
    console.error('[revision-confirm] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
