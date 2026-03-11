/**
 * @file api/fmea/sod-history/clear/route.ts
 * @description 정식개정 시 SOD 히스토리 초기화 API
 * @module api/fmea/sod-history/clear
 * @created 2026-01-19
 * @lines ~80 (500줄 미만 원칙)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// ============================================================================
// POST: 정식개정 처리 (히스토리 아카이브 + revMajor 증가)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json();
    const { fmeaId, revMajor, revisionNote, revisedBy } = body;
    
    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId is required' }, { status: 400 });
    }
    
    // 프로젝트 조회
    const project = await prisma.fmeaProject.findUnique({
      where: { fmeaId },
      select: { id: true, revMajor: true, revMinor: true },
    });
    
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    
    const currentRevMajor = revMajor || project.revMajor;
    const newRevMajor = currentRevMajor + 1;
    
    // 트랜잭션: 정식개정 기록 생성 + 프로젝트 revMajor 증가 + revMinor 초기화
    await prisma.$transaction([
      // 정식개정 이력 생성
      prisma.fmeaOfficialRevision.create({
        data: {
          fmeaId,
          revMajor: newRevMajor,
          revisionNote: revisionNote || `Rev ${newRevMajor} 정식개정`,
          revisedBy: revisedBy || 'admin',
          revisedByRole: 'FMEA 책임자',
        },
      }),
      // 프로젝트 개정 번호 업데이트
      prisma.fmeaProject.update({
        where: { id: project.id },
        data: {
          revMajor: newRevMajor,
          revMinor: 0,
          revisionNo: `Rev.${String(newRevMajor).padStart(2, '0')}`,
        },
      }),
    ]);
    
    console.log(`[SOD History Clear API] Official revision: ${fmeaId} rev${currentRevMajor} -> rev${newRevMajor}`);
    
    return NextResponse.json({
      success: true,
      revMajor: newRevMajor,
      revMinor: 0,
      message: `정식개정 완료: Rev.${String(newRevMajor).padStart(2, '0')}`,
    });
  } catch (error) {
    console.error('[SOD History Clear API] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process official revision' }, { status: 500 });
  }
}
