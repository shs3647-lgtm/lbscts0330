/**
 * @file api/sync/logs/route.ts
 * @description 동기화 로그 조회 API
 * @module sync/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// ============================================================================
// GET: 동기화 로그 조회
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 쿼리 파라미터
    const sourceType = searchParams.get('sourceType');
    const sourceId = searchParams.get('sourceId');
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // 필터 조건 구성
    const where: any = {};
    
    if (sourceType) where.sourceType = sourceType;
    if (sourceId) where.sourceId = sourceId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (status) where.status = status;

    // 로그 조회
    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.syncLog.count({ where }),
    ]);

    // 필드 변경 내역 파싱
    const parsedLogs = logs.map((log: any) => ({
      ...log,
      fieldChanges: log.fieldChanges ? JSON.parse(log.fieldChanges) : null,
    }));

    return NextResponse.json({
      success: true,
      data: parsedLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });

  } catch (error: any) {
    console.error('[API] 동기화 로그 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: 동기화 로그 생성
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sourceType,
      sourceId,
      targetType,
      targetId,
      action,
      status = 'pending',
      fieldChanges,
      errorMsg,
    } = body;

    // 필수 필드 검증
    if (!sourceType || !sourceId || !targetType || !targetId || !action) {
      return NextResponse.json(
        { success: false, error: '필수 필드 누락' },
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

    // 로그 생성
    const log = await prisma.syncLog.create({
      data: {
        sourceType,
        sourceId,
        targetType,
        targetId,
        action,
        status,
        fieldChanges: fieldChanges ? JSON.stringify(fieldChanges) : null,
        errorMsg,
        syncedAt: status === 'synced' ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: log,
    });

  } catch (error: any) {
    console.error('[API] 동기화 로그 생성 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류' },
      { status: 500 }
    );
  }
}
