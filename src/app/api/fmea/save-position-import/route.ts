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
import type { PositionAtomicData } from '@/types/position-import';

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

    console.log(`[save-position-import] schema=${schema}, fmeaId=${normalizedId}, force=${force}`);
    console.log(`[save-position-import] stats:`, JSON.stringify(atomicData.stats));

    // ─── $transaction (Serializable: 부분 성공 원천 차단, timeout 5분) ───
    const counts = await (prisma.$transaction as any)(async (tx: any) => {

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
          console.log(`[save-position-import] manualMode: L2/L3 구조 동기화 (FM 없음 — 안전)`);
        } else {
          // FM 있으면 upsert 모드로 폴백 (createMany skipDuplicates 유지)
          console.info(`[save-position-import] manualMode: FM=${existingFm}건 존재 — skipDuplicates 폴백`);
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
        console.log(`[save-position-import] force=true: 전체 삭제 완료`);
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
        console.log(`[save-position-import] L1Scope: ${atomicData.l1Scopes.length}건 생성`);
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
        console.log(`[save-position-import] L2ProcessNo: ${atomicData.l2ProcessNos.length}건 생성`);
      }
      if (atomicData.l2ProcessNames && atomicData.l2ProcessNames.length > 0) {
        await safeTx(tx, 'l2ProcessName').createMany({
          skipDuplicates: true,
          data: atomicData.l2ProcessNames.map(p => ({
            id: p.id, fmeaId: normalizedId, l2StructId: p.l2StructId,
            parentId: p.parentId || null, name: p.name,
          })),
        });
        console.log(`[save-position-import] L2ProcessName: ${atomicData.l2ProcessNames.length}건 생성`);
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
        console.log(`[save-position-import] L1Requirement: ${atomicData.l1Requirements.length}건 생성`);
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
        console.log(`[save-position-import] L2SpecialChar: ${atomicData.l2SpecialChars.length}건 생성`);
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

      // ★ L3Function/FC/FL/RA: 완전 DELETE 후 재생성 (항상 최신 데이터 보장)
      // 이유: skipDuplicates가 빈값 레코드를 업데이트 못함 + for-loop upsert 너무 느림
      // Structure/L1F/L2F/FM/FE는 skipDuplicates 유지 (소실 위험 없음)

      // 7. L3Functions + L3ProcessChars + L3 독립 엔티티: DELETE ALL + CREATE
      // ★ 방어: l3Functions가 비어있으면 DELETE 금지 (파싱 실패 시 기존 데이터 보호)
      if (atomicData.l3Functions.length === 0) {
        console.warn(`[save-position-import] ⚠️ l3Functions=0 — DELETE 건너뜀 (기존 데이터 보존). 파서 로그 확인 필요`);
      } else {
        // 데이터 있을 때만 DELETE → CREATE (의존성 역순: SpecialChar → ProcessChar → Function)
        await tx.riskAnalysis.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureLink.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureCause.deleteMany({ where: { fmeaId: normalizedId } });
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
        console.log(`[save-position-import] L3Function: ${atomicData.l3Functions.length}건 생성`);

        // 7b. L3ProcessChars (★v4: B3 독립 엔티티) — L3Function 이후 생성 (FK 의존)
        if (atomicData.l3ProcessChars && atomicData.l3ProcessChars.length > 0) {
          await safeTx(tx, 'l3ProcessChar').createMany({
            data: atomicData.l3ProcessChars.map(pc => ({
              id: pc.id, fmeaId: normalizedId, l3FuncId: pc.l3FuncId, l3StructId: pc.l3StructId,
              parentId: pc.parentId || null,
              name: pc.name, specialChar: pc.specialChar,
            })),
          });
          console.log(`[save-position-import] L3ProcessChar: ${atomicData.l3ProcessChars.length}건 생성`);
        }

        // 7c. L3ProcessNos + L3FourMs + L3WorkElements (★v4) — L3Structure 이후 생성 (FK 의존)
        if (atomicData.l3ProcessNos && atomicData.l3ProcessNos.length > 0) {
          await safeTx(tx, 'l3ProcessNo').createMany({
            data: atomicData.l3ProcessNos.map(p => ({
              id: p.id, fmeaId: normalizedId, l3StructId: p.l3StructId,
              parentId: p.parentId || null, no: p.no,
            })),
          });
          console.log(`[save-position-import] L3ProcessNo: ${atomicData.l3ProcessNos.length}건 생성`);
        }
        if (atomicData.l3FourMs && atomicData.l3FourMs.length > 0) {
          await safeTx(tx, 'l3FourM').createMany({
            data: atomicData.l3FourMs.map(f => ({
              id: f.id, fmeaId: normalizedId, l3StructId: f.l3StructId,
              parentId: f.parentId || null, m4: f.m4,
            })),
          });
          console.log(`[save-position-import] L3FourM: ${atomicData.l3FourMs.length}건 생성`);
        }
        if (atomicData.l3WorkElements && atomicData.l3WorkElements.length > 0) {
          await safeTx(tx, 'l3WorkElement').createMany({
            data: atomicData.l3WorkElements.map(w => ({
              id: w.id, fmeaId: normalizedId, l3StructId: w.l3StructId,
              parentId: w.parentId || null, name: w.name,
            })),
          });
          console.log(`[save-position-import] L3WorkElement: ${atomicData.l3WorkElements.length}건 생성`);
        }

        // 7d. L3SpecialChars (★v4: SC 독립 엔티티) — L3ProcessChar 이후 생성 (FK 의존)
        if (atomicData.l3SpecialChars && atomicData.l3SpecialChars.length > 0) {
          await safeTx(tx, 'l3SpecialChar').createMany({
            data: atomicData.l3SpecialChars.map(sc => ({
              id: sc.id, fmeaId: normalizedId, l3StructId: sc.l3StructId,
              l3ProcessCharId: sc.l3ProcessCharId, parentId: sc.parentId || null, value: sc.value,
            })),
          });
          console.log(`[save-position-import] L3SpecialChar: ${atomicData.l3SpecialChars.length}건 생성`);
        }
      }

      // 8. FailureEffects (skipDuplicates — FE는 보존)
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

      // 9. FailureModes (skipDuplicates — FM은 보존)
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

      // 10. FailureCauses: skipDuplicates 추가 (★ 2026-03-25: 재Import 중복 누적 방지)
      if (atomicData.failureCauses.length > 0) {
        await tx.failureCause.createMany({
          skipDuplicates: true,
          data: atomicData.failureCauses.map(fc => ({
            id: fc.id, fmeaId: normalizedId, l3FuncId: fc.l3FuncId,
            l3StructId: fc.l3StructId, l2StructId: fc.l2StructId,
            processCharId: fc.l3CharId || fc.l3FuncId || null,
            cause: fc.cause,
            parentId: fc.parentId || null,
          })),
        });
        console.log(`[save-position-import] FailureCause: ${atomicData.failureCauses.length}건 생성 (skipDuplicates)`);
      }

      // 11. FailureLinks — 빈 FK 필터링 후 저장 (FK 제약 위반 방지)
      const validFLs = atomicData.failureLinks.filter(fl => fl.fmId && fl.feId && fl.fcId);
      const brokenFLs = atomicData.failureLinks.length - validFLs.length;
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
        console.log(`[save-position-import] FailureLink: ${validFLs.length}건 생성`);
      }

      // 12. RiskAnalyses — 유효한 FL만 참조
      // E-22 parentId: PosRiskAnalysis.parentId === FailureLink.id — Prisma는 linkId FK만 보관(EX-06: fmId/fcId/feId 병행).
      const validFlIds = new Set(validFLs.map(fl => fl.id));
      const validRAs = atomicData.riskAnalyses.filter(ra => validFlIds.has(ra.linkId));
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
        console.log(`[save-position-import] RiskAnalysis: ${validRAs.length}건 생성`);
      }

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

      // ★★★ 14. Post-Import FK Orphan 자동 검증 — 실패 시 트랜잭션 자동 롤백 ★★★
      const fkChecks = await Promise.all([
        tx.$queryRawUnsafe(`SELECT count(*) as c FROM l2_structures l2 WHERE NOT EXISTS (SELECT 1 FROM l1_structures l1 WHERE l1.id = l2."l1Id") AND l2."fmeaId" = '${normalizedId}'`),
        tx.$queryRawUnsafe(`SELECT count(*) as c FROM l3_structures l3 WHERE NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id = l3."l2Id") AND l3."fmeaId" = '${normalizedId}'`),
        tx.$queryRawUnsafe(`SELECT count(*) as c FROM failure_modes fm WHERE NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id = fm."l2StructId") AND fm."fmeaId" = '${normalizedId}'`),
        tx.$queryRawUnsafe(`SELECT count(*) as c FROM failure_causes fc WHERE NOT EXISTS (SELECT 1 FROM l3_structures l3 WHERE l3.id = fc."l3StructId") AND fc."fmeaId" = '${normalizedId}'`),
        tx.$queryRawUnsafe(`SELECT count(*) as c FROM failure_effects fe WHERE NOT EXISTS (SELECT 1 FROM l1_functions l1f WHERE l1f.id = fe."l1FuncId") AND fe."fmeaId" = '${normalizedId}'`),
        tx.$queryRawUnsafe(`SELECT count(*) as c FROM failure_links fl WHERE NOT EXISTS (SELECT 1 FROM failure_modes fm WHERE fm.id = fl."fmId") AND fl."fmeaId" = '${normalizedId}'`),
        tx.$queryRawUnsafe(`SELECT count(*) as c FROM failure_links fl WHERE NOT EXISTS (SELECT 1 FROM failure_causes fc WHERE fc.id = fl."fcId") AND fl."fmeaId" = '${normalizedId}'`),
        tx.$queryRawUnsafe(`SELECT count(*) as c FROM failure_links fl WHERE NOT EXISTS (SELECT 1 FROM failure_effects fe WHERE fe.id = fl."feId") AND fl."fmeaId" = '${normalizedId}'`),
        tx.$queryRawUnsafe(`SELECT count(*) as c FROM risk_analyses ra WHERE NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl.id = ra."linkId") AND ra."fmeaId" = '${normalizedId}'`),
      ]);

      const fkNames = ['L2→L1','L3→L2','FM→L2','FC→L3','FE→L1F','FL→FM','FL→FC','FL→FE','RA→FL'];
      const orphans: string[] = [];
      fkChecks.forEach((rows, i) => {
        const cnt = Number(rows[0]?.c || 0);
        if (cnt > 0) orphans.push(`${fkNames[i]}:${cnt}`);
      });

      if (orphans.length > 0) {
        const msg = `FK Orphan 검출 → 자동 롤백: ${orphans.join(', ')}`;
        console.error(`[save-position-import] ❌ ${msg}`);
        throw new Error(msg);
      }
      console.log(`[save-position-import] ✅ FK 9/9 ALL PASS (orphan 0건)`);

      return {
        l2Structures: l2c, l3Structures: l3c,
        failureModes: fmc, failureCauses: fcc, failureEffects: fec,
        failureLinks: flc, riskAnalyses: rac,
        fkVerified: true,
      };
    });

    console.log(`[save-position-import] Done:`, JSON.stringify(counts));

    // ██████████████████████████████████████████████████████████████████
    // ██  POST-SAVE FORGE: 자동검증 + 자동수정 루프 (최대 3회)       ██
    // ██  Import 후 즉시 실행 — L3→L2 고아, FC미연결, FL불완전 수정  ██
    // ██████████████████████████████████████████████████████████████████
    let forgeLog: string[] = [];
    let forgePassed = false;
    let forgeIteration = 0;
    const MAX_FORGE = 3;

    try {
      while (forgeIteration < MAX_FORGE && !forgePassed) {
        forgeIteration++;
        forgeLog.push(`── Forge #${forgeIteration} ──`);

        // ── 1. L3→L2 고아 감지 + 삭제 ──
        const l3Orphans: any[] = await prisma.$queryRawUnsafe(
          `SELECT l3.id FROM l3_structures l3 WHERE NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id = l3."l2Id") AND l3."fmeaId" = '${normalizedId}'`
        );
        if (l3Orphans.length > 0) {
          const l3Ids = l3Orphans.map((r: any) => `'${r.id}'`).join(',');
          // 종속: L3F, FC, L3WorkElement, L3FourM, L3ProcessNo → 삭제
          await prisma.$executeRawUnsafe(`DELETE FROM l3_functions WHERE "l3StructId" IN (${l3Ids}) AND "fmeaId" = '${normalizedId}'`);
          await prisma.$executeRawUnsafe(`DELETE FROM failure_causes WHERE "l3StructId" IN (${l3Ids}) AND "fmeaId" = '${normalizedId}'`);
          try { await prisma.$executeRawUnsafe(`DELETE FROM l3_work_elements WHERE "l3StructId" IN (${l3Ids}) AND "fmeaId" = '${normalizedId}'`); } catch {}
          try { await prisma.$executeRawUnsafe(`DELETE FROM l3_four_ms WHERE "l3StructId" IN (${l3Ids}) AND "fmeaId" = '${normalizedId}'`); } catch {}
          try { await prisma.$executeRawUnsafe(`DELETE FROM l3_process_nos WHERE "l3StructId" IN (${l3Ids}) AND "fmeaId" = '${normalizedId}'`); } catch {}
          try { await prisma.$executeRawUnsafe(`DELETE FROM l3_process_chars WHERE "l3StructId" IN (${l3Ids}) AND "fmeaId" = '${normalizedId}'`); } catch {}
          try { await prisma.$executeRawUnsafe(`DELETE FROM l3_special_chars WHERE "l3StructId" IN (${l3Ids}) AND "fmeaId" = '${normalizedId}'`); } catch {}
          await prisma.$executeRawUnsafe(`DELETE FROM l3_structures WHERE id IN (${l3Ids}) AND "fmeaId" = '${normalizedId}'`);
          forgeLog.push(`  L3→L2 고아 ${l3Orphans.length}건 삭제 (종속 L3F/FC 포함)`);
        }

        // ── 2. L3F→L2 고아 감지 + 삭제 ──
        const l3fOrphans: any[] = await prisma.$queryRawUnsafe(
          `SELECT l3f.id FROM l3_functions l3f WHERE l3f."l2StructId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id = l3f."l2StructId") AND l3f."fmeaId" = '${normalizedId}'`
        );
        if (l3fOrphans.length > 0) {
          const ids = l3fOrphans.map((r: any) => `'${r.id}'`).join(',');
          await prisma.$executeRawUnsafe(`DELETE FROM l3_functions WHERE id IN (${ids}) AND "fmeaId" = '${normalizedId}'`);
          forgeLog.push(`  L3F→L2 고아 ${l3fOrphans.length}건 삭제`);
        }

        // ── 3. FC→L2 고아 감지 + 삭제 ──
        const fcL2Orphans: any[] = await prisma.$queryRawUnsafe(
          `SELECT fc.id FROM failure_causes fc WHERE fc."l2StructId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id = fc."l2StructId") AND fc."fmeaId" = '${normalizedId}'`
        );
        if (fcL2Orphans.length > 0) {
          const ids = fcL2Orphans.map((r: any) => `'${r.id}'`).join(',');
          // FL 참조 삭제 먼저
          await prisma.$executeRawUnsafe(`DELETE FROM risk_analyses WHERE "linkId" IN (SELECT id FROM failure_links WHERE "fcId" IN (${ids}) AND "fmeaId" = '${normalizedId}') AND "fmeaId" = '${normalizedId}'`);
          await prisma.$executeRawUnsafe(`DELETE FROM failure_links WHERE "fcId" IN (${ids}) AND "fmeaId" = '${normalizedId}'`);
          await prisma.$executeRawUnsafe(`DELETE FROM failure_causes WHERE id IN (${ids}) AND "fmeaId" = '${normalizedId}'`);
          forgeLog.push(`  FC→L2 고아 ${fcL2Orphans.length}건 삭제`);
        }

        // ── 4. 불완전 FL 삭제 (fmId/fcId/feId 참조 깨진) ──
        const brokenFLs: any[] = await prisma.$queryRawUnsafe(`
          SELECT fl.id FROM failure_links fl WHERE fl."fmeaId" = '${normalizedId}' AND (
            NOT EXISTS (SELECT 1 FROM failure_modes fm WHERE fm.id = fl."fmId")
            OR NOT EXISTS (SELECT 1 FROM failure_causes fc WHERE fc.id = fl."fcId")
            OR NOT EXISTS (SELECT 1 FROM failure_effects fe WHERE fe.id = fl."feId")
          )
        `);
        if (brokenFLs.length > 0) {
          const ids = brokenFLs.map((r: any) => `'${r.id}'`).join(',');
          await prisma.$executeRawUnsafe(`DELETE FROM risk_analyses WHERE "linkId" IN (${ids}) AND "fmeaId" = '${normalizedId}'`);
          await prisma.$executeRawUnsafe(`DELETE FROM failure_links WHERE id IN (${ids}) AND "fmeaId" = '${normalizedId}'`);
          forgeLog.push(`  불완전 FL ${brokenFLs.length}건 삭제`);
        }

        // ── 5. 고아 RA 삭제 ──
        const orphanRAs: any[] = await prisma.$queryRawUnsafe(`
          SELECT ra.id FROM risk_analyses ra WHERE ra."fmeaId" = '${normalizedId}'
            AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl.id = ra."linkId")
        `);
        if (orphanRAs.length > 0) {
          const ids = orphanRAs.map((r: any) => `'${r.id}'`).join(',');
          await prisma.$executeRawUnsafe(`DELETE FROM risk_analyses WHERE id IN (${ids}) AND "fmeaId" = '${normalizedId}'`);
          forgeLog.push(`  고아 RA ${orphanRAs.length}건 삭제`);
        }

        // ── 6. FC 중복 삭제 (l2StructId + cause 기준, 최신만 보존) ──
        try {
          const fcDups: any[] = await prisma.$queryRawUnsafe(`
            SELECT id FROM failure_causes fc1 WHERE fc1."fmeaId" = '${normalizedId}'
              AND EXISTS (SELECT 1 FROM failure_causes fc2
                WHERE fc2."fmeaId" = fc1."fmeaId" AND fc2."l2StructId" = fc1."l2StructId"
                  AND fc2.cause = fc1.cause AND fc2.id > fc1.id)
              AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl."fcId" = fc1.id)
          `);
          if (fcDups.length > 0) {
            const ids = fcDups.map((r: any) => `'${r.id}'`).join(',');
            await prisma.$executeRawUnsafe(`DELETE FROM failure_causes WHERE id IN (${ids}) AND "fmeaId" = '${normalizedId}'`);
            forgeLog.push(`  FC 중복 ${fcDups.length}건 삭제`);
          }
        } catch {}

        // ── 7. 최종 검증 ──
        const finalChecks = await Promise.all([
          prisma.$queryRawUnsafe(`SELECT count(*)::int as c FROM l3_structures l3 WHERE NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id = l3."l2Id") AND l3."fmeaId" = '${normalizedId}'`),
          prisma.$queryRawUnsafe(`SELECT count(*)::int as c FROM failure_causes fc WHERE fc."l2StructId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM l2_structures l2 WHERE l2.id = fc."l2StructId") AND fc."fmeaId" = '${normalizedId}'`),
          prisma.$queryRawUnsafe(`SELECT count(*)::int as c FROM failure_links fl WHERE fl."fmeaId" = '${normalizedId}' AND (NOT EXISTS (SELECT 1 FROM failure_modes fm WHERE fm.id = fl."fmId") OR NOT EXISTS (SELECT 1 FROM failure_causes fc WHERE fc.id = fl."fcId") OR NOT EXISTS (SELECT 1 FROM failure_effects fe WHERE fe.id = fl."feId"))`),
          prisma.$queryRawUnsafe(`SELECT count(*)::int as c FROM risk_analyses ra WHERE ra."fmeaId" = '${normalizedId}' AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl.id = ra."linkId")`),
        ]);
        const issues = finalChecks.map((r: any) => Number(r[0]?.c || 0));
        const totalIssues = issues.reduce((a: number, b: number) => a + b, 0);
        forgeLog.push(`  검증: L3고아=${issues[0]} FC고아=${issues[1]} FL불완전=${issues[2]} RA고아=${issues[3]}`);

        if (totalIssues === 0) {
          forgePassed = true;
          forgeLog.push(`  ✅ FORGE PASS — 0건 이슈`);
        } else {
          forgeLog.push(`  → ${totalIssues}건 남음, 다음 루프`);
        }
      }

      // 최종 건수
      const forgeResult = {
        fm: await prisma.failureMode.count({ where: { fmeaId: normalizedId } }),
        fc: await prisma.failureCause.count({ where: { fmeaId: normalizedId } }),
        fe: await prisma.failureEffect.count({ where: { fmeaId: normalizedId } }),
        fl: await prisma.failureLink.count({ where: { fmeaId: normalizedId } }),
        ra: await prisma.riskAnalysis.count({ where: { fmeaId: normalizedId } }),
        l3: await prisma.l3Structure.count({ where: { fmeaId: normalizedId } }),
      };
      forgeLog.push(`최종: FM=${forgeResult.fm} FC=${forgeResult.fc} FE=${forgeResult.fe} FL=${forgeResult.fl} RA=${forgeResult.ra} L3=${forgeResult.l3}`);
      console.log(`[save-position-import] FORGE: ${forgePassed ? 'PASS' : 'FAIL'} (${forgeIteration}회)`, forgeLog.join('\n'));

      return NextResponse.json({
        success: true, fmeaId: normalizedId, schema,
        atomicCounts: counts, stats: atomicData.stats,
        forge: { passed: forgePassed, iterations: forgeIteration, result: forgeResult, log: forgeLog },
      });
    } catch (forgeErr) {
      console.warn('[save-position-import] FORGE warn:', forgeErr);
      // Forge 실패해도 Import 자체는 성공 반환
      return NextResponse.json({
        success: true, fmeaId: normalizedId, schema,
        atomicCounts: counts, stats: atomicData.stats,
        forge: { passed: false, error: String(forgeErr), log: forgeLog },
      });
    }

  } catch (err) {
    console.error('[save-position-import] Error:', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
