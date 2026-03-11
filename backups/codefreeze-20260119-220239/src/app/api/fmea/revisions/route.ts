/**
 * @file route.ts
 * @description FMEA 개정관리 API (Prisma 기반)
 * - GET: 프로젝트별 개정 이력 조회
 * - POST: 개정 이력 저장
 */
import { NextRequest, NextResponse } from 'next/server';
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
    console.error('❌ 개정 이력 조회 실패:', error.message);
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
      
      // 새 데이터 저장
      await tx.fmeaRevisionHistory.createMany({
        data: revisions.map((rev: any) => ({
          id: rev.id,
          fmeaId: projectId,
          revisionNumber: rev.revisionNumber,
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
    
    console.log(`✅ 개정 이력 저장 완료: ${projectId} (${revisions.length}건)`);
    
    return NextResponse.json({ 
      success: true, 
      message: '개정 이력이 저장되었습니다.',
      savedCount: revisions.length
    });
  } catch (error: any) {
    console.error('❌ 개정 이력 저장 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
