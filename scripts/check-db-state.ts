/**
 * DB 상태 확인 스크립트 (pg 직접 사용)
 */
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db'
});

async function check() {
  const client = await pool.connect();
  try {
    // 프로젝트 스키마 확인
    const schemaRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name LIKE 'pfmea_%'
      ORDER BY schema_name
    `);
    console.log('=== 프로젝트 스키마 목록 ===');
    schemaRes.rows.forEach(r => console.log(' -', r.schema_name));
    
    const schema = schemaRes.rows[0]?.schema_name || 'pfmea_pfm26_m001';
    console.log('\n사용할 스키마:', schema);
    
    // 스키마 설정
    await client.query(`SET search_path TO ${schema}, public`);
    
    // public 스키마의 fmea_legacy_data 확인
    const legacyRes = await client.query(`SELECT * FROM public.fmea_legacy_data LIMIT 5`);
    console.log('\n=== public.fmea_legacy_data ===');
    console.log('개수:', legacyRes.rowCount);
    if (legacyRes.rows.length > 0) {
      const first = legacyRes.rows[0];
      console.log('컬럼명:', Object.keys(first));
      console.log('fmeaId (fmea_id):', first.fmea_id);
      // 다양한 컬럼명 시도
      const ld = first.legacy_data || first.legacyData || first.data;
      console.log('legacy_data 타입:', typeof ld);
      if (ld) {
        console.log('l1:', ld.l1);
        console.log('l1.name:', ld.l1?.name);
        console.log('l2 개수:', ld.l2?.length);
        if (ld.l2?.[0]) {
          console.log('첫 공정:', JSON.stringify(ld.l2[0], null, 2).substring(0, 500));
        }
      } else {
        console.log('전체 row:', JSON.stringify(first, null, 2).substring(0, 1000));
      }
    }
    
    // 프로젝트 스키마의 테이블 확인
    console.log(`\n=== ${schema}.l1_structures ===`);
    const l1Res = await client.query(`SELECT * FROM l1_structures LIMIT 5`);
    console.log('개수:', l1Res.rowCount);
    if (l1Res.rows.length > 0) console.log('샘플:', l1Res.rows[0]);
    
    console.log(`\n=== ${schema}.l2_structures ===`);
    const l2Res = await client.query(`SELECT * FROM l2_structures LIMIT 5`);
    console.log('개수:', l2Res.rowCount);
    if (l2Res.rows.length > 0) console.log('샘플:', l2Res.rows[0]);
    
    console.log(`\n=== ${schema}.l3_structures ===`);
    const l3Res = await client.query(`SELECT * FROM l3_structures LIMIT 5`);
    console.log('개수:', l3Res.rowCount);
    if (l3Res.rows.length > 0) console.log('샘플:', l3Res.rows[0]);
    
  } catch (e: any) {
    console.error('오류:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

check();

