/**
 * @file api/fmea/sod-history/route.ts
 * @description SOD 변경 히스토리 API
 * @module api/fmea/sod-history
 * @created 2026-01-19
 * @lines ~150 (500줄 미만 원칙)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId } from '@/lib/security';
import { getPrisma } from '@/lib/prisma';

// ============================================================================
// GET: SOD 히스토리 조회
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const fmeaId = searchParams.get('fmeaId');
    
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId is required' }, { status: 400 });
    }
    
    // 프로젝트의 현재 개정 정보 조회
    const project = await prisma.fmeaProject.findUnique({
      where: { fmeaId },
      select: { revMajor: true, revMinor: true },
    });
    
    // 현재 개정 버전의 히스토리만 조회
    const histories = await prisma.fmeaSodHistory.findMany({
      where: {
        fmeaId,
        revMajor: project?.revMajor ?? 0,
      },
      orderBy: { changedAt: 'desc' },
    });
    
    return NextResponse.json({
      success: true,
      data: histories,
      revMajor: project?.revMajor ?? 0,
      revMinor: project?.revMinor || 0,
    });
  } catch (error) {
    console.error('[SOD History API] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch SOD history' }, { status: 500 });
  }
}

// ============================================================================
// POST: SOD 변경 기록
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json();
    const {
      fmeaId,
      fmId,
      fmNo,
      fmText,
      fcId,
      fcNo,
      fcText,
      changeType,
      oldValue,
      newValue,
      changeNote,
      changedBy,
    } = body;
    
    // 필수 값 검증
    if (!fmeaId || !fmId || !changeType || oldValue === undefined || newValue === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: fmeaId, fmId, changeType, oldValue, newValue',
      }, { status: 400 });
    }
    
    // 값이 같으면 기록하지 않음
    if (oldValue === newValue) {
      return NextResponse.json({
        success: true,
        message: 'No change detected',
      });
    }
    
    // 프로젝트의 현재 개정 정보 조회 및 revMinor 증가
    const project = await prisma.fmeaProject.findUnique({
      where: { fmeaId },
      select: { id: true, revMajor: true, revMinor: true },
    });
    
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    
    const newRevMinor = project.revMinor + 1;
    
    // 트랜잭션: 히스토리 생성 + 프로젝트 revMinor 업데이트
    const [history] = await prisma.$transaction([
      prisma.fmeaSodHistory.create({
        data: {
          fmeaId,
          revMajor: project.revMajor,
          revMinor: newRevMinor,
          fmId,
          fmNo: fmNo || null,
          fmText: fmText || null,
          fcId: fcId || null,
          fcNo: fcNo || null,
          fcText: fcText || null,
          changeType,
          oldValue,
          newValue,
          changeNote: changeNote || null,
          changedBy: changedBy || 'admin',
        },
      }),
      prisma.fmeaProject.update({
        where: { id: project.id },
        data: { revMinor: newRevMinor },
      }),
    ]);
    
    
    return NextResponse.json({
      success: true,
      data: history,
      revMajor: project.revMajor,
      revMinor: newRevMinor,
    });
  } catch (error) {
    console.error('[SOD History API] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create SOD history' }, { status: 500 });
  }
}

// ============================================================================
// DELETE: SOD 히스토리 삭제
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    
    await prisma.fmeaSodHistory.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SOD History API] DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete SOD history' }, { status: 500 });
  }
}
