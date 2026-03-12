/**
 * @file /api/control-plan/revisions/route.ts
 * @description CP 개정 이력 API (CpRevision 모델 기반)
 * - GET: cpNo별 개정 이력 조회
 * - POST: 개정 이력 저장
 * @created 2026-03-12
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured', revisions: [] }, { status: 500 });
  }

  try {
    const cpNo = request.nextUrl.searchParams.get('cpNo');
    if (!cpNo) {
      return NextResponse.json({ success: false, error: 'cpNo is required', revisions: [] }, { status: 400 });
    }

    const revisions = await prisma.cpRevision.findMany({
      where: { cpNo },
      orderBy: { createdAt: 'asc' },
    });

    if (revisions.length === 0) {
      const defaults = Array.from({ length: 10 }, (_, i) => ({
        cpNo,
        revNo: `Rev.${i.toString().padStart(2, '0')}`,
        revDate: i === 0 ? new Date().toISOString().split('T')[0] : '',
        revReason: i === 0 ? '신규 등록' : '',
        revContent: '',
        revisedBy: '',
        approvedBy: '',
      }));

      await prisma.cpRevision.createMany({ data: defaults });

      const created = await prisma.cpRevision.findMany({
        where: { cpNo },
        orderBy: { createdAt: 'asc' },
      });

      return NextResponse.json({ success: true, revisions: created });
    }

    return NextResponse.json({ success: true, revisions });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[CP 개정관리] 조회 실패:', msg);
    return NextResponse.json({ success: false, error: msg, revisions: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { cpNo, revisions } = body;

    if (!cpNo || !revisions) {
      return NextResponse.json({ success: false, error: 'cpNo and revisions are required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.cpRevision.deleteMany({ where: { cpNo } });

      await tx.cpRevision.createMany({
        data: revisions.map((rev: any) => ({
          cpNo,
          revNo: rev.revNo || '',
          revDate: rev.revDate || '',
          revReason: rev.revReason || '',
          revContent: rev.revContent || '',
          revisedBy: rev.revisedBy || '',
          approvedBy: rev.approvedBy || '',
          approvedAt: rev.approvedAt ? new Date(rev.approvedAt) : null,
        })),
      });
    });

    return NextResponse.json({
      success: true,
      message: 'CP 개정 이력이 저장되었습니다.',
      savedCount: revisions.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[CP 개정관리] 저장 실패:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
