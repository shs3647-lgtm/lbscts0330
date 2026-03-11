/**
 * @file revision/route.ts
 * @description PFD 개정 API
 * @note PFD 개발 중단 - DFMEA 집중
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pfdId } = await params;
    const { revisionReason } = await request.json();

    if (!revisionReason) {
      return NextResponse.json(
        { success: false, error: '개정 사유가 필요합니다.' },
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

    // 기존 PFD 조회
    const existingPfd = await prisma.pfdRegistration.findUnique({
      where: { id: pfdId },
      include: { items: true },
    });

    if (!existingPfd) {
      return NextResponse.json(
        { success: false, error: 'PFD를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (existingPfd.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: '승인된 PFD만 개정이 가능합니다.' },
        { status: 400 }
      );
    }

    // 트랜잭션으로 개정 PFD 생성
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. 기존 PFD를 obsolete로 변경
      await tx.pfdRegistration.update({
        where: { id: pfdId },
        data: { status: 'obsolete' },
      });

      // 2. 새 PFD 번호 생성 (Rev 증가)
      const basePfdNo = existingPfd.pfdNo.replace(/-\d+$/, '');
      const revisionMatch = existingPfd.pfdNo.match(/-(\d+)$/);
      const currentRev = revisionMatch ? parseInt(revisionMatch[1]) : 1;
      const newRev = currentRev + 1;
      const newPfdNo = `${basePfdNo}-${newRev.toString().padStart(2, '0')}`;

      // 3. 새 PFD 생성 (기존 데이터 복제)
      const newPfd = await tx.pfdRegistration.create({
        data: {
          pfdNo: newPfdNo,
          fmeaId: existingPfd.fmeaId,
          cpNo: existingPfd.cpNo,
          apqpProjectId: existingPfd.apqpProjectId,
          partName: existingPfd.partName,
          partNo: existingPfd.partNo,
          subject: existingPfd.subject,
          customerName: existingPfd.customerName,
          modelYear: existingPfd.modelYear,
          companyName: existingPfd.companyName,
          processOwner: existingPfd.processOwner,
          createdBy: existingPfd.createdBy,
          status: 'draft',
        },
      });

      // 4. PFD 아이템 복제
      if (existingPfd.items.length > 0) {
        const newItems = existingPfd.items.map(item => ({
          pfdId: newPfd.id,
          processNo: item.processNo,
          processName: item.processName,
          processDesc: item.processDesc,
          workElement: item.workElement,
          equipment: item.equipment,
          productChar: item.productChar,
          processChar: item.processChar,
          specialChar: item.specialChar,
          fmeaL2Id: item.fmeaL2Id,
          fmeaL3Id: item.fmeaL3Id,
          cpItemId: item.cpItemId,
          sortOrder: item.sortOrder,
        }));

        await tx.pfdItem.createMany({
          data: newItems,
        });
      }

      // 5. 개정 이력 기록 (간단한 버전)
      // TODO: 더 정교한 개정 이력 시스템 구현

      return {
        newPfdId: newPfd.id,
        newPfdNo: newPfd.pfdNo,
      };
    });

    return NextResponse.json({
      success: true,
      newPfdId: result.newPfdId,
      newPfdNo: result.newPfdNo,
    });

  } catch (error) {
    console.error('PFD 개정 오류:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}