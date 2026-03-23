/**
 * 마스터 FMEA 공정 목록 API
 * - GET: Master FMEA 기초정보에서 공정 목록 반환
 * - pfmea_master_flat_items 테이블에서 전체 공정 데이터 조회
 * - CP 자동 입력을 위한 전체 데이터 포함 (A~S열)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// ★★★ 2026-02-05: Excel Parser와 동일한 매핑으로 수정 ★★★
// PFMEA itemCode → 필드 매핑 (excel-parser.ts와 일치)
const ITEM_CODE_MAPPING: Record<string, string> = {
  // L2 레벨 (A 카테고리) - 공정
  'A1': 'processNo',      // L2-1 공정번호
  'A2': 'processName',    // L2-2 공정명
  'A3': 'processDesc',    // L2-3 공정기능/공정설명
  'A4': 'productChar',    // L2-4 제품특성 ★ 수정: workElement → productChar
  'A5': 'failureMode',    // L2-5 고장형태 ★ 수정: productChar → failureMode
  'A6': 'detectionCtrl',  // L2-6 검출관리 ★ 수정: processChar → detectionCtrl
  // L3 레벨 (B 카테고리) - 작업요소
  'B1': 'workElement',    // L3-1 작업요소/설비 ★ 수정: specialChar → workElement
  'B2': 'elementFunc',    // L3-2 요소기능
  'B3': 'processChar',    // L3-3 공정특성 ★ 수정
  'B4': 'failureCause',   // L3-4 고장원인
  'B5': 'preventionCtrl', // L3-5 예방관리
  // L1 레벨 (C 카테고리) - 완제품
  'C1': 'productProcess', // L1-1 구분 (YP/SP/USER)
  'C2': 'productFunc',    // L1-2 제품기능
  'C3': 'requirement',    // L1-3 요구사항
  'C4': 'failureEffect',  // L1-4 고장영향
};

/**
 * ★ dataset → processes 변환 헬퍼
 */
async function buildProcessesFromDataset(
  prisma: ReturnType<typeof getPrisma>,
  datasetId: string
): Promise<Array<{ id: string; no: string; name: string; cpData: Record<string, string> }>> {
  if (!prisma) return [];
  const flatItems = await prisma.pfmeaMasterFlatItem.findMany({
    where: { datasetId },
    orderBy: { processNo: 'asc' },
  });

  const processMap = new Map<string, Record<string, string>>();
  flatItems.forEach((item: any) => {
    const processNo = item.processNo || '';
    if (!processMap.has(processNo)) {
      processMap.set(processNo, {
        processNo: '', processName: '', processDesc: '',
        workElement: '', productChar: '', processChar: '',
        specialChar: '', specTolerance: '', evalMethod: '',
        sampleSize: '', controlMethod: '', reactionPlan: '',
      });
    }
    const proc = processMap.get(processNo)!;
    const cpField = ITEM_CODE_MAPPING[item.itemCode];
    if (cpField && item.value) proc[cpField] = item.value;
  });

  return Array.from(processMap.entries())
    .filter(([_, proc]) => proc.processName?.trim())
    .map(([processNo, proc], idx) => ({
      id: `master_proc_${processNo}_${idx}`,
      no: proc.processNo || String((idx + 1) * 10),
      name: proc.processName,
      cpData: {
        processNo: proc.processNo || String((idx + 1) * 10),
        processName: proc.processName,
        processDesc: proc.processDesc || '',
        workElement: proc.workElement || '',
        productChar: '', processChar: '', specialChar: '',
        specTolerance: '', evalMethod: '', sampleSize: '',
        controlMethod: '', reactionPlan: '',
      },
    }));
}

/**
 * GET: 마스터 공정 목록 조회
 *
 * ★ 4단계 Fallback 체인 (bd-list와 동일 전략):
 *   1단계: 현재 fmeaId의 pfmeaMasterDataset → processes 존재 시 반환
 *   2단계: fmeaType='M' 데이터셋 중 processes > 0
 *   3단계: fmeaType='F' 데이터셋 중 processes > 0
 *   4단계: 모든 isActive 데이터셋 중 processes > 0 (M→F→P 순)
 *
 * 근본 원인: 현재 FMEA(pfm26-p003-i03)는 직접 BD가 없고,
 *   Master BD는 다른 fmeaId(pfm26-m066)에 저장됨 → fallback으로 찾아야 함
 */
