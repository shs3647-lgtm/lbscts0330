// CODEFREEZE 해제 — 2026-03-18 RA=0 fallback + Opt FK 수복 추가 (사용자 승인)
/**
 * @file rebuild-atomic/route.ts
 * @description 레거시 DB(FmeaLegacyData)를 기준으로 원자성 테이블을 완전 재구성 (정합성/표준화)
 *
 * POST /api/fmea/rebuild-atomic?fmeaId=xxx
 *
 * 목적:
 * - 원자성 DB가 레거시와 항상 일치하도록 강제
 * - 과거 저장 버그(빈 id → 매 저장 uid() 생성)로 인해 누적된 중복 레코드 정리
 * - 온프레미스 릴리즈 시 DB 정합성 확보
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema, getPrisma } from '@/lib/prisma';
import { migrateToAtomicDB } from '@/app/(fmea-core)/pfmea/worksheet/migration';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

const AP_TABLE_LOCAL = [
  { s: '9-10', o: '8-10', d: ['H','H','H','H'] }, { s: '9-10', o: '6-7', d: ['H','H','H','H'] },
  { s: '9-10', o: '4-5', d: ['H','H','H','M'] }, { s: '9-10', o: '2-3', d: ['H','M','L','L'] },
  { s: '9-10', o: '1', d: ['L','L','L','L'] }, { s: '7-8', o: '8-10', d: ['H','H','H','H'] },
  { s: '7-8', o: '6-7', d: ['H','H','H','M'] }, { s: '7-8', o: '4-5', d: ['H','M','M','M'] },
  { s: '7-8', o: '2-3', d: ['M','M','L','L'] }, { s: '7-8', o: '1', d: ['L','L','L','L'] },
  { s: '4-6', o: '8-10', d: ['H','H','M','M'] }, { s: '4-6', o: '6-7', d: ['M','M','M','L'] },
  { s: '4-6', o: '4-5', d: ['M','L','L','L'] }, { s: '4-6', o: '2-3', d: ['L','L','L','L'] },
  { s: '4-6', o: '1', d: ['L','L','L','L'] }, { s: '2-3', o: '8-10', d: ['M','M','L','L'] },
  { s: '2-3', o: '6-7', d: ['L','L','L','L'] }, { s: '2-3', o: '4-5', d: ['L','L','L','L'] },
  { s: '2-3', o: '2-3', d: ['L','L','L','L'] }, { s: '2-3', o: '1', d: ['L','L','L','L'] },
];
function calculateAPLocal(s: number, o: number, d: number): string {
  if (s <= 0 || o <= 0 || d <= 0) return 'L';
  const sR = s >= 9 ? '9-10' : s >= 7 ? '7-8' : s >= 4 ? '4-6' : s >= 2 ? '2-3' : null;
  if (!sR) return 'L';
  const oR = o >= 8 ? '8-10' : o >= 6 ? '6-7' : o >= 4 ? '4-5' : o >= 2 ? '2-3' : '1';
  const dI = d >= 7 ? 0 : d >= 5 ? 1 : d >= 2 ? 2 : 3;
  const row = AP_TABLE_LOCAL.find(r => r.s === sR && r.o === oR);
  return row ? row.d[dI] : 'L';
}

export async function POST(request: NextRequest) {
  try {
    // ✅ FMEA ID는 항상 소문자로 정규화 (DB 정규화)
    const fmeaId = request.nextUrl.searchParams.get('fmeaId')?.toLowerCase();
    // ★★★ 2026-02-05: API 응답 형식 통일 (ok → success) ★★★
    if (!fmeaId) return NextResponse.json({ success: false, error: 'fmeaId parameter is required' }, { status: 400 });

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'Prisma not configured' }, { status: 200 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma not configured' }, { status: 200 });

    // 프로젝트 스키마에 레거시가 없으면 public에서 가져와 1회 마이그레이션
    let legacyRec = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } }).catch(() => null);
    if (!legacyRec?.data) {
      const publicPrisma = getPrisma(); // public (기존 저장소)
      const fromPublic = await publicPrisma?.fmeaLegacyData.findUnique({ where: { fmeaId } }).catch(() => null);
      if (fromPublic?.data) {
        await prisma.fmeaLegacyData.upsert({
          where: { fmeaId },
          create: { fmeaId, data: fromPublic.data, version: fromPublic.version || '1.0.0' },
          update: { data: fromPublic.data, version: fromPublic.version || '1.0.0' },
        });
        legacyRec = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } }).catch(() => null);
      }
    }
    if (!legacyRec?.data) {
      return NextResponse.json({ success: false, error: 'No legacy data found for this fmeaId' }, { status: 404 });
    }

    const confirmed = await prisma.fmeaConfirmedState.findUnique({ where: { fmeaId } }).catch(() => null);

    // 레거시 + 확정 상태 합성 (migration.ts가 기대하는 형태)
    const legacyData: any = {
      ...(typeof legacyRec.data === 'object' && legacyRec.data !== null ? legacyRec.data : {}),
      fmeaId,
      structureConfirmed: confirmed?.structureConfirmed ?? (legacyRec.data as any)?.structureConfirmed ?? false,
      l1Confirmed: confirmed?.l1FunctionConfirmed ?? (legacyRec.data as any)?.l1Confirmed ?? false,
      l2Confirmed: confirmed?.l2FunctionConfirmed ?? (legacyRec.data as any)?.l2Confirmed ?? false,
      l3Confirmed: confirmed?.l3FunctionConfirmed ?? (legacyRec.data as any)?.l3Confirmed ?? false,
      failureL1Confirmed: confirmed?.failureL1Confirmed ?? (legacyRec.data as any)?.failureL1Confirmed ?? false,
      failureL2Confirmed: confirmed?.failureL2Confirmed ?? (legacyRec.data as any)?.failureL2Confirmed ?? false,
      failureL3Confirmed: confirmed?.failureL3Confirmed ?? (legacyRec.data as any)?.failureL3Confirmed ?? false,
      failureLinkConfirmed: confirmed?.failureLinkConfirmed ?? (legacyRec.data as any)?.failureLinkConfirmed ?? false,
    };

    const atomic = migrateToAtomicDB(legacyData as any);

    await prisma.$transaction(async (tx: any) => {
      // ★★★ 명시적 전체 삭제 — FK cascade가 없는 프로젝트 스키마 대응 (2026-03-17)
      // 문제: 프로젝트 스키마는 LIKE ... INCLUDING ALL로 생성되어 FK 제약 없음
      // 결과: l1Structure.deleteMany가 cascade 미작동 → 좀비 레코드 누적
      // 해결: 자식→부모 순서로 모든 원자성 테이블을 fmeaId 기준 명시적 삭제
      await tx.riskAnalysis.deleteMany({ where: { fmeaId } }).catch(() => {});
      await tx.failureLink.deleteMany({ where: { fmeaId } });
      try { if (tx.failureAnalysis) await tx.failureAnalysis.deleteMany({ where: { fmeaId } }); } catch {}
      await tx.failureEffect.deleteMany({ where: { fmeaId } });
      await tx.failureMode.deleteMany({ where: { fmeaId } });
      await tx.failureCause.deleteMany({ where: { fmeaId } });
      try { if (tx.l1Requirement) await tx.l1Requirement.deleteMany({ where: { fmeaId } }); } catch {}
      await tx.l1Function.deleteMany({ where: { fmeaId } });
      try { if (tx.processProductChar) await tx.processProductChar.deleteMany({ where: { fmeaId } }); } catch {}
      await tx.l2Function.deleteMany({ where: { fmeaId } });
      await tx.l3Function.deleteMany({ where: { fmeaId } });
      await tx.l1Structure.deleteMany({ where: { fmeaId } });
      await tx.l2Structure.deleteMany({ where: { fmeaId } });
      await tx.l3Structure.deleteMany({ where: { fmeaId } });

      if (atomic.l1Structure) {
        await tx.l1Structure.create({
          data: {
            id: atomic.l1Structure.id,
            fmeaId,
            name: atomic.l1Structure.name,
            confirmed: atomic.l1Structure.confirmed ?? false,
          },
        });
      }

      if (atomic.l2Structures.length) {
        await tx.l2Structure.createMany({
          data: atomic.l2Structures.map((l2: any) => ({
            id: l2.id,
            fmeaId,
            l1Id: l2.l1Id,
            no: l2.no,
            name: l2.name,
            order: l2.order,
          })),
          skipDuplicates: true,
        });
      }

      if (atomic.l3Structures.length) {
        await tx.l3Structure.createMany({
          data: atomic.l3Structures.map((l3: any) => ({
            id: l3.id,
            fmeaId,
            l1Id: l3.l1Id,
            l2Id: l3.l2Id,
            m4: l3.m4 || null,
            name: l3.name,
            order: l3.order,
          })),
          skipDuplicates: true,
        });
      }

      if (atomic.l1Functions.length) {
        await tx.l1Function.createMany({
          data: atomic.l1Functions.map((f: any) => ({
            id: f.id,
            fmeaId,
            l1StructId: f.l1StructId,
            category: f.category,
            functionName: f.functionName,
            requirement: f.requirement,
          })),
          skipDuplicates: true,
        });

        // ★ C3 별도 테이블: L1Function.requirement → L1Requirement (1:1)
        // ★ 비치명적 — l1Requirement 미지원 Prisma 캐시 대응 (try-catch)
        try {
          if (tx.l1Requirement) {
            const reqRows = atomic.l1Functions
              .filter((f: any) => f.requirement !== undefined && f.requirement !== null)
              .map((f: any) => ({
                id: `${f.id}-R`,
                fmeaId,
                l1StructId: f.l1StructId,
                l1FuncId: f.id,
                requirement: f.requirement,
                orderIndex: 0,
              }));
            if (reqRows.length > 0) {
              await tx.l1Requirement.createMany({ data: reqRows, skipDuplicates: true });
            }
          } else {
            console.warn('[rebuild-atomic] tx.l1Requirement 없음 — Prisma 캐시 갱신 필요 (서버 재시작 권장)');
          }
        } catch (reqErr: any) {
          console.warn('[rebuild-atomic] L1Requirement 보조 저장 실패 (메인 저장 계속):', reqErr.code, reqErr.message?.slice(0, 100));
        }
      }

      if (atomic.l2Functions.length) {
        await tx.l2Function.createMany({
          data: atomic.l2Functions.map((f: any) => ({
            id: f.id,
            fmeaId,
            l2StructId: f.l2StructId,
            functionName: f.functionName,
            productChar: f.productChar,
            specialChar: f.specialChar || null,
          })),
          skipDuplicates: true,
        });
      }

      // ★★★ 2026-03-16: ProcessProductChar 저장 (L2Function.productChars 또는 legacyData.l2[].functions[].productChars에서 추출)
      {
        const pcRows: { id: string; fmeaId: string; l2StructId: string; name: string; specialChar: string | null; orderIndex: number }[] = [];
        const seenPcIds = new Set<string>();
        // 1. atomic.l2Functions에 embed된 productChars (buildAtomicDB 경유)
        for (const func of atomic.l2Functions) {
          const pcs = (func as any).productChars;
          if (Array.isArray(pcs)) {
            pcs.forEach((pc: any, idx: number) => {
              if (!pc?.id || seenPcIds.has(pc.id)) return;
              seenPcIds.add(pc.id);
              pcRows.push({ id: pc.id, fmeaId, l2StructId: func.l2StructId, name: pc.name || '', specialChar: pc.specialChar || null, orderIndex: pc.orderIndex ?? idx });
            });
          }
        }
        // 2. Legacy l2[].functions[].productChars (워크시트 경유)
        if (pcRows.length === 0 && legacyData.l2) {
          for (const proc of legacyData.l2) {
            // ★ 2026-03-17: proc.id(genA1) 우선 — 텍스트 매칭(proc.no) 폴백
            const l2Id = proc.id || atomic.l2Structures.find((s: any) => s.no === proc.no)?.id;
            if (!l2Id) continue;
            for (const func of (proc.functions || [])) {
              for (const pc of (func.productChars || [])) {
                if (!pc?.id || seenPcIds.has(pc.id)) continue;
                seenPcIds.add(pc.id);
                pcRows.push({ id: pc.id, fmeaId, l2StructId: l2Id, name: pc.name || '', specialChar: pc.specialChar || null, orderIndex: 0 });
              }
            }
          }
        }
        // 3. Legacy l2[].l3[].functions[].processChars (B3 — FC의 processCharId 대상)
        if (legacyData.l2) {
          for (const proc of legacyData.l2) {
            const l2Id = proc.id || atomic.l2Structures.find((s: any) => s.no === proc.no)?.id;
            if (!l2Id) continue;
            for (const we of (proc.l3 || [])) {
              for (const func of (we.functions || [])) {
                for (const pc of (func.processChars || [])) {
                  if (!pc?.id || seenPcIds.has(pc.id)) continue;
                  seenPcIds.add(pc.id);
                  pcRows.push({ id: pc.id, fmeaId, l2StructId: l2Id, name: pc.name || '', specialChar: pc.specialChar || null, orderIndex: 0 });
                }
              }
            }
          }
        }
        console.info(`[rebuild-atomic] PC: ${pcRows.length}건`);
        if (pcRows.length > 0) {
          try {
            if (tx.processProductChar) {
              await tx.processProductChar.createMany({ data: pcRows, skipDuplicates: true });
              console.info(`[rebuild-atomic] PC 저장: ${pcRows.length}건`);
            } else {
              console.warn('[rebuild-atomic] tx.processProductChar 없음 — Prisma 캐시 갱신 필요 (서버 재시작 권장)');
            }
          } catch (pcErr: any) {
            console.warn('[rebuild-atomic] ProcessProductChar 저장 실패 (메인 저장 계속):', pcErr.code, pcErr.message?.slice(0, 100));
          }
        } else {
          console.warn(`[rebuild-atomic] PC 0건 — 추출 실패`);
        }
      }

      if (atomic.l3Functions.length) {
        await tx.l3Function.createMany({
          data: atomic.l3Functions.map((f: any) => ({
            id: f.id,
            fmeaId,
            l3StructId: f.l3StructId,
            l2StructId: f.l2StructId,
            functionName: f.functionName,
            processChar: f.processChar,
            specialChar: f.specialChar || null,
          })),
          skipDuplicates: true,
        });
      }

      if (atomic.failureEffects.length) {
        await tx.failureEffect.createMany({
          data: atomic.failureEffects.map((fe: any) => ({
            id: fe.id,
            fmeaId,
            l1FuncId: fe.l1FuncId,
            category: fe.category,
            effect: fe.effect,
            severity: fe.severity,
          })),
          skipDuplicates: true,
        });
      }

      if (atomic.failureModes.length) {
        await tx.failureMode.createMany({
          data: atomic.failureModes.map((fm: any) => ({
            id: fm.id,
            fmeaId,
            l2FuncId: fm.l2FuncId,
            l2StructId: fm.l2StructId,
            productCharId: fm.productCharId || null,
            mode: fm.mode,
            specialChar: fm.specialChar ?? false,
          })),
          skipDuplicates: true,
        });
      }

      if (atomic.failureCauses.length) {
        await tx.failureCause.createMany({
          data: atomic.failureCauses.map((fc: any) => ({
            id: fc.id,
            fmeaId,
            l3FuncId: fc.l3FuncId,
            l3StructId: fc.l3StructId,
            l2StructId: fc.l2StructId,
            // ★★★ 2026-03-17 FIX: processCharId 복사 (88건 전원 NULL → 정상 복원) ★★★
            processCharId: fc.processCharId || null,
            cause: fc.cause,
            occurrence: fc.occurrence || null,
          })),
          skipDuplicates: true,
        });
      }

      // FailureLinks 재생성 (상단 명시적 삭제로 이미 purge됨)
      // ★★★ 2026-03-17 FIX: FK 유효성 검증 후 저장 (깨진 FK 링크 필터링 + 로깅)
      if (atomic.failureLinks.length) {
        const fmIdSet = new Set(atomic.failureModes.map((fm: any) => fm.id));
        const feIdSet = new Set(atomic.failureEffects.map((fe: any) => fe.id));
        const fcIdSet = new Set(atomic.failureCauses.map((fc: any) => fc.id));

        const validLinks: any[] = [];
        const invalidLinks: any[] = [];
        for (const l of atomic.failureLinks) {
          const hasFm = fmIdSet.has(l.fmId);
          const hasFe = feIdSet.has(l.feId);
          const hasFc = fcIdSet.has(l.fcId);
          if (hasFm && hasFe && hasFc) {
            validLinks.push(l);
          } else {
            invalidLinks.push({ id: l.id, fmId: l.fmId, feId: l.feId, fcId: l.fcId, missingFm: !hasFm, missingFe: !hasFe, missingFc: !hasFc });
          }
        }
        if (invalidLinks.length > 0) {
          console.warn(`[rebuild-atomic] FailureLink FK 검증: ${invalidLinks.length}건 무효 (저장 스킵)`);
          for (const il of invalidLinks.slice(0, 5)) {
            console.warn(`  - id=${il.id} missingFm=${il.missingFm} missingFe=${il.missingFe} missingFc=${il.missingFc}`);
          }
        }

        if (validLinks.length > 0) {
          await tx.failureLink.createMany({
            data: validLinks.map((l: any) => ({
              id: l.id,
              fmeaId,
              fmId: l.fmId,
              feId: l.feId,
              fcId: l.fcId,
              fmText: l.cache?.fmText || l.fmText || l.originalFmText || null,
              fmProcess: l.cache?.fmProcess || l.fmProcess || l.processName || null,
              feText: l.cache?.feText || l.feText || l.originalFeText || null,
              feScope: l.cache?.feCategory || l.feScope || l.scope || null,
              fcText: l.cache?.fcText || l.fcText || l.originalFcText || null,
              fcWorkElem: l.cache?.fcWorkElem || l.fcWorkElem || l.workElementName || null,
              fcM4: l.fcM4 || l.m4 || null,
              severity: l.cache?.feSeverity || l.severity || null,
            })),
            skipDuplicates: true,
          });
        }
      }
      // ★★★ 2026-03-19 ROOT FIX: 미연결 FC → FL + RA 동시 생성 + Legacy 동기화 ★★★
      // 근본원인: rebuild-atomic이 FC를 생성하면서 FL/RA를 누락 → FK 불일치
      // 대책: 3단계 FM 매칭(l2StructId→l3FuncId→전체 FM) + FL→RA 동시 생성 + Legacy 동기화
      {
        const linkedFcIds = new Set(
          (await tx.failureLink.findMany({ where: { fmeaId }, select: { fcId: true } }))
            .map((l: any) => l.fcId)
        );
        const allFcs = atomic.failureCauses as any[];
        const unlinkedFcs = allFcs.filter((fc: any) => !linkedFcIds.has(fc.id));

        if (unlinkedFcs.length > 0) {
          // 1단계: l2StructId → FM 인덱스
          const fmByL2 = new Map<string, any>();
          for (const fm of atomic.failureModes) {
            if (!fmByL2.has((fm as any).l2StructId)) fmByL2.set((fm as any).l2StructId, fm);
          }
          // 2단계: l3FuncId → L3Function → l2StructId → FM (FC에서 L3Function 추적)
          const l3FuncById = new Map<string, any>();
          for (const lf of atomic.l3Functions) {
            l3FuncById.set((lf as any).id, lf);
          }
          // 기존 FM→FE 매핑 + FE severity 수집
          const fmToFe = new Map<string, string>();
          const feMap = new Map<string, any>();
          const existingLinks = await tx.failureLink.findMany({ where: { fmeaId }, select: { fmId: true, feId: true } });
          for (const el of existingLinks) {
            if (!fmToFe.has((el as any).fmId)) fmToFe.set((el as any).fmId, (el as any).feId);
          }
          for (const fe of atomic.failureEffects) feMap.set((fe as any).id, fe);
          const firstFeId = atomic.failureEffects.length > 0 ? (atomic.failureEffects[0] as any).id : null;

          const synthLinks: any[] = [];
          const allFms = atomic.failureModes as any[];
          for (const fc of unlinkedFcs) {
            // 3단계 FM 매칭: l2StructId → l3FuncId.l2StructId → 첫 FM
            let fm = fmByL2.get(fc.l2StructId);
            if (!fm && fc.l3FuncId) {
              const l3f = l3FuncById.get(fc.l3FuncId);
              if (l3f) fm = fmByL2.get(l3f.l2StructId);
            }
            if (!fm && allFms.length > 0) fm = allFms[0];
            if (!fm) continue;

            const feId = fmToFe.get(fm.id) || firstFeId;
            if (!feId) continue;

            synthLinks.push({
              id: `auto-${fc.id}`,
              fmeaId,
              fmId: fm.id,
              feId,
              fcId: fc.id,
              fmText: fm.mode || null,
              feText: feMap.get(feId)?.effect || null,
              fcText: fc.cause || null,
              fcM4: fc.m4 || null,
              severity: feMap.get(feId)?.severity || null,
            });
          }

          if (synthLinks.length > 0) {
            await tx.failureLink.createMany({ data: synthLinks, skipDuplicates: true });

            // FL→RA 동시 생성: 보충 FL에 대한 RiskAnalysis도 즉시 생성
            const rd: Record<string, unknown> = (legacyData as any).riskData || {};
            for (const sl of synthLinks) {
              const uk = `${sl.fmId}-${sl.fcId}`;
              const s = Number(rd[`risk-${uk}-S`]) || sl.severity || 1;
              const o = Number(rd[`risk-${uk}-O`]) || 1;
              const d = Number(rd[`risk-${uk}-D`]) || 1;
              const pc = String(rd[`prevention-${uk}`] || '').trim() || null;
              const dc = String(rd[`detection-${uk}`] || '').trim() || null;
              await tx.riskAnalysis.upsert({
                where: { id: `ra-${sl.id}` },
                create: {
                  id: `ra-${sl.id}`, fmeaId, linkId: sl.id,
                  severity: s, occurrence: o, detection: d,
                  ap: calculateAPLocal(s, o, d),
                  preventionControl: pc, detectionControl: dc,
                },
                update: {
                  severity: s, occurrence: o, detection: d,
                  ap: calculateAPLocal(s, o, d),
                  preventionControl: pc, detectionControl: dc,
                },
              });
            }

            // Legacy failureLinks 동기화
            try {
              const legacyRecord = await tx.fmeaLegacyData.findUnique({ where: { fmeaId } });
              if (legacyRecord) {
                const ld = JSON.parse(JSON.stringify(legacyRecord.data));
                if (!ld.failureLinks) ld.failureLinks = [];
                for (const sl of synthLinks) {
                  const exists = ld.failureLinks.some((ll: any) => ll.id === sl.id);
                  if (!exists) {
                    ld.failureLinks.push({
                      id: sl.id, fmId: sl.fmId, feId: sl.feId, fcId: sl.fcId,
                      fmText: sl.fmText, feText: sl.feText, fcText: sl.fcText,
                    });
                  }
                }
                await tx.fmeaLegacyData.update({ where: { fmeaId }, data: { data: ld } });
              }
            } catch { /* Legacy 동기화 실패는 비치명적 */ }

            console.info(`[rebuild-atomic] 미연결 FC 보충: FL=${synthLinks.length} + RA=${synthLinks.length} + Legacy 동기화`);
          }
        }
      }
      // ★★★ RiskAnalysis 저장 (preventionControl/detectionControl 포함) ★★★
      const savedLinks = await tx.failureLink.findMany({
        where: { fmeaId },
        select: { id: true, fmId: true, feId: true, fcId: true, severity: true },
      });
      const savedLinkIds = new Set(savedLinks.map((l: any) => l.id));

      if (atomic.riskAnalyses && (atomic.riskAnalyses as any[]).length > 0) {
        const validRisks = (atomic.riskAnalyses as any[]).filter((r: any) =>
          r.linkId && savedLinkIds.has(r.linkId)
        );
        if (validRisks.length > 0) {
          for (const risk of validRisks) {
            await tx.riskAnalysis.upsert({
              where: { id: risk.id },
              create: {
                id: risk.id,
                fmeaId,
                linkId: risk.linkId,
                severity: risk.severity ?? 0,
                occurrence: risk.occurrence ?? 0,
                detection: risk.detection ?? 0,
                ap: risk.ap ?? 'L',
                preventionControl: risk.preventionControl || null,
                detectionControl: risk.detectionControl || null,
                lldReference: risk.lldReference || null,
              },
              update: {
                severity: risk.severity ?? 0,
                occurrence: risk.occurrence ?? 0,
                detection: risk.detection ?? 0,
                ap: risk.ap ?? 'L',
                preventionControl: risk.preventionControl || null,
                detectionControl: risk.detectionControl || null,
                lldReference: risk.lldReference || null,
              },
            });
          }
          console.info(`[rebuild-atomic] RiskAnalysis 저장: ${validRisks.length}건 (PC/DC 포함)`);
        }
      }

      // ★★★ 2026-03-19 ROOT FIX: RA 부족 시 FL 기반 보충 (FL 1개 = RA 1개 원칙) ★★★
      const raCount = await tx.riskAnalysis.count({ where: { fmeaId } });
      if (raCount < savedLinks.length && savedLinks.length > 0) {
        // RA가 있는 linkId 집합
        const raLinkIds = new Set(
          (await tx.riskAnalysis.findMany({ where: { fmeaId }, select: { linkId: true } }))
            .map((r: any) => r.linkId)
        );
        // RA가 없는 FL만 대상
        const missingRaLinks = savedLinks.filter((l: any) => !raLinkIds.has(l.id));
        if (missingRaLinks.length > 0) {
          const rd: Record<string, unknown> = (legacyData as any).riskData || {};
          const feMapRa = new Map<string, any>();
          for (const fe of atomic.failureEffects) feMapRa.set((fe as any).id, fe);

          let created = 0;
          for (const link of missingRaLinks) {
            const uk = `${(link as any).fmId}-${(link as any).fcId}`;
            const s = Number(rd[`risk-${uk}-S`]) || (link as any).severity || 0;
            const o = Number(rd[`risk-${uk}-O`]) || 0;
            const d = Number(rd[`risk-${uk}-D`]) || 0;
            const pc = String(rd[`prevention-${uk}`] || '').trim() || null;
            const dc = String(rd[`detection-${uk}`] || '').trim() || null;
            const lldRef = String(rd[`lesson-${uk}`] || '').trim() || null;
            const sev = s > 0 ? s : (feMapRa.get((link as any).feId)?.severity || 1);

            const ap = (sev > 0 && o > 0 && d > 0) ? calculateAPLocal(sev, o, d) : 'L';
            await tx.riskAnalysis.upsert({
              where: { id: `ra-${(link as any).id}` },
              create: {
                id: `ra-${(link as any).id}`,
                fmeaId,
                linkId: (link as any).id,
                severity: sev,
                occurrence: o || 1,
                detection: d || 1,
                ap,
                preventionControl: pc,
                detectionControl: dc,
                lldReference: lldRef,
              },
              update: {},
            });
            created++;
          }
          console.info(`[rebuild-atomic] RA 보충: ${created}건 (FL 1:1 원칙)`);
        }
      }

      // ★★★ 2026-03-19 ROOT FIX: Atomic→Legacy processChar 양방향 동기화 ★★★
      // 근본원인: migrateToAtomicDB가 processChar을 FC/functionName에서 역추론 → Atomic DB 정확
      //   but Legacy processChars[].name은 여전히 빈값 → emptyPC 발생
      // 대책: Atomic L3Function.processChar → Legacy processChars[].name 동기화 (SSoT→Cache)
      {
        const allL3Funcs = await tx.l3Function.findMany({
          where: { fmeaId },
          select: { id: true, processChar: true },
        });
        const pcNameById = new Map<string, string>();
        for (const f of allL3Funcs) {
          if (f.processChar?.trim()) pcNameById.set(f.id, f.processChar);
        }

        if (pcNameById.size > 0) {
          const legRec = await tx.fmeaLegacyData.findUnique({ where: { fmeaId } });
          if (legRec) {
            const ld = JSON.parse(JSON.stringify(legRec.data));
            let syncCount = 0;
            for (const proc of (ld.l2 || [])) {
              for (const we of (proc.l3 || [])) {
                for (const fn of (we.functions || [])) {
                  for (const pc of (fn.processChars || [])) {
                    if (!pc.name?.trim() && pc.id && pcNameById.has(pc.id)) {
                      pc.name = pcNameById.get(pc.id)!;
                      syncCount++;
                    }
                  }
                }
              }
            }
            if (syncCount > 0) {
              await tx.fmeaLegacyData.update({ where: { fmeaId }, data: { data: ld } });
              console.info(`[rebuild-atomic] Atomic→Legacy processChar 동기화: ${syncCount}건`);
            }
          }
        }
      }

      // ★★★ 2026-03-19 ROOT FIX: Atomic→Legacy FC + failureLinks 양방향 동기화 ★★★
      // 근본원인: migration.ts에서 orphan L3Function용 FC 구조적 생성 → Atomic에만 존재
      // 대책: Atomic FC/FL를 Legacy data에 동기화 (SSoT→Cache 완전성)
      {
        const legRec = await tx.fmeaLegacyData.findUnique({ where: { fmeaId } });
        if (legRec) {
          const ld = JSON.parse(JSON.stringify(legRec.data));
          const allAtomicFcs = await tx.failureCause.findMany({
            where: { fmeaId },
            select: { id: true, cause: true, l2StructId: true, l3StructId: true, l3FuncId: true, processCharId: true },
          });
          const allAtomicFls = await tx.failureLink.findMany({
            where: { fmeaId },
            select: { id: true, fmId: true, feId: true, fcId: true, fmText: true, feText: true, fcText: true },
          });

          // Legacy FC ID 집합
          const legacyFcIds = new Set<string>();
          for (const proc of (ld.l2 || [])) {
            for (const fc of (proc.failureCauses || [])) legacyFcIds.add(fc.id);
            for (const we of (proc.l3 || [])) {
              for (const fc of (we.failureCauses || [])) legacyFcIds.add(fc.id);
            }
          }

          // L2 ID→proc index 매핑
          const l2IdxById = new Map<string, number>();
          const atomicL2s = await tx.l2Structure.findMany({ where: { fmeaId }, select: { id: true, no: true }, orderBy: { order: 'asc' } });
          for (let i = 0; i < atomicL2s.length; i++) {
            l2IdxById.set(atomicL2s[i].id, i);
          }

          let fcSyncCount = 0;
          for (const afc of allAtomicFcs) {
            if (legacyFcIds.has(afc.id)) continue;
            const procIdx = l2IdxById.get(afc.l2StructId);
            if (procIdx === undefined || !ld.l2?.[procIdx]) continue;
            const proc = ld.l2[procIdx];
            if (!proc.failureCauses) proc.failureCauses = [];
            proc.failureCauses.push({
              id: afc.id, name: afc.cause, cause: afc.cause,
              processCharId: afc.processCharId || afc.l3FuncId,
            });
            fcSyncCount++;
          }

          // Legacy failureLinks 동기화 (ID + FM-FE-FC 조합 중복 방지)
          const legacyFlIds = new Set((ld.failureLinks || []).map((fl: any) => fl.id));
          const legacyFlCombos = new Set(
            (ld.failureLinks || []).map((fl: any) => `${fl.fmId}|${fl.feId}|${fl.fcId}`)
          );
          let flSyncCount = 0;
          if (!ld.failureLinks) ld.failureLinks = [];
          for (const afl of allAtomicFls) {
            if (legacyFlIds.has(afl.id)) continue;
            const combo = `${afl.fmId}|${afl.feId}|${afl.fcId}`;
            if (legacyFlCombos.has(combo)) continue;
            legacyFlCombos.add(combo);
            ld.failureLinks.push({
              id: afl.id, fmId: afl.fmId, feId: afl.feId, fcId: afl.fcId,
              fmText: afl.fmText, feText: afl.feText, fcText: afl.fcText,
            });
            flSyncCount++;
          }

          if (fcSyncCount > 0 || flSyncCount > 0) {
            await tx.fmeaLegacyData.update({ where: { fmeaId }, data: { data: ld } });
            console.info(`[rebuild-atomic] Atomic→Legacy 동기화: FC=${fcSyncCount} FL=${flSyncCount}`);
          }
        }
      }

      // ★★★ 2026-03-18 FIX: Opt FK 수복 — riskId가 유효하지 않은 Optimization 삭제 ★★★
      {
        const validRAIds = new Set(
          (await tx.riskAnalysis.findMany({ where: { fmeaId }, select: { id: true } }))
            .map((r: any) => r.id)
        );
        const allOpts = await tx.optimization.findMany({ where: { fmeaId }, select: { id: true, riskId: true } });
        const orphanOpts = allOpts.filter((o: any) => !validRAIds.has(o.riskId));
        if (orphanOpts.length > 0) {
          await tx.optimization.deleteMany({
            where: { id: { in: orphanOpts.map((o: any) => o.id) } },
          });
          console.info(`[rebuild-atomic] Opt FK 고아 삭제: ${orphanOpts.length}건`);
        }
      }
    }, { timeout: 30000, isolationLevel: 'Serializable' });

    return NextResponse.json({
      ok: true,
      fmeaId,
      schema,
      rebuilt: {
        l2Structures: atomic.l2Structures.length,
        l3Structures: atomic.l3Structures.length,
        l1Functions: atomic.l1Functions.length,
        l2Functions: atomic.l2Functions.length,
        l3Functions: atomic.l3Functions.length,
        failureEffects: atomic.failureEffects.length,
        failureModes: atomic.failureModes.length,
        failureCauses: atomic.failureCauses.length,
        failureLinks: atomic.failureLinks.length,
        riskAnalyses: (atomic.riskAnalyses as any[] || []).length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}


