/**
 * @file api/pfd/[id]/route.ts
 * @description PFD 단건 조회/수정/삭제 API
 * @module pfd/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

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

    // PFD 조회 (ID 또는 pfdNo로)
    const pfd = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [
          { id },
          { pfdNo: id },
        ],
      },
      include: {
        items: {
          where: { isDeleted: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

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

    return NextResponse.json({
      success: true,
      data: {
        ...pfd,
        links,
      },
    });

  } catch (error: any) {
    console.error('[API] PFD 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류' },
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

    // PFD 업데이트
    const { items, ...pfdData } = body;
    
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
      { success: false, error: error.message || '서버 오류' },
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

    // 연결된 문서 링크 삭제
    await prisma.documentLink.deleteMany({
      where: {
        OR: [
          { sourceType: 'pfd', sourceId: existing.id },
          { targetType: 'pfd', targetId: existing.id },
        ],
      },
    });

    // PFD 삭제 (cascade로 items도 삭제됨)
    await prisma.pfdRegistration.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: 'PFD가 삭제되었습니다',
    });

  } catch (error: any) {
    console.error('[API] PFD 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류' },
      { status: 500 }
    );
  }
}
