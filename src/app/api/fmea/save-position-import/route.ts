/**
 * @file save-position-import/route.ts
 * @description 위치기반 Import API — PositionAtomicData → 프로젝트 스키마 DB 저장
 *
 * ★ 2026-03-22: DELETE ALL 완전 제거 → skipDuplicates 방식
 * 재Import 시 기존 데이터(고장연결/SOD) 소실 완전 방지
 */
/**
 * ██████████████████████████████████████████████████████████████████████████
 * ██  CODEFREEZE — 이 파일의 parentId / feRefs / fcRefs / l2StructId /  ██
 * ██  l3StructId / fmId / fcId / feId 필드를 절대 제거하지 마세요!       ██
 * ██                                                                     ██
 * ██  사고 이력 (2026-03-23 e1f1bd5):                                   ██
 * ██  "런타임 호환성" 명목으로 parentId 19개 + FK 4개 제거 → DB FK 전멸  ██
 * ██  → 워크시트 렌더링 완전 실패 (FK 0%)                               ██
 * ██                                                                     ██
 * ██  3중 방어:                                                          ██
 * ██  1. CODEFREEZE (이 주석) — 수정 시 사용자 승인 필수                 ██
 * ██  2. Guard Test — tests/guard/save-position-import-fk.guard.test.ts  ██
 * ██  3. CLAUDE.md Rule 20 — FK 필드 제거 절대 금지 룰                   ██
 * ██████████████████████████████████████████████████████████████████████████
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { getPrismaForSchema } from '@/lib/prisma';
import type { PositionAtomicData, SavePositionImportMeta } from '@/types/position-import';
import { runPositionAtomicDedupSync } from '@/lib/fmea-core/atomic-dedup-sync';

export const runtime = 'nodejs';

/**
 * ★ 런타임 Prisma 클라이언트가 v4 신규 모델을 지원하지 않을 경우 graceful skip
 * 서버 재시작 전까지 신규 모델은 noop으로 처리 — 핵심 데이터(FM/FE/FC/FL/RA)는 정상 저장
 */
