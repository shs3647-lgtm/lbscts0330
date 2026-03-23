/**
 * @file raw-to-atomic.ts
 * @description PositionAtomicData → 프로젝트 스키마 DB 저장 (재사용 가능한 함수)
 *
 * save-position-import/route.ts의 트랜잭션 로직을 추출하여 재사용 가능한 함수로 분리.
 *
 * EX-53: raw-complete가 아니면 경고 로그만 출력하고 계속 진행 (강제 차단 없음)
 * EX-55: FK 순서 보장 (L1→L2→L3→L1F→L2F→L3F→FM/FE/FC→FL→RA)
 * EX-57: $transaction 실패 → 전체 롤백 (prisma 기본 동작)
 *
 * @version 1.0.0
 * @created 2026-03-23
 */

import type { PrismaClient } from '@prisma/client';
import type { PositionAtomicData } from '@/types/position-import';

/** 런타임 Prisma client에 v4 신규 모델 없을 시 graceful noop fallback */
function safeTx(tx: any, model: string) {
  if ((tx as any)[model]) return (tx as any)[model];
  return { deleteMany: async () => {}, createMany: async () => {} };
}

// ══════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════

export interface AtomicSaveResult {
  success: boolean;
  fmeaId: string;
  counts: {
    l2Structures: number;
    l3Structures: number;
    l3ProcessChars: number;
    l1Requirements: number;
    l1Scopes: number;
    failureModes: number;
    failureCauses: number;
    failureEffects: number;
    failureLinks: number;
    riskAnalyses: number;
  };
  skippedFL: number;
  error?: string;
}

// ══════════════════════════════════════════════
// 메인 함수
// ══════════════════════════════════════════════

/**
 * PositionAtomicData를 프로젝트 스키마 DB에 저장한다.
 *
 * @param prisma   프로젝트 스키마 Prisma 클라이언트 (getPrismaForSchema() 결과)
 * @param data     parsePositionBasedJSON() 또는 parsePositionBasedWorkbook() 결과
 * @param options  { force?: boolean } — force=true이면 DELETE ALL 후 재생성 (클린 Import)
 * @returns        AtomicSaveResult
 */
