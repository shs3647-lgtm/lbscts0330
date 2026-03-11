const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    const fmeaId = 'pfm26-p001-l50';

    // L2 구조 → L3 구조 → L3 함수 체인 확인
    // Prisma include가 하는 것과 동일하게 직접 조인 쿼리

    // 1. L2 → l2Functions 있는지?
    const r1 = await pool.query(`
      SELECT ls.id as l2_id, ls.no, ls.name,
        (SELECT COUNT(*) FROM l2_functions WHERE "l2StructId" = ls.id) as fn_count
      FROM l2_structures ls
      WHERE ls."fmeaId" = $1
      ORDER BY ls."order"
      LIMIT 5
    `, [fmeaId]);
    console.log('=== L2 → l2Functions 연결 확인 ===');
    r1.rows.forEach(r => console.log(`  L2 id=${r.l2_id.substring(0,8)} no=${r.no} name=${r.name} → l2Functions: ${r.fn_count}건`));

    // 2. L3 → l3Functions 있는지?
    const r2 = await pool.query(`
      SELECT ls3.id as l3_id, ls3.name, ls3.m4, ls3."l2Id",
        (SELECT COUNT(*) FROM l3_functions WHERE "l3StructId" = ls3.id) as fn_count
      FROM l3_structures ls3
      WHERE ls3."fmeaId" = $1
      ORDER BY ls3."order"
      LIMIT 10
    `, [fmeaId]);
    console.log('\n=== L3 → l3Functions 연결 확인 ===');
    const noFn = r2.rows.filter(r => parseInt(r.fn_count) === 0);
    const hasFn = r2.rows.filter(r => parseInt(r.fn_count) > 0);
    console.log(`  함수 있음: ${hasFn.length} / ${r2.rows.length} (first 10)`);
    r2.rows.forEach(r => console.log(`  L3 name=${r.name} m4=${r.m4} → l3Functions: ${r.fn_count}건`));

    // 3. 전체 L3 중 l3Functions가 0인 비율
    const r3 = await pool.query(`
      SELECT
        COUNT(*) as total_l3,
        SUM(CASE WHEN (SELECT COUNT(*) FROM l3_functions WHERE "l3StructId" = ls3.id) > 0 THEN 1 ELSE 0 END) as has_fn,
        SUM(CASE WHEN (SELECT COUNT(*) FROM l3_functions WHERE "l3StructId" = ls3.id) = 0 THEN 1 ELSE 0 END) as no_fn
      FROM l3_structures ls3
      WHERE ls3."fmeaId" = $1
    `, [fmeaId]);
    console.log('\n=== 전체 L3 → l3Functions 통계 ===');
    console.log(`  total_l3=${r3.rows[0].total_l3} has_fn=${r3.rows[0].has_fn} no_fn=${r3.rows[0].no_fn}`);

    // 4. API가 실제로 호출될 때 Prisma include 결과 시뮬레이션
    // L3Function의 l3StructId가 실제로 L3Structure.id와 매칭되는지
    const r4 = await pool.query(`
      SELECT lf."l3StructId", lf."functionName", lf."processChar",
        (SELECT ls3.name FROM l3_structures ls3 WHERE ls3.id = lf."l3StructId") as l3_name
      FROM l3_functions lf
      WHERE lf."fmeaId" = $1
      LIMIT 5
    `, [fmeaId]);
    console.log('\n=== L3Function → L3Structure 역참조 ===');
    r4.rows.forEach(r => console.log(`  l3StructId=${r.l3StructId.substring(0,8)} l3_name=${r.l3_name} fn="${r.functionName.substring(0,40)}" procChar="${r.processChar.substring(0,30)}"`));

  } catch(e) { console.error('Error:', e.message); }
  finally { pool.end(); }
})();
