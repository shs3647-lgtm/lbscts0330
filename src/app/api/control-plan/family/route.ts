/**
 * @file route.ts
 * @description Family CP 조회 API — 동일 FMEA 하위 관리계획서 목록
 * @created 2026-03-02
 *
 * GET /api/control-plan/family?fmeaId=pfm26-p001
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const fmeaId = searchParams.get('fmeaId')?.toLowerCase();

    if (!fmeaId) {
      return NextResponse.json(
        { success: false, error: 'fmeaId 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 fmeaId 형식입니다' },
        { status: 400 }
      );
    }

    // 해당 FMEA 하위의 모든 CP 조회
    const familyCps = await prisma.cpRegistration.findMany({
      where: {
        fmeaId: fmeaId,
        deletedAt: null,
      },
      select: {
        cpNo: true,
        fmeaId: true,
        parentCpId: true,
        familyGroupId: true,
        variantNo: true,
        variantLabel: true,
        isBaseVariant: true,
        subject: true,
        partName: true,
        partNo: true,
        confidentialityLevel: true,
        status: true,
        cpStartDate: true,
        cpRevisionDate: true,
        cpResponsibleName: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { isBaseVariant: 'desc' },  // Base CP 먼저
        { variantNo: 'asc' },       // 순번 순
        { createdAt: 'asc' },
      ],
    });

    // Base CP 식별
    const baseCp = familyCps.find(cp => cp.isBaseVariant) || familyCps[0] || null;
    const variants = familyCps.filter(cp => cp.cpNo !== baseCp?.cpNo);

    return NextResponse.json({
      success: true,
      fmeaId,
      familyGroupId: baseCp?.familyGroupId || fmeaId,
      baseCp,
      variants,
      totalCount: familyCps.length,
    });
  } catch (err) {
    console.error('[family-cp] GET 오류:', err);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(err) },
      { status: 500 }
    );
  }
}
