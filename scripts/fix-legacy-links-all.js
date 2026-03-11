/**
 * p011/p012 legacyData failureLinks 재복원
 * p009 legacyData (100% 매칭 소스) → p011/p012 비즈니스키 매핑
 */
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public',
});

function normCat(c) {
  if (!c) return '';
  const u = c.trim().toUpperCase();
  if (u === 'YP' || u === 'YOUR PLANT') return 'YP';
  if (u === 'SP' || u === 'SHIP TO PLANT') return 'SP';
  if (u === 'USER') return 'USER';
  return c.trim();
}

let uidCounter = 0;
function uid() {
  return 'lk_' + Date.now().toString(36) + '_' + (uidCounter++).toString(36);
}

async function run() {
  const c = await pool.connect();
  try {
    // 1. p009 소스 로드
    const srcRes = await c.query('SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1', ['pfm26-p009-l10']);
    const srcData = srcRes.rows[0].data;

    const srcFmInfo = new Map();
    const srcFeInfo = new Map();
    const srcFcInfo = new Map();

    (srcData.l2 || []).forEach(proc => {
      const pno = String(proc.no || '').trim();
      (proc.failureModes || []).forEach(fm => {
        srcFmInfo.set(fm.id, { processNo: pno, name: (fm.name || '').trim(), processName: proc.name || '' });
      });
      (proc.failureCauses || []).forEach(fc => {
        srcFcInfo.set(fc.id, { processNo: pno, m4: fc.m4 || '', name: (fc.name || '').trim() });
      });
    });
    if (srcData.l1 && srcData.l1.failureScopes) {
      srcData.l1.failureScopes.forEach(fe => {
        srcFeInfo.set(fe.id, { scope: normCat(fe.scope || fe.category || ''), effect: (fe.effect || '').trim() });
      });
    }
    const srcLinks = srcData.failureLinks || [];
    console.log('소스 (p009): FM=' + srcFmInfo.size + ', FE=' + srcFeInfo.size + ', FC=' + srcFcInfo.size + ', links=' + srcLinks.length);

    // 2. 각 타겟 프로젝트에 대해 복원
    const targets = ['pfm26-p011-l12', 'pfm26-p012-l13'];

    for (const targetId of targets) {
      console.log('\n=== ' + targetId + ' ===');

      const tgtRes = await c.query('SELECT id, data FROM fmea_legacy_data WHERE "fmeaId" = $1', [targetId]);
      if (tgtRes.rows.length === 0) { console.log('  legacyData 없음'); continue; }
      const tgtData = tgtRes.rows[0].data;
      const tgtLegId = tgtRes.rows[0].id;

      // 타겟 FM/FE/FC 비즈니스키 맵
      const tgtFmMap = new Map();
      const tgtFeMap = new Map();
      const tgtFcMap = new Map();
      let tgtFmCount = 0, tgtFcCount = 0, tgtFeCount = 0;

      (tgtData.l2 || []).forEach(proc => {
        const pno = String(proc.no || '').trim();
        (proc.failureModes || []).forEach(fm => {
          tgtFmMap.set(pno + '|' + (fm.name || '').trim(), fm.id);
          tgtFmCount++;
        });
        (proc.failureCauses || []).forEach(fc => {
          tgtFcMap.set(pno + '|' + (fc.m4 || '') + '|' + (fc.name || '').trim(), fc.id);
          tgtFcCount++;
        });
      });
      if (tgtData.l1 && tgtData.l1.failureScopes) {
        tgtData.l1.failureScopes.forEach(fe => {
          tgtFeMap.set(normCat(fe.scope || fe.category || '') + '|' + (fe.effect || '').trim(), fe.id);
          tgtFeCount++;
        });
      }
      console.log('  타겟: FM=' + tgtFmCount + ', FE=' + tgtFeCount + ', FC=' + tgtFcCount);

      // 소스→타겟 매핑
      let matched = 0, skipped = 0;
      const newLinks = [];
      const existingPairs = new Set();

      for (const sl of srcLinks) {
        const fmInfo = srcFmInfo.get(sl.fmId);
        const feInfo = srcFeInfo.get(sl.feId);
        const fcInfo = srcFcInfo.get(sl.fcId);
        if (!fmInfo || !feInfo || !fcInfo) { skipped++; continue; }

        const tgtFmId = tgtFmMap.get(fmInfo.processNo + '|' + fmInfo.name);
        const tgtFeId = tgtFeMap.get(feInfo.scope + '|' + feInfo.effect);
        const tgtFcId = tgtFcMap.get(fcInfo.processNo + '|' + fcInfo.m4 + '|' + fcInfo.name);

        if (tgtFmId && tgtFeId && tgtFcId) {
          const pairKey = tgtFmId + '|' + tgtFeId + '|' + tgtFcId;
          if (!existingPairs.has(pairKey)) {
            existingPairs.add(pairKey);
            newLinks.push({
              id: uid(),
              fmId: tgtFmId,
              feId: tgtFeId,
              fcId: tgtFcId,
              severity: sl.severity || undefined,
              fmText: fmInfo.name,
              feText: feInfo.effect,
              fcText: fcInfo.name,
              fmProcess: fmInfo.processName,
              fmProcessNo: fmInfo.processNo,
              fcM4: fcInfo.m4,
              feScope: feInfo.scope,
              fcWorkElem: '',
            });
            matched++;
          }
        } else {
          skipped++;
          if (skipped <= 3) {
            console.log('  [SKIP] FM:' + (tgtFmId ? 'OK' : 'MISS(' + fmInfo.processNo + '|' + fmInfo.name.substring(0, 20) + ')') +
              ' FE:' + (tgtFeId ? 'OK' : 'MISS') + ' FC:' + (tgtFcId ? 'OK' : 'MISS'));
          }
        }
      }
      console.log('  매핑: matched=' + matched + ', skipped=' + skipped);

      // 업데이트
      tgtData.failureLinks = newLinks;
      await c.query('UPDATE fmea_legacy_data SET data = $1, "updatedAt" = NOW() WHERE id = $2',
        [JSON.stringify(tgtData), tgtLegId]);

      // 검증
      const fmIds = new Set();
      (tgtData.l2 || []).forEach(proc => { (proc.failureModes || []).forEach(fm => fmIds.add(fm.id)); });
      const uniqFm = new Set(newLinks.map(l => l.fmId));
      const fmCov = fmIds.size > 0 ? ((uniqFm.size / fmIds.size) * 100).toFixed(0) : 'N/A';
      console.log('  결과: ' + newLinks.length + '건, FM ' + uniqFm.size + '/' + fmIds.size + ' (' + fmCov + '%)');
    }

    // 최종 전체 검증
    console.log('\n=== 최종 검증 ===');
    const allRes = await c.query('SELECT "fmeaId", data FROM fmea_legacy_data WHERE "fmeaId" LIKE \'pfm26-%\' ORDER BY "fmeaId"');
    for (const row of allRes.rows) {
      const data = row.data;
      const fmIds = new Set();
      (data.l2 || []).forEach(proc => { (proc.failureModes || []).forEach(fm => fmIds.add(fm.id)); });
      const links = data.failureLinks || [];
      const uniqFm = new Set(links.map(l => l.fmId).filter(id => fmIds.has(id)));
      const cov = fmIds.size > 0 ? ((uniqFm.size / fmIds.size) * 100).toFixed(0) : 'N/A';
      console.log('  ' + row.fmeaId + ': links=' + links.length + ' FM=' + uniqFm.size + '/' + fmIds.size + '(' + cov + '%)');
    }

    console.log('\n✅ 완료!');
  } finally {
    c.release();
    await pool.end();
  }
}
run().catch(err => console.error(err));
