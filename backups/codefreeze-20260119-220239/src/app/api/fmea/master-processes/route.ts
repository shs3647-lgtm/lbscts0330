/**
 * 마스터 FMEA 공정 목록 API
 * - GET: Master FMEA 기초정보에서 공정 목록 반환
 * - pfmea_master_flat_items 테이블에서 전체 공정 데이터 조회
 * - CP 자동 입력을 위한 전체 데이터 포함 (A~S열)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// PFMEA itemCode → CP 필드 매핑
const ITEM_CODE_MAPPING: Record<string, string> = {
  'A1': 'processNo',      // 공정번호
  'A2': 'processName',    // 공정명
  'A3': 'processDesc',    // 공정설명
  'A4': 'workElement',    // 설비/금형/JIG
  'A5': 'productChar',    // 제품특성
  'A6': 'processChar',    // 공정특성
  'B1': 'specialChar',    // 특별특성
  'B2': 'specTolerance',  // 스펙/공차
  'B3': 'evalMethod',     // 평가방법
  'B4': 'sampleSize',     // 샘플
  'B5': 'controlMethod',  // 관리방법
  'C1': 'reactionPlan',   // 대응계획
  // L2 레벨 매핑 (대체 코드)
  'L2-1': 'processNo',
  'L2-2': 'processName',
  'L2-3': 'processDesc',
  'L2-4': 'workElement',
};

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패', processes: [] });
  }
  
  try {
    // 1. 활성화된 Master Dataset 조회
    const activeDataset = await prisma.pfmeaMasterDataset.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });
    
    if (!activeDataset) {
      console.log('⚠️ 활성화된 Master Dataset 없음');
      return NextResponse.json({ 
        success: true, 
        processes: [],
        source: 'none',
        message: 'Master FMEA 기초정보가 없습니다. 먼저 기초정보를 Import해주세요.'
      });
    }
    
    // 2. Master Dataset의 전체 공정 데이터 조회
    const flatItems = await prisma.pfmeaMasterFlatItem.findMany({
      where: { datasetId: activeDataset.id },
      orderBy: { processNo: 'asc' }
    });
    
    // 3. processNo별로 전체 데이터 그룹핑
    const processMap = new Map<string, Record<string, string>>();
    
    flatItems.forEach((item: any) => {
      const processNo = item.processNo || '';
      if (!processMap.has(processNo)) {
        processMap.set(processNo, {
          processNo: '',
          processName: '',
          processDesc: '',
          workElement: '',
          productChar: '',
          processChar: '',
          specialChar: '',
          specTolerance: '',
          evalMethod: '',
          sampleSize: '',
          controlMethod: '',
          reactionPlan: '',
        });
      }
      const proc = processMap.get(processNo)!;
      
      // itemCode를 CP 필드로 매핑
      const cpField = ITEM_CODE_MAPPING[item.itemCode];
      if (cpField && item.value) {
        proc[cpField] = item.value;
      }
    });
    
    // 4. 공정 목록 생성 (공정명이 있는 것만)
    // ★ 공정 기본 정보(A~E열)만 자동 입력, 특성 정보(I열 이후)는 사용자 입력
    const processes = Array.from(processMap.entries())
      .filter(([_, proc]) => proc.processName && proc.processName.trim() !== '')
      .map(([processNo, proc], idx) => ({
        id: `master_proc_${processNo}_${idx}`,
        no: proc.processNo || String((idx + 1) * 10),
        name: proc.processName,
        // CP 자동 입력용 기본 데이터 (A~E열만)
        cpData: {
          processNo: proc.processNo || String((idx + 1) * 10),
          processName: proc.processName,
          processDesc: proc.processDesc || '',
          workElement: proc.workElement || '',
          // ★ 특성 관련 정보는 빈 값 (1:N 관계이므로 사용자 입력)
          productChar: '',
          processChar: '',
          specialChar: '',
          specTolerance: '',
          evalMethod: '',
          sampleSize: '',
          controlMethod: '',
          reactionPlan: '',
        }
      }));
    
    console.log(`✅ Master 공정 ${processes.length}개 반환 (dataset: ${activeDataset.name})`);
    
    return NextResponse.json({ 
      success: true, 
      processes,
      source: 'pfmea_master_flat_items',
      datasetId: activeDataset.id,
      datasetName: activeDataset.name
    });
    
  } catch (error: any) {
    console.error('공정 조회 오류:', error.message);
    return NextResponse.json({ 
      success: false, 
      processes: [],
      error: error.message 
    });
  }
}
