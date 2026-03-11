/**
 * @file api/pfd/[id]/route.ts
 * @description PFD 단건 조회/수정/삭제 API
 * @module pfd/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { pickFields, safeErrorMessage } from '@/lib/security';
import { isValidPfdFormat, derivePfdNoFromFmeaId } from '@/lib/utils/derivePfdNo';

// ============================================================================
// GET: PFD 상세 조회
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // ★ 잘못된 PFD ID 감지 → DB에서 fmeaId 기반으로 올바른 PFD 검색
    let correctedPfdNo: string | null = null;

    // PFD 조회 (ID 또는 pfdNo로)
    let pfd = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [
          { id },
          { pfdNo: id },
        ],
        deletedAt: null,
      },
      include: {
        items: {
          where: { isDeleted: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // 잘못된 PFD ID로 레코드를 찾았지만 아이템이 없는 경우 → fmeaId로 올바른 PFD 검색
    if (pfd && !isValidPfdFormat(pfd.pfdNo) && pfd.fmeaId) {
      correctedPfdNo = derivePfdNoFromFmeaId(pfd.fmeaId);

      // 교정된 ID로 다른 PFD가 존재하는지 확인
      if (correctedPfdNo !== pfd.pfdNo) {
        const correctPfd = await prisma.pfdRegistration.findFirst({
          where: { pfdNo: correctedPfdNo, deletedAt: null },
          include: {
            items: {
              where: { isDeleted: false },
              orderBy: { sortOrder: 'asc' },
            },
          },
        });
        if (correctPfd && correctPfd.items.length > 0) {
          pfd = correctPfd; // 올바른 PFD로 교체
        }
      }
    }

    if (!pfd) {
      return NextResponse.json(
        { success: false, error: 'PFD를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 연결된 문서 정보 조회
    const links = await prisma.documentLink.findMany({
      where: {
        OR: [
          { sourceType: 'pfd', sourceId: pfd.id },
          { targetType: 'pfd', targetId: pfd.id },
        ],
      },
    });

    // 요청 ID와 실제 pfdNo가 다르면 교정 정보 포함
    const needsRedirect = pfd.pfdNo !== id && id !== pfd.id;

    return NextResponse.json({
      success: true,
      data: {
        ...pfd,
        links,
        ...(needsRedirect ? { correctedPfdNo: pfd.pfdNo } : {}),
      },
    });

  } catch (error: any) {
    console.error('[API] PFD 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT: PFD 수정
// ============================================================================

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // 기존 PFD 확인 (활성 레코드만)
    const existing = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [
          { id },
          { pfdNo: id },
        ],
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'PFD를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // PFD 업데이트 (허용 필드만 추출 — mass assignment 방지)
    const { items } = body;
    const PFD_ALLOWED_FIELDS = ['partName', 'partNo', 'processDescription', 'processType', 'status', 'subject', 'customer', 'customerPartNo', 'modelYear', 'engineeringLevel', 'revision', 'issueDate', 'preparedBy', 'approvedBy'];
    const pfdData = pickFields(body, PFD_ALLOWED_FIELDS);

    const pfd = await prisma.pfdRegistration.update({
      where: { id: existing.id },
      data: {
        ...pfdData,
        updatedAt: new Date(),
      },
    });

    // 항목 업데이트 (있는 경우)
    if (items && Array.isArray(items)) {
      // 기존 항목 soft delete
      await prisma.pfdItem.updateMany({
        where: { pfdId: existing.id },
        data: { isDeleted: true },
      });

      // 새 항목 upsert
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id) {
          await prisma.pfdItem.update({
            where: { id: item.id },
            data: {
              ...item,
              sortOrder: i * 10,
              isDeleted: false,
              updatedAt: new Date(),
            },
          });
        } else {
          await prisma.pfdItem.create({
            data: {
              ...item,
              pfdId: existing.id,
              sortOrder: i * 10,
              isDeleted: false,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: pfd,
    });

  } catch (error: any) {
    console.error('[API] PFD 수정 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: PFD 삭제
// ============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // 기존 PFD 확인
    const existing = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [
          { id },
          { pfdNo: id },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'PFD를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // ★ Soft Delete (deletedAt 설정)
    await prisma.pfdRegistration.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: 'PFD가 삭제되었습니다',
    });

  } catch (error: any) {
    console.error('[API] PFD 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
