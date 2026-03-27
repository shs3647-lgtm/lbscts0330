/**
 * m002 연결표(Connection Table) JSON 추출
 * 
 * FM↔FC↔FE N:M 관계를 FK 기반으로 정리.
 * 이 JSON이 위치기반 import의 FK 매핑 원본(SSoT).
 */
import * as fs from 'fs';

interface FMEntity {
  id: string;
  processNo: string;
  processName: string;
  mode: string;
  l2StructId: string;
  l2FuncId: string;
  productChar: string;
}

interface FCEntity {
  id: string;
  processNo: string;
  m4: string;
  workElement: string;
  cause: string;
  l2StructId: string;
  l3StructId: string;
  l3FuncId: string;
  processChar: string;
}

interface FEEntity {
  id: string;
  scope: string;
  effect: string;
  severity: number;
  l1FuncId: string;
  functionName: string;
  requirement: string;
}

interface FLink {
  id: string;
  fmId: string;
  fcId: string;
  feId: string;
  severity: number;
  occurrence: number;
  detection: number;
  ap: string;
  preventionControl: string;
  detectionControl: string;
}

interface ConnectionTable {
  sourceId: string;
  exportedAt: string;
  entities: {
    fm: FMEntity[];
    fc: FCEntity[];
    fe: FEEntity[];
  };
  links: FLink[];
  fkMap: {
    fmToFCs: Record<string, string[]>;
    fcToFMs: Record<string, string[]>;
    fmToFEs: Record<string, string[]>;
  };
  stats: Record<string, number>;
}

