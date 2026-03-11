/**
 * FailureLink 비즈니스키 기반 복원 스크립트
 * p008 (100% FM 커버리지) → p009/p010 복원
 * 비즈니스키: processNo + mode/effect/cause (텍스트 매칭)
 */
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public',
});

function uid() {
  return 'fl_' + crypto.randomBytes(12).toString('hex');
}

// FE category 정규화: YP/Your Plant → YP, SP/Ship to Plant → SP, USER/User → USER
function normFeCategory(cat) {
  if (!cat) return '';
  const upper = cat.trim().toUpperCase();
  if (upper === 'YP' || upper === 'YOUR PLANT') return 'YP';
  if (upper === 'SP' || upper === 'SHIP TO PLANT') return 'SP';
  if (upper === 'USER') return 'USER';
  return cat.trim(); // fallback
}

async function run() {
  const client = await pool.connect();

  try {
    const SOURCE = 'pfm26-p008-l09';
    console.log('=== 1단계: p008 소스 데이터 로드 ===');

    // 소스 FailureLinks (JOIN으로 비즈니스키 추출)
    const srcLinks = await client.query(`
      SELECT fl.id, fl."fmId", fl."feId", fl."fcId", fl.severity,
             fl."fmText", fl."feText", fl."fcText", fl."fmProcess",
             fl."fcWorkElem", fl."fcM4", fl."feScope",
             fm.mode as fm_mode, l2fm.no as fm_processno,
             fe.effect as fe_effect, fe.category as fe_category,
             fc.cause as fc_cause, l3fc.m4 as fc_m4, l2fc.no as fc_processno
      FROM failure_links fl
      JOIN failure_modes fm ON fl."fmId" = fm.id
      JOIN failure_effects fe ON fl."feId" = fe.id
      JOIN failure_causes fc ON fl."fcId" = fc.id
      JOIN l2_structures l2fm ON fm."l2StructId" = l2fm.id
      LEFT JOIN l3_structures l3fc ON fc."l3StructId" = l3fc.id
      LEFT JOIN l2_structures l2fc ON l3fc."l2Id" = l2fc.id
      WHERE fl."fmeaId" = $1
    `, [SOURCE]);
    console.log(`  소스 Links: ${srcLinks.rows.length}건`);

    // 소스 FM/FE/FC 건수 확인
    const srcCounts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM failure_modes WHERE "fmeaId" = $1) as fm,
        (SELECT COUNT(*) FROM failure_effects WHERE "fmeaId" = $1) as fe,
        (SELECT COUNT(*) FROM failure_causes WHERE "fmeaId" = $1) as fc
    `, [SOURCE]);
    const sc = srcCounts.rows[0];
    console.log(`  소스 FM: ${sc.fm}, FE: ${sc.fe}, FC: ${sc.fc}`);

    // ── 2. 타겟 프로젝트 복원 ──
    const TARGETS = ['pfm26-p009-l10', 'pfm26-p010-l11'];

    for (const targetId of TARGETS) {
      console.log(`\n=== 2단계: ${targetId} 복원 ===`);

      // 타겟 FM: processNo + mode → id
      const tgtFmRes = await client.query(`
        SELECT fm.id, fm.mode, l2.no as "processNo"
        FROM failure_modes fm
        JOIN l2_structures l2 ON fm."l2StructId" = l2.id
        WHERE fm."fmeaId" = $1
      `, [targetId]);

      if (tgtFmRes.rows.length === 0) {
        console.log(`  ⚠️ FM 0건 — atomic DB 없음, 스킵`);
        continue;
      }

      // 타겟 FE: category + effect → id
      const tgtFeRes = await client.query(`
        SELECT fe.id, fe.effect, fe.category
        FROM failure_effects fe
        WHERE fe."fmeaId" = $1
      `, [targetId]);

      // 타겟 FC: processNo + m4 + cause → id
      const tgtFcRes = await client.query(`
        SELECT fc.id, fc.cause, l3.m4, l2.no as "processNo"
        FROM failure_causes fc
        JOIN l3_structures l3 ON fc."l3StructId" = l3.id
        JOIN l2_structures l2 ON l3."l2Id" = l2.id
        WHERE fc."fmeaId" = $1
      `, [targetId]);

      console.log(`  타겟 FM: ${tgtFmRes.rows.length}, FE: ${tgtFeRes.rows.length}, FC: ${tgtFcRes.rows.length}`);

      // 비즈니스키 인덱스 (텍스트 trim 기반)
      const tgtFmMap = new Map();
      tgtFmRes.rows.forEach(r => {
        tgtFmMap.set(`${r.processNo}|${(r.mode || '').trim()}`, r.id);
      });

      const tgtFeMap = new Map();
      tgtFeRes.rows.forEach(r => {
        tgtFeMap.set(`${normFeCategory(r.category)}|${(r.effect || '').trim()}`, r.id);
      });

      const tgtFcMap = new Map();
      tgtFcRes.rows.forEach(r => {
        tgtFcMap.set(`${r.processNo}|${r.m4 || ''}|${(r.cause || '').trim()}`, r.id);
      });

      // 기존 링크의 FM-FE-FC 조합 수집 (중복 방지)
      const existRes = await client.query(
        `SELECT "fmId", "feId", "fcId" FROM failure_links WHERE "fmeaId" = $1`, [targetId]
      );
      const existingPairs = new Set();
      existRes.rows.forEach(r => existingPairs.add(`${r.fmId}|${r.feId}|${r.fcId}`));
      console.log(`  기존 링크: ${existRes.rows.length}건`);

      // 소스→타겟 매핑
      let matched = 0, skipped = 0;
      const newLinks = [];

      for (const sl of srcLinks.rows) {
        const fmKey = `${sl.fm_processno}|${(sl.fm_mode || '').trim()}`;
        const feKey = `${normFeCategory(sl.fe_category)}|${(sl.fe_effect || '').trim()}`;
        const fcKey = `${sl.fc_processno}|${sl.fc_m4 || ''}|${(sl.fc_cause || '').trim()}`;

        const tgtFmId = tgtFmMap.get(fmKey);
        const tgtFeId = tgtFeMap.get(feKey);
        const tgtFcId = tgtFcMap.get(fcKey);

        if (tgtFmId && tgtFeId && tgtFcId) {
          const pairKey = `${tgtFmId}|${tgtFeId}|${tgtFcId}`;
          if (!existingPairs.has(pairKey)) {
            existingPairs.add(pairKey);
            newLinks.push({
              id: uid(),
              fmeaId: targetId,
              fmId: tgtFmId,
              feId: tgtFeId,
              fcId: tgtFcId,
              severity: sl.severity || null,
              fmText: sl.fm_mode || null,
              feText: sl.fe_effect || null,
              fcText: sl.fc_cause || null,
              fmProcess: sl.fm_processno || null,
              fcWorkElem: sl.fcWorkElem || null,
              fcM4: sl.fc_m4 || null,
              feScope: sl.fe_category || null,
            });
            matched++;
          }
        } else {
          skipped++;
          if (skipped <= 5) {
            console.log(`  [SKIP] FM:${fmKey}=${tgtFmId ? 'OK' : 'MISS'} FE:${feKey}=${tgtFeId ? 'OK' : 'MISS'} FC:${fcKey}=${tgtFcId ? 'OK' : 'MISS'}`);
          }
        }
      }

      console.log(`  매칭: ${matched}건, 스킵: ${skipped}건, 신규: ${newLinks.length}건`);

      if (newLinks.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < newLinks.length; i += batchSize) {
          const batch = newLinks.slice(i, i + batchSize);
          const values = [];
          const params = [];
          let pi = 1;
          for (const lk of batch) {
            values.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5},$${pi+6},$${pi+7},$${pi+8},$${pi+9},$${pi+10},$${pi+11},$${pi+12},NOW(),NOW())`);
            params.push(lk.id, lk.fmeaId, lk.fmId, lk.feId, lk.fcId,
              lk.severity, lk.fmText, lk.feText, lk.fcText,
              lk.fmProcess, lk.fcWorkElem, lk.fcM4, lk.feScope);
            pi += 13;
          }
          await client.query(`
            INSERT INTO failure_links (id, "fmeaId", "fmId", "feId", "fcId",
              severity, "fmText", "feText", "fcText",
              "fmProcess", "fcWorkElem", "fcM4", "feScope",
              "createdAt", "updatedAt")
            VALUES ${values.join(', ')}
            ON CONFLICT (id) DO NOTHING
          `, params);
        }
        console.log(`  ✅ ${newLinks.length}건 INSERT 완료`);
      }

      // 최종 확인
      const finalRes = await client.query(`
        SELECT COUNT(*) as total,
          COUNT(DISTINCT "fmId") as unique_fm,
          COUNT(DISTINCT "feId") as unique_fe,
          COUNT(DISTINCT "fcId") as unique_fc,
          (SELECT COUNT(*) FROM failure_modes WHERE "fmeaId" = $1) as total_fm
        FROM failure_links WHERE "fmeaId" = $1
      `, [targetId]);
      const f = finalRes.rows[0];
      const cov = f.total_fm > 0 ? ((f.unique_fm / f.total_fm) * 100).toFixed(0) : 'N/A';
      console.log(`  최종: links=${f.total} | FM ${f.unique_fm}/${f.total_fm}(${cov}%) | FE ${f.unique_fe} | FC ${f.unique_fc}`);
    }

    // ── 3. legacyData failureLinks → atomic DB 기반으로 동기화 ──
    console.log('\n=== 3단계: legacyData failureLinks → atomic DB 동기화 ===');

    for (const targetId of [...TARGETS]) {
      const linksRes = await client.query(`
        SELECT id, "fmId", "feId", "fcId", severity,
               "fmText", "feText", "fcText", "fmProcess",
               "fcWorkElem", "fcM4", "feScope"
        FROM failure_links WHERE "fmeaId" = $1
      `, [targetId]);

      if (linksRes.rows.length === 0) continue;

      const legRes = await client.query(
        `SELECT id, data FROM fmea_legacy_data WHERE "fmeaId" = $1`, [targetId]
      );
      if (legRes.rows.length === 0) continue;

      const legData = legRes.rows[0].data;
      const legId = legRes.rows[0].id;

      // atomic → legacy 포맷 변환
      const legacyLinks = linksRes.rows.map(r => ({
        id: r.id,
        fmId: r.fmId,
        feId: r.feId,
        fcId: r.fcId,
        severity: r.severity || undefined,
        fmText: r.fmText || '',
        feText: r.feText || '',
        fcText: r.fcText || '',
        fmProcess: r.fmProcess || '',
        fmProcessNo: r.fmProcess || '',
        fcM4: r.fcM4 || '',
        feScope: r.feScope || '',
        fcWorkElem: r.fcWorkElem || '',
      }));

      legData.failureLinks = legacyLinks;

      await client.query(
        `UPDATE fmea_legacy_data SET data = $1, "updatedAt" = NOW() WHERE id = $2`,
        [JSON.stringify(legData), legId]
      );
      console.log(`  ${targetId}: legacyData → ${legacyLinks.length}건 동기화`);
    }

    // ── 4. 최종 검증 ──
    console.log('\n=== 4단계: 최종 검증 ===');
    const verifyRes = await client.query(`
      SELECT fl."fmeaId",
        COUNT(*) as total_links,
        COUNT(DISTINCT fl."fmId") as unique_fm,
        COUNT(DISTINCT fl."feId") as unique_fe,
        COUNT(DISTINCT fl."fcId") as unique_fc,
        (SELECT COUNT(*) FROM failure_modes WHERE "fmeaId" = fl."fmeaId") as total_fm
      FROM failure_links fl
      GROUP BY fl."fmeaId"
      ORDER BY fl."fmeaId"
    `);
    verifyRes.rows.forEach(r => {
      const cov = r.total_fm > 0 ? ((r.unique_fm / r.total_fm) * 100).toFixed(0) : 'N/A';
      console.log(`  ${r.fmeaId}: ${r.total_links}건 | FM ${r.unique_fm}/${r.total_fm}(${cov}%)`);
    });

    console.log('\n✅ 완료! 브라우저 새로고침 후 고장연결 확인');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
