/**
 * @file master-chain-sync.ts
 * @description 워크시트 저장 시 마스터 failureChains(SOD 포함) 자동 동기화
 *
 * FMEAWorksheetDB → MasterFailureChain[] 추출 후
 * PfmeaMasterDataset.failureChains JSON 업데이트.
 *
 * route.ts(CODEFREEZE)를 수정하지 않고,
 * sync.ts의 upsertActiveMasterFromWorksheetTx에서 호출.
 *
 * @created 2026-03-17
 */
import type { FMEAWorksheetDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';

interface ChainEntry {
  id: string;
  processNo: string;
  m4?: string;
  workElement?: string;
  fmValue: string;
  fcValue: string;
  feValue: string;
  feSeverity?: number;
  feScope?: string;
  severity?: number;
  occurrence?: number;
  detection?: number;
  pcValue?: string;
  dcValue?: string;
  l2Function?: string;
  productChar?: string;
  l3Function?: string;
  processChar?: string;
  specialChar?: string;
}

/**
 * FMEAWorksheetDB에서 직접 failureChains를 추출 (genXxx ID 재매핑 없이)
 * SOD 값이 핵심 — 새 FMEA 생성 시 마스터 SOD를 참조하기 위함
 */
export function extractChainsFromWorksheet(db: FMEAWorksheetDB): ChainEntry[] {
  if (!db.failureLinks || db.failureLinks.length === 0) return [];

  const fmById = new Map(db.failureModes.map(fm => [fm.id, fm]));
  const feById = new Map(db.failureEffects.map(fe => [fe.id, fe]));
  const fcById = new Map(db.failureCauses.map(fc => [fc.id, fc]));
  const l2ById = new Map(db.l2Structures.map(l2 => [l2.id, l2]));
  const l3ById = new Map(db.l3Structures.map(l3 => [l3.id, l3]));
  const l2FuncById = new Map(db.l2Functions.map(f => [f.id, f]));
  const l3FuncById = new Map(db.l3Functions.map(f => [f.id, f]));

  const riskByLink = new Map<string, typeof db.riskAnalyses[0]>();
  for (const risk of db.riskAnalyses) {
    if (!riskByLink.has(risk.linkId)) riskByLink.set(risk.linkId, risk);
  }

  const chains: ChainEntry[] = [];

  for (const link of db.failureLinks) {
    const fm = fmById.get(link.fmId);
    const fe = feById.get(link.feId);
    const fc = fcById.get(link.fcId);
    if (!fm || !fe || !fc) continue;

    const l2 = l2ById.get(fm.l2StructId);
    const l3 = l3ById.get(fc.l3StructId);
    const risk = riskByLink.get(link.id);
    const l2Func = l2FuncById.get(fm.l2FuncId);
    const l3Func = l3FuncById.get(fc.l3FuncId);

    chains.push({
      id: link.id,
      processNo: l2?.no || '',
      m4: l3?.m4 || undefined,
      workElement: l3?.name || undefined,
      fmValue: fm.mode,
      fcValue: fc.cause,
      feValue: fe.effect,
      feSeverity: fe.severity,
      feScope: fe.category,
      severity: risk?.severity,
      occurrence: risk?.occurrence,
      detection: risk?.detection,
      pcValue: risk?.preventionControl || undefined,
      dcValue: risk?.detectionControl || undefined,
      l2Function: l2Func?.functionName || undefined,
      productChar: l2Func?.productChar || undefined,
      l3Function: l3Func?.functionName || undefined,
      processChar: l3Func?.processChar || undefined,
      specialChar: l2Func?.specialChar || l3Func?.specialChar || undefined,
    });
  }

  return chains;
}

/**
 * PfmeaMasterDataset.failureChains를 최신 SOD로 업데이트
 * upsertActiveMasterFromWorksheetTx 내에서 호출 (같은 트랜잭션)
 */
export async function syncMasterChainsInTx(
  tx: any,
  db: FMEAWorksheetDB,
): Promise<number> {
  const chains = extractChainsFromWorksheet(db);
  if (chains.length === 0) return 0;

  const fmeaId = db.fmeaId || '';
  if (!fmeaId) return 0;

  try {
    const ds = await tx.pfmeaMasterDataset.findFirst({
      where: { fmeaId, isActive: true },
    });
    if (!ds) return 0;

    await tx.pfmeaMasterDataset.update({
      where: { id: ds.id },
      data: {
        failureChains: chains as any,
        updatedAt: new Date(),
      },
    });

    return chains.length;
  } catch (err: any) {
    if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
      return 0;
    }
    throw err;
  }
}
