/**
 * @file [id]/route.ts
 * @description Control Plan 단건 조회/수정/삭제 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// GET: CP 단건 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;
    
    // cpNo 또는 id로 조회
    const cp = await prisma.controlPlan.findFirst({
      where: {
        OR: [
          { id },
          { cpNo: id },
        ],
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!cp) {
      return NextResponse.json({ success: false, error: 'CP를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: cp });
  } catch (error) {
    console.error('CP 조회 오류:', error);
    return NextResponse.json({ success: false, error: 'CP 조회 실패' }, { status: 500 });
  }
}

// PUT: CP 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;
    const body = await request.json();

    // cpNo 또는 id로 조회
    const existing = await prisma.controlPlan.findFirst({
      where: {
        OR: [
          { id },
          { cpNo: id },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'CP를 찾을 수 없습니다' }, { status: 404 });
    }

    const updated = await prisma.controlPlan.update({
      where: { id: existing.id },
      data: {
        projectName: body.projectName,
        partName: body.partName,
        partNo: body.partNo,
        customer: body.customer,
        preparedBy: body.preparedBy,
        approvedBy: body.approvedBy,
        revNo: body.revNo,
        revDate: body.revDate,
        processFrom: body.processFrom,
        processTo: body.processTo,
        status: body.status,
        syncStatus: 'modified',
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('CP 수정 오류:', error);
    return NextResponse.json({ success: false, error: 'CP 수정 실패' }, { status: 500 });
  }
}

// DELETE: CP 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;

    // cpNo 또는 id로 조회
    const existing = await prisma.controlPlan.findFirst({
      where: {
        OR: [
          { id },
          { cpNo: id },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'CP를 찾을 수 없습니다' }, { status: 404 });
    }

    await prisma.controlPlan.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true, message: 'CP 삭제 완료' });
  } catch (error) {
    console.error('CP 삭제 오류:', error);
    return NextResponse.json({ success: false, error: 'CP 삭제 실패' }, { status: 500 });
  }
}






