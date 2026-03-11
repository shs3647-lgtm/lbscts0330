/**
 * 마스터 CP 공정 목록 API
 * - GET: Master CP 기초정보에서 공정 목록 반환
 * - cp_master_flat_items 테이블에서 A1(공정번호), A2(공정명) 조회
 * 
 * 벤치마킹: PFMEA Master Processes API
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    console.error('❌ [API] DB 연결 실패');
    return NextResponse.json({ success: false, error: 'DB 연결 실패', processes: [] });
  }
  
  try {
    const cpNo = req.nextUrl.searchParams.get('cpNo')?.toLowerCase();

    // 1. 활성화된 Master Dataset 조회 (cpNo별)
    const activeDataset = cpNo
      ? await prisma.cpMasterDataset.findUnique({ where: { cpNo } })
      : await prisma.cpMasterDataset.findFirst({
          where: { isActive: true },
          orderBy: { updatedAt: 'desc' },
        });
    
    if (!activeDataset) {
      return NextResponse.json({
        success: true, 
        processes: [],
        source: 'none',
        message: 'Master CP 기초정보가 없습니다. 먼저 기초정보를 Import해주세요.'
      });
    }
    
    
    // 2. Master Dataset의 공정 데이터 조회 (A1: 공정번호, A2: 공정명)
    const flatItems = await prisma.cpMasterFlatItem.findMany({
      where: { 
        datasetId: activeDataset.id,
        itemCode: { in: ['A1', 'A2'] }  // 공정번호, 공정명
      },
      orderBy: { processNo: 'asc' }
    });
    
    
    // 3. processNo별로 공정 데이터 그룹핑
    const processMap = new Map<string, { no: string; name: string }>();
    
    flatItems.forEach((item: any) => {
      const processNo = item.processNo || '';
      if (!processMap.has(processNo)) {
        processMap.set(processNo, { no: '', name: '' });
      }
      const proc = processMap.get(processNo)!;
      
      // A1 = 공정번호
      if (item.itemCode === 'A1') {
        proc.no = item.value || '';
      }
      // A2 = 공정명
      if (item.itemCode === 'A2') {
        proc.name = item.value || '';
      }
    });
    
    
    // 4. 공정 목록 생성 (공정명이 있는 것만)
    const processes = Array.from(processMap.entries())
      .filter(([_, proc]) => proc.name && proc.name.trim() !== '')
      .map(([processNo, proc], idx) => ({
        id: `cp_master_proc_${processNo}_${idx}`,
        no: proc.no || processNo || String((idx + 1) * 10),
        name: proc.name
      }));
    
    
    return NextResponse.json({ 
      success: true, 
      processes,
      source: 'cp_master_flat_items',
      datasetId: activeDataset.id,
      datasetName: activeDataset.name
    });
    
  } catch (error: any) {
    console.error('❌ [API] CP 공정 조회 오류:', error.message);
    console.error('❌ [API] 에러 스택:', error.stack);
    return NextResponse.json({ 
      success: false, 
      processes: [],
      error: 'CP 공정 조회 중 오류가 발생했습니다.'
    });
  }
}

