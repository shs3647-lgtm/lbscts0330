/**
 * @file route.ts
 * @description 접속 로그 API
 * @created 2026-01-21
 */

import { NextRequest, NextResponse } from 'next/server';
import { logAccess, getAccessLogs, updateLogoutTime } from '@/lib/services/auth-service';

export const runtime = 'nodejs';

// GET: 접속 로그 조회
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId') || undefined;
    const module = searchParams.get('module') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { logs, total } = await getAccessLogs(projectId, limit, module, offset);

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('❌ 접속 로그 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      logs: []
    }, { status: 500 });
  }
}

// POST: 접속 로그 기록 (또는 sendBeacon을 통한 로그아웃 시간 업데이트)
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // ★★★ 2026-02-02: sendBeacon은 POST만 지원하므로 _method로 PUT 처리 ★★★
    if (data._method === 'PUT') {
      await updateLogoutTime(data.userId, data.projectId, data.module);
      return NextResponse.json({ success: true });
    }

    await logAccess({
      userId: data.userId,
      userName: data.userName || 'Unknown',
      projectId: data.projectId,
      module: data.module || 'UNKNOWN',
      action: data.action || 'access',
      itemType: data.itemType,
      cellAddress: data.cellAddress,
      description: data.description,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ 접속 로그 기록 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// ★★★ 2026-02-02: PUT 로그아웃 시간 업데이트 ★★★
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { userId, projectId, module } = data;

    await updateLogoutTime(userId, projectId, module);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ 로그아웃 시간 업데이트 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
