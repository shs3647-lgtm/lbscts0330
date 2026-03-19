/**
 * @file build-cp-pfd-skeleton.ts
 * @description FMEA Atomic DB → CP/PFD 설계도(Skeleton) 생성
 *
 * 비유: FMEA가 "완성된 집"이라면, 이 함수는 CP/PFD의 "설계도"를 그린다.
 * 설계도의 각 FK 슬롯(문)에 FMEA의 확정 UUID를 꽂아넣는다.
 *
 * CP 행: FailureLink 기반 (고장사슬당 1행)
 * PFD 행: L2Structure + L3Function 기반 (공정+작업요소)
 */

import { normalizeM4WithOriginal } from '@/lib/sync-helpers';

// ══════════════════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════════════════

export interface CpItemSkeleton {
  // FK 슬롯 (문)
  pfmeaProcessId: string;         // L2Structure.id
  pfmeaWorkElemId: string | null; // L3Structure.id
  productCharId: string | null;   // ProcessProductChar.id
  processCharId: string | null;   // L3Function.id
  linkId: string | null;          // FailureLink.id

  // 복사 데이터 (표시용 캐시)
  processNo: string;
  processName: string;
  processLevel: string;
  productChar: string;
  processChar: string;
  specialChar: string;
  workElement: string;
  equipment: string;
  equipmentM4: string;
  rowType: 'product' | 'process' | 'structure';

  // Risk 데이터 (RiskAnalysis에서)
  refSeverity: number | null;
  refOccurrence: number | null;
  refDetection: number | null;
  refAp: string | null;
  controlMethod: string | null;
}

export interface PfdItemSkeleton {
  fmeaL2Id: string;
  fmeaL3Id: string | null;
  productCharId: string | null;
  processCharId: string | null;

  processNo: string;
  processName: string;
  processLevel: string;
  processDesc: string;
  productChar: string;
  processChar: string;
  productSC: string;
  processSC: string;
  partName: string;
  workElement: string;
  equipment: string;
  equipmentM4: string;
}

export interface SkeletonResult {
  cpItems: CpItemSkeleton[];
  pfdItems: PfdItemSkeleton[];
  stats: {
    l2Count: number;
    l3Count: number;
    failureLinkCount: number;
    cpProductRows: number;
    cpProcessRows: number;
    cpStructureRows: number;
  };
}

// ══════════════════════════════════════════════════════
// 메인 함수
// ══════════════════════════════════════════════════════

