/**
 * @file route.ts
 * @description FMEA CFT 멤버 조회 API
 * - GET: FMEA ID로 CFT 멤버 목록 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET: CFT 멤버 조회
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ 
      success: false, 
      error: 'Database not configured', 
      members: [] 
    }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const fmeaId = searchParams.get('fmeaId')?.toLowerCase();
    
    if (!fmeaId) {
      return NextResponse.json({ 
        success: false, 
        error: 'fmeaId is required', 
        members: [] 
      }, { status: 400 });
    }
    
    // CFT 멤버 조회
    const cftMembers = await prisma.fmeaCftMember.findMany({
      where: { fmeaId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        name: true,
        department: true,
        position: true,
        email: true,
        phone: true,
        remarks: true,
      },
    });
    
    
    return NextResponse.json({ 
      success: true, 
      members: cftMembers 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ CFT 멤버 조회 실패:', errorMessage);
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      members: [] 
    }, { status: 500 });
  }
}