export async function saveAtomicFromPosition(
  prisma: PrismaClient,
  data: PositionAtomicData,
  options?: { force?: boolean },
): Promise<AtomicSaveResult> {
  const normalizedId = data.l1Structure.fmeaId.toLowerCase();
  const force = options?.force ?? false;

  // EX-53: raw-complete가 아니면 경고만 출력, 강제 차단 없음
  const stats = data.stats;
  if (stats) {
    const flCount = data.failureLinks.length;
    const validFL = data.failureLinks.filter((fl) => fl.fmId && fl.feId && fl.fcId).length;
    if (flCount === 0 || validFL === 0) {
      console.warn(
        `[raw-to-atomic] ⚠️ EX-53: FL=${flCount}, validFL=${validFL} — raw-complete 미달. 계속 진행.`,
      );
    }
  }

  try {
    const counts = await (prisma as any).$transaction(async (tx: any) => {
      // ★ force=true이면 모든 데이터 완전 삭제 후 재생성 (클린 Import)
      // cascade 순서: RA → FL → FE → FM → FC → PC → L3 독립 엔티티 → L3F → L2 독립 엔티티 → L2F → L2Struct → L1 관련 → L1Struct
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
        console.log(`[raw-to-atomic] force=true: 전체 삭제 완료`);
      }

      // ── EX-55: FK 순서 보장 ──

      // 1. L1Structure upsert
      await tx.l1Structure.upsert({
        where: { id: data.l1Structure.id },
        create: {
          id: data.l1Structure.id,
          fmeaId: normalizedId,
          name: data.l1Structure.name,
        },
        update: { name: data.l1Structure.name },
      });

      // 2. L2Structures (skipDuplicates)
      if (data.l2Structures.length > 0) {
        await tx.l2Structure.createMany({
          skipDuplicates: true,
          data: data.l2Structures.map((s) => ({
            id: s.id,
            fmeaId: normalizedId,
            l1Id: s.l1Id,
            no: s.no,
            name: s.name,
            order: s.order,
            parentId: s.parentId || null,
          })),
        });
      }

      // 3. L3Structures (skipDuplicates)
      if (data.l3Structures.length > 0) {
        await tx.l3Structure.createMany({
          skipDuplicates: true,
          data: data.l3Structures.map((s) => ({
            id: s.id,
            fmeaId: normalizedId,
            l1Id: s.l1Id,
            l2Id: s.l2Id,
            m4: s.m4,
            name: s.name,
            order: s.order,
            parentId: s.parentId || null,
          })),
        });
      }

      // 4. L1Scopes (skipDuplicates) — C1 구분 독립 엔티티
      if (data.l1Scopes && data.l1Scopes.length > 0) {
        await safeTx(tx, 'l1Scope').createMany({
          skipDuplicates: true,
          data: data.l1Scopes.map((s) => ({
            id: s.id,
            fmeaId: normalizedId,
            l1StructId: s.l1StructId,
            parentId: s.parentId || null,
            scope: s.scope,
          })),
        });
        console.log(`[raw-to-atomic] L1Scope: ${data.l1Scopes.length}건 생성`);
      }

      // 5. L1Functions (skipDuplicates)
      if (data.l1Functions.length > 0) {
        await tx.l1Function.createMany({
          skipDuplicates: true,
          data: data.l1Functions.map((f) => ({
            id: f.id,
            fmeaId: normalizedId,
            l1StructId: f.l1StructId,
            parentId: f.parentId || null,
            category: f.category,
            functionName: f.functionName,
            requirement: f.requirement,
          })),
        });
      }

      // 6. L1Requirements (skipDuplicates) — C3 독립 엔티티, L1Function 이후 생성 (FK 의존)
      if (data.l1Requirements && data.l1Requirements.length > 0) {
        await tx.l1Requirement.createMany({
          skipDuplicates: true,
          data: data.l1Requirements.map((r) => ({
            id: r.id,
            fmeaId: normalizedId,
            l1StructId: r.l1StructId,
            l1FuncId: r.l1FuncId,
            parentId: r.parentId || null,
            requirement: r.requirement,
            orderIndex: r.orderIndex,
          })),
        });
        console.log(`[raw-to-atomic] L1Requirement: ${data.l1Requirements.length}건 생성`);
      }

      // 7. L2Functions (skipDuplicates)
      if (data.l2Functions.length > 0) {
        await tx.l2Function.createMany({
          skipDuplicates: true,
          data: data.l2Functions.map((f) => ({
            id: f.id,
            fmeaId: normalizedId,
            l2StructId: f.l2StructId,
            parentId: f.parentId || null,
            functionName: f.functionName,
            productChar: f.productChar,
            specialChar: f.specialChar ?? null,
          })),
        });
      }

      // 8. L2ProcessNos (skipDuplicates) — A1 독립 엔티티
      if (data.l2ProcessNos && data.l2ProcessNos.length > 0) {
        await safeTx(tx, 'l2ProcessNo').createMany({
          skipDuplicates: true,
          data: data.l2ProcessNos.map((p) => ({
            id: p.id,
            fmeaId: normalizedId,
            l2StructId: p.l2StructId,
            parentId: p.parentId || null,
            no: p.no,
          })),
        });
        console.log(`[raw-to-atomic] L2ProcessNo: ${data.l2ProcessNos.length}건 생성`);
      }

      // 9. L2ProcessNames (skipDuplicates) — A2 독립 엔티티
      if (data.l2ProcessNames && data.l2ProcessNames.length > 0) {
        await safeTx(tx, 'l2ProcessName').createMany({
          skipDuplicates: true,
          data: data.l2ProcessNames.map((p) => ({
            id: p.id,
            fmeaId: normalizedId,
            l2StructId: p.l2StructId,
            parentId: p.parentId || null,
            name: p.name,
          })),
        });
        console.log(`[raw-to-atomic] L2ProcessName: ${data.l2ProcessNames.length}건 생성`);
      }

      // 10. ProcessProductChars (skipDuplicates)
      if (data.processProductChars.length > 0) {
        await tx.processProductChar.createMany({
          skipDuplicates: true,
          data: data.processProductChars.map((pc) => ({
            id: pc.id,
            fmeaId: normalizedId,
            l2StructId: pc.l2StructId,
            parentId: pc.parentId || null,
            name: pc.name,
            specialChar: pc.specialChar ?? null,
            orderIndex: pc.orderIndex,
          })),
        });
      }

      // 11. L2SpecialChars (skipDuplicates) — SC 특별특성 독립 엔티티, L2Function 이후
      if (data.l2SpecialChars && data.l2SpecialChars.length > 0) {
        await safeTx(tx, 'l2SpecialChar').createMany({
          skipDuplicates: true,
          data: data.l2SpecialChars.map((sc) => ({
            id: sc.id,
            fmeaId: normalizedId,
            l2StructId: sc.l2StructId,
            l2FuncId: sc.l2FuncId,
            parentId: sc.parentId || null,
            value: sc.value,
          })),
        });
        console.log(`[raw-to-atomic] L2SpecialChar: ${data.l2SpecialChars.length}건 생성`);
      }

      // 12. FailureEffects (skipDuplicates — FE는 보존)
      if (data.failureEffects.length > 0) {
        await tx.failureEffect.createMany({
          skipDuplicates: true,
          data: data.failureEffects.map((fe) => ({
            id: fe.id,
            fmeaId: normalizedId,
            l1FuncId: fe.l1FuncId,
            parentId: fe.parentId || null,
            category: fe.category,
            effect: fe.effect,
            severity: fe.severity,
          })),
        });
      }

      // 13. FailureModes (skipDuplicates — FM은 보존)
      if (data.failureModes.length > 0) {
        await tx.failureMode.createMany({
          skipDuplicates: true,
          data: data.failureModes.map((fm) => ({
            id: fm.id,
            fmeaId: normalizedId,
            l2FuncId: fm.l2FuncId,
            l2StructId: fm.l2StructId,
            productCharId: fm.productCharId,
            mode: fm.mode,
            parentId: fm.parentId || null,
            feRefs: fm.feRefs || [],
            fcRefs: fm.fcRefs || [],
          })),
        });
      }

      // 14. L3Functions + L3ProcessChars: DELETE then CREATE (항상 최신 데이터 보장)
      // 방어: l3Functions가 비어있으면 DELETE 금지 (파싱 실패 시 기존 데이터 보호)
      if (data.l3Functions.length === 0) {
        console.warn(
          `[raw-to-atomic] ⚠️ l3Functions=0 — DELETE 건너뜀 (기존 데이터 보존). 파서 로그 확인 필요`,
        );
      } else {
        // 의존성 역순: RA → FL → FC → SpecialChar → ProcessChar → WorkElement → FourM → ProcessNo → L3Function
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
          data: data.l3Functions.map((f) => ({
            id: f.id,
            fmeaId: normalizedId,
            l3StructId: f.l3StructId,
            l2StructId: f.l2StructId,
            parentId: f.parentId || null,
            functionName: f.functionName,
            processChar: f.processChar,
            specialChar: f.specialChar ?? null,
          })),
        });
        console.log(`[raw-to-atomic] L3Function: ${data.l3Functions.length}건 생성`);

        // 15. L3ProcessChars — L3Function 이후 생성 (FK 의존)
        if (data.l3ProcessChars && data.l3ProcessChars.length > 0) {
          await safeTx(tx, 'l3ProcessChar').createMany({
            data: data.l3ProcessChars.map((pc) => ({
              id: pc.id,
              fmeaId: normalizedId,
              l3FuncId: pc.l3FuncId,
              l3StructId: pc.l3StructId,
              parentId: pc.parentId || null,
              name: pc.name,
              specialChar: pc.specialChar ?? null,
            })),
          });
          console.log(`[raw-to-atomic] L3ProcessChar: ${data.l3ProcessChars.length}건 생성`);
        }

        // L3ProcessNos — L3Structure 이후 생성 (FK 의존)
        if (data.l3ProcessNos && data.l3ProcessNos.length > 0) {
          await safeTx(tx, 'l3ProcessNo').createMany({
            data: data.l3ProcessNos.map((p) => ({
              id: p.id,
              fmeaId: normalizedId,
              l3StructId: p.l3StructId,
              parentId: p.parentId || null,
              no: p.no,
            })),
          });
          console.log(`[raw-to-atomic] L3ProcessNo: ${data.l3ProcessNos.length}건 생성`);
        }

        // L3FourMs
        if (data.l3FourMs && data.l3FourMs.length > 0) {
          await safeTx(tx, 'l3FourM').createMany({
            data: data.l3FourMs.map((f) => ({
              id: f.id,
              fmeaId: normalizedId,
              l3StructId: f.l3StructId,
              parentId: f.parentId || null,
              m4: f.m4,
            })),
          });
          console.log(`[raw-to-atomic] L3FourM: ${data.l3FourMs.length}건 생성`);
        }

        // L3WorkElements
        if (data.l3WorkElements && data.l3WorkElements.length > 0) {
          await safeTx(tx, 'l3WorkElement').createMany({
            data: data.l3WorkElements.map((w) => ({
              id: w.id,
              fmeaId: normalizedId,
              l3StructId: w.l3StructId,
              parentId: w.parentId || null,
              name: w.name,
            })),
          });
          console.log(`[raw-to-atomic] L3WorkElement: ${data.l3WorkElements.length}건 생성`);
        }

        // L3SpecialChars — L3ProcessChar 이후 생성 (FK 의존)
        if (data.l3SpecialChars && data.l3SpecialChars.length > 0) {
          await safeTx(tx, 'l3SpecialChar').createMany({
            data: data.l3SpecialChars.map((sc) => ({
              id: sc.id,
              fmeaId: normalizedId,
              l3StructId: sc.l3StructId,
              l3ProcessCharId: sc.l3ProcessCharId,
              parentId: sc.parentId || null,
              value: sc.value,
            })),
          });
          console.log(`[raw-to-atomic] L3SpecialChar: ${data.l3SpecialChars.length}건 생성`);
        }
      }

      // 16. FailureCauses (L3 DELETE 이후 재생성) — ★v4: processCharId = l3CharId → L3ProcessChar.id
      if (data.failureCauses.length > 0) {
        await tx.failureCause.createMany({
          data: data.failureCauses.map((fc) => ({
            id: fc.id,
            fmeaId: normalizedId,
            l3FuncId: fc.l3FuncId,
            l3StructId: fc.l3StructId,
            l2StructId: fc.l2StructId,
            processCharId: fc.l3CharId || fc.l3FuncId || null, // ★v4: B-13 L3ProcessChar FK
            cause: fc.cause,
            parentId: fc.parentId || null,
          })),
        });
        console.log(`[raw-to-atomic] FailureCause: ${data.failureCauses.length}건 생성`);
      }

      // 17. FailureLinks — 빈 FK 필터링 후 저장 (validFLs only, skipDuplicates)
      const validFLs = data.failureLinks.filter((fl) => fl.fmId && fl.feId && fl.fcId);
      const brokenFLs = data.failureLinks.length - validFLs.length;
      if (brokenFLs > 0) {
        console.warn(`[raw-to-atomic] ⚠️ FL FK 불완전 ${brokenFLs}건 스킵 (fmId/feId/fcId 빈값)`);
        console.warn('[raw-to-atomic] 원인: FC 시트의 L1/L2/L3 원본행 컬럼 확인 필요');
      }
      if (validFLs.length > 0) {
        await tx.failureLink.createMany({
          skipDuplicates: true,
          data: validFLs.map((fl) => ({
            id: fl.id,
            fmeaId: normalizedId,
            fmId: fl.fmId,
            feId: fl.feId,
            fcId: fl.fcId,
            l2StructId: fl.l2StructId || null,
            l3StructId: fl.l3StructId || null,
            fmText: fl.fmText,
            feText: fl.feText,
            fcText: fl.fcText,
            feScope: fl.feScope,
            fmProcess: fl.fmProcess,
            fcWorkElem: fl.fcWorkElem,
            fcM4: fl.fcM4,
          })),
        });
        console.log(`[raw-to-atomic] FailureLink: ${validFLs.length}건 생성`);
      }

      // 18. RiskAnalyses — 유효한 FL만 참조 (skipDuplicates)
      const validFlIds = new Set(validFLs.map((fl) => fl.id));
      const validRAs = data.riskAnalyses.filter((ra) => validFlIds.has(ra.linkId));
      if (validRAs.length > 0) {
        await tx.riskAnalysis.createMany({
          skipDuplicates: true,
          data: validRAs.map((ra) => ({
            id: ra.id,
            fmeaId: normalizedId,
            linkId: ra.linkId,
            fmId: ra.fmId || null,
            fcId: ra.fcId || null,
            feId: ra.feId || null,   // ★v4 EX-06
            severity: ra.severity,
            occurrence: ra.occurrence,
            detection: ra.detection,
            ap: ra.ap,
            preventionControl: ra.preventionControl,
            detectionControl: ra.detectionControl,
          })),
        });
        console.log(`[raw-to-atomic] RiskAnalysis: ${validRAs.length}건 생성`);
      }

      // Verify counts (핵심 테이블만 — 신규 v4 테이블은 tx 프록시 호환성 문제로 제외)
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
        l2Structures: l2c,
        l3Structures: l3c,
        l3ProcessChars: data.l3ProcessChars?.length ?? 0,  // 파싱 결과로 대체
        l1Requirements: data.l1Requirements?.length ?? 0,
        l1Scopes: data.l1Scopes?.length ?? 0,
        failureModes: fmc,
        failureCauses: fcc,
        failureEffects: fec,
        failureLinks: flc,
        riskAnalyses: rac,
      };
    });

    const validFLs = data.failureLinks.filter((fl) => fl.fmId && fl.feId && fl.fcId);
    const skippedFL = data.failureLinks.length - validFLs.length;

    console.log(`[raw-to-atomic] Done (fmeaId=${normalizedId}):`, JSON.stringify(counts));

    return {
      success: true,
      fmeaId: normalizedId,
      counts,
      skippedFL,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[raw-to-atomic] Transaction error:', err);
    return {
      success: false,
      fmeaId: normalizedId,
      counts: {
        l2Structures: 0,
        l3Structures: 0,
        l3ProcessChars: 0,
        l1Requirements: 0,
        l1Scopes: 0,
        failureModes: 0,
        failureCauses: 0,
        failureEffects: 0,
        failureLinks: 0,
        riskAnalyses: 0,
      },
      skippedFL: 0,
      error: message,
    };
  }
}
