/**
 * @file route.ts
 * @description Master 기초정보 초기화 API
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// POST: Master 데이터 초기화
export async function POST() {
  const prisma = getPrisma();
  
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Prisma not available' }, { status: 500 });
  }
  
  try {
    console.log('🔴 [ADMIN] Master 기초정보 초기화 시작...');
    
    // 1. FlatItems 삭제
    const deletedItems = await prisma.pfmeaMasterFlatItem.deleteMany({});
    
    // 2. Datasets 삭제
    const deletedDatasets = await prisma.pfmeaMasterDataset.deleteMany({});
    
    console.log(`🔴 [ADMIN] Master 초기화 완료: ${deletedDatasets.count}개 데이터셋, ${deletedItems.count}개 항목 삭제`);
    
    return NextResponse.json({
      success: true,
      message: 'Master 기초정보 초기화 완료',
      deletedDatasets: deletedDatasets.count,
      deletedItems: deletedItems.count
    });
    
  } catch (error: any) {
    console.error('❌ Master 초기화 실패:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// GET: Master 데이터 상태 조회
export async function GET() {
  const prisma = getPrisma();
  
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Prisma not available' }, { status: 500 });
  }
  
  try {
    const datasets = await prisma.pfmeaMasterDataset.count();
    const items = await prisma.pfmeaMasterFlatItem.count();
    
    return NextResponse.json({
      success: true,
      datasets,
      items
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}











