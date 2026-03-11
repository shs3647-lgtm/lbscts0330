/**
 * 잘못 저장된 CFT 멤버 정리 API
 * 이름이 없거나 공백인 CFT 멤버를 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    let totalDeleted = 0;
    const results: Record<string, number> = {};

    // 1. APQP CFT 멤버 정리 (이름이 null이거나 빈 문자열인 경우)
    const allApqpMembers = await prisma.apqpCftMember.findMany();
    const apqpIdsToDelete = allApqpMembers
      .filter(m => !m.name || m.name.trim() === '')
      .map(m => m.id);
    
    const apqpDeleted = apqpIdsToDelete.length > 0
      ? await prisma.apqpCftMember.deleteMany({
          where: { id: { in: apqpIdsToDelete } }
        })
      : { count: 0 };
    results.apqp = apqpDeleted.count;
    totalDeleted += apqpDeleted.count;
    console.log(`✅ APQP CFT 멤버 ${apqpDeleted.count}명 삭제`);

    // 2. CP CFT 멤버 정리
    const allCpMembers = await prisma.cpCftMember.findMany();
    const cpIdsToDelete = allCpMembers
      .filter(m => !m.name || m.name.trim() === '')
      .map(m => m.id);
    
    const cpDeleted = cpIdsToDelete.length > 0
      ? await prisma.cpCftMember.deleteMany({
          where: { id: { in: cpIdsToDelete } }
        })
      : { count: 0 };
    results.cp = cpDeleted.count;
    totalDeleted += cpDeleted.count;
    console.log(`✅ CP CFT 멤버 ${cpDeleted.count}명 삭제`);

    // 3. FMEA CFT 멤버 정리 (FmeaCftMember 테이블이 있다면)
    // FMEA는 다른 구조일 수 있으므로 확인 필요

    return NextResponse.json({
      success: true,
      message: `잘못 저장된 CFT 멤버 ${totalDeleted}명 삭제 완료`,
      deleted: totalDeleted,
      details: results,
    });

  } catch (error: any) {
    console.error('[Cleanup CFT] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cleanup CFT members' },
      { status: 500 }
    );
  }
}

