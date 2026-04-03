/**
 * 마스터 FMEA 공정 목록 API
 * - GET: Master FMEA 기초정보에서 공정 목록 반환
 * - pfmea_master_flat_items에서 공정 목록용 A1·A2만 조회 (대형 BD 전체 스캔 방지)
 * - 상세 CP 열은 PATCH/별도 API 경로 사용
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId } from '@/lib/security';

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
  // ★ 공정 선택 모달용: A1(공정번호)·A2(공정명)만 조회 — 전체 flat 로드는 대형 BD에서 수만 행·타임아웃·무한 로딩에 가깝게 걸림
  const flatItems = await prisma.pfmeaMasterFlatItem.findMany({
    where: {
      datasetId,
      itemCode: { in: ['A1', 'A2'] },
    },
    select: {
      id: true,
      processNo: true,
      itemCode: true,
      value: true,
    },
    orderBy: [{ processNo: 'asc' }, { itemCode: 'asc' }],
  });

  // ★★★ 2026-03-27: 실제 UUID 사용 — A2(공정명) 항목의 ID를 공정 ID로 사용 ★★★
  const processMap = new Map<string, { id: string; data: Record<string, string> }>();
  flatItems.forEach((item: any) => {
    const processNo = item.processNo || '';
    if (!processMap.has(processNo)) {
      processMap.set(processNo, {
        id: '', // A2 항목의 ID로 설정됨
        data: {
          processNo: '', processName: '', processDesc: '',
          workElement: '', productChar: '', processChar: '',
          specialChar: '', specTolerance: '', evalMethod: '',
          sampleSize: '', controlMethod: '', reactionPlan: '',
        },
      });
    }
    const proc = processMap.get(processNo)!;
    const cpField = ITEM_CODE_MAPPING[item.itemCode];
    if (cpField && item.value) proc.data[cpField] = item.value;
    // A2(공정명) 항목의 실제 UUID를 공정 ID로 사용
    if (item.itemCode === 'A2' && item.id) {
      proc.id = item.id;
    }
  });

  return Array.from(processMap.entries())
    .filter(([_, proc]) => proc.data.processName?.trim())
    .map(([processNo, proc], idx) => ({
      // ★ 실제 UUID 사용 (없으면 폴백)
      id: proc.id || `master_proc_${processNo}_${idx}`,
      no: proc.data.processNo || String((idx + 1) * 10),
      name: proc.data.processName,
      cpData: {
        processNo: proc.data.processNo || String((idx + 1) * 10),
        processName: proc.data.processName,
        processDesc: proc.data.processDesc || '',
        workElement: proc.data.workElement || '',
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
 *   Master BD는 다른 fmeaId(pfm26-m002)에 저장됨 → fallback으로 찾아야 함
 */
