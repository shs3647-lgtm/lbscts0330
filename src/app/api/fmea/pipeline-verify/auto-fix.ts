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

import { calcAPServer } from './verify-steps';

/** `1` 이면 L2=0일 때도 rebuild-atomic 호출 안 함 — FK 수선·재import 우선 (repair-fk) */
function isRebuildAtomicDisabled(): boolean {
  return (
    process.env.DISABLE_REBUILD_ATOMIC === '1' ||
    process.env.FMEA_REPAIR_NO_REBUILD === '1'
  );
}

// ─── STEP 0: 구조 복원 ──────────────────────────────────────
export async function fixStructure(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const l2Count = await prisma.l2Structure.count({ where: { fmeaId } });
  if (l2Count > 0) return fixed;

  if (isRebuildAtomicDisabled()) {
    fixed.push(
      'rebuild-atomic: 스킵 (DISABLE_REBUILD_ATOMIC=1 또는 FMEA_REPAIR_NO_REBUILD=1) — Import/repair-fk로 복구',
    );
    return fixed;
  }

  // Atomic DB가 비어있으면 rebuild-atomic 시도
  try {
    const rebuildRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/fmea/rebuild-atomic?fmeaId=${encodeURIComponent(fmeaId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId }),
    });
    if (rebuildRes.ok) {
      const result = await rebuildRes.json();
      const r = result.rebuilt || result.counts || {};
      fixed.push(`rebuild-atomic: L2=${r.l2Structures ?? r.l2 ?? '?'} FM=${r.failureModes ?? r.fm ?? '?'} FC=${r.failureCauses ?? r.fc ?? '?'}`);
    }
  } catch (err) {
    console.error('[fixStructure] rebuild-atomic 실패:', err);
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
      if (peer) { newDC = peer; needsUpdate = true; dcFilled++; }
    }
    if (!newPC.trim()) {
      const peer = mostFrequent(fmPeerPC.get(fl.fmId) || []);
      if (peer) { newPC = peer; needsUpdate = true; pcFilled++; }
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
