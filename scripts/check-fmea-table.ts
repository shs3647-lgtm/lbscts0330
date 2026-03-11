import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    // FMEA 관련 테이블 확인
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%fmea%' OR table_name LIKE '%Fmea%')
    `);
    console.log('FMEA 관련 테이블:', tables.rows.map(r => r.table_name));
    
    // Fmea 테이블 데이터 확인
    try {
      const fmea = await client.query('SELECT id, name, "fmeaType" FROM public."Fmea" LIMIT 5');
      console.log('\npublic.Fmea 데이터:');
      fmea.rows.forEach(row => console.log(row));
    } catch (e: any) {
      console.log('Fmea 테이블 없음:', e.message);
    }
    
    // fmea_projects 테이블 확인
    try {
      const projects = await client.query('SELECT * FROM public.fmea_projects LIMIT 5');
      console.log('\npublic.fmea_projects 데이터:');
      projects.rows.forEach(row => console.log(row));
    } catch (e: any) {
      console.log('fmea_projects 테이블 없음:', e.message);
    }
    
    // FmeaLegacyData에서 fmeaId 확인
    try {
      const legacy = await client.query('SELECT "fmeaId" FROM public."FmeaLegacyData" LIMIT 5');
      console.log('\nFmeaLegacyData fmeaId:');
      legacy.rows.forEach(row => console.log(row));
    } catch (e: any) {
      console.log('FmeaLegacyData 테이블 없음:', e.message);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

check();
