import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const schema = 'pfmea_pfm26_m066';

async function main() {
  const client = await pool.connect();
  try {
    const q = (sql) => client.query(sql);
    const ids = (rows) => new Set(rows.map(r => r.id));

    // ====================================================================
    // 1. 구조분석 (L1/L2/L3 Structure)
    // ====================================================================
    const l1s = (await q(`SELECT id, "fmeaId" FROM "${schema}".l1_structures`)).rows;
    const l2s = (await q(`SELECT id, "fmeaId", "l1Id" FROM "${schema}".l2_structures`)).rows;
    const l3s = (await q(`SELECT id, "fmeaId", "l2Id" FROM "${schema}".l3_structures`)).rows;

    const l1sIds = ids(l1s), l2sIds = ids(l2s), l3sIds = ids(l3s);
    const l2OrphanL1 = l2s.filter(r => !l1sIds.has(r.l1Id)).length;
    const l3OrphanL2 = l3s.filter(r => !l2sIds.has(r.l2Id)).length;

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  1. 구조분석 (Structure) — L1→L2→L3 계층                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`L1 Structure (완제품): ${l1s.length}`);
    console.log(`L2 Structure (공정):   ${l2s.length}  orphan L1 FK: ${l2OrphanL1}`);
    console.log(`L3 Structure (작업요소): ${l3s.length}  orphan L2 FK: ${l3OrphanL2}`);

    // ====================================================================
    // 2. 기능분석 (L1/L2/L3 Function + PPC)
    // ====================================================================
    const l1f = (await q(`SELECT id, "fmeaId", "l1StructId", "functionName", category FROM "${schema}".l1_functions`)).rows;
    const l2f = (await q(`SELECT id, "fmeaId", "l2StructId", "functionName" FROM "${schema}".l2_functions`)).rows;
    const l3f = (await q(`SELECT id, "fmeaId", "l3StructId", "l2StructId", "functionName" FROM "${schema}".l3_functions`)).rows;
    const ppc = (await q(`SELECT id, "fmeaId", "l2StructId" FROM "${schema}".process_product_chars`)).rows;

    const l1fIds = ids(l1f), l2fIds = ids(l2f), l3fIds = ids(l3f);
    const l1fOrphan = l1f.filter(r => !l1sIds.has(r.l1StructId)).length;
    const l2fOrphan = l2f.filter(r => !l2sIds.has(r.l2StructId)).length;
    const l3fOrphanL3 = l3f.filter(r => !l3sIds.has(r.l3StructId)).length;
    const l3fOrphanL2 = l3f.filter(r => !l2sIds.has(r.l2StructId)).length;
    const ppcOrphan = ppc.filter(r => !l2sIds.has(r.l2StructId)).length;

    const cats = {};
    for (const r of l1f) cats[r.category || 'null'] = (cats[r.category || 'null'] || 0) + 1;

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  2. 기능분석 (Function) — 구조→기능 FK                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`L1 Function (완제품기능): ${l1f.length}  orphan L1S: ${l1fOrphan}  categories: ${JSON.stringify(cats)}`);
    console.log(`L2 Function (제품특성):   ${l2f.length}  orphan L2S: ${l2fOrphan}`);
    console.log(`L3 Function (공정특성):   ${l3f.length}  orphan L3S: ${l3fOrphanL3}  orphan L2S: ${l3fOrphanL2}`);
    console.log(`ProcessProductChar:       ${ppc.length}  orphan L2S: ${ppcOrphan}`);

    // ====================================================================
    // 3. 고장분석 (FM/FE/FC + FailureLink)
    // ====================================================================
    const fm = (await q(`SELECT id, "fmeaId", "l2StructId", "l2FuncId", "productCharId", mode FROM "${schema}".failure_modes`)).rows;
    const fe = (await q(`SELECT id, "fmeaId", "l1FuncId", effect FROM "${schema}".failure_effects`)).rows;
    const fc = (await q(`SELECT id, "fmeaId", "l3StructId", "l2StructId", "l3FuncId", "processCharId", cause FROM "${schema}".failure_causes`)).rows;
    const fl = (await q(`SELECT id, "fmeaId", "fmId", "feId", "fcId" FROM "${schema}".failure_links WHERE "deletedAt" IS NULL`)).rows;
    const flAll = (await q(`SELECT id, "deletedAt" FROM "${schema}".failure_links`)).rows;

    const fmIds = ids(fm), feIds = ids(fe), fcIds = ids(fc), flIds = ids(fl);

    const fmOrphanL2 = fm.filter(r => !l2sIds.has(r.l2StructId)).length;
    const fmOrphanL2F = fm.filter(r => r.l2FuncId && !l2fIds.has(r.l2FuncId)).length;
    const ppcIds = ids(ppc);
    const fmOrphanPC = fm.filter(r => r.productCharId && !ppcIds.has(r.productCharId)).length;
    const feOrphanL1F = fe.filter(r => r.l1FuncId && !l1fIds.has(r.l1FuncId)).length;
    const fcOrphanL3S = fc.filter(r => !l3sIds.has(r.l3StructId)).length;
    const fcOrphanL2S = fc.filter(r => !l2sIds.has(r.l2StructId)).length;
    const fcOrphanL3F = fc.filter(r => r.l3FuncId && !l3fIds.has(r.l3FuncId)).length;

    const flOrphanFM = fl.filter(r => !fmIds.has(r.fmId)).length;
    const flOrphanFE = fl.filter(r => !feIds.has(r.feId)).length;
    const flOrphanFC = fl.filter(r => !fcIds.has(r.fcId)).length;

    // 1:N 관계 분석 — 핵심: FM이 여러 FE에 연결되는지
    const fmToFe = {}, fmToFc = {}, feToFm = {};
    for (const r of fl) {
      if (!fmToFe[r.fmId]) fmToFe[r.fmId] = new Set();
      fmToFe[r.fmId].add(r.feId);
      if (!fmToFc[r.fmId]) fmToFc[r.fmId] = new Set();
      fmToFc[r.fmId].add(r.fcId);
      if (!feToFm[r.feId]) feToFm[r.feId] = new Set();
      feToFm[r.feId].add(r.fmId);
    }

    const fmMultiFE = Object.values(fmToFe).filter(s => s.size > 1).length;
    const fmMultiFC = Object.values(fmToFc).filter(s => s.size > 1).length;
    const feMultiFM = Object.values(feToFm).filter(s => s.size > 1).length;

    const feDistrib = {}, fcDistrib = {};
    for (const s of Object.values(fmToFe)) feDistrib[s.size] = (feDistrib[s.size] || 0) + 1;
    for (const s of Object.values(fmToFc)) fcDistrib[s.size] = (fcDistrib[s.size] || 0) + 1;

    const linkedFmIds = new Set(fl.map(r => r.fmId));
    const linkedFeIds = new Set(fl.map(r => r.feId));
    const linkedFcIds = new Set(fl.map(r => r.fcId));

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  3. 고장분석 (Failure) — FM↔FE↔FC 고장사슬                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`FailureMode  (FM): ${fm.length}  orphan L2S: ${fmOrphanL2}  orphan L2F: ${fmOrphanL2F}  orphan PPC: ${fmOrphanPC}`);
    console.log(`FailureEffect(FE): ${fe.length}  orphan L1F: ${feOrphanL1F}`);
    console.log(`FailureCause (FC): ${fc.length}  orphan L3S: ${fcOrphanL3S}  orphan L2S: ${fcOrphanL2S}  orphan L3F: ${fcOrphanL3F}`);
    console.log(`FailureLink  (FL): ${fl.length} active / ${flAll.length} total (soft-deleted: ${flAll.length - fl.length})`);
    console.log(`  orphan FM: ${flOrphanFM}  orphan FE: ${flOrphanFE}  orphan FC: ${flOrphanFC}`);
    console.log(`\n[1:N 관계 — 복수 FE 연결 핵심 검증]`);
    console.log(`  FM with multiple FE: ${fmMultiFE}/${Object.keys(fmToFe).length}`);
    console.log(`  FM with multiple FC: ${fmMultiFC}/${Object.keys(fmToFc).length}`);
    console.log(`  FE with multiple FM: ${feMultiFM}/${Object.keys(feToFm).length}`);
    console.log(`  FM→FE count 분포: ${JSON.stringify(feDistrib)}`);
    console.log(`  FM→FC count 분포: ${JSON.stringify(fcDistrib)}`);
    console.log(`  Unlinked FM: ${fm.filter(r => !linkedFmIds.has(r.id)).length}`);
    console.log(`  Unlinked FE: ${fe.filter(r => !linkedFeIds.has(r.id)).length}`);
    console.log(`  Unlinked FC: ${fc.filter(r => !linkedFcIds.has(r.id)).length}`);

    // FM별 상세 FE 연결 출력
    console.log(`\n[FM→FE 상세 연결]`);
    for (const [fmId, feSet] of Object.entries(fmToFe).sort((a,b) => b[1].size - a[1].size).slice(0, 10)) {
      const fmRow = fm.find(r => r.id === fmId);
      const feNames = [...feSet].map(feId => {
        const feRow = fe.find(r => r.id === feId);
        return feRow?.effect?.substring(0,30) || feId.substring(0,8);
      });
      console.log(`  FM "${fmRow?.mode?.substring(0,25) || '?'}" → ${feSet.size} FE: [${feNames.join(' | ')}]`);
    }

    // ====================================================================
    // 4. 리스크분석 (RiskAnalysis + Optimization)
    // ====================================================================
    const ra = (await q(`SELECT id, "fmeaId", "linkId", severity, occurrence, detection, "preventionControl", "detectionControl" FROM "${schema}".risk_analyses`)).rows;
    const opt = (await q(`SELECT id, "fmeaId", "riskId" FROM "${schema}".optimizations`)).rows;

    const raIds = ids(ra);
    const raOrphanFL = ra.filter(r => !flIds.has(r.linkId)).length;
    const raByLink = {};
    for (const r of ra) raByLink[r.linkId] = (raByLink[r.linkId] || 0) + 1;
    const dupRA = Object.entries(raByLink).filter(([, c]) => c > 1);
    const raLinkIds = new Set(ra.map(r => r.linkId));
    const flWithoutRA = fl.filter(r => !raLinkIds.has(r.id)).length;
    const optOrphanRA = opt.filter(r => r.riskId && !raIds.has(r.riskId)).length;

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  4. 리스크분석 (Risk) — FL→RA→Opt 체인                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`RiskAnalysis: ${ra.length}  orphan FL: ${raOrphanFL}  duplicates: ${dupRA.length}  FL without RA: ${flWithoutRA}`);
    console.log(`  DC filled: ${ra.filter(r => r.detectionControl?.trim()).length}/${ra.length}`);
    console.log(`  PC filled: ${ra.filter(r => r.preventionControl?.trim()).length}/${ra.length}`);
    console.log(`  S filled:  ${ra.filter(r => r.severity > 0).length}/${ra.length}`);
    console.log(`  O filled:  ${ra.filter(r => r.occurrence > 0).length}/${ra.length}`);
    console.log(`  D filled:  ${ra.filter(r => r.detection > 0).length}/${ra.length}`);
    console.log(`Optimization: ${opt.length}  orphan RA: ${optOrphanRA}`);

    // ====================================================================
    // 5. 상하관계 전체 체인 검증 (L2→L3→L3F→FC→FL→RA)
    // ====================================================================
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  5. 상하관계 전체 체인 검증                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    
    let chainBroken = 0;
    for (const l2 of l2s) {
      const myL3s = l3s.filter(r => r.l2Id === l2.id);
      const myFMs = fm.filter(r => r.l2StructId === l2.id);
      const myFCs = fc.filter(r => r.l2StructId === l2.id);
      
      for (const fcItem of myFCs) {
        const hasL3 = myL3s.some(l3 => l3.id === fcItem.l3StructId);
        const hasLink = fl.some(link => link.fcId === fcItem.id);
        if (!hasL3 || !hasLink) chainBroken++;
      }
    }
    console.log(`전체 체인 끊김: ${chainBroken}`);
    console.log(`L2→L3 연결: ${l3s.length} (L2 ${l2s.length}개 기준)`);
    console.log(`L3→L3F 연결: ${l3f.length} (L3 ${l3s.length}개 기준)`);
    console.log(`L3F→FC 연결: ${fc.filter(r => r.l3FuncId && l3fIds.has(r.l3FuncId)).length}/${fc.length}`);
    console.log(`FC→FL 연결: ${fc.filter(r => linkedFcIds.has(r.id)).length}/${fc.length}`);
    console.log(`FL→RA 연결: ${fl.filter(r => raLinkIds.has(r.id)).length}/${fl.length}`);

    // ====================================================================
    // 6. 종합 보고
    // ====================================================================
    const totalOrphans = l2OrphanL1 + l3OrphanL2 + l1fOrphan + l2fOrphan + l3fOrphanL3 + l3fOrphanL2 +
      ppcOrphan + fmOrphanL2 + fmOrphanL2F + fmOrphanPC + feOrphanL1F + fcOrphanL3S + fcOrphanL2S + fcOrphanL3F +
      flOrphanFM + flOrphanFE + flOrphanFC + raOrphanFL + optOrphanRA;

    const fmeaIds = new Set([
      ...l1s.map(r=>r.fmeaId), ...l2s.map(r=>r.fmeaId), ...l3s.map(r=>r.fmeaId),
      ...l1f.map(r=>r.fmeaId), ...l2f.map(r=>r.fmeaId), ...l3f.map(r=>r.fmeaId),
      ...fm.map(r=>r.fmeaId), ...fe.map(r=>r.fmeaId), ...fc.map(r=>r.fmeaId),
      ...fl.map(r=>r.fmeaId), ...ra.map(r=>r.fmeaId),
    ]);

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  6. 종합 보고 (ALL FMEA DB FK DIAGNOSIS)                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`fmeaId 일관성: ${fmeaIds.size === 1 ? 'PASS (단일 fmeaId)' : `FAIL (${fmeaIds.size}개)`} → [${[...fmeaIds].join(', ')}]`);
    console.log(`\n┌──────────────────────────┬──────┬──────────┐`);
    console.log(`│ 테이블                    │ 건수  │ FK orphan │`);
    console.log(`├──────────────────────────┼──────┼──────────┤`);
    console.log(`│ L1 Structure             │ ${String(l1s.length).padStart(4)} │        - │`);
    console.log(`│ L2 Structure             │ ${String(l2s.length).padStart(4)} │ ${String(l2OrphanL1).padStart(8)} │`);
    console.log(`│ L3 Structure             │ ${String(l3s.length).padStart(4)} │ ${String(l3OrphanL2).padStart(8)} │`);
    console.log(`│ L1 Function              │ ${String(l1f.length).padStart(4)} │ ${String(l1fOrphan).padStart(8)} │`);
    console.log(`│ L2 Function              │ ${String(l2f.length).padStart(4)} │ ${String(l2fOrphan).padStart(8)} │`);
    console.log(`│ L3 Function              │ ${String(l3f.length).padStart(4)} │ ${String(l3fOrphanL3 + l3fOrphanL2).padStart(8)} │`);
    console.log(`│ ProcessProductChar       │ ${String(ppc.length).padStart(4)} │ ${String(ppcOrphan).padStart(8)} │`);
    console.log(`│ FailureMode              │ ${String(fm.length).padStart(4)} │ ${String(fmOrphanL2 + fmOrphanL2F + fmOrphanPC).padStart(8)} │`);
    console.log(`│ FailureEffect            │ ${String(fe.length).padStart(4)} │ ${String(feOrphanL1F).padStart(8)} │`);
    console.log(`│ FailureCause             │ ${String(fc.length).padStart(4)} │ ${String(fcOrphanL3S + fcOrphanL2S + fcOrphanL3F).padStart(8)} │`);
    console.log(`│ FailureLink              │ ${String(fl.length).padStart(4)} │ ${String(flOrphanFM + flOrphanFE + flOrphanFC).padStart(8)} │`);
    console.log(`│ RiskAnalysis             │ ${String(ra.length).padStart(4)} │ ${String(raOrphanFL).padStart(8)} │`);
    console.log(`│ Optimization             │ ${String(opt.length).padStart(4)} │ ${String(optOrphanRA).padStart(8)} │`);
    console.log(`├──────────────────────────┼──────┼──────────┤`);
    const total = l1s.length+l2s.length+l3s.length+l1f.length+l2f.length+l3f.length+ppc.length+fm.length+fe.length+fc.length+fl.length+ra.length+opt.length;
    console.log(`│ TOTAL                    │ ${String(total).padStart(4)} │ ${String(totalOrphans).padStart(8)} │`);
    console.log(`└──────────────────────────┴──────┴──────────┘`);

    // Golden baseline 대조
    console.log(`\n┌──────────────────────────┬──────┬──────────┬────────┐`);
    console.log(`│ 항목                      │ 현재  │ 베이스라인 │ 판정    │`);
    console.log(`├──────────────────────────┼──────┼──────────┼────────┤`);
    const baseline = {L2:21,L3:91,L1F:17,L2F:26,L3F:103,FM:26,FE:20,FC:104,FL:104,RA:104};
    const actual = {L2:l2s.length,L3:l3s.length,L1F:l1f.length,L2F:l2f.length,L3F:l3f.length,FM:fm.length,FE:fe.length,FC:fc.length,FL:fl.length,RA:ra.length};
    for (const [k,bv] of Object.entries(baseline)) {
      const av = actual[k];
      const ok = av >= bv;
      console.log(`│ ${k.padEnd(24)} │ ${String(av).padStart(4)} │ ${String(bv).padStart(8)} │ ${ok ? '✅ PASS' : '❌ FAIL'} │`);
    }
    console.log(`└──────────────────────────┴──────┴──────────┴────────┘`);

    console.log(`\n결론: ${totalOrphans === 0 ? '✅ ALL FK INTEGRITY PASS — DB 꽂아넣기 시스템 완벽 구축' : `❌ FK ORPHAN ${totalOrphans}건 — 수정 필요`}`);
    console.log(`1:N 복수 FE: ${fmMultiFE > 0 ? `✅ ${fmMultiFE}개 FM이 복수 FE 연결` : '⚠️  모든 FM이 단일 FE — 복수 FE 연결 확인 필요'}`);

  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
