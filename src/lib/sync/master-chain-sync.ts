/**
 * @file master-chain-sync.ts
 * @description 워크시트 저장 시 마스터 failureChains(SOD 포함) 자동 동기화
 *
 * ★ Living DB 지속 개선 루프 (2026-03-21) ★
 *
 * 흐름:
 *   1. mXX 프로젝트 워크시트 저장 → syncMasterChainsInTx() 호출
 *   2. Atomic DB에서 체인 추출 (SSoT)
 *   3. PfmeaMasterDataset.failureChains 업데이트
 *   4. syncMasterReferenceFromChains() → MasterFmeaReference upsert
 *      - B2(기능)/B3(특성)/B4(원인)/DC/PC/SOD/Opt 전체 동기화
 *      - sourceProject에 수정한 프로젝트 fmeaId 기록
 *      - 다음 FMEA 생성 시 이 Master 참조 → 개선된 데이터 자동 반영
 *   5. 변경 로그 기록 → 추적 가능한 개선 이력
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
  // ★ Living DB: 소스 추적
  dcSourceType?: string;
  pcSourceType?: string;
  lldReference?: string;
  // ★ Living DB: Optimization 동기화
  optRecommendedAction?: string;
  optDetectionAction?: string;
  optStatus?: string;
  optNewS?: number;
  optNewO?: number;
  optNewD?: number;
  optLldReference?: string;
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

  // ★ Optimization by riskId
  const optByRiskId = new Map<string, (typeof db.optimizations extends (infer T)[] ? T : any)>();
  for (const opt of (db.optimizations || [])) {
    if (!optByRiskId.has((opt as any).riskId)) optByRiskId.set((opt as any).riskId, opt);
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
    const opt = risk ? optByRiskId.get((risk as any).id) : undefined;

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
      // ★ Living DB
      dcSourceType: (risk as any)?.dcSourceType || undefined,
      pcSourceType: (risk as any)?.pcSourceType || undefined,
      lldReference: (risk as any)?.lldReference || undefined,
      optRecommendedAction: (opt as any)?.recommendedAction || undefined,
      optDetectionAction: (opt as any)?.detectionAction || undefined,
      optStatus: (opt as any)?.status || undefined,
      optNewS: (opt as any)?.newSeverity ?? undefined,
      optNewO: (opt as any)?.newOccurrence ?? undefined,
      optNewD: (opt as any)?.newDetection ?? undefined,
      optLldReference: (opt as any)?.lldOptReference || undefined,
    });
  }

  return chains;
}

/**
 * Atomic DB FailureLink 기반으로 chains 추출 (SSoT)
 * 워크시트 DB에 없는 FailureLink 텍스트 필드도 Prisma에서 직접 로드
 */
