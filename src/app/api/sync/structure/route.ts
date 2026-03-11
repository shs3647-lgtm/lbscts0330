/**
 * @file api/sync/structure/route.ts
 * @description 구조 동기화 API
 * @module sync/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getPrismaForSchema, getBaseDatabaseUrl } from '@/lib/prisma';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';

// ============================================================================
// 4M 정규화 유틸리티
// ============================================================================

/**
 * 4M 값 정규화 함수
 * - 다양한 소스(DB, 레거시, PFD 등)에서 오는 4M 값을 표준 형식으로 변환
 * - 표준 값: 'MN' (Man), 'MC' (Machine), 'IM' (In-Material), 'EN' (Environment)
 */
function normalize4M(value: any): 'MN' | 'MC' | 'IM' | 'EN' | '' {
  if (!value) return '';
  const v = String(value).trim().toUpperCase();

  // 이미 표준 형식인 경우
  if (['MN', 'MC', 'IM', 'EN'].includes(v)) {
    return v as 'MN' | 'MC' | 'IM' | 'EN';
  }

  // PFD/레거시 형식 변환
  switch (v) {
    case 'MAN':
    case 'WORKER':
    case '작업자':
      return 'MN';
    case 'MACHINE':
    case 'EQUIPMENT':
    case '설비':
    case '기계':
      return 'MC';
    case 'MATERIAL':
    case 'IN-MATERIAL':
    case 'INMATERIAL':
    case '자재':
    case '부자재':
    case 'MT': // 일부 레거시에서 MT 사용
      return 'IM';
    case 'METHOD':
    case 'ENVIRONMENT':
    case 'ENV':
    case '환경':
    case 'ME': // Method/Environment
      return 'EN';
    default:
      return '';
  }
}

/**
 * L3 객체에서 4M 값 추출 (m4, fourM, 4m 등 다양한 필드명 지원)
 */
function get4MFromL3(l3: any): 'MN' | 'MC' | 'IM' | 'EN' | '' {
  // 다양한 필드명에서 값 추출 시도
  const rawValue = l3?.m4 || l3?.fourM || l3?.['4m'] || l3?.category4M || l3?.category || '';
  return normalize4M(rawValue);
}

/**
 * 설비/금형/지그 여부 확인 (MC, IM, EN만 해당)
 */
function isEquipment4M(m4: string): boolean {
  const normalized = normalize4M(m4);
  return ['MC', 'IM', 'EN'].includes(normalized);
}

/**
 * Man(작업자) 여부 확인
 */
function isMan4M(m4: string): boolean {
  return normalize4M(m4) === 'MN';
}

// ============================================================================
// 타입 정의
// ============================================================================

type SyncDirection =
  | 'fmea-to-cp' | 'cp-to-fmea'
  | 'pfd-to-fmea' | 'fmea-to-pfd'
  | 'pfd-to-cp' | 'cp-to-pfd';

interface StructureSyncRequest {
  direction: SyncDirection;
  sourceId: string;
  targetId?: string;
  data?: any;
  options?: {
    overwrite?: boolean;
    createEmpty?: boolean;
    preserveTarget?: string[];
  };
}

// ============================================================================
// POST: 구조 동기화
// ============================================================================

