/**
 * @file route.ts
 * @description Polling 기반 실시간 동기화 API
 *
 * POST /api/sync/poll
 * - 요청: { appType, documentId, since? }
 * - 응답: { changes, lastPolledAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { pollPendingChanges } from '@/lib/sync/polling-sync-service';

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { appType, documentId, since } = body;

    // 유효성 검사
    if (!appType || !['pfmea', 'cp', 'pfd'].includes(appType)) {
      return NextResponse.json(
        { error: 'Invalid appType. Must be one of: pfmea, cp, pfd' },
        { status: 400 }
      );
    }

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // 대기 중인 변경사항 조회
    const sinceDate = since ? new Date(since) : undefined;
    const result = await pollPendingChanges(
      prisma,
      appType as 'pfmea' | 'cp' | 'pfd',
      documentId,
      sinceDate
    );

    return NextResponse.json({
      success: true,
      changes: result.changes,
      lastPolledAt: result.lastPolledAt.toISOString(),
      count: result.changes.length,
    });
  } catch (error) {
    console.error('[Sync Poll API Error]', error);
    return NextResponse.json(
      { error: 'Failed to poll changes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/poll?appType=cp&documentId=CP26-001
 * 간단한 GET 지원
 */
export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const appType = searchParams.get('appType');
    const documentId = searchParams.get('documentId');
    const since = searchParams.get('since');

    if (!appType || !['pfmea', 'cp', 'pfd'].includes(appType)) {
      return NextResponse.json(
        { error: 'Invalid appType' },
        { status: 400 }
      );
    }

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    const sinceDate = since ? new Date(since) : undefined;
    const result = await pollPendingChanges(
      prisma,
      appType as 'pfmea' | 'cp' | 'pfd',
      documentId,
      sinceDate
    );

    return NextResponse.json({
      success: true,
      changes: result.changes,
      lastPolledAt: result.lastPolledAt.toISOString(),
      count: result.changes.length,
    });
  } catch (error) {
    console.error('[Sync Poll API Error]', error);
    return NextResponse.json(
      { error: 'Failed to poll changes' },
      { status: 500 }
    );
  }
}
