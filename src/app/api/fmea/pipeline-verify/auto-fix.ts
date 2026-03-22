/**
 * @file auto-fix.ts
 * 파이프라인 자동수정 함수 — STEP 0~4 각 단계 수정 로직
 *
 * STEP 0: rebuild-atomic (구조 복원)
 * STEP 1: UUID 폴백 L3Function 생성
 * STEP 2: fmeaId 리매핑 (해당 시 — 현재 미구현, 수동 대응)
 * STEP 3: FK 깨진 링크 삭제 + 미연결 FC→FL 자동생성
 * STEP 4: 누락 데이터 보충 (DC/PC/SOD 피어 채움, orphanOpt 삭제, RA 자동생성)
 */

import { getPrisma } from '@/lib/prisma';
import { calcAPServer } from './verify-steps';

/** `1` 이면 L2=0일 때도 rebuild-atomic 호출 안 함 — FK 수선·재import 우선 (repair-fk) */
function isRebuildAtomicDisabled(): boolean {
  return (
    process.env.DISABLE_REBUILD_ATOMIC === '1' ||
    process.env.FMEA_REPAIR_NO_REBUILD === '1'
  );
}

// ─── STEP 0: 구조 확인 (rebuild-atomic 호출 완전 제거 — 리매핑으로 처리) ─────
export async function fixStructure(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const l2Count = await prisma.l2Structure.count({ where: { fmeaId } });
  if (l2Count === 0) {
    fixed.push('L2Structure 없음 — Import 먼저 실행하세요 (save-position-import)');
    return fixed;
  }

  // ★ rebuild-atomic 호출 완전 제거 (위치기반 데이터 소실 방지)
  // 위치기반 프로젝트는 processCharId 리매핑만으로 충분
  const POS_UUID = /^L3-R\d+$/;
  const sampleL3 = await prisma.l3Structure.findFirst({ where: { fmeaId }, select: { id: true } });
  if (sampleL3 && POS_UUID.test(sampleL3.id)) {
    // ★ 위치기반: L3Function=0이면 repair-l3 API 호출 (즉시 복구)
    const l3FuncCount = await prisma.l3Function.count({ where: { fmeaId } });
    if (l3FuncCount === 0) {
      try {
        const repairRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/fmea/repair-l3?fmeaId=${encodeURIComponent(fmeaId)}`, { method: 'POST' });
        if (repairRes.ok) {
          const r = await repairRes.json();
          fixed.push(`L3Function 자동복구: ${r.after?.l3f || 0}건 생성 (${r.repairs?.join(', ') || ''})`);
        }
      } catch (e) { console.error('[fixStructure] repair-l3 실패:', e); }
    }
    // 위치기반: RA 보완 + processCharId 리매핑
    const allFLs = await prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true } });
    const existingRaLinkIds = new Set(
      (await prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { linkId: true } })).map((r: { linkId: string }) => r.linkId)
    );
    const missingRaFLs = allFLs.filter((fl: { id: string }) => !existingRaLinkIds.has(fl.id));
    if (missingRaFLs.length > 0) {
      const now = new Date();
      await prisma.riskAnalysis.createMany({
        skipDuplicates: true,
        data: missingRaFLs.map((fl: { id: string }) => ({
          id: `${fl.id}-RA`, fmeaId, linkId: fl.id,
          severity: 1, occurrence: 1, detection: 1, ap: 'L', createdAt: now, updatedAt: now,
        })),
      });
      fixed.push(`위치기반 RA 보완: ${missingRaFLs.length}건 (영구저장)`);
    }
    // processCharId 리매핑
    const fcsNull = await prisma.failureCause.findMany({ where: { fmeaId, processCharId: null }, select: { id: true, l3FuncId: true } });
    let remapped = 0;
    for (const fc of fcsNull) {
      if (fc.l3FuncId) {
        await prisma.failureCause.update({ where: { id: fc.id }, data: { processCharId: fc.l3FuncId } });
        remapped++;
      }
    }
    if (remapped > 0) fixed.push(`processCharId 리매핑: ${remapped}건 (영구저장)`);
  }

  return fixed;
}

// ─── STEP 1: UUID 검증 (폴백 생성 제거 — DB 원본 유지) ───────────────
export async function fixUuid(_prisma: any, _fmeaId: string): Promise<string[]> {
  return [];
}

// ─── STEP 3: FK 수정 ─────────────────────────────────────────
export async function fixFk(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const [fcs, links, fms, fes] = await Promise.all([
    prisma.failureCause.findMany({ where: { fmeaId } }),
    prisma.failureLink.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureEffect.findMany({ where: { fmeaId } }),
  ]);

  const fcSet = new Set(fcs.map((f: any) => f.id));
  const fmSet = new Set(fms.map((f: any) => f.id));
  const feSet = new Set(fes.map((f: any) => f.id));

  // 깨진 FK 삭제
  let brokenDeleted = 0;
  for (const lk of links) {
    if (!fcSet.has(lk.fcId) || !fmSet.has(lk.fmId) || !feSet.has(lk.feId)) {
      await prisma.failureLink.delete({ where: { id: lk.id } }).catch((e: unknown) => console.error(`[fixFk] FL 삭제 실패 id=${lk.id}:`, e));
      brokenDeleted++;
    }
  }
  if (brokenDeleted > 0) fixed.push(`깨진 FL 삭제 ${brokenDeleted}건`);

  // ★ 2026-03-20: 미연결 FC→FL 자동생성 / RA 자동생성 제거 — no-fallback 원칙

  return fixed;
}

// ─── STEP 4: 누락 데이터 자동수정 ────────────────────────────
export async function fixMissing(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  // ★ 2026-03-20: emptyPC 보정/L3Function 폴백 생성 제거 — DB 원본 유지

  const [ras, fls, opts] = await Promise.all([
    prisma.riskAnalysis.findMany({ where: { fmeaId } }),
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fmId: true, fcId: true } }),
    prisma.optimization.findMany({ where: { fmeaId }, select: { id: true, riskId: true } }),
  ]);

  const raSet = new Set(ras.map((ra: any) => ra.id));
  const flById = new Map<string, { fmId: string; fcId: string }>();
  for (const fl of fls) flById.set(fl.id, { fmId: fl.fmId, fcId: fl.fcId });

  // Opt → RA FK 고아 삭제
  const orphanOpts = opts.filter((o: any) => !raSet.has(o.riskId));
  if (orphanOpts.length > 0) {
    const ids = orphanOpts.map((o: any) => o.id);
    await prisma.optimization.deleteMany({ where: { id: { in: ids } } }).catch((e: unknown) => console.error(`[fixMissing] Opt 고아 삭제 실패:`, e));
    fixed.push(`Opt FK 고아 삭제 ${orphanOpts.length}건`);
  }

  // DC/PC 피어 채움 (동일 FM 그룹의 최빈값)
  const fmPeerDC = new Map<string, string[]>();
  const fmPeerPC = new Map<string, string[]>();
  const fmPeerO = new Map<string, number[]>();
  const fmPeerD = new Map<string, number[]>();
  const fmToProcessNo = new Map<string, string>();

  for (const ra of ras) {
    const fl = flById.get(ra.linkId);
    if (!fl) continue;
    if (ra.detectionControl?.trim()) {
      if (!fmPeerDC.has(fl.fmId)) fmPeerDC.set(fl.fmId, []);
      fmPeerDC.get(fl.fmId)!.push(ra.detectionControl.trim());
    }
    if (ra.preventionControl?.trim()) {
      if (!fmPeerPC.has(fl.fmId)) fmPeerPC.set(fl.fmId, []);
      fmPeerPC.get(fl.fmId)!.push(ra.preventionControl.trim());
    }
    if (ra.occurrence > 0) {
      if (!fmPeerO.has(fl.fmId)) fmPeerO.set(fl.fmId, []);
      fmPeerO.get(fl.fmId)!.push(ra.occurrence);
    }
    if (ra.detection > 0) {
      if (!fmPeerD.has(fl.fmId)) fmPeerD.set(fl.fmId, []);
      fmPeerD.get(fl.fmId)!.push(ra.detection);
    }
  }

  // Peer 데이터가 모두 비어 있으면 public staging A6/B5에서 공정 단위 기본값을 읽는다.
  const publicPrisma = getPrisma();
  const dcByProcess = new Map<string, string>();
  const pcByProcess = new Map<string, string>();
  if (publicPrisma) {
    try {
      const dataset = await publicPrisma.pfmeaMasterDataset.findFirst({
        where: { fmeaId, isActive: true },
        select: { id: true },
      });
      if (dataset) {
        const [flatA6, flatB5, fms, l2s] = await Promise.all([
          publicPrisma.pfmeaMasterFlatItem.findMany({
            where: { datasetId: dataset.id, itemCode: 'A6' },
            select: { processNo: true, value: true },
          }),
          publicPrisma.pfmeaMasterFlatItem.findMany({
            where: { datasetId: dataset.id, itemCode: 'B5' },
            select: { processNo: true, value: true },
          }),
          prisma.failureMode.findMany({
            where: { fmeaId },
            select: { id: true, l2StructId: true },
          }),
          prisma.l2Structure.findMany({
            where: { fmeaId },
            select: { id: true, no: true },
          }),
        ]);

        const l2NoById = new Map<string, string>();
        for (const l2 of l2s) {
          if (l2?.id && l2?.no) l2NoById.set(l2.id, String(parseInt(String(l2.no), 10)));
        }
        for (const fm of fms) {
          const pNo = l2NoById.get(fm.l2StructId || '') || '';
          if (pNo) fmToProcessNo.set(fm.id, pNo);
        }
        for (const a6 of flatA6) {
          const pNo = String(parseInt(String(a6.processNo || ''), 10));
          if (pNo && !dcByProcess.has(pNo) && a6.value?.trim()) dcByProcess.set(pNo, a6.value.trim());
        }
        for (const b5 of flatB5) {
          const pNo = String(parseInt(String(b5.processNo || ''), 10));
          if (pNo && !pcByProcess.has(pNo) && b5.value?.trim()) pcByProcess.set(pNo, b5.value.trim());
        }
      }
    } catch (e) {
      console.error('[fixMissing] public A6/B5 fallback 조회 실패:', e);
    }
  }

  const mostFrequent = (arr: string[]) => {
    if (arr.length === 0) return '';
    const freq = new Map<string, number>();
    for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
    let best = arr[0], bestCount = 0;
    for (const [k, c] of freq) { if (c > bestCount) { best = k; bestCount = c; } }
    return best;
  };

  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  let dcFilled = 0, pcFilled = 0, oFilled = 0, dFilled = 0, apFixed = 0;

  for (const ra of ras) {
    const fl = flById.get(ra.linkId);
    if (!fl) continue;

    let needsUpdate = false;
    let newO = ra.occurrence;
    let newD = ra.detection;
    let newDC = ra.detectionControl || '';
    let newPC = ra.preventionControl || '';

    if (!newDC.trim()) {
      const peer = mostFrequent(fmPeerDC.get(fl.fmId) || []);
      const fallback = dcByProcess.get(fmToProcessNo.get(fl.fmId) || '') || '';
      if (peer || fallback) {
        newDC = peer || fallback;
        needsUpdate = true;
        dcFilled++;
      }
    }
    if (!newPC.trim()) {
      const peer = mostFrequent(fmPeerPC.get(fl.fmId) || []);
      const fallback = pcByProcess.get(fmToProcessNo.get(fl.fmId) || '') || '';
      if (peer || fallback) {
        newPC = peer || fallback;
        needsUpdate = true;
        pcFilled++;
      }
    }
    if (!ra.occurrence || ra.occurrence <= 0) {
      newO = median(fmPeerO.get(fl.fmId) || []) || 1;
      needsUpdate = true; oFilled++;
    }
    if (!ra.detection || ra.detection <= 0) {
      newD = median(fmPeerD.get(fl.fmId) || []) || 1;
      needsUpdate = true; dFilled++;
    }

    const newAP = calcAPServer(ra.severity || 1, newO, newD);
    if (newAP && newAP !== ra.ap) { needsUpdate = true; apFixed++; }

    if (needsUpdate) {
      await prisma.riskAnalysis.update({
        where: { id: ra.id },
        data: {
          occurrence: newO, detection: newD,
          ap: newAP || ra.ap || 'L',
          ...(newDC.trim() ? { detectionControl: newDC } : {}),
          ...(newPC.trim() ? { preventionControl: newPC } : {}),
        },
      }).catch((e: unknown) => console.error(`[fixMissing] RA 업데이트 실패 id=${ra.id}:`, e));
    }
  }

  if (dcFilled > 0) fixed.push(`DC 자동채움 ${dcFilled}건`);
  if (pcFilled > 0) fixed.push(`PC 자동채움 ${pcFilled}건`);
  if (oFilled > 0) fixed.push(`O 자동채움 ${oFilled}건`);
  if (dFilled > 0) fixed.push(`D 자동채움 ${dFilled}건`);
  if (apFixed > 0) fixed.push(`AP 재계산 ${apFixed}건`);

  return fixed;
}
