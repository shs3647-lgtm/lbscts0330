const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  const r = await pool.query('SELECT "failureLinks", "l2Data", "l1Data" FROM fmea_worksheet_data LIMIT 1');
  if (r.rows.length === 0) { console.log('No data'); process.exit(0); }

  const links = r.rows[0].failureLinks || [];
  const l2 = r.rows[0].l2Data || [];
  const l1 = r.rows[0].l1Data;

  const feScopes = l1?.failureScopes || [];
  let totalFM = 0, totalFC = 0;
  for (const proc of l2) {
    totalFM += (proc.failureModes || []).length;
    for (const we of (proc.l3 || [])) {
      totalFC += (we.failureCauses || []).length;
    }
    totalFC += (proc.failureCauses || []).length;
  }

  console.log('=== Worksheet Stats ===');
  console.log('FE:', feScopes.length, '  FM:', totalFM, '  FC:', totalFC, '  Links:', links.length);

  // Linked IDs
  const linkedFmIds = new Set(links.map(l => l.fmId));
  const linkedFcIds = new Set(links.map(l => l.fcId));
  const linkedFeIds = new Set(links.map(l => l.feId));

  // Unlinked FMs
  const unlinkedFMs = [];
  for (const proc of l2) {
    for (const fm of (proc.failureModes || [])) {
      if (linkedFmIds.has(fm.id)) continue;
      unlinkedFMs.push({ processNo: proc.no, name: fm.name, id: fm.id });
    }
  }

  // Unlinked FEs
  const unlinkedFEs = feScopes.filter(fe => !linkedFeIds.has(fe.id));

  console.log('\n=== Unlinked FMs:', unlinkedFMs.length, '===');

  // Load chains for cross-reference
  const chainResult = await pool.query('SELECT "failureChains" FROM pfmea_master_datasets LIMIT 1');
  const chains = chainResult.rows[0]?.failureChains || [];

  function normalize(s) { return (s || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
  function normalizeProcessNo(pNo) {
    if (!pNo) return '';
    let n = pNo.trim();
    n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
    n = n.replace(/번$/, '');
    n = n.replace(/^0+(?=\d)/, '');
    return n;
  }

  for (const fm of unlinkedFMs) {
    const nfm = normalize(fm.name);
    const npNo = normalizeProcessNo(fm.processNo);

    // Exact match in chains (same processNo + same FM text)
    const exactChains = chains.filter(c => {
      const cn = normalizeProcessNo(c.processNo);
      return (cn === npNo || c.processNo === fm.processNo) && normalize(c.fmValue) === nfm;
    });

    // Any processNo match
    const anyProcChains = chains.filter(c => normalize(c.fmValue) === nfm);

    let reason = '';
    if (exactChains.length > 0) {
      // Chain exists, check what's missing
      const c = exactChains[0];
      const hasFC = c.fcValue && c.fcValue.trim();
      const hasFE = c.feValue && c.feValue.trim();
      reason = `CHAIN-EXISTS(${exactChains.length}) FE=${hasFE ? 'Y' : 'N'} FC=${hasFC ? 'Y' : 'N'}`;
      if (hasFE) reason += ` fe="${c.feValue.substring(0, 20)}"`;
      if (hasFC) reason += ` fc="${c.fcValue.substring(0, 20)}"`;
    } else if (anyProcChains.length > 0) {
      reason = `PROC-MISMATCH chain.pNo=${anyProcChains[0].processNo} ws.pNo=${fm.processNo}`;
    } else {
      // FM text not in chains at all - check fuzzy
      let bestScore = 0, bestChain = null;
      for (const c of chains) {
        const cn = normalize(c.fmValue);
        if (cn === nfm) continue;
        // Simple contains check
        if (cn.includes(nfm) || nfm.includes(cn)) {
          bestScore = 0.8;
          bestChain = c;
          break;
        }
      }
      if (bestChain) {
        reason = `FUZZY-ONLY "${bestChain.fmValue?.substring(0, 25)}" pNo=${bestChain.processNo}`;
      } else {
        reason = 'NO-CHAIN-MATCH';
      }
    }

    console.log(`  pNo=${fm.processNo} FM="${fm.name?.substring(0, 35)}" → ${reason}`);
  }

  console.log('\n=== Unlinked FEs:', unlinkedFEs.length, '===');
  for (const fe of unlinkedFEs.slice(0, 10)) {
    console.log(`  id=${fe.id?.substring(0, 15)} name="${(fe.effect || fe.name)?.substring(0, 30)}"`);
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Total FM:', totalFM);
  console.log('Linked FM:', linkedFmIds.size);
  console.log('Unlinked FM:', unlinkedFMs.length, '← these are the "누락" items');
  console.log('Total chains:', chains.length);

  pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