function main() {
  const d = JSON.parse(fs.readFileSync('data/master-fmea/pfm26-m002.json', 'utf8'));
  const db = d.atomicDB;

  // Maps for lookup
  const l2Map = new Map(db.l2Structures.map((s: any) => [s.id, s]));
  const l3Map = new Map(db.l3Structures.map((s: any) => [s.id, s]));
  const l1fMap = new Map(db.l1Functions.map((f: any) => [f.id, f]));
  const l2fMap = new Map(db.l2Functions.map((f: any) => [f.id, f]));
  const l3fMap = new Map(db.l3Functions.map((f: any) => [f.id, f]));
  const raByLink = new Map(db.riskAnalyses.map((r: any) => [r.linkId, r]));

  // ── FM entities ──
  const fmEntities: FMEntity[] = db.failureModes.map((fm: any) => {
    const l2 = l2Map.get(fm.l2StructId) as any;
    const l2f = l2fMap.get(fm.l2FuncId) as any;
    return {
      id: fm.id,
      processNo: l2?.no || '',
      processName: l2?.name || '',
      mode: fm.mode,
      l2StructId: fm.l2StructId,
      l2FuncId: fm.l2FuncId,
      productChar: l2f?.productChar || '',
    };
  });

  // ── FC entities ──
  const fcEntities: FCEntity[] = db.failureCauses.map((fc: any) => {
    const l3 = l3Map.get(fc.l3StructId) as any;
    const l2 = l2Map.get(fc.l2StructId) as any;
    const l3f = l3fMap.get(fc.l3FuncId) as any;
    return {
      id: fc.id,
      processNo: l2?.no || '',
      m4: l3?.m4 || '',
      workElement: l3?.name || '',
      cause: fc.cause,
      l2StructId: fc.l2StructId,
      l3StructId: fc.l3StructId,
      l3FuncId: fc.l3FuncId,
      processChar: l3f?.processChar || '',
    };
  });

  // ── FE entities (dedup by scope+effect) ──
  const feSeen = new Set<string>();
  const feDeduped: FEEntity[] = [];
  for (const fe of db.failureEffects) {
    const key = `${fe.category}|${fe.effect}`;
    if (feSeen.has(key)) continue;
    feSeen.add(key);
    const l1f = l1fMap.get(fe.l1FuncId) as any;
    feDeduped.push({
      id: fe.id,
      scope: fe.category,
      effect: fe.effect,
      severity: fe.severity || 1,
      l1FuncId: fe.l1FuncId,
      functionName: l1f?.functionName || '',
      requirement: l1f?.requirement || '',
    });
  }

  // ── FailureLinks (dedup by fmId|fcId|feId, FE remapped to canonical) ──
  const feRemap = new Map<string, string>();
  const feCanon = new Map<string, string>();
  for (const fe of db.failureEffects) {
    const key = `${fe.category}|${fe.effect}`;
    if (!feCanon.has(key)) feCanon.set(key, fe.id);
    feRemap.set(fe.id, feCanon.get(key)!);
  }

  const linkSeen = new Set<string>();
  const links: FLink[] = [];
  for (const fl of db.failureLinks) {
    if (fl.deletedAt) continue;
    const canonFeId = feRemap.get(fl.feId) || fl.feId;
    const dedupKey = `${fl.fmId}|${fl.fcId}|${canonFeId}`;
    if (linkSeen.has(dedupKey)) continue;
    linkSeen.add(dedupKey);

    const ra = raByLink.get(fl.id) as any;
    links.push({
      id: fl.id,
      fmId: fl.fmId,
      fcId: fl.fcId,
      feId: canonFeId,
      severity: ra?.severity || fl.severity || 1,
      occurrence: ra?.occurrence || 0,
      detection: ra?.detection || 0,
      ap: ra?.ap || '',
      preventionControl: ra?.preventionControl || '',
      detectionControl: ra?.detectionControl || '',
    });
  }

  // ── FK Map (N:M 관계) ──
  const fmToFCs: Record<string, string[]> = {};
  const fcToFMs: Record<string, string[]> = {};
  const fmToFEs: Record<string, string[]> = {};
  for (const lk of links) {
    if (!fmToFCs[lk.fmId]) fmToFCs[lk.fmId] = [];
    if (!fmToFCs[lk.fmId].includes(lk.fcId)) fmToFCs[lk.fmId].push(lk.fcId);

    if (!fcToFMs[lk.fcId]) fcToFMs[lk.fcId] = [];
    if (!fcToFMs[lk.fcId].includes(lk.fmId)) fcToFMs[lk.fcId].push(lk.fmId);

    if (!fmToFEs[lk.fmId]) fmToFEs[lk.fmId] = [];
    if (!fmToFEs[lk.fmId].includes(lk.feId)) fmToFEs[lk.fmId].push(lk.feId);
  }

  const multiFC = Object.values(fcToFMs).filter(v => v.length > 1).length;

  const result: ConnectionTable = {
    sourceId: 'pfm26-m002',
    exportedAt: new Date().toISOString(),
    entities: {
      fm: fmEntities,
      fc: fcEntities,
      fe: feDeduped,
    },
    links,
    fkMap: { fmToFCs, fcToFMs, fmToFEs },
    stats: {
      fmCount: fmEntities.length,
      fcCount: fcEntities.length,
      feCount: feDeduped.length,
      linkCount: links.length,
      fmToFCsAvg: +(Object.values(fmToFCs).reduce((s, v) => s + v.length, 0) / Object.keys(fmToFCs).length).toFixed(1),
      fcLinkedToMultipleFMs: multiFC,
      fmLinkedToMultipleFEs: Object.values(fmToFEs).filter(v => v.length > 1).length,
    },
  };

  const outPath = 'data/master-fmea/m002-connection-table.json';
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`→ ${outPath}`);
  console.log('Stats:', JSON.stringify(result.stats, null, 2));

  // Summary
  console.log('\n=== 연결표 요약 ===');
  console.log(`FM: ${fmEntities.length}개`);
  console.log(`FC: ${fcEntities.length}개 (${multiFC}개가 2+FM 연결)`);
  console.log(`FE: ${feDeduped.length}개 (scope+effect 정제)`);
  console.log(`FL: ${links.length}개 (FE 정제 후 dedup)`);

  // Show multi-FM FCs
  console.log('\n=== FC→FM 다중매핑 (30건) ===');
  const sortedMulti = Object.entries(fcToFMs)
    .filter(([, fms]) => fms.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [fcId, fmIds] of sortedMulti.slice(0, 10)) {
    const fc = fcEntities.find(f => f.id === fcId);
    const fmTexts = fmIds.map(fmId => {
      const fm = fmEntities.find(f => f.id === fmId);
      return `[${fm?.processNo}]${fm?.mode}`;
    });
    console.log(`  FC: "${fc?.cause}" (${fc?.processNo}/${fc?.m4}) → ${fmIds.length} FMs: ${fmTexts.join(', ')}`);
  }
}

main();
