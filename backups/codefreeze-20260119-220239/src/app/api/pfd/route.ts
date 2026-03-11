/**
 * @file api/pfd/route.ts
 * @description PFD 목록 조회 및 생성 API
 * @module pfd/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// ============================================================================
// GET: PFD 목록 조회
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 필터 파라미터
    const fmeaId = searchParams.get('fmeaId');
    const cpNo = searchParams.get('cpNo');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // 필터 조건 구성
    const where: any = {};
    
    if (fmeaId) where.fmeaId = fmeaId;
    if (cpNo) where.cpNo = cpNo;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { pfdNo: { contains: search, mode: 'insensitive' } },
        { partName: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    // PFD 목록 조회
    const pfds = await prisma.pfdRegistration.findMany({
      where,
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: pfds.map((pfd: any) => ({
        ...pfd,
        itemCount: pfd._count.items,
      })),
    });

  } catch (error: any) {
    console.error('[API] PFD 목록 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: PFD 생성
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pfdNo,
      fmeaId,
      cpNo,
      apqpProjectId,
      partName,
      partNo,
      subject,
      customerName,
      modelYear,
      companyName,
      processOwner,
      createdBy,
    } = body;

    // 필수 필드 검증
    if (!pfdNo) {
      return NextResponse.json(
        { success: false, error: 'PFD 번호는 필수입니다' },
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

    // 중복 체크
    const existing = await prisma.pfdRegistration.findUnique({
      where: { pfdNo },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 PFD 번호입니다' },
        { status: 400 }
      );
    }

    // PFD 생성
    const pfd = await prisma.pfdRegistration.create({
      data: {
        pfdNo,
        fmeaId,
        cpNo,
        apqpProjectId,
        partName,
        partNo,
        subject,
        customerName,
        modelYear,
        companyName,
        processOwner,
        createdBy,
        status: 'draft',
      },
    });

    // 문서 연결 생성 (FMEA 연결 시)
    if (fmeaId) {
      await prisma.documentLink.create({
        data: {
          sourceType: 'pfd',
          sourceId: pfd.id,
          targetType: 'fmea',
          targetId: fmeaId,
          linkType: 'synced_with',
          syncPolicy: 'manual',
        },
      });
    }

    // 문서 연결 생성 (CP 연결 시)
    if (cpNo) {
      await prisma.documentLink.create({
        data: {
          sourceType: 'pfd',
          sourceId: pfd.id,
          targetType: 'cp',
          targetId: cpNo,
          linkType: 'synced_with',
          syncPolicy: 'manual',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: pfd,
    });

  } catch (error: any) {
    console.error('[API] PFD 생성 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류' },
      { status: 500 }
    );
  }
}