export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패', processes: [] });
  }

  try {
    const fmeaId = req.nextUrl.searchParams.get('fmeaId') || '';

    let activeDataset: any = null;
    let processes: any[] = [];

    // ─── 1단계: 정확한 fmeaId 매칭 ─────────────────────────────────
    if (fmeaId) {
      activeDataset = await prisma.pfmeaMasterDataset.findFirst({
        where: { isActive: true, fmeaId },
        orderBy: { updatedAt: 'desc' },
      });
      if (activeDataset) {
        processes = await buildProcessesFromDataset(prisma, activeDataset.id);
        if (processes.length > 0) {
          console.info(`[master-processes] 1단계 매칭: fmeaId=${fmeaId} → ${processes.length}건`);
        }
      }
    }

    // ─── 2단계: fmeaType='M' Master 데이터셋 ────────────────────────
    if (processes.length === 0) {
      const mDatasets = await prisma.pfmeaMasterDataset.findMany({
        where: { isActive: true, fmeaType: 'M' },
        orderBy: { updatedAt: 'desc' },
      });
      for (const ds of mDatasets) {
        const p = await buildProcessesFromDataset(prisma, ds.id);
        if (p.length > 0) { activeDataset = ds; processes = p; break; }
      }
      if (processes.length > 0) {
        console.info(`[master-processes] 2단계 fmeaType='M' 매칭: fmeaId=${activeDataset?.fmeaId} → ${processes.length}건`);
      }
    }

    // ─── 3단계: fmeaType='F' Family 데이터셋 ────────────────────────
    if (processes.length === 0) {
      const fDatasets = await prisma.pfmeaMasterDataset.findMany({
        where: { isActive: true, fmeaType: 'F' },
        orderBy: { updatedAt: 'desc' },
      });
      for (const ds of fDatasets) {
        const p = await buildProcessesFromDataset(prisma, ds.id);
        if (p.length > 0) { activeDataset = ds; processes = p; break; }
      }
      if (processes.length > 0) {
        console.info(`[master-processes] 3단계 fmeaType='F' 매칭: fmeaId=${activeDataset?.fmeaId} → ${processes.length}건`);
      }
    }

    // ─── 4단계: 모든 isActive 데이터셋 (어떤 타입이든 processes 있는 것) ─
    if (processes.length === 0) {
      const allDatasets = await prisma.pfmeaMasterDataset.findMany({
        where: { isActive: true },
        orderBy: [{ fmeaType: 'asc' }, { updatedAt: 'desc' }], // M→F→P 순
      });
      for (const ds of allDatasets) {
        const p = await buildProcessesFromDataset(prisma, ds.id);
        if (p.length > 0) { activeDataset = ds; processes = p; break; }
      }
      if (processes.length > 0) {
        console.info(`[master-processes] 4단계 전체 매칭: fmeaId=${activeDataset?.fmeaId} → ${processes.length}건`);
      }
    }

    if (processes.length === 0) {
      return NextResponse.json({
        success: true,
        processes: [],
        source: 'none',
        message: 'Master FMEA 기초정보가 없습니다. Import에서 BD를 먼저 저장하세요.',
      });
    }

    // ★ fallback 결과는 캐시하지 않음 (다음 요청에서 더 나은 매칭이 생길 수 있음)
    return NextResponse.json({
      success: true,
      processes,
      source: 'pfmea_master_flat_items',
      sourceFmeaId: activeDataset.fmeaId,  // ★ 실제 사용된 fmeaId (UI 표시용)
      datasetId: activeDataset.id,
      datasetName: activeDataset.name,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });

  } catch (error: any) {
    console.error('공정 조회 오류:', error.message);
    return NextResponse.json({ success: false, processes: [], error: error.message });
  }
}

/**
 * POST: 마스터 공정 신규 추가
 * Body: { processNo: string, processName: string }
 */
