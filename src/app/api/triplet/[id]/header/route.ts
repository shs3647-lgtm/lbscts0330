/**
 * @file PATCH /api/triplet/[id]/header
 * @description Triplet 헤더 동기화 API — subject/productName/revision 등 공통 필드 동시 업데이트
 *
 * GET: Triplet 상세 조회 (계층 + 하위 포함)
 * PATCH: 헤더 필드 동기화
 *
 * @created 2026-03-13
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

/**
 * GET /api/triplet/[id]/header — Triplet 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
  }

  try {
    const { id } = await params;

    const triplet = await prisma.tripletGroup.findUnique({
      where: { id },
      include: {
        children: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            typeCode: true,
            pfmeaId: true,
            cpId: true,
            pfdId: true,
            subject: true,
            linkGroup: true,
            syncStatus: true,
          },
        },
        parent: {
          select: {
            id: true,
            typeCode: true,
            subject: true,
            pfmeaId: true,
          },
        },
      },
    });

    if (!triplet) {
      return NextResponse.json({ success: false, error: 'TripletGroup not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      triplet: {
        id: triplet.id,
        typeCode: triplet.typeCode,
        linkGroup: triplet.linkGroup,
        pfmea: { id: triplet.pfmeaId, status: triplet.pfmeaId ? 'materialized' : 'pending' },
        cp: { id: triplet.cpId, status: triplet.cpId ? 'materialized' : 'pending' },
        pfd: { id: triplet.pfdId, status: triplet.pfdId ? 'materialized' : 'pending' },
        subject: triplet.subject,
        productName: triplet.productName,
        revision: triplet.revision,
        partNo: triplet.partNo,
        customerName: triplet.customerName,
        companyName: triplet.companyName,
        responsibleName: triplet.responsibleName,
        processNumber: triplet.processNumber,
        syncStatus: triplet.syncStatus,
        version: triplet.version,
        parent: triplet.parent,
        children: triplet.children,
      },
    });
  } catch (error) {
    console.error('[triplet/header GET] 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

/**
 * PATCH /api/triplet/[id]/header — 헤더 동기화
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { subject, productName, revision, partNo, customerName, companyName, responsibleName, processNumber, version } = body;

    const triplet = await prisma.tripletGroup.findUnique({ where: { id } });
    if (!triplet) {
      return NextResponse.json({ success: false, error: 'TripletGroup not found' }, { status: 404 });
    }

    // Optimistic locking
    if (version !== undefined && version !== triplet.version) {
      return NextResponse.json({
        success: false,
        error: '다른 사용자가 이미 수정했습니다. 페이지를 새로고침해주세요.',
        conflict: true,
        currentVersion: triplet.version,
      }, { status: 409 });
    }

    const updateData: Record<string, string | number> = {};
    if (subject !== undefined) updateData.subject = subject;
    if (productName !== undefined) updateData.productName = productName;
    if (revision !== undefined) updateData.revision = revision;
    if (partNo !== undefined) updateData.partNo = partNo;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (responsibleName !== undefined) updateData.responsibleName = responsibleName;
    if (processNumber !== undefined) updateData.processNumber = processNumber;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: 'No fields to update' });
    }

    await prisma.$transaction(async (tx) => {
      // TripletGroup 업데이트 + version 증가
      await tx.tripletGroup.update({
        where: { id },
        data: {
          ...updateData,
          version: { increment: 1 },
          syncStatus: 'synced',
        },
      });

      // PFMEA Registration 동기화
      if (triplet.pfmeaId) {
        const regUpdate: Record<string, string> = {};
        if (subject !== undefined) regUpdate.subject = subject;
        if (customerName !== undefined) regUpdate.customerName = customerName;
        if (companyName !== undefined) regUpdate.companyName = companyName;
        if (partNo !== undefined) regUpdate.partNo = partNo;
        if (responsibleName !== undefined) regUpdate.fmeaResponsibleName = responsibleName;

        if (Object.keys(regUpdate).length > 0) {
          await tx.fmeaRegistration.updateMany({
            where: { fmeaId: triplet.pfmeaId },
            data: regUpdate,
          });
        }
      }

      // CP Registration 동기화
      if (triplet.cpId) {
        const cpUpdate: Record<string, string> = {};
        if (subject !== undefined) cpUpdate.subject = subject;
        if (customerName !== undefined) cpUpdate.customerName = customerName;
        if (companyName !== undefined) cpUpdate.companyName = companyName;
        if (partNo !== undefined) cpUpdate.partNo = partNo;
        if (responsibleName !== undefined) cpUpdate.cpResponsibleName = responsibleName;

        if (Object.keys(cpUpdate).length > 0) {
          await tx.cpRegistration.updateMany({
            where: { cpNo: triplet.cpId },
            data: cpUpdate,
          });
        }
      }

      // PFD Registration 동기화
      if (triplet.pfdId) {
        const pfdUpdate: Record<string, string> = {};
        if (subject !== undefined) pfdUpdate.subject = subject;
        if (customerName !== undefined) pfdUpdate.customerName = customerName;
        if (companyName !== undefined) pfdUpdate.companyName = companyName;

        if (Object.keys(pfdUpdate).length > 0) {
          await tx.pfdRegistration.updateMany({
            where: { pfdNo: triplet.pfdId },
            data: pfdUpdate,
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      tripletGroupId: id,
      updatedFields: Object.keys(updateData),
      syncStatus: 'synced',
    });
  } catch (error) {
    console.error('[triplet/header PATCH] 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
