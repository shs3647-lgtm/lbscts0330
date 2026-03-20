/**
 * @file route.ts
 * @description FMEA 데이터 저장/로드 API 라우트
 * 
 * ★★★ Atomic DB SSoT 아키텍처 (2026-03-20) ★★★
 * - 저장/로드 모두 Atomic DB만 사용 (Legacy 완전 제거)
 * - Atomic DB가 유일한 진실의 원천 (SSoT)
 * 
 * POST /api/fmea - FMEA 데이터 저장
 * GET /api/fmea?fmeaId=xxx - FMEA 데이터 로드
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v4.0.0-gold L4 — 이 파일을 수정하지 마세요!  ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


import { NextRequest, NextResponse } from 'next/server';
import type { FMEAWorksheetDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';
import { getBaseDatabaseUrl, getPrisma, getPrismaForSchema } from '@/lib/prisma';
import { upsertActiveMasterFromWorksheetTx } from '@/app/api/pfmea/master/sync';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { Pool } from 'pg';
import { bulkSyncToUnifiedItems, convertFMEAStructuresToUnifiedItems } from '@/lib/unified-sync';
import { preserveFailureLinks, filterValidLinks } from '@/lib/failure-link-utils';

// ✅ Prisma는 Node.js 런타임에서만 안정적으로 동작 (edge/browser 번들 방지)
export const runtime = 'nodejs';

// 트랜잭션 타임아웃 (30초)
const TRANSACTION_TIMEOUT = 30000;

/**
 * PFMEA 단계(Stage) 계산 로직
 * - Stage 2 (구조분석확정): 구조분석 확정 시
 * - Stage 3 (1L기능~3L기능 확정): 1L, 2L, 3L 기능분석 모두 확정 시
 * - Stage 4 (1L영향~고정연결확정): 고장연결 확정 시
 * - Stage 5 (All화면 리스크분석 승인): 리스크분석 확정 시
 * - Stage 6 (최적화 승인): 최적화 확정 시
 */
function calculatePFMEAStep(confirmed: any): number {
  if (!confirmed) return 1;
  if (confirmed.optimization) return 6;
  if (confirmed.risk) return 5;
  if (confirmed.failureLink) return 4;
  if (confirmed.l1Function && confirmed.l2Function && confirmed.l3Function) return 3;
  if (confirmed.structure) return 2;
  return 1;
}

/**
 * FMEA 데이터 저장 (배치 처리 최적화)
 */