// GET: 구조 데이터 조회 (디버깅용)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fmeaId = searchParams.get('fmeaId');

    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' });
    }

    // L2Structure 조회 (관련 데이터 포함)
    const l2Structures = await prisma.l2Structure.findMany({
      where: { fmeaId },
      include: {
        l3Structures: {
          include: { l3Functions: true },
        },
        l2Functions: true,
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({
      success: true,
      fmeaId,
      l2Count: l2Structures.length,
      l2Structures: l2Structures.map(l2 => ({
        id: l2.id,
        no: l2.no,
        name: l2.name,
        l3Count: l2.l3Structures?.length || 0,
        l2FunctionCount: l2.l2Functions?.length || 0,
        l3Structures: l2.l3Structures?.map(l3 => ({
          id: l3.id,
          name: l3.name,
          m4Raw: l3.m4, // 원본 DB 값
          m4Normalized: get4MFromL3(l3), // 정규화된 값
          isEquipment: isEquipment4M(l3.m4 || ''), // 설비 여부
          isMan: isMan4M(l3.m4 || ''), // Man 여부
          l3FunctionCount: l3.l3Functions?.length || 0,
          l3Functions: l3.l3Functions?.map(fn => ({
            processChar: fn.processChar,
            specialChar: fn.specialChar,
          })),
        })),
        l2Functions: l2.l2Functions?.map(fn => ({
          productChar: fn.productChar,
          specialChar: fn.specialChar,
        })),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: StructureSyncRequest = await req.json();
    const { direction, sourceId, targetId, data, options } = body;

    // 필수 파라미터 검증
    if (!direction || !sourceId) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터 누락 (direction, sourceId)' },
        { status: 400 }
      );
    }

    const prisma = getPrisma();

    // 방향에 따라 처리
    switch (direction) {
      case 'fmea-to-cp':
        return await syncFmeaToCp(prisma, sourceId, targetId, options);
      case 'cp-to-fmea':
        return await syncCpToFmea(prisma, sourceId, targetId, data, options);
      case 'pfd-to-fmea':
        return await syncPfdToFmea(prisma, sourceId, targetId, options);
      case 'fmea-to-pfd':
        return await syncFmeaToPfd(prisma, sourceId, targetId, options);
      case 'pfd-to-cp':
        return await syncPfdToCp(prisma, sourceId, targetId, options);
      case 'cp-to-pfd':
        return await syncCpToPfd(prisma, sourceId, targetId, options);
      default:
        return NextResponse.json(
          { success: false, error: '잘못된 동기화 방향' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('[API] 구조 동기화 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류' },
      { status: 500 }
    );
  }
}

// ============================================================================
// FMEA → CP 구조 동기화
// ============================================================================

async function syncFmeaToCp(
  prisma: any,
  fmeaId: string,
  cpNo?: string,
  options?: any
): Promise<NextResponse> {
  try {
    // ★ 2026-01-17: CP 등록 시 저장된 fmeaId를 우선 사용 (URL 파라미터보다 우선)
    let actualFmeaId = fmeaId;

    if (cpNo) {
      const cpRegistration = await prisma.controlPlan.findUnique({
        where: { cpNo },
        select: { fmeaId: true },
      });

      if (cpRegistration?.fmeaId) {
        // CP 등록 시 저장된 FMEA ID 사용
        actualFmeaId = cpRegistration.fmeaId;
      } else {
      }
    }

    // ★ 2026-01-16: 프로젝트 스키마에서 FMEA 데이터 조회
    const baseUrl = getBaseDatabaseUrl();
    const fmeaIdLower = actualFmeaId.toLowerCase();
    const schema = getProjectSchemaName(fmeaIdLower);

    let projectPrisma = prisma;
    if (baseUrl) {
      await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
      projectPrisma = getPrismaForSchema(schema) || prisma;
    }

    // ★ 2026-01-17: 상위 FMEA 데이터 조회 (parentFmeaId가 있으면 상위 FMEA 데이터 병합)
    let parentFmeaId: string | null = null;
    try {
      const fmeaProject = await prisma.fmeaProject.findUnique({
        where: { fmeaId: fmeaIdLower },
        select: { parentFmeaId: true, fmeaType: true },
      });

      if (fmeaProject?.parentFmeaId && fmeaProject.parentFmeaId !== fmeaIdLower) {
        parentFmeaId = fmeaProject.parentFmeaId;
      }
    } catch (e) {
    }

    // 1. FMEA 데이터 조회 (L2Structures + L3Structures + Functions + FailureModes + RiskAnalyses)
    // ★ fmeaIdLower 사용 (CP에 등록된 FMEA ID, 소문자 정규화)
    // ★ 2026-01-18: S/O/D/AP 리스크 참조 연동 추가
    let l2Structures = await projectPrisma.l2Structure.findMany({
      where: {
        fmeaId: fmeaIdLower,
      },
      include: {
        l3Structures: {
          include: {
            l3Functions: true, // 공정특성
          },
          orderBy: { order: 'asc' },
        },
        l2Functions: true, // 제품특성
        // ★ 리스크 참조용: FailureMode → FailureLink → RiskAnalysis
        failureModes: {
          include: {
            failureLinks: {
              include: {
                riskAnalyses: true,
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // ★ 데이터 출처 추적 로그
    let dataSource = 'current_fmea_l2structure';
    let dataSourceFmeaId = fmeaIdLower;
    if (l2Structures && l2Structures.length > 0) {
    }

    // ★ 상위 FMEA 데이터 병합 (현재 FMEA에 없는 공정은 상위에서 가져옴)
    if (parentFmeaId && (!l2Structures || l2Structures.length === 0)) {

      // 상위 FMEA 스키마 설정
      const parentSchema = getProjectSchemaName(parentFmeaId);
      let parentPrisma = projectPrisma;
      if (baseUrl) {
        await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema: parentSchema });
        parentPrisma = getPrismaForSchema(parentSchema) || projectPrisma;
      }

      // 상위 FMEA L2 데이터 조회 (리스크 참조 포함)
      const parentL2 = await parentPrisma.l2Structure.findMany({
        where: { fmeaId: parentFmeaId },
        include: {
          l3Structures: {
            include: { l3Functions: true },
            orderBy: { order: 'asc' },
          },
          l2Functions: true,
          // ★ 리스크 참조용
          failureModes: {
            include: {
              failureLinks: {
                include: {
                  riskAnalyses: true,
                },
              },
            },
          },
        },
        orderBy: { order: 'asc' },
      }).catch(() => []);

      if (parentL2 && parentL2.length > 0) {
        dataSource = 'parent_fmea_l2structure';
        dataSourceFmeaId = parentFmeaId;
        l2Structures = parentL2;
      }
    }

    // ★ 2026-01-17: 레거시 데이터 조회 제거 - 상위 FMEA가 없으면 데이터 누락 처리
    // 레거시 데이터(fmea_legacy_data, fmea_worksheet_data)에서는 절대 데이터를 가져오지 않음
    if (!l2Structures || l2Structures.length === 0) {

      return NextResponse.json({
        success: false,
        error: `FMEA 구조 데이터가 없습니다. (FMEA: ${fmeaId}, 상위 FMEA: ${parentFmeaId || '없음'})`,
        dataSource: 'none',
        dataSourceFmeaId: null,
      });
    }

    // 2. CP 헤더 조회 또는 생성
    let cp;
    if (cpNo) {
      cp = await prisma.controlPlan.findUnique({
        where: { cpNo },
      });
    }

    if (!cp) {
      return NextResponse.json({
        success: false,
        error: 'CP를 찾을 수 없습니다. 먼저 CP를 생성하세요.',
      });
    }

    // 3. 기존 CP 항목 삭제 (overwrite 옵션)
    if (options?.overwrite) {
      await prisma.controlPlanItem.deleteMany({
        where: { cpId: cp.id },
      });
    }

    // 4. FMEA 구조 → CP 항목 변환 및 저장
    // ★ 2026-01-16: 원자성 데이터 구조 - 각 특성을 별도 행으로 분리, charIndex 부여
    const cpItems: any[] = [];
    let sortOrder = 0;

    for (const l2 of l2Structures) {
      // L2Function에서 제품특성 추출 (각각 별도 행)
      const l2Functions = l2.l2Functions || [];
      const productCharList = l2Functions
        .map((f: any) => ({
          name: typeof f.productChar === 'string' ? f.productChar.trim() : '',
          specialChar: f.specialChar || ''
        }))
        .filter((f: any) => f.name);

      // ★ 2026-01-18: S/O/D/AP 리스크 참조 추출 (L2 레벨 최대값)
      // 매트릭스: S/O/D/AP → CP (참조) - FMEA에서 읽기전용으로 전달
      let maxSeverity: number | null = null;
      let maxOccurrence: number | null = null;
      let maxDetection: number | null = null;
      let highestAp: string | null = null;
      const apPriority: Record<string, number> = { 'H': 3, 'M': 2, 'L': 1 };

      const failureModes = l2.failureModes || [];
      for (const fm of failureModes) {
        const failureLinks = fm.failureLinks || [];
        for (const fl of failureLinks) {
          const riskAnalyses = fl.riskAnalyses || [];
          for (const ra of riskAnalyses) {
            if (ra.severity && (maxSeverity === null || ra.severity > maxSeverity)) {
              maxSeverity = ra.severity;
            }
            if (ra.occurrence && (maxOccurrence === null || ra.occurrence > maxOccurrence)) {
              maxOccurrence = ra.occurrence;
            }
            if (ra.detection && (maxDetection === null || ra.detection > maxDetection)) {
              maxDetection = ra.detection;
            }
            if (ra.ap && (highestAp === null || (apPriority[ra.ap] || 0) > (apPriority[highestAp] || 0))) {
              highestAp = ra.ap;
            }
          }
        }
      }

      // L3Structure + L3Function에서 공정특성 추출 (각각 별도 행)
      const l3Structures = l2.l3Structures || [];

      // ★ 설비/금형/지그 연동: MN(Man) 제외, 나머지 모두 포함
      // ★ 빈 4M 값도 설비로 포함 (4M이 설정되지 않은 경우도 설비일 수 있음)
      const equipmentL3s = l3Structures.filter((l3: any) => {
        const m4 = get4MFromL3(l3);
        const isMan = (m4 === 'MN');
        // 디버깅 로그
        return !isMan; // MN(Man)만 제외, 나머지 모두 포함 (MC, IM, EN, 빈값)
      });
      const equipmentNames = equipmentL3s
        .map((l3: any) => (typeof l3.name === 'string' ? l3.name.trim() : ''))
        .filter(Boolean);


      // ★ 공정특성 추출 - 다양한 데이터 소스 지원
      // ★ MN(Man) 분류는 공정특성 연동에서 제외
      const processCharList: { name: string; specialChar: string }[] = [];
      const excludedProcessChars = new Set(['작업숙련도']);
      const addedProcessChars = new Set<string>(); // 중복 방지

      for (const l3 of l3Structures) {
        // ★ 교차매핑 방어: L3 부모 검증 (Prisma include가 보장하지만 안전장치)
        if (l3.l2StructureId && l3.l2StructureId !== l2.id) {
        }
        const m4 = get4MFromL3(l3);
        if (m4 === 'MN') {
          continue;
        }
        // ★ 소스 1: l3.l3Functions (원자성 DB 또는 변환된 데이터)
        if (l3.l3Functions && Array.isArray(l3.l3Functions)) {
          for (const func of l3.l3Functions) {
            const processChar = typeof func.processChar === 'string' ? func.processChar.trim() : '';
            if (processChar && !excludedProcessChars.has(processChar) && !addedProcessChars.has(processChar)) {
              processCharList.push({ name: processChar, specialChar: func.specialChar || '' });
              addedProcessChars.add(processChar);
            }
          }
        }

        // ★ 소스 2: l3.processChars (레거시 데이터 - 직접 저장된 공정특성)
        if (l3.processChars && Array.isArray(l3.processChars)) {
          for (const pc of l3.processChars) {
            const processChar = typeof pc === 'string' ? pc.trim() : (pc?.name || pc?.processChar || '').trim();
            if (processChar && !excludedProcessChars.has(processChar) && !addedProcessChars.has(processChar)) {
              processCharList.push({ name: processChar, specialChar: pc?.specialChar || '' });
              addedProcessChars.add(processChar);
            }
          }
        }

        // ★ 소스 3: l3.functions[].processChars (레거시 - 함수 내 공정특성)
        if (l3.functions && Array.isArray(l3.functions)) {
          for (const func of l3.functions) {
            if (func.processChars && Array.isArray(func.processChars)) {
              for (const pc of func.processChars) {
                const processChar = typeof pc === 'string' ? pc.trim() : (pc?.name || '').trim();
                if (processChar && !excludedProcessChars.has(processChar) && !addedProcessChars.has(processChar)) {
                  processCharList.push({ name: processChar, specialChar: pc?.specialChar || '' });
                  addedProcessChars.add(processChar);
                }
              }
            }
            // 단일 processChar 필드
            const singlePc = typeof func.processChar === 'string' ? func.processChar.trim() : '';
            if (singlePc && !excludedProcessChars.has(singlePc) && !addedProcessChars.has(singlePc)) {
              processCharList.push({ name: singlePc, specialChar: func.specialChar || '' });
              addedProcessChars.add(singlePc);
            }
          }
        }
      }

      // ★ 공정설명(D열) = L2 기능명 (메인공정기능)
      // CP_PFMEA_데이터연계성.md: "공정설명(D열) ↔ PFMEA L2 메인공정 기능"
      // ★ 2026-01-18: 중복 제거 추가 (동일 기능명이 여러 번 있을 경우)
      const functionNames = l2Functions
        .map((f: any) => (typeof f.functionName === 'string' ? f.functionName.trim() : ''))
        .filter(Boolean);
      const uniqueFunctionNames = [...new Set(functionNames)];  // 중복 제거
      const processDesc = uniqueFunctionNames.join(', ');

      // ★ 작업요소(E열) = [4M] + 작업요소명 형식
      // 비-MN L3들의 4M + 이름을 조합하여 작업요소 생성
      const workElementParts = equipmentL3s.map((l3: any) => {
        const m4 = get4MFromL3(l3);
        const l3Name = typeof l3.name === 'string' ? l3.name.trim() : '';
        return m4 ? `[${m4}] ${l3Name}` : l3Name;
      }).filter(Boolean);
      const workElement = workElementParts.join(', ');

      // ★ 원자성: 제품특성 각각 별도 행으로 생성
      let charIndex = 0;
      for (const pChar of productCharList) {
        cpItems.push({
          cpId: cp.id,
          processNo: l2.no || '',
          processName: l2.name || '',
          processLevel: 'Main',
          processDesc: processDesc,
          workElement: workElement,
          equipment: equipmentNames.join(', '),
          // ★ 한 셀에 하나의 제품특성만
          productChar: pChar.name,
          processChar: '',
          specialChar: pChar.specialChar,
          charIndex: charIndex++,  // 원자성 인덱스
          specTolerance: '',
          evalMethod: '',
          sampleSize: '',
          sampleFreq: '',
          controlMethod: '',
          reactionPlan: '',
          // ★ 2026-01-18: S/O/D/AP 리스크 참조 (FMEA → CP, 읽기전용)
          refSeverity: maxSeverity,
          refOccurrence: maxOccurrence,
          refDetection: maxDetection,
          refAp: highestAp,
          pfmeaRowUid: l2.id,
          pfmeaProcessId: l2.id,
          sortOrder: sortOrder++,
        });
      }

      // ★ 원자성: 공정특성 각각 별도 행으로 생성
      for (const pcChar of processCharList) {
        cpItems.push({
          cpId: cp.id,
          processNo: l2.no || '',
          processName: l2.name || '',
          processLevel: 'Main',
          processDesc: processDesc,
          workElement: workElement,
          equipment: equipmentNames.join(', '),
          productChar: '',
          // ★ 한 셀에 하나의 공정특성만
          processChar: pcChar.name,
          specialChar: pcChar.specialChar,
          charIndex: charIndex++,  // 원자성 인덱스
          specTolerance: '',
          evalMethod: '',
          sampleSize: '',
          sampleFreq: '',
          controlMethod: '',
          reactionPlan: '',
          // ★ 2026-01-18: S/O/D/AP 리스크 참조 (FMEA → CP, 읽기전용)
          refSeverity: maxSeverity,
          refOccurrence: maxOccurrence,
          refDetection: maxDetection,
          refAp: highestAp,
          pfmeaRowUid: l2.id,
          pfmeaProcessId: l2.id,
          sortOrder: sortOrder++,
        });
      }

      // ★ 제품특성/공정특성 없으면 빈 행 1개 생성
      if (productCharList.length === 0 && processCharList.length === 0) {
        cpItems.push({
          cpId: cp.id,
          processNo: l2.no || '',
          processName: l2.name || '',
          processLevel: 'Main',
          processDesc: processDesc,
          workElement: workElement,
          equipment: equipmentNames.join(', '),
          productChar: '',
          processChar: '',
          specialChar: '',
          charIndex: 0,
          specTolerance: '',
          evalMethod: '',
          sampleSize: '',
          sampleFreq: '',
          controlMethod: '',
          reactionPlan: '',
          // ★ 2026-01-18: S/O/D/AP 리스크 참조 (FMEA → CP, 읽기전용)
          refSeverity: maxSeverity,
          refOccurrence: maxOccurrence,
          refDetection: maxDetection,
          refAp: highestAp,
          pfmeaRowUid: l2.id,
          pfmeaProcessId: l2.id,
          sortOrder: sortOrder++,
        });
      }
    }

    // 5. 일괄 저장 (개별 create로 안정성 확보)
    for (const item of cpItems) {
      await prisma.controlPlanItem.create({
        data: {
          cpId: item.cpId,
          processNo: item.processNo,
          processName: item.processName,
          processLevel: item.processLevel,
          processDesc: item.processDesc,
          workElement: item.workElement,
          equipment: item.equipment,
          productChar: item.productChar,
          processChar: item.processChar,
          specialChar: item.specialChar,
          charIndex: item.charIndex,
          specTolerance: item.specTolerance,
          evalMethod: item.evalMethod,
          sampleSize: item.sampleSize,
          sampleFreq: item.sampleFreq,
          controlMethod: item.controlMethod,
          reactionPlan: item.reactionPlan,
          // ★ 2026-01-18: S/O/D/AP 리스크 참조 (FMEA → CP, 읽기전용)
          refSeverity: item.refSeverity,
          refOccurrence: item.refOccurrence,
          refDetection: item.refDetection,
          refAp: item.refAp,
          pfmeaRowUid: item.pfmeaRowUid,
          pfmeaProcessId: item.pfmeaProcessId,
          sortOrder: item.sortOrder,
        },
      });
    }

    // 6. 동기화 로그 저장 (실제 사용된 FMEA ID 기록)
    await prisma.syncLog.create({
      data: {
        sourceType: 'fmea',
        sourceId: fmeaIdLower, // ★ 실제 사용된 FMEA ID
        targetType: 'cp',
        targetId: cp.cpNo,
        action: 'create',
        status: 'synced',
        fieldChanges: JSON.stringify({
          itemCount: cpItems.length,
          syncedFields: [
            'processNo', 'processName', 'processDesc', 'workElement', 'equipment',
            'productChar', 'processChar', 'specialChar', 'charIndex',
            'refSeverity', 'refOccurrence', 'refDetection', 'refAp'  // ★ 리스크 참조 필드 추가
          ],
          requestedFmeaId: fmeaId, // 요청된 원본 FMEA ID
          actualFmeaId: fmeaIdLower, // 실제 사용된 FMEA ID (CP 등록 정보 우선)
          dataSource: dataSource,
          dataSourceFmeaId: dataSourceFmeaId,
        }),
        syncedAt: new Date(),
      },
    });


    return NextResponse.json({
      success: true,
      synced: cpItems.length,
      conflicts: [],
      skipped: 0,
      targetId: cp.cpNo,
      // ★ 디버깅용: 데이터 출처 정보
      requestedFmeaId: fmeaId, // 요청된 원본 FMEA ID
      actualFmeaId: fmeaIdLower, // 실제 사용된 FMEA ID (CP 등록 정보 우선)
      dataSource: dataSource,
      dataSourceFmeaId: dataSourceFmeaId,
    });

  } catch (error: any) {
    console.error('[API] FMEA→CP 동기화 실패:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      synced: 0,
      conflicts: [],
      skipped: 0,
    });
  }
}

// ============================================================================
// CP → FMEA 구조 동기화
// ============================================================================

async function syncCpToFmea(
  prisma: any,
  cpNo: string,
  fmeaId?: string,
  data?: any,
  options?: any
): Promise<NextResponse> {
  try {
    // 1. CP 데이터 조회
    const cp = await prisma.controlPlan.findUnique({
      where: { cpNo },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!cp || !cp.items || cp.items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'CP 데이터가 없습니다',
      });
    }

    // 2. FMEA 조회
    if (!fmeaId) {
      return NextResponse.json({
        success: false,
        error: 'FMEA ID가 필요합니다',
      });
    }

    const fmeaIdLower = fmeaId.toLowerCase();
    const baseUrl = getBaseDatabaseUrl();
    const schema = getProjectSchemaName(fmeaIdLower);
    let projectPrisma = prisma;

    if (baseUrl) {
      await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
      projectPrisma = getPrismaForSchema(schema) || prisma;
    }

    // L1 조회 (FMEA에 L1이 있어야 L2 생성 가능)
    let l1 = await projectPrisma.l1Structure.findFirst({
      where: { fmeaId: fmeaIdLower },
      orderBy: { order: 'asc' },
    });

    // ★ 2026-01-30: L1이 없으면 CP의 partName을 사용하여 자동 생성
    if (!l1) {
      const productName = cp.partName || cp.partNo || '완제품';

      l1 = await projectPrisma.l1Structure.create({
        data: {
          fmeaId: fmeaIdLower,
          no: '001',
          name: productName,
          order: 0,
        },
      });
    }

    // 3. CP 항목 → FMEA L2 구조로 변환
    // 공정번호+공정명으로 그룹화
    const processGroups = new Map<string, any[]>();

    cp.items.forEach((item: any) => {
      const key = `${item.processNo}_${item.processName}`;
      if (!processGroups.has(key)) {
        processGroups.set(key, []);
      }
      processGroups.get(key)!.push(item);
    });

    // 4. L2 구조 생성
    let l2Count = 0;

    for (const [key, items] of processGroups) {
      const firstItem = items[0];

      // L2 생성 (스키마에 맞게)
      const l2 = await projectPrisma.l2Structure.create({
        data: {
          fmeaId: fmeaIdLower,
          l1Id: l1.id,
          no: firstItem.processNo || String((l2Count + 1) * 10),
          name: firstItem.processName || '',
          order: l2Count,
        },
      });

      // L3 생성 (workElement가 있는 경우)
      if (firstItem.workElement) {
        await projectPrisma.l3Structure.create({
          data: {
            fmeaId: fmeaIdLower,
            l1Id: l1.id,
            l2Id: l2.id,
            name: firstItem.workElement,
            order: 0,
          },
        });
      }

      l2Count++;
    }

    // 5. 동기화 로그 저장
    await prisma.syncLog.create({
      data: {
        sourceType: 'cp',
        sourceId: cpNo,
        targetType: 'fmea',
        targetId: fmeaId,
        action: 'create',
        status: 'synced',
        fieldChanges: JSON.stringify({ l2Count }),
        syncedAt: new Date(),
      },
    });


    return NextResponse.json({
      success: true,
      synced: l2Count,
      conflicts: [],
      skipped: 0,
      targetId: fmeaId,
    });

  } catch (error: any) {
    console.error('[API] CP→FMEA 동기화 실패:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      synced: 0,
      conflicts: [],
      skipped: 0,
    });
  }
}

// ============================================================================
// PFD → FMEA 구조 동기화
// ============================================================================

async function syncPfdToFmea(
  prisma: any,
  pfdId: string,
  fmeaId?: string,
  options?: any
): Promise<NextResponse> {
  try {
    // 1. PFD 데이터 조회
    const pfd = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [{ id: pfdId }, { pfdNo: pfdId }],
      },
      include: {
        items: {
          where: { isDeleted: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!pfd || !pfd.items || pfd.items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'PFD 데이터가 없습니다',
      });
    }

    // 2. FMEA 확인 (없으면 오류)
    if (!fmeaId) {
      fmeaId = pfd.fmeaId;
    }

    if (!fmeaId) {
      return NextResponse.json({
        success: false,
        error: 'FMEA ID가 필요합니다',
      });
    }

    // L1 조회
    const l1 = await prisma.l1Structure.findFirst({
      where: { fmeaId },
      orderBy: { order: 'asc' },
    });

    if (!l1) {
      return NextResponse.json({
        success: false,
        error: 'FMEA L1 구조가 없습니다. 먼저 FMEA 구조를 생성하세요.',
      });
    }

    // 3. PFD 항목 → FMEA L2/L3 구조로 변환
    let l2Count = 0;
    const processGroups = new Map<string, any[]>();

    pfd.items.forEach((item: any) => {
      const key = `${item.processNo}_${item.processName}`;
      if (!processGroups.has(key)) {
        processGroups.set(key, []);
      }
      processGroups.get(key)!.push(item);
    });

    for (const [key, items] of processGroups) {
      const firstItem = items[0];

      // L2 생성
      const l2 = await prisma.l2Structure.create({
        data: {
          fmeaId: fmeaId,
          l1Id: l1.id,
          no: firstItem.processNo || String((l2Count + 1) * 10),
          name: firstItem.processName || '',
          order: l2Count,
        },
      });

      // L3 생성 (workElement가 있는 경우)
      if (firstItem.workElement) {
        await prisma.l3Structure.create({
          data: {
            fmeaId: fmeaId,
            l1Id: l1.id,
            l2Id: l2.id,
            name: firstItem.workElement,
            order: 0,
          },
        });
      }

      // PFD 항목에 FMEA 연결 정보 업데이트
      await prisma.pfdItem.update({
        where: { id: firstItem.id },
        data: { fmeaL2Id: l2.id },
      });

      l2Count++;
    }

    // 4. 문서 링크 업데이트
    await prisma.documentLink.upsert({
      where: {
        sourceType_sourceId_targetType_targetId: {
          sourceType: 'pfd',
          sourceId: pfd.id,
          targetType: 'fmea',
          targetId: fmeaId,
        },
      },
      create: {
        sourceType: 'pfd',
        sourceId: pfd.id,
        targetType: 'fmea',
        targetId: fmeaId,
        linkType: 'synced_with',
        lastSyncAt: new Date(),
      },
      update: {
        lastSyncAt: new Date(),
      },
    });

    // 5. 동기화 로그
    await prisma.syncLog.create({
      data: {
        sourceType: 'pfd',
        sourceId: pfdId,
        targetType: 'fmea',
        targetId: fmeaId,
        action: 'structure_sync',
        status: 'synced',
        fieldChanges: JSON.stringify({ l2Count }),
        syncedAt: new Date(),
      },
    });


    return NextResponse.json({
      success: true,
      synced: l2Count,
      conflicts: [],
      skipped: 0,
      targetId: fmeaId,
    });

  } catch (error: any) {
    console.error('[API] PFD→FMEA 동기화 실패:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      synced: 0,
      conflicts: [],
      skipped: 0,
    });
  }
}

// ============================================================================
// FMEA → PFD 구조 동기화
// ============================================================================

async function syncFmeaToPfd(
  prisma: any,
  fmeaId: string,
  pfdId?: string,
  options?: any
): Promise<NextResponse> {
  try {
    // 1. FMEA 데이터 조회
    const l2Structures = await prisma.l2Structure.findMany({
      where: { fmeaId },
      include: { l3Structures: true },
      orderBy: { order: 'asc' },
    });

    if (!l2Structures || l2Structures.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'FMEA 구조 데이터가 없습니다',
      });
    }

    // 2. PFD 확인 또는 조회
    let pfd;
    if (pfdId) {
      pfd = await prisma.pfdRegistration.findFirst({
        where: {
          OR: [{ id: pfdId }, { pfdNo: pfdId }],
        },
      });
    }

    if (!pfd) {
      return NextResponse.json({
        success: false,
        error: 'PFD를 찾을 수 없습니다. 먼저 PFD를 생성하세요.',
      });
    }

    // 3. 기존 PFD 항목 삭제 (overwrite 옵션)
    if (options?.overwrite) {
      await prisma.pfdItem.updateMany({
        where: { pfdId: pfd.id },
        data: { isDeleted: true },
      });
    }

    // 4. FMEA 구조 → PFD 항목 변환
    const pfdItems: any[] = [];
    let sortOrder = 0;

    for (const l2 of l2Structures) {
      const firstL3 = l2.l3Structures?.[0];

      pfdItems.push({
        pfdId: pfd.id,
        processNo: l2.no || '',
        processName: l2.name || '',
        processDesc: firstL3?.name || '',
        workElement: firstL3?.name || '',
        equipment: '',
        productChar: '',
        processChar: '',
        specialChar: '',
        fmeaL2Id: l2.id,
        fmeaL3Id: firstL3?.id || null,
        sortOrder: sortOrder++,
        isDeleted: false,
      });
    }

    // 5. 일괄 저장
    await prisma.pfdItem.createMany({
      data: pfdItems,
    });

    // 6. 문서 링크 업데이트
    await prisma.documentLink.upsert({
      where: {
        sourceType_sourceId_targetType_targetId: {
          sourceType: 'fmea',
          sourceId: fmeaId,
          targetType: 'pfd',
          targetId: pfd.id,
        },
      },
      create: {
        sourceType: 'fmea',
        sourceId: fmeaId,
        targetType: 'pfd',
        targetId: pfd.id,
        linkType: 'synced_with',
        lastSyncAt: new Date(),
      },
      update: {
        lastSyncAt: new Date(),
      },
    });

    // 7. 동기화 로그
    await prisma.syncLog.create({
      data: {
        sourceType: 'fmea',
        sourceId: fmeaId,
        targetType: 'pfd',
        targetId: pfd.id,
        action: 'structure_sync',
        status: 'synced',
        fieldChanges: JSON.stringify({ itemCount: pfdItems.length }),
        syncedAt: new Date(),
      },
    });


    return NextResponse.json({
      success: true,
      synced: pfdItems.length,
      conflicts: [],
      skipped: 0,
      targetId: pfd.pfdNo,
    });

  } catch (error: any) {
    console.error('[API] FMEA→PFD 동기화 실패:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      synced: 0,
      conflicts: [],
      skipped: 0,
    });
  }
}

// ============================================================================
// PFD → CP 구조 동기화
// ============================================================================

async function syncPfdToCp(
  prisma: any,
  pfdId: string,
  cpNo?: string,
  options?: any
): Promise<NextResponse> {
  try {
    // 1. PFD 데이터 조회
    const pfd = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [{ id: pfdId }, { pfdNo: pfdId }],
      },
      include: {
        items: {
          where: { isDeleted: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!pfd || !pfd.items || pfd.items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'PFD 데이터가 없습니다',
      });
    }

    // 2. CP 확인
    if (!cpNo) {
      cpNo = pfd.cpNo;
    }

    let cp;
    if (cpNo) {
      cp = await prisma.controlPlan.findUnique({
        where: { cpNo },
      });
    }

    if (!cp) {
      return NextResponse.json({
        success: false,
        error: 'CP를 찾을 수 없습니다. 먼저 CP를 생성하세요.',
      });
    }

    // 3. 기존 CP 항목 삭제 (overwrite 옵션)
    if (options?.overwrite) {
      await prisma.controlPlanItem.deleteMany({
        where: { cpId: cp.id },
      });
    }

    // 4. PFD 항목 → CP 항목 변환 및 저장
    // ★★★ 2026-01-31: 병합 강제 통일 - 공정/공정설명 기준으로 그룹핑 (workElement 제외!) ★★★
    let sortOrder = 0;
    let itemCount = 0;

    // ★ 병합 그룹 키: workElement를 제외하여 공정 단위로 그룹핑
    const getMergeGroupKey = (item: any) => {
      return `${item.processNo || ''}-${item.processName || ''}-${item.processLevel || ''}-${item.processDesc || ''}`;
    };

    // 그룹별 첫 번째 행의 workElement/equipment 값 수집
    const groupFirstValues: { [key: string]: { workElement: string; equipment: string } } = {};
    for (const item of pfd.items) {
      const key = getMergeGroupKey(item);
      if (!groupFirstValues[key]) {
        // 그룹의 첫 번째 항목 - 빈 값이 아닌 첫 값 찾기
        groupFirstValues[key] = {
          workElement: (item.workElement && item.workElement !== '-' && item.workElement.trim() !== '') ? item.workElement : '',
          equipment: (item.equipment && item.equipment !== '-' && item.equipment.trim() !== '') ? item.equipment : '',
        };
      } else {
        // 그룹에 값이 없으면 이 항목 값으로 업데이트
        if (!groupFirstValues[key].workElement && item.workElement && item.workElement !== '-' && item.workElement.trim() !== '') {
          groupFirstValues[key].workElement = item.workElement;
        }
        if (!groupFirstValues[key].equipment && item.equipment && item.equipment !== '-' && item.equipment.trim() !== '') {
          groupFirstValues[key].equipment = item.equipment;
        }
      }
    }


    // ★ 모든 행을 그룹 첫 행 값으로 강제 통일하여 저장
    for (const item of pfd.items) {
      const groupKey = getMergeGroupKey(item);
      const groupValues = groupFirstValues[groupKey] || { workElement: '', equipment: '' };

      // 강제 통일: 그룹 첫 행 값 사용
      const normalizedWorkElement = groupValues.workElement || item.workElement || '';
      const normalizedEquipment = groupValues.equipment || item.equipment || '';

      await prisma.controlPlanItem.create({
        data: {
          cpId: cp.id,
          processNo: item.processNo || '',
          processName: item.processName || '',
          processLevel: item.processLevel || 'Main',
          processDesc: item.processDesc || '',
          // ★ 병합 강제 통일: 그룹 첫 행 값으로 덮어씀
          workElement: normalizedWorkElement,
          equipment: normalizedEquipment,
          // 원자성 데이터: 각 행 고유 데이터
          productChar: item.productChar || '',
          processChar: item.processChar || '',
          specialChar: item.specialChar || '',
          charIndex: sortOrder,
          specTolerance: '',
          evalMethod: '',
          sampleSize: '',
          sampleFreq: '',
          controlMethod: '',
          reactionPlan: '',
          sortOrder: sortOrder++,
        },
      });
      itemCount++;
    }

    // 5. 저장 완료

    // 6. 문서 링크 업데이트
    await prisma.documentLink.upsert({
      where: {
        sourceType_sourceId_targetType_targetId: {
          sourceType: 'pfd',
          sourceId: pfd.id,
          targetType: 'cp',
          targetId: cp.id,
        },
      },
      create: {
        sourceType: 'pfd',
        sourceId: pfd.id,
        targetType: 'cp',
        targetId: cp.id,
        linkType: 'synced_with',
        lastSyncAt: new Date(),
      },
      update: {
        lastSyncAt: new Date(),
      },
    });

    // 7. 동기화 로그
    await prisma.syncLog.create({
      data: {
        sourceType: 'pfd',
        sourceId: pfdId,
        targetType: 'cp',
        targetId: cp.cpNo,
        action: 'structure_sync',
        status: 'synced',
        fieldChanges: JSON.stringify({ itemCount }),
        syncedAt: new Date(),
      },
    });


    return NextResponse.json({
      success: true,
      synced: itemCount,
      conflicts: [],
      skipped: 0,
      targetId: cp.cpNo,
    });

  } catch (error: any) {
    console.error('[API] PFD→CP 동기화 실패:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      synced: 0,
      conflicts: [],
      skipped: 0,
    });
  }
}

// ============================================================================
// CP → PFD 구조 동기화
// ============================================================================

async function syncCpToPfd(
  prisma: any,
  cpNo: string,
  pfdId?: string,
  options?: any
): Promise<NextResponse> {
  try {
    // 1. CP 데이터 조회
    const cp = await prisma.controlPlan.findUnique({
      where: { cpNo },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!cp || !cp.items || cp.items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'CP 데이터가 없습니다',
      });
    }

    // 2. PFD 확인
    let pfd;
    if (pfdId) {
      pfd = await prisma.pfdRegistration.findFirst({
        where: {
          OR: [{ id: pfdId }, { pfdNo: pfdId }],
        },
      });
    }

    if (!pfd) {
      return NextResponse.json({
        success: false,
        error: 'PFD를 찾을 수 없습니다. 먼저 PFD를 생성하세요.',
      });
    }

    // 3. 기존 PFD 항목 삭제 (overwrite 옵션)
    if (options?.overwrite) {
      await prisma.pfdItem.updateMany({
        where: { pfdId: pfd.id },
        data: { isDeleted: true },
      });
    }

    // 4. CP 항목 → PFD 항목 변환
    // ★★★ 2026-01-31: 병합 강제 통일 - 공정/공정설명 기준으로 그룹핑 (workElement 제외!) ★★★
    const pfdItems: any[] = [];
    let sortOrder = 0;

    // ★ 병합 그룹 키: workElement를 제외하여 공정 단위로 그룹핑
    const getMergeGroupKey = (item: any) => {
      return `${item.processNo || ''}-${item.processName || ''}-${item.processLevel || ''}-${item.processDesc || ''}`;
    };

    // 그룹별 첫 번째 행의 workElement/equipment 값 수집
    const groupFirstValues: { [key: string]: { workElement: string; equipment: string } } = {};
    for (const item of cp.items) {
      const key = getMergeGroupKey(item);
      if (!groupFirstValues[key]) {
        groupFirstValues[key] = {
          workElement: (item.workElement && item.workElement !== '-' && item.workElement.trim() !== '') ? item.workElement : '',
          equipment: (item.equipment && item.equipment !== '-' && item.equipment.trim() !== '') ? item.equipment : '',
        };
      } else {
        if (!groupFirstValues[key].workElement && item.workElement && item.workElement !== '-' && item.workElement.trim() !== '') {
          groupFirstValues[key].workElement = item.workElement;
        }
        if (!groupFirstValues[key].equipment && item.equipment && item.equipment !== '-' && item.equipment.trim() !== '') {
          groupFirstValues[key].equipment = item.equipment;
        }
      }
    }


    // ★ 모든 행을 그룹 첫 행 값으로 강제 통일하여 저장
    for (const item of cp.items) {
      const groupKey = getMergeGroupKey(item);
      const groupValues = groupFirstValues[groupKey] || { workElement: '', equipment: '' };

      const normalizedWorkElement = groupValues.workElement || item.workElement || '';
      const normalizedEquipment = groupValues.equipment || item.equipment || '';

      pfdItems.push({
        pfdId: pfd.id,
        processNo: item.processNo || '',
        processName: item.processName || '',
        processLevel: item.processLevel || '',
        processDesc: item.processDesc || '',
        // ★ 병합 강제 통일: 그룹 첫 행 값으로 덮어씀
        workElement: normalizedWorkElement,
        equipment: normalizedEquipment,
        // 원자성 데이터: 각 행 고유 데이터
        productChar: item.productChar || '',
        processChar: item.processChar || '',
        specialChar: item.specialChar || '',
        cpItemId: item.id,
        sortOrder: sortOrder++,
        isDeleted: false,
      });
    }

    // 5. 일괄 저장
    await prisma.pfdItem.createMany({
      data: pfdItems,
    });

    // 6. 문서 링크 업데이트
    await prisma.documentLink.upsert({
      where: {
        sourceType_sourceId_targetType_targetId: {
          sourceType: 'cp',
          sourceId: cp.id,
          targetType: 'pfd',
          targetId: pfd.id,
        },
      },
      create: {
        sourceType: 'cp',
        sourceId: cp.id,
        targetType: 'pfd',
        targetId: pfd.id,
        linkType: 'synced_with',
        lastSyncAt: new Date(),
      },
      update: {
        lastSyncAt: new Date(),
      },
    });

    // 7. 동기화 로그
    await prisma.syncLog.create({
      data: {
        sourceType: 'cp',
        sourceId: cpNo,
        targetType: 'pfd',
        targetId: pfd.pfdNo,
        action: 'structure_sync',
        status: 'synced',
        fieldChanges: JSON.stringify({ itemCount: pfdItems.length }),
        syncedAt: new Date(),
      },
    });


    return NextResponse.json({
      success: true,
      synced: pfdItems.length,
      conflicts: [],
      skipped: 0,
      targetId: pfd.pfdNo,
    });

  } catch (error: any) {
    console.error('[API] CP→PFD 동기화 실패:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      synced: 0,
      conflicts: [],
      skipped: 0,
    });
  }
}