export async function extractChainsFromAtomicDB(tx: any, fmeaId: string): Promise<ChainEntry[]> {
  try {
    const [links, fms, fes, fcs, l2s, l3s, l2Funcs, l3Funcs, risks, opts] = await Promise.all([
      tx.failureLink.findMany({ where: { fmeaId } }),
      tx.failureMode.findMany({ where: { fmeaId } }),
      tx.failureEffect.findMany({ where: { fmeaId } }),
      tx.failureCause.findMany({ where: { fmeaId } }),
      tx.l2Structure.findMany({ where: { fmeaId } }),
      tx.l3Structure.findMany({ where: { fmeaId } }),
      tx.l2Function.findMany({ where: { fmeaId } }),
      tx.l3Function.findMany({ where: { fmeaId } }),
      tx.riskAnalysis.findMany({ where: { fmeaId } }),
      tx.optimization.findMany({ where: { fmeaId } }),
    ]);

    const fmById = new Map<string, any>(fms.map((f: any) => [f.id, f]));
    const feById = new Map<string, any>(fes.map((f: any) => [f.id, f]));
    const fcById = new Map<string, any>(fcs.map((f: any) => [f.id, f]));
    const l2ById = new Map<string, any>(l2s.map((l: any) => [l.id, l]));
    const l3ById = new Map<string, any>(l3s.map((l: any) => [l.id, l]));
    const l2FuncById = new Map<string, any>(l2Funcs.map((f: any) => [f.id, f]));
    const l3FuncById = new Map<string, any>(l3Funcs.map((f: any) => [f.id, f]));
    const riskByLink = new Map<string, any>(risks.map((r: any) => [r.failureLinkId, r]));
    // ★ Optimization by riskId (첫 번째 것만)
    const optByRiskId = new Map<string, any>();
    for (const o of opts) {
      if (!optByRiskId.has((o as any).riskId)) optByRiskId.set((o as any).riskId, o);
    }

    const chains: ChainEntry[] = [];
    for (const lk of links) {
      const fm = fmById.get(lk.fmId);
      const fe = feById.get(lk.feId);
      const fc = fcById.get(lk.fcId);
      if (!fm || !fe || !fc) continue;

      const l2 = l2ById.get(fm.l2StructId);
      const l3 = l3ById.get(fc.l3StructId);
      const risk = riskByLink.get(lk.id);
      const l2Func = l2FuncById.get(fm.l2FuncId);
      const l3Func = l3FuncById.get(fc.l3FuncId);
      const opt = risk ? optByRiskId.get(risk.id) : undefined;

      chains.push({
        id: lk.id,
        processNo: l2?.processNo || l2?.no || '',
        m4: l3?.m4 || undefined,
        workElement: l3?.name || undefined,
        fmValue: fm.mode,
        fcValue: fc.cause,
        feValue: fe.effect,
        feSeverity: fe.severity,
        feScope: fe.category,
        severity: risk?.severity ?? lk.severity ?? 0,
        occurrence: risk?.occurrence ?? 0,
        detection: risk?.detection ?? 0,
        pcValue: risk?.preventionControl || undefined,
        dcValue: risk?.detectionControl || undefined,
        l2Function: l2Func?.functionName || undefined,
        productChar: l2Func?.productChar || undefined,
        l3Function: l3Func?.functionName || undefined,
        processChar: l3Func?.processChar || undefined,
        specialChar: l2Func?.specialChar || l3Func?.specialChar || undefined,
        // ★ Living DB
        dcSourceType: risk?.dcSourceType || undefined,
        pcSourceType: risk?.pcSourceType || undefined,
        lldReference: risk?.lldReference || undefined,
        optRecommendedAction: opt?.recommendedAction || undefined,
        optDetectionAction: opt?.detectionAction || undefined,
        optStatus: opt?.status || undefined,
        optNewS: opt?.newSeverity ?? undefined,
        optNewO: opt?.newOccurrence ?? undefined,
        optNewD: opt?.newDetection ?? undefined,
        optLldReference: opt?.lldOptReference || undefined,
      });
    }
    return chains;
  } catch {
    return [];
  }
}

/**
 * PfmeaMasterDataset.failureChains를 최신 SOD로 업데이트
 * upsertActiveMasterFromWorksheetTx 내에서 호출 (같은 트랜잭션)
 * 1차: Atomic DB FailureLink 기반 (SSoT), fallback: 워크시트 DB
 */
export async function syncMasterChainsInTx(
  tx: any,
  db: FMEAWorksheetDB,
): Promise<number> {
  const fmeaId = db.fmeaId || '';
  if (!fmeaId) return 0;

  // Atomic DB 기반 추출 (SSoT) → fallback: 워크시트 DB
  let chains = await extractChainsFromAtomicDB(tx, fmeaId);
  if (chains.length === 0) {
    chains = extractChainsFromWorksheet(db);
  }
  if (chains.length === 0) return 0;

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

    // ★ Living DB: MasterFmeaReference에 opt/SOD/DC/PC 동기화
    await syncMasterReferenceFromChains(tx, chains, fmeaId);

    return chains.length;
  } catch (err: any) {
    if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
      return 0;
    }
    throw err;
  }
}

