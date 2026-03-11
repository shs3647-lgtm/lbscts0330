/**
 * @file fix-m4-null.js
 * @description DB에서 m4가 null인 작업요소 수정
 *
 * 발견된 문제:
 * 1. pfm26-p004-l05-r01: "50 도장 작업 환경(온습도)" → EN (환경)
 * 2. pfm26-p006-l07: "포장,커버" → IM (부자재)
 */

const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

async function run() {
  console.log('=== m4 null 데이터 수정 ===\n');

  // 1. 현재 상태 확인
  const before = await p.query(`
    SELECT l3.id, l3.m4, l3.name, l3."fmeaId", l2.name as l2name
    FROM l3_structures l3
    LEFT JOIN l2_structures l2 ON l3."l2Id" = l2.id
    WHERE l3.m4 IS NULL OR l3.m4 = ''
  `);
  console.log('[수정 전] m4 null/empty: ' + before.rows.length + '건');
  before.rows.forEach(r => {
    console.log('  id=' + r.id + ' fmea=' + r.fmeaId + ' name="' + r.name + '" m4="' + (r.m4 || 'null') + '"');
  });

  // 2. Atomic DB 수정
  // "50 도장 작업 환경(온습도)" → EN (환경: 온습도 = 작업환경)
  const r1 = await p.query(`
    UPDATE l3_structures SET m4 = 'EN', "updatedAt" = NOW()
    WHERE name LIKE '%작업 환경%' AND (m4 IS NULL OR m4 = '')
  `);
  console.log('\n[수정1] "작업 환경" → EN: ' + r1.rowCount + '건');

  // "포장,커버" → IM (부자재: 포장재/커버 = 생산보조재료)
  const r2 = await p.query(`
    UPDATE l3_structures SET m4 = 'IM', "updatedAt" = NOW()
    WHERE name LIKE '%포장%커버%' AND (m4 IS NULL OR m4 = '')
  `);
  console.log('[수정2] "포장,커버" → IM: ' + r2.rowCount + '건');

  // 3. Legacy 데이터도 수정
  const legacyRows = await p.query('SELECT id, "fmeaId", data FROM fmea_legacy_data');
  let legacyFixed = 0;

  for (const row of legacyRows.rows) {
    const data = row.data;
    if (!data || !data.l2) continue;
    let changed = false;

    for (const proc of data.l2) {
      for (const we of (proc.l3 || [])) {
        if ((!we.m4 || we.m4.trim() === '') && we.name) {
          if (we.name.includes('작업 환경')) {
            we.m4 = 'EN';
            changed = true;
            legacyFixed++;
            console.log('  Legacy 수정: "' + we.name + '" → EN (fmea=' + row.fmeaId + ')');
          } else if (we.name.includes('포장') && we.name.includes('커버')) {
            we.m4 = 'IM';
            changed = true;
            legacyFixed++;
            console.log('  Legacy 수정: "' + we.name + '" → IM (fmea=' + row.fmeaId + ')');
          }
        }
      }
    }

    if (changed) {
      await p.query('UPDATE fmea_legacy_data SET data = $1, "updatedAt" = NOW() WHERE id = $2', [JSON.stringify(data), row.id]);
    }
  }
  console.log('\n[Legacy 수정] ' + legacyFixed + '건');

  // 4. 수정 후 확인
  const after = await p.query(`
    SELECT l3.id, l3.m4, l3.name, l3."fmeaId"
    FROM l3_structures l3
    WHERE l3.m4 IS NULL OR l3.m4 = ''
  `);
  console.log('\n[수정 후] m4 null/empty: ' + after.rows.length + '건');
  if (after.rows.length === 0) {
    console.log('✅ 모든 m4 null 수정 완료!');
  } else {
    after.rows.forEach(r => {
      console.log('  ⚠️ 미수정: id=' + r.id + ' name="' + r.name + '"');
    });
  }

  await p.end();
}

run().catch(e => { console.error(e); p.end(); });
