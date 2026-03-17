/**
 * FC 6건 누락 진단 — Legacy JSON vs Atomic DB 비교
 * FMEA ID: pfm26-m059 (최신 프로젝트)
 */
import pg from 'pg';
const { Pool } = pg;

const FMEA_ID = 'pfm26-m059';
const SCHEMA = 'pfmea_' + FMEA_ID.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

const pool = new Pool({
  connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db',
});

async function q(sql, params) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function main() {
  const out = [];
  const log = (...args) => { const line = args.join(' '); console.log(line); out.push(line); };

  log(`\n${'═'.repeat(70)}`);
  log(`  FC 6건 누락 진단 — ${FMEA_ID}`);
  log(`${'═'.repeat(70)}\n`);

  // ─── 1. Legacy JSON에서 FC 수집 ───
  const legacyRows = await q(`SELECT data FROM "${SCHEMA}".fmea_legacy_data WHERE "fmeaId" = $1 LIMIT 1`, [FMEA_ID]);
  if (legacyRows.length === 0) { log('ERROR: No legacy data'); return; }

  const legacy = legacyRows[0].data;
  const l2Array = legacy.l2 || [];
  const legacyLinks = legacy.failureLinks || [];
  const riskData = legacy.riskData || {};

  log(`[Legacy] L2 공정: ${l2Array.length}`);
  log(`[Legacy] FailureLinks: ${legacyLinks.length}`);
  log(`[Legacy] RiskData 키: ${Object.keys(riskData).length}`);

  // Legacy FC 전체 수집
  const legacyFCs = [];
  const legacyFMs = [];
  for (const proc of l2Array) {
    for (const fm of (proc.failureModes || [])) {
      legacyFMs.push({ procNo: proc.no, procName: proc.name, id: fm.id, name: fm.name, productCharId: fm.productCharId });
    }
    // proc.failureCauses
    for (const fc of (proc.failureCauses || [])) {
      legacyFCs.push({ level: 'proc', procNo: proc.no, procName: proc.name, id: fc.id, name: fc.name, m4: fc.m4 || '', processCharId: fc.processCharId || null });
    }
    // l3 level
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        legacyFCs.push({ level: 'l3', procNo: proc.no, procName: proc.name, weId: we.id, weName: we.name, m4: we.m4 || fc.m4 || '', id: fc.id, name: fc.name, processCharId: fc.processCharId || null });
      }
    }
  }

  log(`\n[Legacy FC] proc-level: ${legacyFCs.filter(f => f.level === 'proc').length}`);
  log(`[Legacy FC] l3-level:   ${legacyFCs.filter(f => f.level === 'l3').length}`);
  log(`[Legacy FC] TOTAL:      ${legacyFCs.length}`);
  log(`[Legacy FM] TOTAL:      ${legacyFMs.length}`);

  // ─── 2. Atomic DB FC 수집 ───
  const atomicFCs = await q(`
    SELECT fc.id, fc.cause, fc."processCharId", fc."l3FuncId", fc."l3StructId", fc."l2StructId"
    FROM "${SCHEMA}".failure_causes fc
  `);
  const atomicFMs = await q(`
    SELECT fm.id, fm.mode, fm."productCharId", fm."l2FuncId", fm."l2StructId"
    FROM "${SCHEMA}".failure_modes fm
  `);
  const atomicLinks = await q(`
    SELECT fl.id, fl."fmId", fl."feId", fl."fcId"
    FROM "${SCHEMA}".failure_links fl
  `);
  const atomicFEs = await q(`
    SELECT fe.id, fe.effect FROM "${SCHEMA}".failure_effects fe
  `);

  log(`\n[Atomic] FailureCauses:  ${atomicFCs.length}`);
  log(`[Atomic] FailureModes:   ${atomicFMs.length}`);
  log(`[Atomic] FailureLinks:   ${atomicLinks.length}`);
  log(`[Atomic] FailureEffects: ${atomicFEs.length}`);

  // ─── 3. Legacy vs Atomic 비교 — FC ───
  log(`\n${'─'.repeat(70)}`);
  log(`  PART A: Legacy FC → Atomic FC 매칭`);
  log(`${'─'.repeat(70)}\n`);

  const atomicFCIds = new Set(atomicFCs.map(fc => fc.id));
  const legacyFCIds = new Set(legacyFCs.map(fc => fc.id));

  const inLegacyNotAtomic = legacyFCs.filter(fc => !atomicFCIds.has(fc.id));
  const inAtomicNotLegacy = atomicFCs.filter(fc => !legacyFCIds.has(fc.id));

  log(`Legacy에만 있는 FC (Atomic 누락): ${inLegacyNotAtomic.length}`);
  for (const fc of inLegacyNotAtomic.slice(0, 20)) {
    log(`  ⚠ proc=${fc.procNo} level=${fc.level} id=${fc.id} name="${(fc.name || '').slice(0, 50)}" pcId=${fc.processCharId || 'NULL'} m4=${fc.m4}`);
  }

  log(`\nAtomic에만 있는 FC (Legacy 누락): ${inAtomicNotLegacy.length}`);
  for (const fc of inAtomicNotLegacy.slice(0, 10)) {
    log(`  ⚠ id=${fc.id} cause="${(fc.cause || '').slice(0, 50)}" pcId=${fc.processCharId || 'NULL'}`);
  }

  // ─── 4. FailureLink에서 참조하는 FC 확인 ───
  log(`\n${'─'.repeat(70)}`);
  log(`  PART B: FailureLink → FC FK 정합성`);
  log(`${'─'.repeat(70)}\n`);

  const linkFcIds = new Set(atomicLinks.map(l => l.fcId));
  const linkFmIds = new Set(atomicLinks.map(l => l.fmId));
  const linkFeIds = new Set(atomicLinks.map(l => l.feId));

  const brokenFcLinks = atomicLinks.filter(l => !atomicFCIds.has(l.fcId));
  const brokenFmLinks = atomicLinks.filter(l => !new Set(atomicFMs.map(fm => fm.id)).has(l.fmId));
  const brokenFeLinks = atomicLinks.filter(l => !new Set(atomicFEs.map(fe => fe.id)).has(l.feId));

  log(`FailureLink → FC: 정상=${atomicLinks.length - brokenFcLinks.length}, 깨짐=${brokenFcLinks.length}`);
  log(`FailureLink → FM: 정상=${atomicLinks.length - brokenFmLinks.length}, 깨짐=${brokenFmLinks.length}`);
  log(`FailureLink → FE: 정상=${atomicLinks.length - brokenFeLinks.length}, 깨짐=${brokenFeLinks.length}`);

  for (const l of brokenFcLinks.slice(0, 5)) {
    log(`  ⚠ broken FC link: linkId=${l.id} fcId=${l.fcId}`);
  }

  // ─── 5. FC processCharId NULL 분석 ───
  log(`\n${'─'.repeat(70)}`);
  log(`  PART C: FC processCharId NULL 분석`);
  log(`${'─'.repeat(70)}\n`);

  const atomicFCNullPC = atomicFCs.filter(fc => !fc.processCharId);
  log(`Atomic FC with NULL processCharId: ${atomicFCNullPC.length} / ${atomicFCs.length}`);
  for (const fc of atomicFCNullPC.slice(0, 10)) {
    log(`  - id=${fc.id} cause="${(fc.cause || '').slice(0, 50)}"`);
  }

  const legacyFCNullPC = legacyFCs.filter(fc => !fc.processCharId);
  log(`\nLegacy FC with NULL processCharId: ${legacyFCNullPC.length} / ${legacyFCs.length}`);
  for (const fc of legacyFCNullPC.slice(0, 10)) {
    log(`  - proc=${fc.procNo} id=${fc.id} name="${(fc.name || '').slice(0, 50)}"`);
  }

  // ─── 6. chain에서 FC 참조 확인 (Legacy failureLinks) ───
  log(`\n${'─'.repeat(70)}`);
  log(`  PART D: Legacy FailureLinks 내 FC 참조`);
  log(`${'─'.repeat(70)}\n`);

  const linkedFCIds = new Set(legacyLinks.map(l => l.fcId).filter(Boolean));
  const unlinkedLegacyFCs = legacyFCs.filter(fc => !linkedFCIds.has(fc.id));
  log(`FailureLink에 참조된 FC:   ${linkedFCIds.size}`);
  log(`FailureLink에 미참조 FC:   ${unlinkedLegacyFCs.length}`);

  // 공정별 미참조 FC 분석
  const unlinkedByProc = new Map();
  for (const fc of unlinkedLegacyFCs) {
    const key = `${fc.procNo}|${fc.procName || ''}`;
    if (!unlinkedByProc.has(key)) unlinkedByProc.set(key, []);
    unlinkedByProc.get(key).push(fc);
  }
  log(`\n미참조 FC 공정별 분포:`);
  for (const [key, fcs] of [...unlinkedByProc.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 15)) {
    log(`  공정 ${key}: ${fcs.length}건`);
    for (const fc of fcs.slice(0, 3)) {
      log(`    - id=${fc.id} name="${(fc.name || '').slice(0, 50)}" pcId=${fc.processCharId || 'NULL'}`);
    }
  }

  // ─── 7. FM/FE 매칭률 ───
  log(`\n${'─'.repeat(70)}`);
  log(`  PART E: FM/FE 매칭률 (Legacy FailureLinks)`);
  log(`${'─'.repeat(70)}\n`);

  const linkedFMIds = new Set(legacyLinks.map(l => l.fmId).filter(Boolean));
  const linkedFEIds = new Set(legacyLinks.map(l => l.feId).filter(Boolean));
  log(`총 FM: ${legacyFMs.length}, Link 참조: ${linkedFMIds.size}, 미참조: ${legacyFMs.length - linkedFMIds.size}`);
  log(`총 FE: ${(legacy.l1?.failureScopes || []).length}, Link 참조: ${linkedFEIds.size}`);

  // 미참조 FM 상세
  const unlinkedFMs = legacyFMs.filter(fm => !linkedFMIds.has(fm.id));
  if (unlinkedFMs.length > 0) {
    log(`\n미참조 FM 목록 (${unlinkedFMs.length}건):`);
    for (const fm of unlinkedFMs.slice(0, 10)) {
      log(`  - proc=${fm.procNo} id=${fm.id} name="${(fm.name || '').slice(0, 50)}"`);
    }
  }

  // ─── 8. RiskData 분석 ───
  log(`\n${'─'.repeat(70)}`);
  log(`  PART F: RiskData S/O/D 커버리지`);
  log(`${'─'.repeat(70)}\n`);

  const sKeys = Object.keys(riskData).filter(k => k.match(/risk-.*-S$/));
  const oKeys = Object.keys(riskData).filter(k => k.match(/risk-.*-O$/));
  const dKeys = Object.keys(riskData).filter(k => k.match(/risk-.*-D$/));
  log(`RiskData: S=${sKeys.length}, O=${oKeys.length}, D=${dKeys.length}`);
  log(`S값 0인 항목: ${sKeys.filter(k => riskData[k] === 0 || riskData[k] === '0').length}`);

  // ─── Save JSON dump ───
  const fs = await import('fs');
  const dumpDir = 'C:/Users/Administrator/Documents/fc';

  // Legacy FC 전체 덤프
  fs.writeFileSync(`${dumpDir}/legacy-fcs.json`, JSON.stringify(legacyFCs, null, 2));
  log(`\nSaved: ${dumpDir}/legacy-fcs.json (${legacyFCs.length}건)`);

  // Atomic FC 전체 덤프
  fs.writeFileSync(`${dumpDir}/atomic-fcs.json`, JSON.stringify(atomicFCs, null, 2));
  log(`Saved: ${dumpDir}/atomic-fcs.json (${atomicFCs.length}건)`);

  // Legacy Links 덤프
  fs.writeFileSync(`${dumpDir}/legacy-links.json`, JSON.stringify(legacyLinks, null, 2));
  log(`Saved: ${dumpDir}/legacy-links.json (${legacyLinks.length}건)`);

  // Atomic Links 덤프
  fs.writeFileSync(`${dumpDir}/atomic-links.json`, JSON.stringify(atomicLinks, null, 2));
  log(`Saved: ${dumpDir}/atomic-links.json (${atomicLinks.length}건)`);

  // 미참조 FC 덤프
  fs.writeFileSync(`${dumpDir}/unlinked-fcs.json`, JSON.stringify(unlinkedLegacyFCs, null, 2));
  log(`Saved: ${dumpDir}/unlinked-fcs.json (${unlinkedLegacyFCs.length}건)`);

  // Legacy FM 덤프
  fs.writeFileSync(`${dumpDir}/legacy-fms.json`, JSON.stringify(legacyFMs, null, 2));
  log(`Saved: ${dumpDir}/legacy-fms.json (${legacyFMs.length}건)`);

  // 전체 보고서 텍스트 저장
  fs.writeFileSync(`${dumpDir}/03_fc-6missing-report.txt`, out.join('\n'));
  log(`\nSaved report: ${dumpDir}/03_fc-6missing-report.txt`);

  await pool.end();
  log('\n=== Done ===');
}

main().catch(async e => { console.error(e); await pool.end(); process.exit(1); });
