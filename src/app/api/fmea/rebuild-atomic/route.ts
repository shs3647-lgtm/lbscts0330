// CODEFREEZE 해제 — 2026-03-20 Legacy 의존성 완전 제거, Atomic DB 자체 정합성 재구성
/**
 * @file rebuild-atomic/route.ts
 * @description Atomic DB 자체 정합성 재구성 (Legacy 의존성 제거)
 *
 * POST /api/fmea/rebuild-atomic?fmeaId=xxx
 *
 * 목적:
 * - Atomic DB 내부 정합성 검증 및 수복 (중복 FC, 미연결 FC, orphan RA 등)
 * - Legacy DB에 의존하지 않고 Atomic DB만으로 자체 수복
 * - 온프레미스 릴리즈 시 DB 정합성 확보
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
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

    // ★★★ 2026-03-20: Atomic DB 존재 확인 — Legacy 의존성 완전 제거 ★★★
    const l2Count = await prisma.l2Structure.count({ where: { fmeaId } });
    if (l2Count === 0) {
      return NextResponse.json({ success: false, error: 'No Atomic DB data found for this fmeaId. Import data first.' }, { status: 404 });
    }

    // Atomic DB에서 기존 데이터 로드 (정합성 수복용)
    const [
      existingL1s, existingL2s, existingL3s,
      existingL1Funcs, existingL2Funcs, existingL3Funcs,
      existingFEs, existingFMs, existingFCs,
      existingFLs, existingRAs,
    ] = await Promise.all([
      prisma.l1Structure.findMany({ where: { fmeaId } }),
      prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
      prisma.l3Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
      prisma.l1Function.findMany({ where: { fmeaId } }),
      prisma.l2Function.findMany({ where: { fmeaId } }),
      prisma.l3Function.findMany({ where: { fmeaId } }),
      prisma.failureEffect.findMany({ where: { fmeaId } }),
      prisma.failureMode.findMany({ where: { fmeaId } }),
      prisma.failureCause.findMany({ where: { fmeaId } }),
      prisma.failureLink.findMany({ where: { fmeaId } }),
      prisma.riskAnalysis.findMany({ where: { fmeaId } }),
    ]);

    // Build atomic snapshot for integrity checks
    const atomic = {
      l1Structure: existingL1s[0] || null,
      l2Structures: existingL2s,
      l3Structures: existingL3s,
      l1Functions: existingL1Funcs,
      l2Functions: existingL2Funcs,
      l3Functions: existingL3Funcs,
      failureEffects: existingFEs,
      failureModes: existingFMs,
      failureCauses: existingFCs,
      failureLinks: existingFLs,
      riskAnalyses: existingRAs,
    };

    await prisma.$transaction(async (tx: any) => {

      // ★★★ 2026-03-20: Atomic DB 자체 정합성 수복 (Legacy 의존 제거) ★★★
      // 기존 Atomic 데이터를 그대로 유지하면서, FK 무결성 위반만 수복

      // FailureLink FK 검증 — 깨진 링크 삭제
      {
        const fmIdSet = new Set(atomic.failureModes.map((fm: any) => fm.id));
        const feIdSet = new Set(atomic.failureEffects.map((fe: any) => fe.id));
        const fcIdSet = new Set(atomic.failureCauses.map((fc: any) => fc.id));

        const invalidLinkIds: string[] = [];
        for (const l of atomic.failureLinks) {
          const hasFm = fmIdSet.has((l as any).fmId);
          const hasFe = feIdSet.has((l as any).feId);
          const hasFc = fcIdSet.has((l as any).fcId);
          if (!hasFm || !hasFe || !hasFc) {
            invalidLinkIds.push((l as any).id);
          }
        }
        if (invalidLinkIds.length > 0) {
          await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: invalidLinkIds } } });
          await tx.failureLink.deleteMany({ where: { id: { in: invalidLinkIds } } });
          console.warn(`[rebuild-atomic] FailureLink FK 검증: ${invalidLinkIds.length}건 무효 삭제`);
        }
      }
      // ★★★ 2026-03-19 ROOT FIX: 동일공정 동일원인 중복 FC 정리 ★★★
      {
        const fcsByKey = new Map<string, string[]>();
        const allFcsForDedup = await tx.failureCause.findMany({
          where: { fmeaId },
          select: { id: true, cause: true, l2StructId: true },
        });
        for (const fc of allFcsForDedup) {
          const key = `${(fc as any).l2StructId}|${(fc as any).cause}`;
          if (!fcsByKey.has(key)) fcsByKey.set(key, []);
          fcsByKey.get(key)!.push((fc as any).id);
        }
        const dupFcIds: string[] = [];
        for (const [, ids] of fcsByKey) {
          if (ids.length > 1) {
            dupFcIds.push(...ids.slice(1));
          }
        }
        if (dupFcIds.length > 0) {
          await tx.riskAnalysis.deleteMany({
            where: { fmeaId, linkId: { in: (await tx.failureLink.findMany({ where: { fmeaId, fcId: { in: dupFcIds } }, select: { id: true } })).map((l: any) => l.id) } },
          });
          await tx.failureLink.deleteMany({ where: { fmeaId, fcId: { in: dupFcIds } } });
          await tx.failureCause.deleteMany({ where: { id: { in: dupFcIds } } });
          console.log(`[rebuild-atomic] 동일공정 동일원인 중복 FC ${dupFcIds.length}건 정리`);
        }
      }

      // ★★★ 미연결 FC → FL + RA 동시 생성 (Atomic DB 자체 참조) ★★★
      {
        const linkedFcIds = new Set(
          (await tx.failureLink.findMany({ where: { fmeaId }, select: { fcId: true } }))
            .map((l: any) => l.fcId)
        );
        const allFcsNow = await tx.failureCause.findMany({ where: { fmeaId } });
        const unlinkedFcs = allFcsNow.filter((fc: any) => !linkedFcIds.has(fc.id));

        if (unlinkedFcs.length > 0) {
          const fmByL2 = new Map<string, any>();
          for (const fm of atomic.failureModes) {
            if (!fmByL2.has((fm as any).l2StructId)) fmByL2.set((fm as any).l2StructId, fm);
          }
          const l3FuncById = new Map<string, any>();
          for (const lf of atomic.l3Functions) {
            l3FuncById.set((lf as any).id, lf);
          }
          const fmToFe = new Map<string, string>();
          const feMap = new Map<string, any>();
          const currentLinks = await tx.failureLink.findMany({ where: { fmeaId }, select: { fmId: true, feId: true } });
          for (const el of currentLinks) {
            if (!fmToFe.has((el as any).fmId)) fmToFe.set((el as any).fmId, (el as any).feId);
          }
          for (const fe of atomic.failureEffects) feMap.set((fe as any).id, fe);
          const firstFeId = atomic.failureEffects.length > 0 ? (atomic.failureEffects[0] as any).id : null;

          const synthLinks: any[] = [];
          const allFms = atomic.failureModes as any[];
          for (const fc of unlinkedFcs) {
            let fm = fmByL2.get(fc.l2StructId);
            if (!fm && fc.l3FuncId) {
              const l3f = l3FuncById.get(fc.l3FuncId);
              if (l3f) fm = fmByL2.get((l3f as any).l2StructId);
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
              fmText: (fm as any).mode || null,
              feText: feMap.get(feId)?.effect || null,
              fcText: fc.cause || null,
              fcM4: null,
              severity: feMap.get(feId)?.severity || null,
            });
          }

          if (synthLinks.length > 0) {
            await tx.failureLink.createMany({ data: synthLinks, skipDuplicates: true });

            // FL→RA 동시 생성: SOD는 FE severity 기반 초기값 사용
            for (const sl of synthLinks) {
              const s = sl.severity || 1;
              await tx.riskAnalysis.upsert({
                where: { id: `ra-${sl.id}` },
                create: {
                  id: `ra-${sl.id}`, fmeaId, linkId: sl.id,
                  severity: s, occurrence: 1, detection: 1,
                  ap: calculateAPLocal(s, 1, 1),
                  preventionControl: null, detectionControl: null,
                },
                update: {},
              });
            }

            console.info(`[rebuild-atomic] 미연결 FC 보충: FL=${synthLinks.length} + RA=${synthLinks.length}`);
          }
        }
      }
      // ★★★ RA 부족 시 FL 기반 보충 (FL 1개 = RA 1개 원칙, Atomic DB 자체 참조) ★★★
      const savedLinks = await tx.failureLink.findMany({
        where: { fmeaId },
        select: { id: true, fmId: true, feId: true, fcId: true, severity: true },
      });

      const raCount = await tx.riskAnalysis.count({ where: { fmeaId } });
      if (raCount < savedLinks.length && savedLinks.length > 0) {
        const raLinkIds = new Set(
          (await tx.riskAnalysis.findMany({ where: { fmeaId }, select: { linkId: true } }))
            .map((r: any) => r.linkId)
        );
        const missingRaLinks = savedLinks.filter((l: any) => !raLinkIds.has(l.id));
        if (missingRaLinks.length > 0) {
          const feMapRa = new Map<string, any>();
          for (const fe of atomic.failureEffects) feMapRa.set((fe as any).id, fe);

          let created = 0;
          for (const link of missingRaLinks) {
            const sev = (link as any).severity || feMapRa.get((link as any).feId)?.severity || 1;

            await tx.riskAnalysis.upsert({
              where: { id: `ra-${(link as any).id}` },
              create: {
                id: `ra-${(link as any).id}`,
                fmeaId,
                linkId: (link as any).id,
                severity: sev,
                occurrence: 1,
                detection: 1,
                ap: calculateAPLocal(sev, 1, 1),
                preventionControl: null,
                detectionControl: null,
              },
              update: {},
            });
            created++;
          }
          console.info(`[rebuild-atomic] RA 보충: ${created}건 (FL 1:1 원칙)`);
        }
      }

      // ★★★ 2026-03-19 RA 중복 제거: 1 FL = 1 RA 원칙 강제 ★★★
      // 동일 linkId에 2개 이상의 RA가 생성될 수 있는 경로 차단
      // (migration RA + supplement RA ID 충돌, 또는 동일 FC가 다중 FL에 연결된 경우)
      {
        const allRAs = await tx.riskAnalysis.findMany({
          where: { fmeaId },
          select: { id: true, linkId: true, severity: true, occurrence: true, detection: true },
        });
        const raByLinkId = new Map<string, typeof allRAs>();
        for (const ra of allRAs) {
          const arr = raByLinkId.get(ra.linkId) || [];
          arr.push(ra);
          raByLinkId.set(ra.linkId, arr);
        }
        const dupRaIds: string[] = [];
        for (const [, ras] of raByLinkId) {
          if (ras.length <= 1) continue;
          ras.sort((a: any, b: any) =>
            ((b.severity || 0) + (b.occurrence || 0) + (b.detection || 0)) -
            ((a.severity || 0) + (a.occurrence || 0) + (a.detection || 0))
          );
          for (let i = 1; i < ras.length; i++) dupRaIds.push(ras[i].id);
        }
        if (dupRaIds.length > 0) {
          await tx.riskAnalysis.deleteMany({ where: { id: { in: dupRaIds } } });
          console.info(`[rebuild-atomic] RA 중복 제거: ${dupRaIds.length}건 (1 FL = 1 RA 원칙)`);
        }

        // RA가 어떤 FL에도 속하지 않는 고아 RA 제거
        const flIds = new Set(savedLinks.map((l: any) => l.id));
        const orphanRaIds = allRAs
          .filter((ra: any) => !flIds.has(ra.linkId) && !dupRaIds.includes(ra.id))
          .map((ra: any) => ra.id);
        if (orphanRaIds.length > 0) {
          await tx.riskAnalysis.deleteMany({ where: { id: { in: orphanRaIds } } });
          console.info(`[rebuild-atomic] 고아 RA 제거: ${orphanRaIds.length}건 (linkId가 FL에 없음)`);
        }

        // ★ SOD/DC/PC 빈값 RA 보충: (1) 동일 fcId 형제 RA → (2) 동일 fmId 피어 RA → (3) FE severity
        const emptyRAs = await tx.riskAnalysis.findMany({
          where: {
            fmeaId,
            OR: [
              { severity: { lte: 0 } },
              { occurrence: { lte: 0 } },
              { detection: { lte: 0 } },
              { preventionControl: null },
              { detectionControl: null },
            ],
          },
          include: { failureLink: { select: { fmId: true, fcId: true, feId: true } } },
        });
        if (emptyRAs.length > 0) {
          // (1) fcId 형제 RA 조회
          const fcIdsToCheck = [...new Set(emptyRAs.map((r: any) => r.failureLink?.fcId).filter(Boolean))];
          const siblingFLs = await tx.failureLink.findMany({
            where: { fmeaId, fcId: { in: fcIdsToCheck } },
            select: { id: true, fcId: true, feId: true },
          });
          const siblingRAMap = new Map<string, any>();
          for (const sfl of siblingFLs) {
            const sra = await tx.riskAnalysis.findFirst({
              where: { linkId: sfl.id, fmeaId },
            });
            if (sra && ((sra.severity || 0) > 0 || (sra.occurrence || 0) > 0)) {
              siblingRAMap.set(sfl.fcId, sra);
            }
          }

          // (2) fmId 피어 RA 조회 — 같은 FM의 다른 RA들에서 DC/PC/SOD 복사
          const fmIdsToCheck = [...new Set(emptyRAs.map((r: any) => r.failureLink?.fmId).filter(Boolean))];
          const peerFLs = await tx.failureLink.findMany({
            where: { fmeaId, fmId: { in: fmIdsToCheck } },
            select: { id: true, fmId: true },
          });
          const fmPeerDC = new Map<string, string[]>();
          const fmPeerPC = new Map<string, string[]>();
          const fmPeerSOD = new Map<string, { s: number; o: number; d: number }[]>();
          for (const pfl of peerFLs) {
            const pra = await tx.riskAnalysis.findFirst({ where: { linkId: pfl.id, fmeaId } });
            if (!pra) continue;
            const fm = pfl.fmId;
            if (pra.detectionControl?.trim()) {
              if (!fmPeerDC.has(fm)) fmPeerDC.set(fm, []);
              fmPeerDC.get(fm)!.push(pra.detectionControl.trim());
            }
            if (pra.preventionControl?.trim()) {
              if (!fmPeerPC.has(fm)) fmPeerPC.set(fm, []);
              fmPeerPC.get(fm)!.push(pra.preventionControl.trim());
            }
            if ((pra.severity || 0) > 0 && (pra.occurrence || 0) > 0 && (pra.detection || 0) > 0) {
              if (!fmPeerSOD.has(fm)) fmPeerSOD.set(fm, []);
              fmPeerSOD.get(fm)!.push({ s: pra.severity, o: pra.occurrence, d: pra.detection });
            }
          }
          const mostFreq = (arr: string[]) => {
            if (!arr || arr.length === 0) return '';
            const freq = new Map<string, number>();
            for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
            let best = arr[0], bestC = 0;
            for (const [k, c] of freq) { if (c > bestC) { best = k; bestC = c; } }
            return best;
          };
          const medianSOD = (arr: { s: number; o: number; d: number }[]) => {
            if (!arr || arr.length === 0) return { s: 0, o: 0, d: 0 };
            const sorted = [...arr].sort((a, b) => (a.s + a.o + a.d) - (b.s + b.o + b.d));
            return sorted[Math.floor(sorted.length / 2)];
          };

          const feMapEnrich = new Map<string, any>();
          for (const fe of atomic.failureEffects) feMapEnrich.set((fe as any).id, fe);

          let enriched = 0;
          for (const ra of emptyRAs) {
            const fmId = (ra as any).failureLink?.fmId;
            const fcId = (ra as any).failureLink?.fcId;
            const feId = (ra as any).failureLink?.feId;

            // (1) fcId 형제 RA에서 복사
            const donor = fcId ? siblingRAMap.get(fcId) : undefined;
            if (donor) {
              const sev = (ra.severity || 0) > 0 ? ra.severity : donor.severity;
              const occ = (ra.occurrence || 0) > 0 ? ra.occurrence : donor.occurrence;
              const det = (ra.detection || 0) > 0 ? ra.detection : donor.detection;
              const pc = ra.preventionControl || donor.preventionControl || null;
              const dc = ra.detectionControl || donor.detectionControl || null;
              const ap = (sev > 0 && occ > 0 && det > 0) ? calculateAPLocal(sev, occ, det) : 'L';
              await tx.riskAnalysis.update({
                where: { id: ra.id },
                data: { severity: sev, occurrence: occ, detection: det, ap, preventionControl: pc, detectionControl: dc },
              });
              enriched++;
              continue;
            }

            // (2) fmId 피어 RA에서 복사 (동일 FM의 최빈 DC/PC, 중간 SOD)
            if (fmId) {
              const peerDC = mostFreq(fmPeerDC.get(fmId) || []);
              const peerPC = mostFreq(fmPeerPC.get(fmId) || []);
              const peerS = medianSOD(fmPeerSOD.get(fmId) || []);
              const sev = (ra.severity || 0) > 0 ? ra.severity : (peerS.s || (feMapEnrich.get(feId)?.severity || 1));
              const occ = (ra.occurrence || 0) > 0 ? ra.occurrence : (peerS.o || 1);
              const det = (ra.detection || 0) > 0 ? ra.detection : (peerS.d || 1);
              const pc = ra.preventionControl || peerPC || null;
              const dc = ra.detectionControl || peerDC || null;
              if (sev > 0 || occ > 0 || det > 0 || pc || dc) {
                const ap = (sev > 0 && occ > 0 && det > 0) ? calculateAPLocal(sev, occ, det) : 'L';
                await tx.riskAnalysis.update({
                  where: { id: ra.id },
                  data: { severity: sev, occurrence: occ, detection: det, ap, preventionControl: pc, detectionControl: dc },
                });
                enriched++;
                continue;
              }
            }

            // (3) FE severity fallback
            if (feId && (ra.severity || 0) <= 0) {
              const feSev = feMapEnrich.get(feId)?.severity || 0;
              if (feSev > 0) {
                await tx.riskAnalysis.update({
                  where: { id: ra.id },
                  data: { severity: feSev },
                });
                enriched++;
              }
            }
          }
          if (enriched > 0) {
            console.info(`[rebuild-atomic] RA SOD/DC/PC 보충: ${enriched}건 (형제/피어 RA에서 복사)`);
          }
        }
      }

      // ★★★ 2026-03-19 ROOT FIX: FC processCharId = l3FuncId 동기화 ★★★
      // orphanPC 근본원인: FC.processCharId ≠ FC.l3FuncId → verify에서 매칭 안 됨
      {
        const mismatchFcs = await tx.failureCause.findMany({
          where: { fmeaId },
          select: { id: true, l3FuncId: true, processCharId: true },
        });
        let fixedCount = 0;
        for (const fc of mismatchFcs) {
          if (fc.l3FuncId && fc.processCharId !== fc.l3FuncId) {
            await tx.failureCause.update({
              where: { id: fc.id },
              data: { processCharId: fc.l3FuncId },
            });
            fixedCount++;
          }
        }
        if (fixedCount > 0) {
          console.info(`[rebuild-atomic] FC processCharId 동기화: ${fixedCount}건`);
        }
      }

      // ★★★ 2026-03-19 ROOT FIX: 이전 자동생성 FC(fc-orphan-*) 정리 + orphan L3Function 삭제 ★★★
      {
        // 1단계: 이전 실행에서 자동생성된 fc-orphan-* FC/FL/RA 삭제
        const autoFcs = await tx.failureCause.findMany({
          where: { fmeaId, id: { startsWith: 'fc-orphan-' } },
          select: { id: true },
        });
        if (autoFcs.length > 0) {
          const autoFcIds = autoFcs.map((f: { id: string }) => f.id);
          await tx.riskAnalysis.deleteMany({ where: { failureLink: { fcId: { in: autoFcIds }, fmeaId } } });
          await tx.failureLink.deleteMany({ where: { fcId: { in: autoFcIds }, fmeaId } });
          await tx.failureCause.deleteMany({ where: { id: { in: autoFcIds } } });
          console.info(`[rebuild-atomic] 자동생성 FC 정리: ${autoFcIds.length}건`);
        }

        // 2단계: FC.l3FuncId → FC.l3StructId 정합성 교정 + orphan L3Function 삭제
        const allL3Funcs = await tx.l3Function.findMany({
          where: { fmeaId },
          select: { id: true, l3StructId: true },
        });
        const allFcsForOrphan = await tx.failureCause.findMany({
          where: { fmeaId },
          select: { id: true, l3FuncId: true, l3StructId: true },
        });

        // 2-A: FC.l3FuncId가 FC.l3StructId의 L3Function을 가리키지 않는 경우 재배정
        const l3FuncsByStruct = new Map<string, string[]>();
        for (const f of allL3Funcs) {
          const arr = l3FuncsByStruct.get(f.l3StructId) || [];
          arr.push(f.id);
          l3FuncsByStruct.set(f.l3StructId, arr);
        }
        const l3FuncToStruct = new Map(allL3Funcs.map((f: any) => [f.id, f.l3StructId]));

        let reassigned = 0;
        for (const fc of allFcsForOrphan) {
          if (!fc.l3FuncId || !fc.l3StructId) continue;
          const funcStruct = l3FuncToStruct.get(fc.l3FuncId);
          if (funcStruct === fc.l3StructId) continue;
          const correctFuncs = l3FuncsByStruct.get(fc.l3StructId);
          if (correctFuncs && correctFuncs.length > 0) {
            await tx.failureCause.update({
              where: { id: fc.id },
              data: { l3FuncId: correctFuncs[0] },
            });
            reassigned++;
          }
        }
        if (reassigned > 0) {
          console.info(`[rebuild-atomic] FC→L3Function 재배정: ${reassigned}건 (l3StructId 정합성 교정)`);
        }

        // 2-B: orphan L3Function 삭제 (재배정 후 재계산)
        const allFcsAfter = await tx.failureCause.findMany({
          where: { fmeaId },
          select: { l3FuncId: true },
        });
        const linkedL3FuncIds = new Set(allFcsAfter.map((fc: { l3FuncId: string }) => fc.l3FuncId));

        const orphanIds: string[] = [];
        for (const f of allL3Funcs) {
          if (linkedL3FuncIds.has(f.id)) continue;
          orphanIds.push(f.id);
        }

        if (orphanIds.length > 0) {
          await tx.l3Function.deleteMany({ where: { id: { in: orphanIds } } });
          console.info(`[rebuild-atomic] orphan L3Function 삭제: ${orphanIds.length}건`);
        }

        // ★★★ 2026-03-20 ROOT FIX: 삭제 후 L3Function 없는 L3Structure에 폴백 재생성 ★★★
        {
          const remainL3Fs = await tx.l3Function.findMany({ where: { fmeaId }, select: { l3StructId: true } });
          const coveredL3s = new Set(remainL3Fs.map((f: { l3StructId: string }) => f.l3StructId));
          const allL3Structs = await tx.l3Structure.findMany({ where: { fmeaId }, select: { id: true, name: true, l2Id: true } });
          const missingL3s = allL3Structs.filter((s: any) => !coveredL3s.has(s.id));
          if (missingL3s.length > 0) {
            await tx.l3Function.createMany({
              data: missingL3s.map((s: any) => ({
                id: `${s.id}-L3F`,
                fmeaId,
                l3StructId: s.id,
                l2StructId: s.l2Id,
                functionName: s.name || '',
                processChar: s.name || 'N/A',
              })),
              skipDuplicates: true,
            });
            console.info(`[rebuild-atomic] L3Function 폴백 재생성: ${missingL3s.length}건`);
          }
        }

        // ★★★ 2026-03-20 ROOT FIX: emptyPC 최종 보정 — processChar 빈값 → functionName 또는 L3 name ★★★
        {
          const emptyPcFuncs = await tx.l3Function.findMany({
            where: { fmeaId, processChar: '' },
            select: { id: true, functionName: true, l3StructId: true },
          });
          for (const f of emptyPcFuncs) {
            const l3s = await tx.l3Structure.findUnique({ where: { id: f.l3StructId }, select: { name: true } });
            await tx.l3Function.update({
              where: { id: f.id },
              data: { processChar: f.functionName?.trim() || l3s?.name || 'N/A' },
            });
          }
          if (emptyPcFuncs.length > 0) {
            console.info(`[rebuild-atomic] emptyPC 보정: ${emptyPcFuncs.length}건`);
          }
        }

        // Legacy sync removed — Atomic DB is SSoT
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

    // 수복 후 최종 카운트 조회
    const [finalL2, finalL3, finalL1F, finalL2F, finalL3F, finalFE, finalFM, finalFC, finalFL, finalRA] = await Promise.all([
      prisma.l2Structure.count({ where: { fmeaId } }),
      prisma.l3Structure.count({ where: { fmeaId } }),
      prisma.l1Function.count({ where: { fmeaId } }),
      prisma.l2Function.count({ where: { fmeaId } }),
      prisma.l3Function.count({ where: { fmeaId } }),
      prisma.failureEffect.count({ where: { fmeaId } }),
      prisma.failureMode.count({ where: { fmeaId } }),
      prisma.failureCause.count({ where: { fmeaId } }),
      prisma.failureLink.count({ where: { fmeaId } }),
      prisma.riskAnalysis.count({ where: { fmeaId } }),
    ]);

    return NextResponse.json({
      ok: true,
      fmeaId,
      schema,
      rebuilt: {
        l2Structures: finalL2,
        l3Structures: finalL3,
        l1Functions: finalL1F,
        l2Functions: finalL2F,
        l3Functions: finalL3F,
        failureEffects: finalFE,
        failureModes: finalFM,
        failureCauses: finalFC,
        failureLinks: finalFL,
        riskAnalyses: finalRA,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}


