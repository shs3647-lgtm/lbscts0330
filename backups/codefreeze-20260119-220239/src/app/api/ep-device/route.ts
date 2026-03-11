/**
 * @file route.ts
 * @description EP검사장치 API (CRUD)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET - EP검사장치 목록 조회
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database connection not available' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const cpNo = searchParams.get('cpNo');
    const fmeaId = searchParams.get('fmeaId');
    const processNo = searchParams.get('processNo');
    const category = searchParams.get('category');

    const where: any = { isActive: true };

    if (cpNo) where.cpNo = cpNo;
    if (fmeaId) where.fmeaId = fmeaId;
    if (processNo) where.processNo = processNo;
    if (category) where.category = category;

    const devices = await prisma.epDevice.findMany({
      where,
      orderBy: [
        { processNo: 'asc' },
        { category: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: devices,
      count: devices.length,
    });
  } catch (error) {
    console.error('EP검사장치 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: 'EP검사장치 조회 실패', detail: String(error) },
      { status: 500 }
    );
  }
}

// POST - EP검사장치 저장 (전체 대체 또는 추가)
export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database connection not available' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { devices, cpNo, fmeaId, replaceAll } = body;

    if (!devices || !Array.isArray(devices)) {
      return NextResponse.json(
        { success: false, error: 'devices 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    // 빈 행 필터링 (장치명이 없는 항목 제외)
    const validDevices = devices.filter((d: any) => d.deviceName && d.deviceName.trim() !== '');

    if (validDevices.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 유효한 EP검사장치가 없습니다.' },
        { status: 400 }
      );
    }

    // 전체 대체 모드: 기존 데이터 삭제 후 새로 저장
    if (replaceAll) {
      const deleteWhere: any = {};
      if (cpNo) deleteWhere.cpNo = cpNo;
      if (fmeaId) deleteWhere.fmeaId = fmeaId;

      if (Object.keys(deleteWhere).length > 0) {
        await prisma.epDevice.deleteMany({ where: deleteWhere });
      }
    }

    // 새 데이터 저장 (validDevices 사용)
    const createdDevices = await prisma.epDevice.createMany({
      data: validDevices.map((d: any, idx: number) => ({
        cpNo: cpNo || d.cpNo || null,
        fmeaId: fmeaId || d.fmeaId || null,
        processNo: d.processNo || '',
        processName: d.processName || '',
        category: d.category || 'Error Proof',
        deviceName: d.deviceName.trim(),
        purpose: d.purpose || '',
        sortOrder: idx,
        isActive: true,
      })),
    });

    // 저장된 데이터 다시 조회
    const where: any = { isActive: true };
    if (cpNo) where.cpNo = cpNo;
    if (fmeaId) where.fmeaId = fmeaId;

    const savedDevices = await prisma.epDevice.findMany({
      where,
      orderBy: [{ processNo: 'asc' }, { sortOrder: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: savedDevices,
      count: createdDevices.count,
      message: `${createdDevices.count}개 EP검사장치 저장 완료`,
    });
  } catch (error) {
    console.error('EP검사장치 저장 오류:', error);
    return NextResponse.json(
      { success: false, error: 'EP검사장치 저장 실패', detail: String(error) },
      { status: 500 }
    );
  }
}

// PUT - EP검사장치 수정
export async function PUT(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database connection not available' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id가 필요합니다.' },
        { status: 400 }
      );
    }

    const updated = await prisma.epDevice.update({
      where: { id },
      data: {
        processNo: updateData.processNo,
        processName: updateData.processName,
        category: updateData.category,
        deviceName: updateData.deviceName,
        purpose: updateData.purpose,
        sortOrder: updateData.sortOrder,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('EP검사장치 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: 'EP검사장치 수정 실패' },
      { status: 500 }
    );
  }
}

// DELETE - EP검사장치 삭제
export async function DELETE(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database connection not available' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids'); // 다중 삭제용

    if (ids) {
      // 다중 삭제
      const idList = ids.split(',');
      await prisma.epDevice.deleteMany({
        where: { id: { in: idList } },
      });
      return NextResponse.json({
        success: true,
        message: `${idList.length}개 EP검사장치 삭제 완료`,
      });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id가 필요합니다.' },
        { status: 400 }
      );
    }

    await prisma.epDevice.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'EP검사장치 삭제 완료',
    });
  } catch (error) {
    console.error('EP검사장치 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: 'EP검사장치 삭제 실패' },
      { status: 500 }
    );
  }
}
