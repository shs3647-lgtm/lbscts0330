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
  console.log('🔄 [API] /api/control-plan/master-processes 호출됨');
  const prisma = getPrisma();
  if (!prisma) {
    console.error('❌ [API] DB 연결 실패');
    return NextResponse.json({ success: false, error: 'DB 연결 실패', processes: [] });
  }
  
  try {
    // 1. 활성화된 Master Dataset 조회
    console.log('🔍 [API] 활성화된 CP Master Dataset 조회 중...');
    const activeDataset = await prisma.cpMasterDataset.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });
    
    if (!activeDataset) {
      console.log('⚠️ [API] 활성화된 CP Master Dataset 없음');
      // 모든 Dataset 확인 (디버깅용)
      const allDatasets = await prisma.cpMasterDataset.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });
      console.log('📊 [API] 전체 Dataset 목록:', allDatasets.map(d => ({
        id: d.id,
        name: d.name,
        isActive: d.isActive,
        updatedAt: d.updatedAt,
      })));
      return NextResponse.json({ 
        success: true, 
        processes: [],
        source: 'none',
        message: 'Master CP 기초정보가 없습니다. 먼저 기초정보를 Import해주세요.'
      });
    }
    
    console.log('✅ [API] 활성화된 Dataset 발견:', {
      id: activeDataset.id,
      name: activeDataset.name,
      isActive: activeDataset.isActive,
      updatedAt: activeDataset.updatedAt,
    });
    
    // 2. Master Dataset의 공정 데이터 조회 (A1: 공정번호, A2: 공정명)
    console.log('🔍 [API] Flat Items 조회 중... (datasetId:', activeDataset.id, ', itemCode: A1, A2)');
    const flatItems = await prisma.cpMasterFlatItem.findMany({
      where: { 
        datasetId: activeDataset.id,
        itemCode: { in: ['A1', 'A2'] }  // 공정번호, 공정명
      },
      orderBy: { processNo: 'asc' }
    });
    
    console.log('📦 [API] Flat Items 조회 결과:', {
      totalCount: flatItems.length,
      a1Count: flatItems.filter((i: any) => i.itemCode === 'A1').length,
      a2Count: flatItems.filter((i: any) => i.itemCode === 'A2').length,
      sampleItems: flatItems.slice(0, 5).map((i: any) => ({
        processNo: i.processNo,
        itemCode: i.itemCode,
        value: i.value?.substring(0, 20),
      })),
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
    
    console.log('📊 [API] Process Map 생성 완료:', {
      processCount: processMap.size,
      processes: Array.from(processMap.entries()).map(([no, proc]) => `${no}:${proc.no}/${proc.name}`).slice(0, 5),
    });
    
    // 4. 공정 목록 생성 (공정명이 있는 것만)
    const processes = Array.from(processMap.entries())
      .filter(([_, proc]) => proc.name && proc.name.trim() !== '')
      .map(([processNo, proc], idx) => ({
        id: `cp_master_proc_${processNo}_${idx}`,
        no: proc.no || processNo || String((idx + 1) * 10),
        name: proc.name
      }));
    
    console.log(`✅ [API] CP Master 공정 ${processes.length}개 반환 (dataset: ${activeDataset.name})`);
    console.log('📋 [API] 공정 목록 샘플:', processes.slice(0, 5).map(p => `${p.no}:${p.name}`));
    
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
      error: error.message 
    });
  }
}

