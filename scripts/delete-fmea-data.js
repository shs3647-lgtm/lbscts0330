/**
 * PFM26-M001 모든 데이터 삭제
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

const FMEA_ID = 'PFM26-M001';

async function deleteAll() {
  console.log(`=== ${FMEA_ID} 모든 데이터 삭제 ===\n`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. failure_links
    const links = await client.query(`DELETE FROM public.failure_links WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ failure_links: ${links.rowCount}건 삭제`);
    
    // 2. failure_causes
    const causes = await client.query(`DELETE FROM public.failure_causes WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ failure_causes: ${causes.rowCount}건 삭제`);
    
    // 3. failure_modes
    const modes = await client.query(`DELETE FROM public.failure_modes WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ failure_modes: ${modes.rowCount}건 삭제`);
    
    // 4. failure_effects
    const effects = await client.query(`DELETE FROM public.failure_effects WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ failure_effects: ${effects.rowCount}건 삭제`);
    
    // 5. l3_functions
    const l3f = await client.query(`DELETE FROM public.l3_functions WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ l3_functions: ${l3f.rowCount}건 삭제`);
    
    // 6. l2_functions
    const l2f = await client.query(`DELETE FROM public.l2_functions WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ l2_functions: ${l2f.rowCount}건 삭제`);
    
    // 7. l1_functions
    const l1f = await client.query(`DELETE FROM public.l1_functions WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ l1_functions: ${l1f.rowCount}건 삭제`);
    
    // 8. l3_structures
    const l3s = await client.query(`DELETE FROM public.l3_structures WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ l3_structures: ${l3s.rowCount}건 삭제`);
    
    // 9. l2_structures
    const l2s = await client.query(`DELETE FROM public.l2_structures WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ l2_structures: ${l2s.rowCount}건 삭제`);
    
    // 10. l1_structures
    const l1s = await client.query(`DELETE FROM public.l1_structures WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ l1_structures: ${l1s.rowCount}건 삭제`);
    
    // 11. fmea_confirmed_states
    const confirmed = await client.query(`DELETE FROM public.fmea_confirmed_states WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ fmea_confirmed_states: ${confirmed.rowCount}건 삭제`);
    
    // 12. fmea_worksheet_data
    const worksheet = await client.query(`DELETE FROM public.fmea_worksheet_data WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ fmea_worksheet_data: ${worksheet.rowCount}건 삭제`);
    
    // 13. fmea_cft_members
    const cft = await client.query(`DELETE FROM public.fmea_cft_members WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ fmea_cft_members: ${cft.rowCount}건 삭제`);
    
    // 14. fmea_registrations
    const reg = await client.query(`DELETE FROM public.fmea_registrations WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ fmea_registrations: ${reg.rowCount}건 삭제`);
    
    // 15. fmea_legacy_data
    const legacy = await client.query(`DELETE FROM public.fmea_legacy_data WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ fmea_legacy_data: ${legacy.rowCount}건 삭제`);
    
    // 16. fmea_projects (마지막에 삭제 - FK 관계)
    const project = await client.query(`DELETE FROM public.fmea_projects WHERE "fmeaId" = $1`, [FMEA_ID]);
    console.log(`✅ fmea_projects: ${project.rowCount}건 삭제`);
    
    await client.query('COMMIT');
    
    console.log(`\n=== ${FMEA_ID} 모든 데이터 삭제 완료 ===`);
    console.log('\n⚠️ 브라우저 localStorage도 삭제 필요:');
    console.log('시크릿 모드로 접속하거나 F12 → Application → Clear All');
    
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ 오류:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

deleteAll();