export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' });
  }

  try {
    const body = await req.json();
    const { processNo, processName, fmeaId } = body;

    if (!processNo || !processName) {
      return NextResponse.json({ success: false, error: '공정번호와 공정명이 필요합니다.' });
    }

    // ★ 2026-03-19: fmeaId별 마스터 데이터셋 분리
    let activeDataset = await prisma.pfmeaMasterDataset.findFirst({
      where: {
        isActive: true,
        ...(fmeaId ? { fmeaId } : {}),
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (!activeDataset) {
      // fmeaId가 있으면 해당 프로젝트용 데이터셋 자동 생성
      if (fmeaId) {
        // fmeaId 패턴으로 fmeaType 결정 (pfm26-m→M, pfm26-f→F, pfm26-p→P, 기타→P)
        const typeMatch = fmeaId.match(/-([mfp])\d/i);
        const fmeaType = typeMatch ? typeMatch[1].toUpperCase() : 'P';
        activeDataset = await prisma.pfmeaMasterDataset.create({
          data: { fmeaId, isActive: true, name: `Master-${fmeaId}`, fmeaType },
        });
      } else {
        return NextResponse.json({ success: false, error: 'Master Dataset이 없습니다. Import에서 먼저 BD를 저장하세요.' });
      }
    }

    const datasetId = activeDataset.id;

    // 중복 확인
    const existing = await prisma.pfmeaMasterFlatItem.findFirst({
      where: {
        datasetId,
        processNo,
        itemCode: 'A2',
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, message: '이미 존재하는 공정', duplicate: true });
    }

    // A1(공정번호) + A2(공정명) 생성
    await prisma.pfmeaMasterFlatItem.createMany({
      data: [
        { datasetId, processNo, category: 'A', itemCode: 'A1', value: processNo },
        { datasetId, processNo, category: 'A', itemCode: 'A2', value: processName },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('공정 추가 오류:', error.message);
    return NextResponse.json({ success: false, error: error.message });
  }
}

/**
 * PATCH: 마스터 공정명 수정
 * Body: { updates: [{ processNo: string, name: string }] }
 */
export async function PATCH(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' });
  }

  try {
    const body = await req.json();
    const updates: { processNo: string; name: string }[] = body.updates;
    const fmeaId = body.fmeaId || '';

    if (!updates || updates.length === 0) {
      return NextResponse.json({ success: false, error: '수정할 데이터가 없습니다.' });
    }

    // ★ 2026-03-19: fmeaId별 마스터 데이터셋 분리
    const activeDataset = await prisma.pfmeaMasterDataset.findFirst({
      where: {
        isActive: true,
        ...(fmeaId ? { fmeaId } : {}),
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (!activeDataset) {
      return NextResponse.json({ success: false, error: 'Master Dataset이 없습니다.' });
    }

    // 공정명(A2) 일괄 업데이트
    let updatedCount = 0;
    for (const upd of updates) {
      const result = await prisma.pfmeaMasterFlatItem.updateMany({
        where: {
          datasetId: activeDataset.id,
          processNo: upd.processNo,
          itemCode: 'A2',
        },
        data: { value: upd.name },
      });
      updatedCount += result.count;
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error: any) {
    console.error('공정명 수정 오류:', error.message);
    return NextResponse.json({ success: false, error: error.message });
  }
}

/**
 * DELETE: 마스터 공정 삭제 (processNo 기준)
 * Body: { processNos: string[] }
 */
export async function DELETE(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' });
  }

  try {
    const body = await req.json();
    const processNos: string[] = body.processNos;

    if (!processNos || processNos.length === 0) {
      return NextResponse.json({ success: false, error: '삭제할 공정번호가 없습니다.' });
    }

    const activeDataset = await prisma.pfmeaMasterDataset.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (!activeDataset) {
      return NextResponse.json({ success: false, error: 'Master Dataset이 없습니다.' });
    }

    // 해당 processNo의 모든 flat items 삭제
    const result = await prisma.pfmeaMasterFlatItem.deleteMany({
      where: {
        datasetId: activeDataset.id,
        processNo: { in: processNos },
      },
    });

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error: any) {
    console.error('공정 삭제 오류:', error.message);
    return NextResponse.json({ success: false, error: error.message });
  }
}
