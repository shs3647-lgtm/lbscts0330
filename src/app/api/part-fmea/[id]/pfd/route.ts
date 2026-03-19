/**
 * @file Part FMEA PFD (Process Flow Diagram) API
 * @description GET: PFD 조회 | PUT: PFD 수정
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage, pickFields } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

const PFD_UPDATABLE_FIELDS = ['pfdName', 'pfdNo', 'version', 'status'];

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

    const pfd = await prisma.partPfd.findUnique({
      where: { partFmeaId: id },
    });

    if (!pfd) {
      return NextResponse.json(
        { success: false, error: 'PFD를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: pfd });
  } catch (error: unknown) {
    console.error('[part-fmea/pfd] GET Error:', error);
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

    const existing = await prisma.partPfd.findUnique({
      where: { partFmeaId: id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'PFD를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData = pickFields(body, PFD_UPDATABLE_FIELDS);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '수정할 필드가 없습니다' },
        { status: 400 }
      );
    }

    const updated = await prisma.partPfd.update({
      where: { partFmeaId: id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[part-fmea/pfd] PUT Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