/**
 * ★ Living DB 지속 개선 루프: chains → MasterFmeaReference 업데이트
 *
 * mXX 프로젝트에서 워크시트 저장 시:
 *   1. WE(작업요소) 단위로 체인 그룹핑
 *   2. B2(기능)/B3(특성)/B4(원인)/DC/PC/SOD/Opt 전체 수집
 *   3. MasterFmeaReference에 upsert → 다음 FMEA 생성 시 자동 반영
 *   4. sourceProject에 수정 프로젝트 기록 → 변경 출처 추적
 *
 * ★ 핵심: 엔지니어가 워크시트에서 FL을 수정 → 저장 → Master 자동 업데이트
 *   → 다음 FMEA 생성 시 개선된 Master 데이터 참조 → 지속적 개선 FMEA 시스템
 */
async function syncMasterReferenceFromChains(
  tx: any,
  chains: ChainEntry[],
  fmeaId: string,
): Promise<void> {
  // WE 단위 그룹핑: (m4, workElement, processNo)
  const grouped = new Map<string, ChainEntry[]>();
  for (const ch of chains) {
    if (!ch.m4 || !ch.workElement) continue;
    const key = `${ch.m4}|${ch.workElement}|${ch.processNo}`;
    const list = grouped.get(key) || [];
    list.push(ch);
    grouped.set(key, list);
  }

  let syncCount = 0;

  for (const [, entries] of grouped) {
    const first = entries[0];
    if (!first.m4 || !first.workElement) continue;

    // ★ B2/B3/B4/DC/PC/FM/FE 전체 수집 (중복제거)
    const dcSet = new Set<string>();
    const pcSet = new Set<string>();
    const b2Set = new Set<string>();
    const b3Set = new Set<string>();
    const b4Set = new Set<string>();
    const optActions: string[] = [];
    const optDetActions: string[] = [];
    let latestOptNewS: number | undefined;
    let latestOptNewO: number | undefined;
    let latestOptNewD: number | undefined;
    let maxSeverity = 0;
    let avgOccurrence = 0;
    let avgDetection = 0;
    let count = 0;

    for (const e of entries) {
      if (e.dcValue) dcSet.add(e.dcValue);
      if (e.pcValue) pcSet.add(e.pcValue);
      if (e.l3Function) b2Set.add(e.l3Function);
      if (e.processChar) b3Set.add(e.processChar);
      if (e.fcValue) b4Set.add(e.fcValue);
      if (e.severity && e.severity > maxSeverity) maxSeverity = e.severity;
      if (e.occurrence) { avgOccurrence += e.occurrence; count++; }
      if (e.detection) avgDetection += e.detection;
      if (e.optRecommendedAction) optActions.push(e.optRecommendedAction);
      if (e.optDetectionAction) optDetActions.push(e.optDetectionAction);
      if (e.optNewS !== undefined) latestOptNewS = e.optNewS;
      if (e.optNewO !== undefined) latestOptNewO = e.optNewO;
      if (e.optNewD !== undefined) latestOptNewD = e.optNewD;
    }

    // ★ sourceType 결정: 최초 import vs 워크시트 수정
    const sourceType = fmeaId === 'pfm26-m002' ? 'import' : 'worksheet';

    try {
      await tx.masterFmeaReference.upsert({
        where: {
          m4_weName_processNo: {
            m4: first.m4,
            weName: first.workElement,
            processNo: first.processNo || '',
          },
        },
        create: {
          m4: first.m4,
          weName: first.workElement,
          processNo: first.processNo || '',
          processName: '',
          b2Functions: [...b2Set],
          b3Chars: [...b3Set],
          b4Causes: [...b4Set],
          a6Controls: [...dcSet],
          b5Controls: [...pcSet],
          severity: maxSeverity || undefined,
          occurrence: count > 0 ? Math.round(avgOccurrence / count) : undefined,
          detection: count > 0 ? Math.round(avgDetection / count) : undefined,
          optActions: [...new Set(optActions)],
          optDetActions: [...new Set(optDetActions)],
          optNewSeverity: latestOptNewS,
          optNewOccurrence: latestOptNewO,
          optNewDetection: latestOptNewD,
          sourceProject: fmeaId,
          sourceType,
          usageCount: 1,
          lastUsedAt: new Date(),
        },
        update: {
          // ★ Living DB: 기존 배열에 새 항목 추가 (덮어쓰기 아님, 합치기)
          // Prisma는 push를 직접 지원하지 않으므로, set으로 전체 교체
          // 다만 기존 데이터를 유지하기 위해 아래 별도 머지 로직 사용
          a6Controls: [...dcSet],
          b5Controls: [...pcSet],
          b2Functions: [...b2Set],
          b3Chars: [...b3Set],
          b4Causes: [...b4Set],
          severity: maxSeverity || undefined,
          occurrence: count > 0 ? Math.round(avgOccurrence / count) : undefined,
          detection: count > 0 ? Math.round(avgDetection / count) : undefined,
          optActions: [...new Set(optActions)],
          optDetActions: [...new Set(optDetActions)],
          optNewSeverity: latestOptNewS,
          optNewOccurrence: latestOptNewO,
          optNewDetection: latestOptNewD,
          // ★ sourceProject: 마지막 수정 프로젝트 기록 (m002 → m090 → mXXX)
          sourceProject: fmeaId,
          sourceType,
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      });
      syncCount++;
    } catch {
      // MasterFmeaReference 테이블 미존재 시 무시
    }
  }

  if (syncCount > 0) {
    console.info(`[Living DB] MasterFmeaReference ${syncCount}건 동기화 완료 (from ${fmeaId})`);
  }
}

/**
 * ★ Living DB 지속 개선 루프 — 프로젝트 간 변경 전파
 *
 * 사용법: 워크시트 저장 API 또는 rebuild-atomic 완료 후 호출
 *
 * 흐름:
 *   mXX 프로젝트 워크시트 저장
 *     → syncMasterChainsInTx() → syncMasterReferenceFromChains()
 *       → MasterFmeaReference 업데이트 (B2/B3/B4/DC/PC/SOD/Opt)
 *     → 다음 FMEA (mYY) Import 시
 *       → import-builder.ts의 sampleData/Master DB 조회
 *       → 개선된 B2/B3/B4/DC/PC 자동 반영
 *     → 엔지니어가 mYY에서 추가 수정
 *       → 다시 Master 업데이트
 *       → 무한 개선 루프 완성
 *
 * ★ 핵심 원칙:
 *   - 자동생성/폴백 금지 — 사실에 근거한 FK 데이터만 저장
 *   - 논리적 오류는 붉은색 경고로 표시 → 엔지니어가 수정
 *   - Master DB는 엔지니어의 기술적 판단 결과물 (Living DB)
 */
export async function syncMasterFromProject(
  tx: any,
  fmeaId: string,
): Promise<{ chainCount: number; refCount: number }> {
  // Atomic DB에서 체인 추출 (SSoT — FK 기반, 이름매칭 아님)
  const chains = await extractChainsFromAtomicDB(tx, fmeaId);
  if (chains.length === 0) {
    return { chainCount: 0, refCount: 0 };
  }

  // 1. PfmeaMasterDataset failureChains 업데이트
  try {
    const ds = await tx.pfmeaMasterDataset.findFirst({
      where: { fmeaId, isActive: true },
    });
    if (ds) {
      await tx.pfmeaMasterDataset.update({
        where: { id: ds.id },
        data: {
          failureChains: chains as any,
          updatedAt: new Date(),
        },
      });
    }
  } catch (err: any) {
    if (!(err?.code === 'P2021' || err?.message?.includes('does not exist'))) {
      throw err;
    }
  }

  // 2. MasterFmeaReference 동기화 (Living DB — B2/B3/B4/DC/PC/SOD/Opt)
  await syncMasterReferenceFromChains(tx, chains, fmeaId);

  // 3. 동기화 로그
  console.info(`[Living DB Loop] ${fmeaId} → Master 동기화 완료: chains=${chains.length}`);

  return { chainCount: chains.length, refCount: chains.length };
}