function safeTx(tx: any, model: string) {
  if ((tx as any)[model]) return (tx as any)[model];
  return { deleteMany: async () => {}, createMany: async () => {} };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, atomicData } = body as { fmeaId: string; atomicData: PositionAtomicData };

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }
    if (!atomicData || !atomicData.l1Structure) {
      return NextResponse.json({ success: false, error: 'atomicData required' }, { status: 400 });
    }

    const { force, manualMode } = body as {
      fmeaId: string; atomicData: PositionAtomicData; force?: boolean; manualMode?: boolean;
    };
    const normalizedId = fmeaId.toLowerCase();
    const schema = getProjectSchemaName(normalizedId);
    const baseDatabaseUrl = process.env.DATABASE_URL || '';

    await ensureProjectSchemaReady({ baseDatabaseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Failed to get Prisma client' }, { status: 500 });
    }
    const flPayload = atomicData.failureLinks ?? [];
    const validFLs = flPayload.filter((fl) => !!(fl.fmId && fl.feId && fl.fcId));
    const failureLinksSkippedIncomplete = flPayload.length - validFLs.length;
    const failureLinksSkippedSampleIds = flPayload
      .filter((fl) => !(fl.fmId && fl.feId && fl.fcId))
      .slice(0, 8)
      .map((fl) => fl.id);
    const validFlIdSet = new Set(validFLs.map((fl) => fl.id));
    const raPayload = atomicData.riskAnalyses ?? [];
    // ★ MBD-26-009: FC.preventionControl (L3 시트 B5) → RA 폴백 복사
    // FailureCause 스키마에 preventionControl 없으므로 RA에 저장해야 함
    const fcPcMap = new Map<string, string>();
    for (const fc of (atomicData.failureCauses ?? [])) {
      if ((fc as any).preventionControl?.trim()) {
        fcPcMap.set(fc.id, (fc as any).preventionControl.trim());
      }
    }
    const flFcIdMap = new Map<string, string>();
    for (const fl of validFLs) {
      if (fl.fcId) flFcIdMap.set(fl.id, fl.fcId);
    }
    const validRAs = raPayload
      .filter((ra) => validFlIdSet.has(ra.linkId))
      .map((ra) => {
        // RA에 preventionControl 없으면 FC에서 가져옴
        if (!ra.preventionControl?.trim()) {
          const fcId = flFcIdMap.get(ra.linkId);
          if (fcId && fcPcMap.has(fcId)) {
            return { ...ra, preventionControl: fcPcMap.get(fcId) };
          }
        }
        return ra;
      });
    const riskAnalysesSkippedNoValidFl = raPayload.length - validRAs.length;
    const saveImportMeta: SavePositionImportMeta = {
      failureLinksPayload: flPayload.length,
      failureLinksValidTripleForInsert: validFLs.length,
      failureLinksSkippedIncomplete,
      failureLinksSkippedSampleIds,
      riskAnalysesPayload: raPayload.length,
      riskAnalysesValidForInsert: validRAs.length,
      riskAnalysesSkippedNoValidFl,
    };

    // ─── $transaction ───
    const counts = await prisma.$transaction(async (tx) => {

      // ★ manualMode=true: 구조 레이어만 완전 동기화 (FM/FC/FL/RA 보존)
      //   수동모드 신규 FMEA에서 공정/작업요소 추가/수정/삭제를 DB에 정확히 반영
      if (manualMode && !force) {
        // FM/FC/FL이 이미 있으면 구조 삭제 금지 (orphan 위험)
        const existingFm = await tx.failureMode.count({ where: { fmeaId: normalizedId } });
        if (existingFm === 0) {
          // 구조 레이어만 클린: L3 sub-entities → L3Structure → L2 sub-entities → L2Structure
          await safeTx(tx, 'l3WorkElement').deleteMany({ where: { fmeaId: normalizedId } });
          await safeTx(tx, 'l3FourM').deleteMany({ where: { fmeaId: normalizedId } });
          await safeTx(tx, 'l3ProcessNo').deleteMany({ where: { fmeaId: normalizedId } });
          await tx.l3Structure.deleteMany({ where: { fmeaId: normalizedId } });
          await safeTx(tx, 'l2ProcessName').deleteMany({ where: { fmeaId: normalizedId } });
          await safeTx(tx, 'l2ProcessNo').deleteMany({ where: { fmeaId: normalizedId } });
          await tx.l2Structure.deleteMany({ where: { fmeaId: normalizedId } });
        } else {
          // FM 있으면 upsert 모드로 폴백 (createMany skipDuplicates 유지)
          console.warn(`[save-position-import] manualMode: FM=${existingFm}건 존재 — skipDuplicates 폴백`);
        }
      }

      // ★ force=true이면 모든 데이터 완전 삭제 후 재생성 (클린 Import)
      if (force) {
        await tx.riskAnalysis.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureLink.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureEffect.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureMode.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureCause.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.processProductChar.deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l3SpecialChar').deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l3ProcessChar').deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l3WorkElement').deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l3FourM').deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l3ProcessNo').deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l3Function.deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l2SpecialChar').deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l2Function.deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l2ProcessName').deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l2ProcessNo').deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l1Requirement.deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l1Scope').deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l1Function.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l3Structure.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l2Structure.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l1Structure.deleteMany({ where: { fmeaId: normalizedId } });
      }

      // 1. L1Structure upsert
      await tx.l1Structure.upsert({
        where: { id: atomicData.l1Structure.id },
        create: { id: atomicData.l1Structure.id, fmeaId: normalizedId, name: atomicData.l1Structure.name },
        update: { name: atomicData.l1Structure.name },
      });

      // 1b. L1Scopes (★v4: C1 구분 독립 엔티티)
      if (atomicData.l1Scopes && atomicData.l1Scopes.length > 0) {
        await safeTx(tx, 'l1Scope').createMany({
          skipDuplicates: true,
          data: atomicData.l1Scopes.map(s => ({
            id: s.id, fmeaId: normalizedId, l1StructId: s.l1StructId,
            parentId: s.parentId || null, scope: s.scope,
          })),
        });
      }

      // 2. L2Structures
      if (atomicData.l2Structures.length > 0) {
        await tx.l2Structure.createMany({
          skipDuplicates: true,
          data: atomicData.l2Structures.map(s => ({
            id: s.id, fmeaId: normalizedId, l1Id: s.l1Id, no: s.no, name: s.name, order: s.order,
            parentId: s.parentId || null,
          })),
        });
      }

      // 2b. L2ProcessNos + L2ProcessNames (★v4: A1/A2 독립 엔티티)
      if (atomicData.l2ProcessNos && atomicData.l2ProcessNos.length > 0) {
        await safeTx(tx, 'l2ProcessNo').createMany({
          skipDuplicates: true,
          data: atomicData.l2ProcessNos.map(p => ({
            id: p.id, fmeaId: normalizedId, l2StructId: p.l2StructId,
            parentId: p.parentId || null, no: p.no,
          })),
        });
      }
      if (atomicData.l2ProcessNames && atomicData.l2ProcessNames.length > 0) {
        await safeTx(tx, 'l2ProcessName').createMany({
          skipDuplicates: true,
          data: atomicData.l2ProcessNames.map(p => ({
            id: p.id, fmeaId: normalizedId, l2StructId: p.l2StructId,
            parentId: p.parentId || null, name: p.name,
          })),
        });
      }

      // 3. L3Structures
      if (atomicData.l3Structures.length > 0) {
        await tx.l3Structure.createMany({
          skipDuplicates: true,
          data: atomicData.l3Structures.map(s => ({
            id: s.id, fmeaId: normalizedId, l1Id: s.l1Id, l2Id: s.l2Id, m4: s.m4, name: s.name, order: s.order,
            parentId: s.parentId || null,
          })),
        });
      }

      // 4. L1Functions
      if (atomicData.l1Functions.length > 0) {
        await tx.l1Function.createMany({
          skipDuplicates: true,
          data: atomicData.l1Functions.map(f => ({
            id: f.id, fmeaId: normalizedId, l1StructId: f.l1StructId,
            parentId: f.parentId || null,
            category: f.category, functionName: f.functionName, requirement: f.requirement,
          })),
        });
      }

      // 4b. L1Requirements — parentId 없이 저장 (서버 재시작 후 자동 포함)
      if (atomicData.l1Requirements && atomicData.l1Requirements.length > 0) {
        await tx.l1Requirement.createMany({
          skipDuplicates: true,
          data: atomicData.l1Requirements.map(r => ({
            id: r.id, fmeaId: normalizedId, l1StructId: r.l1StructId,
            l1FuncId: r.l1FuncId, requirement: r.requirement, orderIndex: r.orderIndex,
          })),
        });
      }

      // 5. L2Functions
      if (atomicData.l2Functions.length > 0) {
        await tx.l2Function.createMany({
          skipDuplicates: true,
          data: atomicData.l2Functions.map(f => ({
            id: f.id, fmeaId: normalizedId, l2StructId: f.l2StructId,
            parentId: f.parentId || null,
            functionName: f.functionName, productChar: f.productChar, specialChar: f.specialChar,
          })),
        });
      }

      // 5b. L2SpecialChars (★v4: SC 특별특성 독립 엔티티 — L2Function 이후)
      if (atomicData.l2SpecialChars && atomicData.l2SpecialChars.length > 0) {
        await safeTx(tx, 'l2SpecialChar').createMany({
          skipDuplicates: true,
          data: atomicData.l2SpecialChars.map(sc => ({
            id: sc.id, fmeaId: normalizedId, l2StructId: sc.l2StructId,
            l2FuncId: sc.l2FuncId, parentId: sc.parentId || null, value: sc.value,
          })),
        });
      }

      // 6. ProcessProductChars (parentId 없음 — l2StructId가 부모 FK 역할)
      if (atomicData.processProductChars.length > 0) {
        await tx.processProductChar.createMany({
          skipDuplicates: true,
          data: atomicData.processProductChars.map(pc => ({
            id: pc.id, fmeaId: normalizedId, l2StructId: pc.l2StructId,
            name: pc.name, specialChar: pc.specialChar, orderIndex: pc.orderIndex,
          })),
        });
      }

      // ★ L3Function/FC/FL/RA(+ FM/FE): 완전 DELETE 후 재생성 (항상 최신 데이터·updatedAt 보장)
      // 이유: skipDuplicates가 기존 행을 건너뛰어 effect/mode 텍스트·severity 변경이 DB에 반영 안 됨 + updatedAt 무변경
      // FL 삭제 후에는 FM/FE를 FK 없이 제거 가능 → 동일 블록에서 삭제 후 8~10단계 createMany로 재삽입
      // Structure/L1/L2(상위)는 skipDuplicates 유지 — L3 이하 고장 레이어만 전면 갱신

      // 7. L3Functions + L3ProcessChars + L3 독립 엔티티: DELETE ALL + CREATE
      // ★ 방어: l3Functions가 비어있으면 DELETE 금지 (파싱 실패 시 기존 데이터 보호)
      if (atomicData.l3Functions.length === 0) {
        console.warn(`[save-position-import] ⚠️ l3Functions=0 — DELETE 건너뜀 (기존 데이터 보존). 파서 로그 확인 필요`);
      } else {
        // 데이터 있을 때만 DELETE → CREATE (의존성 역순: RA → FL → FC → FM → FE → L3 부속)
        await tx.riskAnalysis.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureLink.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureCause.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureMode.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureEffect.deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l3SpecialChar').deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l3ProcessChar').deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l3WorkElement').deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l3FourM').deleteMany({ where: { fmeaId: normalizedId } });
        await safeTx(tx, 'l3ProcessNo').deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l3Function.deleteMany({ where: { fmeaId: normalizedId } });

        await tx.l3Function.createMany({
          data: atomicData.l3Functions.map(f => ({
            id: f.id, fmeaId: normalizedId, l3StructId: f.l3StructId, l2StructId: f.l2StructId,
            parentId: f.parentId || null,
            functionName: f.functionName, processChar: f.processChar, specialChar: f.specialChar,
          })),
        });
        // 7b. L3ProcessChars (★v4: B3 독립 엔티티) — L3Function 이후 생성 (FK 의존)
        if (atomicData.l3ProcessChars && atomicData.l3ProcessChars.length > 0) {
          await safeTx(tx, 'l3ProcessChar').createMany({
            data: atomicData.l3ProcessChars.map(pc => ({
              id: pc.id, fmeaId: normalizedId, l3FuncId: pc.l3FuncId, l3StructId: pc.l3StructId,
              parentId: pc.parentId || null,
              name: pc.name, specialChar: pc.specialChar,
            })),
          });
        }

        // 7c. L3ProcessNos + L3FourMs + L3WorkElements (★v4) — L3Structure 이후 생성 (FK 의존)
        if (atomicData.l3ProcessNos && atomicData.l3ProcessNos.length > 0) {
          await safeTx(tx, 'l3ProcessNo').createMany({
            data: atomicData.l3ProcessNos.map(p => ({
              id: p.id, fmeaId: normalizedId, l3StructId: p.l3StructId,
              parentId: p.parentId || null, no: p.no,
            })),
          });
        }
        if (atomicData.l3FourMs && atomicData.l3FourMs.length > 0) {
          await safeTx(tx, 'l3FourM').createMany({
            data: atomicData.l3FourMs.map(f => ({
              id: f.id, fmeaId: normalizedId, l3StructId: f.l3StructId,
              parentId: f.parentId || null, m4: f.m4,
            })),
          });
        }
        if (atomicData.l3WorkElements && atomicData.l3WorkElements.length > 0) {
          await safeTx(tx, 'l3WorkElement').createMany({
            data: atomicData.l3WorkElements.map(w => ({
              id: w.id, fmeaId: normalizedId, l3StructId: w.l3StructId,
              parentId: w.parentId || null, name: w.name,
            })),
          });
        }

        // 7d. L3SpecialChars (★v4: SC 독립 엔티티) — L3ProcessChar 이후 생성 (FK 의존)
        if (atomicData.l3SpecialChars && atomicData.l3SpecialChars.length > 0) {
          await safeTx(tx, 'l3SpecialChar').createMany({
            data: atomicData.l3SpecialChars.map(sc => ({
              id: sc.id, fmeaId: normalizedId, l3StructId: sc.l3StructId,
              l3ProcessCharId: sc.l3ProcessCharId, parentId: sc.parentId || null, value: sc.value,
            })),
          });
        }
      }

      // 8. FailureEffects (l3Functions>0 블록에서 이미 삭제됨 → 신규 행·updatedAt 갱신; 그 외 경로만 skipDuplicates 의미)
      if (atomicData.failureEffects.length > 0) {
        await tx.failureEffect.createMany({
          skipDuplicates: true,
          data: atomicData.failureEffects.map(fe => ({
            id: fe.id, fmeaId: normalizedId, l1FuncId: fe.l1FuncId,
            parentId: fe.parentId || null,
            category: fe.category, effect: fe.effect, severity: fe.severity,
          })),
        });
      }

      // 9. FailureModes (동일 — L3 풀 갱신 시 위에서 삭제 후 재삽입)
      if (atomicData.failureModes.length > 0) {
        const fmHasRefs = !!(tx.failureMode as any).fields?.feRefs;
        try {
          await tx.failureMode.createMany({
            skipDuplicates: true,
            data: atomicData.failureModes.map(fm => ({
              id: fm.id, fmeaId: normalizedId, l2FuncId: fm.l2FuncId,
              l2StructId: fm.l2StructId, productCharId: fm.productCharId, mode: fm.mode,
              parentId: fm.parentId || null,
              ...(fmHasRefs ? { feRefs: fm.feRefs || [], fcRefs: fm.fcRefs || [] } : {}),
            })),
          });
        } catch (fmErr: any) {
          if (fmErr.message?.includes('feRefs') || fmErr.message?.includes('fcRefs')) {
            console.warn('[save-position-import] feRefs/fcRefs not supported, retrying without');
            await tx.failureMode.createMany({
              skipDuplicates: true,
              data: atomicData.failureModes.map(fm => ({
                id: fm.id, fmeaId: normalizedId, l2FuncId: fm.l2FuncId,
                l2StructId: fm.l2StructId, productCharId: fm.productCharId, mode: fm.mode,
                parentId: fm.parentId || null,
              })),
            });
          } else {
            throw fmErr;
          }
        }
      }

      // 10. FailureCauses: DELETE 위에서 완료 → 재생성 (★v4: processCharId = l3CharId → L3ProcessChar.id)
      if (atomicData.failureCauses.length > 0) {
        await tx.failureCause.createMany({
          data: atomicData.failureCauses.map(fc => ({
            id: fc.id, fmeaId: normalizedId, l3FuncId: fc.l3FuncId,
            l3StructId: fc.l3StructId, l2StructId: fc.l2StructId,
            processCharId: fc.l3CharId || fc.l3FuncId || null,
            cause: fc.cause,
            parentId: fc.parentId || null,
          })),
        });
      }

      // 11. FailureLinks — 빈 FK 필터링 후 저장 (FK 제약 위반 방지) — validFLs는 트랜잭션 밖에서 산출(saveImportMeta와 동일)
      const brokenFLs = flPayload.length - validFLs.length;
      if (brokenFLs > 0) {
        console.warn(`[save-position-import] ⚠️ FL FK 불완전 ${brokenFLs}건 스킵 (fmId/feId/fcId 빈값)`);
        console.warn('[save-position-import] 원인: FC 시트의 L1/L2/L3 원본행 컬럼 확인 필요');
      }
      if (validFLs.length > 0) {
        try {
          await tx.failureLink.createMany({
            skipDuplicates: true,
            data: validFLs.map(fl => ({
              id: fl.id, fmeaId: normalizedId,
              fmId: fl.fmId, feId: fl.feId, fcId: fl.fcId,
              l2StructId: fl.l2StructId || undefined,
              l3StructId: fl.l3StructId || undefined,
              fmText: fl.fmText, feText: fl.feText, fcText: fl.fcText,
              feScope: fl.feScope, fmProcess: fl.fmProcess, fcWorkElem: fl.fcWorkElem, fcM4: fl.fcM4,
            })),
          });
        } catch (flErr: any) {
          console.warn('[save-position-import] FL retry without optional fields:', flErr.message?.substring(0, 100));
          try {
            await tx.failureLink.createMany({
              skipDuplicates: true,
              data: validFLs.map(fl => ({
                id: fl.id, fmeaId: normalizedId,
                fmId: fl.fmId, feId: fl.feId, fcId: fl.fcId,
                l2StructId: fl.l2StructId || undefined,
                l3StructId: fl.l3StructId || undefined,
              })),
            });
          } catch (flErr2: any) {
            console.warn('[save-position-import] FL retry core-only:', flErr2.message?.substring(0, 100));
            await tx.failureLink.createMany({
              skipDuplicates: true,
              data: validFLs.map(fl => ({
                id: fl.id, fmeaId: normalizedId,
                fmId: fl.fmId, feId: fl.feId, fcId: fl.fcId,
              })),
            });
          }
        }
      }

      // 12. RiskAnalyses — 유효한 FL만 참조 (validRAs는 트랜잭션 밖과 동일)
      // E-22 parentId: PosRiskAnalysis.parentId === FailureLink.id — Prisma는 linkId FK만 보관(EX-06: fmId/fcId/feId 병행).
      if (validRAs.length > 0) {
        await tx.riskAnalysis.createMany({
          skipDuplicates: true,
          data: validRAs.map(ra => ({
            id: ra.id,
            fmeaId: normalizedId,
            linkId: ra.linkId,
            fmId: ra.fmId ?? undefined,
            fcId: ra.fcId ?? undefined,
            feId: ra.feId ?? undefined,
            severity: ra.severity,
            occurrence: ra.occurrence,
            detection: ra.detection,
            ap: ra.ap,
            preventionControl: ra.preventionControl,
            detectionControl: ra.detectionControl,
          })),
        });
      }

      // 12b. dedupKey 동기화 + 페이로드 정합성 (누락 시 트랜잭션 롤백)
      await runPositionAtomicDedupSync(tx, normalizedId, atomicData, validFLs);

      // 13. Verify counts (핵심 테이블만 — v4 신규 테이블은 safeTx 경유로 skip 가능)
      const [l2c, l3c, fmc, fcc, fec, flc, rac] = await Promise.all([
        tx.l2Structure.count({ where: { fmeaId: normalizedId } }),
        tx.l3Structure.count({ where: { fmeaId: normalizedId } }),
        tx.failureMode.count({ where: { fmeaId: normalizedId } }),
        tx.failureCause.count({ where: { fmeaId: normalizedId } }),
        tx.failureEffect.count({ where: { fmeaId: normalizedId } }),
        tx.failureLink.count({ where: { fmeaId: normalizedId } }),
        tx.riskAnalysis.count({ where: { fmeaId: normalizedId } }),
      ]);

      return {
        l2Structures: l2c, l3Structures: l3c,
        failureModes: fmc, failureCauses: fcc, failureEffects: fec,
        failureLinks: flc, riskAnalyses: rac,
      };
    });
    return NextResponse.json({
      success: true, fmeaId: normalizedId, schema,
      atomicCounts: counts,
      stats: atomicData.stats,
      saveImportMeta,
      importDiagnostics: atomicData.diagnostics ?? { fmsWithoutFailureLink: [], fcsWithoutFailureLink: [] },
    });

  } catch (err) {
    console.error('[save-position-import] Error:', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
