/**
 * @file route.ts
 * @description FMEA 회의록 API (Prisma 기반)
 * - GET: 프로젝트별 회의록 조회
 * - POST: 회의록 저장
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET: 회의록 조회
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured', meetings: [] }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const fmeaId = searchParams.get('fmeaId');
    
    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId is required', meetings: [] }, { status: 400 });
    }
    
    // Prisma로 회의록 조회
    const meetings = await prisma.fmeaMeetingMinute.findMany({
      where: { fmeaId },
      orderBy: { no: 'asc' },
    });
    
    return NextResponse.json({ success: true, meetings });
  } catch (error: any) {
    console.error('❌ 회의록 조회 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message, meetings: [] }, { status: 500 });
  }
}

// POST: 회의록 저장
export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { fmeaId, meetings } = body;
    
    if (!fmeaId || !meetings) {
      return NextResponse.json({ success: false, error: 'fmeaId and meetings are required' }, { status: 400 });
    }
    
    // 트랜잭션으로 기존 데이터 삭제 후 새 데이터 저장
    await prisma.$transaction(async (tx) => {
      // 기존 데이터 삭제
      await tx.fmeaMeetingMinute.deleteMany({
        where: { fmeaId },
      });
      
      // 새 데이터 저장
      await tx.fmeaMeetingMinute.createMany({
        data: meetings.map((meeting: any) => ({
          id: meeting.id,
          fmeaId,
          no: meeting.no,
          date: meeting.date || '',
          projectName: meeting.projectName || '',
          content: meeting.content || '',
          author: meeting.author || '',
          authorPosition: meeting.authorPosition || '',
        })),
      });
    });
    
    console.log(`✅ 회의록 저장 완료: ${fmeaId} (${meetings.length}건)`);
    
    return NextResponse.json({ 
      success: true, 
      message: '회의록이 저장되었습니다.',
      savedCount: meetings.length
    });
  } catch (error: any) {
    console.error('❌ 회의록 저장 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}








