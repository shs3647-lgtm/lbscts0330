/**
 * 마스터 데이터 초기화 API
 * DELETE: 모든 마스터 데이터 삭제 (DB + localStorage 리셋 가이드)
 * 
 * @created 2026-02-05
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
  const prisma = getPrisma();
  
  try {
    const results: Record<string, number> = {};
    
    // 1. pfmeaMasterFlatItem 삭제
    if (prisma) {
      try {
        const flatItemsDeleted = await prisma.pfmeaMasterFlatItem.deleteMany({});
        results.flatItems = flatItemsDeleted.count;
      } catch (e: any) {
        results.flatItems = 0;
      }
      
      // 2. pfmeaMasterDataset 삭제
      try {
        const datasetsDeleted = await prisma.pfmeaMasterDataset.deleteMany({});
        results.datasets = datasetsDeleted.count;
      } catch (e: any) {
        results.datasets = 0;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: '마스터 데이터가 초기화되었습니다.',
      results,
      localStorageKeys: [
        'pfmea_master_data',
        'pfmea_flat_data',
        'pfmea_custom_processes',
        'pfmea_import_data',
      ],
      instructions: `
브라우저에서 다음 코드를 실행하여 localStorage도 초기화하세요:

localStorage.removeItem('pfmea_master_data');
localStorage.removeItem('pfmea_flat_data');
localStorage.removeItem('pfmea_custom_processes');
localStorage.removeItem('pfmea_import_data');
      `.trim()
    });
    
  } catch (error: any) {
    console.error('마스터 데이터 초기화 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: '마스터 데이터 초기화 API',
    usage: 'DELETE 요청으로 초기화',
    warning: '⚠️ 모든 마스터 데이터가 삭제됩니다!',
  });
}