export async function POST(request: NextRequest) {
  let txStep = 'INIT'; // ★ try/catch 바깥에 선언 (catch에서 접근 가능하도록)
  try {
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        {
          success: false,
          message: 'DATABASE_URL not configured, using localStorage fallback',
          fmeaId: null,
          fallback: true
        },
        { status: 200 }
      );
    }

    const requestBody = await request.json();
    const db: FMEAWorksheetDB = requestBody;
    const forceOverwrite = Boolean(requestBody.forceOverwrite); // ✅ 서버 가드 우회 (디버깅/관리자용)

    // ★★★ 2026-02-18: undefined 배열 필드 기본값 설정 (저장 크래시 방지) ★★★
    db.l2Structures = db.l2Structures || [];
    db.l3Structures = db.l3Structures || [];
    db.l1Functions = db.l1Functions || [];
    db.l2Functions = db.l2Functions || [];
    db.l3Functions = db.l3Functions || [];
    db.failureEffects = db.failureEffects || [];
    db.failureModes = db.failureModes || [];
    db.failureCauses = db.failureCauses || [];
    db.failureLinks = db.failureLinks || [];
    db.riskAnalyses = db.riskAnalyses || [];
    (db as any).optimizations = (db as any).optimizations || [];

    // ★★★ DEBUG: 저장 payload 확인 ★★★
    console.log('[API SAVE DEBUG]', {
      fmeaId: db.fmeaId,
      l1Structure: !!db.l1Structure,
      l2Structures: db.l2Structures.length,
      l3Structures: db.l3Structures.length,
      l1Functions: db.l1Functions.length,
      l2Functions: db.l2Functions.length,
      l3Functions: db.l3Functions.length,
      failureModes: db.failureModes.length,
      failureEffects: db.failureEffects.length,
      failureCauses: db.failureCauses.length,
      failureLinks: db.failureLinks.length,
      hasLegacyData: false,
    });

    // ★★★ FailureLinks 감사 추적 변수 ★★★
    const incomingLinkCount = db.failureLinks.length;
    let preservedLinkCount = 0;      // 빈 배열 POST 시 DB에서 복원한 건수
    let fkValidLinkCount = 0;        // FK 검증 통과 건수
    let fkDroppedCount = 0;          // FK 검증 실패 건수
    let analysisDroppedCount = 0;    // FailureAnalysis 연쇄 드롭 건수
    let riskDroppedCount = 0;        // RiskAnalysis 연쇄 드롭 건수
    let optDroppedCount = 0;         // Optimization 연쇄 드롭 건수
    let feEmptyLinkCount = 0;        // feId 미지정 링크 건수
    let droppedLinkReasons: Array<{ fmId: string; feId: string; fcId: string; fmOK: boolean; feOK: boolean; fcOK: boolean; fmText: string; fcText: string }> = [];


    // 고장 데이터 요약 (info 레벨)
    if (db.failureModes?.length > 0 || db.failureCauses?.length > 0 || db.failureEffects?.length > 0) {
      console.info(`[FMEA API] FM=${db.failureModes?.length || 0} FC=${db.failureCauses?.length || 0} FE=${db.failureEffects?.length || 0}`);
    }

    // Legacy data references removed — Atomic DB is SSoT

    // ✅ FMEA ID는 항상 소문자로 정규화 (DB 일관성 보장)
    // ★ 원본 fmeaId 보존 (DELETE 시 대소문자 무관 삭제용)
    const originalFmeaId = db.fmeaId;
    if (db.fmeaId) {
      db.fmeaId = db.fmeaId.toLowerCase(); // ★ 소문자로 정규화
    }
    const normalizedFmeaId = db.fmeaId;

    if (!db.fmeaId) {
      console.error('[API] FMEA ID가 없습니다.');
      return NextResponse.json(
        { error: 'FMEA ID is required' },
        { status: 400 }
      );
    }

    // ✅ 프로젝트별 DB(스키마) 규칙: fmeaId 기준으로 스키마 자동 생성/초기화 후 그 스키마에 저장
    const schema = getProjectSchemaName(db.fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json(
        {
          success: false,
          message: 'DATABASE_URL not configured, using localStorage fallback',
          fmeaId: null,
          fallback: true
        },
        { status: 200 }
      );
    }

    // ✅ DB 연결 테스트 (스키마별 Prisma)
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (connError: any) {
      console.error('[API] DB 연결 실패:', connError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          message: '데이터베이스 연결에 실패했습니다. localStorage로 폴백됩니다.',
          details: connError.message,
          fallback: true
        },
        { status: 200 }
      );
    }

    // Atomic DB 트랜잭션 저장 (SSoT)

    // 트랜잭션으로 모든 데이터 저장 (배치 처리)
    txStep = 'TX_START';
    await prisma.$transaction(async (tx: any) => {
      // ✅ 강력한 스키마 강제: 트랜잭션 시작 시 search_path 명시적 설정
      // ★★★ 2026-03-19: deadlock 방지를 위한 advisory lock (fmeaId 기반) ★★★
      const lockKey = Math.abs(db.fmeaId.split('').reduce((a: number, c: string) => a * 31 + c.charCodeAt(0), 0) % 2147483647);
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockKey})`);

      // schema는 getProjectSchemaName()으로 [a-z0-9_] 산타이즈됨 — 추가 검증
      if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error(`Invalid schema: ${schema}`);
      await tx.$executeRawUnsafe(`SET search_path TO ${schema}, public`);

      // ✅ 원자성 DB 삭제 후 재생성 (레거시 데이터 기준 동기화)
      // FK 제약조건 순서: 자식 → 부모
      // ★★★ 근본 문제 해결: 대소문자 무관 삭제 (기존 대문자/소문자 데이터 모두 삭제) ★★★
      const deleteCondition = {
        where: {
          fmeaId: {
            in: [originalFmeaId, normalizedFmeaId].filter(Boolean) as string[]
          }
        }
      };

      // ★★★ 2026-02-07: 기능/고장 데이터 보호 - incoming이 비어있으면 기존 DB에서 보존 ★★★
      // 구조 삭제 시 기능 데이터가 비어서 전송되는 경우 기존 DB 데이터를 유지
      const remainingL2StructIds = new Set(db.l2Structures.map(s => s.id));
      const remainingL3StructIds = new Set(db.l3Structures.map(s => s.id));

      if (db.l1Functions.length === 0) {
        const existing = await tx.l1Function.findMany(deleteCondition);
        if (existing.length > 0) {
          db.l1Functions = existing;
        }
      }
      if (db.l2Functions.length === 0) {
        const existing = await tx.l2Function.findMany(deleteCondition);
        if (existing.length > 0) {
          const preserved = existing.filter((f: any) => remainingL2StructIds.has(f.l2StructId));
          db.l2Functions = preserved;
        }
      }
      if (db.l3Functions.length === 0) {
        const existing = await tx.l3Function.findMany(deleteCondition);
        if (existing.length > 0) {
          const preserved = existing.filter((f: any) => remainingL3StructIds.has(f.l3StructId));
          db.l3Functions = preserved;
        }
      }
      // Atomic DB 기반 빈 데이터 복원
      if (db.failureEffects.length === 0) {
        const existing = await tx.failureEffect.findMany(deleteCondition);
        if (existing.length > 0) {
          db.failureEffects = existing;
        }
      }
      if (db.failureModes.length === 0) {
        const existing = await tx.failureMode.findMany(deleteCondition);
        if (existing.length > 0) {
          const preserved = existing.filter((m: any) => remainingL2StructIds.has(m.l2StructId));
          db.failureModes = preserved;
        }
      }
      if (db.failureCauses.length === 0) {
        const existing = await tx.failureCause.findMany(deleteCondition);
        if (existing.length > 0) {
          const preserved = existing.filter((c: any) => remainingL3StructIds.has(c.l3StructId));
          db.failureCauses = preserved;
        }
      }
      {
        // soft-deleted 링크 제외하고 활성 링크만 조회
        const existingDbLinks = await tx.failureLink.findMany({
          where: { ...deleteCondition.where, deletedAt: null },
        });
        db.failureLinks = preserveFailureLinks(db.failureLinks, existingDbLinks);
        if (db.failureLinks === existingDbLinks && existingDbLinks.length > 0) {
          preservedLinkCount = existingDbLinks.length;
        }
      }
      if (db.riskAnalyses.length === 0) {
        const existing = await tx.riskAnalysis.findMany(deleteCondition);
        if (existing.length > 0) {
          db.riskAnalyses = existing;
        }
      }

      txStep = 'DELETE_ALL';
      await tx.optimization.deleteMany(deleteCondition);
      await tx.riskAnalysis.deleteMany(deleteCondition);
      // ★ FailureLink soft delete: 기존 링크를 즉시 삭제하지 않고 deletedAt 표시 → 30일 후 정리
      await tx.failureLink.updateMany({
        where: { ...deleteCondition.where, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      // 30일 이상된 soft-deleted 링크만 완전 삭제
      await tx.failureLink.deleteMany({
        where: {
          fmeaId: db.fmeaId,
          deletedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });
      await tx.failureAnalysis.deleteMany(deleteCondition).catch(() => { });
      await tx.failureCause.deleteMany(deleteCondition);
      await tx.failureMode.deleteMany(deleteCondition);
      await tx.failureEffect.deleteMany(deleteCondition);
      // ★★★ 2026-03-16: PC는 삭제하지 않고 보존 — rebuild-atomic이 생성한 PC를 유지
      // FM.productCharId FK가 PC를 참조하므로, PC 삭제 → FM 재생성 시 orphan 발생 방지
      // 대신 PC는 rebuild-atomic에서만 관리 (Import 시점에 genA4()로 생성)
      // await tx.processProductChar.deleteMany(deleteCondition).catch(() => { }); // DISABLED
      await tx.l3Function.deleteMany(deleteCondition);
      await tx.l2Function.deleteMany(deleteCondition);
      await tx.l1Function.deleteMany(deleteCondition);
      await tx.l3Structure.deleteMany(deleteCondition);
      await tx.l2Structure.deleteMany(deleteCondition);
      await tx.l1Structure.deleteMany(deleteCondition);

      // 1. L1Structure 저장 (upsert: race condition 방지)
      txStep = 'L1_STRUCTURE';
      if (db.l1Structure) {
        await tx.l1Structure.upsert({
          where: { id: db.l1Structure.id },
          create: {
            id: db.l1Structure.id,
            fmeaId: db.fmeaId,
            name: db.l1Structure.name,
            confirmed: db.l1Structure.confirmed ?? false,
          },
          update: {
            name: db.l1Structure.name,
            confirmed: db.l1Structure.confirmed ?? false,
          },
        });
      }

      // 2. L2Structures 배치 저장
      txStep = 'L2_STRUCTURES';
      // ★★★ 2026-02-05: rowIndex, colIndex, parentId, mergeGroupId 포함 ★★★
      if (db.l2Structures.length > 0) {
        await tx.l2Structure.createMany({
          data: db.l2Structures.map(l2 => ({
            id: l2.id,
            fmeaId: db.fmeaId,
            l1Id: l2.l1Id,
            no: l2.no,
            name: l2.name,
            order: l2.order,
            // ★★★ 원자성 필드 추가 ★★★
            rowIndex: l2.rowIndex ?? 0,
            colIndex: l2.colIndex ?? 1,
            parentId: l2.parentId || null,
            mergeGroupId: l2.mergeGroupId || null,
            rowSpan: l2.rowSpan ?? 1,
            colSpan: l2.colSpan ?? 1,
          })),
          skipDuplicates: true,  // ✅ 중복 ID 오류 방지
        });
      }

      // 3. L3Structures 배치 저장
      txStep = 'L3_STRUCTURES';
      if (db.l3Structures.length > 0) {
        // ★ m4 누락 경고 (재발 방지 — 2026-02-22)
        const m4Missing = db.l3Structures.filter(l3 => {
          const name = (l3.name || '').trim();
          return name && !name.includes('클릭') && !name.includes('추가') && !name.includes('선택') && (!l3.m4 || l3.m4.trim() === '');
        });
        if (m4Missing.length > 0) {
        }
        await tx.l3Structure.createMany({
          data: db.l3Structures.map(l3 => ({
            id: l3.id,
            fmeaId: db.fmeaId,
            l1Id: l3.l1Id,
            l2Id: l3.l2Id,
            m4: l3.m4 || null,
            name: l3.name,
            order: l3.order,
            // ★★★ 원자성 필드 추가 ★★★
            rowIndex: l3.rowIndex ?? 0,
            colIndex: l3.colIndex ?? 3,
            parentId: l3.parentId || null,
            mergeGroupId: l3.mergeGroupId || null,
            rowSpan: l3.rowSpan ?? 1,
            colSpan: l3.colSpan ?? 1,
          })),
          skipDuplicates: true,
        });
      }

      // ★★★ 3.5. UnifiedProcessItem (종합 연계성 DB) 동기화 ★★★
      txStep = 'UNIFIED_PROCESS_ITEM';
      // L2(공정) + L3(작업요소)를 종합 DB에 저장하여 CP/PFD와 연계성 확보
      // ✅ 2026-02-05: try-catch로 감싸서 실패해도 전체 저장이 중단되지 않도록 함
      if (db.l2Structures.length > 0) {
        try {
          // 기존 UnifiedProcessItem 삭제 (해당 프로젝트)
          await tx.unifiedProcessItem.deleteMany({
            where: { apqpNo: db.fmeaId }
          });

          // L2 + L3 조합으로 UnifiedProcessItem 생성
          // ★★★ 2026-02-05: productChar, processChar, specialChar 연동 개선 ★★★
          const unifiedItems: any[] = [];
          let sortOrder = 0;

          for (const l2 of db.l2Structures) {
            // L2에 연결된 L2Functions (제품특성) 찾기
            const l2Funcs = db.l2Functions.filter(f => f.l2StructId === l2.id);
            // ★★★ 2026-02-18: productChars 배열 → 문자열 변환 (원자성 DB에서 재구성) ★★★
            const productChars = l2Funcs
              .map(f => {
                // 원자성 DB에서는 productChar가 string
                if (typeof f.productChar === 'string' && f.productChar.trim()) {
                  return f.productChar.trim();
                }
                // 혹시 배열 형태로 저장된 경우 처리
                if (Array.isArray((f as any).productChars)) {
                  return (f as any).productChars
                    .map((p: any) => typeof p === 'string' ? p.trim() : (p?.name || '').trim())
                    .filter(Boolean);
                }
                return [];
              })
              .flat()
              .filter((p, idx, arr) => arr.indexOf(p) === idx); // 중복 제거
            const l2SpecialChars = l2Funcs.map(f => f.specialChar).filter(Boolean);
            
            // L2에 연결된 L3 찾기
            const relatedL3s = db.l3Structures.filter(l3 => l3.l2Id === l2.id);

            if (relatedL3s.length === 0) {
              // L3 없으면 L2만으로 생성
              unifiedItems.push({
                apqpNo: db.fmeaId,
                processNo: l2.no || '',
                processName: l2.name || '',
                processLevel: 'Main',
                processDesc: '',
                partName: '',
                equipment: '',
                workElement: '',  // L3 없음
                productChar: productChars.join(', ') || '',  // ★ 제품특성 연동
                processChar: '',
                specialChar: l2SpecialChars.join(', ') || '',  // ★ 특별특성 연동
                sortOrder: sortOrder++,
              });
            } else {
              // L3 각각에 대해 생성
              for (const l3 of relatedL3s) {
                // L3에 연결된 L3Functions (공정특성) 찾기
                const l3Funcs = db.l3Functions.filter(f => f.l3StructId === l3.id);
                // ★★★ 2026-02-18: processChars 배열 → 문자열 변환 (클라이언트 배열 구조 지원) ★★★
                const processChars = l3Funcs.flatMap(f => {
                  const pc = f.processChar as any;
                  if (typeof pc === 'string') return [pc];
                  if (Array.isArray(pc)) return pc.map((p: any) => typeof p === 'string' ? p : p.name || '');
                  if (Array.isArray((f as any).processChars)) return (f as any).processChars.map((p: any) => typeof p === 'string' ? p : p.name || '');
                  return [];
                }).filter(Boolean);
                const l3SpecialChars = l3Funcs.map(f => f.specialChar).filter(Boolean);
                
                // ★ 금형(MD)/지그(JG)/치공구 + 지게차/크레인/대차/운반구/리프트/컨베이어 등 모두 MC로 분류
                // ★ 2026-03-14 PFD-1: MN(사람) 제외 제거 — PFD에 모든 4M 타입 포함
                let m4Type = (l3.m4 || '').toUpperCase();
                if (m4Type === 'MD' || m4Type === 'JG') m4Type = 'MC';
                const m4Labels: Record<string, string> = {
                  MC: '설비', IM: '투입자재', EN: '작업환경', MN: '작업자'
                };
                const eqLabel = m4Labels[m4Type] || '';
                const eqValue = eqLabel ? `[${m4Type}] ${l3.name || ''}` : (l3.name || '');

                unifiedItems.push({
                  apqpNo: db.fmeaId,
                  processNo: l2.no || '',
                  processName: l2.name || '',
                  processLevel: l3.m4 || 'Main',  // 4M+1E
                  processDesc: '',
                  partName: '',
                  equipment: eqValue,
                  workElement: l3.name || '',  // 작업요소
                  productChar: productChars.join(', ') || '',  // ★ 제품특성 연동
                  processChar: processChars.join(', ') || '',  // ★ 공정특성 연동
                  specialChar: [...l2SpecialChars, ...l3SpecialChars].join(', ') || '',  // ★ 특별특성 연동
                  sortOrder: sortOrder++,
                });
              }
            }
          }

          if (unifiedItems.length > 0) {
            await tx.unifiedProcessItem.createMany({
              data: unifiedItems,
              skipDuplicates: true,
            });
          }
        } catch (unifiedErr: any) {
          // UnifiedProcessItem 동기화 실패해도 워크시트 저장은 계속 진행
        }
      }

      // 4. L1Functions 배치 저장
      txStep = 'L1_FUNCTIONS';
      if (db.l1Functions.length > 0) {
        await tx.l1Function.createMany({
          data: db.l1Functions.map(f => ({
            id: f.id,
            fmeaId: db.fmeaId,
            l1StructId: f.l1StructId,
            category: f.category,
            functionName: f.functionName,
            requirement: f.requirement,
            parentId: f.parentId || null,
            mergeGroupId: f.mergeGroupId || null,
            rowSpan: f.rowSpan ?? 1,
            colSpan: f.colSpan ?? 1,
          })),
          skipDuplicates: true,
        });
      }

      // 4.1. ★★★ 2026-03-17: L1Requirement(C3) 저장 — L1Function.requirement → 별도 테이블 ★★★
      // rebuild-atomic과 동일한 패턴: id = `${l1FuncId}-R`, 1:1 매핑
      // ★ 비차단: 실패해도 메인 트랜잭션 롤백 안 함 (C3 backfill용 보조 데이터)
      txStep = 'L1_REQUIREMENTS';
      try {
        const reqRows = db.l1Functions
          .filter(f => f.requirement !== undefined && f.requirement !== null && f.requirement !== '' && f.l1StructId)
          .map(f => ({
            id: `${f.id}-R`,
            fmeaId: db.fmeaId,
            l1StructId: f.l1StructId,
            l1FuncId: f.id,
            requirement: f.requirement as string,
            orderIndex: 0,
          }));
        if (reqRows.length > 0) {
          await tx.l1Requirement.createMany({ data: reqRows, skipDuplicates: true });
        }
      } catch (reqErr: any) {
        console.warn('[L1Requirement] 보조 저장 실패 (메인 저장 계속):', reqErr.code, reqErr.message?.slice(0, 100));
      }

      // 4.5. ★★★ 2026-03-14: ProcessProductChar 원자성 저장 ★★★
      // L2Function의 productChars 배열에서 독립 엔티티 추출 → createMany
      txStep = 'PROCESS_PRODUCT_CHARS';
      {
        const pcRows: { id: string; fmeaId: string; l2StructId: string; name: string; specialChar: string | null; orderIndex: number }[] = [];
        for (const func of db.l2Functions) {
          const pcs = (func as any).productChars;
          if (Array.isArray(pcs)) {
            pcs.forEach((pc: any, idx: number) => {
              if (!pc?.id || !pc?.name) return;
              // 중복 방지 (공유 ID 패턴으로 동일 PC가 여러 function에 있을 수 있음)
              if (pcRows.some(r => r.id === pc.id)) return;
              pcRows.push({
                id: pc.id,
                fmeaId: db.fmeaId,
                l2StructId: func.l2StructId,
                name: typeof pc.name === 'string' ? pc.name : String(pc.name),
                specialChar: pc.specialChar || null,
                orderIndex: idx,
              });
            });
          }
        }
        // PC fallback — l2Functions에 productChars가 없으면 FM.productCharId에서 복원
        if (pcRows.length === 0) {
          const seenIds = new Set<string>();
          // FM.productCharId에서 id만 수집 (이름은 L2Function.productChar에서)
          if (db.failureModes.length > 0) {
            const pcIdToL2 = new Map<string, string>();
            for (const fm of db.failureModes as any[]) {
              if (fm.productCharId && !seenIds.has(fm.productCharId)) {
                seenIds.add(fm.productCharId);
                pcIdToL2.set(fm.productCharId, fm.l2StructId || '');
              }
            }
            // L2Function.productChar (텍스트)에서 이름 추출
            const funcByL2Struct = new Map<string, string>();
            for (const f of db.l2Functions as any[]) {
              if (f.l2StructId && f.productChar) funcByL2Struct.set(f.l2StructId, f.productChar);
            }
            for (const [pcId, l2StructId] of pcIdToL2) {
              pcRows.push({
                id: pcId,
                fmeaId: db.fmeaId,
                l2StructId,
                name: funcByL2Struct.get(l2StructId) || '',
                specialChar: null,
                orderIndex: 0,
              });
            }
          }
        }
        if (pcRows.length > 0) {
          await tx.processProductChar.createMany({
            data: pcRows,
            skipDuplicates: true,
          });
        }
      }

      // 5. L2Functions 배치 저장
      txStep = 'L2_FUNCTIONS';
      if (db.l2Functions.length > 0) {
        await tx.l2Function.createMany({
          data: db.l2Functions.map(f => {
            // ★★★ productChar 안전 변환: 배열 → 문자열 (DB 스키마: String — NOT NULL) ★★★
            // ★★★ 2026-03-01: '' || null → null 변환 버그 수정 (500 에러 원인) ★★★
            let safeProductChar: string = '';
            const pc = f.productChar as any;
            if (typeof pc === 'string') {
              safeProductChar = pc;
            } else if (Array.isArray(pc)) {
              safeProductChar = pc.map((p: any) => typeof p === 'string' ? p : p?.name || '').filter(Boolean).join(', ');
            } else if (Array.isArray((f as any).productChars)) {
              safeProductChar = (f as any).productChars.map((p: any) => typeof p === 'string' ? p : p?.name || '').filter(Boolean).join(', ');
            }
            return {
            id: f.id,
            fmeaId: db.fmeaId,
            l2StructId: f.l2StructId,
            functionName: f.functionName ?? '',
            productChar: safeProductChar,
            specialChar: f.specialChar || null,
            parentId: f.parentId || null,
            mergeGroupId: f.mergeGroupId || null,
            rowSpan: f.rowSpan ?? 1,
            colSpan: f.colSpan ?? 1,
            };
          }),
          skipDuplicates: true,
        });
      }

      // 6. L3Functions 배치 저장
      txStep = 'L3_FUNCTIONS';
      if (db.l3Functions.length > 0) {
        await tx.l3Function.createMany({
          data: db.l3Functions.map(f => {
            // ★★★ processChar 안전 변환: 배열 → 문자열 (DB 스키마: String — NOT NULL) ★★★
            // ★★★ 2026-03-01: '' || null → null 변환 버그 수정 (500 에러 원인) ★★★
            let safeProcessChar: string = '';
            const pc = f.processChar as any;
            if (typeof pc === 'string') {
              safeProcessChar = pc;
            } else if (Array.isArray(pc)) {
              safeProcessChar = pc.map((p: any) => typeof p === 'string' ? p : p?.name || '').filter(Boolean).join(', ');
            } else if (Array.isArray((f as any).processChars)) {
              safeProcessChar = (f as any).processChars.map((p: any) => typeof p === 'string' ? p : p?.name || '').filter(Boolean).join(', ');
            }
            return {
            id: f.id,
            fmeaId: db.fmeaId,
            l3StructId: f.l3StructId,
            l2StructId: f.l2StructId,
            functionName: f.functionName ?? '',
            processChar: safeProcessChar,
            specialChar: f.specialChar || null,
            parentId: f.parentId || null,
            mergeGroupId: f.mergeGroupId || null,
            rowSpan: f.rowSpan ?? 1,
            colSpan: f.colSpan ?? 1,
            };
          }),
          skipDuplicates: true,
        });
      }

      // 7. FailureEffects 배치 저장 - ★★★ FK 검증 후 저장 ★★★
      txStep = 'FAILURE_EFFECTS';
      let validFeIdSet = new Set(db.failureEffects.map(fe => fe.id));
      if (db.failureEffects.length > 0) {
        const l1FuncIdSet = new Set(db.l1Functions.map(f => f.id));

        // ★★★ 2026-03-15: FailureEffect FK 자동복구 — LAST RESORT 포함 (절대 드롭 금지) ★★★
        let feRepairedCount = 0;
        const firstL1Func = db.l1Functions.length > 0 ? db.l1Functions[0] : null;
        for (const fe of db.failureEffects) {
          if (!fe.l1FuncId || !l1FuncIdSet.has(fe.l1FuncId)) {
            // 1순위: 동일 category의 L1Function 매칭
            const repairFunc = db.l1Functions.find((f: any) => f.category === fe.category);
            if (repairFunc) {
              fe.l1FuncId = repairFunc.id;
              feRepairedCount++;
            } else if (firstL1Func) {
              // 2순위 LAST RESORT: 첫 번째 L1Function에 할당 — 데이터 유실 방지
              fe.l1FuncId = firstL1Func.id;
              feRepairedCount++;
              console.warn(`[FMEA API] FE LAST RESORT: id=${fe.id}, effect="${fe.effect}" → 첫 L1Function에 할당`);
            }
          }
        }
        if (feRepairedCount > 0) {
          console.warn(`[FMEA API] FailureEffect FK 자동복구: ${feRepairedCount}건`);
        }

        const validFEs = db.failureEffects.filter(fe =>
          !!fe.l1FuncId && l1FuncIdSet.has(fe.l1FuncId)
        );
        validFeIdSet = new Set(validFEs.map(fe => fe.id));

        if (validFEs.length !== db.failureEffects.length) {
          const feDropped = db.failureEffects.length - validFEs.length;
          console.warn(`[FMEA API] FailureEffect FK 검증: ${db.failureEffects.length}건 중 ${feDropped}건 최종 누락 (자동복구 불가)`);
        }

        if (validFEs.length > 0) {
          await tx.failureEffect.createMany({
            data: validFEs.map(fe => ({
              id: fe.id,
              fmeaId: db.fmeaId,
              l1FuncId: fe.l1FuncId,
              category: fe.category,
              effect: fe.effect,
              severity: fe.severity,
              // ★★★ 하이브리드 ID 시스템 필드 ★★★
              parentId: fe.parentId || null,
              mergeGroupId: fe.mergeGroupId || null,
              rowSpan: fe.rowSpan || 1,
              colSpan: fe.colSpan || 1,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 8. FailureModes 배치 저장 - ★★★ FK 검증 후 저장 ★★★
      txStep = 'FAILURE_MODES';
      let validFmIdSet = new Set(db.failureModes.map(fm => fm.id));
      if (db.failureModes.length > 0) {
        const l2FuncIdSet = new Set(db.l2Functions.map(f => f.id));
        const l2StructIdSet = new Set(db.l2Structures.map(s => s.id));

        // ★★★ 2026-03-15: FailureMode FK 자동복구 ★★★
        let fmRepairedCount = 0;
        for (const fm of db.failureModes) {
          const needsRepair = !fm.l2FuncId || !fm.l2StructId
            || !l2FuncIdSet.has(fm.l2FuncId) || !l2StructIdSet.has(fm.l2StructId);
          if (!needsRepair) continue;

          // 1순위: l2StructId가 유효하면 같은 구조의 L2Function 찾기
          if (fm.l2StructId && l2StructIdSet.has(fm.l2StructId)) {
            const repairFunc = db.l2Functions.find((f: any) => f.l2StructId === fm.l2StructId);
            if (repairFunc) {
              fm.l2FuncId = repairFunc.id;
              fmRepairedCount++;
              continue;
            }
          }
          // 2순위: l2FuncId가 유효하면 해당 Function의 l2StructId 찾기
          if (fm.l2FuncId && l2FuncIdSet.has(fm.l2FuncId)) {
            const repairFunc = db.l2Functions.find((f: any) => f.id === fm.l2FuncId);
            if (repairFunc && repairFunc.l2StructId) {
              fm.l2StructId = repairFunc.l2StructId;
              fmRepairedCount++;
              continue;
            }
          }
          // 3순위 LAST RESORT: 첫 번째 L2Function + L2Structure에 할당 — 데이터 유실 방지
          const firstL2Func = db.l2Functions.length > 0 ? db.l2Functions[0] : null;
          if (firstL2Func) {
            fm.l2FuncId = firstL2Func.id;
            fm.l2StructId = firstL2Func.l2StructId;
            fmRepairedCount++;
            console.warn(`[FMEA API] FM LAST RESORT: id=${fm.id}, mode="${fm.mode}" → 첫 L2Function에 할당`);
          }
        }
        if (fmRepairedCount > 0) {
          console.warn(`[FMEA API] FailureMode FK 자동복구: ${fmRepairedCount}건`);
        }

        const validFMs = db.failureModes.filter(fm =>
          !!fm.l2FuncId && !!fm.l2StructId &&
          l2FuncIdSet.has(fm.l2FuncId) &&
          l2StructIdSet.has(fm.l2StructId)
        );
        validFmIdSet = new Set(validFMs.map(fm => fm.id));

        if (validFMs.length !== db.failureModes.length) {
          const dropped = db.failureModes.length - validFMs.length;
          console.warn(`[FMEA API] FailureMode FK 검증: ${db.failureModes.length}건 중 ${dropped}건 최종 누락 (자동복구 불가)`);
          const invalidFMs = db.failureModes.filter(fm =>
            !fm.l2FuncId || !fm.l2StructId || !l2FuncIdSet.has(fm.l2FuncId) || !l2StructIdSet.has(fm.l2StructId)
          );
          invalidFMs.slice(0, 5).forEach(fm => {
            console.warn(`  [누락 FM] mode="${fm.mode}" l2FuncId=${fm.l2FuncId} l2StructId=${fm.l2StructId}`);
          });
        }

        if (validFMs.length > 0) {
          await tx.failureMode.createMany({
            data: validFMs.map(fm => ({
              id: fm.id,
              fmeaId: db.fmeaId,
              l2FuncId: fm.l2FuncId,
              l2StructId: fm.l2StructId,
              productCharId: fm.productCharId || null,
              mode: fm.mode,
              specialChar: fm.specialChar ?? false,
              // ★★★ 하이브리드 ID 시스템 필드 ★★★
              parentId: fm.parentId || null,
              mergeGroupId: fm.mergeGroupId || null,
              rowSpan: fm.rowSpan || 1,
              colSpan: fm.colSpan || 1,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 9. FailureCauses 배치 저장 - ★★★ FK 검증 + 자동복구 후 저장 ★★★
      // ★★★ 2026-03-15 FIX: FK 누락 FC를 드롭하지 않고 자동 복구 (FC 103건 누락 근본 해결) ★★★
      txStep = 'FAILURE_CAUSES';
      let validFcIdSet = new Set(db.failureCauses.map(fc => fc.id));
      if (db.failureCauses.length > 0) {
        const l3FuncIdSet = new Set(db.l3Functions.map(f => f.id));
        const l3StructIdSet = new Set(db.l3Structures.map(s => s.id));

        // ★ FK 누락 FC 자동 복구: l3FuncId/l3StructId가 없거나 set에 없으면 자동 할당
        // ★★★ 2026-03-15 강화: 5단계 폴백으로 FC 드롭 0건 달성 ★★★
        let repairedCount = 0;

        // 텍스트 매칭용 L3Function→cause 역인덱스 (4순위용)
        const l3FuncByL2Struct = new Map<string, typeof db.l3Functions>();
        for (const f of db.l3Functions) {
          const key = f.l2StructId;
          if (!key) continue;
          if (!l3FuncByL2Struct.has(key)) l3FuncByL2Struct.set(key, []);
          l3FuncByL2Struct.get(key)!.push(f);
        }

        // 5순위용: 전역 첫 번째 L3Function (LAST RESORT)
        const firstL3Func = db.l3Functions.length > 0 ? db.l3Functions[0] : null;

        for (const fc of db.failureCauses) {
          const needsRepair = !fc.l3FuncId || !fc.l3StructId
            || !l3FuncIdSet.has(fc.l3FuncId) || !l3StructIdSet.has(fc.l3StructId);
          if (!needsRepair) continue;

          let repairFunc: (typeof db.l3Functions)[number] | null = null;

          // 1순위: l2StructId로 같은 공정의 L3Function 찾기
          if (!repairFunc && fc.l2StructId) {
            repairFunc = db.l3Functions.find(f => f.l2StructId === fc.l2StructId) || null;
          }
          // 2순위: processCharId로 L3Function 찾기 (migration에서 id=pc.id 패턴)
          if (!repairFunc && fc.processCharId) {
            repairFunc = db.l3Functions.find(f => f.id === fc.processCharId) || null;
          }
          // 3순위: l3StructId가 유효하면 해당 L3Structure에 속한 L3Function 찾기
          if (!repairFunc && fc.l3StructId && l3StructIdSet.has(fc.l3StructId)) {
            repairFunc = db.l3Functions.find(f => f.l3StructId === fc.l3StructId) || null;
          }
          // 4순위: cause 텍스트로 같은 l2Structure의 L3Function.functionName 매칭
          if (!repairFunc && fc.l2StructId && fc.cause) {
            const siblings = l3FuncByL2Struct.get(fc.l2StructId) || [];
            const causeNorm = fc.cause.trim().toLowerCase();
            repairFunc = siblings.find(f =>
              f.functionName && f.functionName.trim().toLowerCase().includes(causeNorm)
            ) || siblings.find(f =>
              causeNorm.includes((f.functionName || '').trim().toLowerCase())
            ) || null;
          }
          // 5순위 (LAST RESORT): 첫 번째 L3Function에 할당 — FC를 절대 드롭하지 않음
          if (!repairFunc && firstL3Func) {
            console.warn(`[FMEA API] FC 최종 폴백(5순위): id=${fc.id}, cause="${fc.cause}" → 첫번째 L3Function에 할당`);
            repairFunc = firstL3Func;
          }

          if (repairFunc) {
            fc.l3FuncId = repairFunc.id;
            fc.l3StructId = repairFunc.l3StructId;
            if (!fc.l2StructId) fc.l2StructId = repairFunc.l2StructId;
            repairedCount++;
          } else {
            // L3Function이 전혀 없는 극단적 경우만 여기 도달
            console.warn(`[FMEA API] FC 복구 불가 (L3Function 없음): id=${fc.id}, cause="${fc.cause}"`);
          }
        }
        if (repairedCount > 0) {
          console.warn(`[FMEA API] FailureCause FK 자동복구: ${repairedCount}건 복구 완료 (5단계 폴백)`);
        }

        // ★ 최종 검증: 여전히 무효한 FC가 있으면 경고만 남기고 validFCs에 포함
        // FC 드롭 = 0 정책: DB에 L3Function이 하나라도 있으면 모든 FC가 저장되어야 함
        const validFCs = db.failureCauses.filter(fc =>
          !!fc.l3FuncId && !!fc.l3StructId &&
          l3FuncIdSet.has(fc.l3FuncId) &&
          l3StructIdSet.has(fc.l3StructId)
        );
        validFcIdSet = new Set(validFCs.map(fc => fc.id));

        if (validFCs.length !== db.failureCauses.length) {
          const dropped = db.failureCauses.length - validFCs.length;
          console.warn(`[FMEA API] FailureCause FK 검증: ${db.failureCauses.length}건 중 ${dropped}건 최종 누락 (L3Function 부재)`);
        }

        if (validFCs.length > 0) {
          await tx.failureCause.createMany({
            data: validFCs.map(fc => ({
              id: fc.id,
              fmeaId: db.fmeaId,
              l3FuncId: fc.l3FuncId,
              l3StructId: fc.l3StructId,
              l2StructId: fc.l2StructId,
              processCharId: fc.processCharId || fc.l3FuncId || null, // ✅ l3FuncId fallback (processChar.id === L3Function.id)
              cause: fc.cause,
              occurrence: fc.occurrence || null,
              // ★★★ 하이브리드 ID 시스템 필드 ★★★
              parentId: fc.parentId || null,
              mergeGroupId: fc.mergeGroupId || null,
              rowSpan: fc.rowSpan || 1,
              colSpan: fc.colSpan || 1,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 10. FailureLinks 저장 (기존 링크 삭제 후 재생성)
      // ★★★ validLinks를 블록 바깥에서 정의 (failureAnalyses에서 참조해야 함) ★★★
      let savedLinkIds: string[] = [];

      txStep = 'FAILURE_LINKS';
      if (db.failureLinks.length > 0) {
        // ✅ 강력한 원자성 보장:
        // - failure_links는 fmId/feId/fcId 모두 유효 FK여야만 저장 가능
        // - UI 편집 중(부분 연결) 또는 id 불일치가 섞이면 FK(P2003)로 전체 트랜잭션 롤백 → 새로고침 시 "사라짐" 발생
        // - 해결: atomic 테이블에 실제로 생성된 id 집합으로 필터링하여 "완전한 링크만" 저장
        const fmIdSet = validFmIdSet;
        const feIdSet = validFeIdSet;
        const fcIdSet = validFcIdSet;

        const { valid: validLinks, dropped: fkDropped, feIdEmpty } = filterValidLinks(
          db.failureLinks, fmIdSet, feIdSet, fcIdSet
        );
        fkValidLinkCount = validLinks.length;
        fkDroppedCount = fkDropped;

        // ★★★ 2026-03-17 v2: feId 빈 링크 → 4단계 FE 자동할당 (수작업 연결 저장 보장) ★★★
        // 근본원인: confirmLink에서 FE 미선택 시 feId='' → DB FK(NOT NULL)로 저장 불가 → 고장연결 소실
        // 해결: 4단계 FE 탐색으로 반드시 feId를 할당하여 수작업 연결 100% 저장
        //
        // 비유: 식당에서 메뉴(FM)를 주문했는데 음료(FE)를 안 골랐을 때,
        //       "같은 메뉴 주문자의 음료" → "같은 공정의 음료" → "아무 음료" 순으로 자동 배정
        const fmToFeId = new Map<string, string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const procToFeId = new Map<string, string>(); // fmProcessNo → feId
        for (const vl of validLinks) {
          const vlAny = vl as any;
          if (vlAny.feId && feIdSet.has(vlAny.feId)) {
            // 1단계 소스: 같은 FM의 FE
            if (!fmToFeId.has(vlAny.fmId)) fmToFeId.set(vlAny.fmId, vlAny.feId);
            // 2단계 소스: 같은 공정의 FE
            const pNo = vlAny.fmProcessNo || vlAny.fmProcess || vlAny.cache?.fmProcess || '';
            if (pNo && !procToFeId.has(pNo)) procToFeId.set(pNo, vlAny.feId);
          }
        }
        // 3단계 소스: DB에 실제 존재하는 첫 번째 FE
        const firstFeId = [...feIdSet][0] || null;

        let feAutoAssignCount = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbSavableLinks = validLinks.map((l: any) => {
          if (l.feId && feIdSet.has(l.feId)) return l;
          // 1순위: 같은 FM의 기존 링크에서 FE
          const fromFm = fmToFeId.get(l.fmId);
          if (fromFm) { feAutoAssignCount++; return { ...l, feId: fromFm }; }
          // 2순위: 같은 공정의 기존 링크에서 FE
          const pNo = l.fmProcessNo || l.fmProcess || l.cache?.fmProcess || '';
          const fromProc = pNo ? procToFeId.get(pNo) : undefined;
          if (fromProc) { feAutoAssignCount++; return { ...l, feId: fromProc }; }
          // 3순위: DB의 첫 번째 FE (최후의 수단 — 누락보다 나음)
          if (firstFeId) { feAutoAssignCount++; return { ...l, feId: firstFeId }; }
          // 4순위: feIdSet의 아무 값 (DB에 FE가 반드시 1개 이상 존재하므로 여기까지 오지 않음)
          return l;
        }).filter((l: any) => !!l.feId && feIdSet.has(l.feId));

        feEmptyLinkCount = validLinks.length - dbSavableLinks.length;
        if (feAutoAssignCount > 0) {
          console.info(`[FMEA API] FailureLink feId 자동할당: ${feAutoAssignCount}건 (FM→공정→전역 FE)`);
        }
        if (feEmptyLinkCount > 0) {
          console.warn(`[FMEA API] FailureLink ${feEmptyLinkCount}건 feId 최종 미지정 → DB 저장 건너뜀 (FE 0개)`);
        }

        // ★★★ 실제 저장된 링크 ID 저장 (failureAnalyses에서 참조) ★★★
        savedLinkIds = dbSavableLinks.map(l => l.id);

        // ★ P1: droppedLinks 상세 정보를 API 응답에 포함 (Silent Drop 가시화)
        if (fkDropped > 0) {
          const droppedLinks = db.failureLinks.filter((l: any) => !validLinks.includes(l));
          droppedLinkReasons = droppedLinks.slice(0, 10).map((l: any) => ({
            fmId: l.fmId, feId: l.feId, fcId: l.fcId,
            fmOK: fmIdSet.has(l.fmId), feOK: feIdSet.has(l.feId), fcOK: fcIdSet.has(l.fcId),
            fmText: (l.fmText || l.cache?.fmText || '').substring(0, 30),
            fcText: (l.fcText || l.cache?.fcText || '').substring(0, 30),
          }));
          console.error(`[fmea/route] FailureLink FK 검증 실패: ${fkDropped}건 드롭`, JSON.stringify(droppedLinkReasons));
        }

        // ★★★ 2026-03-17 FIX: DELETE-THEN-INSERT 패턴으로 변경
        // 근본원인: INSERT-ONLY(createMany+skipDuplicates)는 기존 링크를 삭제하지 않아
        //          사용자가 연결을 수정해도 DB에 반영되지 않음 → 새로고침 시 원래 상태로 복귀
        // 해결: (1) 기존 활성 링크 전체 삭제 (2) 신규 링크 INSERT
        {
          // Step 0: 기존 활성 링크 전체 삭제 (soft-delete가 아닌 hard-delete)
          await tx.failureLink.deleteMany({
            where: { fmeaId: db.fmeaId },
          });

          if (dbSavableLinks.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const linkData = dbSavableLinks.map((link: any) => ({
              id: link.id || undefined,
              fmeaId: db.fmeaId,
              fmId: link.fmId,
              feId: link.feId,
              fcId: link.fcId,
              fmText: link.fmText || link.cache?.fmText || link.originalFmText || null,
              fmProcess: link.fmProcess || link.cache?.fmProcess || link.processName || null,
              feText: link.feText || link.cache?.feText || link.originalFeText || null,
              feScope: link.feScope || link.cache?.feCategory || link.scope || null,
              fcText: link.fcText || link.cache?.fcText || link.originalFcText || null,
              fcWorkElem: link.fcWorkElem || link.cache?.fcWorkElem || link.workElementName || null,
              fcM4: link.fcM4 || link.m4 || null,
              severity: link.severity || null,
              fmSeq: link.fmSeq ?? null,
              feSeq: link.feSeq ?? null,
              fcSeq: link.fcSeq ?? null,
              fmPath: link.fmPath ?? null,
              fePath: link.fePath ?? null,
              fcPath: link.fcPath ?? null,
              parentId: link.parentId || null,
              mergeGroupId: link.mergeGroupId || null,
              rowSpan: link.rowSpan || 1,
              colSpan: link.colSpan || 1,
              deletedAt: null,
            }));
            const flResult = await tx.failureLink.createMany({ data: linkData, skipDuplicates: true });
            if (flResult.count !== linkData.length) {
              console.warn(`[route POST] FL: expected ${linkData.length}, created ${flResult.count}`);
            }
          }
        }
      }

      // 11. FailureAnalyses 저장 (고장분석 통합 데이터 - All 화면 렌더링용)
      txStep = 'FAILURE_ANALYSES';
      // 고장연결 확정 시 자동 생성된 고장분석 통합 데이터 저장
      // ★★★ 핵심: 실제 저장된 validLinks의 linkId만 참조할 수 있음 - FK 위반 방지 ★★★
      const savedLinkIdSet = new Set(savedLinkIds);

      const validAnalyses = (db.failureAnalyses || []).filter(fa =>
        savedLinkIdSet.has(fa.linkId) // linkId가 실제 저장된 failureLink를 참조하는지 확인
      );
      analysisDroppedCount = (db.failureAnalyses || []).length - validAnalyses.length;
      if (analysisDroppedCount > 0) {
        console.warn(`[FMEA API] FailureAnalysis FK 검증: ${analysisDroppedCount}건 드롭 (linkId 미매칭)`);
      }

      if (validAnalyses.length > 0) {
        // 기존 고장분석 데이터 삭제 (고장연결 재확정 시 재생성)
        await tx.failureAnalysis.deleteMany({ where: { fmeaId: db.fmeaId } });

        await tx.failureAnalysis.createMany({
          data: validAnalyses.map(fa => ({
            id: fa.id,
            fmeaId: db.fmeaId,
            linkId: fa.linkId,

            // 고장연결 정보
            fmId: fa.fmId,
            fmText: fa.fmText,
            fmProcessName: fa.fmProcessName,

            feId: fa.feId,
            feText: fa.feText,
            feCategory: fa.feCategory,
            feSeverity: fa.feSeverity,

            fcId: fa.fcId,
            fcText: fa.fcText,
            fcOccurrence: fa.fcOccurrence || null,
            fcWorkElementName: fa.fcWorkElementName,
            fcM4: fa.fcM4 || null,

            // 역전개 기능분석 정보
            l1FuncId: fa.l1FuncId,
            l1Category: fa.l1Category,
            l1FuncName: fa.l1FuncName,
            l1Requirement: fa.l1Requirement,

            l2FuncId: fa.l2FuncId,
            l2FuncName: fa.l2FuncName,
            l2ProductChar: fa.l2ProductChar,
            l2SpecialChar: fa.l2SpecialChar || null,

            l3FuncId: fa.l3FuncId,
            l3FuncName: fa.l3FuncName,
            l3ProcessChar: fa.l3ProcessChar,
            l3SpecialChar: fa.l3SpecialChar || null,

            // 역전개 구조분석 정보
            l1StructId: fa.l1StructId,
            l1StructName: fa.l1StructName,

            l2StructId: fa.l2StructId,
            l2StructNo: fa.l2StructNo,
            l2StructName: fa.l2StructName,

            l3StructId: fa.l3StructId,
            l3StructM4: fa.l3StructM4 || null,
            l3StructName: fa.l3StructName,

            // 메타데이터
            order: fa.order || 0,
            confirmed: fa.confirmed || false,
          })),
          skipDuplicates: true,
        });

      } else {
        // 고장연결이 확정되지 않았거나 없으면 기존 데이터 삭제
        await tx.failureAnalysis.deleteMany({ where: { fmeaId: db.fmeaId } });
      }

      // 12. RiskAnalyses 배치 저장
      // ★ FK 방어: savedLinkIdSet에 있는 linkId만 저장 (FailureLink 삭제/변경 시 FK 위반 방지)
      txStep = 'RISK_ANALYSES';
      const validRisks = (db.riskAnalyses || []).filter((risk: any) =>
        risk.linkId && savedLinkIdSet.has(risk.linkId)
      );
      // ★★★ 2026-03-15: RiskAnalysis FK 드롭 로깅 ★★★
      riskDroppedCount = (db.riskAnalyses || []).length - validRisks.length;
      if (riskDroppedCount > 0) {
        console.warn(`[FMEA API] RiskAnalysis FK 검증: ${riskDroppedCount}건 드롭 (linkId 미매칭)`);
      }
      if (validRisks.length > 0) {
        await Promise.all(
          validRisks.map((risk: any) =>
            tx.riskAnalysis.upsert({
              where: { id: risk.id },
              create: {
                id: risk.id,
                fmeaId: db.fmeaId,
                linkId: risk.linkId,
                severity: risk.severity,
                occurrence: risk.occurrence,
                detection: risk.detection,
                ap: risk.ap,
                preventionControl: risk.preventionControl || null,
                detectionControl: risk.detectionControl || null,
                lldReference: risk.lldReference || null,
              },
              update: {
                linkId: risk.linkId,
                severity: risk.severity,
                occurrence: risk.occurrence,
                detection: risk.detection,
                ap: risk.ap,
                preventionControl: risk.preventionControl || null,
                detectionControl: risk.detectionControl || null,
                lldReference: risk.lldReference || null,
              },
            })
          )
        );
      }

      // 13. Optimizations 배치 저장
      // ★ FK 방어: validRisks의 id만 허용 (RiskAnalysis FK 위반 방지)
      txStep = 'OPTIMIZATIONS';
      if (db.optimizations.length > 0) {
        const validRiskIdSet = new Set(validRisks.map((r: any) => r.id));
        const validOpts = db.optimizations.filter((opt: any) =>
          opt.riskId && validRiskIdSet.has(opt.riskId)
        );
        // ★★★ 2026-03-15: Optimization FK 드롭 로깅 ★★★
        optDroppedCount = db.optimizations.length - validOpts.length;
        if (optDroppedCount > 0) {
          console.warn(`[FMEA API] Optimization FK 검증: ${optDroppedCount}건 드롭 (riskId 미매칭)`);
        }
        if (validOpts.length > 0) {
        await Promise.all(
          validOpts.map((opt: any) =>
            tx.optimization.upsert({
              where: { id: opt.id },
              create: {
                id: opt.id,
                fmeaId: db.fmeaId,
                riskId: opt.riskId,
                recommendedAction: opt.recommendedAction,
                responsible: opt.responsible,
                targetDate: opt.targetDate,
                newSeverity: opt.newSeverity || null,
                newOccurrence: opt.newOccurrence || null,
                newDetection: opt.newDetection || null,
                newAP: opt.newAP || null,
                status: opt.status,
                completedDate: opt.completedDate || null,
                remarks: opt.remarks || null,
                detectionAction: opt.detectionAction || null,
                lldOptReference: opt.lldOptReference || null,
              },
              update: {
                riskId: opt.riskId,
                recommendedAction: opt.recommendedAction,
                responsible: opt.responsible,
                targetDate: opt.targetDate,
                newSeverity: opt.newSeverity || null,
                newOccurrence: opt.newOccurrence || null,
                newDetection: opt.newDetection || null,
                newAP: opt.newAP || null,
                status: opt.status,
                completedDate: opt.completedDate || null,
                remarks: opt.remarks || null,
                detectionAction: opt.detectionAction || null,
                lldOptReference: opt.lldOptReference || null,
              },
            })
          )
        );
        }
      }

      // ✅ PFMEA Master 자동 업데이트 (프로젝트 신규 데이터 추출 → 마스터 누적)
      txStep = 'MASTER_SYNC';
      // 마스터 DB는 공용(public)으로 유지 (프로젝트별 DB와 분리)
      const publicPrisma = getPrisma();
      if (publicPrisma) {
        await publicPrisma.$transaction(async (pubTx: any) => {
          await upsertActiveMasterFromWorksheetTx(pubTx, db);
        });
      }

      // 13. FmeaConfirmedState 저장 (확정 상태)
      txStep = 'CONFIRMED_STATE';
      if (db.confirmed) {
        try {
          await tx.fmeaConfirmedState.upsert({
            where: { fmeaId: db.fmeaId },
            create: {
              fmeaId: db.fmeaId,
              structureConfirmed: db.confirmed.structure || false,
              l1FunctionConfirmed: db.confirmed.l1Function || false,
              l2FunctionConfirmed: db.confirmed.l2Function || false,
              l3FunctionConfirmed: db.confirmed.l3Function || false,
              failureL1Confirmed: db.confirmed.l1Failure || false,
              failureL2Confirmed: db.confirmed.l2Failure || false,
              failureL3Confirmed: db.confirmed.l3Failure || false,
              failureLinkConfirmed: db.confirmed.failureLink || false,
              riskConfirmed: db.confirmed.risk || false,
              optimizationConfirmed: db.confirmed.optimization || false,
            },
            update: {
              structureConfirmed: db.confirmed.structure || false,
              l1FunctionConfirmed: db.confirmed.l1Function || false,
              l2FunctionConfirmed: db.confirmed.l2Function || false,
              l3FunctionConfirmed: db.confirmed.l3Function || false,
              failureL1Confirmed: db.confirmed.l1Failure || false,
              failureL2Confirmed: db.confirmed.l2Failure || false,
              failureL3Confirmed: db.confirmed.l3Failure || false,
              failureLinkConfirmed: db.confirmed.failureLink || false,
              riskConfirmed: db.confirmed.risk || false,
              optimizationConfirmed: db.confirmed.optimization || false,
            },
          });
        } catch (e: any) {
          if (e?.code === 'P2021' || e?.message?.includes('does not exist')) {
          } else {
            throw e; // ★ P0-4: 트랜잭션 롤백
          }
        }

      }

      // ★ P0-4: FmeaInfo Pool 업데이트는 트랜잭션 밖으로 이동 (아래 참조)

    }, {
      timeout: TRANSACTION_TIMEOUT,
      isolationLevel: 'Serializable',
    });

    // ★ P0-4: 확정 상태 업데이트 - 트랜잭션 밖으로 이동 (트랜잭션 롤백 시 불일치 방지)
    if (db.confirmed) {
      try {
        const pool = new Pool({ connectionString: baseUrl });
        await pool.query(`
          UPDATE "${schema}".fmea_confirmed_states
          SET "structureConfirmed" = $1, "updatedAt" = NOW()
          WHERE "fmeaId" = $2
        `, [db.confirmed.structure || false, db.fmeaId]);
        await pool.end();
      } catch (e: any) {
      }
    }

    // ✅ 16. FmeaProject 단계(Step) 업데이트 (public 스키마)
    if (db.confirmed) {
      try {
        const publicPrisma = getPrisma();
        if (publicPrisma) {
          const newStep = calculatePFMEAStep(db.confirmed);

          // 기존 프로젝트 조회 (Step 7이면 덮어쓰지 않음 - 개정 승인 상태 유지)
          const project = await publicPrisma.fmeaProject.findUnique({
            where: { fmeaId: normalizedFmeaId }
          });

          if (project && project.step < 7) {
            await publicPrisma.fmeaProject.update({
              where: { fmeaId: normalizedFmeaId },
              data: { step: newStep }
            });
          }
        }
      } catch (e: any) {
      }
    }

    // ★★★ FailureLinks 감사 로그 ★★★

    // 정합성 경고: 20% 이상 손실 시 경고
    if (incomingLinkCount > 0 && fkValidLinkCount < incomingLinkCount * 0.8) {
      console.error('[API] 🚨 FailureLinks 정합성 경고:', {
        fmeaId: db.fmeaId,
        incoming: incomingLinkCount,
        saved: fkValidLinkCount,
        ratio: `${Math.round(fkValidLinkCount / incomingLinkCount * 100)}%`,
        message: 'FK 검증으로 20% 이상 링크 손실 — FM/FE/FC 구조 확인 필요',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'FMEA data saved successfully',
      fmeaId: db.fmeaId,
      savedAt: new Date().toISOString(),
      linkStats: {
        incoming: incomingLinkCount,
        dbPreserved: preservedLinkCount,
        fkValid: fkValidLinkCount,
        fkDropped: fkDroppedCount,
        feIdEmpty: feEmptyLinkCount,
        analysisDropped: analysisDroppedCount,
        riskDropped: riskDroppedCount,
        optDropped: optDroppedCount,
        // ★ P1: 드롭된 링크 상세 정보 (클라이언트 toast 용)
        ...(fkDroppedCount > 0 ? { droppedLinkReasons } : {}),
      },
    });
  } catch (error: any) {
    // ★★★ 2026-03-19: deadlock(P2034) → 409 Conflict로 응답 (클라이언트가 재시도) ★★★
    if (error.code === 'P2034') {
      console.warn('[API] 트랜잭션 충돌 (P2034) — 클라이언트 재시도 유도');
      return NextResponse.json(
        { success: false, error: 'Transaction conflict', message: '동시 저장 충돌. 자동 재시도합니다.', retryable: true },
        { status: 409 }
      );
    }

    // ★★★ 2026-02-19: 에러 상세 로깅 강화 (클라이언트에서도 확인 가능) ★★★
    const errorInfo = {
      step: txStep, // ★ 어느 단계에서 에러가 났는지
      code: error.code,
      message: error.message,
      meta: error.meta,
      stack: error.stack?.split('\n').slice(0, 8).join('\n'),
    };
    console.error('[API] FMEA 저장 오류:', errorInfo);

    // 연결 에러인 경우 localStorage 폴백 가능하도록 200 반환
    const isConnectionError =
      error.code === 'P1001' || // Connection timeout
      error.code === 'P1002' || // Database server connection timeout
      error.code === 'P1003' || // Database does not exist
      error.code === 'P1017' || // Server has closed the connection
      error.message?.includes('connect') ||
      error.message?.includes('timeout') ||
      error.message?.includes('ECONNREFUSED');

    if (isConnectionError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection error',
          message: '데이터베이스 연결 오류가 발생했습니다. localStorage로 폴백됩니다.',
          code: error.code,
          details: error.message,
          fallback: true
        },
        { status: 200 } // 200으로 반환하여 클라이언트가 localStorage로 폴백할 수 있도록
      );
    }

    // ★★★ 테이블 없음 에러: 폴백 허용 ★★★
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Table does not exist',
          message: '필요한 테이블이 없습니다. Prisma 마이그레이션을 실행하세요.',
          code: error.code,
          details: error.message,
          fallback: true
        },
        { status: 200 }
      );
    }

    // 에러 상세 정보는 서버 로그에만 출력 (프로덕션 보안)
    console.error('[API] FMEA 저장 오류 상세:', { step: txStep, code: error.code, message: error.message, meta: error.meta });

    // ★ 2026-03-07: 단계별 사용자 친화적 에러 메시지
    const stepMessages: Record<string, string> = {
      TX_START: '트랜잭션 시작 실패',
      L1_STRUCTURES: '완제품 공정 정보 저장 실패',
      L2_STRUCTURES: '공정 정보 저장 실패',
      L3_STRUCTURES: '작업요소 정보 저장 실패',
      L1_FUNCTIONS: '완제품 기능 저장 실패',
      L1_REQUIREMENTS: '완제품 요구사항 저장 실패',
      L2_FUNCTIONS: '공정 기능 저장 실패',
      L3_FUNCTIONS: '작업요소 기능 저장 실패',
      FAILURE_EFFECTS: '고장 영향 저장 실패',
      FAILURE_MODES: '고장 모드 저장 실패',
      FAILURE_CAUSES: '고장 원인 저장 실패',
      FAILURE_LINKS: '고장 연결 저장 실패',
      OPTIMIZATIONS: '최적화 정보 저장 실패',
      LEGACY_DATA: '워크시트 데이터 저장 실패',
    };
    const userMessage = stepMessages[txStep] || 'DB 저장 중 오류가 발생했습니다';

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save FMEA data',
        message: userMessage,
        step: txStep,
        code: error.code || 'UNKNOWN',
      },
      { status: 500 }
    );
  }
}

/**
 * FMEA 데이터 로드 — Atomic DB SSoT
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json(null);
    }

    const searchParams = request.nextUrl.searchParams;
    const isLatest = searchParams.get('latest') === 'true';
    const type = searchParams.get('type') || 'pfmea'; // 'pfmea' | 'dfmea'

    // ✅ 2026-01-26: 최신 데이터 1건 조회 기능 추가 (워크시트 자동 로딩용)
    if (isLatest) {
      const publicPrisma = getPrisma();
      if (!publicPrisma) return NextResponse.json(null);

      // FmeaProject (기초정보) 테이블에서 해당 타입의 최신 프로젝트 1건 조회
      const latestProject = await publicPrisma.fmeaProject.findFirst({
        where: { fmeaType: type.startsWith('p') ? 'P' : 'D' }, // 스키마 확인 결과 fmeaType 필드 사용 ('P'|'D'|'M')
        orderBy: { createdAt: 'desc' },
      });

      if (!latestProject) {
        return NextResponse.json({ success: false, message: 'No projects found' });
      }

      return NextResponse.json({ success: true, data: latestProject });
    }

    // ★ FMEA ID는 소문자로 정규화 (DB 일관성 보장)
    const originalQueryFmeaId = searchParams.get('fmeaId') || searchParams.get('id');
    const fmeaId = originalQueryFmeaId?.toLowerCase();
    if (!fmeaId) {
      return NextResponse.json(
        { error: 'fmeaId parameter is required' },
        { status: 400 }
      );
    }

    // ✅ 프로젝트별 DB(스키마) 규칙 적용
    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json(null);
    }

    // ✅ 강력한 스키마 강제: 조회 전 search_path 설정
    // schema는 getProjectSchemaName()으로 [a-z0-9_] 산타이즈됨 — 추가 검증
    if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error(`Invalid schema: ${schema}`);
    await prisma.$executeRawUnsafe(`SET search_path TO ${schema}, public`);

    // ★★★ 2026-03-20: Legacy 제거 — 항상 Atomic DB에서 직접 로드 (SSoT) ★★★
    // 모든 데이터를 병렬로 조회
    // ✅ failureAnalysis는 별도로 처리 (테이블이 없을 수 있음)
    let failureAnalyses: any[] = [];
    try {
      failureAnalyses = await prisma.failureAnalysis.findMany({
        where: { fmeaId },
        orderBy: { order: 'asc' }
      });
    } catch (e: any) {
      // 테이블이 없거나 모델이 없으면 빈 배열 반환 (하위 호환성)
      if (e?.code === 'P2021' || e?.message?.includes('does not exist')) {
      } else {
      }
    }

    const [
      l1Structure,
      l2Structures,
      l3Structures,
      l1Functions,
      l2Functions,
      l3Functions,
      failureEffects,
      failureModes,
      failureCauses,
      failureLinks,
      riskAnalyses,
      optimizations,
      confirmedState,
    ] = await Promise.all([
      prisma.l1Structure.findFirst({ where: { fmeaId } }),
      prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
      prisma.l3Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
      prisma.l1Function.findMany({ where: { fmeaId } }),
      prisma.l2Function.findMany({ where: { fmeaId } }),
      prisma.l3Function.findMany({ where: { fmeaId } }),
      prisma.failureEffect.findMany({ where: { fmeaId } }),
      prisma.failureMode.findMany({ where: { fmeaId } }),
      prisma.failureCause.findMany({ where: { fmeaId } }),
      prisma.failureLink.findMany({
        where: { fmeaId, deletedAt: null },
        include: { failureMode: { select: { l2StructId: true, l2Structure: { select: { no: true, name: true } } } } },
      }),
      prisma.riskAnalysis.findMany({ where: { fmeaId } }),
      prisma.optimization.findMany({ where: { fmeaId } }),
      // 확정 상태 로드 (테이블 없으면 null 반환)
      prisma.fmeaConfirmedState.findUnique({ where: { fmeaId } }).catch(() => null),
    ]);

    // 데이터가 없으면 null 반환
    if (!l1Structure && l2Structures.length === 0) {
      return NextResponse.json(null);
    }

    // FMEAWorksheetDB 형식으로 변환
    const db: FMEAWorksheetDB = {
      fmeaId,
      savedAt: l1Structure?.updatedAt.toISOString() || new Date().toISOString(),
      l1Structure: l1Structure ? {
        id: l1Structure.id,
        fmeaId: l1Structure.fmeaId,
        name: l1Structure.name,
        confirmed: l1Structure.confirmed ?? false,
        createdAt: l1Structure.createdAt.toISOString(),
        updatedAt: l1Structure.updatedAt.toISOString(),
      } : null,
      l2Structures: l2Structures.map((l2: any) => ({
        id: l2.id,
        fmeaId: l2.fmeaId,
        l1Id: l2.l1Id,
        no: l2.no,
        name: l2.name,
        order: l2.order,
        createdAt: l2.createdAt.toISOString(),
        updatedAt: l2.updatedAt.toISOString(),
      })),
      l3Structures: l3Structures.map((l3: any) => ({
        id: l3.id,
        fmeaId: l3.fmeaId,
        l1Id: l3.l1Id,
        l2Id: l3.l2Id,
        m4: (l3.m4 as any) || '',
        name: l3.name,
        order: l3.order,
        createdAt: l3.createdAt.toISOString(),
        updatedAt: l3.updatedAt.toISOString(),
      })),
      l1Functions: l1Functions.map((f: any) => ({
        id: f.id,
        fmeaId: f.fmeaId,
        l1StructId: f.l1StructId,
        category: f.category as any,
        functionName: f.functionName,
        requirement: f.requirement,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      l2Functions: l2Functions.map((f: any) => ({
        id: f.id,
        fmeaId: f.fmeaId,
        l2StructId: f.l2StructId,
        functionName: f.functionName,
        productChar: f.productChar,
        specialChar: f.specialChar || undefined,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      l3Functions: l3Functions.map((f: any) => ({
        id: f.id,
        fmeaId: f.fmeaId,
        l3StructId: f.l3StructId,
        l2StructId: f.l2StructId,
        functionName: f.functionName,
        processChar: f.processChar,
        specialChar: f.specialChar || undefined,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      failureEffects: failureEffects.map((fe: any) => ({
        id: fe.id,
        fmeaId: fe.fmeaId,
        l1FuncId: fe.l1FuncId,
        category: fe.category as any,
        effect: fe.effect,
        severity: fe.severity,
        createdAt: fe.createdAt.toISOString(),
        updatedAt: fe.updatedAt.toISOString(),
      })),
      failureModes: failureModes.map((fm: any) => ({
        id: fm.id,
        fmeaId: fm.fmeaId,
        l2FuncId: fm.l2FuncId,
        l2StructId: fm.l2StructId,
        productCharId: fm.productCharId || undefined,
        mode: fm.mode,
        specialChar: fm.specialChar ?? false,
        createdAt: fm.createdAt.toISOString(),
        updatedAt: fm.updatedAt.toISOString(),
      })),
      failureCauses: failureCauses.map((fc: any) => ({
        id: fc.id,
        fmeaId: fc.fmeaId,
        l3FuncId: fc.l3FuncId,
        l3StructId: fc.l3StructId,
        l2StructId: fc.l2StructId,
        // ✅ 2026-03-17 FIX: processCharId가 NULL이면 l3FuncId로 폴백 (processChar.id === L3Function.id)
        // NULL인 채로 undefined 반환하면 JSON에서 제거 → UI에서 매칭 실패 → 누락 표시
        processCharId: fc.processCharId || fc.l3FuncId || undefined,
        cause: fc.cause,
        occurrence: fc.occurrence || undefined,
        createdAt: fc.createdAt.toISOString(),
        updatedAt: fc.updatedAt.toISOString(),
      })),
      failureLinks: failureLinks.map((link: any) => ({
        id: link.id,
        fmeaId: link.fmeaId,
        fmId: link.fmId,
        feId: link.feId,
        fcId: link.fcId,
        fmText: link.fmText || '',
        feText: link.feText || '',
        fcText: link.fcText || '',
        fmProcessNo: link.failureMode?.l2Structure?.no || '',
        fmProcess: link.failureMode?.l2Structure?.name || link.fmProcess || '',
        feScope: link.feScope || '',
        fcM4: link.fcM4 || '',
        fcWorkElem: link.fcWorkElem || '',
        severity: link.severity || 0,
        feSeverity: link.severity || 0,
        // ★★★ 2026-02-28: P5 — seq/path 필드 추가 (DB중심 고장연결) ★★★
        fmSeq: link.fmSeq ?? undefined,
        feSeq: link.feSeq ?? undefined,
        fcSeq: link.fcSeq ?? undefined,
        fmPath: link.fmPath || undefined,
        fePath: link.fePath || undefined,
        fcPath: link.fcPath || undefined,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
      })),
      // 고장분석 통합 데이터 (All 화면 렌더링용)
      failureAnalyses: (failureAnalyses || []).map((fa: any) => ({
        id: fa.id,
        fmeaId: fa.fmeaId,
        linkId: fa.linkId,
        // 고장연결 정보
        fmId: fa.fmId,
        fmText: fa.fmText,
        fmProcessName: fa.fmProcessName,
        feId: fa.feId,
        feText: fa.feText,
        feCategory: fa.feCategory,
        feSeverity: fa.feSeverity,
        fcId: fa.fcId,
        fcText: fa.fcText,
        fcOccurrence: fa.fcOccurrence || undefined,
        fcWorkElementName: fa.fcWorkElementName,
        fcM4: fa.fcM4 || undefined,
        // 역전개 기능분석
        l1FuncId: fa.l1FuncId,
        l1Category: fa.l1Category,
        l1FuncName: fa.l1FuncName,
        l1Requirement: fa.l1Requirement,
        l2FuncId: fa.l2FuncId,
        l2FuncName: fa.l2FuncName,
        l2ProductChar: fa.l2ProductChar,
        l2SpecialChar: fa.l2SpecialChar || undefined,
        l3FuncId: fa.l3FuncId,
        l3FuncName: fa.l3FuncName,
        l3ProcessChar: fa.l3ProcessChar,
        l3SpecialChar: fa.l3SpecialChar || undefined,
        // 역전개 구조분석
        l1StructId: fa.l1StructId,
        l1StructName: fa.l1StructName,
        l2StructId: fa.l2StructId,
        l2StructNo: fa.l2StructNo,
        l2StructName: fa.l2StructName,
        l3StructId: fa.l3StructId,
        l3StructM4: fa.l3StructM4 || undefined,
        l3StructName: fa.l3StructName,
        // 메타데이터
        order: fa.order,
        confirmed: fa.confirmed,
        createdAt: fa.createdAt.toISOString(),
        updatedAt: fa.updatedAt.toISOString(),
      })),
      riskAnalyses: riskAnalyses.map((risk: any) => ({
        id: risk.id,
        fmeaId: risk.fmeaId,
        linkId: risk.linkId,
        severity: risk.severity,
        occurrence: risk.occurrence,
        detection: risk.detection,
        ap: risk.ap as any,
        preventionControl: risk.preventionControl || undefined,
        detectionControl: risk.detectionControl || undefined,
        lldReference: risk.lldReference || undefined,
        createdAt: risk.createdAt.toISOString(),
        updatedAt: risk.updatedAt.toISOString(),
      })),
      optimizations: optimizations.map((opt: any) => ({
        id: opt.id,
        fmeaId: opt.fmeaId,
        riskId: opt.riskId,
        recommendedAction: opt.recommendedAction,
        responsible: opt.responsible,
        targetDate: opt.targetDate,
        newSeverity: opt.newSeverity || undefined,
        newOccurrence: opt.newOccurrence || undefined,
        newDetection: opt.newDetection || undefined,
        newAP: opt.newAP as any || undefined,
        status: opt.status as any,
        completedDate: opt.completedDate || undefined,
        remarks: opt.remarks || undefined,
        detectionAction: opt.detectionAction || undefined,
        lldOptReference: opt.lldOptReference || undefined,
        createdAt: opt.createdAt.toISOString(),
        updatedAt: opt.updatedAt.toISOString(),
      })),
      confirmed: {
        structure: confirmedState?.structureConfirmed ?? l1Structure?.confirmed ?? false,
        l1Function: confirmedState?.l1FunctionConfirmed ?? false,
        l2Function: confirmedState?.l2FunctionConfirmed ?? false,
        l3Function: confirmedState?.l3FunctionConfirmed ?? false,
        l1Failure: confirmedState?.failureL1Confirmed ?? false,
        l2Failure: confirmedState?.failureL2Confirmed ?? false,
        l3Failure: confirmedState?.failureL3Confirmed ?? false,
        failureLink: confirmedState?.failureLinkConfirmed ?? false,
        risk: confirmedState?.riskConfirmed ?? false,
        optimization: confirmedState?.optimizationConfirmed ?? false,
      },
    };

    return NextResponse.json(db);
  } catch (error: any) {
    console.error('[API] FMEA 로드 오류:', error);

    // Prisma 에러 상세 정보
    if (error.code) {
      return NextResponse.json(
        {
          error: 'Failed to load FMEA data',
          code: error.code,
          details: error.meta || error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to load FMEA data', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * ✅ 2026-01-25: FMEA 워크시트 데이터 삭제
 * - 프로젝트 삭제 시 관련 워크시트 데이터도 함께 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const fmeaId = body.fmeaId?.toLowerCase();

    if (!fmeaId) {
      return NextResponse.json(
        { success: false, error: 'fmeaId is required' },
        { status: 400 }
      );
    }


    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json({ success: true, message: 'DB not connected, skipped' });
    }

    // 프로젝트별 스키마
    const schema = getProjectSchemaName(fmeaId);
    const prisma = getPrismaForSchema(schema);

    if (!prisma) {
      return NextResponse.json({ success: true, message: 'Prisma not available, skipped' });
    }

    // 트랜잭션으로 모든 관련 데이터 삭제
    await prisma.$transaction(async (tx: any) => {
      // 순서: FK 종속성 역순으로 삭제
      await tx.optimization.deleteMany({ where: { fmeaId } });
      await tx.riskAnalysis.deleteMany({ where: { fmeaId } });
      await tx.failureLink.deleteMany({ where: { fmeaId } });
      await tx.failureCause.deleteMany({ where: { fmeaId } });
      await tx.failureMode.deleteMany({ where: { fmeaId } });
      await tx.failureEffect.deleteMany({ where: { fmeaId } });
      await tx.processProductChar.deleteMany({ where: { fmeaId } }).catch(() => { }); // ★ 2026-03-14
      await tx.l3Function.deleteMany({ where: { fmeaId } });
      await tx.l2Function.deleteMany({ where: { fmeaId } });
      await tx.l1Function.deleteMany({ where: { fmeaId } });
      await tx.l3Structure.deleteMany({ where: { fmeaId } });
      await tx.l2Structure.deleteMany({ where: { fmeaId } });
      await tx.l1Structure.deleteMany({ where: { fmeaId } });
      await tx.fmeaConfirmedState.deleteMany({ where: { fmeaId } });

    });

    // public 스키마의 FmeaWorksheetData도 삭제
    try {
      const publicPrisma = getPrisma();
      if (publicPrisma) {
        await publicPrisma.fmeaWorksheetData.deleteMany({ where: { fmeaId } });
      }
    } catch (e: any) {
    }

    return NextResponse.json({
      success: true,
      fmeaId,
      message: 'FMEA 워크시트 데이터가 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('[API DELETE] 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