export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패', processes: [] });
  }

  try {
    const fmeaId = req.nextUrl.searchParams.get('fmeaId') || '';
    if (fmeaId && !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId', processes: [] }, { status: 400 });
    }

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
          console.warn(`[master-processes] 1단계 매칭: fmeaId=${fmeaId} → ${processes.length}건`);
        }
      }
    }

    // ─── 2단계: masterDatasetId 또는 parentFmeaId fallback ───
    if (processes.length === 0 && fmeaId) {
      const project = await prisma.fmeaProject.findFirst({ where: { fmeaId }, select: { parentFmeaId: true, masterDatasetId: true } });
      // 2a: masterDatasetId 직접 지정 우선
      if (project?.masterDatasetId) {
        activeDataset = await prisma.pfmeaMasterDataset.findFirst({ where: { id: project.masterDatasetId } });
        if (activeDataset) {
          processes = await buildProcessesFromDataset(prisma, activeDataset.id);
          if (processes.length > 0) {
            console.warn(`[master-processes] 2a단계 masterDataset: ${fmeaId} → ${project.masterDatasetId} → ${processes.length}건`);
          }
        }
      }
      // 2b: parentFmeaId fallback
      if (processes.length === 0 && project?.parentFmeaId && project.parentFmeaId !== fmeaId) {
        activeDataset = await prisma.pfmeaMasterDataset.findFirst({
          where: { isActive: true, fmeaId: project.parentFmeaId },
          orderBy: { updatedAt: 'desc' },
        });
        if (activeDataset) {
          processes = await buildProcessesFromDataset(prisma, activeDataset.id);
          if (processes.length > 0) {
            console.warn(`[master-processes] 2b단계 부모 fallback: ${fmeaId} → parent=${project.parentFmeaId} → ${processes.length}건`);
          }
        }
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
    type MasterProcessPatchRow = {
      processNo: string;
      name?: string;
      itemCode?: string;
      oldValue?: string;
      newValue?: string;
      belongsTo?: string | null;
    };
    const updates: MasterProcessPatchRow[] = body.updates;
    const fmeaId = body.fmeaId || '';

    if (fmeaId && !isValidFmeaId(String(fmeaId))) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

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

    // ★ 2026-03-28: itemCode별 값 업데이트/추가 지원 (A2 공정명 + A4 제품특성 등)
    let updatedCount = 0;
    for (const upd of updates) {
      const itemCode = upd.itemCode || 'A2';
      const category = itemCode.charAt(0); // A, B, C 등

      if (upd.oldValue) {
        // 기존 값 업데이트 (oldValue → newValue)
        const whereClause: any = {
          datasetId: activeDataset.id,
          processNo: upd.processNo,
          itemCode,
          value: upd.oldValue,
        };
        const updateData: any = { value: upd.newValue || upd.name || '' };
        // belongsTo도 같이 업데이트 (기존 null → 작업요소명 세팅)
        if (upd.belongsTo) updateData.belongsTo = upd.belongsTo;
        const result = await prisma.pfmeaMasterFlatItem.updateMany({
          where: whereClause,
          data: updateData,
        });
        updatedCount += result.count;
      } else if (upd.name || upd.newValue) {
        // A2 호환 (기존 name 필드) 또는 신규 추가
        const value = upd.newValue || upd.name || '';
        if (itemCode === 'A2') {
          // 공정명 업데이트 (기존 동작)
          const result = await prisma.pfmeaMasterFlatItem.updateMany({
            where: {
              datasetId: activeDataset.id,
              processNo: upd.processNo,
              itemCode: 'A2',
            },
            data: { value },
          });
          updatedCount += result.count;
        } else {
          // 해당 itemCode로 이미 존재하는지 확인
          const findWhere: any = {
            datasetId: activeDataset.id,
            processNo: upd.processNo,
            itemCode,
            value,
          };
          if (upd.belongsTo) findWhere.belongsTo = upd.belongsTo;
          const existing = await prisma.pfmeaMasterFlatItem.findFirst({ where: findWhere });
          if (!existing) {
            await prisma.pfmeaMasterFlatItem.create({
              data: {
                datasetId: activeDataset.id,
                processNo: upd.processNo,
                category,
                itemCode,
                value,
                ...(upd.belongsTo ? { belongsTo: upd.belongsTo } : {}),
              },
            });
            updatedCount++;
          }
        }
      }
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
    const processNos: string[] = body.processNos || [];
    const fmeaId = body.fmeaId || '';
    const deleteByValue = body.deleteByValue; // { itemCode, processNo, value }

    if (fmeaId && !isValidFmeaId(String(fmeaId))) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const activeDataset = await prisma.pfmeaMasterDataset.findFirst({
      where: { isActive: true, ...(fmeaId ? { fmeaId } : {}) },
      orderBy: { updatedAt: 'desc' }
    });

    if (!activeDataset) {
      return NextResponse.json({ success: false, error: 'Master Dataset이 없습니다.' });
    }

    // ★ 값 기준 삭제 (DataSelectModal에서 사용)
    if (deleteByValue && deleteByValue.value) {
      const result = await prisma.pfmeaMasterFlatItem.deleteMany({
        where: {
          datasetId: activeDataset.id,
          itemCode: deleteByValue.itemCode,
          ...(deleteByValue.processNo ? { processNo: deleteByValue.processNo } : {}),
          value: deleteByValue.value,
        },
      });
      return NextResponse.json({ success: true, deletedCount: result.count });
    }

    if (processNos.length === 0) {
      return NextResponse.json({ success: false, error: '삭제할 대상이 없습니다.' });
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
