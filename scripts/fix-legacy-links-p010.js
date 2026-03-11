/**
 * p010 legacyData failureLinks 재복원
 * p009 legacyData (100% 매칭 확인)를 소스로 사용
 * 비즈니스키(processNo + FM name/FE effect/FC name)로 p010 legacyData ID에 매핑
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
    // 1. p009 legacyData 로드 (소스 — 100% ID 매칭 확인됨)
    const srcRes = await c.query('SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1', ['pfm26-p009-l10']);
    const srcData = srcRes.rows[0].data;

    // 소스 FM/FE/FC 비즈니스키 → 텍스트 정보 맵 구축
    const srcFmInfo = new Map(); // fmId → { processNo, name }
    const srcFeInfo = new Map(); // feId → { scope, effect }
    const srcFcInfo = new Map(); // fcId → { processNo, m4, name }

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

    console.log('소스 (p009): FM=' + srcFmInfo.size + ', FE=' + srcFeInfo.size + ', FC=' + srcFcInfo.size);
    console.log('소스 links: ' + (srcData.failureLinks || []).length);

    // 2. p010 legacyData 로드 (타겟)
    const tgtRes = await c.query('SELECT id, data FROM fmea_legacy_data WHERE "fmeaId" = $1', ['pfm26-p010-l11']);
    const tgtData = tgtRes.rows[0].data;
    const tgtLegId = tgtRes.rows[0].id;

    // 타겟 FM/FE/FC 비즈니스키 → legacyData ID 맵
    const tgtFmMap = new Map(); // "processNo|name" → id
    const tgtFeMap = new Map(); // "normScope|effect" → id
    const tgtFcMap = new Map(); // "processNo|m4|name" → id

    (tgtData.l2 || []).forEach(proc => {
      const pno = String(proc.no || '').trim();
      (proc.failureModes || []).forEach(fm => {
        tgtFmMap.set(pno + '|' + (fm.name || '').trim(), fm.id);
      });
      (proc.failureCauses || []).forEach(fc => {
        tgtFcMap.set(pno + '|' + (fc.m4 || '') + '|' + (fc.name || '').trim(), fc.id);
      });
    });
    if (tgtData.l1 && tgtData.l1.failureScopes) {
      tgtData.l1.failureScopes.forEach(fe => {
        tgtFeMap.set(normCat(fe.scope || fe.category || '') + '|' + (fe.effect || '').trim(), fe.id);
      });
    }

    console.log('타겟 (p010): FM=' + tgtFmMap.size + ', FE=' + tgtFeMap.size + ', FC=' + tgtFcMap.size);

    // 3. 소스 links → 타겟 links 변환 (비즈니스키 매핑)
    const srcLinks = srcData.failureLinks || [];
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
            fmProcess: fmInfo.processName || '',
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
          console.log('  [SKIP] FM:' + (tgtFmId ? 'OK' : 'MISS') + ' FE:' + (tgtFeId ? 'OK' : 'MISS') + ' FC:' + (tgtFcId ? 'OK' : 'MISS'));
        }
      }
    }

    console.log('매핑: matched=' + matched + ', skipped=' + skipped + ', newLinks=' + newLinks.length);

    // 4. p010 legacyData 업데이트
    tgtData.failureLinks = newLinks;
    await c.query(
      'UPDATE fmea_legacy_data SET data = $1, "updatedAt" = NOW() WHERE id = $2',
      [JSON.stringify(tgtData), tgtLegId]
    );
    console.log('p010 legacyData 업데이트: ' + newLinks.length + '건');

    // 5. 검증: 매핑된 link의 fmId가 legacyData FM에 존재하는지
    const fmIds = new Set();
    const fcIds = new Set();
    (tgtData.l2 || []).forEach(proc => {
      (proc.failureModes || []).forEach(fm => fmIds.add(fm.id));
      (proc.failureCauses || []).forEach(fc => fcIds.add(fc.id));
    });
    let fmOk = 0, fcOk = 0;
    newLinks.forEach(lk => {
      if (fmIds.has(lk.fmId)) fmOk++;
      if (fcIds.has(lk.fcId)) fcOk++;
    });
    const uniqueFm = new Set(newLinks.map(l => l.fmId));
    console.log('검증: FM match=' + fmOk + '/' + newLinks.length + ', FC match=' + fcOk + '/' + newLinks.length);
    console.log('고유 FM 커버리지: ' + uniqueFm.size + '/' + fmIds.size + ' (' + ((uniqueFm.size / fmIds.size) * 100).toFixed(0) + '%)');

    console.log('\n✅ 완료! 브라우저 새로고침');
  } finally {
    c.release();
    await pool.end();
  }
}
run().catch(err => console.error(err));
