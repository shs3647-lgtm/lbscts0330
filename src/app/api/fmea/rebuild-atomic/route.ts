// ██████████████████████████████████████████████████████████████████████████████
// ██  CODEFREEZE — 중복제거(dedup) 규칙 영구 보호 (2026-03-21)                  ██
// ██                                                                            ██
// ██  이 파일의 dedup 로직을 수정하려면 사용자에게 아래 문구로 허락을 받아야 합니다: ██
// ██  "rebuild-atomic dedup 공정번호 기반 중복제거 CODEFREEZE 해제를 허락합니다"   ██
// ██                                                                            ██
// ██  ═══ 중복제거 핵심 원칙 (절대 위반 금지) ═══                                ██
// ██                                                                            ██
// ██  1. 모든 dedup key에 공정번호(l2StructId) 필수 포함                          ██
// ██     - 공정이 다르면 동일 이름의 FC/FM/FE/L3F도 별개 엔티티                   ██
// ██     - 예: 공정10 "작업숙련도부족" ≠ 공정20 "작업숙련도부족"                   ██
// ██                                                                            ██
// ██  2. FC dedup key = l2StructId + l3StructId + cause                          ██
// ██     - 같은 공정이라도 다른 WE의 동일 원인은 별개                              ██
// ██     - MN(작업자)은 모든 공정에 배치 → 모든 공정별 독립 FC                     ██
// ██                                                                            ██
// ██  3. FailureLink dedup key = fmId + fcId + feId (3요소 완전일치)              ██
// ██     - 같은 FM+FC라도 다른 FE에 연결되면 별개 FailureLink                     ██
// ██     - feId 누락 시 유효한 고장사슬 삭제 → 워크시트 빈칸 발생                  ██
// ██                                                                            ██
// ██  4. L1 dedup key에 구분(C1 category) 필수 포함                              ██
// ██     - 구분+요구사항, 구분+완제품기능, 구분+고장영향으로 중복 검증              ██
// ██                                                                            ██
// ██  5. 단어만 보고 중복삭제 절대 금지                                           ██
// ██     - 모든 중복 판단은 공정번호/구분과 매칭해서 검증                          ██
// ██     - 이 원칙 위반이 마스터 데이터 Import 시 반복적 누락의 근본 원인          ██
// ██                                                                            ██
// ██████████████████████████████████████████████████████████████████████████████
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
          // Cascade: Optimization → RiskAnalysis → FailureLink
          const invalidRAs = await tx.riskAnalysis.findMany({
            where: { fmeaId, linkId: { in: invalidLinkIds } },
            select: { id: true },
          });
          const invalidRaIds = invalidRAs.map((r: { id: string }) => r.id);
          if (invalidRaIds.length > 0) {
            await tx.optimization.deleteMany({ where: { fmeaId, riskId: { in: invalidRaIds } } });
          }
          await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: invalidLinkIds } } });
          await tx.failureLink.deleteMany({ where: { id: { in: invalidLinkIds } } });
          console.warn(`[rebuild-atomic] FailureLink FK 검증: ${invalidLinkIds.length}건 무효 삭제 (Opt/RA 연쇄 정리)`);
        }
      }
      // ██████████████████████████████████████████████████████████████████████████
      // ██  CODEFREEZE — FL 중복제거 규칙 (2026-03-21)                          ██
      // ██  이 블록을 수정하려면 사용자에게 다음 문구로 허락을 받아야 합니다:       ██
      // ██  "FL dedup 공정번호 기반 중복제거 CODEFREEZE 해제를 허락합니다"         ██
      // ██                                                                      ██
      // ██  핵심 원칙:                                                           ██
      // ██  1. FL dedup key = fmId|fcId|feId (3요소 모두 포함)                    ██
      // ██  2. 같은 FM+FC라도 다른 FE에 연결되면 별개 FL (N:1:N 관계)             ██
      // ██  3. 공정이 다르면 동일 이름의 FM/FC/FE도 별개 엔티티                   ██
      // ██  4. MN(작업자) 등 모든 공정 공통 요소도 공정별 독립 유지                ██
      // ██                                                                      ██
      // ██  위반 시: 고장사슬 누락 → 워크시트 렌더링 빈칸 → 사용자 데이터 손실     ██
      // ██████████████████████████████████████████████████████████████████████████
      {
        const allFLsForDedup = await tx.failureLink.findMany({
          where: { fmeaId },
          select: { id: true, fmId: true, feId: true, fcId: true },
        });
        // ★ dedup key = fmId|fcId|feId — 3요소 모두 동일해야만 진정한 중복
        // ★ fmId|fcId만으로 dedup하면 다른 FE에 연결된 유효한 체인이 삭제됨
        const flGroups = new Map<string, string[]>();
        for (const fl of allFLsForDedup) {
          const key = `${fl.fmId}|${fl.fcId}|${fl.feId}`;
          if (!flGroups.has(key)) flGroups.set(key, []);
          flGroups.get(key)!.push(fl.id);
        }
        const dupFlIds: string[] = [];
        for (const [, ids] of flGroups) {
          if (ids.length <= 1) continue;
          // 완전 동일 FL(fmId+fcId+feId 모두 같음)만 중복 — 첫 번째 보존
          for (let i = 1; i < ids.length; i++) {
            dupFlIds.push(ids[i]);
          }
        }
        if (dupFlIds.length > 0) {
          // Cascade: Optimization → RiskAnalysis → FailureLink
          const dupFlRAs = await tx.riskAnalysis.findMany({
            where: { fmeaId, linkId: { in: dupFlIds } },
            select: { id: true },
          });
          const dupFlRaIds = dupFlRAs.map((r: { id: string }) => r.id);
          if (dupFlRaIds.length > 0) {
            await tx.optimization.deleteMany({ where: { fmeaId, riskId: { in: dupFlRaIds } } });
          }
          await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: dupFlIds } } });
          await tx.failureLink.deleteMany({ where: { id: { in: dupFlIds } } });
          console.warn(`[rebuild-atomic] FL dedup (fmId+fcId+feId 완전일치): ${dupFlIds.length}건 제거`);
        }
      }

      // ██████████████████████████████████████████████████████████████████████████
      // ██  CODEFREEZE — FC 중복제거 규칙 (2026-03-21)                          ██
      // ██  이 블록을 수정하려면 사용자에게 다음 문구로 허락을 받아야 합니다:       ██
      // ██  "FC dedup 공정번호 기반 중복제거 CODEFREEZE 해제를 허락합니다"         ██
      // ██                                                                      ██
      // ██  핵심 원칙:                                                           ██
      // ██  1. FC dedup key = l2StructId(공정) + l3StructId(WE) + cause(원인)    ██
      // ██  2. 공정이 다르면 동일 원인명도 별개 FC (예: 모든 공정의 "작업숙련도부족") ██
      // ██  3. 같은 공정이라도 다른 WE의 동일 원인은 별개 FC                       ██
      // ██  4. 단어만 보고 중복삭제 절대 금지 — 반드시 공정번호+WE 포함            ██
      // ██                                                                      ██
      // ██  위반 시: FC 누락 → FailureLink 끊김 → 워크시트 고장원인 빈칸          ██
      // ██████████████████████████████████████████████████████████████████████████
      {
        const fcsByKey = new Map<string, string[]>();
        const allFcsForDedup = await tx.failureCause.findMany({
          where: { fmeaId },
          select: { id: true, cause: true, l2StructId: true, l3StructId: true },
        });
        for (const fc of allFcsForDedup) {
          // ★ key = l2StructId(공정번호) + l3StructId(WE) + cause(원인명)
          // ★ 공정번호 없이 cause만으로 dedup하면 다른 공정의 동일 원인이 삭제됨
          // ★ 예: 공정10 "작업숙련도부족" ≠ 공정20 "작업숙련도부족" (별개 FC)
          const key = `${(fc as any).l2StructId}|${(fc as any).l3StructId || ''}|${(fc as any).cause}`;
          if (!fcsByKey.has(key)) fcsByKey.set(key, []);
          fcsByKey.get(key)!.push((fc as any).id);
        }
        const dupFcIds: string[] = [];
        // ★★★ 2026-03-20: FC별 FailureLink 수 카운트 — 가장 많이 참조된 FC를 보존 ★★★
        // 비유: 여러 부서(FM)와 연결된 핵심 인재(FC)를 해고하면 안 된다. 가장 많이 연결된 FC를 보존.
        const allFlsForCount = await tx.failureLink.findMany({ where: { fmeaId }, select: { fcId: true } });
        const fcLinkCount = new Map<string, number>();
        for (const fl of allFlsForCount) {
          fcLinkCount.set(fl.fcId, (fcLinkCount.get(fl.fcId) || 0) + 1);
        }

        for (const [, ids] of fcsByKey) {
          if (ids.length > 1) {
            // Sort by link count descending — keep the FC with the most FailureLinks
            const sorted = [...ids].sort((a, b) => (fcLinkCount.get(b) || 0) - (fcLinkCount.get(a) || 0));
            // Keep the first (most-linked), delete the rest
            dupFcIds.push(...sorted.slice(1));
          }
        }
        if (dupFcIds.length > 0) {
          // Cascade: Optimization → RiskAnalysis → FailureLink → FailureCause
          const dupFcFLs = await tx.failureLink.findMany({
            where: { fmeaId, fcId: { in: dupFcIds } },
            select: { id: true },
          });
          const dupFlIds = dupFcFLs.map((l: { id: string }) => l.id);
          if (dupFlIds.length > 0) {
            const dupRAs = await tx.riskAnalysis.findMany({
              where: { fmeaId, linkId: { in: dupFlIds } },
              select: { id: true },
            });
            const dupRaIds = dupRAs.map((r: { id: string }) => r.id);
            if (dupRaIds.length > 0) {
              await tx.optimization.deleteMany({ where: { fmeaId, riskId: { in: dupRaIds } } });
            }
            await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: dupFlIds } } });
            await tx.failureLink.deleteMany({ where: { id: { in: dupFlIds } } });
          }
          await tx.failureCause.deleteMany({ where: { id: { in: dupFcIds } } });
          console.warn(`[rebuild-atomic] FC dedup: ${dupFcIds.length} duplicates removed`);
        }
      }

      // ★ 2026-03-20: 미연결 FC→FL, RA 부족 시 보충 로직 제거 (no-fallback 원칙)
      // Import 파이프라인에서 정확하게 생성된 데이터만 유지한다.
      // 미연결 FC가 있으면 경고만 출력한다.
      {
        const linkedFcIds = new Set(
          (await tx.failureLink.findMany({ where: { fmeaId }, select: { fcId: true } }))
            .map((l: any) => l.fcId)
        );
        const allFcsNow = await tx.failureCause.findMany({ where: { fmeaId }, select: { id: true, cause: true } });
        const unlinkedFcs = allFcsNow.filter((fc: any) => !linkedFcIds.has(fc.id));
        if (unlinkedFcs.length > 0) {
          console.warn(`[rebuild-atomic] 미연결 FC ${unlinkedFcs.length}건 감지 (자동생성 없음 — Import 데이터 점검 필요)`);
        }
      }

      // RA 부족 여부 경고 (자동 보충 없음)
      const savedLinks = await tx.failureLink.findMany({
        where: { fmeaId },
        select: { id: true },
      });
      const raCount = await tx.riskAnalysis.count({ where: { fmeaId } });
      if (raCount < savedLinks.length && savedLinks.length > 0) {
        console.warn(`[rebuild-atomic] RA 부족: FL=${savedLinks.length} RA=${raCount} (자동 보충 없음)`);
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
              { preventionControl: '' },
              { detectionControl: null },
              { detectionControl: '' },
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
          const emptyRALinkIds = new Set(emptyRAs.map((r: any) => r.linkId));
          for (const sfl of siblingFLs) {
            // 자기 자신(emptyRA)의 FL은 제외
            if (emptyRALinkIds.has(sfl.id)) continue;
            const sra = await tx.riskAnalysis.findFirst({
              where: { linkId: sfl.id, fmeaId },
            });
            if (!sra) continue;
            const existing = siblingRAMap.get(sfl.fcId);
            // DC/PC 있는 형제를 우선 선택
            const hasGoodData = !!(sra.detectionControl?.trim() && sra.preventionControl?.trim());
            const existingHasGood = existing ? !!(existing.detectionControl?.trim() && existing.preventionControl?.trim()) : false;
            if (!existing || (hasGoodData && !existingHasGood) || ((sra.severity || 0) > 0 && !(existing.severity > 0))) {
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
            if (!arr || arr.length === 0) return { s: 1, o: 1, d: 1 };
            const valid = arr.filter(x => x.s > 0 && x.o > 0 && x.d > 0);
            if (valid.length === 0) return { s: 1, o: 1, d: 1 };
            const sorted = [...valid].sort((a, b) => (a.s + a.o + a.d) - (b.s + b.o + b.d));
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
              const sev = ra.severity > 0 ? ra.severity : Math.max(1, peerS.s || (feMapEnrich.get(feId)?.severity ?? 1));
              const occ = ra.occurrence > 0 ? ra.occurrence : Math.max(1, peerS.o);
              const det = ra.detection > 0 ? ra.detection : Math.max(1, peerS.d);
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
              const feSev = feMapEnrich.get(feId)?.severity || 1;
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

      // ★ 고아 FC 정리: FL에 참조되지 않는 FC → 연쇄 삭제 (Optimization → RA → FL → FC)
      {
        const allFcIds = (await tx.failureCause.findMany({ where: { fmeaId }, select: { id: true } })).map((f: { id: string }) => f.id);
        const linkedFcIds = new Set(
          (await tx.failureLink.findMany({ where: { fmeaId }, select: { fcId: true } })).map((f: { fcId: string }) => f.fcId)
        );
        const orphanFcIds = allFcIds.filter((id: string) => !linkedFcIds.has(id));
        if (orphanFcIds.length > 0) {
          // Cascade delete: find FLs referencing orphan FCs (safety — should be 0 by definition)
          const orphanFcFLs = await tx.failureLink.findMany({
            where: { fmeaId, fcId: { in: orphanFcIds } },
            select: { id: true },
          });
          const orphanFlIds = orphanFcFLs.map((f: { id: string }) => f.id);

          if (orphanFlIds.length > 0) {
            // Delete Optimizations → RiskAnalyses → FailureLinks (reverse FK order)
            const orphanRAs = await tx.riskAnalysis.findMany({
              where: { fmeaId, linkId: { in: orphanFlIds } },
              select: { id: true },
            });
            const orphanRaIds = orphanRAs.map((r: { id: string }) => r.id);
            if (orphanRaIds.length > 0) {
              await tx.optimization.deleteMany({ where: { fmeaId, riskId: { in: orphanRaIds } } });
            }
            await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: orphanFlIds } } });
            await tx.failureLink.deleteMany({ where: { id: { in: orphanFlIds } } });
            console.info(`[rebuild-atomic] 고아 FC 연쇄 삭제: FL=${orphanFlIds.length} RA=${orphanRaIds.length} Opt 정리 완료`);
          }

          await tx.failureCause.deleteMany({ where: { id: { in: orphanFcIds } } });
          console.info(`[rebuild-atomic] 고아 FC 삭제: ${orphanFcIds.length}건 (FL에 미참조)`);
        }
      }

      // FK 정합성 교정 (자동생성 없이 기존 데이터만 교정)
      {

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

        // ★ 2026-03-20: L3Function 폴백 재생성/emptyPC 보정 제거 — Atomic DB 원본 유지

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


