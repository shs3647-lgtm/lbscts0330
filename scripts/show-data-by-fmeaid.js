/**
 * fmeaId별 데이터 현황 조회
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function showData() {
  const tables = [
    'fmea_projects',
    'fmea_registrations', 
    'fmea_cft_members',
    'fmea_worksheet_data',
    'failure_causes',
    'failure_modes',
    'failure_effects',
    'failure_links',
    'l1_structures',
    'l2_structures',
    'l3_structures',
    'l1_functions',
    'l2_functions',
    'l3_functions'
  ];
  
  console.log('=== fmeaId별 데이터 현황 ===\n');
  
  for (const table of tables) {
    try {
      const result = await pool.query(`
        SELECT "fmeaId", COUNT(*) as count 
        FROM public."${table}" 
        GROUP BY "fmeaId"
        ORDER BY "fmeaId"
      `);
      
      if (result.rows.length > 0) {
        console.log(`${table}:`);
        result.rows.forEach(r => {
          console.log(`  - ${r.fmeaId}: ${r.count}건`);
        });
      }
    } catch (e) {
      // 테이블이 없거나 fmeaId 컬럼이 없는 경우 무시
    }
  }
  
  console.log('\n=== 요약 ===');
  
  // 프로젝트 목록
  const projects = await pool.query(`
    SELECT p."fmeaId", p."fmeaType", p.status,
           r.subject, r."companyName"
    FROM public.fmea_projects p
    LEFT JOIN public.fmea_registrations r ON p."fmeaId" = r."fmeaId"
    ORDER BY p."fmeaId"
  `);
  
  console.log('\n등록된 프로젝트:');
  projects.rows.forEach(p => {
    console.log(`  - ${p.fmeaId} (${p.fmeaType}): ${p.subject || '미입력'}`);
  });
  
  await pool.end();
}

showData();










