/**
 * @file Part FMEA CP (Control Plan) API
 * @description GET: CP 조회 | PUT: CP 수정
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage, pickFields } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

const CP_UPDATABLE_FIELDS = ['cpName', 'cpNo', 'version', 'status'];

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

    const cp = await prisma.partControlPlan.findUnique({
      where: { partFmeaId: id },
    });

    if (!cp) {
      return NextResponse.json(
        { success: false, error: 'Control Plan을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: cp });
  } catch (error: unknown) {
    console.error('[part-fmea/cp] GET Error:', error);
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

    const existing = await prisma.partControlPlan.findUnique({
      where: { partFmeaId: id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Control Plan을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData = pickFields(body, CP_UPDATABLE_FIELDS);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '수정할 필드가 없습니다' },
        { status: 400 }
      );
    }

    const updated = await prisma.partControlPlan.update({
      where: { partFmeaId: id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[part-fmea/cp] PUT Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
