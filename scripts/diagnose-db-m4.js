/**
 * @file diagnose-db-m4.js
 * @description DB에서 m4가 빈 L3Structure (작업요소) 찾기 — pg 직접 쿼리
 *
 * "누락 1건" 근본 원인 진단
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public',
});

async function main() {
  console.log('=== DB m4 누락 진단 (pg 직접 쿼리) ===\n');

  // 1. PFMEA 프로젝트 목록
  const fmeas = await pool.query(`
    SELECT fp.id, fp."fmeaId", fp."fmeaType",
           fr.subject as subject
    FROM fmea_projects fp
    LEFT JOIN fmea_registrations fr ON fp."fmeaId" = fr."fmeaId"
    WHERE fp."fmeaType" = 'PFMEA'
    ORDER BY fp."createdAt" DESC
  `);
  console.log(`[1] PFMEA 프로젝트 ${fmeas.rows.length}개:`);
  fmeas.rows.forEach(f => console.log(`  - ${f.fmeaId} "${f.subject || '(no subject)'}"`));

  // 2. 각 프로젝트별 L3Structure 분석
  for (const fmea of fmeas.rows) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[2] "${fmea.subject || '(no subject)'}" (fmeaId=${fmea.fmeaId})`);
    console.log('='.repeat(60));

    const l3s = await pool.query(`
      SELECT l3.id, l3.m4, l3.name, l3."order", l3."l2Id",
             l2.name as l2_name, l2."processNo" as l2_no
      FROM l3_structures l3
      LEFT JOIN l2_structures l2 ON l3."l2Id" = l2.id
      WHERE l3."fmeaId" = $1
      ORDER BY l3."order"
    `, [fmea.fmeaId]);

    console.log(`  L3 총 ${l3s.rows.length}개`);

    const m4Stats = { MN: 0, MC: 0, IM: 0, EN: 0, null_count: 0, empty: 0, other: 0 };
    const problems = [];

    for (const l3 of l3s.rows) {
      const m4 = l3.m4;
      const name = (l3.name || '').trim();

      if (m4 === null) m4Stats.null_count++;
      else if (m4 === '') m4Stats.empty++;
      else if (['MN', 'MC', 'IM', 'EN'].includes(m4)) m4Stats[m4]++;
      else m4Stats.other++;

      // 유효한 이름 판별 (missingCounts 로직과 동일)
      const isValidName = name !== '' && name !== '-' &&
        !name.includes('추가') && !name.includes('삭제') &&
        !name.includes('클릭') && !name.includes('선택') && !name.includes('없음');

      const isMissingM4 = !m4 || m4.trim() === '' || m4 === '-' ||
        m4.includes('클릭') || m4.includes('추가') || m4.includes('선택') ||
        m4.includes('입력') || m4.includes('필요');

      if (isValidName && isMissingM4) {
        problems.push({
          id: l3.id,
          name: l3.name,
          m4: m4 || '(null)',
          order: l3.order,
          l2Name: l3.l2_name || '?',
          l2No: l3.l2_no || '?',
        });
      }
    }

    console.log(`\n  [4M 통계]`);
    console.log(`    MN: ${m4Stats.MN}, MC: ${m4Stats.MC}, IM: ${m4Stats.IM}, EN: ${m4Stats.EN}`);
    console.log(`    null: ${m4Stats.null_count}, empty: ${m4Stats.empty}, other: ${m4Stats.other}`);

    // 전체 L3 목록 (m4 포함)
    console.log(`\n  [전체 L3 목록]`);
    for (const l3 of l3s.rows) {
      const mark = (!l3.m4 || l3.m4.trim() === '') ? ' 🔴' : '';
      console.log(`    [${l3.order}] m4="${l3.m4 || '(null)'}" name="${l3.name}" (공정: ${l3.l2_no} "${l3.l2_name}")${mark}`);
    }

    if (problems.length > 0) {
      console.log(`\n  🔴 [m4 누락 작업요소 — "누락" 카운트 대상] ${problems.length}건`);
      problems.forEach((p, i) => {
        console.log(`    [${i + 1}] id="${p.id}" name="${p.name}" m4="${p.m4}"`);
        console.log(`        공정: ${p.l2No} "${p.l2Name}" (order=${p.order})`);
      });
    } else {
      console.log(`\n  ✅ m4 누락 없음 (Atomic DB 기준)`);
    }

    // 3. Legacy 데이터도 확인
    const legacyResult = await pool.query(`
      SELECT data FROM fmea_legacy_data
      WHERE "fmeaId" = $1
      LIMIT 1
    `, [fmea.fmeaId]);

    if (legacyResult.rows.length > 0 && legacyResult.rows[0].data) {
      const legacyData = legacyResult.rows[0].data;
      const l2List = legacyData.l2 || [];

      console.log(`\n  [Legacy 데이터] L2 ${l2List.length}개 공정`);

      let legacyProblems = 0;
      for (const proc of l2List) {
        const l3List = proc.l3 || [];
        for (const we of l3List) {
          const name = (we.name || '').trim();
          const m4 = we.m4;

          const isValidName = name !== '' && name !== '-' &&
            !name.includes('추가') && !name.includes('삭제') &&
            !name.includes('클릭') && !name.includes('선택') && !name.includes('없음');

          const isMissingM4 = !m4 || m4.trim() === '' || m4 === '-' ||
            m4.includes('클릭') || m4.includes('추가') || m4.includes('선택') ||
            m4.includes('입력') || m4.includes('필요');

          if (isValidName && isMissingM4) {
            legacyProblems++;
            console.log(`    🔴 Legacy m4 누락: 공정 ${proc.no} "${proc.name}" → WE "${name}" m4="${m4 || '(없음)'}"`);
          }
        }
      }

      if (legacyProblems === 0) {
        console.log(`    ✅ Legacy m4 누락 없음`);
      }

      // L1 이름 확인
      console.log(`\n  [L1 확인]`);
      console.log(`    l1.name="${legacyData.l1?.name || '(없음)'}"`);
      if (!legacyData.l1?.name || legacyData.l1.name.trim() === '' ||
          legacyData.l1.name.includes('클릭') || legacyData.l1.name.includes('선택')) {
        console.log(`    🔴 L1 이름 누락!`);
      }
    }
  }

  console.log('\n=== 진단 완료 ===');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => pool.end());
