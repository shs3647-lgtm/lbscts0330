/**
 * @file route.ts
 * @description C2/C3 레거시 데이터 삭제 API
 * @created 2026-02-05
 * 
 * POST /api/admin/delete-legacy-c2c3
 * - C2(완제품기능), C3(요구사항) 마스터 데이터 삭제
 * - 타이어 관련 레거시 데이터 정리용
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST() {
  const prisma = getPrisma();
  
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Prisma not available' }, { status: 500 });
  }
  
  try {
    
    // C2(완제품기능) 삭제
    const deletedC2 = await prisma.pfmeaMasterFlatItem.deleteMany({
      where: { itemCode: 'C2' }
    });
    
    // C3(요구사항) 삭제
    const deletedC3 = await prisma.pfmeaMasterFlatItem.deleteMany({
      where: { itemCode: 'C3' }
    });
    
    
    return NextResponse.json({
      success: true,
      message: 'C2/C3 레거시 데이터 삭제 완료',
      deletedC2: deletedC2.count,
      deletedC3: deletedC3.count,
      total: deletedC2.count + deletedC3.count
    });
    
  } catch (error: any) {
    console.error('❌ C2/C3 삭제 실패:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  const prisma = getPrisma();
  
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Prisma not available' }, { status: 500 });
  }
  
  try {
    // C2/C3 데이터 수 조회
    const c2Count = await prisma.pfmeaMasterFlatItem.count({
      where: { itemCode: 'C2' }
    });
    const c3Count = await prisma.pfmeaMasterFlatItem.count({
      where: { itemCode: 'C3' }
    });
    
    // C2/C3 샘플 데이터 조회
    const c2Sample = await prisma.pfmeaMasterFlatItem.findMany({
      where: { itemCode: 'C2' },
      take: 5,
      select: { value: true, processNo: true }
    });
    const c3Sample = await prisma.pfmeaMasterFlatItem.findMany({
      where: { itemCode: 'C3' },
      take: 5,
      select: { value: true, processNo: true }
    });
    
    return NextResponse.json({
      success: true,
      c2: { count: c2Count, sample: c2Sample },
      c3: { count: c3Count, sample: c3Sample }
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