export async function buildCpPfdSkeleton(
  prisma: any,
  fmeaId: string
): Promise<SkeletonResult> {
  // ── FMEA Atomic DB에서 원천 데이터 로드 ──
  const l2Structures = await prisma.l2Structure.findMany({
    where: { fmeaId },
    include: {
      processProductChars: { orderBy: { orderIndex: 'asc' } },
      l2Functions: {
        include: {
          failureModes: {
            include: {
              failureLinks: {
                include: {
                  riskAnalyses: { take: 1 },
                  failureCause: {
                    select: { id: true, l3FuncId: true, l3StructId: true },
                  },
                },
              },
            },
          },
        },
      },
      l3Structures: {
        include: { l3Functions: true },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  const cpItems: CpItemSkeleton[] = [];
  const pfdItems: PfdItemSkeleton[] = [];

  let cpProductRows = 0;
  let cpProcessRows = 0;
  let cpStructureRows = 0;
  let failureLinkCount = 0;

  const MC_CODES = ['MC', 'MACHINE', 'MD', 'JG'];

  for (const l2 of l2Structures) {
    const l3Structures = l2.l3Structures || [];
    const l2Functions = l2.l2Functions || [];
    const ppcs = l2.processProductChars || [];

    // ── 설비명 수집 (MC L3에서) ──
    const equipmentEntries = l3Structures
      .filter((l3: any) => MC_CODES.includes((l3.m4 || '').trim().toUpperCase()) && l3.name)
      .map((l3: any) => ({
        name: l3.name.trim(),
        m4: normalizeM4WithOriginal((l3.m4 || '').trim()),
      }))
      .filter((e: any) => e.name.length > 0);
    const equipStr = equipmentEntries.map((e: any) => e.name).join(', ');
    const equipM4Str = equipmentEntries.map((e: any) => e.m4.original || e.m4.normalized).join(',');
    const processLevel = (l2 as any).level || 'Main';

    // ══════════════════════════════════════════
    // CP 설계도 — Product 행 (제품특성당 1행)
    // ══════════════════════════════════════════
    for (const ppc of ppcs) {
      cpItems.push({
        pfmeaProcessId: l2.id,
        pfmeaWorkElemId: null,
        productCharId: ppc.id,
        processCharId: null,
        linkId: null,
        processNo: l2.no || '',
        processName: l2.name || '',
        processLevel,
        productChar: ppc.name || '',
        processChar: '',
        specialChar: ppc.specialChar || '',
        workElement: '',
        equipment: equipStr,
        equipmentM4: equipM4Str,
        rowType: 'product',
        refSeverity: null,
        refOccurrence: null,
        refDetection: null,
        refAp: null,
        controlMethod: null,
      });
      cpProductRows++;
    }

    // ══════════════════════════════════════════
    // CP 설계도 — Process 행 (FailureLink 기반)
    // ══════════════════════════════════════════
    for (const l2Func of l2Functions) {
      for (const fm of (l2Func.failureModes || [])) {
        for (const fl of (fm.failureLinks || [])) {
          failureLinkCount++;
          const ra = fl.riskAnalyses?.[0];
          const fc = fl.failureCause;

          // FC → L3Function 조회 (L3Function.processChar = 공정특성)
          let l3FuncId: string | null = null;
          let l3StructId: string | null = null;
          let processCharName = '';
          let workElementName = '';

          if (fc?.l3FuncId) {
            l3FuncId = fc.l3FuncId;
            l3StructId = fc.l3StructId || null;

            // L3Structure에서 작업요소명, L3Function에서 공정특성명
            const l3 = l3Structures.find((s: any) => s.id === l3StructId);
            if (l3) {
              workElementName = l3.name || '';
              const l3Func = (l3.l3Functions || []).find((f: any) => f.id === l3FuncId);
              if (l3Func) {
                processCharName = l3Func.processChar || '';
              }
            }
          }

          cpItems.push({
            pfmeaProcessId: l2.id,
            pfmeaWorkElemId: l3StructId,
            productCharId: fm.productCharId || null,
            processCharId: l3FuncId,
            linkId: fl.id,
            processNo: l2.no || '',
            processName: l2.name || '',
            processLevel,
            productChar: '',
            processChar: processCharName,
            specialChar: '',
            workElement: workElementName,
            equipment: equipStr,
            equipmentM4: equipM4Str,
            rowType: 'process',
            refSeverity: ra?.severity ?? null,
            refOccurrence: ra?.occurrence ?? null,
            refDetection: ra?.detection ?? null,
            refAp: ra?.ap ?? null,
            controlMethod: ra?.detectionControl ?? null,
          });
          cpProcessRows++;
        }
      }
    }

    // ══════════════════════════════════════════
    // CP 설계도 — Structure 행 (제품특성도 FC도 없는 공정)
    // ══════════════════════════════════════════
    if (ppcs.length === 0 && failureLinkCount === 0) {
      cpItems.push({
        pfmeaProcessId: l2.id,
        pfmeaWorkElemId: null,
        productCharId: null,
        processCharId: null,
        linkId: null,
        processNo: l2.no || '',
        processName: l2.name || '',
        processLevel,
        productChar: '',
        processChar: '',
        specialChar: '',
        workElement: '',
        equipment: equipStr,
        equipmentM4: equipM4Str,
        rowType: 'structure',
        refSeverity: null,
        refOccurrence: null,
        refDetection: null,
        refAp: null,
        controlMethod: null,
      });
      cpStructureRows++;
    }

    // ══════════════════════════════════════════
    // PFD 설계도 (sync-from-fmea 패턴과 동일)
    // ══════════════════════════════════════════

    // L2Function → 제품특성 행
    for (const l2Fn of l2Functions) {
      pfdItems.push({
        fmeaL2Id: l2.id,
        fmeaL3Id: null,
        productCharId: null,
        processCharId: null,
        processNo: l2.no || '',
        processName: l2.name || '',
        processLevel,
        processDesc: l2Fn.functionName || '',
        productChar: l2Fn.productChar || '',
        processChar: '',
        productSC: l2Fn.specialChar || '',
        processSC: '',
        partName: '',
        workElement: '',
        equipment: equipStr,
        equipmentM4: equipM4Str,
      });
    }

    // L3 → 공정특성 행
    for (const l3 of l3Structures) {
      const l3Functions = l3.l3Functions || [];
      if (l3Functions.length > 0) {
        for (const l3Fn of l3Functions) {
          pfdItems.push({
            fmeaL2Id: l2.id,
            fmeaL3Id: l3.id,
            productCharId: null,
            processCharId: l3Fn.id,
            processNo: l2.no || '',
            processName: l2.name || '',
            processLevel,
            processDesc: l3Fn.functionName || '',
            productChar: '',
            processChar: l3Fn.processChar || '',
            productSC: '',
            processSC: l3Fn.specialChar || '',
            partName: l3.name || '',
            workElement: l3.name || '',
            equipment: equipStr,
            equipmentM4: equipM4Str,
          });
        }
      } else {
        pfdItems.push({
          fmeaL2Id: l2.id,
          fmeaL3Id: l3.id,
          productCharId: null,
          processCharId: null,
          processNo: l2.no || '',
          processName: l2.name || '',
          processLevel,
          processDesc: '',
          productChar: '',
          processChar: '',
          productSC: '',
          processSC: '',
          partName: l3.name || '',
          workElement: l3.name || '',
          equipment: equipStr,
          equipmentM4: equipM4Str,
        });
      }
    }

    // L2에 L2Function도 L3도 없는 경우
    if (l2Functions.length === 0 && l3Structures.length === 0) {
      pfdItems.push({
        fmeaL2Id: l2.id,
        fmeaL3Id: null,
        productCharId: null,
        processCharId: null,
        processNo: l2.no || '',
        processName: l2.name || '',
        processLevel,
        processDesc: '',
        productChar: '',
        processChar: '',
        productSC: '',
        processSC: '',
        partName: '',
        workElement: '',
        equipment: equipStr,
        equipmentM4: equipM4Str,
      });
    }
  }

  return {
    cpItems,
    pfdItems,
    stats: {
      l2Count: l2Structures.length,
      l3Count: l2Structures.reduce((sum: number, l2: any) => sum + (l2.l3Structures?.length || 0), 0),
      failureLinkCount,
      cpProductRows,
      cpProcessRows,
      cpStructureRows,
    },
  };
}
