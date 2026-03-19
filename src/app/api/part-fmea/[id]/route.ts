/**
 * @file Part FMEA 상세/수정/삭제 API
 * @description GET: 상세 조회 | PUT: 수정 (DRAFT만) | DELETE: 삭제 (DRAFT만)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage, pickFields } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

const UPDATABLE_FIELDS = [
  'customerName', 'productName', 'description',
  'authorName', 'reviewerName', 'approverName',
];

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;

    const partFmea = await prisma.partFmea.findUnique({
      where: { id },
      include: {
        controlPlan: true,
        processFlow: true,
        revisionHistory: { orderBy: { revDate: 'desc' } },
        sourceFamilyMaster: {
          select: { id: true, code: true, name: true, version: true, status: true },
        },
      },
    });

    if (!partFmea) {
      return NextResponse.json(
        { success: false, error: 'Part FMEA를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: partFmea });
  } catch (error: unknown) {
    console.error('[part-fmea/[id]] GET Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'DRAFT 상태에서만 수정 가능합니다' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData = pickFields(body, UPDATABLE_FIELDS);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '수정할 필드가 없습니다' },
        { status: 400 }
      );
    }

    const updated = await prisma.partFmea.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[part-fmea/[id]] PUT Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'DRAFT 상태에서만 삭제 가능합니다' },
        { status: 400 }
      );
    }

    // Cascade delete (CP, PFD, Revisions are onDelete: Cascade)
    await prisma.partFmea.delete({ where: { id } });

    return NextResponse.json({ success: true, message: '삭제 완료' });
  } catch (error: unknown) {
    console.error('[part-fmea/[id]] DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
