/**
 * @file route.ts
 * @description FMEA 개정관리 API (Prisma 기반)
 * - GET: 프로젝트별 개정 이력 조회
 * - POST: 개정 이력 저장
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId } from '@/lib/security';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET: 개정 이력 조회
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured', revisions: [] }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required', revisions: [] }, { status: 400 });
    }

    // Prisma로 개정 이력 조회
    const revisions = await prisma.fmeaRevisionHistory.findMany({
      where: { fmeaId: projectId },
      orderBy: { revisionNumber: 'asc' },
    });

    // 데이터가 없으면 기본 10개 생성
    if (revisions.length === 0) {
      const defaultRevisions = Array.from({ length: 10 }, (_, index) => ({
        fmeaId: projectId,
        revisionNumber: `Rev.${index.toString().padStart(2, '0')}`,
        revisionDate: '',
        revisionHistory: index === 0 ? '신규 프로젝트 등록' : '',
        createPosition: '',
        createName: '',
        createDate: index === 0 ? new Date().toISOString().split('T')[0] : '',
        createStatus: index === 0 ? '진행' : '',
        reviewPosition: '',
        reviewName: '',
        reviewDate: '',
        reviewStatus: '',
        approvePosition: '',
        approveName: '',
        approveDate: '',
        approveStatus: '',
      }));

      // 기본 데이터 저장
      await prisma.fmeaRevisionHistory.createMany({
        data: defaultRevisions,
      });

      return NextResponse.json({ success: true, revisions: defaultRevisions });
    }

    return NextResponse.json({ success: true, revisions });
  } catch (error: any) {
    console.error('[개정관리] 개정 이력 조회 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message, revisions: [] }, { status: 500 });
  }
}

// POST: 개정 이력 저장
export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { projectId, revisions } = body;

    if (!projectId || !revisions) {
      return NextResponse.json({ success: false, error: 'projectId and revisions are required' }, { status: 400 });
    }

    // 트랜잭션으로 기존 데이터 삭제 후 새 데이터 저장
    await prisma.$transaction(async (tx) => {
      // 기존 데이터 삭제
      await tx.fmeaRevisionHistory.deleteMany({
        where: { fmeaId: projectId },
      });

      // 새 데이터 저장 (ID 자동 생성 - UUID 충돌 방지)
      await tx.fmeaRevisionHistory.createMany({
        data: revisions.map((rev: any) => ({
          fmeaId: projectId,
          revisionNumber: rev.revisionNumber,
          revisionDate: rev.revisionDate || '',
          revisionHistory: rev.revisionHistory || '',
          createPosition: rev.createPosition || '',
          createName: rev.createName || '',
          createDate: rev.createDate || '',
          createStatus: rev.createStatus || '',
          reviewPosition: rev.reviewPosition || '',
          reviewName: rev.reviewName || '',
          reviewDate: rev.reviewDate || '',
          reviewStatus: rev.reviewStatus || '',
          approvePosition: rev.approvePosition || '',
          approveName: rev.approveName || '',
          approveDate: rev.approveDate || '',
          approveStatus: rev.approveStatus || '',
        })),
      });
    });

    // 개정 이력 저장 완료

    // ✅ 승인된 개정이 있으면 프로젝트 단계 7로 업데이트
    const hasApproved = revisions.some((rev: any) => rev.approveStatus === '승인');
    if (hasApproved) {
      try {
        await prisma.fmeaProject.update({
          where: { fmeaId: projectId.toLowerCase() },
          data: { step: 7 }
        });
        // 프로젝트 단계 7 업데이트 완료
      } catch (e: unknown) {
        console.error('[개정관리] 프로젝트 step=7 업데이트 실패:', e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json({
      success: true,
      message: '개정 이력이 저장되었습니다.',
      savedCount: revisions.length
    });
  } catch (error: any) {
    console.error('[개정관리] 개정 이력 저장 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
