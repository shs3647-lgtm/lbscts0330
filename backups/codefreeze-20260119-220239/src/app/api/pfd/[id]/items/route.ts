/**
 * @file api/pfd/[id]/items/route.ts
 * @description PFD 항목 일괄 저장 API
 * @module pfd/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// ============================================================================
// POST: PFD 항목 일괄 저장
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { items } = await req.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: '항목 배열이 필요합니다' },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // PFD 확인
    const pfd = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [
          { id },
          { pfdNo: id },
        ],
      },
    });

    if (!pfd) {
      return NextResponse.json(
        { success: false, error: 'PFD를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx: any) => {
      // 기존 항목 soft delete
      await tx.pfdItem.updateMany({
        where: { pfdId: pfd.id },
        data: { isDeleted: true },
      });

      // 새 항목 생성/업데이트
      const savedItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemData = {
          pfdId: pfd.id,
          processNo: item.processNo || '',
          processName: item.processName || '',
          processDesc: item.processDesc || '',
          workElement: item.workElement || '',
          equipment: item.equipment || '',
          productChar: item.productChar || '',
          processChar: item.processChar || '',
          specialChar: item.specialChar || '',
          fmeaL2Id: item.fmeaL2Id || null,
          fmeaL3Id: item.fmeaL3Id || null,
          cpItemId: item.cpItemId || null,
          sortOrder: i * 10,
          isDeleted: false,
        };

        if (item.id) {
          // 기존 항목 업데이트
          const updated = await tx.pfdItem.update({
            where: { id: item.id },
            data: { ...itemData, updatedAt: new Date() },
          });
          savedItems.push(updated);
        } else {
          // 새 항목 생성
          const created = await tx.pfdItem.create({
            data: itemData,
          });
          savedItems.push(created);
        }
      }

      return savedItems;
    });

    // 동기화 로그 기록
    await prisma.syncLog.create({
      data: {
        sourceType: 'pfd',
        sourceId: pfd.id,
        targetType: 'pfd',
        targetId: pfd.id,
        action: 'update',
        status: 'synced',
        fieldChanges: JSON.stringify({ itemCount: items.length }),
        syncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });

  } catch (error: any) {
    console.error('[API] PFD 항목 저장 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류' },
      { status: 500 }
    );
  }
}
