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

// ─── STEP 0: 구조 복원 ──────────────────────────────────────
export async function fixStructure(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const l2Count = await prisma.l2Structure.count({ where: { fmeaId } });
  if (l2Count > 0) return fixed;

  // Atomic DB가 비어있으면 rebuild-atomic 시도
  try {
    const rebuildRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/fmea/rebuild-atomic?fmeaId=${encodeURIComponent(fmeaId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId }),
    });
    if (rebuildRes.ok) {
      const result = await rebuildRes.json();
      fixed.push(`rebuild-atomic: L2=${result.counts?.l2 || '?'} FM=${result.counts?.fm || '?'} FC=${result.counts?.fc || '?'}`);
    }
  } catch (err) {
    console.error('[fixStructure] rebuild-atomic 실패:', err);
  }

  // Legacy 동기화 확인
  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId }, select: { fmeaId: true } }).catch(() => null);
  if (!legacy) {
    try {
      const { syncAtomicToLegacy } = await import('@/lib/fmea-core/save-atomic');
      await syncAtomicToLegacy(prisma, fmeaId);
      fixed.push('Atomic → Legacy 동기화 완료');
    } catch (err) {
      console.error('[fixStructure] Legacy 동기화 실패:', err);
    }
  }

  return fixed;
}

// ─── STEP 1: UUID 수정 (폴백 L3Function 생성) ───────────────
export async function fixUuid(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const l3s = await prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, name: true, l2Id: true } });
  const l3Funcs = await prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, l3StructId: true } });

  const l3FuncByL3 = new Map<string, number>();
  for (const f of l3Funcs) l3FuncByL3.set(f.l3StructId, (l3FuncByL3.get(f.l3StructId) || 0) + 1);

  const missingData: Array<{ id: string; fmeaId: string; l3StructId: string; l2StructId: string; functionName: string; processChar: string }> = [];
  for (const l3 of l3s) {
    const name = ((l3 as any).name || '').trim();
    if (!name || name.includes('공정 선택 후')) continue;
    if ((l3FuncByL3.get(l3.id) || 0) === 0) {
      missingData.push({
        id: `${l3.id}-L3F`,
        fmeaId,
        l3StructId: l3.id,
        l2StructId: (l3 as any).l2Id || '',
        functionName: name,
        processChar: '',
      });
    }
  }

  if (missingData.length > 0) {
    try {
      await prisma.l3Function.createMany({ data: missingData, skipDuplicates: true });
      fixed.push(`L3Function 폴백 생성 ${missingData.length}건`);
    } catch (err) {
      console.error('[fixUuid] L3Function 폴백 생성 오류:', err);
    }
  }

  return fixed;
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
      await prisma.failureLink.delete({ where: { id: lk.id } }).catch(() => {});
      brokenDeleted++;
    }
  }
  if (brokenDeleted > 0) fixed.push(`깨진 FL 삭제 ${brokenDeleted}건`);

  // 미연결 FC → FL 자동생성
  const linkedFcIds = new Set(links.filter((lk: any) =>
    fcSet.has(lk.fcId) && fmSet.has(lk.fmId) && feSet.has(lk.feId)
  ).map((lk: any) => lk.fcId));

  const unlinkedFcs = fcs.filter((fc: any) => !linkedFcIds.has(fc.id));
  if (unlinkedFcs.length > 0) {
    const fmByL2 = new Map<string, any>();
    for (const fm of fms) { if (!fmByL2.has(fm.l2StructId)) fmByL2.set(fm.l2StructId, fm); }
    const feDefault = fes.length > 0 ? fes[0] : null;

    let created = 0;
    for (const fc of unlinkedFcs) {
      const fm = fmByL2.get(fc.l2StructId);
      if (!fm || !feDefault) continue;
      try {
        await prisma.failureLink.create({
          data: { id: `fl-autofix-${fc.id}`, fmeaId, fmId: fm.id, feId: feDefault.id, fcId: fc.id,
            fmText: fm.mode || '', fcText: fc.cause || '', feText: feDefault.effect || '' },
        });
        created++;
      } catch { /* duplicate */ }
    }
    if (created > 0) fixed.push(`미연결 FC→FL 자동생성 ${created}건`);
  }

  // RA 없는 FL에 RiskAnalysis 자동생성
  const ras = await prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { linkId: true } });
  const raLinkIds = new Set(ras.map((ra: any) => ra.linkId));
  const currentLinks = await prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fmId: true, fcId: true } });
  const missingRaLinks = currentLinks.filter((fl: any) => !raLinkIds.has(fl.id));

  if (missingRaLinks.length > 0) {
    const raData = missingRaLinks.map((fl: any) => ({
      id: `ra-${fl.id}`, fmeaId, linkId: fl.id,
      severity: 0, occurrence: 0, detection: 0, ap: 'L',
      preventionControl: null, detectionControl: null,
    }));
    try {
      await prisma.riskAnalysis.createMany({ data: raData, skipDuplicates: true });
      fixed.push(`누락 RA 자동생성 ${raData.length}건`);
    } catch (err) {
      console.error('[fixFk] RA 자동생성 오류:', err);
    }
  }

  return fixed;
}

// ─── STEP 4: 누락 데이터 자동수정 ────────────────────────────
export async function fixMissing(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  // ★★★ 2026-03-20: emptyPC 자동수정 — processChar 빈값 → functionName 또는 L3 name ★★★
  {
    const emptyPcFuncs = await prisma.l3Function.findMany({
      where: { fmeaId, processChar: '' },
      select: { id: true, functionName: true, l3StructId: true },
    });
    for (const f of emptyPcFuncs) {
      const l3s = await prisma.l3Structure.findUnique({ where: { id: f.l3StructId }, select: { name: true } }).catch(() => null);
      await prisma.l3Function.update({
        where: { id: f.id },
        data: { processChar: f.functionName?.trim() || l3s?.name || 'N/A' },
      }).catch(() => {});
    }
    if (emptyPcFuncs.length > 0) {
      fixed.push(`emptyPC 보정 ${emptyPcFuncs.length}건`);
    }

    // L3Structure에 L3Function이 없는 경우 폴백 생성
    const allL3s = await prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, name: true, l2Id: true } });
    const coveredL3s = new Set(
      (await prisma.l3Function.findMany({ where: { fmeaId }, select: { l3StructId: true } }))
        .map((f: any) => f.l3StructId)
    );
    const missingL3s = allL3s.filter((s: any) => !coveredL3s.has(s.id));
    if (missingL3s.length > 0) {
      for (const s of missingL3s) {
        await prisma.l3Function.create({
          data: {
            id: `${s.id}-L3F`,
            fmeaId,
            l3StructId: s.id,
            l2StructId: s.l2Id,
            functionName: s.name || '',
            processChar: s.name || 'N/A',
          },
        }).catch(() => {});
      }
      fixed.push(`L3Function 폴백 생성 ${missingL3s.length}건`);
    }
  }

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
    await prisma.optimization.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
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
      }).catch(() => {});
    }
  }

  if (dcFilled > 0) fixed.push(`DC 자동채움 ${dcFilled}건`);
  if (pcFilled > 0) fixed.push(`PC 자동채움 ${pcFilled}건`);
  if (oFilled > 0) fixed.push(`O 자동채움 ${oFilled}건`);
  if (dFilled > 0) fixed.push(`D 자동채움 ${dFilled}건`);
  if (apFixed > 0) fixed.push(`AP 재계산 ${apFixed}건`);

  return fixed;
}
